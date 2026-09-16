# SPEC: Planejador MetaNutri (MVP)

**Status:** aprovada pelo usuário em 15/09/2026 · **Data:** 15/09/2026
**Fontes:** `docs/backlog.md` (B-01 a B-18), `docs/feedback-nutricionista.md`, `docs/entrevista-estudante-2026-09-15.md`, `docs/modelos/modelo_planejamento_estagio.docx`, `docs/decisoes.md`.

## 1. Objetivo

Permitir que um estudante de nutrição ou recém-formado monte o plano alimentar de um caso, confira energia, macronutrientes e adequação de micronutrientes, receba sugestões de alimentos para cobrir o que falta e exporte o resultado em Word no formato exigido pela faculdade.

**Medida de sucesso:** montar um plano completo de um dia, com adequação e dois substitutos por refeição, em bem menos que as ~2 horas relatadas pela estudante.

## 2. Decisões

| # | Decisão | Resultado | Quem decidiu |
|---|---|---|---|
| D-1 | Faixa etária | **Todas as idades a partir de 1 ano, incluindo crianças, adolescentes, gestantes e lactantes.** Bebês com menos de 1 ano ficam fora, porque a alimentação é leite materno ou fórmula e as DRI dessa faixa só têm AI | usuário (todas as idades); corte de 1 ano proposto por Claude, a confirmar |
| D-2 | Substitutos entram na soma do plano? | Não. Totais e adequação usam só a opção **Principal** | usuário |
| D-3 | Onde o plano fica salvo neste MVP | Só no navegador, sem login. Conta, sincronização e cobrança ficam na SPEC `conta-e-assinatura` | Claude (padrão técnico, reversível) |
| D-4 | Nutriente sem RDA ou sem EAR | Usar a AI e mostrar "referência: AI" | Claude (padrão técnico, reversível) |
| D-5 | Porção máxima de uma sugestão do "cobrir" | 200 g por padrão, editável | Claude (padrão técnico, reversível) |

## 3. Glossário

- **TMB:** taxa metabólica basal. **GET:** gasto energético total = TMB × fator de atividade.
- **DRI:** valores de referência de ingestão (NASEM). Inclui **EAR** (necessidade média), **RDA** (recomendação), **AI** (ingestão adequada, quando não há RDA) e **UL** (limite superior tolerável).
- **Adequação:** quantidade do nutriente no plano ÷ referência escolhida × 100.
- **Caso:** a pessoa (real em estágio ou fictícia em trabalho) para quem o plano é montado.
- **Principal / Substituto 1 / Substituto 2:** as três opções de cada refeição no modelo do estágio.

## 4. Critérios de aceite

### 4.1 Caso e antropometria (B-05 mínima, B-17)

- **CA-01** · Dado um caso novo, quando o usuário abre o planejador, então vê os campos: nome do caso, diagnóstico clínico, data da consulta, sexo, idade, peso (kg), estatura (cm), ocupação, estagiário(a), preceptor(a), objetivo (emagrecer, manter, ganhar) e observações.
- **CA-02** · Dado peso e estatura preenchidos em um caso de 20 anos ou mais, quando qualquer um muda, então o IMC é recalculado e classificado pela referência de adulto (20 a 59 anos) ou de idoso (60 anos ou mais).
- **CA-02a** · Dado um caso de 1 a 19 anos, então o sistema mostra IMC-para-idade e estatura-para-idade em escore-z com a classificação das curvas da OMS, usando sexo e idade em meses.
- **CA-02b** · Dado um caso marcado como gestante, então o sistema pede idade gestacional (semanas) e peso pré-gestacional, classifica o IMC pré-gestacional e mostra a faixa de ganho de peso recomendada para a gestação.
- **CA-02c** · Dado um caso marcado como lactante, então o sistema pede o tempo pós-parto (meses).
- **CA-03** · Dado sexo e circunferência da cintura preenchidos em adulto, então o sistema mostra a classificação de risco e a referência usada.
- **CA-04** · Dado idade de 60 anos ou mais e circunferência da panturrilha preenchida, então o sistema mostra a classificação e a referência usada.
- **CA-05** · Dado qualquer valor de referência antropométrica exibido, então a fonte aparece ao lado (nome e ano).

