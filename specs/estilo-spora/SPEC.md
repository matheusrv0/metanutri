# SPEC — Estilo novo (referência Spora), conta obrigatória e checkout

Status: **aguardando sua aprovação**. Escrita em 28/09/2026.

**Fontes:** a conversa de brainstorming de 28/09/2026 e os quatro mockups aprovados:
landing v2, painel v1, conta e checkout v1 e planejador v1. As imagens ficam em
`specs/estilo-spora/mockups/`. A referência visual é a pasta `MetaNutri Design System`
(imagens `uploads/spora-01` a `spora-07`). Continuam valendo o kit de marca de 27/09 e o
`DESIGN.md`, que esta spec altera nos pontos da seção 1.

**Objetivo:** o MetaNutri inteiro (site, conta, pagamento e área de trabalho) com uma
cara só, no estilo da referência Spora adaptado à marca. Cada botão do site leva ao
lugar certo, e o plano escolhido acompanha a pessoa até o pagamento.

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-20 | Estilo Spora adaptado. Teal `#0e3b43` ocupa o lugar do preto, as superfícies usam o cinza `#F1F0F0` com cartões brancos arredondados, e o laranja aparece só em destaques fora do dado | Pedido seu. A regra de 27/09 continua: laranja nunca carrega texto e nunca entra em painel de dado |
| D-21 | Títulos e números grandes em **Urbanist**, texto em **Manrope**. A Bricolage Grotesque continua só no nome MetaNutri | Aprovado por você, com as duas fontes novas liberadas como dependência |
| D-22 | **Foto só no topo da landing:** uma composição de pratos recortada de fotos gratuitas, com crédito. Nenhuma outra foto no site nem no app | Você achou a landing "baseada em imagens" e poluída |
| D-23 | **Conta obrigatória** quando o servidor está configurado. Sem servidor (desenvolvimento), o app abre no modo local, como hoje | Resposta sua de 28/09. Plano, limite e link do paciente ficam presos a uma pessoa |
| D-24 | Os planos continuam salvos no aparelho, e o aparelho passa a ter uma conta dona desses dados | Sincronizar automático não entra. Sem dono, uma segunda conta veria os pacientes da primeira |
| D-25 | O plano escolhido em Preços acompanha a pessoa pelo cadastro até o checkout | Hoje ele se perde no caminho |
| D-26 | Pagamento de Solo e Pro por assinatura no Mercado Pago, com cartão, em ciclo **mensal ou anual**. O anual cobra o valor do ano a cada 12 meses | Os preços anuais já estão na página de Preços, mas não dá para pagá-los |
| D-27 | O plano só muda quando o servidor confirma o pagamento | Regra que já vale hoje (assinatura pendente não libera plano pago) |
| D-28 | Estudante envia o comprovante de matrícula e **você aprova à mão**. Até a aprovação, vale o Free | O plano Estudante exige comprovante desde 27/09 |
| D-29 | A seta laranja em círculo só aparece em elemento que leva a algum lugar | Seta decorativa parece botão e confunde |
| D-30 | Mudança entregue em ondas: Fundação, depois Onda 1 (site, conta e checkout), Onda 2 (área de trabalho) e Onda 3 (planejador). Cada onda é publicada e testada antes da próxima | Abordagem A, aprovada no brainstorming |

## 2. Escopo

**Entra:**
- Fundação visual: cores, fontes, raios e os componentes base.
- Landing nova e página de Preços no estilo novo.
- Criar conta, entrar, confirmar e-mail, recuperar senha e trocar senha.
- Conta obrigatória e conta dona dos dados do aparelho.
- Checkout, volta do pagamento e pedido de Estudante.
- Painel, menu lateral e as telas da área de trabalho no estilo novo.
- Tela de missões do paciente.
- Planejador (etapas, refeições, resumo do dia, adequação e Cobrir).
- Tabela de alimentos e Meus produtos no estilo novo.

**Escrito, mas ligado por você depois:** o código das mudanças no servidor que as telas
usam. São três: o ciclo anual na função `assinar`, o endereço de volta do pagamento e o
SQL do pedido de Estudante. Publicar e rodar fica com você (seção 6).

