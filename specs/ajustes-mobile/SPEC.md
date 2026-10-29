# SPEC — Ajustes do celular (site e app)

Status: **pedido do dono em 29/10/2026**: "tem campos quebrados, textos ultrapassando bordas, tem muitas falhas
visuais". Regra "apenas faça": esta spec vem da auditoria e vale como aprovada.

**Fonte:** a auditoria de 29/10/2026 percorreu 790 estados: 78 telas, em 360, 390, 412 e 768 px, nos dois temas, com
dados normais, de pior caso e vazios. As 30 falhas M-001 a M-030 abaixo saem dela. As provas (prints e scripts) ficam
fora do repositório, na pasta de trabalho do coordenador (`auditoria-mobile/`).

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-800 | **Nenhuma tela rola para o lado** em 360, 390, 412 e 768 px, com dados normais e de pior caso (nome enorme, e-mail sem espaço, número grande). Grade de uma coluna no celular é `minmax(0,1fr)`; filho de flex que leva texto tem `min-w-0` | Padrão transversal 1 da auditoria (M-001, M-004, M-014) |
| D-801 | **O que identifica não se corta numa linha.** O nome de paciente, plano, nutriente, alimento ou receita quebra em até 2 linhas (`line-clamp-2` e `break-words`) e mostra o resto no `title`. `truncate` fica só para texto secundário | Padrão transversal 2 (M-003, M-005, M-006, M-007, M-008): dois itens diferentes ficavam iguais na tela |
| D-802 | **Alvo de toque com 44 px** em toda largura de toque, inclusive 768 px (tablet), e interruptor com área de toque de 44 px | M-018, M-019 |
| D-803 | **Número digitado sempre inteiro à vista.** Um campo numérico mostra pelo menos 5 algarismos mais o sufixo | M-002 |
| D-804 | **Nada fixo ocupa mais de 15% da altura** de uma tela de 360 × 740 | M-012 |
| D-805 | **Tudo pelo design system:** a correção usa tokens e componentes da biblioteca, sem valor de cor, fonte, espaço ou raio escrito no código (`npm run check` cobra) | Regra do projeto |

## 2. Critérios de aceite

- **CA-1800** · Para cada falha M-xxx da seção 3: dada a tela e a largura afetadas, com os dados que a auditoria usou,
  então a falha não acontece. Cada M-xxx tem pelo menos um teste (unidade ou navegador) que cita o ID e falha antes da
  correção.
- **CA-1801** · Dadas todas as telas da auditoria em 360, 390, 412 e 768 px, nos dois temas, com dados de pior caso,
  então `document.documentElement.scrollWidth <= innerWidth` (D-800).
- **CA-1802** · Dado o que a auditoria marcou como "segurou bem" (link do paciente, telas de conta, checkout, diálogos,
  estados vazios e tema escuro), então continua igual: sem regressão nos e2e que já existem.

## 3. As falhas (cópia da auditoria de 29/10/2026)


Formato:
- **Gravidade:** grave = impede o uso, campo inutilizável ou texto ilegível; média = transborda ou fica feio e visível; baixa = detalhe.
- **Larguras:** c = claro, e = escuro.
- **Conjuntos de dados:** N = normal, P = pior caso, V = vazio.

### Graves

#### M-001 · grave · Meus alimentos: a página inteira rola para o lado
- **Tela:** Meus alimentos (lista, e o diálogo Editar que abre a partir dela).
- **Larguras:** 360, 390 e 412, claro e escuro, com P. Em 768 está certo.
- **O que acontece:**
  - um alimento com nome sem espaço ("SuperProteinBarChocolate…") ou comprido deixa cada cartão com 1.009 px;
  - a página fica com 1.025 px de largura num celular de 360;
  - no celular, o navegador afasta o zoom ou rola de lado, e o diálogo Editar abre com 672 px, descentralizado e fora da tela;
  - os botões Editar/Excluir de cada cartão ficam fora da tela.
