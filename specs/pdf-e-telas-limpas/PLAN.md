# PDF com design próprio e telas limpas · Plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa por tarefa. Os passos usam caixa (`- [ ]`) para acompanhar.

**Objetivo:** a dieta impressa fica grande e enxuta, a base de alimentos ganha o nome "Base MetaNutri" com uma página de fontes, e o Painel, as três etapas do planejador e a Tabela de alimentos mostram só o que se usa.

**Arquitetura:** primeiro o domínio, puro e testado: nome e fontes da base (`baseMetanutri.ts`), data por extenso, números da adequação (`formatarQuantidade.ts`) e as regras da folha (`folhaDieta.ts`: quem assina, lembretes, linha fina e opções de impressão guardadas no aparelho). Depois as telas leem essas peças: a `FolhaDieta` é reescrita, a janela de imprimir ganha as duas opções, uma rota pública nova mostra as fontes, e as telas de trabalho são enxugadas sem mexer em nenhum cálculo. Um componente novo de biblioteca, `Recolhivel`, guarda o que é opcional na etapa 1 e o detalhe do cálculo no Resumo do dia.

**Stack:** React 18 + TypeScript strict + Vite + Tailwind v4 + shadcn/ui · Vitest + Testing Library · Playwright.

**Spec:** `specs/pdf-e-telas-limpas/SPEC.md` (aprovada em 01/10/2026). Telas aprovadas no protótipo "PDF e telas limpas" (`https://claude.ai/code/artifact/2b7bb911-197d-4ab4-8120-e7e88f51c1b9`).

## Restrições globais

- Nenhuma dependência nova. Nenhum cálculo muda (D-54): só apresentação.
- Import do design system pelo alias `@ds/...`; do domínio, `@/domain/...`.
- Componentes funcionais, um por arquivo, export nomeado. `exactOptionalPropertyTypes` ligado: prop opcional é `readonly x?: T | undefined`. `noUncheckedIndexedAccess` ligado.
- Lint: nada de cor hexadecimal nem `font-family` em `.ts`/`.tsx` (nem dentro de texto: use nome de cor como `dimgray` onde precisar de cor em CSS gerado). Componente novo de interface mora em `design-system/componentes/`, entra em `design-system/index.ts` e na vitrine.
- Toque mínimo de 44 px: botão de texto `inline-flex min-h-11 items-center`; botão de ícone `size="icon"` do `Button`.
- O nome da base é exatamente **"Base MetaNutri"** (constante `NOME_DA_BASE`). TACO, POF, IBGE, NEPA e UNICAMP só aparecem na página Fontes da base (e nos comentários de código e nos dados).
- Folha impressa: corpo com no mínimo **10 pt** (14 px na tela = 10,5 pt), horário e nome da refeição com no mínimo **14 pt** (20 px = 15 pt). A folha não mostra energia nem quilocalorias.
- Laranja nunca carrega texto: na folha, só o traço da régua do cabeçalho.
- Toda tarefa termina com `npm run check` verde. Tarefa que mexe em tela roda também `npx playwright test`.
- Commit em Conventional Commits, em português, com a mensagem num arquivo UTF-8 terminado pela linha exata `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Comando: `git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt`.

## Foco de revisão

1. **Quantidade minúscula na adequação** (um total de 0,03 mg). Não pode virar "0,0", que se lê como zero: sai "< 0,1". Teste na Tarefa 1.
2. **Plano sem nome e sem data da consulta.** O cabeçalho da folha diz "Sem nome", sem "·" solto no fim. Teste na Tarefa 3.
3. **Nome do plano com aspas ou barra invertida** (`Maria "Mari" \ 2`). A linha fina do topo das páginas vai para dentro de um texto de CSS; sem escapar, quebra a regra de página inteira. Teste na Tarefa 3.
4. **Opções de impressão estragadas no aparelho** (JSON inválido, `"sim"` no lugar de `true`). Voltam ao padrão desmarcado, sem erro. Teste na Tarefa 2.
5. **Refeição só com substituto** (Principal vazio, Substituto 1 preenchido). A folha mostra a "Opção 2" e não diz "Sem alimentos nesta refeição." Teste na Tarefa 3.

## Decisões que tomei e você revisa

1. **A linha de quem assina, para nutricionista, sai como "Ana Souza · CRN-6 12345" com "Nutricionista" ao lado**, e não "Ana Souza · Nutricionista · CRN-6 12345" como está no CA-313. A linha vem pronta da conta; desmontá-la para enfiar a palavra no meio seria frágil. A Tarefa 3 ajusta o texto do CA-313 na SPEC.
2. **A folha passa a usar a mesma assinatura do plano** (conta ou Configurações), no lugar da linha `responsavel` que só existia com servidor e da linha do perfil local. Com servidor, sai igual ao CA-287 de `conta-e-verificacao`; sem servidor, sai o que o plano tem (nutricionista de Configurações, ou estagiário e preceptor do plano). A frase "documento de estudo, sem responsável técnico informado" deixa de aparecer.
3. **Número menor que 0,05 na adequação sai "< 0,1"** (Foco 1). A SPEC fala em uma casa decimal; isso só evita que um valor real pareça zero.
4. **"Composição corporal" e "Observações" viram linhas que abrem e fecham** com um componente novo da biblioteca, `Recolhivel`. O mesmo componente guarda "Ver cálculo" no Resumo do dia.
5. **As listas de escolha da Tabela de alimentos e o paciente da etapa 1 usam o `select` do navegador**, como a etapa 1 já faz hoje. A lista do design system abre por cima da tela e é pior no celular e no teste.
6. **As opções de impressão entram no backup e no "apagar dados do aparelho"** (chave `metanutri:impressao`).

---

## Ordem e dependências

| # | Tarefa | Depende de |
|---|---|---|
| 1 | Domínio: Base MetaNutri, data por extenso e números da adequação | — |
| 2 | Domínio: regras da folha da dieta | — |
| 3 | A folha da dieta nova | 1, 2 |
| 4 | Janela de imprimir com lista de compras e trocas | 2, 3 |
| 5 | Base MetaNutri nas telas e a página Fontes da base | 1 |
| 6 | Painel mais limpo | — |
| 7 | Etapa 1 mais limpa e o `Recolhivel` | — |
| 8 | Resumo do dia num cartão só | 7 |
| 9 | Etapa 2 mais limpa | — |
| 10 | Etapa 3 mais limpa | 1, 5 |
| 11 | Tabela de alimentos mais limpa | 1, 5 |
| 12 | e2e e documentação | 3 a 11 |

## Mapa de arquivos

**Criar**
- `src/domain/baseMetanutri.ts`, `src/domain/formatarQuantidade.ts`, `src/domain/folhaDieta.ts`, `src/domain/camposVisiveis.ts` (cada um com teste)
- `src/ui/exportar/linhaFina.ts` (+ teste), `src/ui/exportar/DialogoImprimir.test.tsx`
- `src/ui/publico/TelaFontes.tsx` (+ teste)
- `design-system/componentes/display/Recolhivel.tsx`
- `src/ui/caso/CartaoIdentificacao.tsx`, `src/ui/caso/CartaoPessoa.tsx`, `src/ui/caso/etapa1.test.tsx`
- `src/ui/alimentos/TelaAlimentos.test.tsx`

**Alterar**
- `src/domain/formatarData.ts` (+ teste), `src/domain/perfil.ts`, `src/domain/vitrine.ts`
- `src/ui/exportar/FolhaDieta.tsx` (+ teste), `src/ui/exportar/DialogoImprimir.tsx`, `src/ui/exportar/MenuExportar.tsx`, `src/ui/tema/globals.css`
- `src/ui/navegacao.ts` (+ teste), `src/App.tsx`, `src/App.test.tsx`, `src/ui/publico/MolduraPublica.tsx` (+ teste), `src/ui/publico/TelaInicio.tsx` (+ teste), `src/ui/ajuda/TelaAjuda.tsx` (+ teste), `src/ui/adequacao/TelaAdequacao.test.tsx`
- `src/ui/painel/TelaPainel.tsx` (+ teste)
- `src/ui/caso/TelaCaso.tsx`, `src/ui/caso/PainelAntropometria.tsx`, `src/ui/caso/TelaCaso.test.tsx`
- `src/ui/resumo/ResumoDoDia.tsx` (+ teste)
- `src/ui/plano/CartaoRefeicao.tsx`, `src/ui/plano/SugestoesDaRefeicao.tsx`, `src/ui/plano/TelaPlano.test.tsx`
- `src/ui/adequacao/TelaAdequacao.tsx` (+ teste)
- `src/ui/alimentos/TelaAlimentos.tsx`
- `design-system/index.ts`, `design-system/vitrine/TelaDesignSystem.tsx`, `design-system/componentes/LEIA-ME.md`, `design-system/LEIA-ME.md`
- `e2e/planejador.spec.ts`, `e2e/publico.spec.ts`, `e2e/design-system.spec.ts`, `docs/decisoes.md`, `docs/pendencias.md`, `specs/pdf-e-telas-limpas/SPEC.md`

**Renomear**
- `src/ui/caso/CartaoComposicao.tsx` → `src/ui/caso/CamposComposicao.tsx` (perde o cartão em volta)

**Apagar**
- `src/ui/painel/GraficoAtividade.tsx`

---

### Tarefa 1: Domínio: Base MetaNutri, data por extenso e números da adequação

Cobre D-51 e a parte de dados do CA-322, o "1º de outubro de 2026" do CA-308, o CA-339 e o Foco de revisão 1.

**Arquivos:**
- Criar: `src/domain/baseMetanutri.ts`, `src/domain/baseMetanutri.test.ts`
- Criar: `src/domain/formatarQuantidade.ts`, `src/domain/formatarQuantidade.test.ts`
- Alterar: `src/domain/formatarData.ts`, `src/domain/formatarData.test.ts`

**Interfaces:**
- Produz:
  - `NOME_DA_BASE = 'Base MetaNutri'`
  - `interface FonteDaBase { assunto; citacao; uso; url; rotuloLink }` e `FONTES_DA_BASE: readonly FonteDaBase[]` (3 itens)
  - `resumoDaBase(): { alimentos: number; nutrientes: number; comMedidaCaseira: number }`
  - `dataPorExtenso(iso: string | null | undefined): string` — `"2026-10-01"` → `"1º de outubro de 2026"`
  - `quantidadeNoPlano(valor: number): string` e `valorDeReferencia(valor: number): string`

- [ ] **Passo 1: Escrever os testes que falham**

Crie `src/domain/baseMetanutri.test.ts`:

```ts
import { FONTES_DA_BASE, NOME_DA_BASE, resumoDaBase } from './baseMetanutri.ts'

describe('Base MetaNutri (D-51, CA-322)', () => {
  it('tem o nome da base', () => {
    expect(NOME_DA_BASE).toBe('Base MetaNutri')
  })

  it('conta alimentos, nutrientes e medidas caseiras na base em uso', () => {
    expect(resumoDaBase()).toEqual({ alimentos: 597, nutrientes: 20, comMedidaCaseira: 287 })
  })

  it('cita as três fontes, cada uma com link', () => {
    expect(FONTES_DA_BASE.map((f) => f.assunto)).toEqual(['Composição dos alimentos', 'Medidas caseiras', 'Produtos de rótulo'])
    expect(FONTES_DA_BASE[0]?.citacao).toMatch(/Tabela Brasileira de Composição de Alimentos \(TACO\), 4ª edição revisada e ampliada/)
    expect(FONTES_DA_BASE[0]?.citacao).toMatch(/NEPA.*UNICAMP/)
    expect(FONTES_DA_BASE[1]?.citacao).toMatch(/IBGE.*Pesquisa de Orçamentos Familiares 2008-2009/)
    expect(FONTES_DA_BASE[2]?.citacao).toMatch(/Open Food Facts.*ODbL/)
    for (const fonte of FONTES_DA_BASE) expect(fonte.url).toMatch(/^https:\/\//)
  })
})
```

Crie `src/domain/formatarQuantidade.test.ts`:

```ts
import { quantidadeNoPlano, valorDeReferencia } from './formatarQuantidade.ts'

describe('números da adequação (CA-339)', () => {
  it.each([
    [8.67, '8,7'],
    [0.78, '0,8'],
    [28.58, '28,6'],
    [99.96, '100,0'],
    [656.4, '656'],
    [2747.65, '2.748'],
    [0, '0,0'],
  ])('no plano: %f vira %s', (valor, texto) => {
    expect(quantidadeNoPlano(valor)).toBe(texto)
  })

  it('Foco de revisão 1: valor positivo que arredondaria para 0,0 não parece zero', () => {
    expect(quantidadeNoPlano(0.03)).toBe('< 0,1')
    expect(quantidadeNoPlano(0.05)).toBe('0,1')
  })

  it.each([
    [0.9, '0,9'],
    [1.1, '1,1'],
    [18, '18'],
    [1000, '1.000'],
    [2.4, '2,4'],
  ])('referência como publicada: %f vira %s', (valor, texto) => {
    expect(valorDeReferencia(valor)).toBe(texto)
  })
})
```

Em `src/domain/formatarData.test.ts`, troque o import por `import { dataCompleta, dataCurta, dataPorExtenso } from './formatarData.ts'` (mantendo o que já era importado) e acrescente no fim:

```ts
describe('dataPorExtenso (CA-308)', () => {
  it.each([
    ['2026-10-01', '1º de outubro de 2026'],
    ['2026-09-15', '15 de setembro de 2026'],
    ['2026-12-31T10:00:00.000Z', '31 de dezembro de 2026'],
    ['', ''],
    [null, ''],
    ['2026-02-30', ''],
  ])('%s vira "%s"', (iso, texto) => {
    expect(dataPorExtenso(iso)).toBe(texto)
  })
})
```

(Abra o arquivo antes: se o import atual tiver outra forma, só acrescente `dataPorExtenso` a ele.)

- [ ] **Passo 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/baseMetanutri.test.ts src/domain/formatarQuantidade.test.ts src/domain/formatarData.test.ts`
Expected: FAIL — os módulos e `dataPorExtenso` não existem.

- [ ] **Passo 3: Implementar**

Crie `src/domain/baseMetanutri.ts`:

```ts
// A base de alimentos com o nome do MetaNutri e as fontes que a licença da TACO
// manda citar (spec pdf-e-telas-limpas, D-51 e CA-322).
import { medidasDoAlimento } from './busca.ts'
import { NUTRIENTES_CONFERIDOS } from './completude.ts'
import { ALIMENTOS } from './tabelas.ts'

export const NOME_DA_BASE = 'Base MetaNutri'

export interface FonteDaBase {
  readonly assunto: string
  readonly citacao: string
  /** O que entra na base a partir desta fonte, em uma frase. */
  readonly uso: string
  readonly url: string
  readonly rotuloLink: string
}

export const FONTES_DA_BASE: readonly FonteDaBase[] = [
  {
    assunto: 'Composição dos alimentos',
    citacao:
      'Núcleo de Estudos e Pesquisas em Alimentação (NEPA), Universidade Estadual de Campinas (UNICAMP). Tabela Brasileira de Composição de Alimentos (TACO), 4ª edição revisada e ampliada. Campinas: NEPA/UNICAMP, 2011.',
    uso: 'Valores por 100 g de parte comestível. Nutriente que a tabela não analisou aparece como travessão, nunca como zero.',
    url: 'https://www.cfn.org.br/wp-content/uploads/2017/03/taco_4_edicao_ampliada_e_revisada.pdf',
    rotuloLink: 'Abrir a publicação',
  },
  {
    assunto: 'Medidas caseiras',
    citacao:
      'Instituto Brasileiro de Geografia e Estatística (IBGE). Pesquisa de Orçamentos Familiares 2008-2009: tabela de medidas referidas para os alimentos consumidos no Brasil. Rio de Janeiro: IBGE, 2011.',
    uso: 'É daqui que vêm "4 colheres de sopa", "1 concha" e "1 bife" em cada alimento.',
    url: 'https://www.ibge.gov.br/estatisticas/sociais/populacao/9050-pesquisa-de-orcamentos-familiares.html',
    rotuloLink: 'Abrir a publicação',
  },
  {
    assunto: 'Produtos de rótulo',
    citacao: 'Open Food Facts, base colaborativa e aberta de produtos alimentícios, sob a licença Open Database License (ODbL).',
    uso: 'Só entra o produto que você cadastra em Meus produtos; açúcares e gordura saturada vêm do rótulo.',
    url: 'https://world.openfoodfacts.org/',
    rotuloLink: 'Abrir o Open Food Facts',
  },
]

export interface ResumoDaBase {
  readonly alimentos: number
  readonly nutrientes: number
  readonly comMedidaCaseira: number
}

/** Contado na base em uso: se ela mudar, a página de fontes muda junto. */
export function resumoDaBase(): ResumoDaBase {
  return {
    alimentos: ALIMENTOS.length,
    nutrientes: NUTRIENTES_CONFERIDOS.length,
    comMedidaCaseira: ALIMENTOS.filter((a) => medidasDoAlimento(a.id).length > 0).length,
  }
}
```

Crie `src/domain/formatarQuantidade.ts`:

```ts
// Números da tabela de adequação: só a precisão que serve para decidir (spec pdf-e-telas-limpas, CA-339).
const formatadores = new Map<string, Intl.NumberFormat>()

function formato(minimo: number, maximo: number): Intl.NumberFormat {
  const chave = `${minimo}-${maximo}`
  let f = formatadores.get(chave)
  if (!f) {
    f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: minimo, maximumFractionDigits: maximo })
    formatadores.set(chave, f)
  }
  return f
}

/** "8,7", "656", "2.748". Positivo que arredondaria para 0,0 vira "< 0,1": não pode parecer zero. */
export function quantidadeNoPlano(valor: number): string {
  if (valor > 0 && valor < 0.05) return '< 0,1'
  return Math.abs(valor) < 100 ? formato(1, 1).format(valor) : formato(0, 0).format(valor)
}

/** A referência como foi publicada, sem zeros à direita: "0,9", "1,1", "18", "1.000". */
export function valorDeReferencia(valor: number): string {
  return formato(0, 2).format(valor)
}
```

Em `src/domain/formatarData.ts`, acrescente no fim:

```ts
const MES = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' })

/** "2026-10-01" → "1º de outubro de 2026" (CA-308). Entrada inválida ou vazia devolve vazio. */
export function dataPorExtenso(iso: string | null | undefined): string {
  const data = lerData(iso)
  if (!data) return ''
  const dia = data.getUTCDate()
  return `${dia === 1 ? '1º' : dia} de ${MES.format(data)} de ${data.getUTCFullYear()}`
}
```

- [ ] **Passo 4: Rodar e ver passar**

Run: `npx vitest run src/domain/baseMetanutri.test.ts src/domain/formatarQuantidade.test.ts src/domain/formatarData.test.ts`
Expected: PASS.

- [ ] **Passo 5: Portão e commit**

Run: `npm run check`

```bash
printf '%s\n' 'feat(dominio): Base MetaNutri, data por extenso e números da adequação' '' 'Nome e fontes da base, "1º de outubro de 2026" e números da adequação' 'com só a precisão que serve (D-51, CA-322, CA-308, CA-339).' '' 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>' > ../_msg.txt
git add src/domain/baseMetanutri.ts src/domain/baseMetanutri.test.ts src/domain/formatarQuantidade.ts src/domain/formatarQuantidade.test.ts src/domain/formatarData.ts src/domain/formatarData.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 2: Domínio: regras da folha da dieta

Cobre as regras do CA-312, CA-313, CA-316, CA-320, CB-72 e o Foco de revisão 4.

**Arquivos:**
- Criar: `src/domain/folhaDieta.ts`, `src/domain/folhaDieta.test.ts`
- Alterar: `src/domain/perfil.ts` (`CHAVES_DE_DADOS`)

**Interfaces:**
- Consome: `nutricionistaDoWord`, `AssinaturaDoPlano` (`assinaturaDoPlano.ts`); `Missao` (`missoes.ts`); `Armazenamento` (`persistencia.ts`).
- Produz:
  - `type AssinaturaDaFolha = { tipo: 'nutricionista'; linha: string } | { tipo: 'estagio'; estagiario: string; preceptor: string } | { tipo: 'vazia' }`
  - `assinaturaDaFolha(assinatura: AssinaturaDoPlano | null, caso: Caso): AssinaturaDaFolha`
  - `lembretesDoDia(missoes: readonly Missao[]): readonly Missao[]`
  - `linhaFinaDaFolha(caso: Caso, assinatura: AssinaturaDaFolha): { esquerda: string; direita: string }`
  - `interface OpcoesImpressao { listaDeCompras: boolean; trocas: boolean }`, `OPCOES_IMPRESSAO_PADRAO`, `lerOpcoesImpressao(armazenamento)`, `gravarOpcoesImpressao(armazenamento, opcoes): boolean`; chave `'metanutri:impressao'`.

- [ ] **Passo 1: Escrever os testes que falham**

Crie `src/domain/folhaDieta.test.ts`:

```ts
import type { AssinaturaDoPlano } from './assinaturaDoPlano.ts'
import { criarCasoVazio } from './caso.ts'
import {
  assinaturaDaFolha,
  gravarOpcoesImpressao,
  lembretesDoDia,
  lerOpcoesImpressao,
  linhaFinaDaFolha,
  OPCOES_IMPRESSAO_PADRAO,
} from './folhaDieta.ts'
import type { Missao } from './missoes.ts'
import { CHAVES_DE_DADOS } from './perfil.ts'
import type { Armazenamento } from './persistencia.ts'
import type { Caso } from './tipos.ts'

const ANA: AssinaturaDoPlano = { situacao: 'nutricionista', linhaNutricionista: 'Ana Souza · CRN-6 12345', origem: 'conta', nome: 'Ana Souza', responsavelTecnico: '' }
const JULIA: AssinaturaDoPlano = { situacao: 'estudante', linhaNutricionista: null, origem: 'conta', nome: 'Júlia Martins', responsavelTecnico: 'Carla Mendes' }
const caso = (p: Partial<Caso> = {}): Caso => ({ ...criarCasoVazio('c1'), nome: 'Maria, 28 anos', ...p })

function memoria(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial))
  const arm: Armazenamento = {
    getItem: (c) => dados.get(c) ?? null,
    setItem: (c, v) => {
      dados.set(c, v)
    },
    removeItem: (c) => {
      dados.delete(c)
    },
  }
  return arm
}

