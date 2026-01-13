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

const GET_TIMETABLE = `
  query GetTimetable($classId: Int!) {
    getTimetable(classId: $classId) {
      id
      dayOfWeek
      startTime
      endTime
      class {
          name
      }
      subject {
          name
      }
    }
  }
`;

describe('Integration: Timetable', () => {

    async function setupTimetableData() {
        // 1. Grade/Class/Subject
        const gradeLevel = await prisma.gradeLevel.create({ data: { numericLevel: 8, name: 'G8' } });
        const classObj = await prisma.class.create({ data: { name: '8A', gradeLevelId: gradeLevel.id, academicYear: '2025' } });
        const subject = await prisma.subject.create({ data: { name: 'Biology', code: 'BIO8' } });
        
        // 2. Timetable entry
        // NOTE: In test setupSchema, @db.Time is removed, so it's a DateTime. 
        // We use a fixed reference date.
        const t1 = await prisma.timetable.create({
            data: {
                classId: classObj.id,
                subjectId: subject.id,
                dayOfWeek: 1, // Monday
                startTime: new Date('1970-01-01T09:00:00Z'),
                endTime: new Date('1970-01-01T10:00:00Z')
            }
        });

        // 3. User for token
        const user = await prisma.user.create({
            data: {
                roleId: ROLES.STUDENT,
                username: 'timetabler',
                email: 'tt@test.com',
                passwordHash: 'xx',
                firstName: 'Ti',
                lastName: 'Me'
            }
        });

        return { classObj, subject, t1, user, gradeLevel };
    }

    describe('Happy Path', () => {
        it('should retrieve timetable for a valid class', async () => {
            const { classObj, user } = await setupTimetableData();
            const token = generateToken(ROLES.STUDENT, user.id);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: GET_TIMETABLE,
                    variables: { classId: classObj.id }
                });

            expect(res.body.errors).toBeUndefined();
            expect(res.body.data.getTimetable).toHaveLength(1);
            expect(res.body.data.getTimetable[0].dayOfWeek).toBe(1);
            expect(res.body.data.getTimetable[0].class.name).toBe('8A');
        });

        it('should retrieve fields including resolved subject', async () => {
            const { classObj, subject, user } = await setupTimetableData();
            const token = generateToken(ROLES.STUDENT, user.id);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: GET_TIMETABLE,
                    variables: { classId: classObj.id }
                });

            expect(res.body.errors).toBeUndefined();
            expect(res.body.data.getTimetable[0].subject.name).toBe('Biology');
        });

        it('should return empty list for class with no timetable', async () => {
            // Setup data to get class, but don't look for that one
            const { user, gradeLevel } = await setupTimetableData();
            const token = generateToken(ROLES.STUDENT, user.id);
            
            const emptyClass = await prisma.class.create({
                data: { name: 'EmptyClass', gradeLevelId: gradeLevel.id, academicYear: '2025' } 
            });
            
            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: GET_TIMETABLE,
                    variables: { classId: emptyClass.id }
                });

            expect(res.body.errors).toBeUndefined();
            expect(res.body.data.getTimetable).toEqual([]);
        });
    });

    describe('Sad Path', () => {
        it('should fail if unauthenticated (No Token)', async () => {
            // Pick an ID that likely exists or 1
            const res = await request(app)
                .post('/graphql')
                .send({
                    query: GET_TIMETABLE,
                    variables: { classId: 1 }
                });

            // Middleware blocks it
             if (res.status === 200) {
                 expect(res.body.errors).toBeDefined();
                 expect(res.body.errors[0].message).toMatch(/Missing authorization|Unauthorized/i);
             } else {
                 expect(res.status).not.toBe(200);
             }
        });

        it('should return empty if class does not exist (and not error?)', async () => {
            // findMany returns empty array if filter doesn't match. 
            // So this is actually a "Working" sad path logic for non-existent resource in 'findMany'.
            const { user } = await setupTimetableData();
            const token = generateToken(ROLES.STUDENT, user.id);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: GET_TIMETABLE,
                    variables: { classId: 99999 }
                });

            expect(res.body.errors).toBeUndefined();
            expect(res.body.data.getTimetable).toEqual([]);
        });

        // Since the resolver doesn't have args validation checks or strict authZ checks beyond middleware,
        // we can check if it fails for invalid data types (GraphQL validation).
        it('should fail if classId is missing/invalid type', async () => {
            const { user } = await setupTimetableData();
            const token = generateToken(ROLES.STUDENT, user.id);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: `query { getTimetable(classId: "string") { id } }`
                });

            expect(res.body.errors).toBeDefined();
            // GraphQL validation error
        });
        
        it('should fail for bad token (Sad Path extra)', async () => {
            const res = await request(app)
                .post('/graphql')
                .set('Authorization', 'Bearer badtoken')
                .send({
                    query: GET_TIMETABLE,
                    variables: { classId: 1 }
                });

            if(res.status === 200) {
                 expect(res.body.errors).toBeDefined();
            } else {
                 // 401 or 500
                 expect(res.status).not.toBe(200);
            }
        });
    });

});
