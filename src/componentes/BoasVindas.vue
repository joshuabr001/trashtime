<template>
    <div class="boas-vindas">
        <div class="boas-vindas__marca">
            <span class="boas-vindas__icone">
                <svg class="icone" width="34" height="34"><use href="#ic-caminhao" /></svg>
            </span>
            <h1 class="boas-vindas__titulo">TrashTime</h1>
            <p class="boas-vindas__texto">
                Acompanhe a coleta de lixo do seu bairro em tempo real e saiba exatamente
                quando descer o lixo.
            </p>
        </div>

        <p class="campo__rotulo">Onde você mora?</p>
        <div class="chips chips--coluna">
            <button class="chip" v-for="(regiao, id) in REGIOES" :key="id"
                    :class="{ 'chip--ativo': !usarCep && id === escolhida }" @click="usarCep = false; escolhida = id">
                {{ regiao.nome }}
                <span class="chip__detalhe">{{ regiao.comum.length }} coletas comuns por semana</span>
            </button>
            <button class="chip" :class="{ 'chip--ativo': usarCep }" @click="usarCep = true">
                Meu bairro não está na lista
                <span class="chip__detalhe">Encontrar pelo CEP no mapa</span>
            </button>
        </div>

        <template v-if="usarCep">
            <label class="campo__rotulo" for="boas-vindas-cep">Seu CEP</label>
            <input class="campo" id="boas-vindas-cep" type="text" inputmode="numeric"
                   autocomplete="postal-code" maxlength="9" placeholder="00000-000" v-model="cep">
            <p class="campo__rotulo">{{ erroCep || 'A posição encontrada é aproximada. Os caminhões próximos serão simulados.' }}</p>
        </template>

        <label v-if="!usarCep" class="campo__rotulo" for="boas-vindas-endereco">Rua e número (opcional)</label>
        <input v-if="!usarCep" class="campo" id="boas-vindas-endereco" type="text" v-model="endereco"
               :placeholder="REGIOES[escolhida || estado.regiao].endereco">

        <button class="botao-principal" :disabled="salvando || (!usarCep && !escolhida)" @click="confirmar">
            {{ salvando ? 'Buscando CEP…' : edicao ? 'Salvar' : 'Começar' }}
        </button>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { REGIOES } from '../dados/regioes.js';
import { estado, trocarRegiao } from '../estado/estado.js';

const props = defineProps({ edicao: { type: Boolean, default: false } });
const emit = defineEmits(['pronto']);

const escolhida = ref(props.edicao ? estado.regiao : null);
const endereco = ref(props.edicao ? estado.endereco : '');
const usarCep = ref(Boolean(props.edicao && estado.localCep));
const cep = ref(props.edicao && estado.localCep ? estado.localCep.cep : '');
const erroCep = ref('');
const salvando = ref(false);

async function confirmar() {
    if (usarCep.value) {
        const numero = cep.value.replace(/\D/g, '');
        if (numero.length !== 8) {
            erroCep.value = 'Digite um CEP com 8 números.';
            return;
        }
        salvando.value = true;
        erroCep.value = '';
        try {
            const resposta = await fetch(`https://brasilapi.com.br/api/cep/v2/${numero}`);
            if (!resposta.ok) throw new Error('CEP não encontrado. Confira os números.');
            const dados = await resposta.json();
            const latitude = Number(dados.location?.coordinates?.latitude);
            const longitude = Number(dados.location?.coordinates?.longitude);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
                !dados.location?.coordinates?.latitude || !dados.location?.coordinates?.longitude) {
                throw new Error('Este CEP não tem coordenadas disponíveis. Tente outro CEP próximo.');
            }
            estado.localCep = {
                cep: numero, latitude, longitude,
                bairro: dados.neighborhood || 'Bairro não informado',
                cidade: dados.city || '', estado: dados.state || '', rua: dados.street || ''
            };
            estado.endereco = [dados.street, dados.neighborhood, dados.city].filter(Boolean).join(' · ');
            estado.configurado = true;
            emit('pronto');
        } catch (erro) {
            erroCep.value = erro.message || 'Não foi possível consultar o CEP. Tente novamente.';
        } finally {
            salvando.value = false;
        }
        return;
    }
    if (!escolhida.value) {
        return;
    }
    estado.endereco = endereco.value.trim();
    estado.configurado = true;
    trocarRegiao(escolhida.value);
    emit('pronto');
}
</script>
