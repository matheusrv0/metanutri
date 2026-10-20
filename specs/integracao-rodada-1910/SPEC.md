# SPEC — Integração da rodada de 19/10/2026

Status: **pedida pelo dono em 19/10/2026 ("resolva todo o resto"); aprovação pelas telas antes de publicar**. O dono
disse "apenas faça": as decisões abaixo estão tomadas e documentadas, sem pergunta em aberto.

**O que é:** a branch que junta as frentes prontas e revisadas da rodada, nesta ordem: `seguranca-lote-5`,
`exclusao-de-conta`, `revisao-geral-publica`, `receitas-com-calculo`, `revisao-geral-trabalho`, `vitaminas-usda` e
`conduta-da-nutricionista`. Esta spec cobre só o que a junção pede além das
quatro specs: as emendas entre elas, a data dos termos e os campos de texto no celular. As frentes que entram depois
(revisão da área de trabalho, conduta da nutricionista, vitaminas do USDA) acrescentam notas aqui.

**Faixa desta spec:** D-310 a D-319, CA-970 a CA-989, CB-310 a CB-319.

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-310 | **Item de receita marcado na cópia do link.** Na dieta copiada para o link, o item da refeição que é uma receita leva a marca `receita: true`. "Meu plano" nunca procura um item marcado na base pelo nome: mostra o nome da receita como foi escrito e a porção com o peso ao lado ("1 porção · 300 g"), como a folha impressa (spec `receitas-com-calculo`, CA-879); sem porção que feche, só o peso. Item de alimento não leva marca, e a cópia de um plano sem receita fica igual à de antes. Os ingredientes da seção "Receitas" continuam alimentos da base e seguem a D-231 da `revisao-geral-publica` | Resolve o I-2 da revisão da `revisao-geral-publica`: uma receita com o nome de um prato da base ("Feijoada", "Quindim", "Bolinho de arroz") perdia a porção no celular e divergia da folha. É seguro: nenhum link com receita existe em produção, porque as receitas nunca foram publicadas e a receita na refeição sai desligada (D-274a) |
| D-311 | **Campos de texto no celular com letra de 16 px e 44 px de altura.** Abaixo de 640 px, o campo (`Input`), a lista de escolha (`SelectTrigger`) e a caixa de texto (`Textarea`) do design system têm letra de 16 px; o campo e a lista de escolha têm 44 px de altura. A partir de 640 px, nada muda: 40 px e letra de 14 px. As listas de escolha nativas do app (região do CRN, período atual, filtros de Alimentos, "Adicionar em" do Cobrir, o paciente do plano) e o endereço do link do paciente seguem a mesma medida. Revê a D-239 da `revisao-geral-publica` e a seção "Campos" do `DESIGN.md` | No iPhone, tocar num campo com letra menor que 16 px aproxima a tela inteira, e o formulário sai do lugar. 44 px é o alvo de toque do projeto (`--tap-min`), como os botões já têm no celular (CA-108) |
| D-312 | **Quem tem tamanho próprio fica com ele em toda largura.** O campo do código (48 px, letra de 20 px), a busca de Alimentos (pílula de 44 px) e a caixa do formulário do cartão (48 px, D-73) não herdam os 40 px de 640 px para cima | O tamanho do celular do campo comum vem com uma regra própria de 640 px; quem muda a altura precisa dizer a dos dois tamanhos, senão perderia a sua acima de 640 px |
| D-313 | **O formulário do cartão fica de fora da letra de 16 px.** Os cinco campos do cartão (checkout e Trocar cartão) continuam com letra de 14 px: três deles são campos seguros da operadora (iframes), cuja letra é passada ao Mercado Pago na hora em que o formulário abre, e os cinco precisam ser iguais (CA-368) | A rodada é sem o Mercado Pago ("faça a revisão geral sem o MP agora"). Entra junto com a troca para produção (CB-313) |
| D-314 | **Uma versão só dos termos: `2026-10-20` ("20 de outubro de 2026").** Só a `exclusao-de-conta` mudou a Política e os Termos nesta rodada. Quem publica em outro dia troca a data em `src/domain/legal.ts` (as duas constantes) e no teste dela | A versão vai gravada no cadastro (CA-223 da `conta-e-verificacao`): uma data só para o texto que vai ao ar |
| D-315 | **A receita na refeição continua desligada** (`RECEITAS_NA_REFEICAO = false`, D-274a da `receitas-com-calculo`). A integração não liga a constante; quem liga é o coordenador, na publicação 2 | A publicação em duas vezes protege o aparelho com a versão antiga aberta (R-270) |
| D-317 | **Ingrediente apagado da receita fica fora do que vai ao paciente**, como o item apagado da refeição (D-248 da `revisao-geral-trabalho`): sai da seção "Receitas" da folha e da cópia do link (a lista de compras já o deixava de fora). A nutricionista continua vendo: no editor da receita a linha diz "Produto apagado" (ou "Alimento removido") com o aviso "Não sai na folha nem no link do paciente.", e o Word diz "Produto apagado (20 g)". A receita em si nunca é tirada da folha nem do link por não estar na base (o item de receita guarda `alimentoId` 0) | A regra do coordenador na revisão da área de trabalho (M-3): o paciente não recebe uma linha que não diz o que comer. Revê o CB-271 da `receitas-com-calculo`, que imprimia "Alimento removido" |
| D-318 | **A † da energia e dos macros também vale para a receita com dado faltando.** O ingrediente sem energia (apagado, ou alimento da base sem o valor) conta como falta de dado no total da refeição, no Resumo do dia, na faixa da etapa 3 e no Cobrir (que não diz quantas kcal cabem). Na linha do planejador, a receita com parte da energia mostra as kcal com a † | Pedido do coordenador ao juntar as frentes: a † da `revisao-geral-trabalho` (I-2) não pode esquecer a receita, que soma pelos ingredientes |
| D-316 | **O README traz a ordem única dos passos do dono** para as quatro frentes: painel, SQL 013, funções, site, app autenticador, SQL 014, cofre e a função da limpeza | As frentes escreveram cada uma a sua ordem; o dono roda uma lista só |

