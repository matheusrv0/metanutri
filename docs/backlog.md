# Backlog de ideias (fonte única)

Regras: toda ideia entra aqui antes de virar SPEC. Nada sai daqui direto para código.
Fases: **MVP** = preenchedor de micros (estudante e recém-formado, sem paciente real) ·
**MVP+** = melhorias no mesmo produto logo após o lançamento · **SaaS** = conta, cobrança e paciente,
o que transforma a ferramenta em produto pago · **v2** = app do paciente e missões
(exige CRN validado, LGPD completa e telenutrição).
Esforço: P (dias), M (1 a 2 semanas), G (3+ semanas) para um dev solo.

Status revisado em 16/09/2026 contra o código: **pronto** é o que está construído e
testado. O que ficou de fora está explicado em [pendencias.md](pendencias.md), com o
motivo — decisão sua ou risco clínico.

| ID | Ideia | Quem / quando | Fase | Esforço | Depende de | Status |
|---|---|---|---|---|---|---|
| B-01 | Sugerir alimentos que cobrem o micronutriente que falta ("cobrir") | conversa original; confirmada pela nutri em 15/09 ("ajuda enorme") | MVP | M | B-02, tabela de alimentos, DRI | **pronto** |
| B-02 | Perfil do caso com sexo, idade, peso, altura e nível de atividade; cálculo de TMB e GET com fórmula escolhível | nutri, 15/09 08:35 | MVP | P | — | **pronto** |
| B-03 | Entrada rápida de alimentos: digitar "150 arroz int" e ver opções na hora ("escrita inteligente") | nutri, 15/09 09:45 | MVP | M | tabela de alimentos; medidas caseiras (B-04) | **pronto** |
| B-04 | Medidas caseiras ("2 colheres de arroz") convertidas para gramas, e o inverso para escrever o plano em medida caseira | derivada da B-03; o modelo do professor exige medida caseira (15/09) | **MVP** (subiu) | M | tabela POF/IBGE de medidas | **pronto** |
| B-05 | Fluxo antes dos micros: anamnese resumida e medidas (antropometria) do paciente, porque a ferramenta é complementar e "isso precisa ser antes de chegar na distribuição de micro" | nutri, 15/09 12:48 | MVP (versão mínima) / MVP+ (completa) | mínima P, completa G | B-02 | **pronto** |
| B-06 | Alertas de diretriz: condição clínica marcada na anamnese (ex.: doença renal crônica) gera alerta quando um nutriente passa do recomendado (ex.: potássio) | nutri, 15/09 12:49 | MVP+ | M para 5 condições; G para cobertura ampla | B-05 (anamnese com condições), tabela condição → limite com fonte | depende de revisão clínica |
| B-07 | Painel de distribuição de macros: % de kcal de proteína, carboidrato e gordura, metas por faixa (e proteína em g/kg), para saber se "já coloquei a quantidade que precisa" | nutri, 15/09 12:50 | MVP | P | B-02 | **pronto** |
| B-08 | Substituições: "Substituto 1" e "Substituto 2" por refeição com porção equivalente (por proteína e kcal, mantendo o micro crítico); no futuro, o paciente troca sozinho no app | nutri, 15/09 12:53; o modelo do professor exige 2 substitutos por refeição (15/09) | **MVP** na versão simples (estudante escolhe o substituto, sistema calcula a porção) · paciente: v2 | M (nutri) / G (paciente) | motor de equivalência; v2 para o lado do paciente | **pronto** |
| B-09 | "Refeições livres mais controladas": o paciente escolhe entre opções permitidas com limites (kcal, grupos), em vez de refeição livre solta | nutri, 15/09 12:54 | v2 | M | app do paciente, B-08 | depende do app do paciente |
| B-10 | Missões diárias geradas do plano, com sequências e progressão semanal; painel de adesão para o nutri | conversa original | v2 | G | CRN validado, LGPD, TCLE, app do paciente | depende do app do paciente |
| B-11 | Exportar para **Word (.docx)** em dois formatos: (a) "Aconselhamento Nutricional" no modelo do professor (cabeçalho do paciente, antropometria, refeições por horário com Principal + Substituto 1 + Substituto 2 em medida caseira, orientações, receitas); (b) memorial de cálculo com kcal, macros e adequação de micros (RDA ou EAR). PDF fica como opção secundária | brainstorming; corrigido pela estudante em 15/09; modelo em `docs/modelos/modelo_planejamento_estagio.docx` | MVP | M | B-01, B-04, B-07, B-08 | **pronto** |
| B-12 | Modo estudante: paciente fictício ou "eu mesmo", sem dados de terceiros | pesquisa legal (Lei 8.234/1991) | MVP | P | — | **pronto** |
| B-13 | Limite de adequação com presets "Individual: 90% da RDA" e "Coletivo: 50% da EAR", mais "Personalizado" (porcentagem e referência livres); alerta de UL | estudante, 15/09 (regra real da faculdade; o "75%" não era a regra acadêmica; confirmado: coletivo = EAR, individual = RDA) | MVP | P | tabela DRI com EAR além de RDA | **pronto** |
| B-14 | Extensão da base com USDA (domínio público) para B12, folato, vitaminas D e E, que a TACO não tem; TBCA (USP) só se um dia valer o esforço de pedir licença | pesquisa | MVP+ | M | mapeamento alimento TACO ↔ USDA | não feito de propósito: casar TACO e USDA por nome gera número errado (docs/pendencias.md) |
| B-15 | Modo estágio: estudante monta o plano, preceptora (com CRN) revisa e aprova; histórico de revisões | estudante, 15/09 (já atende no estágio com preceptora) | v2 | G | dados de paciente real, LGPD, CRN validado | parcial: o campo Preceptor(a) e a linha de responsabilidade existem; revisão com aprovação, não |
| B-16 | Fatores de atividade editáveis, com o conjunto que a faculdade usa com Mifflin como padrão: sedentário 1,2 · pouco ativo 1,37 · moderadamente ativo 1,55 · muito ativo 1,7 · extremamente ativo 1,9; o nutri pode trocar o conjunto ou digitar o fator ("vai da conduta") | estudante, 15/09 | MVP | P | B-02 | **pronto** |
| B-17 | Cabeçalho do caso no padrão do estágio: diagnóstico clínico, data da consulta, ocupação, estagiário(a), preceptor(a); antropometria básica (IMC, circunferência da cintura e da panturrilha com referência e diagnóstico) | modelo do professor, 15/09 | MVP (versão mínima da B-05) | P | B-05 | **pronto** |
| B-18 | Refeições por horário com nome padrão (6:00 desjejum, 9:00 lanche da manhã, 12:00 almoço, 16:00 lanche da tarde, 19:00 jantar, 21:00 ceia), editáveis | modelo do professor, 15/09 | MVP | P | — | **pronto** |
| B-19 | Conta de usuário: cadastro por e-mail e Google, confirmação e onboarding de três perguntas (nome, estudante ou formada, CRN) | revisão de produto, 15/09 | SaaS | M | back-end (Supabase) | depende de decisão sua (docs/pendencias.md) |
| B-20 | Assinatura e cobrança: três planos, teste de 14 dias sem cartão, Pix e cartão, upgrade e cancelamento em dois cliques | revisão de produto, 15/09 | SaaS | M | B-19 | depende de decisão sua (docs/pendencias.md) |
| B-21 | Paciente como entidade própria, separado de atendimento e de plano; ficha, histórico e evolução | revisão de produto, 15/09 | SaaS | G | B-19, LGPD | **pronto** |
| B-22 | Prescrição rápida: montar a dieta sem nenhuma medida, com meta de energia digitada; antropometria escondida e botão para virar atendimento completo | revisão de produto, 15/09 | MVP+ | M | — | **pronto** |
| B-23 | Dieta em PDF de uma página, para entregar no celular do paciente | revisão de produto, 15/09 | MVP+ | P | B-11 | **pronto** |
| B-24 | Entrega ao paciente por link privado com prazo de validade, com refeições, substitutos e lista de compras | revisão de produto, 15/09 | v2 | G | B-21, LGPD | depende de decisão sua (docs/pendencias.md) |
| B-25 | Cadastro de produto industrializado pelo rótulo, com porção declarada e medida caseira | revisão de produto, 15/09 | MVP+ | M | — | **pronto** |
| B-26 | Selo de completude por alimento (completo, parcial, mínimo) e aviso quando o plano usa alimento parcial | revisão de produto, 15/09; base tem só 6 de 597 alimentos completos | MVP+ | P | B-14 | **pronto** |
| B-27 | Modelos de plano por objetivo e salvar plano existente como modelo | revisão de produto, 15/09 | MVP+ | M | — | **pronto** |
| B-28 | Lista de substituições por grupo de equivalência, anexada à dieta | revisão de produto, 15/09 | MVP+ | M | B-08 | **pronto** |
| B-29 | Composição corporal: dobras cutâneas por protocolo e bioimpedância | revisão de produto, 15/09 | MVP+ | M | B-05 | **pronto** |
| B-30 | Restrições e alergias no paciente, filtrando as sugestões do cobrir | revisão de produto, 15/09 | MVP+ | P | B-21 | **pronto** |
| B-31 | Favoritos de alimentos e ordenação por uso | revisão de produto, 15/09 | MVP+ | P | — | **pronto** |
| B-32 | Preparações e receitas com ingredientes, rendimento e valor por porção | revisão de produto, 15/09 | MVP+ | M | — | ideia |
| B-33 | Marca do profissional nos documentos: logo, cor e assinatura digitalizada | revisão de produto, 15/09 | SaaS | P | B-19 | parcial: logo e linha de responsabilidade na folha do paciente; cor da marca não |
| B-34 | Painel inicial com pendências do dia, planos recentes e os dois botões de criação | revisão de produto, 15/09 | SaaS | P | B-21 | **pronto** |
| B-35 | LGPD: consentimento, exportação, exclusão de conta e registro de acesso a dado de paciente | revisão de produto, 15/09 | SaaS | M | B-21 | obrigatória antes de dado real (docs/pendencias.md) |
| B-36 | Ranking do cobrir por uso comum, para não sugerir sarapatel e caranguejo | revisão de produto, 15/09 | MVP+ | P | B-01 | **pronto** |
| B-37 | Renomear caso para paciente e atendimento no produto inteiro | revisão de produto, 15/09 | MVP+ | P | B-21 | **pronto** |

