# SPEC — Antropometria completa: as telas

Status: **pedida em 03/11/2026**, sob o "apenas faça". O dono **aprovou o protótipo** (canvas "MetaNutri Redesenho",
pranchetas `AvaliacaoAntropometrica`, `HistoricoAntropometrico` e `DocumentoAvaliacao`, 03/11/2026) e pediu "tudo da
melhor forma profissional". O app foi reprovado num teste contra o Dietbox por faltar isto.

**Pedido:** levar ao app o motor da antropometria completa (spec `antropometria-completa`, D-1000 a D-1042, na `main`
desde o 8a96bc8): a tela "Avaliação antropométrica", o "Histórico", o "Documento da avaliação" em A4 (F1); fotos e
anexos com "Comparar fotos" (F2); "Enviar por e-mail" (F3, bloqueada pela infraestrutura de e-mail do ramo
`lado-do-paciente`).

**Fontes da verdade.** O **desenho, o texto e o comportamento** vêm do protótipo aprovado. **Os números, as faixas, os
rótulos das situações e as fontes** vêm do motor aprovado em 3 rodadas de revisão: o protótipo tem um motor próprio,
de demonstração, que diverge do motor do app em vários pontos (seção 7). Onde os dois divergem, vale o motor, e a
divergência fica escrita na seção 7. Itens marcados [NV] na pesquisa não entram.

**Hoje:** o motor está na `main`, sem tela. A etapa 1 do plano tem peso, estatura, cintura, panturrilha, 6 dobras com
2 protocolos e a bioimpedância (`CartaoMedidas`, `CamposComposicao`, `PainelAntropometria`). A D-1007 deixou o tipo do
protocolo gravado nos 2 de hoje "até a tela nova": esta spec abre o tipo.

## 1. Escopo

**Entra (F1):** a tela "Avaliação antropométrica" ligada ao motor (peso e estatura com a origem, "Estimar altura e peso
atual", "Estimar peso ideal", circunferências por grupo com lado direito e esquerdo, diâmetros, dobras com a escolha do
protocolo e as exigidas marcadas, a ajuda com imagem em cada medida, o resultado "Real | Recomendação | Situação" com
selo e fonte, o "Ponto de partida"); o "Histórico" (gráficos, mudança mínima detectável, tabela das avaliações); o
"Documento da avaliação" em A4 por "Salvar em PDF"; a gravação no plano e na nuvem; a divergência 2 da revisão do motor
(origem do % nas sugestões).

**Entra (F2):** "Fotos e anexos" com o consentimento, até 5 fotos e anexos em PDF, JPG ou PNG por avaliação, "Comparar
fotos" entre duas avaliações, o armazenamento privado no Supabase (SQL 018) e a exclusão junto com a conta.

**Fica para a F3 (bloqueada):** "Enviar por e-mail". Depende da infraestrutura do Resend do ramo `lado-do-paciente`.
Esta spec só descreve o que a F3 terá de cumprir (D-1460); nada dela é implementado agora.

**Fora de escopo** (com o motivo):

- **IA.** A IA não entra em nada daqui. Quem avalia e prescreve é a nutricionista (Lei 8.234/1991, art. 3º).
- As 5 abas do protótipo na ficha (Dados, Anamnese, Antropometria, Planos, Adesão): a ficha de hoje junta Dados,
  Anamnese, Conduta e Planos numa página só, e Adesão é tela própria. Dividir a ficha é outra spec (D-1402).
- FMI e FFMI (Kelly 2009; ESPEN 2015): estão no protótipo, mas o motor deixou de fora (spec do motor, seção 6).
- O grupo da equação de Chumlea (branca/negra): o protótipo usa Chumlea 1994; o motor usa Chumlea 1985 no idoso, sem
  grupo, e Rabito no adulto (D-1030). Chumlea 1994 e 1998 ficaram fora na spec do motor.
- O ETM próprio da avaliadora (o protótipo do Histórico mostra "ETM de 2,8% · 32 pares"): o motor recebe o ETM, mas
  guardar o ETM por avaliador ficou fora na spec do motor. O app usa o padrão da ISAK nível 1 e diz isso.
- Escolha da conversão (Siri, Brozek, automática), da RCQ de Bray & Gray, da equação "todas as idades" de Durnin &
  Womersley e do gatilho de 27 do peso ajustado: o motor tem, o protótipo não mostra. Ficam os padrões do motor.
- Faixas plausíveis de cada medida (o protótipo avisa "Confira: o esperado fica entre..."): as faixas da pesquisa
  (1.7 B) não têm fonte e esperam a Mor (spec do motor, seção 1). A tela só confere o que já confere hoje.
- Repetições de cada medida, estados especiais da dobra, local da abdominal (spec do motor, seção 1).
- Levar o gasto de repouso para a energia do plano: o plano calcula o gasto pela fórmula dele (Mifflin-St Jeor ou
  Harris-Benedict, ou NASEM). Juntar Cunningham às fórmulas do plano é outra spec (DP-AT-4).
- Assinatura digital ICP-Brasil no PDF: depende de advogado (pesquisa 7.5, D12). O PDF sai com a linha de assinatura
  simples.
- Número de prontuário: a ficha não tem esse campo. O documento sai sem a linha "Prontuário" (D-1438).

## 2. Decisões

### Lugar, endereço e navegação

| # | Decisão | Motivo |
|---|---|---|
| D-1400 | **A avaliação é o plano.** Cada plano de modo "completo" de um paciente é uma avaliação, na data da consulta do plano. As medidas moram no plano, as mesmas que a etapa 1 usa; a tela nova e a etapa 1 mostram o mesmo dado. Plano de modo "rápido" não é avaliação (não tem medidas) | Um dado só: nada é copiado entre a tela nova e a etapa 1. O protótipo diz "Levar para o plano · No plano de 03/11": avaliação e plano são da mesma consulta |
| D-1401 | **Endereços.** `#/antropometria/<plano>` abre a vista Avaliação; `#/antropometria/<plano>/historico`, a vista Histórico; `#/paciente/<paciente>/antropometria` abre a avaliação mais recente do paciente (a de data da consulta mais nova; empate, a alterada por último) e, sem nenhuma, o vazio com "Nova avaliação". A tela vem num pedaço separado do JavaScript, pedido quando o endereço abre | O protótipo liga a ficha à antropometria por aba; o plano liga pela etapa 1. O pedaço separado não pesa a primeira tela de quem não usa (como `importar-pacientes`, DP-IP-1) |
| D-1402 | **Abas.** A ficha do paciente e a tela nova ganham as abas "Ficha" e "Antropometria", logo abaixo do cabeçalho. O protótipo tem 5 abas; aqui são 2 (fora de escopo, seção 1). Plano sem paciente abre a tela sem abas, sem a lista de avaliações, sem o Histórico e sem fotos | Sem paciente não há ficha, nem outra avaliação para comparar, nem consentimento de fotos |
| D-1403 | **Cabeçalho.** O título é o nome do paciente (sem paciente, o nome do plano; vazio, "Plano sem nome"), com a trilha "Pacientes" (sem paciente, "Planos"). Abaixo das abas, a linha "Feminino · 34 anos · objetivo: <o objetivo da ficha>", só com o que a ficha tem. Ações: "Gerar documento". **Sem botão "Salvar"**: a tela salva a cada mudança, como o resto do app, e o "Salvo" do cabeçalho diz quando a nuvem já tem | O protótipo tem "Salvar" e "Salvo às 10:42"; no app tudo salva sozinho (CA-49) e um botão que não faz nada seria falso. "Enviar por e-mail" é da F3 |
| D-1404 | **A barra.** À esquerda, a lista "Avaliação de dd/mm/aaaa" com as avaliações do paciente (da mais nova à mais velha; plano sem data da consulta usa a data da última alteração) e a modalidade ("Presencial" ou "Telenutrição"); à direita, o seletor "Avaliação \| Histórico". Trocar de avaliação muda o endereço | Protótipo. A modalidade é bloco obrigatório do documento (pesquisa 7.3, bloco 3; CFN 760/2023) |
| D-1405 | **Nova avaliação** (no Histórico e no vazio da aba) começa do retorno de sempre: duplica a avaliação mais recente pela regra da D-367 e da D-1041 (sem as medidas do dia; protocolo, ponto da cintura, adipômetro e ossos do adulto vão juntos) e abre a cópia na tela nova. Sem avaliação anterior, cria um plano completo novo com a data de hoje, o ponto da cintura "Ponto médio (OMS)" e o que a ficha sabe | O retorno já existe na ficha ("Duplicar"); a avaliação nova é o mesmo gesto. O ponto médio é o padrão da OMS e do SISVAN (pesquisa 7.5, D1) |

