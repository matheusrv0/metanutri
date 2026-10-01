# Planejador com cadastro · Plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa por tarefa. Os passos usam caixa (`- [ ]`) para acompanhar.

**Objetivo:** o planejador preenche sozinho o que já sabe (meta de energia, quem assina, alimentos de todo dia) e tira do caminho o que só serve ao estágio de uma faculdade.

**Arquitetura:** três peças de domínio novas ou ampliadas, todas puras e testadas: a meta do modo rápido sai do mesmo `calcularEnergia` do atendimento completo (`src/domain/energia.ts`); as sugestões por tipo de refeição moram em `src/domain/sugestoes.ts` (tipo pelo nome ou horário, lista padrão, repositório no aparelho); e `src/domain/assinaturaDoPlano.ts` diz quem assina e o que a situação esconde ou mostra. As telas só leem essas peças: `TelaCaso` ganha o nível de atividade, a meta com selo e a Identificação pela situação; `TelaPlano` guarda as listas de sugestões e cada `CartaoRefeicao` mostra as suas, com o diálogo de edição; o Word recebe a linha da nutricionista e a opção de sair sem receitas. O `App` monta a assinatura uma vez e entrega para o plano, o Word e o plano novo.

**Stack:** React 18 + TypeScript strict + Vite + Tailwind v4 + shadcn/ui · Vitest + Testing Library · Playwright.

**Spec:** `specs/ajustes-de-uso/SPEC.md` (aprovada em 01/10/2026). Telas aprovadas no protótipo "Planejador com cadastro" (`https://claude.ai/code/artifact/2cf6d404-a9ba-422c-abe7-017bc4cad319`).

## Restrições globais

- Nenhuma dependência nova.
- Import do design system pelo alias `@ds/...`; do domínio, `@/domain/...`.
- Componentes funcionais, um por arquivo, export nomeado. `exactOptionalPropertyTypes` está ligado: prop opcional é `readonly x?: T | undefined`, e prop opcional sem `| undefined` (como o `placeholder` do `CampoTexto`) só recebe valor por espalhamento condicional.
- `noUncheckedIndexedAccess` está ligado: `lista[i]` é `T | undefined`.
- Lint (`tseslint.configs.strict`): nada de `delete objeto[variavel]` (`no-dynamic-delete`), nada de cor hexadecimal nem `font-family` soltos.
- Toque mínimo de 44 px: botão de texto usa `inline-flex min-h-11 items-center`; botão de ícone usa o `size="icon"` do `Button` (`size-11 sm:size-10`).
- Texto de interface em português do Brasil, simples. Rótulos de nível de atividade no formato que o app já usa: `Sedentário (1,2)`, `Pouco ativo (1,37)`, `Moderadamente ativo (1,55)`, `Muito ativo (1,7)`, `Extremamente ativo (1,9)`. Os fatores são os de `NIVEIS_ATIVIDADE`, que já estão no código: não mudam.
- "Sugestões para o almoço" concorda em gênero: o desjejum, o lanche, o almoço, o jantar, **a** ceia.
- Laranja nunca carrega texto nem entra em painel de dado.
- Toda tarefa termina com `npm run check` verde (lint, typecheck e testes). Tarefa que mexe em tela roda também `npx playwright test`.
- Commit em Conventional Commits, em português, com a mensagem num arquivo UTF-8 terminado pela linha `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Comando: `git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt`.

## Foco de revisão

1. **Apagar a meta digitada para escrever outra.** Quem apaga o campo e começa a digitar não pode ver o número calculado voltar para dentro do campo no meio da digitação, e "1800," (vírgula sem decimal ainda) não pode sumir. Teste na Tarefa 2.
2. **Renomear a refeição ou mudar o horário.** "Lanche da tarde" renomeado para "Jantar cedo" passa a sugerir o jantar na hora; "Nova refeição" às 10:00 sugere lanche e, mudada para 19:30, sugere jantar. Teste na Tarefa 4.
3. **Lista de sugestões estragada no aparelho** (JSON quebrado, lista que não é lista, item com id de texto, gramas zero ou negativas, tipo desconhecido). O app usa a lista padrão daquele tipo e não quebra. Teste na Tarefa 3.
4. **Horário ilegível num plano importado** (`''`, `'25:00'`). Conta como almoço, sem erro. Teste na Tarefa 3.
5. **Nutricionista sem nome e CRN em Configurações** (modo sem servidor). O plano diz que falta e manda preencher em Configurações › Quem assina, em vez de mostrar "Assina este plano:" vazio. Teste na Tarefa 8.

## Decisões que tomei e você revisa

1. **A meta calculada aparece dentro do campo como texto-guia** (o número em cinza), com o selo "calculada" ao lado. Ela só vira número seu quando você digita. Se o calculado fosse o valor do campo, apagar o campo o devolveria na hora, e não daria para digitar do zero (Foco 1).
2. **Mudar a ordem das sugestões é por botões de subir e descer**, não por arrastar como o protótipo sugeria. Arrastar precisaria de biblioteca nova ou funcionaria mal no celular e no teclado.
3. **"Adicionar" na edição põe o primeiro resultado da busca**, e antes do clique a tela mostra "Vai entrar: Feijão, preto, cozido — 1 concha · 140 g". Assim ninguém acrescenta o alimento errado sem ver.
4. **O mesmo alimento não entra duas vezes na lista**: a tela diz "Esse alimento já está na lista."
5. **CA-306 mudou e precisa do seu ok:** com a lista vazia, fica o link "Editar sugestões". Sem ele, quem esvaziasse a lista não teria como montá-la de novo. A SPEC já está com o texto novo.
6. **Horário ilegível conta como almoço** (Foco 4).
7. **"Voltar à lista padrão" e Salvar guardam "usar a padrão"**, não uma cópia dela. Quando a nutricionista revisar a lista padrão (R-20), quem voltou para ela recebe a revisão.
8. **As listas de sugestões entram no backup e no "apagar dados do aparelho"**, como os planos.
9. **O nome do ovo na tabela 3.1 foi corrigido** para o da base: "Ovo, de galinha, inteiro, cozido/10minutos". A SPEC já está corrigida.
10. **A medida caseira mostrada vem da conversão de sempre do app**, a mesma das linhas do plano. Dois itens da lista padrão leem estranho: tomate 80 g vira "5 fatias e meia" e iogurte 200 g vira "1 copo americano e meio". Fica para a revisão da nutricionista (R-20), em `docs/pendencias.md`.

---

## Ordem e dependências

| # | Tarefa | Depende de |
|---|---|---|
| 1 | Domínio: meta calculada no modo rápido | — |
| 2 | Tela: nível de atividade e meta com selo | 1 |
| 3 | Domínio: sugestões por tipo de refeição | — |
| 4 | Sugestões na refeição, sem o "Você usa muito" | 3 |
| 5 | Editar as sugestões | 4 |
| 6 | Domínio: quem assina o plano | — |
| 7 | Word sem receitas e assinado pela nutricionista | 6 |
| 8 | Identificação e Orientações pela situação, montagem no App | 6, 7 |
| 9 | e2e e documentação | 2, 5, 8 |

## Mapa de arquivos

**Criar**
- `src/domain/sugestoes.ts` (+ teste), `src/domain/assinaturaDoPlano.ts` (+ teste)
- `src/ui/caso/CampoNivelAtividade.tsx`, `src/ui/caso/CampoMetaEnergia.tsx`, `src/ui/caso/nivelAtividade.test.tsx`, `src/ui/caso/situacaoNoPlano.test.tsx`
- `src/ui/estado/usarSugestoes.ts`
- `src/ui/plano/SugestoesDaRefeicao.tsx`, `src/ui/plano/DialogoSugestoes.tsx` (+ teste)
- `src/ui/exportar/MenuExportarAssinatura.test.tsx`

**Alterar**
- `src/domain/energia.ts` (+ teste), `src/domain/perfil.ts`
- `design-system/componentes/forms/CampoNumero.tsx`
- `src/ui/caso/TelaCaso.tsx`, `src/ui/caso/modoRapido.test.tsx`
- `src/ui/resumo/AjusteEnergia.tsx`, `src/ui/resumo/ResumoDoDia.tsx` (+ teste)
- `src/ui/plano/EntradaRapida.tsx` (+ teste), `src/ui/plano/CartaoRefeicao.tsx`, `src/ui/plano/TelaPlano.tsx` (+ teste)
- `src/export/aconselhamento-docx.ts`, `src/export/docx.test.ts`, `src/ui/exportar/MenuExportar.tsx`
- `src/App.tsx`, `src/App.test.tsx`
- `e2e/planejador.spec.ts`, `docs/decisoes.md`, `docs/pendencias.md`

**Apagar**
- `src/domain/frequentes.ts`, `src/domain/frequentes.test.ts`

---

### Tarefa 1: Domínio: meta calculada no modo rápido

Cobre D-32, CA-226 a CA-230 e CB-56 do lado do cálculo.

**Arquivos:**
- Alterar: `src/domain/energia.ts`
- Alterar: `src/domain/energia.test.ts`

**Interfaces:**
- Produz:
  - `calcularEnergia(caso, opcoes)` com o comportamento novo no modo rápido: meta digitada vale (`getManual: true`, `metodo: null`); sem meta, devolve o resultado do atendimento completo (`getManual: false`); sem dados, `get: null` e `motivoSemCalculo` com o que falta ("Informe peso e estatura para calcular a meta.").
  - `type EstadoMeta = { tipo: 'calculada'; kcal: number } | { tipo: 'digitada'; kcal: number; calculada: number | null } | { tipo: 'sem-calculo'; motivo: string }`
  - `estadoDaMeta(caso: Caso): EstadoMeta` (usa `caso.energia.fator` e `caso.energia.formula`).

- [ ] **Passo 1: Escrever os testes que falham**

Em `src/domain/energia.test.ts`, troque a linha de import de `./energia.ts` por:

```ts
import { calcularEnergia, categoriaDoFator, estadoDaMeta, NIVEIS_ATIVIDADE, percentualDoGasto } from './energia.ts'
```

E acrescente no fim do arquivo:

```ts
describe('prescrição rápida: meta calculada (CA-226 a CA-230, CB-56)', () => {
  // 10×62 + 6,25×163 − 5×28 − 161 = 1337,75
  const rapida = (p: Partial<Caso> = {}) => caso({ modo: 'rapido', sexo: 'F', idadeAnos: 28, pesoKg: 62, estaturaCm: 163, ...p })

  it('CA-226: sem meta digitada, calcula como o atendimento completo', () => {
    const r = calcularEnergia(rapida(), { fator: 1.55 })
    expect(r.get).toBeCloseTo(1337.75 * 1.55, 6)
    expect(r.getManual).toBe(false)
    expect(r.metodo).toBe('mifflin')
    expect(r.tmb).toBeCloseTo(1337.75, 6)
    expect(r.motivoSemCalculo).toBeNull()
    expect(r.get).toBe(calcularEnergia(rapida({ modo: 'completo' }), { fator: 1.55 }).get)
  })

  it('CA-227: fator e peso mudam a meta calculada', () => {
    expect(calcularEnergia(rapida(), { fator: 1.2 }).get).toBeCloseTo(1337.75 * 1.2, 6)
    expect(calcularEnergia(rapida({ pesoKg: 70 }), { fator: 1.55 }).get).toBeCloseTo(1417.75 * 1.55, 6)
  })

  it('CA-228: o número digitado vale mais que o calculado', () => {
    const r = calcularEnergia(rapida({ metaEnergiaKcal: 1800 }), { fator: 1.9 })
    expect(r.get).toBe(1800)
    expect(r.getManual).toBe(true)
    expect(r.metodo).toBeNull()
    expect(r.motivoSemCalculo).toBeNull()
  })

  it('CA-230: sem peso ou estatura, diz o que falta', () => {
    expect(calcularEnergia(rapida({ pesoKg: null, estaturaCm: null }), { fator: 1.2 }).motivoSemCalculo).toBe(
      'Informe peso e estatura para calcular a meta.',
    )
    expect(calcularEnergia(rapida({ pesoKg: null }), { fator: 1.2 }).motivoSemCalculo).toBe('Informe peso para calcular a meta.')
    expect(calcularEnergia(rapida({ sexo: null, pesoKg: null, estaturaCm: null }), { fator: 1.2 }).motivoSemCalculo).toBe(
      'Informe sexo, peso e estatura para calcular a meta.',
    )
    expect(calcularEnergia(rapida({ pesoKg: null }), { fator: 1.2 }).get).toBeNull()
  })

  it('CB-56: dado que o cálculo não aceita dá o mesmo motivo do atendimento completo', () => {
    const r = calcularEnergia(rapida({ idadeAnos: 0 }), { fator: 1.2 })
    const completo = calcularEnergia(rapida({ idadeAnos: 0, modo: 'completo' }), { fator: 1.2 })
    expect(r.get).toBeNull()
    expect(r.motivoSemCalculo).toBe(completo.motivoSemCalculo)
    expect(r.motivoSemCalculo).not.toBeNull()
  })
})

describe('estadoDaMeta (CA-226 a CA-230)', () => {
  const rapida = (p: Partial<Caso> = {}) =>
    caso({ modo: 'rapido', sexo: 'F', idadeAnos: 28, pesoKg: 62, estaturaCm: 163, energia: { fator: 1.55, formula: 'mifflin', getManual: null }, ...p })

  it('calculada quando há dados e nada foi digitado', () => {
    expect(estadoDaMeta(rapida())).toEqual({ tipo: 'calculada', kcal: expect.closeTo(2073.5125, 6) })
  })

  it('digitada, lembrando quanto daria a calculada', () => {
    expect(estadoDaMeta(rapida({ metaEnergiaKcal: 1800 }))).toEqual({ tipo: 'digitada', kcal: 1800, calculada: expect.closeTo(2073.5125, 6) })
  })

  it('digitada sem dados para calcular', () => {
    expect(estadoDaMeta(rapida({ metaEnergiaKcal: 1800, pesoKg: null }))).toEqual({ tipo: 'digitada', kcal: 1800, calculada: null })
  })

  it('sem cálculo, com o motivo', () => {
    expect(estadoDaMeta(rapida({ pesoKg: null, estaturaCm: null }))).toEqual({
      tipo: 'sem-calculo',
      motivo: 'Informe peso e estatura para calcular a meta.',
    })
  })
})
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/energia.test.ts`
Expected: FAIL — `estadoDaMeta` não existe, e a meta do modo rápido sem número digitado vem `null`.

- [ ] **Passo 3: Implementar**

Em `src/domain/energia.ts`, logo depois da constante `ROTULO_IMC`, acrescente:

```ts
/** Nome de cada dado que falta, como aparece na tela. */
const NOMES_CAMPO: Readonly<Record<string, string>> = { sexo: 'sexo', idadeAnos: 'idade', pesoKg: 'peso', estaturaCm: 'estatura' }

/** "peso e estatura", "sexo, peso e estatura". */
function juntar(itens: readonly string[]): string {
  if (itens.length <= 1) return itens.join('')
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1] ?? ''}`
}

/** CA-230: o que falta para calcular a meta do modo rápido; `null` quando não falta nada (o problema é outro, CB-56). */
function motivoDaMetaRapida(caso: Caso): string | null {
  const { faltando } = validarCaso({ ...caso, modo: 'completo' })
  if (faltando.length === 0) return null
  return `Informe ${juntar(faltando.map((c) => NOMES_CAMPO[c] ?? c))} para calcular a meta.`
}
```

Troque o bloco inteiro da prescrição rápida:

```ts
  // Prescrição rápida: a meta digitada é o gasto do dia; nenhuma fórmula é aplicada.
  if (caso.modo === 'rapido' && manual === null) {
    const meta = caso.metaEnergiaKcal
    return {
      metodo: null,
      tmb: null,
      fator: opcoes.fator,
      categoriaAtividade: null,
      adicionais: [],
      get: meta,
      getManual: meta !== null,
      fonte: null,
      avisos,
      motivoSemCalculo: meta === null ? 'Informe a meta de energia para acompanhar quanto o plano já cobre.' : null,
    }
  }
```

por:

```ts
  // Prescrição rápida: a meta digitada vale mais; sem ela, a meta sai do mesmo cálculo do atendimento completo (D-32).
  if (caso.modo === 'rapido' && manual === null) {
    const meta = caso.metaEnergiaKcal
    if (meta !== null) {
      return {
        metodo: null,
        tmb: null,
        fator: opcoes.fator,
        categoriaAtividade: null,
        adicionais: [],
        get: meta,
        getManual: true,
        fonte: null,
        avisos,
        motivoSemCalculo: null,
      }
    }
    const calculada = calcularEnergia({ ...caso, modo: 'completo' }, opcoes)
    if (calculada.get !== null) return calculada
    return { ...calculada, motivoSemCalculo: motivoDaMetaRapida(caso) ?? calculada.motivoSemCalculo }
  }
```

No bloco "sem dados" logo abaixo, troque:

