# Pesquisa e brainstorming: SaaS para estudantes de nutrição

**Data da pesquisa:** 15/09/2026. Preços e notas mudam; cada dado traz a fonte e vale para essa data.
**Cotações usadas:** dólar R$ 5,09 e euro R$ 5,97 (fechamento de 14/09/2026, fontes na seção de fontes).

## Leia primeiro: as três descobertas que mudam a ideia

1. **O estudante já tem software de graça.** Dietbox, WebDiet, Nutrium, Avanutri e Dietitian dão acesso gratuito a estudantes (com limites). "Barato para estudante" não é diferencial: grátis já existe. O que o estudante perde ao se formar é o acesso gratuito, e aí o preço salta para R$ 84,90 a R$ 94,90 por mês. Esse "penhasco da formatura" é o momento de venda, mas o Dietitian já mira nele com um plano "Recém-formado" a R$ 29,90 nos 3 primeiros meses (adendo no fim do relatório). Preço sozinho não é espaço livre; funcionalidade a preço fixo é.
2. **Estudante não pode atender paciente.** A prescrição de dieta é privativa de nutricionista com registro no CRN (Lei 8.234/1991). O app de missões para o paciente só serve, na prática, para o recém-formado. Para o estudante ele precisa virar "modo treino".
3. **Ninguém no Brasil sugere alimentos para cobrir micronutrientes que faltam.** Todos calculam e comparam com a DRI (as referências de ingestão diária), mas não encontrei nenhum concorrente brasileiro que diga "falta magnésio: adicione X". Só o Cronometer (Canadá, app de consumidor) faz isso, no plano pago. Esse é o espaço mais limpo para um dev solo.

---

## 1. Brainstorming da ideia

### 1.1 Doze formas de atacar as duas dores

| # | Ideia | Para quem | O que faz | Por que pagaria | Dor | Esforço (dev solo) |
|---|---|---|---|---|---|---|
| 1 | **Preenchedor de micros** ("o que falta no plano") | estudante em trabalho de cálculo de dieta; recém-formado | recebe o plano (digitado ou colado), mostra a % de adequação de cada micronutriente e lista alimentos e porções que fecham a lacuna com o menor impacto em kcal e macros | economiza horas de tentativa e erro no trabalho da faculdade | 2 | baixo |
| 2 | **Missões diárias** (app web do paciente) por cima de qualquer software | recém-formado com os primeiros pacientes | o nutri transforma o plano (mesmo um PDF do Dietbox) em missões; o paciente marca no celular; o nutri vê a adesão | reter paciente é renda; custa uma fração dos grandes | 1 | médio |
| 3 | **QR code no PDF que vira missões** | recém-formado que não quer trocar de software | gera um QR que leva o paciente direto ao checklist do plano | zero migração, encaixa no fluxo atual | 1 | médio |
| 4 | **Biblioteca de missões por perfil** | recém-formado inseguro | modelos prontos (obeso iniciante, diabético, gestante, hipertrofia) com missões que evoluem semana a semana | ganha tempo e segurança clínica | 1 | baixo (é conteúdo) |
| 5 | **Calculadora acadêmica de adequação** ("modo trabalho") | estudante | perfil do paciente fictício, DRI carregada sozinha, plano, relatório de adequação no formato que o professor pede (PDF/DOCX) | sai no formato da faculdade | 2 | médio |
| 6 | **Trocas inteligentes com micros** | estudante e recém-formado | sugere substitutos que mantêm macros **e** o micronutriente crítico (trocar feijão sem perder ferro) | lista de substituição é tarefa clássica e chata | 2 | médio |
| 7 | **Bot de missões no WhatsApp/Telegram** | nutri com paciente que não instala app | manda a missão do dia; o paciente responde "feito" | canal de maior adesão no Brasil | 1 | médio; WhatsApp cobra por conversa |
| 8 | **Painel de adesão semanal** | recém-formado | resume o que o paciente cumpriu ou pulou e sugere o que revisar na próxima consulta | justifica vender pacote mensal | 1 | baixo (depende da 2) |
| 9 | **Guia de alimentos-fonte por micro** | estudante estudando para prova | busca "magnésio" e vê os melhores alimentos por porção e por 100 kcal (TACO/TBCA) | provavelmente não pagaria: serve de isca gratuita | 2 | muito baixo |
| 10 | **Modo estágio supervisionado** | estudante em estágio + supervisor/clínica-escola | o estudante monta plano e missões; o supervisor com CRN aprova e libera ao paciente | resolve a trava legal; venda para a faculdade (B2B) | 1+2 | alto |
| 11 | **Extensão de navegador** sobre Dietbox/WebDiet | estudante que já usa o plano gratuito dos grandes | lê o plano na tela e mostra lacunas de micros com sugestões | não precisa migrar | 2 | médio e frágil (quebra quando o site muda) |
| 12 | **Desafios em grupo entre pacientes** | nutri com programas em grupo | ranking semanal de missões entre pacientes | engajamento social | 1 | alto; risco de privacidade |

### 1.2 O melhor MVP para um dev solo em 1 a 2 meses

**Recomendação: começar pela ideia 1 (Preenchedor de micros), com a ideia 9 como isca gratuita, e deixar as missões (ideia 2) para a versão 2.**

Por que essa e não as missões, que foram a primeira dor da nutricionista:

- **Não guarda dado de paciente real.** O estudante usa casos fictícios ou dados próprios. Isso tira quase todo o peso da LGPD (a lei de proteção de dados) e do CFN no lançamento. As missões exigem dados de saúde de terceiros desde o primeiro dia.
- **Não esbarra na lei.** O estudante não pode atender paciente, mas pode calcular dieta para trabalho de faculdade. O produto é útil para ele já no 3º semestre.
- **É só cálculo.** Tabela de alimentos + tabela de DRI + um algoritmo de ranking ("qual alimento cobre mais do que falta com menos kcal"). Sem app nativo, sem push, sem dois tipos de usuário. Cabe em 4 a 6 semanas.
- **Ninguém faz no Brasil.** Os concorrentes mostram a % de adequação, mas não sugerem o que adicionar (detalhe na seção 3). As missões, ao contrário, já existem em forma básica (metas + check-in + lembrete) em WebDiet, DietSystem, Nutrium e Dietbox; o que falta lá é só a camada de jogo (sequências, progressão), um diferencial mais fino.
- **Cria o funil natural.** Você conquista o estudante de graça ou barato, ele se forma, perde o plano gratuito dos grandes e você oferece as missões para os primeiros pacientes dele. É o mesmo caminho que WebDiet e Dietbox usam, só que com preço de recém-formado.

Como seria a experiência mínima: o estudante cola ou digita o plano (alimento + quantidade) → o sistema calcula kcal, macros e micros com TACO/TBCA e compara com a DRI do perfil (sexo, idade, gestação) → cada micro abaixo da meta aparece em vermelho com um botão "cobrir" → o botão lista 5 alimentos com a porção exata que fecha a lacuna e o efeito em kcal/macros → um clique adiciona ao plano → exporta a tabela de adequação em PDF para entregar na faculdade.