- **Prints:**
  - `meus-alimentos/meus-alimentos-pior-360-claro.png`
  - `meus-alimentos/meus-alimentos-pior-360-claro-marcado.png`
  - `meus-alimentos-editar/meus-alimentos-editar-pior-360-claro.png`
  - `_folhas/meus-alimentos-pior-360-claro-folha.png`
- **Onde:** `src/ui/produtos/TelaProdutos.tsx:115`, `<ul className="grid gap-4 sm:grid-cols-2">`. Abaixo de 640 px a grade tem uma coluna `auto`, e o `h2` com `truncate` (linha 128) tem largura mínima igual ao texto inteiro.
- **Correção sugerida:** `grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2`, como em Pacientes, e `min-w-0` no `li`. Se quiser ver o nome inteiro, trocar `truncate` por `line-clamp-2 break-words`.

#### M-002 · grave · Campo de gramas corta valores de 4 dígitos ("1250" aparece "125")
- **Telas:** ficha do caso › Refeições (cada alimento) e Receitas › Editar receita (ingredientes).
- **Larguras:** 360, 390 e 412 (todo celular abaixo de 640 px), claro e escuro. Aparece com 1.000 g ou mais (P). Em 768 cabe.
- **Prints:**
  - `_provas/M-002-plano-etapa2-refeicoes-pior-360.png`: "125(" no campo, com "O paciente lê: 1.250 g" logo abaixo;
  - `_provas/M-002b-receitas-editor-pior-360.png`: "123(" para 1234.
- **Onde:**
  - `src/ui/plano/LinhaItem.tsx:122`: `w-[5.25rem]`, 84 px. O comentário diz "84 px bastam para 1000 g", mas não bastam.
  - O campo tem `px-3` (`design-system/componentes/forms/input.tsx:17`) e `pr-9` para o sufixo (`design-system/componentes/forms/CampoTexto.tsx:64`). Sobram cerca de 34 px para o número.
  - No celular a letra é de 16 px (CA-979), e 4 dígitos pedem cerca de 40 px.
- **Correção sugerida:**
  - `w-24` também no celular, ou `min-w-[6rem]`;
  - sufixo mais estreito (`pr-7`, `right-2.5`);
  - `tabular-nums` no campo;
  - um teste com 1000 e 9999 g em 360 px.

#### M-003 · grave · "Micronutrientes" do dia corta o nome do nutriente
- **Tela:** ficha do caso › Refeições, cartão Micronutrientes (coluna lateral, que no celular vai para o fim da página).
- **Larguras:** 360 e 390, claro e escuro, com **N e P**.
- **O que acontece:**
  - com N, "Piridoxina …" perde o "(B6)";
  - com P, "Vitamina …" (não dá para saber qual vitamina), "Cálc…" e "Fósf…".
- **Prints:**
  - `_provas/M-003-plano-etapa2-refeicoes-pior-360.png`
  - `_provas/M-003b-plano-etapa2-refeicoes-normal-360.png`
- **Onde:** `src/ui/adequacao/MicrosDoDia.tsx:117` e `:129`. O rótulo tem `min-w-0 flex-1 truncate`, enquanto "294% da referência · acima do limite" e o botão Cobrir não encolhem. Na lista "acima" (linha 127) há `flex-wrap`, mas o rótulo encolhe até sumir antes de quebrar a linha.
- **Correção sugerida:**
  - nome do nutriente sem `truncate` (`shrink-0` ou `basis` mínima);
  - o texto do percentual desce para a linha de baixo no celular (`flex-wrap` + `basis-full` no percentual abaixo de `sm`);
  - ou a frase longa vira só "294% · acima do limite".

#### M-004 · grave · Aprovações (administrador): e-mail sem quebra alarga a página e tira Aprovar/Recusar da tela
- **Tela:** Aprovações › Estudantes.
- **Larguras:** 360, 390 e 412, claro e escuro, com P (e-mail de 82 caracteres).
- **O que acontece:**
  - a página fica com 561 px, e todos os itens da fila também;
  - "Recusar" e "Aprovar" ficam em x = 337 a 581 px;
  - a imagem do comprovante fica com 545 px.
