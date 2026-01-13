'use strict';

const http = require('http');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/use/ws');
const { roleMiddleware, ROLES } = require('./auth/roleMiddleware');
const { registerStudentSocket, unregisterStudentSocket } = require('./lib/gradeNotificationHub');
const { registerUser, loginUser } = require('./auth/authService');
const { setUserContext } = require('./auth/contextStore');
const prisma = require('./lib/client');
const schema = require('./graphql/schema');
const { exportStudentReport } = require('./lib/student-pdf');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'open-gradebook-service' });
});

/*
// Demo route: only TEACHER role can add grades.
app.post('/grades', roleMiddleware(ROLES.TEACHER), (req, res) => {
  const { studentId, value } = req.body || {};
  res.json({
    message: 'Grade recorded (demo response)',
    grade: { studentId, value },
    performedBy: req.user?.role_id,
  });
});

// Demo route: only ADMIN role can create new subjects.
app.post('/subjects', roleMiddleware(ROLES.ADMIN), (req, res) => {
  const { name } = req.body || {};
  res.json({
    message: 'Subject created (demo response)',
    subject: { name },
    performedBy: req.user?.role_id,
  });
});

// Demo route: ADMIN or TEACHER can view class reports.
app.get('/reports', roleMiddleware(ROLES.ADMIN, ROLES.TEACHER), (_req, res) => {
  res.json({
    message: 'Reports available (demo response)',
    allowedRoles: [ROLES.ADMIN, ROLES.TEACHER],
    performedBy: req.user?.role_id,
  });
});
*/

