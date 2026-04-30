'use strict';

// Clears the database and re-seeds it before the test suite runs so that
// integration tests always start from a known state regardless of prior runs.
const { execSync } = require('child_process');
const path = require('path');
const Database = require('better-sqlite3');

module.exports = async function globalSetup() {
  const root = path.join(__dirname, '..');
  const dbPath = path.join(root, 'prisma', 'dev.db');
  const dbUrl = `file:${dbPath}`;

  // Wipe all tables synchronously via better-sqlite3 (faster than Prisma client)
  try {
    const db = new Database(dbPath);
    db.exec('DELETE FROM Rsvp; DELETE FROM Event; DELETE FROM User;');
    db.close();
  } catch {
    // DB may not exist yet — seed will create it via migrate deploy
  }

  const env = { ...process.env, DATABASE_URL: dbUrl };

  // Apply any pending migrations then seed fresh data
  try {
    execSync('npx prisma migrate deploy', { cwd: root, stdio: 'pipe', env });
  } catch (err) {
    console.warn('[globalSetup] migrate warning:', err.message);
  }

  execSync('node prisma/seed.mjs', { cwd: root, stdio: 'pipe', env });
};
