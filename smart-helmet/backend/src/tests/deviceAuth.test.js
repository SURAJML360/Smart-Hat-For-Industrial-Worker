/**
 * Unit tests for device authentication middleware.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { deviceAuth } = require('../middleware/deviceAuth');

describe('Device Authentication Middleware', () => {
  test('should reject request when X-Device-Token is missing', () => {
    const req = {
      headers: {},
      ip: '127.0.0.1',
    };
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
    const next = () => {
      nextCalled = true;
    };

    deviceAuth(req, res, next);

    assert.equal(statusCode, 401);
    assert.ok(jsonResponse.error.includes('Device token required'));
    assert.equal(nextCalled, false);
  });

  test('should reject request when X-Device-Token is invalid', () => {
    const req = {
      headers: { 'x-device-token': 'wrong-token-12345' },
      ip: '127.0.0.1',
    };
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
    const next = () => {
      nextCalled = true;
    };

    deviceAuth(req, res, next);

    assert.equal(statusCode, 401);
    assert.ok(jsonResponse.error.includes('Invalid device token'));
    assert.equal(nextCalled, false);
  });

  test('should pass request when X-Device-Token matches configured token', () => {
    const { loadConfig } = require('../config');
    const config = loadConfig();

    const req = {
      headers: { 'x-device-token': config.deviceToken },
      ip: '127.0.0.1',
    };
    let statusCode = 0;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json() {},
    };
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    deviceAuth(req, res, next);

    assert.equal(statusCode, 0);
    assert.equal(nextCalled, true);
  });
});

