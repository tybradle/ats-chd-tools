# Testing Patterns

**Analysis Date:** 2026-01-20

## Test Framework

**Runner:**
- Not detected (no `vitest`, `jest`, `@testing-library/*`, `playwright`, or `cypress` dependencies in `package.json`).
- Config: Not detected (no `vitest.config.*`, `jest.config.*`, `playwright.config.*`, or `cypress.config.*`).

**Assertion Library:**
- Not applicable (no test runner configured).

**Run Commands:**
```bash
# Not configured (no npm script like "test")
```

## Test File Organization

**Location:**
- Not applicable (no `*.test.*` / `*.spec.*` files detected).

**Naming:**
- Not applicable.

**Structure:**
```
Not applicable
```

## Test Structure

**Suite Organization:**
```typescript
// Not applicable (no tests detected)
```

**Patterns:**
- Setup pattern: Not applicable
- Teardown pattern: Not applicable
- Assertion pattern: Not applicable

## Mocking

**Framework:**
- Not applicable (no test framework configured).

**Patterns (application-level doubles used outside tests):**
- The codebase includes a runtime “real vs mock” DB implementation switch:
  - Switch module: `src/lib/db/client.ts`
  - Real implementation: `src/lib/db/real-client.ts`
  - Mock implementation: `src/lib/db/mock-client.ts`

```typescript
// src/lib/db/client.ts
export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
export const query = isTauri ? RealClient.query : MockClient.query;
```

**What to Mock:**
- Not applicable (no tests).

**What NOT to Mock:**
- Not applicable (no tests).

## Fixtures and Factories

**Test Data:**
- Not applicable (no tests).

**Location:**
- Not applicable.

## Coverage

**Requirements:**
- None enforced (no coverage tooling detected).

**View Coverage:**
```bash
# Not configured
```

## Test Types

**Unit Tests:**
- Not used (no unit test runner/config detected).

**Integration Tests:**
- Not used.

**E2E Tests:**
- Not used.

## Common Patterns

**Async Testing:**
```typescript
// Not applicable
```

**Error Testing:**
```typescript
// Not applicable
```

---

*Testing analysis: 2026-01-20*
