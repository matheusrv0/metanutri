# SPEC — Revisão geral das telas públicas

Status: **pedida pelo dono em 19/10/2026 ("resolva todo o resto"); aprovação pelas telas antes de publicar**. Parte 6
do lançamento ("revisão geral sem bugs, e2e em todas as telas, celular e computador"), só a área pública. A área de
trabalho é de outra frente; a lógica do Mercado Pago, o SQL e as funções do Supabase ficam como estão.

**Escopo:** tudo o que abre fora da área de trabalho. Landing (`#/inicio` e o endereço sem caminho, CA-730), Preços
(`#/precos` e `#/precos/<plano>`), Entrar, Criar conta (cada plano e ciclo), Confirmar e-mail (a tela do código),
Esqueci a senha (os dois passos), Nova senha, Termos, Privacidade, Fontes, a moldura pública (topo, menu e rodapé), o
checkout (`#/assinar/…`) e a volta do pagamento (`#/pagamento`), só o desenho e os avisos, Comprovar matrícula,
Completar cadastro e o link do paciente (`#/missoes/<token>`), com "Meu plano" e os estados de link vazio, inexistente
e sem internet. O site não tem banner de cookies nem de aviso nessas telas.

**Como foi revisado (19/10/2026):** o site montado (`vite build` + `vite preview`) com um servidor de conta falso
(D-233), em 360, 390, 640 (o 1280 com zoom de 200%), 768, 1024 e 1280 px, nos temas claro e escuro, só com o teclado,
e nos estados vazio, erro, carregando, sem internet e com textos longos (e-mail de 80 letras, nome de paciente longo,
endereço do Google Drive nas orientações). Em cada combinação: rolagem para o lado, elemento fora da tela, alvo de
toque abaixo de 44 px, contraste, títulos, nome acessível, foco visível e o console. O checkout foi visto também com o
script de verdade dos campos do cartão (chave pública de teste). A lista completa, com a gravidade, está no
**Apêndice A**.

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-230 | **Gravidade dos defeitos:** *Crítico* impede ler ou usar a tela; *Importante* atrapalha, engana ou fere uma regra do dono (44 px, nada de rolagem lateral, texto) ou da WCAG A/AA; *Menor* é acabamento. Todo Crítico e Importante é corrigido nesta frente ou vira decisão do dono no relatório; Menor só quando é barato | Pedido da frente |
| D-231 | **"Meu plano" segue as regras da folha impressa na hora de desenhar**, sem mudar a cópia guardada no link: o nome para o paciente (`nomeParaPaciente`, "(peso cru)") e a quantidade da folha (`quantidadeNaFolha`: a medida caseira; o peso ao lado só na medida vaga; o peso sozinho com mais de 4 pedaços; "ponta de faca" na manteiga e na margarina). A cópia não guarda o id do alimento: o alimento é achado pelo nome guardado, que é a descrição exata da base (os 597 nomes são únicos; um teste garante). **Caminho seguro quando não acha** (produto do nutricionista, "Alimento removido", ou um nome que a base mudou depois da cópia): o nome como foi guardado e a quantidade como antes (a medida guardada com o peso ao lado, ou só o peso), porque sem a categoria não dá para saber se a medida é vaga, e esconder o peso seria perder informação. Resolve o R-182 da `impressao-do-plano` | A cópia e a comparação "o plano mudou" (`dietaMudou`) não mudam: nenhum link já enviado aparece como "o plano mudou". O aparelho do paciente tem a base inteira no pacote |
| D-232 | **Link do paciente sem internet diz a verdade.** Abrir sem conseguir falar com a nuvem e sem cópia no aparelho mostra "Não consegui abrir suas missões" com "Tentar de novo", não "Este link não existe mais". Marcar uma missão e a nuvem recusar ou cair: a marca volta como estava e a tela avisa, em vez de fingir que salvou | O aviso antigo mandava o paciente pedir um link novo sem motivo; a marca feita sem internet sumia na próxima abertura sem ninguém saber |
| D-233 | **Servidor de conta falso nos testes de navegador.** Um segundo site de teste, montado com um endereço de Supabase que não existe e servido numa porta própria, responde pelo Playwright (`e2e/apoio/servidorFalso.ts`): sessão, perfil, assinatura, pedido de estudante e o link do paciente. Nada sai da máquina, nenhuma chave de verdade entra no repositório | Completar cadastro, Comprovar matrícula, o checkout com sessão, a volta do pagamento e o link lido da nuvem só existem com o servidor ligado; o site de teste de sempre roda sem servidor (CA-150) |
| D-234 | **Preços:** a tabela comparativa só a partir de 1024 px; abaixo, os cartões por plano, como no celular, dois por linha e da mesma altura a partir de 640 px. O título da página passa a `h1`. O seletor Mensal/Anual ganha 44 px de altura no celular | Em 768 px a tabela não cabe e a página rolava 169 px para o lado; Preços era a única tela sem `h1` |
| D-235 | **Rodapé sem separador solto:** "Base MetaNutri" numa linha e o link "Fontes da base" na linha de baixo, sempre; "OMS, 2006 e 2007" e "SISVAN, 2011" viram dois itens. Os links do rodapé e a logo do topo ganham 44 px de altura no celular, e o texto de um link que quebra fica alinhado à esquerda. No topo, o menu fica na segunda linha até 767 px (antes, até 639 px), para "Entrar" e "Começar grátis" não caírem sozinhos numa linha (A-23) | Em 768 e 1024 px o "·" ficava sozinho no fim da linha, e os links tinham 20 px de altura no celular |
| D-236 | **Avisos do painel do checkout no tema escuro:** no escuro o painel do resumo é marfim, então os avisos dentro dele usam as cores do tema claro (o mesmo escopo `.papel` da folha impressa). No tema claro nada muda | Os avisos saíam com letra clara sobre fundo claro (1,4:1): "O pagamento não está disponível agora", "Você já assina…" e os erros do cartão ficavam ilegíveis |
| D-237 | **Texto longo quebra dentro do cartão** nas telas de conta: a coluna do formulário encolhe (`minmax(0,1fr)`, regra "Coluna que encolhe" do DESIGN.md) e o subtítulo e os avisos quebram em qualquer ponto | Um e-mail de faculdade longo empurrava o formulário da tela do código para fora do cartão em 360 px |
| D-238 | **Região principal** (`main`) no link do paciente e na volta do pagamento | Eram as duas telas públicas sem `main`; leitor de tela pula direto para o conteúdo |
| D-239 | **Fica para o dono decidir (não muda aqui):** campos de 40 px com letra de 14 px no celular (o iPhone aproxima a tela ao tocar no campo), e as listas de escolha das telas de conta, que têm a altura dos campos ao lado e os alvos de 32 a 40 px entre 640 e 1023 px (tablet) vêm do design system, que vale para o app inteiro; marcar missão sem internet e mandar depois seria uma fila nova no aparelho do paciente | Mudar no componente da biblioteca muda a área de trabalho, que é de outra frente; a fila é função nova |

