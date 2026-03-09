import { render, screen, fireEvent } from "@testing-library/react";
import InventoryCard from "../components/client/inventory/InventoryCard";
import { GarmentStatus, GarmentCategory } from "../types/garment";

// Mock StatusUpdatePanel to simplify Card testing
jest.mock("../components/client/inventory/StatusUpdatePanel", () => {
    return function MockPanel({ garment, onSuccess }: any) {
        return (
            <div data-testid="mock-status-panel">
                <button onClick={() => onSuccess({ ...garment, status: "rented" })}>
                    Mock Update
                </button>
            </div>
        );
    };
});

const mockGarment = {
    id: "1",
    tenant_id: "00000000-0000-0000-0000-000000000001",
    name: "Bình An Set",
    description: "Mô tả test",
    category: GarmentCategory.AO_DAI_CACH_TAN,
    color: "Xanh",
    occasion: "le_cuoi",
    status: GarmentStatus.AVAILABLE,
    rental_price: "600000",
    size_options: ["M"],
    image_url: "/test-image.jpg",
    expected_return_date: null,
    days_until_available: null,
    is_overdue: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
};

describe("InventoryCard", () => {
    it("renders garment name and category", () => {
        render(<InventoryCard garment={mockGarment} />);

        expect(screen.getByText("Bình An Set")).toBeInTheDocument();
        expect(screen.getByText("AO DAI CACH TAN")).toBeInTheDocument();
    });

    it("expands StatusUpdatePanel on tap", () => {
        render(<InventoryCard garment={mockGarment} />);

        // Panel should not be visible initially
        expect(screen.queryByTestId("mock-status-panel")).not.toBeInTheDocument();

        // Tap 1: Click the card
        const cardContent = screen.getByText("Bình An Set");
        fireEvent.click(cardContent);

        // Panel should be visible now
        expect(screen.getByTestId("mock-status-panel")).toBeInTheDocument();
    });

    it("collapses panel on second tap", () => {
        render(<InventoryCard garment={mockGarment} />);

        const cardContent = screen.getByText("Bình An Set");

        fireEvent.click(cardContent); // Expand
        expect(screen.getByTestId("mock-status-panel")).toBeInTheDocument();

        fireEvent.click(cardContent); // Collapse
        expect(screen.queryByTestId("mock-status-panel")).not.toBeInTheDocument();
    });

    it("displays return date if status is Rented", () => {
        const rentedGarment = {
            ...mockGarment,
            status: GarmentStatus.RENTED,
            expected_return_date: "2026-03-20",
        };

        render(<InventoryCard garment={rentedGarment} />);

        expect(screen.getByText(/Trả đồ: 20\/03\/2026/i)).toBeInTheDocument();
    });

    it("displays overdue message if is_overdue is true", () => {
        const overdueGarment = {
            ...mockGarment,
            status: GarmentStatus.RENTED,
            expected_return_date: "2026-01-01",
            days_until_available: -5,
            is_overdue: true,
        };

        render(<InventoryCard garment={overdueGarment} />);

        expect(screen.getByText(/QUÁ HẠN 5 NGÀY/i)).toBeInTheDocument();
    });
});
