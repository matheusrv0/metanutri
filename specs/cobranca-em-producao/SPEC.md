# SPEC — Cobrança pronta para produção

Status: **decisões aprovadas pelo dono** em 06/10/2026 ("corta na primeira recusa", "faça" para os demais itens;
manter a primeira cobrança em até 1 hora). Escrita em 06/10/2026.

**Fonte:** a conversa de 06/10/2026 e a pesquisa na documentação do Mercado Pago do mesmo dia (citada em cada decisão).
Pontos de partida: `specs/checkout-proprio/SPEC.md` (D-65 a D-74) e a lista "Antes da produção" de `docs/pendencias.md`.

**Objetivo:** ninguém usa plano pago sem pagar, ninguém paga sem ter o plano, e o dono consegue ver se os avisos do
Mercado Pago estão chegando, antes de trocar as credenciais de teste pelas de produção.

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-80 | **Corta na primeira recusa.** Quando uma mensalidade é recusada pelo banco, a assinatura é encerrada na operadora (para de tentar de novo) e a conta volta ao Free na hora. Conta e plano diz que a cobrança foi recusada e oferece assinar de novo, com outro cartão | Decisão do dono (06/10). Sem isso, a operadora tenta 4 vezes em 10 dias por parcela e só cancela depois de 3 parcelas recusadas: cerca de 3 meses de plano pago sem pagamento ([assinaturas com pagamento autorizado](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-no-associated-plan/authorized-payments)). Substitui a parte de "tenta por até 10 dias" do D-68 |
| D-81 | **Cancelar antes de alguma mensalidade paga volta ao Free na hora.** Só ganha "vale até o fim do período" quem já teve ao menos uma mensalidade cobrada. Antes de confirmar, a janela de cancelamento diz qual das duas coisas vai acontecer, com a informação lida na operadora naquela hora | A primeira mensalidade cai até cerca de 1 hora depois de assinar; cancelar nessa janela dava um período sem pagar |
| D-82 | A primeira cobrança continua **até cerca de 1 hora** depois de assinar, como o Mercado Pago faz. O plano libera quando o banco autoriza o cartão (D-68 continua) | Decisão do dono (06/10), depois de ver que a documentação não tem cobrança imediata na assinatura e que a montagem "pagamento avulso + assinatura no mês seguinte" não é descrita pronta e arrisca cobrar duas vezes |
| D-83 | O servidor passa a ouvir o **aviso de cada mensalidade** (`subscription_authorized_payment`) além do aviso de status da assinatura. Mensalidade paga: atualiza a próxima cobrança e marca a data da última paga. Mensalidade recusada: aplica o D-80 | É o aviso que diz se cada parcela foi paga ou recusada (`/authorized_payments/{id}`) |
| D-84 | **Registro de avisos:** cada aviso que chega do Mercado Pago fica anotado (quando chegou, o tipo, o código do recurso, se a assinatura digital conferiu e o que foi feito), sem dado pessoal. O registro some sozinho depois de 90 dias | O dono não tem como saber hoje se os avisos chegam; em modo teste o Mercado Pago não manda aviso nenhum ([webhooks](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/your-integrations/notifications/webhooks)), então a primeira conferência real é na primeira compra em produção |
| D-85 | **Assinatura sem dono** (criada na operadora, mas a resposta se perdeu antes de ser gravada aqui): quando o aviso de uma assinatura autorizada não acha a linha dela, o servidor confere a conta. Sem outra assinatura paga ativa, adota a assinatura (grava plano, ciclo e cartão) e a pessoa ganha o plano que está pagando. Com outra ativa, cancela a sobra na operadora. Na própria `assinar`, uma falha de rede depois de pedir a assinatura também faz essa conferência pela busca da operadora | Sem isso, a pessoa vê "Nada foi cobrado" e é cobrada todo mês |
| D-86 | Uma resposta de sucesso da operadora que traga a assinatura **cancelada ou pausada** ao assinar conta como recusa (nada gravado como ativa) | A resposta pode ser 2xx sem a assinatura estar valendo |
| D-87 | A letra dentro dos campos seguros do cartão ganha **fonte reserva** (Manrope, depois a do sistema), se o processador aceitar | Sem a Manrope carregada, o campo cai na fonte padrão do navegador (serifada) |
| D-88 | As três funções do servidor (`assinar`, `gerenciar-assinatura`, `webhook-mercadopago`) ganham **testes que executam a lógica de verdade**, com a operadora e o banco simulados | Hoje os testes só leem o texto do código; o caminho do dinheiro precisa ser exercitado |
| D-101 | **Limite de tentativas com cartão recusado** (emenda de 07/10/2026, da revisão de segurança de 06/10): depois de 5 recusas em 24 horas na mesma conta, ou 30 recusas em 1 hora somando todas as contas, assinar e trocar cartão param de chamar a operadora até passar o prazo. Nenhum endereço de internet é guardado (o cabeçalho pode ser forjado e guardar IP é dado pessoal). A partir da segunda recusa seguida, a mensagem é a genérica, sem o motivo do banco | Sem limite, alguém usa o checkout para testar cartões roubados, e a operadora pode bloquear a conta do dono |
| D-102 | **O aviso só é processado com o segredo configurado** e com o código do recurso no formato esperado (letras e números, até 64) (emenda de 07/10/2026) | Sem o segredo, qualquer um faria a função chamar a operadora com o token do dono |

