import NextAuth, { DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

// Extend NextAuth Session to include role
declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role?: string;
        } & DefaultSession["user"];
    }

    interface User {
        role?: string;
    }
}

/**
 * Auth.js v5 configuration for Tailor Project.
 * Uses JWT stored in HttpOnly, Secure, SameSite cookies.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        CredentialsProvider({
            name: "Email and Password",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "your@email.com" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                try {
                    const res = await fetch(`${process.env.BACKEND_URL}/api/v1/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                        })
                    });

                    if (!res.ok) {
                        return null;
                    }

                    const data = await res.json();
                    const token = data.access_token;

                    if (token) {
                        // Decode JWT to extract user info (avoid redundant /me call)
                        // JWT format: header.payload.signature
                        const payload = JSON.parse(
                            Buffer.from(token.split('.')[1], 'base64').toString()
                        );
                        
                        return {
                            id: payload.sub, // email is the subject
                            email: payload.sub,
                            role: payload.role,
                        };
                    }
                    return null;
                } catch (e) {
                    console.error("Auth error:", e);
                    return null;
                }
            }
        })
    ],
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
                token.role = user.role; // Attach role from user object
            }
            return token;
        },
        async session({ session, token }) {
            if (token?.id) {
                session.user.id = token.id as string;
            }
            if (token?.role) {
                session.user.role = token.role as string;
            }
            return session;
        },
    },
});
