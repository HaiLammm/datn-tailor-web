# Code Review Lessons Learned

_Accumulated findings from adversarial code reviews. Dev agents MUST check these patterns._

---

## Recurring Issue Patterns

### 1. Server Actions Missing Authentication
**Severity:** HIGH | **Detected in:** Story 3.4

Server actions that call authenticated backend endpoints MUST forward the auth token. Follow the established pattern:
```typescript
import { auth } from "@/auth";

async function getAuthToken(): Promise<string | null> {
  const session = await auth();
  return session?.accessToken ?? null;
}
// Then add: Authorization: `Bearer ${token}` to fetch headers
```

**Rule:** Every new server action calling backend API must include auth token forwarding. No exceptions.

### 2. Database Transaction Not Committed
**Severity:** HIGH | **Detected in:** Story 3.4

`db.flush()` sends SQL but does NOT commit the transaction. Always follow with `await db.commit()` when persisting data. Pattern:
```python
db.add(record)
await db.flush()   # sends SQL, assigns IDs
await db.commit()   # persists to database
```

**Rule:** Every `db.flush()` that intends to persist data MUST be followed by `db.commit()`.

### 3. Frontend-Backend Data Type Mismatch
**Severity:** HIGH | **Detected in:** Story 3.4

When frontend constructs objects to send to backend, ensure the data shape matches the Pydantic model exactly. Common mistake: mapping wrong source data (e.g., style intensity DeltaValue[] vs geometric MorphDeltaPart[]).

**Rule:** Before sending data to backend, verify the TypeScript interface matches the Python Pydantic model field-by-field. Store the correct typed data in Zustand rather than constructing it ad-hoc at call time.

### 4. Duplicate Utility Functions
**Severity:** HIGH | **Detected in:** Story 3.4

Logic implemented in utility modules (e.g., `core/hashing.py`) should NOT be re-implemented locally in API route files. Always import from the canonical source.

**Rule:** Before writing a utility function, search existing `core/`, `utils/`, `services/` modules for existing implementations.

### 5. Frontend Error Handling for Specific HTTP Status Codes
**Severity:** MEDIUM | **Detected in:** Story 3.4

When backend returns structured error responses (e.g., 422 with violation details), the frontend should parse and display them specifically rather than showing generic error strings.

**Rule:** Handle 422 responses from guardrail/validation endpoints by parsing the JSON body and extracting user-facing messages.

### 6. Test Names Must Reflect Actual Behavior
**Severity:** MEDIUM | **Detected in:** Story 3.4

Test names like `test_lock_design_geometry_hash_deterministic` that don't actually test determinism are misleading and waste reviewer time.

**Rule:** Test name must accurately describe what the test verifies. If inputs differ (e.g., random UUIDs), don't claim determinism.

### 7. UI Component Duplication
**Severity:** MEDIUM | **Detected in:** Story 3.4

Loading spinners and other common UI patterns must not be copy-pasted. Extract to shared components or local helpers.

**Rule:** If the same JSX block appears 2+ times in a file, extract it into a component (local or in `components/common/`).

### 8. Server Actions Called with Empty/Placeholder Data
**Severity:** HIGH | **Detected in:** Story 4.1b

Server actions that require real data (measurements, deltas) must NOT be called with empty `{}` or `[]` placeholders. This causes the backend to silently pass all checks, making the feature a complete NOOP.

**Rule:** When calling a server action that processes real data, verify the arguments are sourced from actual state (props, store, API response) — not hardcoded empty objects.

### 9. Frontend-Backend Field Name Mismatch (Language Keys)
**Severity:** HIGH | **Detected in:** Story 4.1b

Backend Pydantic models use Vietnamese field names (e.g., `vong_co`, `vong_nguc`, `rong_vai`) while page-level code may use English field names (e.g., `neck`, `bust`, `shoulder_width`). Sending English keys to a Vietnamese-keyed endpoint results in all-None values.

