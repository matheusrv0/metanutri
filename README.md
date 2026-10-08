# MetaNutri

Software de nutrição para quem está começando na profissão. **O diferencial é dizer o
que comer:** todo software calcula a adequação e pinta de vermelho; o MetaNutri mostra
o que falta e o botão **cobrir** sugere o alimento e a porção que fecham a falta —
nenhum concorrente brasileiro faz isso. Os macros andam ao vivo enquanto o plano é
montado. E o plano vira **missões diárias** que o paciente marca num link próprio,
com a tela de Adesão mostrando quem está sumindo — esse é o argumento de venda.
Funciona no navegador; a conta na nuvem é opcional.

Estratégia, público, preços e fases: [docs/plano-negocio.md](docs/plano-negocio.md).

## Como rodar na sua máquina

```bash
npm install     # uma vez, baixa as dependências
npm run dev     # abre em http://localhost:5173
```

Na primeira vez, o painel oferece **Ver um plano de exemplo**: um dia inteiro já
montado, para entender o sistema mexendo nele. Pode apagar depois.

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm run check` | lint + tipos + testes (o portão antes de commitar) |
| `npm run build` | gera a versão de produção em `dist/` |
| `npm run preview` | serve o `dist/` para conferir o build |
| `npx playwright test` | testes de ponta a ponta em navegador real |

Trabalhando com um agente de código? As instruções do repositório estão em
[AGENTS.md](AGENTS.md).

## As duas áreas

**Pública** (`#/inicio`, `#/precos`, `#/entrar`) — fundo escuro animado, para
explicar e vender. É o que alguém de fora vê primeiro.

**De trabalho** (o resto) — papel claro, porque tabela de nutriente se lê em papel,
por horas. A densidade e os cartões seguem a linguagem do Berry; a identidade
continua a da tabela impressa.

## O que o sistema faz

**Dois caminhos, escolhidos ao criar o plano.** *Prescrição rápida* pede só nome,
sexo, idade e a meta de kcal — serve para retorno e ajuste. *Atendimento completo*
tem antropometria, gasto energético calculado e composição corporal. O rápido vira
completo a qualquer momento; o contrário não, para não apagar medida já registrada.

**Três etapas dentro do plano.**

1. **Dados e medidas** — identificação, antropometria (IMC por faixa etária, escore-z
   da OMS para crianças, cintura, panturrilha, gestante e lactante), composição
   corporal por dobras ou bioimpedância, e o gasto energético com a fórmula à mostra.
2. **Plano alimentar** — refeições por horário, cada uma com opção principal e dois
   substitutos. Digite `150 arroz integral` e tecle Enter: a medida caseira e as kcal
   aparecem sozinhas. Os alimentos que você mais usa viram atalho com a porção de sempre,
   e a busca avisa quando a tabela só tem parte dos nutrientes daquele alimento.
   Ao lado, o **medidor de macros** anda a cada alimento: faixa recomendada em destaque,
   marcador do plano e a frase que responde à pergunta de verdade — "Faltam 6 pontos para
   a faixa", "Quase lá", "Dentro da faixa", "10 pontos acima".
3. **Adequação** — vitaminas e minerais comparados com a DRI, com o botão **cobrir**,
   que sugere até cinco alimentos de grupos diferentes para fechar a falta.

**Em volta do plano.**

- **Missões do paciente** — no fim da etapa 2, o botão **Gerar link das missões**
  transforma o plano numa lista curta que o paciente abre no celular, sem baixar app e
  sem criar conta: as refeições por horário, os vegetais, a fruta e a água. Ele toca no
  que fez; cada missão mostra de onde saiu. Gerar o link de novo atualiza as missões com
  o plano atual e derruba o link antigo, mantendo o histórico.
- **Adesão** — a tela que responde "quem está sumindo?". Quem passou 4 dias sem marcar
  aparece no topo, quem marcou em 4 dias ou mais na semana aparece como *em dia*. É
  também onde você vê quantos pacientes ativos tem contra o limite do seu plano.
- **Pacientes** — ficha com restrições, condições clínicas, medicamentos, anamnese,
  histórico de planos e evolução do peso. O plano nasce já sabendo o que a ficha sabe,
  e o retorno começa duplicando o plano anterior.
