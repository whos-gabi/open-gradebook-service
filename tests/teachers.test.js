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

const GET_TEACHER_CLASSES = `
  query GetTeacherClasses {
    getTeacherClasses {
      totalClasses
      classes {
        name
        subject
        homeroom_teacher
      }
    }
  }
`;

describe('Integration: Teachers', () => {
    
    // Helper to setup a teacher context
    async function setupTeacher(hasClasses = true, isHomeroom = false) {
        // 1. Create User
        const user = await prisma.user.create({
            data: {
                roleId: ROLES.TEACHER,
                username: 'teach_' + Math.random(),
                email: 'teach@test.com' + Math.random(),
                passwordHash: 'xx',
                firstName: 'T',
                lastName: 'Test',
            }
        });
        
        // 2. Create Profile
        await prisma.teacher.create({ data: { userId: user.id, specialization: 'General' } });

        if (hasClasses) {
            const subject = await prisma.subject.create({ data: { name: 'Math ' + Math.random(), code: 'MATH' + Math.floor(Math.random()*1000) } });
            const gradeLvl = await prisma.gradeLevel.create({ data: { numericLevel: 5, name: 'G5' } });
            
            const classData = { 
                name: '5A', 
                gradeLevelId: gradeLvl.id, 
                academicYear: '2025'
            };
            
            if (isHomeroom) {
                classData.homeroomTeacherId = user.id;
            }
            
            const classObj = await prisma.class.create({ data: classData });

            await prisma.classCourse.create({
                data: {
                    classId: classObj.id,
                    subjectId: subject.id,
                    teacherId: user.id
                }
            });
        }
        
        return user;
    }

    describe('Happy Path', () => {
        it('should return classes for an authenticated teacher', async () => {
            const user = await setupTeacher(true);
            const token = generateToken(ROLES.TEACHER, user.id);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({ query: GET_TEACHER_CLASSES });

            expect(res.body.errors).toBeUndefined();
            expect(res.body.data.getTeacherClasses.totalClasses).toBe(1);
            expect(res.body.data.getTeacherClasses.classes[0].name).toBe('5A');
        });

        it('should return empty list if teacher has no classes assigned', async () => {
            const user = await setupTeacher(false);
            const token = generateToken(ROLES.TEACHER, user.id);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({ query: GET_TEACHER_CLASSES });

            expect(res.body.errors).toBeUndefined();
            expect(res.body.data.getTeacherClasses.totalClasses).toBe(0);
            expect(res.body.data.getTeacherClasses.classes).toHaveLength(0);
        });

        it('should correctly identify homeroom assignments', async () => {
            const user = await setupTeacher(true, true); // isHomeroom = true
            const token = generateToken(ROLES.TEACHER, user.id);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({ query: GET_TEACHER_CLASSES });

            expect(res.body.errors).toBeUndefined();
            expect(res.body.data.getTeacherClasses.classes[0].homeroom_teacher).toBe(true);
        });
    });

    describe('Sad Path', () => {
        it('should fail if unauthenticated', async () => {
            const res = await request(app)
                .post('/graphql')
                .send({ query: GET_TEACHER_CLASSES });

            // Expecting failure (either 401 or GraphQL error)
            if(res.status === 200) {
                 expect(res.body.errors).toBeDefined();
                 expect(res.body.errors[0].message).toMatch(/Unauthorized/i);
            } else {
                 expect(res.status).not.toBe(200);
            }
        });

        it('should fail if user acts as Teacher but has Student role', async () => {
            // Create Student User
             const user = await prisma.user.create({
                data: {
                    roleId: ROLES.STUDENT,
                    username: 'bad_student',
                    email: 'bad@test.com',
                    passwordHash: 'xx',
                    firstName: 'S',
                    lastName: 'T',
                }
            });
            
            // Try to use Teacher Token (or token containing Student Role)
            const token = generateToken(ROLES.STUDENT, user.id);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({ query: GET_TEACHER_CLASSES });

            expect(res.body.errors).toBeDefined();
            expect(res.body.errors[0].message).toMatch(/Unauthorized/i);
        });

        it('should fail if teacher profile is missing (Data Integrity Issue)', async () => {
            // User has TEACHER role usage, but no entry in 'teachers' table
             const user = await prisma.user.create({
                data: {
                    roleId: ROLES.TEACHER,
                    username: 'ghost_teacher',
                    email: 'ghost@test.com',
                    passwordHash: 'xx',
                    firstName: 'G',
                    lastName: 'H',
                }
            });

            const token = generateToken(ROLES.TEACHER, user.id);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({ query: GET_TEACHER_CLASSES });

            expect(res.body.errors).toBeDefined();
            // Resolver throws "Teacher profile not found"
             expect(res.body.errors[0].message).toMatch(/Teacher profile not found/i);
        });
    });
});