### 4.2 Energia (B-02, B-16)

- **CA-06** · Dado um adulto com sexo, idade, peso e estatura válidos, quando o usuário escolhe a fórmula (Mifflin-St Jeor como padrão, ou Harris-Benedict), então a TMB é exibida em kcal.
- **CA-06a** · Dado um caso de 1 a 18 anos, então o sistema calcula a necessidade energética com equações próprias para a faixa etária (com fonte citada), incluindo o custo energético do crescimento, e não oferece Mifflin nem Harris-Benedict, que não valem para essa idade.
- **CA-06b** · Dado uma gestante, então o GET usa as equações de gestação (no 2º e 3º trimestres, com o depósito de energia conforme o IMC pré-gestacional; no 1º trimestre, a equação de não gestante), e a tela mostra o valor do depósito e a fonte.
- **CA-06c** · Dado uma lactante, então o GET soma o custo de produção de leite correspondente ao período pós-parto (0 a 6 meses ou 7 a 12 meses), e a tela mostra o valor adicionado e a fonte.
- **CA-06d** · Dado um caso de criança, adolescente, gestante ou lactante, então o nível de atividade escolhido é convertido na categoria da equação: sedentário → inativo; pouco ativo → pouco ativo; moderadamente ativo → ativo; muito ativo e extremamente ativo → muito ativo. A tela mostra a categoria usada.

*Ajuste de 15/09/2026: as equações do NASEM 2023 (DRI de Energia) para essas fases não são "TMB × fator"; são equações próprias por categoria de atividade, com custo de crescimento, depósito na gestação e custo de produção de leite. Valores a validar com a nutricionista (PLAN, seção 6).*
- **CA-07** · Dado uma TMB calculada, quando o usuário escolhe o nível de atividade, então o GET = TMB × fator. Fatores padrão: sedentário 1,2 · pouco ativo 1,37 · moderadamente ativo 1,55 · muito ativo 1,7 · extremamente ativo 1,9.
- **CA-08** · Dado o seletor de atividade, quando o usuário digita um fator próprio, então o GET usa esse fator.
- **CA-09** · Dado que o usuário prefere outra conduta, quando digita o GET manualmente, então esse valor substitui o calculado e a tela indica "GET definido manualmente".
- **CA-10** · Dado um plano com alimentos, então o painel mostra kcal do plano, GET e a porcentagem do GET atingida. Abaixo de 90% ou acima de 110% o indicador muda de estado (limites editáveis).
- **CA-11** · Dado que o usuário troca a fórmula, o fator ou o GET, então o plano montado não é alterado nem apagado.

### 4.3 Refeições (B-18)

- **CA-12** · Dado um caso novo, então o plano começa com seis refeições: 6:00 Desjejum, 9:00 Lanche da manhã, 12:00 Almoço, 16:00 Lanche da tarde, 19:00 Jantar, 21:00 Ceia.
- **CA-13** · Dado uma refeição, quando o usuário renomeia, muda o horário, remove ou adiciona uma refeição, então o plano reflete a mudança e os totais são recalculados.
- **CA-14** · Dado cada refeição, então ela tem três opções: Principal, Substituto 1 e Substituto 2, cada uma com sua própria lista de alimentos.

### 4.4 Entrada rápida de alimentos (B-03, B-04)