## 2. Critérios de aceite

### Moldura pública

- **CA-740** · Dado o rodapé em 360, 390, 768, 1024 e 1280 px, então nenhuma linha começa nem termina com "·"; "Base MetaNutri" fica numa linha e o link "Fontes da base" na de baixo, e "OMS, 2006 e 2007" e "SISVAN, 2011" são itens separados.
- **CA-741** · Dado um celular (menos de 640 px), então a logo do topo e cada link do rodapé (Fontes da base, Preços, Começar grátis ou Ir para o painel, Entrar, Termos de uso, Política de privacidade) têm 44 px de altura ou mais, e o texto de um link que quebra fica alinhado à esquerda.

### Preços

- **CA-742** · Dado Preços em 360, 390, 640, 768 e 1023 px, então a página não rola para o lado e os planos aparecem em cartões; em 1024 e 1280 px, na tabela comparativa, sem rolar para o lado.
- **CA-743** · Dado Preços, então o título "Grátis na faculdade, barato ao se formar" é o único `h1` da página, os cartões dos planos no celular têm `h2`, e no celular cada opção do seletor Mensal/Anual tem 44 px de altura.

### Telas de conta

- **CA-744** · Dado um e-mail de 80 letras sem espaço guardado como pendente, quando a tela do código abre em 360 px, então o e-mail quebra dentro do cartão, o campo do código e os botões "Confirmar" e "Reenviar o código" cabem inteiros na largura do cartão, e a página não rola para o lado.
- **CA-745** · Dado um e-mail de 80 letras, então o aviso "E-mail da faculdade confirmado: …" de Comprovar matrícula e o subtítulo de Completar cadastro quebram dentro do cartão, sem rolar para o lado em 360 px.

### Checkout

- **CA-746** · Dado o tema escuro, quando o painel do resumo do checkout mostra um aviso (já assina; pagamento indisponível; conta sem nuvem; aceite faltando; recusa do cartão), então o texto do aviso tem contraste de 4,5:1 ou mais com o fundo dele.
- **CA-747** · Dado o tema claro, então os avisos do painel do resumo ficam como hoje (fundo verde-claro ou vermelho-claro, letra escura).

