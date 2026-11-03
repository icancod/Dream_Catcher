
import 'dotenv/config';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import pool from './config/database.js';
import { initDatabase } from './config/database-init.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  let sqliteDB;

  try {
    // Ensure PostgreSQL table exists
    await initDatabase();

    // Open existing SQLite database
    sqliteDB = await open({
      filename: join(__dirname, 'dreams.db'),
      driver: sqlite3.Database
    });

    // Read existing records
    const dreams = await sqliteDB.all(`
      SELECT id, dream_text, interpretation, created_at
      FROM dreams
      ORDER BY id
    `);

    console.log(`Found ${dreams.length} SQLite records`);

    // Insert records into PostgreSQL
    for (const dream of dreams) {
      await pool.query(
        `INSERT INTO dreams
          (id, dream_text, interpretation, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [
          dream.id,
          dream.dream_text,
          dream.interpretation,
          dream.created_at
        ]
      );
    }

    // Reset PostgreSQL auto-increment sequence
    await pool.query(`
      SELECT setval(
        pg_get_serial_sequence('dreams', 'id'),
        COALESCE((SELECT MAX(id) FROM dreams), 1),
        EXISTS(SELECT 1 FROM dreams)
      )
    `);

    // Verify record count
    const result = await pool.query(
      'SELECT COUNT(*) FROM dreams'
    );

    console.log('Migration completed successfully');
    console.log('PostgreSQL dream count:', result.rows[0].count);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    if (sqliteDB) {
      await sqliteDB.close();
    }

    await pool.end();
  }
}

migrate();
