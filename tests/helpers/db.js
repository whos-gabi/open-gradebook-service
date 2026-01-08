const { PrismaClient } = require('@prisma/test-client');
const path = require('path');

const dbPath = path.join(__dirname, '../../prisma/test.db');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`,
    },
  },
});

const resetDb = async () => {
    // Delete in order to avoid foreign key constraints
    // Common order: child tables first
    const deleteAbsences = prisma.absence.deleteMany(); // if exists
    // prisma.absence might not exist if I removed it from schema? 
    // Wait, I only removed attributes. Tables are there.
    
    // Check if tables exist in schema.prisma
    // Safest is delete from all known models.
    
    await prisma.$transaction([
        prisma.classCourse.deleteMany(),
        prisma.student.deleteMany(),
        prisma.class.deleteMany(),
        prisma.teacher.deleteMany(),
        prisma.curriculumReqs.deleteMany(),
        prisma.subject.deleteMany(),
        prisma.gradeLevel.deleteMany(),
        prisma.user.deleteMany(),
        prisma.role.deleteMany(),
    ]);
};

// Seed minimal required data (Roles)
const seedRoles = async () => {
    await prisma.role.createMany({
        data: [
            { id: 1, name: 'ADMIN' },
            { id: 2, name: 'TEACHER' },
            { id: 3, name: 'STUDENT' } // Assuming ID maps to ROLES constant
        ]
    });
};

module.exports = { prisma, resetDb, seedRoles };
