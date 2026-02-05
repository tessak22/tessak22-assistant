import NextAuth, { NextAuthConfig } from "next-auth";
import { Pool } from "pg";
import Resend from "next-auth/providers/resend";

// Create a pool for NextAuth - it will create the users table automatically
const authPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Custom adapter for PostgreSQL
// Simplified version that only handles what we need for email auth
const adapter = {
  async createVerificationToken(verificationToken: { identifier: string; expires: Date; token: string }) {
    const result = await authPool.query(
      `INSERT INTO verification_tokens (identifier, token, expires) VALUES ($1, $2, $3) RETURNING *`,
      [verificationToken.identifier, verificationToken.token, verificationToken.expires]
    );
    return result.rows[0];
  },
  async useVerificationToken({ identifier, token }: { identifier: string; token: string }) {
    const result = await authPool.query(
      `DELETE FROM verification_tokens WHERE identifier = $1 AND token = $2 RETURNING *`,
      [identifier, token]
    );
    return result.rows[0] || null;
  },
  async getUserByEmail(email: string) {
    const result = await authPool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    return result.rows[0] || null;
  },
  async createUser(user: { email: string; name?: string; image?: string }) {
    const result = await authPool.query(
      `INSERT INTO users (id, email, name, image) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING *`,
      [user.email, user.name || null, user.image || null]
    );
    return result.rows[0];
  },
  async getUser(id: string) {
    const result = await authPool.query(`SELECT * FROM users WHERE id = $1`, [id]);
    return result.rows[0] || null;
  },
  async getUserByAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }) {
    return null; // We're not using OAuth
  },
  async updateUser(user: any) {
    const result = await authPool.query(
      `UPDATE users SET name = $1, email = $2, image = $3 WHERE id = $4 RETURNING *`,
      [user.name, user.email, user.image, user.id]
    );
    return result.rows[0];
  },
  async linkAccount(account: any) {
    return null; // We're not using OAuth
  },
  async createSession(session: any) {
    return null; // Using JWT sessions
  },
  async getSessionAndUser(sessionToken: string) {
    return null; // Using JWT sessions
  },
  async updateSession(session: any) {
    return null; // Using JWT sessions
  },
  async deleteSession(sessionToken: string) {
    return; // Using JWT sessions
  },
};

export const authConfig: NextAuthConfig = {
  adapter: adapter as any,
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM || "noreply@yourdomain.com",
    }),
  ],
  session: {
    strategy: "jwt", // Use JWT for sessions (works with Edge runtime)
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