## 3. Histórias e critérios de aceite

Pessoas: **nutricionista** (quem paga e usa o sistema), **estudante** (conta de estágio),
**visitante** (ainda não tem conta) e **paciente** (abre o link das missões).

### Fundação

**US-F1 · Cores, fontes e superfícies (5 pts).** Como nutricionista, quero que o
MetaNutri tenha uma cara só, para confiar que é um produto sério.

- **CA-100** · Dado qualquer tela, quando ela carrega, então os títulos usam Urbanist, o texto usa Manrope e o nome MetaNutri usa Bricolage Grotesque.
- **CA-101** · Dado qualquer número em coluna ou tabela, então os algarismos têm largura fixa, e valores de linhas diferentes ficam alinhados.
- **CA-102** · Dado o tema claro, então o fundo das áreas é o cinza de superfície, os blocos são cartões brancos arredondados e a ação principal é teal.
- **CA-103** · Dado o tema escuro, então as mesmas telas usam as versões escuras do teal e do cinza, e todo texto passa no contraste AA.
- **CA-104** · Dado qualquer painel de dado (adequação, macros, energia), então nenhum elemento usa a cor laranja da marca.
- **CA-105** · Dado o lint do projeto, quando alguém escreve cor hexadecimal ou família de fonte solta num componente, então o lint falha, como já acontece hoje.

**US-F2 · Componentes base (8 pts).** Como nutricionista, quero que botões, cartões e
listas se comportem igual em toda tela, para não reaprender cada uma.

- **CA-106** · Dado o design system, então existem estes componentes, cada um com exemplo na vitrine: cartão de número (valor grande, rótulo e seta opcional), rótulo de seção com ponto laranja, botão em pílula (teal, laranja e contorno), linha de lista em cinza, seletor segmentado em pílula e anel de progresso.
- **CA-107** · Dado um cartão de número sem destino, então ele não mostra seta. Dado um cartão com destino, então a seta aparece, e o cartão inteiro é clicável e alcançável pelo teclado.
- **CA-108** · Dado qualquer botão ou item clicável, então a área de toque tem pelo menos 44 × 44 px no celular e o foco do teclado aparece.
- **CA-109** · Dado o sistema com "reduzir movimento" ligado, então nenhuma transição passa de 150 ms e nada se move sozinho.

**US-F3 · Regras escritas (2 pts).** Como quem mantém o projeto, quero as regras novas
no `DESIGN.md`, para a próxima tela sair igual.

- **CA-110** · Dado o `DESIGN.md`, então ele descreve as fontes, as superfícies, os componentes da US-F2, a regra da seta (D-29) e a regra da foto (D-22).
- **CA-111** · Dado o `THIRD_PARTY_NOTICES.md`, então cada foto usada no site tem autor, origem e licença.

### Onda 1 · Site público, conta e pagamento

**US-1.1 · Landing nova (5 pts).** Como visitante, quero entender em poucos segundos o
que o MetaNutri faz de diferente, para decidir se crio conta.

- **CA-112** · Dado a landing, então ela mostra, nesta ordem: o topo, o problema, três números, como funciona, o produto, a faixa final e o rodapé, como no mockup landing v2.
- **CA-113** · Dado o topo, então ele mostra a composição de pratos, o nome MetaNutri grande e apagado atrás, o título "Faltou cálcio? O MetaNutri diz o que comer.", a descrição e dois cartões de número: 16 nutrientes e 597 alimentos.
- **CA-114** · Dado qualquer número da landing, então ele é verdadeiro e vem do sistema ou da TACO: 16 nutrientes na adequação, 597 alimentos, até 5 sugestões por nutriente, 57% dos alimentos sem vitamina A medida.
- **CA-115** · Dado a seção do produto, então ela mostra recortes de telas reais do MetaNutri (Cobrir e missões do paciente), gerados do próprio app.
- **CA-116** · Dado o menu do topo, quando o visitante clica em "Como funciona", "O diferencial" ou "Preços", então a página rola até a seção ou abre Preços. O botão "Ver como funciona" do topo rola até Como funciona.
- **CA-116a** · Dado os cartões de número do topo, então o de 16 nutrientes leva até O diferencial e o de 597 alimentos leva até "Fontes dos dados", no rodapé.
- **CA-117** · Dado um visitante sem sessão, quando clica em "Começar grátis" (topo, produto ou faixa final), então vai para Criar conta com o Free marcado.
- **CA-118** · Dado alguém com sessão, quando abre a landing, então o topo mostra "Ir para o painel" no lugar de "Entrar" e "Começar grátis".
- **CA-119** · Dado a foto do topo, então ela carrega com tamanho reservado (a página não pula) e pesa no máximo 300 KB. No celular, ela aparece menor, acima do título, e o título continua inteiro sem rolar numa tela de 360 × 740 px.
- **CA-120** · Dado um celular de 360 px, então nada da landing gera rolagem para o lado.

