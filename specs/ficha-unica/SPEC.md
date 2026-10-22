# SPEC — Ficha única: cada dado num lugar, cada pergunta para quem vale

Status: **pedida pelo coordenador em 21/10/2026**, na rodada "cuidado total" (frente `ficha-unica`). O dono disse
"Apenas faça": as dúvidas foram decididas pelos princípios da nutricionista parceira e ficam escritas aqui; a aprovação
é pelas telas antes de publicar.

**Por quê.** O dono testou com uma estudante de nutrição e achou a ficha incoerente: ele, do sexo masculino, recebeu
a pergunta "Gestação"; "Suplementos" aparecia duas vezes; sexo, idade, objetivo, alergias, atividade, doença e ocupação
eram pedidos em dois ou três lugares que não conversavam. O levantamento de 21/10 (`ficha-e-anamnese.md`, na pasta
da rodada) confirmou: a ficha mostrava as mesmas 163 linhas para um homem de 35, uma mulher de 28, uma menina de 6 e uma
mulher de 62; a gestação marcada na anamnese não chegava à DRI; "lactose" não tirava nenhum dos 597 alimentos; a
menina de 21 kg recebia "Beba cerca de 0,7 litros".

**Princípios da parceira** (valem para toda decisão): nunca álcool, ultraprocessado nem gordura trans; preservar a
cultura alimentar; a conduta é do nutricionista; preparação simples e in natura primeiro; troca equivalente.

**Specs lidas antes:** `anamnese-e-prescricoes` (D-160 a D-169, CA-560 a CA-589), `conduta-da-nutricionista`
(D-297 a D-299, CA-931 a CA-939), `planejador-metanutri` (CA-01, CA-02a a CA-02c, CA-06), `pdf-e-telas-limpas`
(CA-329 a CA-332, CB-73, CB-74), `revisao-geral-trabalho` (D-244, CA-784), `dados-na-nuvem` (DP-34, D-170, D-171),
`sugestoes-com-criterio` (CA-675), `whatsapp-e-retorno` (D-143, D-147).

**Base:** o Processo de Cuidado em Nutrição (PCN), adotado por CFN e ASBRAN, e a Res. CFN 600/2018: história do
paciente, história alimentar (com medicamentos, suplementos e atividade física), antropometria (no plano, porque muda
a cada consulta) e dados bioquímicos. Concorrentes (`concorrentes.md`): o Nutrium mostra gestação só para o sexo
feminino e põe cada dado num lugar; o Dietbox repete o dado em dois lugares, que é o defeito a evitar.

## 1. Decisões

| # | Decisão |
|---|---|
| D-340 | **Uma fonte por dado.** Nome, sexo, data de nascimento, gestação ou lactação, ocupação, doenças e restrições moram na ficha. O plano com paciente **lê** esses dados da ficha a cada vez que abre (não guarda cópia que fica velha). Peso, estatura, cintura, panturrilha, composição corporal, nível de atividade, meta e documento são da consulta e moram no plano. O plano nasce com uma cópia de nome, sexo e idade, como hoje, só para versões antigas do app que leem o plano sozinho; essa cópia não vale quando a ficha tem o dado |
| D-341 | **Idade na data da consulta.** A idade do plano com paciente (anos e meses) sai da data de nascimento na data da consulta do plano; plano sem data da consulta (antigo) usa hoje. Plano novo nasce com a data de hoje. Corrigir a data de nascimento na ficha muda a idade dos planos daquele paciente: é correção; o documento já impresso não muda |
| D-342 | **Gestação ou lactação na ficha** ("Não", "Gestante", "Lactante"), só para o sexo feminino de 14 a 50 anos (a faixa das referências de gestação e lactação da DRI, a mesma que `caso.ts` já valida). Gestante: idade gestacional em semanas, informada hoje, e peso pré-gestacional; a ficha guarda as semanas com a data em que foram informadas e mostra as semanas de agora (24 semanas em 21/10 são 28 em 18/11). Lactante: data do parto e amamentação ("Só no peito", "Peito e outros alimentos", "Não amamenta"); a ficha mostra os meses pós-parto. *Revisto pelo D-455 (22/10/2026, seção 10): lactante é quem amamenta; "Não amamenta" saiu das opções* |
| D-343 | **A condição do plano sai da ficha, na data da consulta.** Gestante com semanas de 1 a 42 naquela data → plano de gestante com essas semanas e o peso pré-gestacional; fora disso, o plano não é de gestante e, acima de 42 semanas, a etapa 1 avisa que a ficha precisa ser atualizada. Lactante que amamenta, com o parto até a data da consulta → plano de lactante com os meses daquela data; "Não amamenta" não é lactante. A DRI de gestante e lactante (`estagioDeVida`) e a energia do NASEM (adicional e depósito do 2º e 3º trimestres; produção de leite de 0 a 6 e de 7 a 12 meses) passam a valer sozinhas. *Revisto pelos D-456 e D-457 (22/10/2026, seção 10): "Peito e outros alimentos" de 0 a 6 meses soma o valor de 7 a 12 meses; acima de 60 meses do parto o plano não é de lactante e a ficha e a etapa 1 avisam* |
| D-344 | **Plano antigo com outra condição.** Plano com paciente que gravou gestação ou lactação diferente do que a ficha dá continua com a dele até a nutricionista escolher, na etapa 1: "Levar para a ficha" (grava na ficha o que o plano tinha, com as semanas daquela consulta) ou "Usar a da ficha" (tira a do plano). Sexo e idade não pedem escolha: valem os da ficha quando ela tem; sem eles na ficha, valem os gravados no plano, e a etapa 1 pede o que falta, que vai para a ficha |
| D-345 | **Etapa 1.** Cartão **Identificação**: a lista "Paciente" e, com paciente, um resumo só de leitura (nome, idade na data da consulta, sexo, gestação ou lactação com as semanas ou os meses, restrições e doenças) com "Abrir a ficha"; sem paciente, "Nome do plano", "Sexo", "Idade" (com "Meses" abaixo de 19 anos), "Gestação ou lactação" (R1), "Diagnóstico clínico" e "Ocupação", que são dados do plano sem paciente. Nos dois, "Data da consulta". Cartão **Medidas e energia**: peso (com a última medida ao lado no retorno), estatura, cintura (R8), panturrilha (R7), composição corporal (recolhida), nível de atividade (com o lembrete da anamnese) e, na prescrição rápida, a meta. Cartão **Orientações e documento**: quantidades para o paciente, meta de água, orientações, receitas, estagiário(a) e preceptor(a) ou quem assina, e anotações deste plano (recolhidas). **Saem da etapa 1:** Objetivo (Emagrecer, Manter, Ganhar), Ocupação e Diagnóstico clínico com paciente, "Meses além dos anos" com paciente e o "Nível de atividade" repetido em "Ajustar" |
| D-346 | **Objetivo: um campo só**, "Objetivo do paciente", em texto, no bloco "Motivo da consulta" da anamnese. A escolha Emagrecer/Manter/Ganhar não era usada por nenhuma conta e sai da tela; o valor gravado fica no plano, sem uso |
| D-347 | **Anamnese na ordem do PCN, em 16 blocos**: Motivo da consulta; Saúde; Gestação (R2); Lactação (R3); Saúde da mulher (R4); Digestão; Rotina e sono; Atividade física; Hidratação; Álcool e tabagismo (R6); Alimentação; Infância (R5); Pessoa idosa (R7); Recordatório de 24 horas; Exames recentes; Outras anotações. No retorno, o bloco **Retorno** vem antes de todos (R12). As perguntas de cada bloco estão na seção 2 |
| D-348 | **Pergunta só aparece quando vale para a pessoa** (regras R1 a R13, seção 3). Bloco fora da regra que já tem resposta continua à vista, com o aviso de para quem ele vale e "As respostas continuam guardadas." A resposta "Não gestante" do Trimestre antigo não segura o bloco Gestação: é o mesmo que não estar gestante (ela continua guardada) |
| D-349 | **Campos da ficha dentro dos blocos.** Objetivo do paciente (Motivo da consulta); Doenças e diagnósticos e Medicamentos em uso (Saúde); Alergias, Intolerâncias, Não come por escolha, Outros alimentos que não come e Óleo, sal e açúcar por mês (Alimentação); a lista de Exames recentes; e Outras anotações são campos da ficha, não perguntas do roteiro: o roteiro não os edita e não os tira |
| D-350 | **Roteiro salvo antes (versão 1 ou 2) vira a versão 3 sem perder edição.** Pergunta própria da conta continua, no bloco novo que corresponde ao antigo (Objetivo e queixa → Motivo da consulta; Intestino → Digestão; Água → Hidratação; Preferências e aversões e Intolerâncias e alergias → Alimentação; os outros, no de mesmo nome). Pergunta padrão renomeada mantém o texto; pergunta padrão tirada continua fora. Saem as que viraram campo da ficha ou escolha (Intolerâncias alimentares, Alergias alimentares, Trimestre, Óleo, sal e açúcar por mês em casa, Frequência e duração) e "Anotações da gestação" quando não foi renomeada. Resposta antiga aparece no bloco novo, marcada "Fora do roteiro". Roteiro que já tem blocos da versão 3 (salvo de novo por uma versão antiga) é lido como versão 3 |
| D-351 | **Restrições estruturadas** (decisão 6 do coordenador). Alergias: Leite e derivados, Ovo, Trigo, Soja, Amendoim, Castanhas, Peixe, Crustáceos e frutos do mar. Intolerâncias: Lactose, Glúten. Não come por escolha: Vegetariano, Vegano. "Outros alimentos que não come", em texto, guarda o resto (religião, aversão forte), um por linha. "Doença celíaca", marcada em Saúde, conta como Glúten |
| D-352 | **Mapeamento por grupo e por ingrediente, como dado.** Cada restrição tem a lista revisada dos alimentos da base que a contêm, pelo grupo e pelo ingrediente (Apêndice A): Leite e derivados pega a categoria inteira, manteiga, margarina e as preparações com leite ou queijo; Glúten pega trigo, centeio, cevada e aveia e tudo que leva farinha de trigo ou malte. Alimento próprio pela nota (rótulo) e alimento fora da base são lidos pelo nome, com termos por restrição; receita no plano é lida pelos ingredientes. Linha de texto que nomeia um grupo ("lactose", "glúten", "leite", "ovo") liga o grupo; as outras linhas continuam valendo pelo pedaço do nome, como antes |
| D-353 | **Onde a restrição vale.** O Cobrir não sugere alimento restrito; as trocas da folha não oferecem; as sugestões por refeição da etapa 2 não mostram; e a linha do plano com alimento (ou ingrediente de receita) restrito ganha o aviso "Alergia: leite e derivados", "Intolerância: lactose", "Não come por escolha: vegetariano" ou "Não come: camarão". A busca continua livre (a conduta é do nutricionista): o aviso aparece quando o alimento entra |
| D-354 | **"Não gosta" vai para o fim do Cobrir.** Os alimentos da resposta "Alimentos de que não gosta" (separados por vírgula, "e" ou linha) continuam podendo ser sugeridos, mas depois dos outros |
| D-355 | **Meta de água pelo peso** (correção do dono de 21/10/2026, que substitui a decisão 5 do coordenador; seção 4). Adulto (18 anos ou mais): ml por kg pela faixa de idade (35 ml/kg de 18 a 55 anos, 30 de 56 a 65, 25 acima de 65); com IMC de 30 ou mais, o peso ajustado (peso ideal pelo IMC 25 + 25% do excesso), e a tela diz isso. Abaixo de 18 anos: Holliday-Segar pelo peso. Gestação: mais 300 ml por dia; lactação: mais 700 ml. Método alternativo, escolhido no plano: 1 ml por kcal da meta de energia (sem os acréscimos, que a energia já soma). A conta aparece com o nome do método ("35 ml × 72 kg = 2,5 L"); a nutricionista pode trocar o valor final, e a escolha dela vale e fica salva. A AI de água da DRI fica só como referência, numa linha discreta. Sem peso (ou, no método por energia, sem meta de energia), não há valor automático, e a tela pede o dado. A linha da água do plano impresso e a missão de água do link usam esta meta |
| D-356 | **Atividade física estruturada sugere o nível**: "Prática de exercício" (Sim, Não), "Tipo de atividade", "Vezes por semana", "Minutos por vez", "Horário do exercício". Com "Não", só a primeira aparece. Sugestão: não pratica → Sedentário; 1 ou 2 vezes → Pouco ativo; 3 a 5 → Moderadamente ativo; 6 ou 7 → Muito ativo; sessões de menos de 30 minutos descem um nível. "Extremamente ativo" nunca é sugerido (depende do trabalho). O plano novo nasce com o nível sugerido; a etapa 1 mostra a resposta como lembrete, com "Usar" quando o nível é outro |
| D-357 | **Nível de atividade num lugar só**, a etapa 1. O número do fator só aparece ao lado do nome na equação de adulto (19 anos ou mais, sem gestação nem lactação; R11). "Ajustar" guarda fórmula, fator próprio e GET manual |
| D-358 | **Retorno.** Paciente com ao menos um plano: o bloco "Retorno" (Seguir o plano: Fácil, Médio, Difícil; O que ajudou e o que atrapalhou; Mudanças desde a última consulta; Sintomas novos; Recordatório de hoje) vem no topo da anamnese, com o resumo do último link do paciente (dias com missão marcada e a última marcação). Resposta nova guarda a data; o resumo do bloco mostra a data da última resposta. O plano duplicado de paciente nasce com o peso vazio e "Última: 82 kg em 10/09/2026" no campo; idade e semanas saem da data nova (D-341, D-343) |
| D-359 | **Ficha em três partes**: Dados do paciente (cartão), Anamnese e Conduta (Suplementação prescrita, Pedido de exames, Próxima consulta), com "Excluir paciente" por último; ao lado, Histórico de planos e Evolução do peso. Dados do paciente: Nome, Data de nascimento (com a idade), Sexo, Telefone, E-mail, Ocupação (18 anos ou mais) ou Escola e ano (abaixo de 18), Pessoas que moram na casa, Responsável (abaixo de 18) e Gestação ou lactação (R1). O cartão "Restrições e saúde" deixa de existir: o texto dele vai para Alimentação (restrições) e Saúde (condições clínicas e medicamentos), no mesmo campo guardado |
| D-360 | **Doenças e diagnósticos**: escolhas (Diabetes, Hipertensão, Colesterol ou triglicerídeos altos, Doença renal crônica, Doença celíaca, Anemia, Hipotireoidismo, Síndrome dos ovários policísticos, só para o sexo feminino, e Esteatose hepática) mais "Outros diagnósticos", o texto antigo de "Condições clínicas". O "Diagnóstico clínico" do Word do plano com paciente sai daqui; vazio, vale o que o plano tinha. *Revisto pelo D-451 (22/10/2026): a SOP só aparece para o sexo feminino de 12 anos em diante* |
| D-361 | **Óleo, sal e açúcar por mês** viram três números (óleo em litros, sal e açúcar em quilos) e, com "Pessoas que moram na casa", a ficha mostra o valor por pessoa por dia ("≈ 22 ml de óleo, 8 g de sal e 33 g de açúcar por pessoa por dia"), sem julgar |
| D-362 | **Exames recentes**: lista de data, exame e valor, com "Adicionar exame" e "Tirar". É o dado bioquímico da anamnese; o pedido de exames continua na Conduta |
| D-363 | **"Suplementos em uso" × "Suplementação prescrita".** A pergunta da Saúde é o que o paciente já toma, com a dica "O que o paciente já toma. A suplementação que você prescreve fica em Conduta."; o cartão da Conduta se chama "Suplementação prescrita". Na gestação, a dica acrescenta "Na gestação, anote ferro e ácido fólico." |
| D-364 | **Textos.** Os da ficha, da anamnese e da etapa 1 seguem o glossário de `textos.md` (§1) e as tabelas §3.10 e §3.15, com a decisão 1 do coordenador ("Excluir" apaga de vez, "Tirar" tira da lista, "Adicionar" põe; erro diz o que houve e o que fazer). Rótulo de pergunta é tema curto, sem ponto de interrogação ("Tabagismo", "Água por dia", "Horário do exercício") |
| D-365 | **Dado antigo lê sem susto.** Os campos novos da ficha vêm depois dos antigos (DP-34). Ficha sem eles abre igual e nada é gravado só por abrir; campo novo estragado vira vazio sem apagar o resto (como o CA-588); restrição ou doença de id desconhecido fica guardada e não conta (como o CA-589) |
| D-366 | **Plano sem paciente** (caso de estudo do estudante) continua com os próprios campos, com as mesmas regras R1, R8 e R9; escolher um paciente na lista passa a valer a ficha |

