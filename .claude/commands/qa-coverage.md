# Test Coverage Analysis

Analyze the test coverage of this project. Run the coverage report and identify:

1. Which modules have <50% coverage
2. Critical API routes without tests
3. Database operations without test coverage
4. Components lacking unit tests

Generate a prioritized list of files that need tests, ranked by:
- Business criticality (payments, auth, medical records)
- Code complexity
- Recent bug history (from git blame)

## Steps

1. Run `cd web && npm run test:unit -- --coverage`
2. Parse the coverage report
3. Identify gaps in critical paths
4. Output a markdown report with specific file paths and recommended test types

## Output

Create a report at `docs/testing/COVERAGE-REPORT.md` with:
- Coverage percentages by directory
- Files needing tests (prioritized)
- Recommended test types for each file