**US-1.2 · Preços com o botão certo (3 pts).** Como visitante, quero que o botão de
cada plano me leve ao próximo passo daquele plano, para não recomeçar a escolha.

- **CA-121** · Dado a página de Preços, então ela usa o estilo novo e mantém a chave mensal/anual e a comparação dos planos de hoje.
- **CA-122** · Dado um visitante sem sessão, quando clica no botão do Solo ou do Pro, então vai para Criar conta com esse plano e o ciclo (mensal ou anual) já marcados.
- **CA-123** · Dado alguém com sessão, quando clica no botão do Solo ou do Pro, então vai direto para o checkout desse plano e desse ciclo.
- **CA-124** · Dado o botão do Free, então leva para Criar conta sem sessão e para o painel com sessão.
- **CA-125** · Dado o botão do Estudante, então leva para Criar conta sem sessão e para o envio de comprovante com sessão.
- **CA-126** · Dado o botão do Clínica, então ele mostra o contato para combinar o plano, sem levar a cadastro nem pagamento.

**US-1.3 · Criar conta (5 pts).** Como visitante, quero criar a conta sabendo o que vou
levar, para seguir sem dúvida.

- **CA-127** · Dado a tela Criar conta, então ela pede nome, e-mail e senha, e mostra do lado o plano marcado com preço e o que inclui. Sem plano marcado, mostra o que o Free inclui.
- **CA-128** · Dado a tela Criar conta com Solo ou Pro marcado, então ela mostra "Passo 1 de 3" e o link "Trocar de plano", que volta para Preços.
- **CA-129** · Dado um e-mail inválido, uma senha com menos de 8 caracteres ou um nome vazio, quando a pessoa envia, então o erro aparece ao lado do campo e nada é enviado ao servidor.
- **CA-130** · Dado um e-mail que já tem conta, quando a pessoa envia, então aparece "Este e-mail já tem conta" com o link "Entrar".
- **CA-131** · Dado o servidor fora do ar ou sem internet, quando a pessoa envia, então aparece uma mensagem de falha de conexão, o formulário continua preenchido e o botão volta a funcionar.
- **CA-132** · Dado um cadastro aceito que exige confirmar o e-mail, então a pessoa vê a tela "Confira seu e-mail".
- **CA-133** · Dado um cadastro aceito que não exige confirmação, então a pessoa segue para o checkout se marcou Solo ou Pro, para o envio de comprovante se marcou Estudante e para o painel se marcou o Free.
- **CA-134** · Dado o botão "Criar conta" já clicado, então ele fica desabilitado até a resposta, e um segundo clique não cria duas contas.

**US-1.4 · Entrar (3 pts).** Como nutricionista, quero entrar e cair onde eu estava
indo, para não refazer o caminho.

- **CA-135** · Dado a tela Entrar, então ela pede e-mail e senha, tem "Esqueci a senha" e "Criar grátis", e mostra do lado o que o Free inclui.
- **CA-136** · Dado e-mail ou senha errados, quando a pessoa envia, então aparece "E-mail ou senha não conferem", sem dizer qual dos dois errou.
- **CA-137** · Dado alguém que tentou abrir uma tela da área de trabalho sem sessão, quando entra, então vai para essa tela, e não para o painel.
- **CA-138** · Dado alguém que veio do checkout, quando entra, então volta para o checkout com o mesmo plano e o mesmo ciclo.
- **CA-139** · Dado uma conta que ainda não confirmou o e-mail, quando a pessoa tenta entrar, então vê que falta confirmar e o botão "Reenviar o link".

