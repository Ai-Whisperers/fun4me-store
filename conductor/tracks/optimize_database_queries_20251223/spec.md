# Specification: Establish DB Optimization Process & Fix Top Query

## 1. Overview
This track establishes a data-driven process for continuously improving database performance. It involves using Supabase's built-in Query Performance dashboard to identify and optimize slow queries. This foundational track will document the process and then apply it to fix the single worst-performing query currently identified in the project.

## 2. Functional Requirements
1.  **Process Definition:** Create a new document (`documentation/backend/database-optimization-process.md`) that outlines the repeatable process for identifying, analyzing, and optimizing slow database queries using the Supabase dashboard and `EXPLAIN ANALYZE`.
2.  **Query Identification:** Access the Supabase Query Performance dashboard for the project and identify the #1 slowest or most frequently invoked query.
3.  **Performance Analysis:** Use `EXPLAIN ANALYZE` on the identified query to understand its execution plan and pinpoint the cause of the poor performance (e.g., a sequential scan on a large table where an index is needed).
4.  **Optimization:** Implement a fix to optimize the query. This will most likely involve creating a new database index via a new Supabase migration file.
5.  **Verification:** After deploying the fix, monitor the Supabase Query Performance dashboard to verify that the query's execution time or frequency impact has significantly improved.

## 3. Acceptance Criteria
1.  The `database-optimization-process.md` document is created and approved.
2.  The #1 worst-performing query from the Supabase dashboard is identified and documented in the track.
3.  An optimization (e.g., a new `CREATE INDEX` migration) is implemented and merged.
4.  Post-deployment, a screenshot or note is added to the track confirming the performance improvement from the Supabase dashboard.
