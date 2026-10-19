# SPEC — Excluir a conta pelo site

Status: **pedida pelo dono em 19/10/2026 ("resolva todo o resto"); aprovação pelas telas antes de publicar.** Vem da
pendência de segurança "M8: exclusão de conta completa — cancela no Mercado Pago, apaga comprovantes". É o direito de
eliminação da LGPD (art. 18, VI): hoje a conta só sai por pedido no e-mail de contato.

**Specs que já tratam do assunto:** `dados-na-nuvem` (D-131: "Sair" apaga a cópia de trabalho; R5: ao excluir uma
conta, encerrar as sessões dela; fora de escopo "Excluir a conta pelo site"), `seguranca-lote-4` (fora de escopo:
"Excluir a conta pelo site"), `checkout-proprio` e `cobranca-em-producao` (o cancelamento da assinatura, que esta spec
reusa sem mudar), `seguranca-lote-2` (D-108 e D-110: limite de chamadas e tamanho do pedido), `seguranca-lote-3`
(D-113: verificação contra robôs na senha), `painel-do-dono` (D-58: o histórico das assinaturas e o gráfico de receita).

## 1. Decisões

| # | Decisão |
|---|---|
| D-250 | **O caminho fica em Conta e plano, no último bloco.** Só aparece com a conta aberta (no modo local não existe conta para excluir). O botão "Excluir conta" abre uma janela que diz, em frases curtas, o que some, que não dá para desfazer, oferece "Baixar backup" antes (o mesmo arquivo de Configurações) e pede a senha |
| D-251 | **A confirmação é a senha.** A pessoa digita a senha na janela e o site confere com o servidor de login, com a verificação contra robôs, como em Entrar (D-113). O servidor só exclui se a senha foi conferida há no máximo 10 minutos: ele lê a hora do login no próprio token da sessão. Senha e não frase digitada: num computador compartilhado com a conta aberta, digitar uma frase qualquer não prova que é a dona da conta. Senha e não código por e-mail: protege igual, com um passo a menos. Quem esqueceu a senha usa "Esqueci a senha" antes |
| D-252 | **A ordem no servidor, para nunca ficar pela metade.** A função nova `excluir-conta` faz: (1) confere a sessão, a hora da senha, se é administradora e o limite de pedidos; (2) cancela a assinatura paga pelo mesmo caminho do "Cancelar assinatura" de hoje; se a operadora não responder, para aqui sem apagar nada; (3) apaga os comprovantes de matrícula do armazenamento; (4) apaga o login. Ao apagar o login, o banco apaga junto, num passo só, todas as linhas da conta e guarda só o que o D-253 diz. Antes do passo 4, a conta funciona com todos os dados (no máximo, sem os arquivos dos comprovantes). Depois do passo 4, não sobra nada da conta e ninguém entra com aquela senha. Pedir de novo faz só o que falta; pedir depois de terminar responde "já excluída" |
| D-253 | **O que fica guardado depois da exclusão, e por quê.** (a) O registro da última assinatura no Mercado Pago, por 5 anos: o código dela no Mercado Pago, plano, ciclo, valor, a data da última mensalidade paga, quem encerrou e quando, e a data da exclusão. Sem nome, sem e-mail, sem cartão e sem o código da conta. Motivo: a lei fiscal manda guardar o que prova receita por 5 anos, e a pessoa pode contestar uma cobrança depois (LGPD, art. 16, I). Os dados de quem pagou ficam no Mercado Pago, que os guarda por obrigação própria; o código da assinatura é o que liga as duas pontas. Depois de 5 anos o registro se apaga sozinho. (b) O histórico das mudanças de plano, que o gráfico de receita do painel do dono lê, com o código da conta trocado por um código novo, sorteado, que não leva à pessoa. Sem isso, cada exclusão mudaria a receita dos meses que já passaram. (c) O registro de avisos do Mercado Pago, que já não tem dado pessoal e some em 90 dias. Todo o resto é apagado: a cópia na nuvem, os links dos pacientes (missões, marcações e dieta), o perfil (nome, situação e CRN), os pedidos de estudante, os comprovantes, a assinatura com a bandeira e o final do cartão, as tentativas e as chamadas à cobrança, e o login (e-mail e senha). (a) e (b) são feitos pelo próprio banco ao apagar o login: valem também quando o dono exclui uma conta pelo painel do Supabase, a pedido por e-mail |
| D-254 | **Conta de administrador não se exclui pelo site.** O bloco diz "Conta de administrador não é excluída pelo site." sem o botão, e o servidor recusa. Excluir o único administrador deixaria ninguém para aprovar estudantes e conferir CRN |
| D-255 | **Depois de excluir, o navegador faz o mesmo que "Sair".** Apaga a cópia de trabalho da conta, encerra a sessão e abre a página inicial com "Sua conta foi excluída." no topo, dentro da página. O e-mail pode criar uma conta nova depois; ela começa vazia |
| D-256 | **Limites.** Até 5 pedidos de exclusão por hora por conta, no mesmo registro de chamadas do D-108, contados depois de a sessão e a senha passarem. O pedido vai até 64 KB, como o D-110 |
| D-257 | **A Política de privacidade e os Termos dizem como excluir.** A Política diz onde excluir, o que some na hora, o que fica (D-253) e por quanto tempo, e que cópias de segurança do banco somem em até 90 dias. Os Termos, em "Encerramento", trocam "Peça a exclusão pelo e-mail" por "use Conta e plano", e o e-mail continua valendo. A versão dos dois passa a ser a de 19/10/2026 (quem publica acerta para o dia em que o site vai ao ar) |
| D-258 | **Outro aparelho com a conta aberta.** A sessão de lá para de valer: não salva mais nada e cai ao renovar. A cópia de trabalho daquele navegador só é apagada quando alguém sai da conta nele. Por isso a janela pede: "Em outro aparelho com a conta aberta, saia antes." |

