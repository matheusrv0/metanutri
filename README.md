# MetaNutri

Software de nutrição para quem está começando na profissão. **O diferencial é dizer o
que comer:** todo software calcula a adequação e pinta de vermelho; o MetaNutri mostra
o que falta e o botão **cobrir** sugere o alimento e a porção que fecham a falta —
nenhum concorrente brasileiro faz isso. Os macros andam ao vivo enquanto o plano é
montado. E o plano vira **missões diárias** que o paciente marca num link próprio,
com a tela de Adesão mostrando quem está sumindo — esse é o argumento de venda.
Funciona no navegador; a conta na nuvem é opcional.

Estratégia, público, preços e fases: [docs/plano-negocio.md](docs/plano-negocio.md).

## Como rodar na sua máquina

```bash
npm install     # uma vez, baixa as dependências
npm run dev     # abre em http://localhost:5173
```

Na primeira vez, o painel oferece **Ver um plano de exemplo**: um dia inteiro já
montado, para entender o sistema mexendo nele. Pode apagar depois.

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm run check` | lint + tipos + testes (o portão antes de commitar) |
| `npm run build` | gera a versão de produção em `dist/` |
| `npm run preview` | serve o `dist/` para conferir o build |
| `npx playwright test` | testes de ponta a ponta em navegador real |

Trabalhando com um agente de código? As instruções do repositório estão em
[AGENTS.md](AGENTS.md).

## As duas áreas

**Pública** (`#/inicio`, `#/precos`, `#/entrar`) — fundo escuro animado, para
explicar e vender. É o que alguém de fora vê primeiro.

**De trabalho** (o resto) — papel claro, porque tabela de nutriente se lê em papel,
por horas. A densidade e os cartões seguem a linguagem do Berry; a identidade
continua a da tabela impressa.

## O que o sistema faz

**Dois caminhos, escolhidos ao criar o plano.** *Prescrição rápida* pede só nome,
sexo, idade e a meta de kcal — serve para retorno e ajuste. *Atendimento completo*
tem antropometria, gasto energético calculado e composição corporal. O rápido vira
completo a qualquer momento; o contrário não, para não apagar medida já registrada.

**Três etapas dentro do plano.**

1. **Dados e medidas** — identificação, antropometria (IMC por faixa etária, escore-z
   da OMS para crianças, cintura, panturrilha, gestante e lactante), composição
   corporal por dobras ou bioimpedância, e o gasto energético com a fórmula à mostra.
2. **Plano alimentar** — refeições por horário, cada uma com opção principal e dois
   substitutos. Digite `150 arroz integral` e tecle Enter: a medida caseira e as kcal
   aparecem sozinhas. Os alimentos que você mais usa viram atalho com a porção de sempre,
   e a busca avisa quando a tabela só tem parte dos nutrientes daquele alimento.
   Ao lado, o **medidor de macros** anda a cada alimento: faixa recomendada em destaque,
   marcador do plano e a frase que responde à pergunta de verdade — "Faltam 6 pontos para
   a faixa", "Quase lá", "Dentro da faixa", "10 pontos acima".
3. **Adequação** — vitaminas e minerais comparados com a DRI, com o botão **cobrir**,
   que sugere até cinco alimentos de grupos diferentes para fechar a falta.

**Em volta do plano.**

- **Missões do paciente** — no fim da etapa 2, o botão **Gerar link das missões**
  transforma o plano numa lista curta que o paciente abre no celular, sem baixar app e
  sem criar conta: as refeições por horário, os vegetais, a fruta e a água. Ele toca no
  que fez; cada missão mostra de onde saiu. Gerar o link de novo atualiza as missões com
  o plano atual e derruba o link antigo, mantendo o histórico.
- **Adesão** — a tela que responde "quem está sumindo?". Quem passou 4 dias sem marcar
  aparece no topo, quem marcou em 4 dias ou mais na semana aparece como *em dia*. É
  também onde você vê quantos pacientes ativos tem contra o limite do seu plano.
- **Pacientes** — ficha com restrições, condições clínicas, medicamentos, anamnese,
  histórico de planos e evolução do peso. O plano nasce já sabendo o que a ficha sabe,
  e o retorno começa duplicando o plano anterior.
- **Tabela de alimentos** — os 597 da TACO navegáveis: busca, filtro por categoria e por
  completude do dado, ordenação, e a composição inteira de cada alimento com as medidas
  caseiras. "Não analisado" é falta de medição, não zero.
- **Meus produtos** — industrializado não está na tabela de composição. Cadastre pelo
  rótulo, lendo o código de barras pela câmera ou digitando; os dados vêm da Open Food
  Facts para você conferir com a embalagem. Depois ele entra no plano como qualquer alimento.
