# SPEC — A marca da nutricionista no link do paciente

Status: **aprovada pelo dono em 29/10/2026**, pelo protótipo (`MarcaNoLink.dc.html`, no canvas "MetaNutri
Redesenho"). Atualizada em 03/11/2026 com as decisões do PLAN (DP-ML-5, 8, 10, 18 e 28) e os achados da revisão
(CA-1982, CB-964 a CB-967).

**Fonte:** a lista de funções para competir com o WebDiet (proposta comercial de 27/10, memória do projeto): o link que
o paciente abre no celular (`#/missoes/<token>`) passa a mostrar a logo e a cor da nutricionista.

**Pesquisa:** o WebDiet anuncia no app do paciente "cores com a marca do nutri" e lista "Personalização de logo
simples" no plano gratuito de 30 dias e "Personalização de logo avançada" no Premium (estudo da página pública de
27/10). Nenhuma página pública explica o que muda entre as duas.

**Lido antes:** `src/domain/perfil.ts` (a logo já existe: `Perfil.logo`, em data URI, gravada em Configurações e
impressa no alto do plano), `src/ui/config/TelaConfiguracoes.tsx` (o cartão "Logotipo": até 500 KB, PNG, JPG ou SVG),
`src/seguranca/csp.ts` (`img-src` aceita `data:` por causa dessa logo), `src/ui/missoes/TelaMissoesPaciente.tsx` (o
link: logo do MetaNutri no topo, barra do dia, abas Missões e Meu plano, missões feitas em verde; segue o tema do
celular), `supabase/001-acompanhamentos.sql` e `012-dieta-no-link.sql` (`missoes_por_token`), `src/domain/conta.ts`
(`RECURSOS_EM_TODOS_OS_PLANOS`, item "Seu logotipo nos documentos impressos"), `DESIGN.md` (Primary, Accent, Named
Rules), `textos-e-promessas` (D-405), `seguranca-lote-2` (D-107), `seguranca-lote-4` (CA-487), `exclusao-de-conta`,
`revisao-geral-trabalho` (D-240) e `separacao-site-app` (D-506).

**Hoje:** o link do paciente mostra a logo do MetaNutri no topo, e a "ação" (barra do dia, aba escolhida, botões) usa
o teal do MetaNutri no claro e o marfim no escuro. A logo da nutricionista só sai no plano impresso. O link lê da nuvem,
pelo token, só as missões, as marcações, a dieta e o aviso de estágio; não sabe nada da conta.

