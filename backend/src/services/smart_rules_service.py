"""Smart Rules Service - Story 2.4 & 2.5: Delta Mapping from Artisan Knowledge.

Manages the Local Knowledge Base (LKB) of artisan Smart Rules that map
style intensities to geometric Deltas. This is the core "knowledge engine"
that encodes traditional Vietnamese tailoring expertise.

Story 2.5 additions: CRUD operations for Rule Editor UI.
Uses 100% Vietnamese terminology per NFR11.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable

from src.models.inference import DeltaValue
from src.models.rule import (
    DeltaMappingDetail,
    DeltaMappingUpdateItem,
    RulePillarDetail,
    RulePillarSummary,
    RuleUpdateResponse,
)


@dataclass
class DeltaMapping:
    """Maps a slider value range to a delta computation.

    Represents the artisan's knowledge: "When slider X is in range [a, b],
    apply delta Y with formula F".
    """

    slider_range: tuple[float, float]  # (min, max) inclusive
    delta_key: str  # Vietnamese key, e.g., "do_cu_eo"
    delta_label_vi: str  # Vietnamese label, e.g., "Độ cử eo"
    delta_unit: str  # Usually "cm"
    formula: Callable[[float], float]  # slider_value -> delta_value
    golden_point: float = 50.0  # Optimal slider position (Điểm Vàng), [0, 100]


@dataclass
class SmartRule:
    """A Smart Rule linking a slider to its delta mappings.

    Each rule belongs to a specific pillar and slider combination.
    Multiple mappings allow different behaviors at different intensity ranges.
    """

    pillar_id: str
    slider_key: str
    mappings: list[DeltaMapping]


class SmartRulesService:
    """Service for managing artisan Smart Rules from LKB.

    Smart Rules are currently hardcoded, representing the digitized
    knowledge of Vietnamese tailoring masters (e.g., Cô Lan).
    Future: Can be loaded from database or The Vault.
    """

    # Vietnamese display names for pillars (NFR11)
    PILLAR_NAMES_VI: dict[str, str] = {
        "traditional": "Truyền thống",
        "minimalist": "Tối giản hiện đại",
        "avant_garde": "Tiên phong nghệ thuật",
    }

    def __init__(self) -> None:
        """Initialize SmartRulesService with LKB data."""
        self._rules = self._load_lkb_rules()
        self._last_modified: dict[str, datetime] = {
            pid: datetime.now(timezone.utc) for pid in self._rules
        }

    def _load_lkb_rules(self) -> dict[str, list[SmartRule]]:
        """Load Smart Rules from Local Knowledge Base.

        Returns rules indexed by pillar_id for efficient lookup.
        Each pillar has rules for its specific sliders.
        """
        return {
            "traditional": self._get_traditional_rules(),
            "minimalist": self._get_minimalist_rules(),
            "avant_garde": self._get_avant_garde_rules(),
        }

    def _get_traditional_rules(self) -> list[SmartRule]:
        """Smart Rules for Traditional (Truyền thống) style.

        Traditional Vietnamese tailoring emphasizes:
        - Generous ease for comfort and elegance
        - Classic proportions based on golden ratios
        - Flowing silhouettes for áo dài and formal wear
        """
        return [
            SmartRule(
                pillar_id="traditional",
                slider_key="shoulder_width",
                mappings=[
                    DeltaMapping(
                        slider_range=(0.0, 100.0),
                        delta_key="rong_vai",
                        delta_label_vi="Rộng vai",
                        delta_unit="cm",
                        # Linear: 0% = -2cm, 50% = 0, 100% = +2cm
                        formula=lambda v: (v - 50) * 0.04,
                    ),
                ],
            ),
            SmartRule(
                pillar_id="traditional",
                slider_key="body_fit",
                mappings=[
                    DeltaMapping(
                        slider_range=(0.0, 100.0),
                        delta_key="do_cu_eo",
                        delta_label_vi="Độ cử eo",
                        delta_unit="cm",
                        # Non-linear: loose at low, tight at high
                        # 0% = +3cm ease, 50% = +1cm, 100% = -1.5cm
                        formula=lambda v: 3.0 - (v * 0.045),
                    ),
                    DeltaMapping(
                        slider_range=(0.0, 100.0),
                        delta_key="rong_nguc",
                        delta_label_vi="Rộng ngực",
                        delta_unit="cm",
                        # Chest follows body fit: 0% = +2cm, 100% = -1cm
                        formula=lambda v: 2.0 - (v * 0.03),
                    ),
                ],
            ),
            SmartRule(
                pillar_id="traditional",
                slider_key="garment_length",
                mappings=[
                    DeltaMapping(
                        slider_range=(0.0, 100.0),
                        delta_key="dai_than",
                        delta_label_vi="Dài thân",
                        delta_unit="cm",
                        # Length adjustment: 0% = -5cm, 50% = 0, 100% = +5cm
                        formula=lambda v: (v - 50) * 0.1,
                    ),
                ],
            ),
            SmartRule(
                pillar_id="traditional",
                slider_key="do_rong_tay",
                mappings=[
                    DeltaMapping(
                        slider_range=(0.0, 100.0),
                        delta_key="rong_ong_tay",
                        delta_label_vi="Rộng ống tay",
                        delta_unit="cm",
                        # Sleeve width: 0% = -1.5cm, 50% = 0, 100% = +1.5cm
                        formula=lambda v: (v - 50) * 0.03,
                    ),
                    DeltaMapping(
                        slider_range=(0.0, 100.0),
                        delta_key="ha_nach",
                        delta_label_vi="Hạ nách",
                        delta_unit="cm",
                        # Armhole drop correlates with sleeve width
                        formula=lambda v: (v - 50) * 0.02,
                    ),
                ],
            ),
        ]

    def _get_minimalist_rules(self) -> list[SmartRule]:
        """Smart Rules for Minimalist (Tối giản hiện đại) style.

        Modern minimalist tailoring emphasizes:
        - Clean lines with moderate ease
        - Structured silhouettes for office wear
        - Subtle proportions without excess
        """
        return [
            SmartRule(
                pillar_id="minimalist",
                slider_key="shoulder_width",
                mappings=[
                    DeltaMapping(
                        slider_range=(0.0, 100.0),
                        delta_key="rong_vai",
                        delta_label_vi="Rộng vai",
                        delta_unit="cm",
                        # Tighter range for clean look: ±1.5cm
                        formula=lambda v: (v - 50) * 0.03,
                    ),
                ],
            ),
            SmartRule(
                pillar_id="minimalist",
                slider_key="body_fit",
                mappings=[
                    DeltaMapping(
                        slider_range=(0.0, 100.0),
                        delta_key="do_cu_eo",
                        delta_label_vi="Độ cử eo",
                        delta_unit="cm",
                        # Less ease range: 0% = +2cm, 100% = -1cm
                        formula=lambda v: 2.0 - (v * 0.03),
                    ),
                    DeltaMapping(
                        slider_range=(0.0, 100.0),
                        delta_key="rong_nguc",
                        delta_label_vi="Rộng ngực",
                        delta_unit="cm",
                        formula=lambda v: 1.5 - (v * 0.025),
                    ),
                ],
            ),
            SmartRule(
                pillar_id="minimalist",
                slider_key="garment_length",
                mappings=[
                    DeltaMapping(
                        slider_range=(0.0, 100.0),
                        delta_key="dai_than",
                        delta_label_vi="Dài thân",
                        delta_unit="cm",
                        # Smaller length range: ±3cm
                        formula=lambda v: (v - 50) * 0.06,
                    ),
                ],
            ),
            SmartRule(
                pillar_id="minimalist",
                slider_key="do_rong_tay",
                mappings=[
                    DeltaMapping(
                        slider_range=(0.0, 100.0),
                        delta_key="rong_ong_tay",
                        delta_label_vi="Rộng ống tay",
                        delta_unit="cm",
                        # Narrower sleeves for modern look
                        formula=lambda v: (v - 50) * 0.025,
                    ),
                ],
            ),
        ]

    def _get_avant_garde_rules(self) -> list[SmartRule]:
        """Smart Rules for Avant-garde (Tiên phong nghệ thuật) style.

        Avant-garde tailoring emphasizes:
        - Dramatic proportions and asymmetry
        - Experimental ease values
        - Bold deconstructed elements
        """
        return [
            SmartRule(
                pillar_id="avant_garde",
                slider_key="shoulder_width",
                mappings=[
                    DeltaMapping(
                        slider_range=(0.0, 100.0),
                        delta_key="rong_vai",
                        delta_label_vi="Rộng vai",
                        delta_unit="cm",
                        # Wide range for dramatic shoulders: ±4cm
                        formula=lambda v: (v - 50) * 0.08,
                    ),
                ],
            ),
            SmartRule(
                pillar_id="avant_garde",
                slider_key="body_fit",
                mappings=[
                    DeltaMapping(
                        slider_range=(0.0, 100.0),
                        delta_key="do_cu_eo",
                        delta_label_vi="Độ cử eo",
                        delta_unit="cm",
                        # Extreme range: 0% = +5cm, 100% = -2cm
                        formula=lambda v: 5.0 - (v * 0.07),
                    ),
                    DeltaMapping(
                        slider_range=(0.0, 100.0),
                        delta_key="rong_nguc",
                        delta_label_vi="Rộng ngực",
                        delta_unit="cm",
                        formula=lambda v: 3.0 - (v * 0.05),
                    ),
                ],
            ),
            SmartRule(
                pillar_id="avant_garde",
                slider_key="garment_length",
                mappings=[
                    DeltaMapping(
                        slider_range=(0.0, 100.0),
                        delta_key="dai_than",
                        delta_label_vi="Dài thân",
                        delta_unit="cm",
                        # Dramatic length changes: ±8cm
                        formula=lambda v: (v - 50) * 0.16,
                    ),
                ],
            ),
            SmartRule(
                pillar_id="avant_garde",
                slider_key="do_rong_tay",
                mappings=[
                    DeltaMapping(
                        slider_range=(0.0, 100.0),
                        delta_key="rong_ong_tay",
                        delta_label_vi="Rộng ống tay",
                        delta_unit="cm",
                        # Exaggerated sleeves possible
                        formula=lambda v: (v - 50) * 0.05,
                    ),
                    DeltaMapping(
                        slider_range=(0.0, 100.0),
                        delta_key="ha_nach",
                        delta_label_vi="Hạ nách",
                        delta_unit="cm",
                        # Deep armhole for dramatic look
                        formula=lambda v: (v - 50) * 0.04,
                    ),
                ],
            ),
            SmartRule(
                pillar_id="avant_garde",
                slider_key="do_bat_doi_xung",
                mappings=[
                    DeltaMapping(
                        slider_range=(0.0, 100.0),
                        delta_key="lech_vai",
                        delta_label_vi="Lệch vai",
                        delta_unit="cm",
                        # Asymmetry: 0% = 0, 100% = +3cm one-sided
                        formula=lambda v: v * 0.03,
                    ),
                    DeltaMapping(
                        slider_range=(0.0, 100.0),
                        delta_key="do_xoe_ta",
                        delta_label_vi="Độ xòe tà",
                        delta_unit="cm",
                        # Hem flare increases with asymmetry
                        formula=lambda v: v * 0.05,
                    ),
                ],
            ),
        ]

    def get_rules_for_pillar(self, pillar_id: str) -> list[SmartRule]:
        """Get all Smart Rules for a specific style pillar.

        Args:
            pillar_id: The style pillar identifier.

        Returns:
            List of SmartRule objects for the pillar.
            Empty list if pillar not found.
        """
        return self._rules.get(pillar_id, [])

    def compute_deltas(
        self,
        pillar_id: str,
        intensities: dict[str, float],
    ) -> list[DeltaValue]:
        """Compute all Delta values from intensities using Smart Rules.

        This is the core "Emotional Compiler" computation:
        1. Look up rules for the pillar
        2. For each slider intensity, apply matching rule formulas
        3. Aggregate all deltas (merge if same key with average)

        Args:
            pillar_id: The style pillar identifier.
            intensities: Dict mapping slider_key to current value.

        Returns:
            List of computed DeltaValue objects.
        """
        rules = self.get_rules_for_pillar(pillar_id)
        if not rules:
            return []

        # Collect all deltas, keyed for potential merging
        delta_accumulator: dict[str, list[float]] = {}
        delta_metadata: dict[str, tuple[str, str]] = {}  # key -> (label_vi, unit)

        for rule in rules:
            slider_value = intensities.get(rule.slider_key)
            if slider_value is None:
                continue

            for mapping in rule.mappings:
                # Check if slider value is in mapping range
                min_val, max_val = mapping.slider_range
                if not (min_val <= slider_value <= max_val):
                    continue

                # Compute delta using formula
                delta_value = mapping.formula(slider_value)

                # Accumulate (allows multiple rules affecting same delta)
                if mapping.delta_key not in delta_accumulator:
                    delta_accumulator[mapping.delta_key] = []
                    delta_metadata[mapping.delta_key] = (
                        mapping.delta_label_vi,
                        mapping.delta_unit,
                    )
                delta_accumulator[mapping.delta_key].append(delta_value)

        # Build final delta list (average if multiple contributions)
        result: list[DeltaValue] = []
        for key, values in delta_accumulator.items():
            avg_value = sum(values) / len(values)
            label_vi, unit = delta_metadata[key]
            result.append(
                DeltaValue(
                    key=key,
                    value=round(avg_value, 2),  # Round to 2 decimal places
                    unit=unit,
                    label_vi=label_vi,
                )
            )

        # Sort by key for deterministic output
        result.sort(key=lambda d: d.key)
        return result

    def get_available_pillar_ids(self) -> list[str]:
        """Get list of all pillar IDs with Smart Rules.

        Returns:
            List of pillar ID strings.
        """
        return list(self._rules.keys())

    # ===== Story 2.5: Rule Editor CRUD Methods =====

    def _extract_formula_params(
        self, formula: Callable[[float], float], slider_range: tuple[float, float]
    ) -> tuple[float, float]:
        """Extract scale_factor and offset from a formula by sampling.

        Approximates formula as: f(v) = offset + scale_factor * v
        by evaluating at two points.

        Returns:
            (scale_factor, offset) tuple.
        """
        v0 = slider_range[0]
        v1 = slider_range[1]
        f0 = formula(v0)
        f1 = formula(v1)
        # Linear approximation: f(v) = offset + scale * v
        scale = (f1 - f0) / (v1 - v0) if v1 != v0 else 0.0
        offset = f0
        return (round(scale, 6), round(offset, 2))

    def get_all_pillar_summaries(self) -> list[RulePillarSummary]:
        """Get summary of all pillars for Rule Editor list view (AC1).

        Returns:
            List of RulePillarSummary for each pillar.
        """
        summaries: list[RulePillarSummary] = []
        for pillar_id, rules in self._rules.items():
            total_mappings = sum(len(r.mappings) for r in rules)
            summaries.append(
                RulePillarSummary(
                    pillar_id=pillar_id,
                    pillar_name_vi=self.PILLAR_NAMES_VI.get(pillar_id, pillar_id),
                    delta_mapping_count=total_mappings,
                    slider_count=len(rules),
                    last_modified=self._last_modified.get(
                        pillar_id, datetime.now(timezone.utc)
                    ),
                )
            )
        return summaries

    def get_pillar_detail(self, pillar_id: str) -> RulePillarDetail | None:
        """Get full detail of a pillar's Smart Rules (AC2).

        Args:
            pillar_id: The style pillar identifier.

        Returns:
            RulePillarDetail or None if pillar not found.
        """
        rules = self._rules.get(pillar_id)
        if rules is None:
            return None

        mappings: list[DeltaMappingDetail] = []
        for rule in rules:
            for mapping in rule.mappings:
                scale, offset = self._extract_formula_params(
                    mapping.formula, mapping.slider_range
                )
                golden = mapping.golden_point
                mappings.append(
                    DeltaMappingDetail(
                        slider_key=rule.slider_key,
                        delta_key=mapping.delta_key,
                        delta_label_vi=mapping.delta_label_vi,
                        delta_unit=mapping.delta_unit,
                        slider_range_min=mapping.slider_range[0],
                        slider_range_max=mapping.slider_range[1],
                        scale_factor=scale,
                        offset=offset,
                        golden_point=golden,
                    )
                )

        return RulePillarDetail(
            pillar_id=pillar_id,
            pillar_name_vi=self.PILLAR_NAMES_VI.get(pillar_id, pillar_id),
            mappings=mappings,
            last_modified=self._last_modified.get(
                pillar_id, datetime.now(timezone.utc)
            ),
        )

    def update_pillar_rules(
        self, pillar_id: str, update_items: list[DeltaMappingUpdateItem]
    ) -> RuleUpdateResponse | None:
        """Update a pillar's Smart Rules from Rule Editor (AC3).

        Replaces all rules for the pillar with the provided mappings.
        Groups mappings by slider_key to reconstruct SmartRule objects.

        Args:
            pillar_id: The style pillar identifier.
            update_items: New delta mapping definitions.

        Returns:
            RuleUpdateResponse or None if pillar not found.
        """
        if pillar_id not in self._rules:
            return None

        # Group update items by slider_key
        slider_groups: dict[str, list[DeltaMappingUpdateItem]] = {}
        for item in update_items:
            slider_groups.setdefault(item.slider_key, []).append(item)

        # Build new SmartRule list
        new_rules: list[SmartRule] = []
        for slider_key, items in slider_groups.items():
            new_mappings: list[DeltaMapping] = []
            for item in items:
                # Reconstruct formula from scale_factor and offset
                # Capture values in closure properly
                scale = item.scale_factor
                offset = item.offset
                new_mappings.append(
                    DeltaMapping(
                        slider_range=(item.slider_range_min, item.slider_range_max),
                        delta_key=item.delta_key,
                        delta_label_vi=item.delta_label_vi,
                        delta_unit=item.delta_unit,
                        formula=lambda v, s=scale, o=offset: o + s * v,
                        golden_point=item.golden_point,
                    )
                )
            new_rules.append(
                SmartRule(
                    pillar_id=pillar_id,
                    slider_key=slider_key,
                    mappings=new_mappings,
                )
            )

        # Replace rules and update timestamp
        self._rules[pillar_id] = new_rules
        now = datetime.now(timezone.utc)
        self._last_modified[pillar_id] = now

        total_mappings = sum(len(r.mappings) for r in new_rules)
        pillar_name = self.PILLAR_NAMES_VI.get(pillar_id, pillar_id)

        return RuleUpdateResponse(
            success=True,
            pillar_id=pillar_id,
            pillar_name_vi=pillar_name,
            mapping_count=total_mappings,
            last_modified=now,
            message=f"Đã cập nhật thành công quy tắc cho '{pillar_name}' với {total_mappings} ánh xạ delta.",
        )
