// Busca pontual do endereço completo no Photon, baseada em dados OpenStreetMap.
// Resultados de outra rua ou cidade nunca devem ser tratados como a casa do morador.

export function nomeComparavel(valor) {
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
        .replace(/^(rua|r|avenida|av|travessa|tv|trav|alameda|passagem|praca|estrada) /, '');
}

export function escolherCoordenadas(features, endereco) {
    const rua = nomeComparavel(endereco.rua);
    const cidade = nomeComparavel(endereco.cidade);
    const numero = nomeComparavel(endereco.numero);
    const candidatos = (features || []).map((feature) => {
        const props = feature.properties || {};
        const coordenadas = feature.geometry?.coordinates;
        const longitude = Number(coordenadas?.[0]);
        const latitude = Number(coordenadas?.[1]);
        if (!Array.isArray(coordenadas) || !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
            latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 ||
            nomeComparavel(props.countrycode) !== 'br' ||
            nomeComparavel(props.city) !== cidade ||
            nomeComparavel(props.street || props.name) !== rua) return null;
        const numeroEncontrado = nomeComparavel(props.housenumber);
        const cepEncontrado = String(props.postcode || '').replace(/\D/g, '');
        if ((numeroEncontrado && numeroEncontrado !== numero) ||
            (cepEncontrado && cepEncontrado !== endereco.cep) ||
            (!numeroEncontrado && !cepEncontrado)) return null;
        return {
            latitude, longitude,
            precisao: numeroEncontrado && numeroEncontrado === numero ? 'numero' : 'rua',
            cepConfere: Boolean(cepEncontrado)
        };
    }).filter(Boolean);
    candidatos.sort((a, b) =>
        Number(b.precisao === 'numero') - Number(a.precisao === 'numero') ||
        Number(b.cepConfere) - Number(a.cepConfere));
    return candidatos[0] || null;
}

export async function geocodificarEndereco(endereco) {
    const params = new URLSearchParams({
        street: endereco.rua,
        housenumber: endereco.numero,
        city: endereco.cidade,
        countrycode: 'BR',
        limit: '10'
    });
    let resposta = await fetch(`https://photon.komoot.io/structured?${params}`);
    if (resposta.status === 400) {
        // Alguns endereços são recusados pela consulta estruturada. A pesquisa
        // textual usa os mesmos dados informados, sem alterar o endereço salvo.
        const texto = `${endereco.rua} ${endereco.numero}, ${endereco.cidade}, Brasil`;
        const alternativa = new URLSearchParams({ q: texto, countrycode: 'BR', limit: '10' });
        resposta = await fetch(`https://photon.komoot.io/api?${alternativa}`);
    }
    if (!resposta.ok) {
        const detalhe = resposta.status === 429
            ? 'O serviço de mapas atingiu o limite de consultas. Tente novamente mais tarde.'
            : `A busca no mapa falhou (HTTP ${resposta.status}). Tente novamente em instantes.`;
        throw new Error(detalhe);
    }
    const dados = await resposta.json();
    return escolherCoordenadas(dados.features, endereco);
}