- **CA-15** · Dado o campo de entrada rápida de uma opção de refeição, quando o usuário digita quantidade e parte do nome (ex.: "150 arroz int"), então aparecem até 5 alimentos que contêm todas as palavras digitadas, sem diferenciar acentos nem maiúsculas.
- **CA-16** · Dado a lista de resultados, quando o usuário tecla Enter, então o primeiro resultado é adicionado com a quantidade digitada. Setas mudam a seleção.
- **CA-17** · Dado um texto sem quantidade, quando o usuário adiciona, então a quantidade padrão é 100 g e fica editável.
- **CA-18** · Dado um alimento com medida caseira cadastrada, quando o usuário digita quantidade e medida (ex.: "2 colher de sopa arroz"), então o sistema converte para gramas e mostra a conversão.
- **CA-19** · Dado um alimento adicionado, então a linha mostra gramas, medida caseira equivalente (quando houver), kcal, e permite editar a quantidade ou remover.
- **CA-20** · Dado um texto sem nenhum alimento correspondente, então o sistema informa que não encontrou e **não** adiciona nada.
- **CA-21** · Dado a base completa de alimentos carregada, quando o usuário digita, então os resultados aparecem em até 200 ms num notebook comum.

### 4.5 Macronutrientes (B-07)

- **CA-22** · Dado um plano com alimentos, então o painel mostra proteína, carboidrato e gordura em gramas, em % das kcal do plano e proteína em g/kg de peso.
- **CA-23** · Dado as metas padrão (carboidrato 45 a 65%, gordura 20 a 35%, proteína 10 a 35% das kcal), então cada macro indica se está abaixo, dentro ou acima da faixa.
- **CA-24** · Dado que o usuário edita a meta de um macro (em % ou g/kg), então a indicação passa a usar a meta dele.

### 4.6 Adequação de micronutrientes (B-13)

- **CA-25** · Dado um plano, então o painel lista para cada micronutriente disponível na base: total no plano, referência, porcentagem de adequação e estado (abaixo, dentro, acima do UL).
- **CA-26** · Dado o preset **Individual**, então a referência é a RDA e a meta mínima é 90%.
- **CA-27** · Dado o preset **Coletivo**, então a referência é a EAR e a meta mínima é 50%.
- **CA-28** · Dado o preset **Personalizado**, então o usuário escolhe a referência (RDA ou EAR) e a porcentagem mínima.
- **CA-29** · Dado um nutriente sem a referência escolhida (ver D-4), então o sistema usa a AI e mostra "referência: AI".
- **CA-30** · Dado um nutriente com UL, quando o total do plano passa do UL, então aparece um alerta de "acima do limite superior", independente do preset.
- **CA-31** · Dado sexo, idade, gestação ou lactação, quando qualquer um muda, então as referências trocam para a faixa de estágio de vida correspondente (incluindo as faixas próprias de gestantes e lactantes) e a adequação é recalculada.
- **CA-31a** · Dado um caso de 1 a 18 anos, então as metas padrão de macronutrientes usam as faixas próprias da idade, não as de adulto.
- **CA-32** · Dado alimentos sem dado para um nutriente, então esse nutriente mostra quantos alimentos não têm informação e o total é marcado como possivelmente subestimado. Falta de dado nunca é tratada como zero de forma silenciosa.
- **CA-33** · Dado a tela de adequação, então a fonte dos dados de composição e das referências fica visível.

### 4.7 Cobrir micronutriente (B-01)

