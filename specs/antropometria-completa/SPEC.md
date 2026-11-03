# SPEC — Antropometria completa: o motor (sem tela)

Status: **pedida em 03/11/2026**, sob o "apenas faça". As decisões abaixo seguem a pesquisa e os princípios do produto
e estão escritas para o dono e a Mor revisarem. A tela de Antropometria está em protótipo para o dono aprovar e **não**
faz parte desta spec.

**Revisão independente (03/11/2026): NÃO APROVADO.** Os coeficientes estão todos certos; os problemas estavam na lógica
clínica. A rodada revisa, com o motivo, as decisões D-1005, D-1007, D-1009, D-1025, D-1026, D-1030, D-1032 a D-1036 e as
regras de duplicação, e cria as D-1038 a D-1041, os CA-2071 em diante e os CB-1016 em diante. Cada item da revisão
tem o seu commit (spec, teste que falha, código).

**Rodada 2 da revisão (03/11/2026):** um item obrigatório (o motivo da recusa das dobras chega à linha, D-1042) e seis
recomendações leves. Revisa as D-1015, D-1032, D-1034, D-1036, D-1038 e D-1039, o CA-2074, o CA-2079 e o CB-1009, e
cria a D-1042 e os CA-2088 em diante, cada item com o seu commit.

**Pedido:** a parte pura de domínio da antropometria completa do MetaNutri: as medidas novas no plano, os protocolos de
dobras, os indicadores no formato "Real | Recomendação | Situação" e o "Ponto de partida" da dieta. Tudo em
`src/domain`, com testes, sem React.

**Fonte da verdade científica:** a pesquisa de 03/11/2026 (`pesquisa-antropometria.md`, fora do repositório, seções 1 a
4; as tabelas de Frisancho do anexo 3.18 foram copiadas sem edição para `dados-brutos/antropometria/`). Marcas da
pesquisa: **[V2]** conferido em duas fontes; **[V1]** uma fonte; **[NV]** não verificado. **Nada [NV] entra no
código.** Onde a pesquisa achou erro de transcrição numa fonte de segunda mão (27 erros na seção 2.4.4 e os da 3.17),
vale o valor que ela confirmou no original.

**Hoje:** o plano tem peso, estatura, cintura, panturrilha, 6 dobras e a bioimpedância. O motor tem o IMC, as curvas
da OMS, a gestação, a cintura e a panturrilha (`antropometria.ts`) e dois protocolos de dobras (`composicao.ts`). O
campo `objetivo` do plano existe e não é usado em conta nenhuma.

**Objetivo:** quando a tela vier, ela só desenha. Cada número que a tela mostra sai daqui, com a fonte, a recomendação e
a situação, e com `null` (nunca 0) quando falta dado.

## 1. Escopo

**Entra:** o modelo das medidas novas e a leitura retrocompatível dos planos gravados; o catálogo de protocolos de
dobras com as equações e a conversão de densidade; os indicadores; o ponto de partida (gasto de repouso, proteína,
prioridade, meta de perda e mudança mínima detectável).

**Fora de escopo** (vem depois, cada um com spec própria ou na spec da tela):

- **A tela** de Antropometria, a tabela "Real | Recomendação | Situação", as cores do selo, o "?" de ajuda com texto e
  imagem, o PDF, o e-mail, as fotos e os anexos. A tela vem quando o dono aprovar o protótipo.
- **O seletor de protocolo gravado no plano.** `composicao.protocolo` continua aceitando só os dois protocolos de hoje,
  porque a tela atual depende desse tipo; a tela nova amplia o tipo para todos os protocolos deste motor (D-1007).
- **Quais campos aparecem por idade** (regras R7, R8 e D-458 da `ficha-unica`): mudam com a tela, não aqui.
- **Validação de faixa das medidas novas:** as faixas da pesquisa (1.7 B) não têm fonte e esperam a Mor.
- **Estados especiais da dobra** ("não obtida", "acima da capacidade do compasso"), as três repetições de cada medida,
  o compasso usado e o lado esquerdo com motivo (pesquisa 1.9, D5, D7, D8 e D4).
- **Evolução entre consultas** (gráficos), o ETM guardado por avaliador e a "etiqueta de progresso" da ABESO/SBEM 2022.
- A **meta de água** continua como está (peso ideal de IMC 25, `agua.ts`); D-1027 explica por que as duas contas
  conversam.
- Tudo o que a seção 5 lista como fora por ser [NV] ou por decisão.

