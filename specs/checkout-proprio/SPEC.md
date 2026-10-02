# SPEC — Checkout próprio (pagamento dentro do site)

Status: **aprovada** em 02/10/2026, com o protótipo v2. Escrita em 02/10/2026, a partir do protótipo "Checkout MetaNutri"
(`https://claude.ai/code/artifact/4388448c-0780-43fc-9663-c75b3a55bb87`).

**Fonte:** a conversa de 02/10/2026: "eu quero que você implemente uma tela de checkout. Eu não quero que no nosso
site apareça nada sobre o mercado pago. Quero bem white label. E que esteja tudo com a cara do nosso site. Checkout,
todos os inputs. Algo bem personalizável." O Mercado Pago continua sendo quem processa a cobrança, em modo teste até
o teste de ponta a ponta passar.

**Objetivo:** a pessoa assina, troca o cartão e cancela sem sair do MetaNutri e sem ver outra marca; o número do
cartão nunca passa pelo servidor do MetaNutri.

Substitui o fluxo de ida e volta ao Mercado Pago da `estilo-spora` (CA-161, CA-165 a CA-169).

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-65 | O pagamento acontece **no checkout do site**, com cartão de crédito. Ninguém é levado a outro site | Pedido seu: white label |
| D-66 | Número, validade e código do cartão são **campos seguros do processador de pagamento**, desenhados com as cores, os tamanhos e os cantos do site. Nome impresso e CPF são campos nossos | Regra de segurança de cartão (PCI): o número do cartão não pode passar pelo nosso servidor. Os campos seguros trocam o cartão por um código de uso único |
| D-67 | **Só cartão de crédito** | A assinatura que cobra sozinha todo mês só funciona com cartão de crédito |
| D-68 | A assinatura é criada **já autorizada** no cartão, e o plano pago **libera na hora** em que o banco autoriza. A primeira cobrança cai em até uma hora; se ela falhar, o aviso do processador derruba o plano | Quem paga quer usar na hora. O banco já validou o cartão |
| D-69 | **Cancelar** e **trocar cartão** ficam em Conta e plano. Cancelada, a assinatura vale até o fim do período já pago e depois volta para o Free | Sem a página do processador, o site precisa oferecer as duas coisas. O "vale até o fim do período" já estava nos Termos |
| D-70 | O MetaNutri guarda **a bandeira e os 4 últimos números** do cartão, e a data da próxima cobrança, para mostrar em Conta e plano. Nada mais do cartão | É o mínimo para a pessoa reconhecer qual cartão está pagando |
| D-71 | O nome do processador **só aparece na Política de privacidade**, que precisa dizer quem processa o cartão (LGPD). Checkout, Conta, Preços, Termos e telas de aviso não o citam | Pedido seu, dentro do que a lei exige |
| D-72 | A chave pública do processador fica numa variável do site (`VITE_MERCADOPAGO_PUBLIC_KEY`), uma de teste e outra de produção, sempre do mesmo ambiente do token do servidor | A chave pública vai no navegador; o token continua só no servidor |
| D-73 | Checkout, Conta e plano e a tela de volta do pagamento ganham **visual novo** (protótipo v2) e **ícones próprios** desenhados no traço da logo (linha com pontos), só onde ajudam a entender. **Nenhum emoji e nenhum ícone de biblioteca pronta** nessas telas | Pedido seu de 02/10: "dê uma repaginada, evite emojis e ícones padrões", escolhido o alcance "checkout e Conta" e os ícones próprios |

## 2. Escopo

**Entra:** a tela de checkout com o formulário do cartão; a função do servidor que assina com o cartão; a função que
cancela e troca o cartão; Conta e plano com o cartão, a próxima cobrança, Cancelar e Trocar cartão; a regra "cancelada
vale até o fim do período"; os textos sem o nome do processador; a Política de privacidade atualizada; as colunas novas
no banco (`008`).

## 3. Histórias e critérios de aceite

Pessoas: **assinante** (nutricionista com conta), **dono**.

### US-B1 · Assinar no site (8 pts)

- **CA-366** · Dado o checkout, então ele mostra o seletor Mensal/Anual, os planos Solo e Pro, o formulário "Cartão de crédito" (número do cartão, validade, código de segurança, nome impresso no cartão, CPF do titular), o resumo (plano, cobrança, conta, próxima cobrança, total hoje), a caixa "Autorizo a cobrança de R$ X todo mês (ou todo ano) neste cartão até eu cancelar, e li os Termos de uso" e o botão "Assinar por R$ X/mês" (ou "/ano").
- **CA-367** · Dado o checkout, então nenhum texto, imagem ou endereço visível da página cita o processador de pagamento, e o aviso de segurança diz que o número do cartão vai criptografado para a operadora de pagamento e que o MetaNutri não vê nem guarda o cartão.
- **CA-368** · Dado os campos do cartão, então eles têm a altura, o canto, a borda, a cor do texto e a cor do foco dos outros campos do site, nos temas claro e escuro.
- **CA-369** · Dado os primeiros números do cartão, então a bandeira aparece no campo (por exemplo "Mastercard"); dado um cartão de débito ou pré-pago, então aparece "Use um cartão de crédito." e o botão fica parado.
- **CA-370** · Dado o envio com campo vazio ou inválido (número, validade, código, nome, CPF com dígito errado) ou sem a caixa de autorização marcada, então o erro aparece embaixo do campo, nada é enviado e o foco vai para o primeiro campo com erro.
- **CA-371** · Dado tudo válido, quando a pessoa clica em Assinar, então o botão mostra "Confirmando com o banco…", os campos travam, e só um pedido é feito mesmo com clique duplo.
- **CA-372** · Dado o banco autorizando, então a tela mostra "Assinatura ativa", com o plano, o ciclo, o e-mail que recebe o recibo e a data da próxima cobrança, e o botão "Ir para o painel". O plano pago já vale no app.
- **CA-373** · Dado o banco recusando, então a tela continua no checkout com a mensagem do motivo em português (por exemplo "O banco recusou este cartão. Confira os dados ou use outro cartão. Nada foi cobrado."), os campos voltam a funcionar e o código de segurança é apagado.
- **CA-374** · Dado o servidor fora ou sem internet, então aparece "Não consegui falar com o servidor de cobrança. Nada foi cobrado. Tente de novo em alguns minutos." e o formulário volta a funcionar.
- **CA-375** · Dado o preço, então o valor cobrado vem sempre do servidor, nunca do navegador; o navegador manda só plano, ciclo e o código de uso único do cartão.

