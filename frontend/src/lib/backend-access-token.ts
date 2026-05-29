type SessionLike = {
  accessToken?: string;
  user?: {
    email?: string | null;
    name?: string | null;
  };
} | null | undefined;

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function getBackendAccessToken(session: SessionLike): Promise<string | null> {
  if (session?.accessToken) {
    return session.accessToken;
  }

  const email = session?.user?.email;
  if (!email) {
    return null;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/social-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        name: session.user?.name || email,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return typeof data?.access_token === "string" && data.access_token.length > 0
      ? data.access_token
      : null;
  } catch {
    return null;
  }
}
