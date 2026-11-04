# SPEC — O lado do paciente: a tela do link, o link que não se perde e os avisos por e-mail

Status: **aprovada pelo protótipo em 04/11/2026** (`LinkPaciente.dc.html`, `EmailsPaciente.dc.html` e
`AvisosNutri.dc.html`, no canvas "MetaNutri Redesenho"). O dono disse "Apenas faça": as dúvidas foram decididas aqui e
ficam escritas. O plano é `./PLAN.md` (DP-LP-1 em diante); as mudanças que ele trouxe para esta SPEC estão marcadas com
o DP de origem.

**Pedido do dono (03/11/2026):** "vamos melhorar a visualização da tela que o paciente vê no link que o nutri manda,
vamos continuar por ali e manter a ideia do link, vamos melhorar os avisos, por email, se o paciente deixar de abrir ou
clicar em algo na tela, vamos otimizar os avisos no email, e trabalhar melhor com emails". Antes, o problema: "se eu
fechar a aba do navegador, eu perco meu plano e tenho que pedir um link para ela de novo". App nas lojas está fora
(custo). E-mail pelo Resend é prioridade.

**Pesquisa:** `paciente-opcoes.md` (03/11/2026, na pasta `teste-0311` da rodada): como o link funciona hoje, os
concorrentes (Dietbox, WebDiet, Nutrium e MyFitnessPal usam app de loja com senha; as queixas que se repetem são
"desloga toda hora" e "não recupera senha"), as opções 1 a 6 e a base do Resend (limites, cota dividida com os códigos
de conta, subdomínio, DMARC, descadastro, LGPD e Broadcasts). Esta SPEC adota as opções 1, 2, 3, 4, 5a, 5b e 5c. A
opção 6 (conta do paciente) fica fora.

**Lido antes:** `missoes-na-nuvem` (D-103 a D-105), `dieta-no-link` (D-150 a D-159), `whatsapp-e-retorno` (D-140 a
D-149: Próxima consulta e o "hoje" de Brasília), `marca-no-link` (D-950 a D-963, em andamento no ramo `marca-no-link`),
`confirmacao-por-codigo` (D-89: o antivírus do Microsoft 365 abre todo link que chega), `seguranca-lote-3`
(Turnstile), `seguranca-lote-5` e `exclusao-de-conta` (pg_cron, pg_net e a chave do cofre), `ficha-unica` (D-359:
os cartões da ficha), `textos-e-promessas` (D-405), `src/ui/missoes/` (a tela do link, "Meu plano", o cartão do link
e a Adesão), `src/domain/acompanhamento.ts` (`DIAS_PARA_SUMIR` = 4, `DIAS_NA_SEMANA_PARA_EM_DIA` = 4),
`src/domain/missoes.ts`, `src/domain/perfil.ts`, `supabase/001`, `012`, `013` e `014`, e os quatro modelos de
`supabase/emails`.

**Hoje:**
- O link `app.metanutri.com.br/#/missoes/<token>` não expira, mas o app **não lembra** dele: quem abre
  `app.metanutri.com.br` cai no login da nutricionista. O ícone instalado também abre o login.
- O link é **por plano**: plano novo ganha outro link, e "Gerar link novo" mata o antigo.
- A tela tem duas abas (Missões e Meu plano), a barra do dia e "Você marcou missão em X dias desta semana".
- Nenhum e-mail chega ao paciente. O MetaNutri só manda os códigos de conta, pelo SMTP do Supabase, com o Resend.

**Termos usados aqui:**
- **Link fixo:** o endereço único de cada paciente, que mostra o plano vigente dele.
- **Meu plano:** o link instalado como ícone na tela inicial do celular (o "app" do paciente, sem loja).
- **E-mail de serviço:** o que nasce de um pedido do paciente ou de um ato da nutricionista (o link pedido, o plano
  enviado, o endereço trocado). Não pede aceite.
- **Aviso:** o e-mail que se repete (plano atualizado, resumo da semana, lembrete). Só vai com o **aceite** do
  paciente.
- **Aceite:** o "sim" do dono do e-mail, dado num botão de uma página aberta pelo e-mail de confirmação (opt-in
  duplo), guardado com a data e a versão do texto.
- **Descadastro:** sair de um aviso. **Supressão:** a lista de endereços que não recebem mais avisos (devolvidos,
  queixa de spam ou "parar todos").
- **Teto:** o número máximo de e-mails por dia, para não gastar a cota grátis do Resend, que é dividida com os códigos
  de conta.

## 1. Decisões

### 1.1 Ordem e princípio

| # | Decisão | Motivo |
|---|---|---|
| D-1200 | **Três entregas, nesta ordem.** **1. Tela e link (sem custo):** a tela nova do link, o aparelho que lembra, o ícone "Meu plano" e o link fixo. **2. E-mail de serviço (Resend grátis):** o subdomínio de avisos, "Receber meu link por e-mail", "Recuperar meu link", o link enviado pela nutricionista e o aceite. **3. Avisos:** plano atualizado, lembrete, resumo da semana ao paciente, resumo da adesão à nutricionista e o painel de envios. O dono começa a configuração do subdomínio (seção 7) já na entrega 1 | A entrega 1 ataca as três causas de "perdi o link" sem custo. O e-mail é prioridade, mas um subdomínio novo precisa de alguns dias de DNS e de volume baixo antes dos avisos |
| D-1201 | **O link continua sendo a chave.** Sem conta, sem senha, sem loja. Quem tem o endereço vê o primeiro nome, as missões, a dieta e a mensagem da nutricionista, e pode marcar missões, como hoje | É a vantagem sobre os concorrentes, que perdem nota com "desloga toda hora" e "não recupera senha" |

### 1.2 A tela do link

| # | Decisão | Motivo |
|---|---|---|
| D-1202 | **Três partes, numa barra de abas embaixo:** **Hoje**, **Plano** e **Semana**, com ícone e nome, 56 px de altura mais a área segura do celular. Sem a dieta no link, só Hoje e Semana. Abre sempre em Hoje. O topo tem a marca (a logo da nutricionista na placa branca, ou o MetaNutri, como na `marca-no-link`) e o botão **Mais** (três pontos), que abre a folha "Meu plano" (D-1212) | Com o ícone instalado, o link vira app; a barra embaixo fica onde o polegar alcança. Três destinos cabem sem rolar |
| D-1203 | **Hoje, nesta ordem:** o aviso de estágio (conta de estudante, D-958); a data e o título ("Suas missões de hoje, Juliana" ou, com tudo feito, "Dia completo, Juliana."); a barra do dia **em segmentos, um por missão**, com "2 de 4 feitas"; a **mensagem da nutricionista** (D-1208), quando existe; as missões; a **linha da semana** (os 7 dias em pontos, "3 de 7 dias nesta semana" e "A meta é 4 dias." ou "Dentro da meta.", que abre Semana); e o cartão **Instalar** (D-1219), quando cabe | O paciente abre para marcar: as missões ficam na primeira tela. O segmento mostra quanto falta em missões, não em porcentagem |
| D-1204 | **Marcar é satisfatório e rápido.** Ao tocar: a missão encolhe 2% enquanto o dedo está nela; o círculo enche de verde e o traço do visto se desenha (200 ms); a linha ganha o fundo verde (200 ms); o segmento da barra enche (240 ms); o número troca subindo ("2 de 4" vira "3 de 4", 180 ms). No Android, uma vibração de 10 ms. **Com tudo feito**, a barra inteira fica verde, um brilho passa por ela uma vez (600 ms, só na primeira vez do dia) e o título vira "Dia completo, Juliana.". Desmarcar volta na hora (120 ms). **Com "reduzir movimento" ligado no celular**, nada se move nem encolhe: só as cores trocam, em 120 ms, e não há brilho nem vibração. Curvas de saída rápida (`cubic-bezier(0.23, 1, 0.32, 1)`); só `transform`, `opacity` e cor | A marcação é o gesto mais repetido do produto; o retorno imediato é o que faz o paciente voltar. O brilho é raro de propósito: comemorar todo toque vira ruído |
| D-1205 | **A missão de refeição leva ao que comer.** A linha da missão de refeição tem, à direita, o botão "Ver" (44 px, separado do toque que marca), que abre o Plano rolado até aquela refeição. No Plano, cada refeição que é missão tem, no pé do cartão, "Marcar como feita" (ou "Feita hoje", com o visto verde), que marca a mesma missão | O paciente lê a refeição e marca ali mesmo; e quem está em Hoje acha o almoço sem procurar |
| D-1206 | **Plano.** O título "Seu plano alimentar, Juliana"; as refeições em cartões, na ordem do plano, com horário e nome; a primeira refeição cujo horário mais 1 hora ainda não passou leva "Agora" (de 30 minutos antes do horário até 1 hora depois) ou "Próxima" (antes disso), e o Plano abre rolado até ela. **As opções viram um seletor dentro do cartão** ("Opção 1", "Opção 2", "Opção 3"), no lugar da lista com "ou": cada toque mostra uma opção inteira. Cada alimento é uma linha com o nome à esquerda e **as gramas à direita**, em números alinhados; no modo "Medida e gramas", a medida caseira vem embaixo do nome ("4 colheres de sopa"); no "Só medida", a medida fica à direita; no "Só gramas", só as gramas. Depois das refeições, Orientações e Receitas, e "Atualizado em 3 de novembro." | "Gramas acima da medida caseira" é regra do dono desde 27/10. O seletor deixa o cartão curto e mostra que a refeição inteira é trocada (CA-645) |
| D-1207 | **Semana.** "Sua semana"; o número grande "3 de 7 dias", com "A meta é 4 dias." (ou "Dentro da meta." com 4 ou mais); os últimos 7 dias, de hoje para trás, em colunas com o dia da semana e as missões feitas de cada dia ("3/4"), hoje com contorno; as **4 semanas anteriores**, cada uma com as datas e os dias marcados; e a **Próxima consulta**, quando há. Sem cor de enfeite: o dia com missão é verde (estado), o dia sem missão é um traço | É a mesma conta da Adesão (`diasMarcadosNaSemana`); o paciente vê o que a nutricionista vê |
| D-1208 | **Mensagem da nutricionista.** Um texto livre de até 400 caracteres, escrito no cartão "Link do paciente" (D-1214), com "Salvar mensagem". Aparece em Hoje com o nome dela, a data ("Ana Lima · 3 nov.") e, abaixo, a Próxima consulta (D-1209). Mais de 3 linhas fecham com "Ler tudo". Apagar o texto tira o cartão. **A mensagem não vai por e-mail** | É o toque humano que o WhatsApp dá hoje, dentro do plano. Fora do e-mail porque o texto é livre e pode falar de saúde (D-1233) |
| D-1209 | **Próxima consulta no link.** Vem da ficha (`proximaConsulta`, D-143), sobe para o link quando a ficha muda, e some quando passa (D-145): "Próxima consulta: terça, 17 de novembro, às 14:30" | O paciente pergunta "quando volto?"; a data já existe na ficha |
| D-1210 | **Marca.** Vale a `marca-no-link`: a logo no topo, a cor da nutricionista na ação (aba escolhida, barra do dia, botões), o verde de "feita" continua verde, e o MetaNutri pequeno no rodapé de Hoje. **Entra o nome da nutricionista** (do Perfil), na mensagem, na folha "Meu plano" e nos e-mails | O paciente precisa saber de quem é o plano, principalmente quem tem mais de uma nutricionista |
| D-1211 | **Tema e acesso.** O link segue o tema do celular (claro ou escuro), como hoje. Toque de 44 px no mínimo (missões com 64 px), foco visível, leitor de tela ouvindo "Almoço por volta das 12h, feita" (botão de alternar), barra de abas como navegação com a aba atual marcada, e nada rola de lado em 360 px | Celular de qualquer tamanho, com a letra grande do sistema |
| D-1212 | **A folha "Meu plano"** (botão Mais): o nome do paciente e da nutricionista; "Instalar na tela inicial" (some no app instalado); "Receber meu link por e-mail"; "Avisos por e-mail" (com o estado: "Desligados" ou "2 ligados"); e "Esquecer neste aparelho", por último | Um lugar só para o que não é do dia a dia |

