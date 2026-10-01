# SPEC — Dieta em PDF com design próprio, telas mais limpas e Base MetaNutri

Status: **aprovada** em 01/10/2026. Escrita em 01/10/2026, a partir do protótipo "PDF e telas
limpas" (`https://claude.ai/code/artifact/2b7bb911-197d-4ab4-8120-e7e88f51c1b9`), aprovado no
mesmo dia depois de uma rodada no PDF ("muita informação e letra muito pequena").

**Fontes:** a conversa de 30/09/2026 ("o PDF que sai pode ser mais bonito e organizado, com um
design próprio", "achei muito poluído", "evite termos como TACO, IBGE; a gente tem que garantir
a nossa própria fonte") e as respostas de 01/10/2026 sobre o protótipo.

**Objetivo:** o paciente recebe uma dieta fácil de ler; o nutricionista trabalha em telas com
só o que usa; e a base de alimentos aparece com o nome do MetaNutri, citando de onde vem.

Esta é a parte 5 do lançamento (ver `docs/decisoes.md`, 30/09/2026).

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-48 | A dieta para o paciente tem **letra de no mínimo 10 pt** impressa, e só o que ele usa: refeições, lembretes do dia, orientações e assinatura | Pedido seu de 01/10: "muita informação ainda e letras muito pequenas" |
| D-49 | **Lista de compras e trocas viram opcionais** na janela de imprimir, desmarcadas na primeira vez | As duas eram as partes mais longas do PDF e nem todo atendimento precisa delas |
| D-50 | Os **nomes dos alimentos continuam os da base** ("Arroz, tipo 1, cozido") no PDF | Nomes mais simples exigem revisar alimento por alimento. Recomendação aceita em 01/10 |
| D-51 | A base de alimentos aparece como **"Base MetaNutri"** nas telas e documentos, e uma página **"Fontes da base"** cita a TACO, o IBGE e o Open Food Facts | Pedido seu de 30/09. A licença da TACO permite usar os dados desde que a fonte seja citada |
| D-52 | **Painel:** saem os quatro cartões grandes, o gráfico de 14 dias e os botões que repetem o menu; ficam três números, "Onde você parou" e "Precisa de atenção" | Protótipo aprovado. O gráfico quase sempre aparece vazio. Recomendação aceita em 01/10 |
| D-53 | **Planejador:** campo que só vale para alguns casos só aparece nesses casos, e o que é opcional fica recolhido | Protótipo aprovado: "telas mais limpas" |
| D-54 | Nenhum cálculo muda nesta parte | É uma parte de apresentação; números iguais aos de hoje |

## 2. Escopo

**Entra:** a folha da dieta (imprimir e PDF) e a janela de imprimir; a página Fontes da base e
o nome "Base MetaNutri" nas telas; o Painel; as três etapas do planejador; a Tabela de
alimentos.

## 3. Histórias e critérios de aceite

Pessoas: **nutricionista**, **estudante** e **paciente** (quem recebe o PDF).

### US-B1 · Dieta em PDF com design próprio (5 pts)

Como nutricionista, quero entregar uma dieta bonita e fácil de ler, para o paciente seguir o
plano sem se perder.

- **CA-308** · Dado a folha da dieta, então a primeira página começa com a logo (a de Configurações, se houver; senão a do MetaNutri), o título "Plano alimentar", o nome do plano e a data da consulta por extenso ("1º de outubro de 2026"), e, à direita, quem assina (CA-313).
- **CA-309** · Dado uma refeição, então ela mostra o horário, o nome e, para cada alimento, a medida caseira em destaque, o peso em gramas ao lado ("6 colheres de sopa · 150 g") e o nome do alimento. Alimento sem medida caseira mostra só o peso ("5 g").
- **CA-310** · Dado uma refeição com substitutos, então eles aparecem abaixo dos alimentos principais, cada um numa caixa com o título "Opção 2" (substituto 1) ou "Opção 3" (substituto 2). Substituto vazio não aparece.
- **CA-311** · Dado o texto impresso, então o corpo tem no mínimo 10 pt, e o horário e o nome da refeição, no mínimo 14 pt. A folha não mostra energia nem quilocalorias.
- **CA-312** · Dado o plano, então a seção "No dia a dia" traz as missões que não são de horário de refeição (frutas, vegetais e água), cada uma com uma caixinha para marcar. Sem nenhuma dessas missões, a seção não aparece.
- **CA-313** · Dado quem assina, pelas mesmas regras do Word na spec `ajustes-de-uso` (CA-252 e CB-51), então: nutricionista sai com "Nome · Nutricionista · CRN-6 12345" no topo e numa linha de assinatura só, no fim; plano com estagiário ou preceptor sai com os dois nomes no topo e duas linhas de assinatura ("Estagiário(a)" e "Preceptor(a)"); sem ninguém, o topo fica sem nome e o fim tem uma linha "Assinatura".
- **CA-314** · Dado o fim do plano, então vêm, nesta ordem: "No dia a dia", "Orientações" (se houver texto), "Receitas" (só se houver texto), a assinatura, e uma linha pequena com "A prescrição é responsabilidade do nutricionista. Composição dos alimentos: Base MetaNutri." Em prescrição rápida, a linha começa com "Plano montado em prescrição rápida, sem avaliação antropométrica."
- **CA-315** · Dado a impressão, então nenhuma refeição é cortada entre duas páginas (salvo se sozinha passar de uma página), e a assinatura não fica sozinha no topo de uma página.
- **CA-316** · Dado a segunda página em diante, então o topo mostra uma linha fina: "Plano alimentar · nome do plano" e quem assina.
- **CA-317** · Dado a janela "Dieta para imprimir", então ela tem duas opções, "Lista de compras" e "Trocas", desmarcadas na primeira vez, e a prévia da folha muda na hora quando se marca uma.
- **CA-318** · Dado "Lista de compras" e/ou "Trocas" marcadas, então elas saem depois da assinatura, começando numa página nova, com o mesmo tamanho de letra.
- **CA-319** · Dado "Trocas" marcada, então cada alimento do plano mostra no máximo 2 trocas, com o nome e a medida caseira de cada uma.
- **CA-320** · Dado uma impressão, então as opções marcadas ficam lembradas neste aparelho para a próxima.

### US-B2 · Base MetaNutri e Fontes da base (2 pts)

Como nutricionista, quero que a base de alimentos tenha o nome do MetaNutri, com as fontes
citadas como manda a licença.

- **CA-321** · Dado as telas e os documentos, então a base de alimentos aparece como "Base MetaNutri": no subtítulo da Tabela de alimentos, na ficha do alimento, na nota da adequação, na folha da dieta e na área pública (cartão de números, comparação de vitaminas e rodapé). TACO, POF, IBGE, NEPA e UNICAMP só aparecem na página Fontes da base.
- **CA-322** · Dado a página "Fontes da base", então ela abre sem conta (é pública) e traz: uma frase do que é a base (quantos alimentos, quais nutrientes, quantos com medida caseira) e três fontes, cada uma com a citação completa, o que vem dela e o link — composição (TACO, 4ª edição revisada e ampliada, NEPA/UNICAMP, 2011), medidas caseiras (IBGE, POF 2008-2009, tabela de medidas referidas) e produtos de rótulo (Open Food Facts, licença ODbL).
- **CA-323** · Dado a Tabela de alimentos, a nota da adequação, o rodapé da área pública e a lista "Fontes dos dados" da Ajuda, então cada um tem um link "Fontes da base" para essa página. As outras referências da Ajuda (DRI, OMS, Mifflin e as demais) não mudam.

### US-B3 · Painel mais limpo (2 pts)

Como nutricionista, quero abrir o Painel e ver logo onde parei e o que está pendente.

- **CA-324** · Dado o Painel, então o topo tem o título e o botão "Novo plano" (que abre a escolha entre prescrição rápida e atendimento completo, como hoje).
- **CA-325** · Dado o Painel, então uma faixa mostra três números: planos mexidos nos últimos 14 dias, pacientes e dias trabalhados nos últimos 14. No celular, os três ficam lado a lado.
- **CA-326** · Dado o Painel, então "Onde você parou" lista os últimos planos, como hoje, cada um com "Abrir", e "Precisa de atenção" lista as mesmas pendências de hoje. Sem pendência, aparece "Tudo em dia."
- **CA-327** · Dado nenhum plano ainda, então "Onde você parou" diz "Nenhum plano ainda." e oferece "Ver um plano de exemplo".
- **CA-328** · Dado o Painel, então não há mais os quatro cartões grandes, o gráfico de 14 dias nem os botões "Pacientes" e "Cadastrar produto" (o menu já leva a eles). Os avisos da conta (estudante e CRN) continuam no topo.

### US-B4 · Planejador mais limpo (5 pts)

Como nutricionista, quero montar o plano vendo só os campos que valem para o caso.

**Etapa 1 · Dados e medidas**

- **CA-329** · Dado os cartões da etapa 1, então eles não têm a frase de descrição abaixo do título. Identificação traz Paciente (na linha toda), Nome do plano, Data da consulta, Diagnóstico clínico, Ocupação e o que a spec `ajustes-de-uso` define para quem assina.
- **CA-330** · Dado "Pessoa e medidas", então Sexo, Objetivo e Condição ficam na mesma linha, e Idade, Peso, Estatura e Cintura na linha de baixo, seguidos do nível de atividade. No modo rápido, Cintura não aparece e a meta de energia vem depois do nível de atividade.
- **CA-331** · Dado o sexo masculino, então Condição não aparece. "Meses além dos anos" só aparece com idade abaixo de 19 anos, e "Circunferência da panturrilha" só com 60 anos ou mais.
- **CA-332** · Dado o cartão de orientações, então "Composição corporal" e "Observações" aparecem recolhidos, numa linha que abre com um clique. Já abertos quando têm algum dado.
- **CA-333** · Dado a coluna da direita, então "Avaliação antropométrica" mostra cada resultado numa linha ("IMC · 22,8 kg/m² · Eutrofia"), com as fontes recolhidas como hoje; e o "Resumo do dia" traz energia e macronutrientes no mesmo cartão, com "Ajustar" e "Metas". TMB, fator e adicionais ficam em "Ver cálculo", recolhido.

**Etapa 2 · Plano alimentar**

- **CA-334** · Dado uma refeição, então o topo do cartão tem o horário, o nome, as quilocalorias da opção aberta e um menu "⋯" com "Remover refeição". A linha "Total desta opção" deixa de existir.
- **CA-335** · Dado as opções da refeição, então Principal, Substituto 1 e Substituto 2 aparecem como um seletor compacto, com a quantidade entre parênteses ("Principal (4)").
- **CA-336** · Dado as sugestões, então elas ficam numa linha só, que rola para o lado, em qualquer largura de tela, com "Editar" no fim da linha.

**Etapa 3 · Adequação**

- **CA-337** · Dado a tabela de micronutrientes, então a escolha da referência (Individual, Coletivo, Personalizado) fica no topo da tabela, e a meta aparece uma vez, no subtítulo ("meta de 90% da referência"), não mais em cada linha.
- **CA-338** · Dado uma linha, então as colunas são Nutriente, No plano, Referência (com RDA, EAR ou AI ao lado), Adequação e a ação. A adequação junta a barra e o texto do estado ("66% abaixo", "104%", "acima do limite"); a coluna "Estado" deixa de existir.
- **CA-339** · Dado os números da tabela, então "No plano" sai com uma casa decimal abaixo de 100 e sem casa de 100 em diante ("8,7 mg", "656 mg"), e a referência sai como publicada, sem zeros à direita ("0,9 mg", "1.000 mg").

**Tabela de alimentos**

- **CA-340** · Dado a Tabela de alimentos, então busca, grupo, ordem e completude do dado ficam numa linha só, com grupo, ordem e completude como listas de escolha. No celular, empilham.
- **CA-341** · Dado a lista, então cada linha mostra o nome, o grupo em texto apagado ao lado e as quilocalorias; dado parcial e dado mínimo viram uma marca pequena (uma para cada), explicada numa legenda acima da lista e lida por leitor de tela.

## 4. Casos de borda

- **CB-71** · Plano sem nenhum alimento: a folha sai com as refeições e "Sem alimentos nesta refeição." em cada uma, como hoje.
- **CB-72** · Aparelho sem armazenamento: as opções da janela de imprimir valem só naquela impressão.
- **CB-73** · Campo escondido pela regra do CA-331 que já tem valor (por exemplo, panturrilha preenchida e a idade corrigida para 45): o campo continua aparecendo, para nenhum dado ficar invisível.
- **CB-74** · Condição gestante ou lactante marcada e o sexo trocado para masculino: Condição continua aparecendo, com o erro de hoje.
- **CB-75** · Referência da adequação em "Personalizado": os campos de tipo e de mínimo aparecem logo abaixo do seletor, como hoje.
- **CB-76** · Nutriente sem dado em algum alimento: a marca † e a nota continuam; sem dado nenhum, a barra é a hachura de hoje.
- **CB-77** · Navegador que não repete a linha fina do CA-316: o PDF sai sem ela, e nada mais muda.

## 5. Fora de escopo, explicitamente

- Nomes de alimento mais simples no PDF (D-50).
- Qualquer mudança de cálculo, de dado ou de regra clínica (D-54).
- O Word de aconselhamento e o memorial de cálculo (continuam como estão).
- A tela da biblioteca de componentes (`#/design-system`), que é de uso interno.
- Novas pendências no Painel (o item "sem missões há 4 dias" do protótipo era só exemplo).
- Outras telas além das listadas no escopo.

## 6. O que fica com você

1. Nada novo. A revisão da lista padrão de sugestões (R-20) continua pendente.

## 7. Riscos para você revisar

- **R-28** · A linha fina no topo das páginas seguintes (CA-316) depende do navegador: Chrome e Edge recentes mostram; Firefox e Safari podem não mostrar (CB-77).
- **R-29** · "Base MetaNutri" com a citação só na página de fontes: a licença da TACO pede citar a fonte. O link "Fontes da base" em cada lugar que mostra dado da base é o que cumpre isso; ele não pode sumir em mudanças futuras.
