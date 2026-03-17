/**
 * Profile Server Actions Tests — Story 4.4b (AC2, AC4)
 */

import "@testing-library/jest-dom";

// Mock @/auth
const mockAuth = jest.fn();
jest.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock global fetch
global.fetch = jest.fn();

import { getCustomerProfile, updateCustomerProfile, changePassword } from "@/app/actions/profile-actions";

const MOCK_TOKEN = "test-jwt-token";
const MOCK_PROFILE = {
  full_name: "Nguyễn Linh",
  email: "linh@example.com",
  phone: "0901234567",
  gender: "Nữ",
  date_of_birth: null,
  has_password: true,
};

function mockSession(token: string | null = MOCK_TOKEN) {
  mockAuth.mockResolvedValue(token ? { accessToken: token } : null);
}

function mockFetch(status: number, body: unknown) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe("getCustomerProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns profile data on success", async () => {
    mockSession();
    mockFetch(200, { data: MOCK_PROFILE });

    const result = await getCustomerProfile();

    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("linh@example.com");
  });

  it("returns error when not authenticated", async () => {
    mockSession(null);

    const result = await getCustomerProfile();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Chưa đăng nhập");
  });
});

describe("updateCustomerProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns updated profile on success", async () => {
    mockSession();
    mockFetch(200, { data: { ...MOCK_PROFILE, full_name: "Linh Nguyễn" } });

    const result = await updateCustomerProfile({
      full_name: "Linh Nguyễn",
      phone: "0987654321",
      gender: "Nữ",
    });

    expect(result.success).toBe(true);
    expect(result.data?.full_name).toBe("Linh Nguyễn");
  });

  it("returns error on 422 validation error", async () => {
    mockSession();
    mockFetch(422, {
      detail: [{ msg: "Giới tính không hợp lệ", loc: ["body", "gender"] }],
    });

    const result = await updateCustomerProfile({ full_name: "Linh", gender: "Invalid" as "Nam" });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("changePassword", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns success on correct password change", async () => {
    mockSession();
    mockFetch(200, { data: { message: "Mật khẩu đã cập nhật thành công" } });

    const result = await changePassword({
      old_password: "OldPass1",
      new_password: "NewPass99",
    });

    expect(result.success).toBe(true);
  });

  it("returns WRONG_PASSWORD error when old password is incorrect", async () => {
    mockSession();
    mockFetch(400, {
      detail: { code: "WRONG_PASSWORD", message: "Mật khẩu hiện tại không đúng" },
    });

    const result = await changePassword({
      old_password: "WrongPass",
      new_password: "NewPass99",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Mật khẩu hiện tại không đúng");
  });

  it("returns NO_PASSWORD error for OAuth user", async () => {
    mockSession();
    mockFetch(400, {
      detail: {
        code: "NO_PASSWORD",
        message: "Tài khoản không có mật khẩu. Sử dụng chức năng 'Quên mật khẩu' để đặt mật khẩu.",
      },
    });

    const result = await changePassword({
      old_password: "anything",
      new_password: "NewPass99",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Quên mật khẩu");
  });
});
