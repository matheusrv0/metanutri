# Dietbox x MetaNutri: o básico que o nutricionista espera

Data: 14/10/2026. Base: 5 prints do Dietbox numa conta de estudante (Marcela, no celular, versão 1.9.26),
a pesquisa de mercado de 15/09 (`docs/pesquisa-mercado-2026-09-15.md`) e o código do MetaNutri de hoje.
O Dietbox não foi aberto: o que não aparece nos prints está marcado como tal.

## 1. Resumo em 5 linhas

1. O Dietbox vende o consultório inteiro: agenda, conversa com o paciente, anamnese pronta, suplementos, pedido de exames, receitas e app do paciente. É isso que o nutricionista chama de básico.
2. O MetaNutri já tem o miolo do atendimento: ficha, medidas, plano com substitutos, trocas, modelos de plano, PDF e Word.
3. E ganha onde o Dietbox não chega: o cobrir diz o que comer para fechar o micronutriente que falta, os macros andam ao vivo, e o estudante usa tudo sem trava, com o Word do estágio e até 3 links de missões (no Dietbox, estudante nem entra no app).
4. Falta o básico do dia a dia, nesta ordem: a dieta no celular do paciente, o retorno marcado, mandar pelo WhatsApp, anamnese com roteiro, e suplementos e exames.
5. Não copiar: início lotado, aviso de "assine" na conta de estudante, estrela de recurso trancado, bolhas por cima do conteúdo e texto quebrado.

## 2. Tabela de funcionalidades

**MetaNutri hoje:** Tem / Parcial / Não tem, com a tela ou o arquivo.
**Recomendação:** fazer agora, fazer depois, não fazer, ou manter (quando já existe).

### Tela inicial

| Dietbox | Para que serve | MetaNutri hoje | Recomendação | Por quê |
|---|---|---|---|---|
| Busca "pacientes e recursos" | Achar paciente ou tela de qualquer lugar | **Parcial.** Busca só na lista de Pacientes (`src/ui/pacientes/TelaPacientes.tsx`) | Fazer depois | Com até 25 pacientes (Solo), a lista resolve. Vira útil no Pro, que não tem limite. |
| Último paciente | Voltar a quem atendeu por último | **Tem**, pelo plano: "Continuar plano" no menu (`src/ui/layout/MenuLateral.tsx`) e "Onde você parou" no Painel (`src/ui/painel/TelaPainel.tsx`) | Manter | Já resolve. |
| Meus pacientes | Lista e ficha | **Tem.** `TelaPacientes.tsx` e `TelaPaciente.tsx`: dados, restrições, anamnese, histórico de planos e peso | Manter | Já resolve. |
| Minha agenda, Agendamentos | Ver quem atende hoje e quando cada um volta | **Não tem** | Fazer agora, versão mínima | O retorno é onde a adesão vira dinheiro. Só a data do retorno e um bloco "hoje e esta semana", sem calendário completo (seção 3, item 2). |
| Academia Dietbox | Cursos para o nutricionista | **Não tem** | Não fazer | É negócio de conteúdo. O plano de negócio deixa o "Estudante+" para depois. |
| Design Canva | Fazer arte para Instagram | **Não tem** | Não fazer | Fora do foco. O Canva já é grátis. |
| Benefícios Wellhub e Totalpass | Brinde de academia para o nutricionista | **Não tem** | Não fazer | Exige parceria e custo. Segura o cliente pelo brinde, não pelo software ("se não fosse pelo Wellhub eu não iria para Dietbox", `docs/feedback-nutricionista.md`). O MetaNutri responde com preço: R$ 34,90 contra R$ 91,90. |
| Aniversariantes do mês, com "Exibir mensagem" | Lembrar do aniversário e mandar parabéns | **Não tem**, mas a ficha já guarda a data de nascimento (`src/domain/pacientes.ts`) | Fazer depois, junto com o retorno | Barato: uma linha no Painel e o botão do WhatsApp. Fideliza, mas não segura a dieta. |
| NutriPlan (tarefas e notas) | Lista de afazeres do nutricionista | **Parcial.** O Painel monta as pendências sozinho, em "Precisa de atenção" (`TelaPainel.tsx`) | Não fazer | Lista manual de tarefas o celular já tem. Pendência que aparece sozinha é melhor. |
| Diário | O paciente anota o que comeu, com foto | **Parcial.** Nas missões, o paciente marca o que fez num toque (`src/ui/missoes/TelaMissoesPaciente.tsx`) | Fazer depois, só um campo "como foi hoje" | Diário completo cansa o paciente. A pesquisa de 15/09 achou queixa de registro que "não salva" no app do Dietbox. Um toque é a aposta. |
| Bater papo | Conversar com o paciente entre consultas | **Não tem** | Não fazer chat. Fazer agora o botão "Enviar pelo WhatsApp" | O paciente já está no WhatsApp. Chat próprio exige notificação, plantão e mais dado de saúde guardado. |
| Recados | Texto cortado no print; parece aviso aos pacientes do app | **Não tem** | Não fazer | Mesmo motivo do chat. |
| Baixe o aplicativo | Usar no celular | **Tem equivalente.** O site abre no celular e se instala como app (PWA, `vite.config.ts`) | Não fazer app de loja | App de loja são duas lojas, revisão e quebra a cada iOS novo (a pesquisa cita o app do Dietbox fechando sozinho no iOS 26.1). |
| Bolhas de WhatsApp e de chat de suporte | Pedir ajuda | **Parcial.** Tela Ajuda (`src/ui/ajuda/TelaAjuda.tsx`); suporte por e-mail, WhatsApp só no Clínica (`src/domain/conta.ts`) | Não fazer bolha | No print, as bolhas cobrem "Ver todas" e "Ver agendamentos". |

