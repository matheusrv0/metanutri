# PLAN — Revisão geral das telas públicas

**Spec de origem:** `./SPEC.md` (D-230 a D-239, CA-740 a CA-759, CB-230 a CB-239)
**Status:** pedida pelo dono em 19/10/2026 ("resolva todo o resto"); aprovação pelas telas antes de publicar; T1 a T11 feitas em 19/10/2026

## Abordagem

Correções pequenas, cada uma no arquivo da tela, dentro do design system (nenhum componente da biblioteca muda). Três
partes pedem mais do que uma classe:

1. **"Meu plano" (D-231).** Um módulo de domínio novo, `dietaParaPaciente.ts`, recebe um `ItemDaDieta` guardado e
   devolve o que o paciente lê: o nome e a quantidade da folha. Acha o alimento da base pela descrição exata (um mapa
   descrição → alimento, montado uma vez); achou, usa `nomeParaPaciente` e `quantidadeNaFolha`; não achou, devolve o
   nome guardado e a quantidade de antes (medida guardada com o peso, ou só o peso). `MeuPlano.tsx` só troca o que
   desenha. `dietaDoLink.ts`, a cópia, a nuvem e `dietaMudou` não mudam (CA-751).
2. **Link sem internet (D-232).** A fonte do link no `ProvedorAcompanhamentos` passa a dizer quando não conseguiu
   falar com a nuvem: `porToken` rejeita com `LinkSemConexao` (classe nova em `repositorioAcompanhamentos.ts`) quando a
   nuvem falhou e o aparelho não tem cópia; `salvar` rejeita quando a nuvem recusou a marcação, sem gravar a cópia do
   aparelho. A fonte da nuvem (`fonteSupabase.ts`) já avisa a falha por `aoFalhar`; ela não muda. A tela do paciente
   trata as duas rejeições: a tela "Não consegui abrir suas missões" com "Tentar de novo", e a marca que volta com o
   aviso.
3. **Testes de navegador com conta (D-233).** `playwright.config.ts` ganha um segundo site de teste (outro build, com
   `VITE_SUPABASE_URL` falso, porta 4176) e um projeto `servidor-falso` que roda só `e2e/servidor-falso/`. O projeto de
   sempre ignora essa pasta. O servidor falso (`e2e/apoio/servidorFalso.ts`) responde pelo `page.route`.

**Suposições (para revisar):**
- O nome guardado na cópia é sempre `buscar(id)?.descricao` da base ou do produto, ou "Alimento removido"
  (`dietaDoLink.ts`, `itemDaDieta`): conferido no código.
- `dietaParaPaciente.ts` importa `quantidadeNaFolha` e `nomeParaPaciente`, que já carregam a base e as medidas no
  pacote do paciente (a tela do link já carrega a base pelo resto do app): nenhum peso novo no pacote.
- Só a tela do paciente lê `fonte.porToken` e `fonte.salvar` (conferido com `grep`).

## Arquivos

| Arquivo | Ação | Tarefa |
|---|---|---|
| `specs/revisao-geral-publica/SPEC.md`, `PLAN.md` | criar | T1 |
| `e2e/apoio/servidorFalso.ts` | criar | T2 |
| `playwright.config.ts` | alterar (segundo site e projeto) | T2 |
| `e2e/servidor-falso/telas-publicas.spec.ts` | criar | T2 (primeiro teste), T10 |
| `src/domain/dietaParaPaciente.ts` (+ teste) | criar | T3 |
| `src/ui/missoes/MeuPlano.tsx`, `src/ui/missoes/TelaMissoesPaciente.test.tsx` | alterar | T4 |
| `src/domain/repositorioAcompanhamentos.ts` | alterar (classe `LinkSemConexao`) | T5 |
| `src/domain/fonteSupabase.ts` (+ teste) | alterar (`fonteDoPaciente`: a fonte do link, nuvem mais cópia do aparelho, que sai do provedor para poder ser testada sozinha) | T5 |
| `src/ui/estado/ProvedorAcompanhamentos.tsx` | alterar (usa `fonteDoPaciente`) | T5 |
| `src/ui/missoes/TelaMissoesPaciente.tsx` (+ teste) | alterar | T5 |
| `src/ui/publico/MolduraPublica.tsx` (+ teste) | alterar | T6 |
| `src/ui/publico/SecaoPrecos.tsx` (+ teste) | alterar | T7 |
| `src/ui/publico/conta/MolduraConta.tsx`, `AvisoFormulario.tsx` (+ testes) | alterar | T8 |
| `src/ui/publico/TelaCheckout.tsx` (+ teste) | alterar | T9 |
| `src/ui/publico/TelaVoltaPagamento.tsx` (+ teste) | alterar | T5 (o `main`, CA-757) |
| `e2e/servidor-falso/revisao.spec.ts` | criar (os critérios que pedem navegador: rodapé, Preços em 768 px, e-mail longo, contraste do checkout, Meu plano, sem internet) | T10 |
| `e2e/apoio/servidorFalso.ts`, `playwright.config.ts` | alterar (marcação que falha, e-mail da sessão, o script do cartão respondido aqui e a chave pública de teste no segundo site) | T10 |
| `src/ui/publico/conta/CaixaDeclaracao.tsx` (+ teste), `e2e/servidor-falso/revisao.spec.ts` | alterar (toque de 44 px) | T10b |
| `specs/impressao-do-plano/SPEC.md` | alterar (nota: R-182 resolvido por esta spec) | T11 |
| `specs/dieta-no-link/SPEC.md` | alterar (nota: o nome e o peso de CA-531 seguem a D-231 desta spec) | T11 |