## 2. O roteiro padrão (versão 3)

Entre parênteses, o tipo quando não é texto; em itálico, os campos da ficha (D-349), que não são do roteiro.

| Bloco | Perguntas |
|---|---|
| Retorno (R12) | Seguir o plano (escolha: Fácil, Médio, Difícil) · O que ajudou e o que atrapalhou · Mudanças desde a última consulta (dica: "Saúde, remédios, suplementos e rotina.") · Sintomas novos · Recordatório de hoje |
| Motivo da consulta | *Objetivo do paciente* · Queixa principal · Histórico do peso (dica: "Peso habitual, maior e menor peso na vida adulta.") · Dietas que já fez |
| Saúde | *Doenças e diagnósticos* · *Medicamentos em uso* · Suplementos em uso (dica do D-363) · Cirurgias e internações · Doenças na família |
| Gestação (R2) | Náusea ou vômito · Desejos (dica: "Inclusive de algo que não é alimento, como gelo ou terra.") · Diabetes gestacional ou pressão alta |
| Lactação (R3) | Mamadas por dia · Dificuldades na amamentação |
| Saúde da mulher (R4) | Menstruação (escolha: Regular, Irregular, Não menstrua, Menopausa) · Fluxo menstrual intenso (escolha: Sim, Não) · Anticoncepcional ou reposição hormonal |
| Digestão | Frequência de evacuação (dica: "Quantas vezes por semana.") · Consistência das fezes (escolha: Bristol 1 a 7) · Gases, estufamento ou azia · Apetite · Mastigação e deglutição (dica a partir de 60 anos: "Prótese, dificuldade para mastigar ou engasgos.") |
| Rotina e sono | Rotina de trabalho ou estudo · Horário de dormir e de acordar · Qualidade do sono · Tempo de tela por dia (abaixo de 18 anos) |
| Atividade física | Prática de exercício (escolha: Sim, Não) · Tipo de atividade · Vezes por semana (número) · Minutos por vez (número) · Horário do exercício |
| Hidratação | Água por dia (dica: "Em copos ou litros.") · Cor da urina (escala de Armstrong) · Outras bebidas (dica: "Refrigerante, suco, café, chá.") |
| Álcool e tabagismo (R6) | Álcool (dica: "O que bebe, quanto e quantas vezes por semana.") · Tabagismo (dica: "Cigarro comum ou eletrônico e quanto por dia.") |
| Alimentação | *Alergias* · *Intolerâncias* · *Não come por escolha* · *Outros alimentos que não come* · Alimentos de que gosta · Alimentos de que não gosta · Vontade de doce ou salgado · Quem prepara as refeições e onde come · *Óleo, sal e açúcar por mês* |
| Infância (R5) | Aleitamento materno (dica: "Até quando mamou no peito.") · Introdução alimentar · Lanche e merenda da escola · Variedade de alimentos (dica: "Se come poucos alimentos ou recusa grupos inteiros.") |
| Pessoa idosa (R7) | Perda de peso sem querer (dica: "Nos últimos 3 meses.") · Quedas (dica: "No último ano.") · ~~Com quem mora~~ (saiu pelo D-454, 22/10/2026: repetia "Pessoas que moram na casa") |
| Recordatório de 24 horas | Ao acordar · Café da manhã · Lanche da manhã · Almoço · Lanche da tarde · Jantar · Ceia |
| Exames recentes | *lista de data, exame e valor* |
| Outras anotações | *Anamnese anterior* (só com texto) · *Outras anotações* |

Nada se pergunta duas vezes: a azia fica só na Digestão; o intestino da gestante, na Digestão; ferro e ácido fólico,
em Suplementos em uso; mastigação e engasgo da pessoa idosa, em Mastigação e deglutição; quem cozinha, em Alimentação.

## 3. Regras de quando aparece

A idade é a de hoje na ficha e a da data da consulta no plano.

| ID | O quê | Aparece quando | Fora da regra |
|---|---|---|---|
| R1 | Gestação ou lactação (ficha e plano sem paciente) | sexo feminino e de 14 a 50 anos | some; com dado, fica à vista com o aviso (CB-73) |
| R2 | Bloco Gestação | gestante | idem, com "As respostas continuam guardadas." |
| R3 | Bloco Lactação | lactante | idem |
| R4 | Saúde da mulher; a opção "Síndrome dos ovários policísticos" | sexo feminino, de 10 anos em diante, sem gestação (a opção: sexo feminino; *a partir de 12 anos pelo D-451*) | idem |
| R5 | Infância | de 1 a 9 anos | idem |
| R6 | Álcool e tabagismo | de 12 anos em diante | idem |
| R7 | Pessoa idosa; panturrilha | de 60 anos em diante | idem (a panturrilha já seguia esta regra) |
| R8 | Cintura | de 20 anos em diante e fora da gestação | idem |
| R9 | Meses da idade | calculados quando há data de nascimento; campo para digitar só no plano sem paciente e abaixo de 19 anos | — |
| R10 | Fórmula da TMB | adulto de 19 anos ou mais, sem gestação nem lactação | já era assim |
| R11 | Fator ao lado do nível de atividade | só na equação de adulto | o nome sem o número |
| R12 | Bloco Retorno | paciente com ao menos um plano | — |
| R13 | R1 a R8 na ficha | só com sexo e data de nascimento | a frase "Preencha sexo e data de nascimento para ver as perguntas da fase de vida." |
| — | Ocupação × Escola e ano; Responsável; Tempo de tela | Ocupação de 18 anos em diante (ou sem idade); Escola e ano, Responsável e Tempo de tela abaixo de 18 | o campo com dado fica |

