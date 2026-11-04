// Spec importar-pacientes, D-903: acentos, separador e células do CSV (CA-1903 a CA-1906, CB-902).
import { decodificar, detectarSeparador, lerRegistros } from './lerTexto.ts'
import { emUtf16, emUtf8, emWindows1252 } from './montarArquivos.test-utils.ts'

const celulas = (texto: string, separador = detectarSeparador(texto)) => [...lerRegistros(texto, separador)].map((r) => r.celulas)

describe('CA-1903: CSV com ponto e vírgula em Windows-1252 (o "ANSI" do Excel no Brasil)', () => {
  it('os nomes saem com os acentos certos', () => {
    const bytes = emWindows1252('Nome;Sexo\r\nJoão Conceição;M\r\nPatrícia Gonçalves;F\r\n')
    const { texto, codificacao } = decodificar(bytes)
    expect(codificacao).toBe('windows-1252')
    expect(detectarSeparador(texto)).toBe(';')
    expect(celulas(texto)).toEqual([
      ['Nome', 'Sexo'],
      ['João Conceição', 'M'],
      ['Patrícia Gonçalves', 'F'],
    ])
  })
})

describe('CA-1904: CSV com vírgula em UTF-8 com BOM (o Google Planilhas)', () => {
  it('os acentos saem certos e o BOM não entra no primeiro cabeçalho', () => {
    const { texto, codificacao } = decodificar(emUtf8('Nome,E-mail\nJoão Conceição,joao@exemplo.com\n', true))
    expect(codificacao).toBe('utf-8')
    expect(detectarSeparador(texto)).toBe(',')
    const [cabecalho, linha] = celulas(texto)
    expect(cabecalho?.[0]).toBe('Nome')
    expect(linha).toEqual(['João Conceição', 'joao@exemplo.com'])
  })

  it('UTF-8 sem BOM também é UTF-8', () => {
    expect(decodificar(emUtf8('Nome\nJoão\n'))).toEqual({ texto: 'Nome\nJoão\n', codificacao: 'utf-8' })
  })
})

describe('CA-1905: tabulação e o "Texto Unicode" do Excel', () => {
  it('CSV com tabulação é lido como os outros', () => {
    const texto = 'Nome\tSexo\tTelefone\nAna Souza\tF\t(11) 98765-4321\n'
    expect(detectarSeparador(texto)).toBe('\t')
    expect(celulas(texto)[1]).toEqual(['Ana Souza', 'F', '(11) 98765-4321'])
  })

  it('UTF-16 com BOM (little-endian, o do Excel) é lido como UTF-16', () => {
    const { texto, codificacao } = decodificar(emUtf16('Nome\tSexo\r\nJoão Conceição\tM\r\n'))
    expect(codificacao).toBe('utf-16le')
    expect(celulas(texto)).toEqual([
      ['Nome', 'Sexo'],
      ['João Conceição', 'M'],
    ])
  })

  it('UTF-16 big-endian com BOM também', () => {
    expect(decodificar(emUtf16('Nome\nAna', 'be'))).toEqual({ texto: 'Nome\nAna', codificacao: 'utf-16be' })
  })
})

describe('CA-1906: célula entre aspas (RFC 4180)', () => {
  it('separador, aspas duplicadas e quebra de linha dentro dela formam uma célula só', () => {
    const texto = 'Nome;Observações;Sexo\r\n"Souza; Ana";"Disse ""não como carne""\r\ne mora só";F\r\nBia;;F\r\n'
    expect(celulas(texto, ';')).toEqual([
      ['Nome', 'Observações', 'Sexo'],
      ['Souza; Ana', 'Disse "não como carne"\r\ne mora só', 'F'],
      ['Bia', '', 'F'],
    ])
  })

  it('o número de cada registro é o da linha do Excel: a célula com quebra conta uma vez', () => {
    const texto = 'Nome;Obs\n"Ana";"linha 1\nlinha 2"\nBia;x\n'
    expect([...lerRegistros(texto, ';')].map((r) => r.numero)).toEqual([1, 2, 3])
  })

  it('linha vazia conta no número, e o fim do arquivo com quebra não cria um registro a mais', () => {
    const registros = [...lerRegistros('Nome\r\n\r\nAna\r\n', ';')]
    expect(registros.map((r) => [r.numero, r.celulas])).toEqual([
      [1, ['Nome']],
      [2, ['']],
      [3, ['Ana']],
    ])
  })

  it('aspas no meio de uma célula sem aspas ficam como texto', () => {
    expect(celulas('Nome;Apelido\nAna;a "Nina"\n', ';')[1]).toEqual(['Ana', 'a "Nina"'])
  })

  it('quebra de linha só com retorno (o Excel antigo do Mac) também separa', () => {
    expect(celulas('Nome\rAna\rBia', ';')).toEqual([['Nome'], ['Ana'], ['Bia']])
  })
})

describe('D-903: o separador é o que se repete igual nas primeiras linhas, fora das aspas', () => {
  it('com linhas de título acima da tabela', () => {
    expect(detectarSeparador('Relatório de pacientes\n\nNome;Sexo;Telefone\nAna;F;1\nBia;F;2\n')).toBe(';')
  })

  it('vírgula decimal dentro de uma planilha com ponto e vírgula não engana', () => {
    expect(detectarSeparador('Nome;Peso (kg);Obs\nAna;68,4;alergia a camarão, a amendoim e a ovo\nBia;70,1;\nCaio;80;x\n')).toBe(';')
  })

  it('vírgula dentro das aspas não conta', () => {
    expect(detectarSeparador('Nome,Obs\n"Souza, Ana","a, b, c"\n"Lima, Bia",x\n')).toBe(',')
  })

  it('uma coluna só, sem separador nenhum: ponto e vírgula', () => {
    const texto = 'Nome\nAna Souza\nBia Lima\n'
    expect(detectarSeparador(texto)).toBe(';')
    expect(celulas(texto)[1]).toEqual(['Ana Souza'])
  })
})

describe('CB-902: UTF-8 com um byte estragado no meio', () => {
  it('a leitura estrita falha e o arquivo inteiro é lido como Windows-1252', () => {
    const certo = emUtf8('Nome\nConceição\n')
    const estragado = new Uint8Array([...certo, 0xe3, 0x0a])
    const { texto, codificacao } = decodificar(estragado)
    expect(codificacao).toBe('windows-1252')
    // O trecho que era UTF-8 aparece trocado: é o que o exemplo do passo Colunas mostra.
    expect(texto).toContain('ConceiÃ§Ã£o')
  })
})
