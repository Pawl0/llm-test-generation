# LLM Powered Jest Test Generation

This project demonstrates an automated pipeline for generating complete, production ready Jest test suites using an LLM (OpenAI GPT-4o). It extracts API route definitions, Zod validation schemas, and TypeScript service interfaces to generate tests that compile and provide near 100% coverage on your controller layer.

## How It Works

The system uses a four step automated process:

1.  **Extraction:** Scans your Express routers using regular expressions to find route paths, HTTP methods, and referenced Zod schemas. It also reads the imported service files to capture the exact TypeScript interfaces/shapes needed for mocking.
2.  **Prompt Building:** Assemble all the extracted context into a strict set of instructions for the AI. This ensures the AI uses named imports, correctly mocks the service layer, and handles TypeScript union types correctly using `as const`.
3.  **Generation:** Queries the OpenAI API to write the full test suite code.
4.  **Execution:** Automatically writes the tests into the `__tests__` directory, ready to be run with Jest.

## Getting Started

### Prerequisites

*   Node.js (v18 or higher)
*   OpenAI API Key

### Installation

1.  Clone the repository and install dependencies:
    ```bash
    npm install
    ```

2.  Configure your environment variables. Create a `.env` file in the root directory:
    ```bash
    OPENAI_API_KEY=your_api_key_here
    ```

## Usage

### Generate Tests

To automatically generate tests for all your API routers, run:

```bash
npm run test:generate
```

This will call the AI for each router defined in `scripts/generate-all.ts` and output the test files to the `__tests__` folder.

### Run Tests and Coverage

To verify the generated tests and check the coverage results:

```bash
npm run test:coverage
```

## Expected Results

Based on our current API structure containing users, products, orders, and authentication routes:

*   **Test Success:** 100% of the 44+ generated tests pass out of the box.
*   **Controller Coverage:** ~100% statement coverage on all Express routes.
*   **Overall Coverage:** ~88% overall project coverage (including service layer stubs).

This pipeline allows you to jump from 0% test coverage to a fully tested API in seconds, ensuring your development cycle remains fast without sacrificing code quality.