## 4. Meta de água (D-355)

**Correção do dono (21/10/2026):** na prática clínica a meta de água sai do peso, ajustada pela idade e pela situação,
e não só da AI da fase de vida. A decisão 5 do coordenador (AI da DRI como meta) foi substituída; a AI ficou como
referência.

### 4.1 A conta

| Quem | Método padrão (por peso) | Conta mostrada |
|---|---|---|
| 18 a 55 anos | 35 ml/kg | "35 ml × 72 kg = 2,5 L" |
| 56 a 65 anos | 30 ml/kg | "30 ml × 70 kg = 2,1 L" |
| Acima de 65 anos | 25 ml/kg | "25 ml × 60 kg = 1,5 L" |
| Adulto com IMC de 30 ou mais | a faixa da idade sobre o **peso ajustado** = peso ideal (IMC 25 × estatura²) + 0,25 × (peso atual − peso ideal) | "35 ml × 79,5 kg (peso ajustado) = 2,8 L" e a nota "IMC de 30 ou mais: usado o peso ajustado, o peso ideal (IMC 25) mais 25% do excesso." |
| Abaixo de 18 anos | Holliday-Segar: 100 ml/kg nos primeiros 10 kg, mais 50 ml/kg nos 10 kg seguintes, mais 20 ml/kg acima de 20 kg | "1.000 ml + 500 ml + 20 ml × 1 kg = 1,5 L" (o nome do método já está na linha, antes da conta) |
| Gestante | a conta da idade **mais 300 ml** | "35 ml × 64 kg + 300 ml da gestação = 2,5 L" |
| Lactante | a conta da idade **mais 700 ml** | "35 ml × 62 kg + 700 ml da lactação = 2,9 L" |
| Método por energia (escolha do plano) | 1 ml por kcal da meta de energia (GET ou meta digitada); gestação e lactação já estão na energia | "1 ml × 2.050 kcal = 2,1 L" |

O valor vai em litros com uma casa. A estatura só entra para o IMC; sem ela, vale o peso atual. A nutricionista troca o
valor final no campo "Meta de água" (a troca vale para a folha e para a missão e fica salva no plano); "Usar a
calculada" volta à conta. Campo apagado tira a linha da folha (D-298), e a missão fica "Beber água ao longo do dia".
Linha escrita à mão antes desta versão (texto) continua valendo até "Usar a calculada".

### 4.2 Fontes

- Faixas de ml/kg por idade: a tabela de uso corrente na prática clínica brasileira (35 ml/kg para adultos, 30 e
  25 ml/kg para idosos), como a de Nutritotal PRO, "O cálculo da oferta hídrica é de grande importância para o paciente
  em Terapia Nutricional Enteral" (16/09/2019), que cita Waitzberg e Dias, *Guia Básico de Terapia Nutricional*
  (Atheneu, 2005). Os cortes de 55 e 65 anos são os pedidos pelo dono; a tabela da Nutritotal usa 55 a 75 anos para
  30 ml/kg e acima de 75 para 25 ml/kg. Não foi achada uma diretriz primária com estes cortes: a parceira confere.
- A mesma fonte dá 1 a 1,5 ml por kcal por dia como alternativa; o app usa 1 ml/kcal.
- Holliday MA, Segar WE. The maintenance need for water in parenteral fluid therapy. *Pediatrics* 1957;19(5):823-32.
- Peso ajustado na obesidade: peso ideal + 25% da diferença entre o peso atual e o ideal (a correção usada nas
  calculadoras de terapia nutricional, como a ClinCalc).
- Gestação e lactação: a EFSA (Scientific Opinion on Dietary Reference Values for water, *EFSA Journal* 2010) propõe
  mais 300 ml por dia na gestação e mais 700 ml na lactação. Na DRI de 2004 (Institute of Medicine, *Dietary Reference
  Intakes for Water, Potassium, Sodium, Chloride, and Sulfate*, NAP 2005), a água total passa de 2,7 L para 3,0 L na
  gestação (+0,3 L) e para 3,8 L na lactação (+1,1 L). O app usa os +300 e +700 ml pedidos; a diferença na lactação
  fica para a parceira conferir.
- Referência à parte (não é meta): ESPEN, Volkert et al., *Clinical Nutrition* 2022: pessoa idosa, ao menos 1,6 L de
  bebidas por dia para mulheres e 2,0 L para homens.

### 4.3 A referência da DRI (só uma linha de referência)

Fonte: Institute of Medicine (NASEM). *Dietary Reference Intakes for Water, Potassium, Sodium, Chloride, and
Sulfate*. Washington: National Academies Press, 2005. AI de água total e a parte que vem de bebidas, em litros por dia.

| Fase de vida | Água total | Em bebidas |
|---|---|---|
| 1 a 3 anos | 1,3 | 0,9 |
| 4 a 8 anos | 1,7 | 1,2 |
| Meninos de 9 a 13 anos | 2,4 | 1,8 |
| Meninas de 9 a 13 anos | 2,1 | 1,6 |
| Rapazes de 14 a 18 anos | 3,3 | 2,6 |
| Moças de 14 a 18 anos | 2,3 | 1,8 |
| Homens de 19 anos ou mais | 3,7 | 3,0 |
| Mulheres de 19 anos ou mais | 2,7 | 2,2 |
| Gestantes | 3,0 | 2,3 |
| Lactantes | 3,8 | 3,1 |

A linha discreta embaixo da conta: "Referência da DRI para mulheres de 19 anos ou mais: 2,7 L de água total, cerca de
2,2 L em bebidas." A linha da folha continua "Beba cerca de 2,5 litros de água por dia.", com a meta do plano.

## 5. Histórias e critérios de aceite

Pessoas: **nutricionista**, **estudante** (plano sem paciente) e **paciente**.

### US-FU1 · O plano lê a ficha

- **CA-1030** · Dado um plano com paciente cuja ficha tem sexo e data de nascimento, então o plano usa o sexo da ficha e a idade em anos e meses na data da consulta do plano; mudar a ficha muda o plano (energia, DRI, curvas, documentos).
- **CA-1031** · Dado um plano com paciente sem data da consulta, então a idade é a de hoje.
- **CA-1032** · Dado um plano com paciente cuja ficha não tem sexo ou data de nascimento, então o plano usa o que ele tem gravado, e o cartão Identificação pede o que falta ("Sexo", "Data de nascimento"); o que se preenche ali fica na ficha.
- **CA-1033** · Dado "Novo plano", então o plano nasce com a data de hoje; pela ficha, nasce também com nome, sexo e idade copiados (D-340) e com o nível de atividade sugerido pela anamnese (D-356), ou Sedentário sem sugestão.
- **CA-1034** · Dado a data de nascimento corrigida na ficha, então a idade dos planos daquele paciente muda.
- **CA-1035** · Dado o nome do paciente mudado na ficha, então o título do plano, a folha impressa, o Word e o nome no link usam o nome novo. *Revisto pelo D-462 (22/10/2026): o título do plano é o nome do plano (D-409 da `textos-e-promessas`); a folha, o Word e o link continuam com o nome do paciente.*
- **CA-1036** · Dado um plano sem paciente, então ele mostra e guarda os próprios Nome do plano, Sexo, Idade, Meses (abaixo de 19 anos), Gestação ou lactação (R1), Diagnóstico clínico e Ocupação.
- **CA-1037** · Dado um plano sem paciente, quando a nutricionista escolhe um paciente em "Paciente", então os campos do plano somem e vale a ficha; escolher "Sem paciente" traz de volta os campos do plano, com o que eles tinham.

### US-FU2 · Gestação e lactação

- **CA-1038** · Dado a ficha de uma mulher de 14 a 50 anos, então "Gestação ou lactação" aparece com "Não", "Gestante" e "Lactante"; dado um homem, uma menina de 13, uma mulher de 51 ou mais, ou uma ficha sem sexo ou sem data de nascimento, então não aparece.
- **CA-1039** · Dado "Gestante" na ficha, então ela pede "Idade gestacional" (semanas) e "Peso pré-gestacional"; as semanas guardadas em 21/10/2026 com 24 aparecem como 28 em 18/11/2026, e a dica diz "Avança sozinha a cada semana."
- **CA-1040** · Dado "Lactante" na ficha, então ela pede "Data do parto" e "Amamentação" e mostra os meses pós-parto.
- **CA-1041** · Dado uma ficha gestante (24 semanas, 28 anos, 60 kg antes) e um plano com a data de hoje, então a adequação usa a DRI de gestante de 19 a 30 anos (ferro 27 mg, folato 600 mcg) e a energia soma o adicional do 2º trimestre e o depósito pelo IMC pré-gestacional.
- **CA-1042** · Dado uma ficha gestante cujas semanas, na data da consulta, ficam abaixo de 1 ou acima de 42, então o plano não é de gestante; acima de 42, a etapa 1 diz "Pela data informada na ficha, a gestação passou de 42 semanas. Atualize a ficha."
- **CA-1043** · Dado uma ficha lactante que amamenta e um plano 3 meses depois do parto, então o plano é de lactante com 3 meses (DRI de lactante, produção de leite de 0 a 6 meses); com "Não amamenta", não é lactante. *Revisto pelo D-455: "Não amamenta" saiu; o gravado antes é lido como "Não".*
- **CA-1044** · Dado um plano antigo com paciente que gravou "Gestante, 20 semanas", e a ficha sem gestação, então o plano continua de gestante e a etapa 1 mostra o aviso com "Levar para a ficha" e "Usar a da ficha"; "Levar para a ficha" grava a gestação na ficha com as 20 semanas na data da consulta do plano; "Usar a da ficha" tira a gestação do plano. Os dois tiram o aviso.

### US-FU3 · A ficha

