const { ROLES } = require('../../auth/roleMiddleware');

const gradesResolvers = {
  Mutation: {
    addGrade: async (_parent, { input }, context) => {
      const { prisma, user } = context;

      if (!user || user.roleId !== ROLES.TEACHER) {
        throw new Error('Forbidden: Only teachers can add grades');
      }

      const { value, studentId, subjectId, comments } = input;

      // Does teacher teach this student?
      const student = await prisma.student.findUnique({
        where: { userId: studentId },
        include: { class: true }
      });

      if (!student) throw new Error('Student not found');

      const assignment = await prisma.classCourse.findFirst({
        where: {
          classId: student.classId,
          subjectId: subjectId,
          teacherId: user.id
        }
      });

      if (!assignment) {
        throw new Error('Unauthorized: You do not teach this subject to this class.');
      }

      const newGrade = await prisma.grade.create({
        data: {
          gradeValue: value,
          gradeDate: new Date(),
          comments: comments,
          // Connect Student (using userId as discovered previously)
          student: { connect: { userId: studentId } },
          // Connect Subject
          subject: { connect: { id: subjectId } }
        },
        include: {
          student: { include: { user: true } },
          subject: true
        }
      });

      // Since DB didn't return a teacher, we attach the current user 
      // so the GraphQL return type (Grade.teacher) is satisfied.
      return {
        ...newGrade,
        id: Number(newGrade.id), // Ensure BigInt is converted to Number immediately
        teacher: user 
      };
    }
  },

  Query: {
    myGrades: async (_parent, _args, context) => {

      const { prisma, user } = context;
      if (!user || user.roleId !== ROLES.STUDENT) throw new Error('Forbidden');

      const studentProfile = await prisma.student.findUnique({
        where: { userId: user.id }
      });

      if (!studentProfile) throw new Error('Student profile not found');

      // Optimization: Fetch grades AND pre-load relation data to avoid N+1 problem.
      return await prisma.grade.findMany({
        where: { studentId: studentProfile.id },
        include: { subject: true } 
      });
    }
  },

  Grade: {
    // Handling BigInt to Number conversion as Prisma returns BigInt for keys defined as BigInt
    id: (parent) => {
        const id = parent.id || parent.gradeId || parent.grade_id;
        return typeof id === 'bigint' ? Number(id) : id;
    },
    value: (parent) => {
       const val = parent.gradeValue || parent.grade_value;
       // Handle Decimal to Number conversion
       return (val && typeof val.toNumber === 'function') ? val.toNumber() : val;
    },
    date: (parent) => {
       const d = parent.gradeDate || parent.grade_date;
       return d ? new Date(d).toISOString() : null;
    }
  }
};

module.exports = gradesResolvers;