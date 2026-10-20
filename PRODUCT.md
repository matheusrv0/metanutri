# Product

<!-- impeccable:product-schema 1 -->

Fatos confirmados no plano de negócio aprovado (`docs/plano-negocio.md`, 26/09/2026), na SPEC aprovada (`specs/planejador-metanutri/SPEC.md`), nas entrevistas em `docs/entrevista-estudante-2026-09-15.md` e `docs/feedback-nutricionista.md` e nas decisões em `docs/decisoes.md`. Nada aqui foi inventado.

> **Onde o produto está.** O plano de 26/09/2026 organiza a execução em quatro fases. O planejador, o painel de micros e a prescrição rápida (**Fase 2**) estão construídos. As missões diárias e a tela de adesão (**Fase 1**) foram construídas em 26/09; desde 08/10/2026 os dados ficam na nuvem, presos à conta (spec `dados-na-nuvem`), e o link do paciente abre no celular dele. A cobrança do Solo e do Pro está construída, com o Mercado Pago ainda em credenciais de teste. A **Fase 0** — as 10 conversas de validação — não foi feita. Este documento marca o que já existe e o que está decidido mas não construído.

## Platform

web

## Users

Quem paga é o **recém-formado (0–2 anos de profissão)**, seguido da **clínica pequena (2 a 5 nutricionistas)**. O recém-formado sente as duas dores ao mesmo tempo: o acesso grátis de estudante cai na formatura e aparece um boleto de ~R$ 92/mês justo quando ele tem 3 pacientes e ganha pouco, e os pacientes abandonam a dieta na segunda semana.

O **estudante de nutrição em estágio não é cliente, é canal**: Dietbox e WebDiet já dão o software de graça para ele, então nesse público o preço de mercado é R$ 0. Ele entra no plano gratuito, em **conta de uso não comercial** — o modelo do WebDiet, decidido em 27/09: usa o sistema de verdade e gera até 3 links de missões, mas o PDF sai marcado e a tela do paciente avisa que é acompanhamento de estágio, não atendimento profissional. É o que concilia o estágio real, que acontece sob supervisão da preceptora, com a Lei 8.234/1991. É dele o uso descrito nas entrevistas: monta planos fora da consulta, em casa ou no laboratório da faculdade, à noite, com prazo do estágio correndo; leva cerca de duas horas por plano no WebDiet gratuito, alternando com planilha e ChatGPT; entrega em Word, no modelo do professor, com assinatura da preceptora, que confere o resultado.

O **paciente** é usuário sem ser cliente: recebe um link (sem baixar app) e marca as missões do dia. É dele a métrica que diz se o produto funciona. Link vindo de conta de estágio sai marcado como tal. A trava por CRN foi considerada e não adotada: o WebDiet não pede registro, e o estágio acontece sob supervisão.

## Product Purpose

Dizer o que comer. Montar um plano alimentar completo, ver o que falta de micronutriente e fechar a falta com alimento de verdade — porção em gramas e em medida caseira — em minutos, não em horas, e sair com o documento pronto para entregar. Terminar o planejamento em uma sessão, sem abrir planilha, tabela em PDF nem ChatGPT.

Em volta disso, fazer o plano ser seguido: ele vira missões diárias que o paciente marca, e o nutricionista percebe quem está sumindo antes de sumir de vez. A métrica dessa parte é do paciente — marcar missão em 4 dias ou mais na semana.

## Positioning

**O diferencial é dizer o que comer.** Corrigido em 27/09/2026: a pesquisa de mercado verificou sete concorrentes brasileiros e nenhum sugere alimento para cobrir o micronutriente que falta — "o espaço mais limpo", "a parte mais defensável". O concorrente real dessa função é o ChatGPT, e o MetaNutri ganha dele com porção exata, dados da TACO e tudo dentro do plano. O botão cobrir é só de micronutrientes (15 vitaminas e minerais, mais a fibra); macros têm medidor com a faixa da idade, não têm cobrir.