### 1.3 O link que não se perde

| # | Decisão | Motivo |
|---|---|---|
| D-1213 | **Endereço novo: `app.metanutri.com.br/p/<token>`**, com um manifesto próprio servido nesse endereço (nome "Meu plano", ícone próprio, começa no próprio endereço). O endereço antigo `#/missoes/<token>` abre e troca para o novo sem recarregar. O token continua com 12 letras e números sorteados | O ícone instalado precisa saber de quem é o plano, também no iPhone, que separa o que o Safari guarda do que o ícone guarda (pesquisa, opção 2) |
| D-1214 | **Um link fixo por paciente.** O link é do paciente, não do plano, e mostra o **plano vigente** dele. Ao terminar um plano novo de quem já tem link, o cartão diz "Juliana já tem link. Atualizar com este plano?" (sim por padrão). Atualizar troca a dieta e as missões e **mantém as marcações** dos dias anteriores. O cartão "Link do paciente" vai para a ficha (depois de Próxima consulta, D-359) e continua no plano. O limite de links da assinatura passa a contar **pacientes com link**, que é o "paciente ativo" da régua de preços | Sem o link fixo, o ícone quebra na próxima consulta e o "perdi o link" volta a cada plano |
| D-1215 | **"Gerar link novo" vira "Trocar o endereço"**, para quando o link vazou. Pede confirmação: "O endereço atual deixa de abrir." Se o paciente tem e-mail no link, o endereço novo vai na hora pelo e-mail "Seu link do plano mudou" (D-1224, S4); sem e-mail, o diálogo sugere o WhatsApp | O paciente não pode ficar sem o plano porque a nutricionista trocou o endereço |
| D-1216 | **Link exige paciente.** Plano sem paciente, ao gerar o link, pergunta "Para quem é este link?", com o nome do plano já escrito, e cria o paciente | O link fixo é do paciente; um plano solto não tem a quem pertencer |
| D-1217 | **Migração.** Na primeira leitura com a versão nova, o link mais recente de cada paciente vira o link fixo. Os mais antigos do mesmo paciente passam a abrir o link fixo (o paciente não perde nada); as marcações deles continuam guardadas. Link de plano sem paciente continua como está até a nutricionista gerar de novo | Ninguém que tem um link hoje fica sem plano na troca |
| D-1218 | **O aparelho lembra.** Ao abrir um link, o navegador guarda o token, o primeiro nome do paciente, o nome da nutricionista e o dia do último acesso (sem dieta e sem missões; a cópia para abrir sem internet, CA-754, continua como é). Guarda até 5 links. Em `app.metanutri.com.br` sem o link, a tela de entrar ganha, acima do login, o cartão "Meu plano" com "Juliana · Ana Lima" e "Abrir". "Esquecer neste aparelho" apaga a memória e a cópia daquele link | Resolve a frase do dono: "fechei a aba e perdi o plano" |
| D-1219 | **Instalar "Meu plano".** **Android (Chrome, Edge, Samsung):** o botão "Instalar" chama o pedido do próprio navegador. **iPhone (Safari):** uma folha com três passos desenhados: tocar em ⋯ (ou em Compartilhar), tocar em "Adicionar à Tela de Início", conferir o nome "Meu plano" e tocar em "Adicionar". **Navegador de dentro do WhatsApp ou do Instagram:** a folha ensina "Abrir no navegador" primeiro. O cartão Instalar aparece em Hoje depois da primeira marcação ou a partir do segundo dia de uso; "Agora não" o esconde por 14 dias, e depois de duas recusas ele fica só na folha "Meu plano". Nunca aparece no app instalado | O iPhone não deixa o site instalar sozinho; pedir no primeiro segundo, antes de o paciente ver valor, é o pedido que todo mundo recusa |
| D-1220 | **"Recuperar meu link".** A tela de entrar ganha "Sou paciente", que abre "Recuperar meu link": o e-mail, a verificação contra robôs (Turnstile, já no site) e "Enviar o link". A resposta é sempre a mesma: "Se este e-mail estiver cadastrado por uma nutricionista, o link chega em instantes." O e-mail "Seu link do plano" (S1) leva os links de todos os planos ligados àquele endereço, um por nutricionista. Até 3 pedidos por hora por e-mail e por endereço de internet | Celular novo ou dados apagados, sem pedir à nutricionista. A resposta igual não revela quem é paciente |
| D-1221 | **"Receber meu link por e-mail", de dentro do link.** O paciente digita o e-mail (se a ficha tem um, ele aparece mascarado, "j•••a@gmail.com", com "Usar este" e "Usar outro") e pode marcar os avisos que quer (D-1226). O link vai na hora (S1, com o nome da nutricionista). Erro comum de digitação ganha a pergunta "Você quis dizer juliana@gmail.com?" (gmial, hotmal, outlok…). Domínio sem servidor de e-mail é recusado na hora: "Confira o e-mail." Até 3 pedidos por dia por link | É o jeito de o paciente ter o link na caixa de entrada sem depender da ficha |
| D-1222 | **Link que não abre mais** (endereço trocado ou link removido): "Este link não abre mais", "Recuperar pelo e-mail" e "O link também está na mensagem da sua nutricionista no WhatsApp." | Hoje a tela só diz para pedir o link de novo |
| D-1223 | **Último acesso.** O link registra o dia em que foi aberto, uma vez por dia (só a data). A Adesão e o cartão do link mostram "Abriu hoje · marcou há 5 dias". O lembrete usa o dado (D-1228) | O dono pediu aviso "se o paciente deixar de abrir ou clicar". Abrir sem marcar e não abrir são situações diferentes para a nutricionista |

### 1.4 Os e-mails

