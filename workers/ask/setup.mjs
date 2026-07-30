/**
 * One-time Cloudflare setup for the ASK proxy.
 *
 * Creates the KV namespace the rate limiter needs and writes its id into
 * wrangler.toml. That id is a long opaque hex string that has to be copied by
 * hand otherwise, and a wrong one fails at request time rather than at deploy
 * time — the Worker would start, then refuse every question because the
 * binding resolves to nothing.
 *
 * Deliberately does NOT touch the Anthropic key. That is set with
 * `wrangler secret put`, which reads it directly from the operator's terminal
 * so it never passes through this script, the repo, or anything I can see.
 *
 * Run: npm run setup
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const CONFIG = new URL('./wrangler.toml', import.meta.url);
const PLACEHOLDER = 'REPLACE_WITH_KV_NAMESPACE_ID';

const run = (args) =>
  execFileSync('npx', ['wrangler', ...args], { encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'] });

// `wrangler whoami` exits 0 even when nobody is logged in, so the exit code
// says nothing and the output has to be read instead. Relying on the status
// here meant setup sailed past the check and died later with a raw stack.
let who = '';
try {
  who = run(['whoami']);
} catch (error) {
  who = String(error?.stdout ?? '');
}

if (/not authenticated/i.test(who) || !who.trim()) {
  console.error('✖  Not logged in to Cloudflare.');
  console.error('   Run `npx wrangler login` first — it opens a browser to authorise.');
  process.exit(1);
}

const account = who.match(/([^\s│]+@[^\s│]+)/)?.[1];
if (account) console.log(`Logged in as ${account}`);

let toml = readFileSync(CONFIG, 'utf8');

if (!toml.includes(PLACEHOLDER)) {
  console.log('✔  wrangler.toml already has a KV namespace id. Nothing to do.');
  console.log('   To start over, put the placeholder back and re-run.');
  process.exit(0);
}

console.log('Creating KV namespace RATE_LIMIT…');
let output;
try {
  output = run(['kv', 'namespace', 'create', 'RATE_LIMIT']);
} catch (error) {
  console.error('✖  Could not create the KV namespace.');
  console.error(String(error?.stderr ?? error?.stdout ?? error?.message ?? error).trim());
  process.exit(1);
}

// Wrangler prints the binding block; the id is the quoted hex string in it.
const id = output.match(/id\s*=\s*"([0-9a-f]{32})"/i)?.[1];
if (!id) {
  console.error('✖  Could not find the namespace id in wrangler output:\n');
  console.error(output);
  console.error('Add it to wrangler.toml by hand and re-run `npm run deploy`.');
  process.exit(1);
}

toml = toml.replace(PLACEHOLDER, id);
writeFileSync(CONFIG, toml);
console.log(`✔  KV namespace created and written to wrangler.toml (${id.slice(0, 8)}…).`);

console.log('\nOne step left, and it is yours to do:\n');
console.log('    npx wrangler secret put ANTHROPIC_API_KEY');
console.log('\nIt prompts for the key and sends it straight to Cloudflare.');
console.log('Then:  npm run deploy');
