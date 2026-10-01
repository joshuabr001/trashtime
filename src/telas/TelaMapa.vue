<template>
    <section class="tela tela--ativa" id="tela-mapa">
        <header class="cabecalho">
            <div class="cabecalho__texto">
                <h1 class="cabecalho__titulo">Coleta de Lixo</h1>
                <p class="cabecalho__subtitulo">{{ estado.localCep ? `Endereço da coleta · ${estado.localCep.bairro} · CEP ${estado.localCep.cep}` : rastreamentoReal ? (simulados > 0 ? 'Demonstração com posições simuladas' : 'Posições recebidas pela API') : mapaGeografico ? 'Mapa de ruas · localização opcional' : 'Demonstração com dados simulados' }}</p>
            </div>
            <button class="cabecalho__sino" aria-label="Ver avisos" @click="irPara('avisos')">
                <svg class="icone" width="24" height="24"><use href="#ic-sino" /></svg>
                <span class="selo" v-if="naoLidos > 0">{{ naoLidos }}</span>
            </button>
        </header>

        <div class="faixa faixa--status">
            <div class="cartoes-status" :class="{ 'cartoes-status--cep': estado.localCep }">
                <div class="cartao-status">
                    <div class="cartao-status__icone">
                        <svg class="icone" width="21" height="21"><use href="#ic-caminhao" /></svg>
                    </div>
                    <div>
                        <p class="rotulo">{{ estado.localCep ? 'Caminhões no mapa' : rastreamentoReal ? 'Caminhões no mapa' : mapaGeografico ? 'Localização do morador' : 'Caminhões em rota' }}</p>
                        <p class="numerao">{{ estado.localCep ? 3 : rastreamentoReal ? contagemReal : mapaGeografico ? 'GPS' : emRota + ' de ' + frota.length }}</p>
                        <p class="rotulo">{{ estado.localCep ? 'simulados na região' : rastreamentoReal ? (simulados > 0 ? 'posições simuladas/recentes' : 'com posição recente') : mapaGeografico ? 'com sua permissão' : 'em rota na simulação' }}</p>
                    </div>
                </div>
                <div class="cartao-status">
                    <div class="cartao-status__icone">
                        <svg class="icone" width="20" height="20"><use href="#ic-calendario" /></svg>
                    </div>
                    <div>
                        <p class="rotulo">{{ estado.localCep ? 'Próxima coleta · exemplo' : rastreamentoReal ? 'Próxima coleta · previsão ilustrativa' : 'Próxima coleta' }}</p>
                        <p class="destaque">{{ proxima.dia }}</p>
                        <p class="rotulo">{{ proxima.hora }}</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="faixa faixa--principal">
            <button v-if="!rastreamentoReal && !estado.localCep" class="botao-claro" @click="mapaGeografico = !mapaGeografico">
                {{ mapaGeografico ? 'Ver mapa ilustrado' : 'Ver minha localização no mapa real' }}
            </button>
            <MapaReal v-if="estado.localCep || rastreamentoReal || mapaGeografico" :mostrar-veiculos="rastreamentoReal && !estado.localCep" :instante="agora" @atualizar="receberAtualizacao" />
            <MapaBelem v-else />

            <div v-if="estado.localCep" class="cartao-caminhao cartao-caminhao--cep">
                <span class="cartao-caminhao__ponto"></span>
                <div class="cartao-caminhao__info">
                    <p class="cartao-caminhao__nome">{{ proximoSimulado.nome }} · simulação</p>
                    <p class="cartao-caminhao__setor">Próxima passagem ilustrativa na região às {{ hora(proximoSimulado.proximaPassagemMs) }}</p>
                    <p class="cartao-caminhao__eta">Em cerca de {{ proximoSimulado.minutosAtePassagem }} min</p>
                </div>
                <button class="botao-seguir" :aria-expanded="detalhesCaminhoes" @click="detalhesCaminhoes = !detalhesCaminhoes">{{ detalhesCaminhoes ? 'Ocultar' : 'Ver 3' }}</button>
            </div>
            <div v-if="estado.localCep && detalhesCaminhoes" class="cartao cartao-mapa">
                <h2 class="cartao-mapa__titulo">Passagens da demonstração</h2>
                <div class="cartao-mapa__veiculo" v-for="caminhao in caminhoesCep" :key="caminhao.id">
                    <div class="cartao-mapa__veiculo-info">
                        <p class="linha__titulo">{{ caminhao.nome }}</p>
                        <p class="linha__texto">Passou às {{ hora(caminhao.ultimaPassagemMs) }} · próxima volta às {{ hora(caminhao.proximaPassagemMs) }}</p>
                    </div>
                    <span class="marca marca--comum cartao-mapa__tempo">{{ caminhao.minutosAtePassagem }} min</span>
                </div>
                <p class="cartao-mapa__nota">Horários e veículos simulados. Eles não confirmam a passagem da coleta real pela sua rua.</p>
            </div>

            <div v-if="!estado.localCep">
                <div class="cartao-caminhao" v-if="!estado.localCep && !rastreamentoReal && !mapaGeografico && caminhaoAtual">
                    <span class="cartao-caminhao__ponto" :style="{ background: caminhaoAtual.cor }"></span>
                    <button class="cartao-caminhao__info" @click="$emit('abrir-itinerario')">
                        <p class="cartao-caminhao__nome">{{ caminhaoAtual.nome }}</p>
                        <p class="cartao-caminhao__setor">
                            {{ caminhaoAtual.setor }} · {{ textoSituacao(caminhaoAtual) }}
                        </p>
                        <p class="cartao-caminhao__eta">
                            {{ textoChegada(caminhaoAtual) }}
                            <span class="cartao-caminhao__ver">· ver itinerário ›</span>
                        </p>
                    </button>
                    <button class="botao-seguir" :class="{ 'botao-seguir--ativo': estado.seguindo }"
                            @click="estado.seguindo = !estado.seguindo">
                        {{ estado.seguindo ? 'Seguindo' : 'Seguir' }}
                    </button>
                </div>
            </div>
        </div>

        <div class="faixa faixa--lado">
            <div class="secao">
                <div class="secao__cabecalho">
                    <h2 class="secao__titulo">Próximas coletas</h2>
                    <button class="link" @click="irPara('calendario')">Ver calendário ›</button>
                </div>
                <div v-if="estado.localCep && !regiaoCep" class="cartao cartao-mapa cartao-mapa--vazio">
                    <p class="cartao-mapa__texto">Ainda não há horários de coleta cadastrados para {{ estado.localCep.bairro }}.</p>
                </div>
                <p v-if="estado.localCep && regiaoCep" class="secao__nota">Calendário ilustrativo do bairro; confirme os horários com o serviço de coleta.</p>
                <div v-if="proximasDuas.length" class="lista">
                    <div class="item-coleta" v-for="item in proximasDuas" :key="item.chave">
                        <div class="etiqueta-data"
                             :style="{ background: item.corFundo, color: item.corTexto }">
                            <p class="etiqueta-data__dia">{{ item.rotulo }}</p>
                            <p class="etiqueta-data__data">{{ item.data }}</p>
                        </div>
                        <div class="item-coleta__meio">
                            <div class="item-coleta__linha">
                                <svg class="icone" width="12" height="12"><use href="#ic-relogio" /></svg>
                                <span class="item-coleta__hora">{{ item.hora }}</span>
                            </div>
                            <div class="item-coleta__linha">
                                <svg class="icone" width="12" height="12"><use href="#ic-pino" /></svg>
                                <span class="item-coleta__bairro">{{ estado.localCep ? REGIOES[regiaoCep].nome : regiaoAtual.nome }} · {{ estado.localCep ? 'bairro do endereço' : 'seu bairro' }}</span>
                            </div>
                        </div>
                        <span class="marca" :class="item.seletiva ? 'marca--seletiva' : 'marca--comum'">
                            {{ item.seletiva ? 'Seletiva' : 'Comum' }}
                        </span>
                    </div>
                </div>
            </div>

            <div class="banner">
                <svg class="icone" width="30" height="30"><use href="#ic-lixeira" /></svg>
                <div>
                    <p class="banner__titulo">Vamos deixar nossa cidade mais limpa</p>
                    <p class="banner__texto">
                        {{ estado.localCep && !regiaoCep ? 'Separe o reciclável do orgânico e consulte o horário de coleta do seu bairro.' : 'Separe o reciclável do orgânico e leve para a calçada até 30 min antes.' }}
                    </p>
                </div>
            </div>

            <div class="secao">
                <button class="acao-relato" @click="$emit('abrir-relato')">
                    <span class="acao-relato__icone">
                        <svg class="icone" width="21" height="21"><use href="#ic-alerta" /></svg>
                    </span>
                    <span class="acao-relato__texto">
                        <span class="acao-relato__titulo">Relatar um problema</span>
                        <span class="acao-relato__sub">
                            Coleta não realizada, lixo acumulado, horário fora do previsto
                        </span>
                    </span>
                    <span class="acao-relato__seta">›</span>
                </button>
                <MeusRelatos />
            </div>
        </div>
    </section>
