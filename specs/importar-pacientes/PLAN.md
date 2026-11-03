# PLAN — Importar pacientes por planilha

**Spec:** `specs/importar-pacientes/SPEC.md` (D-900 a D-917, CA-1900 a CA-1949, CB-900 a CB-921), aprovada pelo dono
em 29/10/2026 junto com o protótipo `ImportarPacientes.dc.html` ("use skills para deixar mais profissional ainda e
mantendo esse mesmo padrão"). Ramo `importar-pacientes`, a partir de `prototipo-importar-marca` (0449af7).

**Stack:** a de sempre. Vitest + Testing Library no domínio e nas telas; Playwright pela linha de comando, com o
servidor falso (`e2e/servidor-falso/`). **Nenhuma dependência nova**, nem de desenvolvimento: o XLSX é aberto com
`DecompressionStream('deflate-raw')` e `DOMParser`, e as planilhas de teste são montadas à mão (zip sem compressão ou
comprimido com `CompressionStream`). **Nenhum SQL novo**: os pacientes sobem pela cópia da conta, como no cadastro à mão.

## Regras que valem em todas as tarefas

- TDD: o teste do critério primeiro, com o ID no nome; ver falhar; depois o código. Um commit por tarefa, em
  Conventional Commits, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- O domínio não conhece a interface: ler, reconhecer colunas, montar a prévia, criar e desfazer ficam em
  `src/domain/importar/`, sem React. A tela só guarda o estado e desenha.
- A planilha só existe na memória da aba (D-914): nada vai para `localStorage`, nuvem, console ou erro. O que sai é o
  paciente criado, pelo repositório de sempre.
- Interface: componente da biblioteca (`@ds`), token do tema, `minmax(0,1fr)` nas grades, nome em até 2 linhas,
  44 px de toque com `sm:pointer-coarse:` e `comToque` (D-800 a D-805). Textos do D-917, sem tagline nem eyebrow.
- Arquivos da "marca no link" (Conta, Configurações, link do paciente, impressão) não são tocados.

## Tarefas, na ordem

### T0 · Plano e notas nas outras specs
- **Cria** `specs/importar-pacientes/PLAN.md` (este arquivo).
- **Altera** `specs/importar-pacientes/SPEC.md`: status "aprovada em 29/10/2026".
- **Altera** as notas da §5 da spec: `specs/dados-na-nuvem/PLAN.md` (DP-34: o campo `importacao` entra no fim),
  `specs/textos-e-promessas/SPEC.md` (D-405: o item novo), `specs/seguranca-lote-2/SPEC.md` (D-107: o teto também é
  conferido antes de importar).
- Depende de: nada.

### T1 · Texto e CSV (D-903)
- **Cria** `src/domain/importar/lerTexto.ts`: `decodificar` (BOM de UTF-8 e UTF-16, UTF-8 estrito, senão
  Windows-1252), `detectarSeparador` (`;`, `,` ou tabulação: o que dá o mesmo número de campos nas primeiras linhas,
  fora das aspas) e `lerRegistros` (RFC 4180, um gerador, com o número de cada registro).
- **Cria** `src/domain/importar/montarArquivos.test-utils.ts`: bytes em Windows-1252, UTF-8 com BOM e UTF-16; zip
  "stored" e comprimido; o XLSX mínimo (pasta de trabalho, abas, textos compartilhados, estilos).
- **Cria** `src/domain/importar/lerTexto.test.ts`: CA-1903, CA-1904, CA-1905, CA-1906, CB-902.
- Depende de: T0.

### T2 · Zip e XLSX
- **Cria** `src/domain/importar/zip.ts`: lê o diretório central, abre a entrada "stored" ou "deflate"
  (`DecompressionStream('deflate-raw')`), com teto de tamanho aberto (DP-IP-3).
- **Cria** `src/domain/importar/lerXlsx.ts`: abas (nome, visível), textos compartilhados, texto em linha, número,
  data pelo estilo ou `t="d"`, `date1904`, valor guardado da fórmula; cada linha com o número dela (DP-IP-10).
- **Cria** `src/domain/importar/zip.test.ts` e `lerXlsx.test.ts`: CA-1907, CA-1908 (as abas), CB-903, CB-904
  (mesclada), CB-908 (telefone em número), CB-910 (zip qualquer).
- Depende de: T1 (montador de arquivos).

### T3 · Ler a planilha: tipo, limites, recusas e cancelar
- **Cria** `src/domain/importar/lerPlanilha.ts`: decide pelo nome (CSV, TXT, TSV, XLSX; `.xls`, `.ods`, `.numbers` e o
  resto com a frase do D-917 e do DP-IP-5), recusa acima de 5 MB sem ler (DP-IP-4), conta as linhas de paciente e
  para na 2.001ª, devolve "vazia" (CB-900) e "ilegível" (CB-910); dá a vez ao navegador em partes e para com o
  `AbortSignal` (CB-911, DP-IP-32).
- **Cria** `src/domain/importar/textos.ts`: as frases do D-917 num lugar só (as telas e os testes leem daqui).
- **Cria** `src/domain/importar/lerPlanilha.test.ts`: CA-1909, CA-1910, CB-900, CB-910, CB-911, DP-IP-11.
- Depende de: T1, T2, T4 (a conta de linhas de paciente precisa do cabeçalho; por isso a T4 é feita antes da T3).

### T4 · Colunas (D-904, D-905)
- **Cria** `src/domain/importar/colunas.ts`: `destinoDoCabecalho`, `analisarAba` (a linha do cabeçalho entre as 10
  primeiras, "Coluna A"…, as linhas de paciente sem as vazias, o exemplo, os destinos iniciais) e `mudarDestino`.
- **Cria** `src/domain/importar/colunas.test.ts`: CA-1911 (um teste por grupo), CA-1912, CA-1913, CA-1914 (sem
  Nome), CA-1915, CA-1917 (contas), CB-904 (coluna vazia), CB-905.
- **Também** `LIMITE_DE_LINHAS` e a conta de linhas de paciente da aba (`excede`), que a T3 usa.
- Depende de: T1 (o registro). Feita antes da T3.

### T5 · Valores (D-907, D-908)
- **Cria** `src/domain/importar/valores.ts`: `lerSexo`, `lerData` (formatos do D-907, série do Excel, ano de dois
  dígitos, data que não existe, futura ou de mais de 120 anos), `ordemDasDatas` (mês/dia na coluna inteira),
  `arrumarNome` (maiúsculas viram nome próprio; partículas em minúscula), `lerTelefone` (notação científica vira
  vazio, CB-908).
- **Cria** `src/domain/importar/valores.test.ts`: CA-1918, CA-1919, CA-1920 (a regra), CA-1921, CB-906, CB-907,
  CB-908, CB-909, CB-919, CB-920.
- Depende de: T0.

### T6 · A prévia (D-908, D-909)
- **Cria** `src/domain/importar/previa.ts`: `montarPrevia` (lê cada linha pelo mapeamento, aplica correções e
  marcas, acha "Igual à linha N" e "Já está na conta" por nome sem acento e data, conta prontos e com problema,
  ordena e pagina; DP-IP-12 a DP-IP-16) e `pacientesParaCriar`.
- **Cria** `src/domain/importar/previa.test.ts`: CA-1916, CA-1920 (o aviso), CA-1922 a CA-1932 no domínio,
  CA-1938, CA-1939, CB-901.
- Depende de: T4, T5.

### T7 · Criar, caber e desfazer (D-910 a D-913, D-915)
- **Altera** `src/domain/pacientes.ts`: `importacao: { id, em } | null` no fim do `Paciente` (DP-34, DP-IP-28), lido
  por `lerImportacao`; `criarVarios` e `excluirVarios` no repositório, cada um numa gravação só (DP-IP-29).
- **Altera** `src/domain/pacientes.test.ts`: CA-1089 com `importacao` no fim; CA-1937 (a ordem).
- **Cria** `src/domain/importar/criar.ts` (no pedaço da tela): `novosPacientes`, `cabeNaCopia` (DP-IP-18) e
  `prepararImportacao`, que confere a lista de novo (DP-IP-17, DP-IP-30) e o teto antes de criar (D-910).
- **Cria** `src/domain/importar/importacao.ts` (sem os leitores: vai no pacote principal): `pacientesQueSaem`
  (DP-IP-19), `importacoesRecentes` e o rótulo da linha das 24 horas (DP-IP-20), o texto do desfeito.
- **Cria** `src/domain/importar/csvDeFora.ts`: o CSV das que ficaram de fora (D-915, DP-IP-22).
- **Cria** `src/domain/importar/criar.test.ts`, `importacao.test.ts` e `csvDeFora.test.ts`: CA-1933, CA-1934, CA-1935, CA-1936,
  CA-1937, CA-1941, CA-1942, CA-1943, CA-1944, CA-1945 (só os criados na cópia), CB-912, CB-917, CB-921.
- Depende de: T6.

### T8 · Todas as assinaturas importam (D-916)
- **Altera** `src/domain/conta.ts`: `'importar-pacientes'` em `IdRecurso` e em `RECURSOS_EM_TODOS_OS_PLANOS`
  ("Importar pacientes de planilha (CSV ou Excel)").
- **Altera** `src/recursosDosPlanos.test.tsx`: a prova (CA-1179) e a tabela de Preços nas três colunas (CA-1949).
- **Altera** `src/ui/publico/SecaoPrecos.test.tsx` (CA-1178): a lista de linhas da tabela ganha o item novo.
  Acrescentado ao implementar: o teste lista as linhas uma a uma.
- Depende de: T3 e T10 (a prova lê a planilha e a rota). Feita depois da T10.

### T9 · Biblioteca: `Passos`, `CaixaDeMarcar` e `ListaNativa` (DP-IP-26)
- **Cria** `design-system/componentes/navigation/Passos.tsx`, `forms/CaixaDeMarcar.tsx` e `forms/ListaNativa.tsx`.
- **Altera** `design-system/index.ts`, `design-system/vitrine/TelaDesignSystem.tsx` (uma seção nova),
  `design-system/componentes/LEIA-ME.md`, `design-system/componentes/componentes.test.tsx`,
  `e2e/design-system.spec.ts` (a seção nova na lista).
- Depende de: T0.

### T10 · Rota, entrada e passo Arquivo
- **Altera** `src/ui/navegacao.ts` (+ `navegacao.test.ts`): `{ tela: 'importar-pacientes' }` ↔ `#/pacientes/importar`.
- **Altera** `src/ui/layout/MenuLateral.tsx`: Pacientes fica marcado também nesta tela.
- **Altera** `src/ui/pacientes/TelaPacientes.tsx`: "Importar planilha" ao lado de "Novo paciente" e de "Cadastrar
  paciente"; prop `aoImportar`.
- **Altera** `src/ui/AreaDeTrabalho.tsx`: a rota, com a tela num pedaço separado (`React.lazy`, DP-IP-1).
- **Cria** `src/ui/pacientes/importar/TelaImportarPacientes.tsx` (a moldura e o estado), `PassoArquivo.tsx` (área de
  soltar, "Escolher arquivo", "Lendo a planilha…", "Cancelar", recusas), `rascunhoDaImportacao.ts` (DP-IP-23) e
  `estadoDaImportacao.ts` (o redutor dos passos).
- **Cria** `src/ui/pacientes/importar/passoArquivo.test.tsx`: CA-1900, CA-1901, CA-1902, CA-1909 e CA-1910 na tela,
  CB-911 (cancelar), CA-1947 (teclado no seletor, foco no título); `rota.test.tsx` (CA-1900 no app inteiro, com o
  pedaço separado); `montarTela.test-utils.tsx` (a tela com os provedores, num armazenamento em memória).
- A tela recebe a moldura (a `Estrutura`) como função, não como componente: assim ela não remonta a cada desenho da
  área de trabalho. Acrescentado ao implementar.
- Depende de: T3, T9.

### T11 · Passo Colunas
- **Cria** `src/ui/pacientes/importar/PassoColunas.tsx`: arquivo, linhas e colunas, "Trocar arquivo", "Aba",
  a tabela "Coluna da planilha · Primeira linha · Vai para" (lista de duas linhas no celular), "Escolha a coluna do
  nome.", "Voltar" e "Ver prévia".
- **Cria** `src/ui/pacientes/importar/passoColunas.test.tsx`: CA-1908, CA-1913, CA-1914, CA-1915, CA-1917 na tela.
- Depende de: T4, T10.

### T12 · Passo Prévia
- **Cria** `src/ui/pacientes/importar/PassoPrevia.tsx` e `LinhaDaPrevia.tsx`: contas, avisos (mês/dia, linhas sem
  nome, nada para importar), "Marcar todas" (DP-IP-14), a linha com caixa, número, nome e e-mail, sexo, nascimento,
  telefone e situação; correção da data e do sexo; "Mostrar mais 50"; "Voltar" e "Importar N pacientes".
- **Cria** `src/ui/pacientes/importar/passoPrevia.test.tsx`: CA-1920, CA-1926 a CA-1932 na tela, CA-1946, CA-1947
  (motivo lido com a linha, erro ligado ao campo), CB-901.
- Depende de: T6, T11.

### T13 · Importar, conclusão e desfazer
- **Cria** `src/ui/pacientes/importar/ConclusaoDaImportacao.tsx`: "N pacientes importados", a frase do limite, os
  importados, "Ficaram de fora" com o motivo, "Baixar as que ficaram de fora", "Desfazer", "Ver pacientes" e o estado
  "Importação desfeita.".
- **Altera** `TelaImportarPacientes.tsx`: confere a lista de novo e o teto antes de criar (D-910, DP-IP-17,
  DP-IP-18), cria de uma vez, desfaz.
- **Cria** `src/ui/pacientes/importar/conclusao.test.tsx`: CA-1933, CA-1935, CA-1936, CA-1940, CA-1941, CA-1942,
  CA-1944 na tela.
- Depende de: T7, T12.

### T14 · Pacientes e ficha: as 24 horas e "Importado em"
- **Cria** `src/ui/pacientes/LinhaDaImportacao.tsx`: "Importação de hoje, 14:32 · 5 pacientes · Desfazer" e o
  "Importação desfeita." depois (DP-IP-20).
- **Altera** `src/ui/pacientes/TelaPacientes.tsx` (a linha no topo; prop `agora` para o teste) e
  `src/ui/pacientes/CartaoDadosDoPaciente.tsx` ("Importado em 29/10/2026", DP-IP-27).
- **Altera** `src/domain/importar/importacao.ts` (+ teste): `diaDaImportacao`, o dia no relógio de quem usa.
- **Cria** `src/ui/pacientes/importar/vinteEQuatroHoras.test.tsx`: CA-1937, CA-1943 na tela.
- Depende de: T7.

### T15 · No navegador
- **Cria** `e2e/servidor-falso/importar-pacientes.spec.ts`: o fluxo inteiro com a conta falsa (CA-1902 soltando e
  escolhendo, CA-1933 com "Salvo"), CA-1945 (a rede inteira interceptada: nenhum pedido leva conteúdo da planilha;
  `localStorage` sem nada dela; a cópia que sobe só com os criados), CA-1946 no navegador, CA-1947 (só teclado),
  CA-1948 (360, 390, 412 e 768 px sem rolagem lateral, 44 px de toque) e CB-911 (2.000 linhas sem travar).
- Depende de: T10 a T14.

### T16 · Acabamento (skills de interface e `break-ui`)
- Rodada de `impeccable polish`, `emil-design-eng` e `break-ui` nas telas prontas: nome enorme, 2.000 linhas,
  colunas estranhas, arquivo em Latin-1. Cada achado vira teste antes da correção, no arquivo da tela.
- Depende de: T15.

### Validação (sem commit)
`npm run check`, `npm run e2e`, `npm run test:csp`; o tamanho do pedaço novo e do principal, antes e depois
(`npm run build:app`); prints de 360, 390 e 1440 px, nos dois temas, em
`scratchpad/importar-pacientes/prints/`.

## Matriz critério → teste

| Critério | Teste |
|---|---|
| CA-1900, CA-1901 | `src/ui/pacientes/importar/passoArquivo.test.tsx` |
| CA-1902 | `passoArquivo.test.tsx`; `e2e/servidor-falso/importar-pacientes.spec.ts` (soltar e escolher) |
| CA-1903 a CA-1906 | `src/domain/importar/lerTexto.test.ts` |
| CA-1907 | `src/domain/importar/lerXlsx.test.ts` |
| CA-1908 | `lerXlsx.test.ts` (abas); `passoColunas.test.tsx` (trocar a aba relê) |
| CA-1909, CA-1910 | `src/domain/importar/lerPlanilha.test.ts`; `passoArquivo.test.tsx` |
| CA-1911, CA-1912 | `src/domain/importar/colunas.test.ts` |
| CA-1913 a CA-1915, CA-1917 | `colunas.test.ts`; `passoColunas.test.tsx` |
| CA-1916 | `src/domain/importar/previa.test.ts` |
| CA-1918, CA-1919, CA-1921 | `src/domain/importar/valores.test.ts` |
| CA-1920 | `valores.test.ts` (a regra); `previa.test.ts` e `passoPrevia.test.tsx` (o aviso) |
| CA-1922 a CA-1926 | `previa.test.ts`; `passoPrevia.test.tsx` (CA-1926) |
| CA-1927 a CA-1932 | `previa.test.ts`; `passoPrevia.test.tsx` |
| CA-1933 | `src/domain/importar/importacao.test.ts`; `conclusao.test.tsx`; e2e ("Salvo") |
| CA-1934 | `importacao.test.ts` |
| CA-1935, CA-1936 | `importacao.test.ts`; `conclusao.test.tsx` |
| CA-1937 | `src/domain/pacientes.test.ts` (ordem); `vinteEQuatroHoras.test.tsx` (ficha) |
| CA-1938, CA-1939 | `previa.test.ts`; e2e (CPF em lugar nenhum) |
| CA-1940 | `conclusao.test.tsx` |
| CA-1941, CA-1942 | `importacao.test.ts`; `conclusao.test.tsx` |
| CA-1943 | `importacao.test.ts`; `vinteEQuatroHoras.test.tsx` |
| CA-1944 | `src/domain/importar/csvDeFora.test.ts`; `conclusao.test.tsx` (o download) |
| CA-1945 | `importacao.test.ts` (a cópia); e2e (rede e armazenamento) |
| CA-1946 | `passoPrevia.test.tsx`, `vinteEQuatroHoras.test.tsx`; e2e |
| CA-1947 | `passoArquivo.test.tsx`, `passoPrevia.test.tsx`; e2e (só teclado) |
| CA-1948 | e2e (360, 390, 412 e 768 px) |
| CA-1949 | `src/recursosDosPlanos.test.tsx` |
| CB-900, CB-910, CB-911 | `lerPlanilha.test.ts`; `passoArquivo.test.tsx` (CB-911); e2e (CB-911, 2.000 linhas) |
| CB-901 | `previa.test.ts`; `passoPrevia.test.tsx` |
| CB-902 | `lerTexto.test.ts` |
| CB-903, CB-904 | `lerXlsx.test.ts`; `colunas.test.ts` (linha e coluna vazias) |
| CB-905 | `colunas.test.ts` |
| CB-906 a CB-909, CB-919, CB-920 | `valores.test.ts`; `lerXlsx.test.ts` (CB-908 no XLSX) |
| CB-912, CB-917, CB-921 | `importacao.test.ts` |
| CB-913 | o caminho de sempre da cópia (D-132): `importacao.test.ts` junta duas cópias com `juntarCopias` |
| CB-914 a CB-916 | `rascunhoDaImportacao` (DP-IP-23): `passoArquivo.test.tsx` (remontar mantém; outra conta, não) |
| CB-918 | nada muda: a importação não olha a assinatura (CA-1949) |

## Decisões tomadas ("apenas faça")

- **DP-IP-1 · Onde mora.** Domínio em `src/domain/importar/`, tudo puro e testado; tela em `src/ui/pacientes/importar/`,
  num pedaço separado do JavaScript (`React.lazy`), pedido só quando a rota abre e guardado pelo service worker com o
  resto. A linha das 24 horas e o "Desfazer" ficam no pacote principal, por `importacao.ts`, que não importa os
  leitores.
- **DP-IP-2 · Planilhas de teste montadas à mão**, sem o `jszip` (pedido do dono, mais estrito que o D-902): zip sem
  compressão e zip comprimido com `CompressionStream`, o que testa os dois caminhos do leitor.
- **DP-IP-3 · Zip com teto.** Entrada criptografada, ZIP64 ou que passa de 64 MB aberta (128 MB no total) vira
  "Não foi possível ler esta planilha. Use CSV ou XLSX." Um arquivo de 5 MB que abre em gigabytes não trava a aba.
- **DP-IP-4 · 5 MB são 5 × 1024 × 1024 bytes**, como o comprovante de matrícula. A frase é a do protótipo aprovado:
  "A planilha passa de 5 MB. Divida em arquivos menores." O arquivo maior não é lido.
- **DP-IP-5 · `.ods` e `.numbers` são planilhas**, então ganham a frase de como salvar (D-901), no molde da do `.xls`:
  "Arquivo .ods. No LibreOffice, salve como .xlsx ou CSV." e "Arquivo .numbers. No Numbers, exporte como .xlsx ou
  CSV." PDF, imagem e o resto: "“arquivo.pdf” não é uma planilha. Use CSV ou XLSX."
- **DP-IP-6 · `.tsv` entra como CSV** com tabulação (D-901 já aceita a tabulação).
- **DP-IP-7 · Sem cabeçalho reconhecido, a primeira linha não vazia já é paciente:** vira o exemplo (CA-1913) e entra
  na prévia. Se ela era um cabeçalho que o app não conhece, aparece na prévia e a nutricionista desmarca.
- **DP-IP-8 · Cabeçalho por igualdade**, sem acento, sem caixa e sem nada que não seja letra ou número ("Dt. nasc." é
  "dtnasc"): "Nome da mãe" não vira Nome.
- **DP-IP-9 · "Primeira linha" é a primeira linha de paciente**; célula vazia mostra "—".
- **DP-IP-10 · Valores do XLSX.** Aba oculta não aparece em "Aba" (se todas forem ocultas, aparecem todas). Número com
  formato de data ou `t="d"` vira a data (AAAA-MM-DD, lida sem ambiguidade); número inteiro vira todos os dígitos
  (CB-908); número com casas decimais usa vírgula; verdadeiro e falso viram "VERDADEIRO" e "FALSO"; erro ("#N/D") fica
  como texto.
- **DP-IP-11 · Limite de linhas por aba.** A primeira aba com mais de 2.000 linhas é recusada no passo Arquivo; outra
  aba acima do limite, escolhida em Colunas, mostra a mesma frase ali e desliga "Ver prévia".
- **DP-IP-12 · As contas da prévia.** "N prontos para importar" são as linhas marcadas, o mesmo N do botão; "N com
  problema" são as não marcadas com problema ou de fora ("Igual à linha N", "Já está na conta"). A linha pronta que
  ela desmarca não entra em nenhuma das duas e mostra "Desmarcada" (CA-1930: as contas mudam).
- **DP-IP-13 · Ordem e páginas.** Até 50 linhas, na ordem da planilha. Acima disso, as que começaram com problema vêm
  antes (a ordem não muda enquanto ela corrige, para a linha não pular), e a lista inteira aparece 50 por vez com
  "Mostrar mais 50".
- **DP-IP-14 · "Marcar todas"** no topo da prévia, para as linhas que podem ser marcadas. Sem a coluna de sexo, toda
  linha começa com "Sexo vazio" e desmarcada: sem isso seriam 300 cliques. A linha com problema marcada assim entra
  sem a data ou sem o sexo, como uma a uma (D-909).
- **DP-IP-15 · A correção da data** é digitada como DD/MM/AAAA (ou AAAA-MM-DD), sempre dia/mês, mesmo numa coluna lida
  como mês/dia. Data válida marca a linha; inválida desmarca (volta a "Data inválida"); campo vazio é "sem data", e a
  linha fica pronta.
- **DP-IP-16 · Data inválida conta como "sem data"** na comparação de mesma pessoa (D-908).
- **DP-IP-17 · Lista que mudou no clique.** Se outra aba ou aparelho criou alguém da planilha entre a prévia e o
  clique, nada é criado e a prévia diz "A lista de pacientes mudou. Confira a prévia antes de importar." (D-910 não
  tinha a frase; sem ela, o clique pareceria não ter feito nada).
- **DP-IP-18 · O teto medido.** A cópia que subiria (`montarCopia` com os novos e as marcas deles), em bytes UTF-8 do
  texto JSON, até 5 × 1024 × 1024. Mede um pouco a mais que o `pg_column_size` do banco (o jsonb não guarda as barras
  de escape), então nunca deixa passar o que o banco recusaria. "Cabem mais N" conta na ordem da planilha.
- **DP-IP-19 · Quem sai no "Desfazer".** O paciente da importação que ainda existe, com o `atualizadoEm` igual à hora
  da importação (nenhuma edição), sem plano e sem link (o do plano dele ou o que aponta para ele). Uma gravação só
  (`excluirVarios`), com a lápide de sempre: o outro aparelho também apaga (CB-913).
- **DP-IP-20 · A linha das 24 horas.** Uma por importação de menos de 24 horas que ainda tem quem desfazer; "de hoje"
  ou "de ontem"; o número é o de pacientes daquela importação que continuam na conta. Depois do "Desfazer" ali, a
  linha vira "Importação desfeita." (e quantos ficaram).
- **DP-IP-21 · Listas da conclusão** 50 por vez, com "Mostrar mais 50". "Ficaram de fora" junta as linhas sem nome
  numa só ("3 linhas sem nome"); o CSV leva cada uma, com o motivo "Sem nome".
- **DP-IP-22 · O CSV de fora.** O separador do CSV original; do XLSX, ponto e vírgula (o do Excel no Brasil). Fim de
  linha CRLF, aspas da RFC 4180, apóstrofo antes de `=`, `+`, `-`, `@` e também de tabulação e retorno (OWASP). Nome
  `ficaram-de-fora.csv`, sem dado de pessoa.
- **DP-IP-23 · O rascunho na memória.** Fica num `WeakMap` com a chave do armazenamento da conta: sobrevive à
  remontagem quando a nuvem traz mudança (DP-18 da `dados-na-nuvem`) e à trava sem internet (CB-914); morre com a
  sessão, que troca o armazenamento (CB-915), e com a aba (CB-916). Nada vai para o `localStorage`.
- **DP-IP-24 · No celular**, abaixo de 640 px, o título da área é "Escolha a planilha": não há o que soltar.
- **DP-IP-25 · Arquivo solto fora da área** não abre no navegador (que trocaria de página e perderia a prévia).
- **DP-IP-26 · Três componentes novos na biblioteca:** `Passos` (navegação de passos, com o feito, o atual e o
  próximo), `CaixaDeMarcar` (a caixa de marcar com 44 px de toque e rótulo visível ou só para leitor de tela) e
  `ListaNativa` (o `<select>` do navegador com o desenho do `Input`, como as listas do app já são). Os três aparecem na
  vitrine.
- **DP-IP-27 · "Importado em 29/10/2026"** abaixo do título "Dados do paciente", em texto apagado.
- **DP-IP-28 · O campo** `importacao: { id, em } | null`, no fim do `Paciente` (DP-34). O teste CA-1089 passa a
  esperar `importacao` por último.
- **DP-IP-29 · O repositório ganha `criarVarios` e `excluirVarios`**, cada um numa gravação: "de uma vez" (D-910) e o
  desfazer.
- **DP-IP-30 · "Já está na conta" no clique** compara com `repositorio.listar()`, lido do armazenamento na hora, não
  com a lista que a tela tinha.
- **DP-IP-31 · O sexo da linha** se corrige numa lista "—, F, M", como no protótipo.
- **DP-IP-32 · Leitura em partes:** o CSV dá a vez ao navegador a cada 500 registros e o XLSX a cada 250 linhas, e
  os dois param no "Cancelar", que volta ao passo Arquivo.
- **DP-IP-33 · Nome próprio:** as palavras se separam por espaço, hífen e apóstrofo ("MARIA-CLARA D'ÁVILA" vira
  "Maria-Clara D'Ávila"); de, da, do, das, dos e "e" ficam em minúscula, menos na primeira palavra.
- **DP-IP-34 · Telefone em notação científica** ("5,51199E+12"), só possível no CSV, entra vazio (CB-908).
- **DP-IP-35 · Número de série do Excel no CSV:** na coluna de nascimento, um número de 1 a 2958465 é lido como a
  data do Excel (D-907).

## Riscos

- **R-IP-1 · Conflito com a "marca no link".** As duas mexem em `RECURSOS_EM_TODOS_OS_PLANOS` (`src/domain/conta.ts`)
  e em `src/recursosDosPlanos.test.tsx`: lá muda o texto do item do logotipo; aqui entra um item novo no fim. A junção
  é de linhas vizinhas, sem decisão a tomar.
- **R-IP-2 · Portas do Playwright.** Os servidores de teste usam portas fixas (4173, 4176, 4178) e a pasta
  `node_modules/.tmp`, que a junção divide com as outras worktrees. Rodar o e2e junto com outra frente derruba um dos
  dois; a validação confere as portas antes.
- **R-IP-3 · O teste CA-1089** (spec `ficha-unica`) muda: a lista de campos depois de `pedidoExames` ganha
  `importacao` no fim, como o DP-34 manda.
