# O que falta e por quê

Atualizado em 01/10/2026.

> **Mudou em 26/09/2026.** O plano de negócio (`plano-negocio.md`) foi aprovado e
> respondeu quase tudo que estava na caixa "decisão sua": o dado do paciente **vai**
> para a nuvem (Supabase), a cobrança **é** por paciente ativo com os preços novos, e
> o link do plano para o paciente **é** o produto, não um extra. Os itens 1 a 4 abaixo
> deixaram de ser dúvida e viraram trabalho a fazer, na ordem das fases.
>
> Antes de qualquer um deles vem a **Fase 0**: 10 conversas com recém-formados, sem
> apresentar o MetaNutri. Roteiro em `plano-negocio.md`. O portão para começar a
> Fase 1 é a dor da adesão confirmada.
>
> **Atualizado em 27/09:** a camada do Supabase está escrita e testada, junto com o
> SQL das tabelas (`supabase/001-acompanhamentos.sql`), a tela de consentimento antes
> do primeiro link e o apagar-dados que alcança a nuvem. **Falta só você criar o
> projeto no Supabase e rodar o SQL** — a partir daí o link do paciente abre no
> celular dele. Material pronto e esperando você: `fase-0-conversas.md`,
> `lgpd-rascunhos.md` e `revisao-clinica-casos.md`.
>
> **Construído em 26/09** (sem SPEC, a pedido seu — registrado em `decisoes.md`):
> as missões diárias com link do paciente, a tela de Adesão, os cinco planos novos e a
> contagem de paciente ativo. O que **não** saiu: o meio de pagamento e a sincronização
> na nuvem, os dois travados no mesmo lugar — o projeto do Supabase ainda não existe.
>
> **Atualizado em 30/09:** a conta obrigatória e a verificação de estudante e
> nutricionista (spec `conta-e-verificacao`, D-39 a D-47) estão prontas no código, com
> e2e cobrindo os caminhos sem servidor e a trava de publicação enquanto os Termos não
> têm responsável e contato. Falta você seguir os passos 1 a 6 do README ("Ligar conta,
> e-mail, verificação e pagamento") e revisar a lista de sugestões (parte 4 do
> lançamento).
>
> **Atualizado em 02/10:** a tela **Negócio** (spec `painel-do-dono`) mostra receita, assinaturas por plano,
> quem chegou nos últimos 30 dias e a lista de contas, só para o administrador. Falta rodar o
> `supabase/007-painel-do-dono.sql`; o histórico de receita começa no dia em que ele rodar.

Tudo o que dava para construir sozinho está construído. O que sobrou cai em duas
caixas: **decisão sua** (não é trabalho de código, é escolha de dono do produto) e
**risco clínico** (fazer sozinho produziria número errado numa ferramenta de saúde).

## Decisão sua

### 1. Conta de usuário

**Atualizado em 16/09: a camada está escrita e ligada.** Falta só você criar o
projeto no Supabase e colar as duas chaves em `.env.local` (passo a passo no
README). Sem elas o app roda igual e a tela de conta explica o que falta.

**Resolvido em 27/09:** existe **cópia na nuvem** em Configurações — enviar deste
aparelho, trazer para este aparelho. Não é sincronização automática, e isso é decisão:
mesclar dois aparelhos por conta própria é como se perde plano de paciente. Cada botão
sobrescreve um lado e a tela diz qual. Precisa do `002-copia-na-nuvem.sql` rodado.

Junto veio um bug sério que estava ali desde sempre: **o backup salvava só o índice
dos planos**, não os planos. Restaurar em outro aparelho dava zero planos, e o "apagar
tudo" deixava os planos (com nome e medida de paciente) no navegador. Os dois
corrigidos, com teste de regressão. **Backup gerado antes de 27/09/2026 está
incompleto** — gere de novo.

Contexto original: quem abre o endereço usa o sistema, e os dados ficam no
navegador daquela pessoa. Isso é uma vantagem real (privacidade, funciona offline,
nada para vazar) e vira problema no dia em que você quiser cobrar ou deixar a pessoa
trocar de computador.

