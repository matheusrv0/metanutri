# PLAN — Landing v3: gramatura, tema claro e escuro, espaços menores

Spec: `specs/landing-v3/SPEC.md`. Cada tarefa é um commit (Conventional Commits, em português), em TDD onde há lógica
(os números do motor, a leitura e a escrita do tema, o botão, o script do `<head>`): teste primeiro, ver falhar, depois
o código. Nenhuma dependência nova: os ícones são os `Moon` e `Sun` do `lucide-react`, que o projeto já tem.

Escopo reduzido em 27/10 (D-600): as peças de "O plano sai do seu jeito", os desenhos de "Como funciona" e os cartões
de "Quanto custa" ficam para a v4; essas três seções só passam pelos tokens do tema e pelo espaço novo.

## Ordem

| # | Tarefa | Arquivos | Critérios | Depende de |
|---|---|---|---|---|
| T1 | SPEC e PLAN; a linha do que a v3 substitui na spec da landing escura | `specs/landing-v3/SPEC.md`, `PLAN.md`, `specs/landing-escura/SPEC.md` | — | — |
| T2 | **Números da gramatura** (TDD): a porção só em gramas nas sugestões (campo vivo e "Cobrir cálcio"), o título do topo a partir da sugestão de iogurte, o dia em gramas (sem a medida), a unidade dos líquidos e a resposta nova dos alimentos próprios | `src/ui/publico/inicio/exemploDaLanding.ts` e `.test.ts` | CA-1601, CA-1603, CA-1605, CA-1606, CA-1607 (texto) | T1 |
| T3 | **Gramatura nas seções** (TDD pela tela): o topo, o campo vivo (gramas em negrito, parágrafo novo, borda do cartão), "Grama por grama" no lugar de "Na medida da cozinha" (fotos 16:9, legendas, tabela sem medida) e as perguntas; a vitrine do build e a varredura de textos acompanham | `HeroiDaLanding.tsx`, `ListaDoCobrir.tsx`, `VitrineDoCobrir.tsx`, `GramaPorGrama.tsx` (novo; sai `NaMedidaDaCozinha.tsx`), `PerguntasDeQuemAtende.tsx`, `src/ui/publico/TelaInicio.tsx` e `.test.tsx`, `src/seo/vitrine.test.tsx` | CA-1600, CA-1602, CA-1604, CA-1607, CA-1608 | T2 |
| T4 | **Tokens dos dois temas**: o escopo `.landing` (renomeado), as primitivas do claro, os semânticos novos (destaque, borda, ação, faixa final, rodapé, bloco), o claro em `.landing-clara` e na marca do `<html>`; o foco por área; as cores no `@theme`; a variante `landing-clara` do Tailwind; as seções passam a usar os tokens (sem mudança visível no escuro); o `DESIGN.md` | `design-system/tokens/tokens.css`, `src/ui/tema/globals.css`, `DESIGN.md`, `src/ui/publico/inicio/*.tsx` e `estiloDaLanding.ts`, `MolduraDaLanding.test.tsx`, `src/ui/publico/MolduraPublica.test.tsx`, `src/seo/vitrine.test.tsx` | CA-1615 (tokens), CA-1621 | T3 |
| T5 | **A escolha do tema** (TDD): ler e guardar a chave da landing com `try/catch`, o valor estranho, e a marca do `<html>` | `src/ui/publico/inicio/temaDaLanding.ts` e `.test.ts` | CA-1613, CA-1614 | T1 |
| T6 | **O botão e a raiz** (TDD): `BotaoDeTema` na barra antes de "Entrar" (ou de "Ir para o painel"); a raiz por tema; a barra, a logo e o botão de tema pela seção e pelo tema; a troca sem transição | `src/ui/publico/inicio/BotaoDeTema.tsx` (novo), `BarraDaLanding.tsx`, `MolduraDaLanding.tsx`, `MolduraDaLanding.test.tsx` | CA-1610 a CA-1614, CA-1617, CA-1618 | T4, T5 |
| T7 | **O primeiro desenho** (TDD): `preparar-pagina.js` marca o `<html>` com o claro guardado | `public/preparar-pagina.js`, `src/seo/prepararPagina.test.tsx` | CA-1619, CA-1620 | T4 |
| T8 | **Espaços menores**: seções 104/96, o topo de 640 px, a foto de 420 px, os espaços de "Grama por grama" e das perguntas | `estiloDaLanding.ts`, `HeroiDaLanding.tsx`, `FotoDosLegumes.tsx`, `GramaPorGrama.tsx`, `PerguntasDeQuemAtende.tsx`, `ChavesDoPlano.tsx` | CA-1625 | T3 |
| T9 | **Testes de navegador**: o e2e da landing escura olha o texto novo e os dois temas; o e2e novo da v3 (tema, primeiro desenho, contraste nos dois temas, espaços); os outros e2e que citavam o texto antigo | `e2e/landing-escura.spec.ts`, `e2e/landing-v3.spec.ts` (novo), `e2e/textos-e-promessas.spec.ts`, `e2e/site-publico.spec.ts` (os que citarem o texto antigo) | CA-1611, CA-1612, CA-1615, CA-1616, CA-1617, CA-1620, CA-1621, CA-1625, CA-1626, CA-1630 | T6 a T8 |
| T10 | **Validação**: `npm run check`, `npm run e2e` (configuração temporária com portas e pastas próprias, apagada depois, porque o `node_modules` é o do repositório principal), `npm run test:csp`, `npm run build`; revisão `emil-design-eng` e `break-ui` (360 px, texto grande, zoom de 200%); prints nos dois temas em 1440 e 390 px; ajustes num commit próprio | — | todos | T9 |