## Origem das ideias B-19 a B-37

Todas vêm da revisão crítica de 15/09/2026, em `docs/revisao-produto-2026-09-15.md`.
A revisão mediu a base de alimentos e encontrou 5 nutrientes exigidos ausentes (gordura saturada,
açúcares, vitamina D, B12 e folato) e só 6 de 597 alimentos com todos os campos preenchidos.

## Fatos de mercado que sustentam as prioridades (entrevista com estudante, 15/09)
- Plano na faculdade levava ~2 h no início; o que mais demora é achar o alimento e adequar micros (B-03 e B-01 são o produto).
- Micro baixo hoje é resolvido no ChatGPT: o "cobrir" concorre com o ChatGPT, e ganha por dar porção exata com dados da TACO dentro do plano.
- Disposição a pagar: até R$ 20/mês como estudante, até R$ 100/mês como profissional.
- Divulgação: não há influenciador de referência; a turma conversa pessoalmente. Canal = sala de aula, professores, grupos de turma, parceria com cursos.

## Notas por ideia

### B-05 Anamnese e medidas antes dos micros
- **O que ela quer dizer:** o fluxo natural da consulta é anamnese → antropometria → energia (GET) → macros → micros. Uma ferramenta que começa direto nos micros parece "solta".
- **Versão mínima para o MVP (P):** um bloco "Contexto do caso" com: objetivo (emagrecer, manter, ganhar), condições clínicas (lista de seleção), restrições alimentares (vegetariano, sem lactose, alergias) e observações. Peso e altura já entram pela B-02.
- **Versão completa (G, MVP+):** anamnese estruturada (histórico, hábitos, sono, atividade, exames), antropometria com dobras e circunferências, e evolução. Isso é o que Dietbox, WebDiet e Dietitian já fazem bem; não competir nisso no início.
- **Risco:** virar "mais um software completo" e perder o foco. Decisão sugerida: MVP só com a versão mínima, porque as condições clínicas são o que alimenta a B-06.