| # | Decisão | Motivo |
|---|---|---|
| D-1224 | **Nove e-mails, de dois tipos.** **Serviço** (sem aceite): S1 "Seu link do plano" (o paciente pediu), S2 "Ana Lima enviou seu plano" (a nutricionista enviou), S3 "Confirme os avisos do seu plano" (o aceite), S4 "Seu link do plano mudou". **Avisos** (só com aceite): A1 "Seu plano foi atualizado", A2 "Sua semana: 5 de 7 dias", A3 "Ainda dá tempo de marcar hoje" (1º lembrete), A4 "Uma semana sem marcar as missões" (2º e último). **À nutricionista:** N1 "Adesão da semana: 3 pararam de marcar". Os textos estão na seção 6 | O paciente sabe por que recebeu cada um. Separar serviço de aviso é o que a LGPD e o Gmail pedem |
| D-1225 | **Quem envia.** Ao paciente: "Ana Lima via MetaNutri" `<avisos@avisos.metanutri.com.br>`; a resposta vai para o e-mail do Perfil dela (ou o da conta, se o Perfil não tem). S1 da recuperação, que pode juntar várias nutricionistas, sai como "MetaNutri". N1 sai como "MetaNutri". Conta de estudante: o topo do e-mail diz "Estágio de nutrição, sob supervisão" no lugar do CRN | O paciente reconhece a nutricionista, não o software. O domínio não recebe e-mail; sem o *Reply-To*, a resposta voltaria |
| D-1226 | **Aceite em dois passos (opt-in duplo).** O paciente marca os avisos na folha "Receber por e-mail" (caixas desmarcadas) ou toca em "Quero receber os avisos" no S2. Chega o S3, com "Confirmar". O botão do e-mail abre uma página, e **o aceite só vale no botão "Confirmar" da página**, nunca ao abrir o endereço (o antivírus do Microsoft 365 abre todo link, D-89). Fica guardado: o tipo, o dia e a hora, a versão do texto ("avisos-v1") e o endereço. Ligar outro aviso depois pede outro S3. Trocar o e-mail do link desliga os avisos até o novo endereço confirmar | Prova o aceite do dono do endereço, que é o que a LGPD pede para mandar e-mail repetido a quem não é cliente do MetaNutri |
| D-1227 | **A nutricionista oferece; o paciente escolhe.** Na ficha, em "Avisos por e-mail", cada aviso tem um interruptor dela ("oferecer") e o estado do paciente ("Recebe", "Esperando o aceite", "Não aceitou", "Saiu em 10/11", "E-mail devolvido"). Desligar vale na hora; ligar não liga nada sozinho: só oferece. Em Configurações, "Oferecer avisos aos pacientes novos" já vem ligado. "Enviar convite" manda o S2 com o pedido de aceite (uma vez por mês, no máximo) | A conduta é da nutricionista: para um paciente com transtorno alimentar, um lembrete pode fazer mal, e ela precisa poder desligar. Mas só o dono do endereço aceita |
| D-1228 | **Lembrete: depois de 3 dias sem marcar.** Às 18h, vai o A3 a quem aceitou e está no **terceiro dia seguido sem marcar nenhuma missão**, contando hoje, e **não abriu o link hoje** (abriu hoje: a regra roda de novo amanhã, e o A3 diz quantos dias são). Se continuar sem marcar, vai o A4 no sétimo dia sem marcar, pelo menos 3 dias depois do A3, e **para**: nenhum lembrete até ele marcar de novo. Nos 2 primeiros dias de um plano novo, não há lembrete. Conta a partir da última marcação, do aceite ou da atualização do plano, o que for mais recente | A Adesão já chama de "Parou de marcar" quem passa 4 dias: o lembrete chega um dia antes. Faltar um dia não atrapalha o hábito; lembrete diário cansa e vira queixa de spam, que é o que pausa o envio no Resend (0,08%). Dois lembretes por pausa, com 4 dias entre eles, e o segundo manda falar com a nutricionista |
| D-1229 | **Resumo da semana: a cada 7 dias, às 8h, no dia da semana em que o paciente aceitou.** Mostra os últimos 7 dias. **Depois de 3 resumos seguidos com zero dia marcado, para sozinho**, e volta quando ele marcar de novo; a nutricionista vê "Pausado: sem uso há 3 semanas" | Espalhar pelos dias da semana divide a cota (300 pacientes dão uns 43 por dia, não 300 na segunda). Mandar resumo vazio para sempre é como se ganha queixa de spam |
| D-1230 | **Plano atualizado.** Ao atualizar o link com um plano novo (D-1214), o diálogo traz "Avisar Juliana por e-mail", marcado quando ela aceitou esse aviso. O A1 sai 30 minutos depois da última atualização (dá tempo de corrigir), um por dia no máximo, e não sai no dia em que a nutricionista mandou o S2 | A nutricionista às vezes atualiza para corrigir uma vírgula; e três atualizações seguidas não podem virar três e-mails |
| D-1231 | **Resumo da adesão, à nutricionista, toda segunda às 7h.** O número de pacientes em dia, em atenção, que pararam de marcar e que não começaram, e a lista de quem parou, com o **primeiro nome, a inicial do sobrenome e os dias sem marcar** (até 8; depois, "e mais 4 na Adesão"), com "Abrir a Adesão". Sem pacientes em acompanhamento, não sai. Já vem ligado em Configurações, com descadastro de um clique | O dono pediu "quem sumiu". Primeiro nome e inicial bastam para ela reconhecer e não expõem a ficha: sem dieta, peso, doença nem plano. Vai para o e-mail dela, que é a controladora dos dados (D-1242) |
| D-1232 | **Horário e frequência.** Ao paciente, só entre 8h e 21h de Brasília (S1 e S3, pedidos por ele, saem na hora). No máximo **1 aviso por dia e 3 por semana** por endereço; se dois caem no mesmo dia, vai o de maior prioridade (D-1237) e o outro vai no dia seguinte ou não vai (lembrete) | Menos e-mail, mais lido |
| D-1233 | **Conteúdo mínimo.** Só o primeiro nome do paciente, o nome da nutricionista, números (dias, missões) e o botão do link. **Nunca** a dieta, o peso, doença, a mensagem da nutricionista nem o nome de um alimento. Assunto neutro. **Sem imagem** e **sem rastreio de abertura e de clique** (o Resend fica com os dois desligados no subdomínio); o que se sabe é se foi entregue e se o link foi aberto (D-1223) | O que vai para a caixa de entrada fica lá para sempre e pode ser encaminhado. Imagem bloqueada e pixel de rastreio pioram a entrega e a privacidade |
| D-1234 | **Desenho do e-mail.** Como os de conta (`supabase/emails`): chão marfim, cartão branco de 480 px, tabela HTML, letra Manrope com Arial de reserva (o Gmail mostra Arial). No topo, o nome da nutricionista e "Nutricionista · CRN-3 12345". O botão é uma pílula de 48 px **na cor da marca dela** com letra branca (a cor já passou no contraste, D-954), ou teal com marfim sem marca. O resumo desenha os 7 dias como células de tabela com o número de missões ("3/4"), nunca só cor. Todo e-mail tem a versão em texto puro. Claro só (`color-scheme: light`): o Gmail escuro escurece sozinho, e o desenho aguenta | Reconhecível, leve e igual em qualquer programa de e-mail |
| D-1235 | **Descadastro em um clique.** Todo aviso e o S2 levam os cabeçalhos `List-Unsubscribe` e `List-Unsubscribe-Post` (RFC 8058): o Gmail e o Apple Mail mostram "Cancelar inscrição", que sai **daquele aviso** num toque. O rodapé tem "Não quero mais receber este aviso", que abre uma página com **um botão** ("Não quero mais receber"; abrir o endereço não descadastra, D-89). Depois: "Pronto. Você não recebe mais o resumo da semana.", "Parar todos os e-mails deste plano" e "Desfazer". Vale sem login e sem prazo. O link de descadastro de um paciente nunca mexe no de outro | É o que o Gmail exige de quem manda muito e o que a LGPD pede para revogar o aceite: tão fácil quanto dar |

### 1.5 Arquitetura

| # | Decisão | Motivo |
|---|---|---|
| D-1236 | **Quem dispara.** O agendamento do banco (`pg_cron` + `pg_net`, como em 013 e 014) chama a função **`avisos`** (Edge Function do Supabase, com a chave do cofre no cabeçalho) em quatro horários: **segunda 7h** (N1), **todo dia 8h** (A1 da noite anterior, A2), **todo dia 18h** (A3, A4) e **a cada 15 minutos, das 8h às 20h45** (só o A1 vencido, DP-LP-10). Outras funções: **`enviar-link`** (a nutricionista logada: S2, S4 e o A1 agendado), **`meu-link`** (pública, com Turnstile ou com o token: S1 e S3), **`avisos-resposta`** (pública: confirmar, descadastrar, desfazer e o POST de um clique) e **`webhook-resend`** (os eventos do Resend: entregue, devolvido, queixa; com a assinatura conferida). O envio usa a API do Resend, em lotes de até 100 por pedido, com no máximo 5 pedidos por segundo (o limite é 10). Os textos ficam em `supabase/functions/_shared/avisos/emails.ts` (DP-LP-9: o deploy das funções só empacota `supabase/functions`) | O banco já tem o agendamento ligado e a chave no cofre; a Cloudflare não precisa saber de e-mail |
| D-1237 | **Tetos (plano grátis do Resend: 100 por dia, 3.000 por mês, zerando às 21h de Brasília).** **30 por dia ficam para os códigos de conta**, que o MetaNutri não conta. As funções do MetaNutri mandam **até 70 por dia**: os avisos param em 45, e o resto fica para o serviço. Por conta de nutricionista, até 30 envios de serviço por dia; por link, 3 pedidos do paciente por dia. **Prioridade** quando o teto chega: serviço > N1 > A1 > A3/A4 > A2. O que não coube: A1, A2 e N1 vão no próximo horário; lembrete não fica para depois (no dia seguinte a regra roda de novo). **No mês:** com 1.900 enviados, os avisos param até o mês virar (ou o Pro); com 2.100, para tudo, menos S1 e S3. Os números moram em variáveis da função (`TETO_DIA`, `TETO_AVISOS_DIA`, `TETO_MES` e `TETO_AVISOS_MES`), para subir sem código novo; sem `TETO_AVISOS_DIA`, vale `TETO_DIA − 25`, e sem `TETO_AVISOS_MES`, `TETO_MES − 200` (DP-LP-11) | Se os e-mails de paciente gastam os 100 do dia, a nutricionista não recebe o código para entrar. O que gasta cota é o aviso, não o serviço |
| D-1238 | **Subdomínio de envio separado: `avisos.metanutri.com.br`**, cadastrado no Resend como outro domínio, com a chave de envio (*Sending access*) presa a ele. Os códigos de conta continuam no domínio de hoje. O envio em massa da fase seguinte terá outro, `novidades.metanutri.com.br` (D-1245) | Uma queixa de spam num lembrete não pode levar os códigos de entrar para a caixa de spam |
| D-1239 | **Reputação.** Devolução definitiva ou queixa de spam põem o endereço na **supressão**: nenhum aviso vai mais para ele, de nenhuma conta; a nutricionista vê "E-mail devolvido: confira na ficha" ou "Pediu para não receber". **Pausa automática:** se, nos últimos 7 dias e com 200 envios ou mais, a devolução passar de 2% ou as queixas de 0,05%, os avisos param e o Painel do dono avisa (o Resend pausa a conta com 4% e 0,08%). Endereço é conferido antes do envio (formato e domínio com servidor de e-mail) | Um endereço errado da ficha não pode estragar a entrega de todo mundo |
| D-1240 | **Painel do dono, parte "E-mails":** enviados hoje (de 70) e no mês (de 2.100), adiados pelo teto nos últimos 7 dias, devolução e queixa em 7 dias, e o estado ("Enviando" ou "Pausado: motivo"), com "Retomar" | O dono decide a hora do Pro olhando um número, não um susto |
| D-1241 | **Plano do Resend.** Fica no grátis enquanto o mês passa abaixo de 1.900 e o teto do dia adia avisos em menos de 3 dias por semana. Passando disso, **Resend Pro (US$ 20 por mês, cerca de R$ 100)**: 50 mil por mês e sem teto diário; os tetos sobem para `TETO_DIA` 1.500 e `TETO_MES` 45.000 | Com cerca de 300 pacientes recebendo resumo e lembrete, o grátis acaba |

