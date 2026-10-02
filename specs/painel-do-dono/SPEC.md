# SPEC — Painel do dono (tela Negócio)

Status: **aprovada** em 02/10/2026. Escrita em 02/10/2026, a partir do protótipo "Painel do dono
MetaNutri" (`https://claude.ai/code/artifact/350562ab-0dae-4401-84b3-e08e1f6f7a6a`), aprovado
no mesmo dia ("aprovo").

**Fonte:** a conversa de 02/10/2026: "eu tenho painel administrativo onde vou ver finanças, quem
usa, quem assinou e tudo mais? algo bem completo pro negócio? se não tiver, crie, não vou ser nem
estudante nem nutri, então preciso desse acesso único".

**Objetivo:** o dono do MetaNutri abre uma tela e vê quanto entra por mês, quem assina qual plano,
quantas contas existem, como quem chega se converte e quem são as pessoas cadastradas, sem abrir o
painel do Supabase nem o do Mercado Pago.

Entra entre a parte 5 e a parte 6 do lançamento (ver `docs/decisoes.md`, 30/09/2026).

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-55 | Uma tela nova, **Negócio**, no grupo **Administração** do menu, ao lado de Aprovações. Só o administrador vê, e o banco confere isso em cada leitura | Protótipo aprovado. Mesmo caminho de Aprovações: esconder a tela é conforto, quem protege é o banco |
| D-56 | A conta do dono **não tem situação** (nem nutricionista nem estudante). Ela é criada no painel do Supabase e marcada como administradora por SQL | Pedido seu: "não vou ser nem estudante nem nutri". O app já deixa o administrador entrar sem situação |
| D-57 | **Receita por mês** é a soma das assinaturas pagas ativas (Solo, Pro e Clínica). O anual entra dividido por 12. Estudante e Free não entram | É o número que diz quanto o negócio fatura por mês, comparável entre mensal e anual |
| D-58 | O banco passa a **guardar o histórico** de cada mudança de assinatura. O gráfico começa no mês em que esse histórico começou; os meses anteriores não aparecem | Hoje o banco guarda só a situação atual de cada assinatura, e sem histórico não existe gráfico por mês |
| D-59 | O banco passa a **guardar se a assinatura é mensal ou anual**. As que já existem são marcadas pelo valor cobrado | Hoje isso não fica salvo, e é o que separa "Solo mensal" de "Solo anual" |
| D-60 | A coluna do protótipo "Último acesso" vira **"Último login"** | O banco só sabe quando a pessoa entrou com e-mail e senha. Quem deixa o app aberto por semanas não aparece como ativo, e "acesso" prometeria mais do que o número diz |
| D-61 | A linha do protótipo "Cópias na nuvem feitas em 30 dias" vira **"Contas que atualizaram a cópia na nuvem em 30 dias"** | O banco guarda só a última cópia de cada conta, então não dá para contar quantas cópias foram feitas |
| D-62 | No funil, a porcentagem de cada etapa é **sobre quem criou conta**, e "assinaram" conta quem tem plano pago ativo mesmo que o CRN ainda esteja em conferência | O nutricionista assina na hora (D-39). Contar só verificados esconderia assinantes de verdade |
| D-63 | A tela **não mostra** planos, pacientes nem nada que o nutricionista guarda no aparelho. Taxas, estornos e repasses ficam no Mercado Pago, com um link para lá | Plano e paciente são dado de saúde de terceiros (LGPD) e moram no aparelho. O site só sabe se a assinatura está ativa |
| D-64 | A **Política de privacidade** passa a dizer que os dados da conta também servem para o responsável acompanhar o serviço, e corrige quem manda os e-mails: **Resend**, não Gmail. A data dos termos passa a 02/10/2026 | A política diz para que cada dado serve. O Gmail saiu em 01/10 (D-47) e o texto ficou para trás. Ninguém aceitou os termos ainda, então trocar a data não pede aceite de novo |

## 2. Escopo

**Entra:** a tela Negócio e o item no menu; as leituras novas no banco (contas, histórico de
assinaturas, uso), todas só para administrador; o histórico de assinaturas e o ciclo
mensal/anual no banco; a função `assinar` passa a gravar o ciclo; duas frases da Política de
privacidade (D-64).

## 3. Histórias e critérios de aceite

Pessoas: **dono** (a conta de administrador) e **qualquer outra conta**.

### US-B1 · Chegar ao painel (1 pt)

Como dono, quero abrir o painel pelo menu, sem que mais ninguém consiga.

- **CA-342** · Dado a conta de administrador, então o menu mostra "Negócio" no grupo Administração, antes de "Aprovações", e o endereço `#/negocio` abre a tela com o título "Negócio".
- **CA-343** · Dado qualquer outra conta, então o menu não mostra "Negócio", e o endereço `#/negocio` leva ao Painel.
- **CA-344** · Dado uma conta que não é administradora chamando direto as leituras do banco, então o banco recusa com "Só o administrador vê estes números." e não devolve nenhuma linha.