## Tarefas

Cada tarefa é um commit, em TDD: o teste primeiro, vendo falhar, depois o código.

- [x] **T1** — SPEC (com o Apêndice A da auditoria) e PLAN. *Verifica:* revisão.
- [x] **T2** — Servidor de conta falso e o segundo site de teste (D-233). Primeiro teste: Completar cadastro abre com
  sessão falsa em 390 e 1280 px (CA-758). *Verifica:* `npx playwright test --project servidor-falso`. *Depende de:*
  T1.
- [x] **T3** — `paraOPaciente(item: ItemDaDieta): { nome; quantidade: QuantidadeNaFolha }` (D-231). *Testes:* CA-748
  (os 22 nomes do exemplo, a partir da cópia feita por `dietaDoPlano`), CA-749 (as quantidades), CA-750 (produto,
  removido, nome que mudou), CB-230 (os 597 nomes da base são únicos), CB-232. *Depende de:* T1.
- [x] **T4** — `MeuPlano` desenha com `paraOPaciente`: medida em destaque, peso ao lado só quando `comPeso`, peso
  sozinho sem medida, nome embaixo. *Testes:* CA-748, CA-749 e CA-752 na tela (TelaMissoesPaciente.test), CA-751 (a
  cópia que a tela recebe não muda). *Depende de:* T3.
- [x] **T5** — Link sem internet e `main` (D-232, D-238). `LinkSemConexao`; a fonte do provedor rejeita quando a nuvem
  falha sem cópia (abrir) e quando a nuvem recusa (marcar, sem gravar o aparelho); a tela mostra o erro com "Tentar de
  novo" e desfaz a marca com o aviso. `main` no link e na volta do pagamento. *Testes:* CA-753, CA-754, CA-755,
  CA-756, CB-235, CB-236, CB-239, CA-757. *Depende de:* T1.
- [x] **T6** — Rodapé e topo públicos (D-235). *Testes:* CA-740 (estrutura dos itens), CA-741 (classes de 44 px e
  `text-left`). *Depende de:* T1.
- [x] **T7** — Preços (D-234): tabela a partir de `lg`, cartões abaixo, `h1`, `h2` nos cartões, seletor `h-11
  sm:h-10`. *Testes:* CA-743 (unidade); CA-742 no navegador (T10). *Depende de:* T1.
- [x] **T8** — Telas de conta (D-237): `grid-cols-[minmax(0,1fr)]` no cartão, `[overflow-wrap:anywhere]` no subtítulo
  e no aviso. *Testes:* classes (unidade); CA-744 e CA-745 no navegador (T10). *Depende de:* T1.
- [x] **T9** — Avisos do painel do checkout com as cores do tema claro (D-236). *Testes:* o aviso dentro do painel
  está no escopo `.papel` (unidade); CA-746 e CA-747 no navegador, medindo o contraste (T10). *Depende de:* T1.
- [x] **T10** — Testes de navegador (CA-758) e os que precisam de navegador: CA-740, CA-741, CA-742, CA-744, CA-745,
  CA-746, CA-747, CA-748, CA-753, CA-756. *Verifica:* `npx playwright test`. *Depende de:* T2 a T9.
