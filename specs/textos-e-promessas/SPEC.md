# SPEC — Textos e promessas: um glossário, uma voz e só o que existe

Status: **pedida pelo dono em 21/10/2026; ordem permanente "apenas faça" (sem perguntas: decidir pelas regras e
seguir). Aprovação pelas telas antes de publicar.**

**Fonte (palavras do dono):** "o português, a gramática do site está totalmente incorreta; a landing está com palavras
e frases erradas, repetitivas e sem sentido; isso faz total diferença entre algo feito com cuidado e algo feito sem
cuidado; eu quero vender isso".

**Lido antes:** o plano geral da rodada (decisões 1, 8 e 9 do coordenador), a revisão de texto da rodada (glossário de
25 termos, a landing reescrita e 232 correções por tela, fora do repositório), o levantamento dos concorrentes (§6 e
§7: a "Busca por Nutrientes" da Dietbox lista quem tem mais de um nutriente por 100 g; o que continua sem igual é
calcular a diferença e propor a porção), `PRODUCT.md`, `DESIGN.md`, `specs/site-publico-profissional` (estrutura,
SEO, pré-renderização e a guarda CA-990), `specs/limpeza-visual` (D-75 a D-79: sem tagline, sem repetição) e
`specs/dados-na-nuvem` (DP-26).

