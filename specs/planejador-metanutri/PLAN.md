# PLAN: Planejador MetaNutri (MVP)

**Status:** aguardando aprovação · **Data:** 15/09/2026
**SPEC:** `specs/planejador-metanutri/SPEC.md` (aprovada em 15/09/2026)
**Ambiente verificado:** Node 22.16.0 · npm 10.9.2 · git 2.54.0

## 1. Para você revisar (linguagem simples)

| # | O que precisa de você | Minha proposta |
|---|---|---|
| R-1 | **Aprovar duas dependências novas.** `vite-plugin-pwa` faz o site funcionar sem internet depois do primeiro acesso (caso de borda CB-10). `jszip`, só para testes, abre o arquivo Word gerado e confere se o conteúdo está certo | Aprovar as duas. Sem a primeira, o CB-10 sai da SPEC |
| R-2 | **Prazo.** Com crianças, gestantes, medidas caseiras e substitutos, o MVP estimado passa de 6 para **8 a 10 semanas** de trabalho | Seguir assim; as fases 1 e 2 não dependem de visual e podem andar já |
| R-3 | **Portão do visual.** A fase 3 (telas) só começa depois que você definir tema, paleta, fontes e estilo | Já combinado; o plano para nesse ponto e espera você |
| R-4 | **Validação da nutricionista.** Algumas referências clínicas têm mais de uma escolha válida (lista na seção 6) | Eu proponho a fonte, ela confirma antes da fase 3 |

## Progresso (atualizado em 15/09/2026)

| Fase | Situação |
|---|---|
| 0. Fundação | concluída (T-00, T-01, T-02) |
| 1. Dados | concluída (T-10 TACO, T-11 medidas caseiras, T-12 DRI, T-13 energia, T-14 antropometria) |
| 2. Regras | concluída (T-20 a T-33); 449 testes passando, lint e typecheck limpos |
| Portão G-1 | aprovado (template MaterialM, R-5 a R-8 e dependências da fase 3) |
| 3. Telas | em andamento: T-40 a T-44 concluídas; 509 testes passando |
| 4. Validação | não iniciada |

Critérios que dependem só de tela e ainda não têm teste: CA-13 (interação de refeições), CA-16 (tecla Enter e setas), CA-38 (escolher refeição da sugestão), CB-10 e CB-11 (funcionamento offline e desempenho da interface). As regras por trás deles já estão implementadas e testadas.

## 2. Como o código fica organizado

```
nutrisaas/
├─ dados-brutos/          arquivos originais baixados (TACO, POF, OMS) + licenças
├─ scripts/dados/         scripts .mjs que convertem os brutos em JSON (sem dependência extra)
├─ src/data/              JSON gerados e referências transcritas, com fonte em cada arquivo
├─ src/domain/            regras de negócio em TypeScript puro, sem tela (cálculos, busca, cobrir)
├─ src/export/            geração dos arquivos Word e da tabela para copiar
├─ src/ui/                telas (fase 3, estrutura definida depois do visual)
└─ e2e/                   testes de ponta a ponta com Playwright (fase 3)
```

Princípio: tudo que é regra fica em `src/domain` e é testado sem navegador. A tela só chama essas funções. Assim as fases 1 e 2 ficam prontas e testadas antes de existir qualquer design.

## 3. Tarefas na ordem de execução

Cada tarefa vira um commit próprio (Conventional Commits) e só é marcada como feita com lint, typecheck e testes verdes. Coluna "Verifica" = critérios da SPEC que o teste da tarefa cobre.

### Fase 0: Fundação (≈ 1 dia)

| ID | Tarefa | Arquivos | Depende de | Verifica | Commit |
|---|---|---|---|---|---|
| T-00 | Iniciar repositório git e `.gitignore` (node_modules, dist, graphify-out, .playwright-mcp) | `.gitignore` | — | `git status` limpo | `chore: init repo` |
| T-01 | Criar projeto Vite + React 18 + TypeScript strict; ESLint; Vitest; scripts `lint`, `typecheck`, `test` | `package.json`, `package-lock.json`, `.gitattributes` (fim de linha LF, adicionado em 15/09 porque o git no Windows converte para CRLF), `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.setup.ts`, `eslint.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`, `src/App.test.tsx` | T-00 | os três scripts rodam sem erro | `chore: scaffold vite react ts` |
| T-02 | Registrar a SPEC, o PLAN e os docs no primeiro commit de documentação | `specs/`, `docs/` | T-00 | — | `docs: spec e plan do planejador` |

