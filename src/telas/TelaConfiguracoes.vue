<template>
    <section class="tela tela--ativa" id="tela-config">
        <header class="cabecalho cabecalho--simples">
            <div class="cabecalho__texto">
                <h1 class="cabecalho__titulo">Configurações</h1>
                <p class="cabecalho__subtitulo">Endereço da coleta e preferências</p>
            </div>
        </header>

        <div class="faixa faixa--principal">
            <div v-if="estado.localCep" class="cartao">
                <p class="linha__titulo">Seu CEP: {{ estado.localCep.cep }}</p>
                <p class="linha__texto">{{ estado.localCep.bairro }} · {{ estado.localCep.cidade }}/{{ estado.localCep.estado }}</p>
                <p class="linha__texto">{{ estado.localCep.rua || 'Rua não informada' }}, {{ estado.localCep.numero || 'número não informado' }}</p>
                <p class="linha__texto">{{ estado.localCep.precisao === 'numero' ? 'Casa localizada pelo endereço completo.' : estado.localCep.precisao === 'instituicao' ? 'Local identificado pela instituição associada ao CEP.' : 'Rua localizada; número não disponível no mapa.' }} Os caminhões são simulados.</p>
            </div>
            <div class="cartao" style="margin-top: 10px">
                <div class="linha">
                    <div>
                        <p class="linha__titulo">Endereço da coleta</p>
                        <p class="linha__texto">{{ enderecoAtual }}</p>
                    </div>
                    <button class="botao-claro" @click="$emit('alterar-endereco')">Alterar</button>
                </div>
            </div>
        </div>

        <div class="faixa faixa--lado">
            <p class="secao__rotulo">APARÊNCIA</p>
            <div class="cartao">
                <div class="linha">
                    <div>
                        <p class="linha__titulo">Modo escuro</p>
                    </div>
                    <button class="interruptor" :class="{ 'interruptor--ligado': escuro }"
                            role="switch" :aria-checked="escuro ? 'true' : 'false'"
                            aria-label="Modo escuro" @click="trocarTema(!escuro)">
                        <span class="interruptor__bolinha"></span>
                    </button>
                </div>
            </div>

            <p class="secao__rotulo">NOTIFICAÇÕES</p>
            <div v-if="estado.localCep" class="cartao">
                <p class="linha__titulo">Avisos de chegada ainda indisponíveis</p>
                <p class="linha__texto">O endereço da casa está salvo, mas não há rastreamento real nem envio de notificações com o app fechado. O GPS do celular não altera o endereço da coleta.</p>
            </div>
            <div v-else class="cartao">
                <div class="linha" v-for="item in INTERRUPTORES" :key="item.id">
                    <div>
                        <p class="linha__titulo">{{ item.titulo }}</p>
                        <p class="linha__texto">{{ item.texto }}</p>
                    </div>
                    <button class="interruptor"
                            :class="{ 'interruptor--ligado': estado.config[item.id] }"
                            role="switch" :aria-checked="estado.config[item.id] ? 'true' : 'false'"
                            :aria-label="item.titulo"
                            @click="estado.config[item.id] = !estado.config[item.id]">
                        <span class="interruptor__bolinha"></span>
                    </button>
                </div>
            </div>

            <div class="bloco-distancia" v-if="!estado.localCep && estado.config.proximidade">
                <p class="bloco-distancia__rotulo">Avisar quando o caminhão estiver a</p>
                <div class="chips chips--interno">
                    <button class="chip" v-for="valor in DISTANCIAS" :key="valor"
                            :class="{ 'chip--ativo': valor === estado.config.distancia }"
                            @click="estado.config.distancia = valor">
                        {{ valor >= 1000 ? (valor / 1000) + ' km' : valor + ' m' }}
                    </button>
                </div>
            </div>

            <p v-if="!estado.localCep" class="secao__rotulo">LEMBRETE DE COLETA</p>
            <div v-if="!estado.localCep" class="cartao">
                <div class="linha">
                    <div>
                        <p class="linha__titulo">Lembrar na véspera</p>
                        <p class="linha__texto">Uma notificação no fim do dia anterior</p>
                    </div>
                    <span class="pilula-hora">{{ estado.config.hora }}</span>
                </div>
                <div class="chips chips--interno">
                    <button class="chip" v-for="hora in HORAS_LEMBRETE" :key="hora"
                            :class="{ 'chip--ativo': hora === estado.config.hora }"
                            @click="estado.config.hora = hora">{{ hora }}</button>
                </div>
            </div>

            <p class="nota-rodape">TrashTime · versão 2.0 · {{ rodapeDados }}</p>
        </div>
    </section>
</template>

<script setup>
import { computed } from 'vue';
import { INTERRUPTORES, DISTANCIAS, HORAS_LEMBRETE } from '../dados/listas.js';
import { estado, regiaoAtual } from '../estado/estado.js';
import { temaAtual, trocarTema } from '../estado/tema.js';

defineEmits(['alterar-endereco']);

const escuro = computed(() => temaAtual() === 'escuro');

const enderecoAtual = computed(() => estado.endereco || regiaoAtual.value.endereco);
const rodapeDados = import.meta.env.VITE_API_URL
    ? 'posições recebidas pela API; calendário ilustrativo'
    : 'dados simulados';
</script>
