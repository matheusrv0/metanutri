# SPEC — Prescrição rápida, PDF e base de alimentos completa

Ciclo 2 do MetaNutri. Status: **aguardando sua aprovação**.

**Fontes:** `docs/revisao-produto-2026-09-15.md` (revisão crítica), `docs/backlog.md` (B-14, B-22, B-23, B-25, B-26, B-36), `specs/planejador-metanutri/SPEC.md` (ciclo 1, aprovada e implementada).

**Objetivo do ciclo:** tornar a ferramenta útil o bastante para uma estudante usar de verdade, sem conta, sem servidor e sem dado de paciente real. Nada aqui exige back-end, cobrança ou LGPD.

## 1. Decisões deste ciclo

| # | Decisão | Motivo |
|---|---|---|
| D-10 | Continua tudo no navegador, sem conta e sem servidor | Conta, cobrança e paciente ficam para o ciclo 3, depois de ver gente usando |
| D-11 | Os nutrientes novos vêm da **USDA FoodData Central** (domínio público, sem licença a pedir) | A TACO não traz gordura saturada, açúcares, vitamina D, B12 nem folato |
| D-12 | O vínculo TACO ↔ USDA é feito por lista revisada à mão, não por casamento automático de nomes | Casar "Leite, de vaca, integral" com o item errado da USDA gera número clinicamente errado |
| D-13 | Alimento sem vínculo continua sem o nutriente, marcado como tal | Falta de dado nunca vira zero; regra que já vale no ciclo 1 |
| D-14 | Produto de rótulo é privado do aparelho e marcado como "cadastrado por você" | Sem conta, não há como conferir cadastro de terceiros |
| D-15 | Nenhum número clínico deste ciclo foi validado por nutricionista | Você optou por seguir sem validação agora; fica registrado na tela de fontes e no documento exportado |

## 2. Escopo

**Entra:** modo de prescrição rápida; dieta em PDF; ampliação da base com USDA; cadastro de produto pelo rótulo; selo de completude por alimento; ranking do cobrir por uso comum.

**Não entra:** conta, login, cobrança, paciente como entidade, link para o paciente, missões, adesão, equipe, anamnese, dobras e bioimpedância.

## 3. Critérios de aceite

### 3.1 Prescrição rápida (B-22)

- **CA-60** · Dado a tela inicial, quando o usuário cria um plano, então escolhe entre **Prescrição rápida** e **Atendimento completo**, e a escolha fica visível como etiqueta no topo do plano.
- **CA-61** · Dado o modo prescrição rápida, então a tela pede apenas nome, sexo, idade e meta de energia em kcal, e **nenhum campo de antropometria aparece**.
- **CA-62** · Dado o modo prescrição rápida com a meta de energia preenchida, então o Resumo do dia usa essa meta como GET, sem calcular fórmula, e indica "meta definida por você".
- **CA-63** · Dado o modo prescrição rápida, quando o usuário não sabe a meta, então pode abrir "Estimar pelo peso" e informar peso e altura só para essa estimativa, sem transformar o plano em atendimento completo.
- **CA-64** · Dado um plano em prescrição rápida, quando o usuário clica em "Virar atendimento completo", então as etapas de avaliação aparecem com o plano e os dados já preenchidos preservados.
- **CA-65** · Dado um plano em atendimento completo, então **não existe** ação para voltar ao modo rápido, e o motivo aparece ao passar o cursor: medida já coletada não se apaga.
- **CA-66** · Dado o modo prescrição rápida, então a adequação de micronutrientes continua disponível, usando sexo e idade para escolher o estágio de vida.

### 3.2 Dieta em PDF (B-23)

- **CA-67** · Dado um plano, quando o usuário exporta **Dieta em PDF**, então recebe um arquivo com refeições por horário, alimentos em medida caseira e gramas, e os substitutos de cada refeição.
- **CA-68** · Dado o PDF, então ele cabe em uma página para um plano de até seis refeições com até seis alimentos cada, e quebra em páginas adicionais acima disso, sem cortar refeição no meio.
- **CA-69** · Dado o PDF, então o rodapé traz a data, o nome de quem montou e a frase de responsabilidade, sem nenhum dado que o usuário não preencheu.
- **CA-70** · Dado um plano em prescrição rápida, então o PDF sai sem os blocos de antropometria e de memorial, porque esses dados não existem.

### 3.3 Base de alimentos completa (B-14, B-26)