app.post('/auth/register', roleMiddleware(ROLES.ADMIN), async (req, res) => {
  try {
    const user = await registerUser(req.body);
    res.status(201).json({ user });
  } catch (error) {
    const status = error?.statusCode || 500;
    const message = error?.statusCode ? error.message : 'Failed to register user';
    // eslint-disable-next-line no-console
    console.error('Register route error:', error);
    res.status(status).json({ error: message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const authResponse = await loginUser(req.body);
    setUserContext(authResponse.token, authResponse.user); // user context for graphql layer
    res.json(authResponse);
  } catch (error) {
    const status = error?.statusCode || 500;
    const message = error?.statusCode ? error.message : 'Failed to login';
    // eslint-disable-next-line no-console
    console.error('Login route error:', error);
    res.status(status).json({ error: message });
  }
});

app.get(
  '/api/export/student/:id',
  roleMiddleware(ROLES.TEACHER, ROLES.ADMIN),
  exportStudentReport,
);

/**
 * Validates JWT token and returns user payload
 * @param {string} token - JWT token (with or without 'Bearer ' prefix)
 * @returns {object|null} - Decoded user or null if invalid
 */
const validateToken = (token) => {
  if (!token) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  try {
    const cleanToken = token.toLowerCase().startsWith('bearer ')
      ? token.slice(7).trim()
      : token.trim();

    const decoded = jwt.verify(cleanToken, secret);
    return {
      id: decoded.user_id,
      roleId: decoded.role_id,
    };
  } catch (error) {
    return null;
  }
};

const startServer = async (port = PORT) => {
  // Create HTTP server for both Express and WebSocket
  const httpServer = http.createServer(app);

  // IMPORTANT:
  // We use `noServer: true` and manually route upgrades.
  // Having multiple WebSocketServer({ server: httpServer, path }) instances can cause 400s because
  // the "wrong" ws server may respond to the upgrade before the correct one sees it.
  const wsServer = new WebSocketServer({ noServer: true });

  // Plain WebSocket server for "one-message login then auto notifications"
  // Client sends: { "token": "Bearer <JWT>" } and then receives grade events automatically.
  const notificationsServer = new WebSocketServer({ noServer: true });

  notificationsServer.on('connection', (socket) => {
    let authenticatedStudentId = null;

    socket.once('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const token = msg?.Authorization || msg?.authorization || msg?.token;

        const user = validateToken(token || '');
        if (!user) {
          socket.send(JSON.stringify({ type: 'error', message: 'Invalid or expired token' }));
          return socket.close();
        }
        if (user.roleId !== ROLES.STUDENT) {
          socket.send(JSON.stringify({ type: 'error', message: 'Forbidden: Student only' }));
          return socket.close();
        }

        authenticatedStudentId = user.id;
        registerStudentSocket(authenticatedStudentId, socket);
        socket.send(JSON.stringify({ type: 'ok', message: 'Subscribed to grade notifications' }));
      } catch (e) {
        socket.send(JSON.stringify({ type: 'error', message: 'Bad JSON message' }));
        socket.close();
      }
    });

    socket.on('close', () => {
      if (authenticatedStudentId) {
        unregisterStudentSocket(authenticatedStudentId);
      }
    });
  });

  // Route WebSocket upgrades based on path
  httpServer.on('upgrade', (req, socket, head) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const pathname = url.pathname;

      if (pathname === '/graphql') {
        wsServer.handleUpgrade(req, socket, head, (ws) => {
          wsServer.emit('connection', ws, req);
        });
        return;
      }

      if (pathname === '/ws/grades') {
        notificationsServer.handleUpgrade(req, socket, head, (ws) => {
          notificationsServer.emit('connection', ws, req);
        });
        return;
      }

      socket.destroy();
    } catch (_e) {
      socket.destroy();
    }
  });

  // Set up WebSocket server with graphql-ws
  const serverCleanup = useServer(
    {
      schema,
      // Handle WebSocket connection authentication
      onConnect: async (ctx) => {
        // Extract token from connectionParams
        const token = ctx.connectionParams?.Authorization || 
                      ctx.connectionParams?.authorization ||
                      ctx.connectionParams?.token;

        if (!token) {
          throw new Error('Authentication required: Missing token in connectionParams');
        }

        const user = validateToken(token);
        if (!user) {
          throw new Error('Authentication failed: Invalid or expired token');
        }

        // Return true to accept the connection
        // User will be available in context via onSubscribe
        return true;
      },
      // Build context for each subscription operation
      context: async (ctx) => {
        const token = ctx.connectionParams?.Authorization || 
                      ctx.connectionParams?.authorization ||
                      ctx.connectionParams?.token;

        const user = validateToken(token);

        return {
          token,
          prisma,
          user,
        };
      },
      onDisconnect: () => {
        // Optional: Handle disconnection cleanup
      },
    },
    wsServer,
  );

  const apolloServer = new ApolloServer({
    schema,
    plugins: [
      // Proper shutdown for HTTP server
      ApolloServerPluginDrainHttpServer({ httpServer }),
      // Proper shutdown for WebSocket server
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await apolloServer.start();

  app.use(
    '/graphql',
    cors(),
    express.json(),
    roleMiddleware(ROLES.TEACHER, ROLES.ADMIN, ROLES.STUDENT),
    expressMiddleware(apolloServer, {
      context: async ({ req }) => {
        const tokenHeader = req.headers.authorization || req.headers.token || '';
        const token = tokenHeader.toLowerCase().startsWith('bearer ')
          ? tokenHeader.slice(7).trim()
          : tokenHeader || null;
        
        // Manually validate token and extract user (no roleMiddleware)
        const user = validateToken(token);
        
        return {
          token,
          prisma,
          user,
        };
      },
    }),
  );

  return new Promise((resolve, reject) => {
    const server = httpServer.listen(port, () => {
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV !== 'test') {
        console.log(`🚀 Server up on: http://localhost:${port}/`);
        console.log(`🔌 WebSocket subscriptions: ws://localhost:${port}/graphql`);
      }
      resolve(server);
    }).on('error', reject);
  });
};

if (require.main === module) {
  startServer().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start GraphQL server', error);
    process.exit(1);
  });
}

module.exports = { app, startServer };

