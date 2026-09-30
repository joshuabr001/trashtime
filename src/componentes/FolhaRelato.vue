<template>
    <div class="folha" role="dialog" aria-modal="true" aria-labelledby="folha-titulo">
        <div class="folha__puxador"></div>
        <div class="folha__topo">
            <h2 class="folha__titulo" id="folha-titulo">Relatar um problema</h2>
            <button class="folha__fechar" aria-label="Fechar" @click="$emit('fechar')">×</button>
        </div>
        <p class="folha__texto">
            {{ apiUrl ? 'Seu relato será registrado no sistema e neste aparelho.' : 'Seu relato fica salvo neste aparelho.' }}
            O envio para a prefeitura ainda não está disponível.
        </p>

        <p class="campo__rotulo">O que aconteceu?</p>
        <div class="grade-tipos">
            <button class="tipo" v-for="tipo in TIPOS_RELATO" :key="tipo.id"
                    :class="{ 'tipo--ativo': tipo.id === escolhido }"
                    :aria-pressed="tipo.id === escolhido" @click="escolhido = tipo.id">
                {{ tipo.rotulo }}
            </button>
        </div>

        <label class="campo__rotulo" for="descricao-relato">Descrição (opcional)</label>
        <textarea class="campo" id="descricao-relato" rows="3" v-model="descricao" maxlength="1000"
                  placeholder="Ex.: o caminhão passou na rua mas não recolheu o lado par."></textarea>

        <div class="campo-local">
            <svg class="icone" width="16" height="16"><use href="#ic-pino" /></svg>
            <span>{{ local }}</span>
        </div>

        <p v-if="erro" class="folha__texto" role="alert">{{ erro }}</p>
        <button class="botao-principal" :disabled="!escolhido || enviando" @click="enviar">
            {{ enviando ? 'Registrando…' : 'Registrar relato' }}
        </button>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { TIPOS_RELATO } from '../dados/listas.js';
import { estado, regiaoAtual, mostrarAlerta } from '../estado/estado.js';

const emit = defineEmits(['fechar']);

const escolhido = ref(null);
const descricao = ref('');
const enviando = ref(false);
const erro = ref('');
const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
let requestId;

const local = computed(() =>
    `${regiaoAtual.value.nome} · ${estado.endereco || regiaoAtual.value.endereco}`);

function novoId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function enviar() {
    if (!escolhido.value || enviando.value) {
        return;
    }
    const tipo = TIPOS_RELATO.find((t) => t.id === escolhido.value);
    enviando.value = true;
    erro.value = '';
    let protocolo;
    let criadoEm = new Date().toISOString();
    let situacao = 'Salvo neste aparelho';
    try {
        if (apiUrl) {
            requestId ||= novoId();
            const resposta = await fetch(`${apiUrl}/api/reports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId, type: tipo.id, region: estado.regiao,
                    location: local.value, description: descricao.value.trim()
                })
            });
            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
            const salvo = await resposta.json();
            protocolo = salvo.protocol;
            criadoEm = salvo.createdAt;
            situacao = salvo.status;
        } else {
            estado.contadorProtocolo++;
            const numero = ('0000' + estado.contadorProtocolo).slice(-4);
            protocolo = 'PT-' + new Date().getFullYear() + '-' + numero;
        }
    } catch {
        erro.value = 'Não foi possível registrar no servidor. Confira a conexão e tente novamente.';
        enviando.value = false;
        return;
    }
    estado.relatos.unshift({
        protocolo,
        tipo: tipo.id,
        rotulo: tipo.rotulo,
        descricao: descricao.value.trim(),
        regiao: estado.regiao,
        situacao,
        criadoEm
    });

    escolhido.value = null;
    descricao.value = '';
    emit('fechar');
    mostrarAlerta('Relato ' + protocolo + ' registrado',
                  tipo.rotulo + ' · ainda não enviado à prefeitura.', 'ic-alerta');
    enviando.value = false;
}
</script>
