// "Baixar as que ficaram de fora" (spec importar-pacientes, D-915, DP-IP-21, DP-IP-22): CA-1944.
import { analisarAba } from './colunas.ts'
import { csvDasQueFicaramDeFora, linhasDeFora } from './csvDeFora.ts'
import { montarPrevia } from './previa.ts'

const PLANILHA = [
  ['Nome', 'Sexo', 'Nascimento', 'Obs'],
  ['Ana Souza', 'F', '14/03/1991', ''],
  ['Bia Lima', '', '02/11/1985', '=HIPERLINK("http://x";"clique")'],
  ['Ana Souza', 'F', '14/03/1991', 'repetida'],
  ['', 'M', '', 'sem nome'],
  ['Caio "Kaká"; Dias', 'M', '31/02/1990', '+55 11 9\nlinha 2'],
  ['Duda', 'F', '', '@soma'],
]

function montar(marcas: Record<number, boolean> = {}) {
  const analise = analisarAba(
    PLANILHA.map((celulas, i) => ({ numero: i + 1, celulas })),
    false,
  )
  const previa = montarPrevia({ linhas: analise.linhas, colunas: analise.colunas, destinos: analise.destinos, correcoes: {}, marcas, pacientes: [], hoje: '2026-10-29' })
  return { analise, previa }
}

describe('As linhas que ficaram de fora', () => {
  it('na ordem da planilha: as não marcadas, com o motivo, e as sem nome (DP-IP-21)', () => {
    const { previa } = montar({ 7: false })
    expect(linhasDeFora(previa).map((l) => [l.numero, l.nome, l.motivo])).toEqual([
      [3, 'Bia Lima', 'Sexo vazio'],
      [4, 'Ana Souza', 'Igual à linha 2'],
      [5, '', 'Sem nome'],
      [6, 'Caio "Kaká"; Dias', 'Data inválida'],
      [7, 'Duda', 'Desmarcada'],
    ])
  })
})

describe('CA-1944: o arquivo', () => {
  it('só as linhas que não entraram, as colunas da planilha e "Motivo", em UTF-8 com BOM e com o separador original', () => {
    const { analise, previa } = montar({ 7: false })
    const texto = csvDasQueFicaramDeFora({ colunas: analise.colunas, linhas: analise.linhas, deFora: linhasDeFora(previa), separador: ';' })
    expect(texto.startsWith('\uFEFF')).toBe(true)
    const linhas = texto.slice(1).split('\r\n')
    expect(linhas[0]).toBe('Nome;Sexo;Nascimento;Obs;Motivo')
    expect(linhas[1]).toBe(`Bia Lima;;02/11/1985;"'=HIPERLINK(""http://x"";""clique"")";Sexo vazio`)
    expect(linhas[2]).toBe('Ana Souza;F;14/03/1991;repetida;Igual à linha 2')
    expect(linhas[3]).toBe(';M;;sem nome;Sem nome')
    // Aspas, separador e quebra de linha vão entre aspas (RFC 4180); "+" e "@" no começo ganham o apóstrofo.
    expect(texto).toContain(`"Caio ""Kaká""; Dias";M;31/02/1990;"'+55 11 9\nlinha 2";Data inválida`)
    expect(texto).toContain(`Duda;F;;'@soma;Desmarcada`)
    expect(texto).not.toContain('Ana Souza;F;14/03/1991;;Pronto')
  })

  it('com vírgula, a vírgula separa; e "-" no começo também ganha o apóstrofo', () => {
    const texto = csvDasQueFicaramDeFora({
      colunas: [{ indice: 0, nome: 'Nome', exemplo: '' }],
      linhas: [{ numero: 2, celulas: ['-Ana, a primeira'] }],
      deFora: [{ numero: 2, nome: '-Ana, a primeira', motivo: 'Sexo vazio' }],
      separador: ',',
    })
    expect(texto).toBe(`\uFEFFNome,Motivo\r\n"'-Ana, a primeira",Sexo vazio\r\n`)
  })
})
