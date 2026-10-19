# SPEC — Segurança, lote 5: segundo fator do administrador, limpeza dos comprovantes e ajustes da conta

Status: **pedida pelo dono em 19/10/2026 ("resolva todo o resto"); aprovação pelas telas antes de publicar.** Fecha o
que ficou fora dos lotes 1 a 4: o segundo fator do administrador, a limpeza automática dos comprovantes, a troca do
`esm.sh` por `npm:` nas funções, a troca de senha com a sessão aberta e o fluxo PKCE do login. A exclusão de conta é
de outra frente (`013`, função `excluir-conta`).

## 1. Decisões

| # | Decisão |
|---|---|
| D-260 | **O administrador usa um segundo fator: o código de 6 dígitos de um app autenticador (TOTP), pelo MFA do Supabase.** O banco só reconhece o administrador numa sessão confirmada com esse código (nível `aal2` do login). Sem ele, as funções do administrador recusam, e as regras de leitura não mostram perfil, pedido nem comprovante de outra conta. Quem não é administrador não muda nada |
| D-261 | **As telas Negócio e Aprovações pedem o código.** Administrador sem app cadastrado vê o cadastro: o código QR, a chave para digitar à mão e o campo do código. Com o app cadastrado, vê só "Digite o código do app autenticador". Confirmado o código, a tela abre e não pede de novo até sair da conta. O menu continua mostrando Negócio e Aprovações, sem o número de pendências até o código |
| D-262 | **Ordem para ligar, sem ficar trancado do lado de fora:** primeiro o site novo vai ao ar (ele já pede o código nas telas do administrador, mesmo com o banco antigo); o dono confere o TOTP ligado no painel, cadastra o app pelo site e só depois roda o `014`. O `014` para sem mudar nada se algum administrador ainda não tem o app cadastrado. Perdeu o celular: o dono apaga o fator pelo SQL Editor e cadastra de novo; para desfazer o lote, o `014` traz a versão antiga do `eh_admin` num comentário |
| D-263 | **Os comprovantes são apagados pelo servidor, uma vez por dia.** Vale a regra do D-43: o arquivo sai 30 dias depois da decisão; arquivo sem pedido (envio abandonado ou conta excluída) sai 1 dia depois de enviado. O pedido fica com os dados digitados e a decisão, sem o arquivo. Um agendamento do banco (pg_cron) chama a função `limpar-comprovantes` (pg_net), que apaga pelo armazenamento do Supabase: apagar só a linha da tabela deixaria o arquivo guardado. Até 1000 arquivos por dia; o resto fica para o dia seguinte. A limpeza que o navegador do administrador já fazia ao abrir Aprovações continua, como reserva |
| D-264 | **Só o agendamento aciona a limpeza.** O banco cria uma chave aleatória no cofre do Supabase (Vault), o agendamento a manda num cabeçalho, e a função a confere no banco antes de qualquer coisa. A chave nunca sai do banco: não vai para o repositório, para o chat nem para os segredos das funções. A função é publicada sem a conferência de login do Supabase (`--no-verify-jwt`), como a do Mercado Pago, porque quem chama é o banco. O endereço do projeto fica no cofre, gravado pelo dono numa linha só; sem ele, o agendamento não faz nada |
| D-265 | **As funções importam o `supabase-js` por `npm:` com a versão fixa (`npm:@supabase/supabase-js@2.117.2`)**, a mesma conferida hoje, em vez do `esm.sh`. Substitui o item "o `supabase-js` baixado do esm.sh com versão fixa" da seção 4 do lote 2 e o último item fora de escopo do lote 4. As três funções de cobrança são publicadas de novo, sem mudança de comportamento |
| D-266 | **Trocar a senha pede sempre um código novo do e-mail.** O único caminho no site é "Esqueci a senha": o código de 8 dígitos abre o modo de troca. A tela "Nova senha" deixa de aceitar só a sessão aberta; com a sessão e sem o código, ela manda pedir um código. No servidor, a opção "Secure password change" (já ligada) exige nova confirmação de quem entrou há mais de 24 horas |
| D-267 | **O login usa o fluxo PKCE.** Nenhum e-mail do MetaNutri traz link de ação (só código), então nada muda para quem usa. O que muda: um endereço com a sessão dentro (`#access_token=…`) não entra em conta nenhuma; antes, um link montado por outra pessoa podia abrir o site já dentro da conta dela. Substitui o CA-414 (link antigo de troca de senha): os links de antes de 06/10/2026 já venceram, e um link assim mostra "Este link não vale mais" com "Pedir um código" |

