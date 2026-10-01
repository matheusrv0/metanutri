# SPEC — Ajustes de uso no planejador: meta de energia, sugestões por refeição e plano assinado pelo cadastro

Status: **aguardando sua aprovação**. Escrita em 30/09/2026, refeita em 01/10/2026 depois do protótipo aprovado.

**Fontes:** feedback de uma usuária real (estudante de nutrição em estágio, que usa o WebDiet),
repassado por você em 30/09/2026; a conversa do mesmo dia; e o protótipo "Planejador com
cadastro" (7 telas), aprovado em 01/10/2026.

**Objetivo:** o planejador preenche sozinho o que já sabe (meta de energia, quem assina,
alimentos de todo dia) e tira do caminho o que só serve ao estágio de uma faculdade.

**O que saiu daqui:** a situação e o CRN no cadastro (antiga US-A4) e a conta obrigatória (antiga
US-A5) foram para `specs/conta-e-verificacao/SPEC.md` e já estão prontos. Os critérios CA-244 a
CA-250 e CA-254 a CA-257 desta spec não existem mais; a folha da dieta assinada pelo cadastro é
o CA-287 de lá.

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-32 | O **nível de atividade** fica logo abaixo de peso e estatura, nos dois modos. No modo rápido, a meta de energia é calculada sozinha quando há dados, e o número digitado pela pessoa vale mais que o calculado | Pedido da usuária. O CA-63 da prescrição rápida ("Estimar pelo peso") ficou pela metade |
| D-33 | O IMC e as classificações continuam só no atendimento completo | Decisão sua de 30/09 |
| D-34 | **Receitas só para estudante.** Quem é nutricionista não vê o campo, e ele não sai nos documentos | O MetaNutri não é só para o estágio de uma faculdade |
| D-35 | Cada refeição mostra **sugestões de alimentos** do seu tipo (desjejum, lanche, almoço, jantar, ceia). Começam com uma lista padrão e **a pessoa edita**: tira, acrescenta, muda a ordem ou volta à lista padrão. **Não aprendem sozinhas com o uso**; substituem o atalho "Você usa muito" | Pedido da usuária ("cuscuz no café, arroz e feijão no almoço") e decisão sua de 01/10: a lista editada é mais previsível |
| D-36 | O **leite integral sai da lista padrão** (desjejum e ceia): a base não tem a energia dele. Quem quiser acrescenta pela edição, e ele aparece com "— kcal" | Decisão sua de 01/10 |
| D-37 | A **situação** que decide o que o plano mostra vem da conta (perfil no servidor). No modo local, sem servidor, vem de Configurações › Quem assina | A conta e verificação já guarda a situação no servidor |
| D-38 | Para nutricionista, a Identificação do plano não pede estagiário nem preceptor, e o **Word** sai com "Nutricionista: Nome · CRN" e uma assinatura só. Para estudante, os dois campos já vêm preenchidos | Pedido da usuária: "não precisa preencher esses dados, já vai ser informado no cadastro" |

**Esta spec altera critérios de specs anteriores:** `prescricao-rapida-e-base` · **CA-61** passa a
incluir o nível de atividade entre os campos do modo rápido, e **CA-63** é substituído pelos CA-226 a CA-230.

## 2. Escopo

**Entra:** nível de atividade e meta calculada; receitas só para estudante; sugestões por tipo de
refeição, editáveis; plano e Word assinados pela situação da conta.

## 3. Histórias e critérios de aceite

Pessoas: **nutricionista** (situação Nutricionista) e **estudante** (situação Estudante).

### US-A1 · Meta de energia junto do peso e da altura (3 pts)

Como nutricionista, quero escolher o nível de atividade logo depois de informar peso e
altura, para a meta de energia sair pronta sem abrir outro painel.

- **CA-225** · Dado um plano, rápido ou completo, então logo abaixo de peso e estatura aparece "Nível de atividade" com as cinco opções e o fator de cada uma: Sedentário 1,2 · Pouco ativo 1,37 · Moderadamente ativo 1,55 · Muito ativo 1,7 · Extremamente ativo 1,9.
- **CA-226** · Dado o modo rápido com sexo, idade, peso e estatura preenchidos e nenhuma meta digitada, então a meta de energia mostra o valor calculado com o mesmo cálculo do atendimento completo, marcado como "calculada", e o Resumo do dia usa esse valor.
- **CA-227** · Dado o modo rápido com a meta calculada, quando a pessoa troca o nível de atividade, o peso, a estatura, o sexo ou a idade, então a meta muda na hora.
- **CA-228** · Dado o modo rápido, quando a pessoa digita uma meta, então vale o número digitado, marcado como "definida por você", e mudar nível, peso ou estatura não altera esse número.
- **CA-229** · Dado uma meta digitada no modo rápido, quando a pessoa apaga o campo, então volta a valer a meta calculada, se houver dados para calcular.
- **CA-230** · Dado o modo rápido sem peso ou sem estatura, então o nível de atividade continua visível, a meta é digitada como hoje, e uma linha diz o que falta para calcular: "Informe peso e estatura para calcular a meta".
- **CA-231** · Dado o atendimento completo, quando a pessoa escolhe o nível abaixo de peso e estatura, então o GET do Resumo do dia muda igual a quando se escolhe em "Ajustar", e os dois lugares mostram sempre o mesmo nível.
- **CA-232** · Dado um fator próprio (digitado em "Ajustar", diferente das cinco opções), então nenhuma opção aparece marcada e uma linha mostra "Fator próprio: 1,45". Escolher uma das opções substitui o fator próprio.
- **CA-233** · Dado o modo rápido, então o IMC e as classificações continuam sem aparecer (D-33).