**Rule:** When passing data to backend endpoints, always verify field names match the Pydantic model. Create an explicit mapping layer if the source uses different naming.

### 10. Inline Type Duplication Instead of Importing Defined Types
**Severity:** HIGH | **Detected in:** Story 4.1b

Server actions with complex return types must import and use already-defined TypeScript interfaces (e.g., `GuardrailCheckResult`) instead of duplicating the type inline in the function signature.

**Rule:** Always check `@/types/` for existing interfaces before writing inline types. Import the canonical type.

---

## Architecture Reminders for Dev Agents

- **Auth pattern:** `auth()` → `session.accessToken` → `Authorization: Bearer ${token}` header
- **DB pattern:** `db.add()` → `db.flush()` → `db.commit()`
- **Store pattern:** Store typed backend data models (e.g., MorphDelta) in Zustand, don't reconstruct from unrelated data
- **DRY:** Always search `core/`, `utils/`, `services/` before writing new utility functions
- **Error handling:** Parse structured error responses (422, 400) for user-facing messages
- **Real data:** Never call server actions with empty/placeholder data — always source from props, store, or API responses
- **Field names:** Verify field names match backend Pydantic models — Vietnamese vs English naming is a common trap
- **Type imports:** Always import existing types from `@/types/` — never duplicate inline
- **Python packages:** Always install backend dependencies using `./venv/bin/pip install` — never use global pip or conda

### 11. Task Checkboxes Must Reflect Completion Status
**Severity:** HIGH | **Detected in:** Story 4.4

When marking a story as `done`, all task checkboxes `[ ]` must be updated to `[x]`. Leaving tasks unchecked while claiming completion is a contradiction that triggers review flags.

**Rule:** Before setting story status to `done`, verify all task checkboxes are checked `[x]`.

### 12. TypeScript Types Must Match Runtime Return Shapes
**Severity:** HIGH | **Detected in:** Story 4.4

When defining TypeScript interfaces for API/action responses, the field names and types must match the actual runtime return values. Defining `blob?: Blob` when the action returns `data?: string` creates dead code and misleading type contracts.

**Rule:** After implementing a server action, verify its return type matches the TypeScript interface it claims to implement. Update the interface to match reality, not vice versa.

### 13. AC Requirements Like "Redirect" Must Be Implemented
**Severity:** HIGH | **Detected in:** Story 4.4

When an AC says "redirect to X on failure", the implementation must actually perform navigation or scroll behavior — not just display an error message. Each AC verb (redirect, block, show, display) must be literally implemented.

**Rule:** Map each verb in AC text to a specific UI behavior. "Redirect" = navigation/scroll, "Block" = disable/prevent, "Show" = render visible, "Display" = present in UI.

### 14. Story Task Lists Define Minimum Test Coverage
**Severity:** MEDIUM | **Detected in:** Story 4.4

When a story specifies test cases (e.g., "Test design not found -> 404", "Test coordinate precision <= 1mm"), every listed test must exist. Missing tests from the story's task list is a coverage gap.

**Rule:** Cross-reference the story's test task list against actual test files. Every listed test scenario must have a corresponding test function.

### 15. Python Packages Must Be Installed to Project Virtual Environment
**Severity:** HIGH | **Detected in:** Backend development session

Installing Python packages globally (`pip install`, `conda install`) instead of to the project's virtual environment (`./venv/bin/pip install`) causes `ModuleNotFoundError` at runtime and creates environment inconsistencies across developers.

**Root cause:** Using system Python or conda pip instead of project venv pip.

**Symptoms:**
- Import works in one terminal but not in uvicorn subprocess
- Package shows "already satisfied" when installing but module not found at runtime
- Works on developer machine but fails in production/CI

**Rule:** ALWAYS install backend Python packages using `./venv/bin/pip install <package>`. Verify with `which pip` before installing. After installation, run `./venv/bin/pip freeze > requirements.txt` to update dependencies.

**Best practice:** Use Makefile targets (`make install PACKAGE=ezdxf`) to abstract the venv path and prevent human error.
