import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("@/app/actions/tailor-task-actions", () => ({
  fetchTaskDetail: jest.fn(),
  requestTaskCancellation: jest.fn(),
  acceptTask: jest.fn(),
  rejectTask: jest.fn(),
  startTask: jest.fn(),
  holdTask: jest.fn(),
  resumeTask: jest.fn(),
  submitForQC: jest.fn(),
  completeStage: jest.fn(),
}));

jest.mock("@/hooks/usePatternSession", () => ({
  usePatternSession: jest.fn(() => ({ session: null, isLoading: false, error: null })),
  useExportPiece: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
  useExportSession: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
}));

jest.mock("@/components/client/design/PatternPreview", () => ({
  __esModule: true,
  PatternPreview: () => <div data-testid="pattern-preview" />,
}));

jest.mock("@/components/client/design/PatternExportBar", () => ({
  __esModule: true,
  PatternExportBar: () => <div data-testid="pattern-export-bar" />,
}));

import TaskDetailModal from "@/components/client/tailor/TaskDetailModal";
import { fetchTaskDetail, submitForQC } from "@/app/actions/tailor-task-actions";
import type {
  ActionResult,
  TailorTask,
  TailorTaskDetailResponse,
  TaskStageLog,
} from "@/types/tailor-task";

const mockFetchTaskDetail = fetchTaskDetail as jest.MockedFunction<typeof fetchTaskDetail>;
const mockSubmitForQC = submitForQC as jest.MockedFunction<typeof submitForQC>;

const baseTask: TailorTask = {
  id: "task-1",
  tenant_id: "tenant-1",
  order_id: "order-1",
  order_item_id: null,
  assigned_to: "tailor-1",
  assigned_by: "owner-1",
  garment_name: "Áo dài lụa",
  customer_name: "Nguyễn Văn A",
  status: "in_progress",
  production_step: "cutting",
  deadline: "2026-06-01T00:00:00Z",
  notes: null,
  piece_rate: 500000,
  design_id: null,
  completed_at: null,
  version: 3,
  accepted_at: null,
  started_at: "2026-05-02T10:00:00Z",
  submitted_at: null,
  hold_reason: null,
  on_hold_at: null,
  resumed_at: null,
  assignment_deadline_at: null,
  expected_finish_at: null,
  is_rework: false,
  rework_count: 0,
  qc_issues: null,
  rejection_reason: null,
  rejection_category: null,
  reassignment_reason: null,
  priority: "normal",
  is_overdue: false,
  days_until_deadline: 25,
  created_at: "2026-05-01T10:00:00Z",
  updated_at: "2026-05-03T10:00:00Z",
};

function makeStageLog(
  stageOrder: number,
  stage: string,
  status: TaskStageLog["status"]
): TaskStageLog {
  return {
    id: `stage-${stageOrder}`,
    task_id: "task-1",
    stage,
    stage_order: stageOrder,
    status,
    started_at: null,
    completed_at: status === "completed" ? "2026-05-03T10:00:00Z" : null,
    notes: null,
    created_at: "2026-05-01T10:00:00Z",
  };
}

function makeDetail(stageLogs: TaskStageLog[]): TailorTaskDetailResponse {
  return {
    ...baseTask,
    assignee_name: "Thợ A",
    order_info: null,
    stage_logs: stageLogs,
    history: [],
  };
}

function detailOk(stageLogs: TaskStageLog[]): ActionResult<TailorTaskDetailResponse> {
  return { success: true, data: makeDetail(stageLogs) };
}

