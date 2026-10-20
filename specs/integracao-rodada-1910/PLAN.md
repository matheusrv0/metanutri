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
| M5 | `revisao-geral-trabalho` (`fix/revisao-geral-trabalho`) | 97c3d93 | `busca.ts`, `totais.ts`, `aconselhamento-docx.ts`, `LinhaItem.tsx`, `folhaDieta.ts` e `CartaoIdentificacao.tsx`, pelo guia de `revisao-trabalho.md`: o ramo da receita fica, junto do sem-throw, `medidaParaMostrar`, `nomeSemAlimento` e "Produto apagado". Emenda: o filtro do item apagado na folha e no link tirava também a receita (que guarda `alimentoId` 0); a receita fica. O CB-271 do editor passou a "Produto apagado" |
| M6 | `vitaminas-usda` | 03d153c | `produtos.ts` (a mesma correção nas duas: chave fora do rótulo é nula), `produtos.test.ts` e `docx.test.ts` (os testes das duas ficam). Depois: os "16" das specs antigas anotados (346e105) e o CA-986 (ab200c2) |
| M7 | `conduta-da-nutricionista` | 71598cc | A conduta vale onde as regras se cruzam (D-319). `busca.ts`: `medidaParaMostrar` = ponta de faca, gordura sem fatia e a medida de até 4 pedaços da conduta; `quantidadeNaFolha` com o modo do plano e uma quantidade só; `dietaDoLink`, `folhaDieta`, `FolhaDieta.tsx`, `aconselhamento-docx` e `MeuPlano` com o modo, a receita, o item apagado e a água; `cobrir.ts` com os grupos de ovo do USDA e os da conduta. Testes das frentes passaram para uma quantidade só |

## 2. Tarefas

Cada tarefa é um commit, com o teste antes do código.

| # | Tarefa | Arquivos | Depende de |
|---|---|---|---|
| I0 | Spec, plano e as notas nas specs que mudam: `receitas-com-calculo` (D-278, CA-883), `revisao-geral-publica` (D-231, D-239, CA-759), `exclusao-de-conta` (D-257, CA-827) e a seção "Campos" do `DESIGN.md` | `specs/integracao-rodada-1910/SPEC.md`, `PLAN.md`; as três specs; `DESIGN.md` | — |
| I1 | Item de receita marcado na cópia e nunca procurado na base (D-310, CA-970 a CA-974) | `src/domain/dietaDoLink.ts` (marca na cópia e na leitura), `src/domain/dietaParaPaciente.ts` (sem procura no item marcado); testes em `src/domain/dietaComReceita.test.ts`, `src/domain/dietaParaPaciente.test.ts`, `src/ui/missoes/MeuPlanoComReceita.test.tsx`; e2e em `e2e/receitas.spec.ts` | I0 |
| I2 | Campos no celular (D-311, D-312, CA-975 a CA-979) | `design-system/componentes/forms/input.tsx`, `select.tsx`, `textarea.tsx`; listas nativas em `src/ui/publico/conta/CampoCrn.tsx`, `src/ui/publico/conta/TelaComprovarMatricula.tsx`, `src/ui/adequacao/GavetaCobrir.tsx`, `src/ui/alimentos/TelaAlimentos.tsx`, `src/ui/caso/CartaoIdentificacao.tsx`; o endereço em `src/ui/missoes/CartaoLinkMissoes.tsx`; tamanho próprio em `src/ui/publico/conta/CampoCodigo.tsx`, `src/ui/alimentos/TelaAlimentos.tsx` e `src/ui/pagamento/estiloDaCaixa.ts`; teste de unidade em `src/ui/camposNoCelular.test.tsx`; e2e em `e2e/campos-no-celular.spec.ts` (site sem conta) e `e2e/servidor-falso/campos-no-celular.spec.ts` (telas de conta), com a medida em `e2e/apoio/campos.ts` | I0 |
| I3 | Versão dos termos `2026-10-20` (D-314, CA-980) | `src/domain/legal.ts`, `src/domain/legal.test.ts` | I0 |
| I4 | README com a ordem única dos passos do dono (D-316) | `README.md` | I0 |
| I6 | Ingrediente apagado fora do que vai ao paciente e a † da receita (D-317, D-318, CA-982 a CA-985) | `src/domain/folhaDieta.ts` e `src/domain/dietaDoLink.ts` (ingrediente apagado fora), `src/ui/plano/LinhaItem.tsx` (a † nas kcal da receita); testes em `src/domain/folhaComReceita.test.ts`, `src/domain/dietaComReceita.test.ts`, `src/domain/totais.test.ts`, `src/domain/cobrir.test.ts`, `src/ui/plano/LinhaItem.test.tsx` e `src/ui/plano/TelaPlano.test.tsx` | M5 |
| I5 | Validação: `npm run check`, `npx playwright test` (porta própria, contagem inteira), `npm run build`, `node scripts/conferir-publicacao.mjs`, `npm run test:csp` e `npm run test:seguranca` numa pilha local própria (001 a 014); a tabela de testes abaixo | este plano | I1 a I4 |

O CA-981 (D-315) não pede código: o teste `receitaNaRefeicao.test.tsx` · "CA-871a" já confere `false`.

## 3. Decisões para o dono revisar

1. **D-311:** as listas de escolha nativas e o endereço do link entram junto, porque o iPhone aproxima a tela nelas
   também. A partir de 640 px nada muda.
2. **D-313:** o formulário do cartão fica com 14 px até a troca do Mercado Pago para produção.
3. **D-310:** a marca muda o formato da cópia só no item de receita; como nenhum link com receita existe, nenhum link
   já enviado aparece como "o plano mudou".

## 4. Revisão final (20/10/2026)