- **Tabela de alimentos** — os 597 da TACO navegáveis: busca, filtro por categoria e por
  completude do dado, ordenação, e a composição inteira de cada alimento com as medidas
  caseiras. "Não analisado" é falta de medição, não zero.
- **Meus produtos** — industrializado não está na tabela de composição. Cadastre pelo
  rótulo, lendo o código de barras pela câmera ou digitando; os dados vêm da Open Food
  Facts para você conferir com a embalagem. Depois ele entra no plano como qualquer alimento.
- **Trocas** — a folha do paciente sai com uma lista de trocas: mesmo grupo, mesma
  energia, em medida caseira, respeitando as restrições da ficha. Doce e ultraprocessado
  não entram como equivalente de comida.
- **Exportar** — dieta para imprimir (vira PDF pelo próprio navegador), aconselhamento
  em Word no modelo do estágio, memorial de cálculo em Word e a tabela de adequação
  copiada para colar no Word.
- **Configurações** — seu nome e registro na linha de responsabilidade, marca na folha
  do paciente e backup em arquivo.
- **Dados na nuvem** — com conta, planos, pacientes, produtos, modelos e configurações ficam
  na nuvem, presos à conta, e vão para lá sozinhos poucos segundos depois de cada mudança
  ("Salvo" / "Salvando…" no alto da tela). Dois aparelhos ao mesmo tempo se juntam item por
  item, e o que foi excluído num não volta pelo outro. Sem internet, a área de trabalho
  trava até a conexão voltar. Ver `specs/dados-na-nuvem/`.
- **Conta e plano** — entrar, sair, ver a assinatura, o cartão que paga e a próxima cobrança, trocar o cartão e
  cancelar. Sair apaga a cópia de trabalho do navegador. Só funciona sem conta quando o Supabase não está
  configurado (modo local); com ele, a conta é obrigatória.
  Criar conta, entrar e pedir código levam uma verificação contra robôs, escondida até o Cloudflare pedir um clique
  (passo 8 de "Projeto já ligado"). Veja abaixo.
- **Assinar** — o checkout do site: Solo ou Pro, mensal ou anual, com cartão de crédito, sem sair do MetaNutri. O
  número do cartão vai direto para a operadora de pagamento, em campos seguros. Precisa do
  `008-cartao-da-assinatura.sql`, do `009-cobranca-em-producao.sql`, das três funções e da chave pública
  (passos 4, 5 e 7 de "Projeto já ligado").
  **Está em modo teste** (credenciais de teste do Mercado Pago: ninguém paga de verdade) até o teste de ponta a ponta
  passar; o que falta antes da produção está em [docs/pendencias.md](docs/pendencias.md).
- **Negócio** (só para o administrador): receita por mês, assinaturas por plano, quem chegou nos últimos 30 dias e a lista de contas. Precisa do `007-painel-do-dono.sql`.

## Conta na nuvem (opcional em desenvolvimento)

Sem o Supabase configurado, o app abre sem conta, inteiro no navegador — é o modo
local. Com o Supabase configurado, a conta passa a ser obrigatória: a situação de cada
uma (estudante ou nutricionista) é comprovada, o paciente pode abrir o link das missões
em outro aparelho e dá para cobrar.

### Preços

Os cinco planos aprovados em 26/09/2026 estão em
[src/domain/conta.ts](src/domain/conta.ts) — mude lá e a página de preços acompanha:
Free R$ 0 (2 pacientes ativos), Estudante R$ 0 com comprovante (10), Solo R$ 34,90 ou
R$ 299/ano (25), Pro R$ 64,90 ou R$ 599/ano (ilimitado) e Clínica R$ 149/mês.

A unidade de cobrança é o **paciente ativo**: quem teve plano ou missão nos últimos 30
dias (`ehPacienteAtivo`). **Nada é cobrado nem bloqueado hoje**: sem meio de pagamento,
aplicar limite seria mentira (a constante `LIMITES_ATIVOS` registra isso). A tela de
Adesão já mostra quantos ativos você tem contra o limite do plano.

## Ligar conta, e-mail, verificação e pagamento

O site exige conta. Se o projeto do Supabase ainda não existe, comece por **Projeto novo**,
logo abaixo; depois siga a lista seguinte.

### Projeto novo

1. Crie o projeto em <https://supabase.com> (o plano gratuito serve). Em **Project Settings > API**,
   copie a *Project URL* e a chave *anon public*.
