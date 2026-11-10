// As 15 imagens da ajuda da antropometria (spec antropometria-telas, D-1415, DP-AT-16, CA-2429).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { AJUDAS, ARQUIVOS_DAS_IMAGENS, IMAGENS } from './ajudas.ts'

const PASTA = join(process.cwd(), 'public', 'imagens', 'antropometria')

/** Largura e altura de um WebP, lidas do cabeçalho (VP8, VP8L ou VP8X). */
function ladosDoWebp(bytes: Buffer): { readonly largura: number; readonly altura: number } {
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw new Error('não é WebP')
  const pedaco = bytes.toString('ascii', 12, 16)
  if (pedaco === 'VP8 ') return { largura: bytes.readUInt16LE(26) & 0x3fff, altura: bytes.readUInt16LE(28) & 0x3fff }
  if (pedaco === 'VP8L') {
    const b = bytes.readUInt32LE(21)
    return { largura: (b & 0x3fff) + 1, altura: ((b >> 14) & 0x3fff) + 1 }
  }
  if (pedaco === 'VP8X') return { largura: bytes.readUIntLE(24, 3) + 1, altura: bytes.readUIntLE(27, 3) + 1 }
  throw new Error(`pedaço ${pedaco} desconhecido`)
}

describe('as imagens da ajuda (spec antropometria-telas, CA-2429)', () => {
  it('são as 15 do protótipo, uma por arquivo, e a pasta não tem outras', () => {
    expect(ARQUIVOS_DAS_IMAGENS).toHaveLength(15)
    expect(readdirSync(PASTA).sort()).toEqual([...ARQUIVOS_DAS_IMAGENS].sort())
  })

  it.each(ARQUIVOS_DAS_IMAGENS)('%s é WebP, com até 800 px no lado maior e até 120 KB', (arquivo) => {
    const caminho = join(PASTA, arquivo)
    expect(statSync(caminho).size).toBeLessThanOrEqual(120 * 1024)
    const { largura, altura } = ladosDoWebp(readFileSync(caminho))
    expect(Math.max(largura, altura)).toBeLessThanOrEqual(800)
  })

  it.each(Object.entries(IMAGENS))('a proporção de %s é a do arquivo (a moldura não pula quando a imagem chega)', (_, imagem) => {
    const { largura, altura } = ladosDoWebp(readFileSync(join(PASTA, imagem.src.slice(imagem.src.lastIndexOf('/') + 1))))
    expect(imagem.proporcao).toBe(`${largura} / ${altura}`)
  })

  it('cada imagem tem o crédito e a licença em THIRD_PARTY_NOTICES.md', () => {
    const avisos = readFileSync(join(process.cwd(), 'THIRD_PARTY_NOTICES.md'), 'utf8')
    for (const arquivo of ARQUIVOS_DAS_IMAGENS) {
      const linha = avisos.split('\n').find((l) => l.includes(`\`${arquivo}\``))
      expect(linha, arquivo).toBeDefined()
      expect(linha).toMatch(arquivo.includes('navazob') ? /CC BY 4\.0/ : /Domínio público \(CDC\/NCHS\)/)
    }
  })

  it('o diâmetro do punho fica sem imagem (DP-AT-16) e nenhuma ajuda aponta para imagem que não existe', () => {
    expect(AJUDAS.diametroPunho).not.toHaveProperty('imagem')
    const arquivos = new Set(readdirSync(PASTA))
    for (const ajuda of Object.values(AJUDAS)) {
      if ('imagem' in ajuda) expect(arquivos.has(ajuda.imagem.src.slice(ajuda.imagem.src.lastIndexOf('/') + 1))).toBe(true)
    }
  })
})