### A vista Avaliação

| # | Decisão | Motivo |
|---|---|---|
| D-1406 | **Duas colunas** no computador: à esquerda, Peso e estatura, Circunferências, Diâmetros ósseos, Dobras cutâneas e Fotos e anexos; à direita, Resultado e Ponto de partida. Abaixo de 1280 px, uma coluna, na mesma ordem | Protótipo (1180 px no protótipo; 1280 px é a virada do menu lateral do app) |
| D-1407 | **Peso e estatura**, com a origem "Aferidos na consulta", "Informados pela paciente" (ou "pelo paciente", pelo sexo da ficha; sem sexo, "pela pessoa") e "Estimados". Plano antigo, sem origem: a lista mostra "Origem não informada" até a nutricionista escolher | Protótipo; pesquisa 7.2, item 3 e 7.5, D9 (origem de cada medida no prontuário) |
| D-1408 | **"Estimar altura e peso atual"** abre o painel com as estimativas do motor (D-1030): a recomendada primeiro, com o valor "estimado", o erro, a fonte, o lado usado e, sem dado, o que falta. Os campos do painel são os que as equações pedem e são os mesmos do plano: altura do joelho, semienvergadura, braço relaxado, panturrilha e abdômen (a subescapular vem das dobras). A nota diz o lado de cada equação: Rabito mediu no lado esquerdo; Chumlea, no direito. "Usar os estimados" só fica ativo com altura **e** peso estimados: grava os dois com 1 casa e a origem "Estimados". Fora de 18 anos em diante ou na gestação, o painel diz "As estimativas valem de 18 anos em diante, fora da gestação." | Protótipo (o botão, o "Medidos hoje"), com as equações do motor. A origem é uma só para peso e estatura |
| D-1409 | **"Estimar peso ideal"** abre o painel com a compleição (motor, D-1028), o IMC-alvo editável (padrão do motor pela compleição; idoso 24,5) com a frase "Padrão da compleição média. Edite se quiser." ou "Definido por você.", o peso ideal, a faixa de eutrofia ("IMC de 18,50 a 24,99 nesta estatura."; idoso "IMC acima de 22 e abaixo de 27 nesta estatura.") e o peso ajustado (a partir de IMC 30; abaixo, "Só com IMC de 30 ou mais. O IMC é 26,58."). A nota cita as fontes do motor. Abaixo de 20 anos ou na gestação: "O peso ideal vale de 20 anos em diante, fora da gestação." | Protótipo, com as contas e as fontes do motor (D-1027) |
| D-1410 | **Circunferências** em três grupos (Membros superiores, Tronco, Membros inferiores), cada um com "Ocultar" e "Exibir" e, fechado, "N de M medidas preenchidas". Direito e esquerdo onde o plano guarda os dois (braço relaxado, braço contraído, panturrilha, coxa proximal, coxa média); **antebraço e punho num campo só**, como o motor guarda (D-1003). A cintura leva, embaixo do nome, o ponto: "Ponto médio (OMS)" ou "Crista ilíaca (NIH)"; plano antigo, "Ponto não registrado" até a escolha. A ajuda da cintura segue o ponto escolhido | Protótipo; o protótipo tem lado esquerdo também no antebraço e no punho, e o motor não (seção 7) |
| D-1411 | **Diâmetros ósseos** (punho, cotovelo e joelho) num cartão que nasce fechado, com o resumo "Punho 5,1 · cotovelo 6,2 · joelho 9,1 cm" (o que falta sai "—"); o joelho diz "Técnica em conferência" no lugar da ajuda | Protótipo; a técnica do joelho é [NV] (spec do motor, seção 6) |
| D-1412 | **Dobras cutâneas.** Protocolo (os 8 do motor, com o nome do motor; os de Slaughter só até 18 anos), adipômetro (Lange, Harpenden, Outro) e a linha do protocolo: "<fonte> · <população> · <conversão>" ("conversão de Siri", "conversão de Lohman", "dá a gordura direto"), mais a nota da faixa de idade e, fora dela, "Fora da população de origem: ...". As dobras do protocolo levam o ponto e "(usada no protocolo)" para o leitor de tela; as outras ficam apagadas e guardadas. A frase embaixo: "As N dobras marcadas entram no protocolo. As outras ficam guardadas." ou "Falta 1 das N dobras marcadas para calcular a gordura." / "Faltam 2 das N ...". São 10 dobras na ordem do protótipo; a supraespinal e a suprailíaca de linha não informada (a dos planos de antes) só aparecem quando têm valor | Protótipo; D-1039 (linha da suprailíaca). Esconder um valor gravado seria perder dado |
| D-1413 | **A suprailíaca marcada** é a da linha do protocolo: a anterior em Jackson & Pollock, a média em Durnin & Womersley e Petroski; em Guedes e Faulkner, que não registram a linha, a média (a ordem da D-1039 revista), ou a de linha não informada quando ela tem valor | D-1039 revista; o protótipo marca a média em Guedes e Faulkner |
| D-1414 | **Slaughter num menino.** Com Slaughter (tríceps e subescapular) e sexo masculino, aparecem a maturação sexual (Tanner 1–2, 3, 4–5) e o grupo do estudo (Branco, Negro), com a nota "Pedidos quando a soma é de até 35 mm. O grupo é a classificação do estudo e não foi validado para a população brasileira." | D-1012: o motor pede as duas entradas e deixa a tela decidir onde. Sem elas, o protocolo não calcula para meninos |
| D-1415 | **Ajuda com imagem.** Cada medida tem o "?" ("Como medir: <medida>") que abre a ajuda: título, imagem (quando há), crédito embaixo da imagem e o texto da técnica, os do protótipo. Uma ajuda aberta por vez; Esc e "Fechar a ajuda" fecham e o foco volta ao "?". No celular, a ajuda abre embaixo, presa à tela, com no máximo 70% da altura e rolagem própria. As imagens são as 15 do protótipo, em WebP, em `public/imagens/antropometria/`; o crédito exigido pela licença fica sempre visível embaixo da imagem (CDC: fonte, domínio público, disponível em cdc.gov, sem endosso; CC BY 4.0: autor, licença com link) e também em `THIRD_PARTY_NOTICES.md` | Protótipo; pesquisa 5.1 e LICENCAS.md |
| D-1416 | **Resultado.** Tabela "Indicador \| Real \| Recomendação \| Situação" em quatro grupos: "Peso e composição" (IMC, gordura, massa gorda, massa magra, soma de dobras), "Gordura central" (cintura, RCQ, RCE, pescoço), "Braço · Frisancho" (CB, DCT, CMB, AMB, AGB e as adequações) e "Outras" (panturrilha, compleição). As linhas são as do motor (`resultadoAntropometrico`), na ordem dele; a que não vale para a pessoa não aparece; grupo sem linha não aparece. O título do cartão diz de onde vem a gordura: "Gordura por <protocolo>" ou "Gordura pela bioimpedância" | Protótipo e D-1016 (a tela só desenha) |
| D-1417 | **A linha.** "Real": o valor nas casas do motor, com a unidade, ou "—". "Recomendação": o texto do motor, ou "—". "Situação": o selo com o rótulo do motor (adequado verde, atenção âmbar, alterado e grave vermelho, informativo neutro, pelos tokens de estado); sem valor, no lugar do selo, a frase do que falta ("Falta a cintura", "Faltam o peso e a estatura", "Faltam 3 dobras") ou o motivo da recusa do motor (D-1042). Embaixo do nome, o detalhe curto (o método, o percentil, o lado, o ponto). O "ⓘ" ("Fonte: <indicador>") abre, embaixo da linha, a citação completa da fonte, os avisos da linha e os valores de apoio (densidade, P50 de referência, IMC da criança) | Protótipo, D-1016, D-1036 (fonte em toda conta), D-1042 |
| D-1418 | **Ponto de partida do plano.** Perfil de atividade (Sedentária, Ativa, Atleta; no masculino, Sedentário, Ativo, Atleta); quatro blocos com o selo de evidência: **Gasto de repouso** (a faixa do motor, arredondada para dezenas, "1.460 – 1.760 kcal/dia", com a equação, a massa magra, a origem do % e os avisos); **Proteína** (objetivo do plano: "Emagrecer", "Manter o peso", "Ganhar massa muscular"; a faixa em g/dia na base de cálculo, com a faixa em g/kg e a fonte; com IMC de 30 ou mais, a escolha do peso de referência: peso ideal, peso ajustado ou massa magra); **Prioridade clínica** (nível, rótulo, gatilhos com a fonte, avisos e a frase fixa do motor); **Meta de perda** (fase 1, teto do ritmo, déficit e energia sugerida pelo gasto do plano, gordura alvo digitada, peso-alvo nos dois cenários e prazo mínimo). Abaixo de 18 anos ou na gestação, o cartão diz "O ponto de partida vale de 18 anos em diante, fora da gestação." Na lactação, sem proteína e sem meta, com o motivo do motor | Protótipo, D-1031 a D-1034. O protótipo usa outro conjunto de objetivos ("Treina", "Hipertrofia", "Atleta em déficit"); o motor usa o objetivo do plano (D-1032) |
| D-1419 | **Selos de evidência:** "Evidência forte", "Evidência limitada" e "Proposta do app (sem diretriz)", pelo campo `evidencia` do motor. O gasto de repouso é "Evidência limitada" (pesquisa R4.2a); a prioridade e o que o motor marca `proposta-do-app` levam "Proposta do app (sem diretriz)"; a meta de perda, "Evidência forte" (fase 1 e ritmo; o peso-alvo e o prazo levam o aviso de proposta do motor) | D-1036 revista: o protótipo dizia "Cálculo do app"; a revisão do motor mandou "Proposta do app (sem diretriz)" |
| D-1420 | **Proteína e doença** (D-1032). Idoso de 65 anos ou mais com alguma doença marcada na ficha conta como "doença aguda ou crônica" (PROT-AGE), e o bloco diz isso. Com "Doença renal crônica" marcada na ficha, o bloco mostra a pergunta "TFGe abaixo de 30, sem diálise" (sim ou não); "sim" troca a faixa pelo alerta do PROT-AGE do motor | O plano não guardava essas entradas; a ficha já sabe as doenças. A pergunta da TFGe só aparece para quem tem a doença marcada. Ponto para a Mor |
| D-1421 | **"Levar para o plano"** grava a faixa de proteína em g/kg de peso atual (2 casas) como a meta de proteína do plano (`metasMacros.proteina`), e mostra "No plano de dd/mm como sugestão. Você ajusta lá." Fica desabilitado, com o motivo embaixo, quando não há faixa fechada em g/dia (sem sugestão, faixa "a partir de", ou base de cálculo por escolher). O gasto de repouso não vai para o plano (fora de escopo; DP-AT-4) | Protótipo. A meta de proteína em g/kg já existe no plano (CA-24) e a nutricionista a ajusta em "Metas" |