## 2. Critérios de aceite

### US-C1 · Recusa e cancelamento

- **CA-392** · Dado uma mensalidade recusada (aviso de mensalidade com pagamento recusado), então a assinatura é cancelada na operadora, a linha fica cancelada sem período a respeitar e a conta volta ao Free na hora.
- **CA-393** · Dado uma assinatura encerrada por recusa, então Conta e plano mostra "O banco recusou a cobrança de {data}. A assinatura foi encerrada e a conta voltou ao Free." e o botão "Assinar de novo", que leva ao checkout.
- **CA-394** · Dado uma mensalidade paga, então a próxima cobrança e a data da última mensalidade paga ficam gravadas.
- **CA-395** · Dado "Cancelar assinatura" sem nenhuma mensalidade cobrada ainda, então a janela diz "Ainda não houve cobrança. Cancelando agora, nada é cobrado e a conta volta ao Free na hora." e, confirmado, a conta volta ao Free na hora.
- **CA-396** · Dado "Cancelar assinatura" com ao menos uma mensalidade cobrada, então a janela diz até quando o plano vale (como hoje, CA-377) e, confirmado, o plano vale até essa data.
- **CA-397** · Dado que a janela de cancelamento não consegue falar com o servidor para saber se já houve cobrança, então ela diz que não conseguiu conferir, oferece tentar de novo e não deixa confirmar.

### US-C2 · Avisos e assinatura sem dono

- **CA-398** · Dado qualquer aviso recebido pelo servidor, então ele fica no registro com a hora, o tipo, o código do recurso, se a assinatura digital conferiu e o resultado; avisos com mais de 90 dias somem.
- **CA-399** · Dado um aviso com assinatura digital que não confere, então nada muda nas assinaturas e o registro mostra "assinatura não confere".
- **CA-400** · Dado o aviso de uma assinatura autorizada que não tem linha aqui, e a conta sem outra assinatura paga ativa, então a assinatura é adotada: a linha ganha o plano e o ciclo (achados pelo valor e pela frequência), o cartão e a próxima cobrança, e o plano pago passa a valer.
- **CA-401** · Dado o mesmo caso com a conta já tendo outra assinatura paga ativa, então a assinatura que sobrou é cancelada na operadora e o registro anota "cancelada: sobra".
- **CA-402** · Dado que a `assinar` não recebe resposta da operadora ao pedir a assinatura, então ela procura na operadora uma assinatura desta conta criada há poucos minutos; achando, segue como se a resposta tivesse chegado; não achando, responde que não conseguiu falar com o servidor de cobrança (CA-374).
- **CA-403** · Dado que a operadora responde com sucesso mas a assinatura veio cancelada ou pausada, então a `assinar` responde como recusa (402) e não grava assinatura ativa.

