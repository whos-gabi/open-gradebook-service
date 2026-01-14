const { ROLES } = require('../../auth/roleMiddleware');
const { PubSub, withFilter } = require('graphql-subscriptions');
const { publishGradeNotification } = require('../../lib/gradeNotificationHub');

const pubsub = new PubSub();
const GRADE_ADDED = 'GRADE_ADDED';

const gradesResolvers = {
  Mutation: {
    addGrade: async (_parent, { input }, context) => {
      const { prisma, user } = context;

      if (!user || user.roleId !== ROLES.TEACHER) {
        throw new Error('Forbidden: Only teachers can add grades');
      }

      const { value, studentId, subjectId, comments } = input;

      // Does teacher teach this student?
      const student = await prisma.student.findUnique({
        where: { userId: studentId },
        include: { class: true }
      });

      if (!student) throw new Error('Student not found');

      const assignment = await prisma.classCourse.findFirst({
        where: {
          classId: student.classId,
          subjectId: subjectId,
          teacherId: user.id
        }
      });

      if (!assignment) {
        throw new Error('Unauthorized: You do not teach this subject to this class.');
      }

      const newGrade = await prisma.grade.create({
        data: {
          gradeValue: value,
          gradeDate: new Date(),
          comments: comments,
          // Connect Student (using userId as discovered previously)
          student: { connect: { userId: studentId } },
          // Connect Subject
          subject: { connect: { id: subjectId } }
        },
        include: {
          student: { include: { user: true } },
          subject: true
        }
      });

      // Since DB didn't return a teacher, we attach the current user 
      // so the GraphQL return type (Grade.teacher) is satisfied.
      const result = {
        ...newGrade,
        id: Number(newGrade.id), // Ensure BigInt is converted to Number immediately
        teacher: user 
      };

      // Publish grade notification (GraphQL subscription + plain WS)
      pubsub.publish(GRADE_ADDED, {
        myGradeAdded: result,
        studentId,
      });
      publishGradeNotification(studentId, result);

      return result;
    }
  },

  Query: {
    myGrades: async (_parent, _args, context) => {

      const { prisma, user } = context;
      if (!user || user.roleId !== ROLES.STUDENT) throw new Error('Forbidden');

      const studentProfile = await prisma.student.findUnique({
        where: { userId: user.id }
      });

      if (!studentProfile) throw new Error('Student profile not found');

      // Optimization: Fetch grades AND pre-load relation data to avoid N+1 problem.
      return await prisma.grade.findMany({
        where: { studentId: studentProfile.id },
        include: { subject: true } 
      });
    },

    getClassGrades: async (_parent, { classId, subjectId }, context) => {
      const { prisma, user } = context;
      
      if (!user || (user.roleId !== ROLES.TEACHER && user.roleId !== ROLES.ADMIN)) {
        throw new Error('Forbidden: Only teachers or admins can view class grades');
      }

      // Optional: Check if teacher teaches this class/subject
      if (user.roleId === ROLES.TEACHER) {
        const assignment = await prisma.classCourse.findFirst({
          where: {
            classId: classId,
            subjectId: subjectId,
            teacherId: user.id
          }
        });
        if (!assignment) {
          throw new Error('Unauthorized: You are not assigned to this class and subject.');
        }
      }

      return await prisma.grade.findMany({
        where: {
          subjectId: subjectId,
          student: {
            classId: classId
          }
        },
        include: {
          student: {
            include: { user: true }
          },
          subject: true
        },
        orderBy: { gradeDate: 'desc' }
      });
    }
  },

  Subscription: {
    myGradeAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([GRADE_ADDED]),
        (payload, _variables, context) => {
          // Student-only; deliver only to the student that received the grade
          return (
            context?.user?.roleId === ROLES.STUDENT &&
            payload?.studentId === context.user.id
          );
        },
      ),
      resolve: (payload) => payload.myGradeAdded,
    },
  },

  Grade: {
    // Handling BigInt to Number conversion as Prisma returns BigInt for keys defined as BigInt
    id: (parent) => {
        const id = parent.id || parent.gradeId || parent.grade_id;
        return typeof id === 'bigint' ? Number(id) : id;
    },
    value: (parent) => {
       const val = parent.gradeValue || parent.grade_value;
       // Handle Decimal to Number conversion
       return (val && typeof val.toNumber === 'function') ? val.toNumber() : val;
    },
    date: (parent) => {
       const d = parent.gradeDate || parent.grade_date;
       return d ? new Date(d).toISOString() : null;
    }
  }
};

module.exports = gradesResolvers;
