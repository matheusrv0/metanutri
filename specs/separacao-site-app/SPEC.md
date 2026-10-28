# SPEC — Site e app separados, com a sessão que expira

Status: **aprovada pelo dono em 27/10/2026, pelas telas do protótipo, com duas mudanças: texto mínimo (D-526) e a mudança
obrigatória para o app (D-527 e D-528).** O protótipo aprovado mostra a tela Entrar em `app.metanutri.com.br`, a tela
"Entre de novo" e as outras telas da seção 6, com os textos do D-526.

**Fonte:**
- 23/10: "eu quero essa separação, porque hoje eu entro e eu sequer consigo voltar para a tela inicial, que é a landing
  page [...] eu quero que tenha landing page, mas eu quero que eu entrando no painel encaminhe para outro link".
- 27/10: "Não faz sentido eu passar um dia inteiro e já entrar logado na minha conta de novo."
- 27/10, depois de ver as telas: texto mínimo, sem explicar o motivo nem falar em segurança; e "eu quero que
  obrigatoriamente o site vá para o app.metanutri. Não tem essa de utilizar o site pelo link antigo."

**Base:** a pesquisa de arquitetura de 26/10/2026 (`rodada-2610/arquitetura-entrada.md`, pasta do coordenador, fora do
repositório). Ela compara subdomínio, caminho e só trocar a raiz, e recomenda o subdomínio. Já vieram decididas: os
dois endereços (D-500), a landing sempre no site (D-501), os tempos (D-514), a saída por tempo só deste navegador e
enviando antes (D-517), a lista das funções (D-521), a Cloudflare na Política (D-522), as três publicações (D-523) e a
regra da mudança dos dados (D-511 a D-513). As outras são desta spec, inclusive o escopo do "Sair" (D-520).

**Lido antes:** `estilo-spora` (CA-137, CA-148, CA-149, CA-150, CA-730), `site-publico-profissional` (D-320, D-331,
D-332, D-337, D-338, D-339, CA-992, CA-996, CA-1009 a CA-1028, R-323), `dados-na-nuvem` (D-128 a D-133, D-170, D-173,
CA-479, CA-484, CB-125, CB-126 e os DP-11, DP-22, DP-27, DP-39 do plano), `dados-por-conta` (D-120, D-123, D-124),
`missoes-na-nuvem` (D-103 a D-105), `seguranca-lote-1` (D-97, D-99, CA-425, CA-431), `seguranca-lote-4` (D-135,
CA-485), `seguranca-lote-5` (o código do app do administrador), `checkout-proprio` e `cobranca-em-producao` (o
`back_url`; o `SITE_URL` só aparece no README), e o código citado no PLAN.

**Hoje:** um site só, em `metanutri.com.br`, no GitHub Pages. A raiz com sessão abre o Painel (CA-730), e quem está
dentro não volta à landing. A sessão nunca vence sozinha: quem entrou ontem abre o site hoje já dentro da conta. As
funções de cobrança só aceitam chamada de `https://metanutri.com.br` (D-97).

**Termos usados aqui:**
- **Origem:** protocolo mais endereço (`https://metanutri.com.br`). Cada origem tem o próprio armazenamento do navegador
  e a própria sessão. Trocar o app de endereço é trocar de origem.
