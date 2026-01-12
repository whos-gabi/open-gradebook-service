const fs = require('fs');
const path = require('path');

const { makeExecutableSchema } = require('@graphql-tools/schema');
const { mergeTypeDefs, mergeResolvers } = require('@graphql-tools/merge');

// Helper to load .graphql files
const loadSchema = (relativePath) => 
  fs.readFileSync(path.join(__dirname, relativePath), 'utf8');

// --- Import Domains Manually (Cleanest for explicit history) ---
// 1. Classes Domain
const classesTypeDefs = loadSchema('./classes/classes.graphql');
const classesResolvers = require('./classes/classes.resolvers');

// 2. Teachers Domain
const teachersTypeDefs = loadSchema('./teachers/teachers.graphql');
const teachersResolvers = require('./teachers/teachers.resolvers');

// 3. Users Domain
const usersTypeDefs = loadSchema('./users/users.graphql');
const usersResolvers = require('./users/users.resolvers');

// 4. Courses Domain (Your new assignment logic)
const coursesTypeDefs = loadSchema('./courses/courses.graphql');
const coursesResolvers = require('./courses/courses.resolvers');

// 5. Grades Domain (With real-time subscriptions)
const gradesTypeDefs = loadSchema('./grades/grades.graphql');
const gradesResolvers = require('./grades/grades.resolvers');

// --- Base Definition (The "Root" types) ---
const rootTypeDefs = `
  type Query {
    _empty: String
  }
  type Mutation {
    _empty: String
  }
  type Subscription {
    _empty: String
  }
`;

// --- Merge ---
const typeDefs = mergeTypeDefs([
  rootTypeDefs,
  classesTypeDefs,
  teachersTypeDefs,
  usersTypeDefs,
  coursesTypeDefs,
  gradesTypeDefs
]);

const resolvers = mergeResolvers([
  classesResolvers,
  teachersResolvers,
  usersResolvers,
  coursesResolvers,
  gradesResolvers
]);

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

module.exports = schema;