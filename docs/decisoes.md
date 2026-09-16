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

Custos de referência (15/09/2026, dólar R$ 5,09): desenvolvimento ≈ R$ 3/mês (domínio); lançamento ≈ R$ 130/mês (Supabase Pro); ~500 usuários ativos ≈ R$ 232/mês (+ Resend Pro). Não incluídos: contador e abertura de ME.

Pendentes: registrar metanutri.com.br; consultar a marca no INPI antes de investir em identidade visual.