### Fase 1: Dados (≈ 2 semanas, sem tela)

| ID | Tarefa | Arquivos | Depende de | Verifica | Commit |
|---|---|---|---|---|---|
| T-10 | Importar TACO completa (597 alimentos) para JSON; nutriente sem dado vira `null`, nunca 0; traço (Tr) vira 0 marcado em `tracos` | `dados-brutos/README.md`, `dados-brutos/taco/taco_composicao.csv`, `dados-brutos/taco/LICENSE`, `dados-brutos/taco/dicionario-dados.md`, `scripts/dados/importar-taco.mjs`, `src/data/alimentos.json`, `src/data/alimentos.test.ts` | T-01 | 597 itens; 10 valores conferidos contra o CSV; ausências como `null` (CA-32) | `feat(dados): importa tabela taco` |
| T-11 | Associar medidas caseiras da POF aos alimentos da TACO por regras revisadas à mão (*ajuste de 15/09: a correspondência automática por nome cobre só 13% e erra variedade e preparo; as regras cobriram 287 alimentos*) | `dados-brutos/pof/pof_medidas_caseiras.csv`, `dados-brutos/pof/regras-mapeamento-taco-pof.csv`, `scripts/dados/importar-medidas-pof.mjs`, `src/data/medidas-caseiras.json`, `src/data/medidas-revisao.md`, `src/data/medidas-caseiras.test.ts` | T-10 | gramas por medida conferidas em 20 amostras; alimento sem medida fica sem entrada (CB-07) | `feat(dados): medidas caseiras pof` |
| T-12 | Extrair DRI (EAR, RDA, AI, UL, CDRR do sódio e AMDR) para todos os estágios de vida a partir de 1 ano, incluindo gestação e lactação, a partir das tabelas oficiais do NCBI salvas em HTML; registrar o escopo do UL quando ele não vale para alimentos (magnésio, niacina, folato, vitamina E, vitamina A pré-formada). *Ajuste de 15/09: extração por script em vez de digitação manual, para reduzir erro* | `dados-brutos/dri/*.html`, `scripts/dados/importar-dri.mjs`, `src/data/dri.json`, `src/data/dri.test.ts` | T-01 | 40+ valores digitados à mão a partir das tabelas conferidos contra o JSON; toda faixa tem RDA ou AI para cada micronutriente da TACO | `feat(dados): tabelas dri` |
| T-13 | Referências de energia NASEM 2023: equações de EER por idade, sexo e categoria de atividade (crianças, adolescentes, adultos), equações de gestação, custo de crescimento, depósito na gestação por IMC e custo de produção de leite, extraídos das tabelas S-1 a S-6 salvas em HTML | `dados-brutos/energia/*.html`, `scripts/dados/importar-energia.mjs`, `src/data/energia.json`, `src/data/energia.test.ts` | T-01 | coeficientes digitados à mão conferidos contra o JSON; constantes das notas conferidas contra o texto das notas | `feat(dados): referencias de energia` |
| T-14 | Referências antropométricas: IMC adulto e idoso, cintura por sexo, panturrilha, curvas OMS (IMC e estatura para idade, 1 a 19 anos), IMC pré-gestacional e ganho de peso | `dados-brutos/oms/*.xlsx`, `dados-brutos/antropometria/*.txt`, `scripts/dados/importar-curvas-oms.mjs`, `src/data/antropometria.json`, `src/data/curvas-oms.json`, `src/data/antropometria.test.ts`, `src/data/curvas-oms.test.ts` | T-01 | LMS conferidos contra as colunas de escore-z das próprias planilhas; pontos de corte conferidos contra o texto da norma do SISVAN e das curvas brasileiras. *Ajuste de 15/09: a "calculadora da OMS" é um programa desktop; a conferência usa as colunas SD da própria tabela oficial* | `feat(dados): referencias antropometricas` |

### Fase 2: Regras de negócio (≈ 3 semanas, sem tela, com TDD)