### 1.6 LGPD

| # | Decisão | Motivo |
|---|---|---|
| D-1242 | **O e-mail do paciente é da nutricionista.** Ela é a controladora; o MetaNutri é o operador e só usa o endereço para o que ela e o paciente pediram: o link, os avisos aceitos e os e-mails que ela manda. **Nunca** para propaganda do MetaNutri, **nunca** nos Contatos ou Segmentos do Resend (os e-mails de paciente saem só pela API de envio) e nunca em pesquisa ou estatística fora da conta dela | LGPD, art. 39: o operador trata o dado só nas instruções do controlador |
| D-1243 | **O que fica guardado e por quanto tempo.** O aceite (tipo, data, versão do texto) enquanto o link existir e mais 6 meses, para provar o aceite; o histórico de envios (tipo, assunto, estado, data), 6 meses; a supressão guarda só o resumo (*hash*) do endereço, para sempre, para nunca mais mandar. Excluir a conta ou o paciente apaga link, e-mail, aceites e envios (`exclusao-de-conta`); a supressão fica | Guardar o mínimo pelo menor tempo, e ainda conseguir respeitar quem saiu |
| D-1244 | **Política de privacidade e consentimento.** A Política ganha: o e-mail do paciente serve para mandar o link, os avisos que ele aceitou e os e-mails da nutricionista; o link registra o dia em que foi aberto; o Resend é suboperador (já é, nos códigos de conta). A pergunta de autorização do cartão do link passa a falar do e-mail. A versão dos textos sobe | O paciente precisa saber disso antes, não depois |

### 1.7 Fase seguinte (não desenhada)

| # | Decisão | Motivo |
|---|---|---|
| D-1245 | **E-mail em massa para a base do MetaNutri (Resend Broadcasts), depois desta SPEC.** O mínimo, para quando vier: **só nutricionistas e estudantes com conta, nunca paciente**; **aceite próprio**, numa caixa **desmarcada** em Criar conta ("Quero receber novidades do MetaNutri por e-mail"), com data e versão, e, para quem já tem conta, um pedido no app; **segmentos** Free, Estudante, Solo, Pro e Clínica; um **tópico** só, "Novidades do produto", que só recebe quem entrou; **descadastro** pelo `{{{RESEND_UNSUBSCRIBE_URL}}}` em todo e-mail, com quem sai virando "não quer novidades" no MetaNutri (webhook de contatos); subdomínio **`novidades.metanutri.com.br`**; e-mail de serviço (cobrança, segurança, códigos) separado de novidade. Vira SPEC própria, com protótipo | O grátis de marketing aceita 1.000 contatos e não gasta a cota dos avisos; misturar a base de pacientes seria uso para fim próprio (D-1242) |

## 2. Critérios de aceite

### 2.1 A tela do link

- **CA-2200** · Dado um link com dieta, então a tela tem a barra embaixo com Hoje, Plano e Semana, abre em Hoje, e a aba atual fica marcada (cor da marca, `aria-current`); dado um link sem dieta, então a barra tem Hoje e Semana.
- **CA-2201** · Dado Hoje, então a ordem é: aviso de estágio (só conta de estudante), data, título, barra do dia, mensagem (se houver), missões, linha da semana e cartão Instalar (se couber); a primeira missão aparece na primeira tela de um celular de 390 × 844.
- **CA-2202** · Dado 4 missões e 2 feitas, então a barra tem 4 segmentos, 2 cheios, e diz "2 de 4 feitas"; dado 0 missões, então aparece "Seu plano ainda não tem missões." e não há barra.
- **CA-2203** · Dado uma missão, quando o paciente toca, então ela fica feita (verde, com o visto, `aria-pressed="true"`), o segmento enche e o número muda, e a marcação vai para a nuvem como hoje (`marcar_missoes`); quando toca de novo, então volta.
- **CA-2204** · Dado a última missão do dia, quando o paciente marca, então a barra fica toda verde, o título vira "Dia completo, Juliana." e o brilho passa uma vez; quando ele desmarca e marca de novo no mesmo dia, então não há brilho.
- **CA-2205** · Dado "reduzir movimento" ligado no celular, então marcar troca só as cores (sem encolher, sem visto desenhado, sem número subindo, sem brilho, sem vibração), e nada fica escondido esperando animação.
- **CA-2206** · Dado uma missão de refeição, então ela tem "Ver" (rótulo para o leitor de tela: "Ver o almoço no plano"); quando o paciente toca em "Ver", então abre o Plano rolado até a refeição, e a missão não é marcada.
- **CA-2207** · Dado o Plano, então cada refeição que é missão tem "Marcar como feita"; quando o paciente toca, então a missão de Hoje fica feita; dado a missão já feita, então o pé diz "Feita hoje" com o visto, e tocar desmarca.
- **CA-2208** · Dado uma refeição com 3 opções, então o cartão mostra o seletor "Opção 1", "Opção 2", "Opção 3" e só os alimentos da opção escolhida; dado uma opção só, então não há seletor.
- **CA-2209** · Dado o modo "Medida e gramas", então cada alimento mostra o nome, as gramas à direita ("100 g") e a medida embaixo do nome ("4 colheres de sopa"); "Só gramas" mostra só as gramas; "Só medida", a medida à direita; alimento sem medida conhecida mostra as gramas (CB-156).
- **CA-2210** · Dado café às 7:00 e almoço às 12:30, às 9:41 o almoço tem "Próxima"; às 12:10 e às 13:20, "Agora"; às 13:31, o lanche seguinte tem "Próxima"; o Plano abre rolado até a refeição marcada; depois da última refeição mais 1 hora, nenhuma tem rótulo e o Plano abre no topo.
- **CA-2211** · Dado Semana, então aparecem "3 de 7 dias", "A meta é 4 dias." (ou "Dentro da meta." com 4 ou mais), os 7 dias com as missões de cada um ("3/4", ou um traço sem missão), hoje com contorno, as 4 semanas anteriores com as datas e os dias, e a Próxima consulta quando houver; os números batem com a Adesão da nutricionista para o mesmo paciente e o mesmo dia.
- **CA-2212** · Dado uma mensagem salva no cartão do link, então Hoje mostra "Ana Lima · 3 nov." e o texto; com mais de 3 linhas, "Ler tudo" abre o resto; dado a mensagem apagada, então o cartão some do link.
- **CA-2213** · Dado a mensagem com 401 caracteres, então o cartão do link não salva e diz "Até 400 caracteres."; dado a mensagem salva, então nenhum e-mail a contém.
- **CA-2214** · Dado uma Próxima consulta na ficha, então o link mostra "Próxima consulta: ter., 17/11, às 14:30" em Hoje, abaixo da mensagem, e "Próxima consulta: terça, 17 de novembro, às 14:30" em Semana; quando a ficha muda, então o link muda sem link novo; quando a consulta passa (D-145), então some.
- **CA-2215** · Dado uma conta com marca salva, então valem os CA-1965 a CA-1973 da `marca-no-link`, com a aba escolhida da barra de baixo e "Marcar como feita" na cor dela; e o nome da nutricionista aparece na mensagem e na folha "Meu plano".
- **CA-2216** · Dado o celular no tema escuro, então o link fica escuro (D-955 para a cor da marca); dado o claro, então fica claro.
- **CA-2217** · Dado o leitor de tela, então a barra de baixo é navegação com três links nomeados, a missão é botão de alternar com o nome e o estado, "Ver" é botão com o nome da refeição, o seletor de opções é um grupo de abas, e tudo funciona com o teclado.
- **CA-2218** · Dado 360, 390 e 412 px, com a letra do sistema em 200%, então nada rola de lado, a barra de baixo não cobre a última missão, e todo alvo tem 44 px ou mais.
- **CA-2219** · Dado o botão Mais, então abre a folha "Meu plano" com o nome do paciente e da nutricionista, "Instalar na tela inicial" (fora do app instalado), "Receber meu link por e-mail", "Avisos por e-mail" com o estado e "Esquecer neste aparelho" por último.

### 2.2 O link que não se perde