**Termos usados aqui:**
- **Contraste:** a razão de luminância da WCAG 2.2 entre duas cores, de 1:1 a 21:1. Texto comum pede 4,5:1 ou mais.
- **Versão do escuro:** a cor que o link usa quando o celular do paciente está no tema escuro (D-955).
- **Marca publicada:** a cópia da logo e da cor que o link do paciente lê pelo token (D-952).

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-950 | **"Sua marca" é uma parte de Conta e assinatura, com endereço próprio (`#/conta/marca`)**, aberta por um cartão "Sua marca" na página da Conta, que mostra a logo e a cor atuais. A tela tem Logo, Cor, um "Salvar" e a prévia do link num celular claro e num escuro, lado a lado. O cartão "Logotipo" sai de Configurações: **a logo é uma só**, para o link e para o plano impresso | Duas logos (uma do PDF, outra do link) confundiriam. Conta e assinatura é onde mora o que é da nutricionista como profissional; a prévia em dois celulares precisa de uma tela inteira |
| D-951 | **Logo:** PNG, JPG, WebP ou SVG, até 2 MB no envio. O app guarda uma cópia reduzida em PNG, com o lado maior de até 600 px e até 150 KB; se não couber, reduz mais, até 240 px; se ainda não couber, recusa. O SVG vira PNG na hora (o SVG nunca é guardado nem servido) | O link abre no celular do paciente, muitas vezes no 4G: 150 KB é o teto de uma imagem que não atrasa a tela. 600 px imprime com nitidez numa logo de 4 cm. SVG vira PNG para nenhum script de SVG chegar a lugar nenhum |
| D-952 | **Onde fica guardada.** No perfil da conta, como hoje (a cópia reduzida e a cor sobem com a cópia da conta), e numa **marca publicada**, uma por conta, que o link lê junto com as missões, pelo token, sem revelar a conta. Salvar em "Sua marca" atualiza as duas; remover a logo ou a cor remove da marca publicada. O servidor recusa logo que não seja `data:image/png;base64` de até 150 KB e cor fora do formato `#rrggbb` | O perfil sozinho não serve: o paciente não tem a conta da nutricionista, e a função do link não pode abrir o perfil inteiro. Uma consulta por token, como a das missões, não deixa listar marcas nem descobrir de quem é o link |
| D-953 | **Cor:** uma só. Seis cores prontas (Padrão do MetaNutri `#0E3B43`, verde-água `#0F6E66`, verde-folha `#3F5F2A`, azul `#1F4E8C`, vinho `#7A2944`, rosa-escuro `#B5476B`) e "Outra cor", com o seletor do navegador e um campo `#RRGGBB`. "Padrão do MetaNutri" é o mesmo que não ter cor própria | Seis prontas resolvem quem não tem manual de marca; o campo resolve quem tem. Nenhuma das prontas é violeta, laranja da marca ou verde de estado |
| D-954 | **Conferência de contraste: o app recusa e sugere, não ajusta sozinho.** No tema claro, o texto que vai por cima da cor é branco, e branco sobre a cor tem que dar 4,5:1 ou mais (WCAG 2.2, critério 1.4.3). Se não dá, a cor não é salva: a tela mostra o contraste medido, o mínimo e um botão "Usar #XXXXXX" com a mesma cor (mesmo matiz e saturação) escurecida até passar. A comparação usa o valor sem arredondar | A cor é da marca dela: trocar sem avisar seria mudar a marca de alguém. Recusar sem saída travaria quem tem uma cor clara; a sugestão mantém o tom e a decisão fica com ela. Branco sobre a cor com 4,5:1 também garante a cor contra o fundo claro do link (barra e aba visíveis) |
| D-955 | **Versão do escuro, calculada.** Com o celular do paciente no tema escuro, o link usa a mesma cor clareada (mesmo matiz e saturação) até dar 7:1 ou mais contra o fundo escuro `#101A1D`, que também é a cor do texto por cima dela. A nutricionista vê a versão na prévia e não escolhe | É o que o MetaNutri já faz com o próprio teal (teal no claro, marfim no escuro, DESIGN.md › Primary). Uma cor escura sobre fundo escuro sumiria. 7:1 deixa a versão do escuro na claridade do teal claro do app |
| D-956 | **Onde a cor entra no link:** no papel que hoje é do teal do MetaNutri, a ação: a barra do dia e a aba escolhida (Missões e Meu plano). **"Tentar de novo" fica com o teal do MetaNutri:** ele só aparece antes de o link abrir, quando a marca ainda não é conhecida (DP-ML-8). **O verde de "feita" e de "Dia completo" continua verde.** A cor nunca vira texto corrido nem fundo de página | DESIGN.md: dentro do dado, cor é estado. Missão feita é estado; a cor da nutricionista é marca, e marca fica na ação |
| D-957 | **Onde a logo entra no link:** no topo, no lugar da logo do MetaNutri, sobre uma placa branca de cantos arredondados, nos dois temas, com até 40 px de altura e 200 px de largura (proporção mantida). **O símbolo do MetaNutri vai para o rodapé, pequeno, em todos os planos.** Sem logo, o topo continua com a logo do MetaNutri e o rodapé não a repete | A placa branca impede que uma logo de letra escura suma no celular escuro e que um JPG de fundo branco vire um retângulo solto. O MetaNutri continua no link, que é por onde o paciente conhece o produto, sem disputar o topo |
| D-958 | **Aviso de estágio primeiro.** No link de conta de estudante, o aviso de estágio continua sendo a primeira coisa da tela, acima da logo | É o que a Lei 8.234/1991 e o modelo do WebDiet pedem (PRODUCT.md); nenhuma marca pode esconder |
| D-959 | **Plano Free: igual aos outros.** Logo e cor existem em todas as assinaturas, Free e Estudante inclusive. O item "Seu logotipo nos documentos impressos" de `RECURSOS_EM_TODOS_OS_PLANOS` vira "Sua logo e sua cor no link do paciente; a logo também no plano impresso", com prova em teste (CA-1179) | D-405: hoje as assinaturas só diferem nos limites. A logo no PDF já é de todos; tirar a marca do link do Free criaria a primeira diferença de função, por um motivo fraco. O MetaNutri no rodapé (D-957) fica em todos os planos e não sai |
| D-960 | **Plano impresso:** usa a logo de "Sua marca" (a cópia reduzida), no mesmo lugar de hoje. A cor não entra no PDF nesta entrega | O dono pediu PDF com menos informação (15/10). A cor no papel pode ser a próxima, depois de ver o link |
| D-961 | **Trocar a marca vale para todos os links da conta**, os já enviados inclusive, na próxima vez que o paciente abrir. Não é preciso gerar link de novo. A marca só aparece no link depois do primeiro "Salvar" em "Sua marca": a logo que já existe hoje, de Configurações, não vai sozinha para o link | As missões são congeladas porque são do plano; a marca é da nutricionista. Publicar a logo do PDF no link sem ela pedir mudaria o que o paciente vê sem decisão dela |
| D-962 | **Um "Salvar" para o cartão.** A prévia muda ao vivo, antes de salvar; "Salvar" fica desabilitado sem mudança ou com a cor recusada. **Fica habilitado, mesmo sem mudança, quando a conta tem logo (a antiga, de Configurações) ou cor que ainda não foi publicada** (DP-ML-10): é o caminho para levar a logo de hoje ao link. Depois de salvar, "Salvo". Sair com mudança não salva pergunta "Sair sem salvar a marca?" ("Sair" e "Continuar aqui") | Trocar a cor de todos os links de uma vez merece um clique de decisão; testar cores, não |
| D-963 | **Textos (mínimos).** Cartão "Sua marca". Logo: "Enviar logo" (sem logo) ou "Trocar logo", "Remover"; ajuda "PNG, JPG, WebP ou SVG, até 2 MB. Também aparece no plano impresso." Cor: "Outra cor"; com a cor aceita, "Contraste 8,31:1"; recusada, "Contraste 2,05:1 com o texto branco. O mínimo é 4,5:1." e "Usar #587F26". Ao lado de Salvar: "Vale para todos os links já enviados." Prévia: a legenda de cada celular traz o código da cor que ele usa, "Celular claro · #3F5F2A" e "Celular escuro · #7AB455"; sem cor própria, só "Celular claro" e "Celular escuro" (DP-ML-28). Erros: "Use PNG, JPG, WebP ou SVG, até 2 MB."; "Não foi possível ler esta imagem. Tente PNG ou JPG."; "Use uma logo mais simples."; "Use o formato #RRGGBB."; "Esta função ainda não está disponível. Tente de novo mais tarde." (CB-964); aviso "A logo é clara demais para o fundo branco."; no cartão da Conta, "O link usa a cor do MetaNutri: esta tem pouco contraste." (CB-966). O termo é **logo**, nunca "logotipo" (CA-1982) | Regra do dono: texto mínimo, sem tagline, sem eyebrow, sem "por segurança". "Aparece" no lugar de "sai" é o glossário (D-400 da `textos-e-promessas`) |

