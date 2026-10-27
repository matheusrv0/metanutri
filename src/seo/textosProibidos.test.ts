// CA-990 (spec site-publico-profissional): a guarda dos textos que o dono já mandou tirar do site público.
// Lê o código-fonte, não a tela: pega o texto antes de ele chegar a qualquer página, em qualquer largura.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const RAIZ = process.cwd()

function arquivos(pasta: string, aceitar: (nome: string) => boolean): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome)
    if (statSync(caminho).isDirectory()) return arquivos(caminho, aceitar)
    return aceitar(nome) ? [caminho] : []
  })
}

const ehCodigo = (nome: string) => /\.(ts|tsx)$/.test(nome) && !/\.test\.|\.test-utils\./.test(nome)

/** O que o site público mostra ou publica: as telas, o cabeçalho da página e os arquivos de texto da raiz. */
const ALVOS = [
  ...arquivos(join(RAIZ, 'src', 'ui', 'publico'), ehCodigo),
  ...arquivos(join(RAIZ, 'src', 'seo'), ehCodigo),
  join(RAIZ, 'index.html'),
  // CA-1029: a frase dos cálculos também saiu da Ajuda da área de trabalho; o dono não a quer em lugar nenhum.
  join(RAIZ, 'src', 'ui', 'ajuda', 'TelaAjuda.tsx'),
  ...arquivos(join(RAIZ, 'public'), (nome) => /\.(txt|xml|webmanifest)$/.test(nome)),
]

const PROIBIDOS: readonly (readonly [string, RegExp])[] = [
  // D-78 da limpeza-visual: não existe preço de fundador, nem vagas, nem preço que não sobe.
  ['preço de fundador', /fundador/i],
  ['vagas de fundador', /200 primeiras/i],
  // DP-26 da dados-na-nuvem: sem internet, a área de trabalho trava. Frase que avisa que a pessoa está sem internet passa.
  ['promessa de uso sem internet', /\b(até|funciona|abre|usa|trabalha|roda)\s+(mesmo\s+)?sem\s+internet/i],
  ['promessa de uso offline', /\boffline\b/i],
  // D-322 e D-323: a frase que diminuía o produto.
  ['"não foram conferidos"', /não\s+foram\s+conferidos/i],
  // D-77 da limpeza-visual: rótulo em caixa alta com bolinha acima de título ("• COMO FUNCIONA").
  ['rótulo com bolinha', /[•·]\s*\p{Lu}{2,}(\s+\p{Lu}{2,})*/u],
]

const achados = (padrao: RegExp) =>
  ALVOS.flatMap((arquivo) => {
    const texto = readFileSync(arquivo, 'utf8')
    return padrao.test(texto) ? [relative(RAIZ, arquivo)] : []
  })

describe('CA-990: textos proibidos no site público', () => {
  it('a varredura enxerga as telas públicas, o index.html e a raiz do site', () => {
    const lidos = ALVOS.map((arquivo) => relative(RAIZ, arquivo).replaceAll('\\', '/'))
    expect(lidos).toContain('src/ui/publico/MolduraPublica.tsx')
    expect(lidos).toContain('src/ui/publico/TelaInicio.tsx')
    expect(lidos).toContain('src/ui/publico/TelaTermos.tsx')
    expect(lidos).toContain('index.html')
    expect(lidos).toContain('src/ui/ajuda/TelaAjuda.tsx')
    expect(lidos.some((nome) => nome.includes('.test.'))).toBe(false)
  })

  it.each(PROIBIDOS)('nenhum arquivo tem %s', (_nome, padrao) => {
    expect(achados(padrao)).toEqual([])
  })

  it('o menu do topo não está em caixa alta (D-321)', () => {
    const moldura = readFileSync(join(RAIZ, 'src', 'ui', 'publico', 'MolduraPublica.tsx'), 'utf8')
    expect(moldura).not.toMatch(/\buppercase\b/)
    expect(moldura).not.toMatch(/tracking-\[0\.0[5-9]em\]/)
  })

  it('as frases verdadeiras sobre internet continuam permitidas', () => {
    const promessa = PROIBIDOS.find(([nome]) => nome === 'promessa de uso sem internet')?.[1]
    expect(promessa?.test('Você está sem internet. Conecte-se para entrar e abrir seus dados.')).toBe(false)
    expect(promessa?.test('Sem internet, o MetaNutri não deixa editar até a conexão voltar.')).toBe(false)
    expect(promessa?.test('Funciona no navegador, até sem internet.')).toBe(true)
  })
})

/**
 * CA-1482 (spec landing-escura, D-542 e D-543): autoridade própria. O texto de venda fala em "Base MetaNutri" e em
 * "referências de ingestão"; os nomes das fontes ficam só na página Referências (TelaFontes.tsx e a entrada `fontes` de
 * paginas.ts), onde a licença manda citar.
 */
describe('CA-1482: o texto de venda não nomeia as fontes da base', () => {
  const FONTES = /\b(TACO|IBGE|POF|USDA|NASEM|DRIs?|Open Food Facts)\b/
  const REFERENCIAS = join(RAIZ, 'src', 'ui', 'publico', 'TelaFontes.tsx')
  const PAGINAS_DO_SITE = join(RAIZ, 'src', 'seo', 'paginas.ts')
  const VENDA = [
    ...ALVOS.filter((arquivo) => arquivo !== REFERENCIAS && arquivo !== PAGINAS_DO_SITE && !arquivo.endsWith('TelaAjuda.tsx')),
    join(RAIZ, 'public', 'llms.txt'),
  ]

  it('a varredura lê a landing nova, a moldura, Preços, o index.html e o llms.txt, e deixa Referências de fora', () => {
    const lidos = VENDA.map((arquivo) => relative(RAIZ, arquivo).replaceAll('\\', '/'))
    for (const esperado of [
      'src/ui/publico/TelaInicio.tsx',
      'src/ui/publico/inicio/AdequacaoDoExemplo.tsx',
      'src/ui/publico/inicio/PerguntasFrequentes.tsx',
      'src/ui/publico/MolduraPublica.tsx',
      'src/ui/publico/SecaoPrecos.tsx',
      'index.html',
      'public/llms.txt',
    ]) {
      expect(lidos).toContain(esperado)
    }
    expect(lidos).not.toContain('src/ui/publico/TelaFontes.tsx')
  })

  it('nenhum arquivo de venda cita TACO, IBGE, POF, USDA, NASEM, DRI ou Open Food Facts', () => {
    const comFonte = VENDA.filter((arquivo) => FONTES.test(readFileSync(arquivo, 'utf8'))).map((arquivo) => relative(RAIZ, arquivo))
    expect(comFonte).toEqual([])
  })

  it('o título e a descrição das páginas indexáveis também não; só a de Referências cita', async () => {
    const { PAGINAS } = await import('./paginas.ts')
    for (const pagina of PAGINAS.filter((p) => p.rota !== 'fontes')) {
      expect(`${pagina.titulo} ${pagina.descricao}`, pagina.rota).not.toMatch(FONTES)
    }
    const referencias = PAGINAS.find((p) => p.rota === 'fontes')
    expect(referencias?.titulo).toBe('Referências da Base MetaNutri')
  })

  it('a guarda pega o nome de uma fonte no meio do texto', () => {
    expect(FONTES.test('A adequação segue as DRI.')).toBe(true)
    expect(FONTES.test('Tabela TACO, 4ª edição')).toBe(true)
    expect(FONTES.test('Base MetaNutri e referências de ingestão')).toBe(false)
    expect(FONTES.test('Tacos e tortilhas')).toBe(false)
  })
})
