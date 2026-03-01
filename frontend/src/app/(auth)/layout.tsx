import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Đăng nhập | Tailor Project",
    description: "Đăng nhập vào hệ thống may đo Tailor Project",
};

/**
 * Layout for authentication pages (login, register).
 * Provides centered, minimal styling for auth flows.
 */
export default function AuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-amber-50">
            <div className="w-full max-w-md px-6">
                {children}
            </div>
        </div>
    );
}