- **CA-1045** · Dado a ficha, então os cartões vêm nesta ordem: Dados do paciente, Anamnese, Suplementação prescrita, Pedido de exames, Próxima consulta e Excluir paciente; na tela larga, Histórico de planos e Evolução do peso ficam ao lado; abaixo dela, vêm antes dos cartões longos.
- **CA-1046** · Dado Dados do paciente, então tem Nome, Data de nascimento (com "35 anos e 7 meses"), Sexo, Telefone, E-mail, Ocupação (ou Escola e ano abaixo de 18 anos), Pessoas que moram na casa, Responsável (abaixo de 18) e Gestação ou lactação (R1); não tem Objetivo, e a ficha não tem o cartão "Restrições e saúde".
- **CA-1047** · Dado a anamnese, então os blocos que aparecem seguem a ordem do D-347, com Retorno antes de todos.
- **CA-1048** · Dado um homem de 35 anos, então a anamnese não tem Gestação, Lactação, Saúde da mulher, Infância nem Pessoa idosa, e tem Álcool e tabagismo.
- **CA-1049** · Dado uma mulher de 28 anos gestante, então tem Gestação e não tem Lactação, Saúde da mulher, Infância nem Pessoa idosa.
- **CA-1050** · Dado uma menina de 6 anos, então tem Infância e "Tempo de tela por dia" em Rotina e sono, e não tem Álcool e tabagismo, Gestação, Lactação, Saúde da mulher nem Pessoa idosa; Dados do paciente pede "Escola e ano" e "Responsável", e não pede Gestação ou lactação.
- **CA-1051** · Dado uma mulher de 68 anos, então tem Saúde da mulher e Pessoa idosa e não tem Gestação ou lactação, Gestação, Lactação nem Infância; "Mastigação e deglutição" tem a dica de prótese e engasgos.
- **CA-1052** · Dado uma ficha sem sexo ou sem data de nascimento, então a anamnese mostra só os blocos que valem para todos e a frase "Preencha sexo e data de nascimento para ver as perguntas da fase de vida."
- **CA-1053** · Dado um bloco fora da regra com resposta (Gestação respondida num homem), então ele aparece com o aviso de para quem vale e "As respostas continuam guardadas."; a resposta "Não gestante" do Trimestre antigo não o faz aparecer.
- **CA-1054** · Dado a ficha e a etapa 1 do mesmo paciente, então Objetivo, Suplementos em uso, Medicamentos em uso, Doenças e diagnósticos, Alergias, Ocupação e Atividade física aparecem uma vez cada, e nenhum deles aparece na etapa 1.
- **CA-1055** · Dado a ficha, então "Suplementos em uso" (Saúde) tem a dica do D-363 e o cartão da Conduta se chama "Suplementação prescrita".
- **CA-1056** · Dado Saúde, então "Doenças e diagnósticos" tem as escolhas do D-360 e "Outros diagnósticos" com o texto antigo de Condições clínicas; "Síndrome dos ovários policísticos" só aparece para o sexo feminino (ou marcada; *de 12 anos em diante pelo D-451*); o Word de um plano com paciente traz, em "Diagnóstico clínico", as doenças marcadas e o texto.
- **CA-1057** · Dado Alimentação, então Alergias, Intolerâncias e Não come por escolha são escolhas (D-351), e "Outros alimentos que não come" mostra o texto antigo de Restrições, com a dica "Um por linha. Esses alimentos não aparecem nas sugestões nem no Cobrir."; com Doença celíaca marcada, a linha "A doença celíaca, marcada em Saúde, já tira o glúten das sugestões." aparece.
- **CA-1058** · Dado Óleo, sal e açúcar por mês (0,9 L, 1 kg, 1 kg) e 4 pessoas na casa, então a ficha mostra "≈ 8 ml de óleo, 8 g de sal e 8 g de açúcar por pessoa por dia"; sem pessoas na casa, pede o número em Dados do paciente.
- **CA-1059** · Dado Exames recentes, então "Adicionar exame" cria uma linha com Data, Exame e Valor, e "Tirar" a remove; o resumo do bloco diz quantos exames há.
- **CA-1060** · Dado "Editar roteiro", então a janela tem os 15 blocos do roteiro (sem Exames recentes e Outras anotações, que são da ficha), as perguntas editáveis, "Tirar" e "Adicionar pergunta", e a etiqueta da regra em cada bloco condicional ("Só gestante", "Só lactante", "Mulheres a partir de 10 anos", "De 1 a 9 anos", "A partir de 12 anos", "A partir de 60 anos", "Só no retorno"); os campos da ficha aparecem como "Campos da ficha", sem edição. "Voltar ao roteiro padrão" traz a seção 2.
- **CA-1061** · Dado um roteiro salvo na versão 2 com uma pergunta própria em "Preferências e aversões", "Fumo" renomeada para "Cigarro" e "Dietas que já fez" tirada, então a versão 3 tem a pergunta própria em Alimentação, "Cigarro" no lugar de "Tabagismo", nenhuma "Dietas que já fez" e as perguntas novas; um paciente com resposta em "Alergias alimentares" a vê em Alimentação, "Fora do roteiro".
- **CA-1062** · Dado Atividade física com "Não", então só "Prática de exercício" aparece; com "Sim", 4 vezes por semana e 60 minutos, então a sugestão é Moderadamente ativo; com 20 minutos, Pouco ativo.
- **CA-1063** · Dado as perguntas de escolha (Seguir o plano, Menstruação, Fluxo menstrual intenso, Prática de exercício, Consistência das fezes e Cor da urina), então cada uma é escolha única com alvo de 44 px; tocar de novo apaga; resposta antiga escrita em texto que não é uma das opções continua num campo de texto.
- **CA-1064** · Dado um paciente com um plano, então a anamnese começa pelo bloco Retorno, com o resumo do último link ("Link de 10/09/2026: missão marcada em 12 de 30 dias. Última marcação em 18/10/2026."); sem link, sem o resumo; sem plano, sem o bloco.
- **CA-1065** · Dado uma resposta escrita hoje, então ela guarda a data, e o resumo do bloco diz "2 de 4 respondidas · 21/10/2026".

### US-FU4 · Etapa 1

- **CA-1066** · Dado a etapa 1 de um plano com paciente, então Identificação mostra a lista Paciente, o resumo (nome, "35 anos e 7 meses", sexo, gestação ou lactação, restrições, doenças) com "Abrir a ficha" e a Data da consulta; não tem Nome do plano, Sexo, Idade, Meses, Gestação ou lactação, Diagnóstico clínico, Ocupação nem Objetivo.
- **CA-1067** · Dado a etapa 1 de um plano sem paciente, então tem Nome do plano, Sexo, Idade, Meses (só abaixo de 19 anos), Gestação ou lactação (R1), Diagnóstico clínico, Ocupação e Data da consulta, e não tem Objetivo.
- **CA-1068** · Dado o atendimento completo, então a cintura aparece de 20 anos em diante fora da gestação, ou com valor; a panturrilha, de 60 anos em diante, ou com valor.
- **CA-1069** · Dado a etapa 1, então "Nível de atividade" aparece uma vez, com o fator ao lado do nome só para adulto sem gestação nem lactação ("Sedentário (1,2)"; para a criança, "Sedentário"); "Ajustar" não tem o nível e continua com fórmula (adulto), fator próprio e GET manual.
- **CA-1070** · Dado a anamnese com atividade, então a etapa 1 mostra "Na anamnese: musculação, 4 vezes por semana, 60 minutos por vez. Sugere Moderadamente ativo." e "Usar" quando o nível marcado é outro; "Usar" marca o sugerido.
- **CA-1071** · Dado a etapa 1, então "Orientações e documento" tem Quantidades para o paciente, Meta de água (com o lembrete da Hidratação: "Na anamnese: 1 litro por dia · urina 5 · Amarelo-escuro"), Orientações nutricionais, Receitas (quando vale), Estagiário(a) e Preceptor(a) ou "Assina este plano", e "Anotações deste plano" recolhido ("Anotações internas. Não aparecem no documento.").
- **CA-1072** · Dado "Duplicar" num plano de paciente com 82 kg em 10/09/2026, então a cópia tem a data de hoje, o peso vazio e a dica "Última: 82 kg em 10/09/2026"; a idade e as semanas são as da data nova. A dica vale também para o plano de origem do mesmo dia (duplicar na mesma consulta não perde o peso de vista). Plano sem paciente duplicado continua com o peso.

### US-FU5 · Restrições que protegem

- **CA-1073** · Dado a base de 597 alimentos, então cada restrição pega exatamente a lista do Apêndice A; e as listas obedecem: toda a categoria "Leite e derivados" está em Leite e derivados; Lactose está dentro de Leite e derivados e deixa de fora parmesão, prato, minas meia cura, mozarela e manteiga; Trigo está dentro de Glúten; Glúten tem aveia, centeio, cevada (cerveja e malte) e não tem pão de queijo, polvilho nem tapioca; toda a categoria "Carnes e derivados" e toda "Pescados e frutos do mar" estão em Vegetariano; Vegano contém Vegetariano, Leite e derivados, Ovo e o mel.
- **CA-1074** · Dado um paciente com Alergia a Leite e derivados, quando o Cobrir do cálcio abre, então nenhum queijo, iogurte, leite ou requeijão é sugerido; com Lactose, o parmesão pode ser sugerido e o leite não.
- **CA-1075** · Dado um paciente com Glúten, então as trocas da folha para o pão francês não oferecem outro pão de trigo, e nenhuma troca de nenhum alimento do plano é de glúten.
- **CA-1076** · Dado um paciente com Ovo, quando a etapa 2 abre o café da manhã, então "Ovo, de galinha, inteiro, cozido" não aparece nas sugestões da refeição.
- **CA-1077** · Dado um paciente com Alergia a Leite e derivados e uma refeição com "Queijo, minas, frescal", então a linha do item mostra "Alergia: leite e derivados"; com uma receita que leva leite, a linha da receita mostra o mesmo aviso; com "camarão" em Outros alimentos que não come e "Camarão, Rio Grande, grande, cozido" no plano, "Não come: camarão".
- **CA-1078** · Dado um alimento próprio chamado "Iogurte grego zero lactose", então ele bate com Leite e derivados e não bate com Lactose; "Pão de queijo congelado" bate com Leite e derivados e não com Glúten; "Bebida de amêndoas" bate com Castanhas e não com Leite e derivados.
- **CA-1079** · Dado o texto antigo "lactose" em Restrições, então o grupo Lactose vale (antes ele não tirava nenhum alimento); "leite" liga Leite e derivados; "jiló" continua tirando só o que tem "jiló" no nome.
- **CA-1080** · Dado um paciente vegetariano, então nenhuma carne, peixe, fruto do mar, gelatina ou prato com eles é sugerido; ovo e leite podem ser; com vegano, também não.
- **CA-1081** · Dado "Alimentos de que não gosta: fígado, jiló", quando o Cobrir do ferro abre, então fígado pode aparecer, mas depois de todos os outros.

### US-FU6 · Meta de água pelo peso (correção do dono)