</template>

<script setup>
import { computed, ref, onActivated, onDeactivated, onBeforeUnmount } from 'vue';
import MapaBelem from '../mapa/MapaBelem.vue';
import MapaReal from '../mapa/MapaReal.vue';
import MeusRelatos from '../componentes/MeusRelatos.vue';
import { estado, frota, caminhaoAtual, regiaoAtual, naoLidos, irPara } from '../estado/estado.js';
import { textoChegada, textoSituacao } from '../estado/frota.js';
import { proximasColetas, janelaDe, doisDigitos, chaveData } from '../nucleo/datas.js';
import { DIAS_SEMANA, DIAS_CURTOS } from '../dados/listas.js';
import { REGIOES, regiaoPorBairro } from '../dados/regioes.js';
import { caminhoesSimulados } from '../nucleo/simulacaoCep.js';

defineEmits(['abrir-relato', 'abrir-itinerario']);

// Os caminhões atendem bairros diferentes, então o número é do centro inteiro
const emRota = computed(() => frota.filter((c) => c.velocidade > 0).length);
const rastreamentoReal = Boolean(import.meta.env.VITE_API_URL);
const contagemReal = ref(0);
const simulados = ref(0);
const mapaGeografico = ref(false);
const detalhesCaminhoes = ref(false);
const agora = ref(Date.now());
let relogioCep = null;

