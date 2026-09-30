# SPEC — Ajustes de uso: meta de energia, sugestões por refeição e perfil do cadastro

Status: **aguardando sua aprovação**. Escrita em 30/09/2026.

**Fontes:** feedback de uma usuária real (estudante de nutrição em estágio, que usa o
WebDiet), repassado por você em 30/09/2026, e a conversa de brainstorming do mesmo dia.

**Objetivo:** tirar do caminho o que só serve ao estágio de uma faculdade, fazer o
sistema preencher sozinho o que já sabe (meta de energia, quem assina, alimentos de
todo dia) e terminar a conta obrigatória da Onda 1 do estilo-spora.

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-32 | O **nível de atividade** fica logo abaixo de peso e estatura, nos dois modos. No modo rápido, a meta de energia é calculada sozinha quando há dados, e o número digitado pela pessoa vale mais que o calculado | Pedido da usuária. O CA-63 da prescrição rápida ("Estimar pelo peso") ficou pela metade: peso e estatura aparecem, mas nada é calculado |
| D-33 | O IMC e as classificações continuam só no atendimento completo | Decisão sua de 30/09. O modo rápido não classifica ninguém |
| D-34 | **Receitas só para estudante.** Quem é nutricionista não vê o campo, e ele não sai nos documentos | O MetaNutri não é só para o estágio de uma faculdade. Receitas vêm do modelo de documento do estágio |
| D-35 | Cada refeição mostra **sugestões de alimentos** por tipo de refeição: começa com uma lista pronta e, com o uso, os mais usados pela pessoa naquele tipo de refeição passam à frente | Pedido da usuária: "cuscuz no café da manhã, arroz e feijão no almoço" |
| D-36 | A **situação** (estudante ou nutricionista), o nome e o CRN vêm do **cadastro da conta**. Configurações › Quem assina mostra esses dados da conta e grava as mudanças nela | Decisão sua de 30/09: a pessoa cria a conta para acessar, então não deve preencher isso de novo em cada plano |
| D-37 | CRN **obrigatório** para nutricionista, com o formato conferido e a pessoa declarando que o registro é dela. Não há consulta ao conselho | Decisão sua de 30/09. O CFN não tem API oficial: a Consulta Nacional de Nutricionistas (cnn.cfn.org.br) só pode ser usada por um endereço interno da página, que pode mudar sem aviso, e o CRN-4 nem aparece lá hoje |
| D-38 | A Onda 1 do estilo-spora termina agora, **com a conta obrigatória** e o fim da ponte provisória de 28/09. Ficam para depois só os termos: a Tarefa 21, o aceite no cadastro e o e-mail do plano Clínica | Decisão sua de 30/09: "o termo a gente resolve depois". O risco está em R-19 |

**Esta spec altera critérios de specs anteriores:**
- `prescricao-rapida-e-base` · **CA-61** passa a incluir o nível de atividade entre os campos do modo rápido, e **CA-63** é substituído pelos CA-226 a CA-230.
- `estilo-spora` · **CA-127** e **CA-129** ganham a situação e o CRN (CA-244 a CA-247). **CA-134a**, **CA-126** e **CA-220 a CA-224** ficam suspensos até a Tarefa 21 (D-38).

## 2. Escopo

**Entra:**
- Nível de atividade junto de peso e estatura, e meta de energia calculada no modo rápido.
- Campo Receitas só para estudante, na tela e nos documentos.
- Sugestões de alimentos por tipo de refeição, com lista inicial e aprendizado pelo uso.
- Situação, nome e CRN pedidos no cadastro e usados no plano e nos documentos.
- Tarefas 16, 18, 24, 25 e 26 do PLAN estilo-spora (Preços, Criar conta, montagem com conta obrigatória, conta e plano, e2e e publicação).

## 3. Histórias e critérios de aceite

Pessoas: **nutricionista** (conta com situação Nutricionista), **estudante** (conta com
situação Estudante) e **visitante** (ainda sem conta).

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

### US-A3 · Sugestões de alimentos por refeição (3 pts)

Como nutricionista, quero que cada refeição já sugira os alimentos de sempre, para
montar o plano sem buscar arroz e feijão toda vez.

