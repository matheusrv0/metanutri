# PLAN — Integração da rodada de 19/10/2026

Spec: `specs/integracao-rodada-1910/SPEC.md`. Branch `worktree-agent-a85b63679ef23171a`, a partir da `main` 2eb11db.

## 1. Merges (feitos antes desta spec)

Um `git merge --no-ff` por frente, com `npm run check` verde depois de cada um.

| # | Frente | Commit | Conflitos e emendas |
|---|---|---|---|
| M1 | `seguranca-lote-5` | 5f518f9 | Nenhum (primeira frente) |
| M2 | `exclusao-de-conta` | 8a00b76 | Fusão automática em `App.tsx`, `AreaDeTrabalho.tsx`, `usarConta.ts` e o teste dele. As cinco funções e o `bancoSupabase.ts` usam `npm:@supabase/supabase-js@2.117.2`; o caminho do esm.sh saiu do `tsconfig.seguranca.json` (L7 da revisão da exclusão). 013 e 014 são independentes |
| M3 | `revisao-geral-publica` | ba6e9d4 | Nenhum. O servidor de conta falso continua abrindo as telas com o login PKCE e o segundo fator do lote 5 |
| M4 | `receitas-com-calculo` | 86fee64 | `MeuPlano.tsx` (imports): os dois ficam. O CA-884 de `MeuPlanoComReceita.test.tsx` passou ao comportamento novo: os ingredientes seguem as regras da folha (D-231) |

## 2. Tarefas

Cada tarefa é um commit, com o teste antes do código.

| # | Tarefa | Arquivos | Depende de |
|---|---|---|---|
| I0 | Spec, plano e as notas nas specs que mudam: `receitas-com-calculo` (D-278, CA-883), `revisao-geral-publica` (D-231, D-239, CA-759), `exclusao-de-conta` (D-257, CA-827) e a seção "Campos" do `DESIGN.md` | `specs/integracao-rodada-1910/SPEC.md`, `PLAN.md`; as três specs; `DESIGN.md` | — |
| I1 | Item de receita marcado na cópia e nunca procurado na base (D-310, CA-970 a CA-974) | `src/domain/dietaDoLink.ts` (marca na cópia e na leitura), `src/domain/dietaParaPaciente.ts` (sem procura no item marcado); testes em `src/domain/dietaComReceita.test.ts`, `src/domain/dietaParaPaciente.test.ts`, `src/ui/missoes/MeuPlanoComReceita.test.tsx`; e2e em `e2e/receitas.spec.ts` | I0 |
| I2 | Campos no celular (D-311, D-312, CA-975 a CA-979) | `design-system/componentes/forms/input.tsx`, `select.tsx`, `textarea.tsx`; listas nativas em `src/ui/publico/conta/CampoCrn.tsx`, `src/ui/publico/conta/TelaComprovarMatricula.tsx`, `src/ui/adequacao/GavetaCobrir.tsx`, `src/ui/alimentos/TelaAlimentos.tsx`, `src/ui/caso/CartaoIdentificacao.tsx`; o endereço em `src/ui/missoes/CartaoLinkMissoes.tsx`; tamanho próprio em `src/ui/publico/conta/CampoCodigo.tsx`, `src/ui/alimentos/TelaAlimentos.tsx` e `src/ui/pagamento/estiloDaCaixa.ts`; teste de unidade em `src/ui/camposNoCelular.test.tsx`; e2e em `e2e/campos-no-celular.spec.ts` (site sem conta) e `e2e/servidor-falso/campos-no-celular.spec.ts` (telas de conta), com a medida em `e2e/apoio/campos.ts` | I0 |
| I3 | Versão dos termos `2026-10-20` (D-314, CA-980) | `src/domain/legal.ts`, `src/domain/legal.test.ts` | I0 |
| I4 | README com a ordem única dos passos do dono (D-316) | `README.md` | I0 |
| I5 | Validação: `npm run check`, `npx playwright test` (porta própria, contagem inteira), `npm run build`, `node scripts/conferir-publicacao.mjs`, `npm run test:csp` e `npm run test:seguranca` numa pilha local própria (001 a 014); a tabela de testes abaixo | este plano | I1 a I4 |

O CA-981 (D-315) não pede código: o teste `receitaNaRefeicao.test.tsx` · "CA-871a" já confere `false`.

## 3. Decisões para o dono revisar

1. **D-311:** as listas de escolha nativas e o endereço do link entram junto, porque o iPhone aproxima a tela nelas
   também. A partir de 640 px nada muda.
2. **D-313:** o formulário do cartão fica com 14 px até a troca do Mercado Pago para produção.
3. **D-310:** a marca muda o formato da cópia só no item de receita; como nenhum link com receita existe, nenhum link
   já enviado aparece como "o plano mudou".