### A divergência 2 (revisão do motor, obrigatória antes de a tela usar o "ponto de partida")

| # | Decisão | Motivo |
|---|---|---|
| D-1422 | **A origem do % nas sugestões.** O gasto de repouso, a proteína (quando usa a massa magra ou o % de gordura), a meta de perda (quando usa o % atual) e o peso de referência (a base "massa magra") passam a levar a **origem do %**: `{ origem: 'dobras' \| 'bioimpedancia', metodo }`, o mesmo `metodo` de `GorduraDoCaso` ("Jackson & Pollock, 7 dobras" ou "Bioimpedância (InBody 270)"). Sem % usado, `null` | Revisão do motor, rodada 2, "divergências que ficam": as sugestões usavam o % da bioimpedância sem dizer |
| D-1423 | **Os avisos do %.** Essas sugestões repassam `GorduraDoCaso.avisos`, inclusive o da D-1042 ("As dobras não calcularam (...): usado o % da bioimpedância."), depois dos avisos delas | Idem |
| D-1424 | **A faixa do gasto com a bioimpedância.** A faixa continua a mesma conta (D-1031), mas, com a origem na bioimpedância, o aviso "Proposta do app (sem diretriz): a faixa soma o erro das dobras ao da equação." troca por "Proposta do app (sem diretriz): a faixa usa o erro típico das dobras (3,5 pontos de %); o erro da bioimpedância depende do aparelho e não foi conferido." | O 0,035 é o erro das dobras (pesquisa 4.2); a pesquisa não traz o da bioimpedância |

### O Histórico

| # | Decisão | Motivo |
|---|---|---|
| D-1425 | **O que entra.** As avaliações do paciente (D-1400), da mais velha à mais nova, com a linha "N avaliações · de dd/mm/aaaa a dd/mm/aaaa". Com menos de 2, o Histórico diz "O histórico começa na segunda avaliação." e mostra a tabela com a que houver | Protótipo |
| D-1426 | **Evolução.** Dois gráficos de linha, um por medida, sem segundo eixo: "Peso kg" e "Gordura corporal % · <protocolo>" (a gordura do motor, pelas dobras, ou pela bioimpedância, dita no subtítulo). Ponto por avaliação, rótulo do último valor, dica ao passar o cursor ou focar a data ("08/09/2026 · 72,6 kg · −1,5 kg desde 07/07"). Avaliação sem o valor não vira ponto (nunca zero). Embaixo, a leitura em uma frase, do motor da mudança mínima | Protótipo. Componente novo do design system (`GraficoLinha`) |
| D-1427 | **Mudança mínima detectável** pela D-1035 do motor, com o ETM padrão da ISAK nível 1: soma das dobras do protocolo (√Σ ETM²), cintura e quadril, entre a penúltima e a última avaliação. As marcas: "Mesmo protocolo: <nome>", "Mesmo ponto de cintura: <ponto>" quando as duas avaliações concordam; quando não, o aviso de que aquela medida não se compara. A nota: "MMD = 2,77 × ETM (Weir 2005). Sem ETM próprio, o app usa os limites da ISAK nível 1: 7,5% nas dobras e 1,5% nas outras medidas." | Protótipo, com o ETM do motor; o ETM próprio está fora de escopo |
| D-1428 | **Tabela "Avaliações".** Linhas: Peso, IMC, Cintura (com o ponto), Quadril, Cintura/quadril, Cintura/estatura, Braço relaxado (com o lado), Soma das dobras do protocolo, Gordura corporal, Massa gorda, Massa magra. Colunas: cada data, "Desde <penúltima>" e "Desde <primeira>". A variação leva a nota: "balança" (peso), "calculado" (IMC e razões), "mudança real" ou "dentro do erro" (pela MMD), "veja a soma" (gordura e massas pelas dobras), "protocolo diferente" ou "ponto diferente" quando a comparação não vale, e "—" quando falta uma das duas | Protótipo; D-1035 |

### O documento

| # | Decisão | Motivo |
|---|---|---|
| D-1429 | **"Gerar documento"** abre a prévia do "Documento da avaliação" em A4, na moldura de impressão que o plano já usa (`.area-impressao`, papel sempre claro), com "Salvar em PDF" (a impressão do navegador) e "Fechar". O documento é do que está na avaliação aberta | Protótipo; impressão do plano (spec impressao-do-plano) |
| D-1430 | **Blocos (CFN 594/2017; pesquisa 7.3).** 1. Cabeçalho: nome da nutricionista, "Nutricionista · CRN-n nº", telefone e e-mail do perfil. 2. Título "Avaliação antropométrica" com a data. 3. Paciente: nome, nascimento com a idade, sexo; avaliação ("Primeira avaliação" ou "Retorno · Nª avaliação") e modalidade. 4. Métodos: o protocolo com a conversão e o adipômetro, o ponto da cintura, o lado e a origem do peso e da estatura. 5. Medidas básicas: peso e estatura com a origem, IMC com a classificação e a fonte. 6. Circunferências (membros com direito e esquerdo; tronco). 7. Dobras com "●" nas do protocolo, a soma e o aviso de variabilidade. 8. Diâmetros. 9. Resultados: indicador, valor, referência, classificação e fonte curta. 10. Comparação com a avaliação anterior (quando há), com a leitura pela MMD. 11. Diagnóstico nutricional e observações, escritos pela nutricionista. 12. Referências (as citações completas das fontes usadas, sem repetir), o aviso "A interpretação é da nutricionista e não substitui avaliação clínica." e a assinatura com nome, profissão, CRN, cidade e data. Rodapé: "Gerado no MetaNutri". Seção sem dado não sai | CFN 594, arts. 4º, 5º e 8º; CFN 599, art. 21; a Mor pediu "menos informação" (esconder o vazio) |
| D-1431 | **Quem assina.** Nutricionista com CRN: nome e CRN. Estudante: o mesmo bloco de estágio do plano (estagiário e preceptor) e a frase de proposta. Sem nome nem CRN: a linha "Assinatura" em branco. Exportação bloqueada pelo CRN (CA-290): "Gerar documento" fica desabilitado com o motivo | O mesmo `AssinaturaDoPlano` das folhas de hoje |
| D-1432 | **Diagnóstico nutricional e observações** são campos de texto da prévia (não saem no papel como campo), gravados na avaliação. Começam vazios; o botão "Usar o resumo das classificações" escreve no campo um rascunho com as classificações do motor e as fontes, que a nutricionista revisa. Vazio, o documento sai com o espaço do diagnóstico em linhas para escrever à mão | CFN 594, art. 4º §1º: o diagnóstico é da nutricionista, "com indicação do protocolo utilizado". O protótipo mostra o texto pronto; o app não escreve diagnóstico sozinho |
| D-1433 | **Página.** A4 retrato, papel claro nos dois temas, margens do plano impresso; da segunda página em diante, a linha fina "Paciente · Avaliação de dd/mm/aaaa" e "Nutricionista · CRN" (como a dieta). O bloco de assinatura não fica sozinho no topo de uma página | Protótipo (2 páginas); spec impressao-do-plano, CA-316 |

