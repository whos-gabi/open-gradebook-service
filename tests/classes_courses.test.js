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

const GET_ALL_CLASSES = `
  query GetAllClasses {
    getAllClasses {
      id
      name
      academicYear
      homeroomTeacher {
        firstName
      }
      students {
        firstName
      }
    }
  }
`;

const ASSIGN_TEACHER = `
  mutation AssignTeacher($input: CreateClassCourseInput!) {
    assignTeacherToSubject(input: $input) {
      id
      class {
        name
      }
      subject {
        name
      }
      teacher {
        firstName
      }
    }
  }
`;

describe('Integration: Classes & Courses', () => {

    async function setupData() {
        // 1. Roles (User, Teacher, Admin)
        const teacherUser = await prisma.user.create({
            data: { id: 10, roleId: ROLES.TEACHER, username: 'teacher_tom', email: 'tom@test.com', passwordHash: 'x', firstName: 'Tom', lastName: 'T' }
        });
        await prisma.teacher.create({ data: { userId: 10, specialization: 'Math' } });
        
        const adminUser = await prisma.user.create({
            data: { id: 11, roleId: ROLES.ADMIN, username: 'admin_ann', email: 'ann@test.com', passwordHash: 'x', firstName: 'Ann', lastName: 'A' }
        });
        
        // 2. Class & Subject
        const gradeLevel = await prisma.gradeLevel.create({ data: { numericLevel: 10, name: 'G10' } });
        const classObj = await prisma.class.create({ 
            data: { 
                name: '10C', 
                gradeLevelId: gradeLevel.id, 
                academicYear: '2025',
                homeroomTeacherId: teacherUser.id
            } 
        }); // 10C has homeroom teacher
        
        const subject = await prisma.subject.create({ data: { name: 'Chemistry', code: 'CHM' } });

        return { teacherUser, adminUser, classObj, subject };
    }

    describe('Happy Path', () => {
        it('should allow Teacher to retrieve all classes', async () => {
            const { teacherUser, classObj } = await setupData();
            const token = generateToken(ROLES.TEACHER, teacherUser.id);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({ query: GET_ALL_CLASSES });

            expect(res.body.errors).toBeUndefined();
            expect(res.body.data.getAllClasses).toHaveLength(1);
            expect(res.body.data.getAllClasses[0].name).toBe('10C');
            expect(res.body.data.getAllClasses[0].homeroomTeacher.firstName).toBe('Tom');
        });

        it('should allow Admin to assign a teacher to a subject', async () => {
            const { adminUser, teacherUser, classObj, subject } = await setupData();
            const token = generateToken(ROLES.ADMIN, adminUser.id);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: ASSIGN_TEACHER,
                    variables: {
                        input: {
                            classId: classObj.id,
                            subjectId: subject.id,
                            teacherId: teacherUser.id
                        }
                    }
                });

            expect(res.body.errors).toBeUndefined();
            expect(res.body.data.assignTeacherToSubject.class.name).toBe('10C');
            expect(res.body.data.assignTeacherToSubject.subject.name).toBe('Chemistry');
            expect(res.body.data.assignTeacherToSubject.teacher.firstName).toBe('Tom');
        });

        it('should correctly map students in getAllClasses', async () => {
             const { teacherUser, classObj } = await setupData();
            
            // Add a student
             const studentUser = await prisma.user.create({
                data: { id: 20, roleId: ROLES.STUDENT, username: 's1', email: 's1@t.com', passwordHash:'x', firstName:'S', lastName:'T' }
            });
            await prisma.student.create({ data: { userId: 20, classId: classObj.id, dateOfBirth: new Date() } });

            const token = generateToken(ROLES.TEACHER, teacherUser.id);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({ query: GET_ALL_CLASSES });

            expect(res.body.errors).toBeUndefined();
            expect(res.body.data.getAllClasses[0].students).toHaveLength(1);
            expect(res.body.data.getAllClasses[0].students[0].firstName).toBe('S');
        });
    });

    describe('Sad Path', () => {
        it('should fail if Student tries to list classes (Unauthorized)', async () => {
            const { classObj } = await setupData();
            // Create Student
             const studentUser = await prisma.user.create({
                data: { id: 30, roleId: ROLES.STUDENT, username: 'bad_s', email: 'b@t.com', passwordHash:'x', firstName:'S', lastName:'T' }
            });

            const token = generateToken(ROLES.STUDENT, 30);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({ query: GET_ALL_CLASSES });

            expect(res.body.errors).toBeDefined();
            expect(res.body.errors[0].message).toMatch(/Unauthorized/i);
        });

        it('should fail if Teacher tries to assign teachers (Forbidden)', async () => {
            const { teacherUser, classObj, subject } = await setupData();
            const token = generateToken(ROLES.TEACHER, teacherUser.id);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: ASSIGN_TEACHER,
                    variables: {
                        input: {
                            classId: classObj.id,
                            subjectId: subject.id,
                            teacherId: teacherUser.id
                        }
                    }
                });

            expect(res.body.errors).toBeDefined();
            expect(res.body.errors[0].message).toMatch(/Forbidden/i);
        });

        it('should fail if assigning to non-existent class', async () => {
            const { adminUser, teacherUser, subject } = await setupData();
            const token = generateToken(ROLES.ADMIN, adminUser.id);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: ASSIGN_TEACHER,
                    variables: {
                        input: {
                            classId: 99999,
                            subjectId: subject.id,
                            teacherId: teacherUser.id
                        }
                    }
                });

            expect(res.body.errors).toBeDefined();
        });
    });

});
