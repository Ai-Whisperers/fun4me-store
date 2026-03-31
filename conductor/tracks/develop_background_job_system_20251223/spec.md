# Specification: Integrate a Managed Job Queue & Implement First Job

## 1. Overview
To ensure reliable execution of asynchronous tasks like sending emails or processing webhooks, this track will integrate a managed background job queueing service (e.g., Inngest or Upstash QStash) into the application. This track covers the evaluation and setup of the service, and the migration of one critical task (sending a "welcome" email on user signup) to the new, robust system.

## 2. Functional Requirements
1.  **Provider Evaluation:** Briefly evaluate Inngest and Upstash QStash to determine the best fit based on features, developer experience with Next.js, and pricing.
2.  **Setup and Integration:**
    *   Sign up for the chosen service.
    *   Install the provider's SDK into the Next.js project.
    *   Configure necessary environment variables and API keys.
3.  **Job Implementation:**
    *   Create a new API endpoint (or modify an existing one) to act as the job handler, as required by the chosen service's documentation.
    *   Migrate the logic for sending a "welcome" email (currently likely handled directly in the signup API route) to this new job handler function.
4.  **Job Invocation:** Modify the user signup process to send a "send-welcome-email" job to the queueing service instead of sending the email directly.
5.  **Testing:** Write an integration test to verify that the signup process successfully enqueues the job.

## 3. Acceptance Criteria
1.  A decision between Inngest and QStash is made and documented.
2.  The chosen service is installed, configured, and successfully connected to the application.
3.  When a new user signs up, a "send-welcome-email" job is successfully created in the provider's dashboard.
4.  The job is processed, and the welcome email is successfully sent.
5.  A new integration test confirms that the job is enqueued upon user signup.
