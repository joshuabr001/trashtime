# API de rastreamento

Backend NestJS com Express e PostgreSQL. As posições só aparecem depois que
um sistema autorizado as envia. Este repositório não tem acesso à frota real.

## Desenvolvimento

1. Inicie o PostgreSQL. Se tiver Docker, execute `docker compose up -d postgres`
   na raiz do projeto. Esse `compose.yaml` cria um banco **somente para
   desenvolvimento**, acessível em `localhost:5432`. Também é possível usar
   uma instalação própria ou um PostgreSQL hospedado.
2. Copie `.env.example` para `.env` nesta pasta e preencha `DATABASE_URL` e
   `INGEST_API_KEY` com um segredo aleatório de pelo menos 24 caracteres.
3. Execute nesta pasta:

```bash
npm install
npm run migrate
npm run dev
```

Em outro terminal, execute `npm run smoke` na pasta `api/` para conferir a
gravação e consulta de uma posição e a persistência de um relato. O teste grava
dados fictícios no banco. A migração é repetível e agora cria também `reports`.

A API abre em `http://localhost:3000`. Para ativar o mapa real no frontend,
adicione `VITE_API_URL=http://localhost:3000` ao `.env.local` da raiz e execute
`npm run dev` na raiz. Preserve as variáveis que já estiverem nesse arquivo.
O frontend consulta a API a cada 15 segundos. Uma posição com mais de cinco
minutos deixa de aparecer no mapa.

## Simular sem rastreador

Para ver somente a demonstração original em SVG, não configure `VITE_API_URL`
no frontend. Os caminhões já se movem localmente, sem API nem PostgreSQL.

Para testar o caminho completo com o mapa Leaflet, inicie o PostgreSQL e a API
como descrito acima. Em outro terminal, na pasta `api/`, execute:

```bash
npm run simulate
```

O script envia posições fictícias dos nove caminhões a cada 15 segundos para
a API local. As trajetórias são retângulos ilustrativos perto dos bairros e
não representam ruas ou coleta reais. Abra o frontend com `VITE_API_URL`
configurada; a tela identifica essas posições como **simulação**. Encerre com
Ctrl+C. Após cinco minutos sem novas amostras, os marcadores somem do mapa.
As amostras permanecem no histórico do banco com `source = 'simulation'`.

## Contrato para o sistema de rastreamento

`POST /api/vehicles/positions` com `Authorization: Bearer <INGEST_API_KEY>`
e corpo JSON:

```json
{
  "vehicleId": "ct104",
  "latitude": -1.4558,
  "longitude": -48.4902,
  "accuracyM": 10,
  "recordedAt": "2026-09-30T12:00:00.000Z",
  "source": "tracker"
}
```

`vehicleId` deve ser um dos nove IDs cadastrados na migração. `accuracyM` é
opcional. `source` pode ser `tracker` (padrão) ou `simulation`. O horário da
amostra deve ser fornecido em ISO 8601. O endpoint exige
o segredo; nunca coloque esse segredo no frontend ou no Git.

`GET /api/vehicles` devolve os veículos com a posição mais recente, ou
`latitude` e `longitude` nulos se ainda não receberam nenhuma. `online` só
é verdadeiro quando a posição tem no máximo cinco minutos.

## Relatos

Com `VITE_API_URL` configurada, o formulário envia `POST /api/reports` com
`requestId` (UUID v4), `type`, `region`, `location` e `description`. A API valida
esses campos, grava o relato no PostgreSQL e devolve `protocol`, `createdAt` e
`status`. Repetir a mesma requisição com o mesmo `requestId` devolve o mesmo
protocolo, sem criar outro relato. Uma cópia continua salva no aparelho para o
morador consultar. Sem API configurada, o relato continua somente local.

Os relatos são recebidos **pelo projeto**, não pela prefeitura. Este protótipo
não tem encaminhamento oficial nem painel de gestão dos relatos.

## Preparação para hospedagem

O `Dockerfile` desta pasta permite hospedar a API em um serviço que execute
contêineres. Configure `DATABASE_URL`, `INGEST_API_KEY` (mínimo 24 caracteres),
`FRONTEND_ORIGIN` (URL HTTPS do site) e `PORT` conforme o serviço. Execute a
migração `node scripts/migrate.mjs` com `DATABASE_URL` configurada antes de
liberar a API. A URL pública HTTPS da API deve ser colocada em `VITE_API_URL`
no build do frontend. O banco do `compose.yaml` usa senha de desenvolvimento;
não o publique na internet.

O mapa usa as imagens públicas do OpenStreetMap apenas para desenvolvimento e
piloto pequeno. Para produção, escolha um serviço de mapas com capacidade e
termos adequados ao tráfego do app.

Quando o fornecedor do rastreamento for conhecido, será necessário adaptar
seus IDs e formato de dados para este contrato. Se ele oferecer apenas uma API
de consulta, será preciso criar um processo que consulte essa API e envie as
posições para cá. A aplicação atual na Vercel publica só o frontend; esta API
precisa de hospedagem Node e de um PostgreSQL acessível por ela.
