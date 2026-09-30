import test from 'node:test';
import assert from 'node:assert/strict';
import { escolherCoordenadas, escolherInstituicao, geocodificarEndereco } from '../src/nucleo/geocodificar.js';

const endereco = { rua: 'Travessa Campos Sales', numero: '210', cidade: 'Belém', bairro: 'Campina', cep: '66010000' };
const feature = (properties, longitude, latitude) => ({
    properties: { countrycode: 'BR', city: 'Belém', ...properties },
    geometry: { coordinates: [longitude, latitude] }
});

test('prefere o número exato ao ponto genérico da rua', () => {
    const ponto = escolherCoordenadas([
        feature({ street: 'Travessa Campos Sales' }, -48.49, -1.46),
        feature({ street: 'Tv. Campos Sales', housenumber: '210' }, -48.48, -1.45)
    ], endereco);
    assert.deepEqual([ponto.longitude, ponto.latitude, ponto.precisao], [-48.48, -1.45, 'numero']);
});

test('rejeita outra cidade, rua, número ou CEP', () => {
    assert.equal(escolherCoordenadas([
        feature({ city: 'Ananindeua', street: 'Travessa Campos Sales', housenumber: '210' }, -48.3, -1.3),
        feature({ street: 'Rua Siqueira Mendes', housenumber: '210' }, -48.49, -1.46),
        feature({ street: 'Travessa Campos Sales', housenumber: '220' }, -48.49, -1.46),
        feature({ street: 'Travessa Campos Sales', postcode: '66123456' }, -48.49, -1.46),
        feature({ street: 'Travessa Campos Sales', district: 'Reduto' }, -48.49, -1.46)
    ], endereco), null);
});

test('aceita a rua identificada quando o número não está cadastrado', () => {
    const ponto = escolherCoordenadas([
        feature({ street: 'Travessa Campos Sales', district: 'Campina' }, -48.49, -1.46)
    ], endereco);
    assert.equal(ponto.precisao, 'rua');
});

test('reconhece rodovia e estrada com CEP genérico como ponto aproximado da rua', () => {
    const ponto = escolherCoordenadas([
        feature({ name: 'Rodovia do Sol', district: 'Bairro Norte', postcode: '66000-000' }, -48.47, -1.33)
    ], {
        rua: 'Estrada do Sol', numero: '123', cidade: 'Belém',
        bairro: 'Bairro Norte (Distrito)', cep: '66800000'
    });
    assert.equal(ponto.precisao, 'rua');
    assert.equal(ponto.bairroConfere, true);
});

test('aceita instituição de CEP especial só quando nome, rua, bairro e cidade conferem', () => {
    const postal = {
        rua: 'Avenida das Palmeiras', cidade: 'Belém', bairro: 'Umarizal',
        unidade: 'Universidade Exemplo'
    };
    const instituicao = feature({
        name: 'Universidade Exemplo - Campus Centro',
        street: 'Avenida das Palmeiras', district: 'Umarizal'
    }, -48.48, -1.44);
    assert.equal(escolherInstituicao([instituicao], postal).precisao, 'instituicao');
    assert.equal(escolherInstituicao([instituicao], { ...postal, rua: 'Avenida do Sol' }), null);
});

test('consulta o Photon sem solicitar idioma indisponível', async () => {
    const fetchOriginal = globalThis.fetch;
    try {
        globalThis.fetch = async (url) => {
            const params = new URL(url).searchParams;
            assert.equal(params.get('lang'), null);
            assert.equal(params.get('housenumber'), '210');
            return { ok: true, json: async () => ({
                features: [feature({ street: endereco.rua, housenumber: '210', postcode: endereco.cep }, -48.49, -1.45)]
            }) };
        };
        assert.equal((await geocodificarEndereco(endereco)).precisao, 'numero');
    } finally {
        globalThis.fetch = fetchOriginal;
    }
});

test('usa pesquisa textual quando a consulta estruturada é rejeitada', async () => {
    const fetchOriginal = globalThis.fetch;
    const urls = [];
    try {
        globalThis.fetch = async (url) => {
            urls.push(String(url));
            if (urls.length === 1) return { ok: false, status: 400 };
            return { ok: true, json: async () => ({
                features: [feature({ street: endereco.rua, housenumber: endereco.numero }, -48.49, -1.45)]
            }) };
        };
        assert.equal((await geocodificarEndereco(endereco)).precisao, 'numero');
        assert.match(urls[1], /\/api\?/);
    } finally {
        globalThis.fetch = fetchOriginal;
    }
});
