const { spawn } = require('child_process');
const http = require('http');
const supertest = require('supertest');
const path = require('path');

jest.setTimeout(30000);

let serverProc = null;
let baseUrl = null;

function waitForServerOutput(proc, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server did not start in time')), timeout);
    proc.stdout.on('data', (chunk) => {
      const s = String(chunk);
      // look for the Server started line
      const m = s.match(/Server started on http:\/\/localhost:(\d+)/);
      if (m) {
        clearTimeout(timer);
        resolve(Number(m[1]));
      }
    });
    proc.on('error', (err) => { clearTimeout(timer); reject(err); });
    proc.on('exit', (code) => { clearTimeout(timer); if (!baseUrl) reject(new Error('Server exited early with code ' + code)); });
  });
}

beforeAll(async () => {
  // start the server via node server.js in the backend folder
  const cwd = path.join(__dirname, '..');
  serverProc = spawn(process.execPath, ['server.js'], { cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
  // capture stderr for debugging
  serverProc.stderr.on('data', (c) => { console.error('[server stderr]', String(c)); });
  const port = await waitForServerOutput(serverProc, 20000);
  baseUrl = `http://localhost:${port}`;
  // ensure root responds
  await new Promise((resolve, reject) => {
    const req = http.get(baseUrl + '/', (res) => { res.resume(); resolve(); });
    req.on('error', reject);
  });
});

afterAll(() => {
  if (serverProc) {
    try { serverProc.kill(); } catch (e) { console.warn('Failed to kill server process', e); }
  }
});

test('unauthenticated protected endpoints return 401', async () => {
  const req = supertest(baseUrl);
  // review add should be protected
  await req.post('/api/review/add').send({}).expect(401);
  // order location should be protected
  await req.post('/api/order/location').send({ orderId: 'nope' }).expect(401);
});
