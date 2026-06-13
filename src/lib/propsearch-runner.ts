import { spawn } from 'child_process';
import path from 'path';

// ── Configuration ─────────────────────────────────────────────────────────────
// Set PROPSEARCH_API_URL (+ PROPSEARCH_SECRET) in Vercel environment variables
// to route searches to the Railway API instead of a local subprocess.
// When PROPSEARCH_API_URL is absent the code falls back to spawning runner.py,
// which is the correct behaviour for local development.

const API_URL    = process.env.PROPSEARCH_API_URL?.replace(/\/$/, '');
const API_SECRET = process.env.PROPSEARCH_SECRET ?? '';

// Generous timeout: Mersan with m² detail pages can take ~2 min.
const TIMEOUT_MS = 150_000;

// ── Public entry point ────────────────────────────────────────────────────────

export function runSearch(params: unknown): Promise<string> {
  return API_URL ? runSearchHTTP(params) : runSearchSubprocess(params);
}

// ── HTTP path (production on Vercel → Railway) ────────────────────────────────

async function runSearchHTTP(params: unknown): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${API_URL}/search`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        ...(API_SECRET ? { Authorization: `Bearer ${API_SECRET}` } : {}),
      },
      body:   JSON.stringify(params),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Scraper API ${res.status}: ${text.slice(0, 300)}`);
    }

    // Return raw JSON string so the caller can JSON.parse() it — same contract
    // as the subprocess path.
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// ── Subprocess path (local dev) ───────────────────────────────────────────────

const PROPSEARCH_DIR = path.resolve(process.cwd(), 'scraper');

function runSearchSubprocess(params: unknown): Promise<string> {
  return new Promise((resolve, reject) => {
    // Dynamic command based on OS platform
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const child = spawn(pythonCmd, ['runner.py'], { cwd: PROPSEARCH_DIR, shell: process.platform === 'win32' });

    let stdout = '';
    let stderr = '';
    let done   = false;

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      child.kill();
      reject(new Error('Scraper subprocess timed out'));
    }, TIMEOUT_MS);

    child.stdout.on('data', (d: Buffer) => { stdout += d; });
    child.stderr.on('data', (d: Buffer) => { stderr += d; });

    child.on('close', (code) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Scraper exited ${code}: ${stderr.slice(0, 500)}`));
      } else {
        resolve(stdout);
      }
    });

    child.on('error', (e) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      reject(e);
    });

    child.stdin.write(JSON.stringify(params), 'utf8');
    child.stdin.end();
  });
}
