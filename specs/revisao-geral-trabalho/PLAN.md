# Revisão geral da área de trabalho · Plano de implementação

**Spec:** `specs/revisao-geral-trabalho/SPEC.md` (pedida em 19/10/2026; aprovação pelas telas).

**Objetivo:** corrigir os defeitos críticos, importantes e os menores baratos do Apêndice A, cobrir cada tela da área
de trabalho com um teste de ponta a ponta em 390 e 1280 px e pôr PRODUCT.md e AGENTS.md no modelo de dados de hoje.

**Arquitetura:** só apresentação e uma regra de exibição. A medida caseira ganha uma função de exibição em
`src/domain/busca.ts` (`medidaParaMostrar`), que a folha, o planejador e o Word passam a usar; `medidaEquivalente` fica
igual, porque a escolha das trocas (`trocas.ts`) e a dieta do link dependem dela. O Ctrl+P vira CSS de impressão
(`globals.css`, `print:` nas peças da moldura) mais um ouvinte de `beforeprint`/`afterprint` no `ProvedorTema`. O resto é
classe de layout, texto e testes.

## Restrições

- Nenhuma dependência nova. Nada em `prescritivel.ts`, `cobrir.ts`, `trocas.ts`, SQL, funções, Mercado Pago, telas
  públicas, de conta ou do link do paciente (`TelaMissoesPaciente`, `MeuPlano`, `dietaDoLink.ts`).
- Biblioteca pelo alias `@ds/...`; cor, espaço e raio só por token. Um componente por arquivo, export nomeado, sem `any`
  e sem `!`, regras do React Compiler.
- TDD: teste primeiro, ver falhar, código, ver passar. `npm run check` verde no fim de cada tarefa; um commit por
  tarefa, em Conventional Commits, em português.
- Os testes de ponta a ponta novos vão em `e2e/revisao-geral-trabalho.spec.ts`, com o servidor da configuração de
  sempre (porta 4173). Para rodar nesta máquina, enquanto outras frentes rodam, uma cópia temporária da configuração
  numa porta só desta frente, apagada no fim.

## Ordem e dependências

