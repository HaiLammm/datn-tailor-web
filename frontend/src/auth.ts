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
                    // Detect if password is a JWT token (starts with "eyJ")
                    const password = credentials.password as string;
                    const isJWT = password.startsWith("eyJ");
                    
                    if (isJWT) {
                        // Auto-login flow: Verify JWT token directly (Story 1.2 Critical Fix)
                        const res = await fetch(`${process.env.BACKEND_URL}/api/v1/auth/verify-token`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token: credentials.password })
                        });

                        if (!res.ok) {
                            return null;
                        }

                        const user = await res.json();
                        
                        return {
                            id: user.email,
                            email: user.email,
                            role: user.role,
                        };
                    } else {
                        // Normal login flow: Authenticate with email/password
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
                    }
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