- **Print:** `aprovacoes/aprovacoes-pior-360-claro-marcado.png`
- **Onde:** `src/ui/aprovacoes/AbaEstudantes.tsx:108`, `grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]`: abaixo de `lg`, coluna `auto`. O e-mail fica sem quebra na linha 139 (`<p className="text-sm text-muted-foreground">{aberto.email}</p>`).
- **Correção sugerida:** `grid-cols-[minmax(0,1fr)]` na base, `[overflow-wrap:anywhere]` (ou `break-all`) no e-mail da linha 139 e `min-w-0` na `section` (linha 133).

### Médias

#### M-005 · média · Título do cabeçalho cortado: o nome do plano/paciente some
- **Telas:** todas as do plano (etapas 1, 2 e 3, Cobrir, Exportar) e a ficha do paciente.
- **Larguras:**
  - com **N**, 360 a 412 ("Ana — r…" ou "Ana — reto…");
  - com P, até 768 ("Plano alimentar de manutenção — retorno de out…").
- **Prints:**
  - `_provas/M-005-plano-etapa2-refeicoes-normal-360.png`
  - `_provas/M-005b-plano-etapa2-refeicoes-pior-390.png`
- **Onde:** `src/ui/layout/Cabecalho.tsx:47` (`h1 truncate`). Disputa a mesma linha com a situação da nuvem ("Salvo"/"Salvando…", linha 49) e as ações `shrink-0` (linha 51), como o botão "Exportar".
- **Correção sugerida:**
  - no celular, `line-clamp-2` no `h1` com `text-lg`;
  - "Exportar" vira só ícone abaixo de `sm` (com `aria-label`);
  - "Salvo" vira um ícone pequeno;
  - ou as ações descem para uma segunda linha.

#### M-006 · média · Linhas de lista (`LinhaLista`) cortam o título e o detalhe
- **Telas:**
  - Painel › "Onde você parou" e "Falta completar" (até "Nenhum paciente cada…" no V);
  - Receitas (lista);
  - "Hoje e esta semana".
- **Larguras:** todas, até 768, e com **N**. "Ana — retorno de ou…" e "Alterado hoje às 07:00 · …" perdem justamente o paciente ou o modo. Em Receitas o detalhe perde as kcal.
- **Prints:**
  - `_provas/M-006-painel-normal-360.png`
  - `_provas/M-006b-receitas-pior-360.png`
  - `_janelas/v1.png` (Painel vazio)
- **Onde:** `design-system/componentes/display/LinhaLista.tsx:30-31`, com `block truncate` no título e no detalhe.
- **Correção sugerida:** `line-clamp-2 break-words` no título e quebra livre no detalhe. Ou uma propriedade `quebrar`, ligada por padrão no celular. Conferir os três consumidores: `TelaPainel.tsx`, `HojeEEstaSemana.tsx` e `TelaReceitas.tsx`.

#### M-007 · média · Cartões de Planos e Pacientes: nomes cortados ficam iguais
- **Telas:** Planos, Pacientes e o histórico de planos da ficha do paciente.
- **Larguras:** todas, com P (e com N em Planos: "Exemplo — Maria, 28 an…").
- **O que acontece:**
  - 10 cartões "Plano de reeducação al…" e 49 cartões "Francisca das Chagas Nascime…" idênticos;
  - o `title` do cartão não ajuda no toque.
- **Prints:**
  - `_provas/M-007-planos-pior-360.png`
  - `_provas/M-007b-pacientes-pior-390.png`
- **Onde:**
  - `src/ui/casos/CartaoCaso.tsx:26`
  - `src/ui/pacientes/TelaPacientes.tsx:76`
  - `src/ui/pacientes/TelaPaciente.tsx:181`

  Os três usam `truncate` no nome.
