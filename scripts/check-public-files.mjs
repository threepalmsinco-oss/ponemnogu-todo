import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const rules = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /gh[pousr]_[A-Za-z0-9]{30,}/,
  /github_pat_[A-Za-z0-9_]{30,}/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}/,
  /(?:api[_-]?key|access[_-]?token|password|secret)\s*[:=]\s*["'][A-Za-z0-9_\/-]{20,}["']/i,
];
for (const file of files) {
  if (/(^|\/)\.env(?:\.|$)/.test(file) || /\.(?:key|pem|p12|pfx)$/.test(file)) throw new Error(`Private file included: ${file}`);
  if (/\.(?:woff2|png|jpg|jpeg)$/.test(file)) continue;
  const text = await readFile(file, 'utf8');
  if (rules.some(rule => rule.test(text))) throw new Error(`Potential secret in ${file}; inspect locally before publishing.`);
}
console.log(`Checked ${files.length} public files: no private files or recognized secret patterns.`);
