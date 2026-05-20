import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("@/hooks/usePatternSession", () => ({
  useCreatePatternSession: jest.fn(),
  useCustomerMeasurement: jest.fn(),
  useCustomerSearch: jest.fn(),
}));

import MeasurementForm from "@/components/client/design/MeasurementForm";
import {
  useCreatePatternSession,
  useCustomerMeasurement,
  useCustomerSearch,
} from "@/hooks/usePatternSession";

const mockUseCreatePatternSession = useCreatePatternSession as jest.MockedFunction<
  typeof useCreatePatternSession
>;
const mockUseCustomerMeasurement = useCustomerMeasurement as jest.MockedFunction<
  typeof useCustomerMeasurement
>;
const mockUseCustomerSearch = useCustomerSearch as jest.MockedFunction<
  typeof useCustomerSearch
>;

const mockMutate = jest.fn();
const mockSearch = jest.fn();
const mockClear = jest.fn();

const validMeasurements = {
  do_dai_ao: 65,
  ha_eo: 18,
  vong_co: 36,
  vong_nach: 38,
  vong_nguc: 88,
  vong_eo: 68,
  vong_mong: 92,
  do_dai_tay: 55,
  vong_bap_tay: 28,
  vong_co_tay: 16,
};

function fillAllMeasurements() {
  const fields: Array<{ label: string; value: number }> = [
    { label: "Độ dài áo", value: validMeasurements.do_dai_ao },
    { label: "Hạ eo", value: validMeasurements.ha_eo },
    { label: "Vòng cổ", value: validMeasurements.vong_co },
    { label: "Vòng nách", value: validMeasurements.vong_nach },
    { label: "Vòng ngực", value: validMeasurements.vong_nguc },
    { label: "Vòng eo", value: validMeasurements.vong_eo },
    { label: "Vòng mông", value: validMeasurements.vong_mong },
    { label: "Độ dài tay", value: validMeasurements.do_dai_tay },
    { label: "Vòng bắp tay", value: validMeasurements.vong_bap_tay },
    { label: "Vòng cổ tay", value: validMeasurements.vong_co_tay },
  ];

  for (const { label, value } of fields) {
    const input = screen.getByLabelText(label);
    fireEvent.change(input, { target: { value: String(value) } });
  }
}

function setupDefaultMocks() {
  mockUseCreatePatternSession.mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useCreatePatternSession>);

  mockUseCustomerMeasurement.mockReturnValue({
    measurement: null,
    isLoading: false,
    error: null,
    hasMeasurement: false,
  });

  mockUseCustomerSearch.mockReturnValue({
    results: [],
    isSearching: false,
    error: null,
    search: mockSearch,
    clear: mockClear,
  });
}

