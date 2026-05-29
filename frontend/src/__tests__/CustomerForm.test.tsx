import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import CustomerForm from "@/components/client/CustomerForm";

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

function mockJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("CustomerForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(async () => mockJsonResponse({ id: "customer-1" }, 201)) as unknown as typeof fetch;
  });

  it("submits required customer fields without blank optional values", async () => {
    const user = userEvent.setup();

    render(<CustomerForm />);

    await user.type(screen.getByPlaceholderText("Nguyễn Văn A"), "Nguyễn Văn A");
    await user.type(screen.getByPlaceholderText("0901234567"), "0901234567");
    await user.click(screen.getByRole("button", { name: "Tạo khách hàng" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/v1/customers",
        expect.objectContaining({
          method: "POST",
          credentials: "include",
        })
      );
    });

    const [, options] = (((global.fetch as unknown as jest.Mock).mock.calls[0] ?? []) as [
      string,
      RequestInit,
    ]);
    expect(JSON.parse(options.body as string)).toEqual({
      full_name: "Nguyễn Văn A",
      phone: "0901234567",
      create_account: false,
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/owner/customers/customer-1");
    });
  });

  it("keeps only filled measurement values in initial_measurements", async () => {
    const user = userEvent.setup();

    render(<CustomerForm />);

    await user.type(screen.getByPlaceholderText("Nguyễn Văn A"), "Trần Thị B");
    await user.type(screen.getByPlaceholderText("0901234567"), "0987654321");
    await user.click(screen.getByRole("button", { name: "Thêm số đo" }));
    await user.type(screen.getByPlaceholderText("38.5"), "38.5");
    await user.click(screen.getByRole("button", { name: "Tạo khách hàng" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const [, options] = (((global.fetch as unknown as jest.Mock).mock.calls[0] ?? []) as [
      string,
      RequestInit,
    ]);
    expect(JSON.parse(options.body as string)).toEqual({
      full_name: "Trần Thị B",
      phone: "0987654321",
      create_account: false,
      initial_measurements: {
        neck: 38.5,
      },
    });
  });
});
