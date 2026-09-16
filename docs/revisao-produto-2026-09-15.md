# Revisão crítica do MetaNutri e plano de ampliação

Data: 15/09/2026. Base: código atual do repositório, dados em `src/data/alimentos.json`, SPEC aprovada e entrevistas em `docs/`.

## 1. Veredito

O que existe hoje é **um planejador de exercício acadêmico rodando no navegador**, não um SaaS. Ele faz bem três coisas: monta plano, calcula adequação e exporta Word. Fora isso, falta quase tudo que um produto pago precisa: não há conta, não há pagamento, não há paciente, não há entrega para o paciente e não há PDF.

Três afirmações do seu pedido precisam de correção factual, antes de qualquer plano:

1. **Não existe aba "Consultas" para remover.** O menu atual tem três itens: Meus casos, Caso aberto e Fontes científicas. O que você chamou de consulta é o "caso", que hoje mistura paciente e plano no mesmo objeto. O problema real é outro: falta a entidade **paciente**, e sem ela não há histórico nem evolução.
2. **A base de alimentos está incompleta e não atende ao seu próprio critério.** Números medidos agora, na seção 5. Só 6 alimentos de 597 têm todos os campos preenchidos.
3. **Missões diárias e app do paciente não existem em lugar nenhum do código.** Estão no backlog como ideia da nutricionista, nunca foram construídos.

Um ponto que nenhum plano de produto pode ignorar: **estudante de nutrição não prescreve dieta para paciente real.** A prescrição é privativa de nutricionista com registro no CRN, pela Lei 8.234/1991. Se o produto passar a guardar dados de paciente e entregar dieta, ele deixa de ser ferramenta de estudo e entra em terreno regulado, com LGPD por cima. Isso muda preço, responsabilidade e arquitetura.

## 2. Como o SaaS deve funcionar, de ponta a ponta

### 2.1 Cadastro

1. A pessoa entra no site e clica em **Criar conta**.
2. Escolhe e-mail e senha, ou entra com Google. O Google evita a tela de senha esquecida, que é o suporte mais chato de operar.
3. Recebe um e-mail de confirmação. Sem confirmar, ela usa o sistema, mas não consegue enviar dieta para paciente.
4. **Onboarding em três perguntas**, não mais: nome, se é estudante ou formada, e o CRN quando houver. Quem marca estudante vê um aviso fixo de que a prescrição precisa de responsável técnico, e os documentos saem com campo de assinatura da preceptora.
5. Cai direto no painel, com um caso de exemplo já montado, para ver o produto funcionando antes de digitar qualquer coisa.

### 2.2 Planos e pagamento

| Plano | Preço-alvo | Libera |
|---|---|---|
| Estudante | R$ 19/mês | Tudo do modo completo, marca d'água "uso acadêmico" nos documentos, até 10 pacientes |
| Profissional | R$ 39/mês | Sem marca d'água, pacientes ilimitados, logo própria, envio ao paciente, missões |
| Clínica | R$ 89/mês | Equipe de até 5 pessoas, modelos compartilhados, relatório de adesão |

- **Teste de 14 dias** no plano Profissional, sem cartão. Ao acabar, a conta vira Estudante em vez de bloquear: o trabalho já feito nunca fica refém.
- Tela de planos acessível por **Configurações → Assinatura** e por um botão fixo no painel enquanto a conta estiver em teste.
- Upgrade vale na hora, com cobrança proporcional. Downgrade vale no fim do ciclo. Cancelamento em dois cliques, sem ligar para ninguém, com exportação de todos os dados em um arquivo.
- Cobrança pelo Mercado Pago, com Pix e cartão. Pix é maioria nesse público.

### 2.3 O que ela vê ao entrar

O painel responde três perguntas em uma tela: o que precisa da minha atenção hoje, onde parei, e o que faço agora.

- **Atenção:** pacientes com plano vencendo, missões sem check há 3 dias, planos sem fonte confirmada.
- **Onde parei:** últimos planos abertos, com a etapa em que estão.
- **Ação:** dois botões, "Prescrição rápida" e "Atendimento completo".

### 2.4 Os dois modos de uso

Os dois modos são o mesmo plano alimentar. O que muda é **quanto o sistema pergunta antes de deixar prescrever**.