### Gravação

| # | Decisão | Motivo |
|---|---|---|
| D-1434 | **O protocolo gravado vira os 8 do motor** (`composicao.protocolo: IdProtocolo`), fechando a D-1007. O id de uma versão mais nova fica gravado como veio; o motor diz "protocolo desconhecido" (CB-1009) e a tela mostra a recusa | D-1007 ("o tipo gravado no plano só é ampliado com a tela") |
| D-1435 | **Grupo novo `avaliacao` no plano**, com: a origem do peso e da estatura, a modalidade, o adipômetro, a maturação e o grupo do estudo (Slaughter), o perfil de atividade, o IMC-alvo, a gordura alvo, a base da proteína, a TFGe abaixo de 30, o diagnóstico, as observações da medida, a data da autorização de fotos e as listas de fotos e de anexos (F2). Plano novo nasce com tudo vazio; plano gravado antes abre com o grupo vazio e o resto igual (`completarCasoLido`); valor de versão mais nova fica como veio | Mesma regra da CA-2001 do motor |
| D-1436 | **Na duplicação (D-367)**: a origem do peso e da estatura, a maturação, o diagnóstico e as observações são medida do dia; a modalidade, o adipômetro, o grupo do estudo, o perfil, o IMC-alvo, a gordura alvo, a base da proteína, a TFGe e a data da autorização vão iguais. **Fotos e anexos nunca vão na cópia**, com ou sem paciente: os arquivos são da avaliação de origem (classe nova `arquivo do dia`) | A mesma lógica dos campos de hoje; um arquivo em duas avaliações sairia das duas quando apagado numa |
| D-1437 | **A etapa 1 do plano.** O cartão "Avaliação antropométrica" ganha "Abrir a avaliação completa" (vai para a tela nova). Na "Composição corporal", com um protocolo que não é um dos 2 de hoje, a escolha mostra "Protocolo da avaliação completa: <nome>", as dobras e o resultado das dobras saem e ficam o link para a tela nova e a bioimpedância; escolher Jackson & Pollock 3 ou Faulkner ali volta ao de hoje | A etapa 1 não sabe desenhar as 10 dobras nem os 8 protocolos; mostrar o resultado errado seria pior |
| D-1438 | **Sem "Prontuário"**: a ficha não tem o número; o documento não inventa um | CFN 594 pede identificação; nome, nascimento e sexo identificam |

### Celular

| # | Decisão | Motivo |
|---|---|---|
| D-1439 | **D-800 a D-805 valem em tudo.** Sem rolagem lateral em 360, 390 e 412 px; toque de 44 px nos botões, campos, "?", "ⓘ", "Ocultar/Exibir" e seletores (`sm:pointer-coarse:`, `comToque`); campos com letra de 16 px no celular; número digitado inteiro à vista | Spec ajustes-mobile |
| D-1440 | **No celular** (abaixo de 640 px): os campos de lado ficam lado a lado, com "Dir." e "Esq." dentro do campo; a tabela do resultado vira duas linhas por indicador (nome e real; recomendação e situação); as colunas "Desde" do Histórico ficam e as datas do meio somem (só a primeira e a atual), como o protótipo em 720 px; os gráficos empilham; a ajuda abre embaixo (D-1415) | Protótipo em 390 px |

### Fotos e anexos (F2)

| # | Decisão | Motivo |
|---|---|---|
| D-1450 | **Consentimento.** "A paciente autorizou fotos para o prontuário" (masculino, "O paciente autorizou"), com " · registrado em dd/mm/aaaa" depois de marcado. Sem a marca, "Adicionar foto" fica desligado e a frase "Marque a autorização da paciente para adicionar fotos." aparece. Desmarcar não apaga fotos já guardadas; só impede fotos novas | Protótipo; LGPD art. 11, I (consentimento específico e destacado); pesquisa 7.5, D13 |
| D-1451 | **Limites por avaliação:** até 5 fotos (JPG ou PNG); anexos em PDF, JPG ou PNG; fotos e anexos somam até 8 MB. A frase: "Até 5 fotos por avaliação. Fotos e anexos somam até 8 MB. Fotos em JPG ou PNG; anexos em PDF, JPG ou PNG." e a barra "3,7 de 8 MB usados" | Protótipo; Dietbox (5 fotos por avaliação, pesquisa 7.3) |
| D-1452 | **O tipo pelo conteúdo**, nunca pelo nome nem pelo tipo que o navegador diz: JPEG (`FF D8 FF`), PNG (assinatura de 8 bytes) e, nos anexos, PDF (`%PDF-`). O resto: "Use JPG ou PNG." (foto) ou "Anexo em PDF, JPG ou PNG." Arquivo de foto acima de 20 MB ou com lado acima de 8000 px (lido no cabeçalho, antes de abrir): "Use uma foto de até 20 MB e 8000 px." | Como `marca-no-link` (DP-ML-4 e DP-ML-32): extensão trocada não passa; imagem gigante não trava o aparelho |
| D-1453 | **A foto é reduzida no aparelho** antes de subir: girada pela orientação da câmera, com o lado maior de até 1600 px, em JPEG de qualidade 0,85, sem os metadados da câmera (local, aparelho, data). Passou de 8 MB somando com o que já existe: "Passa de 8 MB somando fotos e anexos. Reduza a foto." / "Passa de 8 MB somando fotos e anexos." | A foto do celular tem 3 a 5 MB e 5 delas não caberiam; o GPS da foto é dado da paciente que ninguém precisa |
| D-1454 | **Ângulo da foto**: a foto nova escolhe "Frente", "Lado", "Costas" ou "Outra" (nas 3 primeiras, o ângulo vago seguinte já vem escolhido); cada foto mostra o ângulo e o tamanho; as vagas, "Foto N de 5". Cada foto e cada anexo tem "Excluir" (com confirmação) | O protótipo mostra o ângulo; "Comparar fotos" escolhe pelo ângulo |
| D-1455 | **Comparar fotos**: o seletor "Frente \| Lado \| Costas", a foto daquele ângulo da avaliação anterior com foto e a da atual lado a lado ("08/09/2026 · Frente · 72,6 kg"), e as diferenças de peso, cintura e soma das dobras com a leitura da MMD (D-1427). Sem foto do ângulo numa das duas: "Sem foto de frente em 08/09/2026." O botão vira "Ver fotos de hoje" | Protótipo |
| D-1456 | **Sem divulgação** (CFN 599/2018, art. 58): nenhuma ação de compartilhar, baixar a foto, montar "antes e depois" para fora ou levar a foto ao documento. A frase fixa: "As fotos ficam só no prontuário. Não podem ir para divulgação, nem com autorização da paciente (CFN 599/2018, art. 58)." O anexo (exame, relatório de bioimpedância) abre numa aba para ler | Protótipo; CFN 599, art. 58 |
| D-1457 | **Onde fica.** Balde privado `fotos-avaliacao` no Supabase, caminho `<conta>/<plano>/fotos/<id>.jpg` e `<conta>/<plano>/anexos/<id>.<ext>`. RLS: cada conta só envia, lê e apaga na própria pasta; ninguém lista a pasta de outra; anônimo não faz nada. Limites também no servidor: tipo (JPEG, PNG, PDF), até 8 MB por arquivo, até 5 fotos e 10 anexos por plano e até 2.000 arquivos por conta. A imagem aparece por URL assinada de 10 minutos (o `img-src` da CSP ganha a origem do Supabase); a lista dos arquivos mora no plano | Pedido; o tamanho somado por avaliação não é conferível na política (o tamanho chega depois do envio) e fica com o app (DP-AT-12) |
| D-1458 | **Exclusão.** Apagar a foto ou o anexo apaga o arquivo e a linha. Excluir o plano apaga a pasta dele. Excluir a conta pelo site apaga a pasta da conta no balde, junto com os comprovantes, antes de apagar o login (spec exclusao-de-conta, D-252) | LGPD art. 18; pedido ("as fotos somem junto") |
| D-1459 | **Sem nuvem** (modo local, sem servidor) ou sem paciente: o cartão "Fotos e anexos" diz "Fotos e anexos ficam guardados na conta, na nuvem." (modo local) ou não aparece (sem paciente) | Os arquivos não cabem no navegador nem na cópia da conta |

