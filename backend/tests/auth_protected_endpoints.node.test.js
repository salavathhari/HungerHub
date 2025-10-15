import assert from 'assert';
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

const BACKEND = process.env.TEST_BACKEND_URL || 'http://localhost:4000';
const SECRET = process.env.JWT_SECRET || 'random#secret';

[{
  name: 'unauthenticated review add should return 401',
  run: async () => {
    const resp = await fetch(BACKEND + '/api/review/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entityType: 'food', entityId: 'nonexistent', rating: 5, comment: 'test' }) });
    assert.strictEqual(resp.status, 401, 'Expected 401 for unauthenticated review add');
  }
}, {
  name: 'unauthenticated order location should return 401',
  run: async () => {
    const resp = await fetch(BACKEND + '/api/order/location', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: '123' }) });
    assert.strictEqual(resp.status, 401, 'Expected 401 for unauthenticated order location');
  }
}].forEach(({name, run}) => {
  test(name, async () => {
    await run();
  })
});

// Optional authenticated test if TEST_USER_ID is provided
if (process.env.TEST_USER_ID) {
  test('authenticated endpoints respond (sanity check)', async () => {
    const token = jwt.sign({ id: process.env.TEST_USER_ID }, SECRET);
    const r = await fetch(BACKEND + '/api/review/add', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ entityType: 'food', entityId: 'nonexistent', rating: 4, comment: 'test auth' }) });
    // allow 200 or 201 or 400 (if entity not found) but not 401
    assert.notStrictEqual(r.status, 401, 'Authenticated request should not return 401');
  })
}