### Menu

| Dietbox | Para que serve | MetaNutri hoje | Recomendação | Por quê |
|---|---|---|---|---|
| Plano alimentar › Cardápios | Plano pronto para reaproveitar | **Tem.** Modelos de plano (`src/domain/modelos.ts`, `src/ui/modelos/DialogoModelos.tsx`) | Manter | Já resolve. |
| Plano alimentar › Refeições | Guardar uma refeição pronta (o café da manhã de sempre) | **Parcial.** Sugestões por refeição, editáveis, com a porção de sempre (`src/ui/plano/SugestoesDaRefeicao.tsx`) | Fazer depois | Acelera a montagem, que é a dor nº 1 (cerca de 2 h por plano, `docs/entrevista-estudante-2026-09-15.md`). |
| Plano alimentar › Receitas | Preparação com ingredientes e valor por porção | **Parcial.** Texto livre, sem cálculo; para nutricionista o campo nem aparece (`mostraReceitas`, `src/domain/assinaturaDoPlano.ts`). É a ideia B-32 do `docs/backlog.md` | Fazer depois (6º da fila) | Hoje uma panqueca entra como ingredientes soltos. Com receita, o paciente lê "panqueca" e a soma de micros continua certa. |
| Plano alimentar › Alimentos | Base de alimentos e alimento próprio | **Tem, e melhor.** Tabela TACO (`src/ui/alimentos/TelaAlimentos.tsx`) e Meus produtos com código de barras (`src/ui/produtos/TelaProdutos.tsx`) | Manter | Código de barras com Open Food Facts é vantagem. |
| Prescrições › Modelos e Suplementos | Receitar suplemento com dose e horário | **Não tem** | Fazer agora | Rotina de consultório. E fecha a história do cobrir: o que a comida não cobre, ou a TACO nem mede (vitamina D e B12), vira suplemento escrito pelo nutricionista. |
| Prescrições › Fitoterápicos | Receitar fitoterápico | **Não tem** | Não fazer | Nicho, com regra própria do conselho. |
| Outros cadastros › Modelos de anamnese | Roteiro de perguntas pronto | **Parcial.** A anamnese é um campo de texto livre na ficha (`TelaPaciente.tsx`) | Fazer agora | Toda consulta começa por ela. A nutri parceira: "isso precisa ser antes de chegar na distribuição de micro". |
| Outros cadastros › Modelos de QPC | Pelo nome, questionário pré-consulta: o paciente responde antes de chegar | **Não tem** | Fazer depois | Reaproveita o link sem conta das missões. Depende do roteiro de anamnese existir. |
| Outros cadastros › Solicitações de exames | Pedido de exame de laboratório | **Não tem** | Fazer agora, junto com suplementos | Mesmo tipo de documento, mesma assinatura. Liga com os micros: ferritina, vitamina D e B12 medem o que o plano não mede. |
| Outros cadastros › Listas de substituição | Trocas por grupo para o paciente | **Tem.** Trocas na dieta impressa (`src/domain/trocas.ts`, `src/ui/exportar/DialogoImprimir.tsx`) | Manter | Já resolve, e respeita as restrições da ficha. |
| Outros cadastros › Farmácias para orçamento | Mandar fórmula para a farmácia orçar | **Não tem** | Não fazer | Depende de manipulado e de parceria comercial. |
| Outros cadastros › "s offline" (rótulo quebrado) | Algum modo sem internet | **Parcial.** Sem conta, funciona offline. Com conta, a área de trabalho trava sem internet (README, "Dados na nuvem") | Fazer depois | Foi decisão (dados presos à conta). Mas o `PRODUCT.md` ainda diz que o app "precisa abrir e calcular offline": um dos dois precisa mudar. |
| Outros cadastros › Etiquetas | Marcar pacientes (online, gestante, convênio) | **Não tem** | Fazer depois | Útil com muitos pacientes. O recém-formado tem poucos. |
| Fidelização › Materiais | Biblioteca de material para entregar | **Parcial.** Campo "Orientações" por plano, que sai no PDF e no Word (`src/ui/caso/TelaCaso.tsx`, `src/ui/exportar/FolhaDieta.tsx`) | Fazer depois | Orientação salva para reusar evita digitar de novo. Hoje o modelo de plano leva só as refeições. |
| Gestão › Agendamento online | O paciente marca o horário sozinho | **Não tem** | Não fazer | Grande. Google Agenda e WhatsApp já resolvem. No Dietbox é recurso trancado até para a Marcela. |