- **Correção sugerida:** `line-clamp-2 break-words` nos três. Em Planos, mostrar também o nome do paciente no detalhe.

#### M-008 · média · Tabela de alimentos: o corte esconde o que diferencia os itens
- **Tela:** Tabela de alimentos (resultado da busca).
- **Larguras:** 360 a 412, com N.
- **O que acontece:** "Margarina, com óleo interesterificado, com s…" e "…sem s…" (com sal e sem sal) ficam iguais.
- **Print:** `_provas/M-008-tabela-alimentos-normal-360.png`
- **Onde:** `src/ui/alimentos/TelaAlimentos.tsx:266` (`line-clamp-2`).
- **Correção sugerida:** `line-clamp-3` no celular, ou tirar o limite. Os nomes da TACO vão até 64 caracteres.

#### M-009 · média · Menu "Novo plano" mais largo que a tela
- **Telas:** Planos e Painel (botão "Novo plano" do cabeçalho).
- **Larguras:** 360 (medido: 403 px numa tela de 360); 390 por inferência (403 > 390). Em 412 cabe por pouco.
- **O que acontece:** o lado direito do menu e da descrição ("Peso e estatura são opcio…") fica cortado.
- **Print:** `_provas/M-009-novo-plano-menu-normal-360.png`
- **Onde:**
  - `src/ui/caso/EscolherModo.tsx:30` (`min-w-[19rem]`);
  - `design-system/componentes/overlay/dropdown-menu.tsx:17`: o conteúdo não tem largura máxima e a descrição não quebra.
- **Correção sugerida:** no design system, `max-w-[min(var(--radix-dropdown-menu-content-available-width),calc(100vw-1rem))]` no conteúdo do menu e `whitespace-normal` no item. Em `EscolherModo`, `w-[min(19rem,calc(100vw-1rem))]`.

#### M-010 · média · Gaveta Cobrir: o botão "Adicionar em <refeição>" sai da gaveta
- **Tela:** ficha do caso › Adequação › Cobrir.
- **Larguras:** 360 a 768, com P (refeição "Almoço de domingo na casa da sogra (com sobremesa liberada)").
- **O que acontece:** o botão fica com 467 px num espaço de 312, e o texto é cortado na borda sem reticências.
- **Prints:**
  - `_provas/M-010-plano-cobrir-pior-390.png`
  - `plano-cobrir/plano-cobrir-pior-360-claro-janela.png`
- **Onde:**
  - `src/ui/adequacao/GavetaCobrir.tsx:210-211` (`` `Adicionar em ${destino.nome}` ``);
  - o `Button` do design system tem `whitespace-nowrap` (`design-system/componentes/forms/button.tsx:17`).
- **Correção sugerida:** neste botão, `whitespace-normal h-auto min-h-11 py-2 text-left`. Ou cortar o nome da refeição com `max-w` + `truncate` dentro do botão, mantendo o nome inteiro no `aria-label`.

#### M-011 · média · Conta (estudante): a matrícula longa invade a coluna ao lado
- **Tela:** Conta e assinatura › cartão "Estudante de nutrição".
- **Larguras:** 360 e 412, com P (matrícula de 22 dígitos).
- **O que acontece:** o valor de "Verificada em" fica por baixo do número.
- **Print:** `_provas/M-011-conta-estudante-pior-360.png`
- **Onde:** `src/ui/conta/CartaoSituacao.tsx:34` (`dd`, sem quebra). As grades das linhas 49 e 66 têm `grid-cols-2`.
- **Correção sugerida:** `[overflow-wrap:anywhere]` no `dd` da linha 34. O mesmo vale para `src/ui/aprovacoes/AbaEstudantes.tsx:149`.

