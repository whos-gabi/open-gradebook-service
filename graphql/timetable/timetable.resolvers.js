const prisma = require('../../lib/client');

const resolvers = {
  Query: {
    getTimetable: async (_, { classId }) => {
      // Return timetable entries for a class, ordered by day/time.
      return await prisma.timetable.findMany({
        where: { classId },
        orderBy: [
          { dayOfWeek: 'asc' },
          { startTime: 'asc' }
        ]
      });
    }
  },
  Timetable: {
    // Resolve the nested 'subject'
    subject: async (parent) => {
      return await prisma.subject.findUnique({
        where: { id: parent.subjectId }
      });
    },
    // Resolve the nested 'class'
    class: async (parent) => {
       return await prisma.class.findUnique({
         where: { id: parent.classId }
       });
    },
    // Format times if needed. Prisma returns Date objects for DateTime @db.Time depending on provider.
    // PostgreSQL @db.Time returns Date object with dummy date 1970-01-01.
    // We'll return ISO string or HH:mm:ss. String is safest.
    startTime: (parent) => {
        return parent.startTime.toISOString ? parent.startTime.toISOString() : parent.startTime;
    },
    endTime: (parent) => {
        return parent.endTime.toISOString ? parent.endTime.toISOString() : parent.endTime;
    }
  }
};

module.exports = resolvers;
