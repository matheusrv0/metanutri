# PLAN — O lado do paciente: a tela do link, o link que não se perde e os avisos por e-mail

**Spec de origem:** `./SPEC.md` (D-1200 a D-1245, CA-2200 a CA-2288, CB-1200 a CB-1227).
**Protótipo aprovado (04/11/2026):** `LinkPaciente.dc.html`, `EmailsPaciente.dc.html` e `AvisosNutri.dc.html` (canvas
"MetaNutri Redesenho"). As pílulas "Estados do protótipo" e os painéis de notas ao lado do celular são do protótipo e não
entram no app.
**Base:** ramo `marca-no-link` (a marca da nutricionista no link, `supabase/015`). Ordem de junção: `marca-no-link` →
`main` → `lado-do-paciente`. O SQL deste ramo é o **`supabase/017-lado-do-paciente.sql`** (o 016 é do assistente de IA).
**Status:** o dono aprovou o protótipo e mandou "apenas faça". As dúvidas foram decididas pelos princípios da SPEC e
ficam abaixo (DP-LP-1 em diante). Nada roda contra a produção: o SQL e a publicação são do dono (seção 9).

## 1. Abordagem

O trabalho segue as três entregas do D-1200, mas o código sai junto, num ramo só, porque as três dividem o mesmo banco e
as mesmas telas. O que muda de verdade em cada camada:

**Banco (017).** O link continua sendo a linha de `acompanhamentos`, mas passa a ser **do paciente** (D-1214): ganha a
mensagem, a próxima consulta, o último acesso, a data do plano e o `substituido_por` da migração (D-1217). Os e-mails
ganham tabelas próprias, nenhuma aberta ao visitante: o e-mail do link e as ofertas da nutricionista
(`emails_dos_links`), os aceites (`aceites`), as chaves das páginas de aceite e de descadastro (`chaves_de_aviso`), o
histórico (`envios`), a supressão por resumo do endereço (`supressao`), os limites de pedido (`limites_de_envio`), a
configuração de e-mail da conta (`config_de_emails`) e o estado dos avisos para o Painel do dono (`estado_dos_avisos`). O
paciente só chega ao banco pelo token, por funções; a nutricionista lê o que é dela e escreve por funções que conferem o
dono; as Edge Functions usam a chave de serviço.

**Servidor (Edge Functions, Deno).** Cinco funções novas, no padrão das que existem: a regra mora num núcleo puro em
`supabase/functions/_shared/avisos/` (sem Deno, sem rede, sem relógio solto; o Vitest roda com bancos e `fetch` de
mentira), a ligação com o Supabase num arquivo `*Supabase.ts`, e o `index.ts` só liga o ambiente. O Resend é chamado pela
API HTTP com `fetch` (nenhum pacote novo). A conta da semana e o estado da Adesão saem de `_shared/adesao.ts`, o mesmo
arquivo que o app usa (DP-LP-15): o resumo que o paciente recebe e a Adesão da nutricionista fazem a mesma conta.

**Tela do paciente.** `TelaMissoesPaciente` continua buscando e marcando; `LinkDoPaciente` vira as três partes com a
barra de baixo (Hoje, Plano, Semana), a folha "Meu plano" e as folhas de instalar, de receber por e-mail, de avisos e de
esquecer. A marca continua a da `marca-no-link` (`MolduraDoLink`, `TopoDoLink`, `RodapeDoLink`, `marcaNoLink.ts`, sem
mexer nelas). O endereço é `/p/<token>` (DP-LP-1), com o manifesto "Meu plano" por token (DP-LP-2).

**Tela da nutricionista.** O link fixo por paciente (D-1214): o cartão do plano pergunta "Atualizar com este plano?", o
plano sem paciente pergunta "Para quem é este link?", "Gerar link novo" vira "Trocar o endereço". A ficha ganha o cartão
"Link do paciente" (com a mensagem) e, na coluna da direita, "Avisos por e-mail", "Próximo e-mail" e "Enviados".
Configurações ganha "E-mails"; a Adesão ganha o último acesso e o envelope; o Negócio ganha "E-mails" (Painel do dono).

## 2. Decisões do plano

- **DP-LP-1** · **`/p/<token>` com `<base href="/">` no app.** O app é montado com caminhos relativos (`base: './'`); em
  `/p/<token>` o navegador pediria `/p/assets/...`. O plugin do alvo (`src/seo/pluginAlvo.ts`) põe `<base href="/" />`
  logo depois do charset, **só no build do app** (o site continua relativo). Online, a Cloudflare Pages serve o
  `index.html` para `/p/<token>` (o app não tem `404.html`, então vale o modo de página única); sem internet, o service
  worker serve o `index.html` guardado (`navigateFallback`), e os arquivos saem da raiz guardada. O app não tem link
  `href="#..."` dentro da tela do paciente (com o `<base>`, ele levaria à raiz).
- **DP-LP-2** · **O manifesto por token nasce no navegador.** A Cloudflare Pages não monta arquivo por pedido sem uma
  função nova; o manifesto "Meu plano" é um `data:application/manifest+json` escrito pela tela do link, com `id`,
  `start_url` e `scope` em `https://<app>/p/<token>`, nome e nome curto "Meu plano", `display: standalone` e os ícones
  novos (`public/meu-plano-192.png`, `-512.png`, `-maskable-512.png`, `apple-touch-icon-meu-plano.png`, gerados por
  `scripts/icone-meu-plano.mjs` a partir do símbolo da marca sobre marfim). A CSP do app passa a aceitar
  `manifest-src 'self' data:`. No iPhone, que ignora manifesto que não baixa, a tela troca `apple-touch-icon`,
  `apple-mobile-web-app-title` ("Meu plano") e o `<title>`; o ícone guarda o endereço da página, que tem o token. O teste
  no aparelho de verdade é do dono (CA-2221, seção 9).
- **DP-LP-3** · **`#/missoes/<token>` vira `/p/<token>` antes de o app montar** (`main.tsx`, `history.replaceState`, sem
  recarregar, CA-2220). A rota continua `{ tela: 'missoes', token }`; o endereço lido passa a ser `pathname + hash`.
- **DP-LP-4** · **Link fixo = a linha do paciente.** "Atualizar com este plano" grava na mesma linha o `caso_id`, as
  missões e a dieta do plano novo, e mantém o token e as marcações (CA-2222). Os ids das missões são estáveis (refeição
  pelo id da refeição; frutas, vegetais e água fixos), então as marcações antigas continuam valendo.
- **DP-LP-5** · **Migração (D-1217) em dois lugares.** O 017 faz uma vez: em cada conta, para cada paciente com mais de
  um link, o mais recente (`criado_em`) é o fixo e os outros ganham `substituido_por`. O app faz o mesmo ao ler a nuvem
  (`migrarParaLinkFixo`, puro), para os links que um app antigo criar depois do SQL. `missoes_por_token` segue o
  `substituido_por` (um nível): o token antigo abre o fixo, e a tela troca o endereço para o token do fixo. A Adesão, a
  ficha e o limite ignoram os substituídos.
- **DP-LP-6** · **O limite conta pacientes com link.** O gatilho do 011 (`conferir_link_do_paciente`) passa a contar só
  as linhas sem `substituido_por`. A frase do banco não muda (o app a reconhece); a tela diz "pacientes" (CA-2226).
- **DP-LP-7** · **O e-mail do link.** A ficha é local; o servidor só conhece o e-mail que o app publica no link
  (`definir_email_da_ficha`) ou o que o paciente dá no link. Regra (CA-2257): vale o mais recente. O servidor guarda o
  último e-mail da ficha publicado (`email_ficha`); o app publica quando o e-mail da ficha difere dele (ao abrir a ficha,
  ao gerar o link e ao mudar o campo). O aceite é ligado ao resumo do endereço: trocou o endereço, o aceite antigo deixa
  de valer sozinho.
- **DP-LP-8** · **O nome, o e-mail de resposta e o CRN nos e-mails.** O Perfil é local; "Sua marca" e Configurações
  publicam o nome e o e-mail do Perfil em `config_de_emails` (o app grava ao salvar o Perfil e ao abrir Configurações ›
  E-mails). O CRN e a situação vêm de `perfis` (já no servidor): "CRN-3 12345"; estudante, "Estágio de nutrição, sob
  supervisão" (CA-2258). Sem nome publicado, vale `perfis.nome`; sem e-mail de resposta, o e-mail da conta (CA-2259).
- **DP-LP-9** · **Os textos dos e-mails moram em `supabase/functions/_shared/avisos/emails.ts`** (não em
  `supabase/emails/avisos/`, como dizia o D-1236): o `supabase functions deploy` só empacota o que está debaixo de
  `supabase/functions`. Cada e-mail é uma função pura que devolve assunto, pré-cabeçalho, HTML e texto. A SPEC é
  atualizada antes do código.
- **DP-LP-10** · **O A1 tem um quarto horário.** O D-1236 previa três chamadas; o A1 sai "30 minutos depois da última
  atualização" (D-1230), e nenhuma das três cai 30 minutos depois de uma atualização às 10h15. O agendamento ganha
  `metanutri-avisos-a1`, a cada 15 minutos das 8h às 20h45 (UTC 11h a 23h45), que só manda o A1 vencido. Atualização às
  20h50: o A1 vence às 21h20, fora da janela, e sai às 8h do dia seguinte (CA-2249). A função confere o interruptor e o
  aceite na hora de mandar (CB-1209). O Resend com `scheduled_at` foi descartado: um e-mail agendado lá não sabe que a
  conta foi excluída (CB-1214) nem que o paciente saiu. A SPEC (D-1236, CA-2270) é atualizada antes do código.
- **DP-LP-11** · **Os tetos.** Variáveis da função, lidas a cada chamada (CA-2274): `TETO_DIA` (70), `TETO_MES` (2.100),
  `TETO_AVISOS_DIA` (padrão `TETO_DIA − 25`, ou seja 45) e `TETO_AVISOS_MES` (padrão `TETO_MES − 200`, ou seja 1.900).
  Assim o comando do Pro da SPEC (`TETO_DIA=1500 TETO_MES=45000`) sobe também os dos avisos (1.475 e 44.800); quem quiser
  outro número define a variável. O dia do teto é o dia UTC (o do Resend, que vira às 21h de Brasília, CA-2271); o mês do
  teto, o mês UTC. A janela de envio (8h a 21h) e os dias das regras são de Brasília. O que a função leu fica em
  `estado_dos_avisos` para o Painel do dono mostrar "de 70".
- **DP-LP-12** · **Prioridade e "adiado".** Uma chamada monta a fila (serviço > N1 > A1 > A3/A4 > A2) e corta no teto que
  sobra. A1, A2 e N1 que não couberam ficam com o estado "Adiado pelo teto" e entram de novo no próximo horário; o
  lembrete que não coube não fica para depois (D-1237). Por endereço: 1 aviso por dia e 3 por semana (D-1232), contados nos
  `envios` (o casal do CB-1210 conta por link).
