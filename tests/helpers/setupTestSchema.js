const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../../prisma/schema.prisma');
const testSchemaPath = path.join(__dirname, '../../prisma/schema.test.prisma');

const originalSchema = fs.readFileSync(schemaPath, 'utf8');

let testSchema = originalSchema
  .replace('provider = "postgresql"', 'provider = "sqlite"')
  .replace(/url\s*=\s*env\("DATABASE_URL"\)/, 'url = "file:./test.db"') // database file in root/prisma/
  .replace(/@db\.VarChar\(\d+\)/g, '')
  .replace(/@db\.Date/g, '')
  .replace(/@db\.Text/g, '')
  .replace(/@db\.Time/g, '')
  .replace(/@db\.Decimal\(\d+,\s*\d+\)/g, '')
  .replace(/onDelete: SetNull/g, 'onDelete: Cascade')
  .replace(/BigInt/g, 'Int')
  .replace(/Decimal/g, 'Float');

// Inject custom output for the client
if (!testSchema.includes('output =')) {
    testSchema = testSchema.replace(
        'provider = "prisma-client-js"',
        'provider = "prisma-client-js"\n  output = "../node_modules/@prisma/test-client"'
    );
}

fs.writeFileSync(testSchemaPath, testSchema);
console.log('Created prisma/schema.test.prisma for SQLite testing');