| | Prescrição rápida | Atendimento completo |
|---|---|---|
| Quando usar | Retorno, ajuste de plano, atendimento social, paciente conhecido | Primeira consulta, estágio, trabalho de faculdade |
| Pede | Nome, sexo, idade e uma meta de energia | Tudo da rápida + peso, altura, circunferências, dobras ou bioimpedância |
| Energia | Meta digitada direto, ou estimada com peso e altura se a pessoa quiser | Calculada por fórmula, com fator de atividade e adicionais |
| Antropometria | Escondida, em um link "Abrir avaliação" | Etapa própria, obrigatória |
| Documento | Dieta em PDF, uma página | Aconselhamento completo, memorial de cálculo e evolução |
| Tempo esperado | 5 a 10 minutos | 30 a 40 minutos |

**Como conviver sem confundir:** a escolha acontece uma vez, na criação do plano, e aparece como uma etiqueta no topo. Nada some de vez: na prescrição rápida existe sempre o botão "Virar atendimento completo", que abre as etapas de avaliação sem recriar o plano. O caminho inverso não existe, porque ninguém quer apagar medida já coletada.

Regra dura: **no modo rápido, nenhum campo de antropometria aparece na tela**. Campo vazio na frente do profissional é convite a preencher errado.

### 2.5 Como o paciente recebe

1. O nutricionista clica em **Enviar para o paciente**.
2. O sistema gera um **link privado** e um PDF. O link abre no celular, sem instalar nada e sem senha, com prazo de validade que o nutricionista define.
3. Na tela do paciente: refeições por horário, substitutos, lista de compras e as **missões do dia** em forma de caixinhas para marcar (beber água, comer a fruta do lanche, não pular o café).
4. O paciente marca o que cumpriu. Isso alimenta a tela de **adesão** do nutricionista: percentual por dia, por refeição e por missão.
5. Quem não quer app nenhum continua entregando o PDF ou o Word. O link é opção, nunca obrigação.

### 2.6 Pacientes

Um paciente é uma pessoa, não um documento. A ficha guarda: identificação, contato, objetivo, restrições e alergias, condições clínicas, medicamentos, e o **histórico de atendimentos**. Cada atendimento tem data, tipo (rápido ou completo), plano gerado, medidas daquele dia e observações. A evolução mostra peso, IMC e circunferências em linha do tempo, com os pontos clicáveis levando ao atendimento correspondente.

## 3. Estrutura completa de menu

| Menu | Submenu | O que a tela faz |
|---|---|---|
| **Painel** | — | Pendências do dia, planos recentes e os dois botões de criação |
| **Pacientes** | Lista | Busca por nome, filtro por objetivo, status e última consulta |
| | Ficha do paciente | Identificação, restrições, condições clínicas e medicamentos |
| | Histórico | Todos os atendimentos, com plano e medidas de cada data |
| | Evolução | Gráficos de peso, IMC, circunferências e adesão ao longo do tempo |
| | Anexos | Exames, fotos e documentos do paciente |
| **Planos alimentares** | Prescrição rápida | Monta a dieta direto, sem avaliação |
| | Atendimento completo | Fluxo com avaliação, energia, plano e adequação |
| | Meus planos | Todos os planos, por paciente e por data, com duplicar e reaproveitar |
| | Modelos | Planos-modelo por objetivo (emagrecimento, hipertrofia, gestante, DRC) |
| | Lista de substituições | Grupos de equivalência prontos para anexar à dieta |
| **Avaliação** | Antropometria | Peso, altura, circunferências, com classificação e fonte |
| | Composição corporal | Dobras cutâneas e bioimpedância, com protocolo escolhido |
| | Gasto energético | Fórmula, fator de atividade, adicionais e GET manual |
| | Anamnese | Hábitos, rotina, preferências, aversões e sintomas |
| **Alimentos** | Buscar alimento | Busca na base com filtro por fonte e por grupo |
| | Meus produtos | Cadastro de industrializado pelo rótulo, com porção e medida caseira |
| | Favoritos | Os alimentos que a pessoa usa toda semana, a um clique |
| | Preparações | Receitas com ingredientes, rendimento e valor por porção |
| **Adequação** | Micronutrientes do plano | Tabela de adequação com referência, estado e fonte |
| | Cobrir falta | Sugestões de alimentos que fecham cada micronutriente em falta |
| | Referências usadas | Quais valores de DRI foram aplicados e por quê |
| **Acompanhamento** | Missões diárias | Monta as missões que o paciente vai marcar |
| | Adesão | Quanto o paciente cumpriu, por dia e por refeição |
| | Mensagens | Recados curtos entre consultas (v2) |
| **Documentos** | Dieta em PDF | Documento de uma a duas páginas, para entregar na hora |
| | Aconselhamento em Word | Documento no modelo do estágio |
| | Memorial de cálculo | Como cada número foi obtido |
| | Modelos de documento | Cabeçalho, rodapé e textos padrão |
| **Configurações** | Perfil e CRN | Nome, registro, foto e dados que saem nos documentos |
| | Marca | Logo, cor e assinatura digitalizada |
| | Assinatura e pagamento | Plano atual, notas fiscais, upgrade, cancelamento |
| | Equipe | Convidar preceptora ou colegas, com permissão por papel |
| | Preferências de cálculo | Fórmula padrão, preset de adequação, unidades |
| | Dados e privacidade | Exportar tudo, apagar conta, registro de consentimento (LGPD) |
| **Ajuda** | Primeiros passos | Roteiro de 5 minutos até a primeira dieta |
| | Fontes e referências | Tabelas e estudos usados em cada cálculo |
| | Novidades | O que mudou em cada versão |
| | Suporte | Formulário e WhatsApp |

