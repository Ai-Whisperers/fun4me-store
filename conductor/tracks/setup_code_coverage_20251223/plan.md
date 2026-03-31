# Implementation Plan: Setup and Analyze Unified Code Coverage

### Phase 1: Individual Coverage Reports
- [ ] **Task:** Configure Vitest Coverage
  - [ ] Sub-task: Update the `vitest.config.ts` to enable coverage reporting (using `v8` or `istanbul`).
  - [ ] Sub-task: Create a new `npm` script (e.g., `npm run coverage:unit`) that runs Vitest with the coverage flag.
  - [ ] Sub-task: Verify that an `lcov` report and HTML report are generated correctly in a temporary directory.
- [ ] **Task:** Configure Playwright Coverage
  - [ ] Sub-task: Update the `playwright.config.ts` and associated test scripts to enable code coverage collection. This may involve instrumenting the code when the development server is started for tests.
  - [ ] Sub-task: Create a new `npm` script (e.g., `npm run coverage:e2e`) that runs Playwright with the coverage flag.
  - [ ] Sub-task: Verify that a corresponding `lcov` report is generated.
- [ ] **Task:** Conductor - User Manual Verification 'Phase 1: Individual Coverage Reports' (Protocol in workflow.md)

### Phase 2: Unified Reporting and Analysis
- [ ] **Task:** Implement Report Merging
  - [ ] Sub-task: Install tooling required for merging coverage reports (e.g., `c8`).
  - [ ] Sub-task: Create a new top-level `npm` script (e.g., `npm run coverage`) that sequentially runs `coverage:unit`, `coverage:e2e`, and then invokes the merging tool on the generated reports.
  - [ ] Sub-task: Verify that a single, unified HTML report is generated in the final `coverage/` directory, reflecting the combined data from both test suites.
- [ ] **Task:** Analyze Report and Document Gaps
  - [ ] Sub-task: Review the unified report to identify critical application files with low (<50%) test coverage.
  - [ ] Sub-task: Create a new document (`testing/COVERAGE_GAPS.md`) listing the top 3-5 files/modules that need improved test coverage, with recommendations on whether unit or E2E tests are more appropriate for each.
- [ ] **Task:** Conductor - User Manual Verification 'Phase 2: Unified Reporting and Analysis' (Protocol in workflow.md)
