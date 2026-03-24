import type { RouteInfo } from './extract-routes';

export function buildPrompt(
  routes: RouteInfo[],
  routerMountPath: string,
): string {
  const serviceName = routes[0]?.serviceName || 'UserService';
  const serviceInterfaces = routes[0]?.serviceInterfaces || '';
  let servicePath = routes[0]?.servicePath || '../services/UserService';
  
  // Adjust service path to be relative to the __tests__ folder
  // If the path in the route was '../services/X', it means 'src/services/X'
  // Relative to __tests__/, that's '../src/services/X'
  if (servicePath.startsWith('../')) {
    servicePath = servicePath.replace('../', '../src/');
  }

  const routeDescriptions = routes
    .map(r => `
### ${r.method} ${routerMountPath}${r.path}
Handler excerpt:
\`\`\`typescript
${r.handlerSummary}
\`\`\`
${r.bodySchema ? `Request body schema (Zod fields):\n${r.bodySchema}` : 'No request body.'}
`)
    .join('\n---\n');

  return `
You are an expert Node.js testing engineer. Generate a complete Jest test suite
using supertest for the following Express API routes.

SERVER INTERFACES (USE THESE FOR MOCK DATA):
\`\`\`typescript
${serviceInterfaces}
\`\`\`

RULES:
1. Use TypeScript. Import supertest as: import request from 'supertest'.
2. Import the app (default export) from '../src/app'.
3. Import the service using a NAMED import: import { ${serviceName} } from '${servicePath}'.
4. For each route, write tests covering:
   - Happy path (valid inputs, expected status + response shape)
   - Validation errors (invalid body, missing required fields) → 400
   - Not found cases where applicable → 404
   - Edge cases (empty lists, boundary values, type coercion)
5. Mock the service layer exactly like this:
   jest.mock('${servicePath}');
   const Mock${serviceName} = ${serviceName} as jest.Mocked<typeof ${serviceName}>;
6. In your tests, call methods on Mock${serviceName}, NOT on the service itself. 
   Example: Mock${serviceName}.findAll.mockResolvedValue([]);
7. Add a beforeEach that resets all mocks: jest.resetAllMocks().
8. Use descriptive test names: "GET /users returns paginated list with default limit".
9. Assert response body shape using expect.objectContaining where appropriate.
10. DO NOT use any external test data libraries — inline fixtures only.
11. Output ONLY the TypeScript code. No markdown fences, no prose.
12. STICK TO THE NAMED IMPORTS. DO NOT use default imports for services.
13. **CRITICAL**: Be METICULOUS with mock data. Ensure ALL required fields in the provided SERVER INTERFACES are present (e.g., id, createdAt, role, status, total, expiresIn).
14. **CRITICAL**: For fields with union string types (e.g., role: 'admin' | 'user', status: 'pending' | 'shipped'), use \`as const\` or ensure the mock data matches the union exactly to avoid "Type 'string' is not assignable to type..." errors.
    Example: const mockUser = { id: '1', role: 'admin' as const, createdAt: new Date().toISOString() };

ROUTES TO TEST:
${routeDescriptions}
`.trim();
}
