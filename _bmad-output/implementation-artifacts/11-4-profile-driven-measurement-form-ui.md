# Story 11.4: Profile-Driven Measurement Form UI

Status: ready-for-dev

## Story

As an Owner,
I want to select a customer and auto-fill their 10 body measurements into the Design Session form,
so that I can quickly start pattern generation without re-entering known data.

## Acceptance Criteria

1. **Customer Selection Combobox** — MeasurementForm includes searchable customer combobox
   - Given Owner is on Design Session page
   - When Owner types in the customer combobox (≥2 characters)
   - Then system shows filtered list of customers matching name/phone
   - And Owner can select a customer from the dropdown

2. **Auto-Fill Measurements from Profile** — Selecting customer populates form
   - Given Owner selects a customer with existing measurements
   - When customer is selected
   - Then system auto-fills all 10 measurement fields from customer's default measurement profile
   - And form shows "Số đo từ: {customer_name} (cập nhật: {date})"

3. **Handle Customer Without Measurements** — Clear error state
   - Given Owner selects a customer without measurement profile
   - When customer is selected
   - Then form displays warning: "Khách hàng chưa có số đo. Vui lòng nhập thủ công hoặc tạo hồ sơ số đo."
   - And all 10 fields remain empty but editable

4. **10-Field Measurement Form** — Complete form with Vietnamese labels
   - Form displays 10 measurement fields with labels:
     - Độ dài áo (`do_dai_ao`) — Body length (cm)
     - Hạ eo (`ha_eo`) — Waist drop (cm)
     - Vòng cổ (`vong_co`) — Neck circumference (cm)
     - Vòng nách (`vong_nach`) — Armhole circumference (cm)
     - Vòng ngực (`vong_nguc`) — Bust circumference (cm)
     - Vòng eo (`vong_eo`) — Waist circumference (cm)
     - Vòng mông (`vong_mong`) — Hip circumference (cm)
     - Độ dài tay (`do_dai_tay`) — Sleeve length (cm)
     - Vòng bắp tay (`vong_bap_tay`) — Bicep circumference (cm)
     - Vòng cổ tay (`vong_co_tay`) — Wrist circumference (cm)
   - All fields accept numeric input (NUMERIC 5,1 = max 999.9, 1 decimal)
   - Unit "cm" displayed as suffix on each field

5. **Manual Edit Capability** — Owner can modify auto-filled values
   - Given form is auto-filled from customer profile
   - When Owner modifies any measurement value
   - Then form accepts the change
   - And form displays indicator: "Đã chỉnh sửa thủ công"

6. **Validation Before Pattern Generation** — Min/Max range validation
   - Given Owner clicks "Tạo rập" (Generate Pattern) button
   - When any measurement is outside valid range:
     - do_dai_ao: 30-200 cm
     - ha_eo: 5-50 cm
     - vong_co: 20-60 cm
     - vong_nach: 30-80 cm
     - vong_nguc: 60-150 cm
     - vong_eo: 50-140 cm
     - vong_mong: 60-160 cm
     - do_dai_tay: 30-100 cm
     - vong_bap_tay: 15-60 cm
     - vong_co_tay: 10-40 cm
   - Then form displays Vietnamese error: "{field_label} phải từ {min} đến {max} cm"
   - And pattern generation is blocked

7. **Create Pattern Session** — Trigger backend API on valid submission
   - Given all 10 measurements are valid
   - When Owner clicks "Tạo rập"
   - Then frontend calls `POST /api/v1/patterns/sessions` with:
     - `customer_id`: selected customer ID (nullable if manual entry)
     - 10 measurement fields
     - `garment_type`: "ao_dai" (default for MVP)
   - And loading state displays "Đang tạo phiên thiết kế..."
   - And on success, navigates to `/design-session/{session_id}` (Story 11.5 page)

8. **Error Handling** — Backend errors displayed gracefully
   - Given backend returns error (422, 500)
   - When error occurs
   - Then form displays error toast with Vietnamese message
   - And form state is preserved (no data loss)

## Tasks / Subtasks

