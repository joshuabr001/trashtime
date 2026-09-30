<template>
    <div class="mapa-real">
        <div ref="elemento" class="mapa-real__canvas" role="application" aria-label="Mapa de ruas com endereço da coleta e caminhões simulados"></div>
        <div class="mapa-real__acoes">
            <button class="botao-claro" :disabled="!contextoSeguro" @click="localizar">Mostrar onde estou agora</button>
            <button v-if="estado.localCep && mostrandoGps" class="botao-claro" @click="voltarParaCasa">Voltar ao endereço da coleta</button>
            <p v-if="estado.localCep" class="mapa-real__estado" role="status">{{ estado.localCep.precisao === 'numero' ? 'Casa localizada pelo endereço completo.' : estado.localCep.precisao === 'instituicao' ? 'Local identificado pela instituição associada ao CEP.' : 'Rua localizada; o número da casa não consta no mapa, então o ponto é aproximado.' }}</p>
            <p class="mapa-real__estado" role="status">{{ localizacaoMensagem }}</p>
        </div>
        <p class="mapa-real__estado" v-if="mostrarVeiculos" role="status">{{ mensagem }}</p>
        <p class="mapa-real__estado" v-else-if="estado.localCep" role="status">Os três caminhões laranja são ilustrativos e ficam perto do endereço da coleta. Não são veículos rastreados.</p>
    </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, onActivated, onDeactivated, ref, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { estado } from '../estado/estado.js';
import { caminhoesSimulados } from '../nucleo/simulacaoCep.js';

const props = defineProps({
    mostrarVeiculos: { type: Boolean, default: true },
    instante: { type: Number, default: () => Date.now() }
});
const emit = defineEmits(['atualizar']);
const elemento = ref(null);
const mensagem = ref('Consultando posições da frota…');
const contextoSeguro = window.isSecureContext && 'geolocation' in navigator;
const localizacaoMensagem = ref(contextoSeguro
    ? 'O endereço da coleta permanece salvo mesmo se você mostrar onde está agora.'
    : 'Para usar sua localização no celular, abra o app por HTTPS. O endereço HTTP da rede local não permite acesso ao GPS.');
const marcadores = new Map();
let mapa;
let relogio;
let ativo = false;
let marcadorUsuario;
let precisaoUsuario;
let marcadorCasa;
const mostrandoGps = ref(false);
const caminhoesDemo = [];
const iconeCasa = L.divIcon({
    className: 'marcador-casa',
    html: '<span aria-hidden="true">🏠</span>',
    iconSize: [36, 36], iconAnchor: [18, 18]
});
const iconeRua = L.divIcon({
    className: 'marcador-casa',
    html: '<span aria-hidden="true">📍</span>',
    iconSize: [36, 36], iconAnchor: [18, 18]
});

function posicionarCaminhoesDemo() {
    if (!mapa || props.mostrarVeiculos || !estado.localCep) return;
    for (const [indice, caminhao] of caminhoesSimulados(estado.localCep, props.instante).entries()) {
        const coordenada = [caminhao.latitude, caminhao.longitude];
        if (!caminhoesDemo[indice]) {
            caminhoesDemo[indice] = L.circleMarker(coordenada, {
                radius: 12, color: '#7A4600', weight: 3, fillColor: '#FFC85C', fillOpacity: 1
            }).addTo(mapa).bindTooltip(`🚛 ${caminhao.nome} · simulado`, {
                permanent: true, direction: 'top', offset: [0, -8]
            });
        } else {
            caminhoesDemo[indice].setLatLng(coordenada);
        }
    }
}

function mostrarCep() {
    if (!mapa) return;
    if (marcadorCasa) marcadorCasa.remove();
    marcadorCasa = null;
    for (const marcador of caminhoesDemo) marcador.remove();
    caminhoesDemo.length = 0;
    if (!estado.localCep) {
        mapa.setView([-1.4558, -48.4902], 13);
        return;
    }
    const { latitude, longitude, bairro } = estado.localCep;
    const ponto = [latitude, longitude];
    mapa.setView(ponto, estado.localCep.precisao === 'rua' ? 15 : 17);
    const numeroEncontrado = estado.localCep.precisao === 'numero';
    const rotulo = numeroEncontrado ? 'Casa' : estado.localCep.precisao === 'instituicao' ? 'Instituição do CEP' : 'Rua aproximada';
    marcadorCasa = L.marker(ponto, { icon: numeroEncontrado ? iconeCasa : iconeRua })
        .addTo(mapa).bindTooltip(`${rotulo} · ${bairro}`, {
            permanent: true, direction: 'bottom'
        });
    posicionarCaminhoesDemo();
    mostrandoGps.value = false;
}

watch(() => estado.localCep, mostrarCep);
watch(() => props.instante, posicionarCaminhoesDemo);

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
        mostrandoGps.value = true;
        localizacaoMensagem.value = `Localização atual obtida · precisão aproximada de ${Math.round(accuracy)} m. O endereço da coleta não mudou.`;
    }, (erro) => {
        localizacaoMensagem.value = erro.code === 1
            ? 'Permissão de localização negada. Ative-a nas configurações do navegador.'
            : 'Não foi possível obter sua localização. Verifique o GPS e tente novamente.';
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
}

function voltarParaCasa() {
    if (!mapa || !estado.localCep) return;
    mapa.setView([estado.localCep.latitude, estado.localCep.longitude], 16);
    mostrandoGps.value = false;
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
