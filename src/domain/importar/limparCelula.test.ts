// A limpeza de cada célula (spec importar-pacientes, D-918): CB-922, CB-923, CB-924, CB-930.
import { lerPlanilha, type ArquivoParaLer } from './lerPlanilha.ts'
import { lerXlsx } from './lerXlsx.ts'
import { desfazerEscapeDoXlsx, limparCelula } from './limparCelula.ts'
import { montarXlsx } from './montarArquivos.test-utils.ts'

const c = (codigo: number) => String.fromCharCode(codigo)
const TIL = c(0x303)

const arquivo = (nome: string, texto: string): ArquivoParaLer => {
  const bytes = new TextEncoder().encode(texto)
  return { nome, tamanho: bytes.length, bytes: async () => bytes.slice().buffer }
}

async function linhasDoCsv(texto: string) {
  const lido = await lerPlanilha(arquivo('a.csv', texto))
  if (lido.tipo !== 'lida') throw new Error(lido.tipo)
  return lido.planilha.abas[0]?.analise.linhas.map((l) => l.celulas) ?? []
}

describe('limparCelula (D-918)', () => {
  it('tira os controles de U+0000 a U+001F, menos tabulação, quebra de linha e retorno', () => {
    const todos = Array.from({ length: 32 }, (_, i) => c(i)).join('')
    expect(limparCelula(`a${todos}b`)).toBe(`a${c(9)}${c(10)}${c(13)}b`)
  })

  it('CB-932: tira U+FFFE e U+FFFF, e o meio par de surrogates vira U+FFFD (o XML do Word não aceita nenhum)', () => {
    expect(limparCelula(`Ana${c(0xffff)}Souza${c(0xfffe)}`)).toBe('AnaSouza')
    expect(limparCelula(`a${c(0xd800)}b${c(0xdc00)}`)).toBe(`a${c(0xfffd)}b${c(0xfffd)}`)
    // O par inteiro (um emoji) fica.
    expect(limparCelula(`a${c(0xd83d)}${c(0xde00)}b`)).toBe(`a${c(0xd83d)}${c(0xde00)}b`)
    expect(limparCelula(desfazerEscapeDoXlsx('Ana_xFFFF_Souza_xD800_'))).toBe(`AnaSouza${c(0xfffd)}`)
  })

  it('CB-930: normaliza em NFC ("João" do Mac vira o "João" de sempre)', () => {
    const doMac = `Joa${TIL}o`
    expect(doMac).not.toBe('João')
    expect(limparCelula(doMac)).toBe('João')
  })

  it('CB-924: o escape _xHHHH_ do XLSX vira o caractere; _x005F_ é o sublinhado', () => {
    expect(desfazerEscapeDoXlsx('Alergia_x000D_')).toBe(`Alergia${c(13)}`)
    expect(desfazerEscapeDoXlsx('_x005F_x000D_')).toBe('_x000D_')
    expect(desfazerEscapeDoXlsx('sem_escape_x00ZZ_')).toBe('sem_escape_x00ZZ_')
  })
})

describe('Na leitura do arquivo', () => {
  it('CB-922: o Ctrl-Z (U+001A) do fim do arquivo não vira paciente', async () => {
    expect(await linhasDoCsv(`Nome;Sexo\r\nAna Souza;F\r\nTiago Lima;M\r\n${c(0x1a)}`)).toEqual([
      ['Ana Souza', 'F'],
      ['Tiago Lima', 'M'],
    ])
  })

  it('CB-923: o controle no meio do nome sai antes de chegar à ficha', async () => {
    const [linha] = await linhasDoCsv(`Nome;Sexo\r\nAna${c(1)} Souza${c(0x1f)} Lima;F\r\n`)
    expect(linha?.[0]).toBe('Ana Souza Lima')
  })

  it('CB-930: o nome em NFD do CSV entra em NFC', async () => {
    const [linha] = await linhasDoCsv(`Nome;Sexo\r\nJoa${TIL}o Concei${'c' + c(0x327)}${'a' + TIL}o;M\r\n`)
    expect(linha?.[0]).toBe('João Conceição')
  })

  it('CB-924: no XLSX, "_x000D_" volta a ser o retorno, e o controle que o escape traz sai', async () => {
    const bytes = await montarXlsx({ abas: [{ nome: 'A', linhas: [['Nome', 'Obs'], ['Ana_x0001_ Souza', `Alergia_x000D_${c(10)}lactose`]] }] })
    const [aba] = await lerXlsx(bytes, { limiteDeLinhas: 10 })
    expect(aba?.registros[1]?.celulas).toEqual(['Ana Souza', `Alergia${c(13)}${c(10)}lactose`])
  })
})
