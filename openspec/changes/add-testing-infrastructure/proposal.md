## Why

The project currently lacks an automated testing suite. This makes it difficult to verify functionality, prevent regressions when adding new features or refactoring, and ensure the overall stability of the extension. Introducing a testing framework is a foundational step towards improving code quality and maintainability.

## What Changes

- **Introduce `vitest`**: Establish `vitest` as the official testing framework for unit and integration tests.
- **Configure Project**: Update `vite.config.ts` and `tsconfig.json` to correctly handle the test environment, including type definitions.
- **Establish Conventions**: Create a clear convention for test file location and naming (e.g., `*.test.ts` co-located with the source file being tested).
- **Implement Initial Test**: Write the first unit test for a core, stable utility function to prove the setup works.
- **Add Test Script**: Add a `test` script to `package.json` for easy execution.

## Impact

- **Affected Specs**: A new capability, `dev-testing`, will be created to formally document the project's testing requirements.
- **Affected Code**: 
  - `vite.config.ts` (or a new `vitest.config.ts`)
  - `tsconfig.json`
  - `package.json`
  - New `*.test.ts` files will be added.
- **Risk**: Low. This is an additive change that will not affect existing functionality.

---

## Overall Testing Strategy

This proposal focuses on implementing Phase 1, which establishes the foundation for a comprehensive, multi-layered testing strategy. This strategy follows the "Testing Pyramid" principle, ensuring we build a robust and maintainable quality assurance process.

### Phase 1: Foundational Unit Testing (This Proposal)
- **Goal**: To set up the `vitest` testing environment and write the first tests for isolated, pure functions (e.g., utility functions in `src/lib/utils/`).
- **Scope**: Focuses on individual modules in isolation.
- **Outcome**: A working test runner, established conventions, and a solid foundation for all future testing.

### Phase 2: Service Integration Testing (Future Proposal)
- **Goal**: To test the interaction and data flow between different non-UI services and modules, particularly in the background script.
- **Scope**: Verifying the contracts between services (e.g., ensuring the `DictionaryService` correctly processes output from the `SegmenterService`). This phase explicitly excludes UI interaction.
- **Outcome**: Confidence that the core business logic and data processing pipelines work correctly as a whole.

### Phase 3: UI Component Testing (Future Proposal)
- **Goal**: To test React components to ensure they render correctly and respond to user interactions as expected.
- **Scope**: Using `vitest` with `@testing-library/react` to test components in a simulated DOM environment. This includes verifying event handlers, state changes based on props, and correct rendering.
- **Outcome**: A reliable and fast-running UI test suite that guarantees the stability of individual UI pieces.

### Phase 4: End-to-End (E2E) Testing (Future Proposal)
- **Goal**: To test the entire application from the user's perspective in a real browser environment.
- **Scope**: Using a framework like Playwright to automate critical user journeys (e.g., loading a page, hovering a word, seeing the dictionary popup).
- **Outcome**: The highest level of confidence that the application works for the end-user, validating the integration of all parts of the system.