2. `cp .env.example .env.local` e preencha `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, para o checkout, `VITE_MERCADOPAGO_PUBLIC_KEY` (a Public Key do Mercado Pago) e, para a verificação contra robôs, `VITE_TURNSTILE_SITE_KEY` (a Site Key do Turnstile, passo 8 de "Projeto já ligado"). Reinicie o
   `npm run dev`. **Nunca** use a chave `service_role` no `.env.local` nem em nada que vá para o navegador:
   ela dá acesso total ao banco. Ela só existe dentro das funções do Supabase.
3. No **SQL Editor**, rode os arquivos de [supabase/](supabase/) na ordem:
   `001-acompanhamentos.sql`, `002-copia-na-nuvem.sql`, `003-assinaturas.sql`, `004-uso-nao-comercial.sql`,
   `005-estudante.sql`, `006-verificacao.sql`, `007-painel-do-dono.sql`, `008-cartao-da-assinatura.sql`,
   `009-cobranca-em-producao.sql`, `010-seguranca-lote-1.sql` e `011-seguranca-lote-2.sql`.
4. Publique as três funções, trocando `<ref>` pelo código do projeto (o pedaço antes de `.supabase.co`
   na *Project URL*), e guarde o endereço do site no segredo `SITE_URL`:
   ```bash
   npx supabase secrets set SITE_URL=https://metanutri.com.br/ --project-ref <ref>
   npx supabase functions deploy gerenciar-assinatura --project-ref <ref>
   npx supabase functions deploy assinar --project-ref <ref>
   npx supabase functions deploy webhook-mercadopago --no-verify-jwt --project-ref <ref>
   ```
   O `--no-verify-jwt` é obrigatório na última: quem chama é o Mercado Pago, que não tem conta no Supabase.
5. Siga a lista abaixo (no passo 4 dela, os SQL já rodaram; no passo 5, as funções já estão publicadas).
6. **Teste o Mercado Pago no ambiente de teste antes de abrir para o público**: use as credenciais de teste
   e um usuário de teste do Mercado Pago, e só depois troque para as credenciais de produção.

### Projeto já ligado

Para funcionar de verdade, nesta ordem:

1. **Supabase > Authentication > URL Configuration.** *Site URL*: `https://metanutri.com.br/`.
   Em *Redirect URLs*: `https://metanutri.com.br/**`, `https://matheusrv0.github.io/metanutri/**` (o endereço antigo, que redireciona) e `http://localhost:5173/**`.
2. **Supabase > Authentication > Sign In / Providers > Email.** *Confirm email* LIGADO e senha mínima 8.
3. **E-mail (SMTP).** Os e-mails saem pelo Resend, com o domínio `metanutri.com.br`. No Resend, em *Domains*,
   adicione o domínio, copie os registros de DNS para a zona do domínio no Registro.br e espere a verificação; em
   *API Keys*, crie uma chave com *Sending access*. Depois preencha *Authentication > Emails > SMTP Settings*
   (host `smtp.resend.com`, porta 465, usuário `resend`, senha = a chave do Resend, remetente
   `nao-responda@metanutri.com.br`, nome `MetaNutri`). Sem SMTP próprio o Supabase só manda e-mail para a equipe
   do projeto, no máximo 2 por hora; sem domínio verificado o Resend só manda para o dono da conta.
