import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("@/hooks/usePatternSession", () => ({
  useAttachPattern: jest.fn(),
  useCustomerPatternSessions: jest.fn(),
}));

import { PatternAttachDialog } from "@/components/client/design/PatternAttachDialog";
import { useAttachPattern, useCustomerPatternSessions } from "@/hooks/usePatternSession";

const mockUseAttachPattern = useAttachPattern as jest.MockedFunction<typeof useAttachPattern>;
const mockUseCustomerPatternSessions = useCustomerPatternSessions as jest.MockedFunction<typeof useCustomerPatternSessions>;

const mockSessions = [
  {
    id: "session-1-uuid-full",
    garment_type: "ao_dai",
    status: "completed" as const,
    created_at: "2026-05-01T10:00:00Z",
    piece_count: 3,
  },
  {
    id: "session-2-uuid-full",
    garment_type: "vest",
    status: "exported" as const,
    created_at: "2026-05-02T10:00:00Z",
    piece_count: 3,
  },
];

describe("PatternAttachDialog", () => {
  let mockMutate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMutate = jest.fn();
    mockUseAttachPattern.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useAttachPattern>);

    mockUseCustomerPatternSessions.mockReturnValue({
      sessions: mockSessions,
      isLoading: false,
    });
  });

  it("renders session list when open", () => {
    render(
      <PatternAttachDialog
        orderId="order-1"
        customerId="customer-1"
        open={true}
        onOpenChange={() => {}}
        onAttached={() => {}}
      />
    );

    expect(screen.getByText("Chọn phiên thiết kế")).toBeTruthy();
    expect(screen.getAllByText(/Phiên #session-/).length).toBe(2);
  });

  it("renders empty state when no sessions", () => {
    mockUseCustomerPatternSessions.mockReturnValue({
      sessions: [],
      isLoading: false,
    });

    render(
      <PatternAttachDialog
        orderId="order-1"
        customerId="customer-1"
        open={true}
        onOpenChange={() => {}}
        onAttached={() => {}}
      />
    );

    expect(screen.getByText("Chưa có phiên thiết kế hoàn thành cho khách hàng này.")).toBeTruthy();
  });

  it("renders loading state", () => {
    mockUseCustomerPatternSessions.mockReturnValue({
      sessions: [],
      isLoading: true,
    });

    render(
      <PatternAttachDialog
        orderId="order-1"
        customerId="customer-1"
        open={true}
        onOpenChange={() => {}}
        onAttached={() => {}}
      />
    );

    expect(screen.getByText("Đang tải...")).toBeTruthy();
  });

  it("calls mutate when attach button clicked after selecting session", async () => {
    render(
      <PatternAttachDialog
        orderId="order-1"
        customerId="customer-1"
        open={true}
        onOpenChange={() => {}}
        onAttached={() => {}}
      />
    );

    const sessionButtons = screen.getAllByRole("button").filter(
      (b) => b.textContent?.includes("Phiên #")
    );

    if (sessionButtons.length > 0) {
      fireEvent.click(sessionButtons[0]);
    }

    const attachButton = screen.getByText("Xác nhận đính kèm");
    fireEvent.click(attachButton);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        orderId: "order-1",
        patternSessionId: mockSessions[0].id,
      });
    });
  });

  it("disables attach button when no session selected", () => {
    render(
      <PatternAttachDialog
        orderId="order-1"
        customerId="customer-1"
        open={true}
        onOpenChange={() => {}}
        onAttached={() => {}}
      />
    );

    const attachButton = screen.getByText("Xác nhận đính kèm") as HTMLButtonElement;
    expect(attachButton.disabled).toBe(true);
  });
});
