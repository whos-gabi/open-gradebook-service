const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Prisma } = require('@prisma/client');
const prisma = require('../lib/client');
const { ROLES } = require('./roleMiddleware');

class AuthError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

const ensureJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AuthError('JWT secret is not configured', 500);
  }
  return secret;
};

const hashPassword = (plainPassword) => {
  if (!plainPassword) {
    throw new AuthError('Password is required');
  }
  return crypto.createHash('sha256').update(plainPassword).digest('hex');
};

const sanitizeUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  roleId: user.roleId,
  firstName: user.firstName,
  lastName: user.lastName,
});

const createStudentRecord = async (tx, userId, studentPayload = {}) => {
  const data = { userId };

  if (typeof studentPayload.classId !== 'undefined') {
    data.classId = studentPayload.classId;
  }

  if (studentPayload.dateOfBirth) {
    data.dateOfBirth = new Date(studentPayload.dateOfBirth);
  }

  await tx.student.create({ data });
};

const createTeacherRecord = async (tx, userId, teacherPayload = {}) => {
  const data = { userId };

  if (typeof teacherPayload.specialization !== 'undefined') {
    data.specialization = teacherPayload.specialization;
  }

  if (teacherPayload.hireDate) {
    data.hireDate = new Date(teacherPayload.hireDate);
  }

  await tx.teacher.create({ data });
};

const handlePrismaError = (error) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new AuthError('Username or email already exists', 409);
    }
  }
  throw error;
};

const registerUser = async (input = {}) => {
  const {
    username,
    email,
    password,
    firstName,
    lastName,
    roleId,
    student,
    teacher,
  } = input;

  if (!username || !email || !password || !firstName || !lastName || typeof roleId === 'undefined') {
    throw new AuthError('Missing required fields for registration');
  }

  const normalizedRole = Number(roleId);
  if (![ROLES.STUDENT, ROLES.TEACHER].includes(normalizedRole)) {
    throw new AuthError('Only student or teacher roles can be registered via this endpoint');
  }

  const passwordHash = hashPassword(password);

  try {
    const createdUser = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username,
          email,
          passwordHash,
          firstName,
          lastName,
          roleId: normalizedRole,
        },
      });

      if (normalizedRole === ROLES.STUDENT) {
        await createStudentRecord(tx, newUser.id, student);
      } else if (normalizedRole === ROLES.TEACHER) {
        await createTeacherRecord(tx, newUser.id, teacher);
      }

      return newUser;
    });

    return sanitizeUser(createdUser);
  } catch (error) {
    handlePrismaError(error);
    throw error;
  }
};

const loginUser = async (input = {}) => {
  const { username, email, password } = input;

  if (!password) {
    throw new AuthError('Password is required to login');
  }

  if (!username && !email) {
    throw new AuthError('Provide a username or email to login');
  }

  const where = username ? { username } : { email };

  const user = await prisma.user.findUnique({ where });
  if (!user) {
    throw new AuthError('Invalid credentials', 401);
  }

  const incomingHash = hashPassword(password);
  if (incomingHash !== user.passwordHash) {
    throw new AuthError('Invalid credentials', 401);
  }

  const token = jwt.sign(
    {
      user_id: user.id,
      role_id: user.roleId,
    },
    ensureJwtSecret(),
    { expiresIn: '4h' },
  );

  return {
    token,
    user: sanitizeUser(user),
  };
};

module.exports = {
  AuthError,
  loginUser,
  registerUser,
};

