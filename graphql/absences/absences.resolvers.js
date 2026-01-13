const prisma = require('../../lib/client');
const { ROLES } = require('../../auth/roleMiddleware');

const resolvers = {
  Query: {
    myAbsences: async (_, __, context) => {
      const { prisma, user } = context;
      if (!user || user.roleId !== ROLES.STUDENT) {
        throw new Error('Forbidden: Only students can view their own absences');
      }

      const student = await prisma.student.findUnique({
        where: { userId: user.id }
      });

      if (!student) {
        throw new Error('Student profile not found');
      }

      const absences = await prisma.absence.findMany({
        where: { studentId: student.userId },
        include: {
          timetable: {
            include: { subject: true }
          }
        },
        orderBy: { date: 'desc' }
      });

      // Map to ensure subject is available at root level if needed by the type definition
      return absences.map(a => ({
        ...a,
        subject: a.timetable ? a.timetable.subject : null
      }));
    }
  },
  Mutation: {
    markAbsence: async (_, { studentId, timetableId, date, reason, isExcused }) => {
      return await prisma.absence.create({
        data: {
          studentId,
          timetableId,
          date: new Date(date), 
          reason,
          isExcused: isExcused || false
        }
      });
    },

    excuseAbsence: async (_, { absenceId, reason }, context) => {
      const { prisma, user } = context;
      // Allow Teacher or Admin
      if (!user || (user.roleId !== ROLES.TEACHER && user.roleId !== ROLES.ADMIN)) {
        throw new Error('Forbidden: Only teachers or admins can excuse absences');
      }

      const id = parseInt(absenceId, 10);
      
      const existing = await prisma.absence.findUnique({ where: { id } });
      if (!existing) {
        throw new Error('Absence not found');
      }

      return await prisma.absence.update({
        where: { id },
        data: {
          isExcused: true,
          reason: reason || existing.reason
        },
        include: {
          student: { include: { user: true } },
          timetable: { include: { subject: true } }
        }
      });
    }
  },
  Absence: {
    date: (parent) => {
        if (!parent.date) return null;
        return parent.date instanceof Date 
            ? parent.date.toISOString().split('T')[0] 
            : parent.date;
    },
    
    student: async (parent) => {
      return await prisma.student.findUnique({
        where: { userId: parent.studentId },
        include: { user: true } 
      });
    },

    timetable: async (parent) => {
      return await prisma.timetable.findUnique({
        where: { id: parent.timetableId }
      });
    },

    subject: async (parent) => {
      const timetable = await prisma.timetable.findUnique({
        where: { id: parent.timetableId },
        include: { subject: true }
      });
      return timetable ? timetable.subject : null;
    }
  }
};

module.exports = resolvers;