| ID | Tarefa | Arquivos | Depende de | Verifica | Commit |
|---|---|---|---|---|---|
| T-20 | Tipos do domínio: Caso, Plano, Refeição, Opção (Principal, Substituto 1 e 2), Item; acesso tipado às tabelas JSON (*arquivo `tabelas.ts` adicionado em 15/09*) | `src/domain/tipos.ts`, `src/domain/tabelas.ts`, `src/domain/tabelas.test.ts` | T-10, T-12 | typecheck; busca de alimento e estágio por id | `feat(domain): tipos base` |
| T-21 | Validação do caso: campos vazios, faixas plausíveis, vírgula decimal, combinações inválidas de gestação e lactação, idade menor que 1 ano | `src/domain/caso.ts`, `src/domain/caso.test.ts` | T-20 | CB-01, CB-02, CB-02a, CB-02b, CB-03, CB-12 | `feat(domain): validacao do caso` |
| T-22 | Antropometria: IMC e classificação por idade, escore-z infantil, IMC pré-gestacional e ganho de peso, cintura, panturrilha | `src/domain/antropometria.ts`, `…test.ts` | T-14, T-21 | CA-02, CA-02a, CA-02b, CA-02c, CA-03, CA-04, CA-05 | `feat(domain): antropometria` |
| T-23 | Energia: TMB (Mifflin, Harris-Benedict), fatores e fator livre, GET manual, equações infantis, adicionais de gestação e lactação, % do GET | `src/domain/energia.ts`, `…test.ts` | T-13, T-21 | CA-06 a CA-11, CA-06a, CA-06b, CA-06c | `feat(domain): energia` |
| T-24 | Totais do plano: soma só do Principal, contagem de alimentos sem dado, quantidade zero e plano vazio | `src/domain/totais.ts`, `…test.ts` | T-10, T-20 | CA-32, CA-43, CB-04, CB-05 | `feat(domain): totais do plano` |
| T-25 | Macronutrientes: gramas, % das kcal, g/kg, faixas padrão por idade, meta editável | `src/domain/macros.ts`, `…test.ts` | T-24 | CA-22, CA-23, CA-24, CA-31a | `feat(domain): macros` |
| T-26 | Adequação: presets Individual, Coletivo e Personalizado, AI quando falta referência, alerta de UL, troca de faixa por estágio de vida | `src/domain/adequacao.ts`, `…test.ts` | T-12, T-24 | CA-25 a CA-31, CA-33 (fonte exposta pelo resultado) | `feat(domain): adequacao` |
| T-27 | Entrada rápida: interpretar "150 arroz int" e "2 colher de sopa arroz", busca sem acento com até 5 resultados, não adicionar sem correspondência, teste de desempenho | `src/domain/busca.ts`, `…test.ts` | T-10, T-11 | CA-15 a CA-18, CA-20, CA-21, CB-07 | `feat(domain): entrada rapida` |
| T-28 | Cobrir: quanto falta, até 5 sugestões com porção máxima, menor acréscimo de kcal, avisos de GET e UL, lista vazia explicada, sugestões ocultas | `src/domain/cobrir.ts`, `…test.ts` | T-26 (o GET entra como parâmetro; T-23 fica independente) | CA-34 a CA-37, CA-36a, CA-39, CA-40, CB-06 | `feat(domain): cobrir micronutriente` |
| T-29 | Substitutos: porção equivalente por kcal, proteína ou carboidrato e diferenças de macros | `src/domain/substitutos.ts`, `…test.ts`, `src/domain/busca.ts` e `busca.test.ts` (conversão de gramas para a medida caseira mais legível, usada também em CA-19 e CA-44; *adicionado em 15/09*) | T-11, T-24, T-27 | CA-19, CA-41, CA-42 | `feat(domain): substitutos` |
| T-33 | Operações do plano: 6 refeições padrão, adicionar, remover, renomear, mudar horário, adicionar e remover itens, editar gramas. *Adicionada em 15/09: as regras de CA-12 a CA-14 estavam só na fase de telas* | `src/domain/plano.ts`, `src/domain/plano.test.ts` | T-20 | CA-12, CA-13, CA-14, CB-04 | `feat(domain): operacoes do plano` |
| T-30 | Salvamento local: casos no navegador, criar, duplicar, renomear, excluir, aviso de outra aba, armazenamento indisponível | `src/domain/persistencia.ts`, `…test.ts` | T-20, T-33 | CA-49, CA-50 (regra), CB-08, CB-09 | `feat(domain): salvamento local` |
| T-31 | Exportar Word: Aconselhamento (estrutura do modelo, sem nomes de pessoas ou instituições do arquivo original) e Memorial de cálculo; campos vazios em branco | `src/export/aconselhamento-docx.ts`, `src/export/memorial-docx.ts`, `src/export/docx-comum.ts` (*peças compartilhadas, adicionado em 15/09*), `src/export/docx.test.ts`; dependências `docx` e `jszip` (aprovadas) | T-22, T-23, T-25, T-26, T-29 | CA-44 a CA-47 | `feat(export): word aconselhamento e memorial` |
| T-32 | Copiar tabela de adequação em formato que o Word reconhece como tabela | `src/export/copiar-tabela.ts`, `…test.ts` | T-26 | CA-48 | `feat(export): copiar tabela` |

