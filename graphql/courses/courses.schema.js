const courseTypeDefs = `
  type Subject {
    id: Int!
    name: String!
    code: String
  }

  input CreateClassCourseInput {
    classId: Int!
    subjectId: Int!
    teacherId: Int!
  }

  type ClassCourse {
    id: Int!
    class: Class!
    subject: Subject!
    teacher: User!
  }

  type Mutation {
    # Requirement: Assign a teacher to a subject for a specific class
    assignTeacherToSubject(input: CreateClassCourseInput!): ClassCourse!
  }
`;

module.exports = courseTypeDefs;