- **DP-LP-13** · **Chave única por envio** (CA-2276): `resumo do endereço:tipo:dia de Brasília:link`, coluna `unique`.
  A função grava a linha antes de mandar (estado `enviado`); se a linha já existe, o e-mail não sai. Uma resposta 429 ou
  falha do Resend troca o estado das linhas que não saíram para `adiado` (aviso) ou apaga a linha (serviço, que a tela
  mostra como falha), sem repetir as que saíram. O pedido em lote leva também o cabeçalho `Idempotency-Key`.
- **DP-LP-14** · **Lote** (CA-2275): `POST https://api.resend.com/emails/batch`, até 100 e-mails por pedido, um pedido a
  cada 200 ms (5 por segundo). Sem anexo e sem `scheduled_at`. Cada e-mail com `from`, `to`, `reply_to`, `subject`, `html`,
  `text`, `headers` (`List-Unsubscribe` e `List-Unsubscribe-Post` nos avisos e no S2) e `tags` (só o tipo).
- **DP-LP-15** · **`_shared/adesao.ts`.** `diasEntre`, `diasMarcadosNaSemana`, `ultimaMarcacao`,
  `estadoDoAcompanhamento`, `DIAS_PARA_SUMIR` e `DIAS_NA_SEMANA_PARA_EM_DIA` saem de `src/domain/acompanhamento.ts` para
  `supabase/functions/_shared/adesao.ts` e são reexportados de lá: nenhum import do app muda, e o servidor usa o mesmo
  código (como `assinaturaTextos.ts` já usa `_shared/cobranca.ts`).
- **DP-LP-16** · **O endereço.** `normalizarEmail` (sem espaço, minúscula, CB-1211), `emailValido` (formato e até 254),
  `mascararEmail` ("j•••a@gmail.com") e `sugerirCorrecao` (gmial, hotmal, outlok…) moram em
  `supabase/functions/_shared/avisos/email.ts`, usados pelo app e pelo servidor. O resumo (`hashDoEmail`) é SHA-256 em
  hexadecimal do endereço normalizado, por WebCrypto (Node e Deno); no banco, `public.hash_do_email(text)` faz a mesma
  conta.
- **DP-LP-17** · **Servidor de e-mail do domínio** (D-1221, D-1239): DNS sobre HTTPS da Cloudflare
  (`https://cloudflare-dns.com/dns-query?name=<domínio>&type=MX`, `accept: application/dns-json`), com prazo de 3 s. Sem
  registro MX (nem A, que também recebe), "Confira o e-mail."; consulta que falha não recusa.
- **DP-LP-18** · **Webhook do Resend** (CA-2277): assinatura Svix conferida com WebCrypto (HMAC-SHA256 com o segredo
  `whsec_…` decodificado; conteúdo `id.timestamp.corpo`; aceita qualquer `v1,` do cabeçalho; relógio a até 5 minutos).
  Sem segredo, assinatura errada ou fora do tempo: 401 e nada muda.
- **DP-LP-19** · **Turnstile em "Recuperar meu link"** (D-1220): a função `meu-link` confere o token no `siteverify` da
  Cloudflare com o segredo `TURNSTILE_SECRET_KEY` (novo, do dono), com a ação `recuperar-link`. Sem o segredo configurado,
  a função recusa a recuperação (e responde a frase de sempre, CA-2233).
- **DP-LP-20** · **Chaves das páginas.** Aceite e descadastro usam chaves aleatórias de 32 letras e números, guardadas em
  `chaves_de_aviso` (aceite: vale 7 dias e uma vez, CB-1222; descadastro: sem prazo, uma por link e aviso). A página
  `/avisos/<chave>` lê a chave e só age pelo botão, que chama `avisos-resposta` por POST. Abrir o endereço (GET) nunca
  muda nada (CA-2241, CA-2253). O `List-Unsubscribe` aponta direto para a função
  (`https://<projeto>.supabase.co/functions/v1/avisos-resposta?c=<chave>`), que aceita o POST de um clique do Gmail.
- **DP-LP-21** · **O aparelho lembra** (D-1218): `localStorage` `metanutri:meus-planos`, até 5 entradas
  `{ token, primeiroNome, nutricionista, ultimoAcesso }`, a mais recente primeiro. A cópia sem internet continua a do
  CA-754 (`metanutri:acompanhamentos`). "Esquecer neste aparelho" apaga as duas. Sem `localStorage`, nada é lembrado
  (CB-1226).
- **DP-LP-22** · **Instalar** (D-1219): o `beforeinstallprompt` é guardado assim que o app carrega (`main.tsx`), porque o
  Chrome o dispara cedo. A regra do cartão é pura (`instalarMeuPlano.ts`): primeira marcação ou segundo dia de uso;
  "Agora não" esconde por 14 dias; duas recusas, só na folha; app instalado (`display-mode: standalone` ou
  `navigator.standalone`), nunca. O navegador de dentro do WhatsApp e do Instagram é reconhecido pelo agente
  (`WhatsApp`, `Instagram`, `FBAN`/`FBAV`).
- **DP-LP-23** · **Movimento** (D-1204): CSS com `transform`, `opacity` e cor, curva `cubic-bezier(0.23, 1, 0.32, 1)`
  (token de movimento do `tokens.css`, criado se faltar) e `motion-reduce:` do Tailwind. O brilho sai uma vez por dia por
  link (`metanutri:brilho:<token>` com o dia). Vibração `navigator.vibrate(10)` só sem "reduzir movimento".
- **DP-LP-24** · **"Recuperar meu link" é a rota `#/recuperar-link`** (tela livre). "Sou paciente" na tela de entrar e
  "Recuperar pelo e-mail" no link que não abre levam a ela. O cartão "Meu plano" fica acima do login, só no app.
- **DP-LP-25** · **"Próximo e-mail" e os estados da ficha** saem de funções puras compartilhadas
  (`_shared/avisos/regras.ts`): a ficha mostra o mesmo próximo aviso que a função `avisos` mandaria.
- **DP-LP-26** · **Excluir paciente apaga o link** (CA-2284): a ficha, ao excluir, chama `apagar_emails_do_link` e
  remove o link do paciente da nuvem; a confirmação passa a dizer "O link do paciente deixa de abrir.". A supressão fica.
- **DP-LP-27** · **Aceites e envios depois do link.** Removido o link pela Adesão (sem excluir o paciente), os aceites e
  os envios ficam sem o link por 6 meses e a rotina diária apaga (D-1243). Excluir a conta ou o paciente apaga na hora.
- **DP-LP-28** · **Política** (D-1244): o texto novo está na seção 8 ("Para o dono aprovar") e entra num commit separado,
  marcado `PARA O DONO APROVAR` na mensagem. `VERSAO_TERMOS` vira `2026-11-03` (troca para o dia da publicação, como
  manda o comentário de `legal.ts`).
- **DP-LP-29** · **`mensagemDoBanco.ts` não muda neste ramo** (o `marca-no-link` vai mexer nele): a trava da mensagem de
  400 caracteres é conferida antes, na tela (CA-2213); o banco só garante.
- **DP-LP-30** · **Banco sem o 017** (o site publicado antes do SQL): o link salva sem as colunas novas (o mesmo recurso
  do `comOuSemDieta`, agora para qualquer coluna que o banco não conhece) e abre como hoje; as funções de e-mail
  respondem "Não foi possível enviar agora." e a ficha mostra os cartões de e-mail com "Indisponível no momento.".
- **DP-LP-31** · **A aba que volta relê o link** (CB-1221, achado na validação de 04/11). A marcação grava a lista
  inteira (`marcar_missoes`), então duas abas abertas gravam por cima uma da outra. A `TelaMissoesPaciente` relê o link
  na nuvem quando a aba volta a ficar visível (`visibilitychange`), sem a tela de "Abrindo", e fica com o que a nuvem
  guardou. Com uma marcação desta aba ainda a caminho, a releitura espera: a resposta que chega depois de um toque novo é
  descartada, para não desmarcar o que acabou de ser marcado. Sem servidor (`naNuvem` falso), nada muda.

### 2.1 A correção da revisão r1 (04/11/2026)

As decisões D-1246 a D-1255 da SPEC (seção 1.8), no código:

- **DP-LP-32** · **O corte mora no banco** (D-1246). `acompanhamentos` ganha `cortado_em` (só o banco escreve: o app
  não grava nem apaga, como o `ultimo_acesso`) e nasce `tokens_trocados` (`token_hash` pk, SHA-256 do token; `link_id`
  com `on delete cascade`; `trocado_em`), sem nenhuma permissão para `anon` e `authenticated`. Um gatilho depois de
  `update of token` (`trocar_o_endereco`, `security definer`) guarda o resumo do token de antes, marca como cortados os
  links do mesmo paciente na mesma conta (os que apontam para o fixo pela migração, em cadeia, e os do mesmo
  `paciente_id`) e faz a limpeza do D-1248. O gatilho de antes (`cuidar_do_link`) mantém o token atual quando o app
  grava um token que já foi trocado (a aba antiga, CA-2290) e recusa criar link com ele. `missoes_por_token`,
  `registrar_acesso`, `desligar_aviso` e `marcar_missoes` (refeita aqui, a do 010 com o corte) ignoram o link cortado. A
  tela pergunta `link_trocado(p_token)` (anon) só quando o link não abriu: verdadeiro para o token cortado ou guardado em
  `tokens_trocados`. O limite (DP-LP-6) não conta link cortado. O 017 continua idempotente; se o 010 rodar de novo, o 017
  roda logo depois (a nota do topo).
- **DP-LP-33** · **A tela do endereço trocado** (D-1246). `fonteSupabase.porToken` pergunta `link_trocado` quando a
  função do paciente não devolve nada; trocado, rejeita com `LinkTrocado` (como o `LinkSemConexao`), e a
  `fonteDoPaciente` não cai na cópia do aparelho. A `TelaMissoesPaciente` mostra "Este link foi trocado." e apaga a cópia
  sem internet (pelo token) e a lembrança daquele token.
- **DP-LP-34** · **O e-mail por confirmar mora na chave** (D-1247). `chaves_de_aviso` ganha `email` (o endereço
  normalizado, só na chave de aceite; com ele, a lista de avisos pode vir vazia). "Receber" com e-mail digitado cria a
  chave com o endereço e manda o S1 e o S3 "Confirme o seu e-mail", sem tocar em `emails_dos_links`. O "Confirmar" da
  página grava o endereço (origem `paciente`, `confirmado_em`) e os aceites marcados; a chave do endereço que não é o do
  link continua recusada para os aceites sem e-mail (CA-2257). A recuperação e o `emailsPorHash` só olham o e-mail da
  ficha ou o confirmado. O pedido que não sai devolve a anotação do limite do dia (`devolver_limite`, só a chave de
  serviço) e não grava nada. `emails_do_link` devolve também `email_ficha` (o diálogo de troca mostra ele mascarado).
