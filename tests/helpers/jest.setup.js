/* eslint-disable no-undef */
const { prisma } = require('./db');

// Mock existing client to return our test client instance
jest.mock('../../lib/client', () => {
    const { prisma } = require('./db');
    return prisma;
});

// Ensure secret matches auth helper
process.env.JWT_SECRET = 'test-secret';

jest.setTimeout(30000);