### Básico que não aparece nos prints

| Dietbox | Para que serve | MetaNutri hoje | Recomendação | Por quê |
|---|---|---|---|---|
| Dieta no app do paciente | O paciente vê o que comer no celular | **Parcial.** O link mostra só as missões ("Almoço por volta das 12:00"); a dieta vai em PDF (`src/domain/missoes.ts`, `TelaMissoesPaciente.tsx`) | Fazer agora | É o que o app do Dietbox entrega. E leva o "dizer o que comer" até o paciente, no link que ele já abre todo dia. Já estava previsto (`docs/revisao-produto-2026-09-15.md`, item 2.5; B-24 no backlog). |
| Evolução no retorno | Comparar medidas entre consultas | **Parcial.** Só o gráfico do peso (`src/ui/pacientes/EvolucaoPeso.tsx`) | Fazer depois | Cintura, IMC e gordura já ficam em cada plano. Falta só mostrar lado a lado. |

### Assinatura

| Dietbox | Para que serve | MetaNutri hoje | Recomendação | Por quê |
|---|---|---|---|---|
| Aviso "Área exclusiva para Assinantes", Estudante x Profissional | Vender o plano pago | **Diferente de propósito.** O plano muda quantos pacientes cabem, não tranca tela (`LIMITES_ATIVOS = false` e `estadoDoLimite`, que "não bloqueia nada: só informa", em `src/domain/conta.ts`). A passagem é no "Me formei" (`src/ui/conta/DialogoMeFormei.tsx`) | Não fazer | Seção 4. |

## 3. Básico que falta