## Matriz CA → teste

| CA | Teste |
|---|---|
| CA-1600 | `TelaInicio.test.tsx` › "CA-1600: o título em gramas, as duas ações e a frase" |
| CA-1601 | `exemploDaLanding.test.ts` › "CA-1601: o 150 g de iogurte do topo é a sugestão de iogurte do Cobrir de cálcio" |
| CA-1602 | `TelaInicio.test.tsx` › "CA-1602: o campo vivo mostra os gramas, sem medida caseira, e o parágrafo novo" |
| CA-1603 | `exemploDaLanding.test.ts` › "CA-1603: …" (o campo vivo e "Cobrir cálcio" com a porção do motor em gramas) |
| CA-1604 | `TelaInicio.test.tsx` › "CA-1604: Grama por grama, com as fotos, as legendas e a tabela sem medida" |
| CA-1605 | `exemploDaLanding.test.ts` › "CA-1605: cada linha da tabela vem da base" |
| CA-1606 | `exemploDaLanding.test.ts` › "CA-1606: leite em mililitros, iogurte em gramas" |
| CA-1607 | `TelaInicio.test.tsx` › "CA-1607: …" e `exemploDaLanding.test.ts` (o texto dos alimentos próprios) |
| CA-1608 | `TelaInicio.test.tsx` › "CA-1608: o topo, o campo vivo, Grama por grama e as perguntas não falam de medida caseira" |
| CA-1610 | `MolduraDaLanding.test.tsx` › "CA-1610: …" |
| CA-1611 | `MolduraDaLanding.test.tsx` › "CA-1611: …"; `e2e/landing-v3.spec.ts` (fundo calculado) |
| CA-1612 | `MolduraDaLanding.test.tsx` › "CA-1612: …"; `e2e/landing-v3.spec.ts` |
| CA-1613 | `temaDaLanding.test.ts` e `MolduraDaLanding.test.tsx` › "CA-1613: …" |
| CA-1614 | `temaDaLanding.test.ts` e `MolduraDaLanding.test.tsx` › "CA-1614: …" |
| CA-1615 | `e2e/landing-v3.spec.ts` › "CA-1615: …" |
| CA-1616 | `e2e/landing-v3.spec.ts` › "CA-1616: …" (nos dois temas) |
| CA-1617 | `MolduraDaLanding.test.tsx` › "CA-1617: …"; `e2e/landing-v3.spec.ts` |
| CA-1618 | `MolduraDaLanding.test.tsx` › "CA-1618: …" |
| CA-1619 | `prepararPagina.test.tsx` › "CA-1619: …" |
| CA-1620 | `e2e/landing-v3.spec.ts` › "CA-1620: …" (o pacote do app bloqueado: só o script do `<head>` roda) e `npm run test:csp` |
| CA-1621 | `e2e/landing-v3.spec.ts` › "CA-1621: …" |
| CA-1625 | `e2e/landing-v3.spec.ts` › "CA-1625: …" |
| CA-1626 | `e2e/landing-escura.spec.ts` › "CA-1488, CA-1489, CA-1626 …" (nos dois temas) |
| CA-1630 | os testes da landing escura das três seções (CA-1470, CA-1471, CA-1474, CA-1477, CA-1478) e o CA-1616 |

## Riscos e decisões para o dono revisar

- **D-600 e R-602.** A chave "Medida caseira junto dos gramas" (ligada ao abrir) e o "1 concha de feijão" de "Como
  funciona" continuam no ar até a v4. Se o dono quiser tirar já, é tirar a chave e trocar a chamada; ficou fora porque o
  coordenador pediu para não mexer nas três seções.
- **D-604.** A tabela de "Grama por grama" não é o dia da Maria do app. O protótipo dizia que era (só para o leitor de
  tela). A v4 vai desenhar o almoço da Maria: no app ele é 490 g (arroz 150, feijão 100, frango 100, brócolis 80,
  cenoura 60), não os 507 g do protótipo.
- **D-606.** A resposta do estudante do protótipo tirava o comprovante e os 12 meses; ficou a de hoje.
- **D-607.** O botão de tema tem 44 px desenhados (o protótipo, 40 px com 44 de toque).
- **D-608.** O padrão é o escuro mesmo para quem tem o sistema no claro.
