# PLAN — Revisão geral das telas públicas

**Spec de origem:** `./SPEC.md` (D-230 a D-239, CA-740 a CA-759, CB-230 a CB-239)
**Status:** pedida pelo dono em 19/10/2026 ("resolva todo o resto"); aprovação pelas telas antes de publicar

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
| `src/ui/estado/ProvedorAcompanhamentos.tsx` (+ teste) | alterar | T5 |
| `src/ui/missoes/TelaMissoesPaciente.tsx` (+ teste) | alterar | T5 |
| `src/ui/publico/MolduraPublica.tsx` (+ teste) | alterar | T6 |
| `src/ui/publico/SecaoPrecos.tsx` (+ teste) | alterar | T7 |
| `src/ui/publico/conta/MolduraConta.tsx`, `AvisoFormulario.tsx` (+ testes) | alterar | T8 |
| `src/ui/publico/TelaCheckout.tsx` (+ teste) | alterar | T9 |
| `src/ui/publico/TelaVoltaPagamento.tsx` (+ teste) | alterar | T5 (o `main`, CA-757) |
| `e2e/publico.spec.ts` | alterar (rodapé, Preços em 768 px) | T10 |
| `specs/impressao-do-plano/SPEC.md` | alterar (nota: R-182 resolvido por esta spec) | T11 |

## Tarefas

Cada tarefa é um commit, em TDD: o teste primeiro, vendo falhar, depois o código.

- [ ] **T1** — SPEC (com o Apêndice A da auditoria) e PLAN. *Verifica:* revisão.
- [ ] **T2** — Servidor de conta falso e o segundo site de teste (D-233). Primeiro teste: Completar cadastro abre com
  sessão falsa em 390 e 1280 px (CA-758). *Verifica:* `npx playwright test --project servidor-falso`. *Depende de:*
  T1.
- [ ] **T3** — `paraOPaciente(item: ItemDaDieta): { nome; quantidade: QuantidadeNaFolha }` (D-231). *Testes:* CA-748
  (os 22 nomes do exemplo, a partir da cópia feita por `dietaDoPlano`), CA-749 (as quantidades), CA-750 (produto,
  removido, nome que mudou), CB-230 (os 597 nomes da base são únicos), CB-232. *Depende de:* T1.
- [ ] **T4** — `MeuPlano` desenha com `paraOPaciente`: medida em destaque, peso ao lado só quando `comPeso`, peso
  sozinho sem medida, nome embaixo. *Testes:* CA-748, CA-749 e CA-752 na tela (TelaMissoesPaciente.test), CA-751 (a
  cópia que a tela recebe não muda). *Depende de:* T3.
- [ ] **T5** — Link sem internet e `main` (D-232, D-238). `LinkSemConexao`; a fonte do provedor rejeita quando a nuvem
  falha sem cópia (abrir) e quando a nuvem recusa (marcar, sem gravar o aparelho); a tela mostra o erro com "Tentar de
  novo" e desfaz a marca com o aviso. `main` no link e na volta do pagamento. *Testes:* CA-753, CA-754, CA-755,
  CA-756, CB-235, CB-236, CB-239, CA-757. *Depende de:* T1.
- [ ] **T6** — Rodapé e topo públicos (D-235). *Testes:* CA-740 (estrutura dos itens), CA-741 (classes de 44 px e
  `text-left`). *Depende de:* T1.
- [ ] **T7** — Preços (D-234): tabela a partir de `lg`, cartões abaixo, `h1`, `h2` nos cartões, seletor `h-11
  sm:h-10`. *Testes:* CA-743 (unidade); CA-742 no navegador (T10). *Depende de:* T1.
- [ ] **T8** — Telas de conta (D-237): `grid-cols-[minmax(0,1fr)]` no cartão, `[overflow-wrap:anywhere]` no subtítulo
  e no aviso. *Testes:* classes (unidade); CA-744 e CA-745 no navegador (T10). *Depende de:* T1.
- [ ] **T9** — Avisos do painel do checkout com as cores do tema claro (D-236). *Testes:* o aviso dentro do painel
  está no escopo `.papel` (unidade); CA-746 e CA-747 no navegador, medindo o contraste (T10). *Depende de:* T1.
- [ ] **T10** — Testes de navegador (CA-758) e os que precisam de navegador: CA-740, CA-741, CA-742, CA-744, CA-745,
  CA-746, CA-747, CA-748, CA-753, CA-756. *Verifica:* `npx playwright test`. *Depende de:* T2 a T9.
- [ ] **T11** — Validação: `npm run check`, `npx playwright test`, `npm run build`; nota na spec `impressao-do-plano`
  (R-182 resolvido); prints de antes e depois; relatório. *Depende de:* T10.

## Riscos e decisões para revisar

- **D-231** (caminho seguro): alimento que não é achado pelo nome mostra o peso ao lado da medida guardada, como hoje.
- **D-232**: a marca que falha volta atrás em vez de ficar guardada para mandar depois (a fila seria função nova).
- **D-233**: o `npx playwright test` monta dois sites (uns 25 s a mais). O segundo site usa o endereço
  `https://falso-e2e.supabase.co`, que o Playwright responde; nada sai da máquina.
- **D-239**: o tamanho dos campos e dos botões em tablet fica com o dono, porque muda o app inteiro.
