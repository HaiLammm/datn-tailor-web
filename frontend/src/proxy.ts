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

    // 1. FAST PATH: Bỏ qua ngay lập tức các tệp tĩnh, hình ảnh và API xác thực nội bộ
    if (
        pathname.startsWith("/_next") || 
        pathname.startsWith("/api/auth") ||
        pathname.includes(".") || // favicon.ico, images, etc.
        publicRoutes.includes(pathname)
    ) {
        return undefined;
    }

    // 2. Lấy session cho các yêu cầu bảo mật
    const session = await auth();

    // Protection for critical APIs (/api/v1/*)
    if (pathname.startsWith("/api/v1")) {
        if (!session) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
        
        const userRole = session.user?.role;
        // Example: Only Owner/Tailor can access customer API
        if (pathname.startsWith("/api/v1/customers") && userRole !== "Owner" && userRole !== "Tailor") {
            return new NextResponse(JSON.stringify({ error: "Forbidden" }), { 
                status: 403, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        // TỰ ĐỘNG CHUYỂN TIẾP YÊU CẦU API VỚI ACCESS TOKEN
        // Điều này thay thế cho rewrites trong next.config.ts vì chúng ta cần thêm Token
        const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
        const targetUrl = new URL(pathname + request.nextUrl.search, backendUrl);
        
        const headers = new Headers(request.headers);
        if (session.accessToken) {
            headers.set("Authorization", `Bearer ${session.accessToken}`);
        }

        return fetch(targetUrl.toString(), {
            method: request.method,
            headers: headers,
            body: request.body,
            // @ts-expect-error - Next.js 16/Node fetch body handling
            duplex: 'half', 
        });
    }

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