**A adesão é o argumento de venda**, não o diferencial: check-in, metas e lembrete já existem em WebDiet, Nutrium, DietSystem e Dietbox. A frase que abre a conversa é "seu paciente para de abandonar a dieta na segunda semana" — e o que segura o cliente depois é o cobrir. Não é "igual ao Dietbox, mais barato". Duas funções carregam o produto; o resto é paridade, precisa existir mas não vende.

1. **Painel de micronutrientes com o botão cobrir** (construído): o concorrente mostra a adequação e para por aí. O MetaNutri responde "e agora?" — o botão **cobrir** sugere até cinco alimentos de grupos diferentes que fecham a falta, com a porção em gramas e em medida caseira, quanto da falta cobrem e quantas kcal somam.
2. **Missões diárias** (construído): o plano alimentar vira tarefas que o paciente marca como feitas num link próprio, sem conta e sem baixar app, e o nutricionista enxerga em *Adesão* quem está sumindo antes de sumir de vez. Quem passa 4 dias sem marcar sobe para o topo da lista.

Hoje o que está no ar pede conta: os dados ficam na nuvem, presos à conta, e o navegador guarda só uma cópia de trabalho enquanto a pessoa está dentro.

## Operating Context

- Dois caminhos na criação do plano: **prescrição rápida** (nome, sexo, idade e meta de kcal) e **atendimento completo** (com antropometria e gasto energético calculado). O rápido vira completo a qualquer momento; o contrário, não.
- Fluxo em três etapas: dados do caso, plano alimentar, adequação. Depois exporta.
- Ficha de paciente separada do plano: restrições, condições, anamnese, histórico e evolução do peso. Um plano de retorno começa duplicando o anterior.
- Produto industrializado entra pelo rótulo, com leitura do código de barras (câmera ou digitação) e preenchimento pela Open Food Facts, sempre conferido com a embalagem.
- Documento final no modelo do estágio: cabeçalho do caso, antropometria, refeições por horário com principal e dois substitutos, orientações, receitas e assinaturas.
- Clínica pede gramas; unidade básica de saúde e atendimento social pedem medida caseira.
- Preceptora usa preset individual (RDA, 90%) e coletivo (EAR, 50%).
- Uso frequente com internet instável. Decisão de 08/10/2026 (spec `dados-na-nuvem`, D-130): sem internet, a área de trabalho trava até a conexão voltar, em vez de deixar editar o que não chegaria à nuvem; quando ela volta, o que faltava sobe sozinho e a área destrava.
- Os dados da conta (planos, pacientes, produtos, modelos, perfil e acompanhamentos) ficam na nuvem, presos à conta: entrar em qualquer aparelho mostra os mesmos dados. O navegador guarda só uma cópia de trabalho enquanto a pessoa está dentro, e toda mudança sobe sozinha em poucos segundos ("Salvo"). Só existe "Sair", e sair apaga a cópia do navegador. Dois aparelhos ao mesmo tempo não se apagam: a mudança mais nova de cada item vence. O link do paciente lê as missões da nuvem e abre no celular dele. O backup em arquivo, em Configurações, continua.
- LGPD: o pedido de autorização antes de gerar o link, a Política de privacidade e os Termos estão no ar; excluir a conta ainda é por pedido no e-mail de contato.

## Capabilities and Constraints

