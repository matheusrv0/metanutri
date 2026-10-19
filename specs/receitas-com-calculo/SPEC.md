# SPEC — Receitas com cálculo

Status: **pedida pelo dono em 19/10/2026 ("resolva todo o resto"); aprovação pelas telas antes de publicar**. É o item 6
da fila do `docs/pesquisa/dietbox-comparativo.md` e a ideia B-32 do `docs/backlog.md` ("Preparações e receitas com
ingredientes, rendimento e valor por porção").

**Hoje:** receita é um campo de texto livre do plano ("Receitas", no cartão "Orientações e receitas"), sem cálculo.
Pela D-34 da spec `ajustes-de-uso`, ele só aparece para estudante (ou quando o plano já tem texto), porque era o campo
"Receitas saudáveis" do modelo de estágio. Uma panqueca entra no plano como ingredientes soltos: o paciente lê "banana,
ovo, aveia" e a soma de micros só fica certa se a nutricionista lembrar de pôr cada ingrediente.

**Objetivo:** a nutricionista monta uma vez "Panqueca de banana" com os ingredientes da base, o rendimento e o modo de
preparo, e põe "1 unidade de Panqueca de banana" no plano. Energia, macros e os 16 nutrientes da adequação somam certo
pelos ingredientes; o paciente lê "Panqueca de banana" na refeição e a receita inteira numa seção "Receitas".

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-270 | **Receita com cálculo é para todo mundo**: nutricionista e estudante, em qualquer plano de assinatura. O campo de texto antigo ("Receitas" do caso) continua como está, com a D-34: só aparece para estudante ou quando já tem texto | A D-34 tirou da nutricionista um campo do modelo de estágio, não a receita em si. Receita calculada é rotina de consultório (o Dietbox tem). A assinatura muda quantidades (pacientes, links), não as telas que abrem |
| D-271 | **Uma receita é:** nome, ingredientes (alimentos da base ou de "Meus produtos", cada um em gramas), rendimento (quantas porções e o nome da porção: porção, unidade, fatia, pedaço, copo, xícara, colher de sopa ou concha), peso pronto (opcional) e modo de preparo. **O valor de uma porção** é a soma dos ingredientes dividida pelas porções. **O peso de uma porção** é o peso pronto dividido pelas porções; sem peso pronto, a soma dos ingredientes dividida pelas porções. Não há fator de cocção nem de retenção de nutriente: cada ingrediente conta como foi escolhido na base (cru ou cozido) | É a conta que a nutricionista faz à mão. O peso pronto existe porque o preparo perde ou ganha água (o bolo assado pesa menos que a massa). Fator de cocção é outra função, com fonte própria (R-271) |
| D-272 | **As receitas são da conta**, numa biblioteca própria (chave `metanutri:receitas`), que vai para a nuvem item por item, com lápide, como Meus produtos e os modelos de suplemento. Tela **"Receitas"** no menu, no grupo Alimentos, depois de "Meus produtos": lista, busca pelo nome, nova, editar, duplicar ("(cópia)") e excluir com confirmação. O editor abre na própria tela, no lugar da lista, e não em janela | A nutricionista usa a mesma panqueca em vários pacientes. Editor com busca de ingrediente e lista é grande demais para uma janela por cima da tela |
| D-273 | **O plano guarda uma cópia da receita.** Pôr a receita numa refeição copia nome, ingredientes, rendimento, peso pronto e modo de preparo para o item do plano. Editar ou excluir a receita depois não muda nenhum plano que já a usa. Para o plano ter a versão nova, tira-se a receita da refeição e põe-se de novo. Modelo de plano, duplicar plano e a dieta do link levam a cópia junto | Um plano já entregue ao paciente não pode mudar sozinho porque a nutricionista corrigiu a receita para outro paciente. É a regra mais segura (pedido do coordenador) |
| D-274 | **Na refeição, a receita entra pela mesma busca dos alimentos**, marcada "Receita", acima dos alimentos (no máximo 2 receitas na lista), com a porção, o peso e as kcal. Sem quantidade, entra 1 porção. Com o nome da porção ("2 unidade panqueca", ou "2 porção panqueca"), entram 2 porções; só número ("150 panqueca"), 150 g. **Na linha do plano**, a receita mostra o nome dela, "Receita · 1 unidade" embaixo, as gramas editáveis e as kcal, como qualquer alimento; não tem o botão Substituir | Um caminho só para pôr comida na refeição, sem aba nova. As gramas continuam o número que se edita, como em todo alimento; a porção aparece como a medida caseira aparece hoje (R-273) |
| D-275 | **Falta de dado:** o nutriente de um ingrediente que a base não tem não vira zero. A soma entra com o que os outros ingredientes têm, e o total ganha a marca † (possivelmente subestimado), contando o ingrediente sem dado como "alimento do plano sem este nutriente". Ingrediente que não existe mais (produto excluído) aparece como "Alimento removido" e conta como sem dado em todo nutriente | Regra do produto: falta de dado nunca é zero. A marca † já existe no painel de micros e na adequação |
| D-276 | **O cobrir não sugere receita.** Ele sugere só alimento da base que passa pela regra prescritível (`prescritivel.ts`). A receita no plano entra na soma, então o cobrir vê a falta já descontada. Também ficam de fora: trocas da folha (a receita não tem troca, e os ingredientes dela também não), a calculadora de substituto e a contagem de frutas e vegetais das missões (a missão da refeição conta a receita como alimento) | A sugestão do app é de alimento que a nutricionista prescreve como está. Receita é preparação escrita pela nutricionista; o app não inventa preparação. "Comer a fruta do plano" não se lê numa panqueca |
| D-277 | **Folha impressa:** na refeição, o nome da receita como a nutricionista escreveu (D-182), e a porção com o peso ao lado ("1 unidade e meia · 180 g"); sem porção que feche em meias medidas, o peso. Depois de "Orientações" e "Suplementos", a seção **"Receitas"** traz cada receita do plano uma vez: nome, "Rende 2 unidades (120 g cada)", ingredientes da receita inteira (nome para o paciente e a medida da folha) e o modo de preparo; o texto livre antigo vem depois, na mesma seção. **Lista de compras:** a receita entra pelos ingredientes, na quantidade do dia, somados aos mesmos alimentos de fora dela | Porção de receita caseira não tem tamanho padrão: o peso ao lado deixa o paciente conferir (a mesma ideia da medida vaga, D-189). O paciente precisa dos ingredientes para cozinhar e para comprar |
| D-278 | **Link do paciente ("Meu plano"):** a receita aparece na refeição como um alimento ("1 unidade · 120 g" e "Panqueca de banana"). A cópia do link ganha a lista das receitas do plano (nome, rendimento, ingredientes com medida e peso, modo de preparo), mostrada em "Receitas", antes do texto livre. Como o resto do link, vira texto na hora da cópia e usa o nome da base nos ingredientes (spec `impressao-do-plano`, R-182). Link de antes desta versão abre como antes | O link mostra o que a folha mostra (D-150 da `dieta-no-link`) |
| D-279 | **Word de aconselhamento:** a receita na refeição sai "Panqueca de banana (1 unidade · 120 g)". As receitas do plano saem com nome, rendimento, ingredientes e modo de preparo: para estudante, dentro de "RECEITAS SAUDÁVEIS", antes do texto livre; para nutricionista, numa seção "RECEITAS" só com elas (o texto livre continua fora, CA-235) | O Word é o documento do estágio e também o da nutricionista; a receita calculada é dos dois |

## 2. Histórias e critérios de aceite

Pessoas: **nutricionista** e **estudante** (quem monta o plano) e **paciente** (quem lê a folha e o link).

### US-RC1 · A biblioteca de receitas (3 pts)

Como nutricionista, quero cadastrar uma receita uma vez e usar em vários planos.

- **CA-860** · Dado uma conta de nutricionista ou de estudante, em qualquer plano de assinatura, então o grupo "Alimentos" do menu tem "Receitas", que abre a lista de receitas da conta, e a lista vazia diz "Nenhuma receita ainda." com o botão "Nova receita".
- **CA-861** · Dado "Nova receita", quando escrevo o nome, adiciono ingredientes pela busca (como na refeição: "2 colher de sopa aveia", "1 unidade banana"), ajusto as gramas de cada um, digo quantas porções rende e o nome da porção, e salvo, então a receita aparece na lista com o nome, "Rende 2 unidades · 120 g cada" e as kcal de uma porção.
- **CA-862** · Dado o editor com ingredientes, então ele mostra, enquanto monto, o valor de uma porção: o peso, a energia, a proteína, o carboidrato, a gordura e a fibra, calculados pela D-271; com o peso pronto vazio, o campo diz quanto dá a soma dos ingredientes.
- **CA-863** · Dado uma receita salva, quando edito e salvo, então a lista mostra a receita mudada.
- **CA-864** · Dado uma receita, quando escolho "Duplicar", então surge "Nome (cópia)" com os mesmos ingredientes, rendimento, peso pronto e modo de preparo, e "(cópia)" de uma cópia vira "(cópia 2)".
- **CA-865** · Dado uma receita, quando escolho "Excluir", então uma confirmação diz que os planos que já usam a receita continuam com ela; confirmando, ela sai da lista.
- **CA-866** · Dado várias receitas, quando digito parte do nome no campo de busca da lista, então só aparecem as que têm esse trecho, sem diferença de acento e maiúscula.

### US-RC2 · As receitas na nuvem (2 pts)

Como nutricionista com conta, quero as minhas receitas em qualquer aparelho.

- **CA-867** · Dado a chave das receitas, então ela é dado da conta: está em `CHAVES_DE_DADOS`, entra na cópia da nuvem, no backup de Configurações e na migração dos dados de antes da conta (que junta sem perder nenhuma).
- **CA-868** · Dado dois aparelhos da mesma conta, então: a receita criada em A aparece em B; receitas diferentes mudadas em A e em B ficam as duas mudanças; a mesma receita mudada nos dois fica com a mudança mais nova; a receita excluída em A não volta pelo B.
- **CA-869** · Dado receitas salvas na conta, quando saio e entro em outro aparelho (navegador vazio), então as receitas estão lá, e um plano com receita calcula igual.

### US-RC3 · A receita na refeição (5 pts)

Como nutricionista, quero pôr "1 unidade de Panqueca de banana" no plano e ver a soma certa.

- **CA-870** · Dado uma receita num plano, quando edito ou excluo a receita na biblioteca, então o plano continua igual: mesmo nome, mesmos ingredientes e mesmos valores (D-273).
- **CA-871** · Dado a busca de uma refeição, quando digito parte do nome de uma receita, então ela aparece acima dos alimentos, marcada "Receita", com a porção, o peso e as kcal ("1 unidade · 120 g · 250 kcal"); Enter ou clique põe 1 porção na opção aberta, e a busca de alimento continua igual para o resto.
- **CA-872** · Dado a busca, quando digito "2 unidade panqueca" (o nome da porção da receita) ou "2 porção panqueca", então entram 2 porções; "150 panqueca" põe 150 g; uma medida que não é a da porção ("2 colher panqueca") não põe nada e diz "Esta receita é medida em unidade. Use "2 unidade" ou as gramas."
- **CA-873** · Dado uma receita no plano, então a linha mostra o nome da receita, embaixo "Receita · 1 unidade" (em meias medidas, como a medida caseira; sem meia medida que feche em 15% do peso, só "Receita"), as gramas editáveis e as kcal; não tem o botão "Substituir".
- **CA-874** · Dado uma receita na opção principal, então energia, macros e todos os nutrientes somam pelos ingredientes, na proporção das gramas (2 porções somam o dobro de 1): no kcal do cartão da refeição, no resumo do dia e nos micros do painel lateral, na adequação, no memorial de cálculo e na tabela copiada. Receita em substituto não soma, como todo substituto.
- **CA-875** · Dado um ingrediente sem dado de um nutriente (vitamina A da aveia, por exemplo), então o total do dia desse nutriente leva a marca †, com a contagem desse ingrediente, e soma o que os outros ingredientes têm (D-275).
- **CA-876** · Dado um plano com receita, quando salvo como modelo e uso o modelo, ou duplico o plano, então o plano novo tem a mesma receita (a cópia), com a mesma soma.
- **CA-877** · Dado o cobrir de qualquer nutriente, com receitas na conta e no plano, então nenhuma sugestão é receita; a falta que ele cobre já desconta a receita do plano.
- **CA-878** · Dado uma refeição só com receita, então a missão da refeição aparece; a receita não conta como fruta nem como vegetal nas missões.

### US-RC4 · A receita na folha impressa (3 pts)

Como paciente, quero ler "Panqueca de banana" na refeição e saber fazer.

- **CA-879** · Dado uma receita no plano, então a linha da refeição na folha mostra o nome da receita como foi escrito e a porção com o peso ao lado ("1 unidade e meia · 180 g"); sem porção que feche em meias medidas, só o peso.
- **CA-880** · Dado receitas no plano (na principal ou num substituto), então a folha tem a seção "Receitas" depois de "Orientações" e "Suplementos", com cada receita uma vez: o nome, "Rende 2 unidades (120 g cada)", os ingredientes da receita inteira (nome para o paciente e a medida da folha) e o modo de preparo; o texto livre antigo, se houver, vem depois, na mesma seção. Sem receita e sem texto, a seção não aparece.
- **CA-881** · Dado "Lista de compras" marcada e uma receita na principal, então a receita entra pelos ingredientes, na quantidade do dia (1 porção de uma receita que rende 2 leva metade de cada ingrediente), somados ao mesmo alimento fora da receita; a receita em si não vira linha.
- **CA-882** · Dado "Trocas" marcada, então a receita não tem trocas, e os ingredientes dela não entram nas trocas.

### US-RC5 · A receita no link do paciente (2 pts)

Como paciente, quero ver a receita no celular.

- **CA-883** · Dado uma receita no plano e a dieta no link, então "Meu plano" mostra na refeição a porção e o peso ("1 unidade · 120 g") e o nome da receita.
- **CA-884** · Dado receitas no plano, então "Meu plano" tem a seção "Receitas" com cada receita: nome, rendimento, ingredientes (medida e peso) e modo de preparo; o texto livre, se houver, vem depois.
- **CA-885** · Dado um link de antes desta versão (a cópia não tem a lista de receitas), então ele abre como antes; dado um plano sem receita, então o cartão do link não diz que o plano mudou só por causa desta versão; pôr, mudar a quantidade ou tirar uma receita do plano conta como mudança ("Atualizar a dieta no link").

### US-RC6 · A receita no Word (1 pt)

- **CA-886** · Dado uma receita no plano, então a refeição no Word diz "Panqueca de banana (1 unidade · 120 g)".
- **CA-887** · Dado receitas no plano, então o Word traz cada receita com nome, rendimento, ingredientes e modo de preparo: para estudante, dentro de "RECEITAS SAUDÁVEIS" e antes do texto livre; para nutricionista, numa seção "RECEITAS" só com elas (o texto livre continua fora, CA-235). Sem receita no plano, o Word sai como hoje.

### US-RC7 · O que já existe continua (1 pt)

- **CA-888** · Dado um plano, um modelo, um link ou um backup de antes desta versão, então abrem e calculam como antes; o campo de texto "Receitas" do caso continua com a D-34, e o texto dele sai na folha, no Word e no link como antes.
- **CA-889** · Dado a tela a 360 px, então a lista de receitas, o editor e a linha da receita no plano cabem sem rolagem para o lado, e todo botão tem 44 px de altura.

## 3. Casos de borda

- **CB-270** · Salvar a receita sem nome, sem ingrediente com gramas, com o rendimento vazio, zero ou negativo, ou com o peso pronto zero ou negativo: não salva, e o campo diz o que falta ("A receita precisa de um nome.", "Adicione pelo menos um ingrediente.", "Diga quantas porções a receita rende.", "O peso pronto precisa ser maior que zero.").
- **CB-271** · Ingrediente que não existe mais (produto excluído de "Meus produtos"): a linha diz "Alimento removido", ele conta como sem dado em todo nutriente (†), e nenhuma tela quebra (editor, plano, painel, folha, link, Word).
- **CB-272** · Receita com 0 g no plano: não soma, e não sai na folha, no link nem na lista de compras, como alimento.
- **CB-273** · Cópia de receita estragada no plano (campo faltando ou de outro tipo, vindo de dado mexido à mão): a linha diz "Receita sem dados", conta como sem dado em todo nutriente, e nada quebra.
- **CB-274** · Navegador que não guarda dados: as receitas valem só enquanto a aba está aberta, e a tela avisa, como em "Meus produtos".
- **CB-275** · A mesma receita mudada em dois aparelhos ao mesmo tempo: fica a mudança mais nova; excluída num e editada no outro: vale a mais nova entre a exclusão e a edição (regra da junção, D-132 da `dados-na-nuvem`).
- **CB-276** · Nome, nome de ingrediente ou modo de preparo com código (script, imagem com onerror): sai como texto em toda tela e documento.
- **CB-277** · Dieta com receitas grandes demais para o link: a trava de 256 KB vale, com a mensagem de hoje ("Encurte as orientações ou as receitas…").
- **CB-278** · Duas cópias diferentes da mesma receita no plano (editada entre uma adição e outra): na seção "Receitas" saem as duas, cada uma com os seus ingredientes; cópias iguais saem uma vez.
- **CB-279** · Rendimento fracionado (2,5 porções) ou porção que não fecha em meias medidas: a conta usa o número exato; o texto da porção some e fica o peso.

## 4. Fora de escopo, explicitamente

- Fator de cocção, fator de correção e retenção de nutriente no preparo (R-271).
- Editar a cópia da receita dentro do plano, e um botão "atualizar com a receita salva" (D-273).
- Receita dentro de receita; receitas prontas do sistema; foto; compartilhar receita entre contas.
- O cobrir sugerir receita, trocas para receita, calculadora de substituto para receita (D-276).
- Medida caseira de cada ingrediente na tela do editor além da que a busca já mostra.
- Juntar o texto livre antigo às receitas calculadas, ou converter o texto em receita.
- Mudar a D-34 do campo de texto.

## 5. O que fica com você

1. Olhar os prints de antes e depois (lista no relatório) e aprovar antes de publicar.
2. Dizer se a D-270 vale (receita calculada para nutricionista também).
3. Nada de SQL nem de função nova: a receita viaja dentro da cópia da conta e da dieta do link, que já existem.

## 6. Riscos para você revisar

- **R-270** · Um aparelho com a versão antiga do site aberta (antes de atualizar) que abre um plano com receita não sabe
  calcular a receita, e a tela do plano quebra até a página recarregar na versão nova (o aviso "versão nova" já pede
  isso). A biblioteca não corre risco: a versão antiga não apaga a chave que não conhece (D-170). Para diminuir a
  janela, publique e recarregue os aparelhos antes de pôr receita em plano.
- **R-271** · Sem fator de cocção, a receita soma os ingredientes como estão na base. Quem escolhe o ingrediente cru e
  informa o peso pronto tem a porção certa em peso, mas a vitamina C (que se perde no calor) fica superestimada. É a
  conta que a nutricionista faz hoje à mão; fator de retenção é uma função à parte, com fonte própria.
- **R-272** · A cópia no plano (D-273) faz a receita corrigida não chegar sozinha aos planos antigos. Se a nutricionista
  corrigir um erro de ingrediente, precisa refazer nos planos que importam.
- **R-273** · A quantidade da receita na linha do plano continua em gramas (como todo alimento); a porção aparece
  embaixo. Quem pensa em "2 panquecas" usa a busca ("2 unidade panqueca") ou multiplica as gramas.
- **R-274** · A busca mostra no máximo 2 receitas acima dos alimentos. Com muitas receitas parecidas ("panqueca de
  banana", "panqueca de aveia", "panqueca salgada"), a terceira só aparece digitando mais do nome.