## 2. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-1000 | **Motor puro.** Funções pequenas, sem React, sem rede, sem disco e sem estado. Unidade no nome ou no tipo de cada entrada e saída (`Cm`, `Mm`, `Kg`, `%`, `cm²`). Falta de dado vira `null` com o motivo, nunca 0 nem exceção | Pedido: "tudo puro"; a tela mostra "—" e a frase do que falta |
| D-1001 | **Arredondar só na exibição.** O motor devolve o valor sem arredondar e diz com quantas casas ele aparece (`casas`). A situação é decidida com o valor **nas mesmas casas** que a tela mostra, para o número e o rótulo nunca discordarem (24,996 aparece "25,00" e sai "Sobrepeso") | Pedido + regra 2 da seção 3 da pesquisa. O painel de hoje (1 casa no IMC, classe pelo valor cru) não muda; a tela nova usa este motor |
| D-1002 | **Onde moram as medidas.** As de hoje não mudam de lugar: a cintura em `circunferenciaCinturaCm`, a panturrilha em `circunferenciaPanturrilhaCm` (a **direita**, D-1003) e as 6 dobras em `composicao.dobras`. As 4 dobras novas (bicipital, supraespinal, axilar média e panturrilha medial) entram em `composicao.dobras`, ao lado das outras. As circunferências, os diâmetros, a altura do joelho e a semienvergadura entram num grupo novo, `medidasCorporais`. Plano novo nasce com tudo vazio; plano gravado antes abre com os campos novos vazios e os de antes com o mesmo valor | "Os campos atuais continuam sendo os mesmos dados"; um plano antigo abre igual |
| D-1003 | **Lado.** O direito é o padrão (todas as fontes primárias, pesquisa 1.1.3). Braço relaxado, braço contraído, coxa, coxa proximal e panturrilha têm direito e esquerdo; antebraço e punho, um campo só. A panturrilha de hoje é a direita. Quando o indicador precisa de um lado e só o outro foi medido, ele usa o outro e diz qual | Pedido (lista de campos) e pesquisa 1.1.3 e 1.9 D4 |
| D-1004 | **Ponto da cintura**, guardado com a medida: ponto médio entre a última costela e a crista ilíaca (OMS), topo da crista ilíaca (NIH) ou menor perímetro. Vazio quer dizer "não registrado" (todo plano antigo). Cada corte só vale no ponto em que foi criado (pesquisa 1.3): **ponto médio ou não registrado** → cortes da OMS (cintura, RCQ e RCE), e o não registrado ganha o aviso "o ponto não foi registrado: a referência assume o ponto médio"; **crista ilíaca** → corte do NIH na linha da cintura (> 102 / > 88 cm) e RCQ e RCE sem situação; **menor perímetro** ou valor desconhecido → nenhuma situação, com aviso. Na prioridade (D-1032), a cintura vale no ponto médio, no não registrado e na crista ilíaca (os cortes do NIH e de Ross admitem os dois pontos); a RCE só no ponto médio ou não registrado | Pesquisa 1.3, 1.9 D1 e D2, 3.4, D-A14 |
| D-1005 | **Dobras: nomes do app.** `tricipital`, `bicipital`, `subescapular`, `suprailiaca`, `supraespinal`, `abdominal`, `axilarMedia`, `peitoral`, `coxa` e `panturrilhaMedial`, em mm. A supraespinal (ISAK) é outro ponto, não é a suprailíaca (quadro da pesquisa 1.4); nenhum protocolo deste motor a usa ainda, mas ela fica guardada *Revista (item 5):* a suprailíaca ganha a linha, com os nomes do protótipo: `suprailiacaAnt` (linha axilar anterior) e `suprailiacaMed` (linha axilar média). `suprailiaca` fica com o valor dos planos de antes, de linha não informada (D-1039) | Pedido (lista de dobras) e pesquisa 1.4 |
| D-1006 | **Protocolos do lançamento:** só os [V2] da tabela "Lançamento" da pesquisa (2.5.2), na ordem: Jackson & Pollock 3 dobras (JP78 Eq5 no homem; JPW80 na mulher), Jackson & Pollock 7 dobras (JP78 Eq1; JPW80), Durnin & Womersley 1974, Petroski 1995 (homem 4 dobras; mulher 3 dobras com massa e estatura), Guedes 1985, Faulkner (Yuhasz), Slaughter 1988 com tríceps e subescapular e Slaughter com tríceps e panturrilha medial. Weltman (mulheres obesas) também é [V2], mas pede duas circunferências abdominais que o modelo não tem: fica para a tela | Pesquisa 2.5.2 e D1 da 2.7 |
| D-1007 | **Ids.** `jackson-pollock-3` e `faulkner-4` continuam querendo dizer o que dizem hoje (os mesmos coeficientes de `composicao.ts`), para o plano gravado não mudar de número. Os novos: `jackson-pollock-7`, `durnin-womersley`, `petroski`, `guedes`, `slaughter-triceps-subescapular` e `slaughter-triceps-panturrilha`. O tipo gravado no plano só é ampliado com a tela *Revista (item 4):* os dois ids de hoje convertem por **Siri em qualquer idade**, como `composicao.ts`, quando a nutricionista não escolhe outra conversão: nenhum número já mostrado muda sem aviso. Esta é a exceção à D-1009; os protocolos novos usam a automática | O seletor de hoje depende do tipo; mudar o tipo agora obrigaria a mexer na tela. Revisão: abaixo de 20 anos, a automática mudaria o % de planos já gravados |
| D-1008 | **Forma das equações.** Jackson & Pollock na forma quadrática (as versões com ln ficam fora, [V1]). O tipo de logaritmo é um dado de cada protocolo, nunca deduzido do nome: Durnin & Womersley e Guedes usam log10 (`Math.log10`) | Pesquisa 2.4.1 e D2 |
| D-1009 | **Conversão da densidade.** Três escolhas: **automática** (padrão: constantes de Lohman de 7 a 19 anos, por sexo e idade; Siri de 20 anos em diante, homens e mulheres, inclusive acima de 50), **Siri** e **Brozek** (em qualquer idade, quando a nutricionista escolhe). As equações que já dão % de gordura (Faulkner e Slaughter) não passam por conversão nenhuma *Revista (item 4):* a automática é o padrão dos protocolos novos, não dos dois de hoje (D-1007). A saída sempre diz a conversão usada; com Lohman, o aviso diz que aos 20 anos a conta passa para Siri e o % muda de degrau sem a dobra mudar | Pesquisa 2.3 e D4 (revisão clínica). Brozek é [V1] (só o bodycomp e um resumo de busca) |
| D-1010 | **Fora da população de origem.** O protocolo não calcula só quando falta o sexo, falta uma entrada da equação ou o sexo não é o da equação. Idade fora da faixa da amostra calcula e avisa "fora da população de origem", com a faixa. Na gestação, nenhum protocolo de dobras calcula (D-458 da `ficha-unica`) | Pesquisa 2.7 D5 |
| D-1011 | **Durnin & Womersley:** a faixa sai da idade em anos completos (homens 17–19, 20–29, 30–39, 40–49, 50+; mulheres 16–19, 20–29, 30–39, 40–49, 50+). Abaixo da primeira faixa, vale a equação "todas as idades" (homens 17–72; mulheres 16–68), com o aviso de fora da população; acima de 72 (homens) ou 68 (mulheres), a faixa 50+ com o mesmo aviso. A nutricionista pode pedir a "todas as idades" em qualquer idade | Pesquisa 2.2.4 e D10 |
| D-1012 | **Slaughter.** Com tríceps + subescapular de 35 mm exatos vale a quadrática (o ramo "até 35"). Nos meninos com soma até 35 mm a equação pede o estágio de maturação sexual (Tanner 1–2, 3 ou 4–5) e o grupo do estudo (branco ou negro); sem eles, a conta diz que falta. Essas duas entradas são do motor: o plano ainda não as guarda (a tela decide onde perguntar). A tela deve dizer que o grupo é a classificação do estudo e não foi validado para a população brasileira | Pesquisa 2.2.8, D6 e D7 |
| D-1013 | **Guedes com 5 casas** (1,17136 − 0,06706 · log10 Σ nos homens; 1,16650 − 0,07063 · log10 Σ nas mulheres). As versões [V2] de 4 casas são o arredondamento delas, e o teste confere isso | Pesquisa 2.2.6 e D8 |
| D-1014 | **"Faulkner (Yuhasz)".** O nome diz de onde a equação veio; a 4ª dobra é a abdominal ("umbilical" no original); o resultado leva sempre o aviso "amostra de origem desconhecida; só há indicação para homens jovens treinados". Calcula para os dois sexos, como hoje | Pesquisa 2.2.7 e D9 |
| D-1015 | **Resultado implausível** (% de gordura igual ou abaixo de 0, ou 70 ou mais) não sai: "As dobras informadas levam a um resultado fora do plausível. Confira as medidas." *Revista (rodada 2, D-1042):* o motivo passa a "O % calculado fica fora do plausível: confira as medidas ou informe o % da bioimpedância." e chega à linha | A mesma regra de `composicao.ts` |
| D-1016 | **A linha do resultado.** Cada indicador devolve: nome, valor (sem arredondar), unidade, casas, **recomendação** (texto e faixa com os limites e se cada um entra), **situação** (rótulo e nível: adequado, atenção, alterado, grave ou informativo, que a tela traduz em cor), **fonte** (citação curta e completa), detalhes (valores de apoio, como o percentil ou o IMC da criança) e avisos. Indicador que não vale para a pessoa não vem (`null`); indicador que vale e não tem dado vem com valor `null` e a lista do que falta | Pedido (item 3) e lacunas 2a ("mostrar — e a frase do que falta") |
| D-1017 | **IMC por fase da vida.** Adulto (20–59): as faixas do SISVAN de hoje (`antropometria.json`) com os graus de obesidade da OMS 2000, recomendação "18,50 – 24,99 kg/m²" (não "18,50 – 25,00", que é ambíguo no 25), 2 casas. Idoso (60+): SISVAN (Lipschitz/NSI 1994), "≤ 22,0" baixo peso, "> 22,0 e < 27,0" eutrofia, "≥ 27,0" sobrepeso, recomendação "> 22,0 e < 27,0 kg/m²", com a nota de que a Caderneta da Pessoa Idosa usa "< 22" e "> 27" (só muda em 22,0 e 27,0 exatos). Criança e adolescente (1–19): o escore-z e a classe da OMS de hoje, recomendação "escore-z de −2 a +1". Gestante: o IMC pré-gestacional e o ganho de peso de hoje (Kac 2021) | Pedido; pesquisa 3.1 (D-A1, D-A3); as faixas já aprovadas na `planejador-metanutri` e na `ficha-unica` |
| D-1018 | **% de gordura por Gallagher et al. 2000** (brancos e afro-americanos, 20 a 79 anos, por sexo e idade; a recomendação é a faixa "Saudável" da linha do paciente). Fora de 20–79: o valor sai sem situação ("sem referência para a idade"). O método vai junto (protocolo ou bioimpedância). **Massa gorda e massa magra** (massa livre de gordura, peso − massa gorda) saem só com o valor: nenhuma faixa tem fonte. **Soma de dobras**: soma das dobras exigidas pelo protocolo, sem referência; incompleta, não vira número: diz o que falta e a soma parcial | Pesquisa 3.2 (D-A5), 3.3 (D-A15) e seção 0, item 4 |
| D-1019 | **% de gordura de onde?** Das dobras, quando o protocolo do plano calcula; senão, da bioimpedância, quando ela tem o %. Nenhum dos dois: a linha diz o que falta | A bioimpedância já existe no plano (`completarBioimpedancia`) |
| D-1020 | **Cintura pela OMS em dois níveis, com "≥"** (≥ 94 e ≥ 102 cm no homem; ≥ 80 e ≥ 88 cm na mulher), adulto de 20 anos ou mais fora da gestação, com os rótulos de hoje ("Sem risco aumentado", "Risco aumentado", "Risco substancialmente aumentado"). Recomendação "Abaixo de 94 cm" / "Abaixo de 80 cm". Ponto: D-1004 | Pesquisa 3.4 (D-A7); `antropometria.json` |
| D-1021 | **RCQ** = cintura ÷ quadril, 2 casas, adulto fora da gestação. Padrão OMS (WHO 2011, Tabela A1): ≥ 0,90 no homem e ≥ 0,85 na mulher, "Risco substancialmente aumentado". Opção Bray & Gray 1988 (in Heyward & Stolarczyk 1996), de 20 a 69 anos, com os quatro riscos por idade e sexo (é a régua do "Abaixo de 0,83" do Dietbox); fora de 20–69, volta para a OMS e avisa | Pesquisa 3.5 (D-A10) |
| D-1022 | **RCE** = cintura ÷ estatura, 2 casas, adulto fora da gestação, faixas do NICE NG246 (< 0,40 abaixo da faixa de referência, sem rótulo de risco; 0,40–0,49 saudável; 0,50–0,59 risco aumentado; ≥ 0,60 risco alto; rótulos traduzidos por nós). Com IMC ≥ 35 o NICE não vale: valor sem situação e aviso | Pesquisa 3.6 (D-A11). O corte 0,5 é [V2] (Ashwell + ABESO); as faixas do NICE, [V1] |
| D-1023 | **Pescoço só com o corte conferido:** Ben-Noun 2001, ≥ 37 cm (homem) e ≥ 34 cm (mulher) [V2], dois níveis com rótulos nossos ("Sem indicação de excesso de peso" / "Indica avaliar excesso de peso"). O segundo nível (39,5 / 36,5) é [V1] e fica fora; os cortes brasileiros do BRAMS são [NV] | Pedido ("só se estiver conferido"); pesquisa 3.7 (D-A12) |
| D-1024 | **Braço.** CB do braço relaxado (direito; sem ele, o esquerdo), DCT = dobra tricipital. CMB = CB − π · DCT/10; AMB = CMB²/4π; **AGB = CB²/4π − AMB, sempre com a AMB sem correção**; AMB corrigida (Heymsfield 1982) = AMB − 10 (homem) ou − 6,5 (mulher), **só de 18 anos em diante**. π exato. Cada valor só se compara com a tabela da mesma família: CB, DCT, AMB corrigida e AGB com Frisancho 1990; CMB com Frisancho 1981 (a única com CMB); abaixo de 18 anos, a AMB sem correção com Frisancho 1981 (original, sem inferência de família) | Pesquisa 3.10, 3.12, 3.13 (D-B1, D-B4) |
| D-1025 | **Situação do braço pelo esquema do São Camilo 2025** (Frisancho 1990): gordura e tamanho (CB, DCT, AGB) "< P5 Desnutrição", "P5 a < P15 Risco para desnutrição", "P15 a P85 Eutrofia", "> P85 Obesidade"; músculo (CMB, AMB) "< P5 Deficiência de massa magra", "P5 a < P10 Baixa massa magra", "P10 a P90 Eutrofia", "> P90 Musculatura desenvolvida". O valor igual ao percentil de corte fica na faixa de cima até a eutrofia e dentro dela no teto (P85 e P90 ainda são eutrofia). Recomendação: a faixa de eutrofia da linha do paciente. O detalhe diz entre quais percentis o valor caiu. De 75 anos em diante, Frisancho 1990 não cobre: valores sem situação *Revista (item 6):* o critério do São Camilo é de adultos. Abaixo de 18 anos, as linhas do braço trazem o valor e o percentil (no detalhe), sem recomendação nem situação, com o aviso; a pesquisa não traz critério pediátrico com fonte para esses percentis | Pesquisa 3.12 (D-B2, D-B3, D-B9: a tabela de 2008 é [V1] com células suspeitas e fica fora); os manuais de São Camilo, CEPRAN e UFMA são de adultos |
| D-1026 | **Adequação** = valor ÷ P50 × 100: CB e DCT com o P50 de Frisancho 1990; CMB com o de 1981. Faixas de Blackburn & Thornton segundo os manuais brasileiros, com os sinais do UFMA (Quadro 7): ≤ 70 grave; > 70 a 80 moderada; > 80 a 90 leve; > 90 a 110 eutrofia; > 110 a 120 sobrepeso; > 120 obesidade. Na CMB não há faixa de excesso (> 90 é eutrofia, sem teto). 1 casa. A fonte cita os manuais (CEPRAN 2014 e UFMA 2022), não o original, que não foi lido *Revista (item 6):* a adequação vem de 18 anos em diante; abaixo disso, as três linhas não vêm | Pesquisa 3.11 (D-B3, D-B4); Blackburn e Thornton avaliam o adulto hospitalizado |
| D-1027 | **Peso ideal, ajustado e de referência.** Peso ideal = IMC-alvo × estatura² (m), com o IMC-alvo editável, de 20 anos em diante, fora da gestação. Padrão do adulto pela compleição (pequena 18,50; média 21,75; grande 24,99; sem compleição, 21,75); padrão do idoso 24,5 (o meio da faixa de eutrofia do SISVAN, 22 a 27, e a opção de IMC 24,5 da pesquisa). A faixa vem junto: IMC 18,50 a 24,99 no adulto e > 22 a < 27 no idoso, × estatura². **Peso ajustado** = (peso atual − PI₂₅) × 0,25 + PI₂₅, com PI₂₅ = 25 × estatura², a partir de IMC 30 (opção: acima de 27): é a mesma conta da meta de água (`agua.ts`), para a tela e a água mostrarem o mesmo número. **Peso de referência** (proteína, R4.3a): IMC < 30, o peso atual; IMC ≥ 30, as opções peso ideal, peso ajustado e massa magra, sem escolha prévia | Pesquisa 3.15 (D-B6, D-B7) e 4.3 (R4.3a, D4). O 0,25 é [V2]; o IMC-alvo por compleição, [V1] (São Camilo); o PI no limite do IMC para o ajustado é a regra do São Camilo (item 3.3) e da ESPEN 2019 |
| D-1028 | **Compleição pelo punho (Grant), versão A** (São Camilo 2025 + CEPRAN 2014): r = estatura ÷ circunferência do punho, 1 casa; homem > 10,4 pequena, 9,6–10,4 média, < 9,6 grande; mulher > 11,0 pequena, 10,1–11,0 média, < 10,1 grande. Informativa (não é risco). De 20 anos em diante. Pelo cotovelo, não: a tabela de Frisancho é [NV] | Pesquisa 3.14 (D-B5, L-B4) |
| D-1029 | **Panturrilha do idoso como hoje** (D-460 da `ficha-unica`: Pagotto 2018, < 34 cm no homem e < 33 cm na mulher indicam redução de massa muscular; a nota dos 31 cm da OMS vem junto), de 60 anos em diante. Lê a direita (o campo de hoje); sem ela, a esquerda, e diz o lado | Decisão já aprovada; a pesquisa (3.8) recomenda o MS < 31 como padrão, o que é decisão do dono e da Mor numa revisão da D-460 |
| D-1030 | **Estimativas de altura e peso** (resultado sempre "estimado", com a fonte e o erro). Idoso (60+): altura por Chumlea 1985 (altura do joelho, medida deitado; erro de ± 6 cm em 90% das pessoas; fora de 60–90 anos, aviso) e peso por Chumlea 1988 (CB, panturrilha, subescapular e altura do joelho; erro-padrão não publicado nas fontes lidas). Adulto: altura por Rabito 2006 VII (semienvergadura, sexo e idade; erro médio 2,2%) e peso por Rabito IV (CB, abdômen e panturrilha; 6,7%), V (mais o sexo; 6,0%) e III (mais a subescapular; 7,0%). Em Rabito, sexo 1 = masculino e 2 = feminino, e a constante da V é **−32,9241** (a tabela do original imprime "±"). A lista volta com a recomendada primeiro (D-B8): no idoso, Chumlea e depois Rabito (V, IV, III no peso); no adulto, Rabito (V, IV, III no peso). A que não tem dado diz o que falta. Abaixo de 18 anos e na gestação, nenhuma *Revista (item 10):* Rabito mediu no lado esquerdo ("The measurements were made on the left side of the body", Métodos do original, conferido em 03/11/2026): nas equações de Rabito, a CB e a panturrilha vêm do lado esquerdo e, sem ele, do direito. Chumlea segue o padrão do app (direito, D-1003). Cada estimativa diz o lado usado | Pesquisa 3.16 (D-B8); Rabito et al. 2006, Métodos |
| D-1031 | **Gasto de repouso pela massa magra (Cunningham), como faixa.** Adulto (18+) fora da gestação, com % de gordura: Cunningham 1991 (370 + 21,6 × MLG) no geral; Cunningham 1980 (500 + 22 × MLG) para ativo ou atleta com IMC < 30. Faixa = valor ± √((b × peso × 0,035)² + 140²), com b o coeficiente da MLG; a tela arredonda os extremos para dezenas. Sempre: "Katch-McArdle é a mesma fórmula de Cunningham 1991" e "estimativa; a calorimetria indireta é o padrão". Atleta: "em atletas, todas as equações tendem a subestimar o gasto". IMC ≥ 30: comparar com a equação por peso | Pesquisa 4.2 (R4.2a–f, D2, D3). O ± 140 kcal é emprestado de ten Haaf 2014 e a tela diz isso |
| D-1032 | **Proteína pelo objetivo do plano** (o campo `objetivo`, sem uso até hoje), com a base de cálculo sempre ao lado (R4.3b), de 18 anos em diante, fora da gestação e da lactação: idoso (65+) 1,0–1,2 g/kg de peso; idoso ativo ou atleta ≥ 1,2; idoso com doença aguda ou crônica 1,2–1,5 (PROT-AGE 2013; ESPEN 2014). Abaixo de 65: "ganhar" ~1,6 g/kg de peso, até 2,2 (Morton 2018, com treino resistido); "manter" ativo ou atleta 1,4–2,0 (ISSN 2017); "emagrecer" com IMC ≥ 30 1,2–1,5 g/kg do peso de referência escolhido (proposta nossa, sem diretriz de consultório); "emagrecer" ativo ou atleta com IMC < 30 e % de gordura 2,3–3,1 g/kg de **massa magra** (Helms 2014), com o equivalente em g/kg de peso. Sem número conferido (adulto sedentário mantendo ou emagrecendo sem obesidade; a RDA de 0,8 g/kg é [NV]), não há sugestão, e o motivo diz isso. Doença renal com TFGe < 30 sem diálise: nenhuma sugestão, com o alerta do PROT-AGE *Revista (item 8):* a faixa de Helms (2,3–3,1 g/kg de massa magra) só vale para o **atleta magro**, a população de origem (fisiculturistas naturais em preparação, magros e treinados, Helms 2014): % de gordura abaixo do início do sobrepeso de Gallagher para o sexo e a idade (de 20 a 79 anos), com o aviso dessa população. O atleta sem esse % (ou fora de 20–79) e o ativo, ao emagrecer com IMC < 30, ficam com a ISSN (1,4–2,0 g/kg de peso) *Revista (rodada 2):* o corte de "magro" (abaixo do início do sobrepeso de Gallagher) é nosso, não de Helms: a sugestão de Helms leva a evidência `proposta-do-app` e o aviso fixo da D-1036; a fonte da faixa continua Helms 2014 | Pesquisa 4.3 (R4.3a–f, D4, D5, D6). O perfil (sedentário, ativo ou atleta), a doença e a função renal são entradas do motor: o plano ainda não os guarda |
| D-1033 | **Nível de prioridade de 0 a 4 por IMC, cintura e RCE** (R4.4a da pesquisa, exatamente): cada gatilho que dispara entra na lista com a fonte, e o nível é o maior. IMC com 2 casas, RCE com 2 casas, cintura alta = > 102 (homem) / > 88 (mulher). Adulto de 18 anos em diante, fora da gestação. Sem cintura: aviso "cintura não medida: a prioridade pode estar subestimada". IMC baixo (GLIM: < 20 abaixo de 70 anos, < 22 de 70 em diante) liga a sobreposição "risco nutricional" (R4.4b), que vale mais que qualquer meta de perda. O texto fala em "risco pelas medidas antropométricas", nunca em "risco do paciente" *Revista na revisão independente (item 1):* no idoso (60+), a faixa de sobrepeso da matriz do NHLBI começa em 27, o sobrepeso do SISVAN (Quadro 18), e não em 25: IMC de 25 a < 27 não dispara gatilho de IMC. A sobreposição de risco nutricional também liga no idoso com a panturrilha abaixo do corte da D-1029 (R4.4b). O aviso do idoso lembra a faixa de referência, > 22 e < 27 (R4.4c) | Pesquisa 4.4 (R4.4a–f, D7, D8); SISVAN 2011, Quadro 18 |
| D-1034 | **Meta de perda em ritmo seguro** (R4.5a–e): meta da fase 1, 5–10% do peso em cerca de 26 semanas; teto de ritmo, o menor entre 1,0 kg e 1% do peso por semana; em atleta, também 0,7% do peso por semana; prazo mínimo = perda ÷ teto; perda acima de 10% do peso vira fase 1 e reavaliação. Peso-alvo só com o % de gordura alvo que a nutricionista digita (sem valor padrão), em dois cenários: massa magra preservada (f = 0) e perda típica, ¼ como massa magra (f = 0,25). Déficit sugerido: 300–500 kcal/dia no sobrepeso (IMC 25–29,99), 500–750 nos outros, teto 1.000; com o gasto total, a energia sugerida nunca fica abaixo de 800 kcal/dia. Aparece com prioridade ≥ 1 ou objetivo "emagrecer"; com a sobreposição de risco nutricional, não sugere perda. Adulto 18+, fora da gestação e da lactação *Revista na revisão independente (item 1):* no idoso (60+), meta de perda só com IMC de 27 ou mais (sobrepeso pelo SISVAN). Com IMC de 22 ou menos (baixo peso, SISVAN 2011, Quadro 18), nunca; de 22 a 27, a faixa de referência do idoso (R4.4c), também não: a perda de peso não se sugere a quem a referência da idade considera eutrófico. *Revista (item 3):* abaixo de IMC 25 o déficit também é de 300–500 kcal/dia, nunca maior que o do sobrepeso (NHLBI 2000: 300–500 para quem tem pouco excesso); 500–750 só de IMC 30 em diante *Revista (observação da revisão):* com objetivo "ganhar" ou "manter", a meta de perda não vem, mesmo com prioridade ≥ 1: o objetivo escolhido pela nutricionista manda, e a prioridade continua aparecendo com o nível e os gatilhos. Sem objetivo escolhido, vale a prioridade *Revista (rodada 2; ponto para a Mor revisar):* no idoso com IMC de 27 a 29,99, a meta continua e ganha o aviso da posição da ESPEN em geriatria: dieta para perder peso no idoso só se considera com obesidade e problema de saúde ligado ao peso, junto com exercício | Pesquisa 4.5 (R4.5a–h) e 4.10 (D9, D10, D11); SISVAN 2011, Quadro 18; ESPEN em geriatria (Volkert et al., 2019; diretriz prática de 2022) |
| D-1035 | **Mudança mínima detectável** entre duas avaliações = 1,96 × √2 × ETM (≈ 2,77 × ETM). Sem o ETM do avaliador, o padrão ISAK nível 1: 7,5% da medida nas dobras (e na soma) e 1,5% nas outras medidas, aplicado sobre a média das duas medidas (conta nossa). Diferença igual ou maior que a MMD: "mudança provavelmente real"; menor: "dentro do erro de medida". Avaliadores diferentes: aviso de erro maior *Revista (item 7):* a soma de dobras não usa mais 7,5% da soma: o ETM da soma é a raiz da soma dos quadrados dos ETM das dobras (√Σ ETM², R4.7c, erros independentes), com o ETM de cada dobra do avaliador ou 7,5% da média dela nas duas avaliações. Os 7,5% e 1,5% continuam para uma medida só (uma dobra, a cintura) | Pesquisa 4.7 (R4.7a–f) e 4.10 (D13); com 7,5% da soma, a MMD de 7 dobras saía quase três vezes maior |
| D-1036 | **Fontes num lugar só**, cada uma com a citação curta (para a linha) e a completa (para o "Fontes" da tela e o PDF). *Revista (item 9):* o que é proposta nossa, sem diretriz, leva o rótulo curto **"Proposta do app (sem diretriz)"** e o selo de evidência `proposta-do-app`: a faixa de proteína do obeso (como fonte curta); a escala de prioridade, com o campo `evidencia` e o aviso fixo de que a escala é uma classificação proposta pelo app (cada gatilho continua citando a sua fonte); o peso-alvo e o prazo mínimo da meta de perda; a faixa do gasto de repouso; o ETM padrão sobre a média das duas medidas e o ETM da soma por √Σ ETM²; *rodada 2:* o corte de "magro" que libera a faixa de Helms (D-1032) | A tela clínica mostra a fonte (pesquisa 4.10, D16 e D17: "Cálculo do app" para o que é extrapolação nossa); a revisão pediu deixar claro o que não tem diretriz |
| D-1037 | **Tabelas de Frisancho por script, sem redigitar:** `scripts/dados/importar-frisancho.mjs` lê as tabelas copiadas da pesquisa (`dados-brutos/antropometria/frisancho-percentis.md`) e grava `src/data/frisancho.json` nas unidades da fonte (1981: CB e CMB em mm, AMB em mm²); o código converte. Os testes conferem a ordem crescente de cada linha e as células que a pesquisa resolveu | Pesquisa 3.18 e D-B10 |
| D-1038 | **Faixa da soma e pico da parábola** (revisão independente, item 2). Cada protocolo guarda a faixa da soma na amostra publicada e, nas quadráticas, o pico da parábola (Σ = b ÷ 2c, onde a densidade para de cair). **Acima do pico a equação inverte** (mais dobra daria menos gordura): o motor não calcula e diz por quê. Fora da faixa da amostra, mas até o pico, calcula e avisa com a faixa. Faixas: JP78 Σ3 14–118 mm e Σ7 32–272 mm (Tabela 1 do original); Durnin & Womersley Σ4 15–210 mm (Tabela 9 do original); Petroski mulher 21–118 mm, inferida pela faixa de cada dobra (Petroski e Pires-Neto 1995, Tabela 1: SE 5–35, SI 3–31, CX 13–52; não é limite publicado, e o aviso diz isso); JPW80, Petroski homem, Guedes, Faulkner e Slaughter, não publicada (sem aviso de faixa). Picos: JP3 homem 258,3 mm; JP3 mulher 215,8; JP7 homem 395,4; JP7 mulher 419,4; Petroski homem 191,5; Petroski mulher 115,5. O Slaughter só usa a quadrática até 35 mm, longe do pico dele (51 e 76 mm) *Revista (rodada 2, D-1042):* o motivo do pico é curto, diz o limite e o que fazer ("Petroski só vale até 115,5 mm de soma, o pico da equação: escolha outro protocolo ou informe o % da bioimpedância.") e chega às linhas de gordura e de massas *Revista (rodada 2, saturação):* acima de 90% do pico, calcula e avisa que o resultado satura (o % quase não sobe com mais dobra: em Petroski mulher de 30 anos, 70 kg e 165 cm, de 104 para 114 mm o % vai de 32,34 para 32,58). Vale para toda quadrática com pico (a conta é a mesma: a 90% do pico, a inclinação caiu a 10% da inicial); importa mais em Petroski mulher, cujo pico fica dentro da faixa inferida da amostra *Revista (rodada 2, Durnin & Womersley):* no homem de 17 a 29 anos, a faixa da soma é 15–190 mm (na Tabela 9 do original, a coluna dessa idade vai até 190); nas outras idades e na mulher, continua 15–210 | Pesquisa 2.2 e 2.4.3; a sonda da revisão mostrou o % de gordura caindo com a soma subindo em Petroski mulher acima de 115,5 mm |
| D-1039 | **Suprailíaca pela linha** (revisão independente, item 5). Cada protocolo diz a linha que usa: Jackson & Pollock 3 e 7, a **axilar anterior** (ACSM/JP); Durnin & Womersley e Petroski, a **axilar média** (D&W: "just above the iliac crest in the mid-axillary line"; Petroski seguiu Harrison 1991, o manual de Lohman, que mede na axilar média); Guedes e Faulkner, a pesquisa não registra. A conta usa a dobra da linha do protocolo; sem ela, a de linha não informada (o valor dos planos de antes: a tela de hoje nunca disse a linha), com aviso; sem as duas, a da outra linha, com o aviso de que o resultado pode estar deslocado (a pesquisa 2.7 D5 manda avisar, não bloquear; quem decide é a nutricionista). No protocolo sem linha registrada: a de linha não informada, depois a anterior, depois a média, com o aviso da linha usada. Falta a suprailíaca só quando as três estão vazias, e a falta aponta o campo da linha do protocolo. **Abdominal:** entre os protocolos daqui só Jackson & Pollock diz o local (2 cm à direita da cicatriz umbilical, vertical, ACSM); Guedes e Faulkner não dizem. Sem variação a resolver, o local da abdominal não ganha campo agora: entra com o primeiro protocolo ISAK (5 cm) ou Lohman (3 cm) *Revista (rodada 2):* no protocolo sem linha registrada (Guedes e Faulkner), a ordem passa a ser a de linha não informada, depois a **média**, depois a anterior, a linha dos outros protocolos brasileiros deste motor (Petroski). O aviso continua dizendo que a pesquisa não registra a linha: nenhuma fonte primária a dá ([NV]) | Pesquisa 1.4 (quadro "suprailíaca ≠ crista ilíaca ≠ supraespinal": trocar a linha muda o número) e 1.9 D1 |
| D-1040 | **Idade não informada** (revisão independente, item 11). Idade é número finito de 0 em diante; vazia, `NaN`, `Infinity` ou negativa conta como **não informada** em todo o motor: a fase da vida não sai, os protocolos com idade na conta pedem a idade (com idade fora da conta, calculam sem o aviso de população), as linhas com faixa por idade dizem que falta a idade (e não "sem referência para a idade"), e compleição, peso ideal, peso ajustado, prioridade, meta de perda, estimativas, gasto de repouso e proteína não vêm. O motor nunca compara uma idade inválida com um corte | A sonda da revisão: idade `NaN` virava adulto nas estimativas, na prioridade e na meta de perda (`NaN < 18` é falso), e idade −3 entrava na conta de JP 3 |
| D-1041 | **Comprimentos e diâmetros ósseos no retorno** (observação da revisão). A altura do joelho, a semienvergadura e os diâmetros do punho, do cotovelo e do joelho vão na cópia como a estatura (D-367 da `ficha-unica`): copiados para quem tem 20 anos ou mais na data nova; abaixo disso, ou sem idade conhecida, vazios. As circunferências e as dobras continuam medida do dia | Osso não muda entre consultas no adulto; na criança e no adolescente, cresce, como a estatura. Repetir a medida no retorno só soma erro de medida |
| D-1042 | **O motivo da recusa chega à linha** (revisão independente, rodada 2). Quando o protocolo tem tudo o que pede e mesmo assim não calcula (soma acima do pico, D-1038; resultado implausível, D-1015; conversão de Lohman abaixo de 7 anos, D-1009; protocolo desconhecido, CB-1009), a recusa traz a **causa** e **o que fazer**, e o motivo é as duas juntas, em texto curto. Sem bioimpedância, as linhas de gordura, massa gorda e massa magra vêm sem valor, sem nada na lista do que falta e com o motivo como aviso. Com a bioimpedância no lugar (D-1019), as três linhas trazem o valor do aparelho e o aviso "As dobras não calcularam (<causa>): usado o % da bioimpedância." Quando falta dado, nada muda: a linha diz o que falta | A D-1038 promete "não calcula e diz por quê", e a D-1016 diz que a tela só desenha as linhas. A sonda da rodada 2 achou Petroski mulher com Σ 140 mm saindo "—" sem motivo e, com bioimpedância de 35%, saindo 35% "Bioimpedância" sem dizer que as dobras foram recusadas |