- **DP-LP-35** · **A limpeza da troca** (D-1248), no mesmo gatilho do DP-LP-32: o e-mail de origem `paciente` volta ao
  `email_ficha` (ou fica nulo), as chaves de aceite abertas do link saem e os aceites ativos de endereço que não é o da
  ficha se encerram (`saiu_em`). O S4 (`enviar-link`, `'trocou'`) vai só para o `email_ficha`; o app só o pede com a
  caixa do diálogo marcada.
- **DP-LP-36** · **O tempo fixo da recuperação** (D-1249): `TEMPO_DA_RECUPERACAO_MS` = 3.000. O núcleo começa o trabalho
  e espera os 3 s (`esperar`, injetável; por padrão o `setTimeout`), sem esperar o trabalho. O `index.ts` da `meu-link`
  passa `emSegundoPlano` = `EdgeRuntime.waitUntil` quando o ambiente tem (o caso de o trabalho passar dos 3 s); o
  trabalho nunca rejeita (a falha vira registro).
- **DP-LP-37** · **O Turnstile** (D-1251): `turnstileConfere` recebe o host esperado (o de `ENDERECO_DO_APP`) e exige
  `action === 'recuperar-link'` e `hostname` igual.
- **DP-LP-38** · **A chave de descadastro** (D-1252): `chaveDeSair` recebe o resumo do endereço e acha (ou cria) a chave
  do link, do aviso e do endereço. Em `avisos-resposta`, a chave `sair` com link só age se o resumo dela é o do e-mail de
  agora do link; senão, "Este endereço não vale." (404).
- **DP-LP-39** · **Como paciente** (D-1253): a `AreaDeTrabalho` passa `comoPaciente` (sem sessão) à
  `TelaMissoesPaciente`; sem ele, a tela não lembra o plano e não registra o acesso. `sair` (`usarConta.ts`) apaga
  `metanutri:meus-planos`.
- **DP-LP-40** · **O teto por conta e o remetente** (D-1254): `Tetos` ganha `conta` (`TETO_CONTA_DIA`, padrão
  `max(30, ⌊0,4 × TETO_DIA⌋)`), a `Contagem` ganha `porConta` (os envios do dia do teto por conta,
  `enviosDoDiaPorConta`) e `cortarNoTeto` corta cada item também pela conta dele. `enviarServico` devolve `'conta'`
  quando é a conta que passou (a `enviar-link` responde a frase do CA-2262). `nomeLimpoDoRemetente` (comum.ts) tira
  endereço web, e-mail, aspas e sinais de cabeçalho e corta em 60 caracteres; o banco de verdade
  (`bancoDosAvisosSupabase.nutricionista`) já devolve o nome limpo.
- **DP-LP-41** · **Os planos** (D-1255): `textoDosLimites` junta as duas linhas quando os números são iguais.

### 2.2 A correção da revisão r2 (10/11/2026)

As decisões D-1256 a D-1260 da SPEC (seção 1.9), no código:

- **DP-LP-42** · **A chave do aceite presa ao endereço** (D-1256). `chaves_de_aviso` ganha `token_hash` (SHA-256 do
  token do link com que a chave foi pedida, o mesmo `hash_do_token` do DP-LP-32), obrigatório na chave de aceite (a
  regra entra `not valid`: vale para toda chave nova sem conferir as velhas, e o 017 continua rodando de novo). Um
  gatilho antes de gravar (`conferir_chave_do_aceite`, `security definer`) lê o token do link com `for share` e recusa
  a chave cujo resumo não é o do token de agora ("O endereço do link mudou."). O `for share` espera a troca que esteja
  no meio; depois dela, a releitura vê o token novo. Se a chave grava antes, a troca espera e a apaga (DP-LP-35). No
  código: `ChaveDeAviso.tokenHash`, `hashDoToken` (comum.ts, igual ao `hash_do_token`), e `criarChave` devolve
  `false` quando o banco recusou por isso. `meuLink` (`receber`, `ligar`) responde "Este link não abre mais." (404) sem
  mandar nada; `enviarLink` manda o S2 sem o convite. Em `avisos-resposta`, a chave de aceite ainda não usada cujo
  `tokenHash` não é o do token de agora do link não vale (`carregar`: "Este endereço não vale.").
- **DP-LP-43** · **O limite antes da consulta** (D-1256): em `receber`, `anotarLimite` vem logo depois de abrir o link e
  ler o e-mail que vale, antes do `temServidorDeEmail`; os 422 de depois não devolvem a anotação. Só `mandarPedido`
  devolve (CA-2292).
- **DP-LP-44** · **O remetente** (D-1257): `nomeLimpoDoRemetente` passa por `normalize('NFKC')`, tira `\p{Cf}`, troca
  os pontos de outros alfabetos (`。｡۔։።܁܂` e, entre duas letras, `·•‧∙⋅・･`) por ".", junta o espaço antes de um
  ponto e tira, além do de antes, todo `\S*[letra ou número].[2+ letras]\S*` e os números de IP. A lista de
  terminações sai.
- **DP-LP-45** · **O link só depois do "Confirmar"** (D-1258). Em `receber` com e-mail digitado, os itens são só o S3
  "Confirme o seu e-mail". O S1 de um link (`itemDoLinkDoPlano`) passa para `comum.ts`. Em `avisos-resposta`, o
  `confirmar` da chave com e-mail grava o endereço e manda o S1 para ele (`enviarServico`); o que não sai fica no
  registro (CB-1233), e a página responde igual. A folha "Receber por e-mail" e o S3 ganham os textos da SPEC.
- **DP-LP-46** · **As leves** (D-1260): `sairPorTempo` (`usarConta.ts`) chama `esquecerTodosOsPlanos` como o `sair`; em
  `receber`, o e-mail digitado na supressão por devolução responde como enviado e não manda nada (o usado da ficha
  continua com "Confira o e-mail."); o `TabsTrigger` do seletor de opção fica `h-11` em toda largura.

## 3. O contrato (banco, funções e tipos)

### 3.1 `supabase/017-lado-do-paciente.sql` (uma transação, pode rodar de novo)

**`acompanhamentos`, colunas novas:** `mensagem text` (até 400), `mensagem_em timestamptz`, `proxima_consulta text`
(`AAAA-MM-DD` ou `AAAA-MM-DDTHH:MM`), `ultimo_acesso date`, `substituido_por uuid references acompanhamentos(id) on
delete set null`, `plano_em timestamptz not null default now()` (gatilho: muda quando `missoes`, `dieta` ou `caso_id`
mudam) e `a1_para timestamptz` (o A1 agendado). Índice por `substituido_por`.

**Tabelas novas** (todas com RLS ligado; `anon` sem permissão nenhuma):

| Tabela | Colunas | Quem lê | Quem escreve |
|---|---|---|---|
| `config_de_emails` | `nutricionista_id` pk → `auth.users` cascade; `nome` (≤ 120); `responder_para` (e-mail ≤ 254 ou nulo); `resumo_da_adesao bool default true`; `oferecer_aos_novos bool default true`; `atualizado_em` | dono | dono (RLS: ler, criar, mudar) |
| `emails_dos_links` | `link_id` pk → `acompanhamentos` cascade; `nutricionista_id` → `auth.users` cascade; `email` (normalizado, ≤ 254); `email_hash`; `origem` ('ficha', 'paciente'); `email_ficha`; `confirmado_em`; `oferta_plano`, `oferta_semana`, `oferta_lembrete` (bool, default true); `parou_tudo_em`; `convite_em`; `atualizado_em` | dono | funções |
| `aceites` | `id` identity; `link_id` → `acompanhamentos` set null; `nutricionista_id` → `auth.users` cascade; `tipo` ('plano', 'semana', 'lembrete'); `email_hash`; `versao` default 'avisos-v1'; `aceito_em`; `dia_da_semana` (0 = domingo, de Brasília); `saiu_em`; `pausado_em`. Um ativo por link, tipo e endereço (índice único parcial) | dono | funções |
| `chaves_de_aviso` | `chave` pk (32 letras e números); `link_id` → cascade (nulo no N1); `nutricionista_id` → cascade; `tipo` ('aceite', 'sair'); `avisos text[]` ('plano', 'semana', 'lembrete', 's2', 'todos', 'n1'); `email_hash`; `criado_em`; `vence_em`; `usado_em`; `desfazer jsonb` | ninguém | serviço |
| `envios` | `id` identity; `link_id` → set null; `nutricionista_id` → cascade; `tipo` ('S1'…'S4', 'A1'…'A4', 'N1'); `email_hash`; `assunto` (≤ 200); `estado` ('enviado', 'entregue', 'devolvido', 'devolucao-temporaria', 'queixa', 'adiado', 'pausado', 'falhou'); `resend_id` unique; `chave_unica` unique; `dia date` (Brasília); `conta_no_teto bool default true`; `extra jsonb`; `criado_em` | dono | serviço |
| `supressao` | `email_hash` pk; `motivo` ('devolvido', 'queixa'); `criado_em` | ninguém | serviço |
| `limites_de_envio` | `id` identity; `chave` (≤ 200); `quando` | ninguém | serviço |
| `estado_dos_avisos` | `id smallint` pk = 1; `pausado_em`; `motivo`; `teto_dia`; `teto_mes`; `atualizado_em` | admin (função) | serviço, admin (função) |

**Funções:**

| Função | Quem chama | O que faz |
|---|---|---|
| `missoes_por_token(p_token)` | anon, authenticated | a de sempre (015) + `mensagem`, `mensagem_em`, `proxima_consulta`, `ultimo_acesso`, `plano_em`, `nutricionista` (nome publicado ou de `perfis`), `email_mascarado` (do link) e `avisos jsonb` (`{"plano": "ligado" \| "desligado" \| "nao-oferecido", "semana": …, "lembrete": …}`). Segue o `substituido_por`; o `token` devolvido é o do fixo |
| `registrar_acesso(p_token)` | anon, authenticated | `ultimo_acesso` = dia de Brasília, só se mudou (CA-2239) |
| `desligar_aviso(p_token, p_tipo)` | anon, authenticated | o paciente desliga um aviso no link (CA-2256) |
| `definir_email_da_ficha(p_link, p_email)` | authenticated (dono) | DP-LP-7; cria a linha com as ofertas de `oferecer_aos_novos` |
| `definir_ofertas(p_link, p_plano, p_semana, p_lembrete)` | authenticated (dono) | os interruptores da ficha (CA-2263) |
| `emails_do_link(p_link) returns jsonb` | authenticated (dono) | `{ email, origem, confirmado_em, ofertas, aceites[], pendentes[], supressao, parou_tudo_em, convite_em, a1_para, envios[] (30 dias) }` |
| `avisos_aceitos_da_conta()` | authenticated | os `link_id` com aceite ativo (o envelope da Adesão) |
| `apagar_emails_do_link(p_link)` | authenticated (dono) | apaga e-mail, aceites, chaves e envios do link (DP-LP-26) |
| `painel_emails() returns jsonb` | authenticated (admin) | enviados hoje e no mês, adiados em 7 dias, devolução e queixa em 7 dias, envios em 7 dias, tetos, estado |
| `retomar_avisos()` | authenticated (admin) | tira a pausa |
| `hash_do_email(text)` | interna | SHA-256 hexadecimal do endereço normalizado |
| `anotar_limite(p_chave, p_limite, p_desde) returns boolean` | service_role | conta e anota num passo (como `anotar_chamada_da_cobranca`) |
| `conferir_chave_dos_avisos(p_chave)` | service_role | a chave do cofre `metanutri_chave_dos_avisos` |
| `pedir_avisos(p_vez)` | agendamento | `net.http_post` à função `avisos` com a chave no cabeçalho `x-chave-dos-avisos` e `{"vez": …}` |
| `limpar_emails_antigos(p_agora)` | service_role, agendamento | envios com mais de 6 meses, chaves vencidas, limites com mais de 2 dias, aceites sem link com mais de 6 meses (CA-2285) |

