const { makeExecutableSchema } = require('@graphql-tools/schema');
const { mergeTypeDefs, mergeResolvers } = require('@graphql-tools/merge');

// --- Import Domains Manually (Cleanest for explicit history) ---
// 1. Classes Domain
const classesTypeDefs = require('./classes/classes.schema');
const classesResolvers = require('./classes/classes.resolvers');

// 2. Teachers Domain
const teachersTypeDefs = require('./teachers/teachers.schema');
const teachersResolvers = require('./teachers/teachers.resolvers');

// 3. Users Domain
const usersTypeDefs = require('./users/users.schema');
const usersResolvers = require('./users/users.resolvers');

// 3. Courses Domain (Your new assignment logic)
const coursesTypeDefs = require('./courses/courses.schema');
const coursesResolvers = require('./courses/courses.resolvers');

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
  teachersTypeDefs,
  usersTypeDefs,
  coursesTypeDefs
]);

const resolvers = mergeResolvers([
  classesResolvers,
  teachersResolvers,
  usersResolvers,
  coursesResolvers
]);

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

module.exports = schema;