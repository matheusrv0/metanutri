# SPEC — Revisão geral da área de trabalho

Status: **pedida pelo dono em 19/10/2026 ("resolva todo o resto"); aprovação pelas telas antes de publicar.**

**Fonte:** parte 6 do lançamento, "revisão geral sem bugs, e2e em todas as telas, celular e computador". Esta frente
cuida de tudo o que fica **dentro da área de trabalho** (a moldura com o menu lateral). As telas públicas, as de conta
e o link do paciente são de outra frente.

**Objetivo:** nenhuma tela da área de trabalho quebra, corta, alarga a página ou diz uma coisa e o contrário, do
celular de 360 px ao computador de 1280 px, no claro e no escuro, com o teclado e com zoom de 200%. Cada tela tem um
teste de ponta a ponta que abre, confere que não rola para o lado e que a ação principal funciona.

**Como a revisão foi feita:** cada tela em 360, 390, 640 (é o que o zoom de 200% faz num computador de 1280), 768, 1024
e 1280 px, no claro e no escuro, com dados de exemplo (o plano de exemplo, 12 pacientes, um nome de 70 letras, 10
planos, um plano sem nome, consulta amanhã, aniversário na semana e um link sem marcação há 7 dias). As telas que pedem
o servidor de conta (Conta e plano com sessão, Negócio, Aprovações, as travas da nuvem, "Sair" e a barra de versão nova)
foram vistas numa bancada com dados falsos. O teclado foi conferido com Tab do começo ao fim do Painel e do menu.
Lista completa, com a gravidade e o print de cada defeito, no **Apêndice A**.