### F3, bloqueada

| # | Decisão | Motivo |
|---|---|---|
| D-1460 | **"Enviar por e-mail"** (quando a infraestrutura do Resend entrar): um link com prazo de 7 dias para o documento, nunca o PDF anexado; o registro do envio na ficha; e-mail da ficha do paciente. Texto do protótipo: "Para <e-mail>. Vai um link para o documento, que vence em 7 dias. O PDF não segue anexado." e "Enviado para <e-mail> às hh:mm. O envio fica registrado na ficha." | Protótipo; pesquisa 7.3 ("link com expiração", LGPD arts. 37 e 46) |

## 3. Critérios de aceite

### Lugar e navegação

- **CA-2400** · Dado o endereço `#/antropometria/<plano>`, quando ele abre, então a tela "Avaliação antropométrica" do
  plano aparece com a vista Avaliação; `#/antropometria/<plano>/historico`, com a vista Histórico; e a leitura e a
  escrita do endereço vão e voltam iguais.
- **CA-2401** · Dado um paciente com 3 planos completos (05/2026, 09/2026, 11/2026) e 1 rápido, quando
  `#/paciente/<id>/antropometria` abre, então ele leva à avaliação de 11/2026; e a lista "Avaliação de" mostra só as 3
  completas, da mais nova à mais velha.
- **CA-2402** · Dado um paciente sem plano completo, quando a aba "Antropometria" abre, então aparece "Nenhuma avaliação
  ainda." com "Nova avaliação"; quando "Nova avaliação" é tocada, então nasce um plano completo do paciente com a data
  de hoje e o ponto da cintura "Ponto médio (OMS)", e a tela dele abre.
- **CA-2403** · Dado um paciente com avaliação, quando "Nova avaliação" é tocada no Histórico, então nasce a cópia da
  mais recente pela D-367 (sem peso, cintura e dobras; com o protocolo, o ponto da cintura e o adipômetro) com a data de
  hoje, e a tela dela abre.
- **CA-2404** · Dado a ficha de um paciente, então as abas "Ficha" e "Antropometria" aparecem, com "Ficha" marcada
  (`aria-current="page"`); na tela nova, "Antropometria" marcada; tocar "Ficha" volta à ficha.
- **CA-2405** · Dado um plano sem paciente, quando a tela nova abre, então não há abas, lista de avaliações, Histórico
  nem "Fotos e anexos"; o título é o nome do plano e a trilha leva a "Planos".
- **CA-2406** · Dado a etapa 1 de um plano completo, então o cartão "Avaliação antropométrica" tem "Abrir a avaliação
  completa", que leva a `#/antropometria/<plano>`.
- **CA-2407** · Dado a tela nova de um paciente de 34 anos, feminino, com objetivo "perder gordura" na ficha, então o
  título é o nome dela e a linha abaixo das abas é "Feminino · 34 anos · objetivo: perder gordura"; sem objetivo na
  ficha, a linha acaba na idade; não há botão "Salvar".
- **CA-2408** · Dado um endereço com um plano que não existe, então a tela diz "Esta avaliação não existe mais. Ela pode
  ter sido excluída em outra aba ou em outro aparelho." e "Voltar para Pacientes".
- **CA-2409** · Dado a lista "Avaliação de", quando outra data é escolhida, então o endereço passa a ser o daquele plano
  e a tela mostra as medidas dele.

### Peso e estatura

- **CA-2410** · Dado a tela nova, quando peso e estatura são digitados, então eles vão para o plano (o mesmo `pesoKg` e
  `estaturaCm` da etapa 1) e o resultado se atualiza; a origem escolhida fica gravada; plano antigo mostra "Origem não
  informada".
- **CA-2411** · Dado um homem de 70 anos com altura do joelho 52 cm, braço direito 28, panturrilha direita 33,
  subescapular 15 e abdômen 95, quando "Estimar altura e peso atual" abre, então a altura estimada é 166,4 cm (Chumlea,
  1985, ± 6 cm) e o peso estimado é o de Chumlea 1988 (64,96 kg aparecem 65,0 kg), com a fonte de cada um; e o "Medidos
  hoje" mostra o peso e a estatura do plano.
- **CA-2412** · Dado um adulto de 40 anos com semienvergadura 85 cm, braço esquerdo 30, panturrilha esquerda 36 e abdômen
  95, então a altura é a de Rabito VII e o peso o de Rabito V, com "lado esquerdo"; quando "Usar os estimados" é tocado,
  então o peso e a estatura do plano recebem os dois valores com 1 casa e a origem vira "Estimados".
- **CA-2413** · Dado um adulto sem semienvergadura, então a altura estimada diz o que falta ("Falta a semienvergadura") e
  "Usar os estimados" fica desligado.
- **CA-2414** · Dado um adulto de 170 cm com punho de 16,8 cm (r = 10,1; mulher, Média), quando "Estimar peso ideal" abre,
  então a compleição é "Média", o IMC-alvo é 21,75 com "Padrão da compleição média. Edite se quiser.", o peso ideal é
  62,9 kg e a faixa é "53,5 a 72,2 kg"; quando o IMC-alvo é trocado por 23, então o peso ideal é 66,5 kg com "Definido
  por você.", e o IMC-alvo fica gravado no plano.
- **CA-2415** · Dado 170 cm e 100 kg, então o peso ajustado é 79,2 kg; com 70 kg, "Não se aplica" e "Só com IMC de 30 ou
  mais. O IMC é 24,22."

### Circunferências e diâmetros

- **CA-2416** · Dado o grupo "Membros superiores", então braço relaxado e braço contraído têm "Direito" e "Esquerdo", e
  antebraço e punho têm um campo só; cada campo grava no campo do plano da D-1002 (a panturrilha direita em
  `circunferenciaPanturrilhaCm`, a cintura em `circunferenciaCinturaCm`).
- **CA-2417** · Dado o grupo "Tronco" com 3 de 6 medidas, quando "Ocultar" é tocado, então o grupo fecha, mostra "3 de 6
  medidas preenchidas" e o botão vira "Exibir" (`aria-expanded` acompanha).
- **CA-2418** · Dado um plano novo, então o ponto da cintura mostra "Ponto médio (OMS)"; um plano antigo (ponto `null`)
  mostra "Ponto não registrado"; escolher "Crista ilíaca (NIH)" grava `crista-iliaca`, a linha da cintura passa ao corte
  do NIH e a ajuda da cintura passa à da crista ilíaca, com a imagem.
- **CA-2419** · Dado os diâmetros, então o cartão nasce fechado com "Punho — · cotovelo — · joelho — cm" (sem dado) ou
  com os valores; aberto, os três campos gravam em `diametroPunhoCm`, `diametroCotoveloCm` e `diametroJoelhoCm`, e o
  joelho diz "Técnica em conferência".

### Dobras

- **CA-2420** · Dado a lista de protocolos, então ela traz os 8 do motor, na ordem do motor, com os nomes do motor; num
  paciente de 34 anos, os dois de Slaughter vêm desligados; num de 12 anos, ligados.
- **CA-2421** · Dado Jackson & Pollock 7 dobras numa mulher, então as 7 dobras do protocolo levam o ponto (peitoral,
  axilar média, tríceps, subescapular, abdominal, suprailíaca axilar anterior e coxa), as outras ficam apagadas, e a
  linha do protocolo é "Jackson, Pollock e Ward, 1980 · mulheres dos EUA, de 18 a 55 anos · conversão de Siri"; com 5 das 7, "Faltam 2 das 7 dobras marcadas para calcular a gordura."; com as 7, "As 7 dobras marcadas
  entram no protocolo. As outras ficam guardadas."
- **CA-2422** · Dado Petroski numa mulher, então a suprailíaca marcada é a da linha axilar média; em Guedes, também; em
  Guedes num plano antigo com a suprailíaca de linha não informada preenchida, a marcada é essa, que aparece só por ter
  valor.
- **CA-2423** · Dado um homem de 65 anos com Jackson & Pollock 3, então a frase "Fora da população de origem: homens dos
  EUA, de 18 a 61 anos." aparece embaixo da linha do protocolo.
