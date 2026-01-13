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

const ADD_GRADE = `
  mutation AddGrade($input: GradeInput!) {
    addGrade(input: $input) {
      id
      value
      comments
      student {
        user {
            firstName
        }
      }
      subject {
          name
      }
    }
  }
`;

const MY_GRADES = `
  query MyGrades {
    myGrades {
      id
      value
      comments
      subject {
        name
      }
    }
  }
`;

describe('Integration: Grades', () => {

    async function setupClassroom() {
        // 1. Create Teacher
        const teacherUser = await prisma.user.create({
            data: {
                id: 10,
                roleId: ROLES.TEACHER,
                username: 'mr_teacher',
                email: 'teacher@school.com',
                passwordHash: 'hash',
                firstName: 'John',
                lastName: 'Doe'
            }
        });
        await prisma.teacher.create({ data: { userId: 10, specialization: 'Science' } });

        // 2. Create Student
        const studentUser = await prisma.user.create({
            data: {
                id: 20,
                roleId: ROLES.STUDENT,
                username: 'student_bob',
                email: 'bob@school.com',
                passwordHash: 'hash',
                firstName: 'Bob',
                lastName: 'Smith'
            }
        });
        
        // 3. Create Grade Level
        const gradeLevel = await prisma.gradeLevel.create({
            data: { numericLevel: 10, name: 'Grade 10' }
        });

        // 4. Create Class
        const classObj = await prisma.class.create({
            data: {
                name: '10A',
                gradeLevelId: gradeLevel.id,
                academicYear: '2025'
            }
        });

        // 5. Assign student to class
        const student = await prisma.student.create({
            data: {
                userId: 20,
                classId: classObj.id,
                dateOfBirth: new Date('2010-01-01')
            }
        });

        // 6. Create Subject
        const subject = await prisma.subject.create({
            data: { name: 'Physics', code: 'PHY101' }
        });

        // 7. Assign Teacher to Subject/Class (ClassCourse)
        const classCourse = await prisma.classCourse.create({
            data: {
                classId: classObj.id,
                subjectId: subject.id,
                teacherId: 10
            }
        });

        return { teacherUser, studentUser, student, subject, classCourse };
    }

    describe('Happy Path', () => {
        it('should allow a Teacher to add a grade for a student they teach', async () => {
            const { teacherUser, studentUser, subject } = await setupClassroom();
            const token = generateToken(ROLES.TEACHER, teacherUser.id);
    
            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: ADD_GRADE,
                    variables: {
                        input: {
                            value: 8.5,
                            studentId: studentUser.id,
                            subjectId: subject.id,
                            comments: 'Good job'
                        }
                    }
                });
            
            expect(res.body.errors).toBeUndefined();
            expect(res.body.data.addGrade.value).toBe(8.5);
            expect(res.body.data.addGrade.comments).toBe('Good job');
            expect(res.body.data.addGrade.subject.name).toBe('Physics');
        });
    
        it('should allow a Student to retrieve their own grades', async () => {
            const { studentUser, subject, student } = await setupClassroom();
            
            // Seed a grade
             await prisma.grade.create({
                data: {
                    gradeValue: 9.0,
                    gradeDate: new Date(),
                    studentId: studentUser.id,
                    subjectId: subject.id,
                    comments: 'Previous work'
                }
            });
    
            const token = generateToken(ROLES.STUDENT, studentUser.id);
    
            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({ query: MY_GRADES });
    
            expect(res.body.errors).toBeUndefined();
            expect(res.body.data.myGrades).toHaveLength(1);
            expect(res.body.data.myGrades[0].value).toBe(9.0);
            expect(res.body.data.myGrades[0].comments).toBe('Previous work');
        });
    
        it('should allow adding boundary values (e.g. 10.0)', async () => {
            const { teacherUser, studentUser, subject } = await setupClassroom();
            const token = generateToken(ROLES.TEACHER, teacherUser.id);
    
            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: ADD_GRADE,
                    variables: {
                        input: {
                            value: 10.0,
                            studentId: studentUser.id,
                            subjectId: subject.id,
                            comments: 'Perfect'
                        }
                    }
                });
    
            expect(res.body.errors).toBeUndefined();
            expect(res.body.data.addGrade.value).toBe(10.0);
        });
    });

    describe('Sad Path', () => {
        it('should fail if user is not authorized (Student trying to add grade)', async () => {
            const { studentUser, subject } = await setupClassroom();
            const token = generateToken(ROLES.STUDENT, studentUser.id);
    
            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: ADD_GRADE,
                    variables: {
                        input: {
                            value: 5.0,
                            studentId: studentUser.id, // Trying to grade self
                            subjectId: subject.id,
                            comments: 'Hacking'
                        }
                    }
                });
    
            expect(res.body.errors).toBeDefined();
            expect(res.body.errors[0].message).toMatch(/Forbidden|Only teachers/i);
        });
    
        it('should fail if teacher does not teach the student (Unauthorized)', async () => {
            const { studentUser, subject } = await setupClassroom();
            
            // Create another teacher who is NOT assigned to the class
            const teacher2 = await prisma.user.create({
                 data: { 
                     id: 99, 
                     roleId: ROLES.TEACHER, 
                     username: 'rando', 
                     email: 'r@t.com', 
                     passwordHash:'x', 
                     firstName:'R', 
                     lastName:'T'
                 }
            });
            await prisma.teacher.create({ data: { userId: 99, specialization: 'Art' } });
    
            const token = generateToken(ROLES.TEACHER, 99);
    
            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: ADD_GRADE,
                    variables: {
                        input: {
                            value: 6.0,
                            studentId: studentUser.id,
                            subjectId: subject.id,
                            comments: 'Intruder'
                        }
                    }
                });
    
            expect(res.body.errors).toBeDefined();
            expect(res.body.errors[0].message).toMatch(/Unauthorized/i);
        });
    
        it('should fail when adding grade for non-existent student', async () => {
            const { teacherUser, subject } = await setupClassroom();
            const token = generateToken(ROLES.TEACHER, teacherUser.id);
    
            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: ADD_GRADE,
                    variables: {
                        input: {
                            value: 5.0,
                            studentId: 99999, // Non-existent
                            subjectId: subject.id,
                            comments: 'Ghost'
                        }
                    }
                });
    
            expect(res.body.errors).toBeDefined();
            expect(res.body.errors[0].message).toMatch(/Student not found/i);
        });
    });

});
