import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Allow auth routes, test endpoints, and static files
  if (
    path.startsWith("/auth") ||
    path.startsWith("/api/auth") ||
    path.startsWith("/api/test-auth") || // Test endpoint for E2E tests
    path.startsWith("/_next") ||
    path.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // For other routes, check if there's a session cookie
  const sessionToken = request.cookies.get("authjs.session-token") || request.cookies.get("__Secure-authjs.session-token");

  if (!sessionToken) {
    // Redirect to signin if no session
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