### US-B2 · Os quatro números (2 pts)

Como dono, quero ver a saúde do negócio num relance.

- **CA-345** · Dado a tela, então o topo mostra quatro cartões, nesta ordem: **Receita por mês** (o cartão de destaque, em teal), **Assinaturas ativas**, **Contas** e **Preço de fundador**.
- **CA-346** · Dado o cartão Receita por mês, então ele mostra a soma do D-57 em reais ("R$ 1.235,85") e, embaixo, a diferença para a receita de 30 dias antes ("+R$ 209,40 em 30 dias", "−R$ 34,90 em 30 dias" ou "Igual a 30 dias atrás").
- **CA-347** · Dado o cartão Assinaturas ativas, então ele mostra quantas assinaturas pagas estão ativas e, embaixo, a parte das contas que pagam, arredondada ("8% das contas pagam").
- **CA-348** · Dado o cartão Contas, então ele mostra quantas contas existem e, embaixo, quantas foram criadas nos últimos 30 dias ("+41 em 30 dias").
- **CA-349** · Dado o cartão Preço de fundador, então ele mostra quantas das 200 vagas foram usadas ("25 de 200", contando as assinaturas ativas com preço travado), uma barra com essa parte preenchida e, embaixo, quantas sobram ("175 vagas com preço travado para sempre").

### US-B3 · Receita ao longo do tempo (2 pts)

Como dono, quero ver se a receita cresce.

- **CA-350** · Dado o histórico de assinaturas, então o cartão "Receita por mês" mostra um gráfico de barras com até 6 meses, terminando no mês atual. A barra de cada mês passado é a receita no último instante daquele mês; a do mês atual é a receita de agora.
- **CA-351** · Dado o gráfico, então só a barra do mês atual tem o valor escrito em cima; passar o mouse ou chegar pelo teclado em qualquer barra mostra o mês e o valor ("set · R$ 1.026,45"). O leitor de tela lê o mês e o valor de cada barra.
- **CA-352** · Dado o cartão "Assinaturas por plano", então cada combinação de plano e ciclo com pelo menos uma assinatura ativa vira uma linha com o nome ("Pro", "mensal · R$ 64,90"), quantas estão ativas e quanto rendem por mês, da que rende mais para a que rende menos. Uma barra fina mostra a parte de cada linha na receita, e uma linha de total fecha a lista.
- **CA-353** · Dado assinaturas com pagamento pendente, pausadas ou canceladas nos últimos 30 dias, então aparece um selo para cada caso que existir ("4 com pagamento pendente", "1 pausada", "2 canceladas em 30 dias"). Caso com zero não aparece.

### US-B4 · Quem chegou e quem usa (2 pts)

Como dono, quero saber se quem cria conta vira cliente.

- **CA-354** · Dado as contas criadas nos últimos 30 dias, então o cartão "Quem chegou nos últimos 30 dias" mostra quatro etapas com o número e uma barra: criaram conta; confirmaram o e-mail; foram verificadas (nutricionista com CRN conferido ou estudante com matrícula aprovada); assinaram um plano pago (D-62). Da segunda em diante, cada etapa mostra a porcentagem sobre quem criou conta.
- **CA-355** · Dado o mesmo cartão, então embaixo aparecem "Links de missões criados em 30 dias" e "Contas que atualizaram a cópia na nuvem em 30 dias", com os números.

### US-B5 · As contas (3 pts)

Como dono, quero achar uma pessoa e ver em que pé ela está.

- **CA-356** · Dado a lista de contas, então cada linha mostra o nome e o e-mail; a situação (Nutricionista ou Estudante) com um selo; o plano; a data em que criou a conta; e o último login. A mais nova vem primeiro.
- **CA-357** · Dado a situação, então o selo diz: para nutricionista, "CRN-6 conferido", "CRN em conferência" ou "CRN não encontrado", com as mesmas cores de Aprovações; para estudante, "Matrícula aprovada", "Comprovante em análise", "Comprovante recusado" ou "Sem comprovante". Conta sem situação (como a do dono) diz "Sem situação".
- **CA-358** · Dado o plano, então assinatura paga ativa aparece com o selo verde e o nome com o ciclo ("Pro mensal"); assinatura com pagamento pendente ou pausada mostra o plano e o selo "Pagamento pendente" ou "Pausada"; estudante aprovada dentro do prazo mostra "Estudante"; o resto mostra "Free".
- **CA-359** · Dado o último login, então ele aparece como "hoje", "ontem", "há N dias" (até 30 dias), a data (mais de 30 dias) ou "nunca". As datas seguem o horário de Brasília.
- **CA-360** · Dado os botões Todas, Nutricionistas, Estudantes e Assinantes, quando o dono escolhe um, então a lista mostra só aquele grupo e o botão fica marcado. "Assinantes" são as contas com assinatura paga ativa.
- **CA-361** · Dado a busca, quando o dono digita, então a lista mostra só as contas cujo nome ou e-mail contém o texto, sem diferença de maiúscula nem de acento, dentro do grupo escolhido.
- **CA-362** · Dado a lista, então acima dela aparece quantas contas estão aparecendo e o total do grupo ("10 de 312"). Sem nenhuma conta, aparece "Nenhuma conta com esse nome ou e-mail." (com busca) ou "Nenhuma conta neste grupo." (sem busca).