- Idades de 1 ano em diante, incluindo gestantes e lactantes.
- Base TACO com 597 alimentos, medidas caseiras da POF, DRI do NASEM 2019, energia do NASEM 2023, curvas da OMS, cortes do SISVAN e ganho de peso gestacional de Kac 2021.
- Buracos conhecidos da base, medidos e admitidos em tela: só 6 dos 597 alimentos têm todos os nutrientes; 57,3% não têm vitamina A; 39,4% não têm fibra; 6 não têm energia. Vitamina D, B12, folato, açúcares e gordura saturada não existem na TACO — só aparecem em produto cadastrado pelo rótulo.
- Energia: Mifflin-St Jeor (padrão) e Harris-Benedict para adultos; equações próprias do NASEM para crianças, adolescentes, gestantes e lactantes.
- Substitutos não entram na soma do dia nem na adequação.
- Falta de dado nunca vira zero silencioso: o nutriente é marcado como possivelmente subestimado.
- React 18, TypeScript estrito, Tailwind, Vite, shadcn/ui no navegador. O back-end é o Supabase (Postgres com RLS, autenticação e funções), e a cobrança passa pelo Mercado Pago. Sem as chaves do Supabase (desenvolvimento e testes), o app abre no modo local, com os dados só no navegador.
- A interface sai de uma biblioteca só, em `design-system/`; o contrato visual e os tokens estão em `DESIGN.md`.
- Composição corporal opcional por dobras (Jackson e Pollock, Faulkner) ou bioimpedância.
- Pendente: revisão clínica das oito referências pela nutricionista antes do lançamento.
- Construídos depois do plano: a nuvem presa à conta, a cobrança (ainda com credenciais de teste do Mercado Pago, até a troca para produção) e os documentos de LGPD. Falta excluir a conta pelo site. Ver `docs/pendencias.md`.
- Pendente antes da Fase 1: as 10 conversas de validação com recém-formados (Fase 0). O roteiro está em `docs/plano-negocio.md`.
- **Decidido em 27/09: funcionalidade nova está congelada até essas conversas.** A única exceção é a base de alimentos com micronutrientes completos, que é o bloqueador declarado do diferencial. Modo treino e trava de CRN ainda não foram construídos.

## Brand Commitments

- Nome: MetaNutri. Interface toda em português do Brasil.
- Ícones Lucide, embutidos no pacote: o site não busca ícone fora dele.
- Preços aprovados em 26/09/2026: Free R$ 0 (2 pacientes ativos, com marca MetaNutri no PDF), Estudante R$ 0 com comprovante (10 pacientes), Solo R$ 34,90/mês ou R$ 299/ano (25 pacientes), Pro R$ 64,90/mês ou R$ 599/ano (ilimitado) e Clínica R$ 149/mês até 4 nutris. A cobrança é por **paciente ativo** — quem teve plano ou missão nos últimos 30 dias. O teto de R$ 20 tirado da entrevista com a estudante não vale mais: ela não é a cliente. A cobrança do Solo e do Pro está construída, com o Mercado Pago ainda em credenciais de teste — ver `docs/pendencias.md`.

## Evidence on Hand

- Plano de negócio aprovado em 26/09/2026, em `docs/plano-negocio.md`: posicionamento, público, preços, fases e métricas.
- Entrevista com uma estudante em estágio e mensagens de uma nutricionista, ambas em `docs/`. Nenhuma das duas é do público que paga — as 10 conversas com recém-formados ainda não aconteceram.
- Pesquisa de mercado com preços e avaliações dos concorrentes em `docs/pesquisa-mercado-2026-09-15.md`.
- Modelo de planejamento do estágio, só na máquina local: contém nome de pessoa real e não pode ser publicado.
- Não existem clientes, depoimentos, métricas de uso nem contratos. Nada disso pode ser inventado em tela.

## Product Principles

1. Toda conta mostra de onde veio: nome e ano da referência ao lado do número.
2. Falta de dado aparece como falta de dado, nunca como zero.
3. A estudante decide; o app sugere e explica o critério.
4. O trabalho nunca se perde: salva a cada tecla na nuvem da conta, trava sem internet em vez de deixar
   editar o que não chegaria à nuvem, e exporta para Word. O backup em arquivo, em Configurações, continua.
5. O plano é o produto: a interface existe para chegar ao documento entregue.

## Accessibility & Inclusion

Teclado em toda a entrada rápida de alimentos, foco visível, rótulos ligados aos campos e contraste suficiente para uso em laboratório com projeção e em telas de celular.
