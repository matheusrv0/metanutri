# SPEC — Segurança, lote 3: verificação contra robôs

Status: **aprovada pelo dono** em 07/10/2026 ("aprovo"). Pedido do dono ("sim", seguir com o captcha) depois da auditoria
de segurança de 07/10/2026. Cadastro, entrada e envio de e-mail passam a exigir uma verificação contra robôs, conferida
no servidor do Supabase.

**Fonte:** a documentação do Supabase sobre captcha
([Auth › Captcha](https://supabase.com/docs/guides/auth/auth-captcha)) e o código do servidor de login do Supabase
(`supabase/auth`, 07/10/2026). A verificação é exigida no cadastro, na entrada com senha, no "Esqueci a senha" e no
reenvio do código. Conferir o código de 8 dígitos não exige verificação, e renovar a sessão também não.

## 1. Decisões

| # | Decisão |
|---|---|
| D-113 | **Cadastro, Entrar, "Esqueci a senha" e "Reenviar o código" exigem a verificação do Cloudflare Turnstile.** O Supabase confere cada verificação no servidor; a chave secreta fica só no painel do Supabase |
| D-114 | **A verificação fica escondida.** Ela roda sozinha enquanto a pessoa preenche. Só aparece, logo acima do botão, quando o Cloudflare pede um clique. Quando aparece, está em português e no tema do site (claro ou escuro) |
| D-115 | **Cada verificação vale para um pedido só.** Depois de cada tentativa, certa ou errada, a verificação se renova sozinha para a próxima |
| D-116 | **Ordem para ligar:** primeiro o site com a verificação vai ao ar (enquanto o captcha está desligado no Supabase, ele ignora a verificação). Só depois o dono liga o captcha no painel, com a chave secreta. Nunca o contrário: com o captcha ligado e o site antigo, ninguém entra |
| D-117 | **A chave pública da verificação vem do GitHub** (variável `VITE_TURNSTILE_SITE_KEY`), como a do pagamento. Sem ela, no computador de desenvolvimento e nos testes, a verificação não aparece e os pedidos seguem como hoje |
| D-118 | **A Política de privacidade ganha um item:** o Cloudflare Turnstile recebe dados técnicos do navegador para separar pessoas de robôs nas telas de conta. A data da versão dos termos muda para a da publicação |

## 2. Critérios de aceite

- **CA-454** · Dado a tela Criar conta, quando a pessoa clica em "Criar conta", então o pedido de cadastro leva a verificação.
- **CA-455** · Dado a tela Entrar, quando a pessoa clica em "Entrar", então o pedido de entrada leva a verificação.
- **CA-456** · Dado a tela "Esqueci a senha", quando a pessoa pede o código, então o pedido leva a verificação.
- **CA-457** · Dado a tela do código, quando a pessoa clica em "Reenviar o código", então o reenvio leva a verificação. Confirmar o código não usa verificação.
- **CA-458** · Dado que a verificação ainda não terminou, quando a pessoa clica no botão, então a tela diz "Espere a verificação de segurança terminar." e nada é enviado.
- **CA-459** · Dado um pedido feito, certo ou errado, então a verificação se renova, e a tentativa seguinte leva uma verificação nova.
- **CA-460** · Dado que o servidor recusa a verificação, então a tela diz "Não deu para confirmar que é você. Tente de novo." e a verificação se renova.
- **CA-461** · Dado que o script da verificação não carrega (rede ou bloqueador), então a tela diz "A verificação de segurança não carregou. Confira a internet ou desative o bloqueador e recarregue a página." e o botão não envia.
- **CA-462** · Dado que o Cloudflare pede um clique, então a verificação aparece logo acima do botão, em português e no tema do site.
- **CA-463** · Dado o site sem a chave pública (`VITE_TURNSTILE_SITE_KEY` vazia), então nenhuma verificação aparece e os pedidos seguem como hoje.
- **CA-464** · Dado a Política de privacidade, então ela diz que o Cloudflare Turnstile recebe dados técnicos do navegador nas telas de conta, para separar pessoas de robôs.

## 3. Casos de borda

- **CB-116** · A verificação vence antes do clique (vale cerca de 5 minutos): ela se renova sozinha, e o clique segue o CA-458 até a nova ficar pronta.
- **CB-117** · Clique duplo no botão: um pedido só, como hoje.
- **CB-118** · No celular de 360 px, a verificação, quando aparece, cabe sem rolagem para o lado.
- **CB-119** · Sair de uma tela de conta e voltar: a verificação recomeça, sem erro nem duas verificações na mesma tela.

## 4. Fora de escopo

- Verificação em outras ações (link do paciente, cobrança): a cobrança já tem limites próprios (lote 2).
- Conferir o endereço do site e o tipo de ação na verificação: o servidor do Supabase não confere. O widget só funciona nos
  domínios cadastrados no Cloudflare.
- Regra de conteúdo no navegador (CSP): fica para depois e terá de liberar o Cloudflare.

## 5. O que fica com o dono

1. Criar a conta grátis na Cloudflare e o widget do Turnstile (nome "MetaNutri", domínios `metanutri.com.br`, `localhost`
   e `127.0.0.1`, modo "Managed").
2. Mandar a **chave pública (Site Key)** no chat. A **chave secreta (Secret Key)** nunca vai para o chat.
3. Depois que o site novo estiver no ar: no Supabase, ligar o captcha (Authentication › Attack Protection), escolher
   Turnstile e colar a chave secreta.
4. Entrar no site e criar uma conta de teste para conferir.

## 6. Riscos para revisar

- **R-43** · A verificação usa um script do Cloudflare, carregado só nas telas de conta. Se o Cloudflare cair, ninguém entra nem se cadastra até ele voltar (ou até o dono desligar o captcha no painel).
- **R-44** · Alguns bloqueadores de anúncio barram o script. A tela avisa (CA-461), mas a pessoa precisa desativar o bloqueador.
- **R-45** · Os testes automáticos do site não passam pela verificação real: usam a chave de teste do Cloudflare, que sempre aprova. A verificação de verdade só é conferida no site publicado (passo 4 da seção 5).