- **Espaço da conta:** as chaves `metanutri:conta:<id>:…` do navegador, a cópia de trabalho de uma conta (D-120).
- **CORS:** a regra que diz de qual endereço o navegador aceita chamar um servidor.
- **CSP:** a lista de onde a página pode carregar scripts e conteúdo.
- **Service worker:** o script que guarda o app no navegador para abrir rápido.
- **P1, P2, P3:** as três publicações desta spec (D-523). Não confundir com a "publicação 2" da frente de alimentos.

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-500 | **Dois endereços.** O site público fica em `https://metanutri.com.br`, no GitHub Pages, publicado como hoje (Actions, à mão). O app vai para `https://app.metanutri.com.br`, na Cloudflare Pages, ligada a este repositório pelo painel da Cloudflare (integração com o GitHub). Nenhum pacote novo no projeto. O DNS continua no Registro.br: só entra um registro `CNAME` | É o pedido do dono e o que Nutrium e WebDiet fazem. As regras do GitHub Pages não aceitam SaaS comercial nem página que recebe senha ou cartão; o site, que fica lá, é só vitrine. A sessão e os dados de saúde ficam numa origem onde só entra o código do app |
| D-501 | **O site abre sempre a landing, com ou sem sessão.** Ele não lê nem guarda sessão. "Entrar" leva à raiz do app; "Começar grátis" e os botões dos planos levam a Criar conta, no app, com o plano e o ciclo escolhidos. "Ir para o painel" some do site. Com dado que só existe no endereço antigo, todos passam antes pela tela "Continuar" (D-527) | "Eu entro e sequer consigo voltar para a tela inicial." O site não tem como saber a sessão de outro endereço; o app, com sessão, abre direto no Painel |
| D-502 | **Dois pacotes do mesmo código.** O do site tem a landing, Preços, Termos, Privacidade e Fontes, pré-desenhadas como hoje (D-331), sem Supabase, Mercado Pago, Turnstile nem o motor de sincronia. O do app tem todo o resto. Cada um tem a própria CSP; a do site só deixa carregar do próprio site | Um script de marketing futuro no site nunca chega à sessão nem aos dados. O site fica pequeno e abre rápido |
| D-503 | **No site, cada página é um endereço próprio e fica nele:** `/`, `/precos/`, `/termos/`, `/privacidade/`, `/fontes/`. O endereço não vira mais `/#/precos` (fim do R-323). Os endereços antigos `#/inicio`, `#/precos`, `#/precos/<plano>`, `#/termos`, `#/privacidade` e `#/fontes` levam à página própria (o plano vai junto, em destaque). O site não tem service worker: a página vem sempre da rede, e a recarga da vitrine (D-320) deixa de existir | Sem o app dentro, o site não precisa de rota por `#`. Página própria é o que o buscador e a prévia de link leem |
| D-504 | **No app, a raiz sem sessão abre Entrar**, com o link "Conheça o MetaNutri" para o site; com sessão, abre o Painel. O CA-730 passa a valer só no site. `#/inicio`, `#/precos[/<plano>]`, `#/termos`, `#/privacidade` e `#/fontes` no app levam à página do site. Criar conta com sessão leva aonde o plano levaria quem já tem conta (checkout, Comprovar matrícula ou Painel), em vez de mostrar o cadastro. Depois de "Sair", Entrar do app | Quem digita `app.` quer entrar. O botão de plano do site não sabe se a pessoa tem conta; o app sabe |
| D-505 | **Links do app para Termos, Privacidade e Fontes abrem a página do site em aba nova**, inclusive na caixa de aceite do cadastro: a área de trabalho e o formulário ficam abertos. "Ver preços" e o aviso de limite (CA-177) abrem Preços do site na mesma aba, com o plano seguinte em destaque | Ler um documento não deve tirar a pessoa do trabalho. Ir a Preços é o caminho da compra, que volta ao app |
| D-506 | **O app não aparece em buscador.** `noindex` na página e no cabeçalho; sem `robots.txt`, `sitemap.xml` nem `llms.txt` próprios (o `robots.txt` não pode bloquear, senão o buscador não lê o `noindex`). Título "MetaNutri" e prévia de link com "MetaNutri" e o ícone, sem texto de venda. O SEO do site não muda | Hoje a prévia do link do paciente no WhatsApp mostra o texto de venda da landing |
| D-507 | **Cabeçalhos de segurança no app** (a Cloudflare deixa mandar): a CSP também em cabeçalho, com `frame-ancestors 'none'`; `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Strict-Transport-Security: max-age=31536000`; `X-Robots-Tag: noindex`. A `<meta>` da CSP continua (D-135). **Sem `Cross-Origin-Opener-Policy` até a P3**: ele cortaria a ligação entre as abas da mudança (D-512) | A `<meta>` não cobre moldura (`frame-ancestors`) nem os outros cabeçalhos; o GitHub Pages não deixava mandar |
| D-508 | **Aplicativo instalado.** O app tem manifesto e service worker próprios no endereço novo. Quem instalou o ícone do endereço antigo instala de novo (a identidade do aplicativo instalado é presa à origem). O site não é instalável; o service worker que o app velho deixou no navegador se desliga sozinho, apaga o que guardava e recarrega a página uma vez | Não há como mover um aplicativo instalado de origem |
| D-509 | **Endereços da Cloudflare** (`metanutri.pages.dev` e prévias `*.metanutri.pages.dev`) levam a `https://app.metanutri.com.br` por uma regra da Cloudflare; como reforço, o app aberto num `*.pages.dev` vai para o endereço oficial com o mesmo `#`. Prévias de outros ramos ficam desligadas. *O projeto se chama `metanutri` (criado assim pelo dono em 27/10/2026; o plano previa `metanutri-app`).* | O endereço da Cloudflare fica aberto e não está na lista das funções nem do Turnstile |
| D-510 | **Repasses do site para o app.** O link de paciente antigo (`metanutri.com.br/#/missoes/<token>`) vai para o app antes de desenhar qualquer coisa, sempre e para sempre. Os endereços antigos de tela de trabalho (`#/painel`, `#/caso/…`, `#/pacientes`…), a volta de e-mail ou pagamento (`?volta=…`) e o ícone instalado do endereço antigo vão para o app com o mesmo `#` e a mesma `?`, na mesma aba, depois da limpeza do D-511; com dado que só existe ali, passam antes pela tela "Continuar" (D-527). O link de paciente nunca para | Os links já enviados aos pacientes e os favoritos continuam funcionando |
| D-511 | **Limpeza do endereço antigo, em toda visita ao site.** (a) Toda sessão guardada (`sb-…-auth-token`) é apagada: o site não a usa, e ela não pode ficar onde roda só código de vitrine. (b) O espaço de cada conta **em dia** é apagado, porque a nuvem tem tudo. **Em dia** quer dizer, no espaço da conta: existe a situação da nuvem; as mudanças não passam das salvas; a cópia não está parcial; não há valor retido; nenhum link de paciente está pendente; e não há dado de antes das contas cujo dono seja ela ou esteja vazio. O que não está em dia fica, inteiro | Minimização (LGPD, art. 6º, III) sem perder dado. Valor retido e link pendente podem ser a única cópia de algo (DP-39, CB-108) |
| D-512 | **Mudança do que só existe no endereço antigo.** ~~Quando um endereço de tela do app (D-510) ou o botão "Entrar" acha dado que não está em dia, o site mostra a tela "Continuar" (texto no D-519) em vez de levar a pessoa.~~ Quando um caminho do site para o app (D-527) acha dado que não está em dia, o site mostra a tela "Continuar" (texto no D-526) em vez de levar a pessoa; a tela só tem o botão "Continuar". *Mudou em 27/10/2026 pelo D-527.* "Continuar" abre o app em aba nova, em `#/mudanca/<código>` (código aleatório). Depois que a pessoa entra, o app pede à aba do site os dados da conta dela. O site responde só com o espaço dessa conta, mais o dado de antes das contas quando o dono é ela ou não tem dono, e o tema. As mensagens só valem entre os dois endereços oficiais e com o código certo. Sem resposta em 10 s, o app segue com a nuvem e nada é apagado no site. Quando o app confirma (D-513), o site apaga aquele espaço e diz "Pronto. Pode fechar esta aba." | Por aba aberta pelo clique, e não por moldura escondida: o Safari separa o armazenamento de moldura entre endereços, e o service worker antigo responderia à moldura com o app velho. Num computador dividido, uma conta nunca recebe os dados de outra |
| D-513 | **Como o app recebe.** Espaço da conta vazio no app: grava os dados como vieram. Espaço **em dia** (a pessoa já usou o app e tudo está na nuvem): troca pelos que vieram; nada se perde, porque o que estava ali está na nuvem. Espaço com algo que ainda não subiu: não recebe agora, abre a conta normalmente, e a mudança fica para a próxima visita ao site. Depois de gravar, a conta abre e o motor de sincronia junta com a nuvem pelas regras de sempre (D-132, D-133, D-170, D-173 e D-123): para ele, o navegador novo é um aparelho que ficou sem internet. O app confirma só quando a nuvem tem tudo: dados abertos, nada pendente, nada salvando, sem trava, nenhum link pendente, nenhuma migração incompleta. Se não couber no navegador, nada fica gravado e nada é apagado no site | Nenhuma regra nova de junção: a que já existe foi revisada em quatro rodadas. Repetir a mudança é inofensivo, porque a junção é item por item |
| D-514 | **Tempo da sessão.** Nutricionista e estudante: a sessão sai sozinha depois de **30 minutos sem uso** e, no máximo, **12 horas depois de entrar**. Conta de administrador (com ou sem o código do app já confirmado): **15 minutos** e **8 horas**. Vale com o app aberto, numa aba esquecida, com o computador dormindo e ao reabrir o navegador. Sem Supabase Pro: quem mede é o app | O pedido do dono. NIST SP 800-63B-4 e OWASP (15 a 30 min sem uso para baixo risco; 4 a 8 h de limite no expediente). Dado de saúde é sensível (LGPD, art. 5º, II, e art. 46). 12 h nunca atravessa a noite. O administrador vê as contas inteiras e os comprovantes |
| D-515 | **O que é uso.** Tecla, clique, toque e rolagem, em qualquer aba do app no mesmo navegador. Mexer o mouse não conta. A marca de uso fica no navegador e as abas dividem. A hora da entrada vem do servidor (o token da sessão), não do relógio do computador: relógio errado não muda a hora de sair. Sem marca de uso (sessão aberta antes da P1), vale a hora da entrada | Mouse esbarrado manteria a sessão viva. Um relógio adiantado faria sair cedo demais |
| D-516 | **Avisos antes de sair.** Aos 28 minutos sem uso (administrador: 13), uma janela "Você ainda está aí?" com "Continuar"; qualquer uso fecha e zera. Dez minutos antes do limite total, uma faixa no topo da área de trabalho, no fluxo da página (sem cobrir nada), com a hora em que a sessão termina. O limite total não se estende | Ninguém é pego de surpresa no meio de uma consulta |
| D-517 | **Saída por tempo, nesta ordem.** (1) A tela fica coberta por "Encerrando a sessão…", para ninguém editar no meio. (2) O que falta vai para a nuvem (a cópia de trabalho e os links pendentes), com até 10 s. (3) Se a nuvem tem tudo: o motor para, o espaço da conta é apagado (como no "Sair", D-131) e a sessão **deste navegador** acaba. (4) Se não deu (sem internet, trava, erro): a sessão deste navegador acaba, **mas o espaço da conta fica**; a mesma conta, ao entrar de novo, envia o que ficou. (5) A página vai para Entrar, com "Entre de novo" e ~~a frase do motivo (D-519)~~ o aviso do D-526. As outras abas da conta param e mostram o mesmo; só uma faz a saída. Aqui, "em dia" segue o "Sair": valor retido não conta (D-131 já o apaga) | É a exceção do D-131: o "Sair" é escolha da pessoa e pergunta antes (CA-479); a saída por tempo não pergunta, então guarda o que não subiu |
| D-518 | **Ao abrir com a sessão vencida** (navegador reaberto, aba que volta depois do limite), a saída acontece antes de a área de trabalho aparecer, sem tentar enviar nada: em dia, o espaço é apagado; com pendência, fica. A pessoa vê "Entre de novo" | A área de trabalho nunca aparece, nem por um quadro, com uma sessão vencida |
| D-519 | ~~**Textos.** Título de Entrar depois da saída: "Entre de novo". Sem uso, em dia: "Você saiu por segurança. Foram 30 minutos sem usar o MetaNutri. Tudo o que você fez até as 15:42 já está salvo na nuvem." Limite total, em dia: "Você saiu por segurança. Foram 12 horas desde que você entrou. Tudo o que você fez até as 15:42 já está salvo na nuvem." Com pendência, a primeira e a segunda frase seguidas de "Algumas alterações ainda não foram para a nuvem e continuam guardadas neste navegador. Entre de novo para enviá-las." Administrador: "15 minutos" e "8 horas". A hora é a do último uso; noutro dia, "até ontem às 15:42" ou "até 25/10 às 15:42". Aviso: "Você ainda está aí?" / "Por segurança, a sessão termina em 2 minutos sem uso." / "Continuar". Faixa: "Por segurança, a sessão termina às 21:42. Depois, é só entrar de novo." Capa: "Encerrando a sessão…". Site, dado só ali: "O MetaNutri agora abre em app.metanutri.com.br" / "Este navegador tem dados que ainda não estão na nuvem. Clique em Continuar e entre na sua conta na aba que abrir: eles vão junto." / "Continuar". Depois do clique: "Entre na sua conta na aba que abriu. Deixe esta aba aberta até terminar." Fim: "Pronto. Pode fechar esta aba." Janela bloqueada: "O navegador bloqueou a aba nova. Permita abrir janelas deste site e clique em Continuar de novo." App recebendo: "Trazendo seus dados do endereço antigo…". Sem espaço: "Este navegador não tem espaço para trazer os dados do endereço antigo. Eles continuam guardados lá." Ícone antigo: "O MetaNutri agora abre em app.metanutri.com.br. Para o ícone abrir direto aqui, instale o MetaNutri de novo."~~ **Substituído pelo D-526** (27/10/2026): texto mínimo, sem o motivo e sem "por segurança" | ~~Os da tela "Entre de novo" são os do protótipo aprovado. Os outros seguem as regras de texto (sem tagline, uma informação uma vez)~~ |
| D-520 | **"Sair" (o botão) passa a encerrar só a sessão deste navegador** (`local`), como a saída por tempo. O resto do "Sair" continua (D-131, CA-479). "Sair de todos os aparelhos" fica fora | Coerência com a saída por tempo. A nutricionista usa computador e celular ao mesmo tempo: sair no computador do consultório não pode derrubar o celular no meio de uma consulta. O encerramento local também invalida no servidor a sessão deste navegador |
| D-521 | **Funções do servidor com uma lista de endereços.** `assinar`, `gerenciar-assinatura` e `excluir-conta` dão permissão ao endereço do pedido (`Origin`) só se ele está na lista, e sempre mandam `Vary: Origin`. ~~P1 e P2: `https://app.metanutri.com.br` e `https://metanutri.com.br`. P3: só o app.~~ P1, e a P2 até o site dela ir ao ar: `https://app.metanutri.com.br` e `https://metanutri.com.br` (o app ainda roda no endereço antigo até a P2). P3, logo depois do site da P2 (D-528): só o app. Outro endereço não recebe permissão, nem `*` (CA-425 continua). O `SITE_URL` (o `back_url` da assinatura) passa a `https://app.metanutri.com.br/`. O aviso do Mercado Pago (webhook) não muda | Sem a lista, o checkout, o cancelamento e a exclusão de conta quebram no endereço novo. Com os dois endereços desde a P1, o app velho que ainda rodar no endereço antigo continua funcionando |
| D-522 | **Política de privacidade:** a Cloudflare entra como operadora (entrega o app e recebe dados técnicos, como o IP); o GitHub também (entrega o site público e recebe o IP de quem visita); o app fica em `app.metanutri.com.br`; a sessão sai sozinha depois de 30 minutos sem uso e 12 horas depois da entrada. A versão dos termos passa a ser o dia em que a P2 vai ao ar | Quem recebe dado de quem usa precisa estar na Política. O GitHub já entregava o site e não constava |
| D-523 | **Três publicações, nesta ordem.** **P1** (no endereço de hoje): primeiro as funções com a lista (D-521), depois o site com a sessão que expira (D-514 a D-520). **P2:** primeiro o app no endereço novo, testado; depois o site com os repasses, a limpeza e a mudança (D-501 a D-513, D-522). **P3**, ~~90 dias depois de o site da P2 ir ao ar~~ logo depois de o site da P2 ir ao ar (D-528): o endereço antigo sai da lista das funções e das *Redirect URLs* do Supabase. O repasse do link de paciente e a mudança dos dados ficam no site para sempre | Cada publicação funciona sozinha e com a anterior. O site da P2 só sai com o app já de pé, senão os repasses levariam a um endereço vazio |
| D-524 | **Ícone antigo.** O site, aberto como aplicativo instalado, leva ao app com uma marca no endereço; o app mostra uma vez o aviso do ~~D-519~~ D-526 e tira a marca do endereço. Com dado que só existe no endereço antigo, a marca vai na aba que o "Continuar" abre (D-527) | Sem o aviso, a pessoa continua abrindo pelo ícone velho, que passa pelo site toda vez |
| D-525 | **Dado esquecido no endereço antigo fica** até a pessoa voltar ao site e levar. Como todo caminho do site para o app passa por "Continuar" quando há dado ali (D-527), ela leva na primeira vez que tentar entrar pelo endereço antigo. Não há prazo para apagar à força | Apagar perderia a única cópia. O prazo é decisão do dono (ver PLAN, pontos do dono) |
| D-526 | **Texto mínimo** (27/10/2026, aprovando as telas; substitui o D-519). Nenhum texto explica o motivo da saída nem fala em segurança. Entrar depois da saída: título "Entre de novo"; aviso "Sua sessão terminou. Tudo até as 15:42 está salvo.", o mesmo para os 30 minutos sem uso, as 12 horas e o administrador (15 minutos e 8 horas). A hora é a do último uso; noutro dia, "até ontem às 15:42" ou "até 25/10 às 15:42". Com pendência: "Sua sessão terminou. Entre para enviar o que ficou neste navegador."; o botão continua "Entrar". A tela não tem nota sobre as 12 horas nem sobre o e-mail lembrado. Aviso: "Você ainda está aí?" / "A sessão termina em 2 minutos." / "Continuar". Faixa: "A sessão termina às 21:42." Capa: "Encerrando a sessão…". Site, com dado que só existe ali: título "O MetaNutri mudou para app.metanutri.com.br"; texto "Clique em Continuar e entre na sua conta. Os dados deste navegador vão junto."; botão "Continuar". Depois do clique: "Entre na sua conta na aba que abriu. Deixe esta aba aberta." Fim: "Pronto. Pode fechar esta aba." Janela bloqueada: "O navegador bloqueou a aba nova. Permita janelas deste site e clique em Continuar." App recebendo: "Trazendo seus dados…". Sem espaço: título "Sem espaço neste navegador"; texto "Libere espaço e abra o MetaNutri de novo. Nada foi perdido." Ícone antigo: "Novo endereço: app.metanutri.com.br. Instale o MetaNutri de novo para o ícone abrir direto aqui." / "Entendi" | O dono aprovou as telas e pediu texto mínimo, sem "por segurança" |
| D-527 | **A mudança para `app.metanutri.com.br` é obrigatória.** A partir da P2, todo endereço de tela do app no site (D-510), a volta `?volta=…`, os botões "Entrar", "Começar grátis" e os dos planos (Criar conta) e o ícone antigo levam ao app. A única parada é a tela "Continuar", quando há dado que só existe no endereço antigo (D-511): o navegador só abre a aba nova com um clique. Ela não oferece outra saída, só "Continuar". A aba nova abre em `#/mudanca/<código>` e, no fim, o Painel. O link de paciente vai sempre direto (D-510, CB-512). A mecânica do D-512 (aba aberta, não moldura escondida) continua: a regra nova não pede outra | "Eu quero que obrigatoriamente o site vá para o app.metanutri. Não tem essa de utilizar o site pelo link antigo." O clique é a única coisa que o navegador exige para abrir a aba nova sem bloqueio |
| D-528 | **A P3 não espera 90 dias.** Assim que o site da P2 vai ao ar, o endereço antigo sai da lista das funções (D-521) e das *Redirect URLs* do Supabase, num passo do dono logo depois do site da P2. Na P1, a lista continua com os dois endereços | Depois do site da P2, ninguém usa o app pelo endereço antigo (D-527). O site da P2 não chama o Supabase nem as funções (D-502). O app velho que o service worker ainda mostra por segundos (CB-515) sincroniza direto com o banco, sem as funções |