### US-C3 · Qualidade

- **CA-404** · Dado os campos seguros do cartão, então a fonte pedida é a Manrope com a fonte do sistema como reserva.
- **CA-405** · Dado cada uma das três funções, então há testes que executam o caminho de sucesso, de recusa e de falha de rede com a operadora e o banco simulados.
- **CA-433** · Dado 5 recusas de cartão em 24 horas na mesma conta (somando assinar e trocar cartão), quando ela tenta de novo, então a função responde "Muitas tentativas com cartão recusado. Tente de novo amanhã." (429) sem chamar a operadora.
- **CA-434** · Dado 30 recusas de cartão na última hora, somando todas as contas, então a mesma resposta do CA-433 vale para qualquer conta até a contagem da última hora cair abaixo de 30.
- **CA-435** · Dado a segunda recusa seguida na mesma conta, então a resposta usa a mensagem genérica de recusa, sem o código detalhado do banco.
- **CA-436** · Dado que o segredo do aviso não está configurado no servidor, então nenhum aviso é processado e o registro anota "sem segredo".
- **CA-437** · Dado um aviso com código de recurso fora do formato (letras e números, até 64), então nada é processado e o registro anota "recurso inválido".

## 3. Casos de borda

- **CB-96** · O aviso de mensalidade recusada chega duas vezes: a segunda não muda nada nem cancela de novo.
- **CB-97** · O aviso de mensalidade paga chega depois de a pessoa cancelar: a linha continua cancelada, só a data da última mensalidade paga é gravada.
- **CB-98** · O aviso de mensalidade recusada chega para uma assinatura que a pessoa já trocou por outra (cartão novo ou assinatura nova): só a assinatura daquele aviso é afetada.
- **CB-99** · A busca da operadora não aceita filtrar pela conta: a `assinar` busca pelo e-mail e confere a conta em cada resultado.

## 4. Fora de escopo

- Cobrança imediata (pagamento avulso + assinatura no mês seguinte): recusada pelo dono em 06/10/2026 (D-82).
- Trocar de plano com assinatura ativa, reembolso pelo site, nota fiscal (como na `checkout-proprio`).
- Avisar a pessoa por e-mail quando a cobrança for recusada (fica para depois; a tela de Conta e plano avisa).

## 5. O que fica com o dono (a troca para produção)

1. Ativar as credenciais de produção do app MetaNutri no Mercado Pago.
2. Cadastrar o webhook de produção com os tópicos `subscription_preapproval`, `subscription_authorized_payment` e `payments`, e colar no Supabase o token e o segredo do webhook de produção (nunca no chat).
3. Mandar a chave pública de produção (pode ir no chat) para trocar a variável do GitHub e publicar.
4. Fazer a primeira assinatura de verdade com o próprio cartão e cancelar; conferir que os avisos aparecem no registro.

## 6. Riscos para revisar

- **R-37** · A documentação do Mercado Pago é contraditória sobre configurar avisos de assinatura no painel; se o painel não aceitar, o servidor precisa mandar o endereço do aviso ao criar a assinatura, campo que a documentação da assinatura não lista. Confere-se na primeira compra em produção (D-84).
- **R-38** · A operadora diz que, em assinatura sem plano, o e-mail informado precisa bater com o do pagador; em produção, isso pode recusar quem paga com cartão de uma conta do Mercado Pago com outro e-mail. Confere-se na primeira compra real.
- **R-39** · Adotar uma assinatura sem dono pelo valor e pela frequência depende de a tabela de preços do servidor não ter dois planos com o mesmo valor e ciclo.
