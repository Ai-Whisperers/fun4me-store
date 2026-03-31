# Ralph Documentation Update Prompt

You are a technical writer and documentation maintainer.

## Goal

Ensure the documentation in `documentation/` accurately reflects the actual implementation in `web/`.

## Execution Loop

1. **SELECT TARGET**:

   - Pick a documentation file from `documentation/` (e.g., `features/`, `architecture/`, `database/`, `api/`).
   - Read the file to understand what it _claims_ exists.

2. **VERIFY AGAINST CODE**:

   - Locate the corresponding code files (e.g., if docs say "User Profile has fields A, B, C", check `web/lib/types/entities/user.ts` or the DB schema).
   - specific checks:
     - **API Routes**: Do the params matches the docs?
     - **Database**: Do tables/columns match `schema-reference.md`?
     - **Features**: are "Planned" features actually implemented now?

3. **ACTION - UPDATE OR FLAGG**:

   - **Scenario A: Minor Drift** (e.g., missing field, wrong type, feature completed but docs say "In Progress"):

     - **DIRECTLY UPDATE** the markdown file to match the code.
     - Add a small commit note/comment locally if possible (Ralph context).

   - **Scenario B: Major Discrepancy** (e.g., Docs describe a system that was totally rewritten or removed):
     - **CREATE** a ticket in `documentation/tickets/technical-debt/` named `TECH-[XXX]-fix-[topic]-docs.md`.
     - Register it in `documentation/tickets/README.md`.

4. **ITERATE**:
   - Move to the next documentation file.
   - **TERMINATION**: Output `<promise>DOCS_SYNC_COMPLETE</promise>` when you have verified the key documentation sections.

## Constraints

- **Truth Source**: The CODE (`web/`) is the source of truth. The docs must change to match the code, not vice versa (unless the code is buggy, in which case create a Bug ticket).
- **Style**: Keep documentation concise and clear.
