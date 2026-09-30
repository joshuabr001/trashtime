// Trajetórias ilustrativas em torno do endereço cadastrado. Nenhum rastreador
// ou serviço de coleta alimenta estes números.
const CIRCUITOS = [
    { id: 'demo-1', nome: 'Caminhão 1', periodoMin: 8, fase: 0.15 },
    { id: 'demo-2', nome: 'Caminhão 2', periodoMin: 11, fase: 0.47 },
    { id: 'demo-3', nome: 'Caminhão 3', periodoMin: 14, fase: 0.73 }
];

export function caminhoesSimulados(local, instanteMs) {
    if (!local || !Number.isFinite(local.latitude) || !Number.isFinite(local.longitude)) return [];
    const metrosPorGrauLon = 111_000 * Math.max(0.1, Math.cos(local.latitude * Math.PI / 180));
    return CIRCUITOS.map((circuito) => {
        const fase = ((instanteMs / 60_000 / circuito.periodoMin + circuito.fase) % 1 + 1) % 1;
        const angulo = 2 * Math.PI * fase;
        const distanciaM = 60 + 250 * Math.sin(Math.PI * fase);
        const ultimaPassagemMs = instanteMs - fase * circuito.periodoMin * 60_000;
        const proximaPassagemMs = ultimaPassagemMs + circuito.periodoMin * 60_000;
        return {
            id: circuito.id,
            nome: circuito.nome,
            latitude: local.latitude + distanciaM * Math.cos(angulo) / 111_000,
            longitude: local.longitude + distanciaM * Math.sin(angulo) / metrosPorGrauLon,
            distanciaM: Math.round(distanciaM),
            minutosAtePassagem: Math.max(1, Math.ceil((proximaPassagemMs - instanteMs) / 60_000)),
            ultimaPassagemMs,
            proximaPassagemMs
        };
    });
}
