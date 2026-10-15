# SPEC — Enviar pelo WhatsApp e retorno marcado

Status: **aprovada pelo dono em 14/10/2026 ('implemente as novidades')**. Revista em 15/10/2026, depois da
revisão de código da frente: as mudanças estão marcadas "(revisão de 15/10)".

**Fonte:** `docs/pesquisa/dietbox-comparativo.md`, seção 3, itens 3 ("Enviar pelo WhatsApp", P) e 2 ("O retorno
marcado", M, com os aniversariantes no mesmo bloco), e seção 4 ("O que não copiar": início lotado, caixa vazia,
quatro canais para falar com o paciente, texto quebrado quando falta o nome).

**Hoje:** a Adesão diz "Vale uma mensagem hoje", mas não tem como mandar. A ficha guarda telefone e nascimento, e
nenhuma tela usa os dois. Não existe data de retorno: o Painel não responde "quem eu atendo hoje?".

## 1. Decisões

| # | Decisão |
|---|---|
| D-140 | **O WhatsApp abre no aparelho do nutricionista**, numa aba nova, pelo endereço `https://wa.me/<55 + DDD + número>?text=<texto>`. O MetaNutri não envia nada: sem serviço pago, sem envio automático, sem conversa dentro do site. Antes de abrir, um diálogo mostra para quem vai e o texto pronto numa caixa que ele edita. É navegação comum: a CSP não muda |
| D-141 | **Só número do Brasil, lido do campo Telefone da ficha.** Conta só o que é dígito. Aceita com ou sem 55 (também +55 e 0055), com ou sem o 0 da ligação de longa distância, com ou sem o nono dígito. O DDD precisa existir; número de 9 dígitos começa com 9; de 8 dígitos começa de 2 a 9. Nada é inventado: o nono dígito não é acrescentado. Número de outro país, curto ou comprido demais é recusado |
| D-142 | **O telefone vem sempre da ficha**; o diálogo não tem campo de telefone. Ficha sem telefone, ou com telefone que não passa no D-141: o diálogo explica e o botão "Cadastre o telefone na ficha" abre a ficha com o cursor no campo Telefone. Plano ou link sem paciente vinculado: o diálogo explica que falta vincular um paciente ao plano |
| D-143 | **Próxima consulta é um campo novo da ficha** (`proximaConsulta`): dia obrigatório, horário opcional, guardado como `AAAA-MM-DD` ou `AAAA-MM-DDTHH:MM`, na hora de Brasília. Vai para a nuvem junto com a ficha (a edição atualiza o `atualizadoEm`); **nenhuma chave nova** no armazenamento. Ficha antiga, sem o campo ou com valor estragado, lê como "sem consulta" |
| D-144 | **Hoje, semana e "já passou" contam no fuso de Brasília** (America/Sao_Paulo), não no fuso do aparelho. "Esta semana" é hoje e os 6 dias seguintes (7 dias corridos), não a semana do calendário: no sábado, a semana ainda mostra a sexta seguinte. (revisão de 15/10) O selo do Painel, o da Adesão e o do cartão do link usam o mesmo "hoje", o de Brasília; o Painel e a Adesão refazem a conta a cada minuto e ao voltar para a aba |
| D-145 | **Consulta que passou sai do Painel e da Adesão.** Com horário, sai 1 hora depois do horário (revisão de 15/10: a tolerância cobre o paciente que atrasa e a consulta em andamento); sem horário, sai quando o dia acaba. Na ficha a data fica, com o aviso "Essa consulta já passou." (mesma regra), até o nutricionista trocar ou limpar |
| D-146 | **O bloco "Hoje e esta semana" fica na coluna da direita do Painel, acima de "Precisa de atenção"**, e só existe quando há consulta ou aniversário nos 7 dias: sem título solto nem caixa vazia. Ordem: por dia; no mesmo dia, o aniversário primeiro e as consultas por horário (sem horário antes das com horário) |
| D-147 | **O estado no bloco é o mesmo da Adesão** (em dia, atenção, sumindo, ainda não começou), do link de missões mais recente do paciente. (revisão de 15/10) **Uma regra só, em todo lugar, para o paciente de um link: o paciente do plano primeiro**; só quando o plano não tem paciente (ou não existe mais) vale o paciente gravado no link. Plano trocado de Ana para Bia: o cartão, a Adesão e o Painel passam a apontar para Bia. Paciente sem link fica sem selo. O bloco lê a nuvem ao aparecer, como a Adesão, para o selo não ficar velho |
| D-148 | **Aniversário usa o `nascimento` que a ficha já guarda.** Quem nasceu em 29/02 aparece em 28/02 nos anos que não são bissextos. Nascimento vazio, inválido ou no futuro não gera aniversário |
| D-149 | **Três lugares para o WhatsApp, cada um com o seu texto:** no cartão do link, ao lado de "Copiar", com o link das missões; na Adesão, só para quem está "Sumindo" ou "Atenção", com uma mensagem de contato; no bloco "Hoje e esta semana", com o lembrete da consulta ("sua consulta é dia X às Y"; "é hoje às Y" quando é hoje) ou os parabéns ("adiantado" antes do dia). Os textos usam só o primeiro nome e, sem nome, começam por "Oi!", sem vírgula nem espaço sobrando. Na Adesão, a data do retorno aparece ao lado do nome |