#### M-012 · média · Site: cabeçalho fixo ocupa até 22% da tela
- **Telas:** Preços, Termos, Privacidade e Fontes (`/precos/`, `/termos/`, `/privacidade/`, `/fontes/`).
- **Larguras:** 164 px em 360 (três linhas: logo, Entrar/Começar grátis, menu); 116 px em 390 e 412; 72 px em 768. A landing usa outro cabeçalho, de 68 px.
- **Print:** `_provas/M-012-site-precos-normal-360.png`: com a página rolada, o cabeçalho cobre o topo do cartão Solo.
- **Onde:** `src/ui/publico/MolduraPublica.tsx:100-101` (`header sticky` + `flex-wrap`).
- **Correção sugerida:**
  - no celular, uma linha só: logo + "Começar grátis", com Entrar, Como funciona e Preços num menu, como a barra da landing;
  - ou `sticky` só a partir de `md`.

#### M-013 · média · Painel: o aviso do estudante espreme o texto numa coluna estreita
- **Tela:** Painel com o pedido de estudante recusado.
- **Larguras:** 360 e 412, com P (motivo longo).
- **O que acontece:** ícone, texto e botão "Enviar outro" ficam na mesma linha, e o texto vira uma coluna de cerca de 130 px com 15 linhas.
- **Print:** `_provas/M-013-painel-estudante-recusado-pior-360.png`
- **Onde:** `src/ui/painel/AvisoEstudante.tsx:39-43`. Tem `flex-wrap`, mas o texto é `min-w-0 flex-1`, então encolhe em vez de quebrar a linha.
- **Correção sugerida:** abaixo de `sm`, `basis-[calc(100%-3.5rem)]` no texto ou `flex-col items-start`, com o botão embaixo.

#### M-014 · média · Negócio (administrador): valor grande alarga a grade e a página rola para o lado
- **Tela:** Negócio.
- **Larguras:** 360, 390 e 412, com P (receita de R$ 24.693.353,80).
- **O que acontece:** os cartões ficam com 335 px num espaço de 328, e a página com 393 px.
- **Prints:**
  - `negocio/negocio-pior-360-claro-marcado.png`
  - `_folhas/negocio-pior-360-claro-folha-1.png`
- **Onde:** `src/ui/negocio/NumerosDoNegocio.tsx:11` (`grid gap-4 sm:grid-cols-2…`, coluna `auto` no celular) e o número de `design-system/componentes/display/CartaoNumero.tsx:39` (`text-4xl`, não quebra).
- **Correção sugerida:** `grid-cols-[minmax(0,1fr)]` na base e `text-[clamp(1.75rem,8vw,2.25rem)]` ou `break-all` no valor do cartão.

#### M-015 · média · Negócio: o rótulo do gráfico e a coluna "Por mês" estouram
- **Tela:** Negócio › Receita por mês e Assinaturas por plano.
- **Larguras:** todas, com **N** e P.
- **O que acontece:**
  - com N, "R$ 149,00" é cortado na borda do cartão;
  - com P, "R$ 24.693.3…" é cortado, e "R$ 24.691.357,80" passa da coluna de 6rem.
- **Print:** `_provas/M-015-negocio-normal-360.png`
- **Onde:**
  - `design-system/componentes/display/GraficoBarras.tsx:68`: o rótulo é `absolute inset-x-0` dentro de uma barra de 30 px;
  - `src/ui/negocio/AssinaturasPorPlano.tsx:40` e `:46`: `grid-cols-[minmax(0,1fr)_3rem_6rem]`.
- **Correção sugerida:**
  - no gráfico, rótulo em formato compacto (`Intl.NumberFormat('pt-BR', { notation: 'compact' })`, "R$ 24,7 mi") e preso à borda (`right-0` na última barra);
  - na tabela, `6rem` → `minmax(6rem,auto)` ou o valor compacto.

