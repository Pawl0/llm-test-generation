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

/**
 * Extracts route definitions from an Express router file
 * using regex — fast, zero-dependency, good enough for 95% of codebases.
 */
export function extractRoutes(filePath: string): RouteInfo[] {
  const source = fs.readFileSync(filePath, 'utf-8');
  const routes: RouteInfo[] = [];

  // Extract Service information from imports
  // Look for imports that contain "Service" or are from the "../services/" directory
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

  // Extract interfaces from the service file if found
  let serviceInterfaces = '';
  if (servicePath) {
    try {
      // Resolve the service file path relative to the router file
      // e.g. from src/routes/users.ts, ../services/UserService resolves to src/services/UserService.ts
      const absoluteServicePath = path.resolve(path.dirname(filePath), servicePath + '.ts');
      const serviceSource = fs.readFileSync(absoluteServicePath, 'utf-8');
      
      // Grep for interfaces (simple regex for this demo)
      const interfaceMatches = serviceSource.match(/export\s+interface\s+\w+\s*\{[\s\S]*?\}/g);
      if (interfaceMatches) {
        serviceInterfaces = interfaceMatches.join('\n\n');
      }
    } catch (e) {
      console.warn(`Could not read service file: ${servicePath}`);
    }
  }

  // Match: router.get('/path', async (req, res) => { ... })
  const routePattern =
    /router\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;

  // Extract Zod schemas defined in the same file
  const schemaPattern =
    /const\s+(\w+Schema)\s*=\s*z\.object\(\{([\s\S]*?)\}\)/g;

  const schemas: Record<string, string> = {};
  let sm;
  while ((sm = schemaPattern.exec(source)) !== null) {
    schemas[sm[1]] = sm[2].trim();
  }

  let match;
  while ((match = routePattern.exec(source)) !== null) {
    const [, method, routePath] = match;

    // Grab the handler body (~30 lines after the route definition)
    const handlerStart = match.index;
    const handlerSlice = source.slice(handlerStart, handlerStart + 600);

    // Find which schema is referenced in this handler
    const schemaRef = Object.keys(schemas).find(k =>
      handlerSlice.includes(k)
    );

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
