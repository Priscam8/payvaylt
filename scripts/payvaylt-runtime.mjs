import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.dirname(scriptsDir);
export const runtimeDir = path.join(rootDir, '.payvaylt-runtime');
export const envFilePath = path.join(rootDir, '.env');
export const envExampleFilePath = path.join(rootDir, '.env.example');
export const backendPidFilePath = path.join(runtimeDir, 'backend.pid');
export const webPidFilePath = path.join(runtimeDir, 'web.pid');
export const backendLogFilePath = path.join(runtimeDir, 'backend.log');
export const webLogFilePath = path.join(runtimeDir, 'web.log');
export const backendHealthUrl = 'http://127.0.0.1:4000/api/health';
export const webAppUrl = 'http://127.0.0.1:8081';

const nodeModulesDir = path.join(rootDir, 'node_modules');

const sharedDemoEnv = {
  EXPO_NO_TELEMETRY: '1',
  EXPO_PUBLIC_PAYVAYLT_API_URL: 'http://127.0.0.1:4000/api',
  PAYVAYLT_ALLOW_DEV_CODES: 'true',
  PAYVAYLT_DATABASE_SSL: '',
  PAYVAYLT_DATABASE_URL: '',
  PAYVAYLT_DOCUMENT_STORAGE: 'local',
  PAYVAYLT_MAX_UPLOAD_BYTES: '10485760',
  PAYVAYLT_OTP_PROVIDER: 'console',
  PAYVAYLT_PAYMENT_PROVIDER: 'mock',
  PAYVAYLT_PORT: '4000',
  PAYVAYLT_S3_ACCESS_KEY_ID: '',
  PAYVAYLT_S3_BUCKET: '',
  PAYVAYLT_S3_ENDPOINT: '',
  PAYVAYLT_S3_FORCE_PATH_STYLE: 'false',
  PAYVAYLT_S3_REGION: 'af-south-1',
  PAYVAYLT_S3_SECRET_ACCESS_KEY: '',
  PAYVAYLT_STRIPE_CANCEL_URL: 'https://example.com/payvaylt/payment-cancelled',
  PAYVAYLT_STRIPE_SECRET_KEY: '',
  PAYVAYLT_STRIPE_SUCCESS_URL: 'https://example.com/payvaylt/payment-success',
  PAYVAYLT_STRIPE_WEBHOOK_SECRET: '',
  PAYVAYLT_TWILIO_ACCOUNT_SID: '',
  PAYVAYLT_TWILIO_AUTH_TOKEN: '',
  PAYVAYLT_TWILIO_FROM_NUMBER: '',
  PAYVAYLT_TWILIO_MESSAGING_SERVICE_SID: '',
  PAYVAYLT_UPLOADS_DIR: './backend/uploads',
};

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function ensureRuntimeDir() {
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'backend', 'uploads'), { recursive: true });
}