### Portão G-1: direção visual do usuário

**Situação em 15/09/2026:** direção visual definida pelo usuário: template **MaterialM Free** (detalhes em `docs/design/direcao-visual.md`). A confirmação das referências clínicas pela nutricionista (seção 6) passa a ser exigida antes do lançamento (T-62), e não mais antes das telas, porque as telas não dependem desses valores.

**Decisões da fase 3 que precisam de aprovação:**

| # | Decisão | Proposta |
|---|---|---|
| R-5 | Framework | Manter Vite + React 18 e **portar o visual** do template (cores, fonte, raio, sombra, layout e componentes shadcn). Não migrar para Next.js: o template é Next.js 16 + React 19, o que exigiria refazer a base aprovada sem ganho para um app que roda todo no navegador e precisa funcionar offline |
| R-6 | Ícones | **Lucide** (padrão do shadcn, embutido no app) no lugar do Iconify Solar do template, que baixa ícones da internet e quebra o funcionamento offline. O traço é parecido, não idêntico |
| R-7 | Cor primária | Manter o azul `#00A1FF` e a secundária `#16CDC7` do template. A troca por outra cor depois é só mudar variáveis de CSS |
| R-8 | Navegação | Duas áreas (Casos e Planejador) com navegação pelo endereço (`#/casos`, `#/caso/<id>/<aba>`) escrita no próprio projeto, sem biblioteca de rotas (a versão atual do React Router exige React 19) |

**Mapa de telas (layout do template):**
- **Menu lateral** (270 px, itens em pílula), do mais usado ao menos usado: botão **Novo caso** · bloco Trabalho com **Meus casos** (com contagem) e **Caso aberto / Continuar caso** (nome do caso; só aparece quando existe caso) · bloco Consulta com **Fontes científicas**. Rodapé: situação do salvamento ("salvos só neste aparelho" ou aviso) e **Aparência** em três opções visíveis (Claro · Escuro · Sistema). Em telas menores que 1280 px vira gaveta. *Revisado em 15/09/2026 a pedido do usuário: nada de item desabilitado sem explicação.*
- **Cabeçalho:** trilha de volta (Meus casos ›), nome do caso aberto, etapa atual ("Etapa 2 de 3: Plano alimentar"), estágio de vida das referências e botão **Exportar** (Aconselhamento em Word · Memorial de cálculo em Word · Copiar tabela de adequação).
- **Casos:** cartões com nome e última alteração; criar, duplicar, renomear, excluir com confirmação; aviso de primeiro acesso.
- **Planejador:** etapas numeradas **1 Dados do caso** · **2 Plano alimentar** · **3 Adequação** (cada uma com descrição curta e botão de próxima etapa), com a coluna fixa **Resumo do dia** à direita (kcal do plano × GET, macros e contagem de micronutrientes abaixo da meta ou acima do limite). No celular, o resumo vira um bloco recolhível no topo.

### Fase 3: Telas (≈ 3 semanas, depois da aprovação de R-5 a R-8)