**US-1.5 · Confirmar e-mail (2 pts).** Como visitante, quero saber o que fazer depois
do cadastro, para não achar que deu erro.

- **CA-140** · Dado a tela "Confira seu e-mail", então ela mostra o e-mail usado, pede para olhar o spam e tem "Reenviar o link".
- **CA-141** · Dado "Reenviar o link" clicado, então o botão fica desabilitado por 60 segundos com a contagem na tela.
- **CA-142** · Dado o link de confirmação aberto, então a pessoa chega ao MetaNutri já com sessão e segue o caminho do CA-133.
- **CA-143** · Dado um link de confirmação vencido ou já usado, então a pessoa vê "Este link não vale mais" e o botão para pedir outro.

**US-1.6 · Recuperar a senha (3 pts).** Como nutricionista, quero trocar a senha
esquecida sozinha, sem pedir ajuda a ninguém.

- **CA-144** · Dado "Esqueci a senha", quando a pessoa informa o e-mail, então vê "Se existir conta com esse e-mail, o link chega em alguns minutos", exista a conta ou não.
- **CA-145** · Dado o link de troca aberto, então a pessoa vê a tela Nova senha, com senha e repetição.
- **CA-146** · Dado uma senha nova válida e igual à repetição, quando a pessoa salva, então a senha muda e ela vai para o painel com sessão.
- **CA-147** · Dado um link de troca vencido, então aparece "Este link não vale mais" com o botão para pedir outro.

**US-1.7 · Conta obrigatória e dono dos dados (5 pts).** Como nutricionista, quero que
só eu veja os meus pacientes neste aparelho, para cumprir o sigilo.

- **CA-148** · Dado o servidor configurado e ninguém com sessão, quando alguém abre qualquer tela da área de trabalho, então vai para Entrar, e a tela pedida fica guardada para depois (CA-137).
- **CA-149** · Dado o servidor configurado, então continuam abrindo sem sessão: landing, Preços, Criar conta, Entrar, Confirmar e-mail, Esqueci a senha, Nova senha e o link de missões do paciente.
- **CA-150** · Dado o servidor não configurado, então o app abre sem conta, no modo local, como hoje.
- **CA-151** · Dado um aparelho com planos de antes desta mudança e sem dono, quando a primeira conta entra, então essa conta vira dona dos dados, e os planos aparecem.
- **CA-152** · Dado um aparelho cujos dados têm dono, quando entra uma conta diferente, então nenhum plano ou paciente aparece antes de a pessoa escolher entre sair ou apagar os dados deste aparelho e continuar.
- **CA-153** · Dado "Apagar os dados deste aparelho e continuar", então a tela explica o que vai ser apagado e pede confirmação antes de apagar.
- **CA-154** · Dado alguém com sessão e sem internet, quando abre o app, então ele abre normalmente com os dados do aparelho.
- **CA-155** · Dado alguém que nunca entrou neste aparelho e está sem internet, quando abre o app, então vê que precisa de internet no primeiro acesso.
- **CA-156** · Dado "Sair", então a sessão acaba, a pessoa vai para a landing e os dados continuam no aparelho para quando ela voltar.

**US-1.8 · Checkout (5 pts).** Como nutricionista, quero revisar o plano e o preço
antes de pagar, para não ter surpresa.