Referência de interface para copiar bem: o "Oracle Food Suggestions" do Cronometer, que sugere alimentos para as metas não batidas respeitando o que sobra de macros ([fórum oficial](https://forums.cronometer.com/discussion/306/new-feature-nutrient-oracle-food-suggestions)).

**Quando lançar a versão 2 (missões):** quando houver pelo menos 10 pagantes recém-formados pedindo. Aí sim vale enfrentar dados de paciente, CRN obrigatório para convidar paciente e a resolução de telenutrição.

### 1.3 Três nomes possíveis

Verifiquei só o domínio `.com.br` no Registro.br em 15/09/2026. Marca no INPI não foi verificada: faça a busca em [busca.inpi.gov.br](https://busca.inpi.gov.br/pePI/) antes de investir em identidade.

| Nome | Ideia por trás | Domínio .com.br | Observação |
|---|---|---|---|
| **MicroNutri** | o produto de micros, direto ao ponto | livre | descritivo demais para registrar marca com força; bom para SEO |
| **NutriMissão** | as missões diárias do paciente | livre | perfeito para a versão 2; menos para o MVP de micros |
| **MetaNutri** | "meta" = objetivo a bater (micro ou missão) | livre | serve para as duas fases; conflito de nome com a empresa Meta é improvável em outra classe, mas confirme no INPI |

Já registrados (descartar): adequa, nutriquest, supre, planovivo, faltou, cobre.

---

## 2. Pesquisa de dores em fóruns, lojas e reclamações

### 2.1 Como pesquisei e o que não consegui

- **Consegui:** App Store e Google Play (Dietbox, WebDiet, Nutrium, DietSystem), Reclame Aqui (o site bloqueia robôs, então usei o que aparece nos resultados de busca e nas páginas de reclamações individuais), blogs dos concorrentes, artigos científicos brasileiros (SciELO, RASBRAN, Demetra) e páginas do CFN.
- **Não consegui:** Reddit (exige login para busca e bloqueia acesso automatizado; buscas com `site:reddit.com` não retornaram threads de r/dietetics ou r/nutrition sobre software), Quora, comentários de YouTube/TikTok/Instagram (não são indexados de forma citável). Encontrei apenas páginas de descoberta do TikTok que provam que o tema "estudante de nutrição usando Dietbox/WebDiet para caso clínico" existe, sem frases citáveis.
- Uma parte das evidências sobre "montar plano demora" vem de blogs dos próprios fabricantes (Dietbox, Nutrium). Marquei isso: é interesse deles dizer que demora.

### 2.2 Dores do estudante e do nutricionista (10 mais repetidas)

| # | Dor, em linguagem simples | Evidência | Exemplo | Fonte |
|---|---|---|---|---|
| 1 | **Cancelar é difícil e a cobrança continua.** Plano anual "só cancela na renovação". | Dietbox: 127 reclamações no Reclame Aqui, a maioria com títulos de cancelamento e cobrança | "Dificuldades para cancelar assinatura, e cobrança mesmo após solicitado cancelamento" (título de reclamação) | [Reclame Aqui Dietbox](https://www.reclameaqui.com.br/dietbox/dificuldades-para-cancelar-assinatura-e-cobranca-mesmo-apos-solicitado-can_z18fXLhueoSZxwFE/), [página da empresa](https://www.reclameaqui.com.br/empresa/dietbox/) |
| 2 | **O preço dobra depois da promoção.** R$ 49,90 nos 3 primeiros meses, depois R$ 91,90 (Dietbox) ou R$ 94,90 (WebDiet). | páginas oficiais de preço | "Após, o valor será de R$ 94,90" | [WebDiet](https://pt.webdiet.com.br/assine.php), [Dietbox](https://dietbox.me/pt-BR) |
| 3 | **O plano de estudante acaba na formatura e é limitado.** Dietbox: 10 pacientes, 10 planos, sem app. WebDiet: "uso não comercial" até a formatura. | páginas de ajuda oficiais | "O aplicativo Dietbox é de uso exclusivo para nutricionistas assinantes — portanto, estudantes não conseguem fazer login pelo app." | [Ajuda Dietbox](https://ajuda.dietbox.me/como-se-cadastrar-no-acesso-gratuito-para-estudantes-do-dietbox), [WebDiet graduação](https://webdiet.com.br/graduacao.php) |
| 4 | **Montar o plano é a parte mais demorada da consulta.** Ajustar porções, repetir refeições, criar substituições, revisar calorias. | blogs dos fabricantes (interesse comercial) | "a elaboração do plano alimentar costuma ser a tarefa mais demorada" (paráfrase) | [Blog Dietbox](https://blog.dietbox.me/como-montar-dieta-mais-rapido-7-dicas-para-acelerar-a-consulta/), [Blog Nutrium](https://nutrium.com/blog/pt-br/como-criar-um-plano-alimentar-manual-essencial-passo-a-passo/) |
| 5 | **Avaliar micronutrientes é complexo demais para o dia a dia.** Pesquisadores publicaram "valores práticos" justamente porque o método oficial (probabilidade de adequação pela DRI) é trabalhoso. | artigo científico (RASBRAN, 2023) | "úteis para o nutricionista avaliar de forma mais fácil e rápida a adequação da ingestão de micronutrientes" (paráfrase do resumo) | [RASBRAN](https://www.rasbran.com.br/rasbran/article/view/2619) |
| 6 | **O paciente abandona o tratamento.** Taxas de abandono entre 20% e 73% nos estudos brasileiros. | artigos SciELO | "Estudos mostram taxas de abandono variando entre 20% e 73%" (paráfrase) | [Rev. Nutrição](https://www.scielo.br/j/rn/a/D9g8gqBtq44WqqXPhQ7th8L/?format=html&lang=pt), [HC/UFG](https://www.scielo.br/j/rn/a/HKNMLXvBhgKZ9MnhQkyqvgk/?lang=pt) |
| 7 | **App instável, com bugs, que cai depois de atualização.** Vale para os três grandes. | reviews nas lojas | "A versão 8.7.36 parou de funcionar no IOS 26.1, qdo abre o app não segura e fecha" (Dietbox) | [App Store Dietbox](https://apps.apple.com/br/app/dietbox/id648610153), [App Store Nutrium](https://apps.apple.com/br/app/nutrium/id1136652584) |
| 8 | **O app do paciente manda propaganda que o nutri não controla.** | reviews WebDiet | "A falta de opção para desligar os alertas de promoção e vendas são pessimos" | [App Store WebDiet](https://apps.apple.com/br/app/webdiet-para-pacientes/id1195115431) |
| 9 | **Cobrar do paciente por função no app.** O WebDiet lançou um recurso pago para o paciente (WebDiet+) e gerou reclamações. | Reclame Aqui | "Cobrança indevida para pacientes acessarem funcionalidade no aplicativo Webdiet" (título) | [Reclame Aqui WebDiet](https://www.reclameaqui.com.br/webdiet-software-nutricao/cobranca-indevida-para-pacientes-acessarem-funcionalidade-no-aplicativo-web_DP5YCrqvjlc-vndm/) |
| 10 | **Suporte que não resolve.** Nutrium resolveu 54,5% das reclamações no Reclame Aqui; Dietbox 82,1%; WebDiet 96,8%. | Reclame Aqui (dados do resumo de busca) | nota do consumidor: Nutrium 5,23; WebDiet 8,23; Dietbox 9,0 | [RA Nutrium](https://www.reclameaqui.com.br/empresa/healthium-healthcare-software-solutions-s-a/), [RA WebDiet](https://www.reclameaqui.com.br/empresa/webdiet-software-nutricao/) |

### 2.3 Dores do paciente (10 mais repetidas)

| # | Dor, em linguagem simples | Exemplo | Fonte |
|---|---|---|---|
| 1 | **Registrei e o app diz que não segui.** O check-in não salva. | "O app não salva as refeições corretamente, vc registra certinho e quando vai ver fica como se a gente não tivesse seguido" | [App Store Dietbox](https://apps.apple.com/br/app/dietbox/id648610153) |
| 2 | **O app fecha sozinho depois de atualizar o celular.** | "parou de funcionar no IOS 26.1" | [App Store Dietbox](https://apps.apple.com/br/app/dietbox/id648610153) |
| 3 | **Notificação demais, inclusive propaganda.** | "o aplicativo é bom, mas considero que manda muitas notificações" | [App Store WebDiet](https://apps.apple.com/br/app/webdiet-para-pacientes/id1195115431) |
| 4 | **Desloga toda hora, não recupera senha.** | "o sistema não funciona para recuperar senha e sempre desloga" | [App Store Nutrium](https://apps.apple.com/br/app/nutrium/id1136652584) |
| 5 | **A dieta não atualiza quando o nutri muda.** | reclamação recorrente nos reviews do Nutrium (paráfrase) | [Google Play Nutrium](https://play.google.com/store/apps/details?id=co.healthium.nutrium&hl=en) |
| 6 | **Substituições sem opções boas de alimentos.** | "lacking accurate food options for substitutes" (resumo de reviews) | [Google Play Nutrium](https://play.google.com/store/apps/details?id=co.healthium.nutrium&hl=en) |
| 7 | **Lembrete sem som não lembra nada.** | reviews do Nutrium (paráfrase) | [Google Play Nutrium](https://play.google.com/store/apps/details?id=co.healthium.nutrium&hl=en) |
| 8 | **Ter que pagar para usar função dentro do app.** | "Dúvida sobre cobrança em aplicativo antes gratuito" (título) | [Reclame Aqui WebDiet](https://www.reclameaqui.com.br/webdiet-software-nutricao/duvida-sobre-cobranca-em-aplicativo-antes-gratuito_ch5p6abiL3VPEAFK/) |
| 9 | **Falta tempo para preparar comida, come fora, não quer mudar.** Barreiras: falta de tempo (23%), comer fora (19%), não querer mudar (14%), falta de informação (14%). | estudo com pacientes com dislipidemia (internacional) | [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8223790/) |
| 10 | **Desiste por falta de resultado rápido, de apoio da família e de motivação.** | fatores de abandono em obesidade (paráfrase) | [Rev. Nutrição](https://www.scielo.br/j/rn/a/jPKQWwryjPYt4x6RvvRN3ZH/?lang=pt) |

**Sinal positivo que valida a ideia das missões:** as avaliações mais elogiadas são exatamente o check-in e o lembrete. "Adoro esse app, registro minhas refeições e ao final de dia tenho um compilado de feito e não feito!" ([Nutrium, App Store](https://apps.apple.com/br/app/nutrium/id1136652584)); "lembretes de tomar água" descritos como "incríveis" ([Dietbox, Google Play](https://play.google.com/store/apps/details?id=com.craftbox.dietbox)).

### 2.4 O que a sua ideia resolve e o que ela ignora

| Dor | A ideia resolve? | Comentário |
|---|---|---|
| Paciente abandona (E6, P9, P10) | **Parcialmente.** Missões diárias atacam motivação e foco, não falta de tempo nem apoio familiar. | Os concorrentes já têm metas + check-in + lembrete. Seu diferencial precisa ser a mecânica (sequências, progressão semanal, missões geradas do plano) e não o check-in em si. |
| Micros dão trabalho (E4, E5) | **Sim, e ninguém faz.** | É a parte mais defensável. Veja seção 3.4. |
| Check-in não salva, app cai, desloga (E7, P1, P2, P4) | **Ignora, mas vira vantagem.** | Uma PWA simples e estável já ganha desses reviews. Faça funcionar offline e sincronizar depois. |
| Propaganda no app do paciente (E8, P3) | **Ignora, mas vira regra de produto.** | Prometa: "nenhuma notificação que o nutri não configurou". |
| Cancelamento difícil, preço que dobra (E1, E2) | **Ignora, mas vira posicionamento.** | Mensal sem fidelidade, cancela em um clique, preço que não muda depois de 3 meses. |
| Plano de estudante limitado e que acaba (E3) | **Resolve pela metade.** | Só se o modo estudante for gratuito e completo, e a transição para pagante acontecer na formatura. |
| Substituições ruins (P6) | **Ignora.** | Ideia 6 (trocas inteligentes) cobre depois. É extensão natural do motor de micros. |
| Dieta não atualiza (P5) | **Ignora.** | Se fizer missões, sincronize na hora: é uma dor real e barata de evitar. |

---

## 3. Análise de concorrentes

### 3.1 Brasil

Preços vistos em 15/09/2026 nas páginas oficiais, salvo indicação.

| Software | Mais barato/mês | Completo/mês | Anual | Teste grátis | Plano estudante | App do paciente | Adesão no app | Micronutrientes | Fonte |
|---|---|---|---|---|---|---|---|---|---|
| **Dietbox** | R$ 49,90 (3 meses), depois **R$ 91,90** | Premium R$ 133,90 | R$ 479,90 na home; blog fala em renovação a R$ 919 (divergência, confirme) | não achei dias de teste; há plano grátis de estudante | **Grátis** (10 pacientes, 10 planos, só navegador, sem app) e **Estudante Básico R$ 24,90/mês** | sim (4,9 na App Store com 71 mil avaliações; 4,9 na Google Play com 119 mil; 1 mi+ downloads) | plano, diário, metas, lembrete de refeição e água, chat, agenda, lista de compras. Sem gamificação | calcula e mostra se está "dentro das referências"; "Assistente Dietbox" para otimizar planos; **não achei sugestão de alimento por micro faltante** | [preços](https://dietbox.me/pt-BR), [blog](https://blog.dietbox.me/assine-este-mes-e-ganhe-bonus-exclusivos-para-nutricionistas/), [estudante](https://ajuda.dietbox.me/como-se-cadastrar-no-acesso-gratuito-para-estudantes-do-dietbox), [micros](https://blog.dietbox.me/como-calcular-micronutrientes-em-uma-dieta/) |
| **WebDiet** | R$ 49,90 (3 meses), depois **R$ 94,90** (Premium) | Black R$ 139,90 (Clara IA, Body3D) | não exibido | 30 dias (Experimental) | **Grátis** no "modo graduação" até a formatura (não comercial) e **Estudos+ R$ 9,90/mês por 3 meses, depois R$ 29,90** (cursos, lâminas, 40 interações) | sim (4,9 na App Store com 200 mil; **4,1 na Google Play** com 4,14 mil; 1 mi+ downloads) | metas + check-in diário + notificações + foto da refeição + chat. Sem sequências/pontos | calcula; Clara IA analisa exames e "sugere condutas". Não achei sugestão de alimento por micro | [preços](https://pt.webdiet.com.br/assine.php), [Estudos+](https://pt.webdiet.com.br/estudosPlus/), [adesão](https://blog.webdiet.com.br/2026/08/06/app-webdiet-pacientes-adesao-dieta/) |
| **Nutrium** (Portugal) | 10 clientes/mês: **R$ 228/ano (R$ 19/mês)** na página em reais; em euro €15/mês anual ou €25 mensal (R$ 90 / R$ 149) | ilimitado €25/mês anual ou €39 mensal (R$ 149 / R$ 233) | sim | 14 dias | **Grátis** por parceria acadêmica (e-mail academicpartnerships@nutrium.com com comprovante) | sim (4,0 na App Store BR com 193 avaliações) | plano, lembrete de água e refeição, chat com foto, resumo diário de "feito e não feito" | compara com a DRI em gráfico de barras. Não achei sugestão de alimento | [preços](https://nutrium.com/pt-br/professionals/pricing), [guia](https://nutrium.com/blog/pt-br/guia-de-utilizacao-do-nutrium/) |
| **Avanutri Online** | licença R$ 130 (anual ou semestral, a página não deixa claro qual) | idem | idem | não achei | grátis para alunos de instituições parceiras (ex.: Estácio) | sim, grátis (diário, chat, lista de compras, receitas) | sem metas/gamificação descritas | 40 mil alimentos; não achei sugestão | [loja](https://www.loja.avanutri.com.br/prod,idproduto,5077878,linha-nutricao-software-software-avanutri-online), [estudantes](https://gazetadasemana.com.br/noticia/115012/avanutri-fornece-para-estudantes-acesso-gratuito-a-sua-plataforma-de-saude) |
| **DietSystem** | R$ 29,90 (1º mês), R$ 49,90 (2º), depois **R$ 79,90** | idem | não exibido | sem fidelidade | não achei | sim | metas + check-in + notificações de refeição e água | IA e BodyScan; não achei sugestão por micro | [site](https://www.dietsystem.com.br/melhor-software-nutricionista/), [app](https://apps.apple.com/br/app/dietsystem-para-pacientes/id1551542683) |
| **SimpleDiet** | **R$ 39,90** | idem | não exibido | 7 dias | não achei | sim (plano, diário, fotos, chat) | sem metas/gamificação descritas | não menciona micros | [site](https://simplediet.app/) |
| **Nutriform** | a partir de R$ 29,90 (fonte secundária) | ? | ? | 14 dias | não achei | sim | ? | ? | [site](https://www.nutriform.app/) |
| **Dietitian** (adendo 15/09) | Free R$ 0 (5 pacientes); Plus R$ 69,90 (3 meses), depois **R$ 84,90** | idem | não exibido | plano Free permanente | **Grátis com pacientes ilimitados e app do paciente** (uso comercial vedado); **"Recém-formado" R$ 29,90** nos 3 primeiros meses (só no site, não consta nos termos); professores grátis | sim, novo (5,0 na Google Play com 17 avaliações; 10 mil+ downloads) | diário, fotos, timer de jejum, notificações, comunidade "quase rede social" | "Escrita Inteligente": sugere alimentos, medidas e nutrientes em tempo real enquanto digita; IA para importar PDF e transcrever consulta. Não achei sugestão de alimento por micro faltante | [site](https://dietitian.com.br/), [termos](https://dietitian.com.br/termos), [app](https://play.google.com/store/apps/details?id=com.dietitian.dietitian_patient&hl=pt_BR) |

**Leitura rápida:** existe um piso de preço de R$ 30 a R$ 40 por mês já ocupado (SimpleDiet, Nutriform, DietSystem) e o Nutrium vende 10 clientes por R$ 19/mês no anual. Competir só por preço é perder. Competir por "grátis para estudante" também: os três grandes já dão.

### 3.2 Exterior

| Software | Mais barato/mês | Completo/mês | Estudante | App do cliente e adesão | Micronutrientes | Português/reais | Fonte |
|---|---|---|---|---|---|---|---|
| **Cronometer** (Canadá) | Gold US$ 10,99/mês ou US$ 59,99/ano (R$ 56 / R$ 305); há relatos de US$ 8,99 a 9,99 | Pro (profissional) **US$ 39,99/mês (R$ 204)** com 10 clientes, +US$ 2,50 por cliente extra; 30 dias grátis | não achei | app de consumidor; o Pro deixa o cliente registrar e o profissional ver; sem missões | **sim: "Oracle Food Suggestions" sugere alimentos para as metas não batidas respeitando macros restantes (só Gold); 92 nutrientes** | app em português; cobra em dólar; sem TACO/TBCA | [Pro](https://cronometer.com/pro/), [Oracle](https://forums.cronometer.com/discussion/306/new-feature-nutrient-oracle-food-suggestions), [preço Gold (secundária)](https://nutriscan.app/blog/posts/cronometer-pricing-2026-basic-vs-gold-vs-pro-b28e621201) |
| **MyFitnessPal** (EUA) | Premium US$ 19,99/mês ou US$ 79,99/ano (R$ 102 / R$ 407) | Premium+ US$ 24,99/mês ou US$ 99,99/ano | não achei | app de consumidor; contagem de calorias, sequências ("streaks") de registro | mostra micros por dia; sem sugestão por lacuna | app em português; cobra em dólar | [preços (secundária)](https://www.fitbudd.com/post/myfitnesspal-app-cost) |
| **Practice Better** (Canadá) | Sprout grátis (3 clientes); Starter US$ 25 (R$ 127) | Plus US$ 89 (R$ 453); Team US$ 145+ | não achei | app do cliente com diário, tarefas, chat, telemedicina | análise nutricional; sem sugestão por lacuna encontrada | inglês; dólar | [comparativo (secundária)](https://saasrat.com/products/practice-better), [oficial](https://practicebetter.io/compare/practice-better-vs-healthie) |
| **Healthie** (EUA) | Core US$ 19 (R$ 97) com 10 clientes | Plus US$ 129 (R$ 657) | não achei | app do cliente com diário e metas | prontuário e telemedicina, não é forte em micros | inglês; dólar | [preços (secundária)](https://softwarefinder.com/emr-software/healthie/pricing) |
| **That Clean Life** (Canadá) | Starter US$ 30 (R$ 153) | Plus US$ 60/mês ou US$ 420/ano (R$ 305 / R$ 2.138) | não achei | não tem app do cliente; entrega planos bonitos em PDF | análise por receita; sem sugestão por lacuna | inglês; dólar | [preços](https://thatcleanlife.com/pricing) |

**Referências de gamificação (apps de consumidor):** MyFitnessPal usa sequências de registro; Noom e Fabulous usam missões diárias curtas com progressão semanal. Nenhum deles se conecta ao plano de um nutricionista brasileiro. Uma revisão de literatura em português confirma que gamificação (feedback, recompensa, desafio) tende a aumentar motivação e adesão ([Redalyc](https://www.redalyc.org/journal/6257/625767707007/html/)).

### 3.3 Reputação (notas e reclamações)

| Empresa | App Store BR | Google Play | Reclame Aqui | Reclamações mais comuns |
|---|---|---|---|---|
| Dietbox | 4,9 (71 mil) | 4,9 (119 mil) | 9,0/10; 127 reclamações; 100% respondidas; 82,1% resolvidas | cancelamento difícil, cobrança após cancelar, cobrança duplicada, plano anual preso |
| WebDiet | 4,9 (200 mil) | 4,1 (4,14 mil) | 8,23; 31 avaliadas; 96,8% resolvidas | notificações demais e promocionais, instabilidade, cobrança de paciente pelo WebDiet+ |
| Nutrium | 4,0 (193) | não capturei a nota | 5,23; 22 avaliadas; 54,5% resolvidas | desloga, senha, sistema cai, dieta não atualiza, substituições ruins |

### 3.4 Onde está o espaço que ninguém ocupa bem

Mastigado, em quatro frases:

1. **Sugerir o alimento que cobre o micro que falta.** Todo mundo calcula e pinta de vermelho; ninguém diz "coloque 30 g de castanha-do-pará e o selênio fecha". No Brasil não achei nenhum. No exterior só o Cronometer, para consumidor, em dólar e sem tabela brasileira. É o espaço mais limpo.
2. **Missões com mecânica de jogo ligadas ao plano do nutri.** Os apps brasileiros têm meta + check-in + lembrete, mas param aí. Sequências, progressão por semana, missões que nascem sozinhas do plano ("3 refeições do plano", "2 L de água") e um painel de adesão para o nutri não existem juntos em ninguém que eu tenha visto.
3. **O recém-formado no penhasco da formatura.** Ele sai do gratuito e cai em R$ 85 a R$ 95. Os baratos (R$ 30 a 40) existem mas são "Dietbox menor", e o Dietitian já corteja esse público com R$ 29,90 por 3 meses (depois R$ 84,90). Ou seja, o espaço não é o preço: é um produto de R$ 15 a 25 **fixos** que faça as duas coisas acima, sem promoção que dobra no 4º mês, sem fidelidade e sem propaganda no app do paciente.
4. **Confiança.** As piores reclamações são de dinheiro (cancelar, cobrar) e de bugs. "Cancela em um clique, preço fixo, app que não cai" é um posicionamento barato de cumprir quando o produto é pequeno.

---

## 4. Viabilidade como SaaS

### 4.1 Modelos de preço (valores em reais)

| Modelo | Como funciona | Prós | Contras |
|---|---|---|---|
| **A. Freemium com salto na formatura (recomendado)** | Estudante: grátis com limite (ex.: 3 planos por mês e sugestões para 5 micros). **Pro R$ 19,90/mês** ou **R$ 179/ano (≈ R$ 14,90/mês)**: planos ilimitados, todos os micros, exportação em PDF e, na versão 2, missões para pacientes com CRN. | acompanha a vida do usuário; o estudante entra sem atrito; preço abaixo do piso de R$ 30 dos baratos | receita depende de converter na formatura; free tier tem custo de suporte |
| **B. Mensal único e barato** | Sem plano grátis: **R$ 14,90/mês** para todos, 7 dias de teste. | simples de operar; sem "usuário que nunca paga" | estudante compara com o gratuito do Dietbox e não entra |
| **C. Semestral acadêmico** | **R$ 49 por semestre** (≈ R$ 8/mês), alinhado ao calendário da faculdade; **Pro R$ 24,90/mês** para quem tem CRN. | encaixa no bolso e na cabeça do estudante ("é o valor de um trabalho impresso") | duas tabelas de preço para manter; R$ 8/mês só fecha conta em volume |

Recomendo o A: Nutrium já mostra que R$ 19/mês é aceito no Brasil, e o salto na formatura é o gatilho natural.

### 4.2 Custos e quantos assinantes precisa

Custos vistos em 15/09/2026 (dólar R$ 5,09). Salário do dev não incluído.

| Serviço | Grátis | Primeiro plano pago | Observação | Fonte |
|---|---|---|---|---|
| Supabase (banco, login, storage) | 500 MB de banco, 50 mil usuários ativos/mês, 1 GB de arquivos; **pausa após 1 semana sem uso** | Pro US$ 25/mês (R$ 127): 8 GB, 100 mil usuários | a pausa do free é perigosa em produção | [preços](https://supabase.com/pricing) |
| Vercel (front) | Hobby: **só uso não comercial** | Pro US$ 20/mês (R$ 102) por desenvolvedor | para SaaS pago, Hobby não vale | [preços](https://vercel.com/pricing) |
| Cloudflare Pages (front, alternativa) | grátis com uso comercial permitido | | troca o Vercel a custo zero | [Cloudflare Pages](https://pages.cloudflare.com/) |
| Resend (e-mail) | 3.000 e-mails/mês, 100/dia | Pro US$ 20/mês (R$ 102): 50 mil | free aguenta até ~500 usuários | [preços](https://resend.com/pricing) |
| Domínio .com.br | | R$ 40/ano (≈ R$ 3,33/mês) | preço fixo do Registro.br | [Registro.br via HostGator](https://www.hostgator.com.br/blog/quanto-custa-um-dominio/) |
| Stripe Brasil (cobrança) | | 3,99% + R$ 0,39 por cartão nacional; Pix 1,19% (por convite); Billing 0,7% | em R$ 19,90: taxa ≈ R$ 1,32, sobra R$ 18,58 | [preços](https://stripe.com/br/pricing) |
| Mercado Pago Assinaturas (alternativa) | | 4,49% no crédito, sem mensalidade | em R$ 19,90: taxa ≈ R$ 0,89, sobra R$ 19,01; não achei Pix recorrente | [assinaturas](https://www.mercadopago.com.br/ferramentas-para-vender/assinaturas) |

**Três cenários de custo fixo mensal e ponto de equilíbrio** (plano Pro a R$ 19,90, líquido R$ 18,58 após Stripe; tirando ainda 6% de imposto do Simples, sobra ≈ R$ 17,40 por assinante, confirme a alíquota com um contador):

| Cenário | O que tem | Custo/mês | Assinantes para empatar |
|---|---|---|---|
| i. Tudo no gratuito | Supabase Free + Cloudflare Pages + Resend Free + domínio | ≈ R$ 4 | 1 |
| ii. Primeiro plano pago | Supabase Pro + Vercel Pro + Resend Free + domínio | ≈ R$ 232 | 14 |
| iii. ~500 usuários ativos | Supabase Pro + Vercel Pro + Resend Pro + domínio | ≈ R$ 334 | 20 |
| iii + pagar R$ 3.000 de salário | idem | ≈ R$ 3.334 | ≈ 192 |

Ou seja: a infraestrutura se paga com 20 assinantes; o seu tempo começa a se pagar perto de 200. Para referência de tamanho de mercado: 220.152 nutricionistas ativos em 2025 e 22.419 formados só em 2024 ([audiência na Câmara com dados do CFN](https://www2.camara.leg.br/atividade-legislativa/comissoes/comissoes-permanentes/casp/apresentacoes-em-audiencias-publicas/2026/audiencia-publica-07-04-2026-livia-angela-silva)). Não encontrei o número nacional de matrículas em Nutrição; o INEP publica por curso só em planilha. Estimativa minha, não oficial: 22 mil formados por ano vezes 4 a 5 anos de curso dá algo entre 90 e 110 mil estudantes. Nutrição está entre os 10 cursos EaD mais procurados em 2024 ([ranking do Censo](https://www.vestibulandoweb.com.br/ensino/ranking-dos-cursos-mais-procurados-do-brasil-censo-2025-presencial-e-ead/)).

### 4.3 Os três maiores riscos

| Risco | Por que é grave | Como reduzir |
|---|---|---|
| **1. É uma funcionalidade, não um produto.** Dietbox e WebDiet podem copiar "sugerir alimento por micro" em um sprint; o WebDiet já tem a Clara IA. | Se copiarem, seu diferencial some e sobra preço. | Ser rápido e ficar onde eles não olham: o estudante no TikTok e o recém-formado sem dinheiro. Funcionar **ao lado** do software deles (colar plano, importar CSV, QR no PDF) em vez de tentar substituí-los. Acumular dados que são difíceis de copiar: quais sugestões o usuário aceita (o "curtir/não curtir" do Cronometer). |
| **2. O público principal não pode usar a metade "paciente".** Estudante não prescreve (Lei 8.234/1991); um app que facilite isso vira risco jurídico e ético. | Recurso caro de construir e que o alvo não pode usar. | Modo "treino" para estudante (paciente fictício ou ele mesmo). Convite de paciente real só para conta com CRN validado (consulta pública no site do CFN). Missões só na versão 2. |
| **3. Churn e mercado apertado.** Recém-formado tem poucos pacientes e pouca renda; o piso de R$ 30 a 40 já tem três concorrentes; Nutrium cobra R$ 19/mês no anual; Dietitian dá estudante grátis com app do paciente e R$ 29,90 para recém-formado. | Assinante sai no segundo mês; custo de aquisição não volta. | Plano anual com desconto real; medir "ativação" (primeiro plano com sugestão de micro em menos de 10 minutos); conteúdo curto no TikTok/Instagram onde os estudantes já estão; comunidade de recém-formados. |

Risco menor, mas real: **licença da TBCA**. A TACO (UNICAMP) está em repositórios públicos no GitHub ([brolesi/taco](https://github.com/brolesi/taco), [isaquetdiniz/taco-api](https://github.com/isaquetdiniz/taco-api)) e a base do USDA é de domínio público ([FoodData Central](https://fdc.nal.usda.gov/api-guide)). A TBCA (USP, 3.400+ alimentos, mais completa em micros) não publica termos de uso comercial que eu tenha encontrado; escreva para tbca.contato@usp.br antes de embarcar os dados ([TBCA](https://www.tbca.net.br/)). As tabelas de DRI estão públicas no NCBI ([tabelas-resumo](https://www.ncbi.nlm.nih.gov/books/NBK222881/)). A regra "pelo menos 75% da recomendação" que a nutricionista citou **não encontrei em fonte oficial**; o que existe é o método de probabilidade de adequação da DRI e "valores práticos" com 70% de confiabilidade ([RASBRAN](https://www.rasbran.com.br/rasbran/article/view/2619)). Deixe o limite configurável (70%, 75%, 90–110%) em vez de fixar um.

### 4.4 Cuidados legais e éticos antes de lançar

| Tema | O que a regra diz (simples) | O que muda no produto | Fonte |
|---|---|---|---|
| **LGPD: dado de saúde é sensível** | Plano alimentar, peso, doença = "dado pessoal sensível" (art. 5º, II). Tratamento só com consentimento específico e destacado ou para tutela da saúde por profissional (art. 11). Menor de idade: consentimento do responsável (art. 14). | No MVP (estudante, dados fictícios) o risco é baixo. Na versão 2: consentimento explícito do paciente no primeiro acesso, política de privacidade clara, exportar/apagar dados a pedido, senha forte, dados criptografados em repouso (Supabase já faz). | [Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) |
| **LGPD para pequeno porte** | Startups e microempresas não precisam nomear encarregado (DPO), podem manter registro simplificado e têm prazos em dobro; mas precisam de um canal de contato para o titular. | Um e-mail "privacidade@..." publicado já cumpre. | [Resolução CD/ANPD 2/2022](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022) |
| **CFN: quem pode prescrever** | Prescrição dietética é privativa de nutricionista inscrito no CRN. Leigo ou estudante que prescreve comete contravenção. | Estudante nunca envia plano a terceiro pelo sistema. Convite de paciente exige CRN. Texto do produto fala em "treino/simulação" para estudante. | [Lei 8.234/1991](https://www.planalto.gov.br/ccivil_03/leis/1989_1994/l8234.htm), [posicionamento CFN](https://cfn.org.br/posicionamento-prescricao-dietetica/), [exercício ilegal](https://cfn.org.br/exercicio-ilegal-da-profissao/) |
| **CFN: telenutrição** | Resolução CFN 760/2023 (substituiu a 666/2020): atendimento a distância exige cadastro do nutri no e-Nutricionista, termo de consentimento (TCLE) do paciente antes do primeiro atendimento e guarda do prontuário. | Seu app não é teleconsulta, mas se o nutri acompanha o paciente por ele, avise nos termos que a responsabilidade e o TCLE são do nutri; ofereça o modelo de TCLE do CFN para download. Recém-formado precisa do CRN: anuidade 2026 de R$ 599,70 com 50% de desconto no primeiro ano. | [CFN 760/2023](https://cfn.org.br/cfn-publica-resolucao-que-regulamenta-a-telenutricao/), [anuidade CRN-3](https://www.crn3.org.br/p/taxas-e-anuidade-para-nutricionista) |
| **ANVISA: software como dispositivo médico** | RDC 657/2022 regula software com finalidade médica (diagnóstico, tratamento). Software de bem-estar que só acompanha alimentação e hábitos, sem prometer tratar doença, fica fora. | Nunca escreva "trata diabetes" ou "corrige deficiência de ferro" no marketing. Escreva "ajuda a planejar" e "apoia o nutricionista". A decisão é sempre do profissional. | [Perguntas e respostas ANVISA](https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2022/software-como-dispositivo-medico-perguntas-e-respostas) |
| **Consumidor** | Compra online tem 7 dias de arrependimento (CDC art. 49). Cancelamento deve ser tão fácil quanto assinar. | Botão "cancelar" na tela de conta, reembolso automático em 7 dias, sem fidelidade. Isso também responde às piores reclamações dos concorrentes. | [CDC](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm) |
| **Empresa** | Desenvolvimento de software **não pode ser MEI**. Precisa de ME (Simples Nacional). Há projeto de lei (PLP 25/2026) para mudar, ainda não aprovado. | Abrir ME antes de cobrar; contador online. Não pesquisei preço de contador. | [Contabilizei](https://www.contabilizei.com.br/contabilidade-online/mei-para-programador/) |

**Checklist antes de lançar (MVP de micros):**

1. Abrir ME no Simples Nacional (não cabe no MEI).
2. Política de privacidade e termos de uso com e-mail de contato para dados.
3. Texto do produto deixa claro: ferramenta de estudo e apoio; a prescrição é do nutricionista.
4. Sem campo para dados de paciente real no modo estudante (nome fictício obrigatório ou "eu mesmo").
5. Botão de cancelar e apagar conta funcionando desde o dia 1.
6. Fonte dos dados declarada na tela (TACO/USDA; TBCA só com autorização).
7. Limite de adequação configurável, nunca "a regra oficial".
8. Marketing sem promessa de tratar doença.
9. Registro de consentimento (data, versão dos termos) no banco.
10. Antes da versão 2: validação de CRN, TCLE modelo do CFN, consentimento do paciente, plano de resposta a incidente.

---

## 5. Resumo em 5 linhas

1. **Faça primeiro** o "Preenchedor de micros": cola o plano, vê a % de adequação e recebe os alimentos que fecham cada lacuna, com exportação em PDF para a faculdade.
2. **Para** estudantes de nutrição (uso grátis, modo treino) e recém-formados no primeiro ano de CRN (pagante).
3. **Por** R$ 19,90/mês ou R$ 179/ano, sem fidelidade e cancelamento em um clique; estudante grátis com limite.
4. **Missões diárias** para o paciente ficam para a versão 2, só quando houver 10 pagantes com CRN pedindo, porque estudante não pode atender e os concorrentes já têm check-in básico.
5. **A infra se paga com 20 assinantes**; o seu tempo, perto de 200. Antes de cobrar: ME aberta, política de privacidade, texto que não promete tratar doença e resposta da USP sobre a TBCA.

---

## Adendo de 15/09/2026: feedback da nutricionista e o Dietitian

Depois de ver o protótipo, a nutricionista que originou a ideia mandou três recados que mudam prioridades (registro completo em `docs/feedback-nutricionista.md`):

| O que ela disse (paráfrase) | O que confirmei | O que muda |
|---|---|---|
| Precisa de peso, altura e nível de atividade para calcular TMB e GET, porque isso dá as kcal do dia | TMB = taxa metabólica basal; GET = gasto energético total = TMB × fator de atividade. Fórmulas usuais: Mifflin-St Jeor, Harris-Benedict, FAO/OMS | O perfil do caso passa a ter esses campos e a meta de kcal vira o GET. Já está no protótipo v2 |
| O Dietitian tem "escrita inteligente" que otimiza o tempo; no WebDiet ela "tinha que caçar os alimentos" | Dietitian sugere alimentos, medidas caseiras e nutrientes em tempo real enquanto se digita. Planos: Free (5 pacientes), Plus R$ 84,90 após promoção, Estudante grátis com pacientes ilimitados e app (uso comercial vedado), "Recém-formado" R$ 29,90 nos 3 primeiros meses | Entrada rápida de alimentos é requisito de primeira ordem. O Dietitian entra na tabela de concorrentes e derruba "preço para recém-formado" como espaço livre |
| As sugestões de alimentos para adequar micros serão "uma ajuda enorme", porque hoje ela pesquisa fora do software o que incluir | Nenhum concorrente brasileiro faz | Confirma o MVP escolhido |
| "Se não fosse pelo Wellhub eu não iria para Dietbox" | No Dietbox, Wellhub e TotalPass são benefício corporativo para o próprio nutricionista (acesso a academias), não canal de pacientes | Ela fica no Dietbox pelo brinde, não pelo software. Um produto complementar, que funciona ao lado do Dietbox, não briga com isso |

## Adendo 2 de 15/09/2026: entrevista com uma estudante de nutrição

Respostas de uma estudante em estágio (registro completo em `docs/entrevista-estudante-2026-09-15.md`):

| O que ela disse | O que muda |
|---|---|
| Usa o WebDiet gratuito; o que mais irrita é "ter que procurar o alimento"; um plano levava ~2 h; o que mais demora é achar o alimento e adequar os micros | Confirma que entrada rápida + "cobrir" são o produto, tanto para estudante quanto para nutri |
| A regra da faculdade é **90% de adequação** em dieta individual e **50%** em cardápio coletivo, seguindo RDA ou EAR e sem passar do UL | O "75%" da nutricionista não é a regra acadêmica. O limite precisa de presets (90 / 50 / personalizado) e escolha RDA ou EAR |
| Quando um micro fica baixo, pesquisa no **ChatGPT** | O concorrente real da sugestão de alimentos é o ChatGPT, não o Dietbox. Vencemos com porção exata e dados da TACO dentro do plano |
| **Não pode entregar PDF do software**; o trabalho vai em Word ou no modelo do professor; micro inadequado tira nota | A exportação do MVP é tabela para Word (.docx) ou copiar e colar, não PDF |
| Mifflin é a fórmula mais usada, "mas vai de conduta"; fator de atividade varia por sexo | Manter fórmula escolhível e adicionar fatores por sexo |
| Clínica usa gramas; UBS e nutrição social usam medidas caseiras | Gramas bastam no MVP; medidas caseiras entram logo depois |
| Já atende no estágio com preceptora conferindo | "Modo estágio" existe de verdade, mas envolve paciente real: fica para a v2 |
| Pagaria **até R$ 20/mês** como estudante e até R$ 100/mês como profissional | Confirma R$ 19,90 |
| Não segue nenhum perfil de referência; a turma conversa pessoalmente | Divulgação é presencial: sala de aula, professores, grupos de turma, parceria com cursos. TikTok não é o canal |

---

## Fontes

### Concorrentes (Brasil)
- Dietbox preços: https://dietbox.me/pt-BR e https://blog.dietbox.me/assine-este-mes-e-ganhe-bonus-exclusivos-para-nutricionistas/
- Dietbox estudante: https://ajuda.dietbox.me/como-se-cadastrar-no-acesso-gratuito-para-estudantes-do-dietbox
- Dietbox micros: https://blog.dietbox.me/como-calcular-micronutrientes-em-uma-dieta/
- Dietbox App Store: https://apps.apple.com/br/app/dietbox/id648610153 · Google Play: https://play.google.com/store/apps/details?id=com.craftbox.dietbox
- Dietbox Reclame Aqui: https://www.reclameaqui.com.br/empresa/dietbox/
- WebDiet preços: https://pt.webdiet.com.br/assine.php · Estudos+: https://pt.webdiet.com.br/estudosPlus/ · graduação: https://webdiet.com.br/graduacao.php
- WebDiet adesão: https://blog.webdiet.com.br/2026/08/06/app-webdiet-pacientes-adesao-dieta/
- WebDiet App Store: https://apps.apple.com/br/app/webdiet-para-pacientes/id1195115431 · Google Play: https://play.google.com/store/apps/details?id=br.com.webdiet.webdiet
- WebDiet Reclame Aqui: https://www.reclameaqui.com.br/empresa/webdiet-software-nutricao/
- Nutrium preços: https://nutrium.com/pt-br/professionals/pricing · guia: https://nutrium.com/blog/pt-br/guia-de-utilizacao-do-nutrium/
- Nutrium App Store: https://apps.apple.com/br/app/nutrium/id1136652584 · Google Play: https://play.google.com/store/apps/details?id=co.healthium.nutrium&hl=en
- Nutrium Reclame Aqui: https://www.reclameaqui.com.br/empresa/healthium-healthcare-software-solutions-s-a/
- Avanutri: https://www.loja.avanutri.com.br/prod,idproduto,5077878,linha-nutricao-software-software-avanutri-online · estudantes: https://gazetadasemana.com.br/noticia/115012/avanutri-fornece-para-estudantes-acesso-gratuito-a-sua-plataforma-de-saude
- DietSystem: https://www.dietsystem.com.br/melhor-software-nutricionista/ · app: https://apps.apple.com/br/app/dietsystem-para-pacientes/id1551542683
- SimpleDiet: https://simplediet.app/ · Nutriform: https://www.nutriform.app/
- Dietitian: https://dietitian.com.br/ · termos: https://dietitian.com.br/termos · app: https://play.google.com/store/apps/details?id=com.dietitian.dietitian_patient&hl=pt_BR · vídeo "Escrita Inteligente": https://www.youtube.com/watch?v=kZJDd6gvdNU
- Wellhub no Dietbox (benefício ao nutricionista): https://dietbox.me/pt-BR · Wellhub e nutrição: https://mercadoeconsumo.com.br/05/04/2024/inovacao/gympass-vira-wellhub-e-oferece-acesso-a-atividades-fisicas-terapia-nutricao-e-mindfulness/
- Comparativos: https://blog.dietbox.me/qual-o-melhor-software-para-nutricionistas-em-2026-guia-completo/ · https://www.gestaods.com.br/melhores-sistemas-para-nutricionistas/

### Concorrentes (exterior)
- Cronometer Pro: https://cronometer.com/pro/ · Oracle: https://forums.cronometer.com/discussion/306/new-feature-nutrient-oracle-food-suggestions · Gold (secundária): https://nutriscan.app/blog/posts/cronometer-pricing-2026-basic-vs-gold-vs-pro-b28e621201
- MyFitnessPal (secundária): https://www.fitbudd.com/post/myfitnesspal-app-cost
- Practice Better: https://practicebetter.io/compare/practice-better-vs-healthie · (secundária) https://saasrat.com/products/practice-better
- Healthie (secundária): https://softwarefinder.com/emr-software/healthie/pricing
- That Clean Life: https://thatcleanlife.com/pricing
- Gamificação e adesão (revisão): https://www.redalyc.org/journal/6257/625767707007/html/

### Dores e adesão
- Abandono 20–73%: https://www.scielo.br/j/rn/a/D9g8gqBtq44WqqXPhQ7th8L/?format=html&lang=pt
- HC/UFG: https://www.scielo.br/j/rn/a/HKNMLXvBhgKZ9MnhQkyqvgk/?lang=pt
- Obesidade em grupo (78 → 40): https://www.scielo.br/j/rn/a/jPKQWwryjPYt4x6RvvRN3ZH/?lang=pt
- Revisão Demetra: https://www.e-publicacoes.uerj.br/index.php/demetra/article/download/22407/20083
- Barreiras (dislipidemia): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8223790/
- Valores práticos de micronutrientes (RASBRAN): https://www.rasbran.com.br/rasbran/article/view/2619
- Tempo para montar plano: https://blog.dietbox.me/como-montar-dieta-mais-rapido-7-dicas-para-acelerar-a-consulta/ · https://nutrium.com/blog/pt-br/como-criar-um-plano-alimentar-manual-essencial-passo-a-passo/
- TikTok (existência do tema): https://www.tiktok.com/discover/diet-box-para-estudante-como-usar · https://www.tiktok.com/discover/como-usar-webdiet-sendo-estudante-para-fazer-um-caso-clinico-da-faculdade

### Mercado e legal
- CFN/Câmara (220.152 ativos; 22.419 formados em 2024): https://www2.camara.leg.br/atividade-legislativa/comissoes/comissoes-permanentes/casp/apresentacoes-em-audiencias-publicas/2026/audiencia-publica-07-04-2026-livia-angela-silva
- Estatística CFN: https://cfn.org.br/estatistica/ · Ranking Censo 2024: https://www.vestibulandoweb.com.br/ensino/ranking-dos-cursos-mais-procurados-do-brasil-censo-2025-presencial-e-ead/
- Lei 8.234/1991: https://www.planalto.gov.br/ccivil_03/leis/1989_1994/l8234.htm · CFN prescrição: https://cfn.org.br/posicionamento-prescricao-dietetica/ · exercício ilegal: https://cfn.org.br/exercicio-ilegal-da-profissao/
- CFN 760/2023: https://cfn.org.br/cfn-publica-resolucao-que-regulamenta-a-telenutricao/ · anuidade: https://www.crn3.org.br/p/taxas-e-anuidade-para-nutricionista
- LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm · ANPD 2/2022: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022
- ANVISA RDC 657/2022 P&R: https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2022/software-como-dispositivo-medico-perguntas-e-respostas
- CDC: https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm · MEI: https://www.contabilizei.com.br/contabilidade-online/mei-para-programador/

### Custos e dados
- Supabase: https://supabase.com/pricing · Vercel: https://vercel.com/pricing · Resend: https://resend.com/pricing · Stripe: https://stripe.com/br/pricing · Mercado Pago: https://www.mercadopago.com.br/ferramentas-para-vender/assinaturas · Domínio: https://www.hostgator.com.br/blog/quanto-custa-um-dominio/
- Cotações: dólar https://divulgardinheiro.com/cotacao-do-dolar-hoje-moeda-recua-levemente-e-mercado-mira-copom-e-dados-externos/ · euro https://www.remessaonline.com.br/cotacao/cotacao-euro
- TACO: https://github.com/brolesi/taco · https://github.com/isaquetdiniz/taco-api · TBCA: https://www.tbca.net.br/ · USDA: https://fdc.nal.usda.gov/api-guide · DRI: https://www.ncbi.nlm.nih.gov/books/NBK222881/