| ID | Tarefa | Arquivos | Depende de | Verifica |
|---|---|---|---|---|
| T-40 | Base visual: Tailwind 4, tokens do MaterialM, fonte Inter embutida, tema claro/escuro, utilitário `cn`, componentes shadcn usados (botão, cartão, campo, rótulo, seleção, abas, selo, diálogo, gaveta, menu suspenso, dica, tabela, progresso, separador, interruptor, alerta, área de texto) e aviso de licença | `vite.config.ts`, `tsconfig.app.json` (alias `@/`), `components.json`, `src/main.tsx`, `src/ui/tema/globals.css`, `src/ui/tema/ProvedorTema.tsx`, `src/lib/utils.ts`, `src/ui/componentes/*.tsx`, `THIRD_PARTY_NOTICES.md` | R-5 a R-7 | teste de renderização dos componentes; captura de tela nos temas claro e escuro para sua revisão |
| T-41 | Estrutura do app: menu lateral, cabeçalho, gaveta no celular, navegação por endereço, estado do caso aberto compartilhado entre Casos e Planejador | `src/App.tsx` e teste, `src/ui/layout/Estrutura.tsx`, `src/ui/layout/MenuLateral.tsx`, `src/ui/layout/Cabecalho.tsx`, `src/ui/navegacao.ts` e teste, `src/ui/usarRota.ts`, `src/ui/estado/contextoCasos.ts`, `src/ui/estado/ProvedorCasos.tsx` (lista de casos compartilhada; o caso aberto vem do endereço), `src/ui/fontes/TelaFontes.tsx`, `src/ui/layout/ItemMenu.tsx`, `src/ui/layout/SeletorTema.tsx`, `src/ui/layout/EtapasDoCaso.tsx` | T-40, R-8 | testes da navegação; e2e abre e fecha a gaveta |
| T-42 | Tela Casos: lista, criar, duplicar, renomear, excluir com confirmação, aviso de primeiro acesso, aviso de armazenamento indisponível e de alteração em outra aba | `src/ui/casos/*`, `src/ui/estado/*` (aviso de outra aba), `src/domain/persistencia.ts` (armazenamento como fonte da verdade, para refletir exclusão em outra aba; nome da cópia de caso sem nome) | T-30, T-41 | CA-49, CA-50, CA-51, CB-08, CB-09 |
| T-43 | Aba Caso: formulário, validação com mensagens por campo, resultados antropométricos com fonte | `src/ui/caso/*`, `src/ui/estado/usarCasoAberto.ts` (edição salva na hora) | T-21, T-22, T-41 | CA-01 a CA-05, CA-02a a CA-02c, CB-01 a CB-03, CB-12 |
| T-44 | Resumo do dia: energia (fórmula, nível de atividade, fator livre, GET manual, % do GET) e macros com metas editáveis | `src/ui/resumo/*`, `src/domain/tipos.ts` e `src/domain/caso.ts` (preferências de energia e metas de macros guardadas no caso) | T-23, T-25, T-41 | CA-06 a CA-11, CA-06a a CA-06d, CA-22 a CA-24, CA-31a |
| T-45 | Aba Plano alimentar: refeições (renomear, horário, adicionar, remover), opções em abas, entrada rápida com teclado, linha com gramas, medida caseira e kcal | `src/ui/plano/*` | T-27, T-33, T-41 | CA-12 a CA-21, CB-04, CB-05, CB-07 |
| T-46 | Substitutos: calcular porção equivalente a partir de um item do Principal, com critério e diferenças | `src/ui/plano/Substituto*.tsx` | T-29, T-45 | CA-41 a CA-43 |
| T-47 | Aba Adequação: presets, tabela com barras e estados, avisos de AI, UL e subestimado, fonte; gaveta "cobrir" com sugestões, avisos, ocultar, porção máxima, incluir ingredientes e adicionar à refeição | `src/ui/adequacao/*` | T-26, T-28, T-45 | CA-25 a CA-40, CA-36a |
| T-48 | Exportar: menu do cabeçalho, campos de orientações e receitas, baixar Word e copiar tabela | `src/ui/exportar/*`, `src/domain/tipos.ts` (campos de orientações e receitas no caso) | T-31, T-32, T-41 | CA-44 a CA-48 |
| T-49 | Funcionar sem internet e desempenho com plano grande | `vite.config.ts`, `public/manifest.webmanifest`, `public/icone.svg` | T-48 | CB-10, CB-11 |
| T-50 | Fluxo completo de ponta a ponta: criar caso → preencher → montar plano pela entrada rápida → cobrir ferro → substituto → exportar Word | `playwright.config.ts`, `e2e/planejador.spec.ts` | T-42 a T-49 | CA-13, CA-16, CA-38, CA-51 e o fluxo |

