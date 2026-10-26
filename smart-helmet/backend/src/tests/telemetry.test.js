/**
 * Unit and validation tests for telemetry ingestion.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { telemetrySchema } = require('../validators/telemetry');
const { validate } = require('../middleware/validate');

describe('Telemetry Schema and Validation', () => {
  const validPayload = {
    did: 'HELMET-001',
    seq: 42,
    tc: 34.5,
    tr: 705,
    fd: false,
    fr: 1,
    up: 123456,
    fv: '1.0.0',
  };

  test('valid payload passes schema validation', () => {
    const result = telemetrySchema.safeParse(validPayload);
    assert.equal(result.success, true);
    assert.equal(result.data.did, 'HELMET-001');
    assert.equal(result.data.tc, 34.5);
  });

  test('rejects missing required field did', () => {
    const { did, ...incomplete } = validPayload;
    const result = telemetrySchema.safeParse(incomplete);
    assert.equal(result.success, false);
    const errors = result.error.issues.map((i) => i.path[0]);
    assert.ok(errors.includes('did'));
  });

  test('rejects missing required field seq', () => {
    const { seq, ...incomplete } = validPayload;
    const result = telemetrySchema.safeParse(incomplete);
    assert.equal(result.success, false);
  });

  test('rejects NaN temperature', () => {
    const invalid = { ...validPayload, tc: NaN };
    const result = telemetrySchema.safeParse(invalid);
    assert.equal(result.success, false);
  });

  test('rejects Infinity temperature', () => {
    const invalid = { ...validPayload, tc: Infinity };
    const result = telemetrySchema.safeParse(invalid);
    assert.equal(result.success, false);
  });

  test('rejects negative raw ADC value', () => {
    const invalid = { ...validPayload, tr: -5 };
    const result = telemetrySchema.safeParse(invalid);
    assert.equal(result.success, false);
  });

  test('rejects ADC value exceeding 1023', () => {
    const invalid = { ...validPayload, tr: 1024 };
    const result = telemetrySchema.safeParse(invalid);
    assert.equal(result.success, false);
  });

  test('rejects negative sequence number', () => {
    const invalid = { ...validPayload, seq: -1 };
    const result = telemetrySchema.safeParse(invalid);
    assert.equal(result.success, false);
  });

  test('rejects invalid flameRaw not in range [0, 1]', () => {
    const invalid = { ...validPayload, fr: 2 };
    const result = telemetrySchema.safeParse(invalid);
    assert.equal(result.success, false);
  });

  test('validate middleware returns 400 with details on invalid payload', () => {
    const middleware = validate(telemetrySchema);
    const req = { body: { did: '' } };
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

    middleware(req, res, next);

    assert.equal(statusCode, 400);
    assert.equal(jsonResponse.error, 'Validation failed');
    assert.ok(jsonResponse.details.length > 0);
    assert.equal(nextCalled, false);
  });
});

