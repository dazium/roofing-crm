import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

// Initialize SQLite database
// In a production Capacitor app, you would use @capacitor-community/sqlite
// For Electron/PC development, better-sqlite3 is ideal.
const sqlite = new Database("roofing_crm.db");
export const db = drizzle(sqlite, { schema });

/**
 * Simple migration function to initialize the database.
 * In a larger project, use 'drizzle-kit push' or 'drizzle-kit migrate'.
 */
export async function initDb() {
  console.log("Initializing database...");
  // Note: Better-sqlite3 and Drizzle's simple setup often handle 
  // basic table creation if configured, but for a lightweight 
  // implementation, we ensure the schema is applied.
  // For this specific implementation, we rely on the dev environment 
  // to run 'drizzle-kit push' or manually execute SQL.
}
