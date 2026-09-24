# Product

<!-- impeccable:product-schema 1 -->

Fatos confirmados na SPEC aprovada (`specs/planejador-metanutri/SPEC.md`), nas entrevistas em `docs/entrevista-estudante-2026-09-15.md` e `docs/feedback-nutricionista.md` e nas decisões em `docs/decisoes.md`. Nada aqui foi inventado.

## Platform

web

## Users

Estudante de nutrição em estágio e recém-formado. Monta planos alimentares fora da consulta: em casa ou no laboratório da faculdade, à noite, com prazo do estágio correndo. Hoje leva cerca de duas horas por plano no WebDiet gratuito, alternando com planilha e ChatGPT. Entrega o trabalho em Word, no modelo do professor, com assinatura da preceptora. A nutricionista preceptora confere o resultado.

## Product Purpose

Montar um plano alimentar completo e conferir a adequação de micronutrientes em minutos, não em horas, e sair com o documento Word pronto para entregar. Sucesso é a estudante terminar o planejamento em uma sessão, sem abrir planilha nem tabela em PDF.

## Positioning

O concorrente mostra a adequação e para por aí. O MetaNutri responde "e agora?": o botão **cobrir** sugere até cinco alimentos de grupos diferentes que fecham a falta de um micronutriente, com a porção em gramas e em medida caseira, quanto da falta cobrem e quantas kcal somam. Roda inteiro no navegador, sem login e sem enviar dados para servidor.

## Operating Context

- Dois caminhos na criação do plano: **prescrição rápida** (nome, sexo, idade e meta de kcal) e **atendimento completo** (com antropometria e gasto energético calculado). O rápido vira completo a qualquer momento; o contrário, não.
- Fluxo em três etapas: dados do caso, plano alimentar, adequação. Depois exporta.
- Ficha de paciente separada do plano: restrições, condições, anamnese, histórico e evolução do peso. Um plano de retorno começa duplicando o anterior.
- Produto industrializado entra pelo rótulo, com leitura do código de barras (câmera ou digitação) e preenchimento pela Open Food Facts, sempre conferido com a embalagem.
- Documento final no modelo do estágio: cabeçalho do caso, antropometria, refeições por horário com principal e dois substitutos, orientações, receitas e assinaturas.
- Clínica pede gramas; unidade básica de saúde e atendimento social pedem medida caseira.
- Preceptora usa preset individual (RDA, 90%) e coletivo (EAR, 50%).
- Uso frequente sem internet estável; o app precisa abrir e calcular offline.
- Dados de cada caso ficam só no aparelho, sem conta e sem nuvem.

## Capabilities and Constraints

- Idades de 1 ano em diante, incluindo gestantes e lactantes.
- Base TACO com 597 alimentos, medidas caseiras da POF, DRI do NASEM 2019, energia do NASEM 2023, curvas da OMS, cortes do SISVAN e ganho de peso gestacional de Kac 2021.
- Buracos conhecidos da base, medidos e admitidos em tela: só 6 dos 597 alimentos têm todos os nutrientes; 57,3% não têm vitamina A; 39,4% não têm fibra; 6 não têm energia. Vitamina D, B12, folato, açúcares e gordura saturada não existem na TACO — só aparecem em produto cadastrado pelo rótulo.
- Energia: Mifflin-St Jeor (padrão) e Harris-Benedict para adultos; equações próprias do NASEM para crianças, adolescentes, gestantes e lactantes.
- Substitutos não entram na soma do dia nem na adequação.
- Falta de dado nunca vira zero silencioso: o nutriente é marcado como possivelmente subestimado.
- React 18, TypeScript estrito, Tailwind, Vite, shadcn/ui, tudo no navegador. Sem back-end.
- A interface sai de uma biblioteca só, em `design-system/`; o contrato visual e os tokens estão em `DESIGN.md`.
- Composição corporal opcional por dobras (Jackson e Pollock, Faulkner) ou bioimpedância.
- Pendente: revisão clínica das oito referências pela nutricionista antes do lançamento.
- Pendente e dependente do dono do produto: conta de usuário, cobrança, link do plano para o paciente e política de privacidade. Ver `docs/pendencias.md`.

## Brand Commitments

- Nome: MetaNutri. Interface toda em português do Brasil.
- Ícones Lucide, embutidos no pacote, porque o app roda offline.
- Preço-alvo até R$ 20 por mês, decidido a partir da entrevista com a estudante.

## Evidence on Hand

- Entrevista com uma estudante em estágio e mensagens de uma nutricionista, ambas em `docs/`.
- Pesquisa de mercado com preços e avaliações dos concorrentes em `docs/pesquisa-mercado-2026-09-15.md`.
- Modelo de planejamento do estágio, só na máquina local: contém nome de pessoa real e não pode ser publicado.
- Não existem clientes, depoimentos, métricas de uso nem contratos. Nada disso pode ser inventado em tela.

## Product Principles

1. Toda conta mostra de onde veio: nome e ano da referência ao lado do número.
2. Falta de dado aparece como falta de dado, nunca como zero.
3. A estudante decide; o app sugere e explica o critério.
4. O trabalho nunca se perde: salva a cada tecla, funciona offline e exporta para Word.
   Como tudo fica no navegador, o backup em Configurações é parte do produto, não um extra.
5. O plano é o produto: a interface existe para chegar ao documento entregue.

## Accessibility & Inclusion

Teclado em toda a entrada rápida de alimentos, foco visível, rótulos ligados aos campos e contraste suficiente para uso em laboratório com projeção e em telas de celular.
