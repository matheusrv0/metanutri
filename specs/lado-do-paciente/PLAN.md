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

## 6. Matriz CA/CB × teste

Todo teste leva o ID no nome. "Dono" é conferência que só ele faz (seção 9); o teste automático cobre a parte do código.

| ID | Teste |
|---|---|
| CA-2200–CA-2212 | `src/ui/missoes/link/*.test.tsx` (Hoje, Plano, Semana, movimento, mensagem) e `src/domain/refeicaoDaHora.test.ts` (CA-2210), `semanaDoPaciente.test.ts` (CA-2211) |
| CA-2213 | `src/ui/pacientes/cartaoLinkDoPaciente.test.tsx`; `src/data/servidorAvisosEmails.test.ts` (nenhum e-mail leva a mensagem) |
| CA-2214 | `src/domain/mensagemDoLink.test.ts` (as duas datas), `link/hoje.test.tsx`, `link/semana.test.tsx`; a ficha publica a consulta em `cartaoLinkDoPaciente.test.tsx` |
| CA-2215, CA-2216 | `link/marcaNaBarra.test.tsx` |
| CA-2217, CA-2218 | `link/acesso.test.tsx`; `e2e/servidor-falso/lado-do-paciente.spec.ts` (360, 390 e 412 px, letra a 200%) |
| CA-2219 | `link/folhaMeuPlano.test.tsx` |
| CA-2220, CA-2221 | `src/ui/enderecoDoLink.test.ts`; `link/manifesto.test.ts`; `src/seo/pluginAlvo.test.ts`; dono (aparelho de verdade) |
| CA-2222, CA-2224 | `src/domain/linkFixo.test.ts`, `src/ui/missoes/linkFixo.test.tsx` |
| CA-2223 | `src/ui/missoes/trocarEndereco.test.tsx`; `servidorEnviarLink.test.ts` (S4) |
| CA-2225 | `linkFixo.test.ts` (app) e `sqlLadoDoPaciente.test.ts` + `testes/seguranca/ladoDoPaciente.test.ts` (SQL) |
| CA-2226 | `linkFixo.test.tsx`; `testes/seguranca/ladoDoPaciente.test.ts` |
| CA-2227, CA-2228 | `src/domain/meusPlanos.test.ts`, `src/ui/publico/conta/cartaoMeusPlanos.test.tsx`, `link/esquecer.test.tsx` |
| CA-2229–CA-2232 | `src/domain/instalarMeuPlano.test.ts`, `link/instalar.test.tsx` |
| CA-2233, CA-2234 | `src/ui/publico/conta/telaRecuperarLink.test.tsx`; `servidorMeuLink.test.ts` |
| CA-2235–CA-2237 | `link/receberPorEmail.test.tsx`; `servidorMeuLink.test.ts`; `src/data/emailDoPaciente.test.ts` |
| CA-2238 | `src/ui/missoes/linkQueNaoAbre.test.tsx` |
| CA-2239 | `src/ui/missoes/ultimoAcesso.test.tsx`; `testes/seguranca/ladoDoPaciente.test.ts`; `src/ui/missoes/adesaoComAvisos.test.tsx` |
| CA-2240–CA-2243 | `link/receberPorEmail.test.tsx`; `src/ui/avisos/telaAvisosDoEmail.test.tsx`; `servidorMeuLink.test.ts`, `servidorAvisosResposta.test.ts`, `servidorEnviarLink.test.ts` |
| CA-2244–CA-2251 | `src/data/servidorAvisosRegras.test.ts`, `servidorAvisosRodada.test.ts` |
| CA-2252–CA-2255 | `servidorAvisosResposta.test.ts`, `servidorAvisosEmails.test.ts`, `telaAvisosDoEmail.test.tsx` |
| CA-2256 | `link/folhaAvisos.test.tsx`; `testes/seguranca/ladoDoPaciente.test.ts` (`desligar_aviso`) |
| CA-2257 | `servidorMeuLink.test.ts`; `testes/seguranca/ladoDoPaciente.test.ts` (`definir_email_da_ficha`) |
| CA-2258, CA-2259 | `servidorAvisosEmails.test.ts`, `servidorEnviarLink.test.ts` |
| CA-2260–CA-2265 | `src/ui/pacientes/avisosNaFicha.test.tsx`, `src/domain/avisosNaFicha.test.ts`; `servidorEnviarLink.test.ts` (CA-2262, CA-2265) |
| CA-2266 | `src/ui/config/cartaoEmails.test.tsx` |
| CA-2267, CA-2268 | `servidorAvisosRodada.test.ts`, `servidorAvisosEmails.test.ts` |
| CA-2269 | `src/ui/missoes/adesaoComAvisos.test.tsx` |
| CA-2270 | `sqlLadoDoPaciente.test.ts`, `testes/seguranca/ladoDoPaciente.test.ts` (agendamentos) e `servidorAvisosRodada.test.ts` (401) |
| CA-2271–CA-2276 | `src/data/servidorAvisosTetos.test.ts`, `servidorAvisosResend.test.ts`, `servidorAvisosRodada.test.ts` |
| CA-2277, CA-2278 | `src/data/servidorWebhookResend.test.ts` |
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
- **R-LP-5** · O `marca-no-link` ainda recebe correções. Os arquivos dela (`TelaSuaMarca`, `CartaoSuaMarca`,
  `PreviaDoLink`, `globals.css`, `mensagemDoBanco.ts`, `logoDaMarca.ts`) não são tocados aqui; a `LinkDoPaciente` mantém as
  props de que a prévia precisa.