export function ensureEnvFile() {
  ensureRuntimeDir();

  if (fs.existsSync(envFilePath)) {
    return false;
  }

  fs.copyFileSync(envExampleFilePath, envFilePath);
  return true;
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}.`));
    });
  });
}

export async function ensureDependencies() {
  if (fs.existsSync(nodeModulesDir)) {
    return false;
  }

  console.log('Installing PayVaylt dependencies. This only happens on the first launch.');
  await runProcess(npmCommand(), ['install'], {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
  });
  return true;
}

function readPid(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) {
    return null;
  }

  const pid = Number(raw);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

function writePid(filePath, pid) {
  fs.writeFileSync(filePath, String(pid));
}

function removeFileIfPresent(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function isProcessRunning(pid) {
  if (!pid) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function isUrlReady(url) {
  try {
    const response = await fetch(url, { redirect: 'follow' });
    return response.ok || response.status === 301 || response.status === 302;
  } catch {
    return false;
  }
}

async function waitForUrl(url, timeoutMs, pid, label, logFilePath) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isUrlReady(url)) {
      return;
    }

    if (pid && !isProcessRunning(pid)) {
      throw new Error(`${label} stopped before it became ready. Check ${path.relative(rootDir, logFilePath)}.`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`${label} did not become ready in time. Check ${path.relative(rootDir, logFilePath)}.`);
}

function startDetachedProcess(command, args, logFilePath, extraEnv = {}) {
  ensureRuntimeDir();
  const logFd = fs.openSync(logFilePath, 'a');
  const child = spawn(command, args, {
    cwd: rootDir,
    detached: true,
    env: {
      ...process.env,
      ...sharedDemoEnv,
      ...extraEnv,
    },
    stdio: ['ignore', logFd, logFd],
  });

  child.unref();
  return child.pid;
}

async function ensureService({ label, pidFilePath, logFilePath, command, args, url, timeoutMs, extraEnv = {} }) {
  const existingPid = readPid(pidFilePath);
  if (existingPid && isProcessRunning(existingPid)) {
    if (await isUrlReady(url)) {
      return { pid: existingPid, started: false };
    }
  }

  removeFileIfPresent(pidFilePath);
  const pid = startDetachedProcess(command, args, logFilePath, extraEnv);
  writePid(pidFilePath, pid);
  await waitForUrl(url, timeoutMs, pid, label, logFilePath);
  return { pid, started: true };
}

function openUrl(url) {
  if (process.platform === 'darwin') {
    return runProcess('open', [url], { stdio: 'ignore' });
  }

  if (process.platform === 'win32') {
    return runProcess('cmd', ['/c', 'start', '', url], { stdio: 'ignore' });
  }

  return runProcess('xdg-open', [url], { stdio: 'ignore' });
}

export async function openPayVaylt() {
  const envCreated = ensureEnvFile();
  const installedDeps = await ensureDependencies();

  const backend = await ensureService({
    label: 'PayVaylt backend',
    pidFilePath: backendPidFilePath,
    logFilePath: backendLogFilePath,
    command: npmCommand(),
    args: ['run', 'backend'],
    url: backendHealthUrl,
    timeoutMs: 45000,
  });

  const web = await ensureService({
    label: 'PayVaylt web app',
    pidFilePath: webPidFilePath,
    logFilePath: webLogFilePath,
    command: npmCommand(),
    args: ['run', 'web', '--', '--port', '8081'],
    url: webAppUrl,
    timeoutMs: 180000,
    extraEnv: {
      BROWSER: 'none',
      CI: '1',
    },
  });

  await openUrl(webAppUrl);

  console.log('');
  console.log('PayVaylt is ready.');
  console.log(`Open URL: ${webAppUrl}`);
  console.log(`Backend log: ${path.relative(rootDir, backendLogFilePath)}`);
  console.log(`Web log: ${path.relative(rootDir, webLogFilePath)}`);
  console.log(`Stop script: Stop PayVaylt.command`);

  if (envCreated) {
    console.log('Created .env from .env.example for local development.');
  }

  if (installedDeps) {
    console.log('Installed dependencies for the first launch.');
  }

  if (!backend.started && !web.started) {
    console.log('Both services were already running, so the launcher just reopened the app.');
  }
}

async function stopProcessGroup(pid) {
  if (!isProcessRunning(pid)) {
    return false;
  }

  if (process.platform === 'win32') {
    process.kill(pid, 'SIGTERM');
  } else {
    process.kill(-pid, 'SIGTERM');
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < 10000) {
    if (!isProcessRunning(pid)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  if (process.platform === 'win32') {
    process.kill(pid, 'SIGKILL');
  } else {
    process.kill(-pid, 'SIGKILL');
  }

  return true;
}

async function stopService(label, pidFilePath) {
  const pid = readPid(pidFilePath);
  if (!pid) {
    return false;
  }

  const stopped = await stopProcessGroup(pid).catch(() => false);
  removeFileIfPresent(pidFilePath);

  if (stopped) {
    console.log(`Stopped ${label}.`);
  }

  return stopped;
}

export async function stopPayVaylt() {
  const stoppedWeb = await stopService('PayVaylt web app', webPidFilePath);
  const stoppedBackend = await stopService('PayVaylt backend', backendPidFilePath);

  if (!stoppedWeb && !stoppedBackend) {
    console.log('PayVaylt was not running.');
    return;
  }

  console.log('PayVaylt services are stopped.');
}