### Link do paciente: "Meu plano"

- **CA-748** · Dado um link com a dieta copiada como hoje (o nome da tabela e a medida do planejador), quando o paciente abre "Meu plano", então os alimentos do plano de exemplo aparecem com o nome da folha impressa: Pão francês, Margarina com sal, Queijo minas frescal, Mamão Formosa, Banana prata, Castanha-do-pará, Arroz branco cozido, Feijão carioca cozido, Peito de frango grelhado sem pele, Brócolis cozido, Cenoura crua, Macarrão (peso cru), Patinho grelhado sem gordura, Batata inglesa cozida, Filé de merluza assado, Iogurte natural, Aveia em flocos, Arroz integral cozido, Lentilha cozida, Ovo cozido, Alface crespa e Maçã Fuji com casca.
- **CA-749** · Dado o mesmo link, então a quantidade segue a folha (spec `impressao-do-plano`, CA-641 a CA-644): Pão francês "1 unidade e meia", Arroz branco cozido "6 colheres de sopa", Ovo cozido "2 unidades" e Iogurte natural "1 copo americano", sem o peso; Maçã Fuji com casca "3 fatias e meia · 130 g", Filé de merluza assado "meia unidade · 100 g" e Peito de frango grelhado sem pele "1 bife · 100 g", com o peso ao lado; Banana prata "130 g" (mais de 4 pedaços); Margarina com sal "1 ponta de faca"; Queijo minas frescal "30 g" e Macarrão (peso cru) "90 g" (sem medida).
- **CA-750** · Dado um item cujo nome guardado não é um alimento da base (um produto do nutricionista, "Alimento removido" ou um nome que a base mudou), então ele aparece com o nome como foi guardado e a quantidade como antes: a medida guardada com o peso ao lado ("2 unidades · 60 g"), ou só o peso ("45 g").
- **CA-751** · A cópia da dieta no link não muda: o que a nuvem guarda é o mesmo de antes desta versão, e um link copiado antes desta versão não aparece como "O plano mudou" para o nutricionista (a comparação continua entre a cópia e o plano).
- **CA-752** · Dado uma refeição com mais de uma opção, então "Meu plano" continua com "Opção 1" em cima da primeira e "ou · Opção 2" entre elas (CA-645), e a medida continua em destaque, com o nome embaixo, em letra de 16 px ou mais (CA-535).

### Link do paciente: estados

- **CA-753** · Dado o link aberto sem conseguir falar com a nuvem e sem cópia dele no aparelho, então a tela diz "Não consegui abrir suas missões" e "Confira a internet do celular e tente de novo.", com o botão "Tentar de novo"; tocar no botão pede de novo e, com a internet de volta, abre as missões.
- **CA-754** · Dado o link aberto sem conseguir falar com a nuvem e com a cópia que o aparelho guardou numa visita anterior, então as missões abrem pela cópia, como hoje.
- **CA-755** · Dado um link que a nuvem não conhece (trocado ou inventado), então a tela continua "Este link não existe mais".
- **CA-756** · Dado o paciente marcando uma missão, quando a nuvem recusa ou a internet cai, então a missão volta ao estado de antes, a tela avisa "Não consegui salvar. Confira a internet e marque de novo." e nada muda na cópia do aparelho; marcando de novo com a internet, salva como hoje e o aviso some.
- **CA-757** · O link do paciente e a volta do pagamento têm uma região principal (`main`) com o conteúdo da tela.

### Testes de navegador

- **CA-758** · Para cada tela do escopo, em 390 e 1280 px, um teste de navegador abre a tela e confere: ela aparece (o título certo), a página não rola para o lado, o console não tem erro e a ação principal está visível. Telas: landing (e o endereço sem caminho), Preços (e `#/precos/solo`), Entrar, Criar conta (Free, Solo, Solo anual, Pro e Estudante), Confirmar e-mail, Esqueci a senha (os dois passos), Nova senha, Termos, Privacidade, Fontes, checkout, volta do pagamento, Comprovar matrícula, Completar cadastro e o link do paciente (Missões e Meu plano).
- **CA-759** · Dado as telas de conta num celular (menos de 640 px), então cada caixa de aceite ou de declaração (Termos e Política, "Declaro que este CRN…", "Declaro ter matrícula…") tem 44 px de altura de toque, sem mudar o desenho do formulário. As listas de escolha (região do CRN, período atual) ficam com 40 px, iguais aos campos de texto ao lado delas (D-239). *(Revisão da frente, 19/10/2026: achado na segunda rodada da auditoria, A-21. Antes, este número dizia que o Apêndice A lista os defeitos com a gravidade; isso continua valendo como regra do método, na D-230.)*

