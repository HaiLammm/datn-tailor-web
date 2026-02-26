import NextAuth from "next-auth";

/**
 * Auth.js v5 configuration for Tailor Project.
 * Uses JWT stored in HttpOnly, Secure, SameSite cookies.
 * Providers will be configured in later stories (e.g., Credentials, OAuth).
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [],
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (token?.id) {
                session.user.id = token.id as string;
            }
            return session;
        },
    },
});