| # | Tarefa | Arquivos | Critérios | Depende de |
|---|---|---|---|---|
| T0 | SPEC e PLAN | `specs/revisao-geral-trabalho/SPEC.md`, `PLAN.md` | — | — |
| T1 | Nome longo não alarga a tela | `src/ui/pacientes/TelaPacientes.tsx`, `src/ui/casos/TelaCasos.tsx`, `src/ui/caso/CartaoIdentificacao.tsx`, `e2e/revisao-geral-trabalho.spec.ts` (novo) | CA-785, CA-786, CA-787, CB-245 | T0 |
| T2 | Ctrl+P imprime a tela | `src/ui/tema/globals.css`, `src/ui/layout/Estrutura.tsx`, `src/ui/layout/Cabecalho.tsx`, `src/ui/nuvem/SituacaoDaNuvem.tsx` e `src/ui/aplicativo/AvisoVersaoNova.tsx` (só `print:hidden`), `src/ui/tema/ProvedorTema.tsx`, `src/ui/tema/ProvedorTema.test.tsx` (novo), `e2e/revisao-geral-trabalho.spec.ts`, `specs/impressao-do-plano/SPEC.md` (nota no CB-186) | CA-770, CA-771, CA-772, CB-240, CB-246 | T1 (arquivo de e2e) |
| T3 | Painel: "Falta completar" e acertos | `src/ui/painel/TelaPainel.tsx`, `src/ui/AreaDeTrabalho.tsx`, `TelaPainel.test.tsx`, `hojeEEstaSemana.test.tsx`, `specs/pdf-e-telas-limpas/SPEC.md` (nota no CA-326) | CA-773 a CA-778, CB-241 | T0 |
| T4 | Medida caseira igual à da folha | `src/domain/busca.ts`, `src/domain/quantidadeNaFolha.ts`, `src/domain/substitutos.ts`, `src/export/aconselhamento-docx.ts`, `src/ui/plano/LinhaItem.tsx`, `src/ui/plano/DialogoSugestoes.tsx`, `src/ui/adequacao/GavetaCobrir.tsx` (só a medida mostrada), testes de cada um, `specs/impressao-do-plano/SPEC.md` (nota no "Fora de escopo") | CA-779, CA-780, CA-781, CB-244 | T0 |
| T4b | Produto do rótulo nunca derruba o plano (acrescentada em 19/10, pedido do coordenador: defeito achado pela frente de receitas) | `src/domain/totais.ts`, `src/domain/produtos.ts`, `src/domain/substitutos.ts`, `src/export/aconselhamento-docx.ts`, `src/ui/plano/LinhaItem.tsx`, `src/ui/produtos/TelaProdutos.tsx` (o texto do aviso), testes de cada um, `e2e/revisao-geral-trabalho.spec.ts` | CA-789, CA-793 | T4 |
| T5 | Mínimo da meta inteiro | `src/domain/adequacao.ts`, `src/ui/adequacao/TelaAdequacao.tsx`, `adequacao.test.ts`, `TelaAdequacao.test.tsx` | CA-782, CA-783, CB-242, CB-247 | T0 |
| T6 | Meses além dos anos sem piscar | `src/ui/caso/CartaoPessoa.tsx`, `src/ui/caso/usarValorAssentado.ts` (novo), `etapa1.test.tsx` | CA-784, CB-243, CB-248 | T0 |
| T7 | Toque de 44 px no celular | `design-system/componentes/overlay/dialog.tsx`, `sheet.tsx`, `dropdown-menu.tsx`, `design-system/componentes/forms/GrupoOpcoes.tsx`, `design-system/componentes/display/Fontes.tsx`, `src/ui/layout/Cabecalho.tsx`, `src/ui/ajuda/TelaAjuda.tsx`, `src/ui/adequacao/GavetaCobrir.tsx` (só a altura da linha do interruptor), `e2e/revisao-geral-trabalho.spec.ts` | CA-788, CA-790 | T1 |
| T8 | Textos sem repetição | `src/ui/pacientes/TelaPacientes.tsx`, `src/ui/pacientes/TelaPaciente.tsx`, `src/ui/caso/TelaCaso.tsx`, `src/ui/missoes/CartaoLinkMissoes.tsx`, `src/ui/plano/EntradaRapida.tsx`, `src/ui/adequacao/GavetaCobrir.tsx` (só a frase da falta), testes | CA-791, CA-792 | T1, T4 |
| T9 | Tabela de alimentos | `src/domain/catalogo.ts`, `src/ui/alimentos/TelaAlimentos.tsx`, testes | CA-794 | T0 |
| T10 | Seletor de referência no celular | `src/ui/adequacao/TelaAdequacao.tsx` (ou o `SeletorSegmentado` da biblioteca), `e2e/revisao-geral-trabalho.spec.ts` | CA-795 | T5 |
| T11 | Cada tela de ponta a ponta, e o teclado | `e2e/revisao-geral-trabalho.spec.ts` | CA-797, CA-799 | T1 a T10 |
| T12 | Telas com servidor, dados falsos | `src/ui/telasComServidor.test.tsx` (novo) | CA-798 | T0 |
| T13 | PRODUCT.md e AGENTS.md | `PRODUCT.md`, `AGENTS.md`, `src/data/documentos.test.ts` (novo) | CA-796 | T0 |
| T14 | Validação | prints de depois, relatório | todos | T1 a T13 |

## Tarefas

### T1 · Nome longo não alarga a tela
1. e2e novo, `CA-785/CA-786/CA-787` em 360 e 390 px: semeia um paciente com 70 letras e um plano com o mesmo nome
   (pelo `localStorage`, com o plano de exemplo), abre Pacientes, Planos e a etapa 1, e confere que nenhum elemento passa
   da largura da tela e que "Abrir ficha" e "Abrir plano" cabem. CB-245 com uma palavra só de 80 letras.
2. Ver falhar. Grade das listas com coluna `minmax(0,1fr)` (o item da grade não cresce pelo conteúdo); seletor com
   `w-full min-w-0` e a grade da Identificação com a coluna mínima zero.
