'use strict';

// Resets the database to seed state before each test file so that
// integration tests don't bleed state into one another.
const { execSync } = require('child_process');
const path = require('path');
const Database = require('better-sqlite3');

const root = path.join(__dirname, '..');
const dbPath = path.join(root, 'prisma', 'dev.db');
const dbUrl = `file:${dbPath}`;
const env = { ...process.env, DATABASE_URL: dbUrl };

beforeAll(() => {
  const db = new Database(dbPath);
  db.exec('DELETE FROM Rsvp; DELETE FROM Event; DELETE FROM User;');
  db.close();
  execSync('node prisma/seed.mjs', { cwd: root, stdio: 'pipe', env });
});
