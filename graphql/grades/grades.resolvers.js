'use strict';

const { ROLES } = require('../../auth/roleMiddleware');
const { pubsub, EVENTS } = require('../../lib/pubsub');

/**
 * Helper to format a grade record for GraphQL response
 */
const formatGrade = (grade) => ({
  id: Number(grade.id),
  studentId: grade.studentId,
  subjectId: grade.subjectId,
  gradeValue: parseFloat(grade.gradeValue),
  gradeDate: grade.gradeDate.toISOString().split('T')[0],
  comments: grade.comments,
  student: grade.student?.user || null,
  subject: grade.subject || null,
});

const gradesResolvers = {
  Query: {
    getStudentGrades: async (_source, { studentId }, context) => {
      const { prisma, user } = context;

      if (!user?.id) {
        throw new Error('Unauthorized');
      }

      // Teachers can view any student's grades
      // Students can only view their own grades
      if (user.roleId === ROLES.STUDENT && user.id !== studentId) {
        throw new Error('Forbidden: You can only view your own grades');
      }

      const grades = await prisma.grade.findMany({
        where: { studentId },
        include: {
          student: {
            include: { user: true },
          },
          subject: true,
        },
        orderBy: { gradeDate: 'desc' },
      });

      return grades.map(formatGrade);
    },
  },

  Mutation: {
    addGrade: async (_source, { input }, context) => {
      const { prisma, user } = context;

      // Only teachers can add grades
      if (!user?.id || user.roleId !== ROLES.TEACHER) {
        throw new Error('Forbidden: Only teachers can add grades');
      }

      const { studentId, subjectId, gradeValue, comments } = input;

      // Verify student exists
      const student = await prisma.student.findUnique({
        where: { userId: studentId },
      });

      if (!student) {
        throw new Error(`Student with ID ${studentId} not found`);
      }

      // Verify subject exists
      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
      });

      if (!subject) {
        throw new Error(`Subject with ID ${subjectId} not found`);
      }

      // Create the grade
      const newGrade = await prisma.grade.create({
        data: {
          studentId,
          subjectId,
          gradeValue,
          comments: comments || null,
        },
        include: {
          student: {
            include: { user: true },
          },
          subject: true,
        },
      });

      const formattedGrade = formatGrade(newGrade);

      // Publish event to the student-specific channel for real-time notification
      // CRITICAL: Dynamic channel ensures privacy - Student A never receives Student B's grades
      const channelName = `${EVENTS.GRADE_ADDED}_${studentId}`;
      
      await pubsub.publish(channelName, {
        gradeAdded: formattedGrade,
      });

      return formattedGrade;
    },
  },

  Subscription: {
    gradeAdded: {
      // Subscribe to the student-specific channel
      // This ensures each student only receives their own grade notifications
      subscribe: (_source, { studentId }, context) => {
        const { user } = context;

        // Validate that user is authenticated via WebSocket
        if (!user?.id) {
          throw new Error('Unauthorized: Authentication required for subscriptions');
        }

        // Students can only subscribe to their own grades
        // Teachers/Admins can subscribe to any student's grades (for monitoring)
        if (user.roleId === ROLES.STUDENT && user.id !== studentId) {
          throw new Error('Forbidden: You can only subscribe to your own grades');
        }

        // Return async iterator for the student-specific channel
        const channelName = `${EVENTS.GRADE_ADDED}_${studentId}`;
        return pubsub.asyncIterator([channelName]);
      },
    },
  },
};

module.exports = gradesResolvers;
