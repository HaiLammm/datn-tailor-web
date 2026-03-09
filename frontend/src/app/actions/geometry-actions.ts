"use server";

import { auth } from "@/auth";
import { MasterGeometry, MorphDelta, LockDesignResponse, GuardrailCheckResult, SanityCheckResponse, ExportFormat, ExportResponse } from "@/types/geometry";
import { MeasurementCreateInput } from "@/types/customer";

async function getAuthToken(): Promise<string | null> {
  const session = await auth();
  return session?.accessToken ?? null;
}

export async function fetchBaselineGeometry(measurements: MeasurementCreateInput): Promise<MasterGeometry | null> {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

  try {
    const token = await getAuthToken();
    if (!token) {
      console.error("fetchBaselineGeometry: no auth token");
      return null;
    }

    const response = await fetch(`${backendUrl}/api/v1/geometry/baseline`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(measurements),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch baseline geometry: ${response.status}`);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching baseline geometry:", error);
    return null;
  }
}

/**
 * Story 3.2: Fetch morph delta vectors for a style.
 * Client preloads these when a style is selected; no WebSocket needed.
 */
export async function fetchMorphTargets(
  styleId: string,
  measurements: MeasurementCreateInput
): Promise<MorphDelta | null> {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

  try {
    const token = await getAuthToken();
    if (!token) {
      console.error("fetchMorphTargets: no auth token");
      return null;
    }

    const response = await fetch(
      `${backendUrl}/api/v1/geometry/morph-targets/${encodeURIComponent(styleId)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(measurements),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch morph targets: ${response.status}`);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching morph targets:", error);
    return null;
  }
}

/**
 * Story 3.4: Lock a design, generating the Master Geometry JSON (SSOT).
 * Sends current deltas to backend which computes checksums and persists.
 * Story 4.3: Support updating existing design with overrides.
 */
export async function lockDesign(
  deltas: MorphDelta,
  baseId?: string | null,
  designId?: string | null,
  measurementDeltas?: Array<{ key: string; value: number; unit: string; label_vi: string }>
): Promise<LockDesignResponse> {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: "Bạn cần đăng nhập để thực hiện thao tác này" };
    }

    const response = await fetch(`${backendUrl}/api/v1/designs/lock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        design_id: designId ?? null,
        base_id: baseId ?? null,
        deltas,
        measurement_deltas: measurementDeltas ?? null,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 422) {
        try {
          const errorData = await response.json();
          const detail = errorData.detail;
          if (detail?.violations?.length) {
            const violationMessages = detail.violations.map((v: { constraint: string; message: string }) => v.message).join("; ");
            return { success: false, error: `Ràng buộc vật lý: ${violationMessages}` };
          }
        } catch { /* fall through */ }
      }
      const errorBody = await response.text();
      return {
        success: false,
        error: `Lock failed: ${response.status} - ${errorBody}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      design_id: data.design_id,
      sequence_id: data.sequence_id,
      geometry_hash: data.geometry_hash,
    };
  } catch (error) {
    console.error("Error locking design:", error);
    return {
      success: false,
      error: "Không thể kết nối đến máy chủ",
    };
  }
}

/**
 * Story 4.1b: Run guardrail check against current measurements and deltas.
 * baseMeasurements keys MUST use Vietnamese field names matching backend BaseMeasurements
 * (e.g., vong_co, vong_nguc, vong_eo, vong_mong, rong_vai).
 */
export async function checkGuardrails(
  baseMeasurements: Record<string, number>,
  deltas: Array<{ key: string; value: number; unit: string }>,
  sequenceId?: number
): Promise<GuardrailCheckResult> {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
  const fallback: GuardrailCheckResult = { status: "passed", violations: [], warnings: [], last_valid_sequence_id: null };

  try {
    const token = await getAuthToken();
    if (!token) {
      console.error("checkGuardrails: no auth token");
      return fallback;
    }

    const response = await fetch(`${backendUrl}/api/v1/guardrails/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        base_measurements: baseMeasurements,
        deltas,
        sequence_id: sequenceId ?? null,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Guardrail check failed: ${response.status}`);
      return fallback;
    }

    const data = await response.json();

    // Validate required fields from backend response
    if (!data.status || !["passed", "warning", "rejected"].includes(data.status)) {
      console.error("checkGuardrails: invalid status from backend:", data.status);
      return fallback;
    }

    return {
      status: data.status,
      violations: Array.isArray(data.violations) ? data.violations : [],
      warnings: Array.isArray(data.warnings) ? data.warnings : [],
      last_valid_sequence_id: data.last_valid_sequence_id ?? null,
    };
  } catch (error) {
    console.error("Error checking guardrails:", error);
    return fallback;
  }
}

/**
 * Story 4.2: Fetch sanity check data for Artisan Dashboard.
 * Returns 3-column comparison data (Body, Base, Suggested) for each measurement.
 * 
 * @param customerId - Optional customer UUID to fetch body measurements
 * @param designSequenceId - Optional design sequence ID to fetch computed deltas
 */
export async function fetchSanityCheck(
  customerId?: string,
  designSequenceId?: number
): Promise<SanityCheckResponse> {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
  const fallback: SanityCheckResponse = {
    design_id: null,
    rows: [],
    guardrail_status: null,
    is_locked: false,
    geometry_hash: null,
  };

  try {
    const token = await getAuthToken();
    if (!token) {
      console.error("fetchSanityCheck: no auth token");
      return fallback;
    }

    const body: Record<string, unknown> = {};
    if (customerId) {
      body.customer_id = customerId;
    }
    if (designSequenceId !== undefined) {
      body.design_sequence_id = designSequenceId;
    }

    const response = await fetch(`${backendUrl}/api/v1/designs/sanity-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Sanity check failed: ${response.status}`);
      return fallback;
    }

    const data = await response.json();

    // Validate required fields from backend response
    if (!Array.isArray(data.rows)) {
      console.error("fetchSanityCheck: invalid rows from backend");
      return fallback;
    }

    return {
      design_id: data.design_id ?? null,
      rows: data.rows,
      guardrail_status: data.guardrail_status ?? null,
      is_locked: data.is_locked ?? false,
      geometry_hash: data.geometry_hash ?? null,
    };
  } catch (error) {
    console.error("Error fetching sanity check:", error);
    return fallback;
  }
}

/**
 * Story 4.4: Export a locked design as SVG or DXF for production.
 * Auth: Owner or Tailor only.
 */
export async function exportBlueprint(
  designId: string,
  format: ExportFormat = "svg"
): Promise<{ success: boolean; data?: string; filename?: string; error?: string; violations?: any[] }> {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: "Bạn cần đăng nhập để thực hiện thao tác này" };
    }

    const response = await fetch(`${backendUrl}/api/v1/designs/${designId}/export?format=${format}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 403) {
        return { success: false, error: "Bạn không có quyền xuất bản vẽ sản xuất." };
      }
      if (response.status === 422) {
        try {
          const errorData = await response.json();
          return { 
            success: false, 
            error: errorData.detail?.message || "Thiết kế không hợp lệ để xuất bản vẽ.",
            violations: errorData.detail?.violations || []
          };
        } catch { /* fall through */ }
      }
      const errorBody = await response.text();
      return {
        success: false,
        error: `Export failed: ${response.status} - ${errorBody}`,
      };
    }

    // Get the filename from content-disposition if possible
    const contentDisposition = response.headers.get("content-disposition");
    let filename = `blueprint-${designId}.${format}`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename=(.+)/);
      if (filenameMatch) filename = filenameMatch[1];
    }

    // Read as arrayBuffer and convert to base64 for transfer over Server Action
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return {
      success: true,
      data: base64,
      filename: filename,
    };
  } catch (error) {
    console.error("Error exporting blueprint:", error);
    return {
      success: false,
      error: "Không thể kết nối đến máy chủ",
    };
  }
}