describe('assinaturaDaFolha (CA-313)', () => {
  it('nutricionista assina com a linha do cadastro', () => {
    expect(assinaturaDaFolha(ANA, caso())).toEqual({ tipo: 'nutricionista', linha: 'Ana Souza · CRN-6 12345' })
  })

  it('nutricionista sem nome e CRN ainda assina como nutricionista, com a linha vazia', () => {
    expect(assinaturaDaFolha({ ...ANA, linhaNutricionista: null }, caso())).toEqual({ tipo: 'nutricionista', linha: '' })
  })

  it('plano antigo de nutricionista com estagiário sai como estágio (CB-51)', () => {
    expect(assinaturaDaFolha(ANA, caso({ estagiario: 'Júlia Martins' }))).toEqual({ tipo: 'estagio', estagiario: 'Júlia Martins', preceptor: '' })
  })

  it('estudante sai com estagiário e preceptor do plano', () => {
    expect(assinaturaDaFolha(JULIA, caso({ estagiario: ' Júlia Martins ', preceptor: 'Carla Mendes' }))).toEqual({
      tipo: 'estagio',
      estagiario: 'Júlia Martins',
      preceptor: 'Carla Mendes',
    })
  })

  it('sem ninguém, a folha fica sem nome', () => {
    expect(assinaturaDaFolha(null, caso())).toEqual({ tipo: 'vazia' })
    expect(assinaturaDaFolha(JULIA, caso())).toEqual({ tipo: 'vazia' })
  })
})

describe('lembretesDoDia (CA-312)', () => {
  it('fica só com o que não repete o horário das refeições', () => {
    const missoes: Missao[] = [
      { id: 'refeicao-r1', texto: 'Desjejum por volta das 06:00', origem: 'Refeição do plano' },
      { id: 'frutas', texto: 'Comer as 3 frutas do plano', origem: '' },
      { id: 'refeicao-r2', texto: 'Almoço por volta das 12:00', origem: 'Refeição do plano' },
      { id: 'agua', texto: 'Beber cerca de 2,2 litros de água', origem: '' },
    ]
    expect(lembretesDoDia(missoes).map((m) => m.id)).toEqual(['frutas', 'agua'])
  })
})

describe('linhaFinaDaFolha (CA-316)', () => {
  it('leva o nome do plano e quem assina', () => {
    expect(linhaFinaDaFolha(caso(), { tipo: 'nutricionista', linha: 'Ana Souza · CRN-6 12345' })).toEqual({
      esquerda: 'Plano alimentar · Maria, 28 anos',
      direita: 'Ana Souza · CRN-6 12345',
    })
    expect(linhaFinaDaFolha(caso({ nome: '  ' }), { tipo: 'estagio', estagiario: 'Júlia', preceptor: 'Carla' })).toEqual({
      esquerda: 'Plano alimentar · Sem nome',
      direita: 'Júlia · Carla',
    })
    expect(linhaFinaDaFolha(caso(), { tipo: 'vazia' }).direita).toBe('')
  })
})

describe('opções de impressão (CA-317, CA-320, CB-72)', () => {
  it('começa desmarcada', () => {
    expect(OPCOES_IMPRESSAO_PADRAO).toEqual({ listaDeCompras: false, trocas: false })
    expect(lerOpcoesImpressao(memoria())).toEqual(OPCOES_IMPRESSAO_PADRAO)
  })

  it('lembra o que foi marcado', () => {
    const arm = memoria()
    expect(gravarOpcoesImpressao(arm, { listaDeCompras: true, trocas: false })).toBe(true)
    expect(lerOpcoesImpressao(arm)).toEqual({ listaDeCompras: true, trocas: false })
  })

  it('Foco de revisão 4: dado estragado volta ao padrão', () => {
    expect(lerOpcoesImpressao(memoria({ 'metanutri:impressao': '{não é json' }))).toEqual(OPCOES_IMPRESSAO_PADRAO)
    expect(lerOpcoesImpressao(memoria({ 'metanutri:impressao': '{"listaDeCompras":"sim","trocas":1}' }))).toEqual(OPCOES_IMPRESSAO_PADRAO)
    expect(lerOpcoesImpressao(memoria({ 'metanutri:impressao': '[true]' }))).toEqual(OPCOES_IMPRESSAO_PADRAO)
  })

  it('CB-72: sem armazenamento, vale só para esta impressão', () => {
    expect(lerOpcoesImpressao(null)).toEqual(OPCOES_IMPRESSAO_PADRAO)
    expect(gravarOpcoesImpressao(null, { listaDeCompras: true, trocas: true })).toBe(false)
    const cheio: Armazenamento = {
      ...memoria(),
      setItem: () => {
        throw new DOMException('cheio', 'QuotaExceededError')
      },
    }
    expect(gravarOpcoesImpressao(cheio, { listaDeCompras: true, trocas: true })).toBe(false)
  })

  it('a chave entra no backup e no apagar dados do aparelho', () => {
    expect(CHAVES_DE_DADOS).toContain('metanutri:impressao')
  })
})
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/folhaDieta.test.ts`
Expected: FAIL — `./folhaDieta.ts` não existe.

- [ ] **Passo 3: Implementar**

Crie `src/domain/folhaDieta.ts`:

```ts
// O que a folha da dieta mostra e como ela lembra as escolhas de impressão
// (spec pdf-e-telas-limpas, US-B1).
import { nutricionistaDoWord, type AssinaturaDoPlano } from './assinaturaDoPlano.ts'
import type { Missao } from './missoes.ts'
import type { Armazenamento } from './persistencia.ts'
import type { Caso } from './tipos.ts'

export type AssinaturaDaFolha =
  | { readonly tipo: 'nutricionista'; readonly linha: string }
  | { readonly tipo: 'estagio'; readonly estagiario: string; readonly preceptor: string }
  | { readonly tipo: 'vazia' }

/** CA-313: as mesmas regras do Word (spec ajustes-de-uso, CA-252 e CB-51). */
export function assinaturaDaFolha(assinatura: AssinaturaDoPlano | null, caso: Caso): AssinaturaDaFolha {
  const nutricionista = nutricionistaDoWord(assinatura, caso)
  if (nutricionista !== null) return { tipo: 'nutricionista', linha: nutricionista }
  const estagiario = caso.estagiario.trim()
  const preceptor = caso.preceptor.trim()
  if (estagiario || preceptor) return { tipo: 'estagio', estagiario, preceptor }
  return { tipo: 'vazia' }
}

/** CA-312: no papel, só as missões que não repetem o horário das refeições. */
export function lembretesDoDia(missoes: readonly Missao[]): readonly Missao[] {
  return missoes.filter((m) => !m.id.startsWith('refeicao-'))
}

/** CA-316: o texto da linha fina do topo, da segunda página em diante. */
export function linhaFinaDaFolha(caso: Caso, assinatura: AssinaturaDaFolha): { readonly esquerda: string; readonly direita: string } {
  const direita =
    assinatura.tipo === 'nutricionista'
      ? assinatura.linha
      : assinatura.tipo === 'estagio'
        ? [assinatura.estagiario, assinatura.preceptor].filter(Boolean).join(' · ')
        : ''
  return { esquerda: `Plano alimentar · ${caso.nome.trim() || 'Sem nome'}`, direita }
}

export interface OpcoesImpressao {
  readonly listaDeCompras: boolean
  readonly trocas: boolean
}

export const OPCOES_IMPRESSAO_PADRAO: OpcoesImpressao = { listaDeCompras: false, trocas: false }

const CHAVE = 'metanutri:impressao'

/** CA-320: o que foi marcado na última impressão. Dado estragado volta ao padrão. */
export function lerOpcoesImpressao(armazenamento: Armazenamento | null): OpcoesImpressao {
  if (!armazenamento) return OPCOES_IMPRESSAO_PADRAO
  try {
    const bruto: unknown = JSON.parse(armazenamento.getItem(CHAVE) ?? 'null')
    if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) return OPCOES_IMPRESSAO_PADRAO
    const { listaDeCompras, trocas } = bruto as { listaDeCompras?: unknown; trocas?: unknown }
    return { listaDeCompras: listaDeCompras === true, trocas: trocas === true }
  } catch {
    return OPCOES_IMPRESSAO_PADRAO
  }
}

/** `false` quando o aparelho não guardou: as opções valem só para esta impressão (CB-72). */
export function gravarOpcoesImpressao(armazenamento: Armazenamento | null, opcoes: OpcoesImpressao): boolean {
  if (!armazenamento) return false
  try {
    armazenamento.setItem(CHAVE, JSON.stringify({ listaDeCompras: opcoes.listaDeCompras, trocas: opcoes.trocas }))
    return true
  } catch {
    return false
  }
}
```

Em `src/domain/perfil.ts`, acrescente a chave no fim de `CHAVES_DE_DADOS`:

```ts
  'metanutri:sugestoes-por-refeicao',
  'metanutri:perfil-conta',
  'metanutri:impressao',
] as const
```

(Abra o arquivo antes: mantenha as chaves que já estão lá, só acrescente `'metanutri:impressao'` como última.)

- [ ] **Passo 4: Rodar e ver passar**

Run: `npx vitest run src/domain/folhaDieta.test.ts src/domain/backupCompleto.test.ts`
Expected: PASS.

- [ ] **Passo 5: Portão e commit**

Run: `npm run check`

```bash
printf '%s\n' 'feat(dominio): regras da folha da dieta' '' 'Quem assina pela regra do Word, lembretes sem os horários das refeições,' 'linha fina das páginas seguintes e as opções de impressão lembradas no' 'aparelho (CA-312, CA-313, CA-316, CA-320, CB-72).' '' 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>' > ../_msg.txt
git add src/domain/folhaDieta.ts src/domain/folhaDieta.test.ts src/domain/perfil.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 3: A folha da dieta nova

Cobre CA-308 a CA-316, CA-318, CA-319, CB-71, e os Focos de revisão 2, 3 e 5.

**Arquivos:**
- Criar: `src/ui/exportar/linhaFina.ts`, `src/ui/exportar/linhaFina.test.ts`
- Alterar: `src/ui/exportar/FolhaDieta.tsx` (reescrita), `src/ui/exportar/FolhaDieta.test.tsx` (reescrita)
- Alterar: `src/ui/tema/globals.css` (regras de impressão)
- Alterar: `specs/pdf-e-telas-limpas/SPEC.md` (texto do CA-313, Decisão 1 do plano)

**Interfaces:**
- Consome: Tarefa 1 (`NOME_DA_BASE`, `dataPorExtenso`); Tarefa 2 (`assinaturaDaFolha`, `lembretesDoDia`, `linhaFinaDaFolha`, `OpcoesImpressao`, `OPCOES_IMPRESSAO_PADRAO`); `trocasDoPlano(plano, buscar, { porAlimento, alimentos, restricoes })`, `listaDeCompras`, `missoesDoPlano`, `medidaEquivalente`, `lerPerfil` (logo).
- Produz:
  - `regraDaLinhaFina(esquerda: string, direita: string): string` (CSS de `@page`)
  - `FolhaDieta({ caso, plano, restricoes?, assinatura?: AssinaturaDoPlano | null | undefined, opcoes?: OpcoesImpressao | undefined })` — **sem** a prop `responsavel` (a Tarefa 4 ajusta quem a passava).

- [ ] **Passo 1: Escrever os testes que falham**

Crie `src/ui/exportar/linhaFina.test.ts`:

```ts
import { regraDaLinhaFina } from './linhaFina.ts'

describe('linha fina do topo (CA-316)', () => {
  it('põe os dois textos nas margens do @page e some na primeira página', () => {
    const css = regraDaLinhaFina('Plano alimentar · Maria', 'Ana Souza · CRN-6 12345')
    expect(css).toContain('@media print')
    expect(css).toContain('@top-left { content: "Plano alimentar · Maria"')
    expect(css).toContain('@top-right { content: "Ana Souza · CRN-6 12345"')
    expect(css).toMatch(/@page :first \{ @top-left \{ content: none; \} @top-right \{ content: none; \} \}/)
  })

  it('Foco de revisão 3: aspas, barra invertida e quebra de linha não quebram o CSS', () => {
    const css = regraDaLinhaFina('Plano alimentar · Maria "Mari" \\ 2\nfim', '')
    expect(css).toContain('content: "Plano alimentar · Maria \\"Mari\\" \\\\ 2 fim"')
    expect(css).toContain('@top-right { content: ""')
  })
})
```

Troque o conteúdo de `src/ui/exportar/FolhaDieta.test.tsx` por:

```tsx
import { render, screen, within } from '@testing-library/react'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { criarCasoVazio } from '@/domain/caso.ts'
import { adicionarItem, criarPlanoPadrao } from '@/domain/plano.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
import { FolhaDieta } from './FolhaDieta.tsx'

let n = 0
const ids = () => `id${++n}`

const ARROZ = 3
const BATATA = 91
const MACARRAO_CRU = 40

const caso: Caso = {
  ...criarCasoVazio('c1'),
  nome: 'Maria, 28 anos',
  dataConsulta: '2026-09-15',
  sexo: 'F',
  idadeAnos: 28,
  pesoKg: 60,
  estaturaCm: 165,
  orientacoes: 'Beber 2 litros de água por dia.',
}

const ANA: AssinaturaDoPlano = { situacao: 'nutricionista', linhaNutricionista: 'Ana Souza · CRN-6 12345', origem: 'conta', nome: 'Ana Souza', responsavelTecnico: '' }

function planoCheio(): Plano {
  let plano = criarPlanoPadrao(ids)
  const almoco = plano.refeicoes[2]
  const jantar = plano.refeicoes[4]
  if (!almoco || !jantar) throw new Error('plano padrão mudou')
  plano = adicionarItem(plano, almoco.id, 'principal', { alimentoId: ARROZ, gramas: 150 }, ids)
  plano = adicionarItem(plano, almoco.id, 'substituto1', { alimentoId: BATATA, gramas: 120 }, ids)
  plano = adicionarItem(plano, jantar.id, 'principal', { alimentoId: MACARRAO_CRU, gramas: 80 }, ids)
  return plano
}

const refeicao = (nome: RegExp) => within(screen.getByRole('region', { name: nome }))

beforeEach(() => localStorage.clear())

describe('Folha da dieta (US-B1)', () => {
  it('CA-308: cabeçalho com título, nome do plano e data por extenso', () => {
    render(<FolhaDieta caso={caso} plano={planoCheio()} assinatura={ANA} />)
    expect(screen.getByRole('heading', { name: 'Plano alimentar' })).toBeInTheDocument()
    expect(screen.getByText('Maria, 28 anos · 15 de setembro de 2026')).toBeInTheDocument()
  })

  it('Foco de revisão 2: sem nome e sem data, nada de separador solto', () => {
    render(<FolhaDieta caso={{ ...caso, nome: '', dataConsulta: null }} plano={planoCheio()} />)
    expect(screen.getByText('Sem nome')).toBeInTheDocument()
  })

  it('CA-309: medida caseira em destaque, peso ao lado e o alimento', () => {
    render(<FolhaDieta caso={caso} plano={planoCheio()} />)
    const almoco = refeicao(/^12:00 Almoço$/)
    expect(almoco.getByRole('heading', { name: 'Almoço' })).toBeInTheDocument()
    expect(almoco.getByText('6 colheres de sopa')).toBeInTheDocument()
    expect(almoco.getByText(/· 150 g/)).toBeInTheDocument()
    expect(almoco.getByText('Arroz, tipo 1, cozido')).toBeInTheDocument()

    const jantar = refeicao(/^19:00 Jantar$/)
    expect(jantar.getByText('80 g')).toBeInTheDocument()
    expect(jantar.queryByText(/· 80 g/)).not.toBeInTheDocument()
  })

  it('CA-310: substituto vira "Opção 2"; substituto vazio não aparece', () => {
    render(<FolhaDieta caso={caso} plano={planoCheio()} />)
    const almoco = refeicao(/^12:00 Almoço$/)
    expect(almoco.getByText('Opção 2')).toBeInTheDocument()
    expect(almoco.getByText('Batata, inglesa, cozida')).toBeInTheDocument()
    expect(almoco.queryByText('Opção 3')).not.toBeInTheDocument()
  })

  it('Foco de revisão 5: refeição só com substituto mostra a opção e não diz que está vazia', () => {
    let plano = criarPlanoPadrao(ids)
    const ceia = plano.refeicoes[5]
    if (!ceia) throw new Error('sem ceia')
    plano = adicionarItem(plano, ceia.id, 'substituto1', { alimentoId: BATATA, gramas: 120 }, ids)
    render(<FolhaDieta caso={caso} plano={plano} />)
    const regiao = refeicao(/^21:00 Ceia$/)
    expect(regiao.getByText('Opção 2')).toBeInTheDocument()
    expect(regiao.queryByText('Sem alimentos nesta refeição.')).not.toBeInTheDocument()
  })

  it('CA-311: a folha não fala de energia', () => {
    const { container } = render(<FolhaDieta caso={{ ...caso, modo: 'rapido', metaEnergiaKcal: 1800 }} plano={planoCheio()} />)
    expect(container.textContent).not.toMatch(/kcal/)
  })

  it('CA-312: "No dia a dia" traz só o que não é horário de refeição', () => {
    render(<FolhaDieta caso={caso} plano={planoCheio()} />)
    expect(screen.getByRole('heading', { name: 'No dia a dia' })).toBeInTheDocument()
    expect(screen.getByText(/litros de água/)).toBeInTheDocument()
    expect(screen.queryByText(/por volta das/)).not.toBeInTheDocument()
  })

  it('CA-313: nutricionista assina sozinha, com a linha da conta no topo e no fim', () => {
    render(<FolhaDieta caso={caso} plano={planoCheio()} assinatura={ANA} />)
    expect(screen.getAllByText('Ana Souza · CRN-6 12345')).toHaveLength(2)
    expect(within(screen.getByRole('group', { name: 'Assinaturas' })).getByText('Nutricionista')).toBeInTheDocument()
  })

  it('CA-313: estágio sai com os dois nomes e duas assinaturas; sem ninguém, uma linha "Assinatura"', () => {
    const { unmount } = render(<FolhaDieta caso={{ ...caso, estagiario: 'Júlia Martins', preceptor: 'Carla Mendes' }} plano={planoCheio()} />)
    const assinaturas = within(screen.getByRole('group', { name: 'Assinaturas' }))
    expect(assinaturas.getByText('Estagiário(a)')).toBeInTheDocument()
    expect(assinaturas.getByText('Preceptor(a)')).toBeInTheDocument()
    expect(screen.getAllByText('Júlia Martins').length).toBeGreaterThanOrEqual(2)
    unmount()

    render(<FolhaDieta caso={caso} plano={planoCheio()} />)
    expect(within(screen.getByRole('group', { name: 'Assinaturas' })).getByText('Assinatura')).toBeInTheDocument()
  })

  it('CA-314: lembretes, orientações e assinatura nessa ordem, e a linha da base no fim', () => {
    render(<FolhaDieta caso={{ ...caso, receitas: 'Cuscuz com ovo.' }} plano={planoCheio()} assinatura={ANA} />)
    const antes = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    const lembretes = screen.getByRole('heading', { name: 'No dia a dia' })
    const orientacoes = screen.getByRole('heading', { name: 'Orientações' })
    const receitas = screen.getByRole('heading', { name: 'Receitas' })
    const assinaturas = screen.getByRole('group', { name: 'Assinaturas' })
    expect(antes(lembretes, orientacoes)).toBe(true)
    expect(antes(orientacoes, receitas)).toBe(true)
    expect(antes(receitas, assinaturas)).toBe(true)
    expect(screen.getByText(/A prescrição é responsabilidade do nutricionista\. Composição dos alimentos: Base MetaNutri\./)).toBeInTheDocument()
  })

  it('CA-314: em prescrição rápida, a linha final diz que não houve avaliação', () => {
    render(<FolhaDieta caso={{ ...caso, modo: 'rapido' }} plano={planoCheio()} />)
    expect(screen.getByText(/^Plano montado em prescrição rápida, sem avaliação antropométrica\./)).toBeInTheDocument()
  })

  it('CA-315: refeição e fim da folha não se partem entre páginas', () => {
    const { container } = render(<FolhaDieta caso={caso} plano={planoCheio()} />)
    for (const secao of screen.getAllByRole('region', { name: /^\d{2}:\d{2} / })) expect(secao).toHaveClass('break-inside-avoid')
    expect(container.querySelector('.fim-da-folha')).toHaveClass('break-inside-avoid')
  })

  it('CA-316: a regra da linha fina vem com o nome do plano e quem assina', () => {
    const { container } = render(<FolhaDieta caso={caso} plano={planoCheio()} assinatura={ANA} />)
    const css = container.querySelector('style')?.textContent ?? ''
    expect(css).toContain('Plano alimentar · Maria, 28 anos')
    expect(css).toContain('Ana Souza · CRN-6 12345')
  })

  it('CA-318 e CA-319: lista de compras e trocas só quando marcadas, numa página nova, com até 2 trocas', () => {
    const { unmount } = render(<FolhaDieta caso={caso} plano={planoCheio()} />)
    expect(screen.queryByRole('heading', { name: 'Lista de compras' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Trocas' })).not.toBeInTheDocument()
    unmount()

    const { container } = render(<FolhaDieta caso={caso} plano={planoCheio()} opcoes={{ listaDeCompras: true, trocas: true }} />)
    expect(screen.getByRole('heading', { name: 'Lista de compras' })).toBeInTheDocument()
    expect(screen.getByText('Arroz, tipo 1, cozido — 150 g')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Trocas' })).toBeInTheDocument()
    expect(container.querySelector('.anexos-da-folha')).toHaveClass('break-before-page')
    for (const linha of within(screen.getByRole('list', { name: 'Trocas' })).getAllByRole('listitem')) {
      expect(linha.querySelectorAll('.troca').length).toBeLessThanOrEqual(2)
    }
  })

  it('as trocas não oferecem doce nem ultraprocessado', () => {
    render(<FolhaDieta caso={caso} plano={planoCheio()} opcoes={{ listaDeCompras: false, trocas: true }} />)
    const texto = (screen.getByRole('list', { name: 'Trocas' }).textContent ?? '').toLowerCase()
    for (const proibido of ['biscoito', 'chocolate', 'salsicha', 'refrigerante']) expect(texto).not.toContain(proibido)
  })

  it('CB-71: plano sem alimento sai com o aviso em cada refeição', () => {
    render(<FolhaDieta caso={{ ...caso, orientacoes: '' }} plano={criarPlanoPadrao(ids)} />)
    expect(screen.getAllByText('Sem alimentos nesta refeição.')).toHaveLength(6)
    expect(screen.queryByRole('heading', { name: 'Orientações' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'No dia a dia' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/exportar/linhaFina.test.ts src/ui/exportar/FolhaDieta.test.tsx`