### US-A2 · Receitas só para estudante (1 pt)

Como nutricionista, quero não ver o campo de receitas do modelo de estágio, para a tela
ter só o que eu uso.

- **CA-234** · Dado a situação Nutricionista, então o cartão "Orientações e receitas" se chama "Orientações" e não tem o campo Receitas.
- **CA-235** · Dado a situação Nutricionista, então a folha da dieta (imprimir e PDF) e o Word de aconselhamento saem sem a parte de receitas, inclusive sem o título "Receitas saudáveis".
- **CA-236** · Dado a situação Estudante, então o campo Receitas e as receitas nos documentos continuam como hoje.

### US-A3 · Sugestões de alimentos por refeição, editáveis (3 pts)

Como nutricionista, quero que cada refeição já sugira os alimentos de sempre, e poder
trocar essa lista, para montar o plano sem buscar arroz e feijão toda vez.

- **CA-237** · Dado uma refeição com o campo de adicionar vazio, então aparecem as sugestões do tipo daquela refeição, com o rótulo "Sugestões para o almoço" (ou desjejum, lanche, jantar, ceia) e, em cada uma, o nome do alimento e a porção em gramas. O atalho "Você usa muito" deixa de existir.
- **CA-238** · Dado uma sugestão, quando a pessoa clica nela, então o alimento entra na porção mostrada, na opção (principal, substituto 1 ou substituto 2) daquele campo.
- **CA-239** · Dado o nome da refeição, então o tipo é reconhecido pelo nome, sem diferenciar maiúscula e acento: "desjejum" ou "café da manhã" → desjejum; nome que contém "lanche" ou "colação" → lanche; "almoço" → almoço; "jantar" ou "janta" → jantar; "ceia" → ceia.
- **CA-240** · Dado um nome que não bate com nenhum tipo (ex.: "Pré-treino"), então o tipo vem do horário: 04:00–08:59 desjejum · 09:00–10:59 lanche · 11:00–14:59 almoço · 15:00–17:59 lanche · 18:00–20:59 jantar · 21:00–03:59 ceia.
- **CA-241** · Dado o link "Editar" ao lado das sugestões, então abre "Sugestões para o almoço" (ou o tipo daquela refeição) com a lista: nome, medida caseira e gramas de cada uma, um botão para tirar, e um jeito de mudar a ordem.
- **CA-242** · Dado o campo de acrescentar da edição, quando a pessoa escreve como na busca do plano ("1 concha feijão preto" ou "150 arroz integral") e clica em "Adicionar", então o alimento entra no fim da lista com essa porção. Sem medida reconhecida, a porção fica em gramas; alimento que não existe na base não entra, e a tela diz isso.
- **CA-243** · Dado "Salvar", então a lista nova vale para todas as refeições daquele tipo, em todos os planos deste aparelho. "Voltar à lista padrão" troca a lista pela padrão (seção 3.1). Fechar sem salvar não muda nada.
- **CA-306** · Dado uma lista sem nenhum alimento, então a refeição não mostra o rótulo de sugestões, só a busca.
- **CA-307** · Dado texto digitado no campo de adicionar do plano, então as sugestões somem e a busca aparece, como hoje.

#### 3.1 Lista padrão de sugestões

Porções das medidas caseiras que o MetaNutri já usa. **A lista e as porções precisam ser
revisadas por uma nutricionista antes de publicar** (R-20).

