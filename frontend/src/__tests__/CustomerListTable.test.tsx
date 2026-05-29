import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

import CustomerListTable from "@/components/client/CustomerListTable";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

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

describe("CustomerListTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        customers: [
          {
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
            measurement_count: 2,
          },
        ],
        pagination: {
          total: 41,
          page: 1,
          limit: 20,
          total_pages: 3,
        },
      }),
    })) as unknown as typeof fetch;
  });

  it("renders customers from nested pagination response", async () => {
    renderWithQueryClient(<CustomerListTable />);

    await waitFor(() => {
      expect(screen.getByText("Nguyễn Văn A")).toBeTruthy();
    });

    expect(screen.getByText("0901234567")).toBeTruthy();
    expect(screen.getByText("2 bộ")).toBeTruthy();
    expect(screen.getByText("Trang 1 / 3")).toBeTruthy();
    expect(screen.getByText(/41 khách hàng/)).toBeTruthy();
  });
});
