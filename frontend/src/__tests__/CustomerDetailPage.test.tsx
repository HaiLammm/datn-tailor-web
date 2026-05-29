import React from "react";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

const mockAuth = jest.fn<() => Promise<{ user: { role: string } } | null>>();
const mockRedirect = jest.fn();

jest.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

jest.mock("@/components/client/MeasurementHistory", () => ({
  __esModule: true,
  default: ({ customerId }: { customerId: string }) => (
    <div data-testid="measurement-history">{customerId}</div>
  ),
}));

import CustomerDetailPage from "@/app/(workplace)/owner/customers/[id]/page";

describe("CustomerDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes awaited route param id into MeasurementHistory", async () => {
    mockAuth.mockResolvedValue({ user: { role: "Owner" } });

    const page = await CustomerDetailPage({
      params: Promise.resolve({ id: "db529391-54d2-4fc4-918d-7f8e4b599cf2" }),
    });

    render(page);

    expect(screen.getByTestId("measurement-history").textContent).toBe(
      "db529391-54d2-4fc4-918d-7f8e4b599cf2"
    );
  });
});