**Specs que esta muda:** `impressao-do-plano` (CB-186: Ctrl+P fora da janela deixa de sair em branco; e o "Fora de
escopo" da medida do planejador), `pdf-e-telas-limpas` (CA-326: "Precisa de atenção" e "Tudo em dia.") e
`dados-na-nuvem` (só os documentos PRODUCT.md e AGENTS.md, que ainda descreviam o modelo antigo). Nenhum cálculo de
nutriente, de energia ou do cobrir muda.

## 1. Decisões

| # | Decisão |
|---|---|
| D-240 | **Imprimir pelo navegador (Ctrl+P) fora de uma janela de impressão imprime a tela aberta**, em papel claro, sem o menu lateral, sem os botões do cabeçalho e sem os avisos do topo. Com uma janela de impressão aberta ("Dieta para imprimir", "Suplementos" ou "Pedido de exames"), continua saindo só a folha. No tema escuro, a impressão sai clara e o tema volta ao fechar a caixa de impressão. Substitui o CB-186 da `impressao-do-plano` ("sai página em branco") |
| D-241 | **No Painel, "Precisa de atenção" vira "Falta completar" e só aparece quando há o que completar.** O bloco sempre falou do cadastro (plano sem nome, plano sem paciente, nenhum paciente), não da adesão; com o nome antigo e o "Tudo em dia." ao lado de um paciente "Sumindo", uma parte da tela desmentia a outra. Some o "Tudo em dia.". Sem nada na coluna da direita, "Onde você parou" ocupa a largura toda. Muda o CA-326 da `pdf-e-telas-limpas` |
| D-242 | **A medida caseira que o planejador mostra é a mesma da folha do paciente.** Vale na linha do alimento, nas sugestões da refeição, no Cobrir, no substituto e no Word de aconselhamento: o que se passa no pão (manteiga, margarina, requeijão, ricota) sai em "ponta de faca" até 3, dentro de 15% do peso; gordura (manteiga e margarina) nunca sai em "fatia"; medida de pedaço com mais de 4 pedaços não aparece (a pessoa já vê os gramas). A escolha das trocas (`trocas.ts`) e a dieta do link do paciente não mudam: mudar a medida do link faria todo link já enviado com margarina dizer "o plano mudou" (R-182 da `impressao-do-plano`) |
| D-243 | **"Mínimo da meta" aceita só número inteiro.** Com vírgula, o campo diz "Use um número inteiro, como 90." e a meta não muda. Um mínimo com casa decimal guardado antes desta versão vale arredondado, no cálculo e no texto, para o subtítulo ("meta de 90%") e a linha ("90% abaixo") nunca se contradizerem |
| D-244 | **"Meses além dos anos" só aparece ou some quando a pessoa termina de digitar a idade**: meio segundo depois da última tecla, ao sair do campo ou ao teclar Tab (aí o campo de meses, se aparecer, é o próximo a receber o foco). Digitar "28" não faz o campo piscar |
| D-245 | **Nome longo nunca alarga a tela.** Paciente ou plano com nome comprido corta com reticências na lista de Pacientes, na de Planos e no seletor "Paciente" da etapa 1, a partir de 360 px |
| D-246 | **Alvo de toque de 44 px no celular** (abaixo de 640 px) também em: o "Fechar" de toda janela e gaveta, as opções em pílula (Sexo, Objetivo, Condição, Nível de atividade, Situação), a trilha do cabeçalho ("Planos", "Pacientes"), os itens do menu Exportar, os links da Ajuda, o "Ver as fontes" e a linha do interruptor do Cobrir. A trilha ganha a área de toque sem mudar o desenho (a área invisível passa por cima do começo do título, que não é clicável). No computador nada muda de tamanho |
| D-247 | **Cada coisa dita uma vez, nada de texto de programador na tela, e os acertos de leitura.** Sai o cartão "Pacientes" que repetia o título da página (a busca e "Novo paciente" ficam); sai o aviso azul da ficha que repetia a frase de "Restrições e saúde"; o recolhido "Observações" da etapa 1 não repete "Observações" em cima do campo; o pedido de autorização do link do paciente não mostra mais o caminho de um arquivo do repositório. Os números do Painel concordam no singular ("1 plano mexido", "1 dia trabalhado"); "Onde você parou" diz quando antes do tipo de plano, porque no celular o fim da linha é cortado; o Painel no computador tem um "Novo plano" só (o do menu), como Planos; o texto-guia da busca de alimento diz "2 colheres de sopa"; o Cobrir diz a falta com a mesma precisão da tabela ("Faltam 244 mg", não "243,60 mg"); a Tabela de alimentos ordena por nome sem se deixar enganar por espaço no começo do nome e não quebra "100 g"; no celular, o seletor de referência da etapa 3 não quebra cada opção em três linhas |
| D-248 | **Produto do rótulo nunca derruba o plano.** *(Acrescentada em 19/10/2026, a partir do defeito achado pela frente de receitas.)* Um produto apagado em "Meus produtos" continua no plano que o usa como **"Produto apagado"**, com os gramas e sem valores: conta como falta de dado em todos os nutrientes (marca † no total, nunca zero), a energia mostra travessão e a pessoa tira a linha ou põe outro alimento no lugar; as três etapas, o Cobrir, o Exportar e o link continuam funcionando. Não guardamos uma cópia do produto apagado: apagar foi pedido pela pessoa, e o aviso de antes de apagar diz o que acontece com o plano. Um produto que o rótulo não traz um nutriente (vitamina A, as do complexo B, fósforo…) conta esse nutriente como falta de dado, nunca como "NaN" |
| D-249 | **PRODUCT.md e AGENTS.md descrevem o modelo de dados de hoje** (spec `dados-na-nuvem`): os dados ficam na nuvem, presos à conta; o navegador guarda só uma cópia de trabalho enquanto a pessoa está dentro; só existe "Sair"; sem internet, a área de trabalho trava até a conexão voltar. Sem conta configurada (desenvolvimento e testes), o app abre no modo local |

## 2. Critérios de aceite

### Impressão (D-240)

- **CA-770** · Dado um plano aberto em qualquer etapa e nenhuma janela de impressão aberta, quando a pessoa imprime pelo navegador, então o papel mostra o título e o conteúdo da tela, e não mostra o menu lateral nem os botões do cabeçalho (nunca uma página em branco).
- **CA-771** · Dado "Dieta para imprimir" aberta, quando a pessoa imprime, então só a folha vai para o papel, como hoje: a tela de trás não aparece.
- **CA-772** · Dado o tema escuro, quando a impressão começa, então a página fica no tema claro; quando a impressão termina, o tema escuro volta.

### Painel (D-241 e D-247)

- **CA-773** · Dado um plano sem nome, um plano sem paciente ou nenhum paciente cadastrado, então o Painel mostra o bloco "Falta completar" com cada pendência numa linha e o botão dela ("Ver" ou "Cadastrar"), como hoje.
- **CA-774** · Dado nada a completar, então o bloco "Falta completar" não existe e o texto "Tudo em dia." não aparece em lugar nenhum; sem consulta nem aniversário na semana, "Onde você parou" ocupa a largura toda.
- **CA-775** · Dado um paciente "Sumindo" em "Hoje e esta semana" e o cadastro completo, então nenhum texto do Painel diz que está tudo em dia.
- **CA-776** · Dado 1 plano mexido e 1 dia trabalhado em 14 dias, então o Painel diz "1 plano · mexido em 14 dias" e "1 dia · trabalhado em 14 dias"; com 2 ou mais, "mexidos" e "trabalhados".
- **CA-777** · Dado o Painel, então cada linha de "Onde você parou" diz primeiro quando o plano mudou e depois o tipo ("Alterado hoje às 14:00 · atendimento completo").
- **CA-778** · Dado o Painel no computador (1280 px ou mais), então há um botão "Novo plano" só, o do menu; abaixo de 1280 px, o do cabeçalho continua.

### Medida caseira (D-242)

- **CA-779** · Dado margarina ou manteiga no plano com 2,5 g, 5 g, 7,5 g ou 10 g, então a linha do alimento no planejador mostra "meia ponta de faca", "1 ponta de faca", "1 ponta de faca e meia" ou "2 pontas de faca".
- **CA-780** · Dado manteiga ou margarina com 30 g, então nenhuma tela nem documento diz "fatia": o planejador e a folha dizem "1 colher de sopa".
- **CA-781** · Dado o mesmo alimento e os mesmos gramas, então a linha do planejador, as sugestões da refeição, o Cobrir, o substituto, o Word e a folha dizem a mesma medida (a folha acrescenta o peso quando a medida é vaga, como hoje); medida de pedaço com mais de 4 pedaços não aparece no planejador, como já não aparece na folha.

### Meta da adequação (D-243)

- **CA-782** · Dado "Personalizado", quando a pessoa digita "90,4" em "Mínimo da meta", então o campo diz "Use um número inteiro, como 90." e a meta continua a de antes; quando digita "85", o aviso some e o subtítulo diz "meta de 85% da referência".
- **CA-783** · Dado um plano guardado com mínimo de 90,4%, então o subtítulo diz "meta de 90%", o campo mostra "90" e um nutriente com 90,2% conta como na meta.

### Idade e meses (D-244)

- **CA-784** · Dado um adulto, quando a pessoa apaga a idade e digita "2" e "8" seguidos, então "Meses além dos anos" não aparece em nenhum momento; quando digita "8" e para, então o campo aparece meio segundo depois; quando digita "8" e sai do campo, então ele aparece na hora.

### Nome longo (D-245)

- **CA-785** · Dado um paciente com nome de 70 letras, em 360 e 390 px, então a lista de Pacientes não passa da largura da tela, o nome corta com reticências e "Abrir ficha" fica inteiro à vista.
- **CA-786** · Dado um plano com nome de 70 letras, em 360 e 390 px, então a lista de Planos não passa da largura da tela e "Abrir plano" fica inteiro à vista.
- **CA-787** · Dado esse paciente na lista do seletor "Paciente" da etapa 1, em 360 e 390 px, então o seletor e os campos da Identificação cabem na tela.

### Toque (D-246)

- **CA-788** · Dado o celular (390 px), então o "Fechar" das janelas (Modelos de plano, Dieta para imprimir) e da gaveta do Cobrir tem pelo menos 44 × 44 px, e cada opção em pílula (Sexo, Objetivo, Condição e Nível de atividade na etapa 1; Sexo na ficha; Situação em Configurações) tem pelo menos 44 px de altura.
- **CA-790** · Dado o celular, então a trilha do cabeçalho ("Planos"), cada item do menu Exportar, os botões e links da Ajuda, o "Ver as fontes" da avaliação antropométrica e a linha "Incluir ingredientes e alimentos crus" do Cobrir têm pelo menos 44 px de altura de área de toque.

### Texto (D-247)

- **CA-791** · Dado Pacientes, então "Pacientes" aparece só como título da página, e a busca e "Novo paciente" continuam; dado a ficha, então a frase sobre as restrições filtrarem as sugestões aparece uma vez; dado a etapa 1, então "Observações" aparece uma vez como título do recolhido e o campo continua com o nome acessível "Observações"; dado a busca de alimento de uma refeição, então o texto-guia diz "colheres"; dado o Cobrir de cálcio com 243,6 mg faltando, então a gaveta diz "Faltam 244 mg para a meta."
- **CA-792** · Dado o pedido de autorização do link do paciente, então nenhum caminho de arquivo (como `docs/...`) aparece na tela.
- **CA-794** · Dado a Tabela de alimentos em ordem de nome, então os alimentos cujo nome começa por espaço entram na posição da primeira letra ("Mamão, doce em calda" junto dos outros "Mamão"), e "valores por 100 g" não quebra entre o número e a unidade.
- **CA-795** · Dado a etapa 3 no celular, então cada opção do seletor de referência ("Individual (RDA, 90%)", "Coletivo (EAR, 50%)", "Personalizado") fica numa linha só.

### Produto do rótulo (D-248)

- **CA-789** · Dado um produto do rótulo usado num plano, quando a pessoa o apaga em "Meus produtos" e abre o plano, então as três etapas abrem sem erro; a linha do alimento diz "Produto apagado", com os gramas e "— kcal", sem o botão de substituto; o Cobrir, "Dieta para imprimir" e o Word continuam funcionando; e o aviso de antes de apagar diz que o plano passa a mostrar "Produto apagado" nessa linha.
- **CA-793** · Dado um produto do rótulo no plano, então os nutrientes que o rótulo não traz (vitamina A, tiamina, fósforo…) contam como falta de dado, com a marca †, e nenhum número da tela, da folha ou do Word sai como "NaN"; um item cujo alimento não existe mais conta como falta de dado em todos os nutrientes.

### Documentos (D-249)

- **CA-796** · Dado PRODUCT.md e AGENTS.md, então nenhum diz que os dados ficam só no aparelho, que a conta é opcional ou que o app funciona offline; os dois dizem que os dados ficam na nuvem presos à conta, que só existe "Sair" e que sem internet a área de trabalho trava.

### Cada tela, de ponta a ponta

- **CA-797** · Dado cada tela da área de trabalho que abre sem servidor (Painel, Pacientes, ficha do paciente, Adesão, Planos, as três etapas do planejador, a gaveta do Cobrir, Modelos de plano, o menu Exportar com "Dieta para imprimir", "Pedido de exames para imprimir", Tabela de alimentos, Meus produtos, Conta e plano, Configurações e Ajuda), em 390 e em 1280 px, então ela abre sem erro no console, a página não rola para o lado e a ação principal dela funciona.
- **CA-798** · Dado as telas que pedem o servidor de conta (Negócio, Aprovações, a trava sem internet, sem espaço e de tamanho, "Carregando seus dados…", "Sair" com mudança não salva e a barra de versão nova), então um teste de tela com dados falsos confere que cada uma abre com o título e a ação principal.
- **CA-799** · Dado o teclado só, então em cada tela do CA-797 o primeiro Tab leva a "Pular para o conteúdo", o foco aparece com anel visível e Esc fecha a janela ou gaveta aberta.

## 3. Casos de borda

- **CB-240** · Ctrl+P em "Plano não encontrado", numa lista vazia ou na Tabela de alimentos: sai o que está na tela, nunca em branco.
- **CB-241** · Conta nova, sem nada: o Painel mostra os números, "Onde você parou" com "Ver um plano de exemplo" e "Falta completar" com "Nenhum paciente cadastrado".
- **CB-242** · "Mínimo da meta" vazio, zero ou acima de 1000: a meta não muda (como o CA-698) e o aviso de número inteiro não aparece para o campo vazio.
- **CB-243** · Idade apagada: o campo de meses segue a regra de sempre (some, a menos que já tenha meses guardados) quando a pessoa termina de digitar.
- **CB-244** · Manteiga ou margarina acima de 3 pontas de faca (por exemplo, 24 g): vale a medida comum ("3 colheres de chá"), nunca "fatia"; a quantidade que nenhuma medida alcança fica sem medida.
- **CB-245** · Nome de uma palavra só, sem espaço, com 80 letras: também corta, não alarga a tela.
- **CB-246** · Tema escuro e a pessoa cancela a caixa de impressão: o tema escuro volta igual.
- **CB-247** · Plano guardado com mínimo da meta 0,4%: vale 1%, nunca 0%.
- **CB-248** · Tab logo depois de digitar a idade de uma criança: o campo de meses aparece antes de o foco andar e recebe o foco.
- **CB-249** · Tabela larga (Contas, em Negócio) no celular: continua rolando de lado só dentro do cartão; a página não rola.

## 4. Fora de escopo

- As telas públicas, as de conta (Entrar, Criar conta, código, senha, checkout) e o link do paciente: são de outra frente.
- A lógica do Mercado Pago, SQL, funções do Supabase e a regra do cobrir (`prescritivel.ts`, `cobrir.ts`, `trocas.ts`).
- A medida da dieta que vai para o link do paciente (D-242; R-182 da `impressao-do-plano`).
- Campo de texto com 44 px de altura no celular: o DESIGN.md pede 44 px para botão; os campos têm 40 px. Fica para o
  dono decidir (Apêndice A, A-22).
- A ordem dos botões de "Sair mesmo assim" e "Ficar" no celular e a ordem dos cartões da ficha no celular (A-23 e A-26):
  decisões de produto, listadas no relatório.
- O texto de Conta e plano no modo local, sem servidor (A-21): só aparece em desenvolvimento e nos testes.

## 5. Validação

Um teste por critério, com o id no nome. `e2e` é `e2e/revisao-geral-trabalho.spec.ts`.

| Critério | Teste |
|---|---|
| CA-770, CA-771, CB-240 | e2e (mídia de impressão) |
| CA-772, CB-246 | `src/ui/tema/ProvedorTema.test.tsx` |
| CA-773, CA-774, CA-776, CA-777, CB-241 | `src/ui/painel/TelaPainel.test.tsx` |
| CA-775 | `src/ui/painel/hojeEEstaSemana.test.tsx` |
| CA-778 | e2e |
| CA-779, CA-780, CA-781, CB-244 | `src/domain/busca.test.ts`, `quantidadeNaFolha.test.ts`, `substitutos.test.ts`, `src/export/docx.test.ts`, `src/ui/plano/LinhaItem.test.tsx` |
| CA-782, CA-783, CB-242, CB-247 | `src/domain/adequacao.test.ts`, `src/ui/adequacao/TelaAdequacao.test.tsx` |
| CA-784, CB-243, CB-248 | `src/ui/caso/etapa1.test.tsx` |
| CA-785, CA-786, CA-787, CB-245 | e2e (360 e 390 px) |
| CA-788, CA-790 | e2e (área de toque medida no celular) |
| CA-789 | e2e, `LinhaItem.test.tsx`, `docx.test.ts` |
| CA-791, CA-792 | `pacientes.test.tsx`, `TelaCaso.test.tsx`, `EntradaRapida.test.tsx`, `TelaAdequacao.test.tsx`, `missoesNutricionista.test.tsx` |
| CA-793 | `src/domain/totais.test.ts`, `src/domain/produtos.test.ts` |
| CA-794 | `src/domain/catalogo.test.ts`, `src/ui/alimentos/TelaAlimentos.test.tsx` |
| CA-795 | e2e |
| CA-796 | `src/data/documentos.test.ts` |
| CA-797 | e2e (16 telas × 390 e 1280 px) |
| CA-798 | `src/ui/telasComServidor.test.tsx` |
| CA-799 | e2e |
| CB-249 | sem teste automático: a tabela já rola dentro do cartão; conferido nos prints da bancada |

## Apêndice A — Defeitos achados na revisão (main 2eb11db)

Gravidade: **C** crítico (tela quebra, corta conteúdo ou perde o que a pessoa fez), **I** importante (atrapalha o uso
ou contradiz), **M** menor. Prints na pasta da frente (`antes/`, com o nome do arquivo na coluna "Print").

| # | Tela | Defeito | Grav. | Print | Decisão |
|---|---|---|---|---|---|
| A-01 | Pacientes | Nome de 70 letras alarga a lista para 645 px num celular de 390: os cartões passam da borda e "Abrir ficha" fica cortado | C | `pacientes-390-claro` | D-245 |
| A-02 | Planos | Mesmo defeito com o nome do plano: a lista vai a 701 px | C | `planos-390-claro` | D-245 |
| A-03 | Etapa 1 | O seletor "Paciente" com o nome longo alarga a Identificação para 548 px e empurra os campos para fora da tela | C | `etapa1-390-claro` | D-245 |
| A-04 | Planejador | Ctrl+P fora da janela de impressão imprime uma página em branco | C | `ctrlp-antes-1280` | D-240 |
| A-05 | Painel | "Precisa de atenção · Tudo em dia." ao lado de um paciente "Sumindo" em "Hoje e esta semana" | I | `painel-1280-claro` | D-241 |
| A-06 | Etapa 2 | Margarina 5 g sem medida no planejador e "1 ponta de faca" na folha; 30 g vira "1 fatia" | I | `etapa2-390-claro`, `dieta-imprimir-390-claro` | D-242 |
| A-07 | Etapa 3 | "Mínimo da meta" 90,4: o subtítulo diz "meta de 90%" e uma linha com 90,2% diz "90% abaixo" | I | (teste) | D-243 |
| A-08 | Etapa 1 | "Meses além dos anos" pisca ao digitar a idade de um adulto ("2" mostra, "28" esconde) e empurra Peso e Estatura | I | (teste) | D-244 |
| A-09 | Todas | Alvos de toque abaixo de 44 px no celular: "Fechar" das janelas e da gaveta (28 px), opções em pílula (34 px), trilha do cabeçalho (11 px), itens do Exportar (36 px), "Ir" e "Abrir" da Ajuda (20 px), "Ver as fontes" (16 px) | I | `relatorio.json` da auditoria | D-246 |
| A-10 | Etapa 3 | No celular, o seletor de referência quebra cada opção em três linhas ("Individual / (RDA, / 90%)") | I | `etapa3-390-claro` | D-247 |
| A-11 | Etapa 2 | O pedido de autorização do link mostra o caminho `docs/lgpd-rascunhos.md`, que não existe para quem usa o site | I | código | D-247 |
| A-12 | Painel | "1 plano · mexidos em 14 dias", "1 dia · trabalhados em 14 dias" | M | `painel-390-claro` | D-247 |
| A-13 | Painel | No computador, dois "Novo plano" (menu e cabeçalho); Planos já esconde o do cabeçalho | M | `painel-1280-claro` | D-247 |
| A-14 | Painel | "Onde você parou" no celular corta a data: "Atendimento completo · altera…" | M | `painel-390-claro` | D-247 |
| A-15 | Pacientes | O cartão "Pacientes" repete o título da página | M | `pacientes-1280-claro` | D-247 |
| A-16 | Ficha | O aviso azul repete a frase de "Restrições e saúde" (as restrições filtram as sugestões), longe do cartão | M | `ficha-1280-escuro` | D-247 |
| A-17 | Etapa 1 | "Observações" (título do recolhido) e "Observações" (rótulo do campo) um em cima do outro | M | `etapa1-390-claro` | D-247 |
| A-18 | Tabela de alimentos | Dois alimentos com espaço no começo do nome aparecem antes de "Abacate" na ordem por nome | M | `alimentos-1280-claro` | D-247 |
| A-19 | Tabela de alimentos | No celular, "100" e "g" em linhas diferentes e "· Fontes da base" sozinho numa linha | M | `alimentos-390-claro` | D-247 |
| A-20 | Etapa 2 | Texto-guia da busca: "2 colher de sopa feijão" | M | `etapa2-390-claro` | D-247 |
| A-21 | Conta e plano (modo local) | Texto de programador (".env.local", "README") e "funciona sem conta"; só sem servidor | M | `conta-390-claro` | fora de escopo |
| A-22 | Todas | Campos de texto com 40 px de altura no celular | M | `relatorio.json` | dono decide |
| A-23 | "Sair" | No celular, "Sair mesmo assim" (vermelho) fica em cima de "Ficar" (o rodapé das janelas empilha ao contrário) | M | `bancada/sair-390-claro` | dono decide |
| A-24 | Cobrir | "Faltam 243,60 mg" com duas casas, enquanto a tabela diz "656 mg" | M | `cobrir-390-claro` | D-247 |
| A-25 | Etapa 3 | "Ajustar" sozinho numa faixa da largura toda debaixo dos números | M | `etapa3-768-claro` | não muda |
| A-26 | Ficha | No celular, Histórico, Evolução do peso (vazia) e o aviso vêm antes da Identificação | M | `ficha-390-claro` | dono decide |
| A-27 | Negócio | No celular, a tabela de Contas rola de lado dentro do cartão e o selo fica cortado na borda | M | `bancada/negocio-390-claro` | não muda (CB-249) |
| A-28 | Documentos | PRODUCT.md e AGENTS.md dizem que os dados ficam no aparelho, que a conta é opcional e que funciona offline | I | — | D-249 |
| A-29 | Planejador | Apagar em "Meus produtos" um produto usado num plano derruba a tela do plano (o total do dia não acha o alimento e para tudo). Achado pela frente de receitas, reproduzido aqui | C | e2e CA-789 | D-248 |
| A-31 | Meus produtos | O cartão "Meus produtos" repete o título da página (visto nos prints de depois). Ao contrário de Pacientes, a frase dele explica o que é cadastrar pelo rótulo | M | `depois/produto-apagado-aviso-390` | dono decide |
| A-30 | Etapas 2 e 3 | Com um produto do rótulo no plano, os nutrientes que o rótulo não traz somam "NaN" (vitamina A, complexo B, fósforo, cobre, manganês, colesterol) em vez de contar como falta de dado | C | teste CA-793 | D-248 |

**Sem defeito achado:** rolagem lateral da página (nenhuma tela em 640, 768, 1024 e 1280 px), erros no console
(nenhum), foco com o teclado (anel visível, ordem certa, "Pular para o conteúdo" primeiro, Esc fecha as janelas),
tema escuro (contraste certo em todas as telas vistas), as travas da nuvem, "Carregando seus dados…", a barra de
versão nova, Negócio e Aprovações no computador.
