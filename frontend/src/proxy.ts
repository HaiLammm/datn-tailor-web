import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js 16 Proxy function.
 * Replaces middleware.ts to leverage Node.js runtime for Auth logic.
 * Protects routes that require authentication and handles role-based redirects.
 * Story 1.1: AC4 - Role-based redirect after login
 */

const protectedRoutes = ["/dashboard", "/profile", "/orders", "/owner", "/tailor"];
const publicRoutes = ["/login", "/register", "/"];

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

export default async function proxy(request: NextRequest): Promise<NextResponse | undefined> {
    const { pathname } = request.nextUrl;

    // Allow public routes and static assets
    const isPublicRoute = publicRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
    );
    if (isPublicRoute || pathname.startsWith("/_next") || pathname.startsWith("/api")) {
        return undefined;
    }

    // Get session for all protected routes
    const session = await auth();

    // Check if route needs protection
    const isProtectedRoute = protectedRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
    );

    if (isProtectedRoute) {
        if (!session) {
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(loginUrl);
        }

        // Role-based access control
        const userRole = session.user?.role;

        // Owner routes
        if (pathname.startsWith("/owner") && userRole !== "Owner") {
            return NextResponse.redirect(new URL("/", request.url));
        }

        // Tailor routes
        if (pathname.startsWith("/tailor") && userRole !== "Tailor" && userRole !== "Owner") {
            return NextResponse.redirect(new URL("/", request.url));
        }
    }

    // Handle post-login redirect to correct dashboard based on role
    if (session && pathname === "/") {
        const userRole = session.user?.role;
        
        if (userRole === "Owner") {
            return NextResponse.redirect(new URL("/owner", request.url));
        } else if (userRole === "Tailor") {
            return NextResponse.redirect(new URL("/tailor", request.url));
        }
        // Customer stays on "/"
    }

    return undefined;
}
