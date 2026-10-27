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

## O que mudou no caminho (registrado antes de cada commit)

- **T2 e T3 viraram um commit só**: a troca do tipo da porção (`porcao` para `gramas`) e da tabela (`DIA_EM_MEDIDAS`
  para `DIA_EM_GRAMAS`) quebrava a tela; o teste dos números e o da tela foram escritos antes do código, e o commit
  junta os dois para cada commit compilar. `GramaPorGrama.tsx` nasceu já com os espaços do protótipo (a T8 ficou com o
  resto).
- **T4** também mexeu em `RodapeDaLanding.tsx`, `FaixaComecar.tsx`, `FaixaComChave.tsx`, `ComoFunciona.tsx`,
  `PassoDeComoFunciona.tsx`, `QuantoCusta.tsx` e `ListaDoCobrir.tsx` (as cores pelos tokens do tema, D-616) e no teste
  CA-1480 de `TelaInicio.test.tsx` (o hover da faixa final passou a ser o token `chamar-hover`).
- **T9:** o clique do Playwright no botão de tema, com a página rolada, rolava a página antes de clicar (a barra é
  presa); o teste da barra clica pelo evento. Um clique de verdade não rola (conferido com `element.click()`).
- **T10 (revisão `emil-design-eng`):** o botão de tema ganhou o afundar ao toque (`scale(.97)`, 150 ms). A troca de
  tema ficou sem animação (D-614), como pede a regra para ação repetida e de teclado.
- **T10 (revisão `break-ui`, commit `fix` próprio):** em 360 e 390 px, o "Criar conta" da barra passava da margem
  (cortado pela raiz, por isso o e2e de rolagem lateral não via); com o texto do sistema em 150% e 200%, "Entrar" e
  "Criar conta" sumiam. Ficou a D-622, e o e2e do celular passou a conferir que a barra inteira cabe (360 px entrou na
  lista). "Como funciona" (seção da v4) estoura a largura com texto em 200%, pelo seletor e pelo botão do fragmento que
  não quebram linha; fica para a v4.

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

---

# PLAN — Landing v9

Spec: a seção "Landing v9" de `specs/landing-v3/SPEC.md` (D-650 a D-681, CA-1650 a CA-1694, CB-650 a CB-664). Cada
tarefa é um commit (Conventional Commits, em português), em TDD onde há lógica (os números do motor, o anel, o plano
indicado, os preços, as missões, o atraso da foto): teste primeiro, ver falhar, depois o código. Nenhuma dependência
nova: os ícones são do `lucide-react`; a foto é convertida com o Pillow da máquina, fora do projeto.

## Ordem

