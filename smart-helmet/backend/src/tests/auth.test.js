/**
 * Unit tests for authentication and authorization.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { requireRole } = require('../middleware/auth');
const { loadConfig } = require('../config');

describe('Authentication & Authorization', () => {
  const config = loadConfig();

  test('valid JWT can be generated and verified with payload', () => {
    const payload = { id: '507f1f77bcf86cd799439011', email: 'worker@site.local', role: 'operator' };
    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' });

    const decoded = jwt.verify(token, config.jwtSecret);
    assert.equal(decoded.id, payload.id);
    assert.equal(decoded.email, payload.email);
    assert.equal(decoded.role, payload.role);
  });

  test('tampered or invalid JWT signature throws error', () => {
    const token = jwt.sign({ id: '123' }, 'wrong-secret');
    assert.throws(() => {
      jwt.verify(token, config.jwtSecret);
    });
  });

  test('expired JWT throws TokenExpiredError', () => {
    const token = jwt.sign({ id: '123' }, config.jwtSecret, { expiresIn: -1 });
    assert.throws(
      () => {
        jwt.verify(token, config.jwtSecret);
      },
      (err) => err.name === 'TokenExpiredError'
    );
  });

  test('requireRole allows authorized role', () => {
    const middleware = requireRole('admin', 'operator');
    const req = { user: { role: 'operator' } };
    let nextCalled = false;
    const res = {};
    middleware(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
  });

  test('requireRole rejects unauthorized role with 403', () => {
    const middleware = requireRole('admin');
    const req = { user: { role: 'viewer' } };
    let statusCode = 0;
    let jsonResponse = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResponse = data;
      },
    };
    let nextCalled = false;

    middleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(statusCode, 403);
    assert.equal(nextCalled, false);
    assert.ok(jsonResponse.error.includes('Insufficient permissions'));
  });
});