## 3. Casos de borda

- **CB-230** · Dois alimentos da base com a mesma descrição: hoje não existe (um teste confere os 597). Se a base ganhar um nome repetido, o teste falha e obriga a decidir antes de publicar.
- **CB-231** · Produto do nutricionista com o nome exato de um alimento da base: aparece com o nome e a quantidade do alimento da base. Risco aceito: é o mesmo alimento escrito do mesmo jeito.
- **CB-232** · A base mudou a medida caseira de um alimento depois da cópia: a quantidade segue a base de hoje, como a folha impressa de hoje.
- **CB-233** · Item guardado com gramas inválidos ou sem nome: já é descartado na leitura (CB-153); nada novo.
- **CB-234** · Sem internet e o pedido não volta nunca (rede que trava em vez de cair): a tela fica em "Abrindo suas missões…" até o navegador desistir. Não muda nesta frente.
- **CB-235** · Tentar de novo ainda sem internet: a mesma tela de erro, sem acumular avisos.
- **CB-236** · Duas marcações seguidas, a primeira falhando depois de a segunda sair: cada falha desfaz só a própria missão.
- **CB-237** · Preços em 1024 px com zoom de 200% (512 px de largura útil): cartões, sem rolar para o lado.
- **CB-238** · Tema escuro com o painel do resumo e o formulário do cartão com erro: o erro do formulário fica no cartão da esquerda, com as cores do tema escuro, e continua legível.
- **CB-239** · Site sem servidor de conta (modo local, CA-150): o link do paciente lê só o aparelho; "Este link ainda não abre em outro aparelho" continua igual.

## 4. Fora de escopo

- As telas da área de trabalho (outra frente), a lógica do Mercado Pago, o SQL e as funções.
- O componente de campo do design system (40 px, letra de 14 px) e a regra de 640 px dos tamanhos de botão (D-239).
- Fila de marcações sem internet no aparelho do paciente (D-239).
- Setas do teclado nos grupos de rádio (Mensal/Anual, Solo/Pro): hoje cada opção é uma parada do Tab, e funciona.
- Título da aba do navegador por tela (hoje é "MetaNutri" em toda tela, no app inteiro).
- Mudar textos aprovados das telas (landing, Preços, Entrar): nenhum fere as regras de texto.

## 5. Riscos para o dono revisar

- **R-230** · O nome no link agora difere do que o nutricionista vê no planejador ("Pão francês" no celular do paciente, "Pão, trigo, francês" no plano). É o que a folha impressa já faz desde 15/10.
- **R-231** · O aviso de marcação que não salvou depende de a nuvem responder com erro. Rede que trava (CB-234) não dispara o aviso até o navegador desistir.
- **R-232** · O teste de navegador ganhou um segundo site de teste (D-233): o `npx playwright test` monta dois builds e leva uns 25 s a mais.

## Apêndice A — Defeitos achados na revisão de 19/10/2026

Prints de antes em `rodada-1910/revisao-geral-publica/` (pasta de trabalho do coordenador, fora do repositório), no
padrão `<tela>-<largura>-<tema>-antes.png`.

