const test = require('node:test');
const assert = require('node:assert/strict');
const { issueSession, authorizeUpdate } = require('./session');

function request(role, body) {
  return { headers: { authorization: `Bearer ${issueSession({ username: 'OwnerAdmin', role })}` }, body };
}
test('admin edits owner information with authenticated audit identity', () => {
  assert.deepEqual(authorizeUpdate(request(' admin ', {
    ownerName: 'Owner', contact: '123', isRental: 'No', updatedBy: 'Spoofed'
  })), { ownerName: 'Owner', contact: '123', isRental: 'No', updatedBy: 'OwnerAdmin' });
});
test('admin cannot change payments or computed values', () => {
  for (const field of ['lastPaidMonth', 'monthlyAmount', 'pendingMonth', 'pendingAmount']) {
    assert.throws(() => authorizeUpdate(request('ADMIN', { [field]: '123' })), { status: 403 });
  }
});
test('superadmin can record payment while ignoring derived values sent by the UI', () => {
  const updates = authorizeUpdate(request('superadmin', {
    lastPaidMonth: '10/1/2026',
    pendingMonth: '11/1/2026',
    pendingAmount: '0',
    monthlyAmount: '400'
  }));
  assert.equal(updates.lastPaidMonth, '10/1/2026');
  assert.equal(updates.pendingMonth, undefined);
  assert.equal(updates.pendingAmount, undefined);
  assert.equal(updates.monthlyAmount, undefined);
});
test('superadmin can record payment but cannot overwrite formulas', () => {
  assert.equal(authorizeUpdate(request('superadmin', { lastPaidMonth: '10/1/2026' })).lastPaidMonth, '10/1/2026');
  assert.throws(() => authorizeUpdate(request('superadmin', { pendingAmount: '0' })), { status: 403 });
});
test('view-only and unauthenticated requests cannot update', () => {
  assert.throws(() => authorizeUpdate(request('USER', { ownerName: 'Owner' })), { status: 403 });
  assert.throws(() => authorizeUpdate({ headers: {}, body: { role: 'SUPERADMIN' } }), { status: 401 });
});