## 2. Critérios de aceite

### Conta e assinatura

- **CA-1950** · Dado Conta e assinatura, então há o cartão "Sua marca", com a logo e a cor atuais, que abre `#/conta/marca`; essa tela tem Logo, Cor, "Salvar" e a prévia do link num celular claro e num escuro. Dado Configurações, então o cartão "Logotipo" não existe mais.
- **CA-1951** · Dado uma conta que já tem logo em Configurações, quando abre a versão nova, então a logo aparece em "Sua marca" e continua no plano impresso; o link do paciente não muda até o primeiro "Salvar".
- **CA-1952** · Dado um PNG, JPG, WebP ou SVG de até 2 MB, quando a nutricionista o envia, então a prévia mostra a logo nos dois celulares; quando salva, então a logo guardada é um PNG com o lado maior de até 600 px e até 150 KB.
- **CA-1953** · Dado um arquivo de mais de 2 MB, um GIF, um HEIC ou um PDF, então aparece "Use PNG, JPG, WebP ou SVG, até 2 MB." e nada muda. O tipo vale pelo conteúdo (a assinatura nos primeiros bytes), não pelo nome nem pelo tipo que o navegador diz: um GIF salvo como `.png`, ou como `.jpg` sem tipo, também é recusado.
- **CA-1954** · Dado uma imagem que, reduzida a 240 px, ainda passa de 150 KB, então aparece "Use uma logo mais simples." e nada muda.
- **CA-1955** · Dado um SVG com `<script>` ou `onload`, então ele vira PNG, nada executa (CA-487) e o SVG não é guardado.
- **CA-1956** · Dado "Remover" e "Salvar", então o link volta a mostrar a logo do MetaNutri no topo e o plano impresso sai sem a logo dela: volta à logo do MetaNutri, como em toda conta sem logo (DP-ML-18, D-405 da `textos-e-promessas`).
- **CA-1957** · Dado as seis cores prontas, então todas passam no D-954; escolher uma muda a prévia na hora.
- **CA-1958** · Dado "Outra cor", quando a nutricionista escolhe no seletor ou digita `#1f4e8c` (com ou sem `#`, maiúscula ou minúscula), então a cor vale; quando digita algo fora do formato, então aparece "Use o formato #RRGGBB." junto do campo e a cor anterior continua.
- **CA-1959** · Dado uma cor com contraste de 4,5:1 ou mais com branco, então a tela mostra o contraste ("Contraste 8,31:1") e "Salvar" fica habilitado.
- **CA-1960** · Dado `#8CC63F` (2,05:1), então a tela mostra "Contraste 2,05:1 com o texto branco. O mínimo é 4,5:1.", "Salvar" fica desabilitado e há "Usar #587F26"; quando a nutricionista clica, então a cor vira `#587F26` (4,69:1) e "Salvar" habilita.
- **CA-1961** · Dado uma cor de 4,49:1 sem arredondar, então ela é recusada; dado 4,50:1, então é aceita.
- **CA-1962** · Dado qualquer cor aceita (as seis prontas e 200 sorteadas no teste), então a versão do escuro tem o mesmo matiz e a mesma saturação e dá 7:1 ou mais contra `#101A1D`.
- **CA-1963** · Dado "Salvar", então aparece "Salvo", e a marca publicada passa a ter a logo e a cor.
- **CA-1964** · Dado uma mudança não salva, quando a nutricionista sai da tela, então aparece "Sair sem salvar a marca?"; "Continuar aqui" fica, "Sair" descarta.

