import { readdir, readFile } from 'node:fs/promises';
for (const layer of ['domain', 'application']) {
  for (const file of await readdir(`src/${layer}`)) {
    const source = await readFile(`src/${layer}/${file}`, 'utf8');
    if (/\b(document|window|localStorage)\b/.test(source)) throw new Error(`Browser API in ${layer}/${file}`);
    for (const [, dependency] of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      if (layer === 'domain' && dependency.startsWith('../')) throw new Error(`Outward domain dependency: ${file}`);
      if (layer === 'application' && !dependency.startsWith('../domain/')) throw new Error(`Outward application dependency: ${file}`);
    }
  }
}
console.log('Architecture boundaries verified.');
