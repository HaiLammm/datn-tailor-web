import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js 16 Proxy function.
 * Replaces middleware.ts to leverage Node.js runtime for Auth logic.
 * Protects routes that require authentication.
 */

const protectedRoutes = ["/dashboard", "/profile", "/orders"];
const publicRoutes = ["/login", "/register", "/"];

export default async function proxy(request: NextRequest): Promise<NextResponse | undefined> {
    const { pathname } = request.nextUrl;

    // Allow public routes
    const isPublicRoute = publicRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
    );
    if (isPublicRoute) {
        return undefined;
    }

    // Check if route needs protection
    const isProtectedRoute = protectedRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
    );

    if (isProtectedRoute) {
        const session = await auth();
        if (!session) {
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    return undefined;
}
