# Specification: Setup OpenAPI Generation for API Documentation

## 1. Overview
To provide clear, maintainable, and interactive documentation for the project's API, this track will implement a system to automatically generate an OpenAPI (Swagger) specification from code annotations. The generated specification will be used to render a live, browsable API documentation UI, ensuring the documentation stays in sync with the code.

## 2. Functional Requirements
1.  **Tool Selection & Setup:**
    *   Select and install a library capable of generating an OpenAPI specification from JSDoc comments in Next.js API routes (e.g., `swagger-jsdoc`).
    *   Select and install a library to render the interactive UI from the generated spec (e.g., `swagger-ui-react`).
2.  **Generation Process:**
    *   Create a script that uses the generation library to scan the API routes and output a static `openapi.json` file.
    *   Create a new page route (e.g., `/api-docs`) that is protected and only accessible in non-production environments.
3.  **UI Rendering:** On the `/api-docs` page, use the UI library to parse the generated `openapi.json` and render the interactive Swagger UI.
4.  **Initial Annotation:**
    *   Identify a few key API endpoints (e.g., login, get user, create appointment).
    *   Write JSDoc comments for these endpoints that conform to the OpenAPI standard, describing their purpose, parameters, request bodies, and possible responses.

## 3. Acceptance Criteria
1.  The necessary libraries for spec generation and UI rendering are installed and configured.
2.  An `npm` script to generate the `openapi.json` file from code comments is created and works correctly.
3.  Navigating to the `/api-docs` page successfully displays the interactive Swagger UI.
4.  At least two different API endpoints (e.g., one GET, one POST) are fully documented with annotations and appear correctly and interactively in the Swagger UI.