## 2. Critérios de aceite

### Tela

- **CA-800** · Dado uma conta aberta, quando a pessoa vai a Conta e plano, então o último bloco tem o botão "Excluir conta". Sem servidor de conta (modo local) ou sem sessão, o bloco não aparece.
- **CA-801** · Dado uma conta de administrador, então o bloco diz "Conta de administrador não é excluída pelo site." e não tem o botão.
- **CA-802** · Dado o clique em "Excluir conta", então abre a janela "Excluir sua conta?", que diz que não dá para desfazer e lista o que some: os pacientes, os planos e o resto dos dados na nuvem; os links dos pacientes, que deixam de abrir; a situação, o CRN e os comprovantes de matrícula. Diz também a frase do D-258. "Manter conta" recebe o foco.
- **CA-803** · Dado uma assinatura paga ativa (ou pendente ou pausada, do cartão), então a janela diz também "A assinatura é cancelada, sem novas cobranças."
- **CA-804** · Dado a janela aberta, quando a pessoa clica em "Baixar backup", então baixa o mesmo arquivo do backup de Configurações e a janela continua aberta.
- **CA-805** · Dado a janela, então ela tem o campo "Sua senha", e o botão "Excluir conta" só fica liberado com a senha digitada.
- **CA-806** · Dado a senha errada, quando a pessoa confirma, então a janela diz "Senha incorreta." e nada é apagado.
- **CA-807** · Dado a senha certa, quando a pessoa confirma, então o botão mostra que está excluindo, um segundo clique não manda outro pedido e o servidor exclui a conta (CA-812).
- **CA-808** · Dado a exclusão feita, então o navegador apaga a cópia de trabalho da conta (como em Sair), a sessão termina e o site abre a página inicial com "Sua conta foi excluída." no topo.
- **CA-809** · Dado que o servidor não termina (falha, sem resposta ou a operadora fora), então a janela diz "Não deu para terminar a exclusão. Sua conta continua ativa. Tente de novo em alguns minutos." e continua aberta para tentar de novo.
- **CA-810** · Dado 5 pedidos de exclusão na última hora, então a janela diz "Muitas tentativas seguidas. Espere uma hora e tente de novo."
- **CA-811** · Dado a verificação contra robôs ligada, quando a pessoa confirma, então a conferência da senha leva a verificação, como em Entrar, e os textos do CA-458, CA-460 e CA-461 valem aqui.

