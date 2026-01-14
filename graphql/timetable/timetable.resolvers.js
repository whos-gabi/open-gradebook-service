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
      // Dacă e obiect Date, luăm doar ora și minutele
      if (parent.startTime instanceof Date) {
        return parent.startTime.toISOString().substring(11, 16); // Returnează "HH:MM"
        // SAU dacă vrei tot stringul ISO dar fără dată, e complicat, mai bine returnezi HH:MM
      }
      return parent.startTime;
    },
    endTime: (parent) => {
      if (parent.endTime instanceof Date) {
        return parent.endTime.toISOString().substring(11, 16); // Returnează "HH:MM"
      }
      return parent.endTime;
    }
  }
};

module.exports = resolvers;
