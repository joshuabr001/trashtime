// Dados fictícios para testar o caminho completo: script -> API -> banco -> mapa.
// Os trajetos são apenas retângulos próximos aos bairros, não ruas de coleta.
const centers = [
  ['ct052', -1.4398, -48.4891],
  ['ct063', -1.4453, -48.4962],
  ['ct104', -1.4524, -48.4999],
  ['ct118', -1.4617, -48.5030],
  ['ct090', -1.4495, -48.4855],
  ['ct071', -1.4500, -48.4720],
  ['ct076', -1.4550, -48.4814],
  ['ct085', -1.4700, -48.4870],
  ['ct099', -1.4720, -48.4680],
];

const secret = process.env.INGEST_API_KEY;
if (!secret) throw new Error('Configure INGEST_API_KEY em api/.env');

const base = process.env.SIMULATOR_API_URL || `http://localhost:${process.env.PORT || 3000}`;
const url = new URL('/api/vehicles/positions', base);
if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
  throw new Error('O simulador só envia dados para uma API local.');
}

function point(center, phase) {
  const corners = [
    [-0.001, -0.0015], [-0.001, 0.0015],
    [0.001, 0.0015], [0.001, -0.0015],
  ];
  const segment = Math.floor(phase) % 4;
  const ratio = phase - Math.floor(phase);
  const from = corners[segment];
  const to = corners[(segment + 1) % 4];
  return {
    latitude: center[1] + from[0] + (to[0] - from[0]) * ratio,
    longitude: center[2] + from[1] + (to[1] - from[1]) * ratio,
  };
}

let tick = 0;
async function publish() {
  const recordedAt = new Date().toISOString();
  await Promise.all(centers.map(async (center, index) => {
    const phase = ((tick + index * 7) % 40) / 10;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        vehicleId: center[0],
        ...point(center, phase),
        accuracyM: 10,
        recordedAt,
        source: 'simulation',
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`${center[0]}: HTTP ${response.status}`);
  }));
  tick++;
  console.log(`${recordedAt}: ${centers.length} posições simuladas enviadas`);
}

await publish();
setInterval(() => {
  publish().catch((error) => console.error('Falha ao enviar posições:', error.message));
}, 15000);
