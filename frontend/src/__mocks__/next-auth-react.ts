export const useSession = () => ({
  data: { user: { id: "user-1", name: "Test User", role: "owner" }, accessToken: "test-token" },
  status: "authenticated" as const,
});

export const signIn = jest.fn();
export const signOut = jest.fn();
export const SessionProvider = ({ children }: { children: React.ReactNode }) => children;