- **CA-2424** · Dado um menino de 12 anos com Slaughter (tríceps e subescapular), então aparecem "Maturação sexual" e
  "Grupo do estudo" com a nota da D-1414; com tríceps 10 e subescapular 8 (18 mm) e sem as duas, a gordura diz o que
  falta; com "Púbere" e "Branco", 15,8% (Slaughter, 1988).
- **CA-2425** · Dado o adipômetro "Harpenden", então ele fica gravado no plano e sai nos métodos do documento.
- **CA-2426** · Dado uma dobra digitada, então ela grava no campo do plano (`composicao.dobras.<dobra>`) e o resultado se
  atualiza; trocar de protocolo não apaga nenhuma dobra.

### Ajuda

- **CA-2427** · Dado o "?" do tríceps, quando tocado, então abre "Tríceps" com a imagem (texto alternativo "Adipômetro na
  dobra do tríceps"), o crédito "Fonte: CDC/NCHS – NHANES Anthropometry Procedures Manual (2007). Domínio público;
  disponível gratuitamente em cdc.gov. O uso não implica endosso do CDC." embaixo dela e o texto da técnica; quando
  outro "?" é tocado, então a primeira fecha; Esc fecha e o foco volta ao "?".
- **CA-2428** · Dado a ajuda do peso, então o crédito é "Foto: Navazob / Wikimedia Commons, CC BY 4.0." com "CC BY 4.0"
  levando à licença; dado a de uma medida sem imagem (antebraço), então só o título e o texto.
- **CA-2429** · Dado as 15 imagens do protótipo, então cada uma existe em `public/imagens/antropometria/` em WebP, com
  até 800 px no lado maior e até 120 KB, e cada uma tem o crédito em `THIRD_PARTY_NOTICES.md`.

### Resultado

- **CA-2430** · Dado a mulher de exemplo do protótipo (34 anos, 71,5 kg, 164,0 cm, JP 7 com as dobras do protótipo,
  cintura 84,0 no ponto médio, quadril 104,0, pescoço 33,8, braço direito 31,0, tríceps 24,0, punho 15,4), então a
  tabela tem os grupos "Peso e composição", "Gordura central", "Braço · Frisancho" e "Outras", na ordem do motor, e
  cada linha mostra o valor nas casas do motor (IMC "26,58 kg/m²", gordura "29,5%"), a recomendação do motor e o selo
  com o rótulo do motor.
- **CA-2431** · Dado cada nível do motor, então o selo usa: adequado → estado "ok"; atenção → "baixo"; alterado e grave →
  "alto"; informativo → neutro; e o rótulo do selo é sempre o do motor.
- **CA-2432** · Dado uma linha sem valor, então "Real" e "Recomendação" mostram "—" e a Situação mostra a frase do que
  falta: "Falta a cintura" (1), "Faltam o peso e a estatura" (2), "Faltam 3 dobras" (só dobras, 3 ou mais); sem nada
  faltando e com o motivo de recusa, o motivo.
- **CA-2433** · Dado o "ⓘ" da gordura, quando tocado, então abre embaixo da linha a citação completa da fonte do motor,
  os avisos da linha e a densidade; tocado de novo, fecha (`aria-expanded`).
- **CA-2434** · Dado a gordura pelas dobras, então o título do cartão é "Gordura por Jackson & Pollock, 7 dobras" e o
  detalhe da linha diz o método e a conversão; pela bioimpedância, "Gordura pela bioimpedância".
- **CA-2435** · Dado um adolescente de 15 anos, então a linha do IMC traz o escore-z e a classe da OMS e as linhas de
  cintura, RCQ, RCE, pescoço e compleição não aparecem; o grupo "Gordura central" some.

### Ponto de partida

- **CA-2436** · Dado uma adulta de 80 kg com 25% de gordura pelas dobras e perfil "Sedentária", então o gasto de
  repouso mostra "1.510 – 1.820 kcal/dia", com "Cunningham, 1991", a massa magra de 60,0 kg, a origem do % e "Evidência
  limitada".
- **CA-2437** · Dado objetivo "Ganhar massa muscular", adulto de 70 kg, então a proteína mostra "112 – 154 g/dia", "1,6 a
  2,2 g/kg de peso" e "Morton et al., 2018"; com objetivo "Manter o peso" e perfil "Sedentária", mostra o motivo do
  motor, sem número; trocar o objetivo grava `caso.objetivo`.
- **CA-2438** · Dado "Emagrecer" com IMC de 31, então a proteína pede "Peso de referência" com "Peso ideal", "Peso
  ajustado" e "Massa magra" (cada um com o peso); sem escolha, sem g/dia; escolhido o peso ajustado, a faixa em g/dia
  dele, e a escolha fica gravada.
- **CA-2439** · Dado o idoso de 70 anos com hipertensão na ficha, então a proteína é 1,2 – 1,5 g/kg (PROT-AGE) com "Com
  doença na ficha"; sem doença, 1,0 – 1,2.
- **CA-2440** · Dado "Doença renal crônica" na ficha, então aparece "TFGe abaixo de 30, sem diálise"; marcado "Sim",
  então a proteína mostra o alerta do PROT-AGE do motor e nenhuma faixa; sem a doença na ficha, a pergunta não aparece.
- **CA-2441** · Dado IMC 26,58 e cintura 84 numa mulher de 34 anos, então a prioridade mostra "Nível 1 de 4 ·
  Aumentado", os gatilhos com a fonte ("IMC de 25 a 29,99 (NHLBI, 2000)", "Razão cintura/estatura de 0,50 a 0,59
  (ABESO, 2016)") e "Proposta do app (sem diretriz)".
- **CA-2442** · Dado a meta de perda de 71,5 kg, então mostra "3,6 a 7,2 kg em cerca de 6 meses", o teto de 0,7 kg por
  semana e o déficit de 300 a 500 kcal/dia; com gordura alvo de 25% e 29,5% atuais, os dois pesos-alvo e o prazo
  mínimo; a gordura alvo fica gravada.
- **CA-2443** · Dado o gasto total do plano calculado, então a meta mostra a energia sugerida (gasto − déficit, nunca
  abaixo de 800 kcal/dia) com o aviso do motor quando bate no piso.
- **CA-2444** · Dado uma faixa de proteína fechada em g/dia, quando "Levar para o plano" é tocado, então a meta de proteína
  do plano vira `{ tipo: 'g_kg', min, max }` (g/kg de peso atual, 2 casas) e aparece "No plano de dd/mm como sugestão.
  Você ajusta lá."; sem faixa fechada, o botão fica desligado com o motivo.
- **CA-2445** · Dado uma pessoa de 17 anos, ou uma gestante, então o cartão diz "O ponto de partida vale de 18 anos em
  diante, fora da gestação."; dado uma lactante adulta, então o gasto e a prioridade aparecem, e a proteína e a meta não,
  com o motivo do motor.

### Divergência 2

- **CA-2446** · Dado o % pelas dobras, então o gasto de repouso, a proteína de Helms e a meta com gordura alvo trazem
  `origemDoPercentual` `{ origem: 'dobras', metodo: 'Jackson & Pollock, 7 dobras' }`; pela bioimpedância (InBody),
  `{ origem: 'bioimpedancia', metodo: 'Bioimpedância (InBody)' }`; sem %, `null`.
- **CA-2447** · Dado Petroski numa mulher com Σ 140 mm (recusada) e bioimpedância de 35%, então o gasto, a proteína de
  Helms, a meta com gordura alvo e o peso de referência (base massa magra) repassam "As dobras não calcularam (Petroski
  só vale até 115,5 mm de soma, o pico da equação): usado o % da bioimpedância."
- **CA-2448** · Dado o gasto com a origem na bioimpedância, então o aviso da faixa é "Proposta do app (sem diretriz): a
  faixa usa o erro típico das dobras (3,5 pontos de %); o erro da bioimpedância depende do aparelho e não foi
  conferido." e o das dobras não aparece; com a origem nas dobras, o de sempre; o número da faixa não muda.

### Histórico

- **CA-2449** · Dado as 4 avaliações do protótipo (12/05, 07/07, 08/09, 03/11/2026), então o Histórico mostra "4
  avaliações · de 12/05/2026 a 03/11/2026", os gráficos de peso e de gordura com um ponto por avaliação e o último valor
  escrito, e a tabela com as 4 datas, "Desde 08/09" e "Desde 12/05".
