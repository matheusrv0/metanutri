# Segurança, lote 4 · Plano dos testes de ataque (D-136)

**Objetivo:** os ataques do pacote "Blindagem" viram testes automáticos no repositório: código malicioso em
todo campo de texto livre (CA-487), uma conta tentando ler, mudar ou apagar dado de outra (CA-488), texto de
SQL injection em filtros e funções do banco (CA-489) e o limite de pedidos com cartão (CA-490). Sem Docker, o
comando novo avisa o que falta e nunca fala com a produção (CB-129).

**Spec:** `specs/seguranca-lote-4/SPEC.md`, aprovada pelo dono em 14/10/2026. Este plano cobre só D-136,
CA-487 a CA-490 e CB-129; CSP (D-135) e pacotes (D-137) são de outro plano.

**Stack:** Vitest + Testing Library (jsdom) para CA-487 e CA-490; Vitest em Node, `@supabase/supabase-js` e o
Supabase CLI por `npx` para CA-488 e CA-489. Nenhum pacote novo.

## Regras que valem em todas as tarefas

- **Nunca a produção.** Nada aqui lê o `.env.local`, usa `--linked` ou `--project-ref`. O banco dos testes é
  um Supabase local, e a URL dele é conferida duas vezes antes de qualquer pedido (no script e no próprio
  teste): só `127.0.0.1` ou `localhost`.
- Teste que acha um furo não é afrouxado. O furo é corrigido no menor passo possível, num commit separado
  e com mensagem neutra; a descrição do ataque fica só no relatório local, nunca no repositório (ele é público).
- Um teste por área ou critério, com o ID no nome (`CA-487` … `CA-490`, `CB-129`).
- `npm run check` continua verde; o `npm run test:seguranca` fica fora dele.

## Tarefas, na ordem

1. **Supabase local separado** — `testes/supabase-local/supabase/config.toml`: projeto `metanutri-ataques`,
   portas 55420 a 55422, só banco, login, API de tabelas, armazenamento e a porta de entrada. Fora de
   `supabase/`, para os comandos de publicação não lerem esta configuração.
2. **Script `scripts/testes-de-ataque.mjs`** e `npm run test:seguranca` — confere o Docker e o Supabase CLI
   (sem eles, diz o que falta e sai com código 2: CB-129); derruba uma pilha velha deste projeto; sobe a pilha
   local; lê `supabase status`; recusa (código 3) URL que não seja local; aplica `supabase/001` a `011`, na
   ordem, pelo `psql` dentro do contêiner do banco, como `postgres` (o mesmo papel do SQL Editor); roda a
   suíte; derruba a pilha e apaga os dados no fim, mesmo se algo falhar.
3. **Suíte `testes/seguranca/`** (Vitest próprio, em Node, arquivos em sequência; `tsconfig.seguranca.json`
   entra no `npm run typecheck`):
   - `preparo.ts`: confere a URL local de novo e lança antes de qualquer pedido; cria pela API de
     administração do login local a vítima (estudante com e-mail de faculdade confirmado, com link do
     paciente, cópia na nuvem, assinatura, comprovante no balde e pedido de estudante), o atacante (outra
     conta igual) e o administrador; entra com as três.
   - `tabelas.test.ts` (CA-488): com o token do atacante e sem login, ler, mudar, apagar e criar linha da
     vítima em `acompanhamentos`, `copias`, `assinaturas`, `perfis`, `pedidos_estudante`, `administradores`,
     `dominios_faculdade` e nas tabelas só do servidor (`assinaturas_historico`, `assinando_agora`,
     `avisos_da_operadora`, `tentativas_de_cartao`, `chamadas_da_cobranca`); e se dar plano, aprovação ou
     papel de administrador. Depois de cada ataque, a linha da vítima é conferida com a chave de serviço.
   - `funcoes.test.ts` (CA-488): cada função do banco com os ids e tokens da vítima; as nove funções do
     administrador com conta comum (e com o administrador, como prova de que o teste não é vazio); as
     funções fechadas (`eh_email_de_faculdade`, `crn_valido`, `anotar_chamada_da_cobranca`) e as de gatilho.
   - `armazenamento.test.ts` (CA-488): enviar, ler, listar, assinar link, mover, copiar, sobrescrever e apagar
     arquivo na pasta da vítima; caminho com `..`; tornar o balde público.
   - `sqlInjection.test.ts` (CA-489): `' OR '1'='1`, `'; --` e parecidos em `eq`, `ilike`, `in` e `or`, nos
     parâmetros de texto das funções (token, instituição, matrícula, motivo, situação) e no nome e e-mail do
     cadastro. Sem linha de outra conta, sem erro de sintaxe do SQL na resposta e com as tabelas inteiras.
