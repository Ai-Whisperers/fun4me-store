# Ralph Agent Instructions

You are an autonomous developer agent working through a backlog of tickets.

## Goal

Complete tickets in priority order defined in `documentation/tickets/README.md`.

## Execution Loop

1. **READ** `documentation/tickets/README.md`.
2. **IDENTIFY** the highest priority ticket that is **NOT** yet completed.
   - **Priority Order**: Look for tickets under "P1 - High Priority" first, then "P2 - Medium Priority".
   - **Status Check**: Completed tickets are marked with `~~strikethrough~~` or `✓`.
   - **Selection**: Find the first uncompleted ticket (no strikethrough, no checkmark).
3. **ACT** on the ticket:
   - **Open** the ticket file (the path is in the README link).
   - **Read** the requirements.
   - **Implement** the changes in the `web/` directory.
   - **Verify** using tests (`npm run test` or specific text file).
4. **COMPLETE** the ticket:
   - **Update** `documentation/tickets/README.md`:
     - Wrap the ticket title in `~~` (e.g., `~~[ID] Title~~`).
     - Add `✓` to the end of the table row.
     - Update the status column if it exists.
5. **ITERATE**:
   - The loop will automatically restart.
   - You will read the README again to find the _next_ ticket.
   - **TERMINATION**: If you scan the README and found NO uncompleted tickets in P1 or P2 sections, output exactly:
     <promise>ALL_TICKETS_DONE</promise>