- **CA-2220** · Dado o endereço antigo `#/missoes/k7Q2mX9pLa3R`, quando o paciente abre, então a tela é a mesma e o endereço vira `app.metanutri.com.br/p/k7Q2mX9pLa3R`, sem recarregar.
- **CA-2221** · Dado `app.metanutri.com.br/p/<token>`, então a página aponta para um manifesto com o nome "Meu plano", o ícone do Meu plano e o começo em `/p/<token>`; dado o ícone instalado, quando o paciente toca, então abre o plano daquele token, sem barra de endereço, no Android e no iPhone (teste num aparelho de verdade, seção 7).
- **CA-2222** · Dado um paciente com link e um plano novo dele, quando a nutricionista termina o plano, então o cartão pergunta "Juliana já tem link. Atualizar com este plano?"; com "Atualizar", o mesmo endereço passa a mostrar a dieta e as missões novas, e as marcações dos dias anteriores ficam.
- **CA-2223** · Dado "Trocar o endereço", então o diálogo diz "O endereço atual deixa de abrir." e, com e-mail no link, "Juliana recebe o novo em j•••a@gmail.com."; quando a nutricionista confirma, então o antigo mostra "Este link não abre mais" e o S4 sai na hora; sem e-mail, o diálogo oferece o WhatsApp.
- **CA-2224** · Dado um plano sem paciente, quando a nutricionista gera o link, então aparece "Para quem é este link?" com o nome do plano escrito; confirmar cria o paciente e o link é dele.
- **CA-2225** · Dado uma conta com dois links do mesmo paciente (antes desta versão), quando ela abre a versão nova, então o mais recente vira o link fixo, o antigo abre o fixo, e a Adesão mostra um paciente só; o limite da assinatura conta 1.
- **CA-2226** · Dado o Free, com 2 pacientes com link, quando a nutricionista gera link para o terceiro, então aparece o aviso de limite de hoje (CA-442), com "pacientes" no lugar de "links".
- **CA-2227** · Dado um link aberto uma vez, quando o paciente abre `app.metanutri.com.br` no mesmo navegador, então vê, acima do login, o cartão "Meu plano" com "Juliana · Ana Lima" e "Abrir"; com 2 links lembrados, os dois; com 6, só os 5 mais recentes.
- **CA-2228** · Dado "Esquecer neste aparelho", então aparece "Esquecer o plano neste aparelho?" com "Esquecer" e "Cancelar"; confirmando, então o cartão some da tela de entrar e a cópia sem internet daquele link é apagada; o link continua abrindo para quem tem o endereço.
- **CA-2229** · Dado o Chrome do Android com o pedido de instalação disponível, quando o paciente toca em "Instalar", então abre o pedido do navegador; instalado, o cartão some e não volta.
- **CA-2230** · Dado o Safari do iPhone, quando o paciente toca em "Instalar", então abre a folha com os três passos desenhados (⋯ ou Compartilhar; "Adicionar à Tela de Início"; "Adicionar"), com o nome "Meu plano" e o ícone.
- **CA-2231** · Dado o link aberto no navegador de dentro do WhatsApp ou do Instagram, então a folha de instalar mostra primeiro "Abrir no navegador", com o passo desenhado.
- **CA-2232** · Dado a primeira abertura, então o cartão Instalar não aparece; depois da primeira marcação, ou no segundo dia de uso, aparece; "Agora não" o esconde por 14 dias; depois de duas recusas, só a folha "Meu plano" oferece; no app instalado, nunca.
- **CA-2233** · Dado "Sou paciente" na tela de entrar, então abre "Recuperar meu link" com o e-mail, o Turnstile e "Enviar o link"; para qualquer e-mail, cadastrado ou não, a resposta é "Se este e-mail estiver cadastrado por uma nutricionista, o link chega em instantes."; com cadastro, o S1 leva um link por nutricionista.
- **CA-2234** · Dado o quarto pedido de recuperação na mesma hora para o mesmo e-mail ou do mesmo endereço de internet, então nenhum e-mail sai e a resposta é a mesma (CA-2233).
- **CA-2235** · Dado "Receber meu link por e-mail" num link cuja ficha tem e-mail, então o campo mostra "j•••a@gmail.com" com "Usar este" e "Usar outro"; sem e-mail na ficha, o campo vazio; quando o paciente envia, então o S1 sai na hora e a folha diz "Enviamos o link para j•••a@gmail.com.".
- **CA-2236** · Dado "juliana@gmial.com", então a folha pergunta "Você quis dizer juliana@gmail.com?" e um toque corrige; dado um domínio sem servidor de e-mail, então "Confira o e-mail." e nada sai.
- **CA-2237** · Dado o quarto pedido do dia no mesmo link, então nada sai e a folha diz "Você já pediu 3 vezes hoje. Tente amanhã."
- **CA-2238** · Dado um link removido ou de endereço trocado, então a tela diz "Este link não abre mais", tem "Recuperar pelo e-mail" e a frase do WhatsApp.
- **CA-2239** · Dado o link aberto 3 vezes no mesmo dia, então a nuvem guarda um último acesso, com só a data; dado a Adesão, então a linha diz "Abriu hoje · marcou há 5 dias" (ou "Nunca abriu").

### 2.3 Avisos ao paciente

- **CA-2240** · Dado a folha "Receber por e-mail", então as três caixas de aviso ("Quando o plano mudar", "Resumo da semana", "Lembrete se eu ficar 3 dias sem marcar") vêm desmarcadas; com alguma marcada, além do S1 sai o S3, e a folha diz "Para receber os avisos, toque em Confirmar no e-mail."
- **CA-2241** · Dado o S3, quando o endereço do botão é aberto (por gente ou por antivírus), então nada é aceito; só o botão "Confirmar" da página registra o aceite, com o tipo, a data e a hora e a versão "avisos-v1"; a página diz "Pronto. Você vai receber: Resumo da semana, Lembrete."
- **CA-2242** · Dado um aviso não oferecido pela nutricionista para aquele paciente, então ele não aparece na folha nem no S2, e o aceite antigo dele fica sem efeito enquanto ela não oferecer de novo.
- **CA-2243** · Dado o S2 com avisos oferecidos e ainda não aceitos, então ele tem o bloco "Avisos por e-mail" com "Quero receber os avisos", que leva à página do aceite com os avisos oferecidos marcados e "Confirmar".
- **CA-2244** · Dado um paciente com o lembrete aceito, última marcação no dia 1 e nenhuma abertura do link no dia 4, então às 18h do dia 4 sai o A3; dado que ele abriu o link no dia 4, então não sai; dado que ele marcou no dia 3, então não sai.
- **CA-2245** · Dado o A3 no dia 4 e nenhuma marcação depois, então às 18h do dia 8 sai o A4; dado o A3 no dia 6 (o paciente abriu o link nos dias 4 e 5), então o A3 diz "faz 5 dias" e o A4 sai no dia 9; depois do A4, nenhum lembrete sai até a próxima marcação; depois dela, a conta recomeça.
- **CA-2246** · Dado um plano atualizado no dia 10, então não há lembrete nos dias 10 e 11, e os 3 dias contam a partir do dia 10.
- **CA-2247** · Dado um aceite do resumo numa quinta, então o A2 sai toda quinta às 8h, com os últimos 7 dias (de quinta a quarta), o número de dias marcados, as missões de cada dia e a frase da meta.
- **CA-2248** · Dado 3 A2 seguidos com zero dia marcado, então o quarto não sai; o estado vira "Pausado: sem uso há 3 semanas" na ficha; quando o paciente marca de novo, então o próximo dia do resumo volta a mandar.
- **CA-2249** · Dado "Avisar Juliana por e-mail" marcado ao atualizar o link, então o A1 sai 30 minutos depois da última atualização; dado duas atualizações em 20 minutos, então sai um; dado o S2 no mesmo dia, então o A1 não sai; dado uma atualização às 22h, então sai às 8h.
- **CA-2250** · Dado um A2 e um A3 para o mesmo endereço no mesmo dia, então só sai o de maior prioridade (D-1237); dado 3 avisos na semana para o mesmo endereço, então o quarto não sai.
- **CA-2251** · Dado qualquer aviso, então o horário de saída fica entre 8h e 21h de Brasília.
- **CA-2252** · Dado um aviso ou o S2, então ele tem `List-Unsubscribe` com um endereço https (sem `mailto`) e `List-Unsubscribe-Post: List-Unsubscribe=One-Click`; quando o Gmail manda o POST de um clique, então o paciente sai daquele aviso, sem página.
- **CA-2253** · Dado "Não quero mais receber este aviso" no rodapé, então abre a página com o botão; abrir não descadastra; tocar no botão descadastra daquele aviso e mostra "Pronto. Você não recebe mais o resumo da semana.", "Parar todos os e-mails deste plano" e "Desfazer"; "Desfazer" volta como estava, sem novo S3.
- **CA-2254** · Dado "Parar todos os e-mails deste plano", então os avisos daquele link saem, o S2 daquele link deixa de sair (o botão da nutricionista diz "Juliana pediu para não receber e-mails") e o S1 pedido pelo próprio paciente continua.
- **CA-2255** · Dado o link de descadastro de um paciente, então ele só mexe nos avisos daquele link; uma chave alterada à mão é recusada ("Este endereço não vale.").
- **CA-2256** · Dado a folha "Avisos por e-mail" com avisos ligados, então ela mostra o endereço mascarado e um interruptor por aviso; desligar vale na hora; ligar um aviso manda o S3 daquele aviso.
- **CA-2257** · Dado o e-mail do link trocado (pelo paciente ou pela ficha), então os avisos ficam desligados até o novo endereço confirmar.
- **CA-2258** · Dado um link de conta de estudante, então os e-mails trazem "Estágio de nutrição, sob supervisão" no topo, no lugar do CRN.
- **CA-2259** · Dado o paciente que respondeu a um e-mail, então a resposta vai para o e-mail do Perfil da nutricionista (ou o da conta).

### 2.4 A nutricionista

