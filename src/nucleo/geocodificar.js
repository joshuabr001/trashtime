// Busca pontual do endereço completo no Photon, baseada em dados OpenStreetMap.
// Resultados de outra rua ou cidade nunca devem ser tratados como a casa do morador.

export function nomeComparavel(valor) {
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
        .replace(/^(rua|r|avenida|av|travessa|tv|trav|alameda|passagem|praca|estrada|rodovia|rod) /, '');
}

function bairroCompativel(bairro, distrito) {
    if (!bairro || !distrito) return false;
    return bairro === distrito || bairro.startsWith(`${distrito} `) || distrito.startsWith(`${bairro} `);
}

export function escolherCoordenadas(features, endereco) {
    const rua = nomeComparavel(endereco.rua);
    const cidade = nomeComparavel(endereco.cidade);
    const numero = nomeComparavel(endereco.numero);
    const bairro = nomeComparavel(endereco.bairro);
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
        const bairroEncontrado = nomeComparavel(props.district || props.suburb || props.neighbourhood);
        const cepEspecifico = cepEncontrado && !/^\d{3}0{5}$/.test(cepEncontrado);
        if ((numeroEncontrado && numeroEncontrado !== numero) ||
            (cepEspecifico && cepEncontrado !== endereco.cep) ||
            (!numeroEncontrado && !cepEspecifico && !bairroCompativel(bairro, bairroEncontrado)) ||
            (!numeroEncontrado && bairro && bairroEncontrado && !bairroCompativel(bairro, bairroEncontrado))) return null;
        return {
            latitude, longitude,
            precisao: numeroEncontrado && numeroEncontrado === numero ? 'numero' : 'rua',
            cepConfere: Boolean(cepEspecifico),
            bairroConfere: bairroCompativel(bairro, bairroEncontrado)
        };
    }).filter(Boolean);
    candidatos.sort((a, b) =>
        Number(b.precisao === 'numero') - Number(a.precisao === 'numero') ||
        Number(b.cepConfere) - Number(a.cepConfere) ||
        Number(b.bairroConfere) - Number(a.bairroConfere));
    return candidatos[0] || null;
}

export function escolherInstituicao(features, endereco) {
    const nome = nomeComparavel(endereco.unidade);
    if (!nome) return null;
    for (const feature of features || []) {
        const props = feature.properties || {};
        const [longitude, latitude] = feature.geometry?.coordinates || [];
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
            nomeComparavel(props.countrycode) !== 'br' ||
            nomeComparavel(props.city) !== nomeComparavel(endereco.cidade) ||
            !nomeComparavel(props.name).startsWith(nome) ||
            nomeComparavel(props.street) !== nomeComparavel(endereco.rua) ||
            !bairroCompativel(nomeComparavel(endereco.bairro), nomeComparavel(props.district))) continue;
        return { latitude, longitude, precisao: 'instituicao' };
    }
    return null;
}

export async function geocodificarEndereco(endereco) {
    const params = new URLSearchParams({
        street: endereco.rua,
        housenumber: endereco.numero,
        city: endereco.cidade,
        countrycode: 'BR',
        limit: '10'
    });
    const resposta = await fetch(`https://photon.komoot.io/structured?${params}`);
    if (!resposta.ok && resposta.status !== 400) {
        const detalhe = resposta.status === 429
            ? 'O serviço de mapas atingiu o limite de consultas. Tente novamente mais tarde.'
            : `A busca no mapa falhou (HTTP ${resposta.status}). Tente novamente em instantes.`;
        throw new Error(detalhe);
    }
    if (resposta.ok) {
        const dados = await resposta.json();
        const encontrado = escolherCoordenadas(dados.features, endereco);
        if (encontrado) return encontrado;
    }
    // Photon nem sempre indexa o número na busca estruturada. A segunda consulta
    // tenta o mesmo endereço em texto, mantendo a validação da cidade e da rua.
    const texto = `${endereco.rua} ${endereco.numero}, ${endereco.cidade}, Brasil`;
    const alternativa = new URLSearchParams({ q: texto, countrycode: 'BR', limit: '10' });
    const alternativaResposta = await fetch(`https://photon.komoot.io/api?${alternativa}`);
    if (!alternativaResposta.ok) {
        throw new Error(`A busca no mapa falhou (HTTP ${alternativaResposta.status}). Tente novamente em instantes.`);
    }
    const dados = await alternativaResposta.json();
    const encontrado = escolherCoordenadas(dados.features, endereco);
    if (encontrado || !endereco.unidade) return encontrado;
    // CEP de grande usuário: o prédio pode existir como instituição, sem
    // número cadastrado como endereço residencial no OpenStreetMap.
    const local = new URLSearchParams({
        q: `${endereco.unidade} ${endereco.cidade}`, countrycode: 'BR', limit: '5'
    });
    const respostaInstituicao = await fetch(`https://photon.komoot.io/api?${local}`);
    if (!respostaInstituicao.ok) return null;
    const instituicoes = await respostaInstituicao.json();
    return escolherInstituicao(instituicoes.features, endereco);
}
