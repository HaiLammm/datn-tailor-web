"""Hard Constraint implementations - Story 4.1a Task 2.

Physical rules that MUST be satisfied. Violation leads to Reject Snapshot.
All messages use 100% Vietnamese tailoring terminology (NFR11).
"""

from typing import Optional

from src.constraints.base import ConstraintResult, ConstraintSeverity, HardConstraint


class ArmholeVsBicepConstraint(HardConstraint):
    """FR9: Vòng nách rập >= vòng bắp tay khách + min_ease.

    Ensures armhole circumference allows arm movement.
    """

    constraint_id = "armhole_vs_bicep"
    description_vi = "Kiểm tra vòng nách so với bắp tay"

    MIN_EASE_CM = 2.0  # Minimum ease for arm movement

    def check(
        self, measurements: dict, deltas: dict
    ) -> Optional[ConstraintResult]:
        vong_nach = measurements.get("vong_nach")
        vong_bap_tay = measurements.get("vong_bap_tay")

        if vong_nach is None or vong_bap_tay is None:
            return None  # Skip if measurements not available

        required = vong_bap_tay + self.MIN_EASE_CM
        if vong_nach >= required:
            return None

        return ConstraintResult(
            constraint_id=self.constraint_id,
            severity=ConstraintSeverity.HARD,
            message_vi=(
                f"Vòng nách ({vong_nach:.1f}cm) nhỏ hơn vòng bắp tay "
                f"({vong_bap_tay:.1f}cm) + dư nách tối thiểu ({self.MIN_EASE_CM}cm). "
                f"Sẽ gây cấn tay, không thể mặc được."
            ),
            violated_values={
                "vong_nach": vong_nach,
                "vong_bap_tay": vong_bap_tay,
                "required_min": required,
            },
            safe_suggestion={"vong_nach": required},
        )


class NeckOpeningConstraint(HardConstraint):
    """Vòng cổ áo >= vòng đầu * factor (phải chui đầu qua hoặc có khóa).

    For garments without closures, neck must fit over head.
    """

    constraint_id = "neck_opening"
    description_vi = "Kiểm tra cổ áo so với vòng đầu"

    HEAD_FACTOR = 0.85  # Neck opening must be at least 85% of head circumference

    def check(
        self, measurements: dict, deltas: dict
    ) -> Optional[ConstraintResult]:
        vong_co = measurements.get("vong_co")
        vong_dau = measurements.get("vong_dau")

        if vong_co is None or vong_dau is None:
            return None

        required = vong_dau * self.HEAD_FACTOR
        if vong_co >= required:
            return None

        return ConstraintResult(
            constraint_id=self.constraint_id,
            severity=ConstraintSeverity.HARD,
            message_vi=(
                f"Vòng cổ áo ({vong_co:.1f}cm) quá nhỏ so với vòng đầu "
                f"({vong_dau:.1f}cm). Cổ áo phải >= {required:.1f}cm "
                f"để chui đầu qua được."
            ),
            violated_values={
                "vong_co": vong_co,
                "vong_dau": vong_dau,
                "required_min": required,
            },
            safe_suggestion={"vong_co": required},
        )


class WaistVsHipConstraint(HardConstraint):
    """Vòng eo rập phải cho phép mặc vào (vòng eo >= vòng mông * factor).

    For garments without side openings, waist must allow physical pass-through.
    """

    constraint_id = "waist_vs_hip"
    description_vi = "Kiểm tra eo so với mông"

    HIP_FACTOR = 0.7  # Waist must be at least 70% of hip for pass-through

    def check(
        self, measurements: dict, deltas: dict
    ) -> Optional[ConstraintResult]:
        vong_eo = measurements.get("vong_eo")
        vong_mong = measurements.get("vong_mong")

        if vong_eo is None or vong_mong is None:
            return None

        required = vong_mong * self.HIP_FACTOR
        if vong_eo >= required:
            return None

        return ConstraintResult(
            constraint_id=self.constraint_id,
            severity=ConstraintSeverity.HARD,
            message_vi=(
                f"Vòng eo ({vong_eo:.1f}cm) quá nhỏ so với vòng mông "
                f"({vong_mong:.1f}cm). Eo phải >= {required:.1f}cm "
                f"để mặc vào được."
            ),
            violated_values={
                "vong_eo": vong_eo,
                "vong_mong": vong_mong,
                "required_min": required,
            },
            safe_suggestion={"vong_eo": required},
        )


class MinimumSeamAllowanceConstraint(HardConstraint):
    """Dư đường may không được dưới mức tối thiểu vật lý.

    Seam allowances below minimum make garment construction impossible.
    """

    constraint_id = "minimum_seam_allowance"
    description_vi = "Kiểm tra dư đường may tối thiểu"

    MIN_SEAM_CM = 1.0  # Minimum for standard seams

    def check(
        self, measurements: dict, deltas: dict
    ) -> Optional[ConstraintResult]:
        du_duong_may = deltas.get("du_duong_may")

        if du_duong_may is None:
            return None

        if du_duong_may >= self.MIN_SEAM_CM:
            return None

        return ConstraintResult(
            constraint_id=self.constraint_id,
            severity=ConstraintSeverity.HARD,
            message_vi=(
                f"Dư đường may ({du_duong_may:.1f}cm) dưới mức tối thiểu "
                f"({self.MIN_SEAM_CM}cm). Không thể may được với dư đường may này."
            ),
            violated_values={"du_duong_may": du_duong_may},
            safe_suggestion={"du_duong_may": self.MIN_SEAM_CM},
        )
