# PLAN — A dieta no celular do paciente

**Spec de origem:** `./SPEC.md` (D-150 a D-158, CA-530 a CA-552, CB-150 a CB-159)
**Status:** aprovado pelo dono em 14/10/2026 ("implemente as novidades"); concluído em 14/10/2026. Falta o dono rodar o
`supabase/012-dieta-no-link.sql` antes de publicar (D-156).

**Validação (14/10/2026):** `npm run check` (lint, typecheck e 2814 testes), `npx playwright test` (47 testes, numa
porta própria para não usar o servidor de outra cópia) e `npm run build`, tudo verde. O 012 rodou duas vezes num
Postgres local da Supabase (anon lê a dieta pela função, marcar não toca nela, 300 KB recusados), e o código
`PGRST204` do DP-154 foi conferido num PostgREST local sem a coluna. Os prints de 390 px acharam o aviso de plano
mudado espremido no celular: corrigido no commit `fix(dieta-no-link)`.

## Abordagem

A dieta do link é montada por uma função pura do domínio (`dietaDoPlano`), com a mesma regra da folha impressa
(`medidaEquivalente` para a medida caseira, o nome do alimento da tabela, "Alimento removido" quando falta), e vira um
objeto de texto (sem id de alimento, sem número além do peso). O `Acompanhamento` ganha o campo `dieta` (nulo quando
desligada). Ele já mora inteiro na cópia do aparelho (`metanutri:acompanhamentos`) e na linha da nuvem, então a dieta
viaja pelos caminhos que já existem: a cópia da conta marca o link como mudado pela diferença do JSON, e a linha da
nuvem ganha uma coluna. Nenhuma chave nova no armazenamento.

A tela do paciente lê `acompanhamento.dieta`; com dieta, mostra o seletor (`SeletorSegmentado` do design system) e a
parte nova `MeuPlano`. O cartão do link recebe a dieta de agora (`dieta`, calculada na `AreaDeTrabalho` como as missões)
e cuida da caixa, do aviso de plano mudado e do botão de atualizar, num componente novo (`CaixaDietaNoLink`).

## Decisões do plano

- **DP-150** · A caixa é um `input type="checkbox"` nativo com rótulo clicável (o padrão do checkout e de Aprovações),
  não o `Switch`: o dono pediu caixa. O rótulo inteiro tem 44 px de altura.
- **DP-151** · `copiadaEm` guarda o dia do calendário de quem copiou (`diaLocal()`, AAAA-MM-DD), não a hora em UTC: às 22h
  de Brasília a hora em UTC já é o dia seguinte, e o paciente leria a data errada.
- **DP-152** · O cartão recebe a dieta de agora como propriedade opcional. Sem ela (só nos testes antigos), o cartão é o de
  hoje e o link sai sem dieta. Na `AreaDeTrabalho` ela sempre vai.
- **DP-153** · Comparar a dieta do link com a do plano compara só o conteúdo (refeições, orientações, receitas), nunca o
  dia da cópia.
- **DP-154** · Banco sem o 012 (CB-151): o PostgREST recusa a coluna que não conhece com o código `PGRST204` e o nome da
  coluna na mensagem. Só nesse caso o mesmo pedido vai de novo sem a coluna `dieta`. Qualquer outro erro segue como hoje.
- **DP-155** · A leitura da dieta (`lerDieta`) monta um objeto novo só com os campos conhecidos: o que vier a mais da
  nuvem (kcal, por exemplo) nunca chega à tela (CA-534, CB-153).
- **DP-156** · A trava de tamanho nova entra em `TRAVAS_DE_TAMANHO` com uma frase própria, e o cartão a trata como a do
  link grande demais: sem "Tentar de novo".

## Arquivos (na ordem de execução)

