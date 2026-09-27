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

**O que falta, e é a metade que importa:** hoje o link só abre no mesmo navegador onde
o plano foi montado, porque os dados ficam no `localStorage`. Mandar o endereço por
WhatsApp para o paciente **não funciona ainda** — ele vê um aviso explicando isso, em
vez de uma tela quebrada. A troca é pequena e já está isolada: basta implementar a
interface `FonteAcompanhamentos` (`src/domain/repositorioAcompanhamentos.ts`) contra o
Supabase. Nenhuma tela muda.

### 4. Política de privacidade e LGPD — agora é obrigatória

Enquanto tudo fica no navegador, o tratamento de dado pessoal é seu, não do sistema.
No momento em que algum dado sair do aparelho, você passa a ser controlador de dado
de saúde de terceiros, e aí a política deixa de ser formalidade. Não escrevi um texto
jurídico porque um texto errado é pior do que nenhum.

**Mudou de status em 26/09:** como o dado do paciente vai para a nuvem, isso saiu do
"se um dia" e entrou na Fase 1. São quatro peças, e nenhuma é código: política de
privacidade, consentimento do paciente, exclusão de conta e o contrato que põe o
nutricionista como **controlador** e o MetaNutri como **operador**. Vale também a
regra do CFN: o software não prescreve, quem prescreve é o nutricionista — cuidado com
sugestão automática que possa ser lida como prescrição.

### 5. Revisão clínica

Os cálculos seguem as referências citadas, mas nenhuma nutricionista conferiu os
resultados. Antes de qualquer pessoa usar isso num paciente de verdade, peça para a
preceptora conferir uns cinco casos, incluindo criança e gestante.

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