3. `npm run check`. Commit `fix(listas): nome longo não alarga a tela no celular`.

### T2 · Ctrl+P imprime a tela
1. Testes: e2e `CA-770` (na mídia de impressão, sem janela aberta, o título e o conteúdo da etapa aparecem, o menu e os
   botões do cabeçalho não), `CA-771` (com "Dieta para imprimir" aberta, só a folha), `CB-240` (Tabela de alimentos e
   "Plano não encontrado" não saem em branco). Teste de unidade do `ProvedorTema`: `beforeprint` tira a classe `dark`;
   `afterprint` põe de volta (`CA-772`, `CB-246`).
2. Ver falhar. CSS: a regra que esconde tudo passa a valer só quando existe `.area-impressao`
   (`body:has(.area-impressao) > …`). A moldura ganha `print:hidden` no menu lateral, no botão do menu, nas ações do
   cabeçalho, na situação da nuvem e nos avisos; o conteúdo perde o recuo do menu e o cabeçalho deixa de ser fixo. O
   `ProvedorTema` ouve `beforeprint` e `afterprint`.
3. Nota no CB-186 da `impressao-do-plano`. `npm run check`. Commit `fix(impressao): ctrl+p imprime a tela, não página em branco`.

### T3 · Painel
1. Testes em `TelaPainel.test.tsx`: `CA-773` (pendências com "Ver"/"Cadastrar" sob "Falta completar"), `CA-774` (sem
   pendência, o bloco e "Tudo em dia." não existem; sem agenda, a grade tem uma coluna só), `CA-775` (paciente sumindo
   na agenda e cadastro completo: nada diz "em dia"), `CA-776` (singular e plural), `CA-777` (quando antes do tipo),
   `CB-241`. `CA-778`: o botão do cabeçalho do Painel tem `xl:hidden` (teste de `AreaDeTrabalho` ou e2e em 1280 px).
   Ajustar `hojeEEstaSemana.test.tsx` ao nome novo.
2. Ver falhar. Mudar `TelaPainel.tsx` e o botão do Painel em `AreaDeTrabalho.tsx`.
3. Nota no CA-326 da `pdf-e-telas-limpas`. `npm run check`. Commit `fix(painel): "falta completar" só quando há o que completar`.

### T4 · Medida caseira igual à da folha
1. Testes em `busca.test.ts`: `medidaParaMostrar` dá "1 ponta de faca" para 5 g de margarina e as outras de CA-779;
   30 g de manteiga e de margarina dão "1 colher de sopa" (CA-780); 13 g de margarina dão nulo (CB-244); banana com 130 g
   dá nulo (mais de 4 fatias) e com 104 g "4 fatias"; `medidaEquivalente` continua igual (5 g de margarina continua nula,
   30 g continua "1 fatia": a escolha das trocas não muda). `quantidadeNaFolha.test.ts`: 30 g de manteiga na folha sem
   "fatia". Testes de tela: a linha do alimento mostra "1 ponta de faca" (CA-779); o Word de aconselhamento diz
   "1 ponta de faca" para 5 g de margarina (CA-781).
2. Ver falhar. `busca.ts`: função interna com a opção de não usar "fatia" em gordura (categoria "Gorduras e óleos");
   `medidaEquivalente` chama sem a opção; `medidaParaMostrar` aplica a ponta de faca, a gordura sem fatia e o limite de
   4 pedaços. `quantidadeNaFolha.ts` passa a usar `medidaParaMostrar` (a regra sai de lá). `LinhaItem`, `DialogoSugestoes`,
   a medida mostrada no `GavetaCobrir`, `substitutos.ts` e o Word passam a usar `medidaParaMostrar`.
3. Nota no "Fora de escopo" da `impressao-do-plano`. `npm run check`. Commit `fix(medida): planejador mostra a medida da folha`.

