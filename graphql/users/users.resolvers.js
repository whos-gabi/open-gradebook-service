const usersResolvers = {
  Query: {
    me: async (_source, _args, context) => {
      const { prisma, user } = context;
      if (!user?.id) return null;
      
      return prisma.users.findUnique({
        where: { id: user.id },
        include: { role: true } // Fetch role immediately for 'me'
      });
    },

    getAllUsers: async (_source, _args, context) => {
      const { prisma } = context;
      return prisma.users.findMany({
        include: { role: true }
      });
    }
  },

  // Field Resolvers for the 'User' type
  User: {
    // These map database snake_case to GraphQL camelCase
    // firstName: (parent) => parent.first_name,
    // lastName: (parent) => parent.last_name,

    role: async (parent, _args, context) => {
      // Case A: Role data is already loaded (Optimized)
      if (parent.role && parent.role.name) {
        return parent.role.name;
      }

      // Case B: Fallback fetch (Prevents crashes, solves "blind ID" issues)
      if (parent.role_id) {
        const roleData = await context.prisma.roles.findUnique({
          where: { id: parent.role_id }
        });
        return roleData ? roleData.name : null;
      }

      return null;
    }
  }
};

module.exports = usersResolvers;