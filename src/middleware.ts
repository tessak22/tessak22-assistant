export { auth as middleware } from "@/lib/auth";

export const config = {
  // Protect all routes except:
  // - /auth/* (signin, verify-request, error pages)
  // - /api/auth/* (NextAuth API routes)
  // - /_next/* (Next.js internals)
  // - /favicon.ico and other static files
  matcher: ["/((?!api/auth|auth|_next/static|_next/image|favicon.ico).*)"],
};