Em ordem de importância para a rotina. Esforço: P = dias, M = 1 a 2 semanas, G = 3 semanas ou mais
(a mesma régua do `docs/backlog.md`).

**1. A dieta no celular do paciente (M).** O link das missões ganha uma segunda parte, "Meu plano": as
refeições por horário em medida caseira, os substitutos como "ou" e as orientações. A dieta é copiada na
hora de gerar o link, igual às missões hoje; gerar de novo atualiza. Sem kcal e sem tabela de nutriente,
como na dieta impressa. Fica de fora: o paciente trocar alimento sozinho, lista de compras para marcar e
foto. Por que primeiro: é o que o app do Dietbox entrega, e é onde o "dizer o que comer" chega no
paciente. Decisão sua antes: o link passa a levar mais dado de saúde, e o consentimento de hoje precisa
cobrir isso.

**2. O retorno marcado (M).** Na ficha, um campo "Próxima consulta", com data e hora. No Painel, um bloco
"Hoje e esta semana" com nome, horário e como está a adesão (em dia, atenção, sumindo). Na Adesão, a data
do retorno ao lado de cada nome. O aniversariante do dia entra no mesmo bloco. Fica de fora: calendário
em grade, agendamento online e ligação com o Google Agenda. Por quê: responde "quem eu atendo hoje?" e
cruza com a adesão. "Sumindo e com retorno na quinta" é o telefonema que salva a consulta.

**3. Enviar pelo WhatsApp (P).** Um botão que abre o WhatsApp do próprio nutricionista, com o telefone
da ficha e um texto pronto que ele edita antes de mandar. Entra em três lugares: no cartão do link, ao
lado de "Copiar"; na Adesão, para quem está sumindo; e no lembrete do retorno, depois do item 2. Sem
serviço pago e sem envio automático: quem manda é ele. Fica de fora: chat dentro do MetaNutri. Por quê:
a Adesão já diz "Vale uma mensagem hoje", mas não tem o botão. Fecha o ciclo da adesão pelo canal que o
paciente já usa.

**4. Anamnese com roteiro (M).** O campo único vira um roteiro em blocos, com perguntas prontas e todas
opcionais: objetivo e queixa, rotina e sono, intestino, água, álcool e fumo, atividade física,
preferências e aversões, e o recordatório de 24 horas por refeição (em texto, sem cálculo nesta versão).
O nutricionista pode editar o roteiro, um modelo por conta. Restrições, condições e medicamentos ficam
onde estão, porque já filtram o cobrir. Fica de fora: o questionário pré-consulta pelo link (vem depois,
em cima deste roteiro) e anamnese por especialidade. Por quê: toda consulta começa por ela, e o
backlog já pedia (B-05, versão completa).

**5. Suplementos e pedido de exames (M).** Dois documentos curtos, com a assinatura e o CRN de quem
atende. Suplementos: nome, dose, horário, por quanto tempo e observação, digitados pelo nutricionista,
com modelos salvos para reusar; saem também na dieta impressa e no Word. Exames: uma lista para marcar
(hemograma, ferritina, vitamina D, B12, glicemia, perfil lipídico) e um campo livre, numa página para
imprimir. Nada é sugerido sozinho: o plano de negócio pede cuidado com sugestão automática que pareça
prescrição. Na conta de estudante, sai marcado como proposta do estágio, para a preceptora. Por quê: é
rotina de consultório, e completa o cobrir. O que a comida não fecha vira suplemento ou exame.

## 4. O que não copiar

- **Início lotado.** A home da Marcela tem busca, 5 atalhos e mais 9 blocos: benefícios, agendamentos,
  aniversariantes, NutriPlan, diário, bater papo, recados, baixar o app e ajuda. Vários estão vazios:
  caixas cinza para 0 aniversariantes, "Nenhuma tarefa encontrada", "Não há mensagens não lidas",
  "Agendamento / Data do agendamento". **No MetaNutri:** o Painel continua com 3 números, "Onde você
  parou" e "Precisa de atenção". Bloco só aparece quando tem algo para fazer. O "Hoje e esta semana"
  (seção 3, item 2) entra no lugar de um bloco, não em cima.