- **CA-1082** · Dado um adulto, então a meta é a faixa da idade vezes o peso: 35 anos e 72 kg dão "35 ml × 72 kg = 2,5 L"; 60 anos e 70 kg, "30 ml × 70 kg = 2,1 L"; 70 anos e 60 kg, "25 ml × 60 kg = 1,5 L".
- **CA-1083** · Dado um adulto com IMC de 30 ou mais (35 anos, 100 kg, 1,65 m), então a conta usa o peso ajustado (68,1 kg ideal + 25% do excesso = 76 kg): "35 ml × 76 kg (peso ajustado) = 2,7 L", com a nota do peso ajustado.
- **CA-1084** · Dado uma criança ou adolescente, então a meta é a de Holliday-Segar: 21 kg dão 1,5 L ("Por peso: Holliday-Segar (abaixo de 18 anos) · 1.000 ml + 500 ml + 20 ml × 1 kg = 1,5 L", sem repetir o nome); 8 kg, 0,8 L; 15 kg, 1,3 L.
- **CA-1090** · Dado uma gestante, então a conta soma 300 ml; dada uma lactante, 700 ml, e a conta diz o acréscimo.
- **CA-1091** · Dado o método "Por energia (1 ml/kcal)" escolhido no plano, então a meta é 1 ml por kcal da meta de energia ("1 ml × 2.050 kcal = 2,1 L"), sem os acréscimos de gestação e lactação; sem meta de energia, não há valor automático. Plano antigo, sem o campo, usa "Por peso".
- **CA-1092** · Dado a etapa 1, então o campo "Meta de água" mostra o valor em litros, o nome do método e a conta, e uma linha discreta com a referência da DRI para a fase de vida; sem peso, o campo fica vazio, com "Informe o peso para a meta automática.".
- **CA-1093** · Dado um valor digitado pela nutricionista, então ele vale para a folha e para a missão e fica salvo no plano; "Usar a calculada" volta à conta; campo apagado tira a linha da folha e deixa a missão sem número.
- **CA-1094** · Dado a folha e o link do mesmo plano, então "Beba cerca de 2,5 litros de água por dia." e "Beber cerca de 2,5 litros de água" usam o mesmo valor.
- **CA-1095** · Dado um plano com a linha da água escrita à mão antes desta versão, então ela continua igual na folha até "Usar a calculada".

### US-FU7 · Textos e tela

- **CA-1085** · Dado a ficha, a anamnese e a etapa 1, então os textos das tabelas §3.10 e §3.15 de `textos.md` estão aplicados (Seção 6), e não há "caso", "Apagar", "Acrescentar", "Não consegui" nem aspas retas nessas telas.
- **CA-1086** · Dado a ficha e a etapa 1 em 360 px, então nada rola para o lado e todo botão, escolha e caixa tem pelo menos 44 px de toque.

### US-FU8 · Dado antigo

- **CA-1087** · Dado uma ficha guardada antes desta versão, então ela abre com os dados de sempre nos lugares novos (restrições em Alimentação, condições clínicas em Outros diagnósticos, medicamentos em Medicamentos em uso, objetivo em Objetivo do paciente), e abrir não grava nada.
- **CA-1088** · Dado campos novos estragados (gestação que não é objeto, restrições que não são lista, exame sem data), então o campo vira vazio e o resto da ficha continua; ids de restrição e doença que esta versão não conhece ficam guardados depois de salvar, sem aparecer.
- **CA-1089** · Dado a ficha salva por esta versão, então os campos novos ficam depois dos antigos no texto guardado (DP-34).

## 6. Textos aplicados (§3.10 e §3.15 de `textos.md`)

| # | Antes | Agora |
|---|---|---|
| 102 | Pessoa e meta / Pessoa e medidas | Medidas e energia (o cartão perdeu sexo e idade, que foram para Identificação) |
| 103 | Objetivo: Emagrecer / Manter / Ganhar | sai (D-346) |
| 104 | Condição (Nenhuma / Gestante / Lactante) | Gestação ou lactação (Não / Gestante / Lactante) |
| 105 | Meses além dos anos | Meses, com a dica "Além dos anos completos." |
| 106 | Peso e estatura aqui servem só para estimar… | Na prescrição rápida, peso e estatura servem só para estimar a meta e calcular a proteína em g/kg. Não há classificação nem diagnóstico. |
| 107 | Vale o seu número. Apague o campo… | Vale o valor que você digitou. Apague o campo para voltar à meta calculada (N kcal). |
| 108 | Sai no começo das orientações da dieta impressa. Vazio, não sai. | Aparece no início das orientações do plano impresso. Se ficar vazio, não aparece. |
| 109 | Água na dieta | Meta de água |
| 110 | Em plano novo, Estagiário(a) vem do nome… | Num plano novo, estes nomes vêm da sua conta e de Configurações › Quem assina. Você pode trocá-los aqui. |
| 111 | Responsável técnico / Quem assina junto com você no estágio. | Preceptor(a) / Quem assina com você no estágio. |
| 112 | Virar atendimento completo | Mudar para atendimento completo |
| 113 | Anotações suas, não saem no documento. | Anotações internas. Não aparecem no documento. (título: Anotações deste plano) |
| 114 | O planejador atende casos a partir de 1 ano. | O MetaNutri calcula para pacientes a partir de 1 ano. |
| 115 | As referências de gestação cobrem 14 a 50 anos. | As referências de gestação cobrem de 14 a 50 anos. |
| 116 | Corrija os campos inválidos do caso… | Corrija os campos inválidos do plano para calcular a energia. |
| 117 | …usada a equação do NASEM 2023. | …foi usada a equação do NASEM (2023). |
| 163 | Suplementos que já usa / Suplementos | Suplementos em uso / Suplementação prescrita (D-363) |
| 164 | Alergias em dois lugares e a dica que manda escrever de novo | um lugar só, estruturado (D-351); a dica sai |
| 165 | Gestação para o sexo masculino; "Não gestante" | R2; sem a opção (D-342, D-348) |
| 166 | Objetivo na ficha e no plano | Objetivo do paciente, só na anamnese (D-346) |
| 167 | Uma por linha. O que estiver aqui some das sugestões de alimento. | Um por linha. Esses alimentos não aparecem nas sugestões nem no Cobrir. |
| 168 | Não come ou não pode comer | Outros alimentos que não come |
| 169 | Apagar paciente / Apagar mesmo assim | Excluir paciente / Excluir paciente |
| 170 | Cadastre a pessoa uma vez. Os planos seguintes reaproveitam… | Cadastre o paciente uma vez: os planos dele usam a idade, o sexo, as restrições e o histórico da ficha. |
| 171 | Ninguém com esse nome | Nenhum paciente com esse nome |
| 172 | Fumo | Tabagismo |
| 173 | Horário | Horário do exercício |
| 174 | Anamnese de antes | Anamnese anterior |
| 175 | Este navegador não guardou o roteiro… / o modelo. | Não foi possível salvar o roteiro. Ele vale até você fechar a página. / Não foi possível salvar o modelo. |
| 176 | Usar acrescenta uma cópia ao paciente. | “Usar” adiciona uma cópia do modelo à ficha deste paciente. |
| 177 | …Tirar uma pergunta não apaga as respostas já escritas. | …Tirar uma pergunta não apaga as respostas já registradas. ("Tirar", pela decisão 1 do coordenador) |

## 7. Casos de borda

| ID | Situação | Comportamento |
|---|---|---|
| CB-340 | Ficha sem sexo ou sem data de nascimento | Sem os blocos e campos de fase de vida (R13), com a frase; o plano usa o gravado nele e pede o que falta |
| CB-341 | Sexo mudado para masculino numa ficha gestante | "Gestação ou lactação" fica à vista com o aviso; o plano mostra o erro de sempre ("Gestação só pode ser marcada para o sexo feminino.") até a nutricionista corrigir |
| CB-342 | Data de nascimento no futuro ou inválida | Idade vazia: vale CB-340 |
| CB-343 | Gestante sem semanas | O plano é de gestante sem semanas: a energia avisa, como hoje |
| CB-344 | Lactante sem data do parto | O plano é de lactante sem os meses: a energia avisa, como hoje |
| CB-345 | Data do parto depois da data da consulta | O plano não é de lactante |
| CB-346 | Paciente excluído com planos | Os planos perdem o vínculo e voltam a usar os próprios campos gravados |
| CB-347 | Plano aberto e ficha mudada em outra aba | Ao voltar ao plano, ele lê a ficha nova |
| CB-348 | Roteiro salvo na versão 3 por esta versão e salvo de novo por uma versão antiga em outro aparelho | Os blocos da versão 3 ficam guardados como desconhecidos pela antiga; esta versão os lê de novo como versão 3 (D-350) |
| CB-349 | Pergunta própria da conta num bloco que tem regra (por exemplo, em Gestação) | Segue a regra do bloco |
| CB-350 | Alimento próprio sem nome reconhecível | Só a lista de texto livre vale para ele; o aviso não aparece |
| CB-351 | Restrição que tira todas as sugestões do Cobrir | A frase de sempre: "Nenhum alimento de rotina, dentro das restrições do paciente, cobre…" |
| CB-352 | Plano sem paciente | Sem restrição, como hoje |
| CB-353 | Linha da água escrita à mão (texto, de antes) | Continua na folha até "Usar a calculada" |
| CB-357 | Sem estatura | A conta usa o peso atual (sem IMC, não há peso ajustado) |
| CB-358 | Peso fora da faixa (inválido) | Sem valor automático, como sem peso |
| CB-354 | Resposta antiga sem data | O resumo do bloco mostra só a contagem |
| CB-355 | "Vezes por semana" com texto que não é número | Sem sugestão de nível; o texto fica |
| CB-356 | Plano duplicado sem paciente | Continua com o peso, como hoje |

## 8. Fora de escopo

- Pedir o nome numa janela antes de criar o paciente (P-39 do levantamento) e chamar o plano pela data (P-19): a
  lista de planos continua com o nome gravado em cada plano.
- Guardar as respostas do Retorno de cada consulta separadamente: fica a resposta mais recente.
- Alertas por doença (doença renal → potássio e fósforo; hipertensão → sódio), consumo atual × plano pelo
  recordatório e prioridade no Cobrir pelos exames: a ficha já guarda o dado estruturado para isso.
- Imprimir a anamnese (D-168) e o questionário pré-consulta pelo link.
- Avisar a restrição na busca do alimento e nos atalhos da entrada rápida: a busca é livre; o aviso aparece na linha.
- O lugar de "Quantidades para o paciente": a frente `alimentos-e-gramaturas` o leva para a etapa 2 e para a janela de
  imprimir (decisão 3 do coordenador); aqui ele só muda de cartão dentro da etapa 1.

## 9. Riscos e decisões para o dono revisar

1. **Listas de alergia e intolerância** (Apêndice A) foram montadas pelo nome e pela receita usual de cada item da
   TACO. Produtos industrializados (biscoitos, pães de forma, margarinas, embutidos) entram quando costumam levar o
   ingrediente ou o aviso "pode conter": numa alergia, sobrar é mais seguro que faltar. A parceira confere.
2. **Lactose deixa os queijos maturados e a manteiga** (quase sem lactose), e pães e biscoitos (leite em pouca
   quantidade). É a conduta mais comum; a parceira confere.
3. **Óleo de soja refinado fica fora de Soja**: o refino tira quase toda a proteína. A parceira confere.
4. **Meta de água** (correção do dono): os cortes de idade (55 e 65 anos) e o acréscimo da lactação (+700 ml, da
   EFSA; a DRI de 2004 soma 1,1 L de água total) pedem a conferência da parceira. Holliday-Segar é a regra de
   manutenção de fluidos da pediatria e pode ficar alta para o adolescente pesado (60 kg dão 2,3 L).
5. **Nível sugerido pela frequência** (D-356) é a leitura usual dos fatores de Harris-Benedict (dias por semana de
   exercício). É sugestão: a nutricionista escolhe.
