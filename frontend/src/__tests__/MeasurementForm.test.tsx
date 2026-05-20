import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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
import { PATTERN_MEASUREMENT_FIELDS, MEASUREMENT_RANGES } from "@/types/pattern";

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

describe("MeasurementForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  // === AC #4: 10-Field Measurement Form ===

  it("renders all 10 measurement fields with Vietnamese labels", () => {
    render(<MeasurementForm />);

    for (const field of PATTERN_MEASUREMENT_FIELDS) {
      expect(screen.getByLabelText(field.label)).toBeTruthy();
    }
  });

  it("renders cm suffix on each measurement input", () => {
    const { container } = render(<MeasurementForm />);

    const suffixes = container.querySelectorAll("span");
    const cmSuffixes = Array.from(suffixes).filter((s) => s.textContent === "cm");
    expect(cmSuffixes.length).toBe(10);
  });

  it("renders submit button with correct label", () => {
    render(<MeasurementForm />);

    expect(screen.getByRole("button", { name: "Tạo rập" })).toBeTruthy();
  });

  // === AC #1: Customer Selection Combobox ===

  it("renders customer search input", () => {
    render(<MeasurementForm />);

    expect(screen.getByPlaceholderText("Tìm khách hàng (tên hoặc SĐT)...")).toBeTruthy();
  });

  it("triggers search on input with 2+ characters", async () => {
    render(<MeasurementForm />);

    const input = screen.getByPlaceholderText("Tìm khách hàng (tên hoặc SĐT)...");
    fireEvent.change(input, { target: { value: "Ng" } });

    expect(mockSearch).toHaveBeenCalledWith("Ng");
  });

  it("displays search results in dropdown", () => {
    mockUseCustomerSearch.mockReturnValue({
      results: [
        { id: "c1", full_name: "Nguyễn Văn A", phone: "0901234567" },
        { id: "c2", full_name: "Nguyễn Thị B", phone: "0907654321" },
      ],
      isSearching: false,
      error: null,
      search: mockSearch,
      clear: mockClear,
    });

    render(<MeasurementForm />);

    const input = screen.getByPlaceholderText("Tìm khách hàng (tên hoặc SĐT)...");
    fireEvent.change(input, { target: { value: "Nguyễn" } });

    expect(screen.getByText("Nguyễn Văn A")).toBeTruthy();
    expect(screen.getByText("Nguyễn Thị B")).toBeTruthy();
  });

  it("selects customer from dropdown and shows selected state", () => {
    mockUseCustomerSearch.mockReturnValue({
      results: [
        { id: "c1", full_name: "Nguyễn Văn A", phone: "0901234567" },
      ],
      isSearching: false,
      error: null,
      search: mockSearch,
      clear: mockClear,
    });

    render(<MeasurementForm />);

    const input = screen.getByPlaceholderText("Tìm khách hàng (tên hoặc SĐT)...");
    fireEvent.change(input, { target: { value: "Nguyễn" } });
    fireEvent.click(screen.getByRole("option", { name: /Nguyễn Văn A/ }));

    expect(screen.getByText("Nguyễn Văn A")).toBeTruthy();
    expect(screen.getByText("0901234567")).toBeTruthy();
  });

  // === AC #2: Auto-Fill Measurements ===

  it("auto-fills measurements from customer profile", () => {
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

    const input = screen.getByPlaceholderText("Tìm khách hàng (tên hoặc SĐT)...");
    fireEvent.change(input, { target: { value: "Nguyễn" } });
    fireEvent.click(screen.getByRole("option", { name: /Nguyễn Văn A/ }));

    expect(screen.getByText(/Số đo từ/)).toBeTruthy();
    expect(screen.getAllByText(/Nguyễn Văn A/).length).toBeGreaterThanOrEqual(1);

    // Verify actual input values were auto-filled
    expect((screen.getByLabelText("Vòng cổ") as HTMLInputElement).value).toBe("36");
    expect((screen.getByLabelText("Vòng ngực") as HTMLInputElement).value).toBe("88");
    expect((screen.getByLabelText("Vòng eo") as HTMLInputElement).value).toBe("68");
    expect((screen.getByLabelText("Độ dài áo") as HTMLInputElement).value).toBe("65");
  });

  // === AC #3: Handle Customer Without Measurements ===

  it("shows warning when customer has no measurements", () => {
    mockUseCustomerMeasurement.mockReturnValue({
      measurement: null,
      isLoading: false,
      error: null,
      hasMeasurement: false,
    });

    mockUseCustomerSearch.mockReturnValue({
      results: [{ id: "c1", full_name: "Nguyễn Văn A", phone: "0901234567" }],
      isSearching: false,
      error: null,
      search: mockSearch,
      clear: mockClear,
    });

    render(<MeasurementForm />);

    const input = screen.getByPlaceholderText("Tìm khách hàng (tên hoặc SĐT)...");
    fireEvent.change(input, { target: { value: "Nguyễn" } });
    fireEvent.click(screen.getByRole("option", { name: /Nguyễn Văn A/ }));

    expect(
      screen.getByText("Khách hàng chưa có số đo. Vui lòng nhập thủ công hoặc tạo hồ sơ số đo.")
    ).toBeTruthy();
  });

  // === AC #5: Manual Edit Indicator ===

  it("shows manual edit indicator when auto-filled value is changed", () => {
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
    const input = screen.getByPlaceholderText("Tìm khách hàng (tên hoặc SĐT)...");
    fireEvent.change(input, { target: { value: "Nguyễn" } });
    fireEvent.click(screen.getByRole("option", { name: /Nguyễn Văn A/ }));

    // Modify a measurement value
    const neckInput = screen.getByLabelText("Vòng cổ");
    fireEvent.change(neckInput, { target: { value: "38" } });

    expect(screen.getByText("• Đã chỉnh sửa thủ công")).toBeTruthy();
  });

  // === AC #6: Validation ===

  it("shows Vietnamese error for out-of-range measurement", async () => {
    render(<MeasurementForm />);

    const neckInput = screen.getByLabelText("Vòng cổ");
    const { min, max } = MEASUREMENT_RANGES.vong_co;

    // Set value below minimum
    fireEvent.change(neckInput, { target: { value: "5" } });
    fireEvent.blur(neckInput);

    await waitFor(() => {
      const errorMsg = `Vòng cổ phải từ ${min} đến ${max} cm`;
      expect(screen.getByText(errorMsg)).toBeTruthy();
    });
  });

  it("shows Vietnamese error for value above maximum", async () => {
    render(<MeasurementForm />);

    const bustInput = screen.getByLabelText("Vòng ngực");
    const { min, max } = MEASUREMENT_RANGES.vong_nguc;

    fireEvent.change(bustInput, { target: { value: "999" } });
    fireEvent.blur(bustInput);

    await waitFor(() => {
      const errorMsg = `Vòng ngực phải từ ${min} đến ${max} cm`;
      expect(screen.getByText(errorMsg)).toBeTruthy();
    });
  });

  // === AC #7: Create Pattern Session ===

  it("shows loading state during submission", () => {
    mockUseCreatePatternSession.mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    } as unknown as ReturnType<typeof useCreatePatternSession>);

    render(<MeasurementForm />);

    expect(screen.getByText("Đang tạo phiên thiết kế...")).toBeTruthy();
  });

  it("clears customer and form on clear button click", () => {
    mockUseCustomerSearch.mockReturnValue({
      results: [{ id: "c1", full_name: "Nguyễn Văn A", phone: "0901234567" }],
      isSearching: false,
      error: null,
      search: mockSearch,
      clear: mockClear,
    });

    render(<MeasurementForm />);

    // Select customer
    const input = screen.getByPlaceholderText("Tìm khách hàng (tên hoặc SĐT)...");
    fireEvent.change(input, { target: { value: "Nguyễn" } });
    fireEvent.click(screen.getByRole("option", { name: /Nguyễn Văn A/ }));

    // Clear customer
    const clearBtn = screen.getByLabelText("Xóa khách hàng đã chọn");
    fireEvent.click(clearBtn);

    // Search input should reappear
    expect(screen.getByPlaceholderText("Tìm khách hàng (tên hoặc SĐT)...")).toBeTruthy();
  });

  it("shows loading spinner when measurement is being fetched", () => {
    mockUseCustomerMeasurement.mockReturnValue({
      measurement: null,
      isLoading: true,
      error: null,
      hasMeasurement: false,
    });

    mockUseCustomerSearch.mockReturnValue({
      results: [{ id: "c1", full_name: "Nguyễn Văn A", phone: "0901234567" }],
      isSearching: false,
      error: null,
      search: mockSearch,
      clear: mockClear,
    });

    render(<MeasurementForm />);

    const input = screen.getByPlaceholderText("Tìm khách hàng (tên hoặc SĐT)...");
    fireEvent.change(input, { target: { value: "Nguyễn" } });
    fireEvent.click(screen.getByRole("option", { name: /Nguyễn Văn A/ }));

    expect(screen.getByText("Đang tải số đo...")).toBeTruthy();
  });

  it("shows no results message when search returns empty", () => {
    mockUseCustomerSearch.mockReturnValue({
      results: [],
      isSearching: false,
      error: null,
      search: mockSearch,
      clear: mockClear,
    });

    render(<MeasurementForm />);

    const input = screen.getByPlaceholderText("Tìm khách hàng (tên hoặc SĐT)...");
    fireEvent.change(input, { target: { value: "XYZ" } });

    expect(screen.getByText("Không tìm thấy khách hàng")).toBeTruthy();
  });
});
