import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prefix = 'muyun-ai/';
const manifestName = `${prefix}SOURCE_MANIFEST.json`;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const required = [
  'README.md', 'CODE_GUIDE.md', 'DEPLOYMENT.md', 'RELEASE_STATUS.json',
  'ITERATION_PLAN.md', 'ITERATION_LOG.md', 'PRODUCT_ANALYSIS.md', 'SELF_TEST_MATRIX.md',
  'package.json', 'pnpm-lock.yaml', '.openai/hosting.json', 'vite.config.ts',
  'db/schema.ts', 'drizzle/0000_yellow_silver_samurai.sql', 'drizzle/0001_windy_hitman.sql', 'drizzle/0002_classy_proemial_gods.sql',
  'scripts/self-test.mjs', 'scripts/package-source.mjs', 'tests/integration.mjs',
  'OPENWORKBUDDY_REFERENCE.md', 'tests/artifact-integrity-live.py',
  'GENOFFICE_INTEGRATION.md', 'local-runner/genoffice_adapter.py', 'local-runner/restore_checkpoint.py',
  'app/genoffice-panel.tsx', 'app/office-actions.tsx', 'lib/office-content.ts',
  'lib/document-agent.ts', 'lib/document-audit.ts', 'lib/chat-idempotency.ts', 'app/document-proposal.tsx', 'app/document-file.tsx',
  'lib/runtime-capabilities.ts',
  'app/api/document-tool/route.ts', 'app/api/artifact-file/route.ts',
  'tests/chat-idempotency.mjs', 'tests/document-agent.mjs', 'tests/document-audit.mjs', 'tests/verify-chat-tool.py',
  'tests/composer-import.mjs',
  'tests/genoffice-live.py', 'tests/genoffice-render.py', 'tests/office-content-regression.mjs',
  'local-runner/README.md', 'local-runner/engine.py', 'local-runner/server.py', 'local-runner/console.html',
  'app/local-execution.tsx', 'tests/local-runner-test.py', 'tests/local-runner-live.py',
  'tests/local-runner-spreadsheet-live.py', 'tests/local-runner-docker.py',
  'tests/regression-extra.mjs', 'tests/exports-regression.mjs', 'tests/knowledge-benchmark.mjs',
  'tests/csv-regression.mjs', 'tests/export-csv-fixture.mjs', 'tests/verify-csv-fixture.py',
  'tests/export-xlsx-fixture.mjs', 'tests/verify-xlsx-fixture.py',
  'tests/export-pptx-fixture.mjs', 'tests/verify-pptx-fixture.py',
  'tests/worker-fixture.ts', 'tests/worker-fixture.mjs', 'tests/worker-runtime-regression.mjs', 'tests/worker-live-model.mjs',
  'build/sites-vite-plugin.LICENSE', 'vendor/shadcn-tailwind-4.13.0.LICENSE.md',
];
function unsafePath(path) {
  return path.startsWith('/') || path.includes('\\') || /[\x00-\x1f]/.test(path) ||
    path.split('/').some(part => ['..', '.', '.git', 'node_modules', '.wrangler', '.sites-runtime', '.next', '.vinext', '.codex', '.agents', 'outputs', 'upload', 'work', 'dist', 'coverage'].includes(part)) ||
    /(^|\/)(\.env[^/]*|\.dev\.vars[^/]*|\.netrc|\.git-credentials|id_rsa|id_ed25519)$/.test(path) ||
    /(^|\/)__pycache__(\/|$)/.test(path) || /\.(pyc|pem|key|p12|pfx|sqlite|sqlite3|db|log|tsbuildinfo)$/i.test(path);
}
function inspectContent(path, bytes) {
  let content = strFromU8(bytes);
  // This exact reserved-domain fixture proves credential-bearing URLs are rejected.
  // Keep the regression source without allowing other credentials in test files.
  if (path === 'tests/integration.mjs') content = content.replaceAll('https://' + 'user:pass@example.com', 'https://example.com');
  // Conservative known credential forms; findings report only the filename.
  const patterns = [
    /\bsk-[A-Za-z0-9_-]{24,}/,
    /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /https?:\/\/[^\s/:"'`<>]+:[^\s/@"'`<>]+@/,
    /(?:^|\n)\s*(?:DEEPSEEK_API_KEY|VAULT_MASTER_KEY|_authToken)\s*=\s*[A-Za-z0-9+/=_-]{24,}/,
  ];
  if (patterns.some(pattern => pattern.test(content))) throw new Error(`Potential credential in ${path}; review before packaging.`);
}
function verify(bytes) {
  const files = unzipSync(bytes);
  if (!files[manifestName]) throw new Error('Missing source manifest.');
  const manifest = JSON.parse(strFromU8(files[manifestName]));
  if (manifest.schema_version !== 1 || !/^[a-f0-9]{40,64}$/.test(manifest.commit_sha) || !Array.isArray(manifest.files)) throw new Error('Invalid source manifest.');
  const seen = new Set();
  for (const entry of manifest.files) {
    if (!entry.path || unsafePath(entry.path) || seen.has(entry.path)) throw new Error('Unsafe or duplicate source path.');
    seen.add(entry.path);
    const content = files[prefix + entry.path];
    if (!content || content.length !== entry.bytes || sha256(content) !== entry.sha256) throw new Error(`Integrity mismatch: ${entry.path}`);
    inspectContent(entry.path, content);
  }
  if (Object.keys(files).length !== manifest.files.length + 1) throw new Error('Unexpected archive entries.');
  for (const path of required) if (!seen.has(path)) throw new Error(`Required file missing: ${path}`);
  const status = JSON.parse(strFromU8(files[prefix + 'RELEASE_STATUS.json']));
  if (JSON.stringify(manifest.release_status) !== JSON.stringify(status)) throw new Error('Release status mismatch.');
  inspectContent('SOURCE_MANIFEST.json', files[manifestName]);
  return manifest;
}

try {
  const args = process.argv.slice(2);
  if (args[0] === '--verify' && args.length === 2) {
    const bytes = readFileSync(resolve(args[1]));
    const manifest = verify(bytes);
    console.log(JSON.stringify({ verified: true, commit_sha: manifest.commit_sha, files: manifest.files.length, archive_sha256: sha256(bytes) }, null, 2));
  } else {
    if (args.length) throw new Error('Usage: node scripts/package-source.mjs [--verify archive.zip]');
    const git = (...argv) => execFileSync('git', ['-C', root, ...argv], { maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    if (git('status', '--porcelain', '--untracked-files=all').toString().trim()) throw new Error('Commit or preserve outstanding changes before packaging; only committed source is delivered.');
    const commit = git('rev-parse', 'HEAD').toString().trim();
    const committedAt = git('show', '-s', '--format=%cI', commit).toString().trim();
    const zipped = Object.create(null);
    const entries = [];
    for (const record of git('ls-tree', '-r', '-z', commit).toString().split('\0').filter(Boolean)) {
      const tab = record.indexOf('\t');
      const [mode, type, blob] = record.slice(0, tab).split(' ');
      const path = record.slice(tab + 1);
      if (!['100644', '100755'].includes(mode) || type !== 'blob' || unsafePath(path)) throw new Error(`Review unsupported or sensitive tracked file: ${path}`);
      const bytes = git('cat-file', 'blob', blob);
      inspectContent(path, bytes);
      entries.push({ path, bytes: bytes.length, sha256: sha256(bytes), mode });
      zipped[prefix + path] = [bytes, { mtime: new Date(committedAt), os: 3, attrs: parseInt(mode, 8) * 65536 }];
    }
    const statusEntry = zipped[prefix + 'RELEASE_STATUS.json'];
    if (!statusEntry) throw new Error('Missing RELEASE_STATUS.json.');
    const manifest = {
      schema_version: 1, brand: '幕云AI', commit_sha: commit, committed_at: committedAt,
      release_status: JSON.parse(strFromU8(statusEntry[0])),
      scope: 'Complete committed source; excludes credentials, user data, dependencies, caches and Git history.',
      files: entries,
    };
    zipped[manifestName] = [strToU8(JSON.stringify(manifest, null, 2) + '\n'), { mtime: new Date(committedAt) }];
    const archive = zipSync(zipped, { level: 6 });
    verify(archive);
    const date = committedAt.slice(0, 10).replaceAll('-', '');
    const output = resolve(root, 'outputs', `muyun-ai-source-${date}-${commit.slice(0, 12)}.zip`);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, archive);
    verify(readFileSync(output));
    console.log(JSON.stringify({ file: output, commit_sha: commit, source_status: manifest.release_status.source_status, files: entries.length, bytes: archive.length, archive_sha256: sha256(archive), verified: true }, null, 2));
  }
} catch (error) {
  console.error(`Source package failed: ${error.message}`);
  process.exitCode = 1;
}
