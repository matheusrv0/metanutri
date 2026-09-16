# Feedback da nutricionista (entra na SPEC)

## 15/09/2026, protótipo v1

Mensagens recebidas (WhatsApp, 08:34 a 08:35):

> Precisa acrescentar campo para peso e altura
> Para calcular a TMB e campo para nível de atividade, para calcular GET
> Pq vai dar as kcal necessárias para o dia

### O que isso muda no produto

- Perfil do paciente/caso precisa de: sexo, idade (número, não faixa), peso (kg), altura (cm) e nível de atividade.
- Calcular a TMB (taxa metabólica basal) com fórmula escolhível: Mifflin-St Jeor (1990) e Harris-Benedict (1919). Avaliar depois FAO/OMS (1985), muito usada em faculdades.
- GET (gasto energético total) = TMB × fator de atividade (1,2 / 1,375 / 1,55 / 1,725 / 1,9).
- A meta de kcal do dia passa a ser o GET; o painel mostra "kcal do plano ÷ GET" e alerta abaixo de 90% ou acima de 110%.
- As sugestões para cobrir micros devem respeitar as kcal que sobram até o GET.

### Critérios de aceite a escrever na SPEC (rascunho)

- Dado um perfil completo, quando o usuário troca a fórmula, então TMB e GET recalculam sem apagar o plano.
- Dado peso ou altura vazio, então TMB e GET não aparecem e o painel avisa o que falta (não mostra zero).
- Dado idade fora de 19 a 50 anos, então o sistema avisa que as DRI carregadas cobrem só adultos de 19 a 50 (limite do MVP).
- Dado o plano acima do GET, quando o usuário clica em "cobrir", então as sugestões mostram que a kcal vai exceder o GET.

Implementado no protótipo v2 (artifact "MetaNutri Protótipo") em 15/09/2026 para validação.

## 15/09/2026, segunda rodada (09:43 a 09:53)

> da uma olhada no conteúdo do dietitian
> embora ele não seja o mais famoso, ele tem uma escrita inteligente, para otimizar o tempo
> Era o que eu mais odiava no webdiet. Tinha que caçar os alimentos
> E essas sugestões de alimentos para adequar vai ser de uma ajuda enoooorme
> pq mts vezes eu tenho que pesquisar o que incluir para suprir isso
> Se não fosse pelo wellhub eu não iria para dietbox

### O que apurei

- **Dietitian** (dietitian.com.br): "Escrita Inteligente" = enquanto o nutri digita, o sistema sugere alimentos, medidas caseiras e nutrientes em tempo real. Planos: Free R$ 0 (5 pacientes), Plus R$ 69,90 por 3 meses e depois R$ 84,90, Estudante R$ 0 com pacientes ilimitados e app do paciente (uso comercial vedado nos termos), "Recém-formado" R$ 29,90 nos 3 primeiros meses (só no site, não consta nos termos), Professores R$ 0. Diz ter 15.000 nutricionistas. App do paciente novo: 5,0 na Google Play com 17 avaliações, 10 mil+ downloads. Sem página no Reclame Aqui encontrada.
- **Wellhub no Dietbox** é benefício corporativo para o próprio nutricionista ("Quem cuida também merece cuidado"), não canal de pacientes. Ela fica no Dietbox pelo benefício, não pelo software: um produto complementar (micros) não briga com isso.

### O que isso muda no produto

- **Entrada rápida de alimentos é requisito de primeira ordem**, não detalhe de UI: digitar "150 arroz integral" e ver as opções aparecerem na hora, com medida caseira. "Caçar alimento" foi a dor mais forte que ela verbalizou.
- A sugestão de alimentos para adequar micros foi validada como "ajuda enorme" e como tarefa que hoje ela faz pesquisando fora do software.
- O Dietitian ocupa o preço de recém-formado (R$ 29,90) e dá estudante grátis com app do paciente. O nosso espaço é a funcionalidade (cobrir micros, depois missões) a preço fixo, e não o preço em si.

### Critérios de aceite a escrever na SPEC (rascunho)

- Dado o campo de entrada rápida, quando o usuário digita quantidade e parte do nome ("150 arroz int"), então aparecem até 5 alimentos correspondentes em menos de 200 ms, com a quantidade já preenchida; Enter adiciona o primeiro.
- Dado um alimento com medida caseira cadastrada, quando o usuário digita "2 colheres arroz", então o sistema converte para gramas e mostra a conversão.
- Dado um nome sem correspondência, então o sistema oferece "buscar por outro nome" e nunca adiciona um alimento errado em silêncio.

Implementado no protótipo v3 (campo "Adicionar rápido") em 15/09/2026 para validação.

## 15/09/2026, terceira rodada (12:48 a 12:54)

> Essa é uma ferramenta complementar, para chegar ao eu preciso ter feito a anamnese do meu paciente, tirado as medidas, isso precisa ser antes de chegar na distribuição de micro
> será que consegue colocar alertas sobre as diretrizes? Tipo coloquei na anamnese que minha paciente tem doença renal crônica e to montando a dieta dela, e o potássio tá acima do recomendado, aí vai tá lá o alerta para adequar
> Mostrar o painel de distribuição dos macros. As porcentagens que devem ser distribuídas, para saber se já coloquei a quantidade que precisa ou não
> Opções de substituições automáticas, para o paciente adaptar a refeição do que tem em casa naquele momento. Tipo, tá previsto frango, mas a pessoa só tem outro tipo de carne, o quanto que ela deve usar
> opções de refeição livres mais controladas

Registradas no backlog como B-05 (anamnese e medidas), B-06 (alertas de diretriz), B-07 (painel de macros), B-08 (substituições automáticas) e B-09 (refeições livres controladas). Ver `docs/backlog.md`.
