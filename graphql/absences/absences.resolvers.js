const prisma = require('../../lib/client');

const resolvers = {
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