6. **Cortes de idade dos blocos** (R4 a R7) seguem o levantamento; a parceira confere pela tela.
7. A frente `alimentos-e-gramaturas` muda `cobrir.ts`, `trocas.ts` e a etapa 2; aqui eles mudam só onde a restrição
   entra (uma linha em cada) e a linha do item ganha o aviso. Na junção, conferir os dois.

## 10. Correção de 22/10/2026 (rodada "cuidado total", correção B)

Status: pedida pelo coordenador em 22/10/2026, depois da revisão como usuária real (`revisao-usuario.md`, G6, G8, I1,
I2, I12, I17, I18 e menores de texto) e da revisão de código (`revisao-codigo.md`, menores do lado da ficha). O dono
disse "Apenas faça": as dúvidas foram decididas pelos princípios da parceira e ficam escritas aqui; a aprovação é
pelas telas antes de publicar. Regra desta correção: **nenhuma pergunta aparece para quem ela não vale**. Toda pergunta
foi conferida de novo contra sexo, idade e fase de vida (tabela 10.2), andando pelos 4 pacientes da revisão (homem de
35 anos, gestante de 28, menina de 6 e mulher de 68).

### 10.1 Decisões

| # | Decisão |
|---|---|
| D-450 | **Cada pergunta tem a regra dela, escrita na tabela 10.2.** Vale a regra de sempre (D-348, CB-73): pergunta fora da regra que já tem resposta continua à vista. A regra da pergunta usa a idade de hoje na ficha e a da data da consulta no plano; sem sexo ou sem idade, a pergunta que depende deles não aparece (R13) |
| D-451 | **"Síndrome dos ovários policísticos" só para o sexo feminino de 12 anos em diante.** Na adolescente, o diagnóstico pede ciclos irregulares por mais de 1 ano depois da menarca (diretriz internacional de SOP, Teede et al., 2023); abaixo de 12 anos a opção não se aplica. Marcada antes, continua à vista. Antes valia para qualquer idade: a menina de 6 anos via a opção |
| D-452 | **Histórico do peso e dietas pela idade.** A dica de "Histórico do peso" fala da vida adulta só de 18 anos em diante; abaixo de 18 ela pede o crescimento: "Peso ao nascer e como o peso e a estatura vêm mudando (caderneta de saúde)." "Dietas que já fez" aparece de 12 anos em diante (criança não faz dieta por conta própria; restrição da família vai em Alimentação) |
| D-453 | **Saúde da mulher pela idade e pela menstruação.** "Menstruação": de 10 a 39 anos, "Regular", "Irregular" e "Não menstrua"; de 40 a 55, também "Menopausa" (antes dos 40 a parada é insuficiência ovariana prematura, que vai em Outros diagnósticos); de 56 em diante, só "Menopausa" e "Ainda menstrua" (depois dos 55 a menopausa já é tardia). "Fluxo menstrual intenso" só para quem menstrua: some com "Não menstrua" ou "Menopausa" e, de 56 anos em diante, só aparece com "Ainda menstrua". "Anticoncepcional ou reposição hormonal" aparece de 14 anos em diante (o começo da idade fértil do R1); com "Menopausa" marcada, ou de 56 anos em diante sem "Ainda menstrua", a pergunta vira "Reposição hormonal". A troca de texto só vale para o texto padrão: pergunta renomeada pela conta fica com o texto dela |
| D-454 | **"Com quem mora" sai.** Ela repetia "Pessoas que moram na casa" (Dados do paciente). O campo de Dados ganha a dica "Contando o paciente: 1 quer dizer que mora só.", e quem cozinha já está em Alimentação ("Quem prepara as refeições e onde come"). A pergunta sai do roteiro padrão e do roteiro guardado que a tem com o texto padrão; renomeada pela conta, fica. Resposta antiga aparece em Pessoa idosa, marcada "Fora do roteiro" |
| D-455 | **Lactante é quem amamenta.** "Amamentação" tem só "Só no peito" e "Peito e outros alimentos"; "Não amamenta" saiu (lactante que não amamenta se contradizia). Quem teve bebê e não amamenta marca "Não". Ficha gravada antes com "Lactante" e "Não amamenta" é lida como "Não" (o plano já não era de lactante) |
| D-456 | **"Peito e outros alimentos" muda a energia.** De 0 a 6 meses, a amamentação com outros alimentos soma o valor de produção de leite de 7 a 12 meses do NASEM (2023), 380 kcal, sem a mobilização de reservas: é o valor que o NASEM dá para a amamentação parcial, quando o bebê já come outros alimentos e mama menos. "Só no peito" continua com 540 − 140 kcal. De 7 a 12 meses, as duas somam 380 kcal. A conta mostra a linha "Produção de leite, peito e outros alimentos (valor de 7 a 12 meses)". O acréscimo de água (+700 ml) não muda. Antes a resposta era pedida e não usada |
| D-457 | **Lactação acima de 60 meses avisa, como a gestação acima de 42 semanas.** Com o parto há mais de 60 meses na data da consulta, o plano não é de lactante; a etapa 1 diz "Pela data do parto informada na ficha, já se passaram mais de 60 meses. Atualize a ficha." e a ficha diz "Pela data do parto, já se passaram mais de 60 meses. Se a amamentação terminou, marque Não." Antes o plano virava lactante de 81 meses, a energia dava erro e o campo não se editava no plano |
| D-458 | **Outras perguntas que não valiam para os 4 pacientes.** (a) "Rotina de trabalho ou estudo" vira "Rotina da escola ou da creche" abaixo de 14 anos (texto padrão). (b) O bloco Atividade física e o "Nível de atividade" da etapa 1 aparecem de 3 anos em diante: a equação do NASEM de 1 e 2 anos não usa atividade, e "prática de exercício" não se pergunta a quem tem 2 anos. (c) "Escola e ano" vira "Escola ou creche" de 1 a 5 anos (educação infantil). (d) Na composição corporal, as dobras (protocolo, dobras e resultado) aparecem de 18 anos em diante e fora da gestação: as duas equações do app (Jackson e Pollock; Faulkner) são de adultos e não valem na gravidez; a bioimpedância continua para todos. Com dado, tudo continua à vista |
| D-459 | **A adequação diz de que é a porcentagem.** "28% abaixo" se lia como "faltam 28%", e "Vitamina A 1% abaixo" parecia quase na meta. Uma forma só, em todo lugar: **"28% da referência"**, com o estado depois quando ele não é a meta: "28% da referência · abaixo da meta", "104% da referência", "230% da referência · acima do limite". Vale na tabela da etapa 3, na lista do celular e no cartão Micronutrientes da etapa 2 (lá, as linhas para cobrir já estão todas abaixo da meta e mostram só "28% da referência"; as acima do limite levam o estado). A gaveta do Cobrir começa por "O plano tem 28% da referência. Faltam 624 mg para a meta." |
| D-460 | **Panturrilha da pessoa idosa pelo corte brasileiro, por sexo.** Abaixo de 34 cm no homem e de 33 cm na mulher: "Indicativo de redução de massa muscular" (Pagotto V, Santos KF, Malaquias SG, Bachion MM, Silveira EA. Calf circumference: clinical validation for evaluation of muscle mass in the elderly. *Rev Bras Enferm* 2018;71(2):322-8. doi:10.1590/0034-7167-2017-0121; validação contra DEXA em idosos de Goiânia). O artigo não diz se o ponto de corte entra como "menor que" ou "menor ou igual"; o app usa "menor que", como o corte da OMS. A nota diz: "A referência da OMS (1995) usa 31 cm para os dois sexos." Antes 31 cm numa mulher saía "Adequada" logo acima da nota que citava os 33 cm. Os outros cortes da pessoa idosa foram conferidos e ficam: IMC da pessoa idosa pela Nutrition Screening Initiative (≤ 22, > 22 e < 27, ≥ 27), que é a do SISVAN (Quadro 18); a cintura usa os cortes da OMS de 94/102 cm e 80/88 cm, sem corte próprio para idosos no SISVAN |
| D-461 | **Português.** Os textos de I1, I2, M3, M6, M8, M9, M11, M13, M14, M16 e I18 da revisão, fora dos arquivos da correção A (seção 10.5). No M6, "TACO 2011" e "não estão na TACO" viram "Base MetaNutri" (o nome do glossário); "até o gasto energético" fica, como o `textos.md` decidiu (itens 125 e 127), porque não é erro. No I18, a descrição da página de Preços diz "As assinaturas têm as mesmas funções.", para caber nos 155 caracteres |
| D-462 | **O título do plano é o nome do plano** (D-409 da `textos-e-promessas`: o nome do plano é da nutricionista e serve para achar o plano). O cabeçalho do planejador mostra o nome gravado no plano; a folha impressa, o Word, o arquivo e o link continuam com o nome do paciente. Revê o CA-1035 |
| D-463 | **Dado de versão futura fica guardado.** O modo de quantidades do plano que esta versão não conhece fica gravado como veio (a tela e os documentos leem "Só medida", como no CB-365); só o plano sem o campo ganha "Só medida". A gestação ou lactação da ficha com um tipo que esta versão não conhece fica guardada ao salvar a ficha (a tela mostra nada marcado), e os campos a mais de gestante e lactante ficam. Como o CA-589 faz com as restrições |
| D-464 | **A linha da água escrita à mão não some calada.** Com a linha escrita antes desta versão, o aviso diz "Ela continua no plano impresso até você digitar uma meta ou usar a calculada."; digitar uma meta tira a linha e mostra "A linha escrita antes saiu do plano impresso: vale a meta digitada." com "Voltar a linha escrita" |
| D-465 | **Pergunta própria criada numa aba antiga em bloco que só a versão 2 tem aparece.** Pergunta da conta em "Objetivo e queixa", "Intestino", "Preferências e aversões" ou "Intolerâncias e alergias", gravada por uma versão antiga depois da versão 3, vai para o bloco novo dele (D-350) e sai do bloco antigo guardado, para não voltar depois de tirada |

### 10.2 Cada pergunta e para quem ela aparece

"Todos" quer dizer qualquer sexo e idade. Com resposta, toda pergunta continua à vista (D-450). Idade em anos
completos. As colunas dos 4 pacientes são as da revisão: H35 (homem de 35), G28 (gestante de 28, 24 semanas), M6
(menina de 6) e M68 (mulher de 68).

