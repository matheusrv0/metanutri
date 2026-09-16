# O que falta e por quê

Atualizado em 16/09/2026.

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

Para fazer, preciso saber: onde os dados vão morar (Supabase, Firebase, servidor seu)
e se você aceita que os dados dos pacientes saiam do aparelho. Enquanto não decidir,
o backup em Configurações resolve a troca de aparelho.

### 2. Cobrança

**Atualizado em 16/09: a página de preços existe** (`#/precos`), com três planos e
a chave mensal/anual. Nenhum botão cobra: o "Assinar" leva para criar conta.

Falta o meio de pagamento. E há uma restrição de arquitetura que muda o projeto:
o Mercado Pago **exige um back-end** para criar a preferência de pagamento — o
access token não pode ir para o navegador, senão qualquer pessoa que abrir o site
consegue cobrar em seu nome. O caminho natural, já que a conta é Supabase, é uma
Edge Function. Ou seja: cobrança depende da conta estar no ar primeiro.

### 3. Link do plano para o paciente

Hoje a entrega é PDF ou Word. Um link que o paciente abre no celular exige servidor
para guardar o plano e um endereço público — ou seja, depende da caixa 1.

### 4. Política de privacidade e LGPD

Enquanto tudo fica no navegador, o tratamento de dado pessoal é seu, não do sistema.
No momento em que algum dado sair do aparelho, você passa a ser controlador de dado
de saúde de terceiros, e aí a política deixa de ser formalidade. Não escrevi um texto
jurídico porque um texto errado é pior do que nenhum.

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