### O link do paciente

- **CA-1965** · Dado um link de uma conta com marca salva, num celular no tema claro, então o topo tem a logo dela numa placa branca, a barra do dia e a aba escolhida na cor dela com texto branco ("Tentar de novo", de antes de o link abrir, fica teal: D-956), as missões feitas em verde e o símbolo do MetaNutri pequeno no rodapé.
- **CA-1966** · Dado o mesmo link num celular no tema escuro, então a cor é a versão do escuro, o texto por cima dela é `#101A1D` e a logo continua na placa branca.
- **CA-1967** · Dado um link enviado antes de a nutricionista salvar a marca, quando o paciente abre depois, então vê a marca, sem link novo.
- **CA-1968** · Dado uma conta sem marca salva, então o link é como hoje.
- **CA-1969** · Dado uma marca só com cor, então o topo tem a logo do MetaNutri, a cor vale na ação e o rodapé não repete a logo do MetaNutri.
- **CA-1970** · Dado um link de conta de estudante com marca, então o aviso de estágio vem antes da logo.
- **CA-1971** · Dado uma conta Free, então a marca aparece no link como em qualquer assinatura, com o MetaNutri no rodapé.
- **CA-1972** · Dado uma logo muito larga (10:1) ou muito alta (1:3), então ela cabe em 200 × 40 px sem deformar.
- **CA-1973** · Dado a marca publicada sem a imagem, com a imagem estragada ou com uma imagem maior que a cópia que o app faz (mais de 600 px de lado, lido no cabeçalho do PNG, sem abrir a imagem), então o link mostra a logo do MetaNutri e as missões abrem normalmente: a marca nunca impede o link de abrir.

