# LLM Powered Jest: Auto Generate Tests That Actually Boost Your Coverage

> Your Node.js script queries an AI, gets back complete Jest tests, and your coverage jumps from 0% to nearly 100%. This is not magic, it is a pipeline you can ship today.

Picture this: you have a Node.js API with 20 or more endpoints, and your test coverage is sitting at 0%. The CI badge is red. Writing tests manually feels like tedious boilerplate that nobody wants to touch.

But what if you could point a simple script at your Express routes, let an AI analyze your handler code, your Zod schemas, and your service interfaces, and get back complete, compiling TypeScript Jest test suites with happy paths and edge cases? 

In this post, we will build a standalone code generator that uses only the OpenAI SDK to do exactly this. 

## Why Most AI Code Generators Fail at Testing

When you casually paste a typescript file into ChatGPT and ask for tests, you usually get garbage back:
* It hallucinates properties that your service layer does not export.
* It returns code that fails TypeScript compilation because of union types like 'admin' or 'user'.
* It uses wrong import paths, like default instead of named imports.

To fix this, we need a pipeline that gives the AI the exact context it needs. 

## The Four Step Pipeline

Our pipeline consists of four small scripts:
1. **Extractor:** Parses Express routers to extract the path, method, handler logic, and referenced Zod schemas. Crucially, it also extracts the Service interfaces so the AI knows the exact shape of your models.
2. **Prompt Builder:** Formats this into a strict instruction set.
3. **Generator:** Calls the OpenAI SDK and strips out markdown formatting.
4. **Runner:** Loops over all our routers and writes the test files automatically.

### 1. The Route & Interface Extractor (scripts/extract-routes.ts)

Instead of trying to parse code into complex syntax trees, which is slow and complicated, we just use regular expressions to search the text. For 95% of Express apps, this simple approach works perfectly. We search for the routes, find the local validation schemas, and then dig into the imported service files to grab the exact TypeScript shapes and interfaces they use. 

```typescript
import fs from 'fs';
import path from 'path';

export interface RouteInfo {
  method: string;
  path: string;
  file: string;
  bodySchema?: string;
  handlerSummary: string;
  serviceName?: string;
  servicePath?: string;
  serviceInterfaces?: string;
}

export function extractRoutes(filePath: string): RouteInfo[] {
  const source = fs.readFileSync(filePath, 'utf-8');
  const routes: RouteInfo[] = [];

  // Find Service information from imports
  const serviceImportRegex = /import\s+\{\s*(\w+)\s*\}\s+from\s+['"]((?:\.\.\/services\/|.*Service)[^'"]+)['"]/g;
  
  let serviceName: string | undefined;
  let servicePath: string | undefined;
  let si;
  while ((si = serviceImportRegex.exec(source)) !== null) {
    if (si[1].includes('Service') || si[2].includes('services')) {
      serviceName = si[1];
      servicePath = si[2];
      break;
    }
  }

  // Extract interfaces from the service file
  let serviceInterfaces = '';
  if (servicePath) {
    try {
      const absoluteServicePath = path.resolve(path.dirname(filePath), servicePath + '.ts');
      const serviceSource = fs.readFileSync(absoluteServicePath, 'utf-8');
      const interfaceMatches = serviceSource.match(/export\s+interface\s+\w+\s*\{[\s\S]*?\}/g);
      if (interfaceMatches) serviceInterfaces = interfaceMatches.join('\n\n');
    } catch (e) {
      console.warn(`Could not read service file: ${servicePath}`);
    }
  }

  const routePattern = /router\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;
  const schemaPattern = /const\s+(\w+Schema)\s*=\s*z\.object\(\{([\s\S]*?)\}\)/g;

  const schemas: Record<string, string> = {};
  let sm;
  while ((sm = schemaPattern.exec(source)) !== null) {
    schemas[sm[1]] = sm[2].trim();
  }

  let match;
  while ((match = routePattern.exec(source)) !== null) {
    const [, method, routePath] = match;
    const handlerStart = match.index;
    const handlerSlice = source.slice(handlerStart, handlerStart + 600);
    const schemaRef = Object.keys(schemas).find(k => handlerSlice.includes(k));

    routes.push({
      method: method.toUpperCase(),
      path: routePath,
      file: path.basename(filePath),
      bodySchema: schemaRef ? schemas[schemaRef] : undefined,
      handlerSummary: handlerSlice.slice(0, 300),
      serviceName,
      servicePath,
      serviceInterfaces,
    });
  }

  return routes;
}
```

### 2. The Strict Prompt Builder (scripts/build-prompt.ts)

This is where the magic happens. We enforce strict mocking behaviors and tell the AI exactly how to handle TypeScript union types using "as const" assertions.

```typescript
import type { RouteInfo } from './extract-routes';

export function buildPrompt(routes: RouteInfo[], routerMountPath: string): string {
  const serviceName = routes[0]?.serviceName || 'UserService';
  const serviceInterfaces = routes[0]?.serviceInterfaces || '';
  let servicePath = routes[0]?.servicePath || '../services/UserService';
  
  if (servicePath.startsWith('../')) {
    servicePath = servicePath.replace('../', '../src/');
  }

  const routeDescriptions = routes.map(r => `
### ${r.method} ${routerMountPath}${r.path}
Handler excerpt:
` + '```typescript\n' + `${r.handlerSummary}` + '\n```\n' + `
${r.bodySchema ? `Request body schema (Zod fields):\n${r.bodySchema}` : 'No request body.'}
`).join('\n---\n');

  return `
You are an expert Node.js testing engineer. Generate a complete Jest test suite
using supertest for the following Express API routes.

