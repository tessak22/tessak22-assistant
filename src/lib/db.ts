import { Pool, QueryResult, QueryResultRow } from "pg";
import fs from "fs";
import path from "path";

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Initialize schema on first connection
let schemaInitialized = false;

async function initializeSchema() {
  if (schemaInitialized) return;

  try {
    // Check if schema is already initialized by checking for users table
    const result = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      )`
    );

    if (result.rows[0].exists) {
      schemaInitialized = true;
      return;
    }

    // Schema doesn't exist, initialize it
    const schemaPath = path.join(process.cwd(), "src", "lib", "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");
    await pool.query(schema);
    schemaInitialized = true;
    console.log("✅ Database schema initialized");
  } catch (error) {
    console.error("Failed to initialize database schema:", error);
    throw error;
  }
}

// Database query interface
export const db = {
  /**
   * Execute a query and return all rows
   */
  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    await initializeSchema();
    return pool.query<T>(text, params);
  },

  /**
   * Get a single row (equivalent to SQLite's get())
   */
  async get<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<T | undefined> {
    await initializeSchema();
    const result = await pool.query<T>(text, params);
    return result.rows[0];
  },

  /**
   * Get all rows (equivalent to SQLite's all())
   */
  async all<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<T[]> {
    await initializeSchema();
    const result = await pool.query<T>(text, params);
    return result.rows;
  },

  /**
   * Execute a query without returning rows (for INSERT/UPDATE/DELETE)
   */
  async run(text: string, params?: any[]): Promise<QueryResult> {
    await initializeSchema();
    return pool.query(text, params);
  },

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    await initializeSchema();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
};

// Graceful shutdown
process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
