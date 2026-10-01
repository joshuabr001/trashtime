# TrashTime

Protótipo acadêmico para acompanhar a coleta de lixo em Belém (PA). O morador
cadastra o endereço da coleta pelo CEP e número da casa, vê a região em um mapa
de ruas, consulta um calendário e pode registrar um problema.

## Situação atual

O [site publicado](https://trashtime-one.vercel.app/) roda o **frontend Vue 3/Vite**
na Vercel. O código do **backend NestJS/PostgreSQL** está em [`api/`](api/), mas
essa API não é publicada pela configuração atual da Vercel. Os caminhões vistos
ao redor do endereço cadastrado são gerados no navegador para demonstração;
**não são posições recebidas de rastreadores**. Não há confirmação de que um
caminhão passou pela rua, previsão real de chegada nem notificações com o app
fechado.

O projeto separa três origens de informação:

| Origem | Uso atual |
| --- | --- |
| ViaCEP | Consulta rua, bairro e cidade a partir do CEP, diretamente no navegador. |
| Photon/OpenStreetMap | Busca as coordenadas do endereço. O mapa Leaflet usa imagens de ruas do OpenStreetMap. |
| API própria (`api/`) | Recebe posições de veículos, consulta as mais recentes e grava relatos quando está hospedada e configurada. |

O mapa pode funcionar sem a API própria porque o frontend consulta ViaCEP,
Photon e os mapas públicos diretamente. A busca pelo endereço envia rua, número
e cidade ao Photon. Um resultado apenas para a rua ou instituição pode marcar um
ponto aproximado, não necessariamente a porta da casa.

## Telas

- **Mapa:** mostra o endereço de coleta, a localização atual do celular quando
  autorizada e três caminhões ilustrativos perto do endereço. A seção de
  acompanhamento exibe horários da demonstração. O mapa usa Leaflet e imagens
  do OpenStreetMap.
- **Calendário:** apresenta um mês navegável. Para os nove bairros cadastrados,
  exibe dias e horários **ilustrativos**, sem confirmação do serviço de coleta.
  Para outros bairros, informa que não há agenda cadastrada.
- **Avisos:** apresenta informações do endereço, a agenda ilustrativa quando
  disponível e relatos feitos no app. Não recebe alertas reais da prefeitura ou
  de rastreadores na configuração publicada.
- **Configurações:** permite consultar ou alterar o endereço salvo no aparelho.

Os nove bairros com calendário ilustrativo são Umarizal, Reduto, Campina,
Cidade Velha, Nazaré, São Brás, Batista Campos, Jurunas e Guamá. Um CEP de outro
bairro pode ser exibido no mapa, mas não recebe horários inventados de um desses
nove bairros.

## Tecnologias e estrutura

- Frontend: Vue 3, Vite, Leaflet, CSS próprio e armazenamento local do navegador.
- Backend: NestJS sobre Express, PostgreSQL e Dockerfile em [`api/`](api/).
- Serviços externos: ViaCEP, Photon e imagens de mapa do OpenStreetMap.

```text
src/telas/       telas Mapa, Calendário, Avisos e Configurações
src/mapa/        mapa Leaflet e mapa SVG da demonstração original
src/nucleo/      datas, geocodificação e movimentos ilustrativos
src/estado/      estado reativo e persistência no navegador
api/src/         rotas HTTP e acesso ao banco
api/sql/         estrutura de veículos, posições e relatos
```

## Executar o frontend

Na raiz do projeto:

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`. Para gerar a versão publicável, execute
`npm run build`; os arquivos saem em `dist/`. O GPS do navegador no celular
exige HTTPS. O endereço da coleta salvo continua sendo a referência mesmo se
o celular estiver em outro local.

## Executar o backend localmente

O guia completo está em [api/README.md](api/README.md). Em resumo:

1. Inicie um PostgreSQL, por exemplo com `docker compose up -d postgres` na raiz.
2. Copie `api/.env.example` para `api/.env` e configure `DATABASE_URL` e uma
   `INGEST_API_KEY` aleatória com pelo menos 24 caracteres.
3. Na pasta `api/`, execute `npm install`, `npm run migrate` e `npm run dev`.
4. Abra `http://localhost:3000/api/vehicles` para conferir a resposta da API.

Para o frontend local consultar essa API, defina
`VITE_API_URL=http://localhost:3000` em `.env.local` na raiz e reinicie o Vite.
O script `npm run simulate` dentro de `api/` pode enviar posições fictícias à
API para testar o fluxo completo de gravação e consulta.

**Limite de integração:** mesmo com `VITE_API_URL`, a tela que usa um CEP ainda
desenha os três caminhões no navegador. A consulta de posições da API é usada
no modo de mapa sem endereço por CEP. Conectar a tela do CEP às posições da API
é um trabalho pendente para demonstrar rastreamento ponta a ponta.

## API interna

| Rota | Função |
| --- | --- |
| `GET /api/vehicles` | Lista a última posição recebida de cada veículo; posições com mais de cinco minutos ficam offline. |
| `POST /api/vehicles/positions` | Recebe latitude e longitude de um rastreador ou script de teste. Exige `INGEST_API_KEY`. |
| `POST /api/reports` | Grava um relato no PostgreSQL e devolve um protocolo. |

O backend não está ligado à frota municipal nem encaminha relatos à prefeitura.
Sem `VITE_API_URL`, os relatos ficam somente no aparelho. Com a API configurada,
o formulário tenta gravá-los no PostgreSQL e mantém uma cópia local.

## Publicação

A Vercel compila o projeto Vite e publica `dist/`. O arquivo `.vercelignore`
exclui `api/` desse deploy. Para publicar o backend, é necessário um serviço
Node/Docker e um PostgreSQL acessível por ele. Configure no serviço da API
`DATABASE_URL`, `INGEST_API_KEY` e `FRONTEND_ORIGIN`; execute
`node scripts/migrate.mjs` antes de iniciar a aplicação. Depois configure a URL
HTTPS da API como `VITE_API_URL` na Vercel e faça um novo deploy do frontend.
Não coloque a chave de ingestão no frontend ou no Git.

Consulte [api/README.md](api/README.md) para detalhes do contrato HTTP e do
ambiente de desenvolvimento.