## 2. Critérios de aceite

### 2.1 Telefone (D-141)

- **CA-500** · Dado o telefone "(11) 98765-4321", "11987654321", "+55 11 98765-4321", "55 11 98765-4321", "0055 11 98765-4321" ou "011 98765-4321" na ficha, então o número do WhatsApp é `5511987654321`.
- **CA-501** · Dado o telefone sem o nono dígito, "(11) 8765-4321", ou fixo, "(11) 3456-7890", então ele é aceito como está (`551187654321`, `551134567890`), sem dígito acrescentado.
- **CA-502** · Dado o telefone vazio, curto ("1234"), comprido demais, com DDD que não existe ("(00) 98765-4321", "(20) 98765-4321"), de 9 dígitos que não começa com 9 ("(11) 88765-4321"), de 8 dígitos que começa com 0 ou 1, ou de outro país ("+351 912 345 678"), então ele é recusado e não existe link.

### 2.2 O diálogo (D-140, D-142)

- **CA-503** · Dado um paciente com telefone válido, quando o nutricionista toca em WhatsApp, então abre o diálogo "Enviar pelo WhatsApp" com o nome do paciente, o número formatado ("Para Ana Souza, (11) 98765-4321. Quem envia é você."; revisão de 15/10, sem repetir "WhatsApp"), o texto pronto numa caixa editável e o botão "Abrir no WhatsApp".
- **CA-504** · Dado o diálogo aberto, quando o nutricionista edita o texto, então "Abrir no WhatsApp" aponta para `https://wa.me/5511987654321?text=` seguido do texto editado, codificado, e abre numa aba nova, sem passar o endereço do MetaNutri (`target="_blank"`, `rel="noopener noreferrer"`). (revisão de 15/10) O leitor de tela ouve "Abrir no WhatsApp (abre em nova aba)"; o "(abre em nova aba)" não aparece na tela.
- **CA-505** · Dado um paciente sem telefone ou com telefone recusado pelo D-141, quando o nutricionista toca em WhatsApp, então o diálogo diz o que falta e o botão "Cadastre o telefone na ficha" abre a ficha dele com o cursor no campo Telefone; não existe link para o WhatsApp.
- **CA-506** · Dado um plano ou um link sem paciente vinculado, quando o nutricionista toca em WhatsApp, então o diálogo explica que falta vincular um paciente ao plano, em Dados e medidas, e não existe link.
- **CA-507** · Dado o paciente "Ana Souza", então o texto pronto começa por "Oi, Ana!"; dado o nome vazio, começa por "Oi!", sem vírgula nem espaço sobrando.

### 2.3 Os três lugares (D-149)

- **CA-508** · Dado um plano com o link de missões gerado, então ao lado de "Copiar" está "WhatsApp", e o texto pronto traz o link do paciente.
- **CA-509** · Dado a Adesão, então a linha de quem está "Sumindo" ou "Atenção" tem "WhatsApp", com uma mensagem de contato que fala das missões; quem está "Em dia" ou "Ainda não começou" não tem o botão.
- **CA-510** · Dado uma consulta no bloco "Hoje e esta semana", então o WhatsApp da linha traz o lembrete "Oi, Ana! Lembrete: sua consulta é dia 16/10 (sexta-feira) às 14:30. Até lá!"; sem horário, a frase termina na data. (revisão de 15/10) Dado a consulta de hoje, o lembrete diz "sua consulta é hoje às 14:30" (ou "é hoje", sem horário).
- **CA-511** · Dado um aniversário no bloco, então o WhatsApp da linha traz os parabéns: no dia, "Feliz aniversário, Ana! Um ótimo dia para você."; (revisão de 15/10) antes do dia, "Feliz aniversário adiantado, Ana! Que o seu dia seja ótimo."

