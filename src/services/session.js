const { randomBytes } = require('node:crypto');
const sessions = new Map();
const duration = 30 * 24 * 60 * 60 * 1000;

function issueSession(user) {
  for (const [token, session] of sessions) {
    if (session.expiresAt <= Date.now()) sessions.delete(token);
  }
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { username: user.username, role: user.role, expiresAt: Date.now() + duration });
  return token;
}

function authorizeUpdate(req) {
  const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1];
  const session = sessions.get(token);
  function reject(status, message) {
    const error = new Error(message);
    error.status = status;
    error.publicMessage = message;
    throw error;
  }
  if (!session || session.expiresAt <= Date.now()) {
    reject(401, 'Your session has expired. Please log out and sign in again.');
  }
  const role = String(session.role || '').trim().toUpperCase();
  if (!['ADMIN', 'SUPERADMIN'].includes(role)) reject(403, 'You cannot edit owner details.');
  const updates = req.body || {};
  const allowed = role === 'SUPERADMIN'
    ? ['ownerName', 'isRental', 'contact', 'lastPaidMonth']
    : ['ownerName', 'isRental', 'contact'];
  for (const field of Object.keys(updates)) {
    if (!allowed.includes(field) && !['action', 'flatNo', 'updatedBy'].includes(field)) {
      reject(403, 'You are not allowed to update payment or calculated fields.');
    }
  }
  return { ...updates, updatedBy: session.username };
}

module.exports = { issueSession, authorizeUpdate };