## 2. Critérios de aceite

### Segundo fator do administrador (D-260 a D-262)

- **CA-830** · Dado uma sessão de administrador sem o código do app (`aal1`), quando ela chama qualquer função do administrador (pedidos em análise, CRN para conferir, comprovantes para apagar, marcar comprovantes, painel de contas, histórico, uso, decidir pedido, decidir CRN), então o banco recusa com permissão negada e não devolve nada.
- **CA-831** · Dado a mesma sessão `aal1`, quando ela lê perfis e pedidos de outra conta ou abre, lista ou apaga comprovante de outra conta, então não vem nada e nada muda; o próprio perfil continua legível.
- **CA-832** · Dado o administrador depois do código (`aal2`), então todas as funções e leituras do administrador funcionam como hoje.
- **CA-833** · Dado uma conta que não é de administrador, em qualquer nível, então `eh_admin` diz não, `admin_sem_segundo_fator` diz não, e nenhuma tela pede o código do app.
- **CA-834** · Dado `admin_sem_segundo_fator`, então sem login ela é recusada; com login, diz sim só para administrador sem o código nesta sessão.
- **CA-835** · Dado um administrador sem app cadastrado, quando abre Negócio ou Aprovações, então vê "Ative a verificação em duas etapas", os passos curtos, o código QR, a chave para digitar à mão, o campo "Código de 6 dígitos" e o botão "Ativar". O código certo libera a tela.
- **CA-836** · Dado um administrador com o app cadastrado e a sessão sem o código, quando abre Negócio ou Aprovações, então vê "Digite o código do app autenticador", o campo "Código de 6 dígitos" e o botão "Confirmar". O código certo libera a tela.
- **CA-837** · Dado um código errado, então a tela diz "Código errado. Confira o app e tente de novo." e continua no mesmo passo, com o campo marcado.
- **CA-838** · Dado menos de 6 dígitos, então a tela diz "Digite os 6 dígitos do código." sem chamar o servidor. Letra não entra no campo.
- **CA-839** · Dado um administrador sem o código, então o menu mostra Negócio e Aprovações sem o número de pendências, e nenhuma leitura do administrador é feita até o código.
- **CA-840** · Dado o site novo com o banco antigo (antes do `014`), então as telas do administrador também pedem o código (D-262).
- **CA-841** · Dado um administrador sem o app cadastrado, quando o dono roda o `014`, então o arquivo para com "Antes de rodar este arquivo, cada administrador precisa ativar a verificação em duas etapas no site (Aprovações). Nada foi mudado." e nada muda.
- **CA-842** · Dado o administrador sem perfil de nutricionista ou de estudante, então ele não cai em "Complete seu cadastro" enquanto o código não vem (vale o CB-68 de hoje).

### Limpeza dos comprovantes (D-263 e D-264)

- **CA-843** · Dado um pedido decidido há mais de 30 dias, com o arquivo, quando a limpeza roda, então o arquivo sai do armazenamento e o pedido fica com instituição, matrícula, período, formatura, decisão e motivo, e com o arquivo vazio.
- **CA-844** · Dado um pedido decidido há 30 dias ou menos, ou em análise, então o arquivo fica.
- **CA-845** · Dado um arquivo sem pedido enviado há mais de 1 dia, quando a limpeza roda, então ele sai; com 1 dia ou menos, fica.
- **CA-846** · Dado o `014` rodado, então existe um agendamento diário às 06:15 UTC (03:15 em Brasília) que chama a função com a chave; sem o endereço do projeto no cofre, ele não chama nada e não dá erro.
- **CA-847** · Dado um pedido à função sem a chave ou com a chave errada, então ela responde 401 e não lista nem apaga nada.
- **CA-848** · Dado que o armazenamento recusa apagar, então nenhum pedido é marcado, a função responde 502 e a próxima rodada tenta de novo.
- **CA-849** · Dado a marcação, então só fica sem arquivo o pedido cujo arquivo já não está no armazenamento; o que ainda está lá nunca é marcado.
- **CA-850** · Dado as funções novas do banco que só o servidor usa (listar vencidos, anotar apagados, conferir a chave, pedir a limpeza), então nem visitante nem conta logada as executa.
- **CA-851** · Dado a resposta e o registro da função, então eles levam só números (quantos apagados, quantos marcados), nunca caminho de arquivo nem id de conta.

