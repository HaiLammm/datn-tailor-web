import { render, screen } from "@testing-library/react";
import InventoryList from "../components/client/inventory/InventoryList";
import { GarmentStatus, GarmentCategory } from "../types/garment";

// Mock auth and cache
jest.mock("@/auth", () => ({
    auth: jest.fn(),
}));

jest.mock("next/cache", () => ({
    revalidatePath: jest.fn(),
}));

const mockGarments = [
    {
        id: "1",
        tenant_id: "00000000-0000-0000-0000-000000000001",
        name: "G1 - Available",
        description: "Mô tả test",
        category: GarmentCategory.AO_DAI_TRUYEN_THONG,
        color: "Đỏ",
        occasion: "le_cuoi",
        status: GarmentStatus.AVAILABLE,
        rental_price: "500000",
        size_options: ["M"],
        image_url: null,
        image_urls: [],
        sale_price: null,
        expected_return_date: null,
        days_until_available: null,
        is_overdue: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: "2",
        tenant_id: "00000000-0000-0000-0000-000000000001",
        name: "G2 - Rented",
        description: "Mô tả test",
        category: GarmentCategory.AO_DAI_TRUYEN_THONG,
        color: "Đỏ",
        occasion: "le_cuoi",
        status: GarmentStatus.RENTED,
        rental_price: "500000",
        size_options: ["M"],
        image_url: null,
        image_urls: [],
        sale_price: null,
        expected_return_date: "2026-03-15",
        days_until_available: 6,
        is_overdue: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: "3",
        tenant_id: "00000000-0000-0000-0000-000000000001",
        name: "G3 - Maintenance",
        description: "Mô tả test",
        category: GarmentCategory.AO_DAI_TRUYEN_THONG,
        color: "Đỏ",
        occasion: "le_cuoi",
        status: GarmentStatus.MAINTENANCE,
        rental_price: "500000",
        size_options: ["M"],
        image_url: null,
        image_urls: [],
        sale_price: null,
        expected_return_date: null,
        days_until_available: null,
        is_overdue: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

describe("InventoryList", () => {
    it("renders all status group headers", () => {
        render(<InventoryList initialGarments={mockGarments} />);

        expect(screen.getByText("Đang cho thuê", { selector: "h2" })).toBeInTheDocument();
        expect(screen.getByText("Đang bảo trì", { selector: "h2" })).toBeInTheDocument();
        expect(screen.getByText("Sẵn sàng", { selector: "h2" })).toBeInTheDocument();
    });

    it("groups items correctly by status", () => {
        render(<InventoryList initialGarments={mockGarments} />);

        // Check item counts in badges (using the group titles and length data)
        const groupCountBadges = screen.getAllByText("1", { selector: "span" });
        // We expect 3 header badges
        expect(groupCountBadges.filter(b => b.className.includes("text-stone-400")).length).toBe(3);

        expect(screen.getByText("G1 - Available")).toBeInTheDocument();
        expect(screen.getByText("G2 - Rented")).toBeInTheDocument();
        expect(screen.getByText("G3 - Maintenance")).toBeInTheDocument();
    });

    it("renders empty state message for empty groups", () => {
        render(<InventoryList initialGarments={[mockGarments[0]]} />); // Only 1 available garment

        // Should show 2 empty state messages for Rented and Maintenance groups
        const emptyMessages = screen.getAllByText("Không có sản phẩm nào");
        expect(emptyMessages.length).toBe(2);
    });
});