- **CA-157** · Dado o checkout de Solo ou Pro, então ele mostra o passo "2 de 3", a chave mensal/anual, os dois planos pagos para escolher, o que o plano inclui e um resumo com plano, ciclo, conta e total de hoje.
- **CA-158** · Dado a troca de ciclo ou de plano no checkout, então o total e o resumo mudam na hora, sem sair da tela.
- **CA-159** · Dado o ciclo anual, então o checkout mostra o valor do ano, quanto sai por mês e o desconto sobre 12 meses do mensal.
- **CA-160** · Dado vagas de preço de fundador sobrando, então aparece o aviso de fundador com quantas vagas restam. Se a contagem não chegar do servidor, o aviso aparece sem o número.
- **CA-161** · Dado "Pagar com Mercado Pago", então a pessoa é levada ao Mercado Pago com o plano e o ciclo escolhidos, e o valor vem do servidor, nunca da tela.
- **CA-162** · Dado uma falha ao falar com o servidor de cobrança, então aparece a mensagem de erro no checkout, nada é cobrado e o botão volta a funcionar.
- **CA-163** · Dado alguém com assinatura ativa, quando abre o checkout, então vê o plano atual e o aviso de que a troca de plano pago ainda não é feita pelo site, e o botão de pagar não aparece. Assim não nasce uma segunda cobrança.
- **CA-164** · Dado alguém sem sessão, quando abre o endereço do checkout, então vai para Entrar e volta ao checkout depois (CA-138).
- **CA-165** · Dado o checkout, então o texto diz que o pagamento termina no Mercado Pago, com cartão, e que nenhum dado de cartão passa pelo MetaNutri.

**US-1.9 · Volta do pagamento (3 pts).** Como nutricionista, quero saber na hora se
deu certo, para começar a usar o plano.

- **CA-166** · Dado a volta do Mercado Pago com a assinatura já confirmada, então aparece "Assinatura ativa" com o nome do plano e o botão "Ir para o painel".
- **CA-167** · Dado a volta com a assinatura ainda pendente, então aparece "Pagamento em análise", avisando que até confirmar vale o Free. A tela confere de novo a cada 10 segundos por até 10 minutos e, depois disso, mostra "Conferir de novo".
- **CA-168** · Dado a tela em análise e a confirmação chegando, então ela muda sozinha para "Assinatura ativa".
- **CA-169** · Dado a volta com a assinatura cancelada, pausada ou inexistente, então aparece "Pagamento não concluído", avisando que nada foi cobrado, com o botão "Tentar de novo" que abre o checkout do mesmo plano.
- **CA-170** · Dado a tela de volta sem internet, então ela avisa que não conseguiu conferir e oferece "Conferir de novo".

**US-1.10 · Pedido de Estudante (5 pts).** Como estudante, quero enviar o comprovante
pelo sistema, para usar o plano de estágio.

- **CA-171** · Dado o envio de comprovante, então a tela explica o plano (grátis, uso não comercial, 10 pacientes ativos, até 3 links) e pede instituição, previsão de formatura e o arquivo.
- **CA-172** · Dado um arquivo que não é PDF, JPG ou PNG, ou maior que 5 MB, então ele é recusado com o motivo, antes de enviar.
- **CA-173** · Dado um pedido enviado, então a tela Conta e plano mostra "Comprovante em análise", e a conta continua no Free.
- **CA-174** · Dado um pedido aprovado por você, então a conta passa a valer como Estudante, com os limites dele.
- **CA-175** · Dado um pedido recusado por você, então a tela Conta e plano mostra "Comprovante não aceito" e permite enviar outro.
- **CA-176** · Dado um pedido já em análise, então a tela não deixa enviar um segundo pedido.

**US-1.11 · Limite leva a planos (2 pts).** Como nutricionista no Free, quero saber o
que fazer quando o limite acabar, para não travar no atendimento.

- **CA-177** · Dado um limite do plano atingido (pacientes ativos ou links), então a mensagem diz qual limite foi usado e tem "Ver planos", que abre Preços com o plano seguinte em destaque.
- **CA-178** · Dado o CA-177, então nada do que já existe é apagado nem escondido. Só a ação nova fica bloqueada.

### Onda 2 · Área de trabalho

**US-2.1 · Menu lateral (3 pts).** Como nutricionista, quero achar cada tela rápido.

