## 1. Scaffolding for Integration Tests

- [ ] 1.1. Create a new test file at `src/lib/core/dict/dict.integration.test.ts`.
- [ ] 1.2. Set up the test file to import the `ServiceContainer` and `vitest`'s mocking utilities (e.g., `vi`).

## 2. `DictionaryService` Integration Test

- [ ] 2.1. Write a `describe` block for the `DictionaryService` integration test.
- [ ] 2.2. Inside a test, get an instance of the `DictionaryService` from the `ServiceContainer`.
- [ ] 2.3. Mock the `fetcher` dependency of the `DictionaryService`. The mock should be configured to return a sample, predefined dictionary API response when called.
- [ ] 2.4. Call the `lookup` method on the `DictionaryService` instance with a sample word.
- [ ] 2.5. Assert that the `lookup` method returns a correctly parsed and structured result, based on the mock data provided in the previous step.

## 3. Verification

- [ ] 3.1. Run the entire test suite (`bun test`) and ensure the new integration test passes along with all existing unit tests.