```ts
    const nomes: Record<string, string> = { sexo: 'sexo', idadeAnos: 'idade', pesoKg: 'peso', estaturaCm: 'estatura' }
    const faltando = validacao.faltando.map((c) => nomes[c] ?? c)
```

por:

```ts
    const faltando = validacao.faltando.map((c) => NOMES_CAMPO[c] ?? c)
```

(a mensagem do atendimento completo, "Informe peso, estatura para calcular a energia.", fica como está: há teste que depende dela.)

No fim do arquivo, acrescente:

```ts
/** Como está a meta de energia da prescrição rápida (CA-226 a CA-230). */
export type EstadoMeta =
  | { readonly tipo: 'calculada'; readonly kcal: number }
  | { readonly tipo: 'digitada'; readonly kcal: number; readonly calculada: number | null }
  | { readonly tipo: 'sem-calculo'; readonly motivo: string }

export function estadoDaMeta(caso: Caso): EstadoMeta {
  const semMeta = calcularEnergia({ ...caso, modo: 'rapido', metaEnergiaKcal: null }, { fator: caso.energia.fator, formula: caso.energia.formula })
  if (caso.metaEnergiaKcal !== null) return { tipo: 'digitada', kcal: caso.metaEnergiaKcal, calculada: semMeta.get }
  if (semMeta.get !== null) return { tipo: 'calculada', kcal: semMeta.get }
  return { tipo: 'sem-calculo', motivo: semMeta.motivoSemCalculo ?? '' }
}
```

- [ ] **Passo 4: Rodar e ver passar**

Run: `npx vitest run src/domain/energia.test.ts src/ui/caso/modoRapido.test.tsx`
Expected: PASS (o `modoRapido.test.tsx` antigo continua verde: a meta digitada segue valendo).

- [ ] **Passo 5: Portão e commit**

Run: `npm run check`
Expected: lint, tipos e testes verdes.

