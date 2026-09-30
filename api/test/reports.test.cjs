const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ReportsService } = require('../dist/reports.js');

const input = {
  requestId: 'a277555a-23dc-4b8f-aa0e-2578f815e089',
  type: 'acumulo', region: 'campina', location: 'Campina · Rua de teste',
  description: 'Lixo acumulado',
};

test('relato válido é gravado com parâmetros e protocolo', async () => {
  const calls = [];
  const database = {
    query: async (sql, values) => {
      calls.push({ sql, values });
      return { rows: [{ protocol: values[1], created_at: new Date('2026-09-30T12:00:00Z') }] };
    },
  };
  const saved = await new ReportsService(database).create(input);
  assert.match(saved.protocol, /^PT-\d{4}-[0-9a-f-]{36}$/);
  assert.equal(saved.status, 'Recebido pelo projeto');
  assert.match(calls[0].sql, /ON CONFLICT \(request_id\)/);
  assert.equal(calls[0].values[2], 'acumulo');
});

test('relato inválido não chega ao banco', async () => {
  let called = false;
  const service = new ReportsService({ query: async () => { called = true; } });
  await assert.rejects(service.create({ ...input, region: 'inexistente' }), { status: 400 });
  await assert.rejects(service.create({ ...input, description: 'x'.repeat(1001) }), { status: 400 });
  assert.equal(called, false);
});
