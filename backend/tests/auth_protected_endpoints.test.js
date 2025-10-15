/* Quick integration tests for auth-protected endpoints.
   These are lightweight node scripts (no test framework) that exercise endpoints
   using fetch. They require the backend to be running at the configured URL.
   Usage: node backend/tests/auth_protected_endpoints.test.js
*/

import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

const BACKEND = process.env.TEST_BACKEND_URL || 'http://localhost:4000';
const SECRET = process.env.JWT_SECRET || 'random#secret';

async function run() {
  console.log('Running auth-protected endpoint checks against', BACKEND);

  // 1) unauthenticated add review should return 401
  try {
    const resp = await fetch(BACKEND + '/api/review/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entityType: 'food', entityId: 'nonexistent', rating: 5, comment: 'test' }) });
    const status = resp.status;
    console.log('/api/review/add unauthenticated status:', status);
    if (status === 401) console.log('PASS: unauthenticated review add rejected'); else console.warn('WARN: expected 401 for unauthenticated review add');
  } catch (e) { console.error('Error calling /api/review/add', e) }

  // 2) unauthenticated order location should return 401
  try {
    const resp = await fetch(BACKEND + '/api/order/location', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: '123' }) });
    const status = resp.status;
    console.log('/api/order/location unauthenticated status:', status);
    if (status === 401) console.log('PASS: unauthenticated order location rejected'); else console.warn('WARN: expected 401 for unauthenticated order location');
  } catch (e) { console.error('Error calling /api/order/location', e) }

  // 3) generate a signed token for an existing user id (best-effort). If you have a test user id, set TEST_USER_ID env var.
  const testUserId = process.env.TEST_USER_ID || null;
  if (!testUserId) {
    console.warn('No TEST_USER_ID provided; skipping authenticated checks. To run authenticated checks set TEST_USER_ID env var.');
    return;
  }

  const token = jwt.sign({ id: testUserId }, SECRET);
  console.log('Using test token for user', testUserId);

  // authenticated add review (should pass or at least not 401)
  try {
    const resp = await fetch(BACKEND + '/api/review/add', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ entityType: 'food', entityId: 'nonexistent', rating: 4, comment: 'test auth' }) });
    console.log('/api/review/add authenticated status:', resp.status);
    const body = await resp.text();
    console.log('body:', body);
  } catch (e) { console.error('Error calling /api/review/add (auth)', e) }

  // authenticated order location
  try {
    const resp = await fetch(BACKEND + '/api/order/location', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ orderId: '123' }) });
    console.log('/api/order/location authenticated status:', resp.status);
    const body = await resp.text();
    console.log('body:', body);
  } catch (e) { console.error('Error calling /api/order/location (auth)', e) }
}

run().catch(e => console.error(e));