## 3. Critérios de aceite

### Modelo de dados (`tipos.ts`, `caso.ts`, `persistencia.ts`, `duplicar.ts`)

- **CA-2000** · Dado um plano novo, então ele tem, vazios (`null`): as circunferências de braço relaxado direito e
  esquerdo, braço contraído direito e esquerdo, antebraço, punho, pescoço, ombro, peitoral, abdômen, quadril, coxa
  direita e esquerda, coxa proximal direita e esquerda e panturrilha esquerda; o ponto da cintura; as dobras bicipital,
  supraespinal, axilar média e panturrilha medial, e a suprailíaca da linha axilar anterior e da linha axilar média
  (revisão, item 5); os diâmetros do punho, do cotovelo e do joelho; a altura do joelho e
  a semienvergadura. A cintura, a panturrilha (direita) e as 6 dobras de hoje continuam nos campos de hoje.
- **CA-2001** · Dado um plano gravado antes desta versão (sem `medidasCorporais` e com as 6 dobras), quando ele é
  aberto, então todo campo de antes tem o mesmo valor (inclusive a cintura, a panturrilha e as 6 dobras), e todo campo
  novo vem `null`; dado um plano com só parte das medidas novas, as que vieram ficam e as outras vêm `null`.
- **CA-2002** · Dado o retorno de um paciente (duplicar), então toda medida nova (circunferências, dobras, diâmetros,
  altura do joelho e semienvergadura) vem vazia e o ponto da cintura vai igual; dado um plano sem paciente, tudo vai
  igual (CB-356 da `ficha-unica`). *Revisto (D-1041):* a altura do joelho, a semienvergadura e os diâmetros vão como a
  estatura (CA-2087).
