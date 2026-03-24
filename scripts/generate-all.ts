import { generateTests } from './generate-tests';

// Map router files to their Express mount paths
const routerMap: Record<string, string> = {
  'src/routes/users.ts': '/users',
  'src/routes/products.ts': '/products',
  'src/routes/orders.ts': '/orders',
  'src/routes/auth.ts': '/auth',
};

async function main() {
  const entries = Object.entries(routerMap);
  console.log(`\n🚀 Generating tests for ${entries.length} routers...\n`);

  // Sequential to avoid rate limiting
  for (const [routerFile, mountPath] of entries) {
    await generateTests({ routerFile, mountPath, outputDir: '__tests__' });
    // Small delay between API calls
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n✨ All done. Run: npx jest --coverage');
}

main().catch(console.error);