- **CA-2450** · Dado a soma das 7 dobras de 162,0 para 158,0 mm (as dobras do protótipo), então "Desde 08/09" mostra
  "−4,0" e "dentro do erro"; de 182,0 para 158,0, "−24,0" e "mudança real", pela MMD do motor (√Σ ETM²).
- **CA-2451** · Dado a cintura de 85,2 para 84,0 cm no mesmo ponto, então "−1,2" e "dentro do erro" (MMD 3,5 cm com 1,5%);
  com pontos diferentes nas duas, "ponto diferente" e nenhuma leitura.
- **CA-2452** · Dado o peso, então a nota é "balança"; IMC, RCQ e RCE, "calculado"; gordura e massas pelas dobras, "veja a
  soma"; protocolo diferente entre as duas, a soma diz "protocolo diferente".
- **CA-2453** · Dado uma avaliação sem peso no meio, então o gráfico de peso não tem ponto nela (a linha liga as que têm),
  a tabela mostra "—" e a variação que depende dela diz "—".
- **CA-2454** · Dado o painel "Mudança mínima detectável", então mostra a MMD da soma das dobras, da cintura e do quadril
  entre a penúltima e a última avaliação, as marcas de "Mesmo protocolo" e "Mesmo ponto de cintura" e a nota da ISAK.
- **CA-2455** · Dado um paciente com 1 avaliação, então o Histórico diz "O histórico começa na segunda avaliação." e não
  desenha gráfico.
- **CA-2456** · Dado o gráfico, quando uma data recebe o foco (teclado) ou o cursor, então a dica mostra a data, o valor e
  a variação desde a anterior ("Primeira avaliação" na primeira), e o leitor de tela lê o mesmo texto.

### Documento

- **CA-2457** · Dado "Gerar documento", então abre a prévia "Documento da avaliação" com o papel claro, "Salvar em PDF"
  (chama a impressão do navegador) e "Fechar"; e só a folha vai para o papel.
- **CA-2458** · Dado uma nutricionista com CRN, então o cabeçalho traz o nome, "Nutricionista · CRN-3 61427", o telefone e
  o e-mail do perfil, e o fim traz a linha de assinatura com nome, CRN, a cidade quando houver e a data por extenso.
- **CA-2459** · Dado a avaliação de exemplo, então o documento traz paciente (nome, nascimento com idade, sexo,
  "Retorno · 4ª avaliação", "Presencial"), métodos (protocolo, conversão, adipômetro, ponto da cintura, lado, origem),
  medidas básicas com a classificação do IMC e a fonte, circunferências, dobras com "●" nas do protocolo e a soma,
  diâmetros, resultados com referência, classificação e fonte curta, comparação com a anterior e referências sem
  repetir.
- **CA-2460** · Dado uma avaliação só com peso e estatura, então o documento sai sem circunferências, dobras, diâmetros
  e comparação, e com paciente, métodos, medidas básicas, resultados, diagnóstico e referências.
- **CA-2461** · Dado o diagnóstico vazio, quando "Usar o resumo das classificações" é tocado, então o campo recebe o
  rascunho (as classificações e as fontes), que fica gravado no plano; vazio, o papel mostra o espaço em linhas.
- **CA-2462** · Dado a exportação bloqueada pelo CRN, então "Gerar documento" fica desligado com o motivo.
- **CA-2463** · Dado uma conta de estudante, então o documento leva estagiário e preceptor e a frase de proposta, como
  as folhas de hoje.

### Gravação e compatibilidade

- **CA-2464** · Dado um plano novo, então `avaliacao` nasce com todos os campos vazios (`null`); dado um plano gravado antes
  desta versão (sem `avaliacao`), quando abre, então todo campo de antes tem o mesmo valor e `avaliacao` vem vazio; dado
  `avaliacao` parcial, o que veio fica.
- **CA-2465** · Dado `composicao.protocolo` com cada um dos 8 ids, então ele grava e relê igual; com um id desconhecido,
  relê igual e o resultado mostra a recusa "Protocolo desconhecido ...".
- **CA-2466** · Dado a lista D-367, então cada campo de `avaliacao` tem a sua classe; campo novo sem classe não compila.
- **CA-2467** · Dado o retorno de um paciente, então a origem, a maturação, o diagnóstico e as observações vêm vazios; a
  modalidade, o adipômetro, o grupo, o perfil, o IMC-alvo, a gordura alvo, a base, a TFGe e a data da autorização vão
  iguais; dado um plano sem paciente com fotos, a cópia vem sem fotos e sem anexos.
- **CA-2468** · Dado a etapa 1 de um plano com Petroski, então a composição corporal mostra "Protocolo da avaliação
  completa: Petroski" e "Abrir a avaliação completa", sem as dobras nem o resultado das dobras; escolher "Jackson e
  Pollock, 3 dobras" ali volta às 6 dobras de hoje.
- **CA-2469** · Dado as mudanças feitas na tela nova, então elas sobem para a nuvem como qualquer mudança do plano (o mesmo
  repositório; o "Salvo" do cabeçalho).

### Celular

- **CA-2470** · Dado 360, 390 e 412 px, então a vista Avaliação (todas as medidas vazias e todas preenchidas), o Histórico
  e a prévia do documento não rolam para o lado (`scrollWidth <= innerWidth`).
- **CA-2471** · Dado 390 px com toque, então cada botão, campo, "?", "ⓘ", "Ocultar/Exibir" e seletor da tela tem pelo
  menos 44 px de altura.
- **CA-2472** · Dado 390 px, então os campos de lado mostram "Dir." e "Esq." dentro do campo e ficam lado a lado; a ajuda
  abre embaixo, presa à tela; a tabela do resultado mostra nome e real numa linha e recomendação e situação na outra.

### Fotos e anexos (F2)

- **CA-2480** · Dado a autorização desmarcada, então "Adicionar foto" fica desligado e a frase pede a marca; marcada, então
  grava a data de hoje e mostra "registrado em dd/mm/aaaa"; desmarcar não apaga fotos.
- **CA-2481** · Dado uma foto JPEG válida de 4 MB e 4000 × 3000 px, quando adicionada, então ela sobe reduzida (lado maior
  1600 px, JPEG), aparece com o ângulo e o tamanho, e a lista do plano ganha o item com o caminho
  `<conta>/<plano>/fotos/<id>.jpg`.
- **CA-2482** · Dado um GIF renomeado para `.jpg`, então "Use JPG ou PNG." e nada sobe; dado um PDF como foto, o mesmo;
  dado um PDF como anexo, sobe; dado um PNG renomeado para `.pdf` como anexo, sobe como PNG.
- **CA-2483** · Dado 5 fotos, então "Adicionar foto" fica desligado e "5 de 5 fotos"; dado 7,8 MB usados e um anexo de
  0,5 MB, então "Passa de 8 MB somando fotos e anexos." e nada sobe.
- **CA-2484** · Dado uma imagem com 9000 px no cabeçalho, então "Use uma foto de até 20 MB e 8000 px." sem abrir a imagem.
- **CA-2485** · Dado "Excluir" numa foto, quando confirmado, então o arquivo sai do balde e da lista; dado a falha do
  servidor, então a foto fica e a frase diz "Não foi possível excluir. Tente de novo."
- **CA-2486** · Dado "Comparar fotos" com fotos de frente em 08/09 e 03/11, então as duas aparecem lado a lado com a data, o
  ângulo e o peso, e as diferenças de peso, cintura e soma das dobras com a leitura da MMD; sem foto de lado em uma
  delas, "Sem foto de lado em 08/09/2026."
- **CA-2487** · Dado a tela, então não há botão de compartilhar, baixar foto ou levar foto ao documento, e a frase do art.
  58 aparece.
- **CA-2488** · Dado o SQL 018 no Supabase local, então: a conta A envia, lê, assina e apaga na pasta dela; a conta B não
  lê, não lista, não assina, não apaga e não envia na pasta de A; anônimo não faz nada; tipo fora de JPEG, PNG e PDF e
  arquivo acima de 8 MB são recusados; a 6ª foto e o 11º anexo de um plano são recusados.
- **CA-2489** · Dado a exclusão da conta pelo site, então a pasta da conta no balde `fotos-avaliacao` fica vazia antes de
  o login sair; dado a exclusão de um plano, então a pasta do plano fica vazia.
- **CA-2490** · Dado o modo local (sem servidor), então o cartão diz "Fotos e anexos ficam guardados na conta, na nuvem." e
  não oferece envio.
- **CA-2491** · Dado a CSP do app com o Supabase, então o `img-src` tem a origem do Supabase; sem Supabase, não.

## 4. Casos de borda

