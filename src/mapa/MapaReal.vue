<template>
    <div class="mapa-real">
        <div ref="elemento" class="mapa-real__canvas" role="application" aria-label="Mapa de Belém com posições recebidas da frota"></div>
        <div class="mapa-real__acoes">
            <button class="botao-claro" :disabled="!contextoSeguro" @click="localizar">Mostrar minha localização</button>
            <p class="mapa-real__estado" role="status">{{ localizacaoMensagem }}</p>
        </div>
        <p class="mapa-real__estado" v-if="mostrarVeiculos" role="status">{{ mensagem }}</p>
    </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, onActivated, onDeactivated, ref, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { estado } from '../estado/estado.js';

const props = defineProps({ mostrarVeiculos: { type: Boolean, default: true } });
const emit = defineEmits(['atualizar']);
const elemento = ref(null);
const mensagem = ref('Consultando posições da frota…');
const contextoSeguro = window.isSecureContext && 'geolocation' in navigator;
const localizacaoMensagem = ref(contextoSeguro
    ? 'Sua localização só aparece após sua autorização.'
    : 'Para usar sua localização no celular, abra o app por HTTPS. O endereço HTTP da rede local não permite acesso ao GPS.');
const marcadores = new Map();
let mapa;
let relogio;
let ativo = false;
let marcadorUsuario;
let precisaoUsuario;
let marcadorCep;
const caminhoesDemo = [];

function mostrarCep() {
    if (!mapa) return;
    if (marcadorCep) marcadorCep.remove();
    marcadorCep = null;
    for (const marcador of caminhoesDemo) marcador.remove();
    caminhoesDemo.length = 0;
    if (!estado.localCep) {
        mapa.setView([-1.4558, -48.4902], 13);
        return;
    }
    const { latitude, longitude, bairro } = estado.localCep;
    const ponto = [latitude, longitude];
    mapa.setView(ponto, 14);
    marcadorCep = L.circleMarker(ponto, {
        radius: 9, color: '#155EEF', weight: 3, fillColor: '#4C8DFF', fillOpacity: 1
    }).addTo(mapa).bindTooltip(`CEP informado · ${bairro}`);
    if (!props.mostrarVeiculos) {
        for (const [indice, deslocamento] of [[0.007, 0.004], [-0.005, 0.009], [0.003, -0.008]].entries()) {
            caminhoesDemo.push(L.circleMarker([
                latitude + deslocamento[0], longitude + deslocamento[1]
            ], {
                radius: 8, color: '#8A5800', weight: 3, fillColor: '#FFC85C', fillOpacity: 1
            }).addTo(mapa).bindTooltip(`Caminhão ${indice + 1} · posição simulada`));
        }
    }
}

watch(() => estado.localCep, mostrarCep);

function localizar() {
    if (!contextoSeguro) return;
    localizacaoMensagem.value = 'Obtendo sua localização…';
    navigator.geolocation.getCurrentPosition((posicao) => {
        if (!mapa) return;
        const { latitude, longitude, accuracy } = posicao.coords;
        const ponto = [latitude, longitude];
        if (!marcadorUsuario) {
            marcadorUsuario = L.circleMarker(ponto, {
                radius: 8, color: '#155EEF', weight: 3,
                fillColor: '#4C8DFF', fillOpacity: 1
            }).addTo(mapa).bindTooltip('Sua localização atual');
        } else {
            marcadorUsuario.setLatLng(ponto);
        }
        if (Number.isFinite(accuracy)) {
            if (!precisaoUsuario) {
                precisaoUsuario = L.circle(ponto, {
                    radius: accuracy, color: '#155EEF', weight: 1, fillOpacity: 0.08
                }).addTo(mapa);
            } else {
                precisaoUsuario.setLatLng(ponto).setRadius(accuracy);
            }
        }
        mapa.setView(ponto, 16);
        localizacaoMensagem.value = `Localização obtida · precisão aproximada de ${Math.round(accuracy)} m.`;
    }, (erro) => {
        localizacaoMensagem.value = erro.code === 1
            ? 'Permissão de localização negada. Ative-a nas configurações do navegador.'
            : 'Não foi possível obter sua localização. Verifique o GPS e tente novamente.';
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
}

async function atualizar() {
    try {
        const resposta = await fetch(`${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/vehicles`, {
            cache: 'no-store'
        });
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        const veiculos = await resposta.json();
        if (!ativo || !Array.isArray(veiculos)) return;
        let online = 0;
        let simulados = 0;
        const presentes = new Set();
        for (const veiculo of veiculos) {
            if (!veiculo.online || !Number.isFinite(veiculo.latitude) ||
                !Number.isFinite(veiculo.longitude)) continue;
            online++;
            if (veiculo.source === 'simulation') simulados++;
            presentes.add(veiculo.id);
            const coordenada = [veiculo.latitude, veiculo.longitude];
            let marcador = marcadores.get(veiculo.id);
            if (!marcador) {
                marcador = L.circleMarker(coordenada, {
                    radius: 9, color: '#14532D', weight: 3,
                    fillColor: '#2FA85A', fillOpacity: 1
                }).addTo(mapa);
                marcador.bindTooltip(veiculo.name + (veiculo.source === 'simulation' ? ' · simulação' : ''));
                marcadores.set(veiculo.id, marcador);
            } else {
                marcador.setLatLng(coordenada);
                marcador.setTooltipContent(veiculo.name + (veiculo.source === 'simulation' ? ' · simulação' : ''));
            }
        }
        for (const [id, marcador] of marcadores) {
            if (!presentes.has(id)) {
                marcador.remove();
                marcadores.delete(id);
            }
        }
        emit('atualizar', { online, simulados });
        mensagem.value = online > 0
            ? `${online} caminhão${online === 1 ? '' : 'ões'} com posição recente${simulados ? ` · ${simulados} em simulação` : ''}`
            : 'Nenhuma posição recente recebida. O rastreamento ainda não está conectado.';
    } catch {
        if (!ativo) return;
        for (const marcador of marcadores.values()) marcador.remove();
        marcadores.clear();
        emit('atualizar', { online: 0, simulados: 0 });
        mensagem.value = 'Não foi possível consultar o rastreamento. Tente novamente em instantes.';
    }
}

onMounted(() => {
    mapa = L.map(elemento.value).setView([-1.4558, -48.4902], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(mapa);
    mostrarCep();
    if (props.mostrarVeiculos) iniciar();
});

function iniciar() {
    if (!props.mostrarVeiculos) {
        window.setTimeout(() => mapa.invalidateSize(), 0);
        return;
    }
    if (relogio) return;
    ativo = true;
    window.setTimeout(() => mapa.invalidateSize(), 0);
    atualizar();
    relogio = window.setInterval(atualizar, 15000);
}

function parar() {
    ativo = false;
    window.clearInterval(relogio);
    relogio = null;
}

onActivated(iniciar);
onDeactivated(parar);
onBeforeUnmount(() => {
    parar();
    mapa?.remove();
    mapa = null;
});
</script>