#### M-016 · média · Negócio: a tabela de contas no celular mostra uma coluna e meia; 400 contas sem paginação
- **Tela:** Negócio › Contas.
- **Larguras:** 360 a 412. Com P, a página chega a 30.555 px.
- **O que acontece:** a tabela tem largura mínima de 44rem dentro de uma rolagem lateral. No celular aparecem só "Pessoa" e metade de "Situação", sem sinal de que existe mais à direita, e o seletor "Todas | Nutricionistas | Estudant…" também é cortado.
- **Prints:**
  - `_provas/M-016-negocio-normal-360.png`
  - `negocio/negocio-pior-360-claro.png`
- **Onde:** `src/ui/negocio/ListaDeContas.tsx:54` (`Table className="min-w-[44rem]"`) e `:65` (`visiveis.map`, todas de uma vez). O seletor está na linha 41.
- **Correção sugerida:**
  - abaixo de `md`, lista em cartões (nome, e-mail, situação, plano);
  - paginar ("Mostrar mais 50");
  - degradê na borda do seletor que rola.

#### M-017 · média · Aprovações › CRN: o e-mail sem quebra fica por cima do número do CRN
- **Tela:** Aprovações › CRN.
- **Larguras:** 412 e 768, com P. Em 360 a linha quebra antes.
- **Print:** `_provas/M-017-aprovacoes-crn-pior-412.png`
- **Onde:** `src/ui/aprovacoes/AbaCrn.tsx:56-60`. A coluna do nome é `min-w-40 flex-1`, e o e-mail (linha 58) não quebra. O CRN tem `w-32` (linha 60).
- **Correção sugerida:** `min-w-0` + `[overflow-wrap:anywhere]` no e-mail, e `shrink-0` no CRN.

#### M-018 · média · Tablet (768 px): todos os controles voltam ao tamanho de computador
- **Telas:** todas; 438 elementos abaixo de 44 px em 768.
- **Larguras:** 768 (e qualquer largura de 640 em diante com toque).
- **O que acontece:**
  - botões com 32 px (`size="sm"` e `iconsm`) ou 40 px (`default`);
  - campos com 40 px;
  - o "Fechar" dos diálogos com 28 × 28;
  - o seletor segmentado com 36 px.
- **Prints:**
  - `plano-etapa2-refeicoes/plano-etapa2-refeicoes-768-claro.png`
  - os `resultados/*-768-*.json` (tipo `toque-pequeno`)
- **Onde:**
  - `design-system/componentes/forms/button.tsx:34-38` (`sm:h-10`, `sm:h-8`, `sm:size-10`, `sm:size-8`);
  - `design-system/componentes/forms/input.tsx:17` (`sm:h-10 sm:text-sm`);
  - `design-system/componentes/overlay/dialog.tsx:45` (`max-sm:size-11`; fora disso, `p-1`).

  O ponto de virada é a largura (`sm` = 640), não o tipo de ponteiro.
- **Correção sugerida:** trocar `sm:` dessas densidades por uma variante de ponteiro fino, por exemplo `@custom-variant fino (@media (pointer: fine))` no Tailwind v4. Assim tablet e celular de toque ficam com 44 px, e o mouse com a densidade de hoje.

#### M-019 · média · Interruptor (Switch) com 36 × 20 px
- **Telas:**
  - Novo alimento ("Pode aparecer no Cobrir e nas trocas");
  - Imprimir ("Lista de compras", "Trocas");
  - Cobrir ("Incluir ingredientes…").
- **Larguras:** todas, inclusive 360. Abaixo dos 24 px mínimos do WCAG 2.2.
- **Print:** `meus-alimentos-novo/meus-alimentos-novo-360-claro-janela-fim.png`
- **Onde:** `design-system/componentes/forms/switch.tsx:10` (`h-5 w-9`).
- **Correção sugerida:** área de toque de 44 px em volta, com `relative` + `before:absolute before:-inset-3`, ou a linha inteira como `<label>`; visual `h-6 w-11` no toque.

### Baixas