**Sobre "Consultas":** não vira menu. Consulta é o atendimento, e ele vive dentro da ficha do paciente, em Histórico. Um menu só para isso duplicaria a navegação.

## 4. Base de alimentos: o problema mais grave

Medição feita agora, na base do projeto (`src/data/alimentos.json`, 597 alimentos, TACO 4ª edição):

| Campo | Alimentos sem o dado | % |
|---|---|---|
| Vitamina A | 342 | 57,3% |
| Colesterol | 331 | 55,4% |
| Fibra | 235 | 39,4% |
| Vitamina C | 228 | 38,2% |
| Niacina | 32 | 5,4% |
| Cálcio | 16 | 2,7% |
| Zinco | 15 | 2,5% |
| Ferro | 14 | 2,3% |
| Sódio | 10 | 1,7% |
| **Energia (kcal)** | **6** | **1,0%** |

**Apenas 6 alimentos de 597 têm todos os 21 campos preenchidos.**

Pior que os buracos: cinco nutrientes que você exigiu **não existem na base**, porque a TACO não traz nenhum deles.

| Exigido por você | Situação | Consequência prática |
|---|---|---|
| Gordura saturada | Ausente | Não dá para orientar dislipidemia |
| Açúcares totais e adicionados | Ausente | Não dá para trabalhar diabetes nem rótulo |
| Vitamina D | Ausente | Adequação de vitamina D é impossível hoje |
| Vitamina B12 | Ausente | Ponto crítico em vegetarianos, sem cobertura |
| Folato | Ausente | Ponto crítico em gestantes, sem cobertura |

**Como corrigir, em ordem:**

1. **Somar a TBCA (USP/FoRC)** à TACO. Ela tem mais alimentos e mais componentes, inclusive açúcares e ácidos graxos. Cada alimento passa a mostrar de qual tabela veio.
2. **Somar a USDA FoodData Central** para o que falta, especialmente vitamina D, B12 e folato. Marcar claramente o alimento importado, porque a composição varia por país.
3. **Cadastro de produto pelo rótulo**, com porção declarada, medida caseira e os campos obrigatórios da rotulagem brasileira. Produto cadastrado por uma pessoa é visível só para ela, até passar por conferência.
4. **Selo de completude** em cada alimento: completo, parcial ou mínimo. O plano avisa quando usa alimento parcial, e a adequação já marca o total como subestimado.
5. **Nunca preencher buraco com zero.** Isso já vale no código, e precisa continuar valendo com as bases novas.

## 5. Tudo que está faltando ou cru

