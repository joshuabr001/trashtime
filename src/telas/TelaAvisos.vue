<template>
    <section class="tela tela--ativa" id="tela-avisos">
        <header class="cabecalho cabecalho--acao">
            <div class="cabecalho__texto">
                <h1 class="cabecalho__titulo">Avisos</h1>
                <p class="cabecalho__subtitulo">{{ resumo }}</p>
            </div>
            <button v-if="naoLidos > 0" class="botao-claro" @click="marcarTodasLidas">Marcar lidas</button>
        </header>

        <div v-if="estado.localCep" class="avisos-painel">
            <div class="cartao avisos-painel__cartao">
                <p class="linha__titulo">{{ proximaCep ? 'Próxima coleta · calendário ilustrativo' : 'Horário de coleta não cadastrado' }}</p>
                <p class="avisos-painel__destaque">{{ proximaCep ? proximaCep.dia + ' · ' + proximaCep.hora : estado.localCep.bairro }}</p>
                <p class="linha__texto">{{ proximaCep ? 'Este horário é um exemplo do bairro, não uma confirmação para sua rua.' : 'Ainda não existe agenda disponível para este endereço.' }}</p>
                <button class="link" @click="irPara('calendario')">Abrir calendário ›</button>
            </div>
            <div class="cartao avisos-painel__cartao">
                <p class="linha__titulo">Acompanhamento da coleta</p>
                <p class="linha__texto">Ainda não há rastreamento real vinculado ao seu endereço. Quando houver dados de caminhões, os avisos de chegada poderão aparecer aqui.</p>
            </div>
        </div>

        <div v-if="avisos.length" class="chips">
            <button class="chip" v-for="filtro in FILTROS" :key="filtro.id"
                    :class="{ 'chip--ativo': filtro.id === estado.filtroAvisos }"
                    @click="estado.filtroAvisos = filtro.id">{{ filtro.nome }}</button>
        </div>

        <div class="lista lista--avisos">
            <p class="vazio" v-if="visiveis.length === 0">{{ avisos.length ? 'Nenhum aviso neste filtro.' : 'Nenhum aviso recebido para este endereço.' }}</p>
            <button class="aviso" v-for="aviso in visiveis" :key="aviso.id"
                    :class="{ 'aviso--lido': aviso.lido }" @click="alternarLido(aviso.id)">
                <span class="aviso__icone" :class="{ 'aviso__icone--alerta': aviso.tipo === 'aviso' }">
                    <svg class="icone" width="21" height="21"><use :href="`#${aviso.icone}`" /></svg>
                </span>
                <span class="aviso__meio">
                    <span class="aviso__topo">
                        <span class="aviso__titulo">{{ aviso.titulo }}</span>
                        <span class="aviso__hora">{{ aviso.quando }}</span>
                    </span>
                    <span class="aviso__corpo">{{ aviso.corpo }}</span>
                </span>
                <span class="aviso__ponto"></span>
            </button>
        </div>

        <p class="nota-rodape" v-if="!estado.localCep">Avisos de demonstração</p>
    </section>
</template>

<script setup>
import { computed } from 'vue';
import { FILTROS, DIAS_SEMANA } from '../dados/listas.js';
import { estado, avisos, naoLidos, alternarLido, marcarTodasLidas, irPara } from '../estado/estado.js';
import { regiaoPorBairro } from '../dados/regioes.js';
import { proximasColetas, janelaDe } from '../nucleo/datas.js';

const ICONES = { horario: 'ic-relogio', aviso: 'ic-alerta' };
const proximaCep = computed(() => {
    const id = regiaoPorBairro(estado.localCep?.bairro);
    if (!id) return null;
    const item = proximasColetas(id, 1)[0];
    return item ? { dia: item.hoje ? 'Hoje' : DIAS_SEMANA[item.data.getDay()], hora: janelaDe(id, item.tipo) } : null;
});

const resumo = computed(() =>
    naoLidos.value === 0
        ? estado.localCep ? 'Informações do seu endereço' : 'Tudo em dia por aqui'
        : `${naoLidos.value} não lidos · toque para marcar`);

const visiveis = computed(() => avisos.value
    .filter((a) => estado.filtroAvisos === 'todos' || a.tipo === estado.filtroAvisos)
    .map((a) => ({
        ...a,
        lido: estado.lidos.indexOf(a.id) >= 0,
        icone: ICONES[a.tipo] || 'ic-caminhao'
    })));
</script>