### Servidor e privacidade

- **CA-1974** · Dado a função do link, então ela devolve a marca junto com as missões, só para um token que existe, sem o id da conta; não existe consulta que liste marcas.
- **CA-1975** · Dado uma gravação direta na marca publicada (contornando o app) com imagem que não seja PNG em data URI, com mais de 150 KB ou com cor fora de `#rrggbb`, então o servidor recusa.
- **CA-1976** · Dado a exclusão da conta, então a marca publicada é apagada junto com os links (`exclusao-de-conta`).
- **CA-1977** · Dado a CSP do app, então nada muda: a logo é `data:` (já permitido em `img-src`) e a cor vai em estilo (já permitido em `style-src`).

### Plano impresso, textos e acesso

- **CA-1978** · Dado o plano impresso, então ele usa a logo de "Sua marca" no mesmo lugar de hoje e nenhuma cor da nutricionista.
- **CA-1979** · Dado `RECURSOS_EM_TODOS_OS_PLANOS`, então o item da logo diz "Sua logo e sua cor no link do paciente; a logo também no plano impresso", com prova em teste (CA-1179), e aparece em Preços nas três colunas.
- **CA-1980** · Dado o leitor de tela, então as cores são um grupo de opções com nome e código ("Verde-folha, #3F5F2A"), a recusa é anunciada e ligada ao campo da cor, e a logo da prévia tem texto alternativo; tudo funciona só com o teclado.
- **CA-1981** · Dado um celular (390 px) em Conta e assinatura, então o cartão vem primeiro e a prévia vem embaixo, um celular de cada vez, sem rolagem lateral.
- **CA-1982** · Dado os textos de tela (o app, Sua marca e a landing, que passa a dizer "com a sua logo e o seu CRN"), então nenhum diz "logotipo": o termo é "logo" (D-963). A única exceção é o texto alternativo da imagem do MetaNutri ("Logotipo do MetaNutri em fundo verde-petróleo…", da prévia do link nas redes).

## 3. Casos de borda

- **CB-950** · **Logo clara** (letra branca, feita para fundo escuro): a tela avisa "A logo é clara demais para o fundo branco." quando menos de 2% dos pixels visíveis (alfa de 50% ou mais) têm contraste de 3:1 ou mais com o branco (o mínimo da WCAG 2.2 para gráfico, DP-ML-5). Um JPG de fundo branco com a letra escura não dispara o aviso. É aviso: "Salvar" continua habilitado, e a prévia mostra como fica.
- **CB-951** · **JPG com fundo colorido:** aparece como veio, dentro da placa branca.
- **CB-952** · **SVG que o navegador não consegue desenhar** (fonte externa, recurso de fora): "Não foi possível ler esta imagem. Tente PNG ou JPG."
- **CB-953** · **Imagem enorme** (8000 × 8000 em 1,9 MB): é aceita e reduzida (D-951).
- **CB-954** · **Navegador sem seletor de cor:** o campo `#RRGGBB` continua.
- **CB-955** · **Dois aparelhos salvam marcas diferentes:** vale a mais nova, como em todo item da conta.
- **CB-956** · **Sem internet:** a área de trabalho trava (D-130), e "Salvar" não acontece; a prévia continua.
- **CB-957** · **Paciente com o link aberto enquanto a marca muda:** vê a nova quando recarregar ou voltar ao link.
- **CB-958** · **Paciente que imprime o link:** o papel sai claro (D-240), com a cor do tema claro. A aba escolhida e a barra do dia levam a cor dela ao papel mesmo com "Gráficos de fundo" desligado: sem isso, o navegador tira o fundo e o nome da aba, branco, sai cinza-claro no papel.
- **CB-959** · **Conta que sai do Solo para o Free:** a marca continua (D-959).
- **CB-960** · **Cor escolhida igual à padrão** (`#0E3B43` digitado): vale como "Padrão do MetaNutri".
- **CB-961** · **Logo de outra marca** (a clínica onde trabalha, a faculdade): é responsabilidade de quem envia, pelos Termos; o app não confere.
- **CB-962** · **Prévia do link no WhatsApp:** continua a do MetaNutri (D-506); a marca aparece só quando o paciente abre.
- **CB-963** · **Sessão que termina com mudança não salva:** a mudança se perde (o aviso dos 28 minutos existe para isso, D-516).
- **CB-964** · **Site publicado antes do SQL da marca** (a tabela `marcas` ainda não existe no banco): "Salvar" mostra "Esta função ainda não está disponível. Tente de novo mais tarde." e nada muda; o link continua o de hoje (R-ML-1). Não é a frase de internet: a internet está boa.
- **CB-965** · **Outra aba (ou outro aparelho, pela nuvem) salva a marca com "Sua marca" aberta:** sem mudança nesta tela, ela passa a mostrar a marca nova, "Salvar" continua desabilitado e sair não pergunta nada. Com mudança não salva nesta tela, a mudança fica (CB-124).
- **CB-966** · **Cor salva que não passa na regra de hoje** (D-954; de uma cópia antiga ou de um backup): o link usa a cor do MetaNutri (DP-ML-13), e o cartão "Sua marca" da Conta avisa "O link usa a cor do MetaNutri: esta tem pouco contraste."
- **CB-967** · **Imagem de mais de 8.000 px de lado** (PNG, JPG ou WebP; a largura e a altura são lidas no cabeçalho do arquivo, antes de abrir a imagem): "Use uma logo mais simples." e nada muda. Uma imagem assim trava o celular ou o computador ao abrir, mesmo com poucos bytes. 8.000 × 8.000 continua aceita (CB-953).