- **CA-2003** · Dado a lista de classificação da duplicação (D-367), então cada campo novo tem a sua classe, e um campo
  novo de medida sem classe não compila.

### Protocolos de dobras (`protocolosDeDobras.ts`)

- **CA-2010** · Dado o catálogo, então ele traz os 8 protocolos da D-1006, nesta ordem, e cada um, por sexo, diz a
  população de origem, a faixa de idade, as dobras exigidas, as outras entradas da equação, a forma (quadrática, log10
  ou linear), se sai densidade ou % de gordura direto e a fonte; as dobras exigidas são as da tabela da seção 4.
- **CA-2011** · Dado um protocolo, um paciente e as dobras, quando pergunto se ele se aplica, então recebo as dobras
  exigidas que faltam, na ordem do protocolo (0 ou negativo conta como faltando), as outras entradas que faltam, se
  ele se aplica pelo sexo e se se aplica pela idade (sem sexo ou sem idade: `null`). Ex.: JP 3 dobras, homem de 30
  anos, peitoral 7, abdominal 25 e coxa vazia → falta a coxa; aplica pelo sexo e pela idade. O mesmo homem com 65
  anos → não se aplica pela idade (18 a 61).
- **CA-2012** · Dado JP 7 dobras, homem de 30 anos e Σ7 = 120 mm, então D = 1,05907 e 17,39% (Siri).
- **CA-2013** · Dado JP 3 dobras, homem de 30 anos e Σ3 = 60 mm, então D = 1,05782 e 17,95%.
- **CA-2014** · Dado JP 7 dobras, mulher de 30 anos e Σ7 = 140 mm, então D = 1,03837 e 26,71%.
- **CA-2015** · Dado JP 3 dobras, mulher de 30 anos e Σ3 = 70 mm, então D = 1,03708 e 27,30%; e, para os ids
  `jackson-pollock-3` e `faulkner-4`, o % de gordura é o mesmo de `calcularComposicao` (o de hoje) em qualquer idade,
  também abaixo de 20 e de 7 anos (6, 12, 15, 18, 19, 20 e 30 anos, nos dois sexos), por Siri.