### 2.4 Ficha do paciente (D-142, D-143, D-145)

- **CA-512** · Dado a ficha, então há o cartão "Próxima consulta", com Dia e Horário; vazios para quem não tem consulta, inclusive para a ficha gravada antes deste campo existir.
- **CA-513** · Dado a ficha, quando o nutricionista escolhe o dia e o horário, então a ficha guarda `AAAA-MM-DDTHH:MM` e o `atualizadoEm` muda (a ficha vai para a nuvem); só com o dia, guarda `AAAA-MM-DD`.
- **CA-514** · Dado a ficha sem dia, então o Horário fica desativado; dado um dia, quando o nutricionista toca em "Limpar", então dia e horário saem. (revisão de 15/10) Editar o dia não apaga o horário: enquanto o campo do dia está vazio ou incompleto (o navegador manda `''` e anos como `0002` no meio da digitação), nada é gravado e o horário digitado continua na tela; só "Limpar" tira a consulta. Ano antes de 1900 não é gravado, e o campo pede para conferir a data. Só valor completo e válido vai para a ficha (e para a nuvem): nada é gravado a cada tecla com valor de passagem. Apagar só o horário vale quando o campo do horário perde o foco vazio.
- **CA-515** · Dado uma consulta que já passou (D-145), então a ficha mostra "Essa consulta já passou." abaixo dos campos. (revisão de 15/10: era "Essa data já passou.")
- **CA-516** · Dado um telefone preenchido que o D-141 recusa, então a ficha diz abaixo do campo: "Para o WhatsApp, use DDD e número do Brasil."
- **CA-517** · Dado o endereço `#/paciente/<id>/telefone`, então a ficha abre com o cursor no campo Telefone.

### 2.5 Painel: "Hoje e esta semana" (D-144 a D-148)

- **CA-518** · Dado nenhuma consulta e nenhum aniversário de hoje até daqui a 6 dias, então o Painel não mostra o bloco nem o título dele.
- **CA-519** · Dado consultas de hoje e dos 6 dias seguintes, então o bloco "Hoje e esta semana" lista cada uma com o nome e o quando ("Hoje às 14:30", "Amanhã às 09:00", "Sexta, 16/10 às 10:00"), por dia e horário.
- **CA-520** · Dado uma consulta daqui a 7 dias ou mais, ou uma que já passou (hoje com o horário vencido há mais de 1 hora, ou dia anterior), então ela não aparece; dado uma consulta de hoje às 14:30, então ela aparece até 15:30; dado uma consulta de hoje sem horário, então ela aparece até o fim do dia. (revisão de 15/10: a tolerância de 1 hora)
- **CA-521** · Dado uma consulta da lista, de paciente com link de missões, então a linha mostra o selo do estado, igual ao da Adesão, do link mais recente; sem link, sem selo. A linha do aniversário não leva selo: é parabéns, não cobrança. (Este último ponto foi **refinado durante a implementação**, em 14/10/2026, e registrado aqui.)
- **CA-522** · Dado um aniversário de hoje até daqui a 6 dias, então ele entra no mesmo bloco ("Aniversário hoje", "Aniversário sábado, 17/10"), mesmo sem consulta marcada.
- **CA-523** · Dado 23h30 de 15/10 em Brasília (2h30 de 16/10 em UTC), então "hoje" é 15/10: a consulta de 15/10 sem horário aparece como "Hoje", e a de 16/10 como "Amanhã".

### 2.6 Adesão (D-145, D-149)

- **CA-524** · Dado um paciente da Adesão com consulta que ainda não passou (D-145), então a linha mostra, ao lado do nome, "Retorno sexta, 16/10 às 14:30" (ou "Retorno hoje às 14:30", "Retorno 30/10"); com a consulta passada ou sem consulta, nada.

### 2.7 Dados (D-143)

