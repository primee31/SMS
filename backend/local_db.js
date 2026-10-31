import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import EmbeddedPostgres from 'embedded-postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbDir = path.resolve(__dirname, './data/db');

async function start() {
  console.log('[LocalPG] Initializing Embedded PostgreSQL at:', dbDir);
  const exists = fs.existsSync(dbDir);

  const pg = new EmbeddedPostgres({
    databaseDir: dbDir,
    user: 'postgres',
    password: 'password',
    port: 5432,
    persistent: true,
  });

  if (!exists) {
    console.log('[LocalPG] Running initialise()...');
    await pg.initialise();
  }

  console.log('[LocalPG] Starting PostgreSQL server on port 5432...');
  await pg.start();
  console.log('[LocalPG] PostgreSQL started!');

  try {
    await pg.createDatabase('brightloop_sms');
    console.log('[LocalPG] Database brightloop_sms created successfully!');
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      console.log('[LocalPG] Database brightloop_sms already exists.');
    } else {
      console.log('[LocalPG] createDatabase status:', err.message);
    }
  }

  console.log('[LocalPG] Embedded PostgreSQL is READY on localhost:5432 with user=postgres, password=password, db=brightloop_sms');

  // Keep process alive
  process.on('SIGINT', async () => {
    console.log('[LocalPG] Stopping PostgreSQL...');
    await pg.stop();
    process.exit(0);
  });
}

start().catch(err => {
  console.error('[LocalPG] ERROR:', err);
  process.exit(1);
});
