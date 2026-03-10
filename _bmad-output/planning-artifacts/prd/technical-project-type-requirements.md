# Technical & Project-Type Requirements

## Technical Architecture
- **Single Source of Truth (SSOT):** Master Geometry Specification serves as the sole bridge for all geometric data.
- **Core Geometry Logic:** Applies the formula $P_{final} = P_{base} + \alpha \cdot \Delta_{preset}$.
- **Authoritative Server Pattern:** Backend is the only source of truth for geometry calculations, business logic, and data validation. Frontend handles rendering and user interaction only.

## API Capabilities
- **Inference Translation:** Translate emotional/style input into Ease Profile parameters.
- **Blueprint Generation:** Apply Delta to standard pattern based on actual measurements.
- **Guardrail Checking:** Validate physical violations and geometric risks before Blueprint export.
- **Product Management:** CRUD operations for product catalog, inventory status, and seasonal attributes.
- **Order Processing:** Order creation, status management, and payment processing workflows.
- **Appointment Scheduling:** Booking creation, calendar availability, and confirmation notifications.
- **Customer Data:** Customer profiles, measurement management, and purchase/rental history.
- **CRM Operations:** Lead management, voucher CRUD, and campaign dispatch.
- **Authentication:** Registration, login, OTP verification, password recovery, and session management.

## Data Schema & Knowledge Base
- **Master Geometry Structure:** Coordinates (x,y), fabric metadata, Ease Profile, and base pattern references.
- **Manufacturing Standards:** Support SVG (display) and DXF (production) data export.
- **E-commerce Schema:** Products, Orders, OrderItems, Payments, Rentals, Appointments, Cart.
- **CRM Schema:** Leads, Vouchers, Campaigns, CustomerSegments.
- **User Schema:** Users (multi-role), Profiles, Measurements, MeasurementHistory.