4. **SQL.** No SQL Editor, rode `supabase/005-estudante.sql` e depois `supabase/006-verificacao.sql`. Para se
   marcar como administrador, rode a linha comentada no fim do 006 com o seu e-mail. O 006 pode rodar de novo
   quando mudar: ele refaz as funções sem apagar dados.
   Depois rode `supabase/007-painel-do-dono.sql`: ele guarda o ciclo e o histórico das assinaturas e cria as
   leituras da tela Negócio. O histórico começa no dia em que ele rodar; também pode rodar de novo.
   Logo depois de rodar o 007, publique de novo a função `assinar`
   (`npx supabase functions deploy assinar --project-ref qmpljfjbdcrdbqutuvmg`): ela passa a gravar o ciclo.
   Nunca publique antes do 007: a coluna ainda não existiria e o checkout falharia.
   Depois rode `supabase/008-cartao-da-assinatura.sql`: ele guarda a bandeira, os 4 últimos números do cartão e a
   data da próxima cobrança, e cria a trava que impede duas abas de assinarem ao mesmo tempo (spec checkout-proprio).
   Rode **antes** de publicar as funções do passo 5; também pode rodar de novo.
   Depois rode `supabase/009-cobranca-em-producao.sql`: ele guarda a data da última mensalidade paga, quem encerrou a
   assinatura e quando, o cartão do pedido em andamento, as tentativas de cartão por conta e o registro dos avisos do
   Mercado Pago (spec cobranca-em-producao). Rode **antes** de publicar as funções do passo 5: elas leem estas colunas,
   e publicadas antes toda assinatura falha. Também pode rodar de novo.
   Depois rode `supabase/010-seguranca-lote-1.sql` (spec seguranca-lote-1): o banco passa a garantir o aviso de uso
   não comercial e o limite de links do plano, recusa token e marcações fora do padrão, aceita comprovante só de
   estudante (até 10 arquivos) e deixa as funções da verificação só para quem está logado. Também pode rodar de novo;
   se rodar o 006 de novo, rode o 010 logo depois.
   Depois rode `supabase/011-seguranca-lote-2.sql` (spec seguranca-lote-2): o banco passa a limitar o tamanho da cópia
   na nuvem e de cada link, põe o teto de 1000 links por conta, conta as chamadas de cada conta à cobrança, aceita
   comprovante só de estudante com e-mail de faculdade confirmado e apaga a função antiga das vagas de fundador. Rode
   **antes** de publicar as funções do passo 5: elas anotam cada chamada à cobrança na tabela nova, e publicadas antes
   assinar, trocar o cartão, conferir e cancelar falham sem cobrar. Também pode rodar de novo; se rodar o 003, o 006
   ou o 010 de novo, rode o 011 logo depois.
5. **Mercado Pago.** Crie a aplicação e guarde o token como `MERCADOPAGO_ACCESS_TOKEN` e o segredo do webhook
   como `MERCADOPAGO_WEBHOOK_SECRET` (`npx supabase secrets set ... --project-ref qmpljfjbdcrdbqutuvmg`). Com o
   `008`, o `009` e o `011` rodados, e com o `MERCADOPAGO_WEBHOOK_SECRET` já guardado em *Edge Functions > Secrets* (a
   `webhook-mercadopago` nova só processa aviso com ele), publique as três funções desta versão e, logo em seguida,
   o site (nunca o site antes: a `assinar` nova não serve ao site antigo, que não manda o cartão, e a janela de
   cancelar nova pergunta à `gerenciar-assinatura` se já houve cobrança, e a versão antiga não sabe responder):
   ```bash
   npx supabase functions deploy gerenciar-assinatura --project-ref qmpljfjbdcrdbqutuvmg
   npx supabase functions deploy assinar --project-ref qmpljfjbdcrdbqutuvmg
   npx supabase functions deploy webhook-mercadopago --no-verify-jwt --project-ref qmpljfjbdcrdbqutuvmg
   ```
   Cadastre o webhook apontando para `https://qmpljfjbdcrdbqutuvmg.supabase.co/functions/v1/webhook-mercadopago`,
   com os tópicos `subscription_preapproval` (a assinatura), `subscription_authorized_payment` (cada mensalidade) e
   `payments`, e guarde o segredo dele em `MERCADOPAGO_WEBHOOK_SECRET`. Cada aviso que chega fica 90 dias em
   *Table Editor > avisos_da_operadora*, com o resultado; os que não conferem, até 100 por hora (D-109).
   Sem o segredo, nenhum aviso é processado: a função responde erro, o Mercado Pago tenta de novo depois, e o
   registro anota `sem segredo`.
   No modo teste o Mercado Pago não manda aviso nenhum: a primeira conferência é na primeira compra em produção.
   A primeira mensalidade recusada encerra a assinatura e a conta volta ao Free na hora (D-80).
6. **Termos.** Preencha `RESPONSAVEL` e `CONTATO_EMAIL` em `src/domain/legal.ts`. Sem os dois, o GitHub Actions
   barra a publicação (`scripts/conferir-publicacao.mjs`).
