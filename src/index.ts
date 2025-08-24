import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL!,
});

export const db = drizzle(client);

// let db: ReturnType<typeof drizzle> | null = null;

// export async function getDB() {
//   if (!db) {
//     await client.connect();   // connect only once
//     db = drizzle(client);
//   }
//   return db;
// }