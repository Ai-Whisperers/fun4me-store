# Database Optimization Process

This document outlines the standard procedure for identifying, analyzing, and optimizing database queries within the Vete project. The goal is to maintain high performance and scalability by addressing slow or resource-intensive queries proactively.

## 1. Identification

The first step is to identify queries that are negatively impacting system performance. We utilize the Supabase Dashboard for this purpose.

1.  **Navigate to Supabase Dashboard:** Go to your project's dashboard on Supabase.
2.  **Open Reports:** Click on the "Reports" icon in the sidebar.
3.  **Select Query Performance:** Choose the "Query Performance" section.
4.  **Analyze Metrics:** Look for queries listed under:
    *   **Most time consuming:** Queries that take the longest total time to execute (cumulative).
    *   **Most frequent:** Queries that are executed most often. A fast query executed millions of times can still be a bottleneck.
    *   **Slowest execution time:** Queries with high average latency.
5.  **Select Candidate:** Pick a query that stands out as a bottleneck. Note its `calls`, `average execution time`, and `total execution time`.

## 2. Analysis

Once a target query is identified, we need to understand *why* it is performing poorly.

1.  **Copy the Query:** Extract the SQL query text from the dashboard.
2.  **Open SQL Editor:** Navigate to the SQL Editor in the Supabase dashboard or your local client.
3.  **Run EXPLAIN ANALYZE:** Prepend the query with `EXPLAIN (ANALYZE, BUFFERS)`.
    ```sql
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT * FROM ... -- your query here
    ```
    *Note: If the query uses parameters ($1, $2), replace them with representative actual values to get a realistic plan.*
4.  **Interpret the Plan:** Look for red flags in the output:
    *   **Seq Scan (Sequential Scan):** The database is reading the entire table. This is often bad for large tables and suggests a missing index.
    *   **High Cost:** Look at the `cost=...` numbers.
    *   **High Rows:** Unexpectedly high number of rows being processed vs. returned.

## 3. Optimization

Based on the analysis, determine the best optimization strategy.

### Common Solutions

*   **Add an Index:** If you see a `Seq Scan` filtering on a column, adding a B-tree index to that column usually fixes it.
    *   *Example:* `CREATE INDEX idx_users_email ON auth.users (email);`
*   **Composite Index:** If filtering by multiple columns, a multi-column index might be needed.
*   **Query Rewriting:** Sometimes the query logic itself is inefficient (e.g., N+1 queries, unnecessary joins).

### Implementation

1.  **Create Migration:** Generate a new migration file in `supabase/migrations`.
    ```bash
    supabase migration new optimize_query_name
    ```
2.  **Write SQL:** Add the optimization SQL (e.g., `CREATE INDEX ...`) to the file.
    *   *Tip:* Use `CREATE INDEX CONCURRENTLY` in production to avoid locking the table (requires specific migration handling).
3.  **Test Locally:** Apply the migration locally (`supabase db reset` or `supabase migration up`) and verify the query plan improves using `EXPLAIN ANALYZE` again.

## 4. Verification

After the optimization is deployed:

1.  **Deploy:** Push the migration to staging/production.
2.  **Monitor:** Wait for a representative period (e.g., 24 hours) of traffic.
3.  **Re-check Dashboard:** Go back to Supabase Reports -> Query Performance.
4.  **Confirm:** Verify that the query has moved down the list or its execution time has dropped significantly.