## 2. Critérios de aceite

### Receita no "Meu plano" (D-310)

- **CA-970** · Dado um plano com uma receita numa refeição, quando a dieta é copiada para o link, então o item da
  receita leva `receita: true` e os itens de alimento não levam a marca; a cópia de um plano sem receita continua sem
  nenhum campo novo (CA-885 da `receitas-com-calculo`).
- **CA-971** · Dado a cópia do link com o item de receita "Feijoada" (marcado, "1 porção", 300 g), quando o paciente
  abre "Meu plano", então a linha mostra "1 porção · 300 g" e "Feijoada", e não o nome nem a quantidade da feijoada da
  base.
- **CA-972** · Dado um item de receita sem porção na cópia (receita estragada, medida nula), então a linha mostra só o
  peso ("300 g") e o nome guardado.
- **CA-973** · Dado a cópia lida de novo da nuvem (`lerDieta`), então a marca de receita volta igual; uma marca com
  outro valor (texto, número) é ignorada, e o item é lido como alimento.
- **CA-974** · Dado a panqueca no Desjejum e o link aberto no celular (360 px), então "Meu plano" mostra
  "1 unidade · 120 g" e "Panqueca de banana", a mesma linha da folha impressa.

### Campos de texto no celular (D-311 a D-313)

- **CA-975** · Dado uma tela com menos de 640 px, então o `Input` e o `SelectTrigger` do design system têm letra de
  16 px e 44 px de altura, e o `Textarea` tem letra de 16 px.
- **CA-976** · Dado uma tela de 640 px ou mais, então o `Input` e o `SelectTrigger` têm 40 px de altura e letra de
  14 px, e o `Textarea`, letra de 14 px, como antes.
- **CA-977** · Dado as listas de escolha nativas (região do CRN, período atual, filtros de Alimentos, "Adicionar em" do
  Cobrir, o paciente do plano) e o endereço do link do paciente, então abaixo de 640 px elas têm letra de 16 px e
  44 px de altura ou mais; a partir de 640 px, a altura dos campos ao lado delas.