- **Trocas** — a folha do paciente sai com uma lista de trocas: mesmo grupo, mesma
  energia, em medida caseira, respeitando as restrições da ficha. Doce e ultraprocessado
  não entram como equivalente de comida.
- **Exportar** — dieta para imprimir (vira PDF pelo próprio navegador), aconselhamento
  em Word no modelo do estágio, memorial de cálculo em Word e a tabela de adequação
  copiada para colar no Word.
- **Configurações** — seu nome e registro na linha de responsabilidade, marca na folha
  do paciente, backup em arquivo e **cópia na nuvem** (enviar deste aparelho, trazer
  para este aparelho). A cópia não é automática de propósito: cada botão sobrescreve
  um lado, e você escolhe qual — mesclar dois aparelhos sozinho é como se perde plano.
- **Conta e plano** — entrar, sair e ver a assinatura. Funciona sem conta; veja abaixo.

## Conta na nuvem (opcional)

O sistema roda inteiro sem conta: tudo fica no navegador. A conta serve para usar em
mais de um aparelho e, no futuro, para cobrar.

Para ligar:

1. Crie um projeto em <https://supabase.com> (o plano gratuito serve)
2. Em **Project Settings > API**, copie a *Project URL* e a chave *anon public*
3. `cp .env.example .env.local` e cole as duas
4. Em **SQL Editor > New query**, cole e rode os arquivos de [supabase/](supabase/) na
   ordem: `001-acompanhamentos.sql` (missões), `002-copia-na-nuvem.sql` (cópia dos
   dados), `003-assinaturas.sql` (cobrança) e `004-uso-nao-comercial.sql` (aviso de
   conta de estágio)
5. Reinicie o `npm run dev`

Com isso o link do paciente passa a abrir no celular dele. Sem o passo 4, a conta
funciona mas as missões continuam só neste navegador.

Por que duas funções em vez de acesso direto à tabela: o paciente não tem conta, e
uma política de RLS não consegue conferir um token que o próprio visitante afirma ter
— liberar leitura anônima vazaria os pacientes de todo mundo. As funções recebem o
token e trabalham numa linha só.

Sem isso, a tela de conta explica o que falta e o app segue normal. **Nunca** coloque
a chave `service_role` no `.env.local`: ela dá acesso total ao banco e iria para o
navegador de quem abrir o site.

### Preços

Os cinco planos aprovados em 26/09/2026 estão em
[src/domain/conta.ts](src/domain/conta.ts) — mude lá e a página de preços acompanha:
Free R$ 0 (2 pacientes ativos), Estudante R$ 0 com comprovante (10), Solo R$ 34,90 ou
R$ 299/ano (25), Pro R$ 64,90 ou R$ 599/ano (ilimitado) e Clínica R$ 149/mês.

A unidade de cobrança é o **paciente ativo**: quem teve plano ou missão nos últimos 30
dias (`ehPacienteAtivo`). **Nada é cobrado nem bloqueado hoje**: sem meio de pagamento,
aplicar limite seria mentira (a constante `LIMITES_ATIVOS` registra isso). A tela de
Adesão já mostra quantos ativos você tem contra o limite do plano.

## Cobrança (Mercado Pago)

O código está pronto; falta configurar. O pagamento acontece **no Mercado Pago**:
nenhum dado de cartão passa pelo MetaNutri.

Por que existe servidor aqui: o access token do Mercado Pago dá poder de cobrar em
nome do dono da conta. Se ele fosse para o navegador, qualquer pessoa que abrisse o
site emitiria cobrança. Por isso ele vive só nas Edge Functions.

1. Rode `supabase/003-assinaturas.sql` no SQL Editor
2. Em <https://www.mercadopago.com.br/developers/panel> crie uma aplicação para o
   MetaNutri e copie o **access token de produção**
3. Instale a CLI e entre:
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref qmpljfjbdcrdbqutuvmg
   ```
4. Guarde o token no servidor (ele nunca entra no repositório):
   ```bash
   supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
   supabase secrets set SITE_URL=https://matheusrv0.github.io/metanutri/
   ```
5. Publique as duas funções:
   ```bash
   supabase functions deploy assinar
   supabase functions deploy webhook-mercadopago --no-verify-jwt
   ```
   O `--no-verify-jwt` é obrigatório na segunda: quem chama é o Mercado Pago, que não
   tem conta no seu Supabase.
6. No painel do Mercado Pago, cadastre o webhook apontando para
   `https://qmpljfjbdcrdbqutuvmg.supabase.co/functions/v1/webhook-mercadopago`,
   evento **Assinaturas**. Copie a chave secreta que ele mostra e guarde:
   ```bash
   supabase secrets set MERCADOPAGO_WEBHOOK_SECRET=...
   ```

Sem o passo 6 o sistema funciona, mas ninguém sai de "pendente": é a notificação do
Mercado Pago que confirma o pagamento. E sem o segredo, a função aceita notificação de
qualquer um — inclusive de alguém dizendo que pagou.

