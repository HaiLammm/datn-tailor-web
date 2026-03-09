import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StatusUpdatePanel from "../components/client/inventory/StatusUpdatePanel";
import { GarmentStatus, GarmentCategory } from "../types/garment";
import * as actions from "../app/actions/garment-actions";

// Mock server actions and other Next.js modules
jest.mock("../app/actions/garment-actions", () => ({
    updateGarmentStatus: jest.fn(),
}));

jest.mock("@/auth", () => ({
    auth: jest.fn(),
}));

jest.mock("next/cache", () => ({
    revalidatePath: jest.fn(),
}));

const mockGarment = {
    id: "1",
    tenant_id: "00000000-0000-0000-0000-000000000001",
    name: "Áo dài Test",
    description: "Mô tả test",
    category: GarmentCategory.AO_DAI_TRUYEN_THONG,
    color: "Đỏ",
    occasion: "le_cuoi",
    status: GarmentStatus.AVAILABLE,
    rental_price: "500000",
    size_options: ["M"],
    image_url: null,
    expected_return_date: null,
    days_until_available: null,
    is_overdue: false,
    renter_id: null,
    renter_name: null,
    renter_email: null,
    reminder_sent_at: null,
    reminder_sent: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
};

describe("StatusUpdatePanel", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders all status buttons", () => {
        render(<StatusUpdatePanel garment={mockGarment} />);

        expect(screen.getByText("Sẵn sàng")).toBeInTheDocument();
        expect(screen.getByText("Đang thuê")).toBeInTheDocument();
        expect(screen.getByText("Bảo trì")).toBeInTheDocument();
    });

    it("calls updateGarmentStatus immediately for non-rented statuses", async () => {
        const onSuccess = jest.fn();
        (actions.updateGarmentStatus as jest.Mock).mockResolvedValue({
            success: true,
            data: { ...mockGarment, status: GarmentStatus.MAINTENANCE }
        });

        render(<StatusUpdatePanel garment={mockGarment} onSuccess={onSuccess} />);

        const maintenanceBtn = screen.getByText("Bảo trì");
        fireEvent.click(maintenanceBtn);

        await waitFor(() => {
            expect(actions.updateGarmentStatus).toHaveBeenCalledWith("1", "maintenance", undefined, undefined, undefined);
            expect(onSuccess).toHaveBeenCalled();
        });
    });

    it("shows date picker when 'Đang thuê' is clicked", async () => {
        render(<StatusUpdatePanel garment={mockGarment} />);

        const rentedBtn = screen.getByText("Đang thuê");
        fireEvent.click(rentedBtn);

        expect(screen.getByLabelText(/Ngày dự kiến khách trả đồ/i)).toBeInTheDocument();
        expect(screen.getByText("Xác nhận")).toBeInTheDocument();
    });

    it("shows renter name and email inputs when 'Đang thuê' is clicked", async () => {
        render(<StatusUpdatePanel garment={mockGarment} />);

        fireEvent.click(screen.getByText("Đang thuê"));

        expect(screen.getByLabelText(/Tên khách thuê/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Email khách thuê/i)).toBeInTheDocument();
    });

    it("disables confirm button when renter name or email is missing for rented status", async () => {
        render(<StatusUpdatePanel garment={mockGarment} />);

        fireEvent.click(screen.getByText("Đang thuê"));

        // Only set date, leave renter fields empty
        const dateInput = screen.getByLabelText(/Ngày dự kiến khách trả đồ/i);
        fireEvent.change(dateInput, { target: { value: "2026-12-31" } });

        const confirmBtn = screen.getByText("Xác nhận");
        expect(confirmBtn).toBeDisabled();
    });

    it("calls updateGarmentStatus with renter fields when 'Xác nhận' is clicked for rented status", async () => {
        const onSuccess = jest.fn();
        (actions.updateGarmentStatus as jest.Mock).mockResolvedValue({
            success: true,
            data: {
                ...mockGarment,
                status: GarmentStatus.RENTED,
                expected_return_date: "2026-12-31",
                renter_name: "Nguyen Van A",
                renter_email: "a@example.com",
            }
        });

        render(<StatusUpdatePanel garment={mockGarment} onSuccess={onSuccess} />);

        // Step 1: Click "Đang thuê"
        fireEvent.click(screen.getByText("Đang thuê"));

        // Step 2: Fill in all required fields
        const dateInput = screen.getByLabelText(/Ngày dự kiến khách trả đồ/i);
        fireEvent.change(dateInput, { target: { value: "2026-12-31" } });

        const nameInput = screen.getByLabelText(/Tên khách thuê/i);
        fireEvent.change(nameInput, { target: { value: "Nguyen Van A" } });

        const emailInput = screen.getByLabelText(/Email khách thuê/i);
        fireEvent.change(emailInput, { target: { value: "a@example.com" } });

        const confirmBtn = screen.getByText("Xác nhận");
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(actions.updateGarmentStatus).toHaveBeenCalledWith(
                "1", "rented", "2026-12-31", "Nguyen Van A", "a@example.com"
            );
            expect(onSuccess).toHaveBeenCalled();
        });
    });

    it("shows email validation error for invalid email format", async () => {
        render(<StatusUpdatePanel garment={mockGarment} />);

        fireEvent.click(screen.getByText("Đang thuê"));

        const dateInput = screen.getByLabelText(/Ngày dự kiến khách trả đồ/i);
        fireEvent.change(dateInput, { target: { value: "2026-12-31" } });

        const nameInput = screen.getByLabelText(/Tên khách thuê/i);
        fireEvent.change(nameInput, { target: { value: "Nguyen Van A" } });

        const emailInput = screen.getByLabelText(/Email khách thuê/i);
        fireEvent.change(emailInput, { target: { value: "invalid-email" } });

        const confirmBtn = screen.getByText("Xác nhận");
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(screen.getByText("Email không hợp lệ")).toBeInTheDocument();
        });

        expect(actions.updateGarmentStatus).not.toHaveBeenCalled();
    });

    it("disables the current status button", () => {
        render(<StatusUpdatePanel garment={mockGarment} />); // Initial status: available

        const availableBtn = screen.getByText("Sẵn sàng");
        expect(availableBtn).toBeDisabled();
    });

    it("handles API errors gracefully", async () => {
        const onError = jest.fn();
        (actions.updateGarmentStatus as jest.Mock).mockResolvedValue({
            success: false,
            error: "Server Error"
        });

        render(<StatusUpdatePanel garment={mockGarment} onError={onError} />);

        fireEvent.click(screen.getByText("Bảo trì"));

        await waitFor(() => {
            expect(onError).toHaveBeenCalledWith("Server Error");
        });
    });
});
