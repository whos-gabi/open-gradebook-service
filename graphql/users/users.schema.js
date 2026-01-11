module.exports = `
  type User {
    id: Int!
    firstName: String
    lastName: String
    email: String
    role: String!
  }

  type Query {
    # Returns the currently logged-in user
    me: User
    
    # For admins
    getAllUsers: [User!]!
  }
`;