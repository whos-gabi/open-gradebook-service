const fs = require('fs');
const path = require('path');

const { makeExecutableSchema } = require('@graphql-tools/schema');
const { mergeTypeDefs, mergeResolvers } = require('@graphql-tools/merge');

const loadSchema = (relativePath) =>
  fs.readFileSync(path.join(__dirname, relativePath), 'utf8');

// --- Domain SDL + Resolvers ---
const domains = [
  {
    typeDefs: loadSchema('classes/classes.graphql'),
    resolvers: require('./classes/classes.resolvers'),
  },
  {
    typeDefs: loadSchema('courses/courses.graphql'),
    resolvers: require('./courses/courses.resolvers'),
  },
  {
    typeDefs: loadSchema('users/users.graphql'),
    resolvers: require('./users/users.resolvers'),
  },
  {
    typeDefs: loadSchema('teachers/teachers.graphql'),
    resolvers: require('./teachers/teachers.resolvers'),
  },
  {
    typeDefs: loadSchema('students/students.graphql'),
    resolvers: require('./students/students.resolvers'),
  },
  {
    typeDefs: loadSchema('grades/grades.graphql'),
    resolvers: require('./grades/grades.resolvers'),
  },
  {
    typeDefs: loadSchema('timetable/timetable.graphql'),
    resolvers: require('./timetable/timetable.resolvers'),
  },
  {
    typeDefs: loadSchema('absences/absences.graphql'),
    resolvers: require('./absences/absences.resolvers'),
  },
];

// --- Base Definition (Root types) ---
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

const typeDefs = mergeTypeDefs([rootTypeDefs, ...domains.map((d) => d.typeDefs)]);
const resolvers = mergeResolvers(domains.map((d) => d.resolvers));

module.exports = makeExecutableSchema({
  typeDefs,
  resolvers,
});