| Onde | Pergunta | Aparece para | H35 | G28 | M6 | M68 |
|---|---|---|---|---|---|---|
| Dados | Nome, Data de nascimento, Sexo, Telefone, E-mail | todos | sim | sim | sim | sim |
| Dados | Ocupação | 18 anos ou mais, ou sem idade | sim | sim | não | sim |
| Dados | Escola ou creche (D-458) | de 1 a 5 anos | não | não | não | não |
| Dados | Escola e ano | de 6 a 17 anos | não | não | sim | não |
| Dados | Pessoas que moram na casa (dica "Contando o paciente: 1 quer dizer que mora só.") | todos | sim | sim | sim | sim |
| Dados | Responsável | abaixo de 18 | não | não | sim | não |
| Dados | Gestação ou lactação (R1) | sexo feminino de 14 a 50 | não | sim | não | não |
| Dados | Idade gestacional, Peso pré-gestacional | gestante | não | sim | não | não |
| Dados | Data do parto, Amamentação (Só no peito, Peito e outros alimentos) | lactante | não | não | não | não |
| Retorno | Seguir o plano, O que ajudou e o que atrapalhou, Mudanças, Sintomas novos, Recordatório de hoje | paciente com plano (R12) | com plano | com plano | com plano | com plano |
| Motivo | Objetivo do paciente, Queixa principal | todos | sim | sim | sim | sim |
| Motivo | Histórico do peso | todos; a dica da vida adulta de 18 em diante, a do crescimento abaixo de 18 (D-452) | adulto | adulto | crescimento | adulto |
| Motivo | Dietas que já fez | 12 anos ou mais (D-452) | sim | sim | não | sim |
| Saúde | Doenças e diagnósticos | todos; a opção SOP só sexo feminino de 12 anos ou mais (D-451) | sem SOP | com SOP | sem SOP | com SOP |
| Saúde | Outros diagnósticos, Medicamentos em uso, Suplementos em uso, Cirurgias e internações, Doenças na família | todos | sim | sim | sim | sim |
| Gestação | Náusea ou vômito, Desejos, Diabetes gestacional ou pressão alta | gestante (R2) | não | sim | não | não |
| Lactação | Mamadas por dia, Dificuldades na amamentação | lactante (R3) | não | não | não | não |
| Saúde da mulher | (bloco) | sexo feminino de 10 anos em diante, fora da gestação (R4) | não | não | não | sim |
| Saúde da mulher | Menstruação | de 10 a 39: Regular, Irregular, Não menstrua; de 40 a 55: + Menopausa; 56 ou mais: Menopausa, Ainda menstrua (D-453) | — | — | — | Menopausa, Ainda menstrua |
| Saúde da mulher | Fluxo menstrual intenso | quem menstrua: some com Não menstrua ou Menopausa; de 56 em diante só com Ainda menstrua (D-453) | — | — | — | só com Ainda menstrua |
| Saúde da mulher | Anticoncepcional ou reposição hormonal | 14 anos ou mais; com menopausa vira "Reposição hormonal" (D-453) | — | — | — | Reposição hormonal |
| Digestão | Frequência de evacuação, Consistência das fezes, Gases, estufamento ou azia, Apetite, Mastigação e deglutição (dica de prótese de 60 em diante) | todos | sim | sim | sim | sim, com a dica |
| Rotina e sono | Rotina de trabalho ou estudo | todos; abaixo de 14 vira "Rotina da escola ou da creche" (D-458) | sim | sim | escola | sim |
| Rotina e sono | Horário de dormir e de acordar, Qualidade do sono | todos | sim | sim | sim | sim |
| Rotina e sono | Tempo de tela por dia | abaixo de 18 | não | não | sim | não |
| Atividade física | Prática de exercício | 3 anos ou mais (D-458) | sim | sim | sim | sim |
| Atividade física | Tipo de atividade, Vezes por semana, Minutos por vez, Horário do exercício | 3 anos ou mais, sem "Não" na prática (D-356) | sim | sim | sim | sim |
| Hidratação | Água por dia, Cor da urina, Outras bebidas | todos | sim | sim | sim | sim |
| Álcool e tabagismo | Álcool, Tabagismo | 12 anos ou mais (R6) | sim | sim | não | sim |
| Alimentação | Alergias, Intolerâncias, Não come por escolha, Outros alimentos que não come, Gosta, Não gosta, Vontade de doce ou salgado, Quem prepara as refeições e onde come, Óleo, sal e açúcar por mês | todos | sim | sim | sim | sim |
| Infância | Aleitamento materno, Introdução alimentar, Lanche e merenda da escola, Variedade de alimentos | de 1 a 9 anos (R5) | não | não | sim | não |
| Pessoa idosa | Perda de peso sem querer, Quedas | 60 anos ou mais (R7) | não | não | não | sim |
| Recordatório | as 7 refeições | todos | sim | sim | sim | sim |
| Ficha | Exames recentes, Outras anotações, Suplementação prescrita, Pedido de exames, Próxima consulta | todos | sim | sim | sim | sim |
| Etapa 1 | Peso, Estatura, Meta de água, Orientações, Data da consulta | todos | sim | sim | sim | sim |
| Etapa 1 | Circunferência da cintura | 20 anos ou mais, fora da gestação (R8) | sim | não | não | sim |
| Etapa 1 | Circunferência da panturrilha | 60 anos ou mais (R7) | não | não | não | sim |
| Etapa 1 | Composição corporal: dobras | 18 anos ou mais, fora da gestação (D-458) | sim | não | não | sim |
| Etapa 1 | Composição corporal: bioimpedância | todos | sim | sim | sim | sim |
| Etapa 1 | Nível de atividade | 3 anos ou mais (D-458); o fator ao lado só na equação de adulto (R11) | com fator | sem fator | sem fator | com fator |
| Etapa 1 (Ajustar) | Fórmula da TMB | 19 anos ou mais, sem gestação nem lactação (R10) | sim | não | não | sim |
| Etapa 1, sem paciente | Sexo, Idade, Nome do plano, Diagnóstico clínico, Ocupação | todos | — | — | — | — |
| Etapa 1, sem paciente | Meses | abaixo de 19 (R9) | — | — | — | — |
| Etapa 1, sem paciente | Gestação ou lactação | sexo feminino de 14 a 50 (R1) | — | — | — | — |

### 10.3 Critérios de aceite

- **CA-1270** · Dado uma menina de 6 anos ou de 11 anos, então "Síndrome dos ovários policísticos" não está nas escolhas de Doenças e diagnósticos; dado uma moça de 12 anos ou uma mulher de 68, está; dado a SOP já marcada numa ficha de 11 anos, continua à vista e marcada.
- **CA-1271** · Dado uma ficha de 35 anos, então "Histórico do peso" tem a dica "Peso habitual, maior e menor peso na vida adulta."; de 6 anos, "Peso ao nascer e como o peso e a estatura vêm mudando (caderneta de saúde)."; "Dietas que já fez" aparece de 12 anos em diante e, respondida, continua à vista na ficha de 6 anos.
- **CA-1272** · Dado uma mulher de 28 anos, então "Menstruação" tem "Regular", "Irregular" e "Não menstrua"; de 45, também "Menopausa"; de 68, só "Menopausa" e "Ainda menstrua". Uma resposta antiga que não é opção da idade continua num campo de texto (CB-297).
- **CA-1273** · Dado "Menopausa" ou "Não menstrua" marcados, então "Fluxo menstrual intenso" não aparece; dado uma mulher de 68 sem resposta em Menstruação, não aparece; com "Ainda menstrua", aparece; com resposta, continua à vista.
- **CA-1274** · Dado uma menina de 12 anos, então "Anticoncepcional ou reposição hormonal" não aparece; de 14, aparece; dado "Menopausa" marcada aos 50, ou 68 anos sem "Ainda menstrua", então a pergunta se chama "Reposição hormonal"; renomeada pela conta, fica com o texto da conta.
- **CA-1275** · Dado o roteiro padrão, então Pessoa idosa tem "Perda de peso sem querer" e "Quedas", sem "Com quem mora"; dado um roteiro guardado com "Com quem mora" (texto padrão), ela sai; renomeada ("Mora com quem?"), fica; dado uma resposta antiga em "Com quem mora", ela aparece em Pessoa idosa marcada "Fora do roteiro"; "Pessoas que moram na casa" tem a dica "Contando o paciente: 1 quer dizer que mora só.".
- **CA-1276** · Dado "Lactante" na ficha, então "Amamentação" tem "Só no peito" e "Peito e outros alimentos", sem "Não amamenta"; dado uma ficha gravada com "Lactante" e "Não amamenta", então ela abre com "Não" marcado e o plano não é de lactante.
- **CA-1277** · Dado uma lactante de 3 meses com "Peito e outros alimentos", então a energia soma 380 kcal ("Produção de leite, peito e outros alimentos (valor de 7 a 12 meses)") e nenhuma mobilização; com "Só no peito", 540 − 140 kcal; aos 9 meses, as duas somam 380 kcal.
- **CA-1278** · Dado uma ficha lactante com o parto há mais de 60 meses na data da consulta, então o plano não é de lactante, a etapa 1 mostra "Pela data do parto informada na ficha, já se passaram mais de 60 meses. Atualize a ficha." e a ficha mostra "Pela data do parto, já se passaram mais de 60 meses. Se a amamentação terminou, marque Não.".
- **CA-1279** · Dado uma ficha de 6 anos, então "Rotina de trabalho ou estudo" aparece como "Rotina da escola ou da creche"; de 14, com o texto padrão. Dado 2 anos, então o bloco Atividade física não aparece na ficha, nem "Nível de atividade" na etapa 1; de 3 anos, aparecem.
- **CA-1280** · Dado uma ficha de 4 anos, então o campo se chama "Escola ou creche"; de 6 a 17, "Escola e ano"; de 18, "Ocupação".
- **CA-1281** · Dado a etapa 1 de uma criança de 6 anos ou de uma gestante, então "Composição corporal" mostra só a bioimpedância (sem protocolo nem dobras); de um adulto de 35 fora da gestação, mostra as dobras; dado uma dobra já preenchida, as dobras continuam à vista.
- **CA-1282** · Dado os 4 pacientes da revisão, então a ficha e a etapa 1 de cada um mostram exatamente o que a tabela 10.2 diz.
- **CA-1283** · Dado uma linha de cálcio com 276 mg de 1.000 mg, então a tabela da etapa 3 e a lista do celular mostram "28% da referência · abaixo da meta"; uma na meta, "104% da referência"; uma acima do limite, "230% da referência · acima do limite"; o cartão da etapa 2 mostra "28% da referência" e "230% da referência · acima do limite"; a gaveta do Cobrir começa por "O plano tem 28% da referência. Faltam 624 mg para a meta.".
- **CA-1284** · Dado 33 cm de panturrilha num homem de 70 anos, então "Indicativo de redução de massa muscular"; 34 cm, "Adequada"; 32 cm numa mulher de 68, "Indicativo de redução de massa muscular"; 33 cm, "Adequada"; a fonte é Pagotto et al. (2018) e a nota cita os 31 cm da OMS.
- **CA-1285** · Dado um plano sem peso e sem estatura, então a energia diz "Informe o peso e a estatura para calcular a energia."; sem sexo, idade, peso e estatura, a antropometria diz "Informe o sexo, a idade, o peso e a estatura para a avaliação antropométrica."; a meta da prescrição rápida, "Informe o peso e a estatura para calcular a meta."; a adequação sem sexo, "Informe o sexo e a idade, com uma gestação ou lactação compatível, para escolher as referências.".
- **CA-1286** · Dado um nutriente na meta, então o botão diz "Ver o nutriente na meta" e "Esconder o nutriente na meta"; dado 5, "Ver os 5 nutrientes na meta".
- **CA-1287** · Dado "Ver cálculo" de um plano pelo NASEM, então o fator diz "1,20 · sedentário" (e "pouco ativo", "moderadamente ativo", "muito ativo"), nunca "inativo" nem "pouco-ativo"; o memorial diz o mesmo.
- **CA-1288** · Dado o estágio da DRI de 9 a 13 anos e de 14 a 18, então a descrição diz "meninas de 9 a 13 anos", "meninos de 9 a 13 anos", "moças de 14 a 18 anos" e "rapazes de 14 a 18 anos".
- **CA-1289** · Dado a nota de referências da adequação, então ela diz "Dietary Reference Intakes Summary Tables (Appendix J). Em: NASEM. Dietary Reference Intakes for Sodium and Potassium. Washington (DC): National Academies Press; 2019.".
- **CA-1290** · Dado a nota † na etapa 2, na etapa 3 e no Resumo do dia, então as três dizem "Pode estar subestimado: algum alimento não tem esse dado, e dado que falta não conta como zero.".
- **CA-1291** · Dado um escore-z negativo, então a tela e o Word usam o sinal de menos ("escore-z −0,18"), não o hífen.
- **CA-1292** · Dado o campo de receitas de texto da etapa 1 (estudante), então ele se chama "Receitas em texto livre".
- **CA-1293** · Dado a landing, Preços e a descrição da página de Preços, então dizem "Todas as assinaturas têm as mesmas funções." e "quem teve plano alimentar ou missão nos últimos 30 dias".
- **CA-1294** · Dado um plano com paciente chamado "Retorno de outubro" e a ficha "Maria Silva", então o título do planejador diz "Retorno de outubro"; a folha impressa diz "Maria Silva".
- **CA-1295** · Dado um plano gravado com `quantidades: 'em-fatias'` (modo de uma versão futura), então abrir e alterar o plano mantém `'em-fatias'` gravado, e a tela e os documentos leem "Só medida"; um plano sem o campo é lido como "Só medida".
- **CA-1296** · Dado uma ficha gravada com `momentoDeVida: { tipo: 'pos-parto', semanas: 3 }` (tipo de uma versão futura), então a ficha abre sem gestação marcada e salvar outro campo mantém o objeto como veio; dado uma gestante com um campo a mais (`gemelar: true`), o campo continua depois de mudar as semanas.
- **CA-1297** · Dado um plano com a linha da água escrita à mão, então o aviso diz que ela continua até digitar uma meta ou usar a calculada; digitar uma meta tira a linha e mostra "A linha escrita antes saiu do plano impresso: vale a meta digitada." com "Voltar a linha escrita", que devolve a linha.
- **CA-1298** · Dado um roteiro da versão 3 regravado por uma versão antiga com uma pergunta própria em "Objetivo e queixa", "Intestino", "Preferências e aversões" ou "Intolerâncias e alergias", então ela aparece em Motivo da consulta, Digestão ou Alimentação; tirada e salva, não volta.
- **CA-1299** · Dado uma cópia de uma versão antiga sem a chave das medidas próprias, então aplicá-la não apaga as medidas daqui, e elas voltam na próxima cópia (D-170).
- **CA-1300** · Dado o roteiro como a versão no ar (78c0157) o regrava (versão 2, com os blocos da versão 2 e os da 3 guardados), então esta versão lê de novo o roteiro da versão 3 igual (CB-348).

