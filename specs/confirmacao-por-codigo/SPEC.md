# SPEC — Confirmar o e-mail e trocar a senha por código

Status: **pedido direto do dono** em 06/10/2026 ("tem bugs ocorrendo… minha primeira cliente conseguiu entrar sem
confirmar e-mail… ajuste e veja o envio de e-mail, configure pra chegar certinho, e veja questões de segurança").

**O que aconteceu:** a conta `128…@ulife.com.br` foi criada às 17:24:37 de 06/10/2026, o link de confirmação saiu no
mesmo segundo e a conta ficou confirmada às 17:25:13, sem a cliente clicar. O e-mail da faculdade (Microsoft 365) tem
um antivírus que abre sozinho todo link que chega, e o link de confirmação do Supabase confirma a conta ao ser aberto.
A documentação do Supabase descreve exatamente isso e recomenda o código de 6 dígitos
([Email templates › prefetching](https://supabase.com/docs/guides/auth/auth-email-templates)).

**Risco:** qualquer pessoa consegue criar conta com o e-mail institucional de outra (o antivírus confirma por ela) e
pedir o plano Estudante em nome dela. O mesmo antivírus gasta o link de "Esqueci a senha" antes da pessoa clicar.

## 1. Decisões

| # | Decisão |
|---|---|
| D-89 | A conta é confirmada por um **código de 6 dígitos** que chega por e-mail e é digitado no site. O e-mail não traz link que confirme a conta ao ser aberto |
| D-90 | "Esqueci a senha" também usa **código**: a pessoa digita o código e a senha nova na mesma tela |
| D-91 | Os dois e-mails (confirmar e trocar senha) ficam **em português, com a marca do MetaNutri**, com o código em destaque e sem link de ação. Os modelos ficam no repositório (`supabase/emails/`) para o dono colar no painel do Supabase |
| D-92 | Quem tenta entrar sem ter confirmado vê "Confirme seu e-mail antes de entrar." e vai para a tela do código, com o e-mail já preenchido |

## 2. Critérios de aceite

- **CA-406** · Dado o cadastro feito, então a tela "Confira seu e-mail" pede o código de 6 dígitos (campo só de números, com o teclado numérico no celular) e tem o botão "Confirmar"; não existe mais "Já confirmei, quero entrar".
- **CA-407** · Dado o código certo, então a conta é confirmada, a pessoa já entra e segue para onde iria depois do cadastro (estudante: comprovar a matrícula; nutricionista: o painel).
- **CA-408** · Dado um código errado ou vencido, então aparece "Código errado ou vencido. Confira o último e-mail ou peça outro." e nada mais muda.
- **CA-409** · Dado "Reenviar o código", então um código novo é enviado e o botão espera 60 segundos para poder ser usado de novo (como hoje).
- **CA-410** · Dado alguém que abre a tela do código depois (sem o e-mail do cadastro na memória), então a tela pede o e-mail e o código.
- **CA-411** · Dado quem tenta entrar com e-mail ainda não confirmado, então aparece "Confirme seu e-mail antes de entrar." e um botão que leva à tela do código com o e-mail preenchido.
- **CA-412** · Dado "Esqueci a senha", quando a pessoa informa o e-mail, então vai para a tela que pede o código e a senha nova (duas vezes, com as mesmas regras do cadastro); código certo troca a senha e a pessoa entra; código errado mostra a mesma mensagem do CA-408.
- **CA-413** · Dado o repositório, então `supabase/emails/confirmar-conta.html` e `supabase/emails/trocar-senha.html` têm o código (`{{ .Token }}`), o assunto sugerido no comentário do topo, nenhum `{{ .ConfirmationURL }}`, e um texto que diz o que fazer se a pessoa não pediu.
- **CA-414** · Dado um link antigo de confirmação ou de troca de senha (mandado antes desta mudança), então ele continua funcionando como hoje (a tela de link vencido continua).

## 3. Casos de borda

- **CB-100** · O código é colado com espaços ou traço ("123 456", "123-456"): só os dígitos contam.
- **CB-101** · Clique duplo em "Confirmar": um pedido só.
- **CB-102** · Sem internet ao confirmar: a mensagem de falha de rede de sempre, e o código digitado continua no campo.

## 4. Fora de escopo

- Confirmar por link com botão na página do site (a outra saída da documentação): o código resolve sozinho e é mais simples.
- Captcha no cadastro (avaliado na revisão de segurança).

## 5. O que fica com o dono

1. No Supabase, *Authentication › Emails* (modelos): colar `supabase/emails/confirmar-conta.html` em **Confirm sign up** e
   `supabase/emails/trocar-senha.html` em **Reset password**, com os assuntos sugeridos.
2. Conferir em *Authentication › Emails › SMTP* que o remetente é "MetaNutri" `<nao-responda@metanutri.com.br>`.