- **CA-179** · Dado o menu lateral, então ele tem fundo branco, "Novo plano" como botão teal em pílula, as seções Trabalho, Alimentos e Sistema, e a tela atual marcada em cinza.
- **CA-180** · Dado o pé do menu, então ele mostra a conta com sessão (nome e e-mail) e o seletor de tema.
- **CA-181** · Dado o celular, então o menu continua abrindo como gaveta, como hoje.

**US-2.2 · Painel (5 pts).** Como nutricionista, quero ver o que precisa de mim hoje e
começar um plano em um clique.

- **CA-182** · Dado o painel, então o topo mostra a data de hoje e o título Painel.
- **CA-183** · Dado o painel, então aparecem quatro cartões de número: Planos, Pacientes, Dias trabalhados (últimos 14) e Precisa de atenção. Os três primeiros são brancos. O de atenção é teal quando há pendência e branco quando não há.
- **CA-184** · Dado os cartões de Planos, Pacientes e Precisa de atenção, quando a pessoa clica, então abre a tela correspondente. O de Dias trabalhados não tem seta e não é clicável (D-29).
- **CA-185** · Dado "Começar agora", então os dois jeitos de montar aparecem como dois cartões: Prescrição rápida e Atendimento completo. Um clique cria o plano naquele jeito, sem janela intermediária.
- **CA-186** · Dado planos existentes, então "Começar agora" mostra o gráfico de barras dos últimos 14 dias, com hoje mais escuro. Sem planos, mostra "Ver um plano de exemplo" no lugar do gráfico.
- **CA-187** · Dado "Onde você parou", então aparecem até 5 planos recentes em linhas cinza, com nome, jeito de montar e quando foi mexido. Clicar abre o plano.
- **CA-188** · Dado "Precisa de atenção", então cada pendência vem numa linha com o botão "Ver". Sem pendência, aparece "Nada pendente por aqui".

**US-2.3 · Conta e plano (3 pts).** Como nutricionista, quero ver meu plano e mudar de
plano sem procurar.

- **CA-189** · Dado a tela Conta e plano, então ela mostra nome, e-mail, o plano que vale agora, o estado da assinatura e, se houver, o preço de fundador.
- **CA-190** · Dado "Mudar de plano", então abre Preços. Dado "Assinar" num plano pago, então abre o checkout desse plano (US-1.8).
- **CA-191** · Dado um pedido de Estudante, então a tela mostra o estado dele (CA-173 a CA-175).

**US-2.4 · As outras telas da área de trabalho (5 pts).** Como nutricionista, quero
que Adesão, Pacientes, Planos, Configurações e Ajuda tenham a mesma cara do painel.

- **CA-192** · Dado cada uma dessas telas, então ela usa os componentes da US-F2 (cartões brancos no cinza, linhas cinza, pílulas) e mantém todas as funções de hoje.
- **CA-193** · Dado qualquer lista vazia nessas telas, então aparece uma frase dizendo o que fazer e o botão da ação, sem foto (D-22).

**US-2.5 · Missões do paciente (3 pts).** Como paciente, quero ver e marcar minhas
missões do dia no celular, sem instalar nada.

- **CA-194** · Dado o link das missões, então a tela mostra o nome MetaNutri, "Suas missões de hoje" com o nome do paciente, um anel com feitas/total e a meta de dias da semana.
- **CA-195** · Dado uma missão feita, então a linha fica verde com o sinal de feito e o texto riscado. Tocar de novo desmarca.
- **CA-196** · Dado a tela do paciente, então ela continua sem menu, sem conta e sem nada da área do nutricionista, e continua mostrando o aviso de uso não comercial quando o plano de quem gerou o link é Estudante.

### Onda 3 · Planejador e tabelas

**US-3.1 · Etapas e espaço (3 pts).** Como nutricionista, quero mais espaço para o
plano e saber em que etapa estou.

- **CA-197** · Dado um plano aberto numa tela de pelo menos 1280 px, então o menu lateral vira um trilho só de ícones, com o nome de cada tela ao passar o cursor.
- **CA-198** · Dado o planejador, então as três etapas aparecem num seletor em pílula. A etapa atual é teal e a etapa com dados preenchidos mostra um sinal de feito.
- **CA-199** · Dado o topo do plano, então ele mostra o nome, o jeito de montar e os botões "Link do paciente" e "Exportar".

