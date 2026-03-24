import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function GET() {
    const session = await auth();
    const role = session?.user?.role;

    switch (role) {
        case "Owner":
            redirect("/owner");
        case "Tailor":
            redirect("/tailor");
        default:
            redirect("/showroom");
    }
}
