'use strict';

// Ensures the database is migrated and seeded before the test suite runs.
const { execSync } = require('child_process');
const path = require('path');

module.exports = async function globalSetup() {
  const root = path.join(__dirname, '..');
  const env = {
    ...process.env,
    DATABASE_URL: `file:${path.join(root, 'prisma', 'dev.db')}`,
  };

  try {
    execSync('node prisma/seed.mjs', { cwd: root, stdio: 'pipe', env });
  } catch (err) {
    console.warn('[globalSetup] Seed warning:', err.message);
  }
};
