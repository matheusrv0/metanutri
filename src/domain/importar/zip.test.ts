// O leitor de zip mínimo do XLSX (spec importar-pacientes, D-902, DP-IP-3).
import { abrirZip, TETO_POR_ENTRADA } from './zip.ts'
import { montarZip } from './montarArquivos.test-utils.ts'

const texto = (bytes: Uint8Array | null) => (bytes === null ? null : new TextDecoder().decode(bytes))

describe('zip', () => {
  it.each([
    ['sem compressão ("stored")', false],
    ['comprimido ("deflate")', true],
  ])('abre as entradas %s', async (_, comprimir) => {
    const bytes = await montarZip(
      [
        { nome: 'xl/workbook.xml', dados: '<workbook/>' },
        { nome: 'xl/worksheets/sheet1.xml', dados: 'linha '.repeat(1000) },
      ],
      comprimir,
    )
    const zip = await abrirZip(bytes)
    expect(zip.nomes).toEqual(['xl/workbook.xml', 'xl/worksheets/sheet1.xml'])
    expect(texto(await zip.ler('xl/workbook.xml'))).toBe('<workbook/>')
    expect(texto(await zip.ler('xl/worksheets/sheet1.xml'))).toBe('linha '.repeat(1000))
    expect(await zip.ler('nao/existe.xml')).toBeNull()
  })

  it('CB-910: bytes que não são zip são recusados', async () => {
    await expect(abrirZip(new TextEncoder().encode('Nome;Sexo\nAna;F\n'))).rejects.toThrow()
    await expect(abrirZip(new Uint8Array())).rejects.toThrow()
  })

  it('DP-IP-3: entrada criptografada é recusada', async () => {
    const zip = await abrirZip(await montarZip([{ nome: 'a.xml', dados: 'x', criptografada: true }]))
    await expect(zip.ler('a.xml')).rejects.toThrow()
  })

  it('DP-IP-3: a entrada que abre maior que o teto para no teto, sem ler o resto', async () => {
    const zip = await abrirZip(await montarZip([{ nome: 'grande.xml', dados: 'a'.repeat(200_000) }]), { tetoPorEntrada: 50_000 })
    await expect(zip.ler('grande.xml')).rejects.toThrow()
  })

  it('CB-929: a entrada que declara mais que o teto é recusada sem ser aberta (D-920)', async () => {
    const descomprimir = vi.spyOn(globalThis, 'DecompressionStream')
    const zip = await abrirZip(await montarZip([{ nome: 'grande.xml', dados: 'a'.repeat(200_000) }]), { tetoPorEntrada: 50_000 })
    await expect(zip.ler('grande.xml')).rejects.toThrow()
    expect(descomprimir).not.toHaveBeenCalled()
    descomprimir.mockRestore()
  })

  it('D-920: o teto de cada entrada é 8 MB (revisão 2)', () => {
    expect(TETO_POR_ENTRADA).toBe(8 * 1024 * 1024)
  })

  it('DP-IP-3: o teto total vale para a soma das entradas abertas', async () => {
    const zip = await abrirZip(
      await montarZip([
        { nome: 'a.xml', dados: 'a'.repeat(30_000) },
        { nome: 'b.xml', dados: 'b'.repeat(30_000) },
      ]),
      { tetoTotal: 50_000 },
    )
    await zip.ler('a.xml')
    await expect(zip.ler('b.xml')).rejects.toThrow()
  })
})
