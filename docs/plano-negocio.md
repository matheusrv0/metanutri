# Plano de negócio

Aprovado pelo usuário em 26/09/2026. Transcrição do documento
`Meta Nutri — Plano de Negócio` (26/09/2026), que passa a valer como a estratégia do
produto. Onde este arquivo e o resto do repositório discordarem, este manda — as
decisões que saíram daqui estão registradas em `decisoes.md`.

Grafia: o documento original escreve "Meta Nutri"; o repositório usa **MetaNutri**, e
essa é a forma mantida (decisão de 26/09/2026).

## Resumo

MetaNutri é um software de nutrição para quem está começando na profissão: grátis na
faculdade, barato ao se formar.

O diferencial não é preço, é **adesão do paciente** — o plano alimentar vira missões
diárias que o paciente marca como feitas. A receita vem do recém-formado e de clínicas
pequenas, não do estudante. Meta de 12 meses: 100 assinantes pagantes, cerca de
R$ 4.800 de receita mensal.

## Produto

Duas funções carregam o produto; o resto existe por obrigação.

**Missões diárias.** O paciente recebe um link (sem baixar app) com as tarefas do dia:
fazer as refeições do plano, bater a meta de água, comer a porção de vegetais, treinar.
Ele marca o que fez, e o nutricionista enxerga quem está sumindo antes de sumir de vez.

**Painel de micronutrientes.** Mostra o que falta no plano (zinco, magnésio, potássio,
vitaminas) e quais alimentos suprem cada item.

**Paridade** — precisa existir, mas não vende: antropometria, base de alimentos, PDF da
dieta, prescrição rápida e atendimento completo, cadastro de pacientes.

## Mercado e concorrentes

Os dois maiores concorrentes brasileiros já dão o software de graça para estudante de
nutrição — então, nesse público, o preço de mercado é R$ 0.

A consequência é direta: **estudante não é cliente, é canal.** A dor que gera pagamento
acontece na formatura, quando o acesso grátis cai e aparece um boleto de ~R$ 92/mês
justo quando o profissional tem 3 pacientes e ganha pouco. É essa janela que o MetaNutri
ocupa.

| Concorrente | Preço cheio | Estudante |
|---|---|---|
| Dietbox | R$ 91,90/mês (anual ~R$ 919) | Grátis até o fim da graduação, até 10 pacientes, só no navegador, comprovante a cada semestre |
| WebDiet | R$ 94,90/mês | Grátis no modo graduação até a formatura |
| Nutrium | ~US$ 24–95/mês (faixa não oficial) | Não divulgado |

## Posicionamento e público

A frase que abre qualquer venda: **"seu paciente para de abandonar a dieta na segunda
semana"**.

Não é "igual ao Dietbox, mais barato". Essa briga um dev solo perde por cansaço contra
empresas com time inteiro. É uma categoria diferente: **software de adesão**, que por
acaso também prescreve.

Público em ordem de prioridade:

1. **Recém-formado (0–2 anos)** — sente as duas dores, preço e adesão. É quem paga.
2. **Clínica pequena (2–5 nutricionistas)** — paga mais e cancela menos.
3. **Estudante** — não paga. Entra grátis para virar cliente na formatura.

## Planos e preços

| Plano | Para quem | Preço | Limite |
|---|---|---|---|
| Free | Qualquer um | R$ 0 | 2 pacientes ativos, marca MetaNutri no PDF |
| Estudante | Com comprovante de matrícula | R$ 0 | 10 pacientes, sem marca própria |
| Solo | Recém-formado | R$ 34,90/mês ou R$ 299/ano | 25 pacientes ativos, logo próprio |
| Pro | Nutricionista estabelecido | R$ 64,90/mês ou R$ 599/ano | Pacientes ilimitados, painel de micros completo |
| Clínica | 2+ profissionais | R$ 149/mês (até 4 nutris, +R$ 35 por nutri extra) | Painel do gestor, pacientes compartilhados |

Três regras importam mais que os números:

**Cobrança por paciente ativo** — quem teve plano ou missão nos últimos 30 dias. O
nutricionista sobe de plano conforme cresce, sem sentir que foi cobrado a mais.

**Preço de fundador, não preço baixo eterno** — "travado para sempre para os 200
primeiros". Barato demais atrai quem dá mais trabalho e paga menos, e trava o aumento
depois.

**Empurrar o anual desde o começo** — resolve caixa e cancelamento de uma vez só.

## Dinheiro

Com 12 assinantes no plano Solo a operação já se paga. Números aproximados, a confirmar
com os custos reais de infraestrutura.

Custo mensal de um dev solo: servidor, banco, storage e e-mail entre R$ 150 e R$ 400. O
gateway de pagamento consome cerca de 5% mais uma taxa fixa por cobrança.

| Marco | Assinantes necessários |
|---|---|
| Cobrir os custos | ~12 no Solo |
| R$ 3.000 líquidos por mês | ~70 (misturando Solo e Pro) |
| Meta de 12 meses | 100 pagantes |

Projeção de 12 meses: 70 Solo + 25 Pro + 5 Clínica = R$ 4.810/mês de receita bruta,
cerca de R$ 4.100 líquidos.