#### M-020 · baixa · Menu lateral: itens de 40 px; seletor de tema com 28 px e letra de 11 px
- **Telas:** menu lateral (celular), de 360 a 412.
- **Print:** `menu-lateral/menu-lateral-360-claro-janela.png`
- **Onde:**
  - `design-system/componentes/navigation/ItemMenu.tsx:23` (`min-h-10`);
  - `src/ui/layout/SeletorTema.tsx:28` (`py-1.5 text-[11px]`).
- **Correção sugerida:** `min-h-11`, e `min-h-11 text-xs` no seletor.

#### M-021 · baixa · Selos e contadores com letra de 11 px
- **Telas:** Conta ("CRN conferido", "Ativa"), Negócio, Aprovações, Preços ("Recomendado") e o menu lateral (contador "30 casos").
- **Onde:**
  - `design-system/componentes/display/badge.tsx:10` (`text-2xs`);
  - o contador do menu (`text-[11px]`, `src/ui/layout/MenuLateral.tsx:106`).
- **Correção sugerida:** `text-xs` (12 px) no mínimo.

#### M-022 · baixa · Faixa de sugestões corta o chip no meio, sem sinal de que rola
- **Tela:** ficha do caso › Refeições, de 360 a 412, com N.
- **O que acontece:** "+ Cuscuz, de milho, cozido com … 1:" e "+ M" ficam cortados na borda. A rolagem é de propósito (CA-336), mas não há degradê nem seta.
- **Print:** `_provas/M-022-plano-etapa2-refeicoes-normal-360.png`
- **Onde:** `src/ui/plano/SugestoesDaRefeicao.tsx:42`.
- **Correção sugerida:** máscara em degradê na borda direita (`[mask-image:linear-gradient(to_right,black_85%,transparent)]`) e `scroll-snap`.

#### M-023 · baixa · Horário da refeição com dois relógios
- **Tela:** ficha do caso › Refeições, em todas as larguras.
- **Print:** `_provas/M-023-plano-etapa2-refeicoes-pior-360.png`
- **Onde:** `src/ui/plano/CartaoRefeicao.tsx:92-104`: um ícone Lucide à esquerda mais o seletor nativo do `type="time"`, num campo de 112 px.
- **Correção sugerida:** tirar o ícone da esquerda ou esconder o indicador nativo (`[&::-webkit-calendar-picker-indicator]:opacity-0`, mantendo o clique).

#### M-024 · baixa · Conta: e-mail cortado com reticências
- **Tela:** Conta e assinatura, em todas as larguras, com P.
- **Print:** `conta/conta-pior-360-claro.png`
- **Onde:** `src/ui/conta/TelaConta.tsx:124` (`truncate`).
- **Correção sugerida:** `[overflow-wrap:anywhere]`. É a identidade da conta e precisa ser lida inteira.

#### M-025 · baixa · Restos da direção antiga (cantos retos) no mundo arredondado
- **Telas:**
  - Adequação (faixa de resumo com borda reta);
  - Ajuda (números em quadrado);
  - Novo alimento › Rótulo (caixa do código de barras reta).
- **Prints:**
  - `plano-etapa3-adequacao/plano-etapa3-adequacao-360-claro.png`
  - `ajuda/ajuda-360-claro.png`
  - `meus-alimentos-rotulo/meus-alimentos-rotulo-360-claro-janela.png`
- **Onde:**
  - `src/ui/resumo/FaixaResumo.tsx:68` (`section … border border-border bg-card`, sem raio);
  - `src/ui/ajuda/TelaAjuda.tsx:41`;
  - `src/ui/produtos/LeitorCodigo.tsx:92`.
- **Correção sugerida:** usar `Card` ou os raios do `DESIGN.md` (`rounded-3xl` no cartão, `rounded-full` no número).

#### M-026 · baixa · Impressão/PDF: nome de quem assina alinhado à esquerda sob a linha centralizada
- **Telas:** Plano alimentar, Pedido de exames e Suplementos, impressos em A4 (o PDF tem as mesmas linhas).
- **O que acontece:** nomes longos quebram alinhados à esquerda, e o papel ("Nutricionista") fica centralizado.
- **Prints:**
  - `impressao/impressao-exames-pior-a4.png`
  - `impressao/impressao-plano-pior-a4.png`