**Respondido em 26/09/2026:** os dados moram no Supabase e você aceitou que o dado do
paciente saia do aparelho — sem isso não existe link do paciente, e sem link não
existem missões. Enquanto a sincronização não for escrita, o backup em Configurações
resolve a troca de aparelho.

### 2. Cobrança

**Atualizado em 16/09: a página de preços existe** (`#/precos`), com a chave
mensal/anual. Nenhum botão cobra: o "Assinar" leva para criar conta.

**Atualizado em 26/09:** os cinco planos do plano de negócio estão no código, com
limite por paciente ativo, preço de fundador e a página de preços refeita. A tela de
Adesão já compara os pacientes ativos com o limite do plano. Nada bloqueia ninguém
(`LIMITES_ATIVOS` continua falso) porque ainda não há cobrança.

**Atualizado em 27/09: o código da cobrança está escrito.** Duas Edge Functions
(`supabase/functions/assinar` e `webhook-mercadopago`), a tabela em
`003-assinaturas.sql` e o botão na tela de Conta. Assinatura pendente **não** libera
plano pago, e o preço vem do servidor, nunca do navegador.

Falta configurar, e são passos seus (passo a passo no README): rodar o SQL, criar a
aplicação no Mercado Pago, publicar as duas funções pela CLI e cadastrar o webhook.
Nada disso foi testado contra o Mercado Pago de verdade — não existe aplicação nem
token ainda.

O contexto que explica por que precisa de servidor: o Mercado Pago **exige um back-end** para criar a preferência de pagamento — o
access token não pode ir para o navegador, senão qualquer pessoa que abrir o site
consegue cobrar em seu nome. O caminho natural, já que a conta é Supabase, é uma
Edge Function. Ou seja: cobrança depende da conta estar no ar primeiro.

### 3. Link do plano para o paciente — construído, faltando a nuvem

**Feito em 26/09.** O botão *Gerar link das missões* aparece no fim da etapa 2 do
plano. O paciente abre o endereço `#/missoes/<token>`, vê a lista do dia, toca no que
fez, e o nutricionista acompanha em *Adesão*. Coberto por teste de unidade, de tela e
de navegador (`e2e/missoes.spec.ts`).

**Atualizado em 27/09: o código da nuvem está pronto.** `src/domain/fonteSupabase.ts`
implementa a interface, o provedor escolhe sozinho entre nuvem e navegador conforme as
chaves, e `supabase/001-acompanhamentos.sql` cria a tabela e as duas funções que o
paciente usa. Tudo coberto por teste com cliente falso — mas **nada foi rodado contra
um Supabase de verdade**, porque o projeto não existe.

Falta só você: criar o projeto, colar as chaves no `.env.local` e rodar o SQL (passo a
passo no README). Enquanto isso não acontece, o link segue valendo só neste navegador
e a tela do paciente explica isso em vez de quebrar.

### 4. Política de privacidade e LGPD — rascunhos prontos, falta advogado

Enquanto tudo fica no navegador, o tratamento de dado pessoal é seu, não do sistema.
No momento em que algum dado sair do aparelho, você passa a ser controlador de dado
de saúde de terceiros, e aí a política deixa de ser formalidade. Não escrevi um texto
jurídico porque um texto errado é pior do que nenhum.

**Atualizado em 27/09:** os três textos estão rascunhados em `lgpd-rascunhos.md` —
política de privacidade, consentimento do paciente e as cláusulas do contrato. Foram
escritos por um assistente de código, não por advogado, e **precisam de revisão
jurídica antes de publicar**. As lacunas que só você preenche (CNPJ, contato,
encarregado, prazos) estão marcadas no arquivo.

As três peças de código que a política exigia foram feitas: a tela de consentimento
antes de gerar o primeiro link, o backup que agora inclui as missões, e o apagar-dados
que alcança também a nuvem.

**Mudou de status em 26/09:** como o dado do paciente vai para a nuvem, isso saiu do
"se um dia" e entrou na Fase 1. São quatro peças, e nenhuma é código: política de
privacidade, consentimento do paciente, exclusão de conta e o contrato que põe o
nutricionista como **controlador** e o MetaNutri como **operador**. Vale também a
regra do CFN: o software não prescreve, quem prescreve é o nutricionista — cuidado com
sugestão automática que possa ser lida como prescrição.