### US-B2 · Conta e plano (5 pts)

- **CA-376** · Dado uma assinatura paga ativa, então Conta e plano mostra o plano e o ciclo, o selo "Ativa", a bandeira e os 4 últimos números do cartão e a data da próxima cobrança, com os botões "Trocar cartão" e "Cancelar assinatura".
- **CA-377** · Dado "Cancelar assinatura", então abre uma confirmação que diz até quando o plano vale e que depois volta ao Free sem perder nenhum plano, com "Manter assinatura" (padrão) e "Cancelar assinatura".
- **CA-378** · Dado a confirmação do cancelamento, então a assinatura para de cobrar, Conta e plano mostra "Cancelada, vale até {data}" e o plano pago continua valendo até essa data; depois dela, a conta volta ao Free.
- **CA-379** · Dado "Trocar cartão", então abre o mesmo formulário de cartão do checkout; quando o banco autoriza o cartão novo, Conta e plano mostra a bandeira e os 4 últimos números novos; quando recusa, o cartão antigo continua e a mensagem aparece.
- **CA-380** · Dado uma assinatura cancelada (dentro ou fora do prazo), então Conta e plano oferece assinar de novo, que leva ao checkout.

### US-B3 · Textos, política e ícones (2 pts)

- **CA-381** · Dado Preços, Termos, Conta e plano e a tela de volta do pagamento, então nenhum deles cita o processador; os Termos dizem que a assinatura é paga com cartão de crédito, renova sozinha e é cancelada em Conta e plano, valendo até o fim do período pago.
- **CA-382** · Dado a Política de privacidade, então ela diz que o pagamento é processado pelo Mercado Pago, que os dados do cartão vão direto para ele, criptografados, e que o MetaNutri guarda só a bandeira, os 4 últimos números e a data da próxima cobrança.
- **CA-383** · Dado o checkout, Conta e plano e a tela de volta do pagamento, então nenhum ícone é emoji, símbolo de texto (como ✓ ou ★) ou ícone de biblioteca pronta: os ícones são os do conjunto da marca, e o andamento do checkout é mostrado pelos pontos da logo.

## 4. Casos de borda

- **CB-88** · Os campos seguros não carregam (bloqueador de anúncio, rede): aparece "Não consegui abrir o formulário do cartão. Recarregue a página ou desative o bloqueador de anúncios para este site." e o botão fica parado.
- **CB-89** · A chave pública não está configurada no site: o checkout mostra "O pagamento não está disponível agora." e não carrega o formulário.
- **CB-90** · O código de uso único do cartão vence ou já foi usado: a mensagem pede para conferir o cartão de novo, e um código novo é gerado no próximo envio.
- **CB-91** · Quem já tem assinatura paga ativa abre o checkout: continua o aviso de hoje (CA-163) e não há formulário.
- **CB-92** · Clique duplo em "Cancelar assinatura" ou em "Trocar cartão": um pedido só.
- **CB-93** · O cancelamento chega ao processador mas a resposta se perde: ao abrir de novo, Conta e plano mostra o estado lido do servidor, sem cancelar duas vezes.
- **CB-94** · O processador cancela sozinho depois de três cobranças recusadas: a conta volta ao Free na hora (não há período pago a respeitar).
- **CB-95** · Estudante aprovada que assina: ao autorizar, o plano pago substitui o Estudante, como hoje.

## 5. Fora de escopo, explicitamente

- Pix, boleto e cartão de débito (D-67).
- Trocar de plano (Solo ↔ Pro, mensal ↔ anual) com assinatura ativa: continua "ainda não é feito pelo site" (CA-163).
- Reembolso pelo site.
- Nota fiscal.
- O nome que aparece na fatura do cartão: é configurado na conta do processador, fora do site.

## 6. O que fica com você

1. Mandar a **Public Key de teste** (do mesmo lugar do token de teste) e, na virada para produção, a de produção.
2. Rodar `supabase/008-cartao-da-assinatura.sql` no SQL Editor.
3. Fazer o teste de ponta a ponta com o comprador de teste, como combinado.

## 7. Riscos para você revisar

- **R-34** · A fonte dentro dos campos seguros pode sair na fonte do sistema em vez da Manrope, se o processador não aceitar fonte própria. Cores, tamanho, borda e canto ficam iguais.
- **R-35** · Os campos seguros dependem de um script do processador carregado só na página de checkout (dependência nova, aprovada junto com esta spec). Se ele cair, ninguém assina até voltar (CB-88).
- **R-36** · No modo teste, só um comprador de teste consegue pagar: a conta no MetaNutri usada no teste precisa ter o e-mail do comprador de teste.
