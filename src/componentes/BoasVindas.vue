<template>
    <div class="boas-vindas">
        <div class="boas-vindas__marca">
            <span class="boas-vindas__icone">
                <svg class="icone" width="34" height="34"><use href="#ic-caminhao" /></svg>
            </span>
            <h1 class="boas-vindas__titulo">TrashTime</h1>
            <p class="boas-vindas__texto">Cadastre o endereço da coleta na sua casa. Ele continua sendo a referência mesmo quando você estiver em outro lugar.</p>
        </div>

        <label class="campo__rotulo" for="boas-vindas-cep">CEP da residência</label>
        <input class="campo" id="boas-vindas-cep" type="text" inputmode="numeric"
               autocomplete="postal-code" maxlength="9" placeholder="00000-000" v-model="cep"
               @keyup.enter="buscarCep">
        <button class="botao-claro" :disabled="buscando" @click="buscarCep">
            {{ buscando ? 'Buscando…' : 'Buscar endereço' }}
        </button>

        <template v-if="enderecoEncontrado">
            <p class="campo__rotulo">{{ enderecoEncontrado.bairro }} · {{ enderecoEncontrado.cidade }}/{{ enderecoEncontrado.estado }}</p>
            <label class="campo__rotulo" for="boas-vindas-rua">Rua da residência</label>
            <input class="campo" id="boas-vindas-rua" type="text" autocomplete="street-address"
                   maxlength="160" placeholder="Nome da rua" v-model="rua">
            <label class="campo__rotulo" for="boas-vindas-numero">Número da casa</label>
            <input class="campo" id="boas-vindas-numero" type="text"
                   maxlength="20" placeholder="Ex.: 123 ou s/n" v-model="numero">
            <p class="campo__rotulo">Confira a rua e o número. O ponto no mapa é aproximado pelo CEP; os caminhões são simulados.</p>
        </template>

        <p v-if="erro" class="campo__rotulo" role="alert">{{ erro }}</p>
        <button class="botao-principal" :disabled="!enderecoEncontrado || buscando" @click="confirmar">
            {{ edicao ? 'Salvar endereço da coleta' : 'Começar' }}
        </button>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { estado } from '../estado/estado.js';

const props = defineProps({ edicao: { type: Boolean, default: false } });
const emit = defineEmits(['pronto']);

const cep = ref(props.edicao && estado.localCep ? estado.localCep.cep : '');
const enderecoEncontrado = ref(props.edicao && estado.localCep ? { ...estado.localCep } : null);
const rua = ref(props.edicao && estado.localCep ? estado.localCep.rua || '' : '');
const numero = ref(props.edicao && estado.localCep ? estado.localCep.numero || '' : '');
const erro = ref('');
const buscando = ref(false);

watch(cep, (novo) => {
    if (novo.replace(/\D/g, '') !== enderecoEncontrado.value?.cep) {
        enderecoEncontrado.value = null;
    }
    erro.value = '';
});

async function buscarCep() {
    const codigo = cep.value.replace(/\D/g, '');
    if (codigo.length !== 8) {
        erro.value = 'Digite um CEP com 8 números.';
        return;
    }
    buscando.value = true;
    erro.value = '';
    try {
        const resposta = await fetch(`https://brasilapi.com.br/api/cep/v2/${codigo}`);
        if (!resposta.ok) throw new Error('CEP não encontrado. Confira os números.');
        const dados = await resposta.json();
        const latitude = Number(dados.location?.coordinates?.latitude);
        const longitude = Number(dados.location?.coordinates?.longitude);
        if (!dados.location?.coordinates?.latitude || !dados.location?.coordinates?.longitude ||
            !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            throw new Error('Este CEP não tem coordenadas disponíveis. Tente outro CEP próximo.');
        }
        if (cep.value.replace(/\D/g, '') !== codigo) return;
        enderecoEncontrado.value = {
            cep: codigo, latitude, longitude,
            bairro: dados.neighborhood || 'Bairro não informado',
            cidade: dados.city || '', estado: dados.state || ''
        };
        rua.value = dados.street || '';
        numero.value = '';
    } catch (falha) {
        erro.value = falha.message || 'Não foi possível consultar o CEP. Tente novamente.';
    } finally {
        buscando.value = false;
    }
}

function confirmar() {
    if (!enderecoEncontrado.value) return;
    const ruaLimpa = rua.value.trim();
    const numeroLimpo = numero.value.trim();
    if (ruaLimpa.length < 3 || !numeroLimpo) {
        erro.value = 'Informe a rua e o número da residência (ou s/n).';
        return;
    }
    estado.localCep = { ...enderecoEncontrado.value, rua: ruaLimpa, numero: numeroLimpo };
    estado.endereco = `${ruaLimpa}, ${numeroLimpo} · ${enderecoEncontrado.value.bairro} · ${enderecoEncontrado.value.cidade}`;
    estado.configurado = true;
    emit('pronto');
}
</script>