## 8. Para o dono aprovar: o texto novo da Política e da autorização

**Política de privacidade**, em "Que dados guardamos e para quê", dois itens novos:

> - O e-mail do paciente, quando o nutricionista o registra na ficha ou o próprio paciente o informa no link: para mandar
>   o link do plano, os avisos que o paciente aceitou e os e-mails que o nutricionista envia pelo MetaNutri. Guardamos
>   também o aceite (o aviso, a data e a hora e a versão do texto), enquanto o link existir, e o histórico dos e-mails
>   enviados (tipo, assunto, situação e data), por 6 meses. Quem sai de um aviso, ou cujo e-mail volta, fica numa lista de
>   bloqueio que guarda só um resumo cifrado do endereço, para nunca mais receber o aviso.
> - O dia em que o paciente abriu o link (só a data, sem a hora): para o nutricionista saber se o paciente está abrindo o
>   plano.

Em "Onde os dados ficam", o item do Resend passa a ser:

> - Os e-mails de confirmação e de troca de senha, e os e-mails ao paciente e ao nutricionista (o link do plano, os
>   avisos aceitos e o resumo da adesão), são enviados pelo Resend, sem imagem e sem rastreio de abertura ou de clique. O
>   e-mail do paciente é usado só para isso: nunca para propaganda do MetaNutri e nunca em lista de contatos.

Em "Seus direitos", uma frase no fim:

> Cada e-mail de aviso tem, no rodapé, como deixar de receber, num toque e sem login.

**Pergunta de autorização** do cartão do link, depois de "O acompanhamento registra dado de saúde, que a LGPD trata como
sensível. Cabe a você, nutricionista, obter a autorização do paciente; o MetaNutri apenas armazena os dados.":

> Com o e-mail do paciente na ficha, o MetaNutri manda o link por e-mail quando você pedir e oferece os avisos, que só
> chegam se ele aceitar.

A versão dos textos sobe (`VERSAO_TERMOS = '2026-11-03'`), e o aviso de termos novos aparece como hoje (CA-2286).

## 9. O que o dono faz, na ordem

Os comandos e o SQL vão prontos na seção 10, depois da validação.

## 10. Validação

Preenchida no fim (T40).
