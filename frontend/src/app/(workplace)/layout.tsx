import { auth } from "@/auth";
import { redirect } from "next/navigation";
import WorkplaceSidebar from "@/components/client/workplace/WorkplaceSidebar";

/**
 * Workplace Layout — shared layout for Owner and Tailor dashboards.
 * Uses Command Mode styling (dense, data-focused).
 * Requires authentication; redirects to login if not authenticated.
 */
export default async function WorkplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const role = session.user?.role;

  // Only Owner and Tailor can access workplace
  if (role !== "Owner" && role !== "Tailor") {
    redirect("/");
  }

  return (
    <div className="flex h-screen bg-white">
      <WorkplaceSidebar
        role={role as "Owner" | "Tailor"}
        shopName={session.user?.name || undefined}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