### T4b · Produto do rótulo nunca derruba o plano
1. Testes: e2e `CA-789` (produto num plano, apagado em Meus produtos: as três etapas abrem, a linha diz "Produto apagado"
   com "— kcal", "Dieta para imprimir", o Word e o Cobrir funcionam, sem erro na página); `totais.test.ts` (alimento que
   não existe conta como falta de dado em tudo, CA-793; o teste antigo "inexistente é erro de programação" muda);
   `produtos.test.ts` (o produto como alimento traz todos os nutrientes, com nulo no que o rótulo não traz, CA-793);
   `docx.test.ts` (o Word descreve "Produto apagado (40 g)"); `substitutos.test.ts` (original apagado devolve o motivo,
   sem erro); `LinhaItem.test.tsx` ("Produto apagado", "— kcal", sem "Substituir").
2. Ver falhar. `totaisDeItens` conta o alimento que falta (e o nutriente indefinido) como falta de dado;
   `produtoComoAlimento` preenche todos os nutrientes; `calcularSubstituto` devolve o motivo; o Word e a linha dizem
   "Produto apagado" (id de produto) ou "Alimento removido" (outro id); o aviso de apagar produto diz "Produto apagado".
3. `npm run check`. Commit `fix(produtos): produto apagado não derruba o plano`.

### T5 · Mínimo da meta inteiro
1. Testes: `adequacao.test.ts` (mínimo 90,4 vale 90 e 90,2% está na meta, CA-783; 0,4 vale 1, CB-247);
   `TelaAdequacao.test.tsx` (digitar "90,4" mostra o aviso e não muda a meta; "85" muda e o aviso some, CA-782; vazio
   não mostra aviso, CB-242; guardado 90,4 mostra "90" no campo e "meta de 90%", CA-783).
2. Ver falhar. `adequacao.ts`: o mínimo personalizado é arredondado (mínimo 1) antes de comparar e de devolver
   `metaPct`. `TelaAdequacao.tsx`: estado local do aviso; só número inteiro muda a meta; o campo mostra o valor
   arredondado.
3. `npm run check`. Commit `fix(adequacao): mínimo da meta só com número inteiro`.

### T6 · Meses além dos anos sem piscar
1. Testes em `etapa1.test.tsx` com relógio falso: digitar "2" e "8" seguidos num adulto nunca mostra o campo; "8" e
   esperar 500 ms mostra; "8" e sair do campo mostra na hora (CA-784); idade apagada (CB-243); "8" e Tab: o campo de
   meses existe e tem o foco (CB-248). Ajustar o teste antigo do CA-331 (passa a esperar o meio segundo).
2. Ver falhar. Gancho `usarValorAssentado(valor, ms)` em arquivo próprio; o `CartaoPessoa` decide os campos pela idade
   assentada; ao sair do campo ou no Tab (com `flushSync`), assenta na hora.
3. `npm run check`. Commit `fix(etapa1): meses além dos anos não pisca ao digitar a idade`.

### T7 · Toque de 44 px no celular
1. e2e em 390 px: mede o "Fechar" de Modelos de plano, de Dieta para imprimir e da gaveta do Cobrir (CA-788); as
   pílulas da etapa 1, da ficha e de Configurações (CA-789); a trilha, os itens do Exportar, os botões e links da Ajuda e
   o "Ver as fontes" (CA-790).
2. Ver falhar. Classes com `max-sm:` (ou `h-11 sm:h-…`) nas peças da biblioteca; a trilha ganha uma área de toque
   maior sem mudar o desenho; os links da Ajuda viram botões com altura mínima.
3. Vitrine conferida. `npm run check`. Commit `fix(toque): alvos de 44 px no celular`.

### T8 · Textos sem repetição
1. Testes: `TelaPacientes` sem o título "Pacientes" dentro (CA-791); ficha com a frase das restrições uma vez; etapa 1
   com "Observações" uma vez e o campo ainda achável pelo nome; `CartaoLinkMissoes` sem `docs/` (CA-792); texto-guia
   com "colheres" e "Faltam 244 mg" (CA-793).
2. Ver falhar. Mudar os textos.
3. `npm run check`. Commit `fix(textos): cada coisa dita uma vez`.

