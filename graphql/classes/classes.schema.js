module.exports = `
  type GradeLevel {
    id: Int
    name: String
    numericLevel: Int
  }
    
  type Class {
    id: Int!
    name: String!
    academicYear: String
    gradeLevel: GradeLevel 
    homeroomTeacher: User
    students: [User!]!
  }

  type Query {
    getAllClasses: [Class!]!
  }
`;