- **CA-2260** · Dado a ficha de um paciente com link, então há o cartão "Link do paciente" (endereço, Copiar, WhatsApp, E-mail, o plano que está no link, "Mostrar a dieta no link", a mensagem e "Trocar o endereço"), e o cartão "Avisos por e-mail" com o endereço e a origem ("da ficha" ou "confirmado por Juliana em 03/11"), os três avisos com o interruptor dela e o estado do paciente, e "Enviados".
- **CA-2261** · Dado um paciente sem e-mail na ficha e sem e-mail confirmado, então "Avisos por e-mail" diz "Sem e-mail" com "Cadastrar na ficha", que abre a ficha no campo E-mail.
- **CA-2262** · Dado "E-mail" no cartão do link, então o diálogo diz "Enviar o link para juliana.martins@gmail.com?" com "Enviar"; quando ela envia, então sai o S2 e "Enviados" ganha a linha; dado o trigésimo primeiro envio de serviço da conta no dia, então o diálogo diz "Você chegou a 30 e-mails hoje. Amanhã volta." e nada sai.
- **CA-2263** · Dado o interruptor de um aviso desligado pela nutricionista, então nenhum aviso daquele tipo sai para o paciente a partir dali, e o estado mostra "Desligado por você".
- **CA-2264** · Dado "Enviados", então cada linha tem o dia e a hora, o tipo (Serviço ou Aviso), o assunto e o estado ("Entregue", "Enviado", "Devolvido", "Adiado pelo teto", "Não saiu: pausado"), dos últimos 30 dias, e a linha "Próximo: Resumo da semana, quinta, 5/11, 8h" quando há.
- **CA-2265** · Dado um e-mail devolvido, então o cartão diz "O e-mail voltou: o endereço não existe. Confira na ficha. Nenhum aviso vai até corrigir.", os avisos mostram "E-mail devolvido", o botão "E-mail" do link fica desativado e nenhum aviso sai para o endereço; quando a nutricionista corrige o e-mail na ficha, então o estado vira "Sem aceite" e "Enviar convite" aparece.
- **CA-2266** · Dado Configurações, então há "E-mails" com "Resumo da adesão às segundas" (ligado), "Oferecer avisos aos pacientes novos" (ligado) e "Respostas dos pacientes vão para" com o e-mail do Perfil.
- **CA-2267** · Dado uma conta com pacientes em acompanhamento, então toda segunda às 7h sai o N1 com os quatro números, até 8 nomes dos que pararam de marcar (primeiro nome, inicial, dias) e "Abrir a Adesão"; com mais de 8, "e mais 4 na Adesão"; sem pacientes em acompanhamento, nada sai; com o resumo desligado, nada sai.
- **CA-2268** · Dado o N1, então ele não tem dieta, peso, doença, telefone, e-mail de paciente nem sobrenome inteiro.
- **CA-2269** · Dado a Adesão, então cada paciente com aviso aceito tem o ícone de envelope com o rótulo "Recebe avisos por e-mail" para o leitor de tela, e a linha diz o último acesso (CA-2239).

### 2.5 Servidor, tetos e reputação

- **CA-2270** · Dado o agendamento, então existem quatro chamadas da função `avisos` (segunda 7h, todo dia 8h e 18h de Brasília, e a do A1, a cada 15 minutos das 8h às 20h45; DP-LP-10), com a chave do cofre; uma chamada sem a chave recebe 401 e não envia nada.
- **CA-2271** · Dado 70 e-mails enviados pelas funções no dia (contados no dia do Resend, que vira às 21h de Brasília), então nenhum outro sai até virar; os que não saíram ficam "Adiado pelo teto" e seguem a regra do D-1237.
- **CA-2272** · Dado 45 avisos no dia, então os avisos param e o serviço continua até 70.
- **CA-2273** · Dado 1.900 enviados no mês, então os avisos param até o mês virar e o Painel do dono mostra "Avisos pausados: cota do mês"; dado 2.100, então só S1 e S3 saem.
- **CA-2274** · Dado `TETO_DIA`, `TETO_AVISOS_DIA` e `TETO_MES` trocados nos segredos da função, então os novos tetos valem na próxima chamada, sem publicar código.
- **CA-2275** · Dado 230 avisos na mesma chamada, então eles saem em 3 pedidos em lote (100, 100, 30), e uma resposta 429 do Resend deixa os que faltaram como "Adiado pelo teto", sem repetir os que saíram.
- **CA-2276** · Dado a mesma chamada repetida (a rede caiu e o banco chamou de novo), então ninguém recebe o mesmo aviso duas vezes (cada envio tem uma chave única por endereço, tipo e dia).
- **CA-2277** · Dado o evento "devolvido" (definitivo) ou "queixa" do Resend, com a assinatura certa, então o endereço entra na supressão e o envio fica com o estado; dado o evento com a assinatura errada, então nada muda.
- **CA-2278** · Dado devolução acima de 2% ou queixa acima de 0,05% nos últimos 7 dias, com 200 envios ou mais, então os avisos param e o Painel do dono mostra "Pausado: devolução 2,4%" com "Retomar".
- **CA-2279** · Dado um e-mail de aviso, então ele sai de `avisos@avisos.metanutri.com.br`, com DKIM do subdomínio, e os códigos de conta continuam saindo do domínio de hoje.
- **CA-2280** · Dado os e-mails, então nenhum tem imagem, pixel ou link reescrito pelo Resend (rastreio desligado), e todos têm a versão em texto puro.
- **CA-2281** · Dado o Painel do dono, então a parte "E-mails" mostra enviados hoje (de 70) e no mês (de 2.100), adiados nos últimos 7 dias, devolução e queixa em 7 dias e o estado.
- **CA-2282** · Dado a chave do Resend, então ela é só de envio, presa ao subdomínio de avisos, guardada como segredo das funções (`RESEND_API_KEY`) e nunca vai ao navegador.

### 2.6 LGPD e textos

- **CA-2283** · Dado os Contatos e Segmentos do Resend, então nenhum e-mail de paciente está lá; dado qualquer e-mail do MetaNutri que não seja um dos nove desta SPEC, então ele nunca vai para endereço de paciente.
- **CA-2284** · Dado a exclusão da conta ou do paciente, então o link, o e-mail, os aceites e os envios são apagados; a supressão continua só com o resumo do endereço.
- **CA-2285** · Dado envios com mais de 6 meses, então a rotina diária apaga (como D-259).
- **CA-2286** · Dado a Política, então ela diz para que serve o e-mail do paciente, que o link registra o dia do acesso e que o Resend é suboperador; a versão dos textos sobe e o aviso de termos novos aparece como hoje.
- **CA-2287** · Dado os nove e-mails, então assunto, pré-cabeçalho, corpo e rodapé são os da seção 6, sem "por segurança", sem tagline, e com o primeiro nome do paciente (ou sem nome: "Seu plano está neste link.", sem vírgula sobrando).
- **CA-2288** · Dado o Gmail do celular e do computador, o Outlook e o Apple Mail, então o botão tem 48 px, o texto não passa de 480 px e nada quebra com imagens bloqueadas.

## 3. Casos de borda

- **CB-1200** · **Paciente com duas nutricionistas:** cada link é lembrado à parte (CA-2227); o S1 da recuperação traz os dois; os avisos são por link, e um descadastro não mexe no outro.
- **CB-1201** · **Celular dividido** (mãe e filho no mesmo aparelho): o cartão "Meu plano" lista os dois links pelo primeiro nome; "Esquecer neste aparelho" existe para isso.
- **CB-1202** · **Paciente criança:** o e-mail é do responsável, e o aceite é dele; os e-mails usam o primeiro nome da ficha.
- **CB-1203** · **iPhone apagou o que o Safari guardou** (7 dias sem abrir o site): o cartão "Meu plano" some da tela de entrar; o ícone instalado continua abrindo, porque o token está no endereço dele.
- **CB-1204** · **Ícone instalado e endereço trocado:** o ícone abre "Este link não abre mais" com "Recuperar pelo e-mail"; o S4 manda abrir pelo botão e instalar de novo.
- **CB-1205** · **Sem internet ao abrir o ícone:** abre a cópia do aparelho (CA-754), se houver; sem cópia, "Não foi possível abrir suas missões" com "Tentar de novo". O registro do acesso fica para quando voltar a internet.
- **CB-1206** · **Fuso diferente** (paciente em Manaus): os horários de envio são os de Brasília; o "hoje" das missões continua o do aparelho, como hoje.
- **CB-1207** · **Marcou às 18h01, depois do lembrete:** o lembrete já saiu; a conta recomeça com a marcação.
- **CB-1208** · **Plano novo sem a dieta no link:** a barra só tem Hoje e Semana; A1 continua valendo (o plano mudou, as missões também).
- **CB-1209** · **Nutricionista desliga um aviso entre o agendamento e o envio:** a função confere o interruptor na hora de mandar; o aviso não sai.
- **CB-1210** · **Mesmo endereço em duas fichas da mesma conta** (casal que usa um e-mail): cada link pede o seu aceite; o teto de 1 aviso por dia vale por link, não por endereço, nesse caso.
- **CB-1211** · **Endereço com letra maiúscula ou espaço:** guardado sem espaço e em minúsculas; a comparação é sempre assim.
- **CB-1212** · **Devolução temporária** (caixa cheia): não suprime; depois de 3 seguidas em 30 dias, vira definitiva.
- **CB-1213** · **Paciente marca como spam o S2 da nutricionista:** o endereço entra na supressão para avisos; o S2 daquele link para de sair (CA-2254); a nutricionista vê "Pediu para não receber".
- **CB-1214** · **Conta excluída com avisos agendados:** a função não acha o link e não envia.
- **CB-1215** · **Mudança do horário de verão ou do fuso do servidor:** o agendamento está em UTC (10h, 11h e 21h, e o A1 de 11h a 23h45); o horário de Brasília não tem horário de verão desde 2019.
- **CB-1216** · **Resend fora do ar:** a chamada falha; S1 e S3 mostram "Não foi possível enviar agora. Tente de novo em alguns minutos."; avisos ficam "Adiado" e vão no próximo horário.
- **CB-1217** · **Dia completo e depois uma missão a mais** (plano atualizado no meio do dia): a barra ganha o segmento, o título volta a "Suas missões de hoje", sem brilho.
- **CB-1218** · **Mensagem com endereço ou telefone longo:** quebra em qualquer ponto (CA-554); nada rola de lado.
- **CB-1219** · **Abriu o link num computador:** a barra de abas vira um trilho no topo acima de 640 px; "Instalar" só aparece se o navegador oferecer.
- **CB-1220** · **Pedido de instalação recusado no Android:** o cartão fica, como se fosse "Agora não".
- **CB-1221** · **Duas abas do link abertas e marcação nas duas:** vale a nuvem (CB-236); a segunda aba atualiza ao voltar.
- **CB-1222** · **Paciente apaga o e-mail de confirmação e pede de novo:** sai outro S3; o primeiro continua valendo até ser usado ou passar 7 dias.
- **CB-1223** · **Aceite de um aviso que a nutricionista desligou depois:** o aceite fica guardado e vale de novo se ela religar (CA-2242).
- **CB-1224** · **Conta que vira Free com 5 pacientes com link:** os links continuam abrindo e marcando; o limite vale para link novo (como hoje); os avisos continuam.
- **CB-1225** · **Endereço de e-mail igual ao da própria nutricionista** (ela testa): funciona como qualquer outro.
- **CB-1226** · **Navegador sem `localStorage`** (aba anônima): a tela funciona; o aparelho só não lembra.
- **CB-1227** · **Paciente sem primeiro nome** (plano sem nome): os títulos ficam "Suas missões de hoje" e os e-mails começam sem nome.

