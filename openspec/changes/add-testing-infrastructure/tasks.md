## 1. Configuration

- [x] 1.1. Configure `vite.config.ts` to include a `test` property for `vitest` environment settings.
- [x] 1.2. Update `tsconfig.json` to include `vitest/globals` in the `types` array to provide global type definitions for the test environment.
- [x] 1.3. Add a `test` script to `package.json` that executes `vitest`.

## 2. Initial Test Implementation

- [x] 2.1. Identify a simple, pure function within the codebase for the initial test (e.g., `src/lib/utils/className.ts`).
- [x] 2.2. Create the first test file at the corresponding location (e.g., `src/lib/utils/className.test.ts`).
- [x] 2.3. Write a basic unit test using `describe`, `it`, and `expect` to verify the function's behavior.
- [x] 2.4. Run the new test script and confirm that the test passes.

## 3. Documentation and CI (Optional Follow-up)

- [ ] 3.1. Consider updating the `.github/workflows/release.yml` to include a step that runs the test suite on pull requests.
- [ ] 3.2. Briefly document the testing convention in `openspec/project.md`.