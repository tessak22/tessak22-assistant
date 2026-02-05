import { auth } from "./auth";

/**
 * Get the current authenticated user from the session
 * Throws an error if the user is not authenticated
 */
export async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}

/**
 * Get the current session (nullable)
 * Returns null if the user is not authenticated
 */
export async function getSession() {
  return await auth();
}