- **CA-34** · Dado um micronutriente abaixo da meta, então ele exibe a ação "cobrir".
- **CA-35** · Dado a ação "cobrir", então o sistema mostra quanto falta para a meta e até 5 alimentos, cada um com a porção em gramas (e medida caseira quando houver), a porcentagem da falta que cobre e as kcal que adiciona. *Esclarecido em 15/09/2026: as 5 sugestões vêm de grupos alimentares diferentes sempre que houver opções em grupos suficientes.*
- **CA-36** · Dado as sugestões, então elas priorizam cobrir a falta com o menor acréscimo de kcal, sem ultrapassar a porção máxima (D-5). *Esclarecido em 15/09/2026: o critério é kcal por parte da falta coberta (densidade do nutriente), para não preferir um alimento calórico só porque cobre tudo numa porção.*
- **CA-36a** · Dado alimentos da base que não se consomem na forma listada (itens de Miscelâneas como sal, fermento e café em pó; produtos em pó ou desidratados; farinhas e amidos de uso culinário, exceto farinha de mandioca torrada e farinha láctea; versão crua de carnes, pescados, ovos, leguminosas e cereais, exceto aveia), então eles não aparecem nas sugestões, a menos que o usuário peça para incluir ingredientes. *Adicionado em 15/09/2026 após testar com a TACO completa, que sugeria "feijão cru" e "café em pó". Regra a validar com a nutricionista.*
- **CA-37** · Dado uma sugestão que faria o plano passar do GET ou do UL de algum nutriente, então ela aparece com esse aviso.
- **CA-38** · Dado uma sugestão, quando o usuário escolhe a refeição e a opção (Principal por padrão) e confirma, então o alimento entra ali e todo o painel é recalculado.
- **CA-39** · Dado nenhum alimento da base capaz de cobrir ao menos parte da falta dentro da porção máxima, então o sistema informa isso em vez de mostrar uma lista vazia.
- **CA-40** · Dado uma sugestão indesejada, quando o usuário a oculta, então ela não volta a aparecer para aquele caso.

### 4.8 Substitutos (B-08)

- **CA-41** · Dado um alimento no Principal, quando o usuário pede um substituto e escolhe outro alimento, então o sistema calcula a porção equivalente pelo critério escolhido: kcal (padrão), proteína ou carboidrato.
- **CA-42** · Dado um substituto calculado, então a tela mostra a porção em gramas e em medida caseira, e a diferença de kcal, proteína, carboidrato e gordura em relação ao alimento original.
- **CA-43** · Dado a decisão D-2, então os alimentos de Substituto 1 e 2 não entram nos totais nem na adequação do plano.

### 4.9 Exportação (B-11)

- **CA-44** · Dado um plano, quando o usuário exporta o **Aconselhamento**, então recebe um arquivo Word com a estrutura do modelo do estágio: cabeçalho do caso, antropometria, refeições por horário com Principal, Substituto 1 e Substituto 2 em medida caseira, orientações nutricionais, receitas e campo de assinaturas.
- **CA-45** · Dado um alimento sem medida caseira, então no Aconselhamento ele aparece em gramas.
- **CA-46** · Dado um plano, quando o usuário exporta o **Memorial de cálculo**, então recebe um arquivo Word com TMB, fórmula, fator, GET, distribuição de macros e a tabela de adequação (nutriente, total, referência, tipo de referência, %, estado).
- **CA-47** · Dado campos vazios no caso, então o arquivo exportado deixa o espaço em branco, sem textos como "undefined" ou "null".
- **CA-48** · Dado a tabela de adequação na tela, quando o usuário usa "copiar tabela", então consegue colar no Word mantendo linhas e colunas.

### 4.10 Salvamento e modo de uso (B-12, D-3)

- **CA-49** · Dado um plano em edição, quando o usuário fecha e reabre o navegador no mesmo aparelho, então o caso e o plano continuam lá.
- **CA-50** · Dado a lista de casos, quando o usuário cria, duplica, renomeia ou exclui um caso, então a lista reflete a mudança. Excluir pede confirmação.
- **CA-51** · Dado o primeiro acesso, então o usuário vê um aviso de que a ferramenta apoia estudo e planejamento, que a prescrição é responsabilidade do nutricionista e que os dados ficam só neste aparelho.

## 5. Casos de borda