### Servidor (função `excluir-conta` e banco)

- **CA-812** · Dado um pedido válido (sessão, senha conferida há no máximo 10 minutos, conta que não é de administrador), então somem a cópia na nuvem, os links (missões, marcações e dieta), o perfil (nome, situação e CRN), os pedidos de estudante, os comprovantes no armazenamento, a assinatura com o cartão, a reserva, as tentativas e as chamadas à cobrança; o login deixa de existir e a senha antiga não entra mais. A resposta é 200.
- **CA-813** · Dado o link de um paciente da conta excluída, quando o paciente abre, então vê "Este link não existe mais".
- **CA-814** · Dado uma assinatura paga ativa, então ela é cancelada na operadora pelo mesmo caminho do "Cancelar assinatura", antes de qualquer coisa ser apagada. Se a operadora não responder, nada é apagado e a resposta é a frase do CA-809 (502).
- **CA-815** · Dado um pedido sem sessão, então a resposta é 401 e nada muda.
- **CA-816** · Dado uma sessão cuja senha foi conferida há mais de 10 minutos, então a resposta é 401 com "Confirme sua senha de novo." e nada muda.
- **CA-817** · Dado uma conta de administrador, então a resposta é 403 com a frase do CA-801 e nada muda.
- **CA-818** · Dado a conta excluída que tinha assinatura no Mercado Pago (ativa, cancelada, pendente ou pausada), então fica uma linha no registro de assinaturas de contas excluídas, com o código da assinatura no Mercado Pago, plano, ciclo, valor, a última mensalidade paga, quem encerrou e quando, e a data da exclusão; sem nome, sem e-mail, sem cartão e sem o código da conta. Conta sem assinatura no Mercado Pago (Free ou Estudante) não deixa linha.
- **CA-819** · Dado o histórico de mudanças de plano da conta excluída, então as linhas dele ficam, todas com um mesmo código novo que não é o da conta, e a receita dos meses passados no painel do dono não muda.
- **CA-820** · Dado outra conta, então nada dela muda com a exclusão.
- **CA-821** · Dado uma falha em qualquer passo, quando a pessoa pede de novo, então o pedido faz só o que falta e termina. Dado o pedido repetido depois de a conta sumir, com a mesma sessão, então a resposta é 200 "já excluída".
- **CA-822** · Dado 5 pedidos de exclusão na última hora na mesma conta, então o próximo recebe 429 com "Muitas tentativas seguidas. Espere uma hora e tente de novo." sem fazer nada.
- **CA-823** · Dado um pedido acima de 64 KB, então a resposta é 413 sem fazer nada.
- **CA-824** · Dado uma conta comum ou um visitante sem login, então eles não leem nem escrevem o registro de assinaturas de contas excluídas, e o histórico continua fechado para eles.
- **CA-825** · Dado uma linha do registro com mais de 5 anos, quando outra conta é excluída, então ela é apagada.
- **CA-826** · Dado o dono excluindo uma conta pelo painel do Supabase (pedido por e-mail), então o banco faz o mesmo do CA-818 e do CA-819.

### Textos legais

- **CA-827** · Dado a Política de privacidade, então ela diz que a conta pode ser excluída em Conta e plano, com a senha; que os dados saem da nuvem na hora, inclusive os dos pacientes e os links; o que fica (o registro da última assinatura paga por 5 anos, sem nome, e-mail nem cartão; o histórico de planos sem ligação com a pessoa; os avisos do Mercado Pago por 90 dias); que cópias de segurança do banco somem em até 90 dias; e que o pedido pelo e-mail continua valendo. A data é 19 de outubro de 2026.
- **CA-828** · Dado os Termos de uso, então "Encerramento" diz que a conta é excluída em Conta e plano, na hora, e que também dá para pedir pelo e-mail.

### Tela pequena

