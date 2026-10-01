# SPEC — Conta obrigatória e verificação de estudante e nutricionista

Status: **aguardando sua aprovação**. Escrita em 30/09/2026.

**Fontes:** a conversa de 30/09/2026 e as telas aprovadas no protótipo "Verificação de conta"
(9 telas: criar conta como nutricionista e como estudante, comprovar matrícula, avisos no painel,
conta e plano das duas situações, "Me formei", aprovar estudantes e conferir CRN).

**Objetivo:** ninguém usa o MetaNutri sem conta, e a situação de cada conta (estudante ou
nutricionista) é comprovada: o estudante com e-mail da faculdade e comprovante de matrícula
aprovado por você, o nutricionista com o CRN conferido por você no conselho.

**Esta spec substitui:** as tarefas 16, 18, 24, 25 e 26 do PLAN `estilo-spora` passam a ser
executadas pelo PLAN desta spec, com as mudanças abaixo; a D-28 da `estilo-spora` (Estudante
aprovado sozinho) deixa de valer; as US-A4 e US-A5 da `ajustes-de-uso` passam para cá.

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-39 | **Conta obrigatória para todos**, inclusive o Free. Sem sessão, nenhuma tela de trabalho abre. A ponte provisória de 28/09 sai. Sem servidor configurado (desenvolvimento), o app continua no modo local | Decisão sua de 30/09 |
| D-40 | A **situação** é escolhida no cadastro e guardada no servidor, onde o navegador não consegue mudá-la. Só muda pelo "Me formei" (estudante para nutricionista, com CRN). Nutricionista para estudante não existe na tela | Você pediu que a troca não seja um botão simples |
| D-41 | **Estudante:** e-mail da faculdade obrigatório e confirmado, mais comprovante de matrícula, instituição, matrícula, período e previsão de formatura. **Você aprova à mão.** Até a aprovação, a conta funciona como Free. Substitui a aprovação automática da D-28 | Decisão sua de 30/09: "todas as verificações necessárias" |
| D-42 | O plano Estudante vale **12 meses** a partir da aprovação, ou até o fim do mês da previsão de formatura, o que vier antes. Renova com um comprovante novo | Regra confirmada por você em 30/09 |
| D-43 | O comprovante (PDF, JPG ou PNG, até 5 MB) fica numa área privada e é **apagado 30 dias depois da sua decisão** | LGPD, confirmado por você em 30/09 |
| D-44 | **Nutricionista:** CRN e declaração no cadastro, **conta liberada na hora**. Você confere na Consulta Nacional do CFN. Se não encontrar, a pessoa tem **7 dias** para corrigir. Depois disso, a conta para de exportar documentos | Decisão e regra suas de 30/09 |
| D-45 | A tela **Aprovações** só existe para quem é administrador. O administrador é marcado à mão no servidor | Só você aprova |
| D-46 | A conta obrigatória **só vai para o ar com os Termos de uso e a Política de privacidade publicados**, porque o cadastro passa a receber documento com dado pessoal | Pela LGPD. Os textos esperam seu nome completo e o e-mail do MetaNutri |
| D-47 | Os e-mails de confirmação e de troca de senha saem pelo **Gmail do MetaNutri** até existir o domínio | Sem servidor de e-mail próprio, o Supabase só envia e-mail para a equipe do projeto |

## 2. Escopo

**Entra:** portão de conta; Criar conta com a situação; Comprovar matrícula; avisos do estudante
no painel; Conta e plano com a situação; Me formei; correção de CRN; Aprovações (estudantes e
CRN); Preços com o botão certo; Termos e Política; no servidor, perfil com a situação, pedidos de
estudante, área privada dos comprovantes e limpeza dos 30 dias; testes de ponta a ponta e publicação.

## 3. Histórias e critérios de aceite

Pessoas: **visitante** (sem conta), **nutricionista**, **estudante** e **administrador** (você).

