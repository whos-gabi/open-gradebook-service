const { ROLES } = require('../../auth/roleMiddleware');

const classesResolvers = {
  Query: {
    getAllClasses: async (_source, _args, context) => {
      const { prisma, user } = context;

      if (!user?.id || user.roleId !== ROLES.TEACHER) {
        throw new Error('Unauthorized');
      }

      // Optimized Fetching: Class -> Teacher -> User AND Class -> Students -> User
      const classesData = await prisma.class.findMany({
        include: {
          gradeLevel: true,
          
          homeroomTeacher: {
            include: {
              user: true
            }
          },
          
          students: {
            include: {
              user: true
            }
          }
        }
      });

      // The DB returns: Class.homeroomTeacher.user
      // The API expects: Class.homeroomTeacher (as a User object)
      return classesData.map(cls => ({
        id: cls.id,
        name: cls.name,
        academicYear: cls.academicYear, // Ensure DB snake_case matches schema camelCase
        gradeLevel: cls.gradeLevel,
        
        // Extract the User object from the Teacher relation
        homeroomTeacher: cls.homeroomTeacher?.user 
          ? cls.homeroomTeacher.user 
          : null,

        // Map the array of Students to an array of Users
        students: cls.students
          .map(student => student.user)
          .filter(Boolean)
      }));
    }
  }
};

module.exports = classesResolvers;