- **CA-829** · Dado a tela de 360 px, então o bloco e a janela cabem sem rolagem para o lado, e os botões (inclusive o de mostrar a senha) têm pelo menos 44 px de altura. O campo de senha segue os campos do site (DESIGN.md, "Campos").

## 3. Casos de borda

- **CB-250** · A resposta se perde depois de o servidor excluir: o próximo clique não confere a senha de novo (ela foi conferida há pouco), o servidor responde "já excluída" e o navegador termina como no CA-808.
- **CB-251** · Falha depois de cancelar a assinatura e antes de apagar o login: a conta continua, com a assinatura cancelada (o período pago, se houver, continua valendo). O pedido seguinte não cancela de novo na operadora.
- **CB-252** · Dois pedidos ao mesmo tempo (duas abas): nada sai feito duas vezes. Assinatura já cancelada não é cancelada de novo, arquivo que já sumiu não dá erro, o login já apagado conta como feito, e o registro do CA-818 não fica duplicado. Se um pedido terminar enquanto o outro ainda está no meio, o segundo pode responder a frase do CA-809; o clique seguinte acha a conta já excluída e termina (CB-250).
- **CB-253** · Pagamento em andamento em outra aba na mesma hora: se a assinatura nascer na operadora depois de a conta sumir, a função `assinar` não consegue gravar e cancela lá, e o aviso da operadora cancela assinatura de conta que não existe (CB-111). Nada novo aqui.
- **CB-254** · O aviso da operadora sobre a assinatura cancelada chega depois da exclusão: não acha a linha e é ignorado, sem erro (já é assim).
- **CB-255** · Outro aparelho com a conta aberta tenta salvar: o banco recusa linha de uma conta que não existe, e nada volta para a nuvem (D-258).
- **CB-256** · Sessão perto de vencer com a janela aberta: conferir a senha renova a sessão.
- **CB-257** · Sem internet: conferir a senha falha com "Não deu para falar com o servidor. Confira a internet e tente de novo." e nada muda.
- **CB-258** · Conta sem perfil, sem assinatura e sem comprovante (criada pelo painel do Supabase, por exemplo): é excluída do mesmo jeito.
- **CB-259** · Mais de 100 arquivos na pasta da conta no armazenamento: todos saem (a lista é lida em páginas).

## 4. Fora de escopo

- Confirmar a exclusão com código por e-mail, e verificação em duas etapas.
- O administrador excluir outra conta pelo site, ou a própria conta de administrador (D-254).
- Devolver valor já pago. A janela não promete nem nega devolução.
- Apagar a cópia de trabalho de outros navegadores onde a conta estava aberta (D-258).
- Apagar os registros de acesso do servidor de login do Supabase (data, hora e endereço de internet), que a lei manda
  guardar por 6 meses (Marco Civil da Internet, art. 15).
- Mandar e-mail avisando que a conta foi excluída.
- Mudar as funções de cobrança: o Mercado Pago continua em teste, e o cancelamento é o de hoje.

## 5. Riscos

- **R1** · Os comprovantes saem antes do login (passo 3 antes do 4). Se o passo 4 falhar e a pessoa desistir, o pedido
  de estudante dela fica sem o arquivo, e o administrador vê o pedido sem comprovante. O passo 3 vem antes porque, apagado
  o login, só a chave de serviço acharia os arquivos, e a limpeza ficaria com o dono.
- **R2** · O registro do D-253 (a) guarda só a assinatura atual da conta: o banco já não guarda as anteriores (uma
  assinatura nova grava por cima). As mensalidades de todas ficam no painel do Mercado Pago.
- **R3** · O código da assinatura no Mercado Pago leva à pessoa para quem tem acesso ao painel do Mercado Pago (o dono).
  É dado pessoal guardado por obrigação legal (LGPD, art. 16, I), não dado anônimo, e por isso tem prazo.
- **R4** · Se o painel do Supabase grava o registro de auditoria do login no banco, ele guarda o e-mail e o endereço de
  internet de quem entrou, e isso não sai com a conta. O dono confere no painel (seção 6 do PLAN).