| Tipo | Alimento | Porção |
|---|---|---|
| Desjejum | Cuscuz, de milho, cozido com sal | 1 pedaço (135 g) |
| Desjejum | Ovo, de galinha, inteiro, cozido | 1 unidade (45 g) |
| Desjejum | Pão, trigo, francês | 1 unidade (50 g) |
| Desjejum | Tapioca, com manteiga | 1 unidade (50 g) |
| Desjejum | Café, infusão 10% | 1 xícara de café (50 g) |
| Lanche | Banana, prata, crua | 1 unidade (75 g) |
| Lanche | Maçã, Fuji, com casca, crua | 1 unidade (150 g) |
| Lanche | Mamão, Papaia, cru | 1 fatia (170 g) |
| Lanche | Iogurte, natural | 1 pote (200 g) |
| Lanche | Aveia, flocos, crua | 1 colher de sopa (15 g) |
| Lanche | Queijo, minas, frescal | 1 fatia (45 g) |
| Almoço | Arroz, tipo 1, cozido | 4 colheres de sopa (100 g) |
| Almoço | Feijão, carioca, cozido | 1 concha (140 g) |
| Almoço | Frango, peito, sem pele, grelhado | 1 filé (100 g) |
| Almoço | Carne, bovina, patinho, sem gordura, grelhado | 1 bife (100 g) |
| Almoço | Alface, crespa, crua | 1 prato de sobremesa (30 g) |
| Almoço | Tomate, com semente, cru | 1 porção (80 g) |
| Jantar | Cuscuz, de milho, cozido com sal | 1 pedaço (135 g) |
| Jantar | Ovo, de galinha, inteiro, cozido | 1 unidade (45 g) |
| Jantar | Frango, peito, sem pele, grelhado | 1 filé (100 g) |
| Jantar | Arroz, tipo 1, cozido | 4 colheres de sopa (100 g) |
| Jantar | Feijão, carioca, cozido | 1 concha (140 g) |
| Jantar | Batata, doce, cozida | 1 pedaço (70 g) |
| Ceia | Iogurte, natural | 1 pote (200 g) |
| Ceia | Banana, prata, crua | 1 unidade (75 g) |
| Ceia | Mamão, Papaia, cru | 1 fatia (170 g) |
| Ceia | Aveia, flocos, crua | 1 colher de sopa (15 g) |

### US-A4 · Plano e Word assinados pela situação da conta (3 pts)

Como nutricionista, quero que o plano e o Word já saiam com o meu nome e CRN, para não
digitar de novo o que informei no cadastro.

- **CA-251** · Dado a situação Nutricionista, então a Identificação do plano não tem Estagiário(a) nem Preceptor(a), e mostra "Assina este plano: Nome · CRN-6 12345", que vem do cadastro.
- **CA-252** · Dado a situação Nutricionista, então o Word de aconselhamento traz "Nutricionista: Nome · CRN-6 12345" no lugar das linhas de estagiário e preceptor, e uma assinatura só, "Nutricionista", no lugar das duas.
- **CA-253** · Dado a situação Estudante, quando a pessoa cria um plano novo, então Estagiário(a) já vem com o nome da conta e Preceptor(a) com o responsável técnico de Quem assina. Os dois podem ser trocados naquele plano, e planos já existentes não mudam.

## 4. Casos de borda

- **CB-50** · Nutricionista abre um plano que já tem receitas escritas: o campo Receitas aparece com o texto, e as receitas saem nos documentos. Nenhum texto some.
- **CB-51** · Nutricionista abre um plano antigo com estagiário ou preceptor preenchidos: os campos aparecem com o texto, e o Word sai como sairia antes.
- **CB-54** · Servidor não configurado (desenvolvimento): a situação vem de Configurações › Quem assina (Estudante ou Nutricionista), como hoje.
- **CB-55** · Histórico do atalho "Você usa muito" gravado antes desta mudança: é ignorado e não volta.
- **CB-56** · Idade, condição ou dado fora do que o cálculo aceita no modo rápido (ex.: menos de 1 ano): a meta não é calculada, e aparece o mesmo motivo que o atendimento completo mostraria.
- **CB-57** · Alimento de uma lista de sugestões que não existir mais na base: a sugestão some, sem erro, e as outras continuam.
- **CB-69** · Conta sem situação (administrador): o plano se comporta como hoje (campos de estagiário e preceptor visíveis).
- **CB-70** · Sem espaço para gravar no aparelho: a edição das sugestões avisa que não foi salva, e a lista volta ao que era.

## 5. Fora de escopo, explicitamente

- Sugestões que aprendem com o uso (D-35).
- Levar as listas de sugestões para a nuvem ou para outro aparelho.
- Mostrar o IMC no modo rápido.
- "Base MetaNutri" no lugar dos nomes das fontes, PDF com design próprio e telas mais limpas (parte 5 do lançamento).
- Qualquer mudança de cálculo clínico: a meta calculada é o mesmo número que o atendimento completo já mostra hoje.

## 6. O que fica com você

1. **Revisão da lista padrão:** mostrar a tabela da seção 3.1 a uma nutricionista (a usuária que deu o feedback é a candidata natural) e me devolver o que trocar.

## 7. Riscos para você revisar

- **R-20** · A lista padrão foi montada por mim, com alimentos comuns no Nordeste. Sem revisão de uma nutricionista, pode sugerir porção ou alimento que ela não prescreveria.
- **R-22** · As listas de sugestões ficam no aparelho, como os planos. Em outro aparelho, a pessoa começa da lista padrão.
- **R-27** · A meta calculada no modo rápido usa a mesma fórmula do atendimento completo (Mifflin-St Jeor para adulto). Quem prescreve continua conferindo o número.