### US-B1 · Conta obrigatória (3 pts)

- **CA-258** · Dado o servidor configurado e alguém sem sessão, quando abre qualquer tela de trabalho, então vai para Entrar e, depois de entrar, volta para a tela que pediu.
- **CA-259** · Dado alguém sem sessão, quando clica em "Começar grátis", "Criar conta" ou no botão de um plano, então vai para Criar conta, nunca direto para o painel.
- **CA-260** · Dado o servidor não configurado, então o app abre sem conta, no modo local, como hoje.
- **CA-261** · Os CA-151 a CA-156 da `estilo-spora` (dono dos dados do aparelho, uso sem internet e sair) valem como escritos.

### US-B2 · Criar conta com a situação (5 pts)

Os CA-128 e CA-130 a CA-134 da `estilo-spora` continuam valendo. Os CA-127 e CA-129 são substituídos pelos abaixo.

- **CA-262** · Dado a tela Criar conta, então ela pede nome completo, e-mail, senha, "Você é" (dois cartões: Nutricionista e Estudante de Nutrição) e o aceite dos Termos de uso e da Política de privacidade. Do lado aparece o plano marcado, ou o Free.
- **CA-263** · Dado "Nutricionista" escolhido, então aparecem o CRN (região de CRN-1 a CRN-11 e número) e a caixa "Declaro que este CRN é meu e está ativo.", os dois obrigatórios.
- **CA-264** · Dado um CRN sem região, sem número ou com número que tenha algo além de algarismos e de um P final, quando a pessoa envia, então o erro aparece ao lado do campo e nada vai para o servidor.
- **CA-265** · Dado "Estudante" escolhido, então o e-mail passa a se chamar "E-mail da faculdade", a tela mostra "Passo 1 de 2" e pede a caixa "Declaro ter matrícula ativa no curso de Nutrição.".
- **CA-266** · Dado "Estudante" e um e-mail que não é de faculdade (domínio da lista de faculdades, um subdomínio dele ou qualquer `.edu.br`), quando a pessoa envia, então aparece "Use o e-mail que a sua faculdade forneceu" e nada vai para o servidor.
- **CA-267** · Dado a tela aberta pelo botão do plano Estudante, então "Você é" já vem em Estudante e o cartão Nutricionista fica indisponível.
- **CA-268** · Dado nenhum cartão escolhido, nenhuma caixa obrigatória marcada ou o aceite dos termos desmarcado, quando a pessoa envia, então o erro aparece ao lado e nada vai para o servidor.
- **CA-269** · Dado um cadastro aceito, então o servidor guarda o nome, a situação e, para nutricionista, o CRN e a data da declaração. Nenhuma chamada do navegador consegue mudar a situação depois.
- **CA-270** · Dado uma estudante que confirma o e-mail, então ela chega à tela Comprovar matrícula. Um nutricionista que confirma vai para o painel, ou para o checkout se marcou um plano pago.

### US-B3 · Comprovar matrícula (5 pts)

- **CA-271** · Dado a tela Comprovar matrícula, então ela mostra "Passo 2 de 2" e o e-mail da faculdade confirmado, e pede instituição, matrícula, período atual (1º a 12º), previsão de formatura (mês e ano, a partir do mês atual) e o comprovante. O curso aparece fixo: Nutrição.
- **CA-272** · Dado um arquivo que não é PDF, JPG ou PNG, ou maior que 5 MB, então o erro aparece ao lado do campo e nada é enviado.
- **CA-273** · Dado tudo preenchido, quando a pessoa clica em "Enviar para análise", então o pedido fica em análise, e ela vai para o painel com o aviso de análise.
- **CA-274** · Dado "Fazer isso depois", então a pessoa vai para o painel com o aviso "Envie seu comprovante de matrícula", que volta para esta tela.
- **CA-275** · Dado um pedido em análise, então a tela mostra que ele está em análise, em vez do formulário. Só existe um pedido em análise por vez.
- **CA-276** · Dado clique duplo em "Enviar para análise", então só um pedido é criado.
- **CA-277** · Dado o servidor fora ou sem internet, quando a pessoa envia, então aparece o aviso, o que foi preenchido continua na tela e o botão volta a funcionar.
- **CA-278** · Dado uma estudante sem aprovação, então a conta funciona como Free, com os limites do Free.