| Arquivo | Ação | Motivo |
|---|---|---|
| `src/domain/dietaDoLink.ts` (+ teste) | criar | a cópia da dieta: montar, comparar, ler (T1) |
| `src/domain/acompanhamento.ts` (+ teste) | alterar | campo `dieta`; `criarAcompanhamento` e `regerarLink` (T2) |
| `src/domain/repositorioAcompanhamentos.ts` (+ teste) | alterar | dado antigo sem o campo lê como sem dieta (T2) |
| `src/domain/copiaDaConta.test.ts` | alterar | mudar só a dieta marca o link como mudado (T2) |
| testes que montam `Acompanhamento` à mão | alterar | o campo novo é obrigatório no tipo (T2) |
| `supabase/012-dieta-no-link.sql` | criar | coluna, trava de tamanho e função do paciente (T3) |
| `src/data/sqlDietaNoLink.test.ts` | criar | testes de texto do 012 (T3) |
| `src/domain/fonteSupabase.ts` (+ teste) | alterar | ler e gravar a coluna; banco sem o 012 (T4) |
| `src/ui/estado/mensagemDoBanco.ts` (+ teste) | alterar | a trava `acompanhamentos_dieta_tamanho` (T4) |
| `src/ui/missoes/MeuPlano.tsx` | criar | a parte "Meu plano" da tela do paciente (T5) |
| `src/ui/missoes/TelaMissoesPaciente.tsx` (+ teste) | alterar | o seletor e as duas partes (T5) |
| `src/seguranca/xssTelas.test.tsx` | alterar | o texto da dieta aparece como texto na tela pública (T5; acrescentado durante a T5) |
| `src/ui/missoes/CaixaDietaNoLink.tsx` | criar | a caixa, o aviso de plano mudado e o botão de atualizar (T6) |
| `src/ui/missoes/CartaoLinkMissoes.tsx` | alterar | usa a caixa; gerar, ligar, desligar e atualizar a dieta (T6) |
| `src/ui/missoes/missoesNutricionista.test.tsx`, `missoesNaNuvem.test.tsx` | alterar | testes do cartão (T6) |
| `src/ui/AreaDeTrabalho.tsx` | alterar | passa a dieta de agora para o cartão (T6) |
| `src/ui/publico/TelaPrivacidade.tsx`, `src/ui/publico/legal.test.tsx` | alterar | o item da dieta no link (T7) |
| `src/domain/legal.ts`, `src/domain/legal.test.ts` | alterar | versão `2026-10-14` (T7) |
| `docs/lgpd-rascunhos.md` | alterar | o consentimento cita o plano alimentar no link (T7) |
| `e2e/missoes.spec.ts` | alterar | do plano à dieta no celular, em 360 px (T8) |
| `README.md`, `docs/pendencias.md` | alterar | o 012 na lista e a ordem: rodar antes de publicar (T8) |

## Tarefas

- [x] **T1** — `dietaDoLink.ts`: tipos `ItemDaDieta`, `RefeicaoDaDieta`, `DietaDoPlano` e `DietaDoLink`; `dietaDoPlano(caso,
  plano, buscar)`, `copiarDieta(dieta, dia)`, `dietaMudou(noLink, doPlano)`, `lerDieta(valor)` e `temDieta(dieta)`.
  - Depende de: —
  - Cobre: CA-531, CA-532, CA-533, CA-534 e CA-546 (domínio), D-155, CB-153, CB-155, CB-156, CB-159
  - Feito quando: testes com o plano padrão (arroz no almoço com batata de substituto, macarrão no jantar), refeição
    vazia, opção vazia, produto próprio, alimento removido, sem medida caseira, orientações com quebra de linha,
    comparação que ignora o dia, leitura de lixo e de campo a mais.
- [x] **T2** — `Acompanhamento.dieta: DietaDoLink | null`; `criarAcompanhamento` recebe a dieta (padrão nulo);
  `regerarLink` troca a dieta quando ela vem e mantém quando não vem; o repositório lê o item antigo sem o campo como
  sem dieta e descarta dieta estragada.
  - Depende de: T1
  - Cobre: CB-150, CA-551, base de CA-540, CA-541, CA-547
  - Feito quando: testes do domínio e do repositório; teste da cópia da conta (mudar só a dieta gera a marca
    `acompanhamentos/<id>`); `npm run typecheck` verde.
- [x] **T3** — `supabase/012-dieta-no-link.sql` e o teste de texto.
  - Depende de: —
  - Cobre: CA-550, CA-549 (lado do banco)
  - Feito quando: o teste confere coluna opcional, trava pelo nome com 262144, função refeita com a coluna, security
    definer, search_path, revoke e grant, `marcar_missoes` fora do arquivo, nada destrutivo e o recarregar do PostgREST.
