# MetaNutri

Planejador alimentar para estudantes de nutrição e recém-formados. Monta o plano,
confere a adequação de micronutrientes e sai com o documento pronto para entregar
— tudo dentro do navegador, sem conta e sem servidor.

## Como rodar na sua máquina

```bash
npm install     # uma vez, baixa as dependências
npm run dev     # abre em http://localhost:5173
```

Na primeira vez, o painel oferece **Ver um plano de exemplo**: um dia inteiro já
montado, para entender o sistema mexendo nele. Pode apagar depois.

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm run check` | lint + tipos + testes (o portão antes de commitar) |
| `npm run build` | gera a versão de produção em `dist/` |
| `npm run preview` | serve o `dist/` para conferir o build |
| `npx playwright test` | testes de ponta a ponta em navegador real |

## O que o sistema faz

**Dois caminhos, escolhidos ao criar o plano.** *Prescrição rápida* pede só nome,
sexo, idade e a meta de kcal — serve para retorno e ajuste. *Atendimento completo*
tem antropometria, gasto energético calculado e composição corporal. O rápido vira
completo a qualquer momento; o contrário não, para não apagar medida já registrada.

**Três etapas dentro do plano.**

1. **Dados e medidas** — identificação, antropometria (IMC por faixa etária, escore-z
   da OMS para crianças, cintura, panturrilha, gestante e lactante), composição
   corporal por dobras ou bioimpedância, e o gasto energético com a fórmula à mostra.
2. **Plano alimentar** — refeições por horário, cada uma com opção principal e dois
   substitutos. Digite `150 arroz integral` e tecle Enter: a medida caseira e as kcal
   aparecem sozinhas. Os alimentos que você mais usa viram atalho com a porção de sempre,
   e a busca avisa quando a tabela só tem parte dos nutrientes daquele alimento.
3. **Adequação** — vitaminas e minerais comparados com a DRI, com o botão **cobrir**,
   que sugere até cinco alimentos de grupos diferentes para fechar a falta.

**Em volta do plano.**

- **Pacientes** — ficha com restrições, condições clínicas, medicamentos, anamnese,
  histórico de planos e evolução do peso. O plano nasce já sabendo o que a ficha sabe,
  e o retorno começa duplicando o plano anterior.
- **Meus produtos** — industrializado não está na tabela de composição. Cadastre pelo
  rótulo, lendo o código de barras pela câmera ou digitando; os dados vêm da Open Food
  Facts para você conferir com a embalagem. Depois ele entra no plano como qualquer alimento.
- **Trocas** — a folha do paciente sai com uma lista de trocas: mesmo grupo, mesma
  energia, em medida caseira, respeitando as restrições da ficha. Doce e ultraprocessado
  não entram como equivalente de comida.
- **Exportar** — dieta para imprimir (vira PDF pelo próprio navegador), aconselhamento
  em Word no modelo do estágio, memorial de cálculo em Word e a tabela de adequação
  copiada para colar no Word.
- **Configurações** — seu nome e registro na linha de responsabilidade, marca na folha
  do paciente, e backup: exportar e restaurar tudo num arquivo.

## De onde vêm os números

| Assunto | Fonte |
|---|---|
| Composição dos alimentos | NEPA/UNICAMP. TACO, 4ª edição, 2011 (597 alimentos) |
| Medidas caseiras | IBGE. POF 2008-2009 |
| Referências de ingestão | NASEM. DRI, Apêndice J, 2019 |
| Energia | NASEM 2023 · Mifflin-St Jeor 1990 · Harris-Benedict 1918 |
| Crescimento | OMS 2006 e 2007 |
| Classificação antropométrica | Ministério da Saúde. SISVAN, 2011 |
| Ganho de peso na gestação | Kac G, Carrilho TRB et al. Am J Clin Nutr, 2021 |
| Dobras cutâneas | Jackson e Pollock 1978/1980 · Siri 1961 · Faulkner 1968 |
| Produtos de rótulo | Open Food Facts |

Cada número aparece na tela ao lado da própria fonte. A lista completa também está
dentro do sistema, em **Ajuda**.

## Limites que o sistema admite em tela

- A TACO não traz vitamina D, vitamina B12, folato, açúcares nem gordura saturada.
  Esses cinco só existem em produto cadastrado pelo rótulo.
- Dos 597 alimentos, apenas 6 têm todos os nutrientes preenchidos; 57,3% não têm
  vitamina A e 39,4% não têm fibra. Falta de dado vira travessão e marca de rodapé,
  nunca zero.
- Os cálculos ainda não foram conferidos por nutricionista.
- A prescrição de dieta é privativa de nutricionista com registro no CRN (Lei 8.234/1991).
- Tudo fica guardado só neste navegador. Faça backup em Configurações antes de trocar
  de aparelho.

## Como o código está organizado

```
src/domain/   regras puras, sem React: cálculo, validação, persistência (tudo testado)
src/data/     tabelas geradas por scripts/dados/*.mjs — não edite à mão
src/export/   Word (.docx) e cópia de tabela
src/ui/       telas, divididas por assunto (caso, plano, adequação, pacientes, produtos)
```

Regra que vale em todo o projeto: **o domínio não conhece a interface**. Se um cálculo
está numa tela, ele está no lugar errado.

## Publicar na internet

O build é estático e o app roda inteiro no navegador, então qualquer hospedagem de
arquivo serve. Já existe um fluxo pronto para o GitHub Pages:

1. No repositório, **Settings > Pages**, escolha **GitHub Actions** como origem.
2. Em **Actions > Publicar no GitHub Pages**, clique em **Run workflow**.

Ele só roda quando você manda — nada é publicado sozinho.

## O que ainda depende de você

Conta de usuário, cobrança, link do plano para o paciente e política de privacidade
estão descritos, com o porquê de não terem sido feitos, em
[docs/pendencias.md](docs/pendencias.md).

## Licença e dados de terceiros

Ver [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