- **CA-2016** · Dado Durnin & Womersley, então as 24 combinações de sexo, faixa e Σ4 (40 e 50 mm) da pesquisa (2.2.4)
  dão a densidade e o % de gordura dela, e os valores publicados na Tabela 9 do original saem a ± 0,2 ponto (homem
  30–39 com 40 mm: 19,2; homem 40–49 com 40 mm: 21,4; mulher 30–39 com 50 mm: 28,2; mulher 40–49 com 50 mm: 31,0);
  dado uma mulher de 16 anos, a faixa é 16–19; dado um homem de 16 anos, vale a "todas as idades" com o aviso de fora
  da população.
- **CA-2017** · Dado Petroski, homem de 30 anos e SE+TR+SI+PM = 60 mm, então D = 1,05365 e 19,79%; dado mulher de 30
  anos, 60 kg, 165 cm e SE+SI+CX = 55 mm, então D = 1,04554 e 23,44%; sem o peso ou a estatura, a mulher não calcula e
  a lista diz qual falta.
- **CA-2018** · Dado Guedes, homem com TR+SI+AB = 50 mm, então D = 1,05743 e 18,12%; mulher com SE+SI+CX = 60 mm,
  D = 1,04091 e 25,55%; e os coeficientes de 5 casas arredondados a 4 casas são os da versão [V2] (1,1714 e 0,0671;
  1,1665 e 0,0706).
- **CA-2019** · Dado Faulkner (Yuhasz) e Σ4 = 52 mm, então 13,739% (o gabarito publicado), sem conversão, com o aviso
  da D-1014.
- **CA-2020** · Dado Slaughter com tríceps + subescapular, então: menino branco púbere com 18 mm → 15,79%; menino
  branco pós-púbere com 18 mm → 13,69%; menina com 30 mm → 25,70% (não 37,0%: erro do bodycomp); menino com 40 mm →
  32,92%; menina com 40 mm → 31,54%; 35 mm exatos usam a quadrática (menino branco pós-púbere 27,05%; menina 28,13%);
  menino com 35 mm ou menos sem maturação ou sem grupo → não calcula e diz o que falta.
- **CA-2021** · Dado Slaughter com tríceps + panturrilha medial de 25 mm, então menino 19,38% e menina 20,35%.
- **CA-2022** · Dado D = 1,0500, então Siri 21,43% e Brozek 21,04%; as constantes de Lohman dão, de 7 a 19 anos:
  meninos 15,38 (7–8), 15,76 (9–10), 17,10 (11–12), 18,86 (13–14), 20,05 (15–16), 21,29 (17–19); meninas 14,14,
  14,52, 16,00, 18,62, 18,86, 18,95; na conversão automática, de 7 a 19 anos vale Lohman e de 20 em diante Siri; Siri e
  Brozek escolhidos valem em qualquer idade.
- **CA-2023** · Dado Faulkner ou Slaughter, quando a conversão escolhida é Brozek, então o % de gordura não muda.
- **CA-2024** · Dado um protocolo que calcula e o peso, então massa gorda = peso × % ÷ 100 e massa magra = peso − massa
  gorda; sem o peso, o % sai e as massas vêm `null`; a soma das dobras exigidas vem em mm.
- **CA-2025** · Dado um paciente fora da faixa de idade da equação, então o % sai com o aviso "fora da população de
  origem", que diz a faixa; dado um resultado de 0% ou menos, ou de 70% ou mais, então ele não sai e o motivo pede
  para conferir as medidas; dado uma gestante, nenhum protocolo calcula.

### Indicadores

- **CA-2030** · Dado qualquer indicador calculado, então a linha traz o valor sem arredondar, a unidade, as casas da
  tela, a recomendação (texto e faixa), a situação (rótulo e nível) decidida com o valor nas casas da tela, a fonte
  (citação curta e completa), os detalhes e os avisos.
- **CA-2031** · Dado um adulto de 20 a 59 anos, então o IMC tem recomendação "18,50 – 24,99 kg/m²", 2 casas e:
  18,49 → Baixo peso; 18,50 → Eutrofia; 24,996 → Sobrepeso (aparece 25,00); 25,52 → Sobrepeso; 30,00 → Obesidade
  grau I; 35,00 → Obesidade grau II; 40,00 → Obesidade grau III.
- **CA-2032** · Dado um idoso (60+), então recomendação "> 22,0 e < 27,0 kg/m²" e: 22,00 → Baixo peso; 22,01 →
  Eutrofia; 26,99 → Eutrofia; 27,00 → Sobrepeso; com a nota da Caderneta.
- **CA-2033** · Dado uma criança ou um adolescente (1 a 19 anos), então a linha do IMC traz o escore-z e a classe que o
  motor de hoje dá, a recomendação "escore-z de −2 a +1" e o IMC no detalhe; dado uma gestante com o peso
  pré-gestacional, a linha traz o IMC pré-gestacional, a classe e o ganho recomendado (Kac 2021); sem o peso
  pré-gestacional, a linha diz que ele falta.
- **CA-2034** · Dado o % de gordura, então: homem de 30 anos → recomendação "8% a < 20%", 19,9 → Saudável, 20,0 →
  Sobrepeso, 25,0 → Obesidade, 7,9 → Abaixo do saudável; mulher de 45 anos → "23% a < 34%"; 19 ou 80 anos → valor sem
  situação; o método (o nome do protocolo ou "bioimpedância") vem no detalhe.
- **CA-2035** · Dado o % de gordura e o peso, então massa gorda e massa magra vêm só com o valor (sem recomendação nem
  situação); dado JP 3 dobras num homem com abdominal 25 e peitoral 7 e a coxa vazia, então a soma de dobras vem sem
  valor, diz que falta a coxa e traz a soma parcial (32 mm) no detalhe, com o aviso de que está incompleta (o número
  vai como valor, e a tela formata).
- **CA-2036** · Dado um adulto com a cintura no ponto médio ou sem ponto registrado, então homem 93,9 → Sem risco
  aumentado; 94,0 → Risco aumentado; 102,0 → Risco substancialmente aumentado; mulher 80,0 e 88,0 iguais; recomendação
  "Abaixo de 94 cm" / "Abaixo de 80 cm"; sem ponto registrado, o aviso da D-1004. Na crista ilíaca, pelo corte e com a
  fonte do NIH: homem 102,0 → Sem risco aumentado, 102,1 → Risco aumentado. No menor perímetro: valor sem situação, com aviso.
- **CA-2037** · Dado cintura e quadril de um adulto, então a RCQ tem 2 casas e, pela OMS, homem 0,89 → Sem risco
  aumentado, 0,8999 → Risco substancialmente aumentado (aparece 0,90), mulher 0,85 → Risco substancialmente aumentado;
  por Bray & Gray, homem de 20–29 anos: 0,82 → Risco baixo, 0,83 → Risco moderado, 0,88 → moderado, 0,89 → Risco alto,
  0,91 → alto, 0,94 → alto, 0,95 → Risco muito alto, recomendação "Abaixo de 0,83"; Bray & Gray aos 72 anos → OMS, com
  aviso.
- **CA-2038** · Dado cintura e estatura de um adulto, então a RCE tem 2 casas: 0,39 → Abaixo da faixa de referência
  (informativo), 0,40 → Saudável, 0,49 → Saudável, 0,50 → Risco aumentado, 0,60 → Risco alto; recomendação
  "0,40 – 0,49"; com IMC ≥ 35, valor sem situação e aviso.
- **CA-2039** · Dado o pescoço de um adulto, então homem 36,9 → Sem indicação de excesso de peso, 37,0 → Indica
  avaliar excesso de peso; mulher 33,9 e 34,0 iguais; recomendação "Abaixo de 37 cm" / "Abaixo de 34 cm".