## 2. Critérios de aceite

Cada critério diz em qual publicação entra.

### O site (`metanutri.com.br`)

- **CA-1400** · Dado `metanutri.com.br/` num navegador sem nada guardado, então abre a landing. *(P2)*
- **CA-1401** · Dado `metanutri.com.br/` num navegador com a sessão do app antigo guardada, então abre a landing (nunca o Painel), e a sessão guardada é apagada. *(P2)*
- **CA-1402** · Dado o topo e o rodapé do site, num navegador sem dado que só exista ali, então "Entrar" leva a `https://app.metanutri.com.br/` e "Começar grátis" a `https://app.metanutri.com.br/#/criar-conta`; "Ir para o painel" não existe no site. *(P2)*
- **CA-1403** · Dado Preços no site, num navegador sem dado que só exista ali, quando a pessoa escolhe Solo anual, então vai para `https://app.metanutri.com.br/#/criar-conta/solo/anual`; Estudante leva a `#/criar-conta/estudante`, Free a `#/criar-conta`; a Clínica continua sendo o contato por e-mail. *(P2)*
- **CA-1404** · Dado `/precos/`, `/termos/`, `/privacidade/` ou `/fontes/`, e o menu ou o rodapé usados para ir de uma página a outra, então o endereço continua o da página (sem `#/`) e o conteúdo é o dela. *(P2)*
- **CA-1405** · Dado `metanutri.com.br/#/precos`, `#/precos/pro`, `#/termos`, `#/privacidade`, `#/fontes` ou `#/inicio`, então abre a página própria (`/precos/`… e `/` para `#/inicio`), e em `#/precos/pro` o Pro fica em destaque. *(P2)*
- **CA-1406** · Dado o pacote do site depois do build, então ele não contém o endereço do Supabase, o SDK do Mercado Pago nem o script do Turnstile; e a CSP do site só permite o próprio site (sem Supabase, Mercado Pago, Cloudflare nem Open Food Facts). *(P2)*
- **CA-1407** · Dado o site, então ele não registra service worker nem tem manifesto; dado um navegador com o service worker do app antigo, quando abre o site, então esse service worker se desliga, o que ele guardava sai e a página recarrega uma vez, já como site. *(P2)*
- **CA-1408** · Dado o build do site, então título, descrição, canônico, Open Graph, JSON-LD, `robots.txt`, `sitemap.xml`, `llms.txt` e as páginas pré-desenhadas continuam como pedem CA-1009 a CA-1014, CA-1018 e CA-1019; e o `llms.txt` aponta "Entrar" para `https://app.metanutri.com.br/`. *(P2)*