- [ ] Task 1: Create MeasurementForm component (AC: #1, #2, #3, #4, #5, #6)
  - [ ] 1.1 Create `frontend/src/components/client/design/MeasurementForm.tsx`
    - 10 input fields with Vietnamese labels
    - Customer combobox at top (using existing CustomerListTable search pattern)
    - Manual edit indicator state
    - Zod schema for validation with min/max ranges
  - [ ] 1.2 Create `frontend/src/types/pattern.ts` — Pattern session types + Zod schemas
    - `PatternMeasurementInput` (10 fields)
    - `PatternSessionCreate` request schema
    - `PatternSessionResponse` schema
    - Validation ranges as constants
  - [ ] 1.3 Implement customer search + auto-fill logic
    - Debounced search (300ms)
    - Load customer's default measurement via API
    - Map customer measurement fields to pattern measurement fields

- [ ] Task 2: Create server actions for pattern session (AC: #7, #8)
  - [ ] 2.1 Create `frontend/src/app/actions/pattern-actions.ts`
    - `createPatternSession(data: PatternSessionCreate)` — POST to backend
    - `fetchCustomerMeasurement(customerId: string)` — GET default measurement
  - [ ] 2.2 Add TanStack Query hooks in `frontend/src/hooks/usePatternSession.ts`
    - `useCreatePatternSession()` mutation
    - `useCustomerMeasurement(customerId)` query

- [ ] Task 3: Integrate into Design Session page (AC: #1-8)
  - [ ] 3.1 Update `frontend/src/app/(workplace)/design-session/page.tsx`
    - Import MeasurementForm
    - Handle session creation + navigation to session detail
  - [ ] 3.2 Update `frontend/src/app/(workplace)/design-session/DesignSessionClient.tsx`
    - Replace placeholder measurement input with MeasurementForm
    - Wire up pattern session creation flow
  - [ ] 3.3 Update `frontend/src/store/designStore.ts` — Add pattern session state
    - `selected_customer_id`, `measurements`, `session_id`
    - Actions: `setCustomer`, `setMeasurements`, `setSessionId`

- [ ] Task 4: Unit tests (AC: #1-6)
  - [ ] 4.1 Create `frontend/__tests__/components/MeasurementForm.test.tsx`
    - Test customer search triggers on 2+ chars
    - Test auto-fill populates all 10 fields
    - Test manual edit shows indicator
    - Test validation blocks invalid ranges
    - Test error messages in Vietnamese

- [ ] Task 5: Integration tests (AC: #7, #8)
  - [ ] 5.1 Create `frontend/__tests__/integration/pattern-session-create.test.tsx`
    - Test full flow: search → select → auto-fill → submit → navigate
    - Test API error handling preserves form state
    - Test loading states display correctly

## Dev Notes

### Architecture Compliance

**CRITICAL: Story 11.4 is FRONTEND ONLY — Pattern Engine backend already exists from 11.1-11.3**

- NO backend code changes required
- Pattern session APIs (`POST /api/v1/patterns/sessions`) already implemented in Story 11.2
- Customer measurement APIs (`GET /api/v1/customers/{id}/measurements`) already exist (Epic 6)

### Existing Code to Reuse — DO NOT RECREATE

| Artifact | Path | Reuse Strategy |
|----------|------|----------------|
| Customer search | `components/client/CustomerListTable.tsx` | Copy search pattern (lines 35-78) |
| Customer types | `types/customer.ts` | Import `Customer`, `Measurement` types |
| Measurement field list | `components/client/profile/MeasurementDisplay.tsx` | Reference MEASUREMENT_FIELDS array (lines 10-25) |
| Zustand store pattern | `store/designStore.ts` | Extend with pattern session state |
| Server action pattern | `app/actions/geometry-actions.ts` | Follow fetch + auth pattern |
| TanStack Query pattern | `hooks/useCart.ts` | Follow mutation + error handling pattern |

### Measurement Field Mapping

Backend `pattern_sessions` table uses specific Vietnamese field names. Map from existing customer measurement:

| Customer Measurement | Pattern Session Field | Vietnamese Label |
|---------------------|----------------------|------------------|
| `top_length` | `do_dai_ao` | Độ dài áo |
| (new) | `ha_eo` | Hạ eo |
| `neck` | `vong_co` | Vòng cổ |
| (calculated) | `vong_nach` | Vòng nách |
| `bust` | `vong_nguc` | Vòng ngực |
| `waist` | `vong_eo` | Vòng eo |
| `hip` | `vong_mong` | Vòng mông |
| `sleeve_length` | `do_dai_tay` | Độ dài tay |
| (new) | `vong_bap_tay` | Vòng bắp tay |
| `wrist` | `vong_co_tay` | Vòng cổ tay |

**Note:** Some pattern fields (ha_eo, vong_nach, vong_bap_tay) don't exist in customer measurement. These require manual input or future measurement profile expansion.

### UI Component Structure

```tsx
// MeasurementForm.tsx structure
<div className="space-y-6">
  {/* Customer Selection */}
  <CustomerCombobox 
    onSelect={handleCustomerSelect}
    placeholder="Tìm khách hàng..."
  />
  
  {/* Auto-fill indicator */}
  {selectedCustomer && (
    <div className="text-sm text-gray-500">
      Số đo từ: {selectedCustomer.name} (cập nhật: {formatDate(lastUpdated)})
      {isManuallyEdited && <span className="text-amber-500"> • Đã chỉnh sửa thủ công</span>}
    </div>
  )}
  
  {/* Warning for no measurements */}
  {selectedCustomer && !hasMeasurements && (
    <Alert variant="warning">
      Khách hàng chưa có số đo. Vui lòng nhập thủ công hoặc tạo hồ sơ số đo.
    </Alert>
  )}
  
  {/* 10 Measurement Fields - 2 columns on desktop */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {PATTERN_MEASUREMENT_FIELDS.map(field => (
      <MeasurementInput
        key={field.key}
        label={field.label}
        name={field.key}
        value={measurements[field.key]}
        onChange={(value) => handleMeasurementChange(field.key, value)}
        suffix="cm"
        error={errors[field.key]}
      />
    ))}
  </div>
  
  {/* Submit Button */}
  <Button 
    onClick={handleSubmit}
    disabled={isSubmitting || !isValid}
    className="w-full bg-primary text-white"
  >
    {isSubmitting ? "Đang tạo phiên thiết kế..." : "Tạo rập"}
  </Button>
</div>
```

### Zod Validation Schema

```typescript
// frontend/src/types/pattern.ts

import { z } from "zod";

export const MEASUREMENT_RANGES = {
  do_dai_ao: { min: 30, max: 200 },
  ha_eo: { min: 5, max: 50 },
  vong_co: { min: 20, max: 60 },
  vong_nach: { min: 30, max: 80 },
  vong_nguc: { min: 60, max: 150 },
  vong_eo: { min: 50, max: 140 },
  vong_mong: { min: 60, max: 160 },
  do_dai_tay: { min: 30, max: 100 },
  vong_bap_tay: { min: 15, max: 60 },
  vong_co_tay: { min: 10, max: 40 },
} as const;

const createMeasurementField = (key: keyof typeof MEASUREMENT_RANGES, label: string) =>
  z.number()
    .min(MEASUREMENT_RANGES[key].min, `${label} phải từ ${MEASUREMENT_RANGES[key].min} đến ${MEASUREMENT_RANGES[key].max} cm`)
    .max(MEASUREMENT_RANGES[key].max, `${label} phải từ ${MEASUREMENT_RANGES[key].min} đến ${MEASUREMENT_RANGES[key].max} cm`);

export const PatternMeasurementSchema = z.object({
  do_dai_ao: createMeasurementField("do_dai_ao", "Độ dài áo"),
  ha_eo: createMeasurementField("ha_eo", "Hạ eo"),
  vong_co: createMeasurementField("vong_co", "Vòng cổ"),
  vong_nach: createMeasurementField("vong_nach", "Vòng nách"),
  vong_nguc: createMeasurementField("vong_nguc", "Vòng ngực"),
  vong_eo: createMeasurementField("vong_eo", "Vòng eo"),
  vong_mong: createMeasurementField("vong_mong", "Vòng mông"),
  do_dai_tay: createMeasurementField("do_dai_tay", "Độ dài tay"),
  vong_bap_tay: createMeasurementField("vong_bap_tay", "Vòng bắp tay"),
  vong_co_tay: createMeasurementField("vong_co_tay", "Vòng cổ tay"),
});

export type PatternMeasurementInput = z.infer<typeof PatternMeasurementSchema>;

export const PatternSessionCreateSchema = z.object({
  customer_id: z.string().uuid().nullable(),
  garment_type: z.string().default("ao_dai"),
  notes: z.string().optional(),
  ...PatternMeasurementSchema.shape,
});

export type PatternSessionCreate = z.infer<typeof PatternSessionCreateSchema>;
```

### Server Action Pattern

```typescript
// frontend/src/app/actions/pattern-actions.ts
"use server";

import { auth } from "@/lib/auth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

async function getAuthToken(): Promise<string> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("Không có quyền truy cập");
  }
  return session.accessToken;
}

export async function createPatternSession(data: PatternSessionCreate): Promise<PatternSessionResponse> {
  const token = await getAuthToken();
  
  const response = await fetch(`${BACKEND_URL}/api/v1/patterns/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Không thể tạo phiên thiết kế");
  }
  
  const result = await response.json();
  return result.data;
}

export async function fetchCustomerMeasurement(customerId: string): Promise<Measurement | null> {
  const token = await getAuthToken();
  
  const response = await fetch(`${BACKEND_URL}/api/v1/customers/${customerId}/measurements?default=true`, {
    headers: { "Authorization": `Bearer ${token}` },
    cache: "no-store",
  });
  
  if (!response.ok) {
    return null;
  }
  
  const result = await response.json();
  return result.data;
}
```

### File Structure Changes

```
frontend/src/
├── app/(workplace)/design-session/
│   ├── page.tsx                    # UPDATE — integrate MeasurementForm
│   └── DesignSessionClient.tsx     # UPDATE — wire up pattern creation
├── app/actions/
│   └── pattern-actions.ts          # NEW — server actions
├── components/client/design/
│   └── MeasurementForm.tsx         # NEW — main component
├── hooks/
│   └── usePatternSession.ts        # NEW — TanStack Query hooks
├── store/
│   └── designStore.ts              # UPDATE — add pattern state
├── types/
│   └── pattern.ts                  # NEW — pattern types + schemas
└── __tests__/
    ├── components/
    │   └── MeasurementForm.test.tsx  # NEW
    └── integration/
        └── pattern-session-create.test.tsx  # NEW
```

### Design System Compliance

- Use **Inter** font for form labels and body text
- Use **JetBrains Mono** for measurement numbers
- Input field styling: `rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20`
- Button: `bg-primary text-white hover:bg-primary/90` (Heritage Gold `#D4AF37` for important CTAs, Indigo `#1A2B4C` for primary)
- Error text: `text-red-600 text-sm mt-1`
- Warning alert: `bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3`
- Spacing: Use `gap-4` for form grid, `space-y-6` for sections (Command Mode density)

### What NOT to Build (out of scope)

- **PatternPreview component** → Story 11.5
- **PatternExportBar component** → Story 11.6
- **Split-pane layout** → Story 11.5
- **Session detail page** → Story 11.5
- **Pattern generation trigger** → Story 11.5 (this story creates session, 11.5 triggers generate)
- **Backend changes** → Already done in 11.1-11.3

### Previous Story Intelligence (11.3)

From Story 11.3 Dev Notes:
- Pattern session has `status` field: `draft` → `completed` → `exported`
- Creating a session returns `id` (UUID) used for navigation
- Session requires `tenant_id` isolation (handled by backend)
- API response format: `{ data: PatternSessionResponse }`

### Navigation Flow

```
/design-session (this story)
  ↓ [Owner fills form + clicks "Tạo rập"]
  ↓ POST /api/v1/patterns/sessions
  ↓ Returns { data: { id: "uuid-xxx", status: "draft", ... } }
  ↓ router.push(`/design-session/${session.id}`)
/design-session/[sessionId] (Story 11.5)
  ↓ [Shows SVG preview + "Tạo mẫu" button to trigger generate]
```

### Testing Standards

- Use **Jest + React Testing Library** (existing setup)
- Mock server actions with `jest.mock("@/app/actions/pattern-actions")`
- Test user interactions with `userEvent` from `@testing-library/user-event`
- Test form validation by submitting with invalid values
- Test loading states by controlling promise resolution

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 11, FR91, FR96, FR99]
- [Source: _bmad-output/planning-artifacts/architecture.md — Pattern Engine section, Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — MeasurementForm component, Pattern Generation Flow]
- [Source: _bmad-output/implementation-artifacts/11-3-svg-gcode-export-api.md — Previous story patterns]
- [Source: frontend/src/components/client/CustomerListTable.tsx — Customer search pattern]
- [Source: frontend/src/types/customer.ts — Existing measurement types]
- [Source: frontend/src/app/actions/geometry-actions.ts — Server action patterns]
- [Source: _bmad-output/project-context.md — Implementation rules]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
