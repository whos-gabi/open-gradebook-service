const studentsResolvers = {
  // Add a dedicated Student resolver to handle the ID mapping across the board
  Student: {
    id: (parent) => parent.id || parent.userId,
    user: (parent) => parent.user
  },

  Query: {
    students: async (_parent, { skip, take }, context) => {
      const { prisma } = context;

      const studentsData = await prisma.student.findMany({
        skip: skip || 0,
        take: take || 10,
        include: {
          user: true
        }
      });

      // FIX: Return raw data and let the Student: { } resolver handle mapping
      return studentsData;
    }
  }
};

module.exports = studentsResolvers;