**US-3.2 · Refeições (5 pts).** Como nutricionista, quero montar o dia vendo só a
refeição em que estou mexendo.

- **CA-200** · Dado a etapa Plano alimentar, então só uma refeição fica aberta. As outras mostram horário, nome, kcal e quantos alimentos têm, e clicar numa delas abre essa e fecha a anterior.
- **CA-201** · Dado a refeição aberta, então ela mostra as opções Principal, Substituto 1 e Substituto 2 num seletor em pílula, com a contagem de alimentos de cada uma.
- **CA-202** · Dado a entrada rápida, quando a pessoa digita, então a sugestão mostra o alimento, a quantidade, a medida caseira e as kcal antes do Enter, como hoje.
- **CA-203** · Dado um alimento no plano, então ele aparece numa linha cinza com nome, medida caseira, gramas editáveis, kcal e os botões de substituir e remover.
- **CA-204** · Dado um alimento sem energia na tabela, então as kcal aparecem como travessão, nunca como zero, como hoje.

**US-3.3 · Resumo do dia (3 pts).** Como nutricionista, quero ver de relance se a
energia e os macros fecham.

- **CA-205** · Dado o resumo do dia, então a energia aparece num anel com o percentual do gasto energético, as kcal do plano e o gasto calculado. A cor do anel segue os três estados de hoje: abaixo de 90%, entre 90% e 110% e acima de 110%.
- **CA-206** · Dado os macros, então cada um mostra gramas, percentual e g/kg (quando há peso), numa barra com a faixa da meta marcada e um ponto na posição atual.
- **CA-207** · Dado o resumo, então ele termina com o botão "Próxima etapa" quando existe próxima etapa.

**US-3.4 · Adequação (5 pts).** Como nutricionista, quero ver o que falta de cada
vitamina e mineral e confiar no número.

- **CA-208** · Dado a etapa Adequação, então o topo mostra quatro cartões: energia, proteína, carboidrato e gordura, com o estado de cada um.
- **CA-209** · Dado a lista de vitaminas e minerais, então cada nutriente ocupa uma linha com: nome, quanto tem de quanto precisa, barra com a marca da meta, percentual, quanto falta e o estado.
- **CA-210** · Dado um nutriente abaixo da meta, então a linha mostra "Cobrir". Nutriente na meta não mostra.
- **CA-211** · Dado um nutriente com alimento sem dado, então a barra aparece listrada com "pelo menos X%" e o estado "Dado incompleto", nunca como se o dado fosse zero.
- **CA-212** · Dado vitamina D, B12 ou folato sem fonte na tabela, então a linha diz "Não dá para avaliar com a tabela brasileira" e o estado "Não avaliado".
- **CA-213** · Dado o seletor de referência (Individual, Coletivo, Personalizado), então ele fica em pílula no topo da lista e recalcula a lista como hoje.

**US-3.5 · Cobrir ao lado (3 pts).** Como nutricionista, quero ver as sugestões sem
perder a lista de vista.

- **CA-214** · Dado "Cobrir" clicado numa tela de pelo menos 1280 px, então as sugestões abrem num painel ao lado da lista, e a linha do nutriente fica marcada. Abaixo disso, abrem como gaveta, como hoje.
- **CA-215** · Dado o painel do Cobrir, então ele mostra quanto falta, quantas kcal cabem até o gasto, a porção máxima e a refeição de destino, e até 5 sugestões com quantidade, medida caseira, kcal e quanto cada uma cobre, com uma barra.
- **CA-216** · Dado "Adicionar" numa sugestão, então o alimento entra na refeição de destino, e a linha do nutriente se atualiza sem fechar o painel.
- **CA-217** · Dado "Nunca sugerir", então o alimento some das sugestões e não volta, como hoje.

**US-3.6 · Tabela de alimentos e Meus produtos (3 pts).** Como nutricionista, quero
que as tabelas sigam o estilo novo e continuem rápidas.