### B-06 Alertas de diretriz
- **Como funciona:** tabela `condição → nutriente → limite → fonte`. Ex.: doença renal crônica sem diálise → potássio e fósforo com teto e proteína entre X e Y g/kg (fonte: diretriz da sociedade de nefrologia); hipertensão → sódio; diabetes → distribuição de carboidrato; gestante → ferro e folato mais altos.
- **Quem valida:** a nutricionista. O dev monta a estrutura; os valores e as fontes vêm de diretriz publicada e são revisados por ela antes de entrar. Cada alerta mostra a fonte na tela.
- **Cuidado legal (ANVISA RDC 657/2022):** o texto do alerta é "lembrete de diretriz para revisão do profissional", nunca "ajuste o tratamento". Sem isso, o software pode ser lido como dispositivo médico.
- **Escopo inicial sugerido:** 5 condições mais comuns no consultório (a nutri escolhe). Cobertura ampla fica para depois.

### B-07 Distribuição de macros
- Mostrar, para o GET calculado: gramas e % de kcal de proteína, carboidrato e gordura no plano versus a faixa-alvo. Faixas de referência (AMDR das DRI): carboidrato 45 a 65%, gordura 20 a 35%, proteína 10 a 35%; e proteína por kg de peso definida pelo nutri (ex.: 1,2 a 2,0 g/kg).
- O nutri pode digitar a meta dele (% ou g/kg) em vez de usar a faixa padrão.
- Barato e cabe no MVP: os totais já são calculados.

