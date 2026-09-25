# Decisões aprovadas

| Data | Decisão | Motivo | Aprovado por |
|---|---|---|---|
| 15/09/2026 | Front-end: React 18 + TypeScript strict + Vite + Tailwind + shadcn/ui, entregue como PWA (site instalável, sem loja de apps) | padrão do CLAUDE.md; um código só, sem taxa de loja | usuário |
| 15/09/2026 | Backend: Supabase (Postgres com RLS, autenticação) | banco, login e API num lugar só para dev solo | usuário |
| 15/09/2026 | Hospedagem: Cloudflare Pages | grátis com uso comercial permitido (Vercel Hobby proíbe) | usuário |
| 15/09/2026 | Cobrança: Mercado Pago Assinaturas | taxa de 4,49% no crédito, ≈ R$ 0,89 em R$ 19,90 (Stripe ≈ R$ 1,32) | usuário |
| 15/09/2026 | Nova dependência: biblioteca `docx` para exportar Word | a faculdade exige entrega em Word no modelo do professor (B-11) | usuário |
| 15/09/2026 | Sugestão de alimentos por cálculo determinístico, sem IA no MVP | custo zero por uso | usuário |
| 15/09/2026 | Tabelas de alimentos (TACO, medidas caseiras POF) e DRI como JSON estático no front | busca instantânea e sem custo de banco | usuário |
| 15/09/2026 | Preço: R$ 19,90/mês ou R$ 179/ano, fixo e sem fidelidade; estudante grátis com limite | teto de R$ 20 citado nas entrevistas | usuário |
| 15/09/2026 | Direção visual (tema, paleta, tipografia, landing) será definida pelo usuário antes de qualquer front-end | pedido explícito do usuário | usuário |
| 15/09/2026 | Nome do produto: **MetaNutri** (domínio metanutri.com.br estava livre em 15/09; ainda não registrado) | escolha do usuário | usuário |
| 15/09/2026 | Base de alimentos do MVP: TACO (UNICAMP) + USDA FoodData Central (domínio público) para os micros que a TACO não tem (B12, folato, vitaminas D e E). TBCA (USP) fica fora por enquanto, então não é preciso contatar a USP | evita depender de licença não publicada | Claude, a confirmar na SPEC |
| 15/09/2026 | Contador, abertura de ME e alíquota ficam fora do escopo até o lançamento | pedido do usuário | usuário |
| 15/09/2026 | MVP atende todas as idades a partir de 1 ano, incluindo crianças, adolescentes, gestantes e lactantes (menores de 1 ano fora, a confirmar) | pedido do usuário; aumenta o prazo por exigir curvas da OMS e equações próprias | usuário |
| 15/09/2026 | Substitutos não entram na soma do plano | pedido do usuário | usuário |
| 15/09/2026 | Base de design: template MaterialM Free (WrapPixel, MIT). Detalhes e tokens em `docs/design/direcao-visual.md` | escolha do usuário | usuário |
| 15/09/2026 | Sem login no MVP do planejador; plano salvo no navegador. Nutriente sem RDA/EAR usa AI. Porção máxima do "cobrir" = 200 g, editável | padrões técnicos reversíveis | Claude |
| 24/09/2026 | Design system do export do Claude Design incorporado em `design-system/` (raiz), com alias `@ds`. Os 25 componentes do export e os que o repositório já tinha viraram uma biblioteca só | uma versão de cada componente, em vez de duas bibliotecas concorrentes | Claude, a confirmar |
| 24/09/2026 | Paleta e tokens passam a ser lime `#9FE870` + forest `#062F28` com neutros cinza puro, aplicados ao app. Todo nome de token antigo (`--papel`, `--tinta`, `--fio`, `--lombada`, shadcn) continua existindo, apontando para o semântico novo | `DESIGN.md` é a fonte da verdade dos tokens; deixar o código com a paleta antiga faria o contrato mentir. Nenhum componente precisou ser reescrito, e a volta é um arquivo só | Claude, a confirmar |
| 24/09/2026 | Fontes do export (Urbanist, Plus Jakarta Sans, via Google Fonts) **não** entraram; os papéis `--font-display`, `--font-corpo` e `--font-data` usam Archivo, Figtree e Inter, já embutidas | o app roda offline e nenhuma dependência nova entra sem perguntar | Claude, a confirmar |
| 24/09/2026 | Tema escuro foi derivado para todos os tokens novos, que o export não trazia | o app já tinha claro/escuro e o recurso não se perde | Claude |
| 24/09/2026 | A escala tipográfica do export foi renomeada para `--fonte-*`, `--altura-*` e `--traco-*` | os nomes originais (`--text-*`, `--leading-*`, `--tracking-*`) são o namespace do Tailwind v4 e encolhiam todo o texto do app de 14 para 13 px | Claude |
| 24/09/2026 | Menu lateral deixa de ser campo de tinta escura e passa a cinza da cor da página, com a aba ativa em pastilha branca | é o que o sistema novo especifica; saiu por troca de token, sem mexer no componente | Claude, a confirmar |
| 24/09/2026 | Config de lint de aderência do export (oxlint) integrada ao `eslint.config.js`: hexadecimal e `font-family` soltos são erro em todo o projeto, px solto é erro dentro da biblioteca. As travas de prop por componente ficaram fora (o TypeScript já faz melhor) | manter a intenção da regra sem dependência nova nem enxurrada de aviso em código que já existia | Claude |
| 24/09/2026 | Rota `#/design-system` com a biblioteca inteira, todos os estados e os dois temas, coberta por `e2e/design-system.spec.ts` | um lugar para conferir o sistema sem abrir dez telas | Claude |
| 24/09/2026 | `AGENTS.md` criado na raiz como arquivo de instrução de agente; o repositório não tinha nenhum | é a convenção corrente (lida pelo Claude Code e por mais de 20 ferramentas; governança na Agentic AI Foundation/Linux Foundation) | Claude |
| 24/09/2026 | As oito capturas de painel financeiro de terceiros do export (32 MB) não foram incorporadas | eram referência de linguagem visual; o próprio export diz que marca, texto e telas de lá não são usados | Claude |
| 24/09/2026 | Telas existentes alinhadas ao contrato: Painel com um herói lime e os demais cartões neutros; as barras de adequação e de % do GET passam a carregar a cor do estado, como o selo ao lado | eram divergências entre o código e o `DESIGN.md` — pela constituição do projeto, isso é bug | Claude, a confirmar |
| 24/09/2026 | Direção antiga aposentada de vez: componentes alinhados ao `mn.css` do sistema (barra em pílula, aba com indicador lime, cabeçalho de tabela em faixa cinza, etapa em círculo, camadas com raio 20), raios das telas na escala do sistema e o vocabulário da tabela impressa (`--papel`, `--tinta`, `--fio`, `--lombada`, utilitário `folha`) removido do código | pedido do usuário: esquecer o site antigo e manter a ideia do design system | usuário |
| 24/09/2026 | Citações de fonte saem da vista e ficam recolhidas atrás de "Ver as N fontes", uma vez por cartão (componente `Fontes`). CA-05 revisto na SPEC: a procedência continua obrigatória, agora a um clique | pedido do usuário: no trilho do planejador a citação ocupava mais espaço que o próprio dado | usuário |
| 24/09/2026 | Paleta revista: interface em grafite (`--ink-*`) e **cor só no estado do nutriente**. Lime e forest saem; o verde que resta é apenas `--state-ok`. No escuro, carvão quase neutro com degrau de ~6 pontos de L* entre mesa e cartão | o usuário reprovou o verde e o escuro. Medido: forest tinha saturação 41 e passava contraste em 14,5:1 (preto, não verde), e o escuro separava mesa de cartão em 4,6 pontos, abaixo do que o olho percebe. Ele escolheu a opção 3 de três comparativos | usuário |

Custos de referência (15/09/2026, dólar R$ 5,09): desenvolvimento ≈ R$ 3/mês (domínio); lançamento ≈ R$ 130/mês (Supabase Pro); ~500 usuários ativos ≈ R$ 232/mês (+ Resend Pro). Não incluídos: contador e abertura de ME.

Pendentes: registrar metanutri.com.br; consultar a marca no INPI antes de investir em identidade visual.
