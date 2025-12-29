'use strict';

const express = require('express');
const cors = require('cors');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { roleMiddleware, ROLES } = require('./auth/roleMiddleware');
const { registerUser, loginUser } = require('./auth/authService');
const { setUserContext } = require('./auth/contextStore');
const prisma = require('./lib/client');
const { typeDefs, resolvers } = require('./graphql/getTeacherClassesSchema');

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

const startGraphQLServer = async () => {
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await apolloServer.start();

  app.use(
    '/graphql',
    cors(),
    express.json(),
    roleMiddleware(ROLES.TEACHER),
    expressMiddleware(apolloServer, {
      context: async ({ req }) => {
        const tokenHeader = req.headers.authorization || req.headers.token || '';
        const token = tokenHeader.toLowerCase().startsWith('bearer ')
          ? tokenHeader.slice(7).trim()
          : tokenHeader || null;
        
        return {
          token,
          prisma,
          user: req.context?.user,
        };
      },
    }),
  );

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Serverul tău rulează la http://localhost:${PORT}/graphql`);
  });
};

startGraphQLServer().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start GraphQL server', error);
  process.exit(1);
});