function iniciarRelogioCep() {
    if (relogioCep) return;
    agora.value = Date.now();
    relogioCep = window.setInterval(() => { agora.value = Date.now(); }, 10_000);
}

function pararRelogioCep() {
    window.clearInterval(relogioCep);
    relogioCep = null;
}

onActivated(iniciarRelogioCep);
onDeactivated(pararRelogioCep);
onBeforeUnmount(pararRelogioCep);

const caminhoesCep = computed(() => caminhoesSimulados(estado.localCep, agora.value)
    .sort((a, b) => a.minutosAtePassagem - b.minutosAtePassagem));
const proximoSimulado = computed(() => caminhoesCep.value[0] || { nome: 'Nenhum', minutosAtePassagem: '—' });
const hora = (instanteMs) => new Date(instanteMs).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const regiaoCep = computed(() => regiaoPorBairro(estado.localCep?.bairro));

function receberAtualizacao(resumo) {
    contagemReal.value = resumo.online;
    simulados.value = resumo.simulados;
}

const proxima = computed(() => {
    const id = estado.localCep ? regiaoCep.value : estado.regiao;
    if (!id) return { dia: 'Sem agenda', hora: 'Horários não cadastrados para este CEP' };
    const lista = proximasColetas(id, 1);
    if (lista.length === 0) {
        return { dia: '—', hora: '—' };
    }
    const p = lista[0];
    return {
        dia: p.hoje ? 'Hoje' : DIAS_SEMANA[p.data.getDay()],
        hora: janelaDe(id, p.tipo)
    };
});

const proximasDuas = computed(() => {
    const id = estado.localCep ? regiaoCep.value : estado.regiao;
    if (!id) return [];
    return proximasColetas(id, 2).map((item) => {
    const seletiva = item.tipo === 'seletiva';
    return {
        chave: chaveData(item.data) + item.tipo,
        seletiva,
        rotulo: item.hoje ? 'HOJE' : DIAS_CURTOS[item.data.getDay()],
        data: doisDigitos(item.data.getDate()) + '/' + doisDigitos(item.data.getMonth() + 1),
        hora: janelaDe(id, item.tipo),
        corFundo: seletiva ? 'var(--ambar-claro)' : 'var(--verde-claro)',
        corTexto: seletiva ? 'var(--ambar-escuro)' : 'var(--verde-forte)'
    };
    });
});
</script>
