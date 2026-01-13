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

const GET_STUDENTS = `
  query GetStudents($skip: Int, $take: Int) {
    students(skip: $skip, take: $take) {
      id
      user {
        firstName
        lastName
        email
        role
      }
    }
  }
`;

describe('Integration: Students', () => {

    async function seedStudents(count = 3) {
        const students = [];
        // Create Class first
         const gradeLevel = await prisma.gradeLevel.create({
            data: { numericLevel: 1, name: 'Grade 1' }
        });
        const classObj = await prisma.class.create({
            data: { name: '1A', gradeLevelId: gradeLevel.id, academicYear: '2025' }
        });

        for (let i = 0; i < count; i++) {
            const user = await prisma.user.create({
                data: {
                    id: 200 + i,
                    roleId: ROLES.STUDENT,
                    username: `student_${i}`,
                    email: `student${i}@test.com`,
                    passwordHash: 'hash',
                    firstName: `First${i}`,
                    lastName: `Last${i}`
                }
            });
            const student = await prisma.student.create({
                data: {
                    userId: user.id,
                    classId: classObj.id,
                    dateOfBirth: new Date('2015-01-01')
                }
            });
            students.push({ user, student });
        }
        return students;
    }

    describe('Happy Path', () => {
        it('should retrieve a list of students', async () => {
            await seedStudents(3);
            const token = generateToken(ROLES.TEACHER, 101); // Teacher role

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: GET_STUDENTS
                });

            expect(res.body.errors).toBeUndefined();
            expect(res.body.data.students).toHaveLength(3);
            expect(res.body.data.students[0].user.firstName).toBeDefined();
        });

        it('should support pagination (take)', async () => {
            await seedStudents(5);
            const token = generateToken(ROLES.TEACHER, 101);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: GET_STUDENTS,
                    variables: { take: 2 }
                });

            expect(res.body.errors).toBeUndefined();
            expect(res.body.data.students).toHaveLength(2);
        });

        it('should support pagination (skip)', async () => {
            const created = await seedStudents(3); // First0, First1, First2
            const token = generateToken(ROLES.TEACHER, 101);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: GET_STUDENTS,
                    variables: { skip: 1, take: 1 }
                });

            expect(res.body.errors).toBeUndefined();
            expect(res.body.data.students).toHaveLength(1);
            // Default ordering might be by ID, verify connection
            // We can't guarantee order without orderBy in query, but typically Insertion order
        });
    });

    describe('Sad Path', () => {
        it('should fail if unauthenticated', async () => {
            const res = await request(app)
                .post('/graphql')
                .send({
                    query: GET_STUDENTS
                });

            // Expecting 401 or GraphQL error "Unauthorized" depending on middleware
            // Based on index.js roleMiddleware, it might respond with 403 or next with undefined user.
            // If undefined user, and resolver doesn't check, it MIGHT pass.
            // But grades.test.js showed "Forbidden" inside resolver.
            // Let's see what happens. If it passes, I'll update expectation related to "Missing token". 
            // Note: roleMiddleware in index.js might not block if user is missing, but let's assume secure by default for "protected routes" mentioned in prompt.
            // Actually usually 'roleMiddleware' acts as a gate.
            
            // If the test framework returns 200 with errors, that's also valid "Failure" in GraphQL.
            // But index.js says: app.use(..., roleMiddleware(...))
            
            // Let's assume verify 401 or some error.
            if (res.status === 200) {
                 expect(res.body.errors).toBeDefined();
            } else {
                 expect(res.status).not.toBe(200);
            }
        });

        it('should handle invalid pagination args gracefully (e.g. negative skip)', async () => {
            const token = generateToken(ROLES.TEACHER, 101);
            
            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: GET_STUDENTS,
                    variables: { skip: -1 }
                });

            // Prisma throws if skip is negative
            expect(res.body.errors).toBeDefined();
        });

        it('should return empty list if no students found (Valid but "Zero" case)', async () => {
            const token = generateToken(ROLES.TEACHER, 101);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: GET_STUDENTS
                });

            expect(res.body.errors).toBeUndefined();
            expect(res.body.data.students).toEqual([]);
        });
    });
});
