## Why

With the unit testing foundation in place, the next critical step is to ensure that the core services of the application work correctly together. The background script contains most of the complex business logic, and verifying the interactions between its services is essential for application stability. This proposal initiates Phase 2 of our testing strategy by introducing service integration tests.

## What Changes

- **Establish a Pattern**: This proposal will establish a clear pattern for writing integration tests for services managed by the `ServiceContainer`.
- **Implement First Integration Test**: We will write the first integration test for a key background service, the `DictionaryService`.
- **Introduce Mocking**: The test will involve mocking the service's external dependencies (specifically, its `Fetcher` dependency) to isolate the service's logic and ensure tests are fast and reliable.

## Impact

- **Affected Specs**: Modifies the `dev-testing` capability by adding a new requirement for service-level integration testing.
- **Affected Code**: A new integration test file will be added (e.g., `src/lib/core/dict/dict.integration.test.ts`). No production code will be changed.
- **Risk**: Low. This is an additive change that builds upon the existing test infrastructure.

---

## Integration Testing Roadmap

This proposal focuses on executing Phase 1 of a broader integration testing strategy. The goal is to incrementally add coverage for all core background services.

### Phase 1: Dictionary Service (This Proposal)
- **Goal**: Test the `DictionaryService` by mocking its `Fetcher` dependency.
- **Purpose**: Establishes the fundamental pattern for testing services with external, asynchronous dependencies.

### Phase 2: Segmentation and Marking Services (Future Proposal)
- **Goal**: Write integration tests for the `SegmenterService` and `WordMarkerService`.
- **Purpose**: To verify the core text-processing pipeline and the interaction between these two tightly-coupled services.

### Phase 3: AI and Synchronization Services (Future Proposal)
- **Goal**: Write integration tests for the `AiProxy` and `JpdbSynchronizer`.
- **Purpose**: To ensure the logic for interacting with third-party APIs (like OpenAI/Gemini and JPDB) is correct, by mocking the underlying clients.