### Funções com `npm:` (D-265)

- **CA-852** · Dado as funções do servidor (`assinar`, `gerenciar-assinatura`, `webhook-mercadopago`, `limpar-comprovantes`) e o banco delas, então todo `supabase-js` vem de `npm:@supabase/supabase-js@2.117.2`, nenhum import vem do `esm.sh`, e os testes `src/data/servidor*.test.ts` passam.

### Senha e PKCE (D-266 e D-267)

- **CA-853** · Dado uma sessão aberta sem o modo de troca, quando a pessoa abre "Nova senha", então a tela não oferece trocar e mostra "Pedir um código".
- **CA-854** · Dado o código de troca confirmado ("Esqueci a senha"), então a senha muda como hoje (CA-412).
- **CA-855** · Dado o cliente do Supabase no site, então ele usa o fluxo `pkce`.
- **CA-856** · Dado um endereço com a sessão no fragmento (`#access_token=…&type=recovery`), então ninguém entra e a tela mostra "Este link não vale mais" com "Pedir um código".

### Documento

- **CA-857** · Dado o `SECURITY.md`, então ele conta, em português simples, que o administrador usa o código de um app autenticador e que os comprovantes são apagados sozinhos pelo servidor.

## 3. Casos de borda

- **CB-260** · O administrador abandona o cadastro do app e volta: o cadastro antigo, não confirmado, é descartado e aparece um código QR novo, sem erro.
- **CB-261** · O administrador perde o celular: o dono apaga o fator pelo SQL Editor (comando no relatório e no comentário do `014`) e cadastra o app de novo pelo site.
- **CB-262** · O código troca enquanto a pessoa digita (vale 30 segundos): o servidor aceita o código da janela vizinha; fora disso, vale o CA-837.
- **CB-263** · Sem internet ao confirmar o código: a mensagem de falha de rede de sempre, e o código continua no campo.
- **CB-264** · Muitas tentativas seguidas: "Muitas tentativas seguidas. Espere um pouco e tente de novo."
- **CB-265** · Mais de 1000 arquivos vencidos: 1000 por rodada; o resto sai nas próximas.
- **CB-266** · A limpeza do servidor e a do navegador do administrador ao mesmo tempo: apagar um arquivo que já saiu não dá erro, e só é marcado o pedido cujo arquivo já saiu.
- **CB-267** · Clique duplo em "Ativar" ou "Confirmar": um pedido só.
- **CB-268** · Em 360 px, o código QR e a chave cabem sem rolagem para o lado; a chave aparece em grupos de 4.

## 4. Fora de escopo

- Segundo fator para nutricionistas e estudantes, por SMS ou por chave física, e códigos de recuperação.
- Um botão "Trocar a senha" em Conta e plano: o caminho continua sendo "Esqueci a senha".
- Mudar o prazo de 30 dias dos comprovantes (D-43).
- Rodar as funções do servidor no Supabase local: a limpeza é testada pelo núcleo e pelo banco de verdade no Supabase local; a ligação HTTP é conferida pelo texto, como as de cobrança (DP-A5 do lote 4).
- Exclusão de conta (outra frente, `013`).

## 5. O que fica com o dono

A ordem exata, com os comandos, está no relatório desta frente e no `README.md`. Em resumo: publicar o site; conferir
o TOTP ligado em *Authentication › Multi-Factor*; cadastrar o app em Aprovações; rodar o `014` no SQL Editor; gravar o
endereço do projeto no cofre (uma linha); publicar `limpar-comprovantes` e as três funções de cobrança.

## 6. Riscos para revisar

- **R-60** · Se o dono perder o app autenticador, ele fica sem as telas do administrador até apagar o fator pelo SQL Editor (CB-261). O SQL Editor não depende do login do site, então nunca há tranca definitiva.
- **R-61** · O painel do Supabase pode ter a opção "Require current password when updating password". Ligada, ela fecha a troca de senha por quem tem só a sessão aberta mesmo fora do site, e não atrapalha "Esqueci a senha" (a sessão do código de troca fica de fora dessa exigência). Não deu para conferir no painel daqui: se a opção existir, ligue.
- **R-62** · `pg_cron` e `pg_net` são extensões do Supabase. O `014` liga as duas; se o SQL Editor recusar, ligue-as em *Database › Extensions* e rode o `014` de novo.