- **CA-218** · Dado a Tabela de alimentos e Meus produtos, então usam os componentes da US-F2, sem foto (D-22), e mantêm a busca, os filtros e o cadastro pelo rótulo de hoje.
- **CA-219** · Dado a busca na Tabela de alimentos, então o resultado continua aparecendo enquanto a pessoa digita, sem travar a tela.

## 4. Casos de borda

- **CB-40** · Sessão que vence com o app aberto: a próxima ação que precisa do servidor leva para Entrar e volta para a mesma tela depois. O que estava digitado no plano não se perde, porque fica salvo no aparelho.
- **CB-41** · Duas abas abertas e sair numa delas: a outra vai para Entrar na próxima ação.
- **CB-42** · Voltar do Mercado Pago em outro navegador (sem sessão): a pessoa passa por Entrar e depois vê a volta do pagamento.
- **CB-43** · Clicar duas vezes em "Pagar": só uma ida ao Mercado Pago acontece.
- **CB-44** · Preço mudou entre abrir o checkout e pagar: vale o preço do servidor, e o checkout avisa se o valor mudou.
- **CB-45** · Conta sem nome no cadastro antigo: o nome sugerido vem do e-mail, como hoje.
- **CB-46** · Landing aberta com sessão vencida: aparece como para visitante, sem erro.
- **CB-47** · Tema escuro em todas as telas novas, inclusive checkout e volta do pagamento.
- **CB-48** · Celular de 360 px em todas as telas novas: nenhuma rolagem para o lado.
- **CB-49** · Link de missões aberto por quem também tem conta: a tela continua sendo a do paciente, sem pedir entrada.

## 5. Fora de escopo, explicitamente

- Sincronizar automático entre aparelhos (continua a cópia na nuvem manual).
- Entrar com Google, verificação em duas etapas e troca de e-mail.
- Cancelar a assinatura dentro do MetaNutri (cancela-se pelo Mercado Pago), cupom, nota fiscal, Pix ou boleto na assinatura.
- Trocar de plano pago com assinatura ativa, e o cálculo proporcional que isso exigiria (CA-163).
- Tela de administração para aprovar Estudante (você aprova no painel do Supabase).
- Publicar termos de uso e política de privacidade (dependem do advogado).
- Fotos no app, fotos por grupo de alimento e ilustrações de lista vazia.
- Mudança de cálculo clínico. Nenhum número da adequação, energia ou macros muda de valor.

## 6. O que fica com você (servidor)

1. **Supabase Auth:** cadastrar o endereço do site como endereço de volta permitido (confirmação e troca de senha).
2. **Resend:** ligar como servidor de e-mail do Supabase e ajustar os textos dos e-mails de confirmação e de troca de senha. Até isso, o envio padrão do Supabase tem limite baixo por hora.
3. **Mercado Pago:** criar a aplicação, guardar o token nas variáveis da função, publicar `assinar` e `webhook-mercadopago` e cadastrar o webhook.
4. **SQL do pedido de Estudante:** rodar o arquivo novo, que cria a tabela e o lugar dos arquivos.
5. **Contato do plano Clínica:** me dizer qual e-mail ou WhatsApp aparece (CA-126).

## 7. Riscos para você revisar

- **R-10** · O link de confirmação e de troca de senha do Supabase volta com dados no endereço, e o MetaNutri usa o endereço para navegar. Precisa ser testado com o Supabase de verdade depois do item 6.1.
- **R-11** · O Mercado Pago pode descartar a parte do endereço depois do `#` na volta do pagamento. A volta deve usar um endereço sem essa parte.
- **R-12** · Assinatura anual pelo Mercado Pago (cobrança a cada 12 meses) precisa ser testada no ambiente de teste deles antes de abrir para clientes.
- **R-13** · A conta obrigatória muda o uso offline: o primeiro acesso em cada aparelho precisa de internet (CA-155).
- **R-14** · Cadastro sem aceite de termos: enquanto o texto não for revisado pelo advogado, o cadastro fica sem essa etapa.
- **R-15** · Se a Manrope não tiver algarismos de largura fixa bons na tela, as colunas de número usam a Inter, que já está no projeto (CA-101).
