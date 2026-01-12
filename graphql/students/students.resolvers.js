const studentsResolvers = {
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

      // FIX: Map the database result to match GraphQL schema
      return studentsData.map(student => ({
        // 1. Map the ID. 
         id: student.userId, 
        
        // 2. Pass the rest of the user data
        user: student.user
      }));
    }
  }
};

module.exports = studentsResolvers;