## 4. Fora de escopo

- App nas lojas (fica para quando houver receita).
- Conta do paciente com e-mail e código (opção 6 da pesquisa).
- Notificação no celular (Web Push) e WhatsApp automático.
- A logo da nutricionista no e-mail e no ícone instalado ("Plano · Ana Souza"): pede guardar a imagem num endereço público.
- Rastreio de abertura e de clique nos e-mails.
- Histórico de semanas além das 4 anteriores, gráfico de peso, diário alimentar e chat no link.
- Escolher o dia e a hora dos avisos (o paciente e a nutricionista não escolhem: D-1228, D-1229, D-1231).
- Lembrete diário.
- O envio em massa para a base do MetaNutri (D-1245: só o mínimo, para a próxima SPEC).
- QR Code do link no PDF (pede biblioteca nova).

## 5. O que muda em outras specs (antes do código, pelo PLAN)

- `dieta-no-link` **D-150**: gramas à direita e medida embaixo do nome no modo "Medida e gramas" (D-1206); **D-154**: as
  abas viram a barra de baixo, com Hoje, Plano e Semana (D-1202); **D-159**: o cartão "Link do paciente" vai para a
  ficha e "Gerar link novo" vira "Trocar o endereço" (D-1214, D-1215).
- `missoes-na-nuvem` e `whatsapp-e-retorno` **D-147**: o link é por paciente (D-1214), e um paciente tem um link só.
- `marca-no-link` **seção 4**: "Nome da nutricionista no link" sai de fora do escopo e entra (D-1210); a cor vale
  também na barra de baixo e em "Marcar como feita".
- `textos-e-promessas` **D-405** e o limite de links: "pacientes com link" (D-1214).
- `exclusao-de-conta`: apagar e-mail, aceites e envios; manter a supressão (CA-2284).
- `seguranca-lote-2` **D-107**: tetos novos (mensagem de 400 caracteres, e-mail de até 254, chaves de aviso).
- `seguranca-lote-3`: o Turnstile também em "Recuperar meu link".
- `separacao-site-app`: a rota `/p/*` e o manifesto do Meu plano na Cloudflare.
- `painel-do-dono`: a parte "E-mails" (D-1240).
- Política de privacidade e pergunta de autorização do cartão (D-1244).

## 6. Os e-mails

Todos com o desenho do D-1234. "Juliana" é o primeiro nome do paciente; "Ana Lima", o nome do Perfil da
nutricionista. Sem nome do paciente, a primeira frase começa sem ele.

| # | Assunto | Pré-cabeçalho | Corpo | Rodapé |
|---|---|---|---|---|
| S1 | Seu link do plano | Abra o seu plano com um toque. | "Juliana, este é o link do seu plano." Botão **Abrir meu plano**. "O link é pessoal. Guarde este e-mail para abrir quando precisar." (Recuperação com mais de um plano: "Juliana, estes são os links dos seus planos." e uma linha por nutricionista, com **Abrir**.) | "Você pediu este link em app.metanutri.com.br. Se não foi você, ignore este e-mail." |
| S2 | Ana Lima enviou seu plano | Atualizado em 3 de novembro. | "Juliana, seu plano está neste link." Botão **Abrir meu plano**. "Atualizado em 3 de novembro." Com avisos oferecidos e não aceitos: **Avisos por e-mail** — "Ana Lima pode avisar quando o plano mudar, mandar o resumo da semana e lembrar das missões se você ficar 3 dias sem marcar." Botão de contorno **Quero receber os avisos**. | "Ana Lima enviou este e-mail pelo MetaNutri. Para falar com ela, responda." · "Não quero receber e-mails deste plano" |
| S3 | Confirme os avisos do seu plano | Sem a confirmação, nada é enviado. | "Juliana, confirme para receber por e-mail:" e a lista dos avisos escolhidos ("Plano atualizado", "Resumo da semana, toda quinta", "Lembrete depois de 3 dias sem marcar"). Botão **Confirmar**. "Sem a confirmação, nada é enviado." | "Alguém pediu estes avisos no link do seu plano com Ana Lima. Se não foi você, ignore este e-mail." |
| S4 | Seu link do plano mudou | O link antigo não abre mais. | "Juliana, Ana Lima trocou o endereço do seu plano. O link antigo não abre mais." Botão **Abrir meu plano**. "Se você instalou o Meu plano na tela inicial, abra por este botão e instale de novo." | "Ana Lima enviou este e-mail pelo MetaNutri. Para falar com ela, responda." |
| A1 | Seu plano foi atualizado | Ana Lima atualizou o seu plano em 3 de novembro. | "Juliana, Ana Lima atualizou o seu plano." Botão **Ver o plano**. "As missões de hoje já seguem o plano novo." | "Você pediu este aviso no link do seu plano com Ana Lima." · "Não quero mais receber este aviso" |
| A2 | Sua semana: 5 de 7 dias | Dentro da meta. Veja a sua semana. (abaixo da meta: "A meta é 4 dias."; zero: "O plano continua no link.") | "Juliana, você marcou missão em 5 dos últimos 7 dias." Os 7 dias em células ("qui 3/4", "sex 4/4", "sáb –"…). Com 4 ou mais: "Dentro da meta."; de 1 a 3: "A meta é 4 dias por semana."; zero: "Nenhum dia marcado nesta semana. O plano continua no link." Botão **Abrir meu plano**. | "Resumo da semana que você pediu, toda quinta." · "Não quero mais receber o resumo" |
| A3 | Ainda dá tempo de marcar hoje | Suas missões de hoje estão no link. | "Juliana, faz 3 dias que você não marca as missões do plano." (O número é o dos dias sem marcar: 3, 4, 5 ou 6.) Botão **Marcar as missões de hoje**. | "Você pediu este lembrete no link do seu plano com Ana Lima." · "Não quero mais receber o lembrete" |
| A4 | Uma semana sem marcar as missões | Se o plano ficou difícil, fale com Ana Lima. | "Juliana, faz uma semana que você não marca as missões. Se o plano ficou difícil, responda a este e-mail: Ana Lima pode ajustar." Botão **Abrir meu plano**. "Este é o último lembrete até você marcar de novo." | igual ao A3 |
| N1 | Adesão da semana: 3 pararam de marcar (sem ninguém parado: "Adesão da semana: ninguém parou de marcar") | 12 em dia, 4 em atenção, 1 ainda não começou. | "Semana de 26 de outubro a 1º de novembro." Os quatro números em linha: **12** Em dia · **4** Atenção · **3** Pararam de marcar · **1** Não começaram. **Pararam de marcar:** "Juliana M. · 6 dias", "Carlos S. · 9 dias", "Beatriz R. · 4 dias". Botão **Abrir a Adesão**. | "Resumo de toda segunda, para quem tem pacientes em acompanhamento no MetaNutri." · "Não quero mais receber o resumo" |

**Páginas depois do toque** (no app, `app.metanutri.com.br/avisos/<chave>`):
- Aceite: "Avisos de Ana Lima por e-mail", a lista com caixas (as escolhidas, marcadas), **Confirmar**; depois,
  "Pronto. Você vai receber: Resumo da semana, Lembrete." e **Abrir meu plano**.
- Descadastro: "Não receber mais o resumo da semana?", **Não quero mais receber**; depois, "Pronto. Você não recebe
  mais o resumo da semana.", "Parar todos os e-mails deste plano" e "Desfazer".
- Chave que não vale: "Este endereço não vale. Abra o botão do e-mail mais recente."

**Textos da tela do link** (os que não estão nas decisões):
- Barra de baixo: "Hoje", "Plano", "Semana". Botão do topo: "Mais opções" (para o leitor de tela).
- Hoje: "terça-feira, 3 de novembro"; "Suas missões de hoje, Juliana" ou "Dia completo, Juliana."; "2 de 6 feitas" e, com
  tudo feito, "Tudo feito hoje"; "Ler tudo"; "Ver"; "3 de 7 dias nesta semana" com "A meta é 4 dias." ou "Dentro da meta."
- Cartão Instalar: "Instalar o Meu plano", "Um ícone na tela inicial abre o seu plano.", "Instalar", "Agora não".
- Folha de instalar no iPhone: "Instalar o Meu plano", "No iPhone, pelo Safari.", os passos "Toque em ⋯ na barra do
  Safari (ou em Compartilhar).", "Toque em Adicionar à Tela de Início.", "Confira o nome Meu plano e toque em
  Adicionar." e "Entendi". No navegador do WhatsApp ou do Instagram, o primeiro passo é "Toque em ⋯ e em Abrir no
  navegador."
- Plano: "Seu plano alimentar, Juliana"; "Próxima" ou "Agora"; "Opção 1"…; "Marcar como feita" ou "Feita hoje";
  "Orientações"; "Atualizado em 3 de novembro."