| ID | Situação | Comportamento esperado |
|---|---|---|
| CB-01 | Peso, estatura ou idade vazios | TMB, GET, IMC e g/kg não aparecem; o painel diz qual campo falta. Nunca mostra zero |
| CB-02 | Idade menor que 1 ano (D-1) | Aviso de que o planejador cobre a partir de 1 ano; energia e referências não são calculadas |
| CB-02a | Caso marcado como gestante e lactante ao mesmo tempo, ou gestante com sexo masculino ou idade incompatível | O sistema não aceita a combinação e explica o motivo |
| CB-02b | Gestante sem idade gestacional informada | Adicional energético e ganho de peso não aparecem; o painel pede o dado |
| CB-03 | Valores fora de faixa plausível (ex.: peso < 5 kg ou > 350 kg, estatura < 45 cm ou > 250 cm; faixas ampliadas em 15/09 para comportar crianças a partir de 1 ano) | Campo marcado como inválido e cálculo suspenso até corrigir |
| CB-04 | Quantidade 0 ou negativa | 0 é aceito e não soma nada; negativo não é aceito |
| CB-05 | Plano sem nenhum alimento | Painel mostra 0 kcal, adequação 0% e o "cobrir" funciona normalmente |
| CB-06 | Alimento sem kcal na base | Não aparece nas sugestões do "cobrir"; pode ser adicionado manualmente com aviso |
| CB-07 | Medida caseira digitada que não existe para aquele alimento | Sistema avisa e pede gramas; não inventa conversão |
| CB-08 | Duas abas abertas editando o mesmo caso | A última alteração salva prevalece e a outra aba é avisada ao ganhar foco |
| CB-09 | Armazenamento do navegador bloqueado ou cheio | Planejador funciona na sessão e avisa que nada será salvo |
| CB-10 | Sem internet depois do primeiro carregamento | Planejador, busca, cálculos e exportação continuam funcionando |
| CB-11 | Plano muito grande (ex.: 6 refeições × 3 opções × 15 alimentos) | Recalcular após qualquer edição continua instantâneo para o usuário |
| CB-12 | Número digitado com vírgula decimal ("68,5") | Aceito como 68,5 |

## 6. Requisitos de dados (o quê, não como)

- **Composição de alimentos:** TACO 4ª edição completa (597 alimentos), com energia, macros, fibras e os micronutrientes disponíveis nela (cálcio, magnésio, manganês, fósforo, ferro, sódio, potássio, cobre, zinco, vitamina A em RAE, tiamina, riboflavina, piridoxina, niacina, vitamina C).
- **Medidas caseiras:** tabela de medidas caseiras da POF/IBGE associada aos alimentos da TACO quando houver correspondência.
- **Referências:** DRI do NASEM (EAR, RDA, AI, UL) para todos os estágios de vida a partir de 1 ano, incluindo gestação e lactação.
- **Energia:** equações para crianças e adolescentes e adicionais de gestação e lactação, com fonte citada.
- **Antropometria:** pontos de corte de IMC para adultos e idosos; curvas de crescimento da OMS (IMC-para-idade e estatura-para-idade) de 1 a 19 anos; classificação do IMC pré-gestacional e faixas de ganho de peso na gestação; circunferência da cintura por sexo e da panturrilha para idosos. Cada um com fonte citada e **validado pela nutricionista antes do lançamento**.
- Toda fonte usada aparece na interface.

## 7. Fora de escopo

- Login, contas, sincronização entre aparelhos, cobrança e planos pagos (SPEC `conta-e-assinatura`).
- Landing page e identidade visual (definidas pelo usuário antes de qualquer front-end).
- Alertas de diretriz por condição clínica (B-06), anamnese completa (B-05 completa).
- Bebês com menos de 1 ano (D-1).
- Micronutrientes que a TACO não tem, via USDA (B-14).
- Substituição automática sem escolha do usuário, app do paciente, missões, refeição livre controlada, modo estágio com aprovação da preceptora (B-08 paciente, B-09, B-10, B-15).
- Fórmulas de TMB além de Mifflin-St Jeor e Harris-Benedict (o GET manual cobre outras condutas).
- Exportação em PDF e qualquer uso de IA.