4. **XSS (CA-487)** — `src/seguranca/`: um ajudante com as quatro cargas (`<script>`, `<img onerror>`,
   `javascript:`, `<svg onload>`) e uma conferência do DOM (a carga aparece como texto; nenhum `script`,
   `img`, `svg`, `iframe` nem atributo `on*` nasce dela; nenhum `href`/`src`/`action` com `javascript:`). Um
   teste por área: pacientes; lista de planos; plano, refeições e observações; missões do nutricionista;
   link do paciente (tela pública); produtos; modelos; perfil (nome, campos e logo); nome da conta; pedido
   de estudante; folha impressa; telas do administrador (aprovações e negócio); Word (.docx) e cópia da tabela.
5. **Limite de cartão (CA-490)** — `src/data/servidorAtaques.test.ts`, com o banco de mentira: 11 pedidos com
   cartão na mesma hora, na mesma conta; o 11º recebe 429 e a operadora não é chamada. Junto, o complemento
   do CA-488 nas funções de cobrança: id de outra conta no corpo do pedido é ignorado.
6. **`SECURITY.md`** na raiz: como avisar uma falha (o e-mail de `src/domain/legal.ts`), as proteções do site
   em português simples e como rodar os testes de segurança. Nunca lista fraqueza aberta.

## Decisões do plano

- **DP-A1** · O CLI vem por `npx --yes supabase@2.120.0` (a versão que já está no cache desta máquina); em
  outra máquina o `npx` baixa a mesma versão. Versão fixa para o teste não mudar sozinho.
- **DP-A2** · A pilha é sempre nova: o script derruba a pilha deste projeto antes e depois, apagando os
  dados (`--no-backup`). Assim as migrações rodam do zero, na ordem, a cada vez.
- **DP-A3** · As migrações entram pelo `psql` do contêiner (`docker exec`), não pelo `supabase db query`:
  ele não aceita vários comandos num arquivo só.
- **DP-A4** · "Sem erro de SQL" quer dizer: nenhum erro de sintaxe (`42601`), nenhum 500 e nenhuma mensagem
  com "syntax error". Um id que não é uuid recusado pelo tipo (`22P02`) é o texto tratado como dado.
- **DP-A5** · As funções de cobrança (Deno) não sobem no Supabase local: precisariam do Mercado Pago. Elas
  são atacadas pelo núcleo puro, com o banco de mentira já existente (tarefa 5).
- **DP-A6** · Códigos de saída do script: 0 passou; 1 algum ataque passou ou um teste falhou; 2 falta Docker,
  CLI ou imagem; 3 a URL não é local.
- **DP-A7** · A trava da URL local mora num módulo puro (`testes/seguranca/local.ts`) para ser testada no
  `npm run check` (`src/seguranca/trava.test.ts`, CB-129), sem rede, com a URL da produção entre as recusadas.

## Execução (14/10/2026)

- Tarefas 1 a 6 feitas, nesta ordem, cada uma no seu commit.
- Dois testes do CA-487 acharam pontos a endurecer na tela e na impressão; cada um foi corrigido num commit
  `fix` separado (a logo do perfil e a linha fina da folha impressa), com o teste do domínio junto.
- Validação: `npm run check` verde, `npx playwright test` verde e `npm run test:seguranca` verde (127 ataques
  barrados no Supabase local, que subiu e foi derrubado pelo script).