- **CA-237** · Dado uma refeição com o campo de adicionar vazio e sem histórico de uso naquele tipo de refeição, então aparecem as sugestões da lista inicial daquele tipo (seção 3.1), com o rótulo "Sugestões para o almoço" (ou desjejum, lanche, jantar, ceia) e, em cada uma, o nome do alimento e a porção em gramas.
- **CA-238** · Dado uma sugestão, quando a pessoa clica nela, então o alimento entra na porção mostrada, na opção (principal, substituto 1 ou substituto 2) daquele campo.
- **CA-239** · Dado o nome da refeição, então o tipo é reconhecido pelo nome, sem diferenciar maiúscula e acento: "desjejum" ou "café da manhã" → desjejum; nome que contém "lanche" ou "colação" → lanche; "almoço" → almoço; "jantar" ou "janta" → jantar; "ceia" → ceia.
- **CA-240** · Dado um nome que não bate com nenhum tipo (ex.: "Pré-treino"), então o tipo vem do horário: 04:00–08:59 desjejum · 09:00–10:59 lanche · 11:00–14:59 almoço · 15:00–17:59 lanche · 18:00–20:59 jantar · 21:00–03:59 ceia.
- **CA-241** · Dado alimentos que a pessoa já adicionou em refeições de um tipo, então eles aparecem primeiro nas sugestões daquele tipo, do mais usado para o menos usado (no empate, o usado mais recentemente), na última porção usada. A lista inicial completa até 6 sugestões, sem repetir alimento.
- **CA-242** · Dado um alimento adicionado ao almoço, então ele conta só para as sugestões do almoço, e não para as do desjejum.
- **CA-243** · Dado texto digitado no campo, então as sugestões somem e a busca aparece, como hoje.

#### 3.1 Lista inicial de sugestões

Porções da POF 2008-2009 (IBGE), já presentes na base. **A lista e as porções precisam
ser revisadas por uma nutricionista antes de publicar** (R-20).

| Tipo | Alimento (TACO) | Porção |
|---|---|---|
| Desjejum | Cuscuz, de milho, cozido com sal | 1 pedaço (135 g) |
| Desjejum | Ovo, de galinha, inteiro, cozido | 1 unidade (45 g) |
| Desjejum | Pão, trigo, francês | 1 unidade (50 g) |
| Desjejum | Tapioca, com manteiga | 1 unidade (50 g) |
| Desjejum | Café, infusão 10% | 1 xícara de café (50 g) |
| Desjejum | Leite, de vaca, integral | 1 copo americano (150 g) |
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
| Ceia | Leite, de vaca, integral | 1 copo americano (150 g) |
| Ceia | Iogurte, natural | 1 pote (200 g) |
| Ceia | Banana, prata, crua | 1 unidade (75 g) |
| Ceia | Mamão, Papaia, cru | 1 fatia (170 g) |
| Ceia | Aveia, flocos, crua | 1 colher de sopa (15 g) |

### US-A4 · Estudante ou nutricionista, vindo do cadastro (5 pts)

Como nutricionista, quero informar nome e CRN uma vez, no cadastro, para o plano e os
documentos já saírem assinados sem eu digitar de novo.

- **CA-244** · Dado a tela Criar conta, então ela pede também "Você é", com as opções Estudante e Nutricionista. Sem escolha, a conta não é criada e o erro aparece ao lado do campo (complementa o CA-129).
- **CA-245** · Dado a tela Criar conta com o plano Estudante marcado, então "Você é" já vem em Estudante e não pode ser trocado.
- **CA-246** · Dado "Nutricionista" escolhido, então aparecem o CRN (região, de CRN-1 a CRN-11, e número) e a caixa "Declaro que este registro é meu e está ativo". Os dois são obrigatórios.
- **CA-247** · Dado um CRN sem região, com região fora de 1 a 11, sem número, ou com número que tenha algo além de algarismos e de um P final (inscrição provisória), quando a pessoa envia, então o erro aparece ao lado do campo e nada vai para o servidor. O mesmo vale para a caixa de declaração desmarcada.
- **CA-248** · Dado um cadastro aceito, então a conta guarda a situação e, para nutricionista, o CRN e a data da declaração.
- **CA-249** · Dado uma sessão, então Configurações › Quem assina mostra o nome, a situação e o CRN da conta. Editar esses três ali grava na conta, com a mesma validação do cadastro. Instituição, responsável técnico, telefone, e-mail de contato e logo continuam guardados no aparelho, como hoje.
- **CA-250** · Dado alguém que troca a situação de Estudante para Nutricionista em Configurações, então o CRN e a declaração passam a ser pedidos, e o plano de assinatura não muda sozinho.
- **CA-251** · Dado a situação Nutricionista, então a Identificação do plano não tem Estagiário(a) nem Preceptor(a), e a folha da dieta sai com "Nome · CRN-6 12345" como responsável, sem ninguém digitar.
- **CA-252** · Dado a situação Nutricionista, então o Word de aconselhamento traz "Nutricionista: Nome · CRN-6 12345" no lugar das linhas de estagiário e preceptor, e uma assinatura só, "Nutricionista", no lugar das duas.
- **CA-253** · Dado a situação Estudante, quando a pessoa cria um plano novo, então Estagiário(a) já vem com o nome da conta e Preceptor(a) com o responsável técnico de Quem assina. Os dois podem ser trocados naquele plano, e planos já existentes não mudam.