### 10.4 Casos de borda

| ID | Situação | Comportamento |
|---|---|---|
| CB-420 | Ficha sem data de nascimento | As perguntas com regra de idade (D-451 a D-453, D-458) seguem a R13: as da fase de vida somem; as de todos aparecem com o texto e as opções de adulto |
| CB-421 | Resposta de "Menstruação" que não é opção da idade (por exemplo "Regular" aos 60) | Continua à vista num campo de texto (CB-297) |
| CB-422 | Lactante sem "Amamentação" marcada | O plano é de lactante e usa "Só no peito", como antes |
| CB-423 | "Peito e outros alimentos" no plano sem paciente | O plano sem paciente não pergunta a amamentação: vale "Só no peito", como antes |
| CB-424 | Ficha com tipo de gestação desconhecido e a nutricionista marca "Não", "Gestante" ou "Lactante" | Vale a escolha dela (o objeto de antes é trocado) |
| CB-425 | Linha da água escrita à mão, meta digitada e a tela fechada antes de "Voltar a linha escrita" | A linha não volta: o aviso disse antes e depois que ela sai |
| CB-426 | Pergunta própria do bloco antigo com o mesmo id de uma que já está no roteiro da versão 3 | Vale a do roteiro da versão 3 (o id vale uma vez) |

### 10.5 Fora desta correção

Ficam com a correção A (alimentos, medidas, Cobrir, PDF, `globals.css`): G1 a G5, G7, I3 a I11, I13, I15, I16, M1, M7, M10,
M12, M17, M18, M20. Ficam para depois: I14 (ordem da ficha no
celular, que o CA-1045 decidiu), M2, M4, M5, M15 (o link não sabe a idade do paciente) e M19 (curvas de ganho por
semana).

## 11. Correção C de 22/10/2026 (rodada "cuidado total")

Status: pedida pelo coordenador em 22/10/2026, depois da 2ª revisão como usuária real (`revisao-usuario-2.md`, N10 e
N11); ordem de pé do dono: "apenas faça"; aprovação pelas telas antes de publicar.

| # | Decisão | Motivo |
|---|---|---|
| D-488 | **Casa e escola pela idade.** "Pessoas que moram na casa" tem a dica "Contando o paciente: 1 quer dizer que mora só." de 18 anos em diante; abaixo, só "Contando o paciente.". A rotina abaixo de 14 anos (D-458) é "Rotina da creche ou da escola" de 1 a 5 anos e "Rotina da escola" de 6 a 13 (a mesma faixa da opção "Escola ou creche", D-458) | N10: "1 quer dizer que mora só" numa criança de 6 anos; N11: "Rotina da escola ou da creche" aos 6 anos |

- **CA-1338** · Dado a menina de 6 anos, então a ficha mostra "Contando o paciente." em "Pessoas que moram na casa" e a pergunta "Rotina da escola"; dado uma criança de 4 anos, "Rotina da creche ou da escola"; dado o homem de 35 anos, a dica "Contando o paciente: 1 quer dizer que mora só." e "Rotina de trabalho ou estudo" (o texto padrão).
- **CB-453** · Ficha sem data de nascimento: a dica de adulto e o texto padrão da rotina (R13).

## Apêndice A — Alimentos da base por restrição

Gerado de `src/domain/restricoesDaBase.ts` e conferido pelo teste `restricoesDaBase.test.ts` (ids da TACO).

- **Leite e derivados (81):** biscoitos maisena, recheados, wafer e cream cracker (8 a 13); bolos (14 a 18); canjica
  com leite (20); mingau infantil (23); curau e mistura para curau (29, 30); farinha láctea (36); macarrão instantâneo
  (39); mingau tradicional (46); pamonha (47); pães de forma, de soja, de glúten, de milho e sovado (48 a 52, 54);
  pastel de queijo (57, 58); batata sauté (94); biscoito de polvilho (99); pão de queijo (140, 141); manteigas e
  margarinas (261 a 266); croquete, coxinha e empadas (386 a 390); a categoria Leite e derivados inteira (446 a 469);
  omelete de queijo (484); achocolatado, chocolates, cocada, doce de leite e quindim (491, 495 a 499, 501, 509);
  capuccino (512); chantilly (522); bolinho de arroz (530); estrogonofes (537, 538); tapioca com manteiga (551).
- **Lactose (42):** bolos (14 a 18); canjica com leite (20); mingau infantil (23); curau (29, 30); farinha láctea
  (36); mingau tradicional (46); pão de queijo (140, 141); leites, iogurtes, bebida láctea, creme de leite, leite
  condensado e leite fermentado (446 a 460); queijo minas frescal, pasteurizado, petit suisse, requeijão e ricota (461,
  465, 466, 468, 469); chocolates ao leite (495 a 497); cocada branca (499); doce de leite (501); capuccino (512);
  bolinho de arroz (530); estrogonofes (537, 538).
- **Ovo (40):** bolos (14 a 18); lasanha de massa fresca (37, 38); macarrão com ovos (41); pão sovado (54); biscoito
  de polvilho (99); nhoque (136); pão de queijo (140, 141); almôndegas (330, 331); à milanesa (340, 401); coxinha,
  croquetes e empadas (386 a 390); ovos e omelete (484 a 490); maria mole (504, 505); quindim (509); maionese (524);
  bife à cavalo (529); bolinho de arroz (530); cuscuz paulista (534); feijão tropeiro (539); salada com maionese
  (545); salpicão (547); virado à paulista (555).
- **Trigo (57):** biscoitos (8 a 13); bolos (14 a 18); mistura para vitamina (24); farinhas de rosca, de trigo e
  láctea (34 a 36); lasanhas e macarrões (37 a 41); pães (48 a 54); pastéis (55 a 60); torrada (63); nhoque (136);
  peixes com farinha de trigo (281, 299, 306); almôndegas (330, 331); à milanesa (340, 401); coxinha, croquetes e
  empadas (386 a 390); quibes (440 a 442); achocolatado (491); shoyu (518); bolinho de arroz (530); macarrão à
  bolonhesa (542); tabule (549); vatapá (554); yakisoba (556).
- **Glúten (62):** Trigo e mais aveia (7), cereais matinais com malte (25, 26), farinha de centeio (32) e cerveja (474).
- **Soja (26):** biscoitos recheados e wafer (9 a 12); macarrão instantâneo (39); pão de soja (49); margarinas (263 a
  266); apresuntado (323); hambúrgueres (415 a 417); mortadela (424); achocolatado e chocolates (491, 495 a 498);
  shoyu (518); yakisoba (556); farinha, extrato e tofu de soja (581 a 584).
- **Amendoim (5):** amendoim (557, 558), paçoca (579), pé-de-moleque (580), vatapá (554).
- **Castanhas (6):** amêndoa (587), castanha-de-caju (588), castanha-do-brasil (589), noz (597), chocolate com
  castanha-do-pará (496), vatapá (554).
- **Peixe (47):** os peixes da categoria Pescados e frutos do mar (273 a 283, 288 a 322) e o cuscuz paulista (534).
- **Crustáceos e frutos do mar (9):** camarões e caranguejo (284 a 287), acarajé (525), camarão à baiana (531), cuxá
  (535), tacacá (550), vatapá (554).
- **Vegetariano (203):** as categorias Carnes e derivados (323 a 445) e Pescados e frutos do mar (273 a 322), pastel de
  carne (55, 56), geleia de mocotó (502), maria mole (504, 505), gelatina (515) e os pratos com carne, peixe ou fruto do
  mar (525 a 529, 531, 532, 534 a 543, 547, 548, 550, 553 a 556).
- **Vegano:** Vegetariano, Leite e derivados, Ovo e o mel (507).
