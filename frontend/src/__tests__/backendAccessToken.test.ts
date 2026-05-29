import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { getBackendAccessToken } from "@/lib/backend-access-token";

describe("getBackendAccessToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns existing session access token", async () => {
    const token = await getBackendAccessToken({
      accessToken: "existing-token",
      user: { email: "owner@test.com" },
    });

    expect(token).toBe("existing-token");
  });

  it("exchanges authenticated session email for backend token", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ access_token: "backend-token" }),
    })) as unknown as typeof fetch;

    const token = await getBackendAccessToken({
      user: { email: "owner@test.com", name: "Owner Test" },
    });

    expect(token).toBe("backend-token");
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/auth/social-login",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
      })
    );
  });

  it("returns null when session has no email and no token", async () => {
    const token = await getBackendAccessToken({ user: {} });

    expect(token).toBeNull();
  });
});