| # | Tarefa | Arquivos | Critérios | Depende de |
|---|---|---|---|---|
| T11 | SPEC e PLAN da v9 | `specs/landing-v3/SPEC.md`, `PLAN.md` | — | — |
| T12 | **Números da v9** (TDD): as abas e as sugestões com `nomeParaPaciente`, o "ainda faltam", a meta, as missões do celular, a data, os dias do painel, o "20" e o "2" do topo, o almoço em gramas; saem os números do campo vivo, das chaves, do feijão e das três refeições | `src/ui/publico/inicio/exemploDaLanding.ts` e `.test.ts` | CA-1653, CA-1659 a CA-1661, CA-1667, CA-1675 (números) | T11 |
| T13 | **A foto do topo** em webp (1.600 e 800 px) e o registro de licença | `public/imagens/iogurte-com-frutas*.webp`, `THIRD_PARTY_NOTICES.md` | CA-1655 (arquivo) | T11 |
| T14 | **Tokens da v9** e o CSS que não cabe em classe (o feixe, a régua, as animações do topo, o vidro) | `design-system/tokens/tokens.css`, `src/ui/tema/globals.css`, `DESIGN.md` | D-676 | T11 |
| T15 | **A barra de vidro presa** (TDD): os itens novos, sem pintar a seção e sem sair; sai `barraDoTopo` | `BarraDaLanding.tsx`, `BotaoDeTema.tsx`, `MolduraDaLanding.tsx` e `.test.tsx`, `barraDoTopo.ts` e `.test.ts` (saem), `src/ui/tema/globals.css` | CA-1650, CA-1651 | T14 |
| T16 | **O topo em foto** (TDD): o texto, a etiqueta, a foto com o atraso que continua o movimento | `HeroiDaLanding.tsx`, `atrasoDoTopo.ts` e `.test.ts` (novos), `TelaInicio.tsx` e `.test.tsx` | CA-1652, CA-1654 a CA-1657 | T12 a T15 |
| T17 | **Adequação com o anel** (TDD): abas, painel, sugestões, centro; o anel em peça própria; saem o campo vivo, a lista do Cobrir e a pergunta da vitrine | `AdequacaoDoExemplo.tsx`, `AnelDaAdequacao.tsx`, `anel.ts` e `.test.ts` (novos), `VitrineDoCobrir.tsx`, `ListaDoCobrir.tsx`, `perguntaDaVitrine.ts` e `.test.ts` (saem), `TelaInicio.tsx` e `.test.tsx` | CA-1658, CA-1662 a CA-1665 | T16 |
| T18 | **Acompanhamento da adesão** (TDD): o celular com as missões, o painel com a Maria, "em segundos" | `AcompanhamentoDaAdesao.tsx`, `CelularDasMissoes.tsx`, `PainelDeAdesao.tsx` (novos), `TelaInicio.tsx` e `.test.tsx` | CA-1666, CA-1668 a CA-1671 | T17 |
| T19 | **Funcionalidades**; saem as chaves | `Funcionalidades.tsx` (novo), `ChavesDoPlano.tsx`, `FaixaComChave.tsx` (saem), `TelaInicio.tsx` e `.test.tsx` | CA-1672 | T18 |
| T20 | **Como funciona** em quatro passos com a linha; a entrada ao rolar ganha `data-revela` | `ComoFunciona.tsx`, `PassoDeComoFunciona.tsx` (sai), `useEntradaAoRolar.ts`, `globals.css`, `TelaInicio.tsx` e `.test.tsx`, `MolduraDaLanding.test.tsx` | CA-1673, CA-1674 | T19 |
| T21 | **Quantidades em gramas e calorias** (só o almoço) | `QuantidadesEmGramas.tsx` (era `GramaPorGrama.tsx`), `TelaInicio.tsx` e `.test.tsx` | CA-1675 | T20 |
| T22 | **Planos e preços** (TDD): o plano indicado, o veredito, os preços dos dois ciclos, os cartões, a troca, a régua, a luz; sai "Quanto custa" | `precosDaLanding.ts` e `.test.ts`, `PlanosEPrecos.tsx`, `CartaoDePlano.tsx` (novos), `QuantoCusta.tsx` (sai), `TelaInicio.tsx` e `.test.tsx` | CA-1676 a CA-1682 | T21 |
| T23 | **Perguntas frequentes** (oito) | `PerguntasFrequentes.tsx` (era `PerguntasDeQuemAtende.tsx`), `TelaInicio.tsx` e `.test.tsx` | CA-1683 | T22 |
| T24 | **A faixa "Começar"** que cresce com a palavra, e o texto novo | `FaixaComecar.tsx`, `TelaInicio.test.tsx` | CA-1684, CA-1685 | T23 |
| T25 | **O botão fixo do celular** e o rodapé com espaço para ele | `BotaoFixoDoCelular.tsx` (novo), `MolduraDaLanding.tsx` e `.test.tsx`, `RodapeDaLanding.tsx` | CA-1686, CA-1687 | T24 |
| T26 | **Guardas de texto, página pré-desenhada e e2e**: `textosProibidos`, `textosDaFrente`, `vitrine.test.tsx`, `prepararPagina` (o comentário e o teste da foto), o e2e da landing (escura, v3 e o novo da v9) e os que citavam o texto antigo | `src/seo/*.test.ts*`, `src/textosDaFrente.test.ts`, `public/preparar-pagina.js`, `e2e/landing-escura.spec.ts`, `e2e/landing-v3.spec.ts`, `e2e/landing-v9.spec.ts` (novo), `e2e/site-publico.spec.ts`, `e2e/textos-e-promessas.spec.ts`, `e2e/publico.spec.ts`, `e2e/servidor-falso/*.spec.ts` | CA-1651, CA-1656, CA-1674, CA-1682, CA-1684, CA-1686, CA-1688 a CA-1694 | T15 a T25 |
| T27 | **Validação**: `npm run check`, `npm run e2e` (configuração temporária com portas e pastas próprias, apagada depois, porque o `node_modules` é o do repositório principal), `npm run test:csp`, `npm run build`; revisão `emil-design-eng` e `break-ui` (360 px, texto a 200%, zoom de 200%); prints nos dois temas em 1440 e 390 px; ajustes num commit próprio | — | todos | T26 |