- **CA-2040** · Dado CB 35 cm e DCT 13,5 mm, então CMB 30,759 cm, AMB 75,289 cm², AGB 22,194 cm², AMB corrigida
  65,289 cm² (homem) e 68,789 cm² (mulher), com π exato.
- **CA-2041** · Dado 17 anos, então a AMB vem sem correção e é comparada com Frisancho 1981; dado 18 anos, vem
  corrigida e comparada com Frisancho 1990.
- **CA-2042** · Dado homem de 30 anos com CB 35 cm e DCT 13,5 mm, então a AMB corrigida (65,29) fica entre P75 e P85 →
  Eutrofia, com recomendação "40,9 – 70,8 cm²" (P10 a P90); a AGB (22,19) entre P50 e P75 → Eutrofia; e as fronteiras
  da D-1025 valem: abaixo do P5 → Desnutrição / Deficiência de massa magra; igual ao P5 → Risco para desnutrição /
  Baixa massa magra; igual ao P15 (gordura) ou P10 (músculo) → Eutrofia; igual ao P85 ou P90 → Eutrofia; acima →
  Obesidade / Musculatura desenvolvida.
- **CA-2043** · Dado homem de 30 anos com CB 35 cm, então a adequação da CB é 107,7% (P50 32,5) → Eutrofia; dado
  adequações de 70,0 / 70,1 / 80,1 / 90,1 / 110,1 / 120,1%, então grave / moderada / leve / eutrofia / sobrepeso /
  obesidade; na CMB, 125% → Eutrofia.
- **CA-2044** · Dado `frisancho.json`, então cada linha de cada tabela é crescente (P5 ≤ … ≤ P95), cobre de 1 a 74,9
  anos sem buraco, e as células que a pesquisa resolveu têm o valor adotado (3.18.4 e 3.17).
- **CA-2045** · Dado 75 anos ou mais, então as linhas do braço trazem os valores sem situação, com o aviso de que
  Frisancho 1990 vai até 74,9 anos.
- **CA-2046** · Dado um idoso, então a panturrilha segue a D-460 (homem 33,9 → Indicativo de redução de massa
  muscular, 34,0 → Adequada; mulher 32,9 / 33,0), com recomendação "34 cm ou mais" / "33 cm ou mais" e a nota dos 31
  cm; sem a direita e com a esquerda, usa a esquerda e diz o lado; abaixo de 60 anos, a linha não vem.
- **CA-2047** · Dado estatura e punho de um adulto, então a compleição sai com r de 1 casa: homem 10,4 → Média, 10,5 →
  Pequena, 9,6 → Média, 9,5 → Grande; mulher 11,0 → Média, 11,1 → Pequena, 10,1 → Média, 10,0 → Grande.
- **CA-2048** · Dado um adulto de 170 cm, então o peso ideal com compleição média (ou sem compleição) é 62,86 kg
  (21,75), com a faixa 53,47 – 72,22 kg; com compleição pequena, 18,50; grande, 24,99; o IMC-alvo digitado substitui o
  padrão; idoso de 170 cm → 24,5 e a faixa de 22 a 27.
- **CA-2049** · Dado 170 cm e 100 kg (IMC 34,6), então o peso ajustado é 79,19 kg (PI₂₅ 72,25); com IMC abaixo de 30,
  não se aplica; com a opção "acima de 27", um IMC de 28 já usa o ajustado.
- **CA-2050** · Dado IMC < 30, então o peso de referência é o atual; dado IMC ≥ 30, as opções são peso ideal, peso
  ajustado e massa magra (só com % de gordura), sem nenhuma escolhida.
- **CA-2051** · Dado um homem de 70 anos com altura do joelho 50 cm, então a altura estimada por Chumlea 1985 é
  162,39 cm; mulher de 70 anos com 47 cm, 154,09 cm; erro ± 6 cm; aos 92 anos, o aviso de fora de 60 a 90.
- **CA-2052** · Dado um homem idoso com CB 28, panturrilha 33, subescapular 15 e altura do joelho 52, então o peso por
  Chumlea 1988 é 64,96 kg; mulher com 27, 32, 18 e 48, 53,71 kg.
- **CA-2053** · Dado um homem de 40 anos com semienvergadura 85 cm, então a altura por Rabito VII é 167,43 cm; mulher de
  40 anos com 78 cm, 155,14 cm.
- **CA-2054** · Dado CB 30, abdômen 95, panturrilha 36 e subescapular 20, então os pesos por Rabito são III 73,58 kg,
  IV 73,19 kg, V 74,31 kg (homem) e 69,44 kg (mulher).
- **CA-2055** · Dado um idoso, então a primeira estimativa é a de Chumlea; dado um adulto, a de Rabito; cada uma traz a
  fonte, o erro e a marca "estimado", e as que não têm dado dizem o que falta.
- **CA-2056** · Dado um caso, então o resultado completo traz as linhas na ordem IMC, % de gordura, massa gorda, massa
  magra, soma de dobras, cintura, RCQ, RCE, pescoço, CB, DCT, CMB, AMB, AGB, adequação da CB, da DCT e da CMB,
  panturrilha e compleição; a linha que não vale para a pessoa não vem; a que vale e não tem dado vem com o que falta.

### Ponto de partida

- **CA-2060** · Dado um adulto de 80 kg com 25% de gordura e perfil sedentário, então o gasto de repouso por Cunningham
  1991 é 1.666 kcal/dia, com faixa de 1.513,5 a 1.818,5 (a tela mostra 1.510 – 1.820), o rótulo "Katch-McArdle é a mesma
  fórmula de Cunningham 1991" e o aviso de estimativa; sem % de gordura, não calcula e diz por quê.
- **CA-2061** · Dado o mesmo adulto ativo ou atleta com IMC < 30, então Cunningham 1980: 1.820 kcal/dia, faixa de 1.667
  a 1.973; atleta: com o aviso de subestimar; com IMC ≥ 30, Cunningham 1991 e o aviso de comparar com a equação por
  peso.
- **CA-2062** · Dado o objetivo e o perfil, então a proteína segue a D-1032: idoso de 70 anos e 70 kg → 1,0–1,2 g/kg,
  70–84 g/dia; idoso ativo → a partir de 1,2; idoso com doença → 1,2–1,5; adulto "ganhar" de 70 kg → ~1,6 g/kg (até
  2,2), 112 g/dia; adulto ativo "manter" → 1,4–2,0; adulto sedentário "manter" → sem sugestão, com o motivo; adulto
  atleta "emagrecer" com 15% de gordura → 2,3–3,1 g/kg de massa magra = 1,96–2,64 g/kg de peso; menor de 18 → não
  vem.
- **CA-2063** · Dado "emagrecer" com IMC ≥ 30, então a faixa é 1,2–1,5 g/kg e as bases peso ideal, peso ajustado e massa
  magra vêm com o peso de cada uma, sem g/dia até a escolha; escolhido o peso ajustado, vem o g/dia dele.
- **CA-2064** · Dado doença renal com TFGe < 30 sem diálise, então não há faixa de proteína, e vem o alerta "TFGe abaixo
  de 30 sem diálise: faixa alta de proteína não sugerida. Pode ser preciso limitar a proteína (PROT-AGE 2013)."
- **CA-2065** · Dado os 8 casos da pesquisa (4.4), então o nível é: mulher IMC 23, cintura 82, 1,64 m → 1; homem IMC
  27, cintura 98, 1,80 m → 1; homem IMC 28, cintura 104, 1,75 m → 2; mulher IMC 32, cintura 95, 1,60 m → 3; mulher IMC
  24, cintura 100, 1,65 m → 2; homem IMC 41 sem cintura → 4 com o aviso de cintura não medida; homem IMC 22, cintura
  85, 1,78 m → 0; mulher IMC 17,8 → 0 com a sobreposição de risco nutricional; e todo gatilho que disparou vem na
  lista com a fonte.
- **CA-2066** · Dado menor de 18 anos ou gestante, então a prioridade não vem.
- **CA-2067** · Dado 90 kg, 35% de gordura e alvo de 25%, então o peso-alvo é 78,0 kg (massa magra preservada) e 72,0
  kg (perda típica); a perda de 18 kg com teto de 0,9 kg/semana dá prazo mínimo de 20 semanas; como 18 kg passa de 10%
  do peso, a fase 1 é perder de 4,5 a 9 kg em cerca de 26 semanas; atleta, 0,63 kg/semana; sem alvo, só a fase 1 e o
  ritmo; alvo igual ou acima do atual, sem peso-alvo.
- **CA-2068** · Dado IMC de 27, então o déficit sugerido é 300–500 kcal/dia; IMC de 32, 500–750 (teto 1.000); com gasto
  total de 1.400 kcal, a energia sugerida nunca fica abaixo de 800 kcal/dia, e o aviso diz que menos que isso exige
  supervisão médica.
- **CA-2069** · Dado prioridade 0 e objetivo diferente de "emagrecer", então a meta de perda não vem; dado prioridade ≥
  1 ou "emagrecer", vem; dado a sobreposição de risco nutricional, não vem meta de perda e o motivo diz por quê.
- **CA-2070** · Dado ETM padrão numa medida só, então: uma dobra de 100 mm → ETM 7,5 mm e MMD 20,79 mm; cintura de 90 cm
  → ETM 1,35 cm e MMD 3,74 cm; com ETM do avaliador de 5 mm → MMD 13,86 mm; dado a dobra anterior 102,5 e a atual 97,5
  (média 100), a variação de −5 mm fica "dentro do erro de medida"; variação igual à MMD → "mudança provavelmente
  real"; avaliadores diferentes → aviso. *Revista (item 7):* a soma de dobras vai pelo CA-2081.

### Revisão independente (03/11/2026)

- **CA-2071** · Dado um idoso (60+), então IMC de 25 a < 27 não dispara gatilho de IMC (mulher de 70 anos, IMC 25,97,
  sem cintura → prioridade 0); IMC de 27 a 29,99 → nível 1; com cintura alta → nível 2; e o aviso lembra a faixa de
  referência de > 22 a < 27. No adulto (até 59), IMC 26 continua nível 1.
- **CA-2072** · Dado um idoso com a panturrilha abaixo do corte da D-1029 (homem 33,9; mulher 32,9), então a sobreposição
  de risco nutricional liga; no corte (34,0 / 33,0), não; abaixo de 60 anos, a panturrilha não entra.
- **CA-2073** · Dado um idoso com objetivo "emagrecer", então não há meta de perda com IMC de 22 ou menos (65 anos, 20,6;
  68 anos, 21,6), nem de 22 a 27 (72 anos, 22,5), e o motivo diz qual; com IMC 28, há.
