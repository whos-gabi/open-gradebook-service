const request = require('supertest');
const { startServer, app } = require('../index');
const { prisma, resetDb, seedRoles } = require('./helpers/db');
const { generateToken, ROLES } = require('./helpers/auth');

let server;

beforeAll(async () => {
    server = await startServer(0);
});

afterAll(async () => {
    if (server) await server.close();
    await prisma.$disconnect();
});

beforeEach(async () => {
    await resetDb();
    await seedRoles();
});

const ME_QUERY = `
  query Me {
    me {
      id
      firstName
      lastName
      role
    }
  }
`;

const GET_ALL_USERS_QUERY = `
  query GetAllUsers {
    getAllUsers {
      id
      firstName
      role
    }
  }
`;

describe('Integration: Users', () => {

    async function setupUser(role) {
        return await prisma.user.create({
            data: {
                roleId: role,
                username: `user_${role}`,
                email: `user${role}@test.com`,
                passwordHash: 'hash',
                firstName: 'Test',
                lastName: 'User'
            }
        });
    }

    /* -------------------------------------------------------------
       Query: me
    ------------------------------------------------------------- */
    describe('Query: me', () => {
        
        describe('Happy Path', () => {
            it('should return current user profile for Admin', async () => {
                const user = await setupUser(ROLES.ADMIN);
                const token = generateToken(ROLES.ADMIN, user.id);

                const res = await request(app)
                    .post('/graphql')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ query: ME_QUERY });

                expect(res.body.errors).toBeUndefined();
                expect(res.body.data.me.id).toBe(user.id);
                expect(res.body.data.me.role).toBe('ADMIN');
            });

            it('should return current user profile for Student', async () => {
                const user = await setupUser(ROLES.STUDENT);
                const token = generateToken(ROLES.STUDENT, user.id);

                const res = await request(app)
                    .post('/graphql')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ query: ME_QUERY });

                expect(res.body.errors).toBeUndefined();
                expect(res.body.data.me.id).toBe(user.id);
                expect(res.body.data.me.role).toBe('STUDENT');
            });

            it('should resolve fields correctly (firstName/lastName)', async () => {
                const user = await setupUser(ROLES.TEACHER);
                const token = generateToken(ROLES.TEACHER, user.id);

                const res = await request(app)
                    .post('/graphql')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ query: ME_QUERY });

                expect(res.body.data.me.firstName).toBe('Test');
                expect(res.body.data.me.lastName).toBe('User');
            });
        });

        describe('Sad Path', () => {
            it('should return null or fail if no token provided (and middleware passes empty or similar?)', async () => {
                // If middleware blocks it, we get 401/403. 
                const res = await request(app)
                    .post('/graphql')
                    .send({ query: ME_QUERY });
                
                // Expect Middleware rejection
                if (res.status === 200) {
                     expect(res.body.errors).toBeDefined();
                } else {
                     expect(res.status).not.toBe(200);
                }
            });

            it('should fail if token is invalid signature', async () => {
                 const res = await request(app)
                    .post('/graphql')
                    .set('Authorization', `Bearer invalid.signature.token`)
                    .send({ query: ME_QUERY });
                
                 if (res.status === 200) {
                     expect(res.body.errors).toBeDefined();
                } else {
                     expect(res.status).not.toBe(200);
                }
            });
            
             it('should return null if user ID in token does not exist in DB (Data Integrity)', async () => {
                // Token has ID 999
                const token = generateToken(ROLES.STUDENT, 999);
                const res = await request(app)
                    .post('/graphql')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ query: ME_QUERY });

                // Resolver returns null if nothing found
                expect(res.body.errors).toBeUndefined();
                expect(res.body.data.me).toBeNull();
            });
        });
    });

    /* -------------------------------------------------------------
       Query: getAllUsers
    ------------------------------------------------------------- */
    describe('Query: getAllUsers', () => {
        
        describe('Happy Path', () => {
           it('should return a list of users for Admin', async () => {
                await setupUser(ROLES.STUDENT);
                await setupUser(ROLES.TEACHER);
                const admin = await setupUser(ROLES.ADMIN);
                
                const token = generateToken(ROLES.ADMIN, admin.id);

                const res = await request(app)
                    .post('/graphql')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ query: GET_ALL_USERS_QUERY });

                expect(res.body.errors).toBeUndefined();
                expect(res.body.data.getAllUsers.length).toBeGreaterThanOrEqual(3);
           });
           
           it('should resolve roles for users in list', async () => {
                const admin = await setupUser(ROLES.ADMIN);
                const token = generateToken(ROLES.ADMIN, admin.id);

                const res = await request(app)
                    .post('/graphql')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ query: GET_ALL_USERS_QUERY });

                const adminUser = res.body.data.getAllUsers.find(u => u.id === admin.id);
                expect(adminUser.role).toBe('ADMIN');
           });
           
           // Testing existing implementation behavior (even if loose security)
           it('should allow Teacher to list users (Current Implementation)', async () => {
                const teacher = await setupUser(ROLES.TEACHER);
                const token = generateToken(ROLES.TEACHER, teacher.id);
                
                const res = await request(app)
                    .post('/graphql')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ query: GET_ALL_USERS_QUERY });

                // Assuming code does NOT actually restrict it yet, as seen in analysis
                 expect(res.body.errors).toBeUndefined();
                 expect(res.body.data.getAllUsers).toBeDefined();
           });
        });

        describe('Sad Path', () => {
            it('should fail if unauthenticated', async () => {
                 const res = await request(app)
                    .post('/graphql')
                    .send({ query: GET_ALL_USERS_QUERY });
                
                if (res.status === 200) {
                     expect(res.body.errors).toBeDefined();
                } else {
                     expect(res.status).not.toBe(200);
                }
            });

            // Since implementation is "open" to roles, we can't test failure for roles like STUDENT unless we change code.
            // But we can test failure for invalid query structure (GraphQL validation).
            it('should fail if requesting non-existent field', async () => {
                const admin = await setupUser(ROLES.ADMIN);
                const token = generateToken(ROLES.ADMIN, admin.id);

                const res = await request(app)
                    .post('/graphql')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ 
                        query: `query { getAllUsers { password } }` 
                    });

                expect(res.body.errors).toBeDefined();
                expect(res.body.errors[0].message).toMatch(/Cannot query field/i);
            });
            
             // "Sad Path" - Verify it returns empty if no users? (Hard as we seed, but hypothetical)
             // Instead, let's verify invalid input logic if any args existed. None exist. 
        });
    });

});