## 4. Fora de escopo

- A cor no plano impresso e nos documentos em Word.
- Fonte própria, mais de uma cor, fundo do link na cor da marca.
- Nome, CRN ou contato da nutricionista no link.
- Tirar o MetaNutri do rodapé (marca branca).
- Endereço próprio (`ana.metanutri.com.br`) e prévia do link no WhatsApp com a logo dela.
- Marca diferente por paciente ou por profissional de uma clínica.
- Forçar o tema claro ou escuro no link do paciente.
- Logo no e-mail, no ícone instalado ou na aba do navegador do paciente.

## 5. O que muda em outras specs (antes do código, pelo PLAN)

- `textos-e-promessas` **D-405, CA-1179**: o texto do item da logo (D-959).
- `textos-e-promessas` **D-400**: o termo do glossário passa a ser "logo"; a guarda de texto proíbe "logotipo" (CA-1982).
- `landing-v3` **D-663, CA-1672**: "com o seu logotipo" volta a "com a sua logo" (CA-1982).
- `seguranca-lote-2` **D-107**: os tetos da marca publicada (150 KB e o formato da cor, D-952).
- `seguranca-lote-4` **CA-487**: a logo só vale como imagem embutida, agora também no servidor (CA-1975).
- `exclusao-de-conta`: apagar a marca publicada (CA-1976).
- `dieta-no-link` e `missoes-na-nuvem`: a função do link devolve também a marca (CA-1974).
- Configurações: o cartão "Logotipo" sai (D-950).

## 6. Telas do protótipo

`MarcaNoLink.dc.html`, interativo, no tema escuro do app:
1. **Conta e assinatura › Sua marca** (`#/conta/marca`): Logo (com uma logo de exemplo inventada, "Ana Lima Nutrição"), Cor (as seis
   prontas e "Outra cor") e "Salvar". Trocar a logo, escolher ou digitar a cor muda a prévia na hora.
2. **A prévia:** o link do paciente num celular claro e num escuro, lado a lado, com a logo na placa branca, a cor na
   ação, duas das quatro missões feitas (em verde) e o MetaNutri no rodapé. Sem logo, o topo volta ao MetaNutri.
3. **A cor recusada, ao lado:** `#8CC63F` com o contraste medido e "Usar #587F26", e a mesma aba nas duas cores, para
   ver por que a primeira não passa.

Não desenhados: o cartão "Sua marca" na página da Conta, o plano impresso (muda só a origem da logo), a pergunta "Sair
sem salvar a marca?" e o link de conta de estudante (o aviso de estágio é o de hoje, acima da logo).