> Nota do repositório: os custos de infraestrutura já foram levantados em `decisoes.md`
> (15/09/2026) e são mais baixos que a estimativa acima — ≈ R$ 130/mês no lançamento
> (Supabase Pro) e ≈ R$ 232/mês com ~500 usuários ativos. Isso melhora o ponto de
> equilíbrio, não piora.

## Como vender

Quem busca "software de nutrição" no Google já achou o Dietbox. A aquisição tem que vir
pelo assunto **adesão**, não pela categoria software.

- **Rede próxima** — faculdade, estágio e grupos de WhatsApp de turma, pela nutricionista
  parceira do projeto.
- **Conteúdo sobre adesão no Instagram** — por que o paciente abandona na segunda semana
  e o que fazer. O software aparece no fim.
- **Professores e ligas acadêmicas** — porta de entrada do plano Estudante, que alimenta
  a base de futuros pagantes.
- **Indicação** — nutricionista que traz outro ganha um mês.

## Fases de execução

**Cada fase só começa quando a anterior prova uma coisa.**

| Fase | O que é | Prazo | Portão |
|---|---|---|---|
| **0 · Validação** | 10 conversas com recém-formados. Nada de código ainda. | 2 semanas · **agora** | Dor da adesão confirmada |
| **1 · Missões diárias** | Só as missões, ao lado do software que o nutri já usa. | 60 dias | 10 nutris usando de verdade |
| **2 · Sistema e cobrança** | Prescrição rápida, painel de micros e planos pagos. | 90 a 180 dias | 30 assinantes pagantes |
| **3 · Clínicas** | Painel do gestor e plano para vários profissionais. | depois dos 30 pagantes | — |

A Fase 1 é pequena de propósito: entregar só as missões, funcionando ao lado do software
que o nutricionista já usa, evita a barreira de venda mais alta que existe — pedir que
ele troque de sistema.

## Riscos e cuidados legais

O risco número 1 é **técnico, não comercial**: sem base de alimentos com micronutrientes
completos, o principal diferencial não funciona.

| Risco | O que fazer |
|---|---|
| Base de alimentos sem micros completos (a TACO tem lacunas) | Resolver antes de vender o painel de micros — é o bloqueador |
| Concorrente copiar as missões diárias | Chegar primeiro e virar referência no assunto adesão |
| Preço baixo demais mata a margem | Preço de fundador com prazo, não preço baixo eterno |
| Suporte comendo o tempo do dev solo | Documentação e vídeos curtos desde o primeiro cliente |
| Falta de tempo (dev sozinho) | Fase 1 deliberadamente pequena |

**LGPD** — dado de saúde é dado sensível. São necessários política de privacidade,
consentimento do paciente, exclusão de conta e um contrato deixando claro que o
nutricionista é o controlador dos dados e o MetaNutri é o operador.

**CFN** — o software não prescreve; quem prescreve é o nutricionista. Cuidado com
qualquer sugestão automática que possa ser lida como prescrição.

## Métricas

A métrica que diz se o produto funciona é a do **paciente**, não a do nutricionista.

- **Missões marcadas** — % de pacientes que marcam missão em 4 dias ou mais na semana.
  Esta é a métrica do produto.
- **Ativação** — % de nutricionistas que criam o primeiro plano em até 7 dias.
- **Conversão** — % que sai do Free ou do Estudante para um plano pago.
- **Cancelamento** — meta abaixo de 5% ao mês.

## Próximos passos — as 10 conversas

Antes de escrever mais código: 10 conversas de 15 minutos com nutricionistas
recém-formados, **sem apresentar o MetaNutri**. Se você conta a ideia, a pessoa fica
educada e diz que usaria — e isso não vale nada.

**Regra:** pergunte sobre o passado ("o que você fez da última vez?"), nunca sobre o
futuro ("você usaria?").

### Rotina

1. Você se formou quando? Quantos pacientes atende por mês?
2. Me conta o último atendimento, do começo ao fim.
3. Qual parte consome mais tempo?

### Software

1. Que sistema usa hoje? Como escolheu?
2. Paga quanto por mês?
3. Quando se formou, o que aconteceu com o plano de estudante?
4. Tem algo nele que te irrita de verdade?
5. Já pensou em trocar? Por que não trocou?

### Adesão

1. Do último grupo de pacientes, quantos sumiram antes do retorno?
2. Me conta de um paciente específico que abandonou.
3. Você faz alguma coisa para segurar o paciente entre as consultas? O quê?
4. Isso funciona? Quanto tempo toma por semana?
5. Quando o paciente some, quanto isso te custa em dinheiro?

### Fechamento

1. Se pudesse resolver uma coisa da sua rotina com um botão, qual seria?
2. Conhece outro recém-formado que toparia conversar?

### O que anotar no mesmo dia

Quanto ela paga hoje, quantos pacientes ativos, % que some antes do retorno, o que ela
já tentou fazer sozinha para resolver a adesão (**o sinal mais importante**) e a frase
exata que ela usou para descrever a dor.

### Como ler o resultado

- **Verde** — 6 ou mais das 10 já improvisaram alguma solução de adesão. Tem negócio, e
  o texto de venda já está nas palavras delas.
- **Amarelo** — reclamam do preço, mas dão de ombros para a adesão. O produto é outro:
  software enxuto e barato para recém-formado.
- **Vermelho** — ninguém tentou nada e ninguém liga. Três meses de código economizados.