### US-B6 · Leitura e falha (1 pt)

- **CA-363** · Dado a tela aberta, então os números são lidos ao abrir, o subtítulo diz a hora da leitura ("Lido às 14:32") e o botão "Atualizar" lê de novo.
- **CA-364** · Dado o rodapé, então ele diz "Planos e pacientes ficam no aparelho de cada nutricionista e não aparecem aqui." e tem o link "Abrir o Mercado Pago" para taxas, estornos e repasses, abrindo em outra aba.

### US-B7 · A política diz o que a tela faz (1 pt)

- **CA-365** · Dado a Política de privacidade, então o item de nome, e-mail e senha diz que eles, a situação, o plano e as datas de criação da conta e do último login também servem para o responsável pelo MetaNutri acompanhar contas e assinaturas; o item de e-mails diz que eles são enviados pelo Resend; e a data dos termos é 2 de outubro de 2026.

## 4. Casos de borda

- **CB-78** · Sem internet ou servidor fora na primeira leitura: a tela mostra "Não consegui ler os números agora. Confira a internet e toque em Atualizar." e nenhum número inventado.
- **CB-79** · Falha numa leitura depois de uma boa: os números da leitura anterior continuam, com o aviso acima e a hora da última leitura boa.
- **CB-80** · Nenhuma assinatura paga: receita "R$ 0,00", Assinaturas por plano diz "Nenhuma assinatura paga ainda.", e o gráfico mostra os meses do histórico com barra zero (sem histórico nenhum, só a barra do mês atual).
- **CB-81** · Histórico com menos de 30 dias: a diferença do CA-346 é contada desde o começo do histórico (a receita de antes dele é zero).
- **CB-82** · Nenhuma conta criada nos últimos 30 dias: o funil mostra zeros e nenhuma porcentagem (nada de "NaN%").
- **CB-83** · Pessoa sem nome: a linha mostra o e-mail no lugar do nome.
- **CB-84** · Valor de assinatura que não bate com nenhum preço conhecido (por exemplo, um preço que mudou): a receita usa o valor cobrado, e o ciclo vem do banco.
- **CB-85** · Datas perto da meia-noite: uma conta criada às 23h50 de 30/09 no horário de Brasília é do dia 30/09 e do mês de setembro, mesmo que já seja 01/10 em UTC.
- **CB-86** · Clique duplo em "Atualizar": uma leitura por vez.
- **CB-87** · Uma conta que não é administradora e abre `#/negocio` sem internet: vai ao Painel, como no CA-343.

## 5. Fora de escopo, explicitamente

- Uso dentro do app (quantos planos cada pessoa fez, quantos pacientes tem): exigiria o app passar a registrar uso, e isso muda a Política de privacidade. Fica para depois, por decisão sua.
- Mexer em conta pela tela (apagar, trocar plano, dar desconto). A tela só lê.
- Exportar a lista em planilha.
- Dados do Mercado Pago (taxas, estornos, repasses, cobranças que falharam).
- Receita dos meses antes de o histórico começar (D-58).
- Escolher outro período além de 30 dias e 6 meses.

## 6. O que fica com você

1. Rodar `supabase/007-painel-do-dono.sql` no SQL Editor (o passo a passo entra no README).
2. Criar sua conta no Supabase e se marcar como administrador (D-56), se ainda não fez.

## 7. Riscos para você revisar

- **R-30** · O histórico começa quando o `007` rodar. Até lá, nada é guardado; quanto antes ele rodar, mais completo fica o gráfico.
- **R-31** · A política foi escrita sem advogado (R-14). O D-64 só acrescenta uma finalidade e corrige um fato; a revisão jurídica continua pendente.
- **R-32** · A lista traz todas as contas de uma vez. Até alguns milhares é rápido; acima disso vai precisar de páginas.
- **R-33** · A função `assinar` precisa ser publicada de novo logo depois do `007`, nunca antes. Entre os dois, quem assinar de novo numa linha antiga mantém o ciclo velho.
