# Domain-Specific Requirements

## Bespoke Constraints & Legacy Digitization
- **Local Knowledge Base (LKB):** RAG system prioritizes shop-specific heritage rules.
- **Geometric Precision:** Geometric error ΔG target of **0.5mm** for premium bespoke tailoring.

## Internal Governance & "The Vault"
- **Heritage Security:** Protect "Knowledge Vault" (Smart Rules) from unauthorized access.
- **Role-Based Access (RBAC):** Permission separation between Cô Lan (Knowledge Admin), Minh (Production Execution), and Customers (View-only for catalog and orders).

## Physical-Digital Integration
- **SVG/DXF Export:** Export precision vector drawings for pattern printing or fabric projection.
- **Manual Override:** Tailors can override AI suggestions based on real material feel and professional judgment.

## E-commerce & Payment Compliance
- **Payment Processing:** All payment transactions processed through PCI DSS-compliant gateway — no raw card data stored on system servers.
- **Order Data Retention:** Customer order and payment records retained for minimum 5 years per Vietnamese commercial regulations.
- **Consumer Protection:** Clear return/exchange policy displayed during checkout; cancellation allowed within 24 hours of order placement.

## Innovation & Novel Patterns

### Detected Innovation Areas
- **Physical-Emotional Compiler:** Quantifies abstract concepts into geometric values (Geometric Delta).
- **Atelier Academy:** Transforms tacit knowledge into AI system via **Learning Loop** (Human-in-the-loop).
- **Adaptive Canvas:** Real-time collaborative visual interface driven by geometric data.
- **Heritage E-commerce Fusion:** Unique combination of traditional craft AI with modern e-commerce, enabling heritage shops to compete digitally without sacrificing artisanal quality.

## Market Context & Competitive Landscape
- **Differentiator:** Fills the gap between generic size-selection apps and professional CAD software by combining AI creativity with geometric precision AND a full commerce backbone.

## Risk Mitigation
- **Deterministic Guardrails:** Block physical violations at data layer through mathematical constraint checking.
- **Manual Override:** Maintain human element for unpredictable material variables.
- **Payment Fallback:** Support COD as fallback payment method to ensure orders are not blocked by payment gateway issues.