## Matriz CA → teste (v9)

| CA | Teste |
|---|---|
| CA-1650 | `MolduraDaLanding.test.tsx` › "CA-1650: …" |
| CA-1651 | `MolduraDaLanding.test.tsx` › "CA-1651: …"; `e2e/landing-v9.spec.ts` › "CA-1651: …" |
| CA-1652 | `TelaInicio.test.tsx` › "CA-1652: …" |
| CA-1653 | `exemploDaLanding.test.ts` › "CA-1653: …" |
| CA-1654 | `TelaInicio.test.tsx` › "CA-1654: …"; `e2e/landing-v9.spec.ts` (390 px) |
| CA-1655 | `TelaInicio.test.tsx` › "CA-1655: …" |
| CA-1656 | `TelaInicio.test.tsx` › "CA-1656: …"; `e2e/landing-v9.spec.ts` › "CA-1656: …" |
| CA-1657 | `atrasoDoTopo.test.ts` › "CA-1657: …" |
| CA-1658 | `TelaInicio.test.tsx` › "CA-1658: …" |
| CA-1659 a CA-1661 | `exemploDaLanding.test.ts` › "CA-1659: …", "CA-1660: …", "CA-1661: …" |
| CA-1662 a CA-1665 | `TelaInicio.test.tsx` › "CA-1662: …" a "CA-1665: …"; `anel.test.ts` › "CA-1664: …" |
| CA-1666, CA-1668 a CA-1671 | `TelaInicio.test.tsx` › "CA-1666: …", "CA-1668: …" a "CA-1671: …" |
| CA-1667 | `exemploDaLanding.test.ts` › "CA-1667: …" |
| CA-1672 a CA-1675 | `TelaInicio.test.tsx` › "CA-1672: …" a "CA-1675: …"; `exemploDaLanding.test.ts` (o almoço); `e2e/landing-v9.spec.ts` › "CA-1674: …" |
| CA-1676 a CA-1681 | `precosDaLanding.test.ts` e `TelaInicio.test.tsx` › "CA-1676: …" a "CA-1681: …" |
| CA-1682 | `e2e/landing-v9.spec.ts` › "CA-1682: …" |
| CA-1683 a CA-1685 | `TelaInicio.test.tsx` › "CA-1683: …" a "CA-1685: …"; `e2e/landing-v9.spec.ts` › "CA-1684: …" |
| CA-1686, CA-1687 | `MolduraDaLanding.test.tsx` › "CA-1686: …", "CA-1687: …"; `e2e/landing-v9.spec.ts` › "CA-1686: …" |
| CA-1688 a CA-1694 | `TelaInicio.test.tsx` › "CA-1688: …", "CA-1693: …"; `e2e/landing-v9.spec.ts` › "CA-1689: …" a "CA-1694: …"; `src/seo/vitrine.test.tsx` (CA-1692) |

## O que mudou no caminho (v9)

- **T12:** os números da v3 que as seções antigas usam ficaram no fim de `exemploDaLanding.ts`, com o teste deles num
  arquivo temporário (`exemploDaLanding.v3.test.ts`); cada seção antiga leva os dela ao sair, para cada commit compilar.
- **T16 e T17 viraram um commit só**: o "Ver no plano de exemplo" do topo antigo rolava até o campo vivo, que a T17
  tira; o topo novo rola até a Adequação. As guardas de texto (`textosDaFrente`, `textosProibidos`) e a página
  pré-desenhada (`vitrine.test.tsx`) passaram a olhar a Adequação no mesmo commit.
- **T14:** a sombra da etiqueta do topo (`--landing-etiqueta-sombra`) entrou na T16, com a etiqueta.
