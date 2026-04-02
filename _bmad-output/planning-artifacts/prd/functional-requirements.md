# Functional Requirements

## 1. Style & Semantic Interpretation
- **FR1:** Users can select predefined Style Pillars.
- **FR2:** Users can adjust style intensity via Sliders.
- **FR3:** System translates style selections into Ease Delta parameter sets.
- **FR4:** System suggests fabrics based on the compatibility matrix between Ease Delta and materials (configured by artisan, matching criteria: stretch coefficient, weight class, and weave type).

## 2. Geometric Transformation Engine
- **FR5:** System applies Ease Delta to the standard pattern (Golden Base Pattern).
- **FR6:** System calculates new (x,y) coordinates based on customer body measurements.
- **FR7:** System generates a Master Geometry Specification containing post-transformation geometric parameters.
- **FR8:** System exports a Blueprint drawing (SVG) for visual display.

## 3. Deterministic Guardrails & Validation
- **FR9:** System automatically checks physical constraints (e.g., armhole circumference vs. bicep).
- **FR10:** System blocks Blueprint export if Golden Rules geometric constraints are violated.
- **FR11:** System issues a technical warning when geometric parameters fall within ±5% of the fabric's physical limit threshold.
- **FR12:** Tailors can manually override AI suggestions.

## 4. Tailor Collaboration & Production
- **FR13:** Users can view the Overlay comparing standard and custom patterns.
- **FR14:** Tailors can use the Sanity Check Dashboard to cross-reference customer measurements with AI suggestions.
- **FR15:** Tailors receive a detailed list of adjustment parameters (+/- cm) for each cut position to execute production.
- **FR16:** System manages and secures access to internal Golden Rules knowledge.

## 5. Measurement & Profile Management
- **FR17:** Tailors can input and store detailed measurement sets (per standard parameter catalog: Bust, Waist, Hip, Shoulder Width, Arm Length, Body Length, Neck Circumference) for each customer.
- **FR18:** System links customer measurements to corresponding custom pattern versions in history.

## 6. Rental Catalog & Status (Digital Showroom)
- **FR22 (Digital Catalog):** System displays rental Áo dài list with images, description, and actual size specifications (Bust/Waist/Hip in cm).
- **FR23 (Availability Status):** System displays real-time status: Available, Rented, Maintenance.
- **FR24 (Return Timeline):** System displays expected return date for each rented garment.
- **FR25 (Inventory Admin):** Owner updates inventory status in maximum 3 touch actions.

## 7. Authentication & Security
- **FR26 (Forgot Password):** System allows password recovery requests by reusing the Registration OTP infrastructure.
- **FR27 (Recovery Email):** System uses a dedicated OTP email template for password recovery (`otp_password_recovery.html`); other logic resources are shared with the Registration system.
- **FR28 (Password Reset Flow):** System allows password update only after successful OTP verification.

## 8. Product & Inventory Management
- **FR29 (Product Listing):** System displays all Áo dài products with server-side pagination (20 items per page).
- **FR30 (Product Filters):** Users can filter products by Season, Color, Material, and Size — filters are combinable and return results within 500ms.
- **FR31 (Product Detail):** System displays product detail with HD images (zoom support), full description, and size chart.
- **FR32 (Buy/Rent Selection):** Users can select "Buy" or "Rent" on product detail — Rent mode shows a calendar for borrow/return date selection.
- **FR33 (Product CRUD):** Owner can create, read, update, and delete Áo dài product entries.
- **FR34 (Inventory Management):** Owner can update inventory quantity and status (Available, Rented, Maintenance, Retired).
- **FR35 (Season Attributes):** Owner can assign seasonal tags to products for catalog filtering.
- **FR36 (Rental Status Timeline):** System displays the expected return date for each rented item, visible to both Owner and Customer.
- **FR37 (Return Notifications):** System sends automated reminders to customers 3 days and 1 day before the rental return deadline.

