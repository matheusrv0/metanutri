// Spec marca-no-link: a cor da nutricionista (D-953 a D-955). Os números esperados vêm da SPEC (D-963, CA-1960) e de
// cores medidas à parte, nunca da mesma conta do código.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { avaliarCor, contraste, COR_PADRAO, CORES_PRONTAS, ehCorPadrao, FUNDO_ESCURO_DO_LINK, formatarContraste, normalizarCor } from './corDaMarca.ts'

/** Matiz (em graus) e saturação HSL, lidos do hexadecimal: a régua do teste, separada da do código. */
function matizESaturacao(hex: string): { readonly h: number; readonly s: number } {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0 }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: h * 60, s }
}

/** Sorteio com semente: o teste sorteia as mesmas 200 cores toda vez. */
function sorteador(semente: number): () => number {
  let x = semente
  return () => {
    x = (x * 1103515245 + 12345) & 0x7fffffff
    return x / 0x7fffffff
  }
}

describe('cor da marca: o formato (CA-1958)', () => {
  it('CA-1958: aceita com ou sem #, em maiúscula ou minúscula, e grava em minúscula', () => {
    expect(normalizarCor('#1f4e8c')).toBe('#1f4e8c')
    expect(normalizarCor('1F4E8C')).toBe('#1f4e8c')
    expect(normalizarCor('  #1F4e8C ')).toBe('#1f4e8c')
  })

  it('CA-1958: o que não é #RRGGBB não vale', () => {
    for (const texto of ['', '#', '#1f4e8', '#1f4e8cc', '1f4e8g', 'azul', '#fff', 'rgb(0,0,0)']) expect(normalizarCor(texto), texto).toBeNull()
  })
})

describe('cor da marca: o contraste com o texto branco (D-954)', () => {
  it('D-963 e CA-1959: o azul pronto mede 8,31:1 com o branco', () => {
    const azul = avaliarCor('#1f4e8c')
    expect(formatarContraste(azul.contraste)).toBe('8,31')
    expect(azul.aceita).toBe(true)
  })

  it('CA-1960: #8CC63F mede 2,05:1, é recusada e sugere #587F26, que mede 4,69:1', () => {
    const verde = avaliarCor('#8cc63f')
    expect(formatarContraste(verde.contraste)).toBe('2,05')
    expect(verde.aceita).toBe(false)
    expect(verde.sugestao).toBe('#587f26')
    const sugerida = avaliarCor('#587f26')
    expect(formatarContraste(sugerida.contraste)).toBe('4,69')
    expect(sugerida.aceita).toBe(true)
  })

  it('CA-1961: 4,4987:1 sem arredondar é recusada e aparece como 4,49; 4,5003:1 é aceita', () => {
    const quase = avaliarCor('#018580')
    expect(quase.contraste).toBeGreaterThan(4.498)
    expect(quase.contraste).toBeLessThan(4.5)
    expect(quase.aceita).toBe(false)
    expect(formatarContraste(quase.contraste)).toBe('4,49')
    const passa = avaliarCor('#7f7380')
    expect(passa.contraste).toBeGreaterThanOrEqual(4.5)
    expect(passa.aceita).toBe(true)
    expect(formatarContraste(passa.contraste)).toBe('4,50')
  })

  it('a sugestão de uma cor aceita é ela mesma', () => {
    expect(avaliarCor('#3f5f2a').sugestao).toBe('#3f5f2a')
  })

  it('o contraste é simétrico e vai de 1:1 a 21:1', () => {
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contraste('#ffffff', '#000000')).toBeCloseTo(21, 5)
    expect(contraste('#777777', '#777777')).toBe(1)
  })
})

describe('cor da marca: as prontas (D-953, CA-1957)', () => {
  it('CA-1957: são as seis da SPEC, com nome e código, na ordem', () => {
    expect(CORES_PRONTAS.map((c) => [c.nome, c.valor])).toEqual([
      ['Padrão do MetaNutri', '#0e3b43'],
      ['Verde-água', '#0f6e66'],
      ['Verde-folha', '#3f5f2a'],
      ['Azul', '#1f4e8c'],
      ['Vinho', '#7a2944'],
      ['Rosa-escuro', '#b5476b'],
    ])
  })

  it('CA-1957: todas passam no D-954 (4,5:1 ou mais com o branco)', () => {
    for (const cor of CORES_PRONTAS) expect(avaliarCor(cor.valor).aceita, cor.nome).toBe(true)
  })

  it('CB-960: a padrão, também digitada, é "sem cor própria"', () => {
    expect(COR_PADRAO).toBe('#0e3b43')
    expect(ehCorPadrao(normalizarCor('#0E3B43'))).toBe(true)
    expect(ehCorPadrao('#1f4e8c')).toBe(false)
    expect(ehCorPadrao(null)).toBe(true)
  })
})

describe('cor da marca: a versão do escuro (D-955, CA-1962)', () => {
  const cores = (() => {
    const sortear = sorteador(20261029)
    const aceitas: string[] = CORES_PRONTAS.map((c) => c.valor)
    while (aceitas.length < CORES_PRONTAS.length + 200) {
      const cor = `#${[0, 0, 0].map(() => Math.floor(sortear() * 256).toString(16).padStart(2, '0')).join('')}`
      if (avaliarCor(cor).aceita) aceitas.push(cor)
    }
    return aceitas
  })()

  it('CA-1962: as seis prontas e 200 sorteadas dão 7:1 ou mais contra #101A1D', () => {
    expect(cores).toHaveLength(206)
    for (const cor of cores) expect(contraste(avaliarCor(cor).escuro, FUNDO_ESCURO_DO_LINK), cor).toBeGreaterThanOrEqual(7)
  })

  it('CA-1962: a versão do escuro tem o mesmo matiz e a mesma saturação (a menos do arredondamento para 8 bits)', () => {
    for (const cor of cores) {
      const antes = matizESaturacao(cor)
      const depois = matizESaturacao(avaliarCor(cor).escuro)
      expect(Math.abs(depois.s - antes.s), `${cor} saturação`).toBeLessThanOrEqual(0.012)
      if (antes.s < 0.05) continue // cinza: o matiz não existe
      const diferenca = Math.abs(depois.h - antes.h)
      expect(Math.min(diferenca, 360 - diferenca), `${cor} matiz`).toBeLessThanOrEqual(4)
    }
  })

  it('D-955: a versão do escuro fica mais clara, nunca mais escura', () => {
    expect(avaliarCor('#3f5f2a').escuro).toBe('#7ab455')
    expect(contraste(avaliarCor('#3f5f2a').escuro, '#ffffff')).toBeLessThan(contraste('#3f5f2a', '#ffffff'))
  })
})

describe('cor da marca: os valores fixos batem com os tokens (DP-ML-21)', () => {
  it('o fundo escuro do link é o --carvao-900 e a padrão é o --teal-900', () => {
    const tokens = readFileSync(join(process.cwd(), 'design-system', 'tokens', 'tokens.css'), 'utf8')
    expect(tokens).toContain(`--carvao-900: ${FUNDO_ESCURO_DO_LINK};`)
    expect(tokens).toContain(`--teal-900: ${COR_PADRAO};`)
  })
})