**Teste antes de valer dinheiro:** use as credenciais de teste e um usuário de teste
do Mercado Pago. Assinatura pendente não libera plano pago, de propósito.

## A marca

O kit do designer (logo provisória, 27/09/2026) está em `public/` (favicons e ícones do
app) e `public/marca/` (o símbolo em quatro versões). A marca entra na tela **só pelo
componente `Logo`** (`design-system/componentes/display/Logo.tsx`): ele escolhe a versão
certa do símbolo para cada tema e escreve o nome na fonte do kit. As cores — teal
`#0e3b43`, laranja `#f26a2e`, marfim `#f6f2ea` — viraram tokens em `DESIGN.md`, com uma
regra que vale saber: o laranja é grafismo e nunca carrega texto. Quando a versão final
da logo chegar, basta trocar os arquivos mantendo os nomes.

## De onde vêm os números

| Assunto | Fonte |
|---|---|
| Composição dos alimentos | NEPA/UNICAMP. TACO, 4ª edição, 2011 (597 alimentos) |
| Medidas caseiras | IBGE. POF 2008-2009 |
| Referências de ingestão | NASEM. DRI, Apêndice J, 2019 |
| Energia | NASEM 2023 · Mifflin-St Jeor 1990 · Harris-Benedict 1918 |
| Crescimento | OMS 2006 e 2007 |
| Classificação antropométrica | Ministério da Saúde. SISVAN, 2011 |
| Ganho de peso na gestação | Kac G, Carrilho TRB et al. Am J Clin Nutr, 2021 |
| Dobras cutâneas | Jackson e Pollock 1978/1980 · Siri 1961 · Faulkner 1968 |
| Produtos de rótulo | Open Food Facts |

Cada número aparece na tela ao lado da própria fonte. A lista completa também está
dentro do sistema, em **Ajuda**.

## Limites que o sistema admite em tela

- A TACO não traz vitamina D, vitamina B12, folato, açúcares nem gordura saturada.
  Esses cinco só existem em produto cadastrado pelo rótulo.
- Dos 597 alimentos, apenas 6 têm todos os nutrientes preenchidos; 57,3% não têm
  vitamina A e 39,4% não têm fibra. Falta de dado vira travessão e marca de rodapé,
  nunca zero.
- Os cálculos ainda não foram conferidos por nutricionista.
- A prescrição de dieta é privativa de nutricionista com registro no CRN (Lei 8.234/1991).
- Tudo fica guardado só neste navegador. Faça backup em Configurações antes de trocar
  de aparelho.

## Como o código está organizado

```
src/domain/     regras puras, sem React: cálculo, validação, persistência (tudo testado)
src/data/       tabelas geradas por scripts/dados/*.mjs — não edite à mão
src/export/     Word (.docx) e cópia de tabela
src/ui/         telas, divididas por assunto (caso, plano, adequação, pacientes, produtos, missões)
design-system/  tokens, componentes, vitrine e referência visual
```

Regra que vale em todo o projeto: **o domínio não conhece a interface**. Se um cálculo
está numa tela, ele está no lugar errado.

## O design system

A interface inteira sai de uma biblioteca só, em [design-system/](design-system/). Os
valores de cor, fonte, espaço e raio ficam em `design-system/tokens/tokens.css`, e o que
cada um significa está escrito em [DESIGN.md](DESIGN.md) — que é o contrato visual do
projeto.

Para ver a biblioteca desenhada, com todas as variantes e estados e nos dois temas,
rode `npm run dev` e abra **<http://localhost:5173/#/design-system>**.

Duas regras valem em todo código de interface: componente novo sai da biblioteca, e
nenhum valor de cor, fonte, espaçamento ou raio vai escrito no código — sempre token.
O `npm run check` cobra as duas. O mapa da biblioteca e o passo a passo para criar um
componente estão em [design-system/LEIA-ME.md](design-system/LEIA-ME.md).

As telas originais do sistema, como o Claude Design as entregou, ficam guardadas em
`design-system/referencia/` — abra `referencia/index.html` no navegador.

## Publicar na internet

O build é estático e o app roda inteiro no navegador, então qualquer hospedagem de
arquivo serve. Já existe um fluxo pronto para o GitHub Pages:

1. No repositório, **Settings > Pages**, escolha **GitHub Actions** como origem.
2. Em **Actions > Publicar no GitHub Pages**, clique em **Run workflow**.

Ele só roda quando você manda — nada é publicado sozinho.

## O que ainda depende de você

Conta de usuário, cobrança, link do plano para o paciente e política de privacidade
estão descritos, com o porquê de não terem sido feitos, em
[docs/pendencias.md](docs/pendencias.md).

## Licença e dados de terceiros

Ver [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