- [x] **T10b** — Toque de 44 px nas caixas de aceite e de declaração das telas de conta (CA-759, achado A-21 da
  segunda rodada). `CaixaDeclaracao` ganha a área de toque sem mudar o desenho (`py-3 -my-3`). As listas de escolha
  ficam como os campos ao lado (A-22, D-239). *Testes:* classes (unidade); a altura no navegador (e2e). *Depende
  de:* T10.
- [x] **T11** — Validação: `npm run check`, `npx playwright test`, `npm run build`; nota na spec `impressao-do-plano`
  (R-182 resolvido); prints de antes e depois; relatório. *Depende de:* T10.

## Rodada da revisão (20/10/2026)

Revisão do coordenador: aprovar com correções, nenhum crítico (`rodada-1910/revisao-publica.md`). Um commit por item, em
TDD. O I-2 (nome de receita no "Meu plano") fica para a integração com a frente de receitas.

- [ ] **R1 (I-1)** — Testes de geometria estáveis: os retângulos comparados medidos num só `evaluate` (o mesmo quadro)
  em CA-740, D-235/A-23, A-24 e CA-744, e `reducedMotion: 'reduce'` no arquivo (a entrada animada de Preços).
  *Verifica:* `revisao.spec.ts` rodado 30 vezes seguidas sem falha.
- [ ] **R2 (I-3)** — 24 px entre a declaração e o aceite dos Termos: a declaração (CRN ou matrícula) fica num invólucro
  com `pb-2`, montado junto com ela em `CamposSituacao.tsx` (uma margem na própria caixa brigaria com o `-my-3` dela, e
  trocar a classe do aceite que já estava na tela às vezes deixava o Chromium com o estilo velho). *Testes:* unidade (a classe) e e2e com `elementFromPoint` no
  meio do vão.
- [ ] **R3 (M-1)** — "Fontes da base" com 44 px em qualquer largura. *Testes:* unidade (classe) e e2e em 1280 px.
- [ ] **R4 (M-3b)** — Recusa do servidor (não a rede) na marcação: `MarcacaoRecusada` com o motivo; a tela mostra o
  motivo e "Fale com quem montou seu plano.". *Testes:* `fonteSupabase.test.ts` e a tela.
- [ ] **R5 (M-4)** — Ao falhar a marcação, a tela relê o link antes de desfazer e fica com o que a nuvem guardou.
  *Testes:* a tela (CA-756, CB-236).
- [ ] **R6 (M-5)** — `vigiarConsole` grava o endereço do pedido que falhou junto com o erro. *Testes:* e2e.
- [ ] **R7 (M-6)** — Tirar `esperaDoLinkMs`, que nenhum teste usa, do servidor falso.
- [ ] **R8 (M-8)** — `reuseExistingServer: false` nos dois sites de teste.
- [ ] **R9 (M-9)** — Escopo neutro `.tema-claro` junto com `:root, .papel` em `tokens.css` e `globals.css`; o checkout
  passa a usá-lo. *Testes:* o checkout e um teste de texto das duas folhas de estilo.

- [ ] **R10 (achado na validação da rodada)** — O CA-119 (`e2e/publico.spec.ts`, a foto do topo da landing) lia
  `naturalWidth` logo depois de a foto aparecer, antes de ela terminar de carregar (`decoding="async"`), e falhou 1 vez
  com a máquina carregada. Passa a esperar a foto carregar (`expect.poll`). Só teste.

Arquivos a mais nesta rodada: `src/ui/publico/conta/CamposSituacao.tsx` e `TelaCriarConta.test.tsx` (R2), `design-system/tokens/tokens.css` e
`src/ui/tema/globals.css` (R9), `e2e/apoio/fumaca.ts` (R6), `src/ui/tema/temaClaro.test.ts` (R9, novo), `e2e/publico.spec.ts` (R10).

## Riscos e decisões para revisar

- **D-231** (caminho seguro): alimento que não é achado pelo nome mostra o peso ao lado da medida guardada, como hoje.
- **D-232**: a marca que falha volta atrás em vez de ficar guardada para mandar depois (a fila seria função nova).
- **D-233**: o `npx playwright test` monta dois sites (uns 25 s a mais). O segundo site usa o endereço
  `https://falso-e2e.supabase.co`, que o Playwright responde; nada sai da máquina.
- **D-239**: o tamanho dos campos e dos botões em tablet fica com o dono, porque muda o app inteiro.
