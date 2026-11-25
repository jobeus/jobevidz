// Deploy webhook: the same protocol as pasters, basegame and cmwgpt.
//
//   POST /deploy
//   X-Deploy-Timestamp: <unix seconds>
//   X-Deploy-Signature: sha256=<hex HMAC-SHA256 of "<timestamp>.<body>">
//   {"sha": "<commit>", "ref": "refs/heads/main"}
//
// A valid request for a commit we aren't on gets 202; then, in the background, the checkout
// is `git pull --ff-only`ed and rebuilt (scripts/release-build.sh), and only after both
// succeed is onReady() called, which shuts the server down with exit code 42 so start.sh
// relaunches it on the new build. The site keeps serving during the build. A failed pull or
// build is logged and the old process keeps running. Hooks that arrive mid-build are
// coalesced into one more pull afterwards.
import http from 'http';
import crypto from 'crypto';
import path from 'path';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const execFileAsync = promisify(execFile);

// server/dist/utils -> repo root
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const MAX_SKEW_SECONDS = 300;
const MAX_BODY_BYTES = 64 * 1024;

export const DEPLOY_EXIT_CODE = 42;

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    const log = (stream: 'stdout' | 'stderr') => (chunk: Buffer) => {
      for (const line of chunk.toString().split('\n')) {
        if (line.trim()) logger.info({ deploy: command, stream }, line);
      }
    };
    child.stdout.on('data', log('stdout'));
    child.stderr.on('data', log('stderr'));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited with ${code}`)),
    );
  });
}

async function currentSha(): Promise<string> {
  const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT });
  return stdout.trim();
}

function validSignature(secret: string, timestamp: string, body: string, signature: string): boolean {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function startDeployHook(onReady: () => void): http.Server | null {
  const secret = process.env.DEPLOY_WEBHOOK_SECRET;
  if (!secret) {
    logger.info('DEPLOY_WEBHOOK_SECRET not set; deploy webhook off');
    return null;
  }
  const host = process.env.DEPLOY_WEBHOOK_HOST || '127.0.0.1';
  const port = Number(process.env.DEPLOY_WEBHOOK_PORT || 8790);
  const buildCommand = process.env.DEPLOY_BUILD_COMMAND || './scripts/release-build.sh';

  let running = false;
  let pending = false;

  async function deploy(): Promise<void> {
    running = true;
    try {
      do {
        pending = false;
        const before = await currentSha();
        await run('git', ['pull', '--ff-only']);
        const after = await currentSha();
        logger.info({ before, after }, 'deploy: pulled; building');
        await run('/bin/sh', ['-c', buildCommand]);
      } while (pending);
      logger.info({ sha: await currentSha() }, 'deploy: build done; restarting');
      onReady();
    } catch (err) {
      logger.error({ err }, 'deploy failed; still running the previous build');
    } finally {
      running = false;
    }
  }

  const server = http.createServer((req, res) => {
    const reply = (status: number, text: string) => {
      res.writeHead(status, { 'Content-Type': 'text/plain' });
      res.end(text + '\n');
    };
    if (req.method !== 'POST' || req.url !== '/deploy') return reply(404, 'not found');

    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reply(413, 'too large');
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', async () => {
      if (res.writableEnded) return;
      const body = Buffer.concat(chunks).toString();
      const timestamp = String(req.headers['x-deploy-timestamp'] || '');
      const signature = String(req.headers['x-deploy-signature'] || '');
      const skew = Math.abs(Date.now() / 1000 - Number(timestamp));
      if (!/^\d+$/.test(timestamp) || !(skew <= MAX_SKEW_SECONDS) || !validSignature(secret, timestamp, body, signature)) {
        logger.warn({ ip: req.headers['x-real-ip'] || req.socket.remoteAddress }, 'deploy: rejected request');
        return reply(401, 'bad signature');
      }

      let sha = '';
      try {
        sha = String(JSON.parse(body).sha || '');
      } catch {
        return reply(400, 'bad body');
      }
      try {
        if (sha && !running && sha === (await currentSha())) return reply(200, 'up-to-date');
      } catch (err) {
        logger.error({ err }, 'deploy: git rev-parse failed');
      }

      logger.info({ sha, alreadyRunning: running }, 'deploy: accepted');
      reply(202, running ? 'queued' : 'deploying');
      if (running) pending = true;
      else void deploy();
    });
  });

  server.listen(port, host, () => logger.info({ host, port }, 'deploy webhook listening'));
  return server;
}