- **CA-2074** · Dado um protocolo quadrático com a soma acima do pico, então ele não calcula e o motivo diz que a equação
  inverte: Petroski mulher com 116 mm (pico 115,5), Petroski homem com 192 (191,5), JP3 mulher com 216 (215,8), JP3
  homem com 259 (258,3); até o pico, calcula, e o % de gordura cresce com a soma; o catálogo traz a faixa e o pico de
  cada protocolo. *Revisto (rodada 2):* o motivo diz o pico e o que fazer (CA-2088).
- **CA-2075** · Dado a soma fora da faixa da amostra e até o pico, então calcula e avisa com a faixa: JP3 homem com 13 e
  com 119 mm (14 a 118); JP7 homem com 280 (32 a 272); Durnin & Womersley com 220 (15 a 210); Petroski mulher com 20
  (21 a 118, inferida); dentro da faixa, sem esse aviso.
- **CA-2076** · Dado IMC 23 com objetivo "emagrecer", então o déficit sugerido é 300–500 kcal/dia, igual ao do
  sobrepeso; de IMC 30 em diante, 500–750.
- **CA-2077** · Dado um protocolo novo abaixo de 20 anos (JP 7 dobras ou Durnin & Womersley aos 17), então a conversão
  é a de Lohman, vem nomeada na saída, e o aviso diz que aos 20 anos a conta passa para Siri; aos 20, Siri, sem esse
  aviso; com a conversão escolhida, ela vale também nos dois ids de hoje.
- **CA-2078** · Dado JP 3 dobras numa mulher, então a conta usa a suprailíaca da linha axilar anterior (com as duas linhas,
  a anterior), sem aviso de linha; só com a de linha não informada, o mesmo número de antes e o aviso; só com a da
  linha média, calcula e avisa que o resultado pode estar deslocado; sem nenhuma, falta `suprailiacaAnt`. Durnin &
  Womersley e Petroski usam a da linha média. A soma de dobras segue a mesma escolha.
- **CA-2079** · Dado Guedes ou Faulkner (sem linha registrada), então a conta usa a de linha não informada, depois a
  anterior, depois a média, e avisa qual; no retorno do paciente, as duas suprailíacas novas vêm vazias. *Revisto
  (rodada 2, D-1039):* depois da de linha não informada vem a **média** e só então a anterior; com as duas linhas, a
  média, com o aviso de que a pesquisa não registra a linha do protocolo.
- **CA-2080** · Dado 17 anos, então CB, DCT, CMB, AMB e AGB trazem o valor e o percentil, sem recomendação nem situação, com
  o aviso de que o critério é de adultos, e as três linhas de adequação não vêm; aos 18, vêm todas, com a situação.
- **CA-2081** · Dado as dobras das duas avaliações, na mesma ordem, então o ETM da soma é √Σ ETM² das dobras, com o ETM de
  cada dobra 7,5% da média dela: sete dobras de 100/7 mm → ETM da soma 2,83 mm e MMD 7,86 mm (com 7,5% da soma seriam
  20,79); com o ETM do avaliador por dobra, ele entra; dobra vazia ou listas de tamanhos diferentes → não calcula.
- **CA-2082** · Dado "emagrecer" com IMC < 30, então: atleta de 35 anos com 15% de gordura → Helms, com o aviso da
  população; atleta com 25% (acima do início do sobrepeso de Gallagher, 20%) → ISSN 1,4–2,0 g/kg de peso, com o aviso;
  atleta sem % → ISSN, com o aviso; ativo → ISSN; sedentário → sem sugestão.
- **CA-2083** · Dado o que é proposta nossa, então: a proteína do obeso traz a fonte curta "Proposta do app (sem
  diretriz)" e a evidência `proposta-do-app`; a prioridade traz `evidencia: 'proposta-do-app'`, o aviso fixo da escala e
  a fonte de cada gatilho; a meta de perda, o gasto de repouso e a mudança mínima trazem o aviso com o mesmo rótulo.
- **CA-2084** · Dado braço direito 30 e esquerdo 28 e panturrilha direita 36 e esquerda 34, então Rabito usa 28 e 34 e diz
  "esquerdo"; Chumlea usa 30 e 36 e diz "direito"; só com o lado direito, Rabito usa o direito e diz isso; sem nenhum,
  a falta de Rabito aponta o campo do lado esquerdo.
- **CA-2085** · Dado a idade `NaN`, `Infinity`, `−Infinity`, −3 ou vazia, então: a fase da vida é `null`; JP 3 não calcula
  e pede a idade; Faulkner calcula, sem o aviso de população; a conversão automática não sai; o IMC do adulto traz o
  valor e diz que falta a idade; a gordura traz o valor e diz que falta a idade; a panturrilha do idoso, a cintura, as
  estimativas, a compleição, o peso ideal, o peso ajustado, a prioridade, a meta de perda, o gasto de repouso e a proteína não vêm; as linhas
  do braço dizem que falta a idade.
- **CA-2086** · Dado objetivo "ganhar" ou "manter" e prioridade ≥ 1 (IMC 31,1), então a meta de perda não vem e a
  prioridade vem; sem objetivo, com a mesma prioridade, a meta vem.
- **CA-2087** · Dado o retorno de um paciente com 35 anos na data nova, então a altura do joelho, a semienvergadura e os
  três diâmetros vão iguais, como a estatura; com 17 anos, ou sem idade conhecida, vêm vazios; as circunferências e as
  dobras vêm vazias em qualquer idade.

### Revisão independente, rodada 2 (03/11/2026)

- **CA-2088** · Dado Petroski numa mulher de 30 anos, 90 kg e 160 cm com Σ 140 mm (acima do pico) e sem bioimpedância,
  então as linhas de gordura, massa gorda e massa magra vêm sem valor, sem nada na lista do que falta e com o aviso
  "Petroski só vale até 115,5 mm de soma, o pico da equação: escolha outro protocolo ou informe o % da bioimpedância."
- **CA-2089** · Dado o mesmo caso com bioimpedância de 35%, então a gordura vem 35% (método "Bioimpedância"), as massas
  vêm da bioimpedância, e as três linhas trazem "As dobras não calcularam (Petroski só vale até 115,5 mm de soma, o pico
  da equação): usado o % da bioimpedância."; quando só faltam dobras, a bioimpedância entra sem esse aviso (D-1019).
- **CA-2090** · Dado as outras recusas, então cada motivo diz a causa e o que fazer e chega às três linhas: resultado
  implausível (Slaughter com tríceps e subescapular de 60 mm num menino de 12 anos) → "O % calculado fica fora do
  plausível: confira as medidas ou informe o % da bioimpedância."; JP 7 dobras aos 6 anos → "A conversão de Lohman
  começa aos 7 anos: escolha Siri ou Brozek, ou informe o % da bioimpedância."; protocolo desconhecido → o motivo
  começa por "Protocolo desconhecido" e diz o que fazer. Dado que falta dobra, a linha continua com o que falta e o
  aviso "Ou informe o % de gordura da bioimpedância.", sem motivo de recusa.
- **CA-2091** · Dado um atleta de 35 anos com 15% de gordura que emagrece com IMC < 30 (faixa de Helms), então a
  sugestão traz a evidência `proposta-do-app`, a fonte Helms 2014 e o aviso "Proposta do app (sem diretriz): ..." que diz
  que o corte de "magro" é do app; o atleta com 25% (ISSN) mantém a evidência da ISSN.
- **CA-2092** · Dado um idoso com objetivo "emagrecer" e IMC de 27 a 29,99 (mulher de 70 anos e 155 cm com IMC 27,00, 28
  e 29,99), então a meta de perda vem, com o aviso da ESPEN em geriatria (só com obesidade e problema de saúde ligado
  ao peso, junto com exercício); com IMC 30, e no adulto de 59 anos com IMC 28, sem esse aviso. Ponto para a Mor revisar.
- **CA-2093** · Dado Petroski numa mulher de 30 anos, 70 kg e 165 cm, então com Σ 104 mm (acima de 90% do pico de 115,5)
  calcula 32,34% e avisa que o resultado satura; com Σ 114 mm, 32,58%, com o mesmo aviso; com Σ 103 mm, sem esse aviso;
  JP 3 dobras num homem de 30 anos com Σ 233 mm (90% de 258,3 é 232,5) também avisa, e com 230 mm, não.
- **CA-2094** · Dado Durnin & Womersley num homem de 25 anos, então Σ 200 mm calcula e avisa com a faixa "15 a 190 mm, de
  17 a 29 anos", e Σ 190 não avisa; aos 30 anos, Σ 200 não avisa e Σ 220 avisa com "15 a 210 mm"; numa mulher de 25
  anos, Σ 200 não avisa.

## 4. Dobras exigidas por protocolo

| Protocolo | Homem | Mulher | Outras entradas | Idade da amostra | Saída |
|---|---|---|---|---|---|
| Jackson & Pollock 3 | peitoral, abdominal, coxa | tricipital, suprailíaca (axilar anterior), coxa | idade | H 18–61; M 18–55 | densidade (quadrática) |
| Jackson & Pollock 7 | peitoral, axilar média, tricipital, subescapular, abdominal, suprailíaca (axilar anterior), coxa | as mesmas 7 | idade | H 18–61; M 18–55 | densidade (quadrática) |
| Durnin & Womersley | bicipital, tricipital, subescapular, suprailíaca (axilar média) | as mesmas 4 | idade (faixa) | H 17–72; M 16–68 | densidade (log10) |
| Petroski | subescapular, tricipital, suprailíaca (axilar média), panturrilha medial | subescapular, suprailíaca (axilar média), coxa | idade; na mulher, peso e estatura | H 18–61; M 18–51 | densidade (quadrática) |
| Guedes | tricipital, suprailíaca (linha não registrada), abdominal | subescapular, suprailíaca (linha não registrada), coxa | — | H 17–27; M 18–29 | densidade (log10) |
| Faulkner (Yuhasz) | tricipital, subescapular, suprailíaca (linha não registrada), abdominal | as mesmas 4 | — | desconhecida | % de gordura (linear) |
| Slaughter (tríceps e subescapular) | tricipital, subescapular | as mesmas 2 | menino com soma até 35 mm: maturação e grupo | 8–18 | % de gordura (quadrática até 35 mm; linear acima) |
| Slaughter (tríceps e panturrilha) | tricipital, panturrilha medial | as mesmas 2 | — | 8–18 | % de gordura (linear) |