```bash
printf '%s\n' 'feat(energia): meta do modo rápido calculada quando há dados' '' 'Sem meta digitada, o modo rápido usa o mesmo cálculo do atendimento' 'completo; sem peso ou estatura, diz o que falta (CA-226 a CA-230, CB-56).' '' 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>' > ../_msg.txt
git add src/domain/energia.ts src/domain/energia.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 2: Tela: nível de atividade e meta com selo

Cobre CA-225 a CA-233 na tela, e o Foco de revisão 1.

**Arquivos:**
- Alterar: `design-system/componentes/forms/CampoNumero.tsx`
- Criar: `src/ui/caso/CampoNivelAtividade.tsx`
- Criar: `src/ui/caso/CampoMetaEnergia.tsx`
- Alterar: `src/ui/caso/TelaCaso.tsx`
- Alterar: `src/ui/resumo/AjusteEnergia.tsx`
- Alterar: `src/ui/resumo/ResumoDoDia.tsx`
- Alterar: `src/ui/caso/modoRapido.test.tsx`
- Criar: `src/ui/caso/nivelAtividade.test.tsx`
- Alterar: `src/ui/resumo/ResumoDoDia.test.tsx`

**Interfaces:**
- Consome: `estadoDaMeta`, `NIVEIS_ATIVIDADE` (Tarefa 1 e o que já existe).
- Produz:
  - `CampoNumero` aceita `placeholder?: string | undefined`.
  - `CampoNivelAtividade({ fator: number; aoEscolher: (fator: number) => void })` — radiogroup "Nível de atividade".
  - `CampoMetaEnergia({ caso: Caso; aoMudar: (meta: number | null) => void; erro?: string | undefined })` — campo "Meta de energia" com selo.

- [ ] **Passo 1: Escrever os testes que falham**

Em `src/ui/caso/modoRapido.test.tsx`, acrescente no fim:

```tsx
describe('Meta de energia no modo rápido (CA-225 a CA-230, CA-232, CA-233)', () => {
  const comMedidas: Partial<Caso> = { ...rapido, pesoKg: 62, estaturaCm: 163, energia: { fator: 1.55, formula: 'mifflin', getManual: null } }
  const meta = () => screen.getByLabelText('Meta de energia')

  it('CA-225: o nível de atividade vem logo depois de peso e estatura, com o fator de cada um', () => {
    montar(rapido)
    const grupo = screen.getByRole('radiogroup', { name: 'Nível de atividade' })
    expect(within(grupo).getAllByRole('radio').map((r) => r.textContent)).toEqual([
      'Sedentário (1,2)',
      'Pouco ativo (1,37)',
      'Moderadamente ativo (1,55)',
      'Muito ativo (1,7)',
      'Extremamente ativo (1,9)',
    ])
    expect(screen.getByLabelText('Estatura').compareDocumentPosition(grupo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('CA-226: com sexo, idade, peso e estatura, a meta aparece calculada', () => {
    montar(comMedidas)
    expect(meta()).toHaveValue('')
    expect(meta()).toHaveAttribute('placeholder', '2.074')
    expect(screen.getByText('calculada')).toBeInTheDocument()
  })

  it('CA-227: trocar o nível ou o peso muda a meta na hora', async () => {
    const usuario = montar(comMedidas)
    await usuario.click(screen.getByRole('radio', { name: 'Sedentário (1,2)' }))
    expect(meta()).toHaveAttribute('placeholder', '1.605')
    await usuario.clear(screen.getByLabelText('Peso'))
    await usuario.type(screen.getByLabelText('Peso'), '70')
    expect(meta()).toHaveAttribute('placeholder', '1.701')
  })

  it('CA-228: o número digitado vale mais, e mudar o nível não o altera', async () => {
    const usuario = montar(comMedidas)
    await usuario.type(meta(), '1800')
    expect(screen.getByText('definida por você')).toBeInTheDocument()
    expect(screen.getByText('Vale o seu número. Apague o campo para voltar à calculada (2.074 kcal).')).toBeInTheDocument()
    await usuario.click(screen.getByRole('radio', { name: 'Muito ativo (1,7)' }))
    expect(meta()).toHaveValue('1800')
  })

  it('CA-229: apagar a meta digitada volta à calculada', async () => {
    const usuario = montar({ ...comMedidas, metaEnergiaKcal: 1800 })
    await usuario.clear(meta())
    expect(meta()).toHaveValue('')
    expect(meta()).toHaveAttribute('placeholder', '2.074')
    expect(screen.getByText('calculada')).toBeInTheDocument()
  })

  it('CA-230: sem peso ou estatura, o nível continua e a tela diz o que falta', () => {
    montar(rapido)
    expect(screen.getByRole('radiogroup', { name: 'Nível de atividade' })).toBeInTheDocument()
    expect(screen.getByText('Informe peso e estatura para calcular a meta.')).toBeInTheDocument()
    expect(meta()).toHaveAttribute('placeholder', 'Digite a meta')
  })

  it('CA-232: fator próprio não marca nenhuma opção e aparece escrito', async () => {
    const usuario = montar({ ...rapido, energia: { fator: 1.45, formula: 'mifflin', getManual: null } })
    const niveis = within(screen.getByRole('radiogroup', { name: 'Nível de atividade' }))
    expect(niveis.getAllByRole('radio').filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(0)
    expect(screen.getByText('Fator próprio: 1,45')).toBeInTheDocument()
    await usuario.click(niveis.getByRole('radio', { name: 'Pouco ativo (1,37)' }))
    expect(niveis.getByRole('radio', { name: 'Pouco ativo (1,37)' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByText('Fator próprio: 1,45')).not.toBeInTheDocument()
  })

  it('CA-233: com peso e estatura, o modo rápido continua sem IMC', () => {
    montar(comMedidas)
    expect(screen.queryByText(/kg\/m²/)).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Avaliação antropométrica' })).not.toBeInTheDocument()
  })

  it('Foco de revisão 1: vírgula sem decimal fica, e apagar tudo não devolve número ao campo', async () => {
    const usuario = montar(comMedidas)
    await usuario.type(meta(), '1800,')
    expect(meta()).toHaveValue('1800,')
    await usuario.clear(meta())
    expect(meta()).toHaveValue('')
    await usuario.type(meta(), '2')
    expect(meta()).toHaveValue('2')
  })
})
```

Crie `src/ui/caso/nivelAtividade.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { criarCasoVazio } from '@/domain/caso.ts'
import { criarPlanoPadrao } from '@/domain/plano.ts'
import type { Caso } from '@/domain/tipos.ts'
import { ResumoDoDia } from '../resumo/ResumoDoDia.tsx'
import { TelaCaso } from './TelaCaso.tsx'

let n = 0
const ids = () => `id${++n}`
const plano = criarPlanoPadrao(ids)

function Anfitriao() {
  const [caso, setCaso] = useState<Caso>({ ...criarCasoVazio('c1'), sexo: 'F', idadeAnos: 28, pesoKg: 60, estaturaCm: 165 })
  const alterar = (m: Partial<Caso>) => setCaso((c) => ({ ...c, ...m }))
  return <TelaCaso caso={caso} aoAlterar={alterar} lateral={<ResumoDoDia caso={caso} plano={plano} aoAlterar={alterar} />} />
}

describe('Nível de atividade no atendimento completo (CA-225, CA-231)', () => {
  it('CA-225: aparece no cartão de medidas', () => {
    render(<Anfitriao />)
    expect(screen.getAllByRole('radiogroup', { name: 'Nível de atividade' })).toHaveLength(1)
  })

  it('CA-231: escolher no cartão muda o GET, e o Ajustar mostra o mesmo nível', async () => {
    render(<Anfitriao />)
    const usuario = userEvent.setup()
    const resumo = within(screen.getByRole('region', { name: 'Resumo do dia' }))
    expect(resumo.getByText('1.596 kcal')).toBeInTheDocument() // 1330,25 × 1,2
    await usuario.click(screen.getByRole('radio', { name: 'Muito ativo (1,7)' }))
    expect(resumo.getByText('2.261 kcal')).toBeInTheDocument() // 1330,25 × 1,7 = 2261,4
    await usuario.click(resumo.getByRole('button', { name: 'Ajustar' }))
    const noAjuste = within(resumo.getByRole('radiogroup', { name: 'Nível de atividade' }))
    expect(noAjuste.getByRole('radio', { name: 'Muito ativo (1,7)' })).toHaveAttribute('aria-checked', 'true')
  })
})
```

Em `src/ui/resumo/ResumoDoDia.test.tsx`, acrescente no fim:

```tsx
describe('Resumo do dia no modo rápido (CA-226, CA-228)', () => {
  it('mostra a meta calculada e o fator', () => {
    montar({ ...adulta, modo: 'rapido' })
    expect(resumo().getByText('Meta calculada')).toBeInTheDocument()
    expect(resumo().getByText('1.596 kcal')).toBeInTheDocument()
    expect(resumo().getByText('Fator de atividade')).toBeInTheDocument()
  })

  it('a meta digitada aparece como definida por você', () => {
    montar({ ...adulta, modo: 'rapido', metaEnergiaKcal: 1800 })
    expect(resumo().getByText('Meta definida por você')).toBeInTheDocument()
    expect(resumo().getByText('1.800 kcal')).toBeInTheDocument()
    expect(resumo().queryByText('Fator de atividade')).not.toBeInTheDocument()
  })
})
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/caso src/ui/resumo`
Expected: FAIL — não existe o radiogroup "Nível de atividade" no cartão, nem o selo, nem os rótulos de meta no Resumo.

- [ ] **Passo 3: `placeholder` no `CampoNumero`**

Em `design-system/componentes/forms/CampoNumero.tsx`, acrescente na interface, depois de `rotuloOculto`:

```ts
  /** Texto-guia do campo vazio (ex.: a meta calculada, que só vira número quando a pessoa digita). */
  readonly placeholder?: string | undefined
```

Troque a assinatura e o `CampoTexto` do retorno:

```tsx
export function CampoNumero({ rotulo, valor, aoMudar, erro, dica, sufixo, rotuloOculto = false, placeholder }: CampoNumeroProps) {
```

```tsx
      {...(sufixo ? { sufixo } : {})}
      {...(placeholder ? { placeholder } : {})}
    />
```

- [ ] **Passo 4: `CampoNivelAtividade`**

Crie `src/ui/caso/CampoNivelAtividade.tsx`:

```tsx
import { NIVEIS_ATIVIDADE } from '@/domain/energia.ts'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'

interface CampoNivelAtividadeProps {
  readonly fator: number
  readonly aoEscolher: (fator: number) => void
}

const comVirgula = (n: number) => String(n).replace('.', ',')

/** CA-225 e CA-232: os cinco níveis com o fator de cada um; fator próprio não marca nenhum. */
export function CampoNivelAtividade({ fator, aoEscolher }: CampoNivelAtividadeProps) {
  const nivel = NIVEIS_ATIVIDADE.find((n) => n.fator === fator)
  return (
    <div className="flex flex-col gap-1.5">
      <GrupoOpcoes
        rotulo="Nível de atividade"
        opcoes={NIVEIS_ATIVIDADE.map((n) => ({ valor: n.id, rotulo: `${n.rotulo} (${comVirgula(n.fator)})` }))}
        valor={nivel?.id ?? null}
        aoEscolher={(id) => {
          const escolhido = NIVEIS_ATIVIDADE.find((n) => n.id === id)
          if (escolhido) aoEscolher(escolhido.fator)
        }}
      />
      {nivel ? null : <p className="text-xs text-muted-foreground">{`Fator próprio: ${comVirgula(fator)}`}</p>}
    </div>
  )
}
```

- [ ] **Passo 5: `CampoMetaEnergia`**

Crie `src/ui/caso/CampoMetaEnergia.tsx`:

```tsx
import { estadoDaMeta } from '@/domain/energia.ts'
import type { Caso } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { CampoNumero } from '@ds/componentes/forms/CampoNumero.tsx'

interface CampoMetaEnergiaProps {
  readonly caso: Caso
  readonly aoMudar: (meta: number | null) => void
  readonly erro?: string | undefined
}

const kcal = (valor: number) => formatarNumero(valor, 0)

/**
 * CA-226 a CA-230: a meta calculada aparece como texto-guia do campo, com o selo;
 * o número digitado vale mais. O calculado nunca vira o valor do campo: se virasse,
 * apagar o campo o traria de volta no meio da digitação.
 */
export function CampoMetaEnergia({ caso, aoMudar, erro }: CampoMetaEnergiaProps) {
  const estado = estadoDaMeta(caso)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-56">
          <CampoNumero
            rotulo="Meta de energia"
            valor={caso.metaEnergiaKcal}
            aoMudar={aoMudar}
            sufixo="kcal"
            erro={erro}
            placeholder={estado.tipo === 'calculada' ? kcal(estado.kcal) : 'Digite a meta'}
          />
        </div>
        {estado.tipo === 'calculada' ? (
          <Badge variant="lightPrimary" className="mb-2.5">
            calculada
          </Badge>
        ) : null}
        {estado.tipo === 'digitada' ? (
          <Badge variant="muted" className="mb-2.5">
            definida por você
          </Badge>
        ) : null}
      </div>
      {estado.tipo === 'digitada' && estado.calculada !== null ? (
        <p className="text-xs text-muted-foreground">{`Vale o seu número. Apague o campo para voltar à calculada (${kcal(estado.calculada)} kcal).`}</p>
      ) : null}
      {estado.tipo === 'sem-calculo' ? <p className="text-xs text-warningtext">{estado.motivo}</p> : null}
    </div>
  )
}
```

- [ ] **Passo 6: `TelaCaso` com o nível e a meta**

Em `src/ui/caso/TelaCaso.tsx`, acrescente os imports:

```ts
import { CampoMetaEnergia } from './CampoMetaEnergia.tsx'
import { CampoNivelAtividade } from './CampoNivelAtividade.tsx'
```

Troque a descrição do cartão no modo rápido:

```tsx
                ? 'Sexo e idade escolhem as referências de micronutrientes. Peso e estatura são opcionais aqui.'
```

por:

```tsx
                ? 'Com peso e estatura, a meta sai pronta. Sexo e idade escolhem as referências de micronutrientes.'
```

Apague o campo antigo da meta (o bloco `{rapido ? (<CampoNumero rotulo="Meta de energia" … />) : null}` que fica antes do Peso) e, logo depois do campo Estatura, acrescente:

```tsx
            <div className="sm:col-span-2">
              <CampoNivelAtividade fator={caso.energia.fator} aoEscolher={(fator) => aoAlterar({ energia: { ...caso.energia, fator } })} />
            </div>
            {rapido ? (
              <div className="sm:col-span-2">
                <CampoMetaEnergia caso={caso} aoMudar={numero('metaEnergiaKcal')} erro={erros.metaEnergiaKcal} />
              </div>
            ) : null}
```

O aviso do modo rápido ("Peso e estatura aqui servem só para estimar a meta…") e as circunferências ficam onde estão, depois desse bloco.

- [ ] **Passo 7: `AjusteEnergia` usa o mesmo campo**

Em `src/ui/resumo/AjusteEnergia.tsx`, troque o import de `NIVEIS_ATIVIDADE` por:

```ts
import { CampoNivelAtividade } from '../caso/CampoNivelAtividade.tsx'
```

Apague a linha `const nivelAtual = NIVEIS_ATIVIDADE.find((n) => n.fator === energia.fator)` e troque o `<GrupoOpcoes rotulo="Nível de atividade" … />` inteiro por:

```tsx
      <CampoNivelAtividade fator={energia.fator} aoEscolher={(fator) => alterarEnergia({ fator })} />
```

(o `GrupoOpcoes` continua importado: a fórmula da TMB usa.)

- [ ] **Passo 8: `ResumoDoDia` no modo rápido**

Em `src/ui/resumo/ResumoDoDia.tsx`:

1. Troque o import de `CampoNumero` por `import { CampoMetaEnergia } from '../caso/CampoMetaEnergia.tsx'`.
2. Troque o painel de ajuste do modo rápido:

```tsx
            <div className="flex flex-col gap-3 border border-border bg-muted p-4">
              <CampoNumero
                rotulo="Meta de energia"
                valor={caso.metaEnergiaKcal}
                aoMudar={(v) => aoAlterar({ metaEnergiaKcal: v })}
                sufixo="kcal"
                dica="Na prescrição rápida, a meta substitui o cálculo por fórmula."
              />
            </div>
```

por:

```tsx
            <div className="flex flex-col gap-3 border border-border bg-muted p-4">
              <CampoMetaEnergia caso={caso} aoMudar={(v) => aoAlterar({ metaEnergiaKcal: v })} />
            </div>
```

3. Logo depois de `const ehAdulto = …`, acrescente:

```ts
  const rotuloEnergia =
    caso.modo === 'rapido'
      ? energia.getManual
        ? 'Meta definida por você'
        : 'Meta calculada'
      : energia.getManual
        ? 'GET definido manualmente'
        : 'GET calculado'
```

4. Troque `{energia.getManual ? 'GET definido manualmente' : 'GET calculado'}` por `{rotuloEnergia}`.
5. Troque a condição do detalhe:

```tsx
        {caso.modo === 'completo' && (energia.tmb !== null || energia.get !== null) ? (
```

por:

```tsx
        {(caso.modo === 'completo' || !energia.getManual) && (energia.tmb !== null || energia.get !== null) ? (
```

- [ ] **Passo 9: Rodar e ver passar**

Run: `npx vitest run src/ui/caso src/ui/resumo`
Expected: PASS.

- [ ] **Passo 10: Portão, e2e e commit**

Run: `npm run check` e `npx playwright test`
Expected: tudo verde.

```bash
printf '%s\n' 'feat(caso): nível de atividade junto do peso e meta com selo' '' 'Nível de atividade abaixo de peso e estatura nos dois modos; no modo' 'rápido a meta aparece calculada, e o número digitado vale mais' '(CA-225 a CA-233).' '' 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>' > ../_msg.txt
git add design-system/componentes/forms/CampoNumero.tsx src/ui/caso src/ui/resumo
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 3: Domínio: sugestões por tipo de refeição

Cobre CA-239, CA-240, a seção 3.1, D-36, CA-243 e CA-306 do lado do armazenamento, CB-57, CB-70 e os Focos de revisão 3 e 4.

**Arquivos:**
- Criar: `src/domain/sugestoes.ts`
- Criar: `src/domain/sugestoes.test.ts`
- Alterar: `src/domain/perfil.ts` (`CHAVES_DE_DADOS`)

**Interfaces:**
- Produz (nomes exatos que as Tarefas 4 e 5 usam):
  - `type TipoRefeicao = 'desjejum' | 'lanche' | 'almoco' | 'jantar' | 'ceia'` e `TIPOS_REFEICAO: readonly TipoRefeicao[]`
  - `NOME_DO_TIPO: Readonly<Record<TipoRefeicao, string>>` — `'o almoço'`, `'a ceia'`…
  - `interface SugestaoAlimento { alimentoId: number; gramas: number }` e `type ListasDeSugestoes = Readonly<Record<TipoRefeicao, readonly SugestaoAlimento[]>>`
  - `SUGESTOES_PADRAO: ListasDeSugestoes`
  - `tipoDaRefeicao(nome: string, horario: string): TipoRefeicao`
  - `interface SugestaoPronta extends SugestaoAlimento { alimento: Alimento }` e `sugestoesProntas(lista, buscar: BuscarAlimento): readonly SugestaoPronta[]`
  - `criarRepositorioSugestoes(armazenamento: Armazenamento | null): RepositorioSugestoes` com `ler(): ListasDeSugestoes` e `salvar(tipo, lista): boolean`
  - Chave no aparelho: `'metanutri:sugestoes-por-refeicao'`.

- [ ] **Passo 1: Escrever os testes que falham**

Crie `src/domain/sugestoes.test.ts`:

```ts
import { CHAVES_DE_DADOS } from './perfil.ts'
import type { Armazenamento } from './persistencia.ts'
import {
  criarRepositorioSugestoes,
  NOME_DO_TIPO,
  SUGESTOES_PADRAO,
  sugestoesProntas,
  tipoDaRefeicao,
  TIPOS_REFEICAO,
  type TipoRefeicao,
} from './sugestoes.ts'
import { ALIMENTOS, buscarAlimento } from './tabelas.ts'

const CHAVE = 'metanutri:sugestoes-por-refeicao'

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
  return { arm, dados }
}

const descrever = (tipo: TipoRefeicao) => SUGESTOES_PADRAO[tipo].map((s) => `${buscarAlimento(s.alimentoId)?.descricao} · ${s.gramas}`)

describe('lista padrão (seção 3.1, D-36)', () => {
  it('traz os alimentos e as porções da spec, na ordem', () => {
    expect(descrever('desjejum')).toEqual([
      'Cuscuz, de milho, cozido com sal · 135',
      'Ovo, de galinha, inteiro, cozido/10minutos · 45',
      'Pão, trigo, francês · 50',
      'Tapioca, com manteiga · 50',
      'Café, infusão 10% · 50',
    ])
    expect(descrever('lanche')).toEqual([
      'Banana, prata, crua · 75',
      'Maçã, Fuji, com casca, crua · 150',
      'Mamão, Papaia, cru · 170',
      'Iogurte, natural · 200',
      'Aveia, flocos, crua · 15',
      'Queijo, minas, frescal · 45',
    ])
    expect(descrever('almoco')).toEqual([
      'Arroz, tipo 1, cozido · 100',
      'Feijão, carioca, cozido · 140',
      'Frango, peito, sem pele, grelhado · 100',
      'Carne, bovina, patinho, sem gordura, grelhado · 100',
      'Alface, crespa, crua · 30',
      'Tomate, com semente, cru · 80',
    ])
    expect(descrever('jantar')).toEqual([
      'Cuscuz, de milho, cozido com sal · 135',
      'Ovo, de galinha, inteiro, cozido/10minutos · 45',
      'Frango, peito, sem pele, grelhado · 100',
      'Arroz, tipo 1, cozido · 100',
      'Feijão, carioca, cozido · 140',
      'Batata, doce, cozida · 70',
    ])
    expect(descrever('ceia')).toEqual(['Iogurte, natural · 200', 'Banana, prata, crua · 75', 'Mamão, Papaia, cru · 170', 'Aveia, flocos, crua · 15'])
  })

  it('D-36: o leite integral fica fora de todas as listas', () => {
    const leite = ALIMENTOS.find((a) => a.descricao === 'Leite, de vaca, integral')
    expect(leite).toBeDefined()
    for (const tipo of TIPOS_REFEICAO) expect(SUGESTOES_PADRAO[tipo].some((s) => s.alimentoId === leite?.id)).toBe(false)
  })

  it('o nome do tipo concorda em gênero', () => {
    expect(NOME_DO_TIPO).toEqual({ desjejum: 'o desjejum', lanche: 'o lanche', almoco: 'o almoço', jantar: 'o jantar', ceia: 'a ceia' })
  })
})

describe('tipoDaRefeicao', () => {
  it.each([
    ['Desjejum', '03:00', 'desjejum'],
    ['Café da manhã', '03:00', 'desjejum'],
    ['CAFÉ DA MANHÃ', '03:00', 'desjejum'],
    ['Lanche da manhã', '03:00', 'lanche'],
    ['Colação', '03:00', 'lanche'],
    ['Almoço', '03:00', 'almoco'],
    ['almoco de domingo', '03:00', 'almoco'],
    ['Jantar', '03:00', 'jantar'],
    ['Janta', '03:00', 'jantar'],
    ['Ceia', '12:00', 'ceia'],
  ] as const)('CA-239: "%s" é reconhecido pelo nome (%s) como %s', (nome, horario, tipo) => {
    expect(tipoDaRefeicao(nome, horario)).toBe(tipo)
  })

  it.each([
    ['04:00', 'desjejum'],
    ['08:59', 'desjejum'],
    ['09:00', 'lanche'],
    ['10:59', 'lanche'],
    ['11:00', 'almoco'],
    ['14:59', 'almoco'],
    ['15:00', 'lanche'],
    ['17:59', 'lanche'],
    ['18:00', 'jantar'],
    ['20:59', 'jantar'],
    ['21:00', 'ceia'],
    ['23:59', 'ceia'],
    ['00:00', 'ceia'],
    ['03:59', 'ceia'],
  ] as const)('CA-240: "Pré-treino" às %s é %s', (horario, tipo) => {
    expect(tipoDaRefeicao('Pré-treino', horario)).toBe(tipo)
  })

  it.each(['', '25:00', '9h'])('Foco de revisão 4: horário ilegível ("%s") conta como almoço', (horario) => {
    expect(tipoDaRefeicao('Pré-treino', horario)).toBe('almoco')
  })
})

describe('repositório das sugestões (CA-243, CA-306, CB-70)', () => {
  it('sem nada guardado, vale a lista padrão', () => {
    expect(criarRepositorioSugestoes(memoria().arm).ler()).toEqual(SUGESTOES_PADRAO)
  })

  it('CA-243: salvar troca só o tipo salvo e fica no aparelho', () => {
    const { arm } = memoria()
    const nova = [{ alimentoId: 561, gramas: 140 }]
    expect(criarRepositorioSugestoes(arm).salvar('almoco', nova)).toBe(true)
    const lidas = criarRepositorioSugestoes(arm).ler()
    expect(lidas.almoco).toEqual(nova)
    expect(lidas.jantar).toEqual(SUGESTOES_PADRAO.jantar)
  })

  it('CA-306: lista vazia continua vazia', () => {
    const { arm } = memoria()
    criarRepositorioSugestoes(arm).salvar('ceia', [])
    expect(criarRepositorioSugestoes(arm).ler().ceia).toEqual([])
  })

  it('salvar a lista padrão guarda "usar a padrão", não uma cópia', () => {
    const { arm, dados } = memoria()
    const repo = criarRepositorioSugestoes(arm)
    repo.salvar('almoco', [{ alimentoId: 561, gramas: 140 }])
    repo.salvar('almoco', SUGESTOES_PADRAO.almoco)
    expect(JSON.parse(dados.get(CHAVE) ?? 'null')).toEqual({})
  })

  it('CB-70: aparelho que não guarda devolve false e não muda nada', () => {
    const { arm } = memoria()
    const cheio: Armazenamento = {
      ...arm,
      setItem: () => {
        throw new DOMException('cheio', 'QuotaExceededError')
      },
    }
    const repo = criarRepositorioSugestoes(cheio)
    expect(repo.salvar('almoco', [])).toBe(false)
    expect(repo.ler().almoco).toEqual(SUGESTOES_PADRAO.almoco)
  })

  it('sem armazenamento, lê a padrão e não salva', () => {
    const repo = criarRepositorioSugestoes(null)
    expect(repo.ler()).toEqual(SUGESTOES_PADRAO)
    expect(repo.salvar('almoco', [])).toBe(false)
  })

  it('Foco de revisão 3: dado estragado no aparelho não quebra nada', () => {
    expect(criarRepositorioSugestoes(memoria({ [CHAVE]: '{não é json' }).arm).ler()).toEqual(SUGESTOES_PADRAO)
    expect(criarRepositorioSugestoes(memoria({ [CHAVE]: '[1,2]' }).arm).ler()).toEqual(SUGESTOES_PADRAO)
    const torto = JSON.stringify({
      almoco: [{ alimentoId: 3, gramas: 100 }, { alimentoId: 'x', gramas: 1 }, { alimentoId: 5, gramas: 0 }, { alimentoId: 7, gramas: -1 }, null],
      lanche: 'oi',
      outro: [],
    })
    const lidas = criarRepositorioSugestoes(memoria({ [CHAVE]: torto }).arm).ler()
    expect(lidas.almoco).toEqual([{ alimentoId: 3, gramas: 100 }])
    expect(lidas.lanche).toEqual(SUGESTOES_PADRAO.lanche)
  })

  it('a chave entra no backup e no apagar dados do aparelho', () => {
    expect(CHAVES_DE_DADOS).toContain(CHAVE)
  })
})

describe('sugestoesProntas (CB-57)', () => {
  it('alimento que não existe mais some, e os outros continuam', () => {
    const prontas = sugestoesProntas([{ alimentoId: 999999, gramas: 100 }, { alimentoId: 3, gramas: 100 }], buscarAlimento)
    expect(prontas.map((p) => p.alimento.descricao)).toEqual(['Arroz, tipo 1, cozido'])
  })
})
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/sugestoes.test.ts`
Expected: FAIL — `./sugestoes.ts` não existe.

- [ ] **Passo 3: Implementar**

Crie `src/domain/sugestoes.ts`:

```ts
// Sugestões de alimentos por tipo de refeição (spec ajustes-de-uso, US-A3, D-35 e D-36).
// A lista padrão é o ponto de partida; a pessoa edita, e o app nunca aprende sozinho.
import { normalizar } from './busca.ts'
import type { Armazenamento } from './persistencia.ts'
import type { Alimento, BuscarAlimento } from './tipos.ts'

export type TipoRefeicao = 'desjejum' | 'lanche' | 'almoco' | 'jantar' | 'ceia'

export const TIPOS_REFEICAO: readonly TipoRefeicao[] = ['desjejum', 'lanche', 'almoco', 'jantar', 'ceia']

/** "Sugestões para o almoço", "para a ceia". */
export const NOME_DO_TIPO: Readonly<Record<TipoRefeicao, string>> = {
  desjejum: 'o desjejum',
  lanche: 'o lanche',
  almoco: 'o almoço',
  jantar: 'o jantar',
  ceia: 'a ceia',
}

export interface SugestaoAlimento {
  readonly alimentoId: number
  readonly gramas: number
}

export type ListasDeSugestoes = Readonly<Record<TipoRefeicao, readonly SugestaoAlimento[]>>

/** Seção 3.1 da spec. Revisar com uma nutricionista antes de publicar (R-20). */
export const SUGESTOES_PADRAO: ListasDeSugestoes = {
  desjejum: [
    { alimentoId: 533, gramas: 135 }, // Cuscuz, de milho, cozido com sal
    { alimentoId: 488, gramas: 45 }, // Ovo, de galinha, inteiro, cozido/10minutos
    { alimentoId: 53, gramas: 50 }, // Pão, trigo, francês
    { alimentoId: 551, gramas: 50 }, // Tapioca, com manteiga
    { alimentoId: 471, gramas: 50 }, // Café, infusão 10%
  ],
  lanche: [
    { alimentoId: 182, gramas: 75 }, // Banana, prata, crua
    { alimentoId: 222, gramas: 150 }, // Maçã, Fuji, com casca, crua
    { alimentoId: 226, gramas: 170 }, // Mamão, Papaia, cru
    { alimentoId: 448, gramas: 200 }, // Iogurte, natural
    { alimentoId: 7, gramas: 15 }, // Aveia, flocos, crua
    { alimentoId: 461, gramas: 45 }, // Queijo, minas, frescal
  ],
  almoco: [
    { alimentoId: 3, gramas: 100 }, // Arroz, tipo 1, cozido
    { alimentoId: 561, gramas: 140 }, // Feijão, carioca, cozido
    { alimentoId: 410, gramas: 100 }, // Frango, peito, sem pele, grelhado
    { alimentoId: 377, gramas: 100 }, // Carne, bovina, patinho, sem gordura, grelhado
    { alimentoId: 78, gramas: 30 }, // Alface, crespa, crua
    { alimentoId: 157, gramas: 80 }, // Tomate, com semente, cru
  ],
  jantar: [
    { alimentoId: 533, gramas: 135 }, // Cuscuz, de milho, cozido com sal
    { alimentoId: 488, gramas: 45 }, // Ovo, de galinha, inteiro, cozido/10minutos
    { alimentoId: 410, gramas: 100 }, // Frango, peito, sem pele, grelhado
    { alimentoId: 3, gramas: 100 }, // Arroz, tipo 1, cozido
    { alimentoId: 561, gramas: 140 }, // Feijão, carioca, cozido
    { alimentoId: 88, gramas: 70 }, // Batata, doce, cozida
  ],
  ceia: [
    { alimentoId: 448, gramas: 200 }, // Iogurte, natural
    { alimentoId: 182, gramas: 75 }, // Banana, prata, crua
    { alimentoId: 226, gramas: 170 }, // Mamão, Papaia, cru
    { alimentoId: 7, gramas: 15 }, // Aveia, flocos, crua
  ],
}

/** CA-239: o nome manda; maiúscula e acento não contam. */
const PELO_NOME: readonly (readonly [RegExp, TipoRefeicao])[] = [
  [/desjejum|cafe da manha/, 'desjejum'],
  [/lanche|colacao/, 'lanche'],
  [/almoco/, 'almoco'],
  [/janta/, 'jantar'],
  [/ceia/, 'ceia'],
]

/** CA-240: o horário decide quando o nome não diz. Minuto em que cada faixa começa. */
const PELO_HORARIO: readonly (readonly [number, TipoRefeicao])[] = [
  [4 * 60, 'desjejum'],
  [9 * 60, 'lanche'],
  [11 * 60, 'almoco'],
  [15 * 60, 'lanche'],
  [18 * 60, 'jantar'],
  [21 * 60, 'ceia'],
]

export function tipoDaRefeicao(nome: string, horario: string): TipoRefeicao {
  const texto = normalizar(nome)
  for (const [padrao, tipo] of PELO_NOME) if (padrao.test(texto)) return tipo

  const hora = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(horario)
  // Horário ilegível só aparece em plano importado: conta como almoço em vez de quebrar.
  if (!hora) return 'almoco'
  const minutos = Number(hora[1]) * 60 + Number(hora[2])
  let tipo: TipoRefeicao = 'ceia' // de 00:00 a 03:59
  for (const [inicio, t] of PELO_HORARIO) if (minutos >= inicio) tipo = t
  return tipo
}

export interface SugestaoPronta extends SugestaoAlimento {
  readonly alimento: Alimento
}

/** CB-57: alimento que não existe mais (produto apagado, base trocada) some sem erro. */
export function sugestoesProntas(lista: readonly SugestaoAlimento[], buscar: BuscarAlimento): readonly SugestaoPronta[] {
  return lista.flatMap((s) => {
    const alimento = buscar(s.alimentoId)
    return alimento ? [{ alimentoId: s.alimentoId, gramas: s.gramas, alimento }] : []
  })
}

const CHAVE = 'metanutri:sugestoes-por-refeicao'

export interface RepositorioSugestoes {
  /** A lista de cada tipo: a que a pessoa salvou ou, se não salvou, a padrão. */
  ler(): ListasDeSugestoes
  /** `false` quando o aparelho não guardou (CB-70); nesse caso nada muda. */
  salvar(tipo: TipoRefeicao, lista: readonly SugestaoAlimento[]): boolean
}

type Guardadas = Partial<Record<TipoRefeicao, readonly SugestaoAlimento[]>>

function ehSugestao(valor: unknown): valor is SugestaoAlimento {
  if (typeof valor !== 'object' || valor === null) return false
  const { alimentoId, gramas } = valor as { alimentoId?: unknown; gramas?: unknown }
  return typeof alimentoId === 'number' && Number.isInteger(alimentoId) && typeof gramas === 'number' && Number.isFinite(gramas) && gramas > 0
}

function lerGuardadas(armazenamento: Armazenamento): Guardadas {
  try {
    const bruto: unknown = JSON.parse(armazenamento.getItem(CHAVE) ?? '{}')
    if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) return {}
    const guardadas: Guardadas = {}
    for (const tipo of TIPOS_REFEICAO) {
      const lista = (bruto as Record<string, unknown>)[tipo]
      if (Array.isArray(lista)) guardadas[tipo] = lista.filter(ehSugestao).map(({ alimentoId, gramas }) => ({ alimentoId, gramas }))
    }
    return guardadas
  } catch {
    return {}
  }
}

const mesmaLista = (a: readonly SugestaoAlimento[], b: readonly SugestaoAlimento[]) =>
  a.length === b.length && a.every((s, i) => s.alimentoId === b[i]?.alimentoId && s.gramas === b[i]?.gramas)

export function criarRepositorioSugestoes(armazenamento: Armazenamento | null): RepositorioSugestoes {
  return {
    ler() {
      const guardadas = armazenamento ? lerGuardadas(armazenamento) : {}
      return {
        desjejum: guardadas.desjejum ?? SUGESTOES_PADRAO.desjejum,
        lanche: guardadas.lanche ?? SUGESTOES_PADRAO.lanche,
        almoco: guardadas.almoco ?? SUGESTOES_PADRAO.almoco,
        jantar: guardadas.jantar ?? SUGESTOES_PADRAO.jantar,
        ceia: guardadas.ceia ?? SUGESTOES_PADRAO.ceia,
      }
    },

    salvar(tipo, lista) {
      if (!armazenamento) return false
      const guardadas = lerGuardadas(armazenamento)
      const limpa = lista.map(({ alimentoId, gramas }) => ({ alimentoId, gramas }))
      const proximas: Guardadas = {}
      for (const t of TIPOS_REFEICAO) {
        const valor = t === tipo ? limpa : guardadas[t]
        if (valor === undefined) continue
        // Igual à padrão: guarda "usar a padrão", para uma revisão futura da lista chegar a quem voltou para ela.
        if (t === tipo && mesmaLista(valor, SUGESTOES_PADRAO[t])) continue
        proximas[t] = valor
      }
      try {
        armazenamento.setItem(CHAVE, JSON.stringify(proximas))
        return true
      } catch {
        return false
      }
    },
  }
}
```

Em `src/domain/perfil.ts`, acrescente a chave no fim de `CHAVES_DE_DADOS`:

```ts
  'metanutri:acompanhamentos',
  'metanutri:sugestoes-por-refeicao',
] as const
```

- [ ] **Passo 4: Rodar e ver passar**

Run: `npx vitest run src/domain/sugestoes.test.ts src/domain/backupCompleto.test.ts src/ui/config`
Expected: PASS.

- [ ] **Passo 5: Portão e commit**

Run: `npm run check`

```bash
printf '%s\n' 'feat(sugestoes): lista de alimentos por tipo de refeição' '' 'Tipo pelo nome ou pelo horário, lista padrão da spec sem o leite' 'integral e repositório no aparelho que a pessoa edita (CA-239, CA-240,' 'CA-243, CB-57, CB-70).' '' 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>' > ../_msg.txt
git add src/domain/sugestoes.ts src/domain/sugestoes.test.ts src/domain/perfil.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 4: Sugestões na refeição, sem o "Você usa muito"

Cobre CA-237, CA-238, CA-306 (sem o link, que vem na Tarefa 5), CA-307, CB-55 e o Foco de revisão 2.

**Arquivos:**
- Criar: `src/ui/estado/usarSugestoes.ts`
- Criar: `src/ui/plano/SugestoesDaRefeicao.tsx`
- Alterar: `src/ui/plano/EntradaRapida.tsx`
- Alterar: `src/ui/plano/CartaoRefeicao.tsx`
- Alterar: `src/ui/plano/TelaPlano.tsx`
- Apagar: `src/domain/frequentes.ts`, `src/domain/frequentes.test.ts`
- Alterar: `src/ui/plano/EntradaRapida.test.tsx`, `src/ui/plano/TelaPlano.test.tsx`

**Interfaces:**
- Consome: `tipoDaRefeicao`, `NOME_DO_TIPO`, `sugestoesProntas`, `criarRepositorioSugestoes` (Tarefa 3).
- Produz:
  - `useSugestoes(): { listas: ListasDeSugestoes; salvar: (tipo: TipoRefeicao, lista: readonly SugestaoAlimento[]) => boolean }`
  - `SugestoesDaRefeicao({ tipo, sugestoes, aoEscolher: (alimentoId, gramas) => void, aoEditar?: (() => void) | undefined })` — seção com `aria-label` "Sugestões para o almoço"; cada sugestão é um botão com nome acessível `Adicionar <descrição>, <gramas> g`; o link de edição tem nome `Editar sugestões para o almoço`.
  - `EntradaRapida` perde `comAtalhos` e ganha `quandoVazio?: ReactNode`.
  - `CartaoRefeicao` ganha as props obrigatórias `tipo: TipoRefeicao` e `sugestoes: readonly SugestaoAlimento[]`.

- [ ] **Passo 1: Escrever os testes que falham**

Em `src/ui/plano/EntradaRapida.test.tsx`, troque o `montar` e o `describe('Alimentos usados com frequência', …)` inteiro por:

```tsx
const montar = () => {
  render(<EntradaRapida rotulo="Adicionar alimento" aoAdicionar={(alimentoId, gramas) => adicionados.push({ alimentoId, gramas })} />)
  return userEvent.setup()
}

describe('Conteúdo com o campo vazio (CA-307)', () => {
  it('aparece com o campo vazio e some enquanto se digita', async () => {
    render(
      <EntradaRapida
        rotulo="Adicionar alimento"
        aoAdicionar={(alimentoId, gramas) => adicionados.push({ alimentoId, gramas })}
        quandoVazio={<p>Sugestões de teste</p>}
      />,
    )
    const usuario = userEvent.setup()
    const campo = screen.getByRole('combobox', { name: 'Adicionar alimento' })
    expect(screen.getByText('Sugestões de teste')).toBeInTheDocument()
    await usuario.type(campo, 'arroz')
    expect(screen.queryByText('Sugestões de teste')).not.toBeInTheDocument()
    await usuario.clear(campo)
    expect(screen.getByText('Sugestões de teste')).toBeInTheDocument()
  })

  it('CB-55: adicionar pela busca não grava mais histórico no aparelho', async () => {
    const usuario = montar()
    await usuario.type(screen.getByRole('combobox', { name: 'Adicionar alimento' }), '150 arroz integral{Enter}')
    expect(adicionados).toHaveLength(1)
    expect(localStorage.getItem('metanutri:frequentes')).toBeNull()
    expect(screen.queryByText('Você usa muito')).not.toBeInTheDocument()
  })
})
```

(o `describe('Honestidade do dado', …)` continua como está.)

Em `src/ui/plano/TelaPlano.test.tsx`, logo depois de `const almoco = () => …`, acrescente:

```tsx
const painel = (nome: string) => within(screen.getByRole('tabpanel', { name: `Principal de ${nome}` }))

beforeEach(() => localStorage.clear())
```

E no fim do arquivo:

```tsx
describe('Sugestões por refeição (US-A3)', () => {
  it('CA-237: cada refeição mostra as sugestões do seu tipo, com nome e gramas', () => {
    montar()
    expect(painel('Almoço').getByText('Sugestões para o almoço')).toBeInTheDocument()
    expect(painel('Almoço').getByRole('button', { name: 'Adicionar Arroz, tipo 1, cozido, 100 g' })).toBeInTheDocument()
    expect(painel('Desjejum').getByRole('button', { name: 'Adicionar Cuscuz, de milho, cozido com sal, 135 g' })).toBeInTheDocument()
    expect(painel('Lanche da manhã').getByText('Sugestões para o lanche')).toBeInTheDocument()
    expect(painel('Ceia').getByText('Sugestões para a ceia')).toBeInTheDocument()
    expect(screen.queryByText('Você usa muito')).not.toBeInTheDocument()
  })

  it('CA-238: clicar na sugestão põe o alimento na porção mostrada, na opção aberta', async () => {
    const usuario = montar()
    await usuario.click(painel('Almoço').getByRole('button', { name: 'Adicionar Feijão, carioca, cozido, 140 g' }))
    expect(painel('Almoço').getByLabelText(/^Gramas de Feijão, carioca/)).toHaveValue('140')

    await usuario.click(within(screen.getByRole('tablist', { name: 'Opções de Almoço' })).getByRole('tab', { name: 'Substituto 1' }))
    const substituto = within(screen.getByRole('tabpanel', { name: 'Substituto 1 de Almoço' }))
    await usuario.click(substituto.getByRole('button', { name: 'Adicionar Arroz, tipo 1, cozido, 100 g' }))
    expect(substituto.getByLabelText(/^Gramas de Arroz, tipo 1/)).toHaveValue('100')
  })

  it('CA-307: digitar no campo esconde as sugestões', async () => {
    const usuario = montar()
    await usuario.type(entradaDoAlmoco(), 'arr')
    expect(painel('Almoço').queryByText('Sugestões para o almoço')).not.toBeInTheDocument()
  })

  it('CA-306: lista vazia não mostra o rótulo nem as sugestões', () => {
    localStorage.setItem('metanutri:sugestoes-por-refeicao', JSON.stringify({ almoco: [] }))
    montar()
    expect(painel('Almoço').queryByText('Sugestões para o almoço')).not.toBeInTheDocument()
    expect(painel('Almoço').queryByRole('button', { name: /^Adicionar / })).not.toBeInTheDocument()
    expect(entradaDoAlmoco()).toBeInTheDocument()
  })

  it('CB-55: o histórico do antigo "Você usa muito" não volta', () => {
    localStorage.setItem('metanutri:frequentes', JSON.stringify({ 3: { vezes: 9, ultimoUso: '2026-09-01T00:00:00.000Z', gramas: 150 } }))
    montar()
    expect(screen.queryByText('Você usa muito')).not.toBeInTheDocument()
    expect(painel('Almoço').queryByRole('button', { name: /, 150 g$/ })).not.toBeInTheDocument()
  })

  it('Foco de revisão 2: renomear ou mudar o horário troca as sugestões na hora', async () => {
    const usuario = montar()
    const nome = screen.getByRole('textbox', { name: 'Nome da refeição Lanche da tarde' })
    await usuario.clear(nome)
    await usuario.type(nome, 'Jantar cedo')
    expect(painel('Jantar cedo').getByText('Sugestões para o jantar')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Adicionar refeição' }))
    expect(painel('Nova refeição').getByText('Sugestões para o lanche')).toBeInTheDocument() // 10:00
    const horario = screen.getByLabelText('Horário de Nova refeição')
    await usuario.clear(horario)
    await usuario.type(horario, '19:30')
    expect(painel('Nova refeição').getByText('Sugestões para o jantar')).toBeInTheDocument()
  })
})
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/plano`
Expected: FAIL — sem `quandoVazio` e sem as sugestões nas refeições.

- [ ] **Passo 3: Gancho das listas**

Crie `src/ui/estado/usarSugestoes.ts`:

```ts
import { useMemo, useState } from 'react'
import { criarRepositorioSugestoes, type ListasDeSugestoes, type SugestaoAlimento, type TipoRefeicao } from '@/domain/sugestoes.ts'
import { armazenamentoLocal } from './armazenamentoLocal.ts'

export interface ValorSugestoes {
  readonly listas: ListasDeSugestoes
  /** Grava e passa a valer em todas as refeições do tipo; `false` quando o aparelho não guardou (CB-70). */
  readonly salvar: (tipo: TipoRefeicao, lista: readonly SugestaoAlimento[]) => boolean
}

/** As listas de sugestões deste aparelho, lidas uma vez e relidas a cada gravação (CA-243). */
export function useSugestoes(): ValorSugestoes {
  const repositorio = useMemo(() => criarRepositorioSugestoes(armazenamentoLocal()), [])
  const [listas, setListas] = useState<ListasDeSugestoes>(() => repositorio.ler())

  const salvar = (tipo: TipoRefeicao, lista: readonly SugestaoAlimento[]) => {
    if (!repositorio.salvar(tipo, lista)) return false
    setListas(repositorio.ler())
    return true
  }

  return { listas, salvar }
}
```

- [ ] **Passo 4: `SugestoesDaRefeicao`**

Crie `src/ui/plano/SugestoesDaRefeicao.tsx`:

```tsx
import { Pencil, Plus } from 'lucide-react'
import { NOME_DO_TIPO, sugestoesProntas, type SugestaoAlimento, type TipoRefeicao } from '@/domain/sugestoes.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'

interface SugestoesDaRefeicaoProps {
  readonly tipo: TipoRefeicao
  readonly sugestoes: readonly SugestaoAlimento[]
  readonly aoEscolher: (alimentoId: number, gramas: number) => void
  /** Abre a edição da lista (CA-241). */
  readonly aoEditar?: (() => void) | undefined
}

/** CA-237, CA-238 e CA-306: os alimentos de sempre daquele tipo de refeição, a um clique. */
export function SugestoesDaRefeicao({ tipo, sugestoes, aoEscolher, aoEditar }: SugestoesDaRefeicaoProps) {
  const prontas = sugestoesProntas(sugestoes, buscarAlimento)
  const titulo = `Sugestões para ${NOME_DO_TIPO[tipo]}`

  const editar = aoEditar ? (
    <button
      type="button"
      onClick={aoEditar}
      aria-label={`Editar sugestões para ${NOME_DO_TIPO[tipo]}`}
      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Pencil className="size-3.5" aria-hidden="true" />
      {prontas.length === 0 ? 'Editar sugestões' : 'Editar'}
    </button>
  ) : null

  // CA-306: lista vazia deixa só a busca, e o caminho para montar a lista de novo.
  if (prontas.length === 0) return editar

  return (
    <section aria-label={titulo} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="rotulo">{titulo}</p>
        {editar}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {prontas.map((s, i) => (
          <button
            key={`${s.alimentoId}-${i}`}
            type="button"
            onClick={() => aoEscolher(s.alimentoId, s.gramas)}
            aria-label={`Adicionar ${s.alimento.descricao}, ${formatarNumero(s.gramas, 0)} g`}
            className="inline-flex min-h-11 max-w-64 items-center gap-1 rounded-full border border-border px-3 text-xs transition-colors hover:border-borderdefault hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-3 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0 truncate">{s.alimento.descricao}</span>
            <span className="numeros shrink-0 text-muted-foreground">{`${formatarNumero(s.gramas, 0)} g`}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Passo 5: `EntradaRapida` sem os frequentes**

Em `src/ui/plano/EntradaRapida.tsx`:

1. Imports: troque `import { useId, useMemo, useState, type KeyboardEvent } from 'react'` por `import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'`; apague `import { criarRepositorioFrequentes } from '@/domain/frequentes.ts'` e `import { armazenamentoLocal } from '../estado/armazenamentoLocal.ts'`; troque `import { alimentosComProdutos, buscarAlimento } from '@/domain/tabelas.ts'` por `import { alimentosComProdutos } from '@/domain/tabelas.ts'`.
2. Na interface, troque o `comAtalhos` e seu comentário por:

```ts
  /** Aparece embaixo do campo enquanto ele está vazio, como as sugestões da refeição (CA-307). */
  readonly quandoVazio?: ReactNode
```

3. Troque a assinatura por `export function EntradaRapida({ rotulo, aoAdicionar, quandoVazio }: EntradaRapidaProps) {`.
4. Apague `const [usos, setUsos] = useState(0)`, `const frequentes = useMemo(…)`, o `const atalhos = useMemo(…)` inteiro e a função `registrar`.
5. Em `adicionar`, troque `registrar(r.alimento.id, r.gramas)` por `aoAdicionar(r.alimento.id, r.gramas)`.
6. Troque o bloco `{atalhos.length > 0 ? ( … ) : null}` inteiro por:

```tsx
      {texto.trim() === '' ? quandoVazio : null}
```

Apague `src/domain/frequentes.ts` e `src/domain/frequentes.test.ts` (`git rm`).

- [ ] **Passo 6: `CartaoRefeicao` e `TelaPlano`**

Em `src/ui/plano/CartaoRefeicao.tsx`, acrescente os imports:

```ts
import type { SugestaoAlimento, TipoRefeicao } from '@/domain/sugestoes.ts'
import { SugestoesDaRefeicao } from './SugestoesDaRefeicao.tsx'
```

Na interface, depois de `aoRemoverItem`:

```ts
  /** Tipo da refeição, pelo nome ou pelo horário (CA-239, CA-240). */
  readonly tipo: TipoRefeicao
  /** A lista de sugestões que vale para esse tipo (CA-237). */
  readonly sugestoes: readonly SugestaoAlimento[]
```

Acrescente `tipo` e `sugestoes` na desestruturação das props e troque o `<EntradaRapida … comAtalhos />` por:

```tsx
        <EntradaRapida
          rotulo={`Adicionar alimento em ${ROTULO_OPCAO[opcaoAtiva]} de ${refeicao.nome}`}
          aoAdicionar={(alimentoId, gramas) => aoAdicionarItem(opcaoAtiva, alimentoId, gramas)}
          quandoVazio={
            <SugestoesDaRefeicao
              tipo={tipo}
              sugestoes={sugestoes}
              aoEscolher={(alimentoId, gramas) => aoAdicionarItem(opcaoAtiva, alimentoId, gramas)}
            />
          }
        />
```

Em `src/ui/plano/TelaPlano.tsx`, acrescente os imports:

```ts
import { tipoDaRefeicao } from '@/domain/sugestoes.ts'
import { useSugestoes } from '../estado/usarSugestoes.ts'
```

Logo depois de `const [modelosAbertos, …]`, acrescente `const sugestoes = useSugestoes()`. Troque o `plano.refeicoes.map((refeicao) => ( <CartaoRefeicao … /> ))` por:

```tsx
      {plano.refeicoes.map((refeicao) => {
        const tipo = tipoDaRefeicao(refeicao.nome, refeicao.horario)
        return (
          <CartaoRefeicao
            key={refeicao.id}
            refeicao={refeicao}
            tipo={tipo}
            sugestoes={sugestoes.listas[tipo]}
            aoRenomear={(nome) => aoAlterarPlano(renomearRefeicao(plano, refeicao.id, nome))}
            aoMudarHorario={(horario) => aoAlterarPlano(mudarHorario(plano, refeicao.id, horario))}
            aoRemover={() => aoAlterarPlano(removerRefeicao(plano, refeicao.id))}
            aoAdicionarItem={(opcao, alimentoId, gramas) => aoAlterarPlano(adicionarItem(plano, refeicao.id, opcao, { alimentoId, gramas }, gerarId))}
            aoMudarGramas={(opcao, itemId, gramas) => aoAlterarPlano(atualizarGramas(plano, refeicao.id, opcao, itemId, gramas))}
            aoRemoverItem={(opcao, itemId) => aoAlterarPlano(removerItem(plano, refeicao.id, opcao, itemId))}
            {...(extraDaOpcao ? { extraDaOpcao: (opcao: OpcaoId) => extraDaOpcao(refeicao.id, opcao) } : {})}
          />
        )
      })}
```

- [ ] **Passo 7: Rodar e ver passar**

Run: `npx vitest run src/ui/plano src/domain`
Expected: PASS (nenhum outro arquivo importava `frequentes.ts`; confira com `grep -rn "frequentes" src` — só os testes de CB-55 citam a chave antiga).

- [ ] **Passo 8: Portão, e2e e commit**

Run: `npm run check` e `npx playwright test`

```bash
printf '%s\n' 'feat(plano): sugestões por tipo de refeição no lugar do "Você usa muito"' '' 'Cada refeição mostra a lista do seu tipo, com um clique para entrar na' 'porção mostrada; o histórico de frequentes deixa de existir (CA-237,' 'CA-238, CA-306, CA-307, CB-55).' '' 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>' > ../_msg.txt
git add -A src/ui/estado/usarSugestoes.ts src/ui/plano src/domain/frequentes.ts src/domain/frequentes.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 5: Editar as sugestões

Cobre CA-241, CA-242, CA-243, o link do CA-306 e CB-70 na tela.

**Arquivos:**
- Criar: `src/ui/plano/DialogoSugestoes.tsx`
- Criar: `src/ui/plano/DialogoSugestoes.test.tsx`
- Alterar: `src/ui/plano/CartaoRefeicao.tsx`
- Alterar: `src/ui/plano/TelaPlano.tsx`
- Alterar: `src/ui/plano/TelaPlano.test.tsx`

**Interfaces:**
- Consome: `useSugestoes().salvar` e `SugestoesDaRefeicao.aoEditar` (Tarefa 4); `SUGESTOES_PADRAO`, `NOME_DO_TIPO`, `sugestoesProntas` (Tarefa 3); `buscarAlimentos`, `medidaEquivalente` (já existem em `busca.ts`).
- Produz:
  - `DialogoSugestoes({ tipo, lista, aoSalvar: (lista) => boolean, aoFechar: () => void })` — sempre aberto enquanto montado; título "Sugestões para o almoço"; botões `Subir X`, `Descer X`, `Tirar X`; campo "Alimento para acrescentar"; botões "Adicionar", "Voltar à lista padrão", "Cancelar", "Salvar".
  - `CartaoRefeicao` ganha a prop obrigatória `aoSalvarSugestoes: (lista: readonly SugestaoAlimento[]) => boolean`.

- [ ] **Passo 1: Escrever os testes que falham**

Crie `src/ui/plano/DialogoSugestoes.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SUGESTOES_PADRAO, type SugestaoAlimento } from '@/domain/sugestoes.ts'
import { DialogoSugestoes } from './DialogoSugestoes.tsx'

const montar = (lista: readonly SugestaoAlimento[] = SUGESTOES_PADRAO.almoco, salvou = true) => {
  const aoSalvar = vi.fn<(lista: readonly SugestaoAlimento[]) => boolean>(() => salvou)
  const aoFechar = vi.fn<() => void>()
  render(<DialogoSugestoes tipo="almoco" lista={lista} aoSalvar={aoSalvar} aoFechar={aoFechar} />)
  return { usuario: userEvent.setup(), aoSalvar, aoFechar }
}

/** Ordem da lista, lida dos botões de tirar (um por item, na ordem da tela). */
const ordem = () => screen.getAllByRole('button', { name: /^Tirar / }).map((b) => (b.getAttribute('aria-label') ?? '').slice('Tirar '.length))
const campo = () => screen.getByRole('textbox', { name: 'Alimento para acrescentar' })

describe('Editar sugestões (CA-241 a CA-243, CB-70)', () => {
  it('CA-241: lista nome, medida caseira e gramas de cada sugestão', () => {
    montar()
    expect(screen.getByRole('dialog', { name: 'Sugestões para o almoço' })).toBeInTheDocument()
    expect(ordem()).toEqual([
      'Arroz, tipo 1, cozido',
      'Feijão, carioca, cozido',
      'Frango, peito, sem pele, grelhado',
      'Carne, bovina, patinho, sem gordura, grelhado',
      'Alface, crespa, crua',
      'Tomate, com semente, cru',
    ])
    expect(screen.getByText('4 colheres de sopa · 100 g')).toBeInTheDocument()
    expect(screen.getByText('1 concha · 140 g')).toBeInTheDocument()
  })

  it('CA-241: tira e muda a ordem', async () => {
    const { usuario } = montar()
    await usuario.click(screen.getByRole('button', { name: 'Tirar Tomate, com semente, cru' }))
    await usuario.click(screen.getByRole('button', { name: 'Descer Arroz, tipo 1, cozido' }))
    await usuario.click(screen.getByRole('button', { name: 'Subir Alface, crespa, crua' }))
    expect(ordem()).toEqual([
      'Feijão, carioca, cozido',
      'Arroz, tipo 1, cozido',
      'Frango, peito, sem pele, grelhado',
      'Alface, crespa, crua',
      'Carne, bovina, patinho, sem gordura, grelhado',
    ])
    expect(screen.getByRole('button', { name: 'Subir Feijão, carioca, cozido' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Descer Carne, bovina, patinho, sem gordura, grelhado' })).toBeDisabled()
  })

  it('CA-242: acrescenta com medida caseira, mostrando antes o que vai entrar', async () => {
    const { usuario } = montar()
    await usuario.type(campo(), '1 concha feijão preto')
    expect(screen.getByText(/^Vai entrar: Feijão, preto, cozido — .*140 g$/)).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Adicionar' }))
    expect(ordem().slice(-1)).toEqual(['Feijão, preto, cozido'])
    expect(campo()).toHaveValue('')
  })

  it('CA-242: sem medida entra em gramas, e Enter também acrescenta', async () => {
    const { usuario, aoSalvar } = montar([])
    await usuario.type(campo(), '150 arroz integral cozido{Enter}')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(aoSalvar).toHaveBeenCalledWith([{ alimentoId: 1, gramas: 150 }])
  })

  it('CA-242: alimento que não existe não entra, e a tela diz isso', async () => {
    const { usuario } = montar()
    await usuario.type(campo(), 'xyzabc')
    await usuario.click(screen.getByRole('button', { name: 'Adicionar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Nenhum alimento encontrado')
    expect(ordem()).toHaveLength(6)
  })

  it('CA-242: medida que não existe para o alimento não vira grama inventada', async () => {
    const { usuario } = montar([])
    await usuario.type(campo(), '1 fatia arroz tipo 1 cozido{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('A medida "fatia" não está cadastrada')
    expect(screen.getByText('A lista está vazia. A refeição vai mostrar só a busca.')).toBeInTheDocument()
  })

  it('o mesmo alimento não entra duas vezes', async () => {
    const { usuario } = montar()
    await usuario.type(campo(), 'arroz tipo 1 cozido{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Esse alimento já está na lista.')
    expect(ordem()).toHaveLength(6)
  })

  it('CA-243: Salvar entrega a lista nova e fecha', async () => {
    const { usuario, aoSalvar, aoFechar } = montar()
    await usuario.click(screen.getByRole('button', { name: 'Tirar Alface, crespa, crua' }))
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(aoSalvar).toHaveBeenCalledTimes(1)
    expect(aoSalvar.mock.calls[0]?.[0]).toHaveLength(5)
    expect(aoFechar).toHaveBeenCalledTimes(1)
  })

  it('CA-243: Voltar à lista padrão troca o rascunho pela padrão', async () => {
    const { usuario, aoSalvar } = montar([{ alimentoId: 561, gramas: 140 }])
    await usuario.click(screen.getByRole('button', { name: 'Voltar à lista padrão' }))
    expect(ordem()).toHaveLength(6)
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(aoSalvar).toHaveBeenCalledWith(SUGESTOES_PADRAO.almoco)
  })

  it('CA-243: fechar sem salvar não muda nada', async () => {
    const { usuario, aoSalvar, aoFechar } = montar()
    await usuario.click(screen.getByRole('button', { name: 'Tirar Alface, crespa, crua' }))
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(aoSalvar).not.toHaveBeenCalled()
    expect(aoFechar).toHaveBeenCalledTimes(1)
  })

  it('CB-70: aparelho que não guarda avisa e o diálogo fica aberto', async () => {
    const { usuario, aoFechar } = montar(SUGESTOES_PADRAO.almoco, false)
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(screen.getByText('Não deu para salvar neste aparelho. As sugestões continuam como estavam.')).toBeInTheDocument()
    expect(aoFechar).not.toHaveBeenCalled()
  })
})
```

Em `src/ui/plano/TelaPlano.test.tsx`, dentro do `describe('Sugestões por refeição (US-A3)', …)`, acrescente:

```tsx
  it('CA-243: salvar vale para todas as refeições do tipo e fica no aparelho', async () => {
    const usuario = montar()
    await usuario.click(painel('Lanche da manhã').getByRole('button', { name: 'Editar sugestões para o lanche' }))
    const dialogo = within(screen.getByRole('dialog', { name: 'Sugestões para o lanche' }))
    await usuario.click(dialogo.getByRole('button', { name: 'Tirar Banana, prata, crua' }))
    await usuario.click(dialogo.getByRole('button', { name: 'Salvar' }))

    expect(painel('Lanche da manhã').queryByRole('button', { name: 'Adicionar Banana, prata, crua, 75 g' })).not.toBeInTheDocument()
    expect(painel('Lanche da tarde').queryByRole('button', { name: 'Adicionar Banana, prata, crua, 75 g' })).not.toBeInTheDocument()
    expect(painel('Ceia').getByRole('button', { name: 'Adicionar Banana, prata, crua, 75 g' })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('metanutri:sugestoes-por-refeicao') ?? '{}').lanche).toHaveLength(5)
  })

  it('CA-306: com a lista vazia, sobra o link para montar a lista de novo', async () => {
    localStorage.setItem('metanutri:sugestoes-por-refeicao', JSON.stringify({ almoco: [] }))
    const usuario = montar()
    expect(painel('Almoço').queryByText('Sugestões para o almoço')).not.toBeInTheDocument()
    await usuario.click(painel('Almoço').getByRole('button', { name: 'Editar sugestões para o almoço' }))
    expect(screen.getByRole('dialog', { name: 'Sugestões para o almoço' })).toBeInTheDocument()
  })
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/plano`
Expected: FAIL — `DialogoSugestoes` não existe e o link "Editar" não aparece.

- [ ] **Passo 3: `DialogoSugestoes`**

Crie `src/ui/plano/DialogoSugestoes.tsx`:

```tsx
import { ArrowDown, ArrowUp, Plus, TriangleAlert, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { buscarAlimentos, medidaEquivalente } from '@/domain/busca.ts'
import { NOME_DO_TIPO, SUGESTOES_PADRAO, sugestoesProntas, type SugestaoAlimento, type TipoRefeicao } from '@/domain/sugestoes.ts'
import { alimentosComProdutos, buscarAlimento } from '@/domain/tabelas.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'

interface DialogoSugestoesProps {
  readonly tipo: TipoRefeicao
  readonly lista: readonly SugestaoAlimento[]
  /** `false` quando o aparelho não guardou: o diálogo avisa e continua aberto (CB-70). */
  readonly aoSalvar: (lista: readonly SugestaoAlimento[]) => boolean
  readonly aoFechar: () => void
}

/** "4 colheres de sopa · 100 g"; sem medida caseira, só as gramas. */
function porcao(alimentoId: number, gramas: number): string {
  const medida = medidaEquivalente(alimentoId, gramas)
  const g = `${formatarNumero(gramas, 0)} g`
  return medida ? `${medida.texto} · ${g}` : g
}

const nomeDe = (alimentoId: number) => buscarAlimento(alimentoId)?.descricao ?? 'Alimento removido'

/**
 * CA-241 a CA-243: tirar, acrescentar, mudar a ordem e voltar à lista padrão.
 * Nada vale até Salvar. Montado só enquanto aberto: fechar descarta o rascunho.
 */
export function DialogoSugestoes({ tipo, lista, aoSalvar, aoFechar }: DialogoSugestoesProps) {
  const [rascunho, setRascunho] = useState<readonly SugestaoAlimento[]>(() =>
    sugestoesProntas(lista, buscarAlimento).map(({ alimentoId, gramas }) => ({ alimentoId, gramas })),
  )
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [naoSalvou, setNaoSalvou] = useState(false)

  const { resultados, aviso } = buscarAlimentos(texto, alimentosComProdutos())
  const primeiro = resultados[0]

  const mover = (de: number, para: number) => {
    const nova = [...rascunho]
    const [item] = nova.splice(de, 1)
    if (!item) return
    nova.splice(para, 0, item)
    setRascunho(nova)
  }

  const adicionar = (evento: FormEvent) => {
    evento.preventDefault()
    if (texto.trim() === '') return
    if (!primeiro) {
      setErro(aviso ?? 'Nenhum alimento encontrado com esse nome. Nada foi adicionado.')
      return
    }
    if (primeiro.gramas === null) {
      setErro(primeiro.aviso ?? 'Essa medida não existe para este alimento. Informe em gramas.')
      return
    }
    if (rascunho.some((s) => s.alimentoId === primeiro.alimento.id)) {
      setErro('Esse alimento já está na lista.')
      return
    }
    setRascunho([...rascunho, { alimentoId: primeiro.alimento.id, gramas: primeiro.gramas }])
    setTexto('')
    setErro(null)
  }

  const salvar = () => {
    if (aoSalvar(rascunho)) aoFechar()
    else setNaoSalvou(true)
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{`Sugestões para ${NOME_DO_TIPO[tipo]}`}</DialogTitle>
          <DialogDescription>Valem para todas as refeições deste tipo, em todos os planos deste aparelho.</DialogDescription>
        </DialogHeader>

        {rascunho.length === 0 ? (
          <p className="text-sm text-muted-foreground">A lista está vazia. A refeição vai mostrar só a busca.</p>
        ) : (
          <ol aria-label="Sugestões, na ordem em que aparecem" className="flex flex-col gap-2">
            {rascunho.map((s, i) => {
              const nome = nomeDe(s.alimentoId)
              return (
                <li key={`${s.alimentoId}-${i}`} className="flex items-center gap-1 rounded-lg bg-muted py-1 pl-4 pr-1">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-heading">{nome}</span>
                    <span className="numeros block text-xs text-muted-foreground">{porcao(s.alimentoId, s.gramas)}</span>
                  </span>
                  <Button variant="ghost" size="icon" aria-label={`Subir ${nome}`} disabled={i === 0} onClick={() => mover(i, i - 1)}>
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Descer ${nome}`} disabled={i === rascunho.length - 1} onClick={() => mover(i, i + 1)}>
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Tirar ${nome}`} onClick={() => setRascunho(rascunho.filter((_, j) => j !== i))}>
                    <X aria-hidden="true" />
                  </Button>
                </li>
              )
            })}
          </ol>
        )}

        <form onSubmit={adicionar} className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <Input
              aria-label="Alimento para acrescentar"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value)
                setErro(null)
              }}
              placeholder="1 concha feijão preto…"
              className="min-w-0 flex-1"
            />
            <Button type="submit" variant="outline">
              <Plus aria-hidden="true" />
              Adicionar
            </Button>
          </div>
          {erro ? (
            <p role="alert" className="text-xs text-errortext">
              {erro}
            </p>
          ) : primeiro && primeiro.gramas !== null ? (
            <p className="numeros text-xs text-muted-foreground">{`Vai entrar: ${primeiro.alimento.descricao} — ${porcao(primeiro.alimento.id, primeiro.gramas)}`}</p>
          ) : null}
        </form>

        {naoSalvou ? (
          <Alert variant="warning">
            <TriangleAlert aria-hidden="true" />
            <p>Não deu para salvar neste aparelho. As sugestões continuam como estavam.</p>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setRascunho(SUGESTOES_PADRAO[tipo])}>
            Voltar à lista padrão
          </Button>
          <Button variant="ghost" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button onClick={salvar}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Passo 4: Ligar o diálogo na refeição**

Em `src/ui/plano/CartaoRefeicao.tsx`:

1. Acrescente `import { DialogoSugestoes } from './DialogoSugestoes.tsx'`.
2. Na interface, depois de `sugestoes`:

```ts
  /** Grava a lista do tipo; `false` quando o aparelho não guardou (CB-70). */
  readonly aoSalvarSugestoes: (lista: readonly SugestaoAlimento[]) => boolean
```

3. Acrescente `aoSalvarSugestoes` na desestruturação e, junto dos outros `useState`, `const [editandoSugestoes, setEditandoSugestoes] = useState(false)`.
4. No `<SugestoesDaRefeicao … />`, acrescente `aoEditar={() => setEditandoSugestoes(true)}`.
5. Logo antes do `<DialogoSubstituto … />`, acrescente:

```tsx
      {editandoSugestoes ? (
        <DialogoSugestoes tipo={tipo} lista={sugestoes} aoSalvar={aoSalvarSugestoes} aoFechar={() => setEditandoSugestoes(false)} />
      ) : null}
```

Em `src/ui/plano/TelaPlano.tsx`, no `<CartaoRefeicao … />`, acrescente depois de `sugestoes={…}`:

```tsx
            aoSalvarSugestoes={(lista) => sugestoes.salvar(tipo, lista)}
```

- [ ] **Passo 5: Rodar e ver passar**

Run: `npx vitest run src/ui/plano`
Expected: PASS.

- [ ] **Passo 6: Portão, e2e e commit**

Run: `npm run check` e `npx playwright test`

```bash
printf '%s\n' 'feat(plano): editar as sugestões de cada tipo de refeição' '' 'Tirar, acrescentar pela busca, mudar a ordem e voltar à lista padrão;' 'a lista salva vale para todas as refeições do tipo (CA-241 a CA-243,' 'CA-306, CB-70).' '' 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>' > ../_msg.txt
git add src/ui/plano
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 6: Domínio: quem assina o plano

Cobre D-37, D-38 e as regras de CA-234, CA-236, CA-251 a CA-253, CB-50, CB-51, CB-54 e CB-69.

**Arquivos:**
- Criar: `src/domain/assinaturaDoPlano.ts`
- Criar: `src/domain/assinaturaDoPlano.test.ts`

**Interfaces:**
- Consome: `PerfilConta`, `Situacao`, `formatarCrn` (`situacao.ts`); `Perfil` (`perfil.ts`).
- Produz (nomes exatos que as Tarefas 7 e 8 usam):
  - `interface AssinaturaDoPlano { situacao: Situacao | null; linhaNutricionista: string | null; origem: 'conta' | 'aparelho'; nome: string; responsavelTecnico: string }`
  - `assinaturaDoPlano({ servidor: boolean; perfilConta: PerfilConta | null; nomeDaSessao: string; perfilLocal: Perfil }): AssinaturaDoPlano`
  - `mostraCamposDeEstagio(situacao: Situacao | null, caso: Caso): boolean`
  - `mostraReceitas(situacao: Situacao | null, caso: Caso): boolean`
  - `nutricionistaDoWord(assinatura: AssinaturaDoPlano | null, caso: Caso): string | null`
  - `camposDeEstagioIniciais(assinatura: AssinaturaDoPlano): Pick<Caso, 'estagiario' | 'preceptor'>`

- [ ] **Passo 1: Escrever os testes que falham**

Crie `src/domain/assinaturaDoPlano.test.ts`:

```ts
import {
  assinaturaDoPlano,
  camposDeEstagioIniciais,
  mostraCamposDeEstagio,
  mostraReceitas,
  nutricionistaDoWord,
  type AssinaturaDoPlano,
} from './assinaturaDoPlano.ts'
import { criarCasoVazio } from './caso.ts'
import { PERFIL_VAZIO, type Perfil } from './perfil.ts'
import type { PerfilConta } from './situacao.ts'
import type { Caso } from './tipos.ts'

const ANA: PerfilConta = {
  nome: 'Ana Souza',
  situacao: 'nutricionista',
  crn: { regiao: 6, numero: '12345' },
  statusCrn: 'em_conferencia',
  crnDeclaradoEm: '2026-10-01T12:00:00.000Z',
  crnDecididoEm: null,
}
const JULIA: PerfilConta = { nome: 'Júlia Martins', situacao: 'estudante', crn: null, statusCrn: null, crnDeclaradoEm: null, crnDecididoEm: null }
const local = (p: Partial<Perfil> = {}): Perfil => ({ ...PERFIL_VAZIO, ...p })
const caso = (p: Partial<Caso> = {}): Caso => ({ ...criarCasoVazio('c1'), ...p })

describe('assinaturaDoPlano (D-37)', () => {
  it('conta de nutricionista: nome e CRN do cadastro', () => {
    expect(assinaturaDoPlano({ servidor: true, perfilConta: ANA, nomeDaSessao: 'Ana', perfilLocal: local() })).toEqual({
      situacao: 'nutricionista',
      linhaNutricionista: 'Ana Souza · CRN-6 12345',
      origem: 'conta',
      nome: 'Ana Souza',
      responsavelTecnico: '',
    })
  })

  it('conta sem nome no perfil usa o nome da sessão', () => {
    const r = assinaturaDoPlano({ servidor: true, perfilConta: { ...ANA, nome: '' }, nomeDaSessao: 'Ana S.', perfilLocal: local() })
    expect(r.linhaNutricionista).toBe('Ana S. · CRN-6 12345')
  })

  it('conta de estudante: o preceptor vem do responsável técnico de Quem assina', () => {
    const r = assinaturaDoPlano({ servidor: true, perfilConta: JULIA, nomeDaSessao: 'Júlia', perfilLocal: local({ responsavel: ' Carla Mendes ' }) })
    expect(r).toEqual({ situacao: 'estudante', linhaNutricionista: null, origem: 'conta', nome: 'Júlia Martins', responsavelTecnico: 'Carla Mendes' })
  })

  it('CB-69: conta sem perfil (administrador) fica sem situação', () => {
    const r = assinaturaDoPlano({ servidor: true, perfilConta: null, nomeDaSessao: 'Admin', perfilLocal: local({ tipo: 'profissional' }) })
    expect(r.situacao).toBeNull()
    expect(r.linhaNutricionista).toBeNull()
  })

  it('CB-54: sem servidor, a situação vem de Configurações', () => {
    const r = assinaturaDoPlano({ servidor: false, perfilConta: null, nomeDaSessao: '', perfilLocal: local({ tipo: 'profissional', nome: 'Ana Souza', crn: 'CRN-6 12345' }) })
    expect(r).toEqual({ situacao: 'nutricionista', linhaNutricionista: 'Ana Souza · CRN-6 12345', origem: 'aparelho', nome: 'Ana Souza', responsavelTecnico: '' })
    expect(assinaturaDoPlano({ servidor: false, perfilConta: null, nomeDaSessao: '', perfilLocal: local({ tipo: 'profissional' }) }).linhaNutricionista).toBeNull()
    expect(assinaturaDoPlano({ servidor: false, perfilConta: null, nomeDaSessao: '', perfilLocal: local() }).situacao).toBe('estudante')
  })
})

describe('o que a situação muda no plano', () => {
  it('CA-251, CB-51 e CB-69: campos de estágio', () => {
    expect(mostraCamposDeEstagio('nutricionista', caso())).toBe(false)
    expect(mostraCamposDeEstagio('nutricionista', caso({ preceptor: 'Carla' }))).toBe(true)
    expect(mostraCamposDeEstagio('estudante', caso())).toBe(true)
    expect(mostraCamposDeEstagio(null, caso())).toBe(true)
  })

  it('CA-234, CA-236 e CB-50: receitas', () => {
    expect(mostraReceitas('nutricionista', caso())).toBe(false)
    expect(mostraReceitas('nutricionista', caso({ receitas: '   ' }))).toBe(false)
    expect(mostraReceitas('nutricionista', caso({ receitas: 'Cuscuz com ovo.' }))).toBe(true)
    expect(mostraReceitas('estudante', caso())).toBe(true)
    expect(mostraReceitas(null, caso())).toBe(true)
  })

  it('CA-252 e CB-51: linha da nutricionista no Word', () => {
    const ana: AssinaturaDoPlano = { situacao: 'nutricionista', linhaNutricionista: 'Ana Souza · CRN-6 12345', origem: 'conta', nome: 'Ana Souza', responsavelTecnico: '' }
    expect(nutricionistaDoWord(ana, caso())).toBe('Ana Souza · CRN-6 12345')
    expect(nutricionistaDoWord(ana, caso({ estagiario: 'Júlia' }))).toBeNull()
    expect(nutricionistaDoWord({ ...ana, linhaNutricionista: null }, caso())).toBe('')
    expect(nutricionistaDoWord({ ...ana, situacao: 'estudante' }, caso())).toBeNull()
    expect(nutricionistaDoWord(null, caso())).toBeNull()
  })

  it('CA-253: plano novo de estudante nasce com estagiário e preceptor', () => {
    const julia: AssinaturaDoPlano = { situacao: 'estudante', linhaNutricionista: null, origem: 'conta', nome: 'Júlia Martins', responsavelTecnico: 'Carla Mendes' }
    expect(camposDeEstagioIniciais(julia)).toEqual({ estagiario: 'Júlia Martins', preceptor: 'Carla Mendes' })
    expect(camposDeEstagioIniciais({ ...julia, situacao: 'nutricionista' })).toEqual({ estagiario: '', preceptor: '' })
    expect(camposDeEstagioIniciais({ ...julia, situacao: null })).toEqual({ estagiario: '', preceptor: '' })
  })
})
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/assinaturaDoPlano.test.ts`
Expected: FAIL — `./assinaturaDoPlano.ts` não existe.

- [ ] **Passo 3: Implementar**

Crie `src/domain/assinaturaDoPlano.ts`:

```ts
// Quem assina o plano e o que a situação muda nele (spec ajustes-de-uso, US-A2 e US-A4, D-37 e D-38).
import type { Perfil } from './perfil.ts'
import { formatarCrn, type PerfilConta, type Situacao } from './situacao.ts'
import type { Caso } from './tipos.ts'

export interface AssinaturaDoPlano {
  /** `null` em conta sem situação (administrador): o plano fica como era (CB-69). */
  readonly situacao: Situacao | null
  /** "Ana Souza · CRN-6 12345"; `null` quando não é nutricionista ou falta nome e CRN. */
  readonly linhaNutricionista: string | null
  /** De onde vêm os dados, para a tela dizer onde mudar. */
  readonly origem: 'conta' | 'aparelho'
  /** Estagiário(a) de plano novo de estudante (CA-253). */
  readonly nome: string
  /** Preceptor(a) de plano novo de estudante: o responsável técnico de Quem assina (CA-253). */
  readonly responsavelTecnico: string
}

export interface EntradaAssinatura {
  /** Servidor configurado: a situação vem da conta. Sem ele, de Configurações (CB-54). */
  readonly servidor: boolean
  readonly perfilConta: PerfilConta | null
  readonly nomeDaSessao: string
  readonly perfilLocal: Perfil
}

export function assinaturaDoPlano({ servidor, perfilConta, nomeDaSessao, perfilLocal }: EntradaAssinatura): AssinaturaDoPlano {
  const responsavelTecnico = perfilLocal.responsavel.trim()
  if (servidor) {
    const situacao = perfilConta?.situacao ?? null
    const nome = perfilConta?.nome.trim() || nomeDaSessao.trim()
    const crn = situacao === 'nutricionista' ? (perfilConta?.crn ?? null) : null
    return { situacao, linhaNutricionista: crn ? `${nome} · ${formatarCrn(crn)}` : null, origem: 'conta', nome, responsavelTecnico }
  }
  const situacao: Situacao = perfilLocal.tipo === 'profissional' ? 'nutricionista' : 'estudante'
  const nome = perfilLocal.nome.trim()
  const linha = situacao === 'nutricionista' ? [nome, perfilLocal.crn.trim()].filter(Boolean).join(' · ') : ''
  return { situacao, linhaNutricionista: linha || null, origem: 'aparelho', nome, responsavelTecnico }
}

/** CA-251, CB-51 e CB-69: nutricionista não vê estagiário nem preceptor, salvo plano antigo que já tem um deles. */
export function mostraCamposDeEstagio(situacao: Situacao | null, caso: Caso): boolean {
  return situacao !== 'nutricionista' || caso.estagiario.trim() !== '' || caso.preceptor.trim() !== ''
}

/** CA-234, CA-236 e CB-50: receitas só para estudante, salvo plano que já tem receitas escritas. */
export function mostraReceitas(situacao: Situacao | null, caso: Caso): boolean {
  return situacao !== 'nutricionista' || caso.receitas.trim() !== ''
}

/**
 * CA-252 e CB-51: a linha "Nutricionista:" do Word, ou `null` para o Word de estágio de sempre.
 * Texto vazio quando falta nome e CRN: o documento sai com o campo em branco, nunca com "null".
 */
export function nutricionistaDoWord(assinatura: AssinaturaDoPlano | null, caso: Caso): string | null {
  if (assinatura?.situacao !== 'nutricionista') return null
  if (caso.estagiario.trim() || caso.preceptor.trim()) return null
  return assinatura.linhaNutricionista ?? ''
}

/** CA-253: plano novo de estudante já nasce com estagiário e preceptor; os outros, com os dois vazios. */
export function camposDeEstagioIniciais(assinatura: AssinaturaDoPlano): Pick<Caso, 'estagiario' | 'preceptor'> {
  return assinatura.situacao === 'estudante'
    ? { estagiario: assinatura.nome, preceptor: assinatura.responsavelTecnico }
    : { estagiario: '', preceptor: '' }
}
```

- [ ] **Passo 4: Rodar e ver passar**

Run: `npx vitest run src/domain/assinaturaDoPlano.test.ts`
Expected: PASS.

- [ ] **Passo 5: Portão e commit**

Run: `npm run check`

```bash
printf '%s\n' 'feat(plano): quem assina o plano, pela conta ou por Configurações' '' 'Situação, linha da nutricionista e os campos de estágio do plano novo,' 'com as regras de plano antigo (D-37, D-38, CB-50, CB-51, CB-54, CB-69).' '' 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>' > ../_msg.txt
git add src/domain/assinaturaDoPlano.ts src/domain/assinaturaDoPlano.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 7: Word sem receitas e assinado pela nutricionista

Cobre CA-235 e CA-252 no Word, CA-236 e CB-50/CB-51 na exportação.

**Arquivos:**
- Alterar: `src/export/aconselhamento-docx.ts`
- Alterar: `src/export/docx.test.ts`
- Alterar: `src/ui/exportar/MenuExportar.tsx`
- Criar: `src/ui/exportar/MenuExportarAssinatura.test.tsx`

**Interfaces:**
- Consome: `AssinaturaDoPlano`, `mostraReceitas`, `nutricionistaDoWord` (Tarefa 6).
- Produz:
  - `DadosAconselhamento` ganha `nutricionista?: string | null | undefined` (com texto, mesmo vazio: troca estagiário e preceptor pela linha "Nutricionista:" e deixa uma assinatura só) e `comReceitas?: boolean | undefined` (`false` tira as receitas e o título).
  - `MenuExportar` ganha `assinatura?: AssinaturaDoPlano | null | undefined`.

- [ ] **Passo 1: Escrever os testes que falham**

Em `src/export/docx.test.ts`, dentro do `describe('Aconselhamento em Word (CA-44, CA-45, CA-47)', …)`, acrescente:

```ts
  it('CA-252: nutricionista sai com a linha do cadastro e uma assinatura só', async () => {
    const { caso, plano } = montarCaso({ estagiario: '', preceptor: '' })
    const doc = criarAconselhamento({
      caso,
      plano,
      antropometria: avaliarAntropometria(caso),
      buscar: buscarAlimento,
      nutricionista: 'Ana Souza · CRN-6 12345',
      comReceitas: false,
    })
    const { texto } = await textoDoDocx(await gerarBytes(doc))
    expect(texto).toContain('Nutricionista: Ana Souza · CRN-6 12345')
    expect(texto).toContain('Nutricionista: ____')
    expect(texto).not.toContain('Estagiário(a)')
    expect(texto).not.toContain('Preceptor(a)')
    expect(texto).toContain('ASSINATURA')
    expect(texto).not.toContain('ASSINATURAS')
    expect(texto).not.toMatch(/undefined|null|NaN/)
  })

  it('CA-235: sem receitas, nem o título sai', async () => {
    const { caso, plano } = montarCaso()
    const doc = criarAconselhamento({
      caso,
      plano,
      antropometria: avaliarAntropometria(caso),
      buscar: buscarAlimento,
      receitas: 'Não deveria sair.',
      comReceitas: false,
    })
    const { texto } = await textoDoDocx(await gerarBytes(doc))
    expect(texto).not.toContain('RECEITAS SAUDÁVEIS')
    expect(texto).not.toContain('Não deveria sair.')
  })

  it('CA-236: sem as opções novas, o Word de estágio sai como antes', async () => {
    const { caso, plano } = montarCaso()
    const doc = criarAconselhamento({ caso, plano, antropometria: avaliarAntropometria(caso), buscar: buscarAlimento, receitas: 'Salada.' })
    const { texto } = await textoDoDocx(await gerarBytes(doc))
    expect(texto).toContain('RECEITAS SAUDÁVEIS')
    expect(texto).toContain('Estagiário(a): Estagiária Exemplo')
    expect(texto).toContain('ASSINATURAS')
  })
```

Crie `src/ui/exportar/MenuExportarAssinatura.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { criarCasoVazio } from '@/domain/caso.ts'
import { criarPlanoPadrao } from '@/domain/plano.ts'
import type { Caso } from '@/domain/tipos.ts'
import { criarAconselhamento } from '@/export/aconselhamento-docx.ts'
import { MenuExportar } from './MenuExportar.tsx'

// Espia o que o menu manda para o Word, sem deixar de gerar o documento de verdade.
vi.mock('@/export/aconselhamento-docx.ts', async (original) => {
  const real = await original<typeof import('@/export/aconselhamento-docx.ts')>()
  return { ...real, criarAconselhamento: vi.fn(real.criarAconselhamento) }
})

let n = 0
const ids = () => `id${++n}`

const ANA: AssinaturaDoPlano = { situacao: 'nutricionista', linhaNutricionista: 'Ana Souza · CRN-6 12345', origem: 'conta', nome: 'Ana Souza', responsavelTecnico: '' }

describe('Word conforme a situação (CA-235, CA-252, CB-50, CB-51)', () => {
  beforeEach(() => {
    vi.mocked(criarAconselhamento).mockClear()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:teste')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => vi.restoreAllMocks())

  const baixar = async (caso: Caso, assinatura: AssinaturaDoPlano | null) => {
    render(<MenuExportar caso={caso} plano={criarPlanoPadrao(ids)} assinatura={assinatura} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))
    await usuario.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Aconselhamento em Word' }))
    await screen.findByText('Aconselhamento baixado.')
    return vi.mocked(criarAconselhamento).mock.calls[0]?.[0]
  }

  it('nutricionista: linha do cadastro e sem receitas', async () => {
    const dados = await baixar(criarCasoVazio('c1'), ANA)
    expect(dados?.nutricionista).toBe('Ana Souza · CRN-6 12345')
    expect(dados?.comReceitas).toBe(false)
  })

  it('CB-50 e CB-51: plano antigo de nutricionista sai como saía', async () => {
    const dados = await baixar({ ...criarCasoVazio('c1'), estagiario: 'Júlia', receitas: 'Cuscuz com ovo.' }, ANA)
    expect(dados?.nutricionista).toBeNull()
    expect(dados?.comReceitas).toBe(true)
  })

  it('estudante: Word de estágio de sempre', async () => {
    const dados = await baixar(criarCasoVazio('c1'), { ...ANA, situacao: 'estudante', linhaNutricionista: null })
    expect(dados?.nutricionista).toBeNull()
    expect(dados?.comReceitas).toBe(true)
  })
})
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `npx vitest run src/export/docx.test.ts src/ui/exportar`
Expected: FAIL — o Word sempre traz estagiário, preceptor e receitas, e o menu não aceita `assinatura`.

- [ ] **Passo 3: O Word**

Em `src/export/aconselhamento-docx.ts`, acrescente em `DadosAconselhamento`:

```ts
  /** CA-252: "Nome · CRN-6 12345" da nutricionista. Com texto (mesmo vazio), troca estagiário e preceptor por ela e deixa uma assinatura só. */
  readonly nutricionista?: string | null | undefined
  /** CA-235: `false` tira as receitas, título incluído. */
  readonly comReceitas?: boolean | undefined
```

Em `criarAconselhamento`, logo depois de `const { caso, plano, antropometria, buscar } = dados`, acrescente:

```ts
  const nutricionista = dados.nutricionista ?? null
```

Troque a última linha do cabeçalho:

```ts
    linha([celulaRotulo('Estagiário(a):', caso.estagiario, 2), celulaRotulo('Preceptor(a):', caso.preceptor, 2)]),
```

por:

```ts
    nutricionista === null
      ? linha([celulaRotulo('Estagiário(a):', caso.estagiario, 2), celulaRotulo('Preceptor(a):', caso.preceptor, 2)])
      : linha([celulaRotulo('Nutricionista:', nutricionista, 4)]),
```

Antes do `return new Document(…)`, acrescente:

```ts
  const receitas = dados.comReceitas === false ? [] : [subtitulo('RECEITAS SAUDÁVEIS'), ...blocoTexto(dados.receitas)]
  const data = new Paragraph({ spacing: { before: 480 }, children: [new TextRun('Data: ____/____/________')] })
  const assinaturas =
    nutricionista === null
      ? [
          subtitulo('ASSINATURAS'),
          new Paragraph({ spacing: { before: 480 }, children: [new TextRun('Preceptor(a): ______________________________')] }),
          new Paragraph({ spacing: { before: 480 }, children: [new TextRun('Estagiário(a): ______________________________')] }),
          data,
        ]
      : [subtitulo('ASSINATURA'), new Paragraph({ spacing: { before: 480 }, children: [new TextRun('Nutricionista: ______________________________')] }), data]
```

E troque, dentro de `children`, tudo de `subtitulo('RECEITAS SAUDÁVEIS'),` até o parágrafo da data por:

```ts
          ...receitas,
          ...assinaturas,
```

- [ ] **Passo 4: O menu**

Em `src/ui/exportar/MenuExportar.tsx`, acrescente o import:

```ts
import { mostraReceitas, nutricionistaDoWord, type AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
```

Na interface, depois de `responsavel`:

```ts
  /** Quem assina e a situação: o Word de nutricionista sai sem receitas e com uma assinatura só (CA-235, CA-252). */
  readonly assinatura?: AssinaturaDoPlano | null | undefined
```

Troque a assinatura do componente por `export function MenuExportar({ caso, plano, bloqueio, responsavel, assinatura }: MenuExportarProps) {` e, no `criarAconselhamento({ … })`, acrescente depois de `receitas: caso.receitas,`:

```ts
      nutricionista: nutricionistaDoWord(assinatura ?? null, caso),
      comReceitas: mostraReceitas(assinatura?.situacao ?? null, caso),
```

- [ ] **Passo 5: Rodar e ver passar**

Run: `npx vitest run src/export src/ui/exportar`
Expected: PASS (os testes antigos do Word e do menu continuam verdes: sem `assinatura`, nada muda).

- [ ] **Passo 6: Portão e commit**

Run: `npm run check`

```bash
printf '%s\n' 'feat(word): aconselhamento de nutricionista assinado pelo cadastro' '' 'Nutricionista sai com "Nutricionista: Nome · CRN" e uma assinatura só,' 'e sem receitas; plano antigo e estudante saem como antes (CA-235,' 'CA-236, CA-252, CB-50, CB-51).' '' 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>' > ../_msg.txt
git add src/export src/ui/exportar
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 8: Identificação e Orientações pela situação, montagem no App

Cobre CA-234, CA-236, CA-251, CA-253, CB-50, CB-51, CB-54, CB-69 na tela e o Foco de revisão 5.

**Arquivos:**
- Alterar: `src/ui/caso/TelaCaso.tsx`
- Criar: `src/ui/caso/situacaoNoPlano.test.tsx`
- Alterar: `src/App.tsx`
- Alterar: `src/App.test.tsx`

**Interfaces:**
- Consome: `assinaturaDoPlano`, `mostraCamposDeEstagio`, `mostraReceitas`, `camposDeEstagioIniciais` (Tarefa 6); `MenuExportar.assinatura` (Tarefa 7); `lerPerfil` (`perfil.ts`).
- Produz: `TelaCaso` ganha `assinatura?: AssinaturaDoPlano | null | undefined`.

- [ ] **Passo 1: Escrever os testes que falham**

Crie `src/ui/caso/situacaoNoPlano.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { useState } from 'react'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { criarCasoVazio } from '@/domain/caso.ts'
import type { Caso } from '@/domain/tipos.ts'
import { TelaCaso } from './TelaCaso.tsx'

const ANA: AssinaturaDoPlano = { situacao: 'nutricionista', linhaNutricionista: 'Ana Souza · CRN-6 12345', origem: 'conta', nome: 'Ana Souza', responsavelTecnico: '' }
const JULIA: AssinaturaDoPlano = { situacao: 'estudante', linhaNutricionista: null, origem: 'conta', nome: 'Júlia Martins', responsavelTecnico: 'Carla Mendes' }

function Anfitriao({ assinatura, inicial }: { readonly assinatura: AssinaturaDoPlano | null; readonly inicial?: Partial<Caso> }) {
  const [caso, setCaso] = useState<Caso>({ ...criarCasoVazio('c1'), ...inicial })
  return <TelaCaso caso={caso} aoAlterar={(m) => setCaso((c) => ({ ...c, ...m }))} assinatura={assinatura} />
}

const montar = (assinatura: AssinaturaDoPlano | null, inicial?: Partial<Caso>) =>
  render(<Anfitriao assinatura={assinatura} {...(inicial ? { inicial } : {})} />)

describe('Identificação pela situação (CA-251, CB-51, CB-69)', () => {
  it('CA-251: nutricionista não vê estagiário nem preceptor, e vê quem assina', () => {
    montar(ANA)
    expect(screen.queryByLabelText('Estagiário(a)')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Preceptor(a)')).not.toBeInTheDocument()
    expect(screen.getByText(/Assina este plano:/)).toBeInTheDocument()
    expect(screen.getByText('Ana Souza · CRN-6 12345')).toBeInTheDocument()
    expect(screen.getByText('Vem do seu cadastro.')).toBeInTheDocument()
  })

  it('CB-51: plano antigo com estagiário preenchido mostra os campos com o texto', () => {
    montar(ANA, { estagiario: 'Júlia Martins' })
    expect(screen.getByLabelText('Estagiário(a)')).toHaveValue('Júlia Martins')
    expect(screen.getByLabelText('Preceptor(a)')).toHaveValue('')
    expect(screen.queryByText(/Assina este plano:/)).not.toBeInTheDocument()
  })

  it('CB-69: conta sem situação fica como era', () => {
    montar({ ...ANA, situacao: null, linhaNutricionista: null })
    expect(screen.getByLabelText('Estagiário(a)')).toBeInTheDocument()
    expect(screen.queryByText(/Assina este plano:/)).not.toBeInTheDocument()
  })

  it('estudante vê os dois campos e de onde eles vêm', () => {
    montar(JULIA)
    expect(screen.getByLabelText('Estagiário(a)')).toBeInTheDocument()
    expect(screen.getByText(/Em plano novo, Estagiário\(a\) vem do nome da sua conta/)).toBeInTheDocument()
  })

  it('Foco de revisão 5: nutricionista sem nome e CRN em Quem assina é mandada para lá', () => {
    montar({ ...ANA, origem: 'aparelho', linhaNutricionista: null, nome: '' })
    expect(screen.getByText('nome e CRN não informados')).toBeInTheDocument()
    expect(screen.getByText('Preencha em Configurações › Quem assina.')).toBeInTheDocument()
  })
})

describe('Receitas só para estudante (CA-234, CA-236, CB-50)', () => {
  it('CA-234: nutricionista vê só Orientações', () => {
    montar(ANA)
    expect(screen.getByRole('heading', { name: 'Orientações' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Receitas')).not.toBeInTheDocument()
  })

  it('CB-50: receitas já escritas continuam aparecendo', () => {
    montar(ANA, { receitas: 'Cuscuz com ovo.' })
    expect(screen.getByRole('heading', { name: 'Orientações e receitas' })).toBeInTheDocument()
    expect(screen.getByLabelText('Receitas')).toHaveValue('Cuscuz com ovo.')
  })

  it('CA-236: estudante continua com o campo Receitas', () => {
    montar(JULIA)
    expect(screen.getByRole('heading', { name: 'Orientações e receitas' })).toBeInTheDocument()
    expect(screen.getByLabelText('Receitas')).toBeInTheDocument()
  })
})
```

Em `src/App.test.tsx`, troque o import do Testing Library por `import { cleanup, render, screen, within } from '@testing-library/react'`, acrescente `import { PERFIL_VAZIO } from './domain/perfil.ts'` e, no fim do arquivo:

```tsx
describe('App: quem assina, sem servidor (CA-251, CA-253, CB-54)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(CHAVE_AVISO_VISTO, '1')
    window.location.hash = ''
  })

  const guardarPerfil = (perfil: Partial<typeof PERFIL_VAZIO>) => localStorage.setItem('metanutri:perfil', JSON.stringify({ ...PERFIL_VAZIO, ...perfil }))

  const novoPlano = async () => {
    renderizar()
    const usuario = userEvent.setup()
    await usuario.click(menuFixo().getByRole('button', { name: 'Novo plano' }))
    await usuario.click(screen.getByRole('menuitem', { name: /Atendimento completo/ }))
  }

  it('CA-253: estudante começa o plano com estagiário e preceptor preenchidos', async () => {
    guardarPerfil({ nome: 'Júlia Martins', tipo: 'estudante', responsavel: 'Carla Mendes' })
    await novoPlano()
    expect(screen.getByLabelText('Estagiário(a)')).toHaveValue('Júlia Martins')
    expect(screen.getByLabelText('Preceptor(a)')).toHaveValue('Carla Mendes')
  })

  it('CA-253: mudar Quem assina depois não muda o plano que já existe', async () => {
    guardarPerfil({ nome: 'Júlia Martins', tipo: 'estudante' })
    await novoPlano()
    const endereco = window.location.hash
    guardarPerfil({ nome: 'Outra Pessoa', tipo: 'estudante' })
    cleanup()
    window.location.hash = endereco
    renderizar()
    expect(screen.getByLabelText('Estagiário(a)')).toHaveValue('Júlia Martins')
  })

  it('CA-251 e CB-54: nutricionista em Configurações assina o plano sem digitar', async () => {
    guardarPerfil({ nome: 'Ana Souza', tipo: 'profissional', crn: 'CRN-6 12345' })
    await novoPlano()
    expect(screen.queryByLabelText('Estagiário(a)')).not.toBeInTheDocument()
    expect(screen.getByText('Ana Souza · CRN-6 12345')).toBeInTheDocument()
    expect(screen.getByText('Vem de Configurações › Quem assina.')).toBeInTheDocument()
  })
})
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/caso/situacaoNoPlano.test.tsx src/App.test.tsx`
Expected: FAIL — `TelaCaso` não aceita `assinatura`, e o plano novo nasce com os campos vazios.

- [ ] **Passo 3: `TelaCaso`**

Em `src/ui/caso/TelaCaso.tsx`:

1. Troque `import { Ruler } from 'lucide-react'` por `import { Ruler, UserRound } from 'lucide-react'` e acrescente:

```ts
import { mostraCamposDeEstagio, mostraReceitas, type AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
```

2. Na interface, depois de `lateral`:

```ts
  /** Quem assina e a situação (US-A2, US-A4); sem ela, o plano fica como era (CB-69). */
  readonly assinatura?: AssinaturaDoPlano | null | undefined
```

3. Acrescente `assinatura` na desestruturação das props e, logo depois de `const { erros } = validacao`:

```ts
  const situacao = assinatura?.situacao ?? null
  const camposDeEstagio = mostraCamposDeEstagio(situacao, caso)
  const comReceitas = mostraReceitas(situacao, caso)
```

4. Troque os dois campos de estágio:

```tsx
            <CampoTexto rotulo="Estagiário(a)" valor={caso.estagiario} aoMudar={(v) => aoAlterar({ estagiario: v })} />
            <CampoTexto rotulo="Preceptor(a)" valor={caso.preceptor} aoMudar={(v) => aoAlterar({ preceptor: v })} />
          </div>
```

por:

```tsx
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
                    ? 'Preencha em Configurações › Quem assina.'
                    : assinatura.origem === 'conta'
                      ? 'Vem do seu cadastro.'
                      : 'Vem de Configurações › Quem assina.'}
                </span>
              </p>
            </div>
          )}
```

5. No cartão de orientações, troque `<CardTitle>Orientações e receitas</CardTitle>` por `<CardTitle>{comReceitas ? 'Orientações e receitas' : 'Orientações'}</CardTitle>` e envolva o bloco do campo Receitas:

```tsx
          {comReceitas ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="receitas">Receitas</Label>
              <Textarea id="receitas" rows={4} value={caso.receitas} onChange={(e) => aoAlterar({ receitas: e.target.value })} />
            </div>
          ) : null}
```

- [ ] **Passo 4: `App`**

Em `src/App.tsx`:

1. Imports: acrescente

```ts
import { assinaturaDoPlano, camposDeEstagioIniciais } from './domain/assinaturaDoPlano.ts'
import { lerPerfil } from './domain/perfil.ts'
```

e troque `import { exportacaoBloqueada, formatarCrn, MOTIVO_EXPORTACAO_BLOQUEADA } from './domain/situacao.ts'` por `import { exportacaoBloqueada, MOTIVO_EXPORTACAO_BLOQUEADA } from './domain/situacao.ts'`.

2. Troque:

```ts
  // CA-287: a folha da dieta sai com o nome e o CRN da conta de nutricionista.
  const responsavel = perfil?.situacao === 'nutricionista' && perfil.crn ? `${perfil.nome || (sessao?.nome ?? '')} · ${formatarCrn(perfil.crn)}` : null
```

por:

```ts
  // Quem assina os planos: a conta, ou Configurações quando não há servidor (spec ajustes-de-uso, D-37).
  const quemAssina = assinaturaDoPlano({ servidor: conta.disponivel, perfilConta: perfil, nomeDaSessao: sessao?.nome ?? '', perfilLocal: lerPerfil(arm) })
  // CA-287: a folha da dieta sai com o nome e o CRN da conta de nutricionista.
  const responsavel = conta.disponivel ? quemAssina.linhaNutricionista : null
```

3. Em `novoCaso`, dentro de `caso: { … }`, logo depois de `pacienteId,`, acrescente:

```ts
        // CA-253: plano de estudante nasce com estagiário e preceptor.
        ...camposDeEstagioIniciais(quemAssina),
```

4. Passe a assinatura para o plano e para o Word:

```tsx
        acoes={<MenuExportar caso={registro.caso} plano={registro.plano} bloqueio={bloqueio} responsavel={responsavel} assinatura={quemAssina} />}
```

```tsx
            <TelaCaso
              caso={registro.caso}
              aoAlterar={alterarCaso}
              assinatura={quemAssina}
```

- [ ] **Passo 5: Rodar e ver passar**

Run: `npx vitest run src/ui/caso src/App.test.tsx src/AppConta.test.tsx`
Expected: PASS (o teste antigo "CA-01: mostra todos os campos do cabeçalho do estágio" continua verde: sem `assinatura`, os campos aparecem).

- [ ] **Passo 6: Portão, e2e e commit**

Run: `npm run check` e `npx playwright test`

```bash
printf '%s\n' 'feat(caso): plano assinado pela situação da conta' '' 'Nutricionista vê "Assina este plano: Nome · CRN" no lugar de estagiário' 'e preceptor, e Orientações sem receitas; estudante começa o plano com' 'os dois campos preenchidos (CA-234, CA-236, CA-251, CA-253, CB-50,' 'CB-51, CB-54, CB-69).' '' 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>' > ../_msg.txt
git add src/ui/caso src/App.tsx src/App.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 9: e2e e documentação

Cobre o caminho inteiro em navegador real e deixa as decisões e a pendência da revisão registradas.

**Arquivos:**
- Alterar: `e2e/planejador.spec.ts`
- Alterar: `docs/decisoes.md`
- Alterar: `docs/pendencias.md`

**Interfaces:**
- Consome: tudo das Tarefas 2, 5 e 8.

- [ ] **Passo 1: Escrever o e2e**

Em `e2e/planejador.spec.ts`, acrescente depois do primeiro teste:

```ts
test('prescrição rápida: meta calculada e sugestões por refeição', async ({ page }) => {
  await abrirLimpo(page)
  await page.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' }).getByRole('button', { name: 'Entendi' }).click()

  await page.getByRole('button', { name: 'Novo plano' }).first().click()
  await page.getByRole('menuitem', { name: /Prescrição rápida/ }).click()

  await page.getByRole('radio', { name: 'Feminino' }).click()
  await preencher(page, 'Idade', '28')
  await preencher(page, 'Peso', '62')
  await preencher(page, 'Estatura', '163')
  await page.getByRole('radio', { name: 'Moderadamente ativo (1,55)' }).click()

  // CA-226: a meta sai pronta, e o Resumo do dia usa ela
  await expect(page.getByLabel('Meta de energia')).toHaveAttribute('placeholder', '2.074')
  const resumo = page.getByRole('region', { name: 'Resumo do dia' })
  await expect(resumo).toContainText('Meta calculada')
  await expect(resumo).toContainText('2.074 kcal')

  // CA-237 e CA-238: a sugestão entra com um clique
  await page.getByRole('button', { name: /Próxima etapa: Plano alimentar/ }).click()
  const almoco = page.getByRole('tabpanel', { name: 'Principal de Almoço' })
  await almoco.getByRole('button', { name: 'Adicionar Arroz, tipo 1, cozido, 100 g' }).click()
  await expect(page.getByRole('list', { name: 'Alimentos em Principal de Almoço' }).getByRole('listitem')).toHaveCount(1)

  // CA-241 e CA-243: tirar uma sugestão vale depois de recarregar
  await almoco.getByRole('button', { name: 'Editar sugestões para o almoço' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Sugestões para o almoço' })
  await dialogo.getByRole('button', { name: 'Tirar Tomate, com semente, cru' }).click()
  await dialogo.getByRole('button', { name: 'Salvar' }).click()
  await expect(dialogo).toBeHidden()
  await expect(almoco.getByRole('button', { name: 'Adicionar Tomate, com semente, cru, 80 g' })).toHaveCount(0)

  await page.reload()
  const almocoDepois = page.getByRole('tabpanel', { name: 'Principal de Almoço' })
  await expect(almocoDepois.getByRole('button', { name: 'Adicionar Feijão, carioca, cozido, 140 g' })).toBeVisible()
  await expect(almocoDepois.getByRole('button', { name: 'Adicionar Tomate, com semente, cru, 80 g' })).toHaveCount(0)
})
```

- [ ] **Passo 2: Rodar o e2e**

Run: `npx playwright test e2e/planejador.spec.ts`
Expected: PASS nos três testes do arquivo. Se algum seletor não bater, confira a tela no navegador (`npm run dev`) antes de mexer no teste: o teste descreve a SPEC.

- [ ] **Passo 3: Documentação**

Em `docs/decisoes.md`, acrescente esta linha no fim da tabela, depois da linha de 30/09/2026 (antes do parágrafo "Custos de referência"):

```markdown
| 01/10/2026 | **Planejador com cadastro** (D-32 a D-38 da `specs/ajustes-de-uso/SPEC.md`, resumidas aqui): D-32 nível de atividade junto de peso e estatura, com a meta do modo rápido calculada e o número digitado valendo mais · D-33 IMC só no atendimento completo · D-34 receitas só para estudante · D-35 sugestões por tipo de refeição numa lista que a pessoa edita, sem aprender sozinhas, no lugar do "Você usa muito" · D-36 leite integral fora da lista padrão, porque a base não tem a energia dele · D-37 a situação vem da conta, ou de Configurações sem servidor · D-38 nutricionista assina o plano e o Word com nome e CRN do cadastro | decisões suas de 30/09 e 01/10/2026, vistas no protótipo "Planejador com cadastro" | usuário |
```

Em `docs/pendencias.md`:

1. Troque `Atualizado em 30/09/2026.` por `Atualizado em 01/10/2026.`
2. Logo antes de `## Já feito, só para você não procurar`, acrescente:

```markdown
### 9. A lista padrão de sugestões precisa de uma nutricionista

Desde 01/10 cada refeição sugere alimentos de uma lista padrão (spec `ajustes-de-uso`,
seção 3.1), que a pessoa pode editar. A lista foi montada por mim, com alimentos comuns
no Nordeste (R-20). Antes de publicar, uma nutricionista precisa olhar alimento e porção.
Dois itens já leem estranho na tela, porque a medida mostrada sai da conversão de sempre
do app: o tomate (80 g) aparece como "5 fatias e meia" e o iogurte (200 g) como "1 copo
americano e meio".
```

3. Em "Já feito", troque `Frequentes, duplicar plano,` por `Sugestões por refeição (no lugar dos frequentes), duplicar plano,`.

- [ ] **Passo 4: Portão completo e commit**

Run: `npm run check` e `npx playwright test`
Expected: tudo verde.

```bash
printf '%s\n' 'test(e2e): meta calculada e sugestões por refeição' '' 'Caminho da prescrição rápida com a meta pronta, sugestão com um clique' 'e edição que sobrevive ao recarregar; decisões e a revisão da lista' 'padrão registradas.' '' 'Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>' > ../_msg.txt
git add e2e/planejador.spec.ts docs/decisoes.md docs/pendencias.md
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

## Cobertura da spec

| Critério | Onde é implementado | Onde é testado |
|---|---|---|
| D-32 · CA-225 | T2 (`CampoNivelAtividade`, `TelaCaso`) | T2 `modoRapido.test`, `nivelAtividade.test` |
| CA-226 a CA-229 | T1 (`calcularEnergia`, `estadoDaMeta`), T2 (`CampoMetaEnergia`, `ResumoDoDia`) | T1 `energia.test`; T2 `modoRapido.test`, `ResumoDoDia.test`; T9 e2e |
| CA-230 | T1, T2 | T1 `energia.test`; T2 `modoRapido.test` |
| CA-231 | T2 (`AjusteEnergia` com o mesmo campo) | T2 `nivelAtividade.test` |
| CA-232 | T2 (`CampoNivelAtividade`) | T2 `modoRapido.test` |
| D-33 · CA-233 | nada muda (o modo rápido já não classifica) | T2 `modoRapido.test` |
| D-34 · CA-234 | T6, T8 | T6 `assinaturaDoPlano.test`; T8 `situacaoNoPlano.test` |
| CA-235 | T7 (Word); a folha já só mostra receitas escritas | T7 `docx.test`, `MenuExportarAssinatura.test` |
| CA-236 | T6, T7, T8 | T7 `docx.test`; T8 `situacaoNoPlano.test` |
| D-35 · CA-237, CA-238 | T4 | T4 `TelaPlano.test`; T9 e2e |
| CA-239, CA-240 | T3 (`tipoDaRefeicao`) | T3 `sugestoes.test` |
| CA-241, CA-242 | T5 (`DialogoSugestoes`) | T5 `DialogoSugestoes.test`; T9 e2e |
| CA-243 | T3 (repositório), T4 (`useSugestoes`), T5 | T3 `sugestoes.test`; T5 `DialogoSugestoes.test`, `TelaPlano.test`; T9 e2e |
| CA-306 | T3, T4, T5 (link) | T3 `sugestoes.test`; T4 e T5 `TelaPlano.test` |
| CA-307 | T4 (`quandoVazio`) | T4 `EntradaRapida.test`, `TelaPlano.test` |
| 3.1 · D-36 | T3 (`SUGESTOES_PADRAO`) | T3 `sugestoes.test` |
| D-37 | T6, T8 (`App`) | T6 `assinaturaDoPlano.test`; T8 `App.test` |
| D-38 · CA-251 | T6, T8 | T8 `situacaoNoPlano.test`, `App.test` |
| CA-252 | T6, T7 | T6 `assinaturaDoPlano.test`; T7 `docx.test`, `MenuExportarAssinatura.test` |
| CA-253 | T6, T8 (`novoCaso`) | T6 `assinaturaDoPlano.test`; T8 `App.test` |
| CB-50 | T6, T7, T8 | T6, T7 `MenuExportarAssinatura.test`, T8 `situacaoNoPlano.test` |
| CB-51 | T6, T7, T8 | T6, T7 `MenuExportarAssinatura.test`, T8 `situacaoNoPlano.test` |
| CB-54 | T6, T8 | T6 `assinaturaDoPlano.test`; T8 `App.test` |
| CB-55 | T4 (frequentes apagado) | T4 `EntradaRapida.test`, `TelaPlano.test` |
| CB-56 | T1 | T1 `energia.test` |
| CB-57 | T3 (`sugestoesProntas`) | T3 `sugestoes.test` |
| CB-69 | T6, T8 | T6 `assinaturaDoPlano.test`; T8 `situacaoNoPlano.test` |
| CB-70 | T3, T5 | T3 `sugestoes.test`; T5 `DialogoSugestoes.test` |
| R-20 | — (fica com você) | T9 registra em `docs/pendencias.md` |
| R-22 | T3 (lista no aparelho, no backup) | T3 `sugestoes.test` (chave em `CHAVES_DE_DADOS`) |
| R-27 | T1 (mesma fórmula do completo) | T1 `energia.test` (CA-226 compara com o completo) |
