"""Soft Constraint implementations - Story 4.1a Task 3.

Advisory rules that warn but do not block. Migrated from style_service.py
and extended with danger zone proximity warnings.
All messages use 100% Vietnamese tailoring terminology (NFR11).
"""

from typing import Optional

from src.constraints.base import ConstraintResult, ConstraintSeverity, SoftConstraint


class HighBodyHugWarning(SoftConstraint):
    """body_fit > threshold: body too tight, may restrict movement.

    Migrated from style_service.py _SOFT_CONSTRAINTS[0].
    """

    constraint_id = "high_body_hug"
    description_vi = "Cảnh báo độ ôm thân quá cao"

    THRESHOLD = 85.0

    def check(
        self, measurements: dict, deltas: dict
    ) -> Optional[ConstraintResult]:
        val = deltas.get("body_fit")
        if val is None or val <= self.THRESHOLD:
            return None

        return ConstraintResult(
            constraint_id=self.constraint_id,
            severity=ConstraintSeverity.SOFT,
            message_vi="Độ ôm thân quá cao có thể gây hạn chế vận động khi mặc",
            violated_values={"body_fit": val},
            safe_suggestion=None,
        )


class NarrowShoulderWarning(SoftConstraint):
    """shoulder_width < threshold: shoulders too narrow, may cause armhole issues.

    Migrated from style_service.py _SOFT_CONSTRAINTS[1].
    """

    constraint_id = "narrow_shoulder"
    description_vi = "Cảnh báo vai quá hẹp"

    THRESHOLD = 30.0

    def check(
        self, measurements: dict, deltas: dict
    ) -> Optional[ConstraintResult]:
        val = deltas.get("shoulder_width")
        if val is None or val >= self.THRESHOLD:
            return None

        return ConstraintResult(
            constraint_id=self.constraint_id,
            severity=ConstraintSeverity.SOFT,
            message_vi="Vai quá hẹp so với tỷ lệ cơ thể — có thể gây cấn ở vùng nách",
            violated_values={"shoulder_width": val},
            safe_suggestion=None,
        )


class AsymmetryWarning(SoftConstraint):
    """do_bat_doi_xung > threshold: high asymmetry requires expert tailor.

    Migrated from style_service.py _SOFT_CONSTRAINTS[2].
    """

    constraint_id = "high_asymmetry"
    description_vi = "Cảnh báo độ bất đối xứng cao"

    THRESHOLD = 70.0

    def check(
        self, measurements: dict, deltas: dict
    ) -> Optional[ConstraintResult]:
        val = deltas.get("do_bat_doi_xung")
        if val is None or val <= self.THRESHOLD:
            return None

        return ConstraintResult(
            constraint_id=self.constraint_id,
            severity=ConstraintSeverity.SOFT,
            message_vi="Độ bất đối xứng cao — yêu cầu thợ may nhiều kinh nghiệm để thực hiện",
            violated_values={"do_bat_doi_xung": val},
            safe_suggestion=None,
        )


class DangerZoneProximityWarning(SoftConstraint):
    """Warn when values are close to hard constraint limits.

    Checks armhole-vs-bicep proximity: warns when ease is between
    min_ease and min_ease + proximity_buffer (danger zone).
    """

    constraint_id = "danger_zone_proximity"
    description_vi = "Cảnh báo gần vùng nguy hiểm"

    # Hard constraint: armhole >= bicep + 2cm
    MIN_EASE_CM = 2.0
    PROXIMITY_BUFFER_CM = 1.0  # Warn if ease < min_ease + buffer

    def check(
        self, measurements: dict, deltas: dict
    ) -> Optional[ConstraintResult]:
        vong_nach = measurements.get("vong_nach")
        vong_bap_tay = measurements.get("vong_bap_tay")

        if vong_nach is None or vong_bap_tay is None:
            return None

        ease = vong_nach - vong_bap_tay

        # If already violated (ease < min_ease), hard constraint handles it
        if ease < self.MIN_EASE_CM:
            return None

        # Warn if in danger zone: min_ease <= ease < min_ease + buffer
        if ease < self.MIN_EASE_CM + self.PROXIMITY_BUFFER_CM:
            return ConstraintResult(
                constraint_id=self.constraint_id,
                severity=ConstraintSeverity.SOFT,
                message_vi=(
                    f"Dư nách ({ease:.1f}cm) gần mức tối thiểu ({self.MIN_EASE_CM}cm). "
                    f"Hạ nách hơi cao, có thể gây cấn tay ở một số tư thế."
                ),
                violated_values={
                    "vong_nach": vong_nach,
                    "vong_bap_tay": vong_bap_tay,
                    "current_ease": ease,
                },
                safe_suggestion=None,
            )

        return None
