const request = require('supertest');
const { startServer, app } = require('../index');
const { prisma, resetDb, seedRoles } = require('./helpers/db');
const { generateToken, ROLES } = require('./helpers/auth');

let server;

beforeAll(async () => {
  // Start server on random port to initialize Apollo
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

const QUERY = `
  query GetTeacherClasses {
    getTeacherClasses {
      totalClasses
      classes {
        name
        subject
        academic_year
      }
    }
  }
`;

describe('Query: getTeacherClasses', () => {
    it('Happy path: Authenticated Teacher with assigned classes returns success', async () => {
        const teacherUserId = 101;
        
        // 1. Create User
        await prisma.user.create({
           data: {
               id: teacherUserId,
               roleId: ROLES.TEACHER,
               username: 'teacher1',
               email: 'teacher@test.com',
               passwordHash: 'hash',
               firstName: 'T',
               lastName: 'Teach'
           }
        });
        
        // 2. Create Teacher Profile
        await prisma.teacher.create({
            data: { userId: teacherUserId, specialization: 'Math' } 
        });
        
        // 3. Create Grade Level
        const gradeLvl = await prisma.gradeLevel.create({
            data: { numericLevel: 5, name: 'Grade 5' }
        });
        
        // 4. Create Subject
        const subject = await prisma.subject.create({
            data: { name: 'Mathematics', code: 'M1' }
        });
        
        // 5. Create Class
        const classObj = await prisma.class.create({
            data: { 
                name: '5A', 
                gradeLevelId: gradeLvl.id,
                academicYear: '2025-2026'
            }
        });
        
        // 6. Assign teacher to class (ClassCourse)
        await prisma.classCourse.create({
            data: {
                classId: classObj.id,
                subjectId: subject.id,
                teacherId: teacherUserId
            }
        });

        const token = generateToken(ROLES.TEACHER, teacherUserId);

        const res = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send({ query: QUERY });

        expect(res.status).toBe(200);
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.getTeacherClasses.totalClasses).toBe(1);
        expect(res.body.data.getTeacherClasses.classes).toHaveLength(1);
        expect(res.body.data.getTeacherClasses.classes[0].name).toBe('5A');
        expect(res.body.data.getTeacherClasses.classes[0].subject).toBe('Mathematics');
        expect(res.body.data.getTeacherClasses.classes[0].academic_year).toBe('2025-2026');
    });

    it('Sad path: Authenticated Teacher but no teacher profile in DB returns error', async () => {
         const teacherUserId = 102;
         
         // Create User but NO Teacher profile
         await prisma.user.create({
           data: {
               id: teacherUserId,
               roleId: ROLES.TEACHER,
               username: 'teacher2',
               email: 'teacher2@test.com',
               passwordHash: 'hash',
               firstName: 'T',
               lastName: 'NoProfile'
           }
        });
        
        const token = generateToken(ROLES.TEACHER, teacherUserId);
        
        const res = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send({ query: QUERY });
            
         expect(res.status).toBe(200);
         expect(res.body.errors).toBeDefined();
         expect(res.body.errors[0].message).toMatch(/Teacher profile not found/i);
    });
    
    it('Sad path: Unauthenticated (Wrong Role) returns 403', async () => {
         // Student role
         const studentUserId = 103;
         // Setup student user if blocked by middleware? Middleware checks token payload, doesn't hit DB.
         // Token generation relies on passed ID/Role.
         const token = generateToken(ROLES.STUDENT, studentUserId);
         
         const res = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send({ query: QUERY });
            
         // The express middleware allows STUDENTS, so it reaches the resolver.
         // The resolver throws "Unauthorized", which GraphQL returns as 200 with errors.
         expect(res.body.errors).toBeDefined();
         expect(res.body.errors[0].message).toMatch(/Unauthorized/i);
    });

    it('Sad path: No Token returns 401', async () => {
        const res = await request(app)
            .post('/graphql')
            .send({ query: QUERY });
        
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/Missing authorization token/i);
    });
});
