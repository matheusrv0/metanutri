# SPEC — Importar pacientes por planilha

Status: **aprovada em 29/10/2026**, junto com o protótipo (`ImportarPacientes.dc.html`, no canvas "MetaNutri
Redesenho"). O plano está em `PLAN.md`, com as decisões de implementação (DP-IP-1 a DP-IP-35).

**Fonte:** a lista de funções para competir com o WebDiet (proposta comercial de 27/10, memória do projeto): quem vem
do WebDiet, do Dietbox, do Nutrium ou de uma planilha própria traz a lista de pacientes sem redigitar.

**Pesquisa (29/10/2026, só páginas públicas):**
- **Nutrium:** exporta todos os clientes num CSV enviado por e-mail (Conta › Privacidade e notificações). Importa
  Excel, CSV e TSV, pede nome, sexo, data de nascimento e e-mail, liga cada coluna a um campo à mão e mostra o erro
  com o número da linha; e-mail repetido é erro. Fontes: [exportar](https://help.nutrium.com/en/articles/5086469-can-i-export-my-clients-data),
  [importar](https://wp.nutrium.com/import-your-clients-spreadsheets-into-nutrium/).
- **WebDiet:** a landing anuncia "importação de pacientes por planilha" e tem no FAQ a pergunta "Posso importar meus
  pacientes de outros softwares ou planilha?" (estudo da página pública de 27/10), sem dizer o formato. Nenhuma página
  pública diz se ele exporta a lista nem com que colunas.
- **Dietbox:** nenhuma página pública sobre exportar ou importar pacientes.
- **Consequência:** a tela foi desenhada para CSV e XLSX genéricos, com reconhecimento de cabeçalho e escolha manual
  das colunas.

**Lido antes:** `src/domain/pacientes.ts` (os campos da ficha), `src/domain/conta.ts` (limites, `ehPacienteAtivo`,
`LIMITES_ATIVOS`, `RECURSOS_EM_TODOS_OS_PLANOS`), `src/ui/pacientes/TelaPacientes.tsx`, `dados-na-nuvem` (D-130,
DP-34), `seguranca-lote-2` (D-107: a cópia da conta vai até 5 MB), `seguranca-lote-4` (CA-487), `estilo-spora`
(CA-177, CA-178), `textos-e-promessas` (D-405, CA-1179) e `separacao-site-app` (D-517).

**Hoje:** paciente só entra pelo "Novo paciente", um por vez. A ficha tem nome, sexo (F, M ou vazio), data de
nascimento, telefone, e-mail, objetivo, observações e os blocos da anamnese. Paciente ativo é quem teve plano ou missão
nos últimos 30 dias; o limite do plano (Free 2, Estudante 10, Solo 25, Pro sem limite) conta só os ativos, e hoje
nenhum limite é cobrado (`LIMITES_ATIVOS = false`).

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-900 | **Onde fica.** Botão "Importar planilha" em Pacientes, ao lado de "Novo paciente", e também na lista vazia, ao lado de "Cadastrar paciente". Abre `#/pacientes/importar`, uma tela com três passos (Arquivo, Colunas, Prévia) e a conclusão. "Cancelar", em qualquer passo, volta a Pacientes sem criar nada | É o primeiro dia de quem vem de outro sistema: a lista vazia é onde ela procura |
| D-901 | **Arquivos aceitos:** CSV (também `.txt`), separado por ponto e vírgula, vírgula ou tabulação, e XLSX. Até 5 MB e 2.000 linhas de paciente. `.xls`, `.ods`, `.numbers`, PDF e o resto são recusados com a frase de como salvar | O Nutrium exporta CSV; qualquer planilha (Excel, Google Planilhas, LibreOffice, Numbers) salva CSV ou XLSX. O teto de linhas segue o da nuvem (D-910) |
| D-902 | **Sem pacote novo.** O CSV é lido com o decodificador de texto do navegador. O XLSX, que é um ZIP com XML, é aberto com o descompactador e o leitor de XML do próprio navegador. O `jszip`, que já é dependência de desenvolvimento, serve só para os testes montarem planilhas | `AGENTS.md`: nenhuma dependência nova sem o dono. O app é instalável e cada pacote entra no cache de quem usa |
| D-903 | **Acentos e separador.** O app tenta UTF-8 (com ou sem BOM) com leitura estrita; se falhar, lê como Windows-1252 (o "ANSI" do Excel, que contém o Latin-1). BOM de UTF-16 (o "Texto Unicode" do Excel) é lido como UTF-16. O separador é o que aparece o mesmo número de vezes nas primeiras linhas, fora das aspas. Aspas, separador e quebra de linha dentro de uma célula valem (RFC 4180) | O Excel no Brasil salva CSV com ponto e vírgula em Windows-1252; o Google Planilhas, com vírgula em UTF-8. A nutricionista não sabe e não precisa saber qual é |
| D-904 | **Colunas reconhecidas pelo cabeçalho**, sem acento e sem caixa: **Nome** (nome, nome completo, paciente, nome do paciente, cliente, name, nombre); **Sobrenome** (sobrenome, último nome, last name; junta ao nome); **Sexo** (sexo, gênero, sex, gender); **Data de nascimento** (data de nascimento, nascimento, data nasc., dt. nasc., DN, aniversário, birth date, date of birth); **Telefone** (telefone, celular, WhatsApp, fone, tel., phone, mobile); **E-mail** (e-mail, email, correio eletrônico); **Objetivo** (objetivo, motivo da consulta, meta, goal); **Observações** (observações, obs., notas, anotações, notes). O resto fica em "Não importar". O cabeçalho é a linha, entre as 10 primeiras, com mais nomes reconhecidos; sem nenhum, a primeira linha não vazia, e as colunas viram "Coluna A", "Coluna B"… | O reconhecimento resolve o caso comum sem clique; a escolha manual (D-905) resolve o resto |
| D-905 | **A nutricionista confere e muda** o destino de cada coluna. Cada destino recebe uma coluna só, menos **Observações**, que aceita várias: cada coluna vira uma linha "Nome da coluna: valor". Escolher um destino já usado devolve a outra coluna a "Não importar". Sem coluna em Nome, a prévia não abre | É o modelo do Nutrium. Observações com várias colunas dá lugar a "Alergias" ou "Convênio" sem campo novo na ficha |
| D-906 | **Só entra o que a ficha já tem:** nome, sexo, data de nascimento, telefone, e-mail, objetivo e observações. CPF, RG, endereço, convênio, peso, altura e o resto não entram como campo; só entram se a nutricionista mandar a coluna para Observações | Minimização (LGPD, art. 6º, III): a ficha não tem esses campos e não ganha nenhum. Peso e altura moram no plano |
| D-907 | **Leitura dos valores.** **Sexo:** F, fem., feminino, mulher, female viram F; M, masc., masculino, homem, male viram M; o resto é problema (D-908). **Data:** DD/MM/AAAA, D/M/AAAA, DD-MM-AAAA, DD.MM.AAAA, AAAA-MM-DD, data com hora (fica a data), data do Excel (número de série) e ano com dois dígitos (até o ano atual, 20xx; acima, 19xx). Se alguma data da coluna só faz sentido como mês/dia e nenhuma como dia/mês, a coluna inteira é lida como mês/dia e a prévia avisa "Datas lidas como mês/dia". **Nome:** espaços a mais saem; nome todo em maiúsculas vira nome próprio, com de, da, do, das, dos e e em minúsculas. **Telefone e e-mail:** entram como vieram, sem validar, como no cadastro à mão | Os formatos são os do Excel e dos sistemas brasileiros. Sistema antigo exporta nome em maiúsculas; a ficha nunca mostrou nome assim |
| D-908 | **Problemas de uma linha**, cada um com um motivo curto: **"Data inválida"** (data que não existe, como 31/02, futura, de mais de 120 anos ou texto); **"Sexo vazio"** ou **"Sexo não reconhecido"**; **"Igual à linha N"** (a mesma pessoa mais acima na planilha); **"Já está na conta"**. **Mesma pessoa:** o nome igual, sem acento, sem caixa e sem espaço a mais, e a mesma data de nascimento; ou o nome igual quando um dos dois não tem data. E-mail e telefone não decidem. Linha sem nome não é problema: fica de fora e é contada à parte | Irmãos costumam ter o e-mail e o telefone da mãe. Homônimo com outra data de nascimento é outra pessoa |
| D-909 | **Resolver na própria prévia.** Linhas prontas começam marcadas e podem ser desmarcadas. "Data inválida" e "Sexo…" começam desmarcadas; a nutricionista corrige na linha (digita a data, escolhe F ou M) e a linha fica pronta e marcada, ou marca a linha como está e ela entra sem a data ou sem o sexo ("Entra sem a data"). "Igual à linha N" e "Já está na conta" ficam de fora, sem opção | Corrigir na linha evita editar a planilha e importar de novo (no Nutrium, é preciso). Juntar duas fichas é outra função, fora desta entrega |
| D-910 | **Tudo de uma vez.** "Importar N pacientes" cria todos os marcados de uma vez na cópia de trabalho; eles sobem à nuvem pelo caminho de sempre ("Salvo"). Antes de criar, o app confere de novo: (1) a lista da conta, porque outra aba ou aparelho pode ter criado alguém desde a prévia; quem passou a existir vira "Já está na conta" e a prévia volta, sem criar nada; (2) o teto da cópia da conta (D-107, 5 MB); se não cabe, nada é criado e a tela diz quantos cabem | Meia importação é pior que nenhuma. O teto da nuvem existe e recusar no meio da sincronia deixaria a conta presa (CB-123) |
| D-911 | **Limite do plano: os importados entram como pacientes sem plano e, pela regra que já existe, não são ativos.** Não contam no limite até ganharem um plano ou um link. Nenhum estado novo ("inativo", "arquivado") é criado | Ativo é quem teve plano ou missão nos últimos 30 dias (`ehPacienteAtivo`), e é por ativo que a assinatura cobra. Entrar como ativo seria falso e estouraria o Free (2) na hora. "Arquivado" seria uma função nova (filtro, desarquivar) e esconderia da lista quem a nutricionista acabou de trazer. Com a regra de hoje, a nutricionista do Free traz 300 e atende 2 por vez; quando os limites forem ligados, o aviso do CA-177 aparece na hora do plano, como para qualquer paciente |
| D-912 | **Cada paciente importado guarda a importação** de onde veio: um código e a data e hora. A ficha mostra "Importado em 29/10/2026". O nome do arquivo não é guardado | O desfazer (D-913) precisa saber quem veio junto. O nome do arquivo pode ter dado de pessoa e não serve depois |
| D-913 | **Desfazer.** Na conclusão e, por 24 horas, numa linha no topo de Pacientes ("Importação de hoje, 14:32 · 5 pacientes · Desfazer"). Desfazer apaga os pacientes daquela importação que não mudaram desde então: sem plano, sem link e com a ficha sem edição. Os outros ficam, e a tela diz quantos. Não há pergunta de confirmação. Depois de 24 horas a linha some e eles são pacientes como os outros | Nada que a nutricionista mexeu se perde, então perguntar não protege nada. 24 horas cobre o "importei o arquivo errado" sem deixar um botão de apagar em massa para sempre |
| D-914 | **A planilha não sai do navegador.** A leitura, as colunas e a prévia acontecem na aba, só na memória: nada vai para o armazenamento do navegador, para a nuvem, para log, erro ou métrica. Sai do navegador só o paciente criado, pelo mesmo caminho do cadastro à mão. A coluna em "Não importar" é descartada. A Política de privacidade não muda | LGPD: o MetaNutri é operador e só recebe o que a nutricionista decidiu cadastrar. O caminho do dado é o de sempre |
| D-915 | **"Baixar as que ficaram de fora"**, na conclusão, quando alguma linha não entrou: um CSV gerado no navegador, só com essas linhas, as colunas da planilha e uma coluna "Motivo", em UTF-8 com BOM e com o separador do arquivo original. Célula que começa com `=`, `+`, `-` ou `@` ganha um apóstrofo na frente | Com 300 linhas, a nutricionista corrige as que sobraram e importa de novo. O apóstrofo impede que o Excel rode fórmula escondida na célula (injeção de CSV) |
| D-916 | **Todas as assinaturas importam**, Free e Estudante inclusive (D-405). "Importar pacientes de planilha (CSV ou Excel)" entra em `RECURSOS_EM_TODOS_OS_PLANOS`, com prova em teste (CA-1179) | Hoje as assinaturas só diferem nos limites. Trazer a lista é o que tira a nutricionista do outro sistema; travar no Free tiraria o motivo de testar |
| D-917 | **Textos (mínimos).** Título "Importar planilha". Passos: "Arquivo", "Colunas", "Prévia". Arquivo: "Solte a planilha aqui", "Escolher arquivo", "CSV ou XLSX, até 2.000 linhas. O arquivo não sai deste computador."; ao lado, "Colunas que entram" com os sete destinos. Lendo: "Lendo a planilha…". Colunas: "Coluna da planilha", "Primeira linha", "Vai para"; "Ver prévia". Prévia: "N prontos para importar", "N com problema", "Importar N pacientes". Conclusão: "N pacientes importados", "Entram sem plano e não contam como ativos.", "Ficaram de fora" (com o motivo de cada um; a linha pronta que ela desmarcou aparece como "Desmarcada"), "Ver pacientes", "Desfazer". Desfeito: "Importação desfeita." Recusas: "“arquivo.pdf” não é uma planilha. Use CSV ou XLSX."; "Arquivo .xls antigo. No Excel, salve como .xlsx ou CSV."; "A planilha tem mais de 2.000 linhas. Divida em arquivos menores."; "A planilha não tem pacientes."; "Não cabe na conta: cabem mais N pacientes." | Regra do dono: sem tagline, sem eyebrow, sem "por segurança", sem texto repetido. A linha do limite fica porque responde a dúvida de quem está no Free |
| D-918 | **Limpeza de cada célula** (revisão de 03/11/2026). O XLSX desfaz o escape `_xHHHH_` (o "_x000D_" de um retorno dentro da célula; "_x005F_" é o sublinhado). Depois, em CSV e XLSX, saem os caracteres de controle de U+0000 a U+001F, menos tabulação, quebra de linha e retorno, e os não caracteres U+FFFE e U+FFFF; o meio par de surrogates vira U+FFFD (revisão 2); e o texto é normalizado em NFC. A célula que só tinha controle conta como vazia | O Ctrl-Z que exportações antigas põem no fim do arquivo virava um paciente de nome invisível, e o controle no nome quebra o Word do aconselhamento. O Mac escreve "João" com o til separado, e a busca de Pacientes não o acharia |
| D-919 | **Até 200 colunas** (revisão de 03/11/2026). Só as 200 primeiras colunas entram na análise; havendo mais, o passo Colunas diz "Só as 200 primeiras colunas entram.". Célula com referência além da última coluna do Excel (XFD, a 16.384ª) é ignorada | Um CSV de 30 KB com 15 mil separadores virava 15 mil listas no passo Colunas, e uma célula em "ZZZZ2" fazia o leitor criar meio milhão de colunas. Nenhuma ficha precisa de mais de 200 |
| D-920 | **XLSX sem DTD e sem entrada gigante** (revisão de 03/11/2026). O XML que declara DTD ou entidade (`<!DOCTYPE`, `<!ENTITY`) é recusado com a frase do CB-910, antes de o navegador o ler. Nenhuma entrada do zip passa de 8 MB (revisão 2; era 16): a que declara mais não é aberta, e a que passa disso ao abrir também. A aba que passa do teto é pulada; quando uma aba foi pulada, só conta como a dos pacientes a aba que sobra com a coluna Nome reconhecida (D-904). Se nenhuma sobra assim (ou se os textos compartilhados passam do teto), a recusa é "Aba grande demais. Salve a aba dos pacientes como CSV." | Excel, Google Planilhas e LibreOffice não escrevem DTD; uma explosão de entidades num XLSX de 300 bytes congelava a aba por 14 s, e um XML de 64 MB passava pelo leitor de uma vez |
| D-921 | **Número de linha que não avança no XLSX** (revisão de 03/11/2026): a linha com `r` igual ou menor que o da anterior, ou maior que 1.048.576 (o máximo de linhas do Excel; revisão 2), recebe o número seguinte ao da anterior | As marcas e as correções são guardadas pelo número: duas linhas com o mesmo número misturavam duas pessoas |
| D-922 | **Textos além do D-917, que ficam** (revisão de 03/11/2026): "obrigatória" ao lado de Nome e "aceita várias" ao lado de Observações (respondem o CA-1914 e o D-905 antes de a nutricionista errar); "Escolha a planilha", no celular (DP-IP-24 do plano); "Marcar todas" (DP-IP-14); "A lista de pacientes mudou. Confira a prévia antes de importar." (D-910); "Escolher outro arquivo", depois de desfazer; as frases do .ods, do .numbers e dos 5 MB (D-901); "Só as 200 primeiras colunas entram." (D-919); "Aba grande demais. Salve a aba dos pacientes como CSV." (D-920). Saem "As outras ficam de fora." (a lista já diz o que entra) e "Sem sexo e sem data" (o importado sem os dois mostra "—") | Regra de texto mínimo: fica o que evita um erro ou responde uma dúvida; sai o que repete |

## 2. Critérios de aceite

### Entrada e arquivo

- **CA-1900** · Dado Pacientes com pacientes, então há "Importar planilha" ao lado de "Novo paciente", e ele abre `#/pacientes/importar` no passo Arquivo.
- **CA-1901** · Dado Pacientes sem nenhum paciente, então "Importar planilha" aparece ao lado de "Cadastrar paciente".
- **CA-1902** · Dado o passo Arquivo, quando a nutricionista solta um CSV na área ou escolhe pelo "Escolher arquivo" (com mouse, toque ou teclado), então aparece "Lendo a planilha…" e, em seguida, o passo Colunas.
- **CA-1903** · Dado um CSV com ponto e vírgula em Windows-1252, com "João Conceição" e "Patrícia Gonçalves", então os nomes aparecem com os acentos certos.
- **CA-1904** · Dado um CSV com vírgula em UTF-8 com BOM, então os acentos saem certos e o BOM não entra no primeiro cabeçalho ("Nome" é reconhecido).
- **CA-1905** · Dado um CSV com tabulação, ou um "Texto Unicode" do Excel (UTF-16), então ele é lido como os outros.
- **CA-1906** · Dado uma célula entre aspas com separador, aspas duplicadas e quebra de linha dentro, então ela é uma célula só, com o texto inteiro.
- **CA-1907** · Dado um XLSX com a data de nascimento guardada como data do Excel e outra como texto "14/03/1991", então as duas viram 14/03/1991.
- **CA-1908** · Dado um XLSX com mais de uma aba, então o passo Colunas mostra "Aba" com as abas do arquivo, a primeira escolhida; trocar a aba relê as colunas.
- **CA-1909** · Dado `.xls`, `.ods`, `.numbers`, PDF ou imagem, então o passo Arquivo mostra a recusa do D-917 e nada mais acontece.
- **CA-1910** · Dado um arquivo com mais de 5 MB ou mais de 2.000 linhas de paciente, então a recusa diz o limite e nada é lido além do necessário para contar.

### Colunas

- **CA-1911** · Dado cada grupo de cabeçalhos do D-904 (um teste por grupo, com e sem acento e caixa), então a coluna vem com o destino certo; um cabeçalho fora da lista ("CPF", "Peso (kg)") vem em "Não importar".
- **CA-1912** · Dado linhas de título acima da tabela ("Relatório de pacientes", uma linha vazia), então o cabeçalho é a linha com mais nomes reconhecidos entre as 10 primeiras, e as linhas de cima ficam de fora.
- **CA-1913** · Dado uma planilha sem nenhum cabeçalho reconhecido, então as colunas aparecem como "Coluna A", "Coluna B"…, com o valor da primeira linha como exemplo, todas em "Não importar".
- **CA-1914** · Dado nenhuma coluna em Nome, então "Ver prévia" fica desabilitado e a tela diz "Escolha a coluna do nome."
- **CA-1915** · Dado uma coluna em Telefone, quando a nutricionista manda outra coluna para Telefone, então a primeira volta a "Não importar"; dado duas colunas em Observações, então as duas ficam.
- **CA-1916** · Dado "Nome" e "Sobrenome", então o paciente entra com o nome completo ("Juliana" + "Ferreira Souza").
- **CA-1917** · Dado o passo Colunas, então ele mostra quantas linhas e colunas a planilha tem e o exemplo da primeira linha de cada coluna; "Trocar arquivo" volta ao passo Arquivo.

### Valores e problemas

- **CA-1918** · Dado sexo escrito como F, fem., Feminino, mulher, female, M, masc., Masculino, homem ou male (com e sem caixa), então vira F ou M; dado "Outro" ou vazio, então a linha tem o problema "Sexo não reconhecido" ou "Sexo vazio".
- **CA-1919** · Dado cada formato de data do D-907, então a data é lida certa; dado 31/02/1994, uma data futura, uma de mais de 120 anos ou "não sei", então a linha tem "Data inválida".
- **CA-1920** · Dado uma coluna de datas com 03/25/1990 e nenhuma data impossível como mês/dia, então a coluna inteira é lida como mês/dia e a prévia mostra "Datas lidas como mês/dia".
- **CA-1921** · Dado "JULIANA FERREIRA DE SOUZA", então o nome entra como "Juliana Ferreira de Souza"; dado "juliana Ferreira", então fica como veio.
- **CA-1922** · Dado a mesma pessoa duas vezes na planilha (D-908), então a segunda linha tem "Igual à linha N", com o número da primeira, e não pode ser marcada.
- **CA-1923** · Dado uma linha com o nome e a data de nascimento de um paciente da conta, ou com o nome dele quando um dos dois não tem data, então ela tem "Já está na conta" e não pode ser marcada.
- **CA-1924** · Dado dois irmãos com o mesmo e-mail e o mesmo telefone e nomes diferentes, então os dois ficam prontos.
- **CA-1925** · Dado dois homônimos com datas de nascimento diferentes, na planilha ou um na planilha e outro na conta, então os dois são pessoas diferentes.
- **CA-1926** · Dado linhas sem nome (ou só com espaços), então elas não aparecem na prévia, e a prévia diz "N linhas sem nome ficaram de fora".

### Prévia

- **CA-1927** · Dado a prévia, então ela mostra "N prontos para importar" e "N com problema", cada linha com o número dela na planilha, e o botão "Importar N pacientes" conta as linhas marcadas; tudo se recalcula a cada mudança.
- **CA-1928** · Dado uma linha com "Data inválida", quando a nutricionista digita uma data válida na linha, então a linha fica pronta e marcada; quando marca a linha sem corrigir, então o motivo vira "Entra sem a data" e o paciente entra sem a data de nascimento.
- **CA-1929** · Dado uma linha com "Sexo vazio" ou "Sexo não reconhecido", quando a nutricionista escolhe F ou M na linha, então a linha fica pronta e marcada; quando marca sem escolher, então o motivo vira "Entra sem o sexo".
- **CA-1930** · Dado uma linha pronta, quando a nutricionista a desmarca, então ela não entra e as contagens mudam.
- **CA-1931** · Dado mais de 50 linhas, então as com problema vêm primeiro e as prontas aparecem 50 por vez, com "Mostrar mais 50".
- **CA-1932** · Dado a prévia, quando a nutricionista volta a Colunas e de novo à prévia, então o mapeamento, as correções e as marcas continuam; trocar o arquivo recomeça do zero.

### Importar

- **CA-1933** · Dado "Importar 5 pacientes", então os 5 são criados de uma vez, sem plano, e aparecem em Pacientes com "Nenhum plano ainda"; a área de trabalho mostra "Salvo" quando chegam à nuvem.
- **CA-1934** · Dado uma conta Free com 2 pacientes ativos, quando importa 300, então os pacientes ativos continuam 2 (`estadoDoLimite`) e nenhum aviso de limite aparece; quando um importado ganha plano ou link, então ele passa a contar como qualquer paciente.
- **CA-1935** · Dado um paciente criado em outra aba entre a prévia e o clique em "Importar", então nada é criado, a prévia volta com essa linha em "Já está na conta" e as contagens corrigidas.
- **CA-1936** · Dado uma importação que faria a cópia da conta passar de 5 MB (D-107), então nada é criado e a prévia diz "Não cabe na conta: cabem mais N pacientes."
- **CA-1937** · Dado um paciente importado, então a ficha mostra "Importado em 29/10/2026" e o campo da importação vem depois dos campos que já existem (DP-34).
- **CA-1938** · Dado colunas em "Não importar" (CPF, por exemplo), então o valor delas não aparece em nenhum lugar da conta, nem em Observações.
- **CA-1939** · Dado várias colunas em Observações ("Alergias", "Convênio"), então a observação do paciente tem uma linha por coluna, "Alergias: lactose", na ordem da planilha, e linhas de coluna vazia não entram.

### Conclusão e desfazer

- **CA-1940** · Dado a importação feita, então a conclusão mostra "5 pacientes importados", "Entram sem plano e não contam como ativos.", a lista de quem ficou de fora com o motivo, "Ver pacientes" e "Desfazer"; "Baixar as que ficaram de fora" só aparece quando alguma linha ficou de fora.
- **CA-1941** · Dado "Desfazer" logo depois de importar, então os 5 pacientes são apagados aqui e na nuvem, e a tela mostra "Importação desfeita."
- **CA-1942** · Dado uma importação em que um paciente ganhou plano, outro ganhou link e outro teve a ficha editada, quando a nutricionista desfaz, então esses três ficam, os outros saem, e a tela diz "Importação desfeita. 3 pacientes ficaram porque já foram mudados."
- **CA-1943** · Dado uma importação de menos de 24 horas, então Pacientes mostra no topo "Importação de hoje, 14:32 · 5 pacientes · Desfazer"; dado 24 horas depois, então a linha não aparece mais e os pacientes ficam.
- **CA-1944** · Dado "Baixar as que ficaram de fora", então o arquivo tem só as linhas que não entraram, as colunas da planilha e "Motivo", em UTF-8 com BOM e com o separador original; uma célula "=HIPERLINK(…)" sai como "'=HIPERLINK(…)".

### Privacidade, segurança e acesso

- **CA-1945** · Dado a leitura, as colunas e a prévia, então nenhum pedido de rede leva conteúdo da planilha (o teste intercepta a rede) e nada da planilha é gravado no armazenamento do navegador; depois de importar, só os pacientes criados vão para a cópia da conta.
- **CA-1946** · Dado `<script>`, `<img onerror>` ou `javascript:` numa célula, então o texto aparece como texto na prévia e na ficha, e nada executa (CA-487 continua).
- **CA-1947** · Dado só o teclado, então a área de soltar e "Escolher arquivo" são alcançáveis e abrem o seletor com Enter ou Espaço; cada passo leva o foco ao título dele; o motivo de cada linha é lido junto com a linha pelo leitor de tela, e a correção da data tem o erro ligado ao campo.
- **CA-1948** · Dado um celular (390 px), então os três passos funcionam; a tabela de colunas e a prévia viram listas de duas linhas, sem rolagem lateral da página.
- **CA-1949** · Dado `RECURSOS_EM_TODOS_OS_PLANOS`, então "Importar pacientes de planilha (CSV ou Excel)" está na lista, com prova em teste (CA-1179), e aparece em Preços nas três colunas.

## 3. Casos de borda

- **CB-900** · **Planilha vazia ou só com o cabeçalho:** "A planilha não tem pacientes."; continua no passo Arquivo.
- **CB-901** · **Mesmo arquivo importado duas vezes:** todas as linhas viram "Já está na conta"; a prévia diz "Nada para importar: todos já estão na conta." e não tem o botão de importar.
- **CB-902** · **UTF-8 com um byte estragado no meio:** a leitura estrita falha e o arquivo inteiro é lido como Windows-1252 (D-903). Se os acentos vierem trocados, o exemplo do passo Colunas já mostra; salvar a planilha em UTF-8 resolve.
- **CB-903** · **Fórmula no XLSX:** vale o valor que o Excel guardou no arquivo; célula de fórmula sem valor guardado fica vazia.
- **CB-904** · **Células mescladas, linhas e colunas vazias no meio:** a linha vazia é ignorada; a célula mesclada vale para a primeira linha dela; a coluna vazia aparece em "Não importar".
- **CB-905** · **Mesmo cabeçalho duas vezes** ("Telefone" residencial e celular): a primeira vai para Telefone, a segunda para "Não importar", e a nutricionista pode mandá-la para Observações.
- **CB-906** · **Datas todas ambíguas** (dia e mês até 12): lidas como dia/mês, o padrão do Brasil.
- **CB-907** · **Ano com dois dígitos:** "12/03/88" é 1988; "12/03/15" é 2015 (D-907). Uma criança de 2015 lida como 1915 seria "Data inválida" pelos 120 anos.
- **CB-908** · **Telefone que o Excel virou número** ("5511987654321" no XLSX): os dígitos são lidos inteiros. No CSV que já chegou como "5,51199E+12", o número se perdeu no arquivo: o telefone entra vazio.
- **CB-909** · **Bebê com menos de 1 ano:** a data entra; o plano continua pedindo 1 ano ou mais, como hoje.
- **CB-910** · **Arquivo renomeado** (um binário chamado `.csv`, um ZIP qualquer chamado `.xlsx`): "Não foi possível ler esta planilha. Use CSV ou XLSX."
- **CB-911** · **Arquivo grande:** a leitura de 2.000 linhas acontece em partes, sem congelar a tela, com "Lendo a planilha…" e "Cancelar", que volta ao passo Arquivo.
- **CB-912** · **Duas abas importando ao mesmo tempo:** a que clica depois vê os pacientes da outra como "Já está na conta" (D-910) e não cria repetido.
- **CB-913** · **Dois aparelhos:** a importação feita no computador aparece no celular depois da sincronia; "Desfazer" num aparelho apaga nos dois, como a exclusão de hoje. Um plano feito noutro aparelho que ainda não chegou fica sem paciente, como quando se exclui um paciente à mão. **Limitação** (revisão de 03/11/2026): o "Desfazer" decide quem mudou pelo que este aparelho já recebeu. Uma edição da ficha feita no outro aparelho e ainda não sincronizada não protege o paciente: a exclusão é a mudança mais nova e vence (D-133 da `dados-na-nuvem`), e a edição se perde com ele.
- **CB-914** · **Sem internet:** a área de trabalho trava como hoje (D-130); a prévia fica na memória da aba e está igual quando a conexão volta.
- **CB-915** · **A sessão termina no meio** (D-517): a prévia, que só existe na memória, se perde; pacientes já criados sobem antes da saída, como qualquer mudança.
- **CB-916** · **Aba fechada durante a leitura ou a prévia:** nada é criado.
- **CB-917** · **Paciente importado excluído à mão antes do "Desfazer":** é ignorado; a contagem do desfazer não o inclui.
- **CB-918** · **Conta de estudante:** importa como as outras; os links continuam limitados a 3.
- **CB-919** · **Sexo "Não binário", "Outro" ou "Prefiro não dizer":** "Sexo não reconhecido". A ficha aceita o sexo vazio; o cálculo do plano pede F ou M, como hoje.
- **CB-920** · **Coluna de objetivo com texto longo (mais de 500 caracteres):** entra inteiro, como no cadastro à mão.
- **CB-921** · **Importação que cabe, mas deixa a conta perto do teto:** cria normalmente. O aviso de teto da nuvem continua sendo o de hoje (CB-123), na próxima mudança que passar.
- **CB-922** · **Ctrl-Z (U+001A) no fim do arquivo** (revisão de 03/11/2026): a linha só com ele é vazia e não vira paciente (D-918).
- **CB-923** · **Caractere de controle no meio do nome ou da observação** (U+0001, U+001F): sai antes de chegar à ficha, ao Word e à nuvem (D-918).
- **CB-924** · **"_x000D_" e "_x005F_" no XLSX:** viram o retorno e o sublinhado (D-918).
- **CB-925** · **Duas linhas do XLSX com o mesmo número:** a segunda vira a seguinte; desmarcar uma não desmarca a outra (D-921).
- **CB-926** · **CSV com milhares de separadores numa linha:** só as 200 primeiras colunas, com o aviso (D-919).
- **CB-927** · **Célula do XLSX em "ZZZZ2" ou além de XFD:** é ignorada; o resto da planilha é lido (D-919).
- **CB-928** · **XML do XLSX com DTD ou entidade:** "Não foi possível ler esta planilha. Use CSV ou XLSX.", sem o navegador ler o XML (D-920).
- **CB-929** · **Entrada do zip que declara ou abre mais de 8 MB** (revisão 2; era 16): não é aberta inteira; a aba é pulada (CB-933), e os textos compartilhados grandes demais dão "Aba grande demais. Salve a aba dos pacientes como CSV." (D-920).
- **CB-930** · **Nome escrito no Mac (NFD):** entra em NFC, e a busca de Pacientes por "João" o acha (D-918).
- **CB-932** · **"_xFFFF_" no XLSX, U+FFFF cru no CSV ou meio par de surrogates** (revisão 2): não chegam à ficha nem ao Word; o meio par vira U+FFFD (D-918).
- **CB-933** · **Pasta com uma aba alheia de mais de 8 MB** (revisão 2): a aba é pulada e a dos pacientes é lida; se nenhuma das outras tem a coluna Nome reconhecida (uma capa, por exemplo), a grande era a dos pacientes: "Aba grande demais. Salve a aba dos pacientes como CSV." (D-920).
- **CB-934** · **`r` perto de 2^53 no XLSX** (revisão 2): passa do máximo de linhas do Excel e vira a seguinte (D-921).
- **CB-931** · **A data do Excel americano com ano de dois dígitos** ("03/25/90", "12/31/85"): a coluna também é lida como mês/dia (CA-1920), com o ano completo pelo CB-907.

## 4. Fora de escopo

- Planos, medidas (peso, altura, dobras), anamnese, exames, suplementos, agenda e próxima consulta, histórico de
  consultas e missões de outro sistema.
- Atualizar ou juntar fichas que já existem (a linha "Já está na conta" fica de fora).
- Ligação direta com WebDiet, Dietbox ou Nutrium (sem arquivo).
- `.xls`, `.ods`, `.numbers`, PDF, Word, vCard e planilha do Google por link.
- Campos novos na ficha (CPF, endereço, convênio).
- Exportar a lista de pacientes em planilha (o backup em arquivo, em Configurações, continua).
- Desfazer depois de 24 horas; arquivos com mais de 2.000 linhas de uma vez.
- Contas com tantos pacientes que a cópia passe de 5 MB: o teto da nuvem (D-107) é de outra spec.

## 5. O que muda em outras specs (antes do código, pelo PLAN)

- `dados-na-nuvem` **DP-34**: o campo da importação (D-912) entra no fim do `Paciente`, depois dos da ficha única.
- `textos-e-promessas` **D-405, CA-1179**: um item novo em `RECURSOS_EM_TODOS_OS_PLANOS` (D-916).
- `estilo-spora` **CA-177, CA-178**: nada muda; o importado só conta quando ganha plano ou link (D-911).
- `seguranca-lote-2` **D-107**: o teto de 5 MB é conferido antes de criar (D-910), não só no envio.

## 6. Telas do protótipo

`ImportarPacientes.dc.html`, interativo, no tema escuro, com uma planilha de exemplo de 9 linhas (8 pacientes
inventados e uma linha repetida):
1. **Arquivo:** a área de soltar com "Escolher arquivo" e, ao lado, as colunas que entram. Um arquivo que não é
   planilha mostra a recusa; um `.xls`, a frase de como salvar.
2. **Colunas:** 8 colunas, 7 reconhecidas, "Peso (kg)" em "Não importar"; os destinos podem ser trocados e, sem nome,
   "Ver prévia" desabilita.
3. **Prévia:** 5 prontos e 4 com problema (uma data inválida, um sexo vazio, uma linha repetida e uma paciente que já
   está na conta); a data e o sexo se corrigem na linha.
4. **Conclusão:** os importados, quem ficou de fora, "Desfazer" e o estado "Importação desfeita."

Não desenhados (seguem o texto desta spec): a escolha da aba do XLSX, a linha de 24 horas em Pacientes, "Importado
em" na ficha e o "Mostrar mais 50".