| # | Gravidade | Tela | Defeito | Onde | Feito |
|---|---|---|---|---|---|
| A-01 | Crítico | Confirmar e-mail | E-mail longo (a partir de ~40 letras, comum em e-mail de faculdade) empurra o formulário para fora do cartão: o campo do código e os botões saem cortados | 360 a 640 px | D-237, CA-744 |
| A-02 | Crítico | Checkout (tema escuro) | Avisos do painel do resumo ilegíveis, 1,4:1 ("O pagamento não está disponível agora", "Você já assina…", recusa do cartão) | todas as larguras, escuro | D-236, CA-746 |
| A-03 | Importante | Preços | A tabela não cabe: a página rola 169 px para o lado, a coluna Clínica sai cortada e "Começar agora" quebra em duas linhas | 768 a 1023 px | D-234, CA-742 |
| A-04 | Importante | Preços | Sem `h1`: o título da página é `h2` | todas | D-234, CA-743 |
| A-05 | Importante | Link do paciente | Sem internet, a tela diz "Este link não existe mais. Pode ter sido trocado por um novo." | sem internet | D-232, CA-753 |
| A-06 | Importante | Link do paciente | Marcar sem internet: a tela marca, nada chega à nuvem, nada avisa, e a marca some na próxima abertura | sem internet | D-232, CA-756 |
| A-07 | Importante | Link do paciente, Meu plano | Nome da tabela ("Pão, trigo, francês", "Margarina, com óleo hidrogenado, com sal (65% de lipídeos)") e o peso em toda linha, diferente da folha impressa (R-182) | todas | D-231, CA-748 a CA-752 |
| A-08 | Importante | Rodapé público | "Base MetaNutri ·" com o ponto sozinho no fim da linha; em 1024 px também "OMS, 2006 e 2007 ·" | 768 e 1024 px | D-235, CA-740 |
| A-09 | Importante | Rodapé público | Links com 20 px de altura no celular (Preços, Começar grátis, Entrar, Termos de uso, Política de privacidade) | menos de 640 px | D-235, CA-741 |
| A-10 | Importante | Topo público | Logo-botão com 28 px de altura no celular | menos de 640 px | D-235, CA-741 |
| A-11 | Importante | Preços | Seletor Mensal/Anual com 40 px no celular | menos de 640 px | D-234, CA-743 |
| A-12 | Menor | Rodapé público | "Política de privacidade" quebra em duas linhas centralizadas | 768 px | D-235, CA-741 |
| A-13 | Menor | Comprovar matrícula, Completar cadastro | E-mail longo não quebra no aviso "E-mail da faculdade confirmado" nem no subtítulo (mesma causa do A-01) | 360 px | D-237, CA-745 |
| A-14 | Menor | Link do paciente, volta do pagamento | Sem região principal (`main`) | todas | D-238, CA-757 |
| A-15 | Menor | Todas as telas de formulário | Campos de 40 px com letra de 14 px no celular: o iPhone aproxima a tela ao tocar no campo | menos de 640 px | decisão do dono (D-239) |
| A-16 | Menor | Moldura, Preços, checkout, link do paciente | Entre 640 e 1023 px (tablet), botões, abas e o botão do olho da senha com 32 a 40 px; caixas de aceite com 20 px de altura de toque | 640 a 1023 px | decisão do dono (D-239) |
| A-17 | Menor | Preços, checkout | Grupos de rádio: cada opção é uma parada do Tab, em vez de uma parada com setas | teclado | fica (fora de escopo) |
| A-18 | Menor | Todas | O título da aba do navegador é "MetaNutri" em toda tela | todas | fica (fora de escopo) |
| A-19 | Menor | Comprovar matrícula | "Previsão de formatura" usa campo de mês: no Firefox de computador vira campo de texto, sem calendário | Firefox | fica |
| A-20 | Menor | Criar conta pago | O subtítulo "Passo 1 de 3." repete a barra de passos | todas | fica (texto aprovado na `conta-e-verificacao`) |
| A-21 | Importante | Criar conta, Completar cadastro | No celular, as caixas de aceite e de declaração têm 20 a 40 px de altura de toque. Achado na segunda rodada, depois das correções | menos de 640 px | CA-759 |
| A-22 | Menor | Criar conta, Comprovar matrícula | As listas de escolha (região do CRN, período atual) têm 40 px, como os campos de texto ao lado | menos de 640 px | decisão do dono (D-239) |
| A-23 | Menor | Topo público | Entre 640 e 767 px o menu fica na primeira linha e "Entrar" e "Começar grátis" caem sozinhos na segunda, encostados à esquerda | 640 a 767 px | D-235 (o menu desce para a segunda linha até 767 px, como no celular) |
| A-24 | Menor | Preços (cartões) | Com dois cartões por linha (640 a 1023 px), o cartão mais curto não acompanha a altura do vizinho | 640 a 1023 px | D-234 (cartões da mesma altura na linha) |

**Sem defeito (conferido):** landing (incluindo o endereço sem caminho, que abre `#/inicio`), Entrar, Esqueci a senha
(os dois passos), Nova senha, Termos, Privacidade e Fontes nos dois temas e nas seis larguras, fora o rodapé; o foco
visível em toda parada do Tab; o link do paciente com nome longo e endereço do Google Drive nas orientações; a volta do
pagamento nos três estados. **Console:** nenhum erro do nosso código nem da regra de conteúdo (CSP) nas telas
públicas, com e sem o script do cartão; só os erros de rede esperados (senha errada: 400; sem internet).

**Falsos positivos da medição** (conferidos no print): o contraste do seletor Mensal/Anual (a pílula escolhida é um
elemento irmão, que a medição não enxerga) e o da opção "Nutricionista" travada no cadastro de estudante (botão
desabilitado, fora da regra de contraste); "cortado" nos textos `sr-only`; a caixa de arquivo de Comprovar matrícula
sem anel no próprio campo (o anel fica no rótulo, `has-[:focus-visible]`).
