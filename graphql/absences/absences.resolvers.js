const prisma = require('../../lib/client');

const resolvers = {
  Mutation: {
    markAbsence: async (_, { studentId, timetableId, date, reason, isExcused }) => {
      return await prisma.absence.create({
        data: {
          studentId,
          timetableId,
          date: new Date(date), // ISO String to Date
          reason,
          isExcused: isExcused || false
        }
      });
    }
  },
  Absence: {
    date: (parent) => parent.date.toISOString().split('T')[0], // Return YYYY-MM-DD
    student: async (parent) => {
      return await prisma.student.findUnique({
        where: { userId: parent.studentId }
      });
    },
    timetable: async (parent) => {
      return await prisma.timetable.findUnique({
        where: { id: parent.timetableId }
      });
    },
    subject: async (parent) => {
      // Navigate: Absence -> Timetable -> Subject
      // We can do this efficiently by including relation in findUnique if we had context, 
      // but here we just fetch.
      const timetable = await prisma.timetable.findUnique({
        where: { id: parent.timetableId },
        include: { subject: true }
      });
      return timetable ? timetable.subject : null;
    }
  }
};

module.exports = resolvers;
