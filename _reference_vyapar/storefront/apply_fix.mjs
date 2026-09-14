import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const connectionString = process.env.PUBLIC_SUPABASE_URL.replace('https://', 'postgresql://postgres.pooler:' + process.env.SUPABASE_SERVICE_ROLE_KEY + '@').replace('.supabase.co', '.supabase.co:6543/postgres?sslmode=require');
const sql = postgres(connectionString);

async function run() {
  const query = fs.readFileSync(path.resolve(__dirname, 'fix_atomic_create_order.sql'), 'utf-8');
  await sql.unsafe(query);
  console.log("Migration executed successfully!");
  await sql.end();
}

run().catch(console.error);
