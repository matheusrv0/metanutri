# Entrevista: estudante de nutrição (15/09/2026)

Perfil: estudante em estágio, já atende pacientes com preceptora. Respostas por WhatsApp aos blocos de perguntas do dia 15/09.

## Respostas (paráfrase fiel)

**Rotina na faculdade**
- Cálculo de dieta começa por volta do 4º semestre.
- Usa o WebDiet no plano gratuito, escolhido por ela mesma.
- O que mais irritava: ter que procurar o alimento; "não era muito didático".
- No início, um plano levava cerca de 2 horas. O que mais demora: encontrar o alimento e a adequação dos micronutrientes.

**Micronutrientes e regras**
- Dieta individual: cobram 90% de adequação. Cardápio coletivo (várias pessoas): 50%.
- Referência: RDA ou EAR; atenção ao UL para não passar do limite.
- Quando um micro fica baixo, pesquisa no ChatGPT o que incluir.
- Fórmula mais usada: Mifflin-St Jeor, "mas vai de conduta".
- Fator de atividade varia com sexo e intensidade.
- Clínica trabalha em gramas; UBS e nutrição social usam medidas caseiras.

**Entrega**
- Não pode entregar o PDF do software. Tem que montar no Word ou no modelo do professor.
- Micro inadequado tira nota.

**Estágio e futuro**
- Já atende no estágio; a preceptora confere o plano.
- Pretende atender por conta própria depois de formada; ainda pesquisa o software; pagaria no máximo R$ 100/mês.

**Dinheiro e comunidade**
- Usaria a plataforma e pagaria até R$ 20/mês "se fosse útil e suprisse minhas necessidades".
- Não conhece perfil que "todo mundo segue"; a turma conversa pessoalmente.

## O que muda no produto

| Aprendizado | Efeito | Backlog |
|---|---|---|
| Procurar alimento é a dor nº 1 também para a estudante (mesma da nutri) | Entrada rápida é o coração do MVP, junto com o "cobrir" | B-03 sobe para prioridade máxima |
| A regra é 90% (individual) e 50% (coletivo), com RDA ou EAR e teto no UL; não 75% | Limite de adequação com presets "Individual 90%", "Coletivo 50%", "Personalizado" e escolha RDA/EAR | B-13 atualizado |
| Entrega é em Word ou no modelo do professor, PDF do software não vale | Exportar como tabela para Word (.docx) ou copiar e colar formatado; PDF vira secundário | B-11 reescrito |
| Ela resolve micro baixo no ChatGPT | O concorrente do "cobrir" é o ChatGPT. Vantagem nossa: porção exata com dados da TACO, dentro do plano, sem sair da tela | Reforça B-01 |
| Mifflin é a mais usada, mas "vai de conduta"; fator de atividade por sexo | Manter fórmula escolhível; adicionar fatores por sexo (padrão FAO/OMS) | B-02 ajuste |
| Gramas na clínica; medidas caseiras em UBS e social | Gramas no MVP resolve os trabalhos de clínica; medidas caseiras entram no MVP+ para UBS/social | B-04 mantém MVP+ |
| Já atende no estágio com preceptora conferindo | Modo estágio (estudante monta, preceptora aprova) é real, mas exige dados de paciente: v2 | B-15 novo |
| Pagaria até R$ 20/mês como estudante; até R$ 100 como profissional | Confirma R$ 19,90; deixa espaço para um plano profissional acima disso na v2 | pricing |
| Não há influenciador; conversa é presencial | Marketing por sala de aula, professores, grupos da turma e parcerias com curso; não por TikTok | estratégia |

## Perguntas de seguimento
1. Qual é o modelo de tabela que o professor pede no Word (colunas, ordem, unidades)? Se ela puder mandar uma foto ou o arquivo, a exportação sai igual.
2. Em cardápio coletivo, a referência muda (EAR) ou só a porcentagem?
3. Quais fatores de atividade por sexo a faculdade usa (valores)?
4. Ela toparia testar o protótipo em um trabalho real e cronometrar o tempo?

## Seguimento (15/09/2026, tarde)

- **Referência por tipo de plano:** coletivo usa **EAR**; individualizado usa **RDA**.
- **Fatores de atividade que ela usa com Mifflin:** sedentário 1,2 · pouco ativo 1,37 · moderadamente ativo 1,55 · muito ativo 1,7 · extremamente ativo 1,9. "Vai da conduta, vai ter nutricionista que prefere outras fórmulas."
- **Teste cronometrado:** não haverá.
- **Modelo do professor** enviado: `docs/modelos/modelo_planejamento_estagio.docx` (texto extraído em `.txt`).

### O que o modelo mostra

Documento "Aconselhamento Nutricional" de estágio (Parnamirim-RN, 2022), com:
1. Cabeçalho: nome, diagnóstico clínico, idade, sexo, data da consulta, peso, estatura, ocupação, estagiário(a), preceptor(a).
2. Antropometria: IMC, circunferência da cintura, circunferência da panturrilha, com colunas "Referência (idoso)", "Resultado", "Diagnóstico".
3. Plano por horário: 6:00 desjejum · 9:00 lanche da manhã · 12:00 almoço · 16:00 lanche da tarde · 19:00 jantar · 21:00 ceia. Em cada um: **Principal, Substituto 1, Substituto 2**, escritos em **medidas caseiras** (ex.: "Macaxeira cozida (2 pedaços); Carne assada (1 pedaço médio)").
4. Orientações nutricionais e receitas saudáveis (texto livre).
5. **Não há tabela de adequação de micronutrientes** neste modelo: a adequação é conferida à parte (e tira nota se falhar).

### Consequências
- A exportação para Word tem **dois alvos**: (a) o "Aconselhamento" no formato do professor, com refeições por horário, principal e dois substitutos em medidas caseiras; (b) o memorial de cálculo com kcal, macros e adequação de micros (RDA ou EAR) para o professor conferir.
- Medidas caseiras (B-04) e substitutos (B-08) deixam de ser "depois": o entregável da faculdade já exige os dois. Sobem para o MVP, ao menos na versão simples (conversão por tabela e substituto escolhido pelo estudante com porção equivalente calculada).
- Perfil do caso ganha os campos do cabeçalho (diagnóstico clínico, ocupação, estagiário, preceptor) e a antropometria básica (IMC, circunferências): entra na versão mínima da B-05.
