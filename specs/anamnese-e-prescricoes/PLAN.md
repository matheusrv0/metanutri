# PLAN — Anamnese com roteiro, suplementos e pedido de exames

**Spec de origem:** `./SPEC.md` (D-160 a D-169, CA-560 a CA-588, CB-160 a CB-169)
**Status:** aprovado pelo dono em 14/10/2026 ("implemente as novidades")

## Abordagem

Tudo o que é do paciente fica dentro do registro dele em `metanutri:pacientes`: as respostas da anamnese, os
suplementos e o pedido de exames são três campos novos do `Paciente`. Cada edição passa pelo `repositorio.salvar`, que
já troca o `atualizadoEm`; a junção da nuvem por item (`copiaDaConta.ts`) leva os campos novos sem mudança nenhuma.
A leitura normaliza os campos novos: ficha antiga ou campo estragado vira vazio sem derrubar a ficha (CA-588).

O que é da conta ganha duas chaves novas: o roteiro (`metanutri:roteiro-anamnese`, um objeto só, que a nuvem junta
como chave inteira, a mais nova vence) e os modelos de suplemento (`metanutri:modelos-suplemento`, lista com id e
`atualizadoEm`, que entra em `LISTAS` da cópia da nuvem para juntar item por item com lápide). As duas entram em
`CHAVES_DE_DADOS` (backup, apagar, nuvem) e a dos modelos também na migração dos dados de antes da conta
(`donoDosDados.ts`), como os modelos de plano.

O texto livre de antes (`anamnese`) fica no mesmo campo (D-162): a tela só muda o lugar onde ele aparece.

As duas folhas novas reusam o caminho da dieta impressa: uma janela com a prévia dentro de `.area-impressao` e
`window.print()`. As linhas de assinatura e o bloco "quem assina" saem de `FolhaDieta.tsx` para arquivos próprios, sem
mudar o que a dieta mostra, e passam a servir às três folhas. Quem assina a folha do paciente vem do mesmo
`AssinaturaDoPlano` que a área de trabalho já calcula; a `TelaPaciente` passa a recebê-lo.

## Arquivos

| Arquivo | Ação | Motivo |
|---|---|---|
| `src/domain/anamnese.ts` (+ teste) | criar | roteiro padrão, ler/gravar o roteiro, blocos da ficha, responder (T1) |
| `src/domain/suplementos.ts` (+ teste) | criar | suplemento, texto para documento, repositório de modelos (T2) |
| `src/domain/exames.ts` (+ teste) | criar | lista de exames, pedido, linhas para a folha (T3) |
| `src/domain/pacientes.ts`, `src/domain/pacientes.test.ts` | alterar / criar | campos novos com valor padrão e leitura que normaliza (T4) |
| `src/domain/documentoDoPaciente.ts` (+ teste) | criar | quem assina a folha do paciente, título, frase de estágio, data do dia (T5) |
| `src/domain/perfil.ts` | alterar | as duas chaves novas em `CHAVES_DE_DADOS` (T6) |
| `src/domain/copiaDaConta.ts` (+ teste) | alterar | modelos de suplemento em `LISTAS`; testes do roteiro como chave inteira (T6) |
| `src/domain/donoDosDados.ts` (+ teste) | alterar | modelos de suplemento juntam com id novo, como os de plano (T6) |
| `src/ui/pacientes/AnamneseDaFicha.tsx` | criar | o cartão Anamnese com os blocos (T7) |
| `src/ui/pacientes/DialogoRoteiro.tsx` | criar | editar o roteiro (T7) |
| `src/ui/pacientes/anamnese.test.tsx` | criar | testes da tela (T7) |
| `src/ui/pacientes/TelaPaciente.tsx` | alterar | usa os cartões novos e recebe `assinatura` (T7, T8, T9) |
| `src/ui/AreaDeTrabalho.tsx` | alterar | passa `quemAssina` para a `TelaPaciente` (T8) |
| `src/ui/exportar/QuemAssina.tsx`, `src/ui/exportar/LinhasDeAssinatura.tsx` | criar | saem de `FolhaDieta.tsx` para servir às três folhas (T8) |
| `src/ui/exportar/FolhaDocumento.tsx`, `src/ui/exportar/DialogoDocumento.tsx` | criar | moldura das folhas curtas e a janela de imprimir (T8) |
| `src/ui/exportar/FolhaSuplementos.tsx` | criar | a folha de suplementos (T8) |
| `src/ui/pacientes/CartaoSuplementos.tsx`, `LinhaSuplemento.tsx`, `DialogoModelosSuplemento.tsx` | criar | os suplementos na ficha (T8) |
| `src/ui/pacientes/suplementos.test.tsx` | criar | testes da tela e da folha (T8) |
| `src/ui/tema/globals.css` | alterar | `.folha-documento` imprime com as cores, como `.folha-dieta` (T8) |
| `src/ui/exportar/FolhaExames.tsx`, `src/ui/pacientes/CartaoExames.tsx`, `src/ui/pacientes/exames.test.tsx` | criar | o pedido de exames (T9) |
| `src/ui/exportar/FolhaDieta.tsx`, `DialogoImprimir.tsx`, `MenuExportar.tsx` (+ testes) | alterar | seção "Suplementos" na dieta (T10) |
| `src/export/aconselhamento-docx.ts`, `src/export/docx.test.ts` | alterar | seção "SUPLEMENTAÇÃO" no Word (T10) |
| `src/seguranca/xssApp.test.tsx` | alterar | código malicioso nos campos novos (T11) |
| `e2e/anamnese-e-prescricoes.spec.ts` | criar | roteiro, suplemento e pedido no navegador (T11) |
| `README.md` | alterar | uma linha sobre a ficha (T11) |