- Semana: "Sua semana"; "3 de 7 dias"; "A meta é 4 dias." ou "Dentro da meta."; "Semanas anteriores"; "21 a 27 de
  out." com "5 dias".
- Folha "Meu plano": "Meu plano", "Juliana · com Ana Lima", "Instalar na tela inicial", "Receber meu link por e-mail",
  "Avisos por e-mail" ("3 ligados", "Desligados"), "Esquecer neste aparelho"; e "Esquecer o plano neste aparelho?",
  "O link continua valendo. Para abrir de novo, use o link ou o e-mail.", "Esquecer", "Cancelar".
- Folha "Receber por e-mail": "Seu e-mail", "Usar outro", "Avisos", "Quando o plano mudar", "Resumo da semana",
  "Lembrete se eu ficar 3 dias sem marcar", "Enviar", "Você sai de qualquer aviso pelo próprio e-mail."; depois,
  "Enviamos o link para j•••a@gmail.com.", "Para receber os avisos, toque em Confirmar no e-mail." e "Fechar".
- Folha "Avisos por e-mail": "Plano atualizado" ("Quando Ana Lima mudar o plano"), "Resumo da semana" ("Toda quinta,
  às 8h"), "Lembrete" ("Depois de 3 dias sem marcar") e "Ligar um aviso manda um e-mail de confirmação."
- Tela de entrar: o cartão "Abrir meu plano" com "Juliana · Ana Lima"; "Nutricionista" antes do login; "Sou paciente".
- "Recuperar meu link": "Digite o e-mail que você deu à sua nutricionista.", "E-mail", "Enviar o link", "O link também
  está na mensagem da sua nutricionista no WhatsApp."
- Na ficha: "Link do paciente", "Endereço do link", "Copiar", "WhatsApp", "E-mail", "Mostrar a dieta no link",
  "Mensagem para Juliana", "227 de 400", "Salvar mensagem", "No link desde 3/11", "A mensagem aparece em Hoje, no
  link. Não vai por e-mail.", "Trocar o endereço"; "Avisos por e-mail", "Teto: 1 por dia, 3 por semana", "Recebe",
  "Esperando o aceite", "Desligado por você", "E-mail devolvido", "Enviar convite", "Último convite em 01/11. Um por
  mês.", "O interruptor é seu: oferece ou desliga o aviso. O paciente escolhe o que recebe e sai pelo próprio
  e-mail."; "Próximo e-mail"; "Enviados", "Últimos 30 dias", "Nenhum e-mail enviado."; os diálogos "Enviar o link
  por e-mail" e "Trocar o endereço?".
- Configurações › E-mails: "Resumo da adesão" ("Toda segunda, às 7h, para o seu e-mail."), "Receber o resumo da
  adesão", "Avisos aos pacientes", "Oferecer avisos aos pacientes novos", "Respostas dos pacientes", "Do seu
  Perfil", "Editar no Perfil".

## 7. O que o dono precisa fazer

Cada passo na ordem em que é preciso. Os comandos e o SQL vêm no PLAN, prontos para copiar.

**Na entrega 1 (sem custo):**
1. Testar o ícone "Meu plano" num iPhone e num Android de verdade, com o link publicado numa versão de teste.
2. Aprovar a regra de migração (D-1217) olhando a Adesão depois da publicação.

**Para a entrega 2.** Os passos 3 a 6 o dono **fez em 04/11/2026**; ficam aqui como registro do que existe:
3. **Feito.** **Resend › Domains:** o domínio `avisos.metanutri.com.br` foi criado.
4. **Feito.** **Registro.br › metanutri.com.br › DNS** (o DNS do domínio é o do Registro.br, e não o da Cloudflare):
   os registros que o Resend mostrou, com o `TXT` `resend._domainkey.avisos` da chave DKIM e o `send.avisos` como
   **`CNAME` para `send.forge.rmta.net`**. O painel do Resend pediu esse `CNAME` no lugar do `MX` e do `TXT` de SPF do
   Amazon SES que esta seção previa; vale o que o painel pede. Depois, "Verify" no Resend.
5. **Feito.** **Resend › o domínio novo › Configuration:** *Open tracking* e *Click tracking* desligados.
6. **Feito.** **Resend › API Keys:** a chave "avisos", com *Sending access* e só o domínio `avisos.metanutri.com.br`,
   guardada em **Supabase › Edge Functions › Secrets** como `RESEND_API_KEY`.

Falta, na ordem (os comandos prontos estão no PLAN, seção 9):
7. **SQL Editor do Supabase:** rodar o `supabase/017-lado-do-paciente.sql` (o link fixo, as tabelas de e-mail, aceite,
   envio e supressão, e o agendamento), como no 014, **antes** de publicar o site e as funções.
8. Publicar as cinco funções novas (`meu-link`, `avisos-resposta`, `webhook-resend` e `avisos` com `--no-verify-jwt`;
   `enviar-link` com a verificação de sessão de sempre).
9. **Cloudflare › Turnstile:** guardar a chave secreta do widget que o app já usa como `TURNSTILE_SECRET_KEY` nos
   Secrets das Edge Functions (sem ela, "Recuperar meu link" responde a frase de sempre e não manda nada, DP-LP-19).
10. **Resend › Webhooks:** criar o webhook para a função `webhook-resend`
    (`https://qmpljfjbdcrdbqutuvmg.supabase.co/functions/v1/webhook-resend`), com os eventos `email.delivered`,
    `email.bounced` e `email.complained`; guardar o segredo dele (`whsec_…`) como
    `RESEND_WEBHOOK_SECRET`. Sem o segredo, a função recusa todo evento (CA-2277).
11. Aprovar o texto novo da Política de privacidade e da pergunta de autorização (PLAN, seção 8).

**Na entrega 3 e depois:**
12. **DMARC:** hoje é `p=none` sem endereço de relatório. Quando houver uma caixa de e-mail no domínio, acrescentar
    `rua=mailto:<caixa>`; depois de 4 semanas sem devolução nem queixa no Painel, trocar para `p=quarantine` (vale
    também para os subdomínios).
13. **Plano do Resend:** ficar no grátis enquanto o Painel do dono mostrar menos de 1.900 no mês e menos de 3 dias por
    semana com aviso adiado. Passou disso: **Resend Pro (US$ 20 por mês)** e subir os tetos com
    `npx supabase secrets set TETO_DIA=1500 TETO_MES=45000 --project-ref qmpljfjbdcrdbqutuvmg`.
14. Conferir no painel do Resend qual dos registros SPF de hoje (`send` ou `rsend`) está em uso e apagar o outro
    (pendência da pesquisa).

## 8. Telas do protótipo

Canvas "MetaNutri Redesenho", três pranchetas novas, escuras, na faixa de y = 22.300:

1. **`LinkPaciente.dc.html`**, o celular de 390 × 844, interativo, com oito estados: **Hoje** (marcar com o movimento
   do D-1204, "Dia completo", "Ler tudo", "Ver"), **Plano** (aberto na refeição "Próxima", seletor de opções, gramas
   e medida, "Marcar como feita"), **Semana**, **Instalar no iPhone** (barra do Safari e a folha com os três passos),
   **Instalar no Android** (barra do Chrome e o pedido do navegador), **Receber por e-mail** (e-mail mascarado,
   "Usar outro", correção de digitação, avisos desmarcados, enviado), **Abrir sem o link** (a tela de entrar com
   "Abrir meu plano" e "Sou paciente") e **Link que não abre** (com "Recuperar meu link"). O botão Mais abre a folha
   "Meu plano", "Avisos por e-mail" e "Esquecer neste aparelho". O celular principal é escuro, com a marca de Ana
   Lima. Ao lado: as notas de cada estado com as decisões, a tabela de tempos do movimento, a tela inicial com o
   ícone (toque abre o plano) e, parados, Hoje em mais dois celulares: um claro, com a marca, e um sem marca (o
   padrão do MetaNutri).
2. **`EmailsPaciente.dc.html`**: os nove e-mails (e o S1 de dois planos), um de cada vez, no Gmail do Android
   (aberto, com "Cancelar inscrição" ao lado do remetente nos que têm descadastro) e no Gmail do computador (caixa de
   entrada com o assunto e o pré-cabeçalho, e o e-mail aberto no painel de leitura); a ficha de cada e-mail (tipo,
   hora, teto, descadastro, resposta); e "Depois do toque" (a página do aceite e a do descadastro, com
   "Desfazer"). Embaixo, as variações fixas: sem marca, conta de estudante e o resumo com 2 e com nenhum dia.
3. **`AvisosNutri.dc.html`**: a ficha (Pacientes › Juliana Martins) com "Link do paciente" (endereço fixo, Copiar,
   WhatsApp, E-mail, plano no link, mensagem com contador, "Trocar o endereço") e "Avisos por e-mail" (interruptores,
   estados, "Enviar convite"), "Próximo e-mail" (a prévia) e "Enviados", na ficha de Juliana (aceitou); embaixo, o
   cartão "Avisos por e-mail" nas fichas de Carlos (esperando o aceite), Beatriz (sem e-mail) e Pedro (e-mail
   devolvido); os diálogos de enviar e de trocar o endereço; e Configurações › E-mails, com a prévia do resumo da
   adesão.

**Regra do protótipo:** nenhuma prancheta tem controle que não existe no produto. Tema, marca e estado de exemplo
aparecem em celulares e cartões parados, lado a lado.

**Reduzir movimento** não aparece no protótipo: vale o D-1204 e o CA-2205. Com a opção ligada no celular, marcar só
troca as cores, em 120 ms, sem encolher, sem visto desenhado, sem número subindo, sem brilho e sem vibração.

Não desenhados: a Adesão com o envelope e o último acesso (muda uma linha), o Painel do dono (D-1240), o diálogo
"Atualizar com este plano?", a folha de instalar dentro do WhatsApp (CA-2231) e o computador (CB-1219).
