# Project Workflow

## Guiding Principles

1. **The Plan is the Source of Truth:** All work must be tracked in plan.md
2. **The Tech Stack is Deliberate:** Changes to the tech stack require a decision record.
3. **Tests are Mandatory:** TDD is the default. No code without tests.
4. **Communication is Key:** Use the product guidelines to tailor messages.

## Development Loop

1. **Select a Track:** Choose a track from 	racks.md.
2. **Review the Plan:** Read the track's plan.md.
3. **Pick a Task:** Select the next unchecked task.
4. **Understand the Requirement:** Read the spec.md relevant to the task.
5. **Write a Failing Test:** Create a test that fails for the expected reason.
6. **Implement the Code:** Write the minimum code to pass the test.
7. **Refactor:** Clean up the code while keeping tests green.
8. **Commit Code Changes:**
   - Stage all code changes related to the phase.
   - Propose a clear, concise commit message (e.g., eat(phase-x): Implement user authentication flow).
   - Perform the commit.
9. **Attach Task Summary with Git Notes:**
   - Create a concise summary of the completed task.
   - Attach it to the latest commit using git notes add -m 'Task Summary: [Your summary here]'.
10. **Mark as Complete:** Check the box in plan.md.
11. **Repeat:** Go to step 3.

## Phase Completion Protocol

When a phase in plan.md is complete:
1. **Run All Tests:** Ensure the entire suite passes.
2. **Manual Verification:** Verify the feature works as expected from a user perspective.
3. **Update Status:** Mark the phase as complete in plan.md.
