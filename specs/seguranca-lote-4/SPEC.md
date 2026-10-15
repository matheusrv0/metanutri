# SPEC — Segurança, lote 4: regra de conteúdo, testes de ataque e pacotes

Status: **aprovada pelo dono** em 14/10/2026 ("mexa na segurança por modo completo… abranja bem os três… você tem
autonomia"). Fecha os três tópicos que ficaram da auditoria de 07/10/2026: a regra de conteúdo do navegador (CSP), os
testes de ataque (Fase 3 do pacote "Blindagem") e os pacotes com alerta.

## 1. Decisões

| # | Decisão |
|---|---|
| D-135 | **O site ganha uma regra de conteúdo (CSP) no `index.html`.** Ela só deixa rodar scripts do próprio site, do Mercado Pago (campos do cartão) e do Cloudflare (verificação contra robôs); só deixa conectar ao Supabase, ao Mercado Pago e ao Cloudflare; só deixa abrir molduras desses dois; e bloqueia o resto. Como o GitHub Pages não deixa mandar cabeçalhos, a regra vai numa `<meta>` |
| D-136 | **Os ataques do pacote "Blindagem" viram testes automáticos no repositório**, sem tocar o banco de produção: código malicioso em todo campo de texto livre; uma conta tentando ler, mudar ou apagar dado de outra; texto de SQL injection em filtros e buscas; limites de tentativa nas funções de cobrança. Os testes que precisam de banco rodam num Supabase local (`npm run test:seguranca`); os outros entram no `npm run check` |
| D-137 | **Pacotes com alerta conhecido são atualizados**, e a publicação passa a parar quando o `npm audit` acusar alerta alto ou crítico numa dependência que vai para o site |

## 2. Critérios de aceite

- **CA-485** · Dado o site publicado, então ele tem uma CSP que permite só as origens do D-135 e bloqueia scripts de qualquer outro lugar, scripts escritos dentro da página e o `eval`.
- **CA-486** · Dado o login com a verificação contra robôs, a confirmação por código, o checkout com os campos do cartão, o link do paciente, a impressão e a instalação do aplicativo (PWA), então tudo funciona com a CSP, e o teste automático não registra nenhuma violação.
- **CA-487** · Dado texto com código malicioso (`<script>`, `<img onerror>`, `javascript:`) em qualquer campo de texto livre (nome de paciente, observações, missões, nome de plano, produto, modelo, perfil, nome da conta), então ele aparece como texto e nada executa.
- **CA-488** · Dado duas contas de teste num Supabase local com todas as migrações, então nenhuma consegue ler, mudar ou apagar dado da outra por tabela, por função do banco ou por arquivo do armazenamento, e uma conta comum não consegue usar funções de administrador.
- **CA-489** · Dado texto de SQL injection (`' OR '1'='1`, `'; --`) em buscas, filtros e campos enviados ao banco, então ele é tratado como texto, sem erro de SQL na resposta.
- **CA-490** · Dado as funções de cobrança, então 11 pedidos com cartão na mesma hora recebem 429 no 11º, como o lote 2 definiu (teste com o banco de mentira já existente).
- **CA-491** · Dado `npm audit`, então nenhum alerta alto ou crítico; a publicação falha se aparecer um numa dependência do site.

## 3. Casos de borda

- **CB-128** · Navegador que não entende alguma diretiva da CSP: o site continua funcionando.
- **CB-129** · Sem Docker ou sem Supabase local, `npm run test:seguranca` avisa o que falta e não roda contra a produção nunca.

## 4. Fora de escopo

- Cabeçalhos HTTP de segurança (o GitHub Pages não deixa); `frame-ancestors` não funciona na `<meta>`, e a trava contra
  moldura do lote 1 continua.
- Excluir a conta pelo site, verificação em duas etapas do administrador e limpeza automática dos comprovantes: lote
  seguinte.
- Trocar o `supabase-js` das funções do esm.sh por `npm:` com trava de conteúdo: fica para depois da troca do Mercado
  Pago para produção, para não publicar as funções de novo agora.
