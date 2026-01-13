const fs = require('fs');
const path = require('path');

const { makeExecutableSchema } = require('@graphql-tools/schema');
const { mergeTypeDefs, mergeResolvers } = require('@graphql-tools/merge');

// Helper to load .graphql files
const loadSchema = (relativePath) => 
  fs.readFileSync(path.join(__dirname, relativePath), 'utf8');

// Import Domains Manually
// 1. Classes Domain
const classesTypeDefs = fs.readFileSync(path.join(__dirname, 'classes', 'classes.graphql'), 'utf8' );
const classesResolvers = require('./classes/classes.resolvers');

// 2. Courses Domain
const coursesTypeDefs = fs.readFileSync(path.join(__dirname, 'courses', 'courses.graphql'), 'utf8' );
const coursesResolvers = require('./courses/courses.resolvers');

// 3. Users Domain
const usersTypeDefs = fs.readFileSync(path.join(__dirname, 'users', 'users.graphql'), 'utf8' );
const usersResolvers = require('./users/users.resolvers');

// 4. Teachers Domain
const teachersTypeDefs = fs.readFileSync(path.join(__dirname,  'teachers', 'teachers.graphql'), 'utf8' );
const teachersResolvers = require('./teachers/teachers.resolvers');

// 5. Students Domain
const studentsTypeDefs = fs.readFileSync(path.join(__dirname, 'students', 'students.graphql'), 'utf8');
const studentsResolvers = require('./students/students.resolvers');

// 6. Grades Domain
const gradesTypeDefs = fs.readFileSync(path.join(__dirname, 'grades', 'grades.graphql'), 'utf8');
const gradesResolvers = require('./grades/grades.resolvers');

// --- Base Definition (The "Root" types) ---
const rootTypeDefs = `
  type Query {
    _empty: String
  }
  type Mutation {
    _empty: String
  }
`;

// --- Merge ---
const typeDefs = mergeTypeDefs([
  rootTypeDefs,
  classesTypeDefs,
  coursesTypeDefs,
  usersTypeDefs,
  teachersTypeDefs,
  studentsTypeDefs,
  gradesTypeDefs
]);

const resolvers = mergeResolvers([
  classesResolvers,
  coursesResolvers,
  usersResolvers,
  teachersResolvers,
  studentsResolvers,
  gradesResolvers
]);

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

module.exports = schema;