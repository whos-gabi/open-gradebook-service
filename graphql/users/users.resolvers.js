const usersResolvers = {
  Query: {
    me: async (_source, _args, context) => {
      const { prisma, user } = context;
      if (!user?.id) return null;
      
      return prisma.user.findUnique({
        where: { id: user.id },
        include: { role: true } // Fetch role immediately for 'me'
      });
    },

    getAllUsers: async (_source, _args, context) => {
      const { prisma } = context;
      return prisma.user.findMany({
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
      // Prisma field is `roleId` (but we also accept legacy `role_id` if present)
      const roleId = parent.roleId ?? parent.role_id;
      if (typeof roleId !== 'undefined' && roleId !== null) {
        const roleData = await context.prisma.role.findUnique({
          where: { id: roleId }
        });
        return roleData?.name || 'UNKNOWN';
      }

      // Schema declares role: String! so never return null
      return 'UNKNOWN';
    }
  }
};

module.exports = usersResolvers;