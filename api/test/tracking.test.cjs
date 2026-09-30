const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TrackingService, TrackingController } = require('../dist/tracking.js');

test('somente posições recentes aparecem como online', async () => {
  const now = Date.now();
  const database = {
    query: async () => ({ rows: [
      { id: 'ct104', name: 'CT-104', region: 'Campina', latitude: -1.45, longitude: -48.49, accuracy_m: 8, recorded_at: new Date(now - 60_000), source: 'simulation' },
      { id: 'ct052', name: 'CT-052', region: 'Umarizal', latitude: -1.46, longitude: -48.5, accuracy_m: null, recorded_at: new Date(now - 10 * 60_000), source: 'tracker' },
      { id: 'ct063', name: 'CT-063', region: 'Reduto', latitude: null, longitude: null, accuracy_m: null, recorded_at: null, source: null },
    ] }),
  };
  const positions = await new TrackingService(database).latest();
  assert.deepEqual(positions.map((vehicle) => vehicle.online), [true, false, false]);
  assert.equal(positions[0].source, 'simulation');
});

test('ingestão exige segredo e valida coordenadas antes de gravar', async () => {
  const previous = process.env.INGEST_API_KEY;
  process.env.INGEST_API_KEY = 'segredo-de-teste-com-mais-de-24-caracteres';
  const calls = [];
  const database = {
    query: async (sql, values) => {
      calls.push({ sql, values });
      return { rowCount: 1, rows: [] };
    },
  };
  const controller = new TrackingController(new TrackingService(database));
  const sample = { vehicleId: 'ct104', latitude: -1.4558, longitude: -48.4902, recordedAt: new Date().toISOString() };
  try {
    assert.throws(() => controller.record('Bearer incorreto', sample), { status: 401 });
    await assert.rejects(controller.record(`Bearer ${process.env.INGEST_API_KEY}`, { ...sample, latitude: 91 }), { status: 400 });
    await assert.rejects(controller.record(`Bearer ${process.env.INGEST_API_KEY}`, { ...sample, source: 'unknown' }), { status: 400 });
    assert.equal(calls.length, 0);
    assert.deepEqual(await controller.record(`Bearer ${process.env.INGEST_API_KEY}`, sample), { accepted: true });
    assert.equal(calls.length, 2);
    assert.match(calls[1].sql, /INSERT INTO vehicle_positions/);
    assert.equal(calls[1].values[5], 'tracker');
    await controller.record(`Bearer ${process.env.INGEST_API_KEY}`, { ...sample, source: 'simulation' });
    assert.equal(calls[3].values[5], 'simulation');
  } finally {
    if (previous === undefined) delete process.env.INGEST_API_KEY;
    else process.env.INGEST_API_KEY = previous;
  }
});