### O app (`app.metanutri.com.br`)

- **CA-1409** · Dado `app.metanutri.com.br/` sem sessão, então abre Entrar, com "Conheça o MetaNutri" levando a `https://metanutri.com.br/`. *(P2)*
- **CA-1410** · Dado `app.metanutri.com.br/` com sessão dentro dos limites, então abre o Painel. *(P2)*
- **CA-1411** · Dado uma tela de trabalho do app aberta sem sessão (`#/pacientes`), quando a pessoa entra, então vai para essa tela (CA-137 e CA-148 continuam). *(P2)*
- **CA-1412** · Dado `#/inicio`, `#/precos`, `#/precos/<plano>`, `#/termos`, `#/privacidade` ou `#/fontes` no app, então a página do site abre na mesma aba, com o plano em destaque quando houver. *(P2)*
- **CA-1413** · Dado alguém com sessão, quando abre `#/criar-conta/solo/anual` no app, então vai ao checkout do Solo anual; `#/criar-conta/estudante` leva a Comprovar matrícula; `#/criar-conta` leva ao Painel. *(P2)*
- **CA-1414** · Dado o app, quando a pessoa clica em Fontes da base, Termos de uso ou Política de privacidade (inclusive na caixa de aceite do cadastro), então a página do site abre em aba nova e o app fica na aba dele; dado "Ver preços" ou o aviso de limite, então Preços do site abre na mesma aba, com o plano seguinte em destaque. *(P2)*
- **CA-1415** · Dado "Sair" no app, então a pessoa cai em Entrar do app, e não na landing. *(P2)*
- **CA-1416** · Dado um link de paciente criado no app, então o endereço é `https://app.metanutri.com.br/#/missoes/<token>`, e ele abre a tela do paciente sem conta (CB-126 continua). *(P2)*
- **CA-1417** · Dado o app aberto em `metanutri.pages.dev` ou em `<algo>.metanutri.pages.dev`, então vai para `https://app.metanutri.com.br/` com o mesmo `#`. *(P2)*
- **CA-1418** · Dado o `index.html` do app, então ele tem `<meta name="robots" content="noindex">`, o título "MetaNutri", nenhuma descrição de venda (nem em `og:*`) e `og:image` com o ícone; e a pasta do app não tem `robots.txt`, `sitemap.xml` nem `llms.txt`. *(P2)*
- **CA-1419** · Dado o app publicado, então as respostas trazem `Content-Security-Policy` (a regra da `<meta>` mais `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=31536000` e `X-Robots-Tag: noindex`, e não trazem `Cross-Origin-Opener-Policy`. *(P2)*
- **CA-1420** · Dado o app aberto dentro de uma moldura de outro site, então só aparece "Abra o MetaNutri direto no navegador." com o link `https://app.metanutri.com.br/` (CA-431 continua). *(P2)*
- **CA-1421** · Dado o app, então ele é instalável no endereço novo (manifesto e service worker próprios), e o aviso de versão nova (D-172) continua na área de trabalho. *(P2)*
- **CA-1422** · Dado o checkout no app, então os campos do cartão e o antifraude carregam sem violar a CSP (CA-485 continua; `npm run test:csp` roda no build do app). *(P2)*

### Os repasses (site → app)

- **CA-1423** · Dado `metanutri.com.br/#/missoes/<token>`, então a página vai para `https://app.metanutri.com.br/#/missoes/<token>` antes de desenhar qualquer coisa do site, mesmo com dados guardados no navegador. *(P2)*
- **CA-1424** · Dado `metanutri.com.br/#/painel` (ou outra tela de trabalho, como `#/caso/<id>/plano`) num navegador sem dado que só exista ali, então vai para o app com o mesmo `#`, na mesma aba, sem mostrar a landing. *(P2)*
- **CA-1425** · Dado `metanutri.com.br/?volta=pagamento` (ou `confirmacao`, `recuperacao`, com o `#` que vier), num navegador sem dado que só exista ali, então vai para o app com a mesma consulta e o mesmo `#`. *(P2)*
- **CA-1426** · Dado o site aberto como aplicativo instalado (ícone do endereço antigo), então vai para o app, e o app mostra uma vez o aviso do ícone antigo (D-524), com os textos do D-526; com dado que só existe ali, a aba que o "Continuar" abre também leva a marca. *(P2)*

### A limpeza e a mudança dos dados

- **CA-1427** · Dado uma conta em dia guardada no navegador (D-511), quando qualquer página do site abre, então o espaço dela é apagado. *(P2)*
- **CA-1428** · Dado uma conta que não está em dia por um dos motivos do D-511 (mudança não enviada, cópia parcial, valor retido, link pendente, dado de antes das contas dela, ou sem a situação da nuvem), quando o site abre, então o espaço dela fica inteiro. Um teste por motivo. *(P2)*
- **CA-1429** · Dado dado que só existe no endereço antigo, quando a pessoa abre um endereço de tela do app no site ou uma volta `?volta=…`, clica em "Entrar", "Começar grátis" ou num plano, ou abre o ícone antigo, então vê a tela "Continuar" com os textos do D-526, só com o botão "Continuar", e não é levada sozinha (D-527). *(P2)*
- **CA-1430** · Dado "Continuar", então o app abre em aba nova em `https://app.metanutri.com.br/#/mudanca/<código>`, e a aba do site mostra "Entre na sua conta na aba que abriu. Deixe esta aba aberta." *(P2)*
- **CA-1431** · Dado o app em `#/mudanca/<código>`, quando a pessoa entra, então o app pede os dados da conta à aba do site antes de abrir a área de trabalho e mostra "Trazendo seus dados…"; no fim, abre o Painel. *(P2)*
- **CA-1432** · Dado o pedido do app, então o site responde só com o espaço da conta pedida, mais o dado de antes das contas quando o dono é ela ou não tem dono, e o tema; nada de outra conta. *(P2)*
- **CA-1433** · Dado o espaço da conta vazio no app, quando os dados chegam, então são gravados como vieram e a conta abre; o que não estava na nuvem sobe e nada some (CA-480 e CA-481 continuam). *(P2)*
- **CA-1434** · Dado o espaço da conta em dia no app (ela já usou o app), quando os dados chegam, então entram no lugar e a conta abre; no fim, a nuvem tem o que foi feito no app e o que veio do endereço antigo, item por item, com a mudança mais nova de cada item. *(P2)*
- **CA-1435** · Dado o espaço da conta no app com algo que ainda não subiu, quando os dados chegam, então o app não os grava, abre a conta normalmente e não confirma; o site guarda tudo e mostra "Continuar" de novo na próxima vez que a pessoa for do site ao app. *(P2)*
- **CA-1436** · Dado os dados recebidos e abertos, quando a nuvem tem tudo (D-513), então o app confirma, o site apaga aquele espaço e mostra "Pronto. Pode fechar esta aba." *(P2)*
- **CA-1437** · Dado o app em `#/mudanca/<código>` sem a aba do site (fechada ou que não responde), quando passam 10 s depois da entrada, então o app abre a conta com os dados da nuvem e nada é apagado no site. *(P2)*
- **CA-1438** · Dado uma mensagem de outro endereço, com o código errado, de outra conta ou de tipo desconhecido, então o site e o app a ignoram: não respondem, não gravam, não apagam. *(P2)*
- **CA-1439** · Dado um valor retido e um link pendente nos dados que vieram, então o valor retido continua retido (não sobe, D-173) e o link pendente é enviado de novo. *(P2)*

### A sessão

- **CA-1440** · Dado uma nutricionista dentro do app, quando passam 30 minutos sem uso, então ela sai (D-517). *(P1)*
- **CA-1441** · Dado uma conta de administrador, quando passam 15 minutos sem uso, então ela sai. *(P1)*
- **CA-1442** · Dado 28 minutos sem uso (administrador: 13), então aparece "Você ainda está aí?" com "A sessão termina em 2 minutos." e "Continuar"; quando a pessoa clica ou usa o teclado, então a janela fecha e a contagem recomeça. *(P1)*
- **CA-1443** · Dado uma nutricionista usando o app sem parar, quando chegam 12 horas desde a entrada, então ela sai mesmo assim; administrador: 8 horas. *(P1)*
- **CA-1444** · Dado que faltam 10 minutos para o limite total, então a faixa "A sessão termina às 21:42." (D-526) aparece no topo da área de trabalho, sem cobrir nada e sem botão de estender. *(P1)*
- **CA-1445** · Dado duas abas da mesma conta, uma em uso e outra parada, então nenhuma sai enquanto houver uso em alguma; quando a saída acontece, então as duas mostram "Entre de novo", e só uma faz a saída. *(P1)*
- **CA-1446** · Dado tecla, clique, toque ou rolagem, então conta como uso; dado só mexer o mouse, então não conta. *(P1)*
- **CA-1447** · Dado a saída por tempo com a nuvem em dia, então a tela fica coberta por "Encerrando a sessão…", o espaço da conta é apagado, a sessão deste navegador acaba e Entrar mostra "Entre de novo" com "Sua sessão terminou. Tudo até as HH:MM está salvo." *(P1)*
- **CA-1448** · Dado a saída por tempo com algo que não subiu em 10 s (sem internet, por exemplo), então a sessão deste navegador acaba mesmo sem resposta do servidor, o espaço da conta fica e Entrar mostra "Entre de novo" com "Sua sessão terminou. Entre para enviar o que ficou neste navegador." *(P1)*
- **CA-1449** · Dado o CA-1448, quando a mesma conta entra de novo, então o que tinha ficado sobe para a nuvem. *(P1)*
- **CA-1450** · Dado o navegador fechado com a sessão aberta, quando ele reabre depois de 30 minutos (administrador: 15) ou depois do limite total, então aparece "Entre de novo", e a área de trabalho não aparece antes em nenhum quadro. *(P1)*
- **CA-1451** · Dado o navegador reaberto antes dos 30 minutos e dentro do limite total, então a área de trabalho abre direto, como hoje. *(P1)*
- **CA-1452** · Dado a saída por tempo num aparelho, então a sessão da mesma conta em outro aparelho continua. *(P1)*
- **CA-1453** · Dado "Sair" num aparelho, então a sessão encerrada é só a deste navegador (`local`), e a da mesma conta em outro aparelho continua; o resto do "Sair" segue igual (CA-478, CA-479). *(P1)*
- **CA-1454** · Dado o relógio do computador adiantado ou atrasado em horas, então a saída pelo limite total acontece 12 horas depois da entrada pela hora do servidor, com até 1 minuto de diferença. *(P1)*
- **CA-1455** · Dado o link do paciente aberto no navegador onde a nutricionista tem sessão, então a tela do paciente nunca é coberta pelo aviso, pela faixa nem pela capa da saída. *(P1)*
- **CA-1456** · Dado o app sem servidor de conta (modo local, CA-150), então não há tempo de sessão. *(P1)*
- **CA-1457** · Dado o administrador que saiu por tempo, quando entra de novo, então Negócio e Aprovações pedem o código do app autenticador outra vez. *(P1)*
- **CA-1458** · Dado o computador que dormiu com o app aberto, quando ele acorda depois do prazo, então a saída acontece logo que a aba volta a ficar visível ou ganha foco, antes de deixar editar. *(P1)*

### Servidor e textos

- **CA-1459** · Dado uma chamada a `assinar`, `gerenciar-assinatura` ou `excluir-conta` vinda de `https://app.metanutri.com.br` ou de `https://metanutri.com.br`, então a resposta e a prévia (`OPTIONS`) trazem `Access-Control-Allow-Origin` com esse mesmo endereço e `Vary: Origin`; vinda de outro endereço, ou sem `Origin`, então não trazem permissão (nem `*`). O webhook continua sem CORS. *(P1)*
- **CA-1460** · Dado a P3 (logo depois do site da P2, D-528), então só `https://app.metanutri.com.br` recebe permissão das três funções. *(P3)*
- **CA-1461** · Dado a função `assinar` sem o segredo `SITE_URL`, então o `back_url` mandado à operadora é `https://app.metanutri.com.br/`. *(P1)*
- **CA-1462** · Dado a Política de privacidade, então ela diz que o app é entregue pela Cloudflare e o site pelo GitHub (os dois recebem dados técnicos, como o IP), que o app fica em `app.metanutri.com.br` e que a sessão sai sozinha depois de 30 minutos sem uso e 12 horas depois da entrada; e a versão dos termos é o dia da P2. *(P2)*
- **CA-1463** · Dado o cadastro, o reenvio do código e "Esqueci a senha" feitos no app, então o endereço de volta pedido ao Supabase é o do app (`https://app.metanutri.com.br/?volta=…`). *(P2)*

## 3. Casos de borda

- **CB-500** · **Erro:** armazenamento bloqueado no site (Safari privado antigo, dados de site desligados): o site não lê nem apaga nada, os repasses acontecem e "Continuar" nunca aparece.
- **CB-501** · **Erro:** o navegador não tem espaço para gravar os dados recebidos (DP-23): o que chegou a ser gravado sai, a conta abre com a nuvem, o app não confirma e mostra o texto de "sem espaço" do D-526. O site guarda tudo.
- **CB-502** · **Erro:** dados recebidos ilegíveis (formato desconhecido, texto quebrado): o app não grava nem confirma; o site guarda tudo.
- **CB-503** · **Vazio:** navegador sem nada guardado: nada de mudança aparece, e os repasses são diretos.
- **CB-504** · **Vazio:** o site recebe o pedido de uma conta que não tem espaço ali: responde que não há nada; o app abre a conta normalmente; o site não apaga nada.
- **CB-505** · **Sem internet ao receber:** o app grava e mostra "Sem internet. Conecte-se para abrir seus dados." (CA-484); só confirma quando a nuvem tiver tudo. Se a aba do site fechar antes, nada é apagado lá; na próxima vez que a pessoa for do site ao app, "Continuar" aparece de novo, e a mudança repetida é inofensiva (D-513).
- **CB-506** · **Sem internet na saída por tempo:** CA-1448. A sessão sai deste navegador mesmo sem o servidor responder; se a biblioteca do Supabase não conseguir apagá-la sozinha, o app apaga a chave dela.
- **CB-507** · **Duas abas do site** com "Continuar" (ou duas abas do app pedindo): a primeira confirmação apaga; a segunda acha o espaço já apagado e o app abre normalmente.
- **CB-508** · **Duas abas do app** com o aviso dos 28 minutos: usar qualquer uma fecha o aviso nas duas.
- **CB-509** · **Sessão expirando no meio de uma edição:** o que já está na cópia de trabalho sobe antes de sair (D-517); uma gravação a caminho ("Salvando…") é esperada dentro dos 10 s; o texto digitado numa janela ainda não confirmada (um formulário com "Salvar" não clicado) se perde. O aviso dos 28 minutos existe para isso.
- **CB-510** · **Saída por tempo fora da área de trabalho** (checkout, Conta, Comprovar matrícula): sai do mesmo jeito. Nada é cobrado sem a pessoa confirmar; um pedido de assinatura que já saiu continua no servidor, e a volta lê a assinatura da nuvem. Os links pendentes só são reenviados com a área de trabalho montada; fora dela, contam como pendência (o espaço fica).
- **CB-511** · **Link de paciente antigo pelo endereço do GitHub** (`matheusrv0.github.io/metanutri/#/missoes/<token>`): o GitHub leva a `metanutri.com.br`, e de lá vai ao app (CA-1423).
- **CB-512** · **Link de paciente antigo num navegador com dados únicos da nutricionista:** vai direto ao app; os dados ficam, e "Continuar" aparece na próxima vez que ela for do site ao app.
- **CB-513** · **Checkout do Mercado Pago voltando para o endereço certo:** o pagamento é feito dentro do app, com o cartão; o `back_url` (o app, D-521) não leva ninguém de volta neste fluxo. Uma volta antiga (`metanutri.com.br/?volta=pagamento`) vai ao app (CA-1425), que lê a assinatura na nuvem. O aviso do Mercado Pago (webhook) vai ao Supabase e não depende do endereço.
- **CB-514** · **Volta de e-mail antiga com `?code=`:** o código de troca foi pedido no endereço antigo e não vale no novo; a pessoa cai em Entrar e entra com a senha, ou pede um código novo. Os e-mails de hoje só trazem código (D-89): isso só acontece com um link guardado de antes.
- **CB-515** · **Primeira visita depois da P2 com o service worker velho:** o app velho aparece por alguns segundos, sincroniza normalmente (~~as funções aceitam os dois endereços~~ a sincronia vai direto ao banco, sem as funções, D-528) e a página recarrega como site; texto numa janela não confirmada nesse instante se perde.
- **CB-516** · **Último uso em outro dia:** "Sua sessão terminou. Tudo até ontem às 15:42 está salvo." ou "Tudo até 25/10 às 15:42 está salvo." (D-526).
- **CB-517** · **Sessão sem marca de uso** (aberta antes da P1, ou marca apagada): vale a hora da entrada como último uso.
- **CB-518** · **Marca de uso de outra conta** (outra pessoa usou o navegador): não vale para a conta que está dentro; vale a hora da entrada.
- **CB-519** · **Bloqueador barra a aba nova do "Continuar":** a tela mostra o texto da janela bloqueada (D-526) e continua só com "Continuar". Aberto o app sem a ligação com o site, a mudança não acontece (CA-1437) e nada se perde.
- **CB-520** · **Computador dividido com duas contas no endereço antigo:** cada uma leva só o próprio espaço, quando entra; o dado de antes das contas vai com a primeira que levar (como no D-123).
- **CB-521** · **Conta excluída com dado no endereço antigo:** ninguém consegue entrar com ela, e o espaço fica (D-525).
- **CB-522** · **Aba do app em segundo plano:** o navegador atrasa os relógios da aba; a saída acontece até 1 minuto depois do prazo, ou assim que a aba volta (CA-1458).
- **CB-523** · **Sessão cortada pelo servidor no meio do uso** (senha trocada em outro aparelho, por exemplo): como hoje (CB-125): o que falta não se perde, e a pessoa entra de novo.
- **CB-524** · **Turnstile no subdomínio:** o widget com `metanutri.com.br` cobre `app.`. Se a Cloudflare recusar, a tela mostra o aviso de verificação (CA-461), e o dono acrescenta `app.metanutri.com.br` ao widget.
- **CB-525** · **Prévia de outro ramo na Cloudflare:** desligada. Se alguma existir, vai para o app oficial (CA-1417); lá as funções e o Turnstile não aceitam o endereço da prévia.
- **CB-526** · **Administrador sem o código do app confirmado:** vale o limite de administrador (15 minutos e 8 horas).
- **CB-527** · **Aviso dos 28 minutos aberto e a pessoa volta depois dos 30:** sai, sem passar pelo "Continuar".
- **CB-528** · **A saída por tempo deixa o espaço com pendência e a marca de "saiu"** (DP-11): na próxima entrada da mesma conta, a marca não impede o envio (CA-1449).

## 4. O que abre em cada endereço (depois da P2)

| Endereço | Sem sessão | Com sessão | Critério |
|---|---|---|---|
| `metanutri.com.br/` | Landing | Landing | CA-1400, CA-1401 |
| `metanutri.com.br/precos/`, `/termos/`, `/privacidade/`, `/fontes/` | A página | A página | CA-1404 |
| `metanutri.com.br/#/precos`, `#/termos`, `#/privacidade`, `#/fontes`, `#/inicio` | A página própria | Igual | CA-1405 |
| `metanutri.com.br/#/missoes/<token>` | App, tela do paciente | Igual | CA-1423 |
| `metanutri.com.br/#/painel`, `#/caso/…` e outras telas | App, mesmo `#` (ou "Continuar", se há dado só ali) | Igual | CA-1424, CA-1429 |
| `metanutri.com.br/?volta=…` | App, mesma consulta (ou "Continuar", se há dado só ali) | Igual | CA-1425, CA-1429 |
| "Entrar", "Começar grátis" e os planos, no site | App (ou "Continuar", se há dado só ali) | Igual | CA-1402, CA-1403, CA-1429 |
| Ícone instalado do endereço antigo | App, com o aviso do ícone (ou "Continuar", se há dado só ali) | Igual | CA-1426, CA-1429 |
| `app.metanutri.com.br/` | Entrar, com "Conheça o MetaNutri" | Painel | CA-1409, CA-1410 |
| `app.metanutri.com.br/#/<tela de trabalho>` | Entrar, depois a tela | A tela | CA-1411 |
| `app.metanutri.com.br/#/missoes/<token>` | Tela do paciente | Tela do paciente | CA-1416 |
| `app.metanutri.com.br/#/criar-conta[/<plano>[/<ciclo>]]` | Cadastro | Aonde o plano leva | CA-1413 |
| `app.metanutri.com.br/#/assinar/…`, `#/pagamento` | Entrar, depois o checkout | Checkout ou volta do pagamento | CA-1411 |
| `app.metanutri.com.br/#/inicio`, `#/precos`, `#/termos`… | A página do site | Igual | CA-1412 |
| `app.metanutri.com.br/#/mudanca/<código>` | Entrar, depois a mudança | A mudança | CA-1431 |
| `metanutri.pages.dev` e prévias | `app.metanutri.com.br`, mesmo `#` | Igual | CA-1417 |
| "Sair" | — | Entrar do app | CA-1415 |

## 5. O que muda em outras specs (antes do código, pelo PLAN)

- `estilo-spora` **CA-730**: vale só no site; no app, a raiz sem sessão abre Entrar (D-504).
- `site-publico-profissional` **D-320, CA-996, CA-1026** (recarga da vitrine): deixam de existir; o site não tem
  service worker (D-503). **D-331, CA-1015, R-323**: a página própria não vira mais `/#/<rota>`. **D-332, CA-1016,
  CA-1023, CA-1024, CB-322, CB-323**: o script do `<head>` do site não procura sessão; o link do paciente e as telas do
  app saem para o app (D-510). **D-337, D-338, CA-1021, CA-1025**: valem só enquanto o site tinha service worker; saem.
  **D-339, CA-992, CA-1028**: o rodapé tem "Começar grátis" e "Entrar", que levam ao app; "Ir para o painel" sai.
- `dados-na-nuvem` **D-131**: a saída por tempo é a exceção que guarda o que não subiu (D-517). **DP-27** do plano: o
  "Sair" encerra a sessão local (D-520).
- `seguranca-lote-1` **D-97, CA-425**: a lista de endereços (D-521). **D-99, CA-431**: o link do aviso é o do app.
- `seguranca-lote-4` **D-135, CA-485**: o app tem a CSP também em cabeçalho; o site tem uma CSP menor (D-502, D-507).
- `README.md` (não é spec, mas é o roteiro do dono): o `SITE_URL`, a *Site URL*, as *Redirect URLs* e o widget do
  Turnstile passam aos endereços novos. Nenhuma spec de cobrança cita o `SITE_URL`.

## 6. Telas do protótipo

Aprovadas pelo dono em 27/10/2026, com os textos do D-526: Entrar em `app.metanutri.com.br` e "Entre de novo" (sem
uso, em dia), e mais:
1. "Entre de novo" com pendência, pelo limite de 12 horas e no administrador (o mesmo texto nos três).
2. A janela "Você ainda está aí?".
3. A faixa do limite total, no topo da área de trabalho.
4. A capa "Encerrando a sessão…".
5. O topo e o rodapé do site sem "Ir para o painel".
6. A tela "Continuar" do site, nos quatro estados: dado só aqui, esperando a outra aba, pronto, janela bloqueada. Só
   com o botão "Continuar" (D-527).
7. "Trazendo seus dados…" no app, e "Sem espaço neste navegador".
8. O aviso do ícone antigo.

## 7. Fora de escopo

- Supabase Pro e o corte da sessão no servidor (*time-box* e *inactivity timeout*). Fica para quando a receita cobrir.
- Levar o DNS para a Cloudflare, Workers no lugar da Pages, e mudanças em `www.`, nos e-mails (Resend) e no remetente.
- "Sair de todos os aparelhos" e "uma sessão por pessoa".
- Prazo para apagar à força o dado esquecido no endereço antigo (D-525).
- `Cross-Origin-Opener-Policy` no app (depois da P3).
- Pixel de anúncio, analytics ou qualquer script de terceiro no site.
- Tempo de sessão por plano e "lembrar de mim".
- Telas novas de vitrine e mudança de texto da landing, de Preços e dos Termos além do D-522.