**Agendamentos (UTC, CB-1215):** `metanutri-avisos-n1` `0 10 * * 1` (segunda 7h); `metanutri-avisos-manha` `0 11 * * *`
(8h); `metanutri-avisos-tarde` `0 21 * * *` (18h); `metanutri-avisos-a1` `*/15 11-23 * * *` (8h a 20h45);
`metanutri-limpar-emails` `30 6 * * *`.

**Gatilho do limite:** `conferir_link_do_paciente` conta só as linhas sem `substituido_por` (DP-LP-6).
**Migração:** DP-LP-5.

### 3.2 As Edge Functions

| Função | JWT | Pedido | Respostas |
|---|---|---|---|
| `meu-link` | não | `{ acao: 'recuperar', email, turnstile }` | sempre 200 `{ ok: true }` (CA-2233, CA-2234) |
| | | `{ acao: 'receber', token, email \| usarDaFicha: true, avisos: TipoDeAviso[] }` | 200 `{ enviadoPara: 'j•••a@gmail.com', confirmar: boolean }`; 422 `{ erro: 'Confira o e-mail.' }`; 429 `{ erro: 'Você já pediu 3 vezes hoje. Tente amanhã.' }`; 503 `{ erro: 'Não foi possível enviar agora. Tente de novo em alguns minutos.' }`; 404 link que não abre |
| | | `{ acao: 'ligar', token, tipo }` | 200 `{ enviadoPara }`; 429; 503 |
| `avisos-resposta` | não | página: `{ acao: 'ler' \| 'confirmar' \| 'sair' \| 'parar-todos' \| 'desfazer', chave, avisos? }`; Gmail: `POST ?c=<chave>` com `List-Unsubscribe=One-Click` | `ler` → `{ tipo, nutricionista, avisos, escolhidos, nomeDoAviso }`; chave que não vale → 404 `{ erro: 'Este endereço não vale. Abra o botão do e-mail mais recente.' }` |
| `enviar-link` | sim (a nutricionista) | `{ acao: 'enviar' \| 'convite' \| 'trocou' \| 'atualizou', link, avisar? }` | 200 `{ enviadoPara }` ou `{ agendadoPara }`; 409 `{ erro: 'Juliana pediu para não receber e-mails.' }`; 429 `{ erro: 'Você chegou a 30 e-mails hoje. Amanhã volta.' }`; 422 e-mail devolvido ou sem e-mail |
| `webhook-resend` | não | evento do Resend com os cabeçalhos `svix-*` | 200; 401 sem assinatura certa |
| `avisos` | não (chave do cofre) | `{ vez: 'n1' \| 'manha' \| 'tarde' \| 'a1' }` com `x-chave-dos-avisos` | 200 `{ enviados, adiados, pulados }`; 401 sem a chave (CA-2270) |

