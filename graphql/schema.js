const fs = require('fs');
const path = require('path');

const { makeExecutableSchema } = require('@graphql-tools/schema');
const { mergeTypeDefs, mergeResolvers } = require('@graphql-tools/merge');

// Helper to load .graphql files
const loadSchema = (relativePath) => 
  fs.readFileSync(path.join(__dirname, relativePath), 'utf8');

// Import Domains Manually
// 1. Classes Domain
const classesTypeDefs = loadSchema('./classes/classes.graphql');
const classesResolvers = require('./classes/classes.resolvers');

// 2. Courses Domain
const coursesTypeDefs = loadSchema('./courses/courses.graphql');
const coursesResolvers = require('./courses/courses.resolvers');

// 3. Users Domain
const usersTypeDefs = loadSchema('./users/users.graphql');
const usersResolvers = require('./users/users.resolvers');

// 4. Teachers Domain
const teachersTypeDefs = loadSchema('./teachers/teachers.graphql');
const teachersResolvers = require('./teachers/teachers.resolvers');

// 5. Students Domain
const studentsTypeDefs = loadSchema('./students/students.graphql');
const studentsResolvers = require('./students/students.resolvers');

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
  studentsTypeDefs
]);

const resolvers = mergeResolvers([
  classesResolvers,
  coursesResolvers,
  usersResolvers,
  teachersResolvers,
  studentsResolvers
]);

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

module.exports = schema;