Expected: FAIL — `linhaFina.ts` não existe e a folha ainda é a antiga.

- [ ] **Passo 3: A linha fina**

Crie `src/ui/exportar/linhaFina.ts`:

```ts
// CA-316: a linha fina no topo das páginas, da segunda em diante, pelas margens do @page.
// Chrome e Edge desenham; navegador que não conhece as margens do @page só não mostra (CB-77).
const textoCss = (texto: string) => `"${texto.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ')}"`

export function regraDaLinhaFina(esquerda: string, direita: string): string {
  return [
    '@media print {',
    `  @page { @top-left { content: ${textoCss(esquerda)}; font-size: 9pt; color: dimgray; } @top-right { content: ${textoCss(direita)}; font-size: 9pt; color: dimgray; } }`,
    '  @page :first { @top-left { content: none; } @top-right { content: none; } }',
    '}',
  ].join('\n')
}
```

- [ ] **Passo 4: A folha**

Troque o conteúdo de `src/ui/exportar/FolhaDieta.tsx` por:

```tsx
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { NOME_DA_BASE } from '@/domain/baseMetanutri.ts'
import { medidaEquivalente } from '@/domain/busca.ts'
import {
  assinaturaDaFolha,
  lembretesDoDia,
  linhaFinaDaFolha,
  OPCOES_IMPRESSAO_PADRAO,
  type AssinaturaDaFolha,
  type OpcoesImpressao,
} from '@/domain/folhaDieta.ts'
import { dataPorExtenso } from '@/domain/formatarData.ts'
import { listaDeCompras, missoesDoPlano } from '@/domain/missoes.ts'
import { listaDeRestricoes } from '@/domain/pacientes.ts'
import { lerPerfil } from '@/domain/perfil.ts'
import { ALIMENTOS, buscarAlimento } from '@/domain/tabelas.ts'
import { trocasDoPlano } from '@/domain/trocas.ts'
import type { Caso, ItemPlano, Plano } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { Logo } from '@ds/componentes/display/Logo.tsx'
import { armazenamentoLocal } from '../estado/armazenamentoLocal.ts'
import { regraDaLinhaFina } from './linhaFina.ts'

interface FolhaDietaProps {
  readonly caso: Caso
  readonly plano: Plano
  /** Restrições da ficha do paciente, para não sugerir troca proibida. */
  readonly restricoes?: string | undefined
  /** Quem assina o plano (spec ajustes-de-uso). Sem ela, valem os campos de estágio do plano. */
  readonly assinatura?: AssinaturaDoPlano | null | undefined
  /** Lista de compras e trocas, marcadas na janela de imprimir (CA-317). */
  readonly opcoes?: OpcoesImpressao | undefined
}

/** Colunas da quantidade e do alimento: a medida mais longa ("2 colheres de servir e meia · 150 g") cabe numa linha. */
const COLUNAS = 'grid grid-cols-[minmax(0,16.5rem)_minmax(0,1fr)] gap-4'

/** "6 colheres de sopa · 150 g"; sem medida caseira, só o peso (CA-309). */
function Quantidade({ item }: { readonly item: ItemPlano }) {
  const medida = medidaEquivalente(item.alimentoId, item.gramas)
  const gramas = `${formatarNumero(item.gramas, 0)} g`
  if (!medida) return <strong className="font-bold text-heading">{gramas}</strong>
  return (
    <span>
      <strong className="font-bold text-heading">{medida.texto}</strong>
      <span className="text-muted-foreground">{` · ${gramas}`}</span>
    </span>
  )
}

function Itens({ itens }: { readonly itens: readonly ItemPlano[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {itens.map((item) => (
        <li key={item.id} className={COLUNAS}>
          <Quantidade item={item} />
          <span>{buscarAlimento(item.alimentoId)?.descricao ?? 'Alimento removido'}</span>
        </li>
      ))}
    </ul>
  )
}

function QuemAssina({ assinatura }: { readonly assinatura: AssinaturaDaFolha }) {
  if (assinatura.tipo === 'vazia') return null
  if (assinatura.tipo === 'nutricionista') {
    return (
      <div className="text-right">
        <p className="text-base font-semibold text-heading">{assinatura.linha || 'Nutricionista'}</p>
        {assinatura.linha ? <p className="text-muted-foreground">Nutricionista</p> : null}
      </div>
    )
  }
  return (
    <div className="text-right">
      {assinatura.estagiario ? (
        <p>
          <span className="text-muted-foreground">Estagiário(a): </span>
          <span className="font-semibold text-heading">{assinatura.estagiario}</span>
        </p>
      ) : null}
      {assinatura.preceptor ? (
        <p>
          <span className="text-muted-foreground">Preceptor(a): </span>
          <span className="font-semibold text-heading">{assinatura.preceptor}</span>
        </p>
      ) : null}
    </div>
  )
}

function Assinaturas({ assinatura }: { readonly assinatura: AssinaturaDaFolha }) {
  const linhas =
    assinatura.tipo === 'nutricionista'
      ? [{ nome: assinatura.linha, papel: 'Nutricionista' }]
      : assinatura.tipo === 'estagio'
        ? [
            { nome: assinatura.estagiario, papel: 'Estagiário(a)' },
            { nome: assinatura.preceptor, papel: 'Preceptor(a)' },
          ]
        : [{ nome: '', papel: 'Assinatura' }]
  return (
    <div role="group" aria-label="Assinaturas" className="grid gap-8 sm:grid-cols-2">
      {linhas.map((l) => (
        <div key={l.papel} className={`flex flex-col items-center gap-1 pt-10 ${linhas.length === 1 ? 'sm:col-start-2' : ''}`}>
          <span aria-hidden="true" className="w-full border-b border-foreground" />
          {l.nome ? <span className="font-semibold text-heading">{l.nome}</span> : null}
          <span className="text-muted-foreground">{l.papel}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Folha da dieta para o paciente: só o que ele usa, em letra de ler sem óculos
 * (spec pdf-e-telas-limpas, US-B1). Na impressão, o navegador salva em PDF.
 */
export function FolhaDieta({ caso, plano, restricoes, assinatura = null, opcoes = OPCOES_IMPRESSAO_PADRAO }: FolhaDietaProps) {
  const quem = assinaturaDaFolha(assinatura, caso)
  const linhaFina = linhaFinaDaFolha(caso, quem)
  const lembretes = lembretesDoDia(missoesDoPlano(plano, { pesoKg: caso.pesoKg }))
  const compras = opcoes.listaDeCompras ? listaDeCompras(plano) : []
  const trocas = opcoes.trocas
    ? trocasDoPlano(plano, buscarAlimento, { alimentos: ALIMENTOS, porAlimento: 2, restricoes: listaDeRestricoes(restricoes ?? '') })
    : []
  const perfil = lerPerfil(armazenamentoLocal())
  const nome = caso.nome.trim() || 'Sem nome'
  const data = dataPorExtenso(caso.dataConsulta)
  const orientacoes = caso.orientacoes.trim()
  const receitas = caso.receitas.trim()

  return (
    <article className="folha-dieta mx-auto flex max-w-[820px] flex-col gap-6 bg-card p-10 text-sm leading-relaxed text-foreground">
      <style>{regraDaLinhaFina(linhaFina.esquerda, linhaFina.direita)}</style>

      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          {perfil.logo ? <img src={perfil.logo} alt="" className="h-12 w-auto self-start" /> : <Logo variante="claro" tamanho={24} />}
          <div>
            <h2 className="font-titulo text-3xl font-bold leading-tight text-heading">Plano alimentar</h2>
            <p className="text-base text-muted-foreground">{data ? `${nome} · ${data}` : nome}</p>
          </div>
        </div>
        <QuemAssina assinatura={quem} />
      </header>
      {/* A régua da marca: teal e, no fim, o laranja como grafismo (o laranja nunca carrega texto). */}
      <div aria-hidden="true" className="-mt-2 flex">
        <span className="flex-[86] border-t-[3px] border-primary" />
        <span className="flex-[14] border-t-[3px] border-laranja" />
      </div>

      <div className="flex flex-col">
        {plano.refeicoes.map((refeicao) => {
          const principal = refeicao.opcoes.principal.filter((i) => i.gramas > 0)
          const substitutos = (
            [
              ['Opção 2', refeicao.opcoes.substituto1.filter((i) => i.gramas > 0)],
              ['Opção 3', refeicao.opcoes.substituto2.filter((i) => i.gramas > 0)],
            ] as const
          ).filter(([, itens]) => itens.length > 0)
          const vazia = principal.length === 0 && substitutos.length === 0
          return (
            <section
              key={refeicao.id}
              aria-label={`${refeicao.horario} ${refeicao.nome}`}
              className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 break-inside-avoid border-b border-border py-4 last:border-0"
            >
              <span className="numeros text-xl font-bold leading-snug text-primary">{refeicao.horario}</span>
              <div className="flex min-w-0 flex-col gap-2">
                <h3 className="font-titulo text-xl font-bold leading-snug text-heading">{refeicao.nome}</h3>
                {principal.length > 0 ? <Itens itens={principal} /> : null}
                {substitutos.map(([rotulo, itens]) => (
                  <div key={rotulo} className="-ml-3 flex flex-col gap-1 rounded-lg bg-muted px-3 py-2">
                    <p className="font-bold text-muted-foreground">{rotulo}</p>
                    <Itens itens={itens} />
                  </div>
                ))}
                {vazia ? <p className="text-muted-foreground">Sem alimentos nesta refeição.</p> : null}
              </div>
            </section>
          )
        })}
      </div>

      <div className="fim-da-folha flex flex-col gap-5 break-inside-avoid">
        {lembretes.length > 0 ? (
          <section aria-label="No dia a dia" className="flex flex-col gap-2">
            <h3 className="font-titulo text-lg font-bold text-heading">No dia a dia</h3>
            <ul className="flex flex-col gap-1.5">
              {lembretes.map((m) => (
                <li key={m.id} className="flex items-start gap-2.5">
                  <span aria-hidden="true" className="mt-1 size-4 shrink-0 rounded border-[1.5px] border-foreground" />
                  <span>{m.texto}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {orientacoes ? (
          <section aria-label="Orientações" className="flex flex-col gap-1.5">
            <h3 className="font-titulo text-lg font-bold text-heading">Orientações</h3>
            <p className="whitespace-pre-wrap">{caso.orientacoes}</p>
          </section>
        ) : null}

        {receitas ? (
          <section aria-label="Receitas" className="flex flex-col gap-1.5">
            <h3 className="font-titulo text-lg font-bold text-heading">Receitas</h3>
            <p className="whitespace-pre-wrap">{caso.receitas}</p>
          </section>
        ) : null}

        <Assinaturas assinatura={quem} />

        <p className="text-xs text-muted-foreground">
          {`${caso.modo === 'rapido' ? 'Plano montado em prescrição rápida, sem avaliação antropométrica. ' : ''}A prescrição é responsabilidade do nutricionista. Composição dos alimentos: ${NOME_DA_BASE}.`}
        </p>
      </div>

      {compras.length > 0 || trocas.length > 0 ? (
        <div className="anexos-da-folha flex flex-col gap-6 break-before-page">
          {compras.length > 0 ? (
            <section aria-label="Lista de compras" className="flex flex-col gap-2">
              <h3 className="font-titulo text-lg font-bold text-heading">Lista de compras</h3>
              <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                {compras.map((c) => (
                  <li key={c.descricao} className="numeros border-b border-dotted border-border">{`${c.descricao} — ${formatarNumero(c.gramas, 0)} g`}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {trocas.length > 0 ? (
            <section aria-label="Trocas" className="flex flex-col gap-2">
              <h3 className="font-titulo text-lg font-bold text-heading">Trocas</h3>
              <p className="text-muted-foreground">Mesma energia e mesmo tipo de alimento. Pode trocar sem perguntar.</p>
              <ul aria-label="Trocas" className="flex flex-col">
                {trocas.map((g) => (
                  <li key={g.alimentoId} className={`${COLUNAS} break-inside-avoid border-t border-border py-2`}>
                    <strong className="font-bold text-heading">{g.descricao}</strong>
                    <span className="flex flex-col">
                      {g.trocas.map((t) => (
                        <span key={t.alimentoId} className="troca">{`${t.descricao} · ${t.medida ? t.medida.texto : `${formatarNumero(t.gramas, 0)} g`}`}</span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
```

- [ ] **Passo 5: Regras de impressão**

Em `src/ui/tema/globals.css`, dentro do bloco `@media print`, troque:

```css
  .folha-dieta {
    max-width: none;
    padding: 0;
    font-size: 11.5pt;
  }

  .folha-dieta section {
    break-inside: avoid;
  }
```

por:

```css
  /* As caixas cinza das opções e a régua da marca também vão para o papel. */
  .folha-dieta {
    max-width: none;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
```

(As quebras agora vêm das classes `break-inside-avoid` e `break-before-page` na própria folha.)

- [ ] **Passo 6: Ajustar o texto do CA-313 na SPEC**

Em `specs/pdf-e-telas-limpas/SPEC.md`, no CA-313, troque `nutricionista sai com "Nome · Nutricionista · CRN-6 12345" no topo e numa linha de assinatura só, no fim` por `nutricionista sai com o nome e o CRN da conta ("Ana Souza · CRN-6 12345") e a palavra "Nutricionista", no topo e numa linha de assinatura só, no fim`.

- [ ] **Passo 7: Rodar e ver passar**

Run: `npx vitest run src/ui/exportar`
Expected: os testes novos passam. **`MenuExportar.test.tsx` e `MenuExportarAssinatura.test.tsx` podem falhar ao compilar** se ainda passam `responsavel` para a folha pelo menu: isso é da Tarefa 4. Se `npm run check` falhar só por causa disso (tipo de `DialogoImprimir` passando `responsavel` para a `FolhaDieta`), faça o ajuste mínimo em `src/ui/exportar/DialogoImprimir.tsx` para compilar: troque `responsavel={responsavel}` na `<FolhaDieta …>` por nada (apague o atributo). A Tarefa 4 reescreve esse arquivo.

- [ ] **Passo 8: Portão, e2e e commit**

Run: `npm run check` e `npx playwright test`

```bash
printf '%s\n' 'feat(folha): dieta em PDF com letra maior e só o que o paciente usa' '' 'Medida caseira em destaque, substitutos como opções, lembretes do dia,' 'assinatura pela regra do Word, régua da marca, linha fina nas páginas' 'seguintes e lista de compras e trocas só quando marcadas (CA-308 a' 'CA-316, CA-318, CA-319, CB-71).' '' 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>' > ../_msg.txt
git add src/ui/exportar src/ui/tema/globals.css specs/pdf-e-telas-limpas/SPEC.md
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 4: Janela de imprimir com lista de compras e trocas

Cobre CA-317, CA-320 na tela, CB-72, e a troca do `responsavel` pela assinatura do plano (Decisão 2).

**Arquivos:**
- Alterar: `src/ui/exportar/DialogoImprimir.tsx` (reescrita)
- Criar: `src/ui/exportar/DialogoImprimir.test.tsx`
- Alterar: `src/ui/exportar/MenuExportar.tsx`, `src/ui/exportar/MenuExportar.test.tsx` (se citar `responsavel`)
- Alterar: `src/App.tsx`

**Interfaces:**
- Consome: Tarefa 2 (`lerOpcoesImpressao`, `gravarOpcoesImpressao`, `OpcoesImpressao`); Tarefa 3 (`FolhaDieta` com `assinatura` e `opcoes`); `Switch` e `Label` da biblioteca.
- Produz: `DialogoImprimir({ aberto, caso, plano, restricoes?, assinatura?, aoFechar })`; `MenuExportar` **sem** a prop `responsavel`.

- [ ] **Passo 1: Escrever os testes que falham**

Crie `src/ui/exportar/DialogoImprimir.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { criarCasoVazio } from '@/domain/caso.ts'
import { adicionarItem, criarPlanoPadrao } from '@/domain/plano.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
import { DialogoImprimir } from './DialogoImprimir.tsx'
import { MenuExportar } from './MenuExportar.tsx'

let n = 0
const ids = () => `id${++n}`
const caso: Caso = { ...criarCasoVazio('c1'), nome: 'Maria, 28 anos', sexo: 'F', idadeAnos: 28, pesoKg: 60, estaturaCm: 165 }
const ANA: AssinaturaDoPlano = { situacao: 'nutricionista', linhaNutricionista: 'Ana Souza · CRN-6 12345', origem: 'conta', nome: 'Ana Souza', responsavelTecnico: '' }

function plano(): Plano {
  const p = criarPlanoPadrao(ids)
  const almoco = p.refeicoes[2]
  if (!almoco) throw new Error('sem almoço')
  return adicionarItem(p, almoco.id, 'principal', { alimentoId: 3, gramas: 150 }, ids)
}

const abrir = () => render(<DialogoImprimir aberto caso={caso} plano={plano()} assinatura={ANA} aoFechar={vi.fn()} />)
const janela = () => within(screen.getByRole('dialog', { name: 'Dieta para imprimir' }))

beforeEach(() => localStorage.clear())

describe('Janela de imprimir (CA-317, CA-320)', () => {
  it('CA-317: lista de compras e trocas começam desmarcadas e mudam a prévia na hora', async () => {
    abrir()
    const usuario = userEvent.setup()
    const compras = janela().getByRole('switch', { name: 'Lista de compras' })
    const trocas = janela().getByRole('switch', { name: 'Trocas' })
    expect(compras).toHaveAttribute('aria-checked', 'false')
    expect(trocas).toHaveAttribute('aria-checked', 'false')
    expect(janela().queryByRole('heading', { name: 'Lista de compras' })).not.toBeInTheDocument()

    await usuario.click(compras)
    expect(janela().getByRole('heading', { name: 'Lista de compras' })).toBeInTheDocument()
    await usuario.click(trocas)
    expect(janela().getByRole('heading', { name: 'Trocas' })).toBeInTheDocument()
  })

  it('CA-320: o que foi marcado volta marcado na próxima vez', async () => {
    const { unmount } = abrir()
    await userEvent.setup().click(janela().getByRole('switch', { name: 'Trocas' }))
    unmount()

    abrir()
    expect(janela().getByRole('switch', { name: 'Trocas' })).toHaveAttribute('aria-checked', 'true')
    expect(janela().getByRole('switch', { name: 'Lista de compras' })).toHaveAttribute('aria-checked', 'false')
  })

  it('a folha sai com quem assina o plano', () => {
    abrir()
    expect(janela().getAllByText('Ana Souza · CRN-6 12345').length).toBeGreaterThan(0)
  })

  it('o menu Exportar leva a assinatura até a folha de imprimir', async () => {
    render(<MenuExportar caso={caso} plano={plano()} assinatura={ANA} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))
    await usuario.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: /Dieta para imprimir/ }))
    expect(janela().getAllByText('Ana Souza · CRN-6 12345').length).toBeGreaterThan(0)
    expect(janela().getByRole('button', { name: /Imprimir ou salvar em PDF/ })).toBeInTheDocument()
  })
})
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/exportar/DialogoImprimir.test.tsx`
Expected: FAIL — a janela não tem as opções e não aceita `assinatura`.

- [ ] **Passo 3: A janela**

Troque o conteúdo de `src/ui/exportar/DialogoImprimir.tsx` por:

```tsx
import { Printer } from 'lucide-react'
import { useId, useState } from 'react'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { gravarOpcoesImpressao, lerOpcoesImpressao, type OpcoesImpressao } from '@/domain/folhaDieta.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Switch } from '@ds/componentes/forms/switch.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'
import { armazenamentoLocal } from '../estado/armazenamentoLocal.ts'
import { FolhaDieta } from './FolhaDieta.tsx'

interface DialogoImprimirProps {
  readonly aberto: boolean
  readonly caso: Caso
  readonly plano: Plano
  /** Restrições da ficha do paciente; a lista de trocas as respeita. */
  readonly restricoes?: string | undefined
  /** Quem assina o plano (spec ajustes-de-uso). */
  readonly assinatura?: AssinaturaDoPlano | null | undefined
  readonly aoFechar: () => void
}

function Opcao({ titulo, texto, marcado, aoMudar }: { readonly titulo: string; readonly texto: string; readonly marcado: boolean; readonly aoMudar: (v: boolean) => void }) {
  const id = useId()
  return (
    <div className="flex items-start gap-3 rounded-lg bg-surfacerow px-4 py-3">
      <Switch id={id} checked={marcado} onCheckedChange={aoMudar} aria-describedby={`${id}-texto`} className="mt-0.5" />
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={id}>{titulo}</Label>
        <p id={`${id}-texto`} className="text-xs text-muted-foreground">
          {texto}
        </p>
      </div>
    </div>
  )
}

/**
 * Prévia da dieta antes de imprimir, com o que mais vai junto (CA-317).
 * Na caixa de impressão do navegador, "Salvar como PDF" gera o arquivo.
 */