### Fase 4: Validação (≈ 1 semana)

| ID | Tarefa | Arquivos | Verifica |
|---|---|---|---|
| T-60 | Matriz critério → teste: todo CA e CB com o teste que o cobre | `specs/planejador-metanutri/VALIDATION.md` | nenhum CA sem teste |
| T-61 | Rodada final de lint, typecheck, testes unitários e e2e | — | tudo verde, com saída anexada |
| T-62 | Revisão das referências clínicas pela nutricionista e das divergências entre código e SPEC | `specs/planejador-metanutri/VALIDATION.md` | aprovação registrada |

## 4. Dependências

**Já aprovadas (padrão do CLAUDE.md ou decisão de 15/09):** react, react-dom, vite, @vitejs/plugin-react, typescript, eslint e plugins de TS e React, vitest, @testing-library/react, @testing-library/jest-dom, jsdom, @playwright/test, tailwindcss, componentes shadcn/ui (Radix), docx.

**Aprovadas em 15/09:** vite-plugin-pwa (funcionar sem internet), jszip (somente em testes).

**Pedindo aprovação para a fase 3 (R-5 a R-8):** `@tailwindcss/vite` (integração do Tailwind 4 com o Vite), bibliotecas que o shadcn usa por baixo (`class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css` e os pacotes `@radix-ui/*` de cada componente), `lucide-react` (ícones) e `@fontsource-variable/inter` (fonte embutida). Nada das demais bibliotecas do template (ApexCharts, Swiper, lodash, moment, redux-persist, simplebar, tailwind-sidebar, next-themes, Iconify).

Nenhuma outra dependência entra sem nova pergunta.

## 5. Riscos

| Risco | Impacto | Como reduzir |
|---|---|---|
| Correspondência entre medidas da POF e alimentos da TACO é imperfeita (nomes e códigos diferentes) | medida caseira errada no documento entregue | revisão manual dos 150 alimentos mais usados; os demais aparecem só em gramas até serem revisados |
| Erro de digitação ao transcrever as DRI | adequação errada e nota perdida | segunda transcrição independente comparada por teste |
| Referências clínicas com mais de uma escolha válida | discordância com professor ou nutri | fonte visível na tela e confirmação da nutricionista (seção 6) |
| O modelo do estágio contém nome de pessoa e cidade reais | expor dados de terceiros | o Word gerado usa só a estrutura; nenhum nome ou instituição do arquivo original entra no produto |
| Dados salvos só no navegador somem se o usuário limpar o navegador | perda de trabalho | aviso claro no primeiro acesso (CA-51); backup e login ficam para a SPEC `conta-e-assinatura` |
| Escopo cresceu (todas as idades, medidas, substitutos) | prazo de 8 a 10 semanas | fases 1 e 2 começam já, sem esperar o visual |

## 6. Referências clínicas para a nutricionista confirmar (antes do G-1)

1. Equações de energia para crianças e adolescentes: proposta NASEM 2023 (DRI de energia).
2. Adicional energético na gestação e na lactação: proposta NASEM 2023.
3. Ganho de peso na gestação: curvas brasileiras adotadas pelo Ministério da Saúde ou faixas do IOM 2009?
4. IMC do idoso: pontos de corte de Lipschitz (usados no SISVAN) ou outro?
5. Circunferência da cintura: pontos de corte da OMS por sexo.
6. Circunferência da panturrilha em idosos: ponto de corte a confirmar.
7. Curvas de crescimento: OMS 2006 (até 5 anos) e OMS 2007 (5 a 19 anos).
8. Regra de alimentos que não entram nas sugestões do "cobrir" (CA-36a): Miscelâneas, pó e desidratados, farinhas e amidos culinários, versão crua de carnes, pescados, ovos, leguminosas e cereais (exceto aveia).