describe("PatternSessionCreate Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  // === Full Flow: Manual Entry ===

  it("submits form with manual measurements (no customer)", async () => {
    const mockOnSessionCreated = jest.fn();
    render(<MeasurementForm onSessionCreated={mockOnSessionCreated} />);

    fillAllMeasurements();

    const submitBtn = screen.getByRole("button", { name: "Tạo rập" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });

    const callArgs = mockMutate.mock.calls[0][0];
    expect(callArgs.customer_id).toBeNull();
    expect(callArgs.garment_type).toBe("ao_dai");
    expect(callArgs.vong_co).toBe(36);
    expect(callArgs.vong_nguc).toBe(88);
  });

  // === Full Flow: Customer Search → Select → Auto-fill → Submit ===

  it("completes full flow: search → select → auto-fill → submit", async () => {
    const customerMeasurement = {
      id: "m1",
      customer_profile_id: "c1",
      top_length: 65,
      neck: 36,
      bust: 88,
      waist: 68,
      hip: 92,
      sleeve_length: 55,
      wrist: 16,
      shoulder_width: 36,
      height: 160,
      weight: 50,
      measured_date: "2026-04-15",
      notes: null,
      is_default: true,
    };

    mockUseCustomerMeasurement.mockImplementation((customerId: string | null) => {
      if (customerId === "c1") {
        return {
          measurement: customerMeasurement,
          isLoading: false,
          error: null,
          hasMeasurement: true,
        };
      }
      return { measurement: null, isLoading: false, error: null, hasMeasurement: false };
    });

    mockUseCustomerSearch.mockReturnValue({
      results: [{ id: "c1", full_name: "Nguyễn Văn A", phone: "0901234567" }],
      isSearching: false,
      error: null,
      search: mockSearch,
      clear: mockClear,
    });

    render(<MeasurementForm />);

    // Step 1: Search customer
    const searchInput = screen.getByPlaceholderText("Tìm khách hàng (tên hoặc SĐT)...");
    fireEvent.change(searchInput, { target: { value: "Nguyễn" } });

    // Step 2: Select customer
    fireEvent.click(screen.getByRole("option", { name: /Nguyễn Văn A/ }));

    // Step 3: Verify auto-fill indicator
    expect(screen.getByText(/Số đo từ/)).toBeTruthy();

    // Step 4: Fill remaining fields not mapped from customer (ha_eo, vong_nach, vong_bap_tay)
    fireEvent.change(screen.getByLabelText("Hạ eo"), { target: { value: "18" } });
    fireEvent.change(screen.getByLabelText("Vòng nách"), { target: { value: "38" } });
    fireEvent.change(screen.getByLabelText("Vòng bắp tay"), { target: { value: "28" } });

    // Step 5: Submit
    const submitBtn = screen.getByRole("button", { name: "Tạo rập" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });

    const callArgs = mockMutate.mock.calls[0][0];
    expect(callArgs.customer_id).toBe("c1");
    expect(callArgs.garment_type).toBe("ao_dai");
  });

  // === Error Handling: Form State Preserved ===

  it("preserves form state when submission error callback fires", async () => {
    let capturedOnError: ((error: string) => void) | undefined;

    mockUseCreatePatternSession.mockImplementation((options) => {
      capturedOnError = options?.onError;
      return {
        mutate: mockMutate,
        isPending: false,
      } as unknown as ReturnType<typeof useCreatePatternSession>;
    });

    const mockOnError = jest.fn();
    render(<MeasurementForm onError={mockOnError} />);

    fillAllMeasurements();

    // Verify fields are filled
    const neckInput = screen.getByLabelText("Vòng cổ") as HTMLInputElement;
    expect(neckInput.value).toBe("36");

    // Simulate error callback
    capturedOnError?.("Không thể kết nối đến máy chủ");
    expect(mockOnError).toHaveBeenCalledWith("Không thể kết nối đến máy chủ");

    // Verify form state preserved after error
    expect(neckInput.value).toBe("36");
  });

  // === Validation Blocking ===

  it("blocks submission when measurements are invalid", async () => {
    render(<MeasurementForm />);

    // Fill with invalid value for vong_co (below min 20)
    fireEvent.change(screen.getByLabelText("Vòng cổ"), { target: { value: "5" } });
    fireEvent.blur(screen.getByLabelText("Vòng cổ"));

    // Fill rest with valid values
    fireEvent.change(screen.getByLabelText("Độ dài áo"), { target: { value: "65" } });
    fireEvent.change(screen.getByLabelText("Hạ eo"), { target: { value: "18" } });
    fireEvent.change(screen.getByLabelText("Vòng nách"), { target: { value: "38" } });
    fireEvent.change(screen.getByLabelText("Vòng ngực"), { target: { value: "88" } });
    fireEvent.change(screen.getByLabelText("Vòng eo"), { target: { value: "68" } });
    fireEvent.change(screen.getByLabelText("Vòng mông"), { target: { value: "92" } });
    fireEvent.change(screen.getByLabelText("Độ dài tay"), { target: { value: "55" } });
    fireEvent.change(screen.getByLabelText("Vòng bắp tay"), { target: { value: "28" } });
    fireEvent.change(screen.getByLabelText("Vòng cổ tay"), { target: { value: "16" } });

    const submitBtn = screen.getByRole("button", { name: "Tạo rập" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Vòng cổ phải từ 20 đến 60 cm")).toBeTruthy();
    });

    expect(mockMutate).not.toHaveBeenCalled();
  });

  // === Loading State ===

  it("disables submit button during creation", () => {
    mockUseCreatePatternSession.mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    } as unknown as ReturnType<typeof useCreatePatternSession>);

    render(<MeasurementForm />);

    const submitBtn = screen.getByRole("button", { name: /Đang tạo phiên thiết kế/ });
    expect(submitBtn.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Đang tạo phiên thiết kế...")).toBeTruthy();
  });

  // === Empty Submission Blocked ===

  it("blocks submission when no measurements are entered", async () => {
    render(<MeasurementForm />);

    const submitBtn = screen.getByRole("button", { name: "Tạo rập" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  // === Customer Clear Resets Form ===

  it("resets form when customer is cleared after auto-fill", () => {
    const customerMeasurement = {
      id: "m1",
      customer_profile_id: "c1",
      top_length: 65,
      neck: 36,
      bust: 88,
      waist: 68,
      hip: 92,
      sleeve_length: 55,
      wrist: 16,
      shoulder_width: 36,
      height: 160,
      weight: 50,
      measured_date: "2026-04-15",
      notes: null,
      is_default: true,
    };

    mockUseCustomerMeasurement.mockImplementation((customerId: string | null) => {
      if (customerId === "c1") {
        return {
          measurement: customerMeasurement,
          isLoading: false,
          error: null,
          hasMeasurement: true,
        };
      }
      return { measurement: null, isLoading: false, error: null, hasMeasurement: false };
    });

    mockUseCustomerSearch.mockReturnValue({
      results: [{ id: "c1", full_name: "Nguyễn Văn A", phone: "0901234567" }],
      isSearching: false,
      error: null,
      search: mockSearch,
      clear: mockClear,
    });

    render(<MeasurementForm />);

    // Select customer
    const searchInput = screen.getByPlaceholderText("Tìm khách hàng (tên hoặc SĐT)...");
    fireEvent.change(searchInput, { target: { value: "Nguyễn" } });
    fireEvent.click(screen.getByRole("option", { name: /Nguyễn Văn A/ }));

    // Clear customer
    const clearBtn = screen.getByLabelText("Xóa khách hàng đã chọn");
    fireEvent.click(clearBtn);

    // Search input reappears, auto-fill indicator gone
    expect(screen.getByPlaceholderText("Tìm khách hàng (tên hoặc SĐT)...")).toBeTruthy();
    expect(screen.queryByText(/Số đo từ/)).toBeNull();
  });
});
