# SPEC — Limpeza visual: Manrope, topo alinhado, sem taglines e sem preço de fundador

Status: **pedido direto do dono** em 05/10/2026, depois do teste de ponta a ponta do checkout. Ele aprova olhando as
telas antes da publicação.

**Fonte:** a conversa de 05/10/2026, com prints de Conta e plano e da landing:
"BUG, linhas quebradas lá em cima, visivelmente feio"; "algumas palavras redundantes, muito parecidas com IA. Eu quero
algo mais melhorado. Utilize a fonte Manrope"; "você vai tirar todos esses taglines que tem no site. Não gosto disso";
"Tire essa história de preço fundador, não tem isso. Quando eu quiser alterar o preço, eu altero."

## 1. Decisões

| # | Decisão | Substitui |
|---|---|---|
| D-75 | **Manrope em todo o site**: títulos, rótulos, botões, textos e números (com algarismo tabular). A Bricolage Grotesque fica só na palavra da marca, dentro da Logo | A tipografia do DESIGN.md (Urbanist nos títulos, Inter nos números) |
| D-76 | No topo da área logada, o fio de baixo do bloco da marca no menu e o fio de baixo do cabeçalho formam **uma linha só**, na mesma altura e na mesma cor | — (era defeito) |
| D-77 | **Sem taglines**: nenhum rótulo decorativo em caixa alta acima de título ou de seção (como "• COMO FUNCIONA"), nenhum subtítulo no cabeçalho das telas (como "ACESSO E ASSINATURA") e nada embaixo da logo do menu (como "PLANEJADOR ALIMENTAR"). Continua só o rótulo que nomeia o dado logo abaixo dele (como "Você paga hoje" sobre o total), cabeçalho de tabela e rótulo de campo | Os rótulos de seção da landing (estilo-spora) e o `subtitulo` das telas |
| D-78 | **Não existe preço de fundador.** Nenhum texto, aviso, contagem de vagas, cartão no painel do dono ou promessa nos Termos fala em preço de fundador ou em preço que não sobe. O servidor deixa de marcar a assinatura como "preço travado". O preço muda quando o dono mudar | Decisão de 26/09 sobre preço de fundador (`docs/decisoes.md`, `docs/plano-negocio.md`), CA-160 (estilo-spora), CA-349 e o cartão de fundador do CA-345 (painel-do-dono), o aviso de fundador do D-74 e do CA-366 (checkout-proprio), a linha de fundador de Conta e plano |
| D-79 | **Texto sem repetição e sem cara de robô**: cada informação aparece uma vez por tela; frases curtas, na voz ativa, como uma pessoa falaria; nada de frase de efeito, de explicação entre travessões nem de "não é X, é Y". Começa por Conta e plano, checkout, Preços e landing | Os textos dessas telas onde repetiam a mesma informação |

## 2. Critérios de aceite

- **CA-384** · Dado qualquer tela, então títulos, textos, botões e números usam a Manrope; só a palavra "MetaNutri" da Logo usa outra fonte.
- **CA-385** · Dado a área logada numa tela larga (menu lateral aberto), então o fio de baixo do bloco da marca e o fio de baixo do cabeçalho estão na mesma altura.
- **CA-386** · Dado o cabeçalho de qualquer tela logada, então ele mostra só a trilha (quando houver) e o título, sem subtítulo à direita; dado o menu lateral, então embaixo da logo não há texto.
- **CA-387** · Dado a landing, Preços, checkout e Conta e plano, então nenhuma seção tem rótulo decorativo em caixa alta acima do título.
- **CA-388** · Dado o site inteiro (landing, Preços, checkout, Conta e plano, Termos, painel do dono), então nenhum texto visível fala em preço de fundador, vagas de fundador ou preço que não sobe; e uma assinatura nova não é gravada como preço travado.
- **CA-389** · Dado Conta e plano com assinatura ativa, então o plano, o selo, o cartão e a próxima cobrança aparecem uma vez cada (o mini cartão mostra bandeira e final; a mesma informação não se repete em texto ao lado).
- **CA-390** · Dado Conta e plano com assinatura cancelada no prazo, então "cancelada" aparece no selo e a data de fim aparece uma vez ("Vale até {data}. Depois, a conta volta ao Free."), sem repetir a mesma frase no subtítulo.
- **CA-391** · Dado os Termos, então eles não prometem preço fixo para sempre nem preço de fundador, e a versão dos termos passa a ser a do dia da mudança.

## 3. Fora de escopo

- Apagar a coluna `preco_travado` e a função `vagas_de_fundador_usadas` do banco (ficam sem uso; apagar exige migração).
- Reescrever os textos de todas as telas do planejador (pacientes, plano alimentar, adequação etc.): fica para uma próxima passada, se o dono quiser.