- [x] **T4** — `fonteSupabase`: `daLinha` lê a dieta (`lerDieta`), a linha gravada leva a dieta (nula quando desligada),
  e o pedido recusado com `PGRST204` por causa da coluna `dieta` vai de novo sem ela (criar, atualizar e subir).
  `mensagemDoBanco`: `acompanhamentos_dieta_tamanho` vira `DIETA_GRANDE_DEMAIS`.
  - Depende de: T2
  - Cobre: CA-548, CA-549, CB-151, CB-152 (frase), CB-158
  - Feito quando: testes da leitura com e sem a coluna, da gravação com dieta e com nulo, do pedido repetido sem a
    coluna (e só nesse erro), da marcação do paciente sem a dieta e da frase da trava.
- [x] **T5** — Tela do paciente: `MeuPlano` (refeições, "ou", orientações, receitas, "Atualizada em …") e o seletor em
  `TelaMissoesPaciente`.
  - Depende de: T2
  - Cobre: CA-530, CA-531, CA-532, CA-533, CA-534, CA-536, CA-537, CA-538, CB-159 (tela); CA-535 fica para o e2e (T8)
  - Feito quando: testes da tela com dieta, sem dieta, com dieta vazia, com aviso de estágio e sem "kcal" no texto.
- [x] **T6** — Cartão do link: `CaixaDietaNoLink` e as ações em `CartaoLinkMissoes`; `AreaDeTrabalho` passa
  `dieta={dietaDoPlano(caso, plano)}`.
  - Depende de: T2, T4
  - Cobre: CA-539, CA-540, CA-541, CA-542, CA-543, CA-544, CA-545, CA-546 (tela), CA-547, CB-152 (cartão), CB-154
  - Feito quando: testes do cartão sem nuvem (caixa marcada por padrão, gerar com e sem, pergunta de autorização,
    ligar, desligar, aviso e atualizar, gerar link novo) e com a nuvem falsa (desligar grava a coluna vazia, falha de
    rede mantém a mudança, trava de tamanho sem "Tentar de novo").
- [x] **T7** — Política de privacidade, versão dos termos `2026-10-14` ("14 de outubro de 2026") e rascunho de
  consentimento.
  - Depende de: —
  - Cobre: CA-552, D-157
  - Feito quando: `legal.test.ts` e `legal.test.tsx` conferem a versão, a data e o item novo.
- [x] **T8** — e2e: gerar o link com a dieta (caixa marcada), abrir o link, escolher "Meu plano", ver o almoço com a
  medida caseira, e conferir em 360 px que nada rola para o lado. README e pendências com o 012 e a ordem.
  - Depende de: T5, T6
  - Cobre: CA-535, CA-540 e CA-548 de ponta a ponta no modo sem servidor, D-156 (ordem)
  - Feito quando: `npx playwright test` verde.
- [x] **T9** — Validação e prints: `npm run check`, `npx playwright test`, `npm run build`; prints do cartão e do link do
  paciente em 1280 px e 390 px na pasta de prints da frente; relatório. Nenhum arquivo do repositório.
  - Depende de: T1 a T8

## Rodada da revisão (14/10/2026)

Revisão da frente: "com correções", sem nada crítico. A SPEC mudou antes (D-153 revisto, D-154 com abas, D-159 novo,
CA-530, CA-535, CA-544, CA-545 e CA-550 revistos, CA-553 a CA-555 novos). A versão dos termos não muda nesta rodada:
quem publica acerta no dia.

| Arquivo | Ação | Motivo |
|---|---|---|
| `src/ui/missoes/MeuPlano.tsx`, `TelaMissoesPaciente.test.tsx`, `e2e/missoes.spec.ts` | alterar | texto longo quebra (R1) |
| `src/ui/missoes/CaixaDietaNoLink.tsx`, `CartaoLinkMissoes.tsx`, `missoesNutricionista.test.tsx` | alterar | autorização ao ligar (R2), missões no atualizar (R3), texto da caixa (R4), aviso sem dieta anterior (R6) |
| `src/domain/missoes.test.ts` | alterar | guarda: os ids das missões não mudam quando o plano muda (R3; acrescentado durante a R3) |
| `docs/lgpd-rascunhos.md` | alterar | o mesmo conteúdo da Política (R4) |
| `src/ui/missoes/TelaMissoesPaciente.tsx` (+ teste), `e2e/missoes.spec.ts` | alterar | abas do design system (`Tabs`), com trilho visível (R5) |
| `CartaoLinkMissoes.tsx`, `TelaAdesao.tsx`, testes do cartão, `src/seguranca/xssTelas.test.tsx`, `e2e/missoes.spec.ts`, `e2e/csp.spec.ts` | alterar | nomes do cartão (R7) |
| `supabase/012-dieta-no-link.sql`, `src/data/sqlDietaNoLink.test.ts` | alterar | transação explícita (R8) |