- **CA-71** · Dado a base do sistema, então cada alimento carrega, além do que já existe: gordura saturada, açúcares totais, vitamina D, vitamina B12 e folato, quando houver dado vinculado.
- **CA-72** · Dado um alimento, então a origem de cada nutriente fica visível: TACO, USDA ou rótulo cadastrado.
- **CA-73** · Dado um alimento, então ele exibe um **selo de completude**: completo (todos os nutrientes do painel), parcial (falta algum) ou mínimo (falta energia ou macro).
- **CA-74** · Dado um plano que usa alimento parcial ou mínimo, então o painel de adequação avisa quais alimentos limitam o resultado, com o nome de cada um.
- **CA-75** · Dado um nutriente sem dado em qualquer alimento do plano, então a linha da adequação continua marcada como possivelmente subestimada, como já acontece hoje.
- **CA-76** · Dado a tela de fontes, então ela lista a USDA FoodData Central com data da versão importada, ao lado da TACO.

### 3.4 Produto pelo rótulo (B-25)

- **CA-77** · Dado a tela Meus produtos, quando o usuário cadastra um produto, então informa nome, marca, porção declarada em gramas ou mililitros, medida caseira dessa porção e os valores do rótulo.
- **CA-78** · Dado o cadastro pelo rótulo, então são obrigatórios: energia, carboidrato, açúcares totais, proteína, gordura total, gordura saturada, fibra e sódio, que é o conjunto que a rotulagem brasileira exige.
- **CA-79** · Dado um valor de rótulo informado por porção, então o sistema converte para 100 g ou 100 ml e mostra a conversão antes de salvar.
- **CA-80** · Dado um produto cadastrado, então ele aparece na busca de alimentos com a marca "seu produto" e entra nos cálculos como qualquer outro alimento.
- **CA-81** · Dado um produto cadastrado, então o usuário pode editá-lo e excluí-lo, e a exclusão avisa em quais planos ele está sendo usado.

### 3.5 Sugestões do cobrir (B-36)

- **CA-82** · Dado a ação cobrir, então a ordem das sugestões considera o quanto o alimento é de uso comum, e itens de consumo raro aparecem só quando não houver alternativa comum.
- **CA-83** · Dado a lista de sugestões, então o usuário pode marcar "não sugerir este alimento" e a escolha vale para todos os planos daquele aparelho, não só para o caso aberto.

## 4. Casos de borda

| ID | Situação | Comportamento |
|---|---|---|
| CB-20 | Meta de energia vazia no modo rápido | O plano funciona, mas o percentual da meta não aparece e o painel diz o que falta |
| CB-21 | Meta de energia fora da faixa plausível (menos de 500 ou mais de 6000 kcal) | Campo marcado como inválido, com a faixa explicada |
| CB-22 | Alimento da USDA sem correspondência confiável | Fica sem os nutrientes novos e é marcado como parcial |
| CB-23 | Rótulo com valor por porção e porção zerada | Cadastro recusado, com a explicação de que a porção precisa ser maior que zero |
| CB-24 | Rótulo com açúcares maior que carboidrato | Aviso de inconsistência antes de salvar, sem bloquear |
| CB-25 | Produto cadastrado usado em um plano e depois excluído | O plano mantém o valor já calculado e marca o item como produto removido |
| CB-26 | PDF de plano vazio | Gera o documento com as refeições vazias, sem erro |
| CB-27 | Armazenamento cheio com produtos cadastrados | O aviso de armazenamento explica que produtos e planos dividem o mesmo espaço |

## 5. Fora de escopo, explicitamente

Conta e login, cobrança, paciente, histórico, evolução, link para o paciente, missões, adesão, equipe, preceptora, anamnese, dobras cutâneas, bioimpedância, relatórios, marca do profissional nos documentos.

## 6. Riscos registrados

1. **Nenhum número deste ciclo foi conferido por nutricionista.** Somam-se às oito referências do ciclo 1 que já estavam pendentes. Antes de qualquer uso com paciente real, isso precisa de revisão profissional.
2. **Vínculo TACO ↔ USDA é trabalho manual.** Começa pelos alimentos mais usados; o resto fica sem os nutrientes novos, de propósito.
3. **Produto de rótulo depende de quem digita.** Um valor errado no cadastro vira cálculo errado, e o sistema não tem como saber.
4. **Prescrição rápida sem avaliação é uma escolha do profissional.** O sistema não julga; o documento deixa claro que não houve avaliação antropométrica.