### US-B4 · Avisos da estudante no painel (2 pts)

- **CA-279** · Dado uma estudante, então o painel mostra um aviso conforme o pedido: falta enviar (com botão para enviar), em análise ("até 2 dias úteis"), recusado (com o motivo e o botão "Enviar outro") ou aprovado (com a validade).
- **CA-280** · Dado o aviso de aprovado, quando a pessoa o fecha, então ele não volta.
- **CA-281** · Dado "Enviar outro", então Comprovar matrícula abre com os dados do pedido anterior já preenchidos, menos o arquivo.

### US-B5 · Conta e plano com a situação (3 pts)

- **CA-282** · Dado uma estudante, então Conta e plano mostra o cartão da situação: instituição, previsão de formatura, matrícula, data da verificação e o selo (Matrícula verificada, Em análise, Falta enviar ou Recusada), com o botão "Me formei".
- **CA-283** · Dado um nutricionista, então o cartão mostra o CRN, a data da declaração e o selo (CRN em conferência, Conferido ou Não encontrado), sem nenhum botão para trocar de situação.
- **CA-284** · Dado qualquer conta, então o cartão do plano mostra o nome, o valor e, no Estudante, até quando vale.
- **CA-285** · Dado um plano Estudante vencido, então a conta volta ao Free, e o painel pede um comprovante novo pelo mesmo caminho do CA-279.

### US-B6 · Me formei (2 pts)

- **CA-286** · Dado "Me formei", então abre uma janela que pede o CRN e a declaração, e avisa que o plano Estudante termina e que os planos alimentares e os pacientes continuam salvos.
- **CA-287** · Dado a confirmação, então a situação passa a Nutricionista com o CRN em conferência, o plano Estudante termina (a conta vai para o Free), e os documentos passam a sair com o nome e o CRN.
- **CA-288** · Dado "Cancelar" ou fechar a janela, então nada muda.

### US-B7 · CRN não encontrado (2 pts)

- **CA-289** · Dado um CRN marcado como não encontrado, então o painel e Conta e plano mostram "Não encontramos seu CRN no conselho", o prazo de 7 dias e um campo para corrigir. Corrigir volta o CRN para "em conferência".
- **CA-290** · Dado 7 dias sem correção, então exportar (PDF, Word e imprimir) fica bloqueado com o motivo na tela. O resto do app continua funcionando.

### US-B8 · Aprovações, só para o administrador (5 pts)

- **CA-291** · Dado um administrador, então o menu tem "Aprovações" com o total pendente, e a tela tem duas abas, Estudantes e CRN, cada uma com o seu total pendente.
- **CA-292** · Dado quem não é administrador, então o menu não tem "Aprovações", e o endereço da tela leva ao painel.
- **CA-293** · Dado a aba Estudantes, então ela lista os pedidos em análise, do mais antigo para o mais novo, e o pedido aberto mostra nome, e-mail com o selo "E-mail da faculdade confirmado", instituição, curso, matrícula, período, previsão de formatura, data de envio, o comprovante (que abre em tamanho real) e a lista do que conferir.
- **CA-294** · Dado "Aprovar", então o plano Estudante fica ativo com a validade da D-42, o pedido sai da lista e a pessoa passa a ver o aviso de aprovado.
- **CA-295** · Dado "Recusar", então é preciso escolher um motivo (ilegível, sem o seu nome, não mostra o semestre atual, outro curso, ou outro motivo escrito), e esse motivo aparece para a pessoa.
- **CA-296** · Dado a aba CRN, então ela lista os CRN em conferência e os decididos nos últimos 30 dias, com nome, CRN, data da conta e situação. "Abrir a Consulta Nacional do CFN" abre o site do conselho em outra aba. "Conferido" e "Não encontrado" decidem, e "Desfazer" volta para "em conferência".
- **CA-297** · Dado quem não é administrador chamando o servidor direto, então não lê pedidos nem comprovantes de outras pessoas e não decide nada.

