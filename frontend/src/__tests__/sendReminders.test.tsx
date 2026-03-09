import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SendRemindersButton from "../components/client/inventory/SendRemindersButton";
import * as actions from "../app/actions/garment-actions";

// Mock server actions and Next.js modules
jest.mock("../app/actions/garment-actions", () => ({
    sendReturnReminders: jest.fn(),
}));

jest.mock("@/auth", () => ({
    auth: jest.fn(),
}));

jest.mock("next/cache", () => ({
    revalidatePath: jest.fn(),
}));

describe("SendRemindersButton", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders the trigger button with correct label", () => {
        render(<SendRemindersButton />);

        expect(screen.getByText("Gửi nhắc nhở trả đồ")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Gửi nhắc nhở trả đồ cho khách thuê/i })).toBeInTheDocument();
    });

    it("shows success toast with sent count after successful trigger", async () => {
        (actions.sendReturnReminders as jest.Mock).mockResolvedValue({
            success: true,
            data: { sent: 3, failed: 0, skipped: 1 },
        });

        render(<SendRemindersButton />);

        fireEvent.click(screen.getByText("Gửi nhắc nhở trả đồ"));

        await waitFor(() => {
            expect(screen.getByText("Đã gửi 3 thông báo")).toBeInTheDocument();
        });
    });

    it("shows toast with failure count when some emails fail", async () => {
        (actions.sendReturnReminders as jest.Mock).mockResolvedValue({
            success: true,
            data: { sent: 2, failed: 1, skipped: 0 },
        });

        render(<SendRemindersButton />);

        fireEvent.click(screen.getByText("Gửi nhắc nhở trả đồ"));

        await waitFor(() => {
            expect(screen.getByText("Đã gửi 2 thông báo, 1 thất bại")).toBeInTheDocument();
        });
    });

    it("shows 'no reminders needed' message when all counts are zero", async () => {
        (actions.sendReturnReminders as jest.Mock).mockResolvedValue({
            success: true,
            data: { sent: 0, failed: 0, skipped: 0 },
        });

        render(<SendRemindersButton />);

        fireEvent.click(screen.getByText("Gửi nhắc nhở trả đồ"));

        await waitFor(() => {
            expect(screen.getByText("Không có đơn thuê nào cần nhắc nhở")).toBeInTheDocument();
        });
    });

    it("shows error toast when API call fails", async () => {
        (actions.sendReturnReminders as jest.Mock).mockResolvedValue({
            success: false,
            error: "Unauthorized",
        });

        render(<SendRemindersButton />);

        fireEvent.click(screen.getByText("Gửi nhắc nhở trả đồ"));

        await waitFor(() => {
            expect(screen.getByText("Unauthorized")).toBeInTheDocument();
        });
    });
});