SERVER INTERFACES (USE THESE FOR MOCK DATA):
` + '```typescript\n' + `${serviceInterfaces}` + '\n```\n' + `

RULES:
1. Use TypeScript. Import supertest as: import request from 'supertest'.
2. Import the app (default export) from '../src/app'.
3. Import the service using a NAMED import: import { ${serviceName} } from '${servicePath}'.
4. For each route, write tests covering:
   * Happy path (valid inputs, expected status and response shape)
   * Validation errors (invalid body) which return 400
   * Not found cases which return 404
5. Mock the service layer exactly like this:
   jest.mock('${servicePath}');
   const Mock${serviceName} = ${serviceName} as jest.Mocked<typeof ${serviceName}>;
6. In your tests, call methods on Mock${serviceName}, never on the service itself.
7. Add a beforeEach that resets all mocks: jest.resetAllMocks().
8. Use descriptive test names.
9. Assert response body shape using expect.objectContaining where appropriate.
10. DO NOT use any external test data libraries, use inline fixtures only.
11. Output ONLY the TypeScript code. No markdown fences.
12. STICK TO THE NAMED IMPORTS.
13. CRITICAL: Be METICULOUS with mock data. Ensure ALL required fields in the provided SERVER INTERFACES are present (for example id, createdAt).
14. CRITICAL: For fields with union string types (for example role is admin or user), use "as const" to avoid typescript compilation errors.

ROUTES TO TEST:
${routeDescriptions}
`.trim();
}
```

### 3. The Generator Engine (scripts/generate-tests.ts)

We feed this to OpenAI's GPT model. Notice the regex cleanup: this ensures the file we write is valid TypeScript and free of Markdown wrappers.

```typescript
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { extractRoutes } from './extract-routes';
import { buildPrompt } from './build-prompt';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateTests(
  routerPath: string,
  mountPath: string
): Promise<string> {
  console.log(`\n🔍 Extracting routes from ${routerPath}...`);
  const routes = extractRoutes(routerPath);
  console.log(`   Found ${routes.length} routes.`);

  const prompt = buildPrompt(routes, mountPath);

  console.log('🤖 Querying OpenAI...');
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a test generation engine. Only output code. Do not wrap code in markdown.',
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.1,
  });

  const responseText = response.choices[0]?.message?.content || '';
  
  // Strip Markdown fences
  const cleanCode = responseText.replace(/(?:^```(?:typescript|ts)?\n?|```$)/gm, '');

  return cleanCode;
}
```

### 4. Running the Whole Thing (scripts/generate-all.ts)

Finally, iterate over your routers:

```typescript
import fs from 'fs';
import path from 'path';
import { generateTests } from './generate-tests';

const ROUTERS = [
  { file: 'src/routes/users.ts', mount: '/users' },
  { file: 'src/routes/products.ts', mount: '/products' },
  { file: 'src/routes/orders.ts', mount: '/orders' },
  { file: 'src/routes/auth.ts', mount: '/auth' },
];

async function main() {
  console.log(`🚀 Generating tests for ${ROUTERS.length} routers...`);

  for (const { file, mount } of ROUTERS) {
    const testCode = await generateTests(file, mount);

    const baseName = path.basename(file, '.ts');
    const testPath = path.join('__tests__', `${baseName}.test.ts`);
    
    fs.writeFileSync(testPath, testCode);
    console.log(`✅ Tests written to ${testPath}`);
  }

  console.log('\n✨ All done. Run: npx jest --coverage');
}

main().catch(console.error);
```

## The Results: Before vs After

Will an AI immediately solve all your problems forever? No. You might still have to tweak an assertion here or there, for example, we had to adjust expect(response.body) to expect(response.body.data) for some paginated routes. 

But let's look at the numbers.

### Before the Script
* **Test Suites:** 0 
* **Tests:** 0
* **Coverage on Routes:** 0%
* **Time spent:** 0 hours, but a lot of tech debt anxiety.

### After the Script
We ran the script across four full routers. It took about 20 seconds. 

```bash
> npx jest --coverage
PASS __tests__/users.test.ts
PASS __tests__/auth.test.ts
PASS __tests__/products.test.ts
PASS __tests__/orders.test.ts

Test Suites: 4 passed, 4 total
Tests:       44 passed, 44 total
Snapshots:   0 total
Time:        3.458 s

--------------------|---------|----------|---------|---------|-------------------------
File                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s       
--------------------|---------|----------|---------|---------|-------------------------
All files           |   88.46 |    97.82 |       0 |   88.46 |                         
 src                |     100 |      100 |     100 |     100 |                         
  app.ts            |     100 |      100 |     100 |     100 |                         
 src/routes         |     100 |    97.82 |     100 |     100 |                         
  auth.ts           |     100 |      100 |     100 |     100 |                         
  orders.ts         |     100 |     92.3 |     100 |     100 | 60                      
  products.ts       |     100 |      100 |     100 |     100 |                         
  users.ts          |     100 |      100 |     100 |     100 |                         
--------------------|---------|----------|---------|---------|-------------------------
```

**100% Statement Coverage on our Controllers and Routers**. This represents 44 tests generated automatically, covering authentication, data validation, status codes, edge cases, and mocked database calls. The total project coverage levels out at roughly 88.5% only because our service files are stubs meant for database calls.

### Conclusion

By providing the AI with more than just the controller code, specifically the Zod schemas and TypeScript interface definitions, we solved the most common problems with AI generated tests: compiling errors and missing interface properties.

You can drop these exact scripts into any Express or TypeScript project today and safely skip the tedious boilerplate phase of writing route tests forever!