### US-B9 · Comprovante e privacidade (2 pts)

- **CA-298** · Dado um comprovante, então só a própria pessoa e os administradores conseguem abri-lo.
- **CA-299** · Dado 30 dias depois da decisão, então o arquivo é apagado. O pedido guarda só os dados digitados e a decisão.
- **CA-300** · Dado uma conta excluída, então o perfil, os pedidos e os comprovantes dela são apagados junto.

### US-B10 · Preços, termos e publicação (3 pts)

- **CA-301** · Os critérios da Tarefa 16 da `estilo-spora` (Preços com o botão certo) valem como escritos.
- **CA-302** · Os CA-220 a CA-224 da `estilo-spora` (Termos e Política) valem, e a Política também diz o que é o comprovante, para que serve, quem vê e quando é apagado.
- **CA-303** · Dado o site publicado com a conta obrigatória, então os Termos e a Política já estão no ar (D-46).

## 4. Casos de borda

- **CB-60** · Faculdade cujo domínio não está na lista: a pessoa não consegue criar a conta de estudante, e a tela oferece criar no Free e o e-mail de contato para pedir a inclusão do domínio.
- **CB-61** · Dois administradores decidem o mesmo pedido ao mesmo tempo: vale a primeira decisão, e o segundo vê que o pedido já foi decidido.
- **CB-62** · Comprovante que não abre: o administrador recusa com "Ilegível".
- **CB-63** · Estudante com assinatura paga ativa (Solo ou Pro): a aprovação registra a matrícula verificada, mas não troca o plano pago.
- **CB-64** · "Me formei" com assinatura paga ativa: o plano pago continua.
- **CB-65** · CRN corrigido depois do bloqueio do CA-290: volta para "em conferência" e exportar volta a funcionar.
- **CB-66** · Administrador sem internet: a ação avisa que não foi salva, e o pedido continua na lista.
- **CB-67** · Contas anteriores a esta mudança: em 30/09/2026 o servidor tem zero contas, então não há migração.

## 5. Fora de escopo, explicitamente

- Avisar a aprovação ou a recusa por e-mail (a pessoa vê no app).
- Conferir o CRN automaticamente no CFN.
- Passar de nutricionista para estudante pela tela.
- Pedir documento de identidade.
- Trocar o e-mail da conta.

## 6. O que fica com você

1. **Login no Supabase:** os três passos de configuração e o Gmail do MetaNutri (já pedidos).
2. **SQL novo:** rodar o arquivo que eu preparar e se marcar como administrador (uma linha, com o seu e-mail). Eu te passo o passo a passo.
3. **Termos:** seu nome completo e o e-mail do MetaNutri. Sem eles, tudo fica pronto, mas não vai para o ar (D-46).

## 7. Riscos para você revisar

- **R-23** · O Gmail como remetente tem limite de cerca de 500 e-mails por dia e pode cair no spam. Trocar pelo domínio quando você comprar.
- **R-24** · O bloqueio de exportação do CA-290 acontece no navegador, porque o PDF é gerado no aparelho. Alguém com conhecimento técnico consegue contornar.
- **R-25** · A aprovação manual depende de você. Se passar de 2 dias úteis, a estudante fica esperando sem aviso por e-mail.
- **R-26** · A limpeza dos 30 dias depende de uma tarefa agendada no servidor. Se ela parar, os arquivos ficam além do prazo prometido na Política.