## Tarefas

- [ ] **T1** — `anamnese.ts`: tipos `PerguntaRoteiro`, `BlocoRoteiro`, `RoteiroAnamnese`, `RespostaAnamnese`;
  `BLOCOS_ANAMNESE` (ids e títulos fixos) e `ROTEIRO_PADRAO` (seção 2 da spec, ids estáveis); `lerRoteiro(arm)` e
  `gravarRoteiro(arm, roteiro): boolean` na chave `metanutri:roteiro-anamnese`, com normalização (CB-162) e texto vazio
  saindo (CB-161); `blocosDaFicha(roteiro, respostas)` (perguntas do roteiro com a resposta, respostas "fora do
  roteiro", contagem, bloco vazio some); `responder(respostas, pergunta, blocoId, texto)` (resposta vazia sai);
  `normalizarRespostas(valor)`.
  - Depende de: —
  - Cobre: D-160, D-161, D-163, CA-560 (domínio), CA-562, CA-566, CA-568, CB-161, CB-162
  - Feito quando: testes do padrão, da leitura estragada, do bloco que falta, da pergunta renomeada e tirada, da contagem.
- [ ] **T2** — `suplementos.ts`: `Suplemento`, `criarSuplemento(id)`, `normalizarSuplementos(valor)`,
  `suplementosParaDocumento(lista)` (sem nome não sai, CA-578), `descreverSuplemento(s)` ("Dose: … · Horário: … · Por
  quanto tempo: …", só o preenchido), `ModeloSuplemento` e `criarRepositorioModelosSuplemento(arm)` com `listar` (por
  nome), `salvarDe(suplemento)` (mesmo nome troca, sem diferenciar maiúscula e acento), `excluir`.
  - Depende de: —
  - Cobre: D-166, CA-573 (domínio), CA-574 (ordem), CA-578
  - Feito quando: testes de cada função, do mesmo nome trocando, da leitura estragada e da ordem.
- [ ] **T3** — `exames.ts`: `EXAMES` (seção 3, ids estáveis), `PedidoExames`, `PEDIDO_VAZIO`, `normalizarPedido(valor)`,
  `linhasDoPedido(pedido)` (marcados na ordem da lista, depois as linhas de "Outros" sem as em branco), `pedidoVazio`.
  - Depende de: —
  - Cobre: D-169, CA-579 (lista), CA-580 (ordem), CA-581 (vazio), CB-169
  - Feito quando: testes da ordem, das linhas em branco, de id desconhecido e de dado estragado.
- [ ] **T4** — `pacientes.ts`: campos `respostasAnamnese`, `suplementos` e `pedidoExames` no `Paciente`, vazios em
  `criarPacienteVazio`; a leitura normaliza cada um (T1 a T3).
  - Depende de: T1, T2, T3
  - Cobre: CA-561 (data nova ao salvar), CA-585 (paciente novo), CA-588
  - Feito quando: testes de ficha antiga, de campo estragado, de salvar mudando o `atualizadoEm`.
- [ ] **T5** — `documentoDoPaciente.ts`: `assinaturaDoDocumento(assinatura)` (nutricionista: nome e CRN; estudante: nome da
  conta e responsável técnico; sem situação: vazia), `ehProposta(assinatura)`, `propostaNaDieta(assinatura, caso)`,
  `FRASE_PROPOSTA`, `tituloDoDocumento(tipo, proposta)`, `dataDeHoje(agora)` (data local, AAAA-MM-DD).
  - Depende de: —
  - Cobre: D-167, CA-582, CA-583, CA-584 (domínio)
  - Feito quando: testes das três situações, de nome ou CRN faltando e da data local.
- [ ] **T6** — Nuvem e backup: as duas chaves em `CHAVES_DE_DADOS`; `metanutri:modelos-suplemento` em `LISTAS` da cópia
  (tempo: `atualizadoEm` ou `criadoEm`); em `donoDosDados.ts`, a mesma junção dos modelos de plano.
  - Depende de: T1, T2
  - Cobre: CA-570, CA-575, CB-163
  - Feito quando: testes de marcar mudança por modelo, juntar dois aparelhos (os dois modelos ficam, o mais novo
    vence, o apagado não volta), roteiro mais novo vence, roteiro apagado, backup e restauração, migração.
- [ ] **T7** — Tela da anamnese: `AnamneseDaFicha` (8 blocos em `Recolhivel`, resumo de respondidas, aberto quando tem
  resposta, "Fora do roteiro", último bloco "Observações" com "Anotações" e "Observações"), `DialogoRoteiro` (editar,
  acrescentar, tirar, voltar ao padrão, salvar, cancelar), `TelaPaciente` usando o cartão.
  - Depende de: T4
  - Cobre: CA-560, CA-561, CA-563, CA-564, CA-565, CA-566, CA-567, CA-568, CA-569
  - Feito quando: testes de tela de cada critério, inclusive "abrir a ficha não grava nada".
- [ ] **T8** — Suplementos: `QuemAssina` e `LinhasDeAssinatura` saem de `FolhaDieta`; `FolhaDocumento`,
  `DialogoDocumento`, `FolhaSuplementos`; `CartaoSuplementos`, `LinhaSuplemento`, `DialogoModelosSuplemento`;
  `TelaPaciente` recebe `assinatura` e a `AreaDeTrabalho` passa `quemAssina`; `.folha-documento` no CSS de impressão.
  - Depende de: T4, T5, T6
  - Cobre: CA-571, CA-572, CA-573, CA-574, CA-576, CA-578, CA-582, CA-583, CA-585 (tela)
  - Feito quando: testes de tela e da folha nas três situações; os testes da dieta continuam verdes.
- [ ] **T9** — Pedido de exames: `CartaoExames` e `FolhaExames` na ficha.
  - Depende de: T8
  - Cobre: CA-579, CA-580, CA-581, CA-582 (pedido)
  - Feito quando: testes de marcar, do campo livre, do botão desligado e da folha.
- [ ] **T10** — Dieta e Word: `MenuExportar` acha os suplementos do paciente do plano e passa para a dieta e para o Word;
  seção "Suplementos" na `FolhaDieta` depois de "Orientações"; "SUPLEMENTAÇÃO" no Word depois das orientações; frase de
  proposta em plano de estágio.
  - Depende de: T2, T5
  - Cobre: CA-577, CA-584, CB-166
  - Feito quando: testes da folha e do Word com e sem suplementos, com e sem estágio; o Word de sempre sai igual.
- [ ] **T11** — Fechamento: CA-586 no teste de código malicioso do app; teste de navegador (roteiro, suplemento, pedido,
  360 px sem rolar para o lado, CA-587); linha no README.
  - Depende de: T7, T8, T9, T10
  - Cobre: CA-586, CA-587
  - Feito quando: `npm run check`, `npx playwright test` e `npm run build` verdes.

## Riscos e decisões para você revisar

- **Sem migração do texto antigo (D-162).** O pedido era "o texto livre vai para um bloco Observações na primeira
  abertura". Escolhi não gravar nada ao abrir: o texto fica no mesmo campo e aparece no bloco "Observações". O efeito
  na tela é o mesmo, e assim abrir a ficha em dois aparelhos não cria conflito na nuvem, e um aparelho com a versão
  antiga continua mostrando o texto.
- **Blocos fixos (D-160).** Só as perguntas são editáveis. Bloco próprio entra com a anamnese por especialidade.
- **Junção por ficha inteira (R-160).** Campo novo no paciente segue a regra de hoje.
- **Frase de estágio pela situação da conta (D-167, R-161).** O plano de assinatura não muda as folhas.
- **Folhas sem linha fina.** As folhas novas cabem numa página; não levam a linha fina do topo da dieta (CA-316).