- **Aviso de "assine" na conta de estudante.** A Marcela tocou num item do menu e recebeu "Área
  exclusiva para Assinantes. Assine para mudar sua vida". O menu mostra o que ela não pode usar, e o
  próprio aviso diz que o plano dela é para "trabalhos de faculdade". **No MetaNutri:** o plano muda
  quantos pacientes cabem, não quais telas abrem, e o estudante faz o estágio de verdade, com aviso na
  tela do paciente. A conversa de venda é o "Me formei", na hora da formatura. Nunca vender em cima de
  um toque que esperava uma função.
- **Estrelas azuis.** Não são de jogo: são o mesmo ícone do aviso de assinatura, marcando o que está
  trancado. São 7 no que a Marcela vê (5 no início, 2 no menu). **No MetaNutri:** sem selo decorativo.
  O que não está no plano da pessoa não aparece no menu dela.
- **Texto quebrado.** "Os" onde devia estar "Tarefas", "mas tarefa" em vez de "Mais tarefa", "s
  offline", "Não se trata de uma questão de..." no primeiro item do menu, e "pacientes" e "estudante" em
  minúscula. O ícone de tradução aparece na barra do navegador em 3 dos 5 prints, e "mais" virar "mas" é
  o que um tradutor faz com o "mais" do francês. Ou seja: provavelmente o navegador do celular está
  traduzindo uma página que já está em português. Para quem usa, dá no mesmo: o texto sai errado.
  **No MetaNutri:** já está certo, o `index.html` declara `lang="pt-BR"`. Manter, e conferir uma vez no
  Chrome do iPhone com a tradução ligada. De quebra: "Olá, Marcela ." tem um espaço solto (sobrenome
  vazio). Nome que falta não pode deixar buraco no texto.
- **Bolhas por cima do conteúdo.** As bolhas de WhatsApp e de chat escondem "Ver toda a agenda" e "Ver
  agendamentos". **No MetaNutri:** nada flutua sobre o dado. Ajuda fica em Ajuda.
- **Frase de efeito.** "Assine para mudar sua vida", "as melhores ferramentas do mercado". **No
  MetaNutri:** texto direto e sem promessa, como pede a `specs/limpeza-visual/SPEC.md`.
- **Quatro canais para falar com o paciente** (bater papo, recados, diário e a bolha de WhatsApp).
  **No MetaNutri:** um só, o WhatsApp do nutricionista, mais o link das missões.

## 5. Ordem sugerida

| # | O que | Esforço | Por que nesta posição |
|---|---|---|---|
| 1 | Enviar pelo WhatsApp | P | Rápido, e fecha o ciclo da Adesão que já existe. |
| 2 | Dieta no link do paciente | M | O maior buraco contra o app do Dietbox. Usa o link que já existe. |
| 3 | Retorno marcado, com aniversariantes no mesmo bloco | M | Vira o "hoje" do Painel. Usa o botão do item 1 para lembrar o retorno. |
| 4 | Anamnese com roteiro | M | Básico da consulta. Prepara o questionário pré-consulta. |
| 5 | Suplementos e pedido de exames | M | Completa o que o cobrir não fecha. |
| 6 | Receitas com cálculo (B-32) | M | Acelera o plano e mantém a soma de micros certa. |

Somando: de 6 a 11 semanas de um dev solo.

Duas regras antes de começar:

- Cada item passa pelo SDD: SPEC aprovada, depois PLAN aprovado, depois código.
- O plano de negócio congela funcionalidade nova até as 10 conversas da Fase 0. Se elas ainda não
  aconteceram, vale perguntar nelas, sem mostrar o MetaNutri: "como você marcou o último retorno?" e "o
  último paciente pediu a dieta no celular?". A resposta confirma a dieta no link e o retorno marcado
  antes de construir.
