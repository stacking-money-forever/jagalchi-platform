import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const sourceRoot = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(import.meta.dirname, '../src');
const forbidden = [
  {
    label: 'supported direct Django AI consumer',
    pattern: /\b(?:getLearningCoach|getRecordCoach|getNodeDescription|getResourceRecommendation)\b/,
  },
  {
    label: 'legacy Nest AI jobs adapter',
    pattern: /\brunAiJob\b/,
  },
  {
    label: 'legacy attachment upload endpoint',
    pattern: /\/uploads\/attachments\b/,
  },
];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'mocks') files.push(...(await sourceFiles(entryPath)));
      continue;
    }
    if (!/\.(?:ts|tsx)$/.test(entry.name) || /\.(?:test|stories)\.(?:ts|tsx)$/.test(entry.name)) {
      continue;
    }
    files.push(entryPath);
  }
  return files;
}

const failures = [];
const files = await sourceFiles(sourceRoot);
for (const file of files) {
  const content = await readFile(file, 'utf8');
  for (const rule of forbidden) {
    if (rule.pattern.test(content)) {
      failures.push(`${rule.label}: ${path.relative(sourceRoot, file)}`);
    }
  }
}

if (failures.length > 0) {
  throw new Error(`Consumer contract regression:\n${failures.join('\n')}`);
}

console.log(`Consumer contracts verified across ${files.length} runtime source files.`);