### T9 · Tabela de alimentos
1. Testes: `catalogo.test.ts` (ordem por nome ignora espaço no começo; CA-794); `TelaAlimentos` com espaço sem quebra em
   "100 g".
2. Ver falhar. Ordenar pelo nome sem espaços nas pontas; espaço sem quebra entre o número e a unidade.
3. `npm run check`. Commit `fix(alimentos): ordem por nome e 100 g sem quebra`.

### T10 · Seletor de referência no celular
1. e2e em 360 e 390 px: cada opção do seletor de referência tem a altura de uma linha (CA-795).
2. Ver falhar. Rótulos sem quebra dentro do seletor que já rola de lado.
3. `npm run check`. Commit `fix(adequacao): seletor de referência numa linha no celular`.

### T11 · Cada tela de ponta a ponta, e o teclado
1. e2e `CA-797` em 390 e 1280 px para cada tela do critério: abre, sem erro no console, `scrollWidth` igual à largura,
   ação principal (busca, abrir, adicionar, gerar, imprimir, baixar, trocar o tema…). `CA-799`: primeiro Tab no "Pular
   para o conteúdo", anel visível no foco, Esc fecha janela e gaveta.
2. Rodar; o que falhar é defeito e vira correção na tarefa certa (ou tarefa nova neste plano antes do código).
3. Commit `test(e2e): cada tela da área de trabalho em 390 e 1280`.

### T12 · Telas com servidor, dados falsos
1. Teste de tela `CA-798`: Negócio, Aprovações, as três travas, "Carregando seus dados…", "Sair" com mudança não salva e
   a barra de versão nova, cada uma com o título e a ação principal, com dados falsos (os mesmos ajudantes dos testes de
   hoje).
2. Commit `test(telas): telas com servidor abrem com dados falsos`.

### T13 · PRODUCT.md e AGENTS.md
1. Teste de texto `CA-796` (`src/data/documentos.test.ts`, como os testes de texto do SQL): os dois arquivos não dizem
   "funciona offline", "nuvem é opcional", "fica no aparelho", "sem login"; dizem "nuvem", "Sair" e "sem internet".
2. Ver falhar. Reescrever só os trechos do modelo de dados (e o que eles arrastam: o que já foi construído), com a
   spec `dados-na-nuvem` como fonte.
3. Commit `docs: produto e agentes no modelo de dados na nuvem`.

### T14 · Validação
`npm run check`, `npx playwright test` (cópia temporária da configuração numa porta só desta frente), `npm run build`.
Prints de depois em 1280 e 390 px (mesmo roteiro dos de antes), relatório em
`…\scratchpad\rodada-1910\revisao-geral-trabalho-report.md`.

## Riscos e decisões para o dono revisar

| # | Risco ou decisão |
|---|---|
| R-240 | As peças da biblioteca (Fechar, pílulas, itens de menu) ficam com 44 px no celular em **todas** as telas, inclusive as públicas e as de conta, que são de outra frente. Só a altura no celular muda; no computador nada muda |
| R-241 | O planejador deixa de mostrar medida de pedaço com mais de 4 pedaços ("Banana · 5 fatias" vira só os gramas), como a folha já faz |
| R-242 | O Word de aconselhamento passa a dizer "ponta de faca" e deixa de dizer "fatia" de manteiga, como a folha |
| R-243 | O Ctrl+P imprime a tela como ela é, com os botões de dentro do conteúdo (Cobrir, Abrir…). Para entregar ao paciente, continua sendo "Exportar › Dieta para imprimir" |
| R-244 | A dieta do link do paciente continua com a medida de antes (R-182 da `impressao-do-plano`): a margarina pode sair sem medida no link e com "ponta de faca" na folha |
| R-246 | Produto apagado não deixa cópia: o plano fica com "Produto apagado", sem valores, até a pessoa trocar a linha. Guardar uma cópia escondida manteria os números, mas o produto continuaria existindo depois de a pessoa mandar apagar |
| R-245 | Um mínimo da meta com casa decimal guardado antes desta versão passa a valer arredondado: um nutriente entre o valor antigo e o arredondado pode mudar de "abaixo" para "na meta" (ou o contrário) |