## 9. E-commerce: Cart & Checkout
- **FR38 (Cart):** System maintains a shopping cart listing products with quantity, unit price, and buy/rent classification.
- **FR39 (Cart Actions):** Users can update quantities, remove items, and view a running total — cart state persists across sessions for authenticated users.
- **FR40 (Checkout Info):** Users can enter shipping address and select payment method (COD, bank transfer, e-wallet) during checkout.
- **FR41 (Order Confirmation):** System creates an order record upon checkout confirmation and sends a confirmation notification (email).

## 10. Appointment Booking
- **FR42 (Booking Calendar):** Users can select a date and time slot for an in-store visit via a visual calendar interface.
- **FR43 (Booking Form):** Users submit personal information and special requests as part of the booking.
- **FR44 (Booking Confirmation):** System confirms the appointment and sends a notification (email/SMS) to both customer and owner.

## 11. Order & Payment Management
- **FR45 (Order List - Owner):** Owner can view all orders with filtering by status (Pending, Confirmed, In Production, Shipped, Delivered, Cancelled).
- **FR46 (Order Detail):** Owner and Customer can view full order details including items, quantities, prices, shipping info, and payment status.
- **FR47 (Order Status Update):** Owner can update order status through the defined workflow (Pending → Confirmed → In Production → Shipped → Delivered).
- **FR48 (Rental Management):** Owner can view all active rentals with expected return dates and current condition status.
- **FR49 (Return Tracking):** Owner can log the condition of returned rental items (Good, Damaged, Lost).
- **FR50 (Late Return Notification):** System sends automated notifications to customers with overdue rental returns.
- **FR51 (Payment Integration):** System processes payments through an integrated payment gateway supporting COD, bank transfer, and e-wallet.
- **FR52 (Payment Status):** System tracks and displays payment status (Pending, Paid, Failed, Refunded) for each order.
- **FR53 (Order History - Customer):** Customers can view their complete order and rental history with status tracking.
- **FR54 (Invoice Download):** Customers can download invoices for completed orders in PDF format.

## 12. Operations Dashboard
- **FR55 (Revenue Overview):** Owner dashboard displays total revenue summary (daily, weekly, monthly) with trend indicators.
- **FR56 (Revenue Charts):** Owner dashboard displays revenue visualization charts (line/bar) with date range selection.
- **FR57 (Order Statistics):** Dashboard displays order count breakdown: buy vs. rent, by status.
- **FR58 (Production Alerts):** Dashboard displays alerts for garments with production deadlines within 7 days.
- **FR59 (Appointment List):** Owner can view real-time list of booked appointments with customer info and status.
- **FR60 (Appointment Filtering):** Owner can filter appointments by date and status (Upcoming, Completed, Cancelled).
- **FR61 (Task Assignment):** Owner can assign production tasks to specific tailors with deadline and notes.

## 13. Tailor Dashboard
- **FR62 (Assigned Tasks):** Tailors can view their list of assigned tasks with deadlines, order details, and priority.
- **FR63 (Production List):** Tailors can view completed garments with associated pricing for income calculation.
- **FR64 (Income Statistics):** Tailors can view monthly income breakdown by garment type, with comparison to previous months.
- **FR65 (Task Status Update):** Tailors can update task status (Assigned → In Progress → Completed).

## 14. Customer Management
- **FR66 (Customer Profiles):** Owner can view customer profiles including measurements, purchase/rental history.
- **FR67 (Customer Search):** Owner can search customers by name, phone number, or email.
- **FR68 (Measurement History):** System maintains a versioned history of customer measurement changes.

## 15. CRM & Marketing
- **FR69 (Lead List):** Owner can view a list of potential customers (leads) with contact info and interest level.
- **FR70 (Lead Creation):** Owner can manually add new leads with contact details and source.
- **FR71 (Lead Classification):** Owner can classify leads by interest level (Hot, Warm, Cold).
- **FR72 (Lead Conversion):** Owner can convert a qualified lead into a registered customer account.
- **FR73 (Voucher CRUD):** Owner can create, edit, and deactivate vouchers.
- **FR74 (Voucher Types):** System supports percentage-based and fixed-amount discount vouchers.
- **FR75 (Voucher Conditions):** Owner can set usage conditions: minimum order value, validity period, single/multi-use.
- **FR76 (Voucher Analytics):** System tracks voucher usage count, redemption rate, and associated revenue.
- **FR77 (Voucher Distribution):** Owner can send voucher codes to customer segments via email.
- **FR78 (Outreach Campaign):** Owner can create and send bulk messages to customer segments.
- **FR79 (Channel Integration):** System supports outreach via Zalo and Facebook messaging APIs.
- **FR80 (Template Messages):** Owner can use and customize pre-built message templates for campaigns.
- **FR81 (Campaign Analytics):** System tracks message open rate, click-through rate, and voucher redemption per campaign.