O coordenador revisou a branch inteira (`revisao-final.md`): pronta para a `main` com 1 correção de texto (I-1) e
menores. Um commit por item, com a nota da spec antes do código (este commit traz as notas do M-1, M-2 e M-5).

| # | Item | Arquivos |
|---|---|---|
| F1 | I-1 · o topo do 014 com o TOTP antes do site; sai do `config.toml` de teste a frase "Em produção o TOTP já vem ligado" | `supabase/014-seguranca-lote-5.sql`, `testes/supabase-local/supabase/config.toml` |
| F2 | M-2 · a rotina diária do 013 apaga primeiro as assinaturas de 5 anos e, se o banco negar o apagamento dos registros de acesso, avisa e segue (CB-318); README e `specs/exclusao-de-conta/PLAN.md` com o remédio certo | `supabase/013-exclusao-de-conta.sql`, `src/data/sqlExclusao.test.ts`, `testes/seguranca/exclusao.test.ts`, `README.md`, `specs/exclusao-de-conta/PLAN.md` |
| F3 | M-1 · a cópia sem `quantidades` com toda medida vazia lida como "Gramas" (CB-316) | `src/domain/dietaParaPaciente.ts` (`modoDaCopia`), `src/ui/missoes/MeuPlano.tsx`; testes em `dietaParaPaciente.test.ts` e `MeuPlanoComReceita.test.tsx` |
| F4 | M-4 · o CA-983 sem "o peso"; o README com as sete frentes; a tarefa da D-319 neste plano | `specs/integracao-rodada-1910/SPEC.md`, `README.md`, este plano |
| F5 | M-5 · receita sem o que comer fora da folha e do link, com o aviso na linha do planejador (CB-317) | `src/domain/receitaNoPlano.ts` (`receitaComOQueComer`), `src/domain/folhaDieta.ts`, `src/domain/dietaDoLink.ts`, `src/ui/plano/LinhaItem.tsx`; testes em `folhaComReceita.test.ts`, `dietaComReceita.test.ts`, `LinhaItem.test.tsx` |
| F6 | M-6, M-7 e M-8 · notas nas decisões do relatório (sem código) | `rodada-1910/integracao-report.md` (fora do repositório) |

## 5. Validação (20/10/2026)

Na branch inteira, depois das sete frentes e dos itens:

| Verificação | Resultado |
|---|---|
| `npm run check` | verde: lint sem erro (o aviso antigo de `MolduraPublica.tsx`), tipos ok, 237 arquivos e 4.106 testes |
| `npx playwright test` (cópia da configuração nas portas 4831 e 4836, apagada depois) | 227 de 227, em 18 arquivos (`--list` conferido antes) |
| `npm run build` | verde |
| `node scripts/conferir-publicacao.mjs` | "pode publicar" |
| `npm run test:csp` | 3 de 3 |
| `npm run test:seguranca` (pilha local própria, `metanutri-integracao`, portas 5572x; cópia do script apagada depois) | 204 de 204, em 8 arquivos, com as migrações 001 a 014 |

| Critério | Teste |
|---|---|
| CA-970 | `dietaComReceita.test.ts` · "CA-883 e CA-970", "CA-970 … só o item de receita", "CA-970 … sem receita" |
| CA-971 | `dietaParaPaciente.test.ts` · "CA-971"; `MeuPlanoComReceita.test.tsx` · "CA-971" |
| CA-972 | `dietaParaPaciente.test.ts` · "CA-972" |
| CA-973 | `dietaComReceita.test.ts` · "CA-973" |
| CA-974 | e2e `receitas.spec.ts` (CA-974, no celular de 360 px) |
| CA-975 e CA-976 | `src/ui/camposNoCelular.test.tsx`; e2e `campos-no-celular.spec.ts` · "CA-976" e `servidor-falso/campos-no-celular.spec.ts` · "CA-976" |
| CA-977 | `camposNoCelular.test.tsx` · "CA-977" (região do CRN e filtros de Alimentos); as outras listas nativas pelo e2e do CA-979 |
| CA-978 | `camposNoCelular.test.tsx` · "CA-978"; e2e `servidor-falso/campos-no-celular.spec.ts` · "CA-978" em 390 e 1280 px |
| CA-979 | e2e `campos-no-celular.spec.ts` (planejador, Alimentos, ficha) e `servidor-falso/campos-no-celular.spec.ts` (Entrar, Criar conta, código, Comprovar matrícula, Completar cadastro), em 360 e 390 px |
| CA-980 | `legal.test.ts` · "CA-980"; `conferir-publicacao.mjs` |
| CA-981 | `receitaNaRefeicao.test.tsx` · "CA-871a" (`RECEITAS_NA_REFEICAO` é `false`) |
| CA-982 | `folhaComReceita.test.ts` · "CB-271 e CA-982" |
| CA-983 | `dietaComReceita.test.ts` · "CA-983" |
| CA-984 | `LinhaItem.test.tsx` · "CA-984" |
| CA-985 | `totais.test.ts` · "CA-985"; `TelaPlano.test.tsx` · "CA-985"; `cobrir.test.ts` · "CA-789" (energia sem dado: `kcalDisponiveis` nulo) |
| CA-986 | `totais.test.ts` · "CA-986" |
| CA-987 a CA-989 | `dietaDoLink.test.ts` · "CA-987", "CA-988", "CA-989"; `dietaParaPaciente.test.ts` · "D-319"; `TelaMissoesPaciente.test.tsx` · "CA-928 … e D-319" |

**Divergências:** o CA-974 e o CA-985 (tela) passaram de primeira: são trava, porque o comportamento já estava certo
depois do merge. O CA-986 também. Os prints ficam em `rodada-1910/integracao/` (itens a e b, antes das frentes 5 a 7)
e `rodada-1910/final/` (o estado final, antes = `main` 2eb11db).
