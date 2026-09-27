# O que falta e por quê

Atualizado em 26/09/2026.

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

Tudo o que dava para construir sozinho está construído. O que sobrou cai em duas
caixas: **decisão sua** (não é trabalho de código, é escolha de dono do produto) e
**risco clínico** (fazer sozinho produziria número errado numa ferramenta de saúde).

## Decisão sua

### 1. Conta de usuário

**Atualizado em 16/09: a camada está escrita e ligada.** Falta só você criar o
projeto no Supabase e colar as duas chaves em `.env.local` (passo a passo no
README). Sem elas o app roda igual e a tela de conta explica o que falta.

O que ainda não existe depois disso: **sincronizar os planos** entre aparelhos.
Login é uma coisa; mover os dados do navegador para o banco é outra, e é o
trabalho grande. Hoje quem faz esse papel é o backup em Configurações.

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

Falta o meio de pagamento, e é o item mais travado da lista, por uma restrição de
arquitetura: o Mercado Pago **exige um back-end** para criar a preferência de pagamento — o
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

## Já feito, só para você não procurar

Frequentes, duplicar plano, ficha de paciente, evolução do peso, leitura de código de
barras, backup, offline (PWA), tema claro e escuro, celular, impressão, dois modos de
uso, e o fluxo de publicação no GitHub Pages esperando um clique seu.

Desde 26/09: missões diárias, link do paciente, tela de Adesão com quem está sumindo,
os cinco planos novos e a contagem de paciente ativo.