- **DP-157** · As abas são o `Tabs` do design system (Radix: `tablist`, `tab`, `tabpanel`, `aria-controls`, setas do
  teclado), com aparência de pílula e trilho com fio passada por `className` só nesta tela. O `SeletorSegmentado` e o
  `Tabs` não mudam para as outras telas.
- **DP-158** · "Atualizar a dieta no link" grava `missoes` (as de agora) e `dieta` no mesmo link; o token e as marcações
  não mudam. As missões novas usam os mesmos ids (`refeicao-<id da refeição>`, `frutas`, `vegetais`, `agua`).

- [x] **R1** — `[overflow-wrap:anywhere]` no nome da refeição, no alimento, nas orientações e nas receitas; teste da
  tela e o e2e de 360 px com um link do Google Drive nas orientações. Cobre CA-535, CA-554.
- [x] **R2** — Ligar a dieta num link existente pede a autorização numa linha antes de gravar. Cobre CA-544, D-159.
- [x] **R3** — "Atualizar a dieta no link" também atualiza as missões; marcações ficam. Cobre CA-545, CA-555, D-153.
- [x] **R4** — Texto da caixa e do rascunho de consentimento com refeições, substitutos, orientações e receitas. Cobre CA-553.
- [x] **R5** — Abas na tela do paciente. Cobre CA-530, CA-535, D-154.
- [x] **R6** — "O paciente ainda não vê a dieta." quando a cópia guardada está vazia. Cobre CA-545.
- [x] **R7** — "Link do paciente", "Gerar link do paciente" e "Endereço do link". Cobre CA-553, D-159.
- [x] **R8** — `begin;` e `commit;` no 012. Cobre CA-550.

**Validação da rodada (14/10/2026):** `npm run check` (2823 testes), `npx playwright test` (47, porta própria) e
`npm run build` verdes; o 012 com `begin`/`commit` rodou duas vezes num Postgres local. A mensagem do limite de links
("links de missões do seu plano") e os nomes dos planos ("Até 3 links de missões") ficaram como estavam: não fazem parte
do cartão renomeado.

## Integração com as outras frentes (15/10/2026)

- [x] **I1** · A versão dos termos passa a `2026-10-15` (a Política também cita a ficha da spec
  `anamnese-e-prescricoes`, CA-597). Altera `src/domain/legal.ts` e os testes de `legal`. Cobre CA-552.
- [x] **I2** · No cartão, as props `paciente` (WhatsApp) e `caixaDaDieta` convivem no `PainelDoLink`; o texto do
  WhatsApp cita o plano alimentar quando o link tem a dieta (CA-596 da `whatsapp-e-retorno`).
- [x] **I3** · A nota de publicação em `docs/pendencias.md` junta as três frentes: o `012` antes de publicar, depois
  publicar, depois fechar todas as abas do MetaNutri.

## Riscos e decisões para o dono revisar

- **R-150 (D-152)** · A caixa vem marcada por padrão: todo link novo leva o plano alimentar, que é dado de saúde. O
  nutricionista vê a caixa antes de gerar e a pergunta de autorização cita a dieta, mas quem não ler leva a dieta junto.
- **R-151** · A cópia da dieta também fica no aparelho do nutricionista (é ela que compara o plano e mostra o aviso), e
  por isso entra na cópia da conta, que vai até 5 MB. Cada dieta tem de 3 a 10 KB; o teto só preocupa com centenas de
  links (plano Pro).
- **R-152 (D-156, DP-154)** · Ordem de publicação: o 012 roda antes do site. Se o site for antes, o link salva sem a
  dieta; a caixa aparece marcada até a próxima leitura da nuvem, que traz o link sem dieta e desmarca a caixa. Só nessa
  janela. O pedido repetido sem a coluna depende do código `PGRST204`; se o PostgREST mudar o texto, salvar falha com a
  mensagem de rede (de novo, só sem o 012).
- **R-153** · As outras frentes das novidades também podem subir a versão dos termos para `2026-10-14` e escrever um
  `supabase/012-*.sql`: conflito previsível em `legal.ts`, nos testes de `legal` e no passo do SQL no README na hora de
  juntar os ramos.
- **R-154** · As receitas entram na dieta do link (estão na folha impressa). Se o dono preferir o link mais curto, sai só
  a seção.