Segredos das funções: `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `TURNSTILE_SECRET_KEY`, `ENDERECO_DO_APP` (padrão
`https://app.metanutri.com.br`), `REMETENTE_DOS_AVISOS` (padrão `avisos@avisos.metanutri.com.br`), `TETO_DIA`,
`TETO_MES`, `TETO_AVISOS_DIA`, `TETO_AVISOS_MES`. `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem.

### 3.3 Tipos e módulos compartilhados

- `supabase/functions/_shared/adesao.ts` (DP-LP-15) e `supabase/functions/_shared/avisos/email.ts` (DP-LP-16).
- `supabase/functions/_shared/avisos/tipos.ts`: `TipoDeAviso = 'plano' | 'semana' | 'lembrete'`,
  `TipoDeEmail = 'S1' | 'S2' | 'S3' | 'S4' | 'A1' | 'A2' | 'A3' | 'A4' | 'N1'`, `EstadoDoAvisoNoLink` e os textos
  curtos ("Plano atualizado", "Resumo da semana", "Lembrete").
- `src/domain/acompanhamento.ts`: o `Acompanhamento` ganha `mensagem`, `mensagemEm`, `proximaConsulta`, `ultimoAcesso`,
  `substituidoPor` e `planoEm` (opcionais na leitura do aparelho antigo); `AcompanhamentoDoLink` ganha `doLink`
  (`nutricionista`, `emailMascarado`, `avisos`), que, como a marca, só se mostra e nunca se grava.
- `src/domain/emailsDoLink.ts`: as chamadas do app às funções e às funções do banco, cada uma devolvendo
  `{ ok: true, … } | { ok: false, erro }` com a frase da tela.

## 4. Arquivos, na ordem

**Fundação (F).** `specs/lado-do-paciente/SPEC.md` (DP-LP-9, DP-LP-10, DP-LP-11); `supabase/functions/_shared/adesao.ts`;
`src/domain/acompanhamento.ts`; `supabase/functions/_shared/avisos/email.ts` e `tipos.ts`; `src/domain/fonteSupabase.ts`;
`src/domain/emailsDoLink.ts`; `src/ui/publico/conta/turnstile.ts` (a ação `recuperar-link`).

**Banco (B).** `supabase/017-lado-do-paciente.sql`; `src/data/sqlLadoDoPaciente.test.ts`; `testes/seguranca/preparo.ts`,
`tabelas.test.ts`, `exclusao.test.ts`, `ladoDoPaciente.test.ts` (novo).

**Servidor (S).** `supabase/functions/_shared/avisos/`: `regras.ts`, `tetos.ts`, `emails.ts`, `resend.ts`, `svix.ts`,
`turnstile.ts`, `dns.ts`, `meuLink.ts`, `avisosResposta.ts`, `enviarLink.ts`, `webhookResend.ts`, `rodada.ts` (a função
`avisos`), `portas.ts` e `bancoDosAvisosSupabase.ts`; `supabase/functions/{meu-link,avisos-resposta,enviar-link,
webhook-resend,avisos}/index.ts`; `src/data/servidorAvisos*.test.ts`; `testes/seguranca/avisos.test.ts` (o núcleo
contra o banco local, com o Resend de mentira).

**Paciente (P).** `src/seo/pluginAlvo.ts`; `src/seguranca/csp.ts`; `scripts/icone-meu-plano.mjs` e os ícones em
`public/`; `src/main.tsx`; `src/App.tsx`; `src/ui/navegacao.ts`; `src/domain/semanaDoPaciente.ts`,
`refeicaoDaHora.ts`, `meusPlanos.ts`, `instalarMeuPlano.ts`, `mensagemDoLink.ts`; `src/ui/missoes/TelaMissoesPaciente.tsx`,
`LinkDoPaciente.tsx` e a pasta `src/ui/missoes/link/` (barra de baixo, Hoje, Plano, Semana, folhas, cartão Instalar,
manifesto); `src/ui/publico/conta/TelaEntrar.tsx`, `CartaoMeusPlanos.tsx`, `TelaRecuperarLink.tsx`;
`src/ui/avisos/TelaAvisosDoEmail.tsx`; `design-system/tokens/tokens.css` (só se faltar o token de movimento);
`e2e/servidor-falso/lado-do-paciente.spec.ts` e `e2e/apoio/servidorFalso.ts`.

**Nutricionista (N).** `src/domain/linkFixo.ts`, `avisosNaFicha.ts`; `src/domain/repositorioAcompanhamentos.ts`;
`src/ui/estado/ProvedorAcompanhamentos.tsx`; `src/ui/missoes/CartaoLinkMissoes.tsx` e os diálogos novos;
`src/ui/pacientes/TelaPaciente.tsx`, `CartaoLinkDoPaciente.tsx`, `CartaoAvisosPorEmail.tsx`, `CartaoProximoEmail.tsx`,
`CartaoEnviados.tsx`; `src/ui/config/TelaConfiguracoes.tsx` e `CartaoEmails.tsx`; `src/ui/missoes/TelaAdesao.tsx`;
`src/ui/negocio/TelaNegocio.tsx` e `CartaoEmailsDoDono.tsx`; `src/ui/AreaDeTrabalho.tsx`; `src/domain/conta.ts`
("pacientes com link").

**LGPD (L).** `src/ui/publico/TelaPrivacidade.tsx`, `src/domain/legal.ts` e o teste deles.

**Arquivos de apoio** (tocados pelas tarefas acima, no que cada uma precisa): `eslint.config.js` (as cores em
hexadecimal só no HTML dos e-mails, que não lê token: `_shared/avisos/emails.ts`, como o `vite.config.ts`);
`src/domain/dadosDoLink.ts` (o nome da nutricionista, o e-mail mascarado e os avisos do link aberto);
`src/ui/missoes/endereco.ts` (o endereço `/p/<token>`); `src/domain/whatsapp.ts` e `src/ui/whatsapp/` (o texto do link
e o WhatsApp de "Trocar o endereço"); `src/domain/retorno.ts` (o link do paciente ignora os substituídos);
`src/ui/estado/contextoAcompanhamentos.ts`; `src/ui/publico/conta/turnstile.ts` e `usarVerificacao.ts` (a ação
`recuperar-link`); `src/ui/painel/` (o selo do Painel ignora os substituídos); os testes que já existem e mudam com o
link fixo e com a tela nova (`src/ui/missoes/*.test.tsx`, `e2e/missoes.spec.ts`, `e2e/marca-no-link.spec.ts`,
`e2e/dieta*`); `testes/seguranca/funcoes.test.ts` (as funções novas do paciente).

**Acrescentados na validação de 04/11** (a rodada do e2e na configuração normal): os e2e de sempre que geram ou abrem o
link (`e2e/csp.spec.ts`, `receitas.spec.ts`, `whatsapp-e-retorno.spec.ts`, `revisao-geral-trabalho.spec.ts`,
`e2e/servidor-falso/marca-no-link.spec.ts`, `revisao.spec.ts` e `telas-publicas.spec.ts`), que seguem o "Para quem é
este link?", o `/p/<token>` e a barra de baixo; e `src/ui/tema/globals.css`, a regra de impressão da marca (CB-958), que
pegava a barra do dia de antes dos segmentos. O R-LP-5 deixava os arquivos da marca de fora enquanto o `marca-no-link`
recebia correções; com ela na `main` (3d3428ae), a regra foi ajustada aqui.

**Acrescentados na correção da revisão r1** (T42 a T57): `supabase/017-lado-do-paciente.sql`,
`src/data/sqlLadoDoPaciente.test.ts`, `testes/seguranca/ladoDoPaciente.test.ts`, `avisos.test.ts`, `preparo.ts` e
`tabelas.test.ts`; `supabase/functions/_shared/avisos/` (`meuLink.ts`, `avisosResposta.ts`, `enviarLink.ts`,
`comum.ts`, `portas.ts`, `bancoDosAvisosSupabase.ts`, `emails.ts`, `tetos.ts`, `rodada.ts`, `turnstile.ts`) e
`supabase/functions/meu-link/index.ts`; os testes `src/data/servidor*.test.ts` e o banco de mentira
(`servidorAvisosFalsos.test-utils.ts`); `src/domain/fonteSupabase.ts`, `repositorioAcompanhamentos.ts`,
`emailsDoLink.ts`, `meusPlanos.ts`, `conta.ts`; `src/ui/missoes/TelaMissoesPaciente.tsx`, `DialogoTrocarEndereco.tsx`,
`CartaoLinkMissoes.tsx`, `MeuPlano.tsx`, `link/FolhaReceberPorEmail.tsx`; `src/ui/pacientes/CartaoLinkDoPaciente.tsx`,
`TelaPaciente.tsx`; `src/ui/avisos/TelaAvisosDoEmail.tsx`; `src/ui/AreaDeTrabalho.tsx`; `src/ui/estado/usarConta.ts`;
`src/ui/publico/TelaPrivacidade.tsx`; `src/seguranca/csp.test.ts`; `e2e/servidor-falso/lado-do-paciente.spec.ts` e
`e2e/apoio/servidorFalso.ts`; e os testes desses arquivos.

**Acrescentados na correção da revisão r2** (T58 a T67), na ordem: `supabase/017-lado-do-paciente.sql`,
`src/data/sqlLadoDoPaciente.test.ts` e `testes/seguranca/ladoDoPaciente.test.ts` e `avisos.test.ts`;
`supabase/functions/_shared/avisos/` (`portas.ts`, `comum.ts`, `bancoDosAvisosSupabase.ts`, `meuLink.ts`,
`avisosResposta.ts`, `enviarLink.ts`, `emails.ts`) e o banco de mentira (`servidorAvisosFalsos.test-utils.ts`), com os
testes `src/data/servidor*.test.ts`; `src/ui/missoes/link/FolhaReceberPorEmail.tsx`; `src/ui/publico/TelaPrivacidade.tsx`
e `legal.test.tsx`; `src/ui/estado/usarConta.ts`; `src/ui/missoes/MeuPlano.tsx`; `e2e/servidor-falso/lado-do-paciente.spec.ts`;
e os testes desses arquivos.

## 5. Tarefas (uma por commit)

Cada tarefa termina com os testes dela verdes (`npx vitest run <arquivos>`), lint e tipos dos arquivos tocados. A
dependência está entre colchetes.

| # | Tarefa | Depende |
|---|---|---|
| T1 | `docs`: este PLAN | — |
| T2 | `docs`: SPEC com DP-LP-9, DP-LP-10 e DP-LP-11 (D-1236, D-1237, CA-2270) e as notas nas outras specs (seção 5 da SPEC) | T1 |
| T3 | `refactor(adesao)`: `_shared/adesao.ts`, reexportado pelo domínio | T1 |
| T4 | `feat(link)`: o `Acompanhamento` com a mensagem, a consulta, o último acesso, o fixo e a data do plano; a leitura e a gravação na nuvem (com o recurso do banco sem o 017) | T3 |
| T5 | `feat(email)`: `_shared/avisos/email.ts` e `tipos.ts` (normalizar, validar, mascarar, sugerir, resumo) | T1 |
| T6 | `feat(email)`: `src/domain/emailsDoLink.ts`, as chamadas do app | T4, T5 |
| T7 | `feat(banco)`: `017-lado-do-paciente.sql` e o teste do texto | T1 |
| T8 | `test(seguranca)`: as tabelas novas nos ataques, na exclusão e nas funções do paciente | T7 |
| T9 | `feat(avisos)`: `regras.ts` (lembrete, resumo, A1, janela, por endereço) com TDD | T3, T5 |
| T10 | `feat(avisos)`: `tetos.ts` (fila, prioridade, teto do dia e do mês) com TDD | T9 |
| T11 | `feat(avisos)`: os nove e-mails (`emails.ts`), HTML e texto | T5 |
| T12 | `feat(avisos)`: `resend.ts` (lote, 429, chave de idempotência), `svix.ts`, `turnstile.ts`, `dns.ts` | T5 |
| T13 | `feat(avisos)`: `meu-link` | T11, T12 |
| T14 | `feat(avisos)`: `avisos-resposta` | T11, T12 |
| T15 | `feat(avisos)`: `enviar-link` | T11, T12 |
| T16 | `feat(avisos)`: `webhook-resend` e a pausa automática | T12 |
| T17 | `feat(avisos)`: a função `avisos` (N1, A1, A2, A3, A4) | T9, T10, T11, T12 |
| T18 | `test(seguranca)`: o núcleo dos avisos contra o banco local | T7, T17 |
| T19 | `feat(link)`: `/p/<token>`, `<base>`, a CSP do manifesto e a troca do endereço antigo | T4 |
| T20 | `feat(link)`: o ícone "Meu plano" e o manifesto por token | T19 |
| T21 | `feat(link)`: domínio da tela (semana, refeição da hora, mensagem, consulta) com TDD | T3, T4 |
| T22 | `feat(link)`: Hoje (barra em segmentos, marcar com movimento, mensagem, linha da semana) | T21 |
| T23 | `feat(link)`: Plano (seletor de opções, gramas à direita, "Agora"/"Próxima", "Marcar como feita") | T21 |
| T24 | `feat(link)`: Semana e a barra de baixo | T22, T23 |
| T25 | `feat(link)`: o aparelho lembra, "Meu plano" na tela de entrar, "Esquecer neste aparelho" e o último acesso | T19 |
| T26 | `feat(link)`: instalar (Android, iPhone, navegador de dentro do app) | T22 |
| T27 | `feat(link)`: "Receber meu link por e-mail" e "Avisos por e-mail" no link | T6, T24 |
| T28 | `feat(link)`: "Recuperar meu link" e o link que não abre | T6, T19 |
| T29 | `feat(avisos)`: as páginas `/avisos/<chave>` (aceite e descadastro) | T6, T19 |
| T30 | `test(e2e)`: o fluxo do paciente em 390 px | T22–T29 |
| T31 | `feat(link)`: link fixo por paciente e migração (domínio e provedor) | T4 |
| T32 | `feat(link)`: o cartão do plano com "Atualizar com este plano?", "Para quem é este link?" e "Trocar o endereço" | T31, T6 |
| T33 | `feat(ficha)`: o cartão "Link do paciente" na ficha, com a mensagem | T31 |
| T34 | `feat(ficha)`: "Avisos por e-mail", "Próximo e-mail" e "Enviados" | T6, T9 |
| T35 | `feat(config)`: Configurações › E-mails e a publicação do nome e do e-mail de resposta | T6 |
| T36 | `feat(adesao)`: último acesso e o envelope | T6, T31 |
| T37 | `feat(negocio)`: "E-mails" no Painel do dono | T6 |
| T38 | `feat(ficha)`: excluir o paciente apaga o link e os e-mails | T6, T31 |
| T39 | `feat(lgpd)`: Política e pergunta de autorização (PARA O DONO APROVAR) | T1 |
| T41 | `fix(link)`: a aba que volta relê o link (DP-LP-31, CB-1221) | T22 |
| T40 | `docs`: a validação e as divergências no PLAN | todas |

**A correção da revisão r1** (seção 2.1), um commit por correção, cada uma com o teste antes:

| # | Tarefa | Depende |
|---|---|---|
| T42 | `docs`: SPEC (seção 1.8, 2.7, CB-1228 a CB-1231) e este PLAN | — |
| T43 | `fix(banco)`: o 017 corta os endereços antigos e devolve o link ao e-mail da ficha na troca (DP-LP-32, DP-LP-35); testes de texto e no Supabase local | T42 |
| T44 | `fix(link)`: a tela "Este link foi trocado." e a cópia que sai (DP-LP-33) | T43 |
| T45 | `fix(avisos)`: o e-mail digitado só vale confirmado; o pedido que não sai não conta (DP-LP-34) | T43 |
| T46 | `fix(avisos)`: o S4 só para o e-mail da ficha, com a caixa do diálogo (DP-LP-35) | T45 |
| T47 | `fix(avisos)`: "Recuperar meu link" no tempo fixo (DP-LP-36) | T45 |
| T48 | `fix(link)`: alvos de 44 px no Plano e em "Receber por e-mail" (CA-2295) | — |
| T49 | `fix(avisos)`: o Turnstile confere a ação e o host (DP-LP-37) | — |
| T50 | `fix(avisos)`: a chave de descadastro presa ao endereço (DP-LP-38) | T45 |
| T51 | `fix(link)`: só lembra como paciente; "Sair" apaga os planos lembrados (DP-LP-39) | — |
| T52 | `fix(ficha)`: "Excluir paciente" por último no celular (CA-587) e a falha de apagar os e-mails aparece (CB-1228) | — |
| T53 | `fix(avisos)`: o teto por conta e o remetente limpo (DP-LP-40) | T45 |
| T54 | `fix(planos)`: sem linha repetida (DP-LP-41) | — |
| T55 | `fix(lgpd)`: a Política diz o que o código faz (D-1250, PARA O DONO APROVAR) | T45 |
| T56 | `test(seguranca)`: o token do caminho não sai no `Referer` (R-LP-6) | — |
| T57 | `docs`: a validação da correção | todas |
| T58 | `docs`: as decisões da revisão r2 (D-1256 a D-1260, DP-LP-42 a DP-LP-46) | — |
| T59 | `fix(avisos)`: a chave do aceite presa ao endereço do link, no banco e no "Confirmar" (DP-LP-42) | T58 |
| T60 | `fix(avisos)`: o pedido do paciente conta antes da consulta do domínio (DP-LP-43) | T59 |
| T61 | `fix(avisos)`: o remetente sem nada com cara de endereço web (DP-LP-44) | — |
| T62 | `fix(avisos)`: o e-mail digitado recebe o link só no "Confirmar" (DP-LP-45) | T59 |
| T63 | `fix(lgpd)`: a Política cobre a recuperação e o e-mail por confirmar (D-1259, PARA O DONO APROVAR) | T62 |
| T64 | `fix(conta)`: a saída por tempo apaga os planos lembrados (DP-LP-46) | — |
| T65 | `fix(avisos)`: "Receber" não revela o e-mail bloqueado (DP-LP-46) | T62 |
| T66 | `fix(link)`: o seletor de opção com 44 px em toda largura (DP-LP-46) | — |
| T67 | `docs`: a validação da correção r2 | todas |

## 6. Matriz CA/CB × teste

Todo teste leva o ID no nome. "Dono" é conferência que só ele faz (seção 9); o teste automático cobre a parte do código.

| ID | Teste |
|---|---|
| CA-2200–CA-2212 | `src/ui/missoes/link/*.test.tsx` (Hoje, Plano, Semana, movimento, mensagem) e `src/domain/refeicaoDaHora.test.ts` (CA-2210), `semanaDoPaciente.test.ts` (CA-2211) |
| CA-2213 | `src/ui/pacientes/cartaoLinkDoPaciente.test.tsx`; `src/data/servidorAvisosEmails.test.ts` (nenhum e-mail leva a mensagem) |
| CA-2214 | `src/domain/mensagemDoLink.test.ts` (as duas datas), `link/hoje.test.tsx`, `link/semana.test.tsx`; a ficha publica a consulta em `cartaoLinkDoPaciente.test.tsx` |
| CA-2215, CA-2216 | `link/marcaNaBarra.test.tsx`; `e2e/servidor-falso/marca-no-link.spec.ts` e `e2e/marca-no-link.spec.ts` (a parte escolhida e a ação na cor dela, no claro e no escuro) |
| CA-2217, CA-2218 | `link/acesso.test.tsx`, `link/barraDeAbas.test.tsx`; `e2e/servidor-falso/lado-do-paciente.spec.ts` (360, 390 e 412 px, letra a 200%) |
| CA-2219 | `link/folhaMeuPlano.test.tsx` |
| CA-2220, CA-2221 | `src/ui/enderecoDoLink.test.ts`; `link/manifesto.test.ts`; `src/seo/pluginAlvo.test.ts`; `e2e/servidor-falso/lado-do-paciente.spec.ts` (CA-2220); dono (aparelho de verdade) |
| CA-2222, CA-2224 | `src/domain/linkFixo.test.ts`, `src/ui/missoes/linkFixo.test.tsx` |
| CA-2223 | `src/ui/missoes/linkFixo.test.tsx` (o diálogo "Trocar o endereço?"); `servidorEnviarLink.test.ts` (S4); `testes/seguranca/avisos.test.ts` (S4 contra o banco local) |
| CA-2225 | `linkFixo.test.ts` (app) e `sqlLadoDoPaciente.test.ts` + `testes/seguranca/ladoDoPaciente.test.ts` (SQL) |
| CA-2226 | `linkFixo.test.tsx`; `testes/seguranca/ladoDoPaciente.test.ts` |
| CA-2227, CA-2228 | `src/domain/meusPlanos.test.ts`, `src/ui/publico/conta/cartaoMeusPlanos.test.tsx`, `link/esquecer.test.tsx`; `e2e/servidor-falso/lado-do-paciente.spec.ts` |
| CA-2229–CA-2232 | `src/domain/instalarMeuPlano.test.ts`, `link/instalar.test.tsx` |
| CA-2233, CA-2234 | `src/ui/publico/conta/telaRecuperarLink.test.tsx`; `servidorMeuLink.test.ts`; `testes/seguranca/avisos.test.ts`; `e2e/servidor-falso/lado-do-paciente.spec.ts` (CA-2233) |
| CA-2235–CA-2237 | `link/receberPorEmail.test.tsx`; `servidorMeuLink.test.ts`; `src/data/emailDoPaciente.test.ts`; `testes/seguranca/avisos.test.ts`; `e2e/servidor-falso/lado-do-paciente.spec.ts` (CA-2235, CA-2236) |
| CA-2238 | `src/ui/missoes/linkQueNaoAbre.test.tsx`; `e2e/servidor-falso/lado-do-paciente.spec.ts` |
| CA-2239 | `src/ui/missoes/ultimoAcesso.test.tsx`; `testes/seguranca/ladoDoPaciente.test.ts`; `src/ui/missoes/adesaoComAvisos.test.tsx` |
| CA-2240–CA-2243 | `link/receberPorEmail.test.tsx`; `src/ui/avisos/telaAvisosDoEmail.test.tsx`; `servidorMeuLink.test.ts`, `servidorAvisosResposta.test.ts`, `servidorEnviarLink.test.ts`; `testes/seguranca/avisos.test.ts`; `e2e/servidor-falso/lado-do-paciente.spec.ts` (CA-2240, CA-2241) |
| CA-2244–CA-2251 | `src/data/servidorAvisosRegras.test.ts`, `servidorAvisosRodada.test.ts`; `testes/seguranca/avisos.test.ts` (CA-2244, CA-2247, contra o banco local) |
| CA-2252–CA-2255 | `servidorAvisosResposta.test.ts`, `servidorAvisosEmails.test.ts`, `telaAvisosDoEmail.test.tsx` |
| CA-2256 | `link/receberPorEmail.test.tsx` (o bloco da folha "Avisos por e-mail"); `servidorMeuLink.test.ts`; `src/domain/emailsDoLink.test.ts`; `testes/seguranca/ladoDoPaciente.test.ts` (`desligar_aviso`) |
| CA-2257 | `servidorMeuLink.test.ts`; `testes/seguranca/ladoDoPaciente.test.ts` (`definir_email_da_ficha`) |
| CA-2258, CA-2259 | `servidorAvisosEmails.test.ts`, `servidorEnviarLink.test.ts` |
| CA-2260–CA-2265 | `src/ui/pacientes/avisosNaFicha.test.tsx`, `src/domain/avisosNaFicha.test.ts`; `servidorEnviarLink.test.ts` (CA-2262, CA-2265) |
| CA-2266 | `src/ui/config/cartaoEmails.test.tsx` |
| CA-2267, CA-2268 | `servidorAvisosRodada.test.ts`, `servidorAvisosEmails.test.ts` |
| CA-2269 | `src/ui/missoes/adesaoComAvisos.test.tsx` |
| CA-2270 | `sqlLadoDoPaciente.test.ts`, `testes/seguranca/ladoDoPaciente.test.ts` (agendamentos) e `servidorAvisosRodada.test.ts` (401) |
| CA-2271–CA-2276 | `src/data/servidorAvisosTetos.test.ts`, `servidorAvisosResend.test.ts`, `servidorAvisosRodada.test.ts`; `testes/seguranca/avisos.test.ts` (CA-2274 a CA-2276) |
| CA-2277, CA-2278 | `src/data/servidorWebhookResend.test.ts`; `testes/seguranca/avisos.test.ts` (CA-2277) |
| CA-2279 | `servidorAvisosEmails.test.ts` (remetente do subdomínio); dono (DKIM no painel do Resend) |
| CA-2280 | `servidorAvisosEmails.test.ts` (sem `<img>`, sem pixel, com texto puro) |
| CA-2281 | `src/ui/negocio/cartaoEmailsDoDono.test.tsx`; `testes/seguranca/ladoDoPaciente.test.ts` (`painel_emails` só do admin) |
| CA-2282 | `src/data/servidorAvisosSegredos.test.ts` (a chave só no `Deno.env`, nunca em `src/` nem no pacote); dono (chave presa ao domínio) |
| CA-2283 | `servidorAvisosSegredos.test.ts` (nenhuma chamada a `/contacts`, `/audiences` ou `/broadcasts`); dono |
| CA-2284 | `testes/seguranca/exclusao.test.ts`; `src/ui/pacientes/excluirPaciente.test.tsx` |
| CA-2285 | `testes/seguranca/ladoDoPaciente.test.ts` (`limpar_emails_antigos`) |
| CA-2286 | `src/ui/publico/legal.test.tsx` |
| CA-2287 | `servidorAvisosEmails.test.ts` (os nove, com e sem nome) |
| CA-2288 | `servidorAvisosEmails.test.ts` (botão de 48 px, cartão de 480 px, sem imagem); dono (Gmail, Outlook, Apple Mail) |
| CB-1200 | `servidorMeuLink.test.ts` (S1 com dois planos), `meusPlanos.test.ts` |
| CB-1201 | `cartaoMeusPlanos.test.tsx` |
| CB-1202, CB-1227 | `servidorAvisosEmails.test.ts`; `link/hoje.test.tsx` |
| CB-1203, CB-1204 | `meusPlanos.test.ts` (sem cópia, o cartão some); `linkQueNaoAbre.test.tsx` |
| CB-1205 | `src/ui/missoes/missoesNaNuvem.test.tsx` (o de sempre) e `ultimoAcesso.test.tsx` (sem internet, o acesso espera) |
| CB-1206 | `servidorAvisosRegras.test.ts` (Brasília) |
| CB-1207, CB-1209, CB-1210, CB-1214 | `servidorAvisosRodada.test.ts` |
| CB-1208 | `link/barraDeAbas.test.tsx`; `servidorAvisosRodada.test.ts` (A1 sem dieta) |
| CB-1211 | `src/data/emailDoPaciente.test.ts` |
| CB-1212, CB-1213 | `servidorWebhookResend.test.ts` |
| CB-1215 | `sqlLadoDoPaciente.test.ts` |
| CB-1216 | `servidorMeuLink.test.ts`, `servidorAvisosRodada.test.ts`, `link/receberPorEmail.test.tsx` |
| CB-1217, CB-1218 | `link/hoje.test.tsx` |
| CB-1219 | `link/barraDeAbas.test.tsx` (trilho no topo acima de 640 px) |
| CB-1220 | `instalarMeuPlano.test.ts` |
| CB-1221 | `src/ui/missoes/TelaMissoesPaciente.test.tsx` (DP-LP-31: a aba que volta relê; a marcação a caminho não é desfeita) |
| CB-1222, CB-1223 | `servidorAvisosResposta.test.ts`, `servidorMeuLink.test.ts` |
| CB-1224 | `linkFixo.test.tsx` |
| CB-1225 | `servidorEnviarLink.test.ts` |
| CB-1226 | `meusPlanos.test.ts`, `link/instalar.test.tsx` |
| CA-2289, CA-2290, CB-1231 | `src/data/sqlLadoDoPaciente.test.ts` (texto); `testes/seguranca/ladoDoPaciente.test.ts` (no banco local); `src/domain/fonteSupabase*.test.ts` e `src/ui/missoes/linkQueNaoAbre.test.tsx` (a tela e a cópia que sai); a sonda `sonda-trocar-endereco.mts` da revisão |
| CA-2291, CA-2292, CB-1229 | `servidorMeuLink.test.ts` (o S3 "Confirme o seu e-mail" e o pedido que não sai), `servidorAvisosResposta.test.ts`; `src/domain/emailsDoLink.test.ts`; `link/receberPorEmail.test.tsx`; `telaAvisosDoEmail.test.tsx`; `sqlLadoDoPaciente.test.ts`; `testes/seguranca/avisos.test.ts` |
| CA-2293, CB-1230 | `servidorEnviarLink.test.ts`; `src/ui/missoes/linkFixo.test.tsx`; `testes/seguranca/ladoDoPaciente.test.ts` e `avisos.test.ts` |
| CA-2294 | `servidorMeuLink.test.ts`; a sonda `sonda-tempo-recuperar.mts` da revisão |
| CA-2295 | `e2e/servidor-falso/lado-do-paciente.spec.ts` (390 px) |
| CA-2296 | `servidorAvisosResend.test.ts` (o `turnstileConfere`) |
| CA-2297 | `servidorAvisosResposta.test.ts`; `testes/seguranca/avisos.test.ts` |
| CA-2298 | `src/ui/missoes/ultimoAcesso.test.tsx`; `src/ui/estado/usarConta.test.ts` |
| CA-2300, CB-1232 | `src/data/sqlLadoDoPaciente.test.ts` (texto); `servidorMeuLink.test.ts`, `servidorAvisosResposta.test.ts`, `servidorEnviarLink.test.ts`; `testes/seguranca/ladoDoPaciente.test.ts` (a corrida no banco local, com duas transações); a parte F da sonda `sonda-contornos-r2.mts` da revisão |
| CA-2301 | `servidorMeuLink.test.ts`; `testes/seguranca/avisos.test.ts` |
| CA-2302 | `servidorEnviarLink.test.ts`; a sonda `sonda-nome-remetente.mts` da revisão |
| CA-2303, CB-1233 | `servidorMeuLink.test.ts`, `servidorAvisosResposta.test.ts`; `link/receberPorEmail.test.tsx`; `testes/seguranca/avisos.test.ts`; `e2e/servidor-falso/lado-do-paciente.spec.ts` |
| CA-2304 | `src/ui/publico/legal.test.tsx` |
| CA-2305 | `src/ui/estado/usarConta.test.ts` |
| CA-2306 | `servidorMeuLink.test.ts` |
| CA-2307 | `e2e/servidor-falso/lado-do-paciente.spec.ts` (1440 px) |
| CA-2299 | `servidorAvisosTetos.test.ts`, `servidorEnviarLink.test.ts` (o teto e o remetente limpo), `servidorAvisosRodada.test.ts`, `servidorMeuLink.test.ts`; `testes/seguranca/avisos.test.ts` |
| CA-587 (B6), CB-1228 | `src/ui/pacientes/excluirPaciente.test.tsx` |
| D-1255 (B10) | `src/domain/conta.test.ts` |
| R-LP-6 (B5) | `src/seguranca/csp.test.ts` |

## 7. Riscos

- **R-LP-1** · O 017 precisa rodar antes de publicar o site (como o 015). Publicado antes, o link e a ficha funcionam
  como hoje (DP-LP-30), e os e-mails respondem que não deu.
- **R-LP-2** · O manifesto em `data:` é aceito pelo Chrome do Android; se um aparelho não oferecer instalar, a folha do
  iPhone continua valendo (Adicionar à tela inicial pelo menu), e o ícone guarda o endereço com o token. Conferência do
  dono no aparelho (CA-2221).
- **R-LP-3** · O subdomínio novo precisa de DNS e de alguns dias de volume baixo (seção 9, passos 3 a 7). Até lá,
  `RESEND_API_KEY` fica sem valor e as funções respondem "Não foi possível enviar agora.".
- **R-LP-4** · O `<base href="/">` muda a resolução de endereços relativos do app. O app não tem link relativo de página
  (só `#/…`, que resolve igual na raiz). Coberto pelo e2e de sempre.
- **R-LP-6** · **Risco aceito (B5 da revisão r1): o token vai no caminho** (`/p/<token>`, `/avisos/<chave>` e o
  `?c=<chave>` do um clique), e não mais no `#`. O manifesto do "Meu plano" (DP-LP-2) precisa do endereço com o token,
  e o iPhone guarda o ícone pelo endereço da página. Por isso o token chega aos registros da Cloudflare e da Supabase
  (o `request.url` das funções). O `Referrer-Policy: strict-origin-when-cross-origin` do `_headers` vale para `/*`
  (`/p/*` e `/avisos/*` também): outro site recebe só a origem, sem o caminho (teste em `src/seguranca/csp.test.ts`).
  Fica para o dono conferir que o Web Analytics da Cloudflare está desligado em `app.metanutri.com.br`.
- **R-LP-5** · O `marca-no-link` ainda recebe correções. Os arquivos dela (`TelaSuaMarca`, `CartaoSuaMarca`,
  `PreviaDoLink`, `globals.css`, `mensagemDoBanco.ts`, `logoDaMarca.ts`) não são tocados aqui; a `LinkDoPaciente` mantém as
  props de que a prévia precisa.

## 8. Para o dono aprovar: o texto novo da Política e da autorização

**Política de privacidade**, em "Que dados guardamos e para quê", dois itens novos:

> - O e-mail do paciente, quando o nutricionista o registra na ficha ou o próprio paciente o informa no link: para mandar
>   o link do plano, os avisos que o paciente aceitou e os e-mails que o nutricionista envia pelo MetaNutri. O e-mail que
>   o paciente informa no link só passa a valer depois que ele toca em Confirmar no e-mail que recebe. Até lá, esse
>   e-mail recebe só o pedido de confirmação e fica guardado com ele por até 8 dias. Guardamos também o
>   aceite (o aviso, a data e a hora e a versão do texto) enquanto o link existir e por mais 6 meses depois que ele sai, e
>   o histórico dos e-mails enviados (tipo, assunto, situação e data), por 6 meses. O e-mail que volta (o endereço não
>   existe) ou que é marcado como spam entra numa lista de bloqueio, que guarda só um resumo do endereço (hash), para não
>   receber mais avisos. Quem sai de um aviso só deixa de recebê-lo.
> - Em "Recuperar meu link", um resumo (hash) do e-mail e do endereço de internet de quem pede, por 2 dias: para limitar
>   os pedidos e evitar abuso.

(Revisão r1, D-1250: o texto acima substitui o de 03/11, que dizia "resumo cifrado", punha quem sai de um aviso na lista
de bloqueio e guardava o aceite só "enquanto o link existir". **PARA O DONO APROVAR.** A versão dos textos continua
`2026-11-03`: a de 03/11 nunca foi publicada.) (Revisão r2, D-1259: a frase "Até lá, esse e-mail recebe só o pedido
de confirmação e fica guardado com ele por até 8 dias." entrou, e o item do Turnstile, abaixo, passou a falar de
"Recuperar meu link". **PARA O DONO APROVAR.**)
> - O dia em que o paciente abriu o link (só a data, sem a hora): para o nutricionista saber se o paciente está abrindo o
>   plano.

Em "Onde os dados ficam", o item do Resend passa a ser:

> - Os e-mails de confirmação e de troca de senha, e os e-mails ao paciente e ao nutricionista (o link do plano, os
>   avisos aceitos e o resumo da adesão), são enviados pelo Resend, sem imagem e sem rastreio de abertura ou de clique. O
>   e-mail do paciente é usado só para isso: nunca para propaganda do MetaNutri e nunca em lista de contatos.

E o item do Turnstile passa a ser (D-1259):

> - Nas telas de conta e em "Recuperar meu link", o Cloudflare Turnstile recebe dados técnicos do navegador, como o
>   endereço IP, para separar pessoas de robôs.

Em "Seus direitos", uma frase no fim:

> Cada e-mail de aviso tem, no rodapé, como deixar de receber, num toque e sem login.

**Pergunta de autorização** do cartão do link, depois de "O acompanhamento registra dado de saúde, que a LGPD trata como
sensível. Cabe a você, nutricionista, obter a autorização do paciente; o MetaNutri apenas armazena os dados.":

> Com o e-mail do paciente na ficha, o MetaNutri manda o link por e-mail quando você pedir e oferece os avisos, que só
> chegam se ele aceitar.

A versão dos textos sobe (`VERSAO_TERMOS = '2026-11-03'`), e o aviso de termos novos aparece como hoje (CA-2286).

## 9. O que o dono faz, na ordem

Já feito pelo dono em 04/11/2026 (SPEC, seção 7, passos 3 a 6): o domínio `avisos.metanutri.com.br` no Resend, o DNS no
Registro.br (com o `send.avisos` em `CNAME` para `send.forge.rmta.net`), o rastreio desligado e o `RESEND_API_KEY` nos
Secrets das Edge Functions.

1. **SQL 017, antes de publicar.** Supabase › **SQL Editor** › **New query** › cole todo o
   `supabase/017-lado-do-paciente.sql` › **Run**. Tem que aparecer "Success. No rows returned"; pode rodar de novo sem
   medo. Depois, as consultas de conferência do fim do arquivo, numa consulta nova. O agendamento usa o endereço do
   projeto que o 014 guardou no cofre (`metanutri_url_do_projeto`); a conferência mostra as duas linhas do cofre.
2. **`TURNSTILE_SECRET_KEY`.** Cloudflare › **Turnstile** › o widget do app › **Settings** › copie a **Secret key**.
   Supabase › **Edge Functions** › **Secrets** › **Add new secret**: nome `TURNSTILE_SECRET_KEY`, valor a chave. Sem
   ela, "Recuperar meu link" responde a frase de sempre e não manda nada (DP-LP-19). Desde a revisão r1 (D-1251), o
   token só vale com a ação `recuperar-link` e o host `app.metanutri.com.br`: confira, no mesmo widget, que
   `app.metanutri.com.br` está em **Hostnames**. Se um dia o app mudar de endereço, o secret `ENDERECO_DO_APP` das
   funções diz o novo (sem ele, vale `https://app.metanutri.com.br`).
   Opcional (D-1254): o secret `TETO_CONTA_DIA` muda o teto de e-mails por conta por dia (sem ele, 30).
3. **As cinco funções.** Na pasta do projeto, com a `main` atualizada:
   ```
   npx supabase functions deploy meu-link --no-verify-jwt --project-ref qmpljfjbdcrdbqutuvmg
   npx supabase functions deploy avisos-resposta --no-verify-jwt --project-ref qmpljfjbdcrdbqutuvmg
   npx supabase functions deploy enviar-link --project-ref qmpljfjbdcrdbqutuvmg
   npx supabase functions deploy webhook-resend --no-verify-jwt --project-ref qmpljfjbdcrdbqutuvmg
   npx supabase functions deploy avisos --no-verify-jwt --project-ref qmpljfjbdcrdbqutuvmg
   ```
   `enviar-link` fica com a verificação de sessão (só a nutricionista chama). As outras quatro são chamadas pelo
   paciente sem conta, pelo Resend ou pelo agendamento do banco, e conferem por conta própria (o token do link, a chave
   do e-mail, a assinatura do Svix e a chave do cofre).
4. **O webhook do Resend** (só com a `webhook-resend` publicada). Resend › **Webhooks** › **Add endpoint**:
   - endereço: `https://qmpljfjbdcrdbqutuvmg.supabase.co/functions/v1/webhook-resend`;
   - eventos: `email.delivered`, `email.bounced` e `email.complained`.

   Copie o **Signing secret** (`whsec_…`) e guarde em Supabase › Edge Functions › Secrets como `RESEND_WEBHOOK_SECRET`.
   Sem ele, a função recusa todo evento com 401 (CA-2277), e as devoluções não entram na supressão.
5. **Aprovar a Política** (seção 8). O texto já está no código (commit `PARA O DONO APROVAR`); a data de
   `VERSAO_TERMOS` troca para o dia da publicação.
6. **Publicar o site** depois do 017 (R-LP-1), pelo `publicar.yml` de sempre.
7. **Conferências que só o dono faz:** o ícone "Meu plano" num iPhone e num Android de verdade (CA-2221); o "Verify"
   do domínio no Resend, com o DKIM (CA-2279); um S1 de teste aberto no Gmail, no Outlook e no Apple Mail (CA-2288); a
   Adesão depois da publicação, para aprovar a migração do link fixo (D-1217); e (R-LP-6) Cloudflare ›
   **Web Analytics**: o `app.metanutri.com.br` sem o Web Analytics ligado, para o token do caminho não ir para as
   estatísticas.

Nada aqui é preciso para o link abrir: publicado antes do 017, o link e a ficha funcionam como hoje (DP-LP-30), e os
e-mails respondem "Não foi possível enviar agora.".

## 10. Validação

Feita em 04/11/2026, com a `main` de 3d3428ae (a marca no link e o importar pacientes) juntada ao ramo (merge sem
conflito).

**Rodada final** (04/11, de 09:36 em diante, com a máquina dividida com outras frentes):
- `npm run lint`: 0 erro (1 aviso antigo, abaixo). `npm run typecheck`: limpo. `npm run build`: limpo.
- `npx vitest run --maxWorkers=4`: 7.400 testes em 408 arquivos; 7.399 verdes e 1 que estourou o tempo de 20 s com a
  máquina cheia (`src/domain/trocas.test.ts`, CA-921, de fora desta frente e sem mudança neste ramo), verde rodando
  sozinho (46 de 46).
- e2e completo, na configuração normal (portas 4173, 4176 e 4178), com a `trava-e2e` e `--workers=2`: **501 de 501**
  (20,6 min).
- `npm run test:csp` (com a `trava-csp`): 3 de 3.
- `npm run test:seguranca` (com a `trava-ataques`): **340 de 340** em 11 arquivos, com os 29 do núcleo dos avisos (T18).
  Numa rodada anterior, às 10:01, com a máquina cheia (o build e o fim do Vitest ao mesmo tempo), 3 testes do
  `enviar-link` e o preparo do `webhook-resend` responderam 503 ("Não foi possível enviar agora"); o arquivo sozinho
  (29 de 29) e a suíte inteira de novo (340 de 340) passaram sem mudança nenhuma. Fica anotado como intermitente com a
  máquina carregada: o envio ao Resend tem prazo (`PRAZO_DO_RESEND_MS`), e a falha cai no "fora".

**Achados da validação, corrigidos:**
- **Os e2e de sempre esperavam a tela de antes.** O agente anterior viu 37 falhas numa cópia do e2e com outras portas
  (falha falsa: vários testes têm a porta escrita). Na configuração normal, as falhas eram dos testes que geram ou abrem
  o link: sem o "Para quem é este link?" (CA-2224), com o `#/missoes/` (D-1213), com as abas "Missões" e "Meu plano"
  (D-1202) e com a linha da folha impressa no Plano (D-1206). Atualizados (ver a seção 4, "Acrescentados na
  validação").
- **CB-958 (marca-no-link):** a regra de impressão da marca pegava a barra do dia por `[role=progressbar] > div`, que
  deixou de existir com os segmentos (D-1203); no papel, sem "Gráficos de fundo", a barra perdia a cor dela. A regra
  passa a pegar o pedaço cheio de cada segmento (`globals.css`).
- **CA-2218:** com a letra a 200% em 360 px, Hoje rolava 22 px para o lado: a origem da missão ("Refeição do plano"),
  ao lado do "Ver", não quebrava, e a linha da semana não cabia numa linha. A origem quebra como o nome da missão, e a
  linha da semana desce o texto para baixo dos pontos (`LinhaDaMissao.tsx`, `LinhaDaSemana.tsx`).
- **A matriz da seção 6** apontava para dois arquivos que não existem (`link/folhaAvisos.test.tsx` e
  `src/ui/missoes/trocarEndereco.test.tsx`): o CA-2256 está em `link/receberPorEmail.test.tsx`, e o CA-2223 em
  `linkFixo.test.tsx`. A matriz também ganhou o T18 (`testes/seguranca/avisos.test.ts`) e o T30
  (`e2e/servidor-falso/lado-do-paciente.spec.ts`). Conferido por busca: os 117 IDs da SPEC (CA-2200 a CA-2288 e
  CB-1200 a CB-1227) têm, cada um, pelo menos um teste com o ID no nome.

**Divergências que ficam (para o dono saber; nenhuma quebra critério desta SPEC):**
- **CA-1965 e CA-1966 (marca-no-link)** dizem "a aba escolhida na cor dela com texto branco" (no escuro, `#101A1D`). Com
  a barra de baixo (D-1202), a parte escolhida leva a cor no nome e num fundo claro da mesma cor; o par "cor com texto
  branco (ou carvão)" passou para "Marcar como feita", no Plano. É o que o CA-2215 e a seção 5 desta SPEC pedem, mas o
  texto da `marca-no-link` não foi reescrito.
- **CA-883 (receitas-com-calculo) e CA-974 (integracao-rodada-1910)** pedem, no link, a porção como na folha impressa
  ("1 unidade · 120 g", "a mesma linha da folha"). Com o D-1206, o link mostra o nome à esquerda, "120 g" à direita e
  "1 unidade" embaixo. A seção 5 desta SPEC avisa a mudança no D-150 da `dieta-no-link`, mas não nessas duas.
- **CA-2221** (o ícone instalado abre o plano), **CA-2279** (DKIM), **CA-2282** e **CA-2283** (a chave presa ao domínio)
  e **CA-2288** (Gmail, Outlook e Apple Mail) têm a parte do código testada; o resto é conferência do dono (seção 9).
- O lint tem um aviso antigo (não erro) em `src/ui/missoes/link/linkDeTeste.test-utils.tsx` (React Refresh num arquivo
  de teste).

### 10.1 A validação da correção da revisão r1 (10/11/2026)

T45 a T57 em cima de T42 a T44. Rodada final, com as travas de sempre:
- `npm run lint`: 0 erro (o aviso antigo de sempre). `npm run typecheck`: limpo. `npm run build`: limpo.
- `npx vitest run --maxWorkers=4`: 7.453 de 7.453, em 408 arquivos.
- e2e completo, na configuração normal, com a `trava-e2e` e `--workers=2`: **503 de 503** (11,4 min), com o CA-2295.
- `npm run test:csp` (com a `trava-csp`): 3 de 3.
- `npm run test:seguranca` (com a `trava-ataques`): **355 de 355** em 11 arquivos.
- As sondas da revisão: `sonda-trocar-endereco.mts` (pilha local nova, núcleos e banco de verdade):
  `furo1=false furo2=false furo3=false`; `sonda-tempo-recuperar.mts`: as quatro respostas entre 3.006 e 3.014 ms, "Sem
  diferença de tempo".

**Achados da validação, corrigidos:**
- **A suíte de ataques passava do teto do dia.** Com o S3 "Confirme o seu e-mail" e os testes novos, a suíte (quase toda
  da mesma conta, no mesmo dia) passou dos 70 do `TETO_DIA` e respondeu 503 em testes que nada tinham com o teto. A
  suíte agora roda com os tetos altos (`TETOS_DA_SUITE`), e o teste dos tetos (CA-2274) os põe de volta no fim; o teto
  por conta tem o teste dele (CA-2299) com o número que a conta já mandou.
- **O teste do "Recuperar" com o e-mail não confirmado gastava um dos 3 pedidos da hora** do mesmo e-mail que o teste
  da recuperação (CA-2234) usa depois: ele devolve o pedido (`devolver_limite`) no fim.

**Divergências que ficam:**
- O teto por conta (D-1254) vale também para os avisos: uma conta com mais de 30 pacientes com aviso no mesmo dia tem
  os que passarem adiados (o lembrete, para o dia seguinte). É o que a D-1254 pede; o `TETO_CONTA_DIA` sobe sem código
  novo.
- A Política (D-1250) continua **PARA O DONO APROVAR**; a versão dos textos fica `2026-11-03`.

### 10.2 A validação da correção da revisão r2 (10/11/2026)

T58 a T66 em cima de 578a6692. Rodada final, com as travas de sempre:
- `npm run lint`: 0 erro (o aviso antigo de sempre). `npm run typecheck`: limpo. `npm run build`: limpo.
- `npx vitest run --maxWorkers=4`: 7.469 de 7.469, em 408 arquivos.
- e2e dos arquivos do paciente (`servidor-falso/lado-do-paciente`, `servidor-falso/marca-no-link`, `marca-no-link`,
  `missoes`): 34 de 34. e2e completo, na configuração normal, com a `trava-e2e` e `--workers=2`: **504 de 504** (7,3 min).
- `npm run test:csp` (com a `trava-csp`): 3 de 3.
- `npm run test:seguranca` (com a `trava-ataques`): **358 de 358** em 11 arquivos, com a corrida nos dois sentidos
  (duas transações no banco local).
- As sondas das revisões: `sonda-trocar-endereco.mts` (r1) `furo1=false furo2=false furo3=false`;
  `sonda-contornos-r2.mts` "nenhum furo" (parte F: a troca no meio do "Receber" responde 404 e a chave não nasce);
  `sonda-nome-remetente.mts` sai "Ana Lima" em todos os casos de endereço web; `sonda-tempo-recuperar.mts` (r1) e
  `sonda-tempo-r2.mts` sem diferença de tempo (pior 10 ms).

**Divergências que ficam:**
- O instruído para a Política era "até 7 dias"; o texto diz "por até 8 dias", porque a confirmação vence em 7 dias e a
  limpeza (`limpar_emails_antigos`) roda uma vez por dia: o endereço pode ficar até um dia a mais.
- O CA-464 (`seguranca-lote-3`) ainda tem, na spec dele, a frase de antes do Turnstile ("Nas telas de conta, …"). O
  texto e o teste seguem o D-1259.
- CA-2306: a resposta do e-mail bloqueado é igual no corpo, mas sai sem esperar o envio; a diferença de tempo é a de
  um envio ao Resend. O "Receber" pede o token, e o tempo fixo (D-1249) é só da recuperação.
- A Política (D-1250 e D-1259) continua **PARA O DONO APROVAR**; a versão dos textos fica `2026-11-03`.
