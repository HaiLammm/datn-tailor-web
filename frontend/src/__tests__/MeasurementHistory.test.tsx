import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import MeasurementHistory from "@/components/client/MeasurementHistory";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

function mockJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("MeasurementHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const customerDetail = {
      customer: {
        id: "customer-1",
        tenant_id: "tenant-1",
        user_id: null,
        full_name: "Nguyễn Văn A",
        phone: "0901234567",
        email: null,
        date_of_birth: null,
        gender: null,
        address: null,
        notes: null,
        is_deleted: false,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        has_account: false,
        measurement_count: 0,
      },
      measurements: [],
      default_measurement: null,
    };

    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/v1/customers/customer-1/measurements" && init?.method === "POST") {
        return mockJsonResponse(
          {
            id: "measurement-1",
            customer_profile_id: "customer-1",
            tenant_id: "tenant-1",
            neck: 38.5,
            shoulder_width: null,
            bust: null,
            waist: null,
            hip: null,
            top_length: null,
            sleeve_length: null,
            wrist: null,
            height: null,
            weight: null,
            measurement_notes: null,
            is_default: true,
            measured_date: "2026-05-25",
            measured_by: null,
            created_at: "2026-05-25T00:00:00Z",
            updated_at: "2026-05-25T00:00:00Z",
          },
          201
        );
      }

      return mockJsonResponse(customerDetail);
    }) as unknown as typeof fetch;
  });

  it("renders add form and posts filled measurement data", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(<MeasurementHistory customerId="customer-1" />);

    await waitFor(() => {
      expect(screen.getByText("Nguyễn Văn A")).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "Thêm số đo mới" }));
    await user.type(screen.getByPlaceholderText("38.5"), "38.5");
    await user.click(screen.getByRole("button", { name: "Lưu số đo" }));

    await waitFor(() => {
      const postCall = (((global.fetch as unknown as jest.Mock).mock.calls as Array<[
        string,
        RequestInit | undefined,
      ]>).find(
        ([url, options]) =>
          url === "/api/v1/customers/customer-1/measurements" && options?.method === "POST"
      ));

      expect(postCall).toBeDefined();
    });

    const postCall = (((global.fetch as unknown as jest.Mock).mock.calls as Array<[
      string,
      RequestInit | undefined,
    ]>).find(
      ([url, options]) =>
        url === "/api/v1/customers/customer-1/measurements" && options?.method === "POST"
    )) as [string, RequestInit];

    expect(JSON.parse(postCall[1].body as string)).toEqual({
      neck: 38.5,
    });
  });
});
