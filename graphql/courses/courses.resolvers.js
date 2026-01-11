const { ROLES } = require('../../auth/roleMiddleware');

const courseResolvers = {
  Mutation: {
    assignTeacherToSubject: async (_source, { input }, context) => {
      const { prisma, user } = context;

      // 1. Authorization Check (Admin only)
      if (user.roleId !== ROLES.ADMIN) throw new Error('Forbidden');

      // 2. Create the record in the junction table
      const newCourse = await prisma.classCourse.create({
        data: {
          classId: input.classId,
          subjectId: input.subjectId,
          teacherId: input.teacherId,
        },
        include: {
          class: { include: { gradeLevel: true } },
          subject: true,
          teacher: { include: { user: true } }
        }
      });

      // 3. Return the fully populated object (No blind IDs)
      return {
        id: newCourse.id,
        class: newCourse.class,
        subject: newCourse.subject,
        teacher: newCourse.teacher.user
      };
    }
  }
};

module.exports = courseResolvers;