describe("TaskDetailModal - actions & stage progress (Story 12.5)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("counts skipped stages as done in the progress bar", async () => {
    mockFetchTaskDetail.mockResolvedValue(
      detailOk([
        makeStageLog(1, "cutting", "completed"),
        makeStageLog(2, "embroidery", "skipped"),
        makeStageLog(3, "finishing", "in_progress"),
      ])
    );

    render(<TaskDetailModal task={baseTask} onClose={() => {}} onTaskUpdated={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("2/3 công đoạn (67%)")).toBeTruthy();
    });
  });

  it("enables submit-QC when remaining stages are completed or skipped", async () => {
    mockFetchTaskDetail.mockResolvedValue(
      detailOk([
        makeStageLog(1, "cutting", "completed"),
        makeStageLog(2, "embroidery", "skipped"),
      ])
    );

    render(<TaskDetailModal task={baseTask} onClose={() => {}} onTaskUpdated={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId("task-submit-qc-btn")).toBeTruthy();
    });
  });

  it("on conflict: shows toast, reloads detail, notifies parent, and closes sub-forms", async () => {
    mockFetchTaskDetail.mockResolvedValue(
      detailOk([makeStageLog(1, "cutting", "completed")])
    );
    mockSubmitForQC.mockResolvedValue({
      success: false,
      conflict: true,
      error: "Dữ liệu đã thay đổi bởi người khác. Vui lòng tải lại.",
    });
    const onTaskUpdated = jest.fn();

    render(<TaskDetailModal task={baseTask} onClose={() => {}} onTaskUpdated={onTaskUpdated} />);

    // Open the submit-QC confirmation sub-form
    await waitFor(() => {
      expect(screen.getByTestId("task-submit-qc-btn")).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId("task-submit-qc-btn"));
    expect(screen.getByText("Xác nhận gửi kiểm tra chất lượng?")).toBeTruthy();

    fireEvent.click(screen.getByText("Xác nhận gửi"));

    await waitFor(() => {
      expect(screen.getByText("Dữ liệu đã thay đổi. Đang tải lại...")).toBeTruthy();
    });
    await waitFor(() => {
      // Sub-form closed
      expect(screen.queryByText("Xác nhận gửi kiểm tra chất lượng?")).toBeNull();
    });
    // Detail reloaded (initial load + conflict reload) and parent notified
    expect(mockFetchTaskDetail).toHaveBeenCalledTimes(2);
    expect(onTaskUpdated).toHaveBeenCalled();
  });

  it("surfaces returned error message on non-conflict failure", async () => {
    mockFetchTaskDetail.mockResolvedValue(
      detailOk([makeStageLog(1, "cutting", "completed")])
    );
    mockSubmitForQC.mockResolvedValue({
      success: false,
      error: "Không thể gửi kiểm tra lúc này.",
    });

    render(<TaskDetailModal task={baseTask} onClose={() => {}} onTaskUpdated={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId("task-submit-qc-btn")).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId("task-submit-qc-btn"));
    fireEvent.click(screen.getByText("Xác nhận gửi"));

    await waitFor(() => {
      expect(screen.getByText("Không thể gửi kiểm tra lúc này.")).toBeTruthy();
    });
  });

  it("shows retry button when detail load fails and retries on click", async () => {
    mockFetchTaskDetail
      .mockResolvedValueOnce({ success: false, error: "Lỗi tải chi tiết công việc (HTTP 500)" })
      .mockResolvedValueOnce(detailOk([makeStageLog(1, "cutting", "in_progress")]));

    render(<TaskDetailModal task={baseTask} onClose={() => {}} onTaskUpdated={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("Lỗi tải chi tiết công việc (HTTP 500)")).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId("task-detail-retry-btn"));

    await waitFor(() => {
      expect(screen.getByText("Tiến độ công đoạn")).toBeTruthy();
    });
    expect(mockFetchTaskDetail).toHaveBeenCalledTimes(2);
  });

  it("shows informational text instead of a start button on failed_qc", async () => {
    mockFetchTaskDetail.mockResolvedValue({
      success: true,
      data: { ...makeDetail([]), status: "failed_qc", qc_issues: "Đường may lệch" },
    });

    render(
      <TaskDetailModal
        task={{ ...baseTask, status: "failed_qc", qc_issues: "Đường may lệch" }}
        onClose={() => {}}
        onTaskUpdated={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("task-rework-info")).toBeTruthy();
    });
    expect(screen.queryByText("Bắt đầu sửa lại")).toBeNull();
    expect(screen.getByText("Đường may lệch")).toBeTruthy();
  });
});