7. **Chave pública do pagamento.** No Mercado Pago, em *Suas integrações > a aplicação > Credenciais*, copie a
   **Public Key** do mesmo ambiente do token do passo 5 (a de teste enquanto o token for o de teste). Guarde como
   variável do GitHub, que o build publicado lê (`.github/workflows/publicar.yml`):
   ```bash
   gh variable set VITE_MERCADOPAGO_PUBLIC_KEY --body "<a Public Key>"
   ```
   Ela é pública de propósito: vai no navegador, para os campos seguros do cartão. Sem ela, o checkout publicado diz
   "O pagamento não está disponível agora." Para testar na sua máquina, ponha a mesma chave no `.env.local`.
8. **Verificação contra robôs (spec seguranca-lote-3).** Cadastro, Entrar, "Esqueci a senha" e "Reenviar o código"
   levam uma verificação do Cloudflare Turnstile, que o Supabase confere no servidor. Ela fica escondida e só
   aparece, logo acima do botão, quando o Cloudflare pede um clique. No Cloudflare, em *Turnstile*, o widget
   "MetaNutri" (modo *Managed*) tem os domínios `metanutri.com.br`, `localhost` e `127.0.0.1`. A **Site Key** é
   pública e vai como variável do GitHub, que o build publicado lê:
   ```bash
   gh variable set VITE_TURNSTILE_SITE_KEY --body "<a Site Key>"
   ```
   A **Secret Key** nunca vai para o repositório nem para o chat: só para o painel do Supabase. **Ordem para ligar
   (D-116):** primeiro publique o site com a Site Key. Logo depois de publicar, recarregue o site (Ctrl+Shift+R no
   computador) e confira na Política de privacidade que a "Versão de …" é a data de `DATA_TERMOS`, em
   `src/domain/legal.ts` (a versão que acabou de ser publicada). Se não for,
   espere a publicação terminar e recarregue de novo. Espere 1 ou 2 dias depois de publicar: quem já visitou o site
   guarda a versão antiga até recarregar a página; com o captcha ligado, essa versão antiga não consegue entrar. Só
   então, em *Supabase > Authentication > Attack Protection*, ligue *Enable Captcha protection*, escolha
   *Turnstile*, cole a Secret Key e salve. Nunca o contrário: com o captcha ligado e o site antigo, ninguém entra nem
   se cadastra. Para conferir, crie uma conta de teste no site publicado. Se o script do Cloudflare não carregar
   (rede, bloqueador), o site tenta mesmo assim, sem a verificação (D-119): com o captcha ligado, o Supabase recusa e
   a tela diz "A verificação de segurança não carregou. Confira a internet ou desative o bloqueador e recarregue a
   página." Se o Cloudflare carregar mas não responder em 30 segundos, o site também segue sem a verificação. Se
   alguém disser que aparece "Não deu para falar com o servidor" ou que o código não chega, peça para recarregar a
   página. **Se o Cloudflare cair (R-43):** desligue o captcha no mesmo painel; o login volta na hora, sem publicar o site
   de novo. Quando o Cloudflare voltar, ligue o captcha outra vez. Com o captcha ligado, o `npm run dev` só entra na
   conta com a mesma Site Key no `.env.local`.

Comprovantes de estudante ficam no balde privado `comprovantes`. A limpeza dos que passaram de 30 dias depois
da decisão acontece quando o administrador abre o app (qualquer tela, com a conta de administrador); não há
tarefa agendada no servidor, então, se ele ficar semanas sem abrir, o arquivo dura mais que o prazo.

## A marca

O kit do designer (logo provisória, 27/09/2026) está em `public/` (favicons e ícones do
app) e `public/marca/` (o símbolo em quatro versões). A marca entra na tela **só pelo
componente `Logo`** (`design-system/componentes/display/Logo.tsx`): ele escolhe a versão
certa do símbolo para cada tema e escreve o nome na fonte do kit. As cores — teal
`#0e3b43`, laranja `#f26a2e`, marfim `#f6f2ea` — viraram tokens em `DESIGN.md`, com uma
regra que vale saber: o laranja é grafismo e nunca carrega texto. Quando a versão final
da logo chegar, basta trocar os arquivos mantendo os nomes.

## De onde vêm os números

