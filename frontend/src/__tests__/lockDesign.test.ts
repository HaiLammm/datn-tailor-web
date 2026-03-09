/**
 * Tests for Story 3.4: Lock Design functionality
 * - Store actions: setLocking, setLockResult, setLockError
 * - LockDesignResponse type
 */

import { useDesignStore } from "@/store/designStore";
import type { LockDesignResponse } from "@/types/geometry";

describe("Story 3.4: Lock Design Store", () => {
  beforeEach(() => {
    useDesignStore.getState().clearSession();
  });

  it("initial lock state is unlocked", () => {
    const state = useDesignStore.getState();
    expect(state.is_design_locked).toBe(false);
    expect(state.is_locking).toBe(false);
    expect(state.lock_error).toBeNull();
    expect(state.locked_design_id).toBeNull();
    expect(state.locked_geometry_hash).toBeNull();
  });

  it("setLocking sets loading state and clears error", () => {
    useDesignStore.getState().setLockError("old error");
    useDesignStore.getState().setLocking(true);

    const state = useDesignStore.getState();
    expect(state.is_locking).toBe(true);
    expect(state.lock_error).toBeNull();
  });

  it("setLockResult marks design as locked with id and hash", () => {
    useDesignStore.getState().setLocking(true);
    useDesignStore.getState().setLockResult("design-123", "hash-abc");

    const state = useDesignStore.getState();
    expect(state.is_design_locked).toBe(true);
    expect(state.is_locking).toBe(false);
    expect(state.locked_design_id).toBe("design-123");
    expect(state.locked_geometry_hash).toBe("hash-abc");
    expect(state.lock_error).toBeNull();
  });

  it("setLockError sets error and stops loading", () => {
    useDesignStore.getState().setLocking(true);
    useDesignStore.getState().setLockError("Lock failed");

    const state = useDesignStore.getState();
    expect(state.is_locking).toBe(false);
    expect(state.lock_error).toBe("Lock failed");
    expect(state.is_design_locked).toBe(false);
  });

  it("clearSession resets all lock state", () => {
    useDesignStore.getState().setLockResult("design-456", "hash-def");
    useDesignStore.getState().clearSession();

    const state = useDesignStore.getState();
    expect(state.is_design_locked).toBe(false);
    expect(state.locked_design_id).toBeNull();
    expect(state.locked_geometry_hash).toBeNull();
  });
});

describe("Story 3.4: LockDesignResponse type", () => {
  it("success response has design_id and geometry_hash", () => {
    const response: LockDesignResponse = {
      success: true,
      design_id: "uuid-123",
      sequence_id: "seq-456",
      geometry_hash: "a".repeat(64),
    };
    expect(response.success).toBe(true);
    expect(response.design_id).toBe("uuid-123");
    expect(response.geometry_hash).toHaveLength(64);
  });

  it("error response has error message", () => {
    const response: LockDesignResponse = {
      success: false,
      error: "Lock failed: 500",
    };
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
  });
});
