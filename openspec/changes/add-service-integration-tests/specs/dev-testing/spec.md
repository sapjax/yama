## ADDED Requirements

### Requirement: Service Integration Testing

Core background services SHALL be covered by integration tests that verify their logic and interaction with their immediate dependencies.

#### Scenario: Testing the Dictionary Service logic
- **GIVEN** the `DictionaryService` is initialized with a `Fetcher` dependency
- **WHEN** an integration test calls the `lookup` method on the service
- **AND** the `Fetcher` dependency is mocked to return a predefined API response
- **THEN** the `DictionaryService` MUST return a correctly parsed and structured result that matches the expected output for the given mock data.