**O diagnóstico, em uma linha:** não há erro de ortografia nem de acento no que o usuário vê. O texto parece errado por
fala coloquial no lugar errado ("sai na folha", "dá para", "some"), três vozes para erro ("Não consegui", "Não deu
para", "O MetaNutri não conseguiu"), a palavra "plano" com dois sentidos na mesma tela (dieta e cobrança), repetições
(o Cobrir explicado três vezes na landing) e promessas que o produto não cumpre (Preços diz que o Free não tem a
Adesão, promete "Painel de micros completo" no Pro e uma Clínica com recursos que não existem).

**Skills usadas:** `design:ux-copy` (claro, curto, consistente; erro = o que houve + o que fazer), `marketing:brand-review`
(voz, termos, afirmação sem prova, comparação com concorrente) e `impeccable` (clarify, mantendo o layout aprovado).

**Escopo desta frente** (as outras frentes da rodada cuidam da ficha, da anamnese, da etapa 1, das refeições, dos
alimentos e do Cobrir): landing e páginas públicas, Preços e a descrição das assinaturas, fluxos de conta, checkout,
e-mails, menu, Painel, lista de planos, Adesão e link do paciente, documentos impressos e em Word (textos, não a
quantidade), Configurações, Ajuda, mensagens de erro e telas de administração.

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-400 | **Glossário único** (decisão 1 do coordenador) em todo arquivo desta frente: **assinatura** é a cobrança ("Conta e assinatura", "Sua assinatura", "Ver preços"); **plano alimentar**/"plano" é a dieta; o nome da assinatura com "plano" só em Preços e no checkout ("plano Solo"); **paciente** (nunca "caso", "pessoa" ou "clientela"); **plano impresso** e "Plano alimentar (PDF)" no lugar de "folha da dieta", "folha do paciente" e "Dieta para imprimir"; **logotipo**; **salvos na sua conta** no lugar de "presos à conta"; **Excluir** apaga de vez, **Remover** tira da lista, **Adicionar** põe; **Meus alimentos** no menu; **Preceptor(a)** no lugar de "Responsável técnico"; **Café da manhã**; aspas curvas; "aparece" e "é apagado" no lugar de "sai" e "some" | Um termo por conceito. O choque "Seus planos ficam salvos" ao lado de "Plano escolhido" era o pior caso |
| D-401 | **Uma voz para erro:** "Não foi possível …" seguido do que fazer. Saem "Não consegui", "Não deu para" e "O MetaNutri não conseguiu", também das funções do servidor que a tela mostra (assinar, gerenciar a assinatura e excluir a conta). Para desfazer: "Não é possível desfazer." | O site falava em três vozes; o sistema não é uma pessoa |
| D-402 | **Landing, topo:** o título fica ("Faltou cálcio? O MetaNutri diz o que comer."); a frase de baixo diz para quem é e o que mais faz, sem repetir o título nem os cartões: "Software para nutricionistas. Monte o plano alimentar, entregue em PDF e acompanhe o paciente pelo celular entre as consultas." Os cartões passam a **21** "nutrientes na adequação" (20 vitaminas e minerais e a fibra) e **Até 5** "sugestões de alimento" (para cada nutriente abaixo da meta), os dois levando a "Como funciona". **Sai o cartão "597 alimentos"** (decisão 9) | 597 parece pouco e reforça o "presos a uma base"; o número de sugestões vem de `MAXIMO_SUGESTOES` e diz "até", porque às vezes vêm menos |
| D-403 | **O diferencial contra a busca por nutriente** (decisão 9), dentro de "Como funciona": "Uma lista dos alimentos mais ricos em cálcio não diz quanto pôr no prato. O MetaNutri calcula quanto falta em cada nutriente abaixo da meta, e o botão Cobrir propõe o alimento e a porção, em gramas e em medida caseira, que fecham a diferença." e "As sugestões vêm de grupos diferentes e respeitam as restrições do paciente. Se nem uma porção realista fecha a diferença, a sugestão mostra quanto ela cobre. Você escolhe, e o alimento entra na refeição." **Sem nomear concorrente e sem "o único"** (a D-328 continua) | A frase compara com a função (uma lista por nutriente), que é fato, e não com a empresa, que pediria prova pública. Ela diz exatamente o que o `cobrir.ts` faz: a porção que fecha a falta, limitada a uma porção realista, e quanto cobre quando não fecha |
| D-404 | **Landing, o resto** conforme a revisão de texto: "Monte o plano e cubra o que falta"; "Acompanhe o paciente entre as consultas" (o plano no link só "se você quiser", porque depende da chave; "Você manda o link e os lembretes pelo WhatsApp, com a mensagem pronta"); "Do atendimento ao documento entregue" com os seis recursos, um deles **"Receitas e alimentos próprios"** (o cadastro pelo rótulo e pelo código de barras, resposta ao "presos a uma base"); "Quanto custa" com **Free, Solo e Pro** e a frase "Todos os planos têm as mesmas funções. O preço depende de quantos pacientes ativos você tem: quem teve plano ou missão nos últimos 30 dias."; botão "Comparar planos"; faixa final "Teste com um paciente real" · "Grátis, sem cartão." · "Começar grátis". Macro no Cobrir **não** aparece (decisão 9: só depois do Cobrir de macros) | Uma informação por frase e uma vez só (D-79) |
| D-405 | **As assinaturas só prometem o que existe** (decisão 8). Hoje toda assinatura tem as mesmas funções; muda o limite de pacientes ativos e de links do paciente. `PLANOS` passa a ter só os limites como diferença (`recursos`) e uma lista única, `RECURSOS_EM_TODOS_OS_PLANOS`, cada item com prova num teste: adequação de 20 vitaminas e minerais e da fibra com o botão Cobrir; missões no link do paciente e a tela Adesão; plano impresso em PDF e aconselhamento e memorial em Word; seu logotipo nos documentos impressos; Meus alimentos e receitas. Saem `inclui` e `marcaNoPdf` (o logotipo vale para todos, e o PDF sem logotipo leva o do MetaNutri em qualquer assinatura), a linha "Suporte", "Quem está sumindo… (só nos pagos)", "Painel de micros completo", "Relatório de adesão por paciente", "Modelos próprios de documento", "Histórico de evolução", "Documento no modelo do estágio", "Cadastro de produto por código de barras" como recurso de uma assinatura só e tudo de multiusuário | Cada um desses itens ou não existe ou existe em todas as assinaturas. O Free tem a Adesão |
| D-406 | **Clínica sai da tabela e do preço público.** Em Preços ela vira uma nota, como a do Estudante: "Clínica com mais de um nutricionista: fale com a gente pelo e-mail …" (decisão 8). O JSON-LD, a descrição de Preços e o `llms.txt` deixam de anunciar R$ 149. O plano continua em `PLANOS` (o servidor e o painel do dono contam uma assinatura Clínica feita à mão), marcado como `porContato` | Não há recurso de clínica para vender por R$ 149; anunciar o preço seria prometer o multiusuário |
| D-407 | **Textos das assinaturas:** Free "Para testar com um paciente real, sem cartão." (botão "Começar grátis"); Estudante "Para casos de estudo e estágio supervisionado. Uso não comercial." (botão "Criar conta de estudante"); Solo "Para quem está começando a atender."; Pro "Para quem já tem agenda cheia."; Clínica "Condições combinadas por e-mail." Preços: título "Planos e preços", abertura "Todos os planos têm as mesmas funções. O que muda é quantos pacientes ativos você acompanha.", e a nota do Estudante na concordância certa ("Com o comprovante aprovado, o limite do Free sobe para 10 pacientes e 3 links, por 12 meses ou até a formatura, o que vier antes.") | "Grátis na faculdade, barato ao se formar" era tagline e "barato" desvaloriza; "montando a clientela" é termo de comércio |
| D-408 | **"Conta e assinatura"** no menu, no título da tela, no checkout ("Ver Conta e assinatura"), em Preços, nos Termos e na Privacidade; na tela, o cartão "Seu plano" vira "Sua assinatura" e "Mudar de plano" vira "Ver preços". "Ver planos" vira "Ver preços" no link do paciente e na Adesão. O menu chama "Meus produtos" de **"Meus alimentos"** (a tela é da outra frente) | O sentido de "plano" fica um só na área logada |
| D-409 | **O nome do paciente no que vai ao paciente.** O plano impresso (topo e linha fina), o aconselhamento em Word ("Nome:"), o memorial, o nome do arquivo e o link do paciente (a saudação "Suas missões de hoje, Maria") usam o **nome do paciente vinculado** ao plano; sem paciente vinculado (ou com o nome vazio), o nome do plano; sem os dois, "Paciente sem nome". Uma função só no domínio decide | O nome do plano ("Maria, 28 anos, gestante", "Cópia do plano (cópia 2)") saía como nome do paciente no PDF e no Word |
| D-410 | **Memorial de cálculo legível:** "Referências para homens de 19 a 30 anos" no lugar de "Estágio de vida das referências: masculino-19-30" (a mesma descrição da tela Adequação, numa função de domínio); "Paciente:" com o nome do paciente, ou "Plano:" sem paciente, no lugar de "Caso:"; estados da adequação iguais aos da tabela copiada ("Abaixo da meta", "Adequado", "Acima do limite") | Código interno no documento entregue ao preceptor |
| D-411 | **A missão das verduras conta só verdura e legume.** Ela nasce quando o plano tem alimento da categoria de verduras e hortaliças da TACO que seja verdura ou legume de fato: ficam de fora as leguminosas (feijão, lentilha, grão-de-bico, soja), as raízes e tubérculos (batata, batata-doce, mandioca, cará, inhame, que o Guia Alimentar junta aos cereais), os derivados de amido que a TACO põe entre as verduras (pão de queijo, farinha, farofa, nhoque, fécula, polvilho, biscoito, batata chips) e os temperos (alho, cebolinha, coentro, salsa, manjericão, alfavaca, extrato, molho e purê de tomate). O texto passa a "Comer as verduras e os legumes do plano", com a origem "Verduras e legumes que estão no plano". O id continua `vegetais`, para as marcações dos links já enviados valerem | Hoje um plano só com feijão pedia "Comer os vegetais do almoço e do jantar", mesmo sem verdura e sem almoço |
| D-412 | **Hora no texto corrido:** "Almoço por volta das 12h" (e "12h30"), no lugar de "12:00", nas missões. O campo continua "12:00" | Regra de números do glossário |
| D-413 | **Ajuda:** sai "Cinco minutos até a primeira dieta entregue." (afirmação sem medida) e "Nada aqui é opinião do sistema; são fatos sobre os dados e sobre a lei."; os passos usam "botão Cobrir", "plano impresso", "aconselhamento e memorial em Word" | Promessa de tempo que ninguém mediu; frase com cara de IA |
| D-414 | **E-mails** (`supabase/emails`): "Recebemos um pedido para trocar o e-mail…", "Se você não pediu este código, ignore este e-mail." e, na troca de e-mail, "Se não foi você, não use este código e troque sua senha agora." O dono cola os modelos no painel do Supabase | "Pediram para trocar" é vago; "ignore este e-mail" não protegia quem teve o e-mail trocado por outra pessoa |
| D-415 | **Busca e robôs** coerentes com a landing: título "MetaNutri: software para nutricionistas que diz o que comer" (até 60 letras); descrição "Monte o plano alimentar, veja o que ficou abaixo da meta em 20 vitaminas e minerais e receba o alimento e a porção em medida caseira. Comece grátis."; o texto da imagem de compartilhar descrito como "Logotipo do MetaNutri em fundo verde-petróleo, com a frase “Software de nutrição que diz o que comer”."; o `llms.txt` com os mesmos fatos (Clínica por contato); sai do `index.html` o comentário antigo em inglês ("impeccable:direction… OWN-WORLD…") | O código-fonte é público e o comentário trazia fontes que o site não usa mais |
| D-416 | **Guarda dos termos antigos (CA-1170):** um teste lê o código das telas e textos desta frente (o site público, a conta, o checkout, os e-mails, o menu, o Painel, a lista de planos, a Adesão, o link do paciente, os documentos, Configurações, Ajuda, mensagens e administração) e falha se voltar "Não consegui", "Não deu para", "O MetaNutri não conseguiu", "Conta e plano", "Painel do gestor", "presos à", "Ver planos", "Dieta para imprimir", "Meus produtos" (no menu), "Grátis na faculdade", "Não dá para desfazer", "Cinco minutos", "Responsável técnico" (na tela de Configurações), "mexidos", "Me formei", "folha da dieta", "Sumindo" como rótulo e "597" na landing | O que o dono mandou tirar não volta sem um teste vermelho |
| D-417 | **Fica fora** desta frente o que é das outras (ficha, anamnese, etapa 1, refeições, Tabela de alimentos, Meus alimentos, Receitas, Adequação, Cobrir e as quantidades nos documentos). Os "Não consegui" e "Não deu para" que moram nesses arquivos (`DialogoSugestoes`, `LeitorCodigo`, `DialogoProduto`) ficam para elas; a guarda não lê esses arquivos | Evita conflito entre frentes paralelas |

## 2. Critérios de aceite

### Glossário e voz

- **CA-1170** · Dado o código dos arquivos desta frente (lista em `src/textosDaFrente.test.ts`), quando o teste de
  varredura roda, então nenhum deles tem os termos da D-416; e a lista lê o site público, a conta, o checkout, os
  e-mails, o menu, o Painel, a lista de planos, a Adesão, o link do paciente, os documentos, Configurações, Ajuda, as
  mensagens e a administração, sem ler arquivo de teste nem os arquivos das outras frentes.
- **CA-1171** · Dado uma mensagem de erro desta frente (cartão, assinatura, link do paciente, nuvem, conta, servidor),
  então ela começa pelo que aconteceu na voz "Não foi possível …" (ou é uma instrução direta, como "Confira o número do
  cartão.") e termina dizendo o que fazer; dado um diálogo de exclusão, então ele diz "Não é possível desfazer."
- **CA-1172** · Dado o menu da área de trabalho, então ele mostra "Meus alimentos" e "Conta e assinatura"; dado as
  etapas do plano, então elas se chamam "Paciente e medidas", "Refeições" e "Adequação" (com os apoios "Dados, medidas e
  energia", "Alimentos, substitutos e orientações" e "Vitaminas, minerais e fibra").

### Landing

- **CA-1173** · Dado a landing, então o `h1` é "Faltou cálcio? O MetaNutri diz o que comer.", logo abaixo vem a frase
  da D-402 e os botões "Começar grátis" e "Ver preços"; os cartões são "21 · nutrientes na adequação" e "Até 5 ·
  sugestões de alimento", os dois levando a "Como funciona"; e não existe cartão de alimentos nem o número de alimentos
  da base.
- **CA-1174** · Dado "Como funciona", então a primeira parte se chama "Monte o plano e cubra o que falta" e traz a
  frase da lista por nutriente e a do Cobrir da D-403 (alimento e porção, em gramas e em medida caseira, restrições
  respeitadas, quanto cobre quando não fecha); a segunda se chama "Acompanhe o paciente entre as consultas", com o link
  sem aplicativo nem conta, o plano no link "se você quiser", a tela Adesão com 4 dias sem marcar e o WhatsApp com a
  mensagem pronta.
- **CA-1175** · Dado "Do atendimento ao documento entregue", então ela lista Anamnese e avaliação, Substitutos e trocas,
  Receitas e alimentos próprios, Suplementos e exames, Documentos e Na sua conta, com os textos da D-404.
- **CA-1176** · Dado "Quanto custa", então aparecem Free (R$ 0, "2 pacientes ativos, sem cartão. Estudante com
  comprovante de matrícula: 10."), Solo (R$ 34,90 por mês, 25 pacientes ativos) e Pro (R$ 64,90 por mês, pacientes
  ilimitados), a frase "Todos os planos têm as mesmas funções…" e o botão "Comparar planos"; a faixa final é "Teste com
  um paciente real" · "Grátis, sem cartão." · "Começar grátis".
- **CA-1177** · Dado a landing inteira, então cada informação aparece uma vez: "em gramas e em medida caseira" uma vez,
  "abaixo da meta" no máximo duas, nenhuma frase repete o título, e não aparecem "o único", "nenhum programa",
  "Dietbox", "597", "macro" como coisa que o Cobrir cobre, "presos", "clientela" nem "folha do paciente".

### Preços e as promessas

- **CA-1178** · Dado Preços, então o `h1` é "Planos e preços", a abertura é a da D-407, a tabela compara Free, Solo e
  Pro (sem Clínica e sem Estudante), as duas primeiras linhas são "Pacientes ativos" e "Links do paciente" com os
  números de `PLANOS`, as outras são os recursos de `RECURSOS_EM_TODOS_OS_PLANOS`, marcados nas três colunas, e não há
  linha de suporte; abaixo, a nota do Estudante (botão "Criar conta de estudante") e a nota da Clínica com o e-mail de
  contato; e o rodapé diz "Você cancela quando quiser em Conta e assinatura."
- **CA-1179** · Dado `RECURSOS_EM_TODOS_OS_PLANOS`, então cada item tem uma prova no código: a adequação tem 20
  vitaminas e minerais e a fibra e o Cobrir existe; a rota da Adesão e as missões existem; o plano impresso, o
  aconselhamento e o memorial existem; o logotipo de Configurações vai ao plano impresso; as rotas de Meus alimentos e
  de Receitas existem. Um item sem prova não compila.
- **CA-1180** · Dado os textos de todas as assinaturas (`resumo`, `recursos`, a tabela e o JSON-LD), então nenhum
  promete multiusuário, "até 4 nutricionistas", pacientes compartilhados, painel do gestor, WhatsApp, relatório,
  modelos de documento, "painel de micros", histórico de evolução, marca no PDF por assinatura ou uso sem internet.
- **CA-1181** · Dado o plano Estudante, então o resumo diz "casos de estudo e estágio supervisionado" e "Uso não
  comercial"; dado o Free, então ele aparece com a Adesão (as missões e a tela Adesão estão nos recursos de todos).
- **CA-1182** · Dado a tela de criar conta, então o quadro "No Free você já tem" (ou "Plano escolhido") lista os
  limites da assinatura e os recursos de todas, sem "presos à sua conta"; dado o checkout concluído, então "Liberado
  agora" lista os limites da assinatura paga.

### Busca e robôs

- **CA-1183** · Dado o `dist/index.html`, então o título e a descrição são os da D-415 (até 60 e 155 letras), o texto
  da imagem é o novo e o comentário "impeccable:direction" não existe; dado o JSON-LD, então as ofertas são Free,
  Estudante, Solo (mensal e anual) e Pro (mensal e anual), sem Clínica; dado `dist/precos/index.html`, então o título é
  "Preços do MetaNutri: Free, Solo a R$ 34,90 e Pro a R$ 64,90"; dado o `llms.txt`, então os preços batem com
  `PLANOS`, a Clínica aparece como contato por e-mail e "presos" não aparece.

### Páginas públicas, conta e checkout

- **CA-1184** · Dado Termos, Privacidade e Fontes, então elas aplicam a revisão de texto (§3.4): "vinculados à conta",
  "último acesso", "Conta e assinatura", "são apagados", "o titular tem 7 dias", "Meus alimentos" e "Mostrar o plano
  alimentar no link".
- **CA-1185** · Dado as telas de conta (criar, entrar, senha, código, matrícula, completar cadastro), então elas
  aplicam a §3.5: "Criar conta grátis", "Voltar para entrar", "Se não chegar, confira a caixa de spam." nas duas telas,
  "Este link expirou", "Enviar depois", "Estudante de nutrição" e o e-mail institucional.
- **CA-1186** · Dado o checkout e a assinatura, então eles aplicam a §3.6: "o plano é liberado automaticamente",
  "Equivale a R$ 24,92 por mês.", "Ainda não é possível trocar de plano pago pelo site.", "A assinatura do Solo é
  encerrada e nada mais será cobrado. Você passa para o plano Free.", "sem perder nenhum plano alimentar", "Sua
  assinatura venceu", "3 ou 4 dígitos" e "Este CPF não é válido. Confira os números."
- **CA-1187** · Dado a tela Conta e assinatura, então os cartões se chamam "Sua conta", "Nutricionista" ou "Estudante
  de nutrição" e "Sua assinatura", com o botão "Ver preços"; o cartão de nutricionista diz "Seu nome e seu CRN aparecem
  no plano impresso."; o botão "Já me formei" troca o "Me formei"; e a exclusão diz "Todos os dados são apagados da
  nuvem na hora. Não é possível desfazer."
- **CA-1188** · Dado os modelos de e-mail, então eles têm os textos da D-414 e continuam com o código, sem link e com o
  assunto no comentário do topo (CA-413).

### Área de trabalho

- **CA-1189** · Dado o Painel, então os números dizem "editados nos últimos 30 dias", "cadastrados" e "com atividade
  nos últimos 30 dias"; dado a lista de planos vazia, então ela diz "Cada plano reúne os dados do paciente, as
  refeições e a adequação. Crie o primeiro."; dado renomear, então o exemplo é “Maria Silva, retorno de março”; dado
  o primeiro acesso, então ele diz "Seus planos e pacientes ficam salvos na sua conta."
- **CA-1190** · Dado o cartão do link do paciente e a Adesão, então eles aplicam a §3.13: "Mostrar o plano alimentar no
  link", "Com esta opção ligada, o link mostra o plano alimentar a qualquer pessoa que tenha o endereço.", "Cabe a você,
  nutricionista, obter a autorização do paciente", "Este plano gera N missões.", "Você já usou os N links da sua
  assinatura.", "Ver preços", "Nenhum paciente em acompanhamento", "Parou de marcar" (selo) e "Pararam de marcar" (cartão), "Em acompanhamento", "Sua
  assinatura não tem limite.", "Ainda cabe 1.", "as marcações são apagadas".
- **CA-1191** · Dado a tela do paciente, então ela diz "Dia completo, Maria.", "Você está no ritmo combinado.", "A meta
  é marcar em 4 dias por semana.", "Atualizado em …" e, nas opções, "ou Opção 2"; dado a mensagem de contato do
  WhatsApp, então ela diz "me conte".
- **CA-1192** · Dado um plano com feijão e sem verdura, então não há missão de verduras; dado um plano com alface,
  então a missão é "Comer as verduras e os legumes do plano"; dado batata, mandioca, pão de queijo, farinha de mandioca
  ou só temperos, então não há missão de verduras; e a hora da missão de refeição sai "12h" ou "12h30".
- **CA-1193** · Dado um plano vinculado a "Maria Silva" com o nome "Maria, 28 anos, gestante", então o plano impresso
  (topo e linha fina), o "Nome:" do aconselhamento, o memorial ("Paciente: Maria Silva"), o nome dos arquivos
  (`Maria-Silva-aconselhamento.docx`) e o link do paciente novo usam "Maria Silva"; sem paciente, o nome do plano.
- **CA-1194** · Dado o memorial de um homem de 25 anos, então ele diz "Referências para homens de 19 a 30 anos" e não
  tem "masculino-19-30"; dado os documentos, então aparecem "Plano alimentar (PDF)", "Plano alimentar para imprimir",
  "Alimentos do mesmo grupo, na quantidade equivalente.", "Data da consulta:", "CC (circunferência da cintura)",
  "Aconselhamento nutricional" no título do arquivo e "RECEITAS" no lugar de "RECEITAS SAUDÁVEIS".
- **CA-1195** · Dado Configurações, então o campo se chama "Preceptor(a)", o cartão do logotipo diz "O logotipo aparece
  no alto do plano impresso." e o rodapé diz "Estes dados aparecem no rodapé dos documentos."; a assinatura de estudante
  sem preceptor diz "documento de estudo, sem preceptor(a) informado(a)".
- **CA-1196** · Dado a Ajuda, então ela não tem "Cinco minutos" nem "Nada aqui é opinião", fala em "botão Cobrir",
  "plano impresso" e "aconselhamento e o memorial saem em Word", e "Açúcares e gordura saturada só aparecem nos produtos
  cadastrados pelo rótulo."
- **CA-1197** · Dado as mensagens do sistema (nuvem, armazenamento, servidor ausente) e as telas de administração,
  então elas aplicam a §3.19 e a §3.20: "Seus dados passaram de 5 MB, o limite da conta.", "Liberar espaço", "O servidor
  da conta não está configurado nesta instalação.", "Último acesso" e "Motivo da recusa".

### Navegador

- **CA-1198** · Dado a landing e Preços em 390 e 1280 px, nos temas claro e escuro, então a página não rola para o
  lado, os textos novos aparecem (título, diferencial, Free, Solo, Pro, a nota da Clínica) e os termos da D-416 não
  aparecem; e o HTML pré-desenhado tem os mesmos textos.
- **CA-1199** · Dado o servidor de conta falso, quando a tela Conta e assinatura abre, então o título "Conta e
  assinatura" e o cartão "Sua assinatura" aparecem, e o menu mostra "Meus alimentos".

## 3. Casos de borda

- **CB-380** · Paciente vinculado com o nome vazio, ou vínculo para um paciente excluído: vale o nome do plano; sem os
  dois, "Paciente sem nome".
- **CB-381** · Link do paciente gerado antes desta versão: guarda o nome e os textos das missões da época; a missão de
  verduras continua com o id `vegetais`, então as marcações valem. Gerar o link de novo traz o nome do paciente e o
  texto novo.
- **CB-382** · Plano antigo cujo nome é "Maria, 28 anos": sem paciente vinculado, o link continua saudando "Maria" (a
  regra do primeiro nome não muda).
- **CB-383** · Funções do servidor publicadas antes desta versão: a tela mostra as mensagens antigas até o dono publicar
  as três funções. Nada quebra: o formato da resposta não muda.
- **CB-384** · Modelos de e-mail não colados no painel: os e-mails continuam com o texto antigo; nada quebra.
- **CB-385** · Conta sem o e-mail de contato configurado (`CONTATO_EMAIL` nulo): a nota da Clínica diz "Contato em
  breve." como hoje.
- **CB-386** · Assinatura Clínica feita à mão pelo dono: a tela Conta e assinatura mostra "Clínica · R$ 149,00/mês"
  e "Condições combinadas por e-mail."; o painel do dono continua contando R$ 149.
- **CB-387** · Destaque vindo do aviso de limite apontando para a Clínica (só aconteceria do Pro, que é ilimitado):
  Preços abre sem coluna em destaque.
- **CB-388** · Horário fora do formato "HH:MM" numa missão: o texto usa o horário como veio.
- **CB-389** · Batata, mandioca e similares no plano junto com uma verdura: a missão existe (por causa da verdura).

## 4. Fora de escopo

- As telas e os textos das outras frentes (D-417): ficha, anamnese, etapa 1 ("Pessoa e medidas", "Objetivo",
  "Condição"), refeições ("Desjejum", "Tirar", "Acrescentar"), Tabela de alimentos, Meus alimentos, Receitas,
  Adequação e Cobrir (§3.10, §3.11, §3.12, §3.15 e §3.16 da revisão de texto), e as quantidades nos documentos.
- O Cobrir de macros e a frase "cobre macros" (decisão 9: rodada seguinte).
- O recurso de clínica com vários nutricionistas (só a nota de contato).
- Mudar preços, limites, a cobrança, o SQL e a lógica das funções do servidor (só o texto das mensagens muda).
- A imagem de compartilhar (o texto dela, "Software de nutrição que diz o que comer", continua certo).

## 5. Riscos e decisões para o dono revisar

- **R-400** · A Clínica deixa de mostrar R$ 149 (D-406). Se preferir o preço à vista, ele volta com uma linha, mas
  sem recurso de clínica para listar.
- **R-401** · O diferencial (D-403) não cita a Dietbox nem diz "único": compara com "uma lista dos alimentos mais
  ricos". Nomear o concorrente pede prova pública e pode ser contestado (propaganda comparativa).
- **R-402** · "Até 5" no cartão do topo (D-402) é o máximo do Cobrir; dizer "5" seria prometer cinco sempre.
- **R-403** · As três funções do servidor (assinar, gerenciar-assinatura e excluir-conta) só mudam as mensagens; o
  dono publica as três (comandos no relatório). Os quatro modelos de e-mail são colados no painel do Supabase.
- **R-404** · Os textos que moram nos arquivos das outras frentes (D-417) só ficam coerentes depois da junção.

## Apêndice A — O que foi aplicado da revisão de texto (21/10/2026)

A revisão de texto da rodada numerou 232 correções (fora do repositório). Esta frente aplicou as das seções §1, §2,
§3.1 a §3.9, §3.13, §3.14 e §3.17 a §3.20, e as linhas 136 e 188 que caem na Ajuda. Os desvios, com o motivo:

| Linha | Proposta da revisão | O que ficou | Por quê |
|---|---|---|---|
| 1 | Frase do topo com "adequação de 20 vitaminas e minerais e da fibra" | "Monte o plano alimentar, entregue em PDF e acompanhe o paciente…" | O cartão do lado já diz os 21 nutrientes; a frase repetia o número (D-402) |
| 2 | Cartão "5 sugestões" | "Até 5" | O Cobrir mostra no máximo cinco; às vezes menos (R-402) |
| 6 | Uma frase do Cobrir | Duas frases: a lista por nutriente contra a conta do que falta, e o que as sugestões respeitam | Decisão 9 do coordenador (D-403) |
| 7 e 8 | "consulta o plano alimentar"; "O link e os lembretes vão pelo WhatsApp" | "Se você quiser, o mesmo link mostra o plano alimentar"; "Você manda o link e os lembretes pelo WhatsApp" | O plano no link depende da chave; o envio é da nutricionista, não automático |
| 21 | "…que sugere o que comer" | "…que diz o que comer" | O título com "sugere" passava de 60 letras; "diz" é o do `h1` |
| 22 | "receba a sugestão de alimento e porção" | "receba o alimento e a porção em medida caseira" | Põe o diferencial na descrição da busca |
| 27 e 37 | Clínica "em breve (R$ 149, até 4 nutricionistas)" | Nota "fale com a gente", sem preço | Decisão 8 (D-406, R-400) |
| 31 | "Contratação por e-mail:" | A nota da Clínica com o e-mail como link | A Clínica saiu da tabela |
| 36, 38 a 40 | Tirar as promessas falsas uma a uma | A tabela passou a comparar só os limites e marcar o que vem em todas | Todas as assinaturas têm as mesmas funções (D-405) |
| 150 e 154 | "Sem marcar há 4+ dias" | Selo "Parou de marcar"; cartão "Pararam de marcar" | Rótulo curto que cabe no selo; a regra dos 4 dias continua na explicação e na landing |
| 152 | "Ainda cabem N." | "Ainda cabe 1." no singular | Concordância |
| 156 | "Comer as verduras, os legumes e o feijão do plano" | "Comer as verduras e os legumes do plano", sem contar feijão | D-411: a missão diz o que conta; feijão é outro grupo |
| 160 | "ou Opção 2" | Aplicado | — |
| 189 | Nome do paciente no PDF e no Word | Também no link novo e no nome do arquivo | D-409 |
| 199 | "07:00 – Café da manhã" | O travessão curto; "Desjejum" é da outra frente | §3.11 |
| 200 | "RECEITAS" no lugar de "RECEITAS SAUDÁVEIS" | Fica "RECEITAS SAUDÁVEIS" no Word de estágio | É o nome da seção no modelo do estágio, que o preceptor espera |
| 214 | "Backup restaurado (N tipos de dado)" | Aplicado | — |
| 221 a 230 | Em todo o site | Nos arquivos desta frente | D-417: os das outras frentes ficam com elas |

**Achados além da revisão**, corrigidos aqui: "Ainda cabem 1" (concordância); a frase do limite de links que o banco
levanta continua igual (só identifica o erro) e a tela diz "assinatura" (`LIMITE_DE_LINKS_NO_BANCO`); "Sem nome" no
plano impresso virou "Paciente sem nome"; os estados de macro do memorial ganharam "da faixa"; na Ajuda, "saem em Word"
virou "são gerados em Word"; no segundo fator, "Apague a entrada antiga" virou "Exclua"; no comprovante, "passa de 5
MB. Tire uma foto menor" virou "tem mais de 5 MB. Envie uma foto menor"; o aviso do comprovante recusado virou "Seu
comprovante não foi aprovado"; os testes de navegador que procuravam o título "Plano alimentar" na janela de imprimir
passaram a pedir o nome exato, porque a janela agora se chama "Plano alimentar para imprimir".

**Ficam para as outras frentes** (D-417), achados nesta: `src/ui/caso/CartaoIdentificacao.tsx` ("Confira nome e CRN
em Conta e plano." e o exemplo "Maria, 28 anos…"); `src/domain/receitas.ts` ("rótulo de Meus produtos");
`src/domain/produtos.ts` (categoria "Meus produtos"); `src/ui/produtos/TelaProdutos.tsx` (título "Meus produtos" e
"Não dá para desfazer"); `src/ui/receitas/TelaReceitas.tsx` ("Não dá para desfazer"); `src/ui/plano/DialogoSugestoes.tsx`
("Não deu para salvar"); `src/ui/produtos/LeitorCodigo.tsx` e `DialogoProduto.tsx` ("Não consegui"); `src/domain/plano.ts`
("Desjejum"); e `src/ui/adequacao/TelaAdequacao.tsx`, que pode passar a usar `descreverEstagio` do domínio.