- **CB-1400** · **Plano antigo** (gravado antes do motor e antes desta tela): abre igual, com os campos novos vazios, a
  origem "Origem não informada", o ponto "Ponto não registrado" (o motor avisa que assume o ponto médio), a suprailíaca de
  linha não informada aparecendo por ter valor, e o protocolo de hoje. Nenhum número da etapa 1 muda.
- **CB-1401** · **Sem idade** (ficha sem nascimento, plano sem idade, idade inválida): a linha "Feminino · objetivo: ..."
  sem idade; o motor diz que falta a idade nas linhas que precisam (D-1040); estimativas, peso ideal e ponto de partida
  dizem o motivo; Slaughter fica ligado (não dá para saber a idade).
- **CB-1402** · **Criança** (6 anos): IMC por escore-z; Slaughter ligado, os outros protocolos com "Fora da população de
  origem"; com JP 7, a recusa de Lohman abaixo de 7 anos (D-1042); sem cintura, RCQ, RCE, pescoço e compleição; braço com
  percentil sem situação; estimativas, peso ideal e ponto de partida com o motivo; nenhuma rolagem lateral.
- **CB-1403** · **Idoso** (85 anos): IMC do SISVAN (> 22 e < 27), panturrilha do idoso, braço sem situação de 75 anos em
  diante (Frisancho 1990 até 74,9), Chumlea primeiro nas estimativas (fora de 60 a 90 com aviso), peso ideal com IMC-alvo
  24,5 e faixa > 22 e < 27, prioridade com o sobrepeso em 27, proteína do PROT-AGE.
- **CB-1404** · **Gestante:** só o IMC pré-gestacional (ou o que falta); nenhum protocolo de dobras calcula ("As equações
  de dobras não valem na gestação."); estimativas, peso ideal e ponto de partida com o motivo; braço sem situação.
- **CB-1405** · **Sem bioimpedância e com as dobras incompletas:** gordura, massas e soma dizem o que falta, com "Ou informe
  o % de gordura da bioimpedância."; o gasto de repouso diz o que falta; a proteína de Helms também.
- **CB-1406** · **Recusa do protocolo** (soma acima do pico, implausível, Lohman abaixo de 7, desconhecido): sem
  bioimpedância, as linhas de gordura, massa gorda e massa magra mostram o motivo do motor no lugar do selo; com
  bioimpedância, o valor do aparelho e o aviso da D-1042 no "ⓘ".
- **CB-1407** · **Celular** (360 a 412 px): D-1439 e D-1440; nome enorme do paciente quebra em até 2 linhas (D-801); o
  resultado com todos os grupos cabe sem rolar de lado; a ajuda não passa de 70% da altura.
- **CB-1408** · **Valores extremos** (peso 350 kg, dobra de 90 mm, cintura de 250 cm, estatura de 45 cm): a tela não quebra;
  o motor decide (recusa, aviso ou valor); número inteiro à vista no campo (D-803).
- **CB-1409** · **Vírgula e texto**: "71,5" e "71.5" valem 71,5; texto que não é número fica no campo sem virar dado
  (CampoNumero, CB-12); campo apagado é `null`, nunca 0.
- **CB-1410** · **Outra aba ou aparelho mudou o plano**: a tela relê do repositório como o plano faz hoje (CA-49); o
  plano excluído em outra aba mostra CA-2408.
- **CB-1411** · **Sem sexo:** os protocolos e as linhas por sexo dizem que falta o sexo; o perfil e a origem usam "a
  pessoa"; nenhum rótulo assume sexo.
- **CB-1412** · **Uma só avaliação:** o Histórico diz que começa na segunda; o documento sai sem comparação; "Comparar
  fotos" diz "Comparar fotos precisa de outra avaliação com foto."
- **CB-1413** · **Rede caída no envio da foto** (F2): a foto não entra na lista, a frase diz "A foto não subiu. Confira a
  internet e tente de novo." e nada fica pela metade (arquivo sem linha é apagado; linha sem arquivo não é gravada).
- **CB-1414** · **URL assinada vencida** (F2): ao falhar a imagem, a tela pede uma nova uma vez; falhando de novo, o quadro
  diz "Não foi possível abrir a foto."
- **CB-1415** · **Permissão negada pelo servidor** (F2; conta excluída em outra aba, sessão vencida): a frase do servidor
  vira "Entre de novo para enviar fotos." e nada fica pela metade.
- **CB-1416** · **Duas abas enviando foto ao mesmo plano** (F2): o limite de 5 fotos vale também no servidor (CA-2488); a
  segunda aba recebe "Já há 5 fotos nesta avaliação." e relê a lista.
- **CB-1417** · **Dados de pior caso** (`break-ui`): todas as medidas vazias, todas preenchidas, nome enorme, criança de 6
  anos, idoso de 85, gestante: nada rola de lado, nada se sobrepõe, nenhum "NaN", "undefined" ou "null" aparece.

## 5. O que fica para a Mor e para o dono

Listado também no PLAN, seção "Para a Mor".

## 6. Fontes

As do motor (`src/domain/fontesAntropometria.ts`; spec `antropometria-completa`, seção 7), e mais: CFN 594/2017 (prontuário),
CFN 599/2018 (Código de Ética, arts. 21 e 58), CFN 760/2023 (telenutrição), LGPD (Lei 13.709/2018, arts. 5º, 11 e 18) e a
pesquisa de 03/11/2026, seções 1 (técnica), 5 (imagens e licenças) e 7 (documento).

## 7. Divergências entre o protótipo e o motor (vale o motor)

| Onde | Protótipo | App (motor) |
|---|---|---|
| Cintura | "Risco muito aumentado"; NIH "Até 102", "Sem risco alto" / "Risco alto" | "Risco substancialmente aumentado" (D-1020); NIH "Sem risco aumentado" / "Risco aumentado" com > 102 / > 88 |
| RCQ | "Risco substancial" | "Risco substancialmente aumentado" (D-1021) |
| Pescoço | dois níveis (34 e 36,5 na mulher), "Abaixo do corte", "Indica obesidade" | um nível só, conferido (D-1023): "Sem indicação de excesso de peso" / "Indica avaliar excesso de peso" |
| Panturrilha | < 31 cm (Caderneta), "Classifica a partir de 60 anos" abaixo dos 60 | Pagotto 2018, < 34 / < 33 cm (D-1029); abaixo de 60 anos, a linha não vem |
| Braço | só mulheres de 30 a 34,9 anos; AMBc e AGB com 1 casa; "Déficit muscular", "Musculatura alta" | todas as idades e sexos de Frisancho; AMB e AGB com 2 casas; rótulos da D-1025; adequações como linhas próprias |
| FMI e FFMI | no resultado | fora (spec do motor, seção 6) |
| IMC | "Magreza grau I a III" | "Baixo peso" (SISVAN, D-1017) |
| Estimativas | Chumlea 1994 por grupo (branca/negra) no adulto; peso só Rabito V | Rabito VII e V/IV/III no adulto, Chumlea 1985 e 1988 no idoso, sem grupo; Rabito pelo lado esquerdo (D-1030) |
| Peso ajustado | "Ideal + 25% do excesso", acima de IMC 30 | (peso − peso no IMC 25) × 0,25 + peso no IMC 25, de IMC 30 em diante (D-1027) |
| Proteína | objetivos "Treina", "Hipertrofia", "Atleta em déficit" | objetivo do plano (emagrecer, manter, ganhar) e o perfil (D-1032) |
| Gasto de repouso | Cunningham 1980 para "não sedentária" | Cunningham 1980 só para ativo ou atleta com IMC < 30 (D-1031) |
| Prioridade | gatilho "Cintura/estatura 0,51 (ABESO 2016; NICE 2025)"; "Cálculo do app" | gatilhos e fontes do motor (D-1033); "Proposta do app (sem diretriz)" (D-1036) |
| Meta de perda | "500 a 750" fora do sobrepeso; "em cerca de 6 meses" | 300–500 abaixo de IMC 30 (D-1034 revista); fase 1 de 26 semanas, que a tela escreve "em cerca de 6 meses" |
| Antebraço e punho | direito e esquerdo | um campo só (D-1003) |
| Mudança mínima | ETM da avaliadora (2,8% e 0,9%) | ETM padrão da ISAK nível 1 (7,5% e 1,5%) e soma por √Σ ETM² (D-1035) |
| Salvar | botão "Salvar" e "Salvo às 10:42" | salva a cada mudança; "Salvo" no cabeçalho (D-1403) |
| Diagnóstico do documento | texto pronto | campo da nutricionista, com rascunho a pedido (D-1432) |
| Prontuário | "Prontuário 0187" | sem o campo (D-1438) |
