import 'dotenv/config';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { extractRoutes } from './extract-routes';
import { buildPrompt } from './build-prompt';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

interface GeneratorConfig {
  routerFile: string;        // e.g. 'src/routes/users.ts'
  mountPath: string;         // e.g. '/users'
  outputDir: string;         // e.g. '__tests__'
}

export async function generateTests(config: GeneratorConfig): Promise<void> {
  const { routerFile, mountPath, outputDir } = config;

  console.log(`\n🔍 Extracting routes from ${routerFile}...`);
  const routes = extractRoutes(routerFile);
  console.log(`   Found ${routes.length} routes: ${routes.map(r => `${r.method} ${r.path}`).join(', ')}`);

  const prompt = buildPrompt(routes, mountPath);

  console.log(`\n🤖 Querying OpenAI (gpt-4o)...`);
  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const generatedCode = completion.choices[0]?.message?.content ?? '';

  // Sanitise: strip any markdown fences the model might have slipped in
  const sanitised = generatedCode
    .replace(/```(?:typescript|ts)?\n?/g, '')
    .replace(/```\s*$/gm, '')
    .trim();

  // Write to output directory
  const routerName = path.basename(routerFile, path.extname(routerFile));
  const outFile = path.join(outputDir, `${routerName}.test.ts`);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outFile, sanitised, 'utf-8');

  console.log(`\n✅ Tests written to ${outFile}`);
  console.log(`   Input tokens: ${completion.usage?.prompt_tokens ?? 'N/A'}`);
  console.log(`   Output tokens: ${completion.usage?.completion_tokens ?? 'N/A'}`);
}

// ── Run ──────────────────────────────────────────
generateTests({
  routerFile: 'src/routes/users.ts',
  mountPath: '/users',
  outputDir: '__tests__',
}).catch(console.error);
