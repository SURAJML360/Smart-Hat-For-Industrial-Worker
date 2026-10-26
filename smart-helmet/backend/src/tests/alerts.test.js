/**
 * Unit tests for alert evaluation rules, threshold validation, and alert logic.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { thresholdSchema } = require('../validators/threshold');

describe('Alert Thresholds and Rules', () => {
  test('valid thresholds pass schema validation when critical > warning', () => {
    const valid = {
      temperatureWarningC: 45,
      temperatureCriticalC: 60,
      flameActiveHigh: true,
      deviceOfflineTimeoutS: 30,
    };
    const result = thresholdSchema.safeParse(valid);
    assert.equal(result.success, true);
  });

  test('rejects threshold when critical <= warning', () => {
    const invalid = {
      temperatureWarningC: 50,
      temperatureCriticalC: 45, // invalid!
    };
    const result = thresholdSchema.safeParse(invalid);
    assert.equal(result.success, false);
    assert.ok(result.error.issues.some((i) => i.path.includes('temperatureCriticalC')));
  });

  test('rejects threshold when critical == warning', () => {
    const invalid = {
      temperatureWarningC: 50,
      temperatureCriticalC: 50, // equal is also invalid!
    };
    const result = thresholdSchema.safeParse(invalid);
    assert.equal(result.success, false);
  });

  test('temperature alert level classification helper logic', () => {
    const warn = 45;
    const crit = 60;

    function classify(temp) {
      if (temp >= crit) return 'critical';
      if (temp >= warn) return 'warning';
      return 'normal';
    }

    assert.equal(classify(30), 'normal');
    assert.equal(classify(44.9), 'normal');
    assert.equal(classify(45.0), 'warning');
    assert.equal(classify(55.2), 'warning');
    assert.equal(classify(60.0), 'critical');
    assert.equal(classify(75.5), 'critical');
  });

  test('flame active high polarity logic', () => {
    function evaluateFlame(pinState, activeHigh) {
      return activeHigh ? pinState === 1 : pinState === 0;
    }

    // Active HIGH (HIGH pin = flame detected)
    assert.equal(evaluateFlame(1, true), true);
    assert.equal(evaluateFlame(0, true), false);

    // Active LOW (LOW pin = flame detected)
    assert.equal(evaluateFlame(0, false), true);
    assert.equal(evaluateFlame(1, false), false);
  });
});