| Item | Problema | Por que importa | Como corrigir | Prioridade |
|---|---|---|---|---|
| Conta de usuário | Não existe; tudo no navegador | Sem conta não há assinatura nem acesso em dois aparelhos | Autenticação com e-mail e Google, no Supabase | Alta |
| Pagamento | Não existe | Sem cobrança não há SaaS | Mercado Pago com Pix e cartão, teste de 14 dias | Alta |
| Paciente como entidade | Existe "caso", que mistura pessoa e plano | Sem paciente não há histórico, evolução nem retorno | Separar paciente de atendimento e de plano | Alta |
| Base incompleta | 5 nutrientes exigidos ausentes; 57% sem vitamina A | Adequação fica cega em B12, folato e vitamina D | TBCA + USDA + selo de completude | Alta |
| Produto industrializado | Não dá para cadastrar | Metade do que o paciente come vem de rótulo | Cadastro por rótulo com porção e medida caseira | Alta |
| Modo rápido | Não existe; todo plano exige avaliação | Retorno e atendimento social não precisam de medida | Escolha do modo na criação do plano | Alta |
| PDF da dieta | Só exporta Word | Paciente lê no celular, e Word no celular é ruim | Gerar PDF da dieta em uma página | Alta |
| Entrega ao paciente | Não existe | O plano morre no computador do nutricionista | Link privado com prazo, além do PDF | Alta |
| LGPD | Nenhum tratamento | Dado de paciente é dado sensível de saúde | Consentimento, exportação, exclusão e registro de acesso | Alta |
| Aviso de responsabilidade | Só no primeiro acesso | Estudante não prescreve sozinho | Campo de responsável técnico no documento do estudante | Alta |
| Dashboard | Não existe | A pessoa entra e não sabe o que fazer | Painel com pendências e dois botões de criação | Média |
| Modelos de plano | Não existem | Todo plano começa do zero | Salvar plano como modelo e partir de um modelo | Média |
| Lista de substituições | Só substituto por item | Nutricionista entrega grupos de troca | Gerar lista de equivalentes por grupo | Média |
| Composição corporal | Não existe | Dobras e bioimpedância são rotina | Protocolos de dobras e campos de bioimpedância | Média |
| Anamnese | Não existe | Sem hábitos e aversões, o plano não cola | Formulário curto com preferências e restrições | Média |
| Restrições e alergias | Não existem | O sistema pode sugerir o que o paciente não come | Marcar restrição e filtrar sugestões do cobrir | Média |
| Missões diárias | Só ideia no backlog | É a diferença entre dieta entregue e dieta seguida | Missões geradas do plano, marcadas pelo paciente | Média |
| Adesão | Não existe | Sem medir adesão, o retorno é conversa solta | Percentual por dia e por refeição | Média |
| Preparações e receitas | Não existem | Ninguém come ingrediente cru isolado | Receita com ingredientes e rendimento | Média |
| Favoritos | Não existem | A pessoa repete os mesmos 40 alimentos | Marcar favorito e ordenar por uso | Média |
| Marca do profissional | Não existe | Documento sem logo parece amador | Logo, cor e assinatura nos documentos | Média |
| Equipe e preceptora | Não existe | Estágio tem supervisão obrigatória | Convite por papel: preceptora revisa e aprova | Média |
| Sugestão do cobrir | Sugere sarapatel e caranguejo | Tecnicamente correto, clinicamente estranho | Ranking por uso comum e filtro por restrição | Média |
| Nome "caso" | Nomenclatura de exercício acadêmico | Nutricionista fala paciente e atendimento | Renomear no produto inteiro | Média |
| Busca de alimentos | Só por nome | Ninguém lembra o nome exato da TACO | Filtro por grupo, fonte e favoritos | Baixa |
| Relatórios | Não existem | Clínica quer ver volume e adesão | Relatório mensal simples | Baixa |
| Ajuda | Não existe | Toda dúvida vira mensagem para você | Roteiro de primeiros passos e página de dúvidas | Baixa |

## 6. As cinco telas do próximo ciclo

1. **Conta e assinatura.** Cadastro, login e pagamento. Sem isso não existe negócio, e todo o resto é hobby.
2. **Pacientes: lista e ficha.** Separar pessoa de plano destrava histórico, evolução e retorno. É a mudança estrutural que segura todas as outras.
3. **Prescrição rápida.** É o facilitador que você mesmo identificou e o que diferencia na demonstração: dieta pronta em dez minutos, sem medida nenhuma.
4. **Base de alimentos completa e cadastro por rótulo.** Sem isso, a promessa de adequação de micronutrientes é falsa em B12, folato e vitamina D.
5. **Entrega ao paciente: PDF e link.** O plano só vira valor quando chega na mão de quem vai comer.

Missões e adesão vêm logo depois, apoiadas no link do paciente. Antes disso, elas não têm onde morar.

## 7. Resumo em cinco linhas

1. Hoje existe um bom motor de cálculo e exportação, mas não um SaaS: falta conta, cobrança, paciente e entrega.
2. O objeto central muda de "caso" para **paciente**, com atendimentos e planos pendurados nele.
3. Passam a existir dois caminhos: prescrição rápida, sem medida nenhuma, e atendimento completo, com avaliação.
4. A base de alimentos precisa de TBCA, USDA e cadastro por rótulo, porque cinco nutrientes exigidos simplesmente não existem nela.
5. O menu sai de três itens para nove áreas, e consulta deixa de ser aba: vira histórico dentro da ficha do paciente.
