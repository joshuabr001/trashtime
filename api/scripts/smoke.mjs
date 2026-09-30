const base = (process.env.API_URL || 'http://localhost:3000').replace(/\/$/, '');
const key = process.env.INGEST_API_KEY;
if (!key) throw new Error('INGEST_API_KEY é obrigatório');

async function json(path, options = {}) {
  const response = await fetch(base + path, options);
  const body = await response.json();
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status} ${JSON.stringify(body)}`);
  return body;
}

const before = await json('/api/vehicles');
if (!Array.isArray(before) || before.length !== 9) throw new Error('Esperados nove veículos');

const position = {
  vehicleId: 'ct104', latitude: -1.4558, longitude: -48.4902,
  recordedAt: new Date().toISOString(), source: 'simulation',
};
const accepted = await json('/api/vehicles/positions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
  body: JSON.stringify(position),
});
if (!accepted.accepted) throw new Error('Posição não aceita');
const after = await json('/api/vehicles');
const vehicle = after.find((item) => item.id === position.vehicleId);
if (!vehicle?.online || vehicle.latitude !== position.latitude || vehicle.source !== 'simulation') {
  throw new Error('Posição gravada não apareceu no GET');
}

const requestId = crypto.randomUUID();
const report = {
  requestId, type: 'outro', region: 'campina',
  location: 'Campina · teste de integração', description: 'Relato de teste automatizado',
};
const first = await json('/api/reports', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report),
});
const repeated = await json('/api/reports', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report),
});
if (!first.protocol || first.protocol !== repeated.protocol) throw new Error('Relato não foi persistido de forma idempotente');
console.log('PostgreSQL + API: posição e relato gravados; GET e idempotência confirmados.');