- **CA-978** · Dado o campo do código, a busca de Alimentos e a caixa do formulário do cartão, então eles têm a mesma
  altura em 390 e em 1280 px (48, 44 e 48 px), e o campo do código tem letra de 20 px nas duas.
- **CA-979** · Dado 360 e 390 px, quando abro Entrar, Criar conta (nutricionista, com o CRN), Esqueci a senha (o
  código), Comprovar matrícula, Completar cadastro, o planejador (dados do caso e plano alimentar), Alimentos e a
  ficha do paciente, então nenhuma tela rola para o lado, e cada campo de texto à vista (fora do formulário do cartão)
  tem letra de 16 px ou mais e, se não for caixa de texto, 44 px de altura ou mais.

### Ingrediente apagado e a † da receita (D-317, D-318)

- **CA-982** · Dado uma receita no plano com um ingrediente apagado (produto apagado em "Meus produtos"), então a seção
  "Receitas" da folha lista só os outros ingredientes, sem "Alimento removido".
- **CA-983** · Dado a mesma receita, quando a dieta é copiada para o link, então os ingredientes da receita na cópia
  não têm o apagado; a receita continua na refeição, com a porção e o peso.
- **CA-984** · Dado a mesma receita na linha do planejador, então as kcal da linha levam a †; dado uma receita com
  todos os ingredientes, então sem †.
- **CA-985** · Dado a mesma receita no Desjejum, então a energia do Desjejum e a do dia levam a † (`semDado` maior que
  zero), e o Cobrir não diz quantas kcal cabem (`kcalDisponiveis` nulo).

### Termos e receita na refeição (D-314, D-315)

- **CA-980** · Dado `src/domain/legal.ts`, então a versão é `2026-10-20` e a data mostrada nos Termos e na Política é
  "20 de outubro de 2026"; `node scripts/conferir-publicacao.mjs` passa.
- **CA-981** · Dado esta integração, então `RECEITAS_NA_REFEICAO` é `false` (o teste do CA-871a da
  `receitas-com-calculo` confere).

## 3. Casos de borda

- **CB-310** · Cópia de link feita por um build da frente de receitas antes da marca (receita sem `receita: true`):
  não existe em produção. Se existisse, o item cairia na procura pelo nome (D-231), como antes desta spec.
- **CB-311** · Ingrediente da receita na seção "Receitas" com o nome exato de outro alimento da base: segue a D-231
  (o nome e a quantidade da folha), porque o ingrediente é alimento da base de verdade. A marca existe só no item da
  refeição.
- **CB-312** · A linha do alimento no planejador em 360 px: o campo das gramas ganha 44 px, a mesma altura dos botões
  da linha no celular; a linha continua empilhada (nome numa linha, gramas, kcal e ações na outra), sem rolar para o
  lado.
- **CB-313** · O formulário do cartão no iPhone continua aproximando a tela ao tocar num campo (D-313). Fica para a
  troca do Mercado Pago para produção.
- **CB-314** · Campo de data, hora, mês e busca (`type="date"`, `"time"`, `"month"`, `"search"`) segue o `Input`.
- **CB-315** · Campo só de leitura (o endereço do link do paciente) também tem 16 px: o iPhone aproxima a tela ao
  focar mesmo sem teclado.

## 4. Fora de escopo

- Os alvos de 32 a 40 px entre 640 e 1023 px (tablet) da D-239: continuam decisão do dono.
- A letra dos campos seguros do cartão (D-313).
- Ligar a receita na refeição (publicação 2, D-315).

## 5. Riscos

- **R-310** · Outra frente que mude a altura ou a letra de um `Input` precisa pôr também o valor de 640 px para cima
  (`sm:`), senão o campo volta aos 40 px no computador (D-312). O comentário do `Input` diz isso.
- **R-311** · As frentes que entram depois (revisão da área de trabalho) mexem em telas com campos: a medida nova pode
  pedir ajuste fino de alinhamento nelas, conferido no merge.
