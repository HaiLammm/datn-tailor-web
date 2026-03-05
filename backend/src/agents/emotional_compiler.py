"""Emotional Compiler Agent - Story 2.4: LangGraph Orchestration.

This is the core AI orchestration layer that translates emotional/stylistic
inputs into geometric Deltas using a stateful multi-step reasoning process.

MVP Implementation:
- Uses LangGraph StateGraph for structured workflow
- Deterministic rule-based logic (no LLM in MVP)
- Future: Can add LLM nodes for explanation generation

Architecture Reference: architecture.md#Backend Structure (agents/ folder)
"""

import time
from datetime import UTC, datetime
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from src.core.hashing import compute_base_hash, compute_geometry_hash
from src.models.inference import (
    DeltaValue,
    MasterGeometrySnapshot,
    TranslateRequest,
    TranslateResponse,
)
from src.services.smart_rules_service import SmartRulesService


class CompilerState(TypedDict):
    """State passed through the LangGraph workflow.

    Each node reads from and writes to this shared state.
    """

    # Input data
    request: TranslateRequest
    pillar_id: str
    intensities: dict[str, float]
    sequence_id: int
    base_measurement_id: str | None

    # Intermediate data
    rules_found: bool
    deltas: list[DeltaValue]

    # Output data
    snapshot: MasterGeometrySnapshot | None
    error: str | None
    start_time_ns: int


def validate_input(state: CompilerState) -> CompilerState:
    """Node 1: Validate the incoming request.

    Checks:
    - pillar_id is provided
    - sequence_id is non-negative
    - intensities can be extracted

    Vietnamese error messages per NFR11.
    """
    request = state["request"]

    if not request.pillar_id:
        state["error"] = "Lỗi: Chưa chọn phong cách thiết kế (pillar_id)"
        return state

    if request.sequence_id < 0:
        state["error"] = "Lỗi: sequence_id không hợp lệ"
        return state

    # Extract intensities into dict for easier lookup
    state["pillar_id"] = request.pillar_id
    state["sequence_id"] = request.sequence_id
    state["base_measurement_id"] = request.base_measurement_id
    state["intensities"] = {item.key: item.value for item in request.intensities}

    return state


def lookup_rules(state: CompilerState) -> CompilerState:
    """Node 2: Look up Smart Rules from LKB.

    Retrieves artisan rules for the selected pillar.
    Sets rules_found flag for conditional routing.
    """
    if state.get("error"):
        return state

    service = SmartRulesService()
    rules = service.get_rules_for_pillar(state["pillar_id"])

    if not rules:
        state["rules_found"] = False
        state["error"] = (
            f"Lỗi: Không tìm thấy quy tắc cho phong cách '{state['pillar_id']}'. "
            "Vui lòng chọn phong cách khác."
        )
        return state

    state["rules_found"] = True
    return state


def compute_deltas(state: CompilerState) -> CompilerState:
    """Node 3: Compute Delta values using Smart Rules.

    Applies artisan formulas to translate intensities into geometric deltas.
    This is the core "emotional compilation" step.
    """
    if state.get("error"):
        return state

    service = SmartRulesService()
    deltas = service.compute_deltas(state["pillar_id"], state["intensities"])

    if not deltas:
        # No deltas computed - might happen if no intensities provided
        state["error"] = (
            "Lỗi: Không có giá trị cường độ để tính toán. "
            "Vui lòng điều chỉnh thanh trượt trước khi tạo bản vẽ."
        )
        return state

    state["deltas"] = deltas
    return state


def build_snapshot(state: CompilerState) -> CompilerState:
    """Node 4: Build the Master Geometry Snapshot.

    Creates the immutable snapshot with:
    - Computed deltas
    - Deterministic geometry hash
    - Base hash (placeholder for MVP)
    - Algorithm version and timestamp
    """
    if state.get("error"):
        return state

    deltas = state.get("deltas", [])

    # Compute hashes
    geometry_hash = compute_geometry_hash(deltas)
    base_hash = compute_base_hash(state.get("base_measurement_id"))

    # Build snapshot
    snapshot = MasterGeometrySnapshot(
        sequence_id=state["sequence_id"],
        base_hash=base_hash,
        algorithm_version="1.0.0",
        deltas=deltas,
        geometry_hash=geometry_hash,
        created_at=datetime.now(UTC),
    )

    state["snapshot"] = snapshot
    return state


def should_continue(state: CompilerState) -> str:
    """Conditional edge: Continue or end on error."""
    if state.get("error"):
        return "end"
    return "continue"


def build_emotional_compiler_graph() -> StateGraph:
    """Build the LangGraph StateGraph for the Emotional Compiler.

    Flow:
    START -> validate_input -> lookup_rules -> compute_deltas -> build_snapshot -> END

    Error handling: Any node can set error, which short-circuits to END.

    Returns:
        Compiled StateGraph ready for invocation.
    """
    # Create graph with state schema
    graph = StateGraph(CompilerState)

    # Add nodes
    graph.add_node("validate_input", validate_input)
    graph.add_node("lookup_rules", lookup_rules)
    graph.add_node("compute_deltas", compute_deltas)
    graph.add_node("build_snapshot", build_snapshot)

    # Add edges: linear flow
    graph.add_edge(START, "validate_input")
    graph.add_edge("validate_input", "lookup_rules")
    graph.add_edge("lookup_rules", "compute_deltas")
    graph.add_edge("compute_deltas", "build_snapshot")
    graph.add_edge("build_snapshot", END)

    return graph


# Compile the graph once at module load
_compiled_graph = build_emotional_compiler_graph().compile()


def run_emotional_compiler(request: TranslateRequest) -> TranslateResponse:
    """Execute the Emotional Compiler pipeline.

    Main entry point for the inference API.

    Args:
        request: TranslateRequest with pillar_id, intensities, sequence_id.

    Returns:
        TranslateResponse with snapshot or error, plus inference timing.

    Performance:
        Must complete in < 15 seconds (NFR1).
        Typical execution: < 100ms for rule-based MVP.
    """
    start_time = time.perf_counter()
    start_time_ns = time.perf_counter_ns()

    # Initialize state
    initial_state: CompilerState = {
        "request": request,
        "pillar_id": "",
        "intensities": {},
        "sequence_id": 0,
        "base_measurement_id": None,
        "rules_found": False,
        "deltas": [],
        "snapshot": None,
        "error": None,
        "start_time_ns": start_time_ns,
    }

    # Run the graph
    final_state = _compiled_graph.invoke(initial_state)

    # Calculate inference time
    end_time = time.perf_counter()
    inference_time_ms = int((end_time - start_time) * 1000)

    # Build response
    if final_state.get("error"):
        return TranslateResponse(
            success=False,
            snapshot=None,
            inference_time_ms=inference_time_ms,
            error=final_state["error"],
        )

    return TranslateResponse(
        success=True,
        snapshot=final_state["snapshot"],
        inference_time_ms=inference_time_ms,
        error=None,
    )
