# PLAN — Plano alimentar impresso limpo e fácil de ler

**Spec de origem:** `./SPEC.md` (D-180 a D-188, CA-620 a CA-640, CB-180 a CB-188)
**Status:** pedido pelo dono em 15/10/2026; aprovação pelas telas antes de publicar; T1 a T10 feitas em 15/10/2026

## Abordagem

A folha continua sendo a mesma página do app impressa pelo navegador (D-188): nada de gerador de PDF novo. O trabalho é
de três camadas.

1. **Domínio.** Um módulo novo, `nomeParaPaciente.ts`, transforma o `Alimento` no nome que o paciente lê (seção 2 da
   spec), com a lista revisada à mão por id da base e as regras gerais sobre as partes do nome. Produto cadastrado
   ("Meus produtos", id a partir de `PRIMEIRO_ID_PRODUTO`) sai como foi escrito. `folhaDieta.ts` ganha a lista de
   compras da folha (agrupada pelo nome para o paciente, CB-181) e as opções de uma refeição que têm alimento; perde
   `lembretesDoDia`, que só servia ao "No dia a dia" (sai junto com a seção, na T6).
2. **Folha.** `FolhaDieta.tsx` passa a mostrar alimento e uma quantidade por linha, as opções separadas por "ou", e só
   o que a spec deixa ficar. `FolhaDocumento.tsx` perde a régua e a caixa da frase de estágio.
3. **Papel.** Em `globals.css`, `.folha-dieta` e `.folha-documento` redeclaram os semânticos do tema claro e a ponte
   do shadcn/ui (a ponte é calculada no `:root`; sem redeclarar, a folha leria o valor escuro já resolvido). Na
   impressão, o texto preto vai para o mesmo escopo, e as regras de página mudam: margem 0 em cima e embaixo na
   primeira página e 0 embaixo nas outras, com o espaço vindo da folha (`box-decoration-break: clone` no pé de toda
   página), tudo dentro de `@supports (box-decoration-break: clone)`; fora dele, as margens de hoje.

Testes de unidade cobrem domínio e folha (jsdom não carrega o CSS); o papel claro e as regras de página são cobertos
no navegador, num e2e novo.

**Suposições (para revisar):**
- A janela de imprimir é o único caminho de PDF do app (conferido: `window.print()` só em `DialogoImprimir.tsx` e
  `DialogoDocumento.tsx`).
- O plano de exemplo do Painel ("Ver um plano de exemplo") é o mesmo do PDF do dono; os prints usam ele, no modo local
  (sem servidor de conta), por isso o topo sai sem nome de quem assina e com uma linha "Assinatura", como na conta
  dele (administrador, CA-583).
- O laranja não volta à folha: a marca aparece só pela Logo.

## Arquivos

| Arquivo | Ação | Motivo |
|---|---|---|
| `specs/impressao-do-plano/SPEC.md`, `PLAN.md` | criar | esta frente (T1) |
| `src/domain/nomeParaPaciente.ts` (+ teste) | criar | o nome para o paciente (T2) |
| `src/domain/folhaDieta.ts`, `src/domain/folhaDieta.test.ts` | alterar | compras da folha, opções da refeição (T3); sai `lembretesDoDia` (T6); trocas da folha (T9) |
| `src/ui/exportar/FolhaDieta.tsx`, `FolhaDieta.test.tsx` | alterar | nome, quantidade, "ou", menos informação, ajustes dos prints (T4, T5, T6, T9) |
| `src/ui/exportar/DialogoImprimir.tsx`, `DialogoImprimir.test.tsx` | alterar | a frase da janela (T6) |
| `src/ui/tema/globals.css` | alterar | papel claro (T7) e regras de página (T8) |
| `src/ui/exportar/FolhaDocumento.tsx`, `FolhaDocumento.test.tsx` | alterar | sem régua, frase de estágio sem caixa (T7) |
| `src/ui/exportar/linhaFina.ts` | alterar | aponta para a fonte das margens, que fica em `globals.css` (o lint barra `font-family` em código) (T8) |
| `e2e/impressao-do-plano.spec.ts` | criar | papel claro no tema escuro e regras de página, no navegador (T7, T8) |
| `e2e/planejador.spec.ts` | alterar | o teste do PDF esperava a linha da base, que sai (T6) |
| `specs/pdf-e-telas-limpas/SPEC.md` | alterar | uma nota: D-50, CA-309, CA-310, CA-312 e CA-314 foram substituídos por esta spec (T10) |

## Tarefas

Cada tarefa é um commit, em TDD: o teste primeiro, vendo falhar, depois o código.

