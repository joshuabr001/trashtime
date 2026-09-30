<template>
    <div class="boas-vindas">
        <div class="boas-vindas__marca">
            <span class="boas-vindas__icone">
                <svg class="icone" width="34" height="34"><use href="#ic-caminhao" /></svg>
            </span>
            <h1 class="boas-vindas__titulo">TrashTime</h1>
            <p class="boas-vindas__texto">
                Digite seu CEP para encontrar sua região no mapa.
            </p>
        </div>

        <label class="campo__rotulo" for="boas-vindas-cep">Seu CEP</label>
        <input class="campo" id="boas-vindas-cep" type="text" inputmode="numeric"
               autocomplete="postal-code" maxlength="9" placeholder="00000-000" v-model="cep"
               @keyup.enter="confirmar">
        <p class="campo__rotulo" role="status">{{ erroCep || 'A posição é aproximada. Os caminhões próximos são uma simulação.' }}</p>

        <button class="botao-principal" :disabled="salvando" @click="confirmar">
            {{ salvando ? 'Buscando CEP…' : edicao ? 'Salvar' : 'Começar' }}
        </button>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { estado } from '../estado/estado.js';

const props = defineProps({ edicao: { type: Boolean, default: false } });
const emit = defineEmits(['pronto']);

const cep = ref(props.edicao && estado.localCep ? estado.localCep.cep : '');
const erroCep = ref('');
const salvando = ref(false);

async function confirmar() {
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
}
</script>