### 5. Revisão clínica — os casos estão prontos

Os cálculos seguem as referências citadas, mas nenhuma nutricionista conferiu os
resultados. Antes de qualquer pessoa usar isso num paciente de verdade, peça para a
preceptora conferir.

**Atualizado em 27/09:** `revisao-clinica-casos.md` tem seis casos escolhidos para
cobrir cada faixa de equação (adulta, adulto, criança, adolescente, gestante,
lactante), em formato de tabela para ela preencher. É só mandar o arquivo e o
endereço do site.

## Risco clínico

### 6. Vitamina D, B12 e folato

A TACO não traz esses três. A saída óbvia seria importar da USDA e casar os alimentos
por nome — e é exatamente isso que eu não fiz. "Arroz, tipo 1, cozido" da TACO e
"Rice, white, cooked" da USDA não são o mesmo alimento: variedade, cultivo e preparo
mudam o valor. Um casamento automático colocaria número plausível e errado numa tela
que a estudante trata como verdade.

O que existe hoje: a tela diz que esses nutrientes não podem ser avaliados, em vez de
mostrar zero. Quando o alimento vem de rótulo, os valores são os da embalagem.

Se você quiser resolver, o caminho honesto é um trabalho manual: uma pessoa que
entende de alimentos revisa a correspondência alimento por alimento, ou pelo menos
dos 100 mais usados, e a origem de cada valor fica marcada na tela.

### 7. Açúcares e gordura saturada

Mesma história. Existem como campo, entram por rótulo, não são inventados.

### 8. "120 filé" vira 12 kg de frango — a entrada rápida precisa de um freio

Achado em 27/09 ao gerar as capturas: digitar `120 file de frango grelhado` na entrada
rápida faz o app ler "120 filés" (medida caseira), e o item entra com **12.000 g e
19.102 kcal**. A opção mostra o número antes do Enter, então não é silencioso — mas
quem digita "120 file" quase sempre quer 120 gramas, e nada avisa que um item sozinho
passou de dez vezes o gasto do dia.

Não foi corrigido: é funcionalidade nova e o congelamento de 27/09 vale. Mas é
ferramenta de saúde, e um freio de quantidade implausível (alerta acima de, digamos,
2.000 g ou 5.000 kcal num item) é conserto, não feature — decisão sua.

### 9. A lista padrão de sugestões precisa de uma nutricionista

Desde 01/10 cada refeição sugere alimentos de uma lista padrão (spec `ajustes-de-uso`,
seção 3.1), que a pessoa pode editar. A lista foi montada por mim, com alimentos comuns
no Nordeste (R-20). Antes de publicar, uma nutricionista precisa olhar alimento e porção.
Dois itens já leem estranho na tela, porque a medida mostrada sai da conversão de sempre
do app: o tomate (80 g) aparece como "5 fatias e meia" e o iogurte (200 g) como "1 copo
americano e meio".

### 10. O PDF da dieta precisa de uma impressão de verdade

A folha nova foi conferida na tela e no teste. Falta imprimir uma vez em papel, ou salvar
em PDF pelo Chrome, e olhar três coisas: as caixas cinza das opções saem no papel, nenhuma
refeição fica cortada entre duas páginas, e a linha fina do topo aparece da segunda página
em diante. No Firefox e no Safari essa linha pode não aparecer (R-28); o resto sai igual.

Os nomes dos alimentos no PDF continuam os da base ("Arroz, tipo 1, cozido"). Nomes mais
simples ficaram de fora desta parte (D-50) porque exigem revisar alimento por alimento.

## Já feito, só para você não procurar

Sugestões por refeição (no lugar dos frequentes), duplicar plano, ficha de paciente, evolução do peso, leitura de código de
barras, backup, offline (PWA), tema claro e escuro, celular, impressão, dois modos de
uso, e o fluxo de publicação no GitHub Pages esperando um clique seu.

Desde 26/09: missões diárias, link do paciente, tela de Adesão com quem está sumindo,
os cinco planos novos e a contagem de paciente ativo.

Desde 01/10 (parte 5): PDF da dieta com design próprio, lista de compras e trocas opcionais, Base MetaNutri com a página Fontes da base, Painel, planejador e Tabela de alimentos mais limpos.