- [x] **T1** — SPEC e PLAN. *Verifica:* revisão.
- [x] **T2** — `nomeParaPaciente(alimento: Alimento | undefined): string`. Regras da seção 2 da spec: produto e
  removido (CB-180, CB-182), lista revisada (`NOMES_REVISADOS`, por id), regra geral (ficha técnica, parte antes,
  cru, notas no fim, "em pó", ortografia). *Testes:* CA-623 (os 22 nomes do exemplo, pelo id), CA-624 (os 597),
  CA-625 (cru por grupo), CA-626 (produto igual ao escrito), CB-180, CB-182. *Depende de:* nada.
- [x] **T3** — `folhaDieta.ts`: `comprasDaFolha(plano, buscar)` → `{ nome, gramas }[]`, só a principal, somando por
  nome para o paciente, em ordem alfabética pt-BR (CA-628, CB-181); `opcoesDaRefeicao(refeicao)` → as listas de itens
  com gramas > 0, na ordem principal, substituto 1, substituto 2, sem as vazias (CA-631, CA-632). *Depende de:* T2.
- [x] **T4** — `FolhaDieta.tsx`: cada linha mostra o nome para o paciente e uma quantidade (medida caseira; sem ela,
  gramas), alimento primeiro (CA-623, CA-626, CA-629, CA-630); trocas e lista de compras com o nome para o paciente
  (CA-628). *Testes:* os CA citados, na folha. *Depende de:* T2, T3.
- [x] **T5** — `FolhaDieta.tsx`: opções sem caixa, cada substituto depois de "ou" com fio fino; refeição só com
  substituto começa sem "ou" (CA-631, CA-632). *Depende de:* T3, T4.
- [x] **T6** — `FolhaDieta.tsx`: saem "No dia a dia", a régua do topo e a linha da base; a frase da prescrição rápida
  fica, sozinha, depois da assinatura (CA-633, CA-634); horário em `text-heading`. Sai `lembretesDoDia` de
  `folhaDieta.ts` e o teste dele (só servia ao "No dia a dia"). `DialogoImprimir.tsx`: a frase nova
  (CA-635). `e2e/planejador.spec.ts`: sai a espera da linha da base. *Depende de:* T5.
- [x] **T7** — `globals.css`: escopo de papel claro em `.folha-dieta` e `.folha-documento` (semânticos claros e ponte
  do shadcn redeclarada; `color-scheme: light`), texto preto na impressão no mesmo escopo, e fundo branco na janela e
  em `.area-impressao` na impressão (CA-620, CA-621, CA-622). `FolhaDocumento.tsx`: sem régua; frase de estágio em
  negrito sem caixa (CA-639, CA-640). *Testes:* `e2e/impressao-do-plano.spec.ts` (tema escuro: fundo e cores na tela
  e na impressão; nenhum fundo escuro), `FolhaDocumento.test.tsx` (CA-640). *Depende de:* T6.
- [x] **T8** — `globals.css`: dentro de `@supports (box-decoration-break: clone)`, `@page { margin-bottom: 0 }`,
  `@page :first { margin-top: 0 }`, espaço de 14 mm no topo da folha e no pé de `.area-impressao` com `clone`
  (CA-636, CA-637); as margens do `@page` com a fonte da folha, para a linha fina (CA-637). *Testes:* e2e lê as regras
  de página e de margem no CSSOM e o espaço calculado na impressão; o PDF com as duas opções marcadas tem mais de uma
  página (CA-638). *Depende de:* T7.
- [x] **T9** — ajustes vistos nos primeiros prints, em dois commits. (a) A coluna do alimento passa a ter largura fixa
  (17 rem), para a quantidade ficar perto do nome; no celular, a quantidade embaixo do nome sai em cinza (CA-629).
  (b) `folhaDieta.ts`: `trocasDaFolha(grupos, buscar)` tira a troca com o mesmo nome para o paciente do alimento do
  plano, as trocas repetidas pelo nome, o alimento do plano que fica sem troca e o alimento do plano repetido pelo nome;
  a folha usa essa lista (CB-188). *Testes:* domínio e folha. *Depende de:* T8.
- [x] **T10** — nota na spec `pdf-e-telas-limpas`; prints de antes e depois (PDF A4 e PNG por página) e relatório.
  `npm run check`, `npx playwright test` e `npm run build` verdes. *Depende de:* T9.

## Riscos e decisões para revisar

- **D-186 / R-180:** a regra da primeira página não abre na caixa de impressão de teste; o e2e confere as regras de
  página e o espaço, e o experimento com o cabeçalho ligado à força (PDF do Chromium 153) vai no relatório.
- **D-183:** sem gramas na linha. Se o dono preferir gramas discretos ao lado, é uma linha de código e o CA-629 muda.
- **Alimento primeiro na linha** (CA-629): a folha de antes punha a medida primeiro. O alimento primeiro responde
  "o que eu como" antes de "quanto".