## 5. Casos de borda

- **CB-1000** · Medida vazia é `null`, nunca 0. O motor trata 0, negativo e não finito (`NaN`, `Infinity`) como não
  medido, e nenhum resultado que não deu para calcular vira 0.
- **CB-1001** · Sem sexo: protocolos e indicadores por sexo não calculam e dizem que falta o sexo. Sem idade: protocolo
  com idade na equação não calcula; indicador com faixa por idade não vem ou vem sem situação, conforme a linha.
- **CB-1002** · Gestante: só o IMC pré-gestacional; protocolos de dobras não calculam (D-458); cintura, RCQ, RCE,
  pescoço, compleição, peso ideal, peso ajustado, prioridade, meta de perda, gasto de repouso e proteína não vêm; as
  linhas do braço vêm sem situação ("as referências de Frisancho não são de gestantes"). Lactante: proteína e meta de
  perda não vêm (nenhuma fonte conferida trata da lactação); o resto vale.
- **CB-1003** · Criança e adolescente: IMC pelo escore-z; Slaughter é o protocolo da idade (os outros calculam com o
  aviso de fora da população); cintura, RCQ, RCE, pescoço, compleição e peso ideal não vêm abaixo de 20 anos; o braço
  segue Frisancho pela idade (AMB sem correção abaixo de 18).
- **CB-1004** · Valor de corte exato: a situação é decidida com o valor nas casas da tela (D-1001); os exemplos da seção
  3 cobrem cada fronteira.
- **CB-1005** · Quadril vazio → a RCQ diz que falta o quadril; estatura vazia → RCE, compleição e peso ideal dizem que
  falta a estatura; punho vazio → a compleição diz que falta o punho.
- **CB-1006** · Tricipital tão grande que a CMB dá 0 ou menos → o braço não calcula e pede para conferir as medidas.
- **CB-1007** · Só o braço esquerdo, a panturrilha esquerda ou o outro lado medido → o indicador usa o lado que tem e
  diz qual (D-1003).
- **CB-1008** · Ponto da cintura com valor que esta versão não conhece (de uma versão mais nova) → tratado como menor
  perímetro (sem situação), e o valor gravado não é apagado.
- **CB-1009** · Protocolo desconhecido (id de uma versão mais nova) → não calcula e diz "protocolo desconhecido", sem
  exceção. *Revisto (rodada 2):* o motivo diz também o que fazer, e a linha da gordura o traz (D-1042).
- **CB-1010** · Slaughter com soma de 35 mm exatos → quadrática (D-1012).
- **CB-1011** · Durnin & Womersley fora das faixas → D-1011.
- **CB-1012** · Peso-alvo com 1 − alvo − f ≤ 0 ou massa magra − f × peso ≤ 0 → não calcula; alvo igual ou acima do %
  atual → sem peso-alvo.
- **CB-1013** · Proteína com base massa magra e sem % de gordura → aquela base vem sem peso e diz por quê; peso ideal
  sem estatura → idem. *Revisto (item 8):* o atleta sem % de gordura que emagrece fica com a ISSN, e o aviso diz que o %
  decide a faixa de Helms.
- **CB-1014** · Mudança mínima com as duas medidas iguais a zero ou vazias → não calcula.
- **CB-1016** · Idade inválida (`NaN`, `Infinity`, negativa) → igual a idade vazia (D-1040), com a mesma frase do que
  falta.
- **CB-1015** · Erro, tempo esgotado, permissão e concorrência: o motor é puro (sem rede, sem disco, sem estado
  compartilhado), então não há tempo esgotado, permissão nem disputa entre abas aqui; entrada inválida devolve
  resultado com o motivo, nunca exceção. A leitura do plano gravado (CA-2001) continua com as regras de hoje para JSON
  quebrado (CB-08 e CB-09 da `planejador-metanutri`).

## 6. O que ficou de fora

**Por ser [NV] na pesquisa (não entra sem conferir):** Pollock 1980 mulheres versão (b); Thorland homens; Marinha dos
EUA (mulheres); "2 Dobras (McArdle)" da Dietbox; limite de 38,25 do HWR do somatotipo; RDA de 0,8 g/kg; "até 2,0
g/kg" do idoso com doença grave; cortes de compleição pelo cotovelo (Frisancho); Chumlea "> 60 anos" de 1992; equação
de meia envergadura do UFMA; peso ajustado com 0,38 ou 0,4; "IMC 25" da BRASPEN; cortes de pescoço do BRAMS (Stabe
2013); massa muscular total de Heymsfield; correção óssea da AMB de Frisancho 2008; cortes de Ross/IAS 2020 como linha
da cintura; fronteiras da OPAS/SABE; tabelas de Pollock & Wilmore e do ACSM; tabela completa de Perini; técnica da
envergadura e do diâmetro do fêmur.

**Por decisão desta spec (conferido, mas fica para depois):** Weltman (pede duas circunferências abdominais); JP e JPW
nas versões com ln, com circunferências e de 4 dobras; Petroski 2 dobras e as demais variantes; %G direto da YMCA;
Sloan, Durnin & Rahaman, Katch & McArdle, Lohman 1981, Thorland mulheres, Forsyth & Sinning; Deurenberg, CUN-BAE, RFM
e Marinha (estimativas sem adipômetro); FMI e FFMI; panturrilha com o ajuste de Gonzalez 2021; Lohman 1992 para o %
de gordura; Frisancho 2008 (75 anos ou mais); Chumlea 1994 e 1998 (por raça); tabelas do MUST; Rabito I, II e VI;
amputados (Osterkamp); somatotipo (Heath-Carter); fórmulas clássicas de peso ideal (Devine, Robinson e outras);
critérios GLIM além do IMC; etiqueta de progresso ABESO/SBEM 2022.

**Cintura pela IDF (observação da revisão):** não entra agora; a cintura segue a OMS (D-1020). Se entrar, o
brasileiro usa os cortes dos sul-asiáticos, **≥ 90 cm no homem e ≥ 80 cm na mulher** (IDF 2006, Tabela 2, sul e
centro-americanos; ABESO 2016, Tabela 5: "usar referências dos sul-asiáticos") [V2 na pesquisa 3.4], como critério de
síndrome metabólica e com a fonte na linha; antes, conferir o ponto de medida da IDF (a pesquisa não o achou nos
trechos lidos, [NV]). Os 94/80 dos europídeos não valem para o brasileiro.

## 7. Fontes

As citações completas estão em `src/domain/fontesAntropometria.ts`; as principais:

- Jackson AS, Pollock ML. *Br J Nutr* 1978;40(3):497–504, doi:10.1079/BJN19780152 (conferido no original).
- Jackson AS, Pollock ML, Ward A. *Med Sci Sports Exerc* 1980;12(3):175–181, PMID 7402053.
- Durnin JVGA, Womersley J. *Br J Nutr* 1974;32(1):77–97, doi:10.1079/BJN19740060 (conferido no original).
- Petroski EL. Tese, UFSM, 1995; Petroski EL, Pires-Neto CS. *Rev Bras Ativ Fís Saúde* 1995;1(2):65–73.
- Guedes DP. Dissertação, UFSM, 1985.
- Faulkner JA, 1968, e Pires Neto CS, Glaner MF. *Rev Bras Cineantropom Desempenho Hum* 2007;9(2):207–213 (Yuhasz).
- Slaughter MH et al. *Hum Biol* 1988;60(5):709–723, PMID 3224965.
- Siri WE, 1961; Brozek J et al. *Ann N Y Acad Sci* 1963;110:113–140; Lohman TG. *Exerc Sport Sci Rev* 1986;14:325–357.
- Brasil, Ministério da Saúde. Norma técnica do SISVAN, 2011; The Nutrition Screening Initiative, 1994; WHO TRS 894,
  2000; WHO, Waist circumference and waist–hip ratio, 2011; NHLBI 1998.
- Gallagher D et al. *Am J Clin Nutr* 2000;72(3):694–701, doi:10.1093/ajcn/72.3.694.
- Bray GA, Gray DS. *West J Med* 1988;149(4):429–441, in Heyward VH, Stolarczyk LM, 1996.
- NICE NG246, 2025; Ashwell M, Hsieh SD. *Int J Food Sci Nutr* 2005;56(5):303–307.
- Ben-Noun L, Sohar E, Laor A. *Obes Res* 2001;9(8):470–477.
- Frisancho AR. *Am J Clin Nutr* 1981;34(11):2540, doi:10.1093/ajcn/34.11.2540 (original); Frisancho AR, 1990 (livro; reproduções de São
  Camilo 2025, CEPRAN/UNESP 2014 e Anahp 2022); Heymsfield SB et al. *Am J Clin Nutr* 1982;36(4):680, doi:10.1093/ajcn/36.4.680.
- Blackburn GL, Thornton PA, 1979, segundo CEPRAN 2014 e UFMA 2022; Grant JP et al., 1981, segundo São Camilo 2025 e
  CEPRAN 2014.
- Pagotto V et al. *Rev Bras Enferm* 2018;71(2):322–328.
- Chumlea WC, Roche AF, Steinbaugh ML. *J Am Geriatr Soc* 1985;33:116–120; Chumlea WC et al. *J Am Diet Assoc*
  1988;88:564–568; Rabito EI et al. *Rev Nutr* 2006;19(6):655–661.
- Cunningham JJ. *Am J Clin Nutr* 1980;33:2372 e 1991;54:963; ten Haaf T, Weijs PJM. *PLoS One* 2014.
- Bauer J et al. (PROT-AGE). *JAMDA* 2013; Deutz NE et al. (ESPEN). *Clin Nutr* 2014; Jäger R et al. (ISSN). 2017;
  Morton RW et al. *Br J Sports Med* 2018; Helms ER et al. *J Int Soc Sports Nutr* 2014.
- NHLBI Practical Guide, 2000; Ross R et al. *Nat Rev Endocrinol* 2020; ABESO 2016; Cederholm T et al. (GLIM) 2019.
- Volkert D et al. (ESPEN, geriatria). *Clin Nutr* 2019;38:10–47; diretriz prática de 2022, PMID 35306388.
- Jensen MD et al. (AHA/ACC/TOS) 2014; Hall KD et al. *Lancet* 2011; Heymsfield SB et al. *Obes Rev* 2014; Garthe I et
  al. 2011.
- Perini TA et al. *Rev Bras Med Esporte* 2005; Weir JP 2005; ISAK (metas de ETM, *Applied Sciences* 2022).