### US-A5 · Conta obrigatória, sem os termos por enquanto (5 pts)

Como nutricionista, quero criar a conta e entrar de verdade, para meus dados e meu plano
ficarem presos a mim.

- **CA-254** · Dado as tarefas 16, 18, 24, 25 e 26 do PLAN estilo-spora, então os critérios delas valem como escritos, com as exceções dos CA-255 a CA-257.
- **CA-255** · Dado o servidor configurado e alguém sem sessão, quando clica em "Começar grátis" ou "Criar conta", então vai para a tela Criar conta, e não direto para o painel. A ponte provisória de 28/09 deixa de existir.
- **CA-256** · Dado a tela Criar conta, então ela ainda não tem a caixa de aceite dos termos (CA-134a suspenso), e a conta não grava aceite (CA-223 suspenso).
- **CA-257** · Dado os links de Termos de uso e Política de privacidade, e o botão do plano Clínica, então continuam como hoje: as páginas dizem "em preparação" e o Clínica não mostra e-mail (CA-126 e CA-220 a CA-224 suspensos).

## 4. Casos de borda

- **CB-50** · Nutricionista abre um plano que já tem receitas escritas: o campo Receitas aparece com o texto, e as receitas saem nos documentos. Nenhum texto some.
- **CB-51** · Nutricionista abre um plano antigo com estagiário ou preceptor preenchidos: os campos aparecem com o texto, e o documento sai como sairia antes.
- **CB-52** · Conta criada antes desta mudança, sem situação: o plano funciona como hoje (campos de estagiário e preceptor visíveis), e Configurações › Quem assina pede para completar a situação.
- **CB-53** · Editar Quem assina sem internet ou com o servidor fora: aparece o aviso, o que foi digitado continua na tela e nada muda na conta.
- **CB-54** · Servidor não configurado (desenvolvimento): Quem assina fica só no aparelho, como hoje, e a situação vem dali.
- **CB-55** · Histórico do atalho "Você usa muito" gravado antes desta mudança (sem tipo de refeição): não entra nas sugestões por refeição.
- **CB-56** · Idade, condição ou dado fora do que o cálculo aceita no modo rápido (ex.: menos de 1 ano): a meta não é calculada, e aparece o mesmo motivo que o atendimento completo mostraria.
- **CB-57** · Alimento da lista inicial que não existir mais na base: a sugestão some, sem erro, e as outras continuam.
- **CB-58** · A mesma conta editando Quem assina em dois aparelhos: vale a última gravação.
- **CB-59** · Clique duplo em "Criar conta" com os campos novos: continua valendo o CA-134 (uma conta só).

## 5. Fora de escopo, explicitamente

- Conferir o CRN no conselho (CFN ou regionais).
- Mostrar o IMC no modo rápido.
- Levar instituição, responsável técnico, telefone e logo para a conta.
- Editar ou esconder itens da lista inicial de sugestões pela tela.
- Termos de uso, Política de privacidade, aceite no cadastro e o e-mail do Clínica (Tarefa 21).
- Qualquer mudança de cálculo clínico: a meta calculada é o mesmo número que o atendimento completo já mostra hoje.

## 6. O que fica com você

1. **Revisão das sugestões:** mostrar a tabela da seção 3.1 a uma nutricionista (a usuária que deu o feedback é a candidata natural) e me devolver o que trocar.
2. **Servidor:** os itens da seção 6 da SPEC estilo-spora continuam valendo para a conta funcionar de verdade (endereço de volta no Supabase, e-mail, SQL do Estudante).
3. **Termos:** seu nome completo e o e-mail do MetaNutri, quando decidir, para a Tarefa 21.

## 7. Riscos para você revisar

- **R-19** · Com a conta obrigatória e sem política de privacidade publicada, pessoas vão criar conta e guardar dados sem ter lido o que o MetaNutri faz com eles. Pela LGPD, o ideal é publicar a política antes ou junto. A alternativa é manter a ponte provisória até a Tarefa 21.
- **R-20** · A lista inicial de sugestões foi montada por mim, com alimentos comuns no Nordeste. Sem revisão de uma nutricionista, pode sugerir porção ou alimento que ela não prescreveria.
- **R-21** · O CRN não é conferido. Alguém pode se declarar nutricionista sem ser. Hoje isso quase não traz vantagem (quem se declara nutricionista paga o plano igual), mas a declaração guardada com data é o registro de quem mentiu.
- **R-22** · Dados em dois lugares (nome, situação e CRN na conta; o resto de Quem assina no aparelho). Num aparelho novo, a pessoa precisa preencher de novo o responsável técnico e a logo.