export function DialogoImprimir({ aberto, caso, plano, restricoes, assinatura, aoFechar }: DialogoImprimirProps) {
  const [opcoes, setOpcoes] = useState<OpcoesImpressao>(() => lerOpcoesImpressao(armazenamentoLocal()))

  const mudar = (mudanca: Partial<OpcoesImpressao>) => {
    const novas = { ...opcoes, ...mudanca }
    setOpcoes(novas)
    // CA-320 e CB-72: sem armazenamento, vale só para esta impressão.
    gravarOpcoesImpressao(armazenamentoLocal(), novas)
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto print:max-h-none print:overflow-visible print:border-0 print:p-0 print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Dieta para imprimir</DialogTitle>
          <DialogDescription>As refeições, os lembretes, as orientações e a assinatura sempre vão. Marque o que mais quer entregar.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 sm:grid-cols-2 print:hidden">
          <Opcao titulo="Lista de compras" texto="Os alimentos do dia com as quantidades." marcado={opcoes.listaDeCompras} aoMudar={(v) => mudar({ listaDeCompras: v })} />
          <Opcao titulo="Trocas" texto="Até 2 opções para cada alimento do plano." marcado={opcoes.trocas} aoMudar={(v) => mudar({ trocas: v })} />
        </div>

        <div className="area-impressao border border-border print:border-0">
          <FolhaDieta caso={caso} plano={plano} restricoes={restricoes} assinatura={assinatura} opcoes={opcoes} />
        </div>

        <DialogFooter className="print:hidden">
          <Button variant="ghost" onClick={aoFechar}>
            Fechar
          </Button>
          <Button onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Imprimir ou salvar em PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Passo 4: O menu e o App**

Em `src/ui/exportar/MenuExportar.tsx`:
1. Apague da interface a prop `responsavel` e seu comentário.
2. Troque a assinatura do componente por `export function MenuExportar({ caso, plano, bloqueio, assinatura }: MenuExportarProps) {`.
3. Troque `<DialogoImprimir aberto={imprimindo} caso={caso} plano={plano} restricoes={restricoes} responsavel={responsavel} aoFechar={() => setImprimindo(false)} />` por:

```tsx
      <DialogoImprimir aberto={imprimindo} caso={caso} plano={plano} restricoes={restricoes} assinatura={assinatura} aoFechar={() => setImprimindo(false)} />
```

Em `src/App.tsx`:
1. Apague as duas linhas:

```ts
  // CA-287: a folha da dieta sai com o nome e o CRN da conta de nutricionista.
  const responsavel = conta.disponivel ? quemAssina.linhaNutricionista : null
```

2. No `<MenuExportar …>`, apague `responsavel={responsavel}`.

Procure outros usos: `grep -rn "responsavel=" src --include=*.tsx`. Em teste que passe `responsavel` para `MenuExportar` ou `FolhaDieta`, troque por `assinatura={…}` com uma `AssinaturaDoPlano` de nutricionista (como a `ANA` do teste acima) e ajuste a expectativa para o texto `Ana Souza · CRN-6 12345`.

- [ ] **Passo 5: Rodar e ver passar**

Run: `npx vitest run src/ui/exportar src/App.test.tsx src/AppConta.test.tsx`
Expected: PASS.

- [ ] **Passo 6: Portão, e2e e commit**

Run: `npm run check` e `npx playwright test`

```bash
printf '%s\n' 'feat(folha): janela de imprimir com lista de compras e trocas opcionais' '' 'As duas opções começam desmarcadas, mudam a prévia na hora e ficam' 'lembradas no aparelho; a folha passa a usar a assinatura do plano' '(CA-317, CA-320, CB-72).' '' 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>' > ../_msg.txt
git add src/ui/exportar src/App.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---
### Tarefa 5: Base MetaNutri nas telas e a página Fontes da base

Cobre CA-321 (exceto a Tabela de alimentos, que é da Tarefa 11), CA-322 e CA-323.

**Arquivos:**
- Criar: `src/ui/publico/TelaFontes.tsx`, `src/ui/publico/TelaFontes.test.tsx`
- Alterar: `src/ui/navegacao.ts`, `src/ui/navegacao.test.ts`
- Alterar: `src/App.tsx`, `src/App.test.tsx`
- Alterar: `src/ui/publico/MolduraPublica.tsx`, `src/ui/publico/MolduraPublica.test.tsx`
- Alterar: `src/ui/publico/TelaInicio.tsx`, `src/ui/publico/TelaInicio.test.tsx`, `src/domain/vitrine.ts`
- Alterar: `src/ui/ajuda/TelaAjuda.tsx`, `src/ui/ajuda/TelaAjuda.test.tsx`
- Alterar: `src/ui/adequacao/TelaAdequacao.tsx`, `src/ui/adequacao/TelaAdequacao.test.tsx`

**Interfaces:**
- Consome: Tarefa 1 (`NOME_DA_BASE`, `FONTES_DA_BASE`, `resumoDaBase`).
- Produz:
  - Rota pública e livre `{ tela: 'fontes' }`, endereço `#/fontes`.
  - `DestinoPublico` ganha `'fontes'`.
  - `TelaFontes()` (sem props).
  - `TelaAjuda.aoIrPara` aceita `'fontes'`.
  - `TelaAdequacao` ganha `aoAbrirFontes?: (() => void) | undefined`. A Tarefa 10 mantém essa prop.

- [ ] **Passo 1: Escrever os testes que falham**

Em `src/ui/navegacao.test.ts`, acrescente no fim (os nomes `lerRota`, `escreverRota`, `ehRotaLivre` e `ehTelaPublica` já são exportados pelo módulo; acrescente os que faltarem no import):

```ts
describe('Fontes da base (CA-322)', () => {
  it('#/fontes é uma página pública que abre sem conta', () => {
    expect(lerRota('#/fontes')).toEqual({ tela: 'fontes' })
    expect(escreverRota({ tela: 'fontes' })).toBe('#/fontes')
    expect(ehRotaLivre({ tela: 'fontes' })).toBe(true)
    expect(ehTelaPublica({ tela: 'fontes' })).toBe(true)
  })
})
```

Crie `src/ui/publico/TelaFontes.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { TelaFontes } from './TelaFontes.tsx'

describe('Fontes da base (CA-322)', () => {
  it('diz o que é a base e cita as três fontes com link', () => {
    render(<TelaFontes />)
    expect(screen.getByRole('heading', { level: 1, name: 'Fontes da base' })).toBeInTheDocument()
    expect(screen.getByText(/A Base MetaNutri reúne 597 alimentos/)).toBeInTheDocument()
    expect(screen.getByText(/medidas caseiras de 287 deles/)).toBeInTheDocument()
    for (const assunto of ['Composição dos alimentos', 'Medidas caseiras', 'Produtos de rótulo']) {
      expect(screen.getByRole('heading', { name: assunto })).toBeInTheDocument()
    }
    expect(screen.getByText(/Tabela Brasileira de Composição de Alimentos \(TACO\), 4ª edição revisada e ampliada/)).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(3)
    for (const link of links) expect(link).toHaveAttribute('href', expect.stringMatching(/^https:\/\//))
  })
})
```

Em `src/ui/publico/MolduraPublica.test.tsx`, dentro do teste que já olha o rodapé (o que verifica `'Fontes dos dados'`), acrescente antes do fim do teste:

```tsx
    expect(rodape.queryByText(/TACO|POF|IBGE|NEPA|UNICAMP/)).not.toBeInTheDocument()
    await userEvent.setup().click(rodape.getByRole('button', { name: 'Base MetaNutri' }))
    expect(aoIrPara).toHaveBeenCalledWith('fontes')
```

Em `src/ui/publico/TelaInicio.test.tsx`, troque o título do teste `'CA-114: só números verdadeiros, calculados do sistema e da TACO'` por `'CA-114: só números verdadeiros, calculados do sistema e da base'` e acrescente no fim do `describe('TelaInicio', …)`:

```tsx
  it('CA-321: a área pública fala em Base MetaNutri, não nas tabelas de origem', () => {
    render(<TelaInicio aoComecar={vi.fn()} aoVerPrecos={vi.fn()} />)
    expect(screen.getByText('da Base MetaNutri')).toBeInTheDocument()
    expect(screen.getByText('dos alimentos da base')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/TACO|POF|IBGE/)
  })
```

Em `src/ui/ajuda/TelaAjuda.test.tsx`, troque o teste `'lista as fontes com link'` por:

```tsx
  it('lista as fontes com link, e a base de alimentos leva para Fontes da base', async () => {
    const aoIrPara = vi.fn()
    render(<TelaAjuda aoIrPara={aoIrPara} />)
    expect(screen.queryByText(/TACO/)).not.toBeInTheDocument()
    expect(screen.getByText('Base MetaNutri')).toBeInTheDocument()
    expect(screen.getByText(/Open Food Facts/)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Abrir/ }).length).toBeGreaterThan(5)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Fontes da base' }))
    expect(aoIrPara).toHaveBeenCalledWith('fontes')
  })
```

Em `src/ui/adequacao/TelaAdequacao.test.tsx`, no teste `'CA-25 e CA-33: …'`, troque `expect(screen.getByText(/^Composição: /)).toBeInTheDocument()` por:

```tsx
    expect(screen.getByText(/^Composição: Base MetaNutri/)).toBeInTheDocument()
    expect(screen.queryByText(/TACO/)).not.toBeInTheDocument()
```

Em `src/App.test.tsx`, acrescente no `describe('App: estrutura', …)`:

```tsx
  it('CA-322: #/fontes abre a página de fontes, sem conta', () => {
    window.location.hash = '#/fontes'
    renderizar()
    expect(screen.getByRole('heading', { level: 1, name: 'Fontes da base' })).toBeInTheDocument()
  })
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/navegacao.test.ts src/ui/publico src/ui/ajuda src/ui/adequacao src/App.test.tsx`
Expected: FAIL — rota, página e textos novos não existem.

- [ ] **Passo 3: A rota**

Em `src/ui/navegacao.ts`:
1. Em `TELAS_LIVRES`, acrescente `'fontes'` depois de `'privacidade'`.
2. Na união `Rota`, depois de `| { readonly tela: 'privacidade' }`, acrescente `| { readonly tela: 'fontes' }`.
3. Em `lerRota`, depois da linha do `privacidade`, acrescente `if (tela === 'fontes') return { tela: 'fontes' }`.
4. Em `escreverRota`, depois do `case 'privacidade':`, acrescente:

```ts
    case 'fontes':
      return '#/fontes'
```

- [ ] **Passo 4: A página**

Crie `src/ui/publico/TelaFontes.tsx`:

```tsx
import { ExternalLink } from 'lucide-react'
import { FONTES_DA_BASE, NOME_DA_BASE, resumoDaBase } from '@/domain/baseMetanutri.ts'

/** Página pública que cita as fontes da Base MetaNutri, como manda a licença da TACO (CA-322). */
export function TelaFontes() {
  const resumo = resumoDaBase()
  return (
    <article className="mx-auto flex max-w-[72ch] flex-col gap-3 px-4 py-12 text-sm leading-relaxed text-foreground sm:px-8">
      <h1 className="text-4xl font-bold">Fontes da base</h1>
      <p className="text-base">
        {`A ${NOME_DA_BASE} reúne ${resumo.alimentos} alimentos, com os ${resumo.nutrientes} nutrientes que o MetaNutri confere (energia, macronutrientes, fibra, vitaminas e minerais), e as medidas caseiras de ${resumo.comMedidaCaseira} deles. O MetaNutri organiza e confere esses dados a partir destas fontes públicas.`}
      </p>
      <ul className="mt-4 flex flex-col">
        {FONTES_DA_BASE.map((fonte) => (
          <li key={fonte.assunto} className="grid gap-2 border-t border-border py-5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
            <h2 className="text-base font-semibold text-heading">{fonte.assunto}</h2>
            <div className="flex flex-col gap-1.5">
              <p>{fonte.citacao}</p>
              <p className="text-muted-foreground">{fonte.uso}</p>
              <a
                href={fonte.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 w-fit items-center gap-1 rounded-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {fonte.rotuloLink}
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </article>
  )
}
```

Em `src/App.tsx`:
1. Acrescente `import { TelaFontes } from './ui/publico/TelaFontes.tsx'` e `import { NOME_DA_BASE } from './domain/baseMetanutri.ts'`.
2. Troque o bloco dos documentos públicos:

```tsx
  if (rota.tela === 'termos' || rota.tela === 'privacidade') {
    return (
      <MolduraPublica atual={rota.tela} temSessao={sessao !== null} aoIrPara={irPara}>
        {rota.tela === 'termos' ? <TelaTermos /> : <TelaPrivacidade />}
      </MolduraPublica>
    )
  }
```

por:

```tsx
  if (rota.tela === 'termos' || rota.tela === 'privacidade' || rota.tela === 'fontes') {
    return (
      <MolduraPublica atual={rota.tela} temSessao={sessao !== null} aoIrPara={irPara}>
        {rota.tela === 'termos' ? <TelaTermos /> : rota.tela === 'privacidade' ? <TelaPrivacidade /> : <TelaFontes />}
      </MolduraPublica>
    )
  }
```

3. Na Tabela de alimentos, troque `subtitulo="TACO 4ª edição"` por `subtitulo={NOME_DA_BASE}`.
4. Na `<TelaAdequacao …>`, acrescente `aoAbrirFontes={() => navegar({ tela: 'fontes' })}`.

Se o TypeScript reclamar que algum `switch` sobre `rota.tela` ou `DestinoPublico` não trata `'fontes'`, trate do mesmo jeito que `'termos'`.

- [ ] **Passo 5: Rodapé, área pública e Ajuda**

Em `src/ui/publico/MolduraPublica.tsx`:
1. Troque o tipo por `export type DestinoPublico = 'inicio' | 'precos' | 'entrar' | 'criar-conta' | 'painel' | 'termos' | 'privacidade' | 'fontes'`.
2. Acrescente `import { NOME_DA_BASE } from '@/domain/baseMetanutri.ts'`.
3. No rodapé, troque os dois itens:

```tsx
              <li>NEPA/UNICAMP. TACO, 4ª ed., 2011</li>
              <li>IBGE. POF 2008-2009</li>
```

por:

```tsx
              <li>
                <button type="button" onClick={() => aoIrPara('fontes')} className={LINK_RODAPE}>
                  {NOME_DA_BASE}
                </button>
              </li>
```

Em `src/ui/publico/TelaInicio.tsx`, acrescente `import { NOME_DA_BASE } from '@/domain/baseMetanutri.ts'` e:
1. Troque `apoio="da tabela brasileira (TACO)"` por `apoio={`da ${NOME_DA_BASE}`}`.
2. Troque `rotulo="dos alimentos da TACO"` por `rotulo="dos alimentos da base"`.

Em `src/domain/vitrine.ts`, troque `detalhe: 'não existe na TACO'` por `detalhe: 'não existe na base'`.

Em `src/ui/ajuda/TelaAjuda.tsx`:
1. Acrescente `import { NOME_DA_BASE } from '@/domain/baseMetanutri.ts'`.
2. Troque o tipo da prop por `readonly aoIrPara: (tela: 'painel' | 'pacientes' | 'casos' | 'produtos' | 'config' | 'fontes') => void`.
3. Apague de `REFERENCIAS` as duas linhas `Composição dos alimentos` e `Medidas caseiras`.
4. Logo antes do `<ul>` da lista de fontes (dentro do cartão "Fontes dos dados"), acrescente:

```tsx
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-heading">Composição e medidas caseiras dos alimentos</p>
            <p className="text-xs text-muted-foreground">{NOME_DA_BASE}</p>
          </div>
          <button
            type="button"
            onClick={() => aoIrPara('fontes')}
            className="inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Fontes da base
          </button>
        </div>
```

Em `src/ui/adequacao/TelaAdequacao.tsx`:
1. Troque `import { ALIMENTOS, buscarAlimento, FONTE_ALIMENTOS } from '@/domain/tabelas.ts'` por `import { ALIMENTOS, buscarAlimento } from '@/domain/tabelas.ts'` e acrescente `import { NOME_DA_BASE } from '@/domain/baseMetanutri.ts'`.
2. Na interface, acrescente `readonly aoAbrirFontes?: (() => void) | undefined` e passe `aoAbrirFontes` na desestruturação.
3. Troque `<p className="mt-2">{`Composição: ${FONTE_ALIMENTOS.nome}`}</p>` por:

```tsx
            <p className="mt-2">
              {`Composição: ${NOME_DA_BASE}`}
              {aoAbrirFontes ? (
                <>
                  {' · '}
                  <button type="button" onClick={aoAbrirFontes} className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    Fontes da base
                  </button>
                </>
              ) : null}
            </p>
```

- [ ] **Passo 6: Rodar e ver passar**

Run: `npx vitest run src/ui/navegacao.test.ts src/ui/publico src/ui/ajuda src/ui/adequacao src/App.test.tsx src/domain`
Expected: PASS. Confira também que nada mais da interface mostra os nomes de origem: `grep -rn "TACO\|POF/IBGE\|NEPA" src/ui src/App.tsx --include=*.tsx | grep -v test` só pode mostrar comentários e `src/ui/alimentos/TelaAlimentos.tsx` (Tarefa 11).

- [ ] **Passo 7: Portão, e2e e commit**

Run: `npm run check` e `npx playwright test`

```bash
printf '%s\n' 'feat(base): Base MetaNutri nas telas e a página Fontes da base' '' 'A base aparece com o nome do MetaNutri na área pública, na Ajuda e na' 'adequação, e uma página pública cita a TACO, o IBGE e o Open Food Facts' '(CA-321, CA-322, CA-323).' '' 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>' > ../_msg.txt
git add src/ui/publico src/ui/navegacao.ts src/ui/navegacao.test.ts src/App.tsx src/App.test.tsx src/ui/ajuda src/ui/adequacao src/domain/vitrine.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 6: Painel mais limpo

Cobre CA-324 a CA-328.

**Arquivos:**
- Alterar: `src/ui/painel/TelaPainel.tsx` (reescrita), `src/ui/painel/TelaPainel.test.tsx`
- Apagar: `src/ui/painel/GraficoAtividade.tsx`
- Alterar: `src/App.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consome: `atividadePorDia`, `resumirAtividade`, `useCasos`, `usePacientes`, `formatarAlteracao`, `EscolherModo`, `LinhaLista`.
- Produz: `TelaPainel({ aoAbrirPlano, aoIrPara, aoVerExemplo, aviso? })`, **sem** `aoNovoPlano`. O botão "Novo plano" do Painel passa para o cabeçalho, pelo `acoes` da `Estrutura`, montado no `App`.

- [ ] **Passo 1: Escrever os testes que falham**

Em `src/ui/painel/TelaPainel.test.tsx`:
1. Na função `montar`, apague `const aoNovoPlano = vi.fn()`, a prop `aoNovoPlano={aoNovoPlano}` e `aoNovoPlano` do `return`.
2. Troque os testes `'sem dados, mostra o caminho para começar'`, `'conta pacientes e planos, e abre o plano recente'` e `'o botão de novo plano pergunta o modo'` por:

```tsx
  it('CA-327: sem plano, "Onde você parou" diz que não há nada e oferece o exemplo', () => {
    montar(false)
    expect(screen.getByText('Nenhum plano ainda.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver um plano de exemplo' })).toBeInTheDocument()
    expect(screen.getByText('Nenhum paciente cadastrado')).toBeInTheDocument()
  })

  it('CA-325: três números numa faixa, contados nos últimos 14 dias', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-20T12:00:00.000Z'))
    try {
      montar(true)
      const faixa = within(screen.getByRole('region', { name: 'Seus números' }))
      expect(faixa.getByText('planos')).toBeInTheDocument()
      expect(faixa.getByText('paciente')).toBeInTheDocument()
      expect(faixa.getByText('dia')).toBeInTheDocument()
      expect(faixa.getAllByText('2')).toHaveLength(1)
      expect(faixa.getAllByText('1')).toHaveLength(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('CA-326: "Onde você parou" abre o plano recente', async () => {
    const { aoAbrirPlano, usuario } = montar(true)
    const recentes = within(screen.getByRole('list', { name: 'Planos recentes' }))
    expect(recentes.getByText('Maria, retorno')).toBeInTheDocument()
    expect(recentes.getByText(/Prescrição rápida/)).toBeInTheDocument()
    await usuario.click(recentes.getAllByRole('button', { name: 'Abrir' })[0] as HTMLElement)
    expect(aoAbrirPlano).toHaveBeenCalled()
  })

  it('CA-328: sem os cartões grandes, o gráfico e os atalhos que repetem o menu', () => {
    montar(true)
    expect(screen.queryByRole('button', { name: 'Pacientes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cadastrar produto' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Últimos 14 dias/)).not.toBeInTheDocument()
    expect(screen.queryByText('Começar agora')).not.toBeInTheDocument()
  })
```

O teste `'aponta plano sem nome e plano sem paciente'` continua como está. Para "Tudo em dia." com lista vazia, acrescente também:

```tsx
  it('CA-326: com plano nomeado, vinculado e paciente cadastrado, aparece "Tudo em dia."', () => {
    const armazenamento = new MemoriaFalsa()
    const casos = criarRepositorio(armazenamento, { agora: relogio() })
    const pacientes = criarRepositorioPacientes(armazenamento, { agora: relogio(), gerarId: () => 'p1' })
    const paciente = pacientes.criar('Maria')
    const plano = casos.criar('Maria, retorno')
    casos.salvar({ ...plano, caso: { ...plano.caso, pacienteId: paciente.id } })
    render(
      <ProvedorCasos repositorio={casos}>
        <ProvedorPacientes repositorio={pacientes}>
          <TelaPainel aoAbrirPlano={vi.fn()} aoIrPara={vi.fn()} aoVerExemplo={vi.fn()} />
        </ProvedorPacientes>
      </ProvedorCasos>,
    )
    expect(screen.getByText('Tudo em dia.')).toBeInTheDocument()
  })
```

(`pacientes.criar` devolve o `Paciente`, com o `id` vindo do `gerarId` do teste; o `pacienteId` do plano mora em `plano.caso.pacienteId`.)

Em `src/App.test.tsx`:
1. Troque `expect(screen.getByText('Nenhum plano ainda. Comece pelo botão acima.')).toBeInTheDocument()` por `expect(screen.getByText('Nenhum plano ainda.')).toBeInTheDocument()`.
2. Acrescente no `describe('App: estrutura', …)`:

```tsx
  it('CA-324: o botão Novo plano do Painel fica no topo e pergunta o modo', async () => {
    renderizar()
    const usuario = userEvent.setup()
    const doTopo = screen.getAllByRole('button', { name: 'Novo plano' }).find((b) => !b.closest('nav'))
    expect(doTopo).toBeDefined()
    await usuario.click(doTopo as HTMLElement)
    await usuario.click(screen.getByRole('menuitem', { name: /Prescrição rápida/ }))
    expect(window.location.hash).toMatch(/^#\/caso\/.+\/caso$/)
  })
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/painel src/App.test.tsx`
Expected: FAIL.

- [ ] **Passo 3: O Painel**

Troque o conteúdo de `src/ui/painel/TelaPainel.tsx` por:

```tsx
import { ClipboardList, Sparkles, TriangleAlert } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { atividadePorDia, resumirAtividade } from '@/domain/atividade.ts'
import { formatarAlteracao } from '../casos/formatarAlteracao.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { LinhaLista } from '@ds/componentes/display/LinhaLista.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { useCasos } from '../estado/contextoCasos.ts'
import { usePacientes } from '../estado/contextoPacientes.ts'

interface TelaPainelProps {
  readonly aoAbrirPlano: (casoId: string) => void
  readonly aoIrPara: (tela: 'pacientes' | 'casos' | 'produtos') => void
  /** Cria e abre um plano de demonstração; só aparece enquanto não há plano nenhum. */
  readonly aoVerExemplo: () => void
  /** Aviso da conta no topo (estudante ou CRN), montado pelo App. */
  readonly aviso?: ReactNode
}

const DIAS = 14

/** Primeira tela do dia: onde você parou e o que está pendente (spec pdf-e-telas-limpas, US-B3). */
export function TelaPainel({ aoAbrirPlano, aoIrPara, aoVerExemplo, aviso }: TelaPainelProps) {
  const { casos, avisoArmazenamento } = useCasos()
  const { pacientes } = usePacientes()

  const recentes = useMemo(() => casos.slice(0, 5), [casos])
  const semPaciente = useMemo(() => casos.filter((c) => c.pacienteId === null).length, [casos])
  const semNome = useMemo(() => casos.filter((c) => c.nome.trim() === '').length, [casos])
  const atividade = useMemo(() => resumirAtividade(atividadePorDia(casos, DIAS, new Date())), [casos])

  const pendencias = [
    semNome > 0 ? { texto: `${semNome} ${semNome === 1 ? 'plano sem nome' : 'planos sem nome'}`, acao: 'Ver', ir: () => aoIrPara('casos') } : null,
    semPaciente > 0
      ? { texto: `${semPaciente} ${semPaciente === 1 ? 'plano sem paciente vinculado' : 'planos sem paciente vinculado'}`, acao: 'Ver', ir: () => aoIrPara('casos') }
      : null,
    pacientes.length === 0 ? { texto: 'Nenhum paciente cadastrado', acao: 'Cadastrar', ir: () => aoIrPara('pacientes') } : null,
  ].filter((p): p is { texto: string; acao: string; ir: () => void } => p !== null)

  const numeros = [
    { valor: atividade.total, rotulo: atividade.total === 1 ? 'plano' : 'planos', apoio: `mexidos em ${DIAS} dias` },
    { valor: pacientes.length, rotulo: pacientes.length === 1 ? 'paciente' : 'pacientes', apoio: 'com ficha' },
    { valor: atividade.diasAtivos, rotulo: atividade.diasAtivos === 1 ? 'dia' : 'dias', apoio: `trabalhados em ${DIAS}` },
  ]

  return (
    <div className="flex flex-col gap-6">
      {aviso}

      <section aria-label="Seus números">
        <Card className="grid grid-cols-3 gap-0 px-0 py-4 sm:py-5">
          {numeros.map((n, i) => (
            <div key={n.apoio} className={`flex min-w-0 flex-col gap-0.5 px-3 sm:px-6 ${i > 0 ? 'border-l border-border' : ''}`}>
              <span className="numeros font-titulo text-2xl font-bold leading-tight text-heading sm:text-3xl">{n.valor}</span>
              <span className="text-sm font-semibold text-heading">{n.rotulo}</span>
              <span className="hidden text-xs text-muted-foreground sm:block">{n.apoio}</span>
            </div>
          ))}
        </Card>
      </section>

      {avisoArmazenamento ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <p>{avisoArmazenamento}</p>
        </Alert>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="gap-4">
          <CardTitle>Onde você parou</CardTitle>
          {recentes.length === 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="min-w-0 flex-1 text-sm text-muted-foreground">Nenhum plano ainda.</p>
              <Button variant="lightprimary" size="sm" onClick={aoVerExemplo}>
                <Sparkles aria-hidden="true" />
                Ver um plano de exemplo
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5" aria-label="Planos recentes">
              {recentes.map((c) => (
                <li key={c.id}>
                  <LinhaLista
                    inicio={<ClipboardList aria-hidden="true" />}
                    titulo={c.nome.trim() || 'Plano sem nome'}
                    detalhe={`${c.modo === 'rapido' ? 'Prescrição rápida' : 'Atendimento completo'} · ${formatarAlteracao(c.atualizadoEm).toLowerCase()}`}
                    fim={
                      <Button size="sm" variant="ghost" onClick={() => aoAbrirPlano(c.id)}>
                        Abrir
                      </Button>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="gap-4">
          <CardTitle>Precisa de atenção</CardTitle>
          {pendencias.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tudo em dia.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {pendencias.map((p) => (
                <li key={p.texto}>
                  <LinhaLista
                    titulo={p.texto}
                    fim={
                      <Button size="sm" variant="ghost" onClick={p.ir}>
                        {p.acao}
                      </Button>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
```

Apague `src/ui/painel/GraficoAtividade.tsx` (`git rm`). Confira que nada mais o importa: `grep -rn GraficoAtividade src`.

Em `src/App.tsx`, troque o bloco do Painel:

```tsx
      <Estrutura {...base} titulo="Painel" subtitulo="Seu dia no MetaNutri">
        <TelaPainel
          aoNovoPlano={(modo) => novoCaso(modo)}
```

por:

```tsx
      <Estrutura
        {...base}
        titulo="Painel"
        acoes={
          <EscolherModo
            aoEscolher={(modo) => novoCaso(modo)}
            gatilho={
              <Button size="sm">
                <Plus aria-hidden="true" />
                Novo plano
              </Button>
            }
          />
        }
      >
        <TelaPainel
```

(`EscolherModo`, `Button` e `Plus` já são importados no `App`; se algum não for, importe do mesmo lugar dos outros usos.)

- [ ] **Passo 4: Rodar e ver passar**

Run: `npx vitest run src/ui/painel src/App.test.tsx src/AppConta.test.tsx`
Expected: PASS. Se algum teste de `AppConta.test.tsx` procurar textos do Painel antigo ("Começar agora", "Nenhum plano ainda. Comece pelo botão acima."), troque pelo texto novo.

- [ ] **Passo 5: Portão, e2e e commit**

Run: `npm run check` e `npx playwright test`

```bash
printf '%s\n' 'feat(painel): painel com três números, onde você parou e pendências' '' 'Saem os quatro cartões grandes, o gráfico de 14 dias e os atalhos que' 'repetem o menu; o Novo plano sobe para o cabeçalho (CA-324 a CA-328).' '' 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>' > ../_msg.txt
git add -A src/ui/painel src/App.tsx src/App.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 7: Etapa 1 mais limpa e o `Recolhivel`

Cobre CA-329 a CA-333 (a parte da avaliação), CB-73 e CB-74.

**Arquivos:**
- Criar: `design-system/componentes/display/Recolhivel.tsx`
- Alterar: `design-system/index.ts`, `design-system/vitrine/TelaDesignSystem.tsx`, `design-system/LEIA-ME.md`, `design-system/componentes/LEIA-ME.md`, `e2e/design-system.spec.ts`
- Criar: `src/domain/camposVisiveis.ts`, `src/domain/camposVisiveis.test.ts`
- Criar: `src/ui/caso/CartaoIdentificacao.tsx`, `src/ui/caso/CartaoPessoa.tsx`, `src/ui/caso/etapa1.test.tsx`
- Renomear: `src/ui/caso/CartaoComposicao.tsx` → `src/ui/caso/CamposComposicao.tsx`
- Alterar: `src/ui/caso/TelaCaso.tsx` (reescrita), `src/ui/caso/PainelAntropometria.tsx`, `src/ui/caso/TelaCaso.test.tsx`

**Interfaces:**
- Produz:
  - `Recolhivel({ titulo: string; resumo?: string | undefined; abertoInicial?: boolean | undefined; children: ReactNode })` — botão com `aria-expanded` e `aria-controls`, conteúdo com `hidden` quando fechado. A Tarefa 8 usa.
  - `camposDaPessoa(caso): { condicao: boolean; mesesAlemDosAnos: boolean; cintura: boolean; panturrilha: boolean }` e `temDadoDeComposicao(caso): boolean`.
  - `CamposComposicao({ caso, aoAlterar })` — os mesmos campos do antigo `CartaoComposicao`, sem o cartão em volta.

- [ ] **Passo 1: Escrever os testes que falham**

Crie `src/domain/camposVisiveis.test.ts`:

```ts
import { criarCasoVazio } from './caso.ts'
import { camposDaPessoa, temDadoDeComposicao } from './camposVisiveis.ts'
import type { Caso } from './tipos.ts'

const caso = (p: Partial<Caso> = {}): Caso => ({ ...criarCasoVazio('c1'), sexo: 'F', idadeAnos: 28, ...p })

describe('campos da pessoa (CA-331, CB-73, CB-74)', () => {
  it('adulta no atendimento completo: condição e cintura, sem meses nem panturrilha', () => {
    expect(camposDaPessoa(caso())).toEqual({ condicao: true, mesesAlemDosAnos: false, cintura: true, panturrilha: false })
  })

  it('masculino não vê condição; com condição marcada, vê (CB-74)', () => {
    expect(camposDaPessoa(caso({ sexo: 'M' })).condicao).toBe(false)
    expect(camposDaPessoa(caso({ sexo: 'M', condicao: { tipo: 'lactante', mesesPosParto: null } })).condicao).toBe(true)
    expect(camposDaPessoa(caso({ sexo: null })).condicao).toBe(true)
  })

  it('meses só abaixo de 19 anos, ou com valor (CB-73)', () => {
    expect(camposDaPessoa(caso({ idadeAnos: 18 })).mesesAlemDosAnos).toBe(true)
    expect(camposDaPessoa(caso({ idadeAnos: 19 })).mesesAlemDosAnos).toBe(false)
    expect(camposDaPessoa(caso({ idadeAnos: null })).mesesAlemDosAnos).toBe(false)
    expect(camposDaPessoa(caso({ idadeAnos: 30, idadeMesesAdicionais: 6 })).mesesAlemDosAnos).toBe(true)
  })

  it('panturrilha só a partir de 60 anos, ou com valor (CB-73), e nunca no modo rápido', () => {
    expect(camposDaPessoa(caso({ idadeAnos: 60 })).panturrilha).toBe(true)
    expect(camposDaPessoa(caso({ idadeAnos: 45, circunferenciaPanturrilhaCm: 33 })).panturrilha).toBe(true)
    expect(camposDaPessoa(caso({ idadeAnos: 72, modo: 'rapido' }))).toEqual({ condicao: true, mesesAlemDosAnos: false, cintura: false, panturrilha: false })
  })
})

describe('temDadoDeComposicao (CA-332)', () => {
  it('só com alguma dobra, bioimpedância ou aparelho preenchido', () => {
    const vazio = criarCasoVazio('c1')
    expect(temDadoDeComposicao(vazio)).toBe(false)
    expect(temDadoDeComposicao({ ...vazio, composicao: { ...vazio.composicao, dobras: { ...vazio.composicao.dobras, tricipital: 12 } } })).toBe(true)
    expect(temDadoDeComposicao({ ...vazio, composicao: { ...vazio.composicao, bioimpedancia: { ...vazio.composicao.bioimpedancia, aparelho: 'InBody' } } })).toBe(true)
  })
})
```

Crie `src/ui/caso/etapa1.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { criarCasoVazio } from '@/domain/caso.ts'
import type { Caso } from '@/domain/tipos.ts'
import { TelaCaso } from './TelaCaso.tsx'

function Anfitriao({ inicial }: { readonly inicial: Partial<Caso> }) {
  const [caso, setCaso] = useState<Caso>({ ...criarCasoVazio('c1'), ...inicial })
  return <TelaCaso caso={caso} aoAlterar={(m) => setCaso((c) => ({ ...c, ...m }))} />
}

const montar = (inicial: Partial<Caso>) => {
  render(<Anfitriao inicial={inicial} />)
  return userEvent.setup()
}

const adulta: Partial<Caso> = { sexo: 'F', idadeAnos: 28, pesoKg: 62, estaturaCm: 165 }

describe('Etapa 1 mais limpa (US-B4)', () => {
  it('CA-329: cartões sem a frase de descrição', () => {
    montar(adulta)
    expect(screen.queryByText('Aparece no cabeçalho do documento exportado.')).not.toBeInTheDocument()
    expect(screen.queryByText(/Base da antropometria e do gasto energético/)).not.toBeInTheDocument()
    expect(screen.queryByText('Entram no documento de aconselhamento exportado.')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Condição fisiológica' })).not.toBeInTheDocument()
  })

  it('CA-330 e CA-331: masculino não vê condição; adulto não vê meses nem panturrilha', () => {
    montar({ ...adulta, sexo: 'M' })
    expect(screen.queryByRole('radiogroup', { name: 'Condição' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Meses além dos anos')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Circunferência da panturrilha')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Circunferência da cintura')).toBeInTheDocument()
  })

  it('CA-331: os campos aparecem quando a idade pede', async () => {
    const usuario = montar(adulta)
    const idade = screen.getByLabelText('Idade')
    await usuario.clear(idade)
    await usuario.type(idade, '8')
    expect(screen.getByLabelText('Meses além dos anos')).toBeInTheDocument()
    await usuario.clear(idade)
    await usuario.type(idade, '72')
    expect(screen.queryByLabelText('Meses além dos anos')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Circunferência da panturrilha')).toBeInTheDocument()
  })

  it('CB-73: campo com valor continua aparecendo', () => {
    montar({ ...adulta, idadeAnos: 45, circunferenciaPanturrilhaCm: 33, idadeMesesAdicionais: 4 })
    expect(screen.getByLabelText('Circunferência da panturrilha')).toHaveValue('33')
    expect(screen.getByLabelText('Meses além dos anos')).toHaveValue('4')
  })

  it('CA-332: composição corporal e observações recolhidas, e abrem com um clique', async () => {
    const usuario = montar(adulta)
    const composicao = screen.getByRole('button', { name: /Composição corporal/ })
    const observacoes = screen.getByRole('button', { name: /Observações/ })
    expect(composicao).toHaveAttribute('aria-expanded', 'false')
    expect(observacoes).toHaveAttribute('aria-expanded', 'false')
    await usuario.click(composicao)
    expect(composicao).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('radiogroup', { name: 'Protocolo de dobras' })).toBeVisible()
  })

  it('CA-332: já abertos quando têm dado', () => {
    const vazio = criarCasoVazio('c1')
    montar({
      ...adulta,
      observacoes: 'Prefere jantar cedo.',
      composicao: { ...vazio.composicao, dobras: { ...vazio.composicao.dobras, tricipital: 12 } },
    })
    expect(screen.getByRole('button', { name: /Composição corporal/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /Observações/ })).toHaveAttribute('aria-expanded', 'true')
  })

  it('CA-333: avaliação mostra valor e classificação na mesma linha', () => {
    montar(adulta)
    const imc = screen.getByText('22,8 kg/m²')
    expect(imc.parentElement?.textContent).toMatch(/22,8 kg\/m² · Eutrofia/)
  })
})
```

Em `src/ui/caso/TelaCaso.test.tsx`, troque o teste `'CB-02a: gestante com sexo masculino é recusada com explicação'` por:

```tsx
  it('CB-74: gestante marcada e sexo trocado para masculino mantém a condição, com o erro', async () => {
    const usuario = montar(adulta)
    await usuario.click(screen.getByRole('radio', { name: 'Gestante' }))
    await usuario.click(screen.getByRole('radio', { name: 'Masculino' }))
    expect(screen.getByRole('radiogroup', { name: 'Condição' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('só pode ser marcada para o sexo feminino')
  })
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/camposVisiveis.test.ts src/ui/caso`
Expected: FAIL.

- [ ] **Passo 3: O `Recolhivel` na biblioteca**

Crie `design-system/componentes/display/Recolhivel.tsx`:

```tsx
import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@ds/lib/cn.ts'

/*
 * O que é opcional fica recolhido numa linha cinza e abre com um clique.
 * Serve para a tela mostrar só o que se usa sempre (spec pdf-e-telas-limpas, D-53),
 * sem esconder nada: o conteúdo continua no DOM e abre sozinho quando já tem dado
 * (quem chama decide pelo `abertoInicial`).
 */
interface RecolhivelProps {
  readonly titulo: string
  /** Uma linha abaixo do título dizendo o que tem dentro. */
  readonly resumo?: string | undefined
  readonly abertoInicial?: boolean | undefined
  readonly children: ReactNode
  readonly className?: string | undefined
}

export function Recolhivel({ titulo, resumo, abertoInicial = false, children, className }: RecolhivelProps) {
  const [aberto, setAberto] = useState(abertoInicial)
  const id = useId()
  return (
    <div className={cn('rounded-lg bg-surfacerow', className)}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls={id}
        className="flex min-h-14 w-full items-center gap-3 rounded-lg px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-heading">{titulo}</span>
          {resumo ? <span className="block text-xs text-muted-foreground">{resumo}</span> : null}
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', aberto && 'rotate-180')} aria-hidden="true" />
      </button>
      <div id={id} hidden={!aberto} className="flex flex-col gap-4 px-4 pb-4">
        {children}
      </div>
    </div>
  )
}
```

Em `design-system/index.ts`, logo depois da linha do `Fontes`, acrescente:

```ts
export { Recolhivel } from './componentes/display/Recolhivel.tsx'
```

Em `design-system/vitrine/TelaDesignSystem.tsx`, acrescente o import `import { Recolhivel } from '@ds/componentes/display/Recolhivel.tsx'` e, logo depois do fim da `<Secao nome="Fontes" …>`, uma seção nova:

```tsx
        <Secao nome="Recolhivel" arquivo="display/Recolhivel.tsx" descricao="O que é opcional fica numa linha que abre com um clique">
          <Linha estado="Fechado, com resumo">
            <Recolhivel titulo="Composição corporal" resumo="Dobras ou bioimpedância. Opcional." className="w-full">
              <p className="text-sm text-muted-foreground">Os campos de dobras e de bioimpedância.</p>
            </Recolhivel>
          </Linha>
          <Linha estado="Aberto">
            <Recolhivel titulo="Ver cálculo" abertoInicial className="w-full">
              <p className="numeros text-sm text-muted-foreground">TMB 1.330 kcal · fator 1,2</p>
            </Recolhivel>
          </Linha>
        </Secao>
```

Em `e2e/design-system.spec.ts`, acrescente `'Recolhivel',` na lista `SECOES`, logo depois de `'Fontes',`.

Em `design-system/LEIA-ME.md`, na linha do `display/`, troque `Icon · Fontes\*` por `Icon · Fontes\* · Recolhivel\*` e, depois da nota do asterisco do `Fontes`, acrescente a linha: `\* \`Recolhivel\` nasceu em 01/10/2026, para recolher o que é opcional nas telas de trabalho.`

Em `design-system/componentes/LEIA-ME.md`, depois da seção `### Fontes` (antes do próximo `###`), acrescente:

````markdown
### Recolhivel
Linha cinza que abre e fecha. Guarda o que é opcional (composição corporal, observações) e o
detalhe que só interessa às vezes (a conta da energia). O conteúdo fica no DOM; quem chama
decide se começa aberto, e deve abrir quando já há dado dentro.

```tsx
<Recolhivel titulo="Composição corporal" resumo="Dobras ou bioimpedância. Opcional." abertoInicial={temDado}>
  <CamposComposicao caso={caso} aoAlterar={aoAlterar} />
</Recolhivel>
```
````

- [ ] **Passo 4: As regras dos campos**

Crie `src/domain/camposVisiveis.ts`:

```ts
// Que campos da etapa 1 aparecem: só os que valem para o caso, e nunca um que já tem dado
// (spec pdf-e-telas-limpas, CA-331, CA-332, CB-73 e CB-74).
import type { Caso } from './tipos.ts'

export interface CamposDaPessoa {
  readonly condicao: boolean
  readonly mesesAlemDosAnos: boolean
  readonly cintura: boolean
  readonly panturrilha: boolean
}

export function camposDaPessoa(caso: Caso): CamposDaPessoa {
  const idade = caso.idadeAnos
  const completo = caso.modo === 'completo'
  return {
    // Gestação e lactação não valem para o sexo masculino; marcada, continua à vista com o erro.
    condicao: caso.sexo !== 'M' || caso.condicao.tipo !== 'nenhuma',
    // As curvas da OMS usam os meses até 19 anos.
    mesesAlemDosAnos: (idade !== null && idade < 19) || caso.idadeMesesAdicionais !== 0,
    cintura: completo,
    // A panturrilha é avaliada a partir de 60 anos.
    panturrilha: completo && ((idade !== null && idade >= 60) || caso.circunferenciaPanturrilhaCm !== null),
  }
}

/** Alguma dobra, medida de bioimpedância ou aparelho preenchido. */
export function temDadoDeComposicao(caso: Caso): boolean {
  const { dobras, bioimpedancia } = caso.composicao
  return (
    Object.values(dobras).some((v) => v !== null) ||
    bioimpedancia.gorduraPct !== null ||
    bioimpedancia.massaMagraKg !== null ||
    bioimpedancia.aguaPct !== null ||
    bioimpedancia.aparelho.trim() !== ''
  )
}
```

- [ ] **Passo 5: Composição sem cartão**

Rode `git mv src/ui/caso/CartaoComposicao.tsx src/ui/caso/CamposComposicao.tsx`. No arquivo novo:
1. Troque `import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'` por nada (apague a linha).
2. Troque `interface CartaoComposicaoProps` por `interface CamposComposicaoProps` e `export function CartaoComposicao({ caso, aoAlterar }: CartaoComposicaoProps) {` por `export function CamposComposicao({ caso, aoAlterar }: CamposComposicaoProps) {`.
3. Troque o comentário acima da função por `/** Dobras cutâneas e bioimpedância, com o resultado e a fonte da equação usada. Mora dentro de um Recolhivel. */`.
4. Troque o começo do retorno:

```tsx
    <Card>
      <CardHeader>
        <CardTitle>Composição corporal</CardTitle>
        <CardDescription>Opcional. Preencha dobras, bioimpedância ou as duas; o resultado aparece com a equação usada.</CardDescription>
      </CardHeader>
```

por `    <div className="flex flex-col gap-4">`, e o `</Card>` do fim por `</div>`.

- [ ] **Passo 6: Identificação e Pessoa**

Crie `src/ui/caso/CartaoIdentificacao.tsx`:

```tsx
import { UserRound } from 'lucide-react'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import type { Caso } from '@/domain/tipos.ts'
import { Card, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'

interface CartaoIdentificacaoProps {
  readonly caso: Caso
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
  readonly pacientes: readonly { readonly id: string; readonly nome: string }[]
  readonly aoVincularPaciente?: ((pacienteId: string | null) => void) | undefined
  readonly assinatura?: AssinaturaDoPlano | null | undefined
  /** Estagiário(a) e Preceptor(a) aparecem (spec ajustes-de-uso, CA-251 e CB-51). */
  readonly camposDeEstagio: boolean
}

/** Identificação do plano: o que sai no cabeçalho dos documentos (CA-329). */
export function CartaoIdentificacao({ caso, aoAlterar, pacientes, aoVincularPaciente, assinatura, camposDeEstagio }: CartaoIdentificacaoProps) {
  const situacao = assinatura?.situacao ?? null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Identificação</CardTitle>
      </CardHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        {aoVincularPaciente ? (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="paciente-do-plano">Paciente</Label>
            <select
              id="paciente-do-plano"
              value={caso.pacienteId ?? ''}
              onChange={(e) => aoVincularPaciente(e.target.value || null)}
              className="h-10 rounded-md border border-input bg-card px-3 text-sm"
            >
              <option value="">Sem paciente vinculado</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome.trim() || 'Paciente sem nome'}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <CampoTexto rotulo="Nome do plano" valor={caso.nome} aoMudar={(v) => aoAlterar({ nome: v })} placeholder="Maria, 28 anos…" />
        <CampoTexto rotulo="Data da consulta" tipo="date" valor={caso.dataConsulta ?? ''} aoMudar={(v) => aoAlterar({ dataConsulta: v || null })} />
        <CampoTexto rotulo="Diagnóstico clínico" valor={caso.diagnosticoClinico} aoMudar={(v) => aoAlterar({ diagnosticoClinico: v })} />
        <CampoTexto rotulo="Ocupação" valor={caso.ocupacao} aoMudar={(v) => aoAlterar({ ocupacao: v })} />
        {camposDeEstagio ? (
          <>
            <CampoTexto rotulo="Estagiário(a)" valor={caso.estagiario} aoMudar={(v) => aoAlterar({ estagiario: v })} />
            <CampoTexto rotulo="Preceptor(a)" valor={caso.preceptor} aoMudar={(v) => aoAlterar({ preceptor: v })} />
          </>
        ) : null}
      </div>

      {camposDeEstagio && situacao === 'estudante' && assinatura ? (
        <p className="text-xs text-muted-foreground">
          {assinatura.origem === 'conta'
            ? 'Em plano novo, Estagiário(a) vem do nome da sua conta e Preceptor(a) de Configurações › Quem assina. Dá para trocar neste plano.'
            : 'Em plano novo, Estagiário(a) e Preceptor(a) vêm de Configurações › Quem assina. Dá para trocar neste plano.'}
        </p>
      ) : null}

      {camposDeEstagio || !assinatura ? null : (
        <div className="flex items-center gap-3 rounded-lg bg-lightprimary px-4 py-3">
          <UserRound className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm text-foreground">
            Assina este plano:{' '}
            <strong className="font-semibold text-heading">{assinatura.linhaNutricionista ?? 'nome e CRN não informados'}</strong>
            <span className="block text-xs text-muted-foreground">
              {assinatura.linhaNutricionista === null
                ? assinatura.origem === 'conta'
                  ? 'Confira nome e CRN em Conta e plano.'
                  : 'Preencha em Configurações › Quem assina.'
                : assinatura.origem === 'conta'
                  ? 'Vem do seu cadastro.'
                  : 'Vem de Configurações › Quem assina.'}
            </span>
          </p>
        </div>
      )}
    </Card>
  )
}
```

Crie `src/ui/caso/CartaoPessoa.tsx`:

```tsx
import { Ruler } from 'lucide-react'
import { camposDaPessoa } from '@/domain/camposVisiveis.ts'
import type { ResultadoValidacao } from '@/domain/caso.ts'
import type { Caso, CondicaoFisiologica, Objetivo, Sexo } from '@/domain/tipos.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Card, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { CampoNumero } from '@ds/componentes/forms/CampoNumero.tsx'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'
import { CampoMetaEnergia } from './CampoMetaEnergia.tsx'
import { CampoNivelAtividade } from './CampoNivelAtividade.tsx'

interface CartaoPessoaProps {
  readonly caso: Caso
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
  readonly erros: ResultadoValidacao['erros']
}

type TipoCondicao = CondicaoFisiologica['tipo']

const CONDICOES: readonly { readonly valor: TipoCondicao; readonly rotulo: string }[] = [
  { valor: 'nenhuma', rotulo: 'Nenhuma' },
  { valor: 'gestante', rotulo: 'Gestante' },
  { valor: 'lactante', rotulo: 'Lactante' },
]

/** Pessoa, medidas e meta: só os campos que valem para o caso (CA-330 e CA-331). */
export function CartaoPessoa({ caso, aoAlterar, erros }: CartaoPessoaProps) {
  const rapido = caso.modo === 'rapido'
  const campos = camposDaPessoa(caso)
  const { condicao } = caso
  const numero = (campo: keyof Caso) => (valor: number | null) => aoAlterar({ [campo]: valor } as Partial<Caso>)

  const trocarCondicao = (tipo: TipoCondicao) => {
    const nova: CondicaoFisiologica =
      tipo === 'gestante'
        ? { tipo: 'gestante', semanasGestacao: null, pesoPreGestacionalKg: null }
        : tipo === 'lactante'
          ? { tipo: 'lactante', mesesPosParto: null }
          : { tipo: 'nenhuma' }
    aoAlterar({ condicao: nova })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{rapido ? 'Pessoa e meta' : 'Pessoa e medidas'}</CardTitle>
      </CardHeader>

      <div className="flex flex-wrap gap-x-8 gap-y-4">
        <GrupoOpcoes<Sexo>
          rotulo="Sexo"
          opcoes={[
            { valor: 'F', rotulo: 'Feminino' },
            { valor: 'M', rotulo: 'Masculino' },
          ]}
          valor={caso.sexo}
          aoEscolher={(sexo) => aoAlterar({ sexo })}
        />
        <GrupoOpcoes<Objetivo>
          rotulo="Objetivo"
          opcoes={[
            { valor: 'emagrecer', rotulo: 'Emagrecer' },
            { valor: 'manter', rotulo: 'Manter' },
            { valor: 'ganhar', rotulo: 'Ganhar' },
          ]}
          valor={caso.objetivo}
          aoEscolher={(objetivo) => aoAlterar({ objetivo })}
        />
        {campos.condicao ? (
          <GrupoOpcoes<TipoCondicao> rotulo="Condição" opcoes={CONDICOES} valor={condicao.tipo} aoEscolher={trocarCondicao} erro={erros.condicao} />
        ) : null}
      </div>

      {condicao.tipo === 'gestante' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoNumero
            rotulo="Idade gestacional"
            valor={condicao.semanasGestacao}
            aoMudar={(v) => aoAlterar({ condicao: { ...condicao, semanasGestacao: v } })}
            sufixo="semanas"
          />
          <CampoNumero
            rotulo="Peso pré-gestacional"
            valor={condicao.pesoPreGestacionalKg}
            aoMudar={(v) => aoAlterar({ condicao: { ...condicao, pesoPreGestacionalKg: v } })}
            sufixo="kg"
          />
        </div>
      ) : null}

      {condicao.tipo === 'lactante' ? (
        <CampoNumero
          rotulo="Tempo pós-parto"
          valor={condicao.mesesPosParto}
          aoMudar={(v) => aoAlterar({ condicao: { ...condicao, mesesPosParto: v } })}
          sufixo="meses"
          dica="Conta o adicional de energia da lactação."
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CampoNumero rotulo="Idade" valor={caso.idadeAnos} aoMudar={numero('idadeAnos')} sufixo="anos" erro={erros.idadeAnos} />
        {campos.mesesAlemDosAnos ? (
          <CampoNumero
            rotulo="Meses além dos anos"
            valor={caso.idadeMesesAdicionais}
            aoMudar={(v) => aoAlterar({ idadeMesesAdicionais: v ?? 0 })}
            sufixo="meses"
            erro={erros.idadeMesesAdicionais}
          />
        ) : null}
        <CampoNumero rotulo="Peso" valor={caso.pesoKg} aoMudar={numero('pesoKg')} sufixo="kg" erro={erros.pesoKg} />
        <CampoNumero rotulo="Estatura" valor={caso.estaturaCm} aoMudar={numero('estaturaCm')} sufixo="cm" erro={erros.estaturaCm} />
        {campos.cintura ? (
          <CampoNumero
            rotulo="Circunferência da cintura"
            valor={caso.circunferenciaCinturaCm}
            aoMudar={numero('circunferenciaCinturaCm')}
            sufixo="cm"
            erro={erros.circunferenciaCinturaCm}
          />
        ) : null}
        {campos.panturrilha ? (
          <CampoNumero
            rotulo="Circunferência da panturrilha"
            valor={caso.circunferenciaPanturrilhaCm}
            aoMudar={numero('circunferenciaPanturrilhaCm')}
            sufixo="cm"
            erro={erros.circunferenciaPanturrilhaCm}
          />
        ) : null}
      </div>

      <CampoNivelAtividade fator={caso.energia.fator} aoEscolher={(fator) => aoAlterar({ energia: { ...caso.energia, fator } })} />

      {rapido ? <CampoMetaEnergia caso={caso} aoMudar={numero('metaEnergiaKcal')} erro={erros.metaEnergiaKcal} /> : null}

      {rapido ? (
        <Alert variant="info">
          <Ruler aria-hidden="true" />
          <p>Peso e estatura aqui servem só para estimar a meta e para a proteína em g/kg. Nada é classificado nem vira diagnóstico.</p>
        </Alert>
      ) : null}
    </Card>
  )
}
```

(Se `ResultadoValidacao` não for exportado de `src/domain/caso.ts`, exporte a interface — hoje ela já é `export interface ResultadoValidacao`.)

- [ ] **Passo 7: A etapa 1**

Troque o conteúdo de `src/ui/caso/TelaCaso.tsx` por:

```tsx
import { Ruler } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { avaliarAntropometria } from '@/domain/antropometria.ts'
import { mostraCamposDeEstagio, mostraReceitas, type AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { temDadoDeComposicao } from '@/domain/camposVisiveis.ts'
import { validarCaso } from '@/domain/caso.ts'
import type { Caso } from '@/domain/tipos.ts'
import { Card, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { Recolhivel } from '@ds/componentes/display/Recolhivel.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Textarea } from '@ds/componentes/forms/textarea.tsx'
import { CamposComposicao } from './CamposComposicao.tsx'
import { CartaoIdentificacao } from './CartaoIdentificacao.tsx'
import { CartaoPessoa } from './CartaoPessoa.tsx'
import { PainelAntropometria } from './PainelAntropometria.tsx'

interface TelaCasoProps {
  readonly caso: Caso
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
  /** Pacientes cadastrados, para vincular este plano a uma ficha. */
  readonly pacientes?: readonly { readonly id: string; readonly nome: string }[]
  readonly aoVincularPaciente?: (pacienteId: string | null) => void
  /** Painéis extras da coluna da direita (ex.: Resumo do dia). */
  readonly lateral?: ReactNode
  /** Quem assina e a situação (US-A2, US-A4); sem ela, o plano fica como era (CB-69). */
  readonly assinatura?: AssinaturaDoPlano | null | undefined
}

/** Etapa 1: dados do caso e avaliação antropométrica, só com o que vale para o caso (US-B4). */
export function TelaCaso({ caso, aoAlterar, lateral, assinatura, pacientes = [], aoVincularPaciente }: TelaCasoProps) {
  const validacao = useMemo(() => validarCaso(caso), [caso])
  const antropometria = useMemo(() => avaliarAntropometria(caso), [caso])
  const situacao = assinatura?.situacao ?? null

  // Quais campos aparecem se decide quando o plano abre (ou a situação muda), não a cada tecla:
  // senão apagar todo o texto de Receitas, por exemplo, faria o campo sumir no meio da edição.
  const [visibilidade, setVisibilidade] = useState(() => ({ id: caso.id, situacao, estagio: mostraCamposDeEstagio(situacao, caso), receitas: mostraReceitas(situacao, caso) }))
  let atual = visibilidade
  if (visibilidade.id !== caso.id || visibilidade.situacao !== situacao) {
    atual = { id: caso.id, situacao, estagio: mostraCamposDeEstagio(situacao, caso), receitas: mostraReceitas(situacao, caso) }
    setVisibilidade(atual)
  }
  const comReceitas = atual.receitas
  const rapido = caso.modo === 'rapido'

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-6">
        <CartaoIdentificacao
          caso={caso}
          aoAlterar={aoAlterar}
          pacientes={pacientes}
          aoVincularPaciente={aoVincularPaciente}
          assinatura={assinatura}
          camposDeEstagio={atual.estagio}
        />

        <CartaoPessoa caso={caso} aoAlterar={aoAlterar} erros={validacao.erros} />

        <Card>
          <CardHeader>
            <CardTitle>{comReceitas ? 'Orientações e receitas' : 'Orientações'}</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="orientacoes">Orientações nutricionais</Label>
            <Textarea id="orientacoes" rows={4} value={caso.orientacoes} onChange={(e) => aoAlterar({ orientacoes: e.target.value })} />
          </div>
          {comReceitas ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="receitas">Receitas</Label>
              <Textarea id="receitas" rows={4} value={caso.receitas} onChange={(e) => aoAlterar({ receitas: e.target.value })} />
            </div>
          ) : null}

          {rapido ? null : (
            <Recolhivel key={`composicao-${caso.id}`} titulo="Composição corporal" resumo="Dobras ou bioimpedância. Opcional." abertoInicial={temDadoDeComposicao(caso)}>
              <CamposComposicao caso={caso} aoAlterar={aoAlterar} />
            </Recolhivel>
          )}
          <Recolhivel key={`observacoes-${caso.id}`} titulo="Observações" resumo="Anotações suas, não saem no documento." abertoInicial={caso.observacoes.trim() !== ''}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" rows={4} value={caso.observacoes} onChange={(e) => aoAlterar({ observacoes: e.target.value })} />
            </div>
          </Recolhivel>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        {rapido ? (
          <Card className="gap-3">
            <div className="flex items-center gap-2">
              <Ruler className="size-4 text-primary" aria-hidden="true" />
              <CardTitle>Sem avaliação neste plano</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">Esta é uma prescrição rápida: sem avaliação antropométrica, e o documento exportado diz isso.</p>
            <Button variant="lightprimary" className="self-start" onClick={() => aoAlterar({ modo: 'completo' })}>
              Virar atendimento completo
            </Button>
          </Card>
        ) : (
          <PainelAntropometria resultado={antropometria} />
        )}
        {lateral}
      </div>
    </div>
  )
}
```

Confira com `grep -rn "Observações" src --include=*.ts*` que nenhum documento exportado usa as observações (hoje nenhum usa: o texto "não saem no documento" depende disso).

- [ ] **Passo 8: Avaliação numa linha**

Em `src/ui/caso/PainelAntropometria.tsx`:
1. Na interface `LinhaProps`, acrescente `readonly classe?: string | undefined` depois de `valor`.
2. Troque a função `Linha` por:

```tsx
function Linha({ rotulo, valor, classe, detalhe }: LinhaProps) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border pb-3 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-sm text-muted-foreground">{rotulo}</span>
        <span className="text-right">
          <span className="numeros text-base font-semibold text-heading">{valor}</span>
          {classe ? (
            <>
              <span aria-hidden="true" className="text-muted-foreground">
                {' · '}
              </span>
              <span className="text-sm text-foreground">{classe}</span>
            </>
          ) : null}
        </span>
      </div>
      {detalhe ? <span className="text-xs text-muted-foreground">{detalhe}</span> : null}
    </div>
  )
}
```

3. Nas chamadas, passe a classificação para `classe` e deixe em `detalhe` só a frase longa:
   - IMC: `classe={imc.grau ? `${imc.classe} — ${imc.grau}` : imc.classe}` (sem `detalhe`).
   - IMC-para-idade: `classe={imcIdade.classe}` e `detalhe={`IMC ${formatarNumero(imcIdade.valorImc, 1)} kg/m² aos ${imcIdade.mesesReferencia} meses`}`.
   - Estatura-para-idade: `classe={estaturaIdade.classe}` (sem `detalhe`).
   - IMC pré-gestacional: `classe={gestacao.rotulo}` e `detalhe={`ganho recomendado de ${formatarNumero(gestacao.ganhoRecomendadoKg.min, 1)} a ${formatarNumero(gestacao.ganhoRecomendadoKg.max, 1)} kg até 40 semanas; ganho atual de ${formatarNumero(gestacao.ganhoAtualKg, 1)} kg`}`.
   - Cintura e panturrilha ficam como estão.

- [ ] **Passo 9: Rodar e ver passar**

Run: `npx vitest run src/domain/camposVisiveis.test.ts src/ui/caso src/ui/resumo`
Expected: PASS. Se um teste antigo de `TelaCaso.test.tsx` ou de `modoRapido.test.tsx` procurar um texto de descrição de cartão que saiu (como "Base da antropometria…"), apague só essa asserção: o CA-329 tirou esses textos.

- [ ] **Passo 10: Portão, e2e e commit**

Run: `npm run check` e `npx playwright test`

```bash
printf '%s\n' 'feat(caso): etapa 1 só com o que vale para o caso' '' 'Cartões sem descrição, condição só para o sexo feminino, meses só antes' 'dos 19 anos, panturrilha a partir dos 60, composição e observações' 'recolhidas no Recolhivel novo da biblioteca e avaliação numa linha' '(CA-329 a CA-333, CB-73, CB-74).' '' 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>' > ../_msg.txt
git add -A design-system src/domain/camposVisiveis.ts src/domain/camposVisiveis.test.ts src/ui/caso e2e/design-system.spec.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 8: Resumo do dia num cartão só

Cobre a parte do Resumo do dia no CA-333.

**Arquivos:**
- Alterar: `src/ui/resumo/ResumoDoDia.tsx` (reescrita), `src/ui/resumo/ResumoDoDia.test.tsx`

**Interfaces:**
- Consome: `Recolhivel` (Tarefa 7). Nenhuma mudança de props do `ResumoDoDia`.

- [ ] **Passo 1: Escrever o teste que falha**

Em `src/ui/resumo/ResumoDoDia.test.tsx`, acrescente no fim (o arquivo já tem `montar`, `adulta` e `resumo`):

```tsx
describe('Resumo do dia num cartão só (CA-333)', () => {
  it('energia e macronutrientes no mesmo cartão, e a conta recolhida em "Ver cálculo"', async () => {
    const usuario = montar(adulta)
    const cartao = screen.getByText('Resumo do dia').closest('[data-slot="card"]')
    expect(cartao).not.toBeNull()
    expect(within(cartao as HTMLElement).getByText('Macronutrientes')).toBeInTheDocument()
    expect(within(cartao as HTMLElement).getByRole('button', { name: 'Metas' })).toBeInTheDocument()

    const verCalculo = resumo().getByRole('button', { name: 'Ver cálculo' })
    const conteudo = document.getElementById(verCalculo.getAttribute('aria-controls') ?? '')
    expect(verCalculo).toHaveAttribute('aria-expanded', 'false')
    expect(conteudo).toHaveAttribute('hidden')
    await usuario.click(verCalculo)
    expect(conteudo).not.toHaveAttribute('hidden')
    expect(within(conteudo as HTMLElement).getByText('TMB')).toBeInTheDocument()
  })
})
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/resumo/ResumoDoDia.test.tsx`
Expected: FAIL — os macronutrientes ainda estão em outro cartão e não há "Ver cálculo".

- [ ] **Passo 3: Implementar**

Em `src/ui/resumo/ResumoDoDia.tsx`:
1. Acrescente `import { Recolhivel } from '@ds/componentes/display/Recolhivel.tsx'`.
2. Logo depois de `const rotuloEnergia = …`, acrescente:

```ts
  const mostraCalculo = (caso.modo === 'completo' || !energia.getManual) && (energia.tmb !== null || energia.get !== null)
```

3. Troque o bloco do detalhe:

```tsx
        {(caso.modo === 'completo' || !energia.getManual) && (energia.tmb !== null || energia.get !== null) ? (
          <dl className="flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
```

…até o `) : null}` que fecha esse `dl`, por:

```tsx
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="rotulo">Macronutrientes</p>
            <Button variant="ghost" size="sm" onClick={() => setEditandoMetas(true)}>
              <SlidersHorizontal aria-hidden="true" />
              Metas
            </Button>
          </div>
          <MedidorMacro nome="Proteína" macro={macros.proteina} meta={descreverMeta(macros.proteina)} />
          <MedidorMacro nome="Carboidrato" macro={macros.carboidrato} meta={descreverMeta(macros.carboidrato)} />
          <MedidorMacro nome="Gordura" macro={macros.gordura} meta={descreverMeta(macros.gordura)} />
        </div>

        {mostraCalculo ? (
          <Recolhivel titulo="Ver cálculo">
            <dl className="flex flex-col gap-1.5 text-sm">
              {energia.tmb !== null ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">TMB</dt>
                  <dd className="numeros font-medium text-heading">{`${formatarNumero(energia.tmb, 0)} kcal`}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Fator de atividade</dt>
                <dd className="numeros font-medium text-heading">
                  {`${formatarNumero(caso.energia.fator, 2)}${energia.categoriaAtividade ? ` · ${energia.categoriaAtividade}` : ''}`}
                </dd>
              </div>
              {energia.adicionais.map((a) => (
                <div key={a.descricao} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{a.descricao}</dt>
                  <dd className="numeros font-medium text-heading">{`${a.kcal > 0 ? '+' : ''}${formatarNumero(a.kcal, 0)} kcal`}</dd>
                </div>
              ))}
              {energia.fonte ? <Fontes itens={[{ texto: energia.fonte }]} className="pt-1" /> : null}
            </dl>
          </Recolhivel>
        ) : null}
```

4. Apague o segundo cartão inteiro (o `<Card className="gap-4">` com `<CardTitle>Macronutrientes</CardTitle>` e os três `MedidorMacro`). O `DialogoMetas` continua onde está.

- [ ] **Passo 4: Rodar e ver passar**

Run: `npx vitest run src/ui/resumo src/ui/caso`
Expected: PASS (os testes antigos que procuram "TMB", "1.330 kcal" e "Fator de atividade" continuam achando o texto: ele está no DOM, só recolhido).

- [ ] **Passo 5: Portão, e2e e commit**

Run: `npm run check` e `npx playwright test`

```bash
printf '%s\n' 'feat(resumo): energia e macronutrientes num cartão, a conta recolhida' '' 'O Resumo do dia junta energia e macronutrientes, e TMB, fator e' 'adicionais ficam em "Ver cálculo" (CA-333).' '' 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>' > ../_msg.txt
git add src/ui/resumo
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---
### Tarefa 9: Etapa 2 mais limpa

Cobre CA-334, CA-335 e CA-336.

**Arquivos:**
- Alterar: `src/ui/plano/CartaoRefeicao.tsx`, `src/ui/plano/SugestoesDaRefeicao.tsx`, `src/ui/plano/TelaPlano.test.tsx`

**Interfaces:**
- Nenhuma prop muda. O botão de lixeira do topo da refeição vira um menu: gatilho com `aria-label="Mais ações de {nome}"` e item `"Remover refeição"`. As abas continuam `role="tab"` dentro de `role="tablist"` com o mesmo nome (`Opções de {nome}`), e o painel continua `role="tabpanel"` com o mesmo nome; o e2e depende disso.

- [ ] **Passo 1: Escrever os testes que falham**

Em `src/ui/plano/TelaPlano.test.tsx`:
1. No teste que adiciona e remove refeição, troque

```tsx
    await usuario.click(screen.getByRole('button', { name: 'Remover refeição Nova refeição' }))
```

por

```tsx
    await usuario.click(screen.getByRole('button', { name: 'Mais ações de Nova refeição' }))
    await usuario.click(screen.getByRole('menuitem', { name: 'Remover refeição' }))
```

2. Acrescente no fim do primeiro `describe` do arquivo:

```tsx
  it('CA-334: o topo da refeição traz as kcal da opção aberta, e a linha de total some', () => {
    montar()
    expect(screen.queryByText('Total desta opção')).not.toBeInTheDocument()
    const almoco = screen.getByRole('tablist', { name: 'Opções de Almoço' }).closest('[data-slot="card"]')
    expect(almoco).not.toBeNull()
    expect(within(almoco as HTMLElement).getByText('0 kcal')).toBeInTheDocument()
    expect(within(almoco as HTMLElement).queryByRole('button', { name: /^Remover refeição/ })).not.toBeInTheDocument()
  })

  it('CA-336: as sugestões ficam numa linha só, com Editar no fim', () => {
    montar()
    const sugestoes = screen.getAllByRole('region', { name: /^Sugestões para / })[0] as HTMLElement
    const botoes = within(sugestoes).getAllByRole('button')
    expect(botoes.at(-1)).toHaveAccessibleName(/^Editar sugestões para /)
    const faixa = within(sugestoes).getAllByRole('button', { name: /^Adicionar / })[0]?.parentElement
    expect(faixa?.className).toContain('overflow-x-auto')
    expect(faixa?.className).not.toContain('flex-wrap')
  })
```

(Se o `describe` do arquivo não importar `within`, acrescente no import de `@testing-library/react`.)

- [ ] **Passo 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/plano/TelaPlano.test.tsx`
Expected: FAIL — ainda há a lixeira, a linha "Total desta opção" e a quebra de linha das sugestões.

- [ ] **Passo 3: O cartão da refeição**

Em `src/ui/plano/CartaoRefeicao.tsx`:
1. Troque `import { Clock, Trash } from 'lucide-react'` por `import { Clock, MoreHorizontal, Trash } from 'lucide-react'` e acrescente `import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ds/componentes/overlay/dropdown-menu.tsx'`.
2. Troque o comentário da função por `/** CA-13, CA-14 e CA-334: refeição com horário, nome, kcal da opção aberta e três opções. */`.
3. Troque o bloco do topo (do `<div className="flex flex-wrap items-center gap-3">` até o `</div>` logo depois do botão de lixeira) por:

```tsx
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-28 shrink-0">
          <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="time"
            aria-label={`Horário de ${refeicao.nome}`}
            value={horarioTexto}
            onChange={(e) => {
              setHorarioTexto(e.target.value)
              if (/^([01]\d|2[0-3]):[0-5]\d$/.test(e.target.value)) aoMudarHorario(e.target.value)
            }}
            onBlur={() => setHorarioTexto(refeicao.horario)}
            className="pl-9"
          />
        </div>
        <Input
          aria-label={`Nome da refeição ${refeicao.nome}`}
          value={nomeTexto}
          onChange={(e) => {
            setNomeTexto(e.target.value)
            if (e.target.value.trim() !== '') aoRenomear(e.target.value)
          }}
          onBlur={() => setNomeTexto(refeicao.nome)}
          className="min-w-32 flex-1 font-semibold"
        />
        <span className="numeros ml-auto shrink-0 text-sm font-semibold text-heading">{`${formatarNumero(kcal, 0)} kcal`}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Mais ações de ${refeicao.nome}`}>
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={aoRemover}>
              <Trash aria-hidden="true" />
              Remover refeição
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
```

4. Troque o `tablist` inteiro por:

```tsx
      <div role="tablist" aria-label={`Opções de ${refeicao.nome}`} className="inline-flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-surfacerow p-1">
        {OPCOES_ORDEM.map((o) => {
          const ativa = o === opcaoAtiva
          const quantos = refeicao.opcoes[o].length
          return (
            <button
              key={o}
              type="button"
              role="tab"
              aria-selected={ativa}
              onClick={() => setOpcaoAtiva(o)}
              className={cn(
                'inline-flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9',
                ativa ? 'bg-card text-heading shadow-xs' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {ROTULO_OPCAO[o]}
              {quantos > 0 ? ` (${quantos})` : ''}
            </button>
          )
        })}
      </div>
```

5. Apague o bloco do total:

```tsx
        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <span className="text-sm text-muted-foreground">Total desta opção</span>
          <span className="numeros text-sm font-semibold text-heading">{`${formatarNumero(kcal, 0)} kcal`}</span>
        </div>
```

- [ ] **Passo 4: As sugestões numa linha**

Em `src/ui/plano/SugestoesDaRefeicao.tsx`, troque o `return` final (a `<section …>` inteira) por:

```tsx
  return (
    <section aria-label={titulo} className="flex min-w-0 items-center gap-2">
      <p className="rotulo hidden shrink-0 sm:block">Sugestões</p>
      {/* Uma faixa só, que rola para o lado em qualquer largura (CA-336): quebrar linha empurrava o plano para baixo. */}
      <div className="-my-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1">
        {prontas.map((s, i) => (
          <button
            key={`${s.alimentoId}-${i}`}
            type="button"
            onClick={() => aoEscolher(s.alimentoId, s.gramas)}
            aria-label={`Adicionar ${s.alimento.descricao}, ${formatarNumero(s.gramas, 0)} g`}
            className="inline-flex min-h-11 max-w-64 shrink-0 items-center gap-1 rounded-full border border-border px-3 text-xs transition-colors hover:border-borderdefault hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-3 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0 truncate">{s.alimento.descricao}</span>
            <span className="numeros shrink-0 text-muted-foreground">{`${formatarNumero(s.gramas, 0)} g`}</span>
          </button>
        ))}
      </div>
      {editar ? <div className="shrink-0">{editar}</div> : null}
    </section>
  )
```

(O botão "Editar" já tem `aria-label="Editar sugestões para …"`; o rótulo da região continua "Sugestões para o almoço", que o e2e usa.)

- [ ] **Passo 5: Rodar e ver passar**

Run: `npx vitest run src/ui/plano src/ui/adequacao`
Expected: PASS. Os testes de `DialogoSubstituto.test.tsx` que procuram a aba `'Substituto 1 (1)'` continuam passando: o nome da aba não mudou.

- [ ] **Passo 6: Portão, e2e e commit**

Run: `npm run check` e `npx playwright test`

```bash
printf '%s\n' 'feat(plano): topo da refeição com kcal e menu, opções em pílula' '' 'As kcal da opção aberta sobem para o topo, a lixeira vira o menu' '"Mais ações", as opções viram pílulas e as sugestões ficam numa' 'linha só que rola para o lado (CA-334 a CA-336).' '' 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>' > ../_msg.txt
git add src/ui/plano
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 10: Etapa 3 mais limpa

Cobre CA-337, CA-338, CA-339 (na tela), CB-75 e CB-76.

**Arquivos:**
- Alterar: `src/ui/adequacao/TelaAdequacao.tsx`, `src/ui/adequacao/TelaAdequacao.test.tsx`

**Interfaces:**
- Consome: `quantidadeNoPlano`, `valorDeReferencia` (Tarefa 1); `aoAbrirFontes` e a nota "Composição: Base MetaNutri" (Tarefa 5, mantidas como estão); `SeletorSegmentado` (`@ds/componentes/navigation/SeletorSegmentado.tsx`, props `rotulo`, `opcoes`, `valor`, `aoEscolher`, `className?`).
- O seletor continua com `role="radiogroup"` e os mesmos rótulos (`Individual (RDA, 90%)`, `Coletivo (EAR, 50%)`, `Personalizado`), então os testes que clicam nele não mudam.

- [ ] **Passo 1: Escrever os testes que falham**

Em `src/ui/adequacao/TelaAdequacao.test.tsx`:
1. No teste `'CA-25 e CA-33: …'`, troque

```tsx
    expect(ferro.getByText(/% \(meta/)).toBeInTheDocument()
    expect(ferro.getByText(/Abaixo da meta|Adequado|Acima do limite superior/)).toBeInTheDocument()
```

por

```tsx
    expect(ferro.getByText(/^\d+%( abaixo| · acima do limite)?$/)).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Estado' })).not.toBeInTheDocument()
```

2. No teste `'CA-26 e CA-27: …'`, troque `expect(linhaDe('Ferro').getByText(/meta 50%/)).toBeInTheDocument()` por `expect(screen.getByText(/meta de 50% da referência/)).toBeInTheDocument()`.
3. No teste `'CA-28: …'`, troque `expect(linhaDe('Ferro').getByText(/meta 70%/)).toBeInTheDocument()` por `expect(screen.getByText(/meta de 70% da referência/)).toBeInTheDocument()`.
4. No teste `'CB-05: …'`, troque `expect(linhaDe('Ferro').getByText(/^0% \(meta/)).toBeInTheDocument()` por `expect(linhaDe('Ferro').getByText('0% abaixo')).toBeInTheDocument()`.
5. Acrescente no fim do `describe('Etapa 3: adequação', …)`:

```tsx
  it('CA-337: a referência fica no topo da tabela e a meta aparece uma vez, no subtítulo', () => {
    montar(adulta, planoComArroz())
    const cartao = screen.getByRole('table').closest('[data-slot="card"]') as HTMLElement
    expect(within(cartao).getByRole('radiogroup', { name: 'Tipo de referência' })).toBeInTheDocument()
    expect(within(cartao).getByText('mulheres de 19 a 30 anos · meta de 90% da referência')).toBeInTheDocument()
    expect(screen.queryByText(/\(meta \d+%\)/)).not.toBeInTheDocument()
    expect(screen.queryByText('Referência da adequação')).not.toBeInTheDocument()
  })

  it('CA-338 e CA-339: colunas novas, referência como publicada e o tipo ao lado', () => {
    montar(adulta, planoComArroz())
    const cabecalhos = screen.getAllByRole('columnheader').map((c) => c.textContent)
    expect(cabecalhos).toEqual(['Nutriente', 'No plano', 'Referência', 'Adequação', 'Ações'])
    expect(linhaDe('Ferro').getByText('18 mg')).toBeInTheDocument()
    expect(linhaDe('Cálcio').getByText('1.000 mg')).toBeInTheDocument()
    expect(linhaDe('Ferro').getByText(/^\d+(,\d)? mg$|^< 0,1 mg$/)).toBeInTheDocument()
  })

  it('CB-75: em Personalizado, os campos aparecem logo abaixo do seletor', async () => {
    const usuario = montar(adulta, planoComArroz())
    await usuario.click(screen.getByRole('radio', { name: 'Personalizado' }))
    const seletor = screen.getByRole('radiogroup', { name: 'Tipo de referência' })
    const minimo = screen.getByLabelText('Mínimo da meta')
    expect(seletor.compareDocumentPosition(minimo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(minimo.compareDocumentPosition(screen.getByRole('table')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
```

(O cabeçalho "Ações" é o `sr-only` da última coluna, que já existe. O CB-76 já tem teste: o `'CA-32: …'` confere a marca † e a nota, e continua passando.)

- [ ] **Passo 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/adequacao/TelaAdequacao.test.tsx`
Expected: FAIL.

- [ ] **Passo 3: Implementar**

Em `src/ui/adequacao/TelaAdequacao.tsx`:
1. Nos imports:
   - apague `import { Badge } from '@ds/componentes/display/badge.tsx'` (o `GrupoOpcoes` fica: ainda serve ao RDA/EAR do Personalizado);
   - acrescente `import { quantidadeNoPlano, valorDeReferencia } from '@/domain/formatarQuantidade.ts'` e `import { SeletorSegmentado } from '@ds/componentes/navigation/SeletorSegmentado.tsx'`.
2. Apague as constantes `VARIANTE` e `ROTULO_ESTADO`. Mantenha `VARIANTE_BARRA` e acrescente:

```ts
/* O texto da adequação leva a mesma cor da barra: abaixo em âmbar, dentro em verde, acima do limite em vermelho. */
const COR_TEXTO: Record<EstadoAdequacao, string> = {
  adequado: 'text-successtext',
  abaixo: 'text-warningtext',
  'acima-limite': 'text-errortext',
}

function textoDaAdequacao(linha: LinhaAdequacao): string {
  const pct = `${formatarNumero(linha.adequacaoPct, 0)}%`
  if (linha.estado === 'abaixo') return `${pct} abaixo`
  if (linha.estado === 'acima-limite') return `${pct} · acima do limite`
  return pct
}
```

3. Troque a função `Linha` por:

```tsx
function Linha({ linha, aoCobrir }: { readonly linha: LinhaAdequacao; readonly aoCobrir: () => void }) {
  return (
    <TableRow>
      <TableCell>
        <span className="font-medium text-heading">{linha.rotulo}</span>
        {linha.notaLimite ? (
          <abbr title={linha.notaLimite} className="ml-0.5 cursor-help align-super text-[10px] font-semibold text-muted-foreground no-underline">
            ‡
          </abbr>
        ) : null}
      </TableCell>
      <TableCell className="numeros whitespace-nowrap">
        {`${quantidadeNoPlano(linha.total)} ${linha.unidade}`}
        {linha.semDado > 0 ? (
          <abbr
            title={`${linha.semDado} ${linha.semDado === 1 ? 'alimento do plano não tem' : 'alimentos do plano não têm'} este nutriente na tabela: total possivelmente subestimado.`}
            className="ml-0.5 cursor-help align-super text-[10px] font-semibold text-warningtext no-underline"
          >
            †
          </abbr>
        ) : null}
      </TableCell>
      <TableCell className="numeros whitespace-nowrap">
        {`${valorDeReferencia(linha.referencia.valor)} ${linha.unidade}`}
        <span className="ml-1.5 text-xs uppercase text-muted-foreground">{linha.referencia.tipo}</span>
      </TableCell>
      <TableCell className="min-w-36">
        <Progress value={linha.adequacaoPct} variant={VARIANTE_BARRA[linha.estado]} />
        <span className={`numeros mt-1 block whitespace-nowrap text-xs font-semibold ${COR_TEXTO[linha.estado]}`}>{textoDaAdequacao(linha)}</span>
      </TableCell>
      <TableCell>
        {linha.estado === 'abaixo' ? (
          <Button size="sm" variant="outline" onClick={aoCobrir} className="text-primary">
            Cobrir
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  )
}
```

4. No corpo de `TelaAdequacao`, logo depois de `const nomeAlimento = …`, acrescente:

```ts
  const metaPct = resultado.linhas[0]?.metaPct ?? null
  const subtitulo = [resultado.estagio ? descreverEstagio(resultado.estagio) : null, metaPct === null ? null : `meta de ${formatarNumero(metaPct, 0)}% da referência`]
    .filter((p): p is string => p !== null)
    .join(' · ')
```

5. Troque todo o `return (…)` até antes do `<GavetaCobrir` por um cartão só:

```tsx
  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Micronutrientes</CardTitle>
          {subtitulo ? <CardDescription>{subtitulo}</CardDescription> : null}
        </CardHeader>

        <SeletorSegmentado rotulo="Tipo de referência" opcoes={TIPO_PRESET} valor={prefs.preset.tipo} aoEscolher={trocarPreset} className="max-w-full overflow-x-auto" />

        {prefs.preset.tipo === 'personalizado' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <GrupoOpcoes<'rda' | 'ear'>
              rotulo="Referência"
              opcoes={[
                { valor: 'rda', rotulo: 'RDA' },
                { valor: 'ear', rotulo: 'EAR' },
              ]}
              valor={prefs.preset.referencia}
              aoEscolher={(referencia) => aoAlterarCaso({ adequacao: { ...prefs, preset: { ...prefs.preset, referencia } as PresetAdequacao } })}
            />
            <CampoNumero
              rotulo="Mínimo da meta"
              valor={prefs.preset.tipo === 'personalizado' ? prefs.preset.minimoPct : 90}
              aoMudar={(v) =>
                v !== null && v > 0 && aoAlterarCaso({ adequacao: { ...prefs, preset: { ...prefs.preset, minimoPct: v } as PresetAdequacao } })
              }
              sufixo="%"
            />
          </div>
        ) : null}

        {resultado.motivoSemCalculo ? (
          <Alert variant="warning">
            <TriangleAlert aria-hidden="true" />
            <p>{resultado.motivoSemCalculo}</p>
          </Alert>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nutriente</TableHead>
                    <TableHead>No plano</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Adequação</TableHead>
                    <TableHead>
                      <span className="sr-only">Ações</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultado.linhas.map((linha) => (
                    <Linha key={linha.chave} linha={linha} aoCobrir={() => setCobrindo(linha.chave)} />
                  ))}
                </TableBody>
              </Table>
            </div>

            <TableFootnotes>
              <p>
                <span className="mr-1 align-super text-[10px] font-semibold text-warningtext">†</span>
                Total possivelmente subestimado: algum alimento do plano não tem esse nutriente na tabela de composição. Falta de dado nunca entra como zero.
              </p>
              <p className="mt-1">
                <span className="mr-1 align-super text-[10px] font-semibold text-muted-foreground">‡</span>
                O limite superior da tabela não vale para a forma do nutriente presente nos alimentos; o texto completo aparece ao passar o cursor.
              </p>
              <p className="mt-1">
                Referência: <span className="uppercase">rda</span> no preset individual, <span className="uppercase">ear</span> no coletivo e{' '}
                <span className="uppercase">ai</span> quando o nutriente não tem nenhuma das duas.
              </p>
              <p className="mt-2">
                {`Composição: ${NOME_DA_BASE}`}
                {aoAbrirFontes ? (
                  <>
                    {' · '}
                    <button type="button" onClick={aoAbrirFontes} className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      Fontes da base
                    </button>
                  </>
                ) : null}
              </p>
              <p>{`Referências de ingestão: ${resultado.fonte}`}</p>
              {prefs.ocultos.length > 0 ? <p className="mt-1">{`Sugestões ocultas neste caso: ${prefs.ocultos.map(nomeAlimento).join(', ')}.`}</p> : null}
            </TableFootnotes>
          </>
        )}
      </Card>
```

É o mesmo rodapé de hoje, com a nota de composição que a Tarefa 5 deixou. O `TIPO_PRESET` continua igual. O `rotulo` do `SeletorSegmentado` é `ReactNode`, então aceita os textos de hoje.

- [ ] **Passo 4: Rodar e ver passar**

Run: `npx vitest run src/ui/adequacao src/domain/formatarQuantidade.test.ts`
Expected: PASS. Se o `'CA-338 e CA-339'` falhar no "1.000 mg", confira o rótulo do cálcio na tabela (`screen.debug(screen.getByRole('table'))`); a regra de formato está testada no domínio (Tarefa 1).

- [ ] **Passo 5: Portão, e2e e commit**

Run: `npm run check` e `npx playwright test`

```bash
printf '%s\n' 'feat(adequacao): referência no topo, meta no subtítulo e menos colunas' '' 'A escolha da referência entra no cartão da tabela, a meta aparece uma' 'vez, a coluna Estado sai e a adequação junta barra e texto. Números' 'como publicados (CA-337 a CA-339, CB-75, CB-76).' '' 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>' > ../_msg.txt
git add src/ui/adequacao
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 11: Tabela de alimentos mais limpa

Cobre CA-340, CA-341 e a parte da Tabela de alimentos do CA-321 e do CA-323.

**Arquivos:**
- Alterar: `src/ui/alimentos/TelaAlimentos.tsx`, `src/App.tsx`
- Criar: `src/ui/alimentos/TelaAlimentos.test.tsx`

**Interfaces:**
- Consome: `NOME_DA_BASE` (Tarefa 1).
- Produz: `TelaAlimentos({ aoAbrirFontes?: (() => void) | undefined })`.

- [ ] **Passo 1: Escrever o teste que falha**

Crie `src/ui/alimentos/TelaAlimentos.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TelaAlimentos } from './TelaAlimentos.tsx'

describe('Tabela de alimentos (US-B4)', () => {
  it('CA-321 e CA-323: topo diz Base MetaNutri e leva às fontes', async () => {
    const aoAbrirFontes = vi.fn()
    render(<TelaAlimentos aoAbrirFontes={aoAbrirFontes} />)
    expect(screen.getByText(/^Base MetaNutri · 597 alimentos · valores por 100 g/)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/TACO|POF|IBGE|NEPA|UNICAMP/)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Fontes da base' }))
    expect(aoAbrirFontes).toHaveBeenCalledOnce()
  })

  it('CA-340: grupo, ordem e completude são listas de escolha', async () => {
    render(<TelaAlimentos />)
    const usuario = userEvent.setup()
    expect(screen.getByRole('searchbox', { name: 'Buscar alimento na tabela' })).toBeInTheDocument()
    const grupo = screen.getByRole('combobox', { name: 'Grupo' })
    const ordem = screen.getByRole('combobox', { name: 'Ordem' })
    const completude = screen.getByRole('combobox', { name: 'Completude do dado' })
    expect(screen.queryByRole('button', { name: /^Todas · / })).not.toBeInTheDocument()

    await usuario.selectOptions(completude, 'minimo')
    const lista = within(screen.getByRole('list', { name: 'Alimentos da tabela' }))
    expect(lista.getAllByText(', dado mínimo').length).toBeGreaterThan(0)
    expect(lista.queryByText(', dado parcial')).not.toBeInTheDocument()

    await usuario.selectOptions(completude, '')
    await usuario.selectOptions(grupo, 'Cereais e derivados')
    await usuario.selectOptions(ordem, 'energia')
    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument()
  })

  it('CA-341: a linha mostra nome, grupo e kcal, e a legenda explica as marcas', () => {
    render(<TelaAlimentos />)
    const legenda = screen.getByRole('list', { name: 'Legenda' })
    expect(within(legenda).getByText('dado parcial')).toBeInTheDocument()
    expect(within(legenda).getByText('dado mínimo')).toBeInTheDocument()
    const primeira = within(screen.getByRole('list', { name: 'Alimentos da tabela' })).getAllByRole('listitem')[0] as HTMLElement
    expect(primeira.textContent).toMatch(/kcal|— kcal/)
    expect(primeira.querySelector('.text-muted-foreground')?.textContent).not.toBe('')
  })

  it('a ficha fala em Base MetaNutri, sem nome de origem', async () => {
    render(<TelaAlimentos />)
    const usuario = userEvent.setup()
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar alimento na tabela' }), 'arroz integral cozido')
    await usuario.click(within(screen.getByRole('list', { name: 'Alimentos da tabela' })).getAllByRole('button')[0] as HTMLElement)
    const ficha = within(screen.getByRole('dialog'))
    expect(ficha.getByText(/^Fonte: Base MetaNutri\./)).toBeInTheDocument()
    expect(ficha.queryByText(/TACO|POF|IBGE/)).not.toBeInTheDocument()
  })
})
```

(No teste, `matchMedia` não existe e a tela se comporta como celular: a ficha abre na gaveta, que é um `dialog`.)

- [ ] **Passo 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/alimentos`
Expected: FAIL.

- [ ] **Passo 3: Implementar**

Em `src/ui/alimentos/TelaAlimentos.tsx`:
1. Troque `import { ChevronRight, Search, X } from 'lucide-react'` por `import { ChevronRight, CircleDashed, Contrast, Search, X } from 'lucide-react'`, acrescente `import { NOME_DA_BASE } from '@/domain/baseMetanutri.ts'` e `import { Label } from '@ds/componentes/forms/label.tsx'`, e troque o import do card por `import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'` (fica igual: a ficha vazia ainda usa os quatro).
2. Troque `const NIVEIS` por:

```ts
const NIVEIS: readonly { readonly valor: NivelCompletude; readonly rotulo: string }[] = [
  { valor: 'completo', rotulo: 'Completos' },
  { valor: 'parcial', rotulo: 'Dado parcial' },
  { valor: 'minimo', rotulo: 'Dado mínimo' },
]

/** As listas de escolha usam o select do navegador, como o paciente da etapa 1 (Decisão 5). */
const SELECT = 'h-11 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
```

3. A assinatura da função vira:

```tsx
interface TelaAlimentosProps {
  /** Abre a página Fontes da base (CA-323). */
  readonly aoAbrirFontes?: (() => void) | undefined
}

export function TelaAlimentos({ aoAbrirFontes }: TelaAlimentosProps = {}) {
```

(mantenha o comentário de cima da função).

4. Troque o primeiro `<Card className="gap-4">…</Card>` (o dos filtros) inteiro por:

```tsx
        <Card className="gap-4">
          <p className="text-sm text-muted-foreground">
            {`${NOME_DA_BASE} · ${resumo.total} alimentos · valores por 100 g`}
            {aoAbrirFontes ? (
              <>
                {' · '}
                <button
                  type="button"
                  onClick={aoAbrirFontes}
                  className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Fontes da base
                </button>
              </>
            ) : null}
          </p>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="relative min-w-0 lg:flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                value={termo}
                onChange={(e) => mudarFiltro(() => setTermo(e.target.value))}
                placeholder="Buscar por nome: arroz integral, queijo minas…"
                aria-label="Buscar alimento na tabela"
                className="h-11 rounded-full pl-10"
              />
            </div>
            <div className="flex flex-col gap-1 lg:w-52">
              <Label htmlFor="filtro-grupo">Grupo</Label>
              <select id="filtro-grupo" value={categoria ?? ''} onChange={(e) => mudarFiltro(() => setCategoria(e.target.value || null))} className={SELECT}>
                <option value="">{`Todos · ${resumo.total}`}</option>
                {categorias.map((c) => (
                  <option key={c.nome} value={c.nome}>{`${c.nome} · ${c.quantos}`}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 lg:w-40">
              <Label htmlFor="filtro-ordem">Ordem</Label>
              <select id="filtro-ordem" value={ordem} onChange={(e) => setOrdem(e.target.value as OrdemCatalogo)} className={SELECT}>
                {ORDENS.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 lg:w-44">
              <Label htmlFor="filtro-completude">Completude do dado</Label>
              <select
                id="filtro-completude"
                value={nivel ?? ''}
                onChange={(e) => mudarFiltro(() => setNivel(e.target.value === '' ? null : (e.target.value as NivelCompletude)))}
                className={SELECT}
              >
                <option value="">Todos</option>
                {NIVEIS.map((n) => (
                  <option key={n.valor} value={n.valor}>
                    {n.rotulo}
                  </option>
                ))}
              </select>
            </div>
            {temFiltro ? (
              <Button variant="ghost" size="sm" className="self-start lg:self-end" onClick={limpar}>
                <X aria-hidden="true" />
                Limpar filtros
              </Button>
            ) : null}
          </div>
        </Card>
```

(O `as OrdemCatalogo` e o `as NivelCompletude` vêm de um `select` cujas opções são exatamente esses valores.)

5. No segundo cartão, troque o cabeçalho da lista

```tsx
            <p className="rotulo">por 100 g</p>
```

por a legenda:

```tsx
            <ul aria-label="Legenda" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <li className="inline-flex items-center gap-1">
                <Contrast className="size-3.5 text-warningtext" aria-hidden="true" />
                dado parcial
              </li>
              <li className="inline-flex items-center gap-1">
                <CircleDashed className="size-3.5 text-errortext" aria-hidden="true" />
                dado mínimo
              </li>
            </ul>
```

e troque a `<div className="flex items-center justify-between gap-3 …">` desse cabeçalho para `flex flex-wrap items-center justify-between gap-3 …` (mesmas outras classes).

6. Troque o miolo do botão da linha (de `<div className="min-w-0 flex-1">` até o `</span>` do selo, inclusive) por:

```tsx
                      <p className="min-w-0 flex-1 text-sm">
                        <span className="line-clamp-2">
                          {a.descricao} <span className="text-xs text-muted-foreground">{a.categoria}</span>
                        </span>
                      </p>
                      {c.nivel === 'parcial' ? <Contrast className="size-3.5 shrink-0 text-warningtext" aria-hidden="true" /> : null}
                      {c.nivel === 'minimo' ? <CircleDashed className="size-3.5 shrink-0 text-errortext" aria-hidden="true" /> : null}
                      {c.nivel !== 'completo' ? <span className="sr-only">{`, ${ROTULO_NIVEL[c.nivel]}`}</span> : null}
```

7. Na ficha (`CorpoDaFicha`):
   - troque `<p className="rotulo mb-2">Medidas caseiras · POF/IBGE</p>` por `<p className="rotulo mb-2">Medidas caseiras</p>`;
   - troque `title="Não analisado pela TACO"` por `title="Não analisado"`;
   - troque o parágrafo final por:

```tsx
      <p className="text-xs text-muted-foreground">
        Fonte: {NOME_DA_BASE}. <strong>Tr</strong> é traço: medido e desprezível. “Não analisado” é falta de medição, não ausência do
        nutriente.
      </p>
```

   - troque o comentário `{/* Nome da TACO é longo … */}` por `{/* Nome da base é longo ("Arroz, integral, cozido"): duas linhas antes de cortar. */}` (ele sumiu no passo 6; se sobrou, ajuste).

8. Apague `SELO` só se não sobrar uso: a ficha ainda usa `SELO[c.nivel]` no "N de 20 nutrientes" — **mantenha**.

Em `src/App.tsx`, troque `<TelaAlimentos />` por `<TelaAlimentos aoAbrirFontes={() => navegar({ tela: 'fontes' })} />`.

- [ ] **Passo 4: Rodar e ver passar**

Run: `npx vitest run src/ui/alimentos src/App.test.tsx`
Expected: PASS. Confira que a interface não cita mais as fontes de origem fora da página delas:
`grep -rn "TACO\|POF\|IBGE\|NEPA\|UNICAMP" src --include=*.tsx | grep -v "\.test\.\|TelaFontes\|^\S*: *//\|{/\*"` não pode mostrar texto de tela.

- [ ] **Passo 5: Portão, e2e e commit**

Run: `npm run check` e `npx playwright test`

```bash
printf '%s\n' 'feat(alimentos): filtros em listas de escolha e marcas de completude' '' 'Busca, grupo, ordem e completude numa linha, a linha do alimento com' 'o grupo apagado ao lado e uma marca para dado parcial ou mínimo, com' 'legenda; a base aparece como Base MetaNutri (CA-321, CA-323, CA-340,' 'CA-341).' '' 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>' > ../_msg.txt
git add src/ui/alimentos src/App.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 12: e2e e documentação

Cobre, no navegador de verdade, o CA-311, o CA-317, o CA-322, o CA-325 e o CA-336; registra D-48 a D-54.

**Arquivos:**
- Alterar: `e2e/planejador.spec.ts`, `e2e/publico.spec.ts`
- Alterar: `docs/decisoes.md`, `docs/pendencias.md`

- [ ] **Passo 1: Os testes de ponta a ponta**

Em `e2e/planejador.spec.ts`, acrescente no fim (o arquivo já tem `abrirLimpo`, `test` e `expect`):

```ts
test('PDF: letra grande e lista de compras e trocas opcionais', async ({ page }) => {
  await abrirLimpo(page)
  await page.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' }).getByRole('button', { name: 'Entendi' }).click()
  await page.getByRole('button', { name: 'Novo plano' }).first().click()
  await page.getByRole('menuitem', { name: /Prescrição rápida/ }).click()
  await page.getByRole('button', { name: /Próxima etapa: Plano alimentar/ }).click()
  await page.getByRole('region', { name: 'Sugestões para o almoço' }).getByRole('button', { name: /^Adicionar / }).first().click()

  await page.getByRole('button', { name: 'Exportar' }).click()
  await page.getByRole('menuitem', { name: /Dieta para imprimir/ }).click()
  const janela = page.getByRole('dialog', { name: 'Dieta para imprimir' })
  await expect(janela.getByRole('heading', { name: 'Lista de compras' })).toHaveCount(0)

  // CA-317: marcar muda a prévia na hora.
  await janela.getByRole('switch', { name: 'Trocas' }).click()
  await expect(janela.getByRole('heading', { name: 'Trocas' })).toBeVisible()

  // CA-311: no papel, corpo com 10 pt ou mais e refeição com 14 pt ou mais (1 pt = 4/3 px).
  await page.emulateMedia({ media: 'print' })
  const almoco = janela.getByRole('region', { name: '12:00 Almoço' })
  const tamanho = async (alvo: ReturnType<typeof page.locator>) => Number.parseFloat(await alvo.evaluate((el) => getComputedStyle(el).fontSize))
  expect(await tamanho(almoco.getByRole('heading', { name: 'Almoço' }))).toBeGreaterThanOrEqual(18.66)
  expect(await tamanho(almoco.getByRole('listitem').first())).toBeGreaterThanOrEqual(13.33)
  await expect(almoco).not.toContainText('kcal')
  await page.emulateMedia({ media: 'screen' })
})

test('Painel: três números e o Novo plano no topo', async ({ page }) => {
  await abrirLimpo(page)
  await page.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' }).getByRole('button', { name: 'Entendi' }).click()
  await expect(page.getByRole('region', { name: 'Seus números' })).toBeVisible()
  await expect(page.getByText('Nenhum plano ainda.')).toBeVisible()
  await expect(page.getByText('Começar agora')).toHaveCount(0)
})

test('CA-336: em tela larga as sugestões também ficam numa linha só', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await abrirLimpo(page)
  await page.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' }).getByRole('button', { name: 'Entendi' }).click()
  await page.getByRole('button', { name: 'Novo plano' }).first().click()
  await page.getByRole('menuitem', { name: /Prescrição rápida/ }).click()
  await page.getByRole('button', { name: /Próxima etapa: Plano alimentar/ }).click()
  const sugestoes = page.getByRole('region', { name: 'Sugestões para o almoço' }).getByRole('button', { name: /^Adicionar / })
  const primeira = await sugestoes.first().boundingBox()
  const ultima = await sugestoes.last().boundingBox()
  expect(ultima?.y).toBe(primeira?.y)
})
```

O clique na primeira sugestão do almoço põe um alimento no Principal: é esse item que o CA-311 mede (cada alimento da folha é um `li`, da Tarefa 3).

Em `e2e/publico.spec.ts`, acrescente no fim:

```ts
test('CA-322: Fontes da base abre sem conta e cita as três fontes', async ({ page }) => {
  await page.goto('/#/fontes')
  await expect(page.getByRole('heading', { level: 1, name: 'Fontes da base' })).toBeVisible()
  await expect(page.getByRole('main').getByRole('link')).toHaveCount(3)
  await expect(page.getByText(/Tabela Brasileira de Composição de Alimentos \(TACO\)/)).toBeVisible()
})
```

(A `MolduraPublica` põe o conteúdo num `<main>`, e a página tem só os três links das fontes dentro dele.)

- [ ] **Passo 2: Rodar**

Run: `npx playwright test`
Expected: PASS, com os quatro testes novos.

- [ ] **Passo 3: Decisões e pendências**

Em `docs/decisoes.md`, acrescente uma linha no fim da tabela (depois da linha de 01/10/2026 do "Planejador com cadastro"):

```markdown
| 01/10/2026 | **PDF com design próprio e telas limpas** (D-48 a D-54 da `specs/pdf-e-telas-limpas/SPEC.md`, resumidas aqui): D-48 a dieta impressa tem letra de no mínimo 10 pt e só o que o paciente usa · D-49 lista de compras e trocas viram opcionais na janela de imprimir, desmarcadas na primeira vez · D-50 os nomes dos alimentos continuam os da base · D-51 a base aparece como "Base MetaNutri", e a página pública "Fontes da base" cita TACO, IBGE e Open Food Facts · D-52 Painel com três números, "Onde você parou" e "Precisa de atenção" · D-53 no planejador, campo que só vale para alguns casos só aparece nesses casos, e o opcional fica recolhido · D-54 nenhum cálculo muda | decisões suas de 01/10/2026, vistas no protótipo "PDF e telas limpas" | usuário |
```

Em `docs/pendencias.md`, logo antes de `## Já feito, só para você não procurar`, acrescente:

```markdown
### 10. O PDF da dieta precisa de uma impressão de verdade

A folha nova foi conferida na tela e no teste. Falta imprimir uma vez em papel, ou salvar
em PDF pelo Chrome, e olhar três coisas: as caixas cinza das opções saem no papel, nenhuma
refeição fica cortada entre duas páginas, e a linha fina do topo aparece da segunda página
em diante. No Firefox e no Safari essa linha pode não aparecer (R-28); o resto sai igual.

Os nomes dos alimentos no PDF continuam os da base ("Arroz, tipo 1, cozido"). Nomes mais
simples ficaram de fora desta parte (D-50) porque exigem revisar alimento por alimento.
```

E, na lista de `## Já feito, só para você não procurar`, acrescente ao fim do parágrafo de 01/10 (ou num parágrafo novo): `Desde 01/10 (parte 5): PDF da dieta com design próprio, lista de compras e trocas opcionais, Base MetaNutri com a página Fontes da base, Painel, planejador e Tabela de alimentos mais limpos.`

- [ ] **Passo 4: Portão final e commit**

Run: `npm run check` e `npx playwright test`

```bash
printf '%s\n' 'test(e2e): PDF, painel, sugestões e fontes da base; docs da parte 5' '' 'Confere no navegador o tamanho da letra impressa, as opções da janela' 'de imprimir, a página pública de fontes, o painel e as sugestões numa' 'linha só; registra D-48 a D-54 e a pendência da impressão em papel.' '' 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>' > ../_msg.txt
git add e2e docs/decisoes.md docs/pendencias.md
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

## Cobertura da spec

| Critério | Tarefa | Onde está o teste |
|---|---|---|
| CA-308 | 1, 3 | `formatarData.test.ts` (data por extenso), `FolhaDieta.test.tsx` |
| CA-309, CA-310 | 3 | `FolhaDieta.test.tsx` |
| CA-311 | 3, 12 | `FolhaDieta.test.tsx` (sem kcal), e2e "PDF: letra grande…" (tamanhos) |
| CA-312 | 2, 3 | `folhaDieta.test.ts` (lembretes), `FolhaDieta.test.tsx` |
| CA-313 | 2, 3 | `folhaDieta.test.ts` (quem assina), `FolhaDieta.test.tsx` |
| CA-314, CA-315 | 3 | `FolhaDieta.test.tsx` (ordem e classes de quebra) |
| CA-316 | 2, 3 | `folhaDieta.test.ts` (linha fina), `linhaFina.test.ts` |
| CA-317 | 4, 12 | `DialogoImprimir.test.tsx`, e2e "PDF: letra grande…" |
| CA-318, CA-319 | 3 | `FolhaDieta.test.tsx` |
| CA-320 | 2, 4 | `folhaDieta.test.ts`, `DialogoImprimir.test.tsx` |
| CA-321 | 3, 5, 11 | `FolhaDieta.test.tsx`, `TelaInicio.test.tsx`, `TelaAdequacao.test.tsx`, `TelaAlimentos.test.tsx` |
| CA-322 | 1, 5, 12 | `baseMetanutri.test.ts`, `TelaFontes.test.tsx`, `navegacao.test.ts`, `App.test.tsx`, e2e "CA-322" |
| CA-323 | 5, 11 | `MolduraPublica.test.tsx`, `TelaAjuda.test.tsx`, `TelaAdequacao.test.tsx` (nota), `TelaAlimentos.test.tsx` |
| CA-324 | 6 | `App.test.tsx` "CA-324" |
| CA-325 | 6, 12 | `TelaPainel.test.tsx`, e2e "Painel" |
| CA-326, CA-327, CA-328 | 6 | `TelaPainel.test.tsx` |
| CA-329, CA-330, CA-331, CA-332 | 7 | `etapa1.test.tsx`, `camposVisiveis.test.ts` |
| CA-333 | 7, 8 | `etapa1.test.tsx` (avaliação numa linha), `ResumoDoDia.test.tsx` |
| CA-334, CA-335 | 9 | `TelaPlano.test.tsx`, `DialogoSubstituto.test.tsx` (nome da aba) |
| CA-336 | 9, 12 | `TelaPlano.test.tsx`, e2e de celular (já existe) e de tela larga |
| CA-337, CA-338 | 10 | `TelaAdequacao.test.tsx` |
| CA-339 | 1, 10 | `formatarQuantidade.test.ts`, `TelaAdequacao.test.tsx` |
| CA-340, CA-341 | 11 | `TelaAlimentos.test.tsx` |
| CB-71 | 3 | `FolhaDieta.test.tsx` |
| CB-72 | 2, 4 | `folhaDieta.test.ts` (armazenamento nulo e que falha) |
| CB-73 | 7 | `camposVisiveis.test.ts`, `etapa1.test.tsx` |
| CB-74 | 7 | `camposVisiveis.test.ts`, `TelaCaso.test.tsx` |
| CB-75 | 10 | `TelaAdequacao.test.tsx` "CB-75" |
| CB-76 | 10 | `TelaAdequacao.test.tsx` "CA-32" (já existe, continua) |
| CB-77 | 3 | `FolhaDieta.test.tsx` (a folha não depende da linha fina) |
