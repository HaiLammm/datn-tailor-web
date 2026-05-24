const NextAuth = () => ({
  handlers: { GET: jest.fn(), POST: jest.fn() },
  auth: jest.fn(() => Promise.resolve({ user: { id: "user-1", name: "Test", role: "owner" }, accessToken: "test-token" })),
  signIn: jest.fn(),
  signOut: jest.fn(),
});

export default NextAuth;
export const { auth } = NextAuth();
export type DefaultSession = { user: { name?: string | null; email?: string | null; image?: string | null } };
