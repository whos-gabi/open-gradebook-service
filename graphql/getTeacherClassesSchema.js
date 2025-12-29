const { ROLES } = require('../auth/roleMiddleware');

const typeDefs = `
  type GradeLevel {
    id: Int
    name: String
    numericLevel: Int
  }

  type TeacherClass {
    name: String
    grade: GradeLevel
    academic_year: String
    subject: String
    homeroom_teacher: Boolean
  }

  type GetTeacherClassesResponse {
    totalClasses: Int!
    classes: [TeacherClass!]!
  }

  type Query {
    getTeacherClasses: GetTeacherClassesResponse!
  }
`;

const resolvers = {
  Query: {
    getTeacherClasses: async (_source, _args, context) => {
      const { prisma, user } = context || {};

      if (!user?.id || user.roleId !== ROLES.TEACHER) {
        throw new Error('Unauthorized');
      }

      const teacherProfile = await prisma.teacher.findUnique({
        where: { userId: user.id },
        select: { userId: true },
      });

      if (!teacherProfile) {
        throw new Error('Teacher profile not found');
      }

      const classCourses = await prisma.classCourse.findMany({
        where: { teacherId: user.id },
        include: {
          class: {
            include: {
              gradeLevel: true,
            },
          },
          subject: true,
        },
      });

      const classes = classCourses.map(({ class: classEntity, subject }) => ({
        name: classEntity.name,
        grade: classEntity.gradeLevel
          ? {
              id: classEntity.gradeLevel.id,
              name: classEntity.gradeLevel.name,
              numericLevel: classEntity.gradeLevel.numericLevel,
            }
          : null,
        academic_year: classEntity.academicYear,
        subject: subject.name,
        homeroom_teacher: classEntity.homeroomTeacherId === user.id,
      }));

      return {
        totalClasses: classes.length,
        classes,
      };
    },
  },
};

module.exports = {
  typeDefs,
  resolvers,
};