| Assunto | Fonte |
|---|---|
| Composição dos alimentos | NEPA/UNICAMP. TACO, 4ª edição, 2011 (597 alimentos) |
| Medidas caseiras | IBGE. POF 2008-2009 |
| Referências de ingestão | NASEM. DRI, Apêndice J, 2019 |
| Energia | NASEM 2023 · Mifflin-St Jeor 1990 · Harris-Benedict 1918 |
| Crescimento | OMS 2006 e 2007 |
| Classificação antropométrica | Ministério da Saúde. SISVAN, 2011 |
| Ganho de peso na gestação | Kac G, Carrilho TRB et al. Am J Clin Nutr, 2021 |
| Dobras cutâneas | Jackson e Pollock 1978/1980 · Siri 1961 · Faulkner 1968 |
| Produtos de rótulo | Open Food Facts |

Cada número aparece na tela ao lado da própria fonte. A lista completa também está
dentro do sistema, em **Ajuda**.

## Limites que o sistema admite em tela

- A TACO não traz vitamina D, vitamina B12, folato, açúcares nem gordura saturada.
  Esses cinco só existem em produto cadastrado pelo rótulo.
- Dos 597 alimentos, apenas 6 têm todos os nutrientes preenchidos; 57,3% não têm
  vitamina A e 39,4% não têm fibra. Falta de dado vira travessão e marca de rodapé,
  nunca zero.
- Os cálculos ainda não foram conferidos por nutricionista.
- A prescrição de dieta é privativa de nutricionista com registro no CRN (Lei 8.234/1991).
- Com conta, os dados ficam na nuvem, presos à conta; sem internet, o MetaNutri não deixa
  editar até a conexão voltar. No modo local (sem Supabase), tudo fica só no navegador.

## Como o código está organizado

```
src/domain/     regras puras, sem React: cálculo, validação, persistência (tudo testado)
src/data/       tabelas geradas por scripts/dados/*.mjs — não edite à mão
src/export/     Word (.docx) e cópia de tabela
src/ui/         telas, divididas por assunto (caso, plano, adequação, pacientes, produtos, missões)
design-system/  tokens, componentes, vitrine e referência visual
```

Regra que vale em todo o projeto: **o domínio não conhece a interface**. Se um cálculo
está numa tela, ele está no lugar errado.

## O design system

A interface inteira sai de uma biblioteca só, em [design-system/](design-system/). Os
valores de cor, fonte, espaço e raio ficam em `design-system/tokens/tokens.css`, e o que
cada um significa está escrito em [DESIGN.md](DESIGN.md) — que é o contrato visual do
projeto.

Para ver a biblioteca desenhada, com todas as variantes e estados e nos dois temas,
rode `npm run dev` e abra **<http://localhost:5173/#/design-system>**.

Duas regras valem em todo código de interface: componente novo sai da biblioteca, e
nenhum valor de cor, fonte, espaçamento ou raio vai escrito no código — sempre token.
O `npm run check` cobra as duas. O mapa da biblioteca e o passo a passo para criar um
componente estão em [design-system/LEIA-ME.md](design-system/LEIA-ME.md).

As telas originais do sistema, como o Claude Design as entregou, ficam guardadas em
`design-system/referencia/` — abra `referencia/index.html` no navegador.

## Publicar na internet

O build é estático e o app roda inteiro no navegador, então qualquer hospedagem de
arquivo serve. Já existe um fluxo pronto para o GitHub Pages:

1. No repositório, **Settings > Pages**, escolha **GitHub Actions** como origem.
2. Em **Actions > Publicar no GitHub Pages**, clique em **Run workflow**.

Ele só roda quando você manda — nada é publicado sozinho.

O endereço é **https://metanutri.com.br/** (domínio próprio, registrado no Registro.br). O DNS do
domínio aponta para o GitHub Pages: quatro registros A no domínio (`185.199.108.153`, `185.199.109.153`,
`185.199.110.153` e `185.199.111.153`) e `www` como CNAME para `matheusrv0.github.io`. O domínio está em
**Settings > Pages > Custom domain**, com **Enforce HTTPS** ligado. O endereço antigo
(`matheusrv0.github.io/metanutri/`) redireciona para o novo.

Os planos e as fichas ficam na nuvem, presos à conta: no endereço novo, basta entrar. O que ficou só no
navegador do endereço antigo vai com **Configurações > Baixar backup** e volta com **Restaurar backup**.

## O que ainda depende de você

Conta de usuário, cobrança, link do plano para o paciente e política de privacidade
estão descritos, com o porquê de não terem sido feitos, em
[docs/pendencias.md](docs/pendencias.md).

## Licença e dados de terceiros

Ver [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