- **CA-525** · Dado a mesma ficha com a próxima consulta mudada em dois aparelhos, quando a nuvem junta as cópias, então fica a mudança mais nova, com o campo inteiro; e mudar só a próxima consulta já marca a ficha como mudada.
- **CA-526** · Dado uma ficha sem o campo, ou com `proximaConsulta` estragada (`"amanhã"`, `42`, `"2026-13-40"`, `"2026-10-16T25:00"`), então ela abre como "sem consulta" e nenhuma tela quebra.

### 2.8 Tela

- **CA-527** · Dado o celular de 360 px, então a ficha, o Painel com o bloco, a Adesão e o diálogo cabem sem rolar para o lado, e os botões novos têm pelo menos 44 px de altura. (Teste no navegador de cada uma; a Adesão entrou na revisão de 15/10.)
- **CA-528** · Dado o site no navegador, quando o nutricionista marca a próxima consulta na ficha de um paciente com telefone, então o Painel mostra a consulta em "Hoje e esta semana", e o WhatsApp da linha abre o diálogo com o link `https://wa.me/55…` e o lembrete.
- **CA-529** · (revisão de 15/10) Dado o Painel ou a Adesão abertos, quando passa um minuto, ou quando o nutricionista volta para a aba, então "hoje" e "já passou" são refeitos com a hora nova: a consulta de 16:00 sai do bloco às 17:01 sem recarregar a página.

## 3. Casos de borda

- **CB-140** · Telefone com letras, espaços, traços, pontos, parênteses ou texto colado (`javascript:alert(1)`): só os dígitos contam, e o resultado passa ou não pelo D-141. Nenhum `href` sai do campo: o link é sempre `https://wa.me/` mais dígitos.
- **CB-141** · Texto apagado inteiro no diálogo: o link abre a conversa sem texto (`https://wa.me/<número>`, sem `?text=`).
- **CB-142** · Texto com acento, quebra de linha, `&`, `?`, `#` e `%`: vai codificado e chega igual ao WhatsApp. (revisão de 15/10) Texto com caractere quebrado (metade de um emoji colado, um "surrogate" sozinho) não derruba a tela: o pedaço quebrado vira `�` antes de codificar.
- **CB-143** · O WhatsApp não instalado no aparelho: o `wa.me` mostra a página do próprio WhatsApp, que oferece o WhatsApp Web. O MetaNutri não sabe se a mensagem foi enviada e não diz que foi.
- **CB-144** · Paciente excluído com consulta marcada: sai do bloco junto com a ficha. Link de missões cujo paciente foi excluído (e cujo plano não tem outro paciente): o WhatsApp diz que falta vincular um paciente.
- **CB-145** · Paciente com dois links (dois planos): o selo do bloco é o do link criado por último.
- **CB-146** · Nascido em 29/02: em ano não bissexto, o aniversário aparece em 28/02 (D-148).
- **CB-147** · Virada de mês e de ano (consulta ou aniversário entre 28/12 e 03/01): a contagem dos 7 dias atravessa a virada sem pular nem repetir dia.
- **CB-148** · A mesma ficha mudada em dois aparelhos: fica a mudança mais nova (CA-525). Outra aba do mesmo navegador: a lista de pacientes já se refaz sozinha, e o Painel junto.
- **CB-149** · Horário digitado com segundos (`14:30:00`) fica `14:30`; horário sem dia não é guardado.

## 4. Fora de escopo

Calendário em grade; agendamento online pelo paciente; ligação com o Google Agenda; lembrete automático (o
MetaNutri não manda nada sozinho); mais de uma consulta futura por paciente e histórico de consultas; conversa
dentro do MetaNutri; API paga do WhatsApp; número de outro país; textos prontos editáveis por conta; WhatsApp
na ficha do paciente e na lista de Pacientes; aviso da consulta na tela do paciente.

## 5. Riscos

1. **Número antigo sem o nono dígito.** Mantido como está (D-141). Se o WhatsApp não achar a conversa, o
   nutricionista corrige na ficha. Inventar o dígito poderia mandar mensagem para outra pessoa.
2. **Fuso de Brasília para todo mundo.** Quem atende no Acre ou no Amazonas vê "já passou" com 1 ou 2 horas de
   diferença. É o pedido do dono; muda num lugar só se precisar.
3. **O texto do link vai para o WhatsApp.** O link das missões dá acesso às marcações do paciente. Mandar por
   WhatsApp é o mesmo que copiar e colar, que já existe; quem decide é o nutricionista.
