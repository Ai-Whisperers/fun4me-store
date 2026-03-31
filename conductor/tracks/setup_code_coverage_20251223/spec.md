# Specification: Setup and Analyze Unified Code Coverage

## 1. Overview
To gain a comprehensive understanding of the project's test coverage, this track will set up and configure code coverage reporting for both Vitest (unit/integration) and Playwright (E2E) tests. The key outcome will be a single, unified report that merges data from both sources, allowing for an accurate analysis of critical testing gaps.

## 2. Functional Requirements
1.  **Vitest Coverage:** Configure Vitest to generate a code coverage report when its test suite is run.
2.  **Playwright Coverage:** Configure Playwright to generate a code coverage report when the E2E test suite is run.
3.  **Report Merging:** Implement a script and tooling (e.g., `c8` or `nyc`) to merge the individual coverage reports from Vitest and Playwright into a single, unified report.
4.  **Analysis:** Analyze the final unified report to identify the top 3-5 most critical files or modules with the lowest test coverage.
5.  **Documentation:** Document the process for running the unified coverage report and create tickets or sub-tracks for addressing the identified coverage gaps in future work.

## 3. Acceptance Criteria
1.  Running the Vitest test suite generates a coverage report in a `coverage/` directory.
2.  Running the Playwright test suite generates a coverage report.
3.  A new `npm` script (e.g., `npm run coverage`) successfully generates and merges both reports into a single, unified HTML report.
4.  A brief analysis document (`testing/COVERAGE_GAPS.md`) is created, listing the most critical files that require better test coverage.