- **Onde:** `src/ui/exportar/LinhasDeAssinatura.tsx:22` (falta `text-center`).
- **Correção sugerida:** `text-center` no nome.

#### M-027 · baixa · Etapas do plano: a descrição é cortada em 768
- **Tela:** ficha do caso, em 768 ("Alimentos, substitutos e o…").
- **Print:** `plano-etapa2-refeicoes/plano-etapa2-refeicoes-768-claro.png`
- **Onde:** `design-system/componentes/navigation/EtapasDoCaso.tsx:42` (`hidden truncate … sm:block`).
- **Correção sugerida:** mostrar a descrição só a partir de `lg`, ou deixar quebrar em 2 linhas.

#### M-028 · baixa · Telas de conta: cartão branco com os cantos de baixo retos no celular
- **Telas:** Entrar, Criar conta, Comprovar matrícula, Esqueci a senha, de 360 a 412.
- **Print:** `entrar/entrar-360-claro.png`
- **Onde:** `src/ui/publico/conta/MolduraConta.tsx:25`. A grade de duas partes empilha no celular, e o fim do painel branco encosta reto no painel cinza.
- **Correção sugerida:** no celular, dois cartões separados (`gap-4`, cada um com `rounded-3xl`).

#### M-029 · baixa · Adesão: "Remover link" (destrutivo) é a primeira ação
- **Tela:** Adesão, em todas as larguras.
- **O que acontece:** fica colado ao WhatsApp, onde o polegar mira.
- **Print:** `adesao/adesao-pior-360-claro.png`
- **Onde:** `src/ui/missoes/TelaAdesao.tsx:241`.
- **Correção sugerida:** levar "Remover link" para o fim ou para um menu "⋯", com espaçamento.

#### M-030 · baixa · Planos: lista longa sem busca
- **Tela:** Planos, com P (30 planos, cerca de 4.800 px de rolagem). Pacientes tem busca; Planos não.
- **Print:** `planos/planos-pior-360-claro.png`
- **Onde:** `src/ui/casos/TelaCasos.tsx`.
- **Correção sugerida:** campo "Buscar plano", como em Pacientes, ou agrupar por paciente.

---

## O que segurou bem (não mexer)

- **Link do paciente:**
  - missões com 9 itens e textos longos, "Meu plano" com 15 alimentos de nome longo, aviso de estágio;
  - link inexistente e sem internet;
  - nenhuma falha em nenhuma largura ou tema.
- **Telas de conta e checkout com e-mail de 82 caracteres:** quebram certo (o trabalho do CA-744/745 aparece). Checkout, volta do pagamento (pendente, ativa e recusada) e Completar cadastro também estão certos.
- **Ficha do paciente com tudo preenchido:** anamnese, 4 suplementos, 9 exames, pedido de exames e próxima consulta. Os campos ficam dentro da tela.
- **Adesão com 25 links:** nomes enormes quebram em linhas. A Adequação (etapa 3) e a tabela em 768 também estão certas.
- **Diálogos:** Substituto, Imprimir, Metas, WhatsApp, Trocar cartão, Cancelar, Excluir conta, Roteiro, Modelos, Novo alimento e Ficha do alimento cabem e rolam por dentro, e o "Fechar" tem 44 px no celular. Nenhum foco ficou escondido por elemento fixo.
- **Toques no celular (360 a 412):** quase tudo tem 44 px (CA-108 cumprido); as exceções estão em M-019 e M-020.
- **Tema escuro:** nenhuma falha exclusiva; contraste e cores consistentes.
- **Estados vazios** (Painel, Planos, Pacientes, Adesão, Receitas, Meus alimentos, Aprovações, Negócio): limpos.

