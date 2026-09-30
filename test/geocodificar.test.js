import test from 'node:test';
import assert from 'node:assert/strict';
import { escolherCoordenadas } from '../src/nucleo/geocodificar.js';

const endereco = { rua: 'Travessa Campos Sales', numero: '210', cidade: 'Belém', cep: '66010000' };
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
        feature({ street: 'Travessa Campos Sales', postcode: '66100000' }, -48.49, -1.46),
        feature({ street: 'Travessa Campos Sales' }, -48.49, -1.46)
    ], endereco), null);
});
