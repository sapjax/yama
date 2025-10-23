## ADDED Requirements

### Requirement: Unit Testing Framework

The project SHALL use `vitest` as the framework for running unit and integration tests.

#### Scenario: Running the test suite
- **GIVEN** the project has `*.test.ts` files containing `vitest` tests
- **WHEN** the `test` script is executed (e.g., `bun test`)
- **THEN** `vitest` SHALL run all test files and report the results to the console.

### Requirement: Test File Convention

Test files SHALL be co-located with the source files they are testing and named with a `.test.ts` or `.test.tsx` suffix.

#### Scenario: Creating a new test for a utility function
- **GIVEN** a utility function exists at `src/lib/utils/className.ts`
- **WHEN** a developer creates a test for this function
- **THEN** the test file MUST be created at `src/lib/utils/className.test.ts`.
