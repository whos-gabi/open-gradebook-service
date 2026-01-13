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

const MARK_ABSENCE = `
  mutation MarkAbsence($studentId: Int!, $timetableId: Int!, $date: String!, $reason: String, $isExcused: Boolean) {
    markAbsence(studentId: $studentId, timetableId: $timetableId, date: $date, reason: $reason, isExcused: $isExcused) {
      id
      date
      reason
      isExcused
      subject {
          name
      }
    }
  }
`;

describe('Integration: Absences', () => {

    async function setupTimetable() {
        // 1. Grade/Class/Subject
        const gradeLevel = await prisma.gradeLevel.create({ data: { numericLevel: 9, name: 'G9' } });
        const classObj = await prisma.class.create({ data: { name: '9B', gradeLevelId: gradeLevel.id, academicYear: '2025' } });
        const subject = await prisma.subject.create({ data: { name: 'History', code: 'HIS9' } });
        
        // 2. Timetable entry
        const timetable = await prisma.timetable.create({
            data: {
                classId: classObj.id,
                subjectId: subject.id,
                dayOfWeek: 1, // Monday
                startTime: new Date('1970-01-01T08:00:00Z'),
                endTime: new Date('1970-01-01T09:00:00Z')
            }
        });

        // 3. Student
        const user = await prisma.user.create({
            data: {
                roleId: ROLES.STUDENT,
                username: 'absent_kid',
                email: 'kid@test.com',
                passwordHash: 'xx',
                firstName: 'Kid',
                lastName: 'Late'
            }
        });
        const student = await prisma.student.create({
            data: {
                userId: user.id,
                classId: classObj.id,
                dateOfBirth: new Date('2010-01-01')
            }
        });

        return { student, timetable, subject };
    }

    describe('Happy Path', () => {
        it('should mark an absence for a student', async () => {
            const { student, timetable } = await setupTimetable();
            const token = generateToken(ROLES.TEACHER, 101);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: MARK_ABSENCE,
                    variables: {
                        studentId: student.userId,
                        timetableId: timetable.id,
                        date: '2025-05-20',
                        reason: 'Sick',
                        isExcused: true
                    }
                });

            expect(res.body.errors).toBeUndefined();
            expect(res.body.data.markAbsence.reason).toBe('Sick');
            expect(res.body.data.markAbsence.isExcused).toBe(true);
            expect(res.body.data.markAbsence.date).toBe('2025-05-20');
        });

        it('should correctly resolve related subject', async () => {
            const { student, timetable } = await setupTimetable();
            const token = generateToken(ROLES.TEACHER, 101);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: MARK_ABSENCE,
                    variables: {
                        studentId: student.userId,
                        timetableId: timetable.id,
                        date: '2025-05-21',
                        reason: 'Skipped'
                    }
                });

            expect(res.body.errors).toBeUndefined();
            expect(res.body.data.markAbsence.subject.name).toBe('History');
        });

         it('should default isExcused to false if not provided', async () => {
            const { student, timetable } = await setupTimetable();
            const token = generateToken(ROLES.TEACHER, 101);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: MARK_ABSENCE,
                    variables: {
                        studentId: student.userId,
                        timetableId: timetable.id,
                        date: '2025-05-22'
                    }
                });

            expect(res.body.errors).toBeUndefined();
            expect(res.body.data.markAbsence.isExcused).toBe(false);
        });
    });

    describe('Sad Path', () => {
        it('should fail if unauthenticated', async () => {
            const res = await request(app)
                .post('/graphql')
                .send({
                    query: MARK_ABSENCE,
                    variables: {
                        studentId: 1, timetableId: 1, date: '2022-01-01'
                    }
                });

            // Expect unauthorized
             if (res.status === 200) {
                 expect(res.body.errors).toBeDefined();
            } else {
                 expect(res.status).not.toBe(200);
            }
        });

        it('should fail when marking absence for non-existent student', async () => {
            const { timetable } = await setupTimetable();
            const token = generateToken(ROLES.TEACHER, 101);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: MARK_ABSENCE,
                    variables: {
                        studentId: 99999,
                        timetableId: timetable.id,
                        date: '2025-05-20'
                    }
                });

            // Prisma Foreign Key constraint violation
            expect(res.body.errors).toBeDefined();
        });

        it('should fail when marking absence for non-existent timetable', async () => {
            const { student } = await setupTimetable();
            const token = generateToken(ROLES.TEACHER, 101);

            const res = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    query: MARK_ABSENCE,
                    variables: {
                        studentId: student.userId,
                        timetableId: 88888,
                        date: '2025-05-20'
                    }
                });

            expect(res.body.errors).toBeDefined();
        });
    });

});