## 16. Unified Order Workflow
- **FR82 (Bespoke Measurement Gate):** When a customer selects "Bespoke Order", the system checks the customer's measurement profile. If no measurements exist, the system redirects to the Appointment Booking page. If measurements exist, the system displays the measurement summary with last-updated timestamp for customer confirmation or re-measurement request.
- **FR83 (Service-Type Payment):** System supports 3 payment modes by service type: Buy (100% upfront payment), Rent (Deposit + CCCD or Security Deposit), Bespoke (Deposit only).
- **FR84 (Rental Security Requirement):** Rental orders require recording either a government-issued ID (CCCD) or a cash security deposit, plus scheduled pickup and return dates at checkout.
- **FR85 (Owner Order Approval):** Owner must approve pending orders before they enter production or preparation. Order transitions from `pending` to `confirmed` upon Owner approval.
- **FR86 (Auto-Routing on Approval):** Upon Owner confirmation, the system automatically creates a TailorTask with attached measurement data for bespoke orders, or routes to warehouse preparation queue for rent/buy orders.
- **FR87 (Service-Type Preparation Steps):** Preparation sub-steps are differentiated by service type: Rent (Cleaning → Altering → Ready), Buy (QC → Packaging). Bespoke follows existing production sub-steps (Cutting → Sewing → Fitting → Finishing).
- **FR88 (Readiness Status):** System marks orders as `ready_to_ship` or `ready_for_pickup` when all preparation sub-steps are complete, and notifies the customer.
- **FR89 (Remaining Balance Payment):** For deposit-based orders, customers pay the remaining balance (order total minus deposit) before product handover.
- **FR90 (Security Return on Rental Close):** For rental orders, the system returns the security deposit (cash) or CCCD to the customer after the returned product passes Owner's condition inspection (Good/Damaged/Lost).

## 17. Technical Pattern Generation & Production Export
- **FR91 (Pattern Session Creation):** Owner creates a pattern session by selecting a customer profile; system auto-fills 10 body measurements (body length, waist drop, neck circumference, armhole circumference, bust circumference, waist circumference, hip circumference, sleeve length, bicep circumference, wrist circumference) from the customer's measurement record.
- **FR92 (Pattern Generation):** System generates 3 technical pattern pieces (front bodice, back bodice, sleeve) from 10 body measurements using deterministic formulas. Geometric deviation from tailor-validated reference patterns < 1mm.
- **FR93 (Curve Generation):** System generates armhole curves (1/4 ellipse arc) and sleeve cap curves (1/2 ellipse arc) matching tailor-validated contours.
- **FR94 (SVG Export):** System exports each pattern piece as SVG at 1:1 scale — printed output matches physical measurements within ±0.5mm tolerance.
- **FR95 (G-code Export):** System exports pattern pieces as G-code for laser cutting with closed paths, cut sequence, and configurable speed/power parameters.
- **FR96 (Pattern Preview):** System displays real-time SVG preview in split-pane layout (measurement input left, pattern preview right) — preview updates within 500ms of measurement change.
- **FR97 (Pattern-Order Attachment):** Owner attaches a completed pattern session to an order when assigning a tailor task. Tailor receives order with linked pattern pieces.
- **FR98 (Tailor Pattern View):** Tailor views attached pattern pieces in order/task detail page with zoom and pan interaction.
- **FR99 (Measurement Validation):** System validates all 10 measurements against min/max ranges before pattern generation. Invalid measurements display specific error messages with acceptable range.
