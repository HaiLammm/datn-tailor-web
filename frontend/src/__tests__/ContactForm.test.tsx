/**
 * ContactForm Tests — Story 15.4 (Contact Page & Public Lead Capture)
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ContactForm from "@/components/client/brand/ContactForm";

// Mock the public Server Action
const mockSubmitContactLead = jest.fn();
jest.mock("@/app/actions/lead-actions", () => ({
  submitContactLead: (...args: unknown[]) => mockSubmitContactLead(...args),
}));

describe("ContactForm", () => {
  beforeEach(() => {
    mockSubmitContactLead.mockReset();
  });

  it("renders all fields and the submit button", () => {
    render(<ContactForm />);
    expect(screen.getByLabelText(/Họ tên/)).toBeInTheDocument();
    expect(screen.getByLabelText("Số điện thoại")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Lời nhắn")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gửi lời nhắn/ })).toBeInTheDocument();
  });

  it("shows 'Vui lòng nhập họ tên' and does not submit when name is empty", async () => {
    render(<ContactForm />);
    fireEvent.click(screen.getByRole("button", { name: /Gửi lời nhắn/ }));

    await waitFor(() => {
      expect(screen.getByText("Vui lòng nhập họ tên")).toBeInTheDocument();
    });
    expect(mockSubmitContactLead).not.toHaveBeenCalled();
  });

  it("shows 'Email không hợp lệ' for an invalid email", async () => {
    render(<ContactForm />);
    fireEvent.change(screen.getByLabelText(/Họ tên/), { target: { value: "Chị Mai" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: /Gửi lời nhắn/ }));

    await waitFor(() => {
      expect(screen.getByText("Email không hợp lệ")).toBeInTheDocument();
    });
    expect(mockSubmitContactLead).not.toHaveBeenCalled();
  });

  it("submits with null phone when empty, omits source, and shows success toast + resets", async () => {
    mockSubmitContactLead.mockResolvedValue({ success: true });
    render(<ContactForm />);

    const name = screen.getByLabelText(/Họ tên/) as HTMLInputElement;
    fireEvent.change(name, { target: { value: "Nguyễn Thị Lan" } });
    fireEvent.click(screen.getByRole("button", { name: /Gửi lời nhắn/ }));

    await waitFor(() => {
      expect(mockSubmitContactLead).toHaveBeenCalledTimes(1);
    });

    const payload = mockSubmitContactLead.mock.calls[0][0];
    expect(payload.name).toBe("Nguyễn Thị Lan");
    expect(payload.phone).toBeNull();
    expect(payload.email).toBeNull();
    expect(payload).not.toHaveProperty("source");
    expect(payload).not.toHaveProperty("classification");

    await waitFor(() => {
      expect(screen.getByText("Cảm ơn bạn, chúng tôi sẽ liên hệ sớm")).toBeInTheDocument();
    });
    // Form reset
    await waitFor(() => expect(name.value).toBe(""));
  });

  it("preserves entered values and shows a retry affordance when submit fails (Graceful Recovery)", async () => {
    mockSubmitContactLead.mockResolvedValue({ success: false, error: "Không gửi được. Vui lòng thử lại." });
    render(<ContactForm />);

    const name = screen.getByLabelText(/Họ tên/) as HTMLInputElement;
    fireEvent.change(name, { target: { value: "Chị Hoa" } });
    fireEvent.click(screen.getByRole("button", { name: /Gửi lời nhắn/ }));

    await waitFor(() => {
      expect(mockSubmitContactLead).toHaveBeenCalledTimes(1);
    });

    // Values preserved + retry hint shown
    expect(name.value).toBe("Chị Hoa");
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/thử lại/i);
    });
  });
});