### B-08 Substituições automáticas
- **Lado do nutri (MVP+):** para cada alimento do plano, gerar uma lista de substitutos do mesmo grupo com a porção equivalente. Critério: mesma quantidade de proteína (para carnes e leguminosas) ou de carboidrato (para cereais), com kcal parecida e sem derrubar o micro que aquele alimento estava cobrindo. Ex.: 100 g de peito de frango grelhado (32 g de proteína) → carne moída cozida na porção que dá 32 g de proteína.
- **Lado do paciente (v2):** o paciente abre a refeição e toca em "trocar", vê as opções e a quantidade. É a parte que ela descreveu ("só tem outro tipo de carne, o quanto que ela deve usar").
- Depende do mesmo motor da B-01 (cálculo por 100 g e ranking), então o custo marginal é baixo depois do MVP.

### B-09 Refeições livres controladas
- Em vez de "refeição livre" sem regra, o nutri define um envelope: teto de kcal, grupos obrigatórios e proibidos, e o paciente monta a refeição dentro disso. É um caso especial de missão ("monte um jantar de até 600 kcal com proteína e vegetal").
- Só faz sentido com app do paciente, por isso v2.

## Perguntas abertas para a nutricionista
1. Quais 5 condições clínicas aparecem mais no consultório dela (para a B-06 começar por elas)?
2. Que diretrizes ela usa como referência para cada uma (nome e ano), para citarmos na tela?
3. Na substituição (B-08), o critério principal é proteína, kcal ou os dois?
4. A "refeição livre controlada" (B-09) é por kcal, por grupos de alimentos ou por lista de opções fechada?
5. Na anamnese mínima (B-05), quais campos ela não abre mão de ter antes de montar a dieta?
