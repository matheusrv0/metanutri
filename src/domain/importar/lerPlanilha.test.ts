// Ler o arquivo escolhido (spec importar-pacientes, D-901, D-917): CA-1909, CA-1910, CB-900, CB-910, CB-911, DP-IP-11.
import { LIMITE_DE_LINHAS } from './colunas.ts'
import { lerPlanilha, LIMITE_DE_BYTES, type ArquivoParaLer, type ResultadoDaLeitura } from './lerPlanilha.ts'
import { emUtf8, emWindows1252, montarXlsx, montarZip } from './montarArquivos.test-utils.ts'
import { textoDaRecusa } from './textos.ts'

function arquivo(nome: string, bytes: Uint8Array, tamanho = bytes.length): ArquivoParaLer & { lido: () => boolean } {
  let lido = false
  return {
    nome,
    tamanho,
    bytes: async () => {
      lido = true
      return bytes.slice().buffer
    },
    lido: () => lido,
  }
}

const csv = (linhas: readonly string[]) => emUtf8(`${linhas.join('\r\n')}\r\n`)
const pacientes = (n: number) => ['Nome;Sexo', ...Array.from({ length: n }, (_, i) => `Paciente ${i};F`)]
/** Um relógio de teste que anda `passo` ms a cada leitura: o leitor acha que cada fatia já passou do tempo. */
const relogio = (passo: number) => {
  let agora = 0
  return () => (agora += passo)
}

const recusa = (resultado: ResultadoDaLeitura) => (resultado.tipo === 'recusada' ? textoDaRecusa(resultado.recusa) : resultado.tipo)

describe('CA-1909: o que não é CSV nem XLSX é recusado, e nada mais acontece', () => {
  it.each([
    ['pacientes.xls', 'Arquivo .xls antigo. No Excel, salve como .xlsx ou CSV.'],
    ['pacientes.ods', 'Arquivo .ods. No LibreOffice, salve como .xlsx ou CSV.'],
    ['pacientes.numbers', 'Arquivo .numbers. No Numbers, exporte como .xlsx ou CSV.'],
    ['arquivo.pdf', '“arquivo.pdf” não é uma planilha. Use CSV ou XLSX.'],
    ['foto.PNG', '“foto.PNG” não é uma planilha. Use CSV ou XLSX.'],
    ['ficha.docx', '“ficha.docx” não é uma planilha. Use CSV ou XLSX.'],
    ['sem-extensao', '“sem-extensao” não é uma planilha. Use CSV ou XLSX.'],
  ])('%s', async (nome, frase) => {
    const escolhido = arquivo(nome, csv(pacientes(1)))
    expect(recusa(await lerPlanilha(escolhido))).toBe(frase)
    expect(escolhido.lido()).toBe(false)
  })

  it('CSV, TXT e TSV (DP-IP-6), em qualquer caixa, são lidos', async () => {
    for (const nome of ['a.csv', 'a.CSV', 'a.txt', 'a.tsv']) expect((await lerPlanilha(arquivo(nome, csv(pacientes(1))))).tipo, nome).toBe('lida')
  })
})

describe('CA-1910: limites de tamanho e de linhas', () => {
  it('acima de 5 MB, a recusa diz o limite e o arquivo não é lido (DP-IP-4)', async () => {
    const escolhido = arquivo('grande.csv', csv(pacientes(1)), LIMITE_DE_BYTES + 1)
    expect(recusa(await lerPlanilha(escolhido))).toBe('A planilha passa de 5 MB. Divida em arquivos menores.')
    expect(escolhido.lido()).toBe(false)
    expect(LIMITE_DE_BYTES).toBe(5 * 1024 * 1024)
  })

  it(`${LIMITE_DE_LINHAS} linhas de paciente entram; uma a mais é recusada`, async () => {
    expect((await lerPlanilha(arquivo('a.csv', csv(pacientes(LIMITE_DE_LINHAS))))).tipo).toBe('lida')
    expect(recusa(await lerPlanilha(arquivo('a.csv', csv(pacientes(LIMITE_DE_LINHAS + 1)))))).toBe('A planilha tem mais de 2.000 linhas. Divida em arquivos menores.')
  })

  it('a leitura para no limite: 20 mil linhas não são lidas inteiras', async () => {
    let vezes = 0
    const resultado = await lerPlanilha(arquivo('a.csv', csv(pacientes(20_000))), {
      relogio: relogio(13),
      darAVez: async () => {
        vezes += 1
      },
    })
    expect(recusa(resultado)).toBe('A planilha tem mais de 2.000 linhas. Divida em arquivos menores.')
    // Com o relógio sempre além da fatia, a vez é dada a cada 32 registros: chegar ao fim seria 625 vezes.
    expect(vezes).toBeLessThanOrEqual(70)
  })

  it('DP-IP-11: no XLSX, a primeira aba acima do limite é recusada; outra aba acima do limite fica marcada', async () => {
    const grande = { nome: 'Grande', linhas: [['Nome'], ...Array.from({ length: LIMITE_DE_LINHAS + 1 }, (_, i) => [`P ${i}`])] }
    const pequena = { nome: 'Pequena', linhas: [['Nome'], ['Ana']] }
    expect(recusa(await lerPlanilha(arquivo('a.xlsx', await montarXlsx({ abas: [grande, pequena] }))))).toBe(
      'A planilha tem mais de 2.000 linhas. Divida em arquivos menores.',
    )
    const resultado = await lerPlanilha(arquivo('a.xlsx', await montarXlsx({ abas: [pequena, grande] })))
    expect(resultado.tipo).toBe('lida')
    if (resultado.tipo !== 'lida') return
    expect(resultado.planilha.abas.map((a) => [a.nome, a.analise.excede])).toEqual([
      ['Pequena', false],
      ['Grande', true],
    ])
  })
})

describe('CB-900: planilha vazia ou só com o cabeçalho', () => {
  it.each([
    ['vazia', new Uint8Array()],
    ['só espaços e quebras', emUtf8(' \r\n;;\r\n')],
    ['só o cabeçalho', csv(['Nome;Sexo;Telefone'])],
  ])('%s: "A planilha não tem pacientes."', async (_, bytes) => {
    expect(recusa(await lerPlanilha(arquivo('a.csv', bytes)))).toBe('A planilha não tem pacientes.')
  })

  it('no XLSX, a aba escolhida é a primeira com pacientes', async () => {
    const resultado = await lerPlanilha(
      arquivo(
        'a.xlsx',
        await montarXlsx({
          abas: [
            { nome: 'Capa', linhas: [['Nome']] },
            { nome: 'Pacientes', linhas: [['Nome'], ['Ana']] },
          ],
        }),
      ),
    )
    expect(resultado.tipo === 'lida' ? resultado.planilha.abaInicial : null).toBe(1)
  })
})

describe('CB-910: arquivo renomeado', () => {
  it.each([
    ['um zip chamado .csv', async () => montarZip([{ nome: 'a.txt', dados: 'x' }])],
    ['uma imagem chamada .csv', async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52])],
  ])('%s: "Não foi possível ler esta planilha. Use CSV ou XLSX."', async (_, montar) => {
    expect(recusa(await lerPlanilha(arquivo('a.csv', await montar())))).toBe('Não foi possível ler esta planilha. Use CSV ou XLSX.')
  })

  it.each([
    ['um zip qualquer chamado .xlsx', async () => montarZip([{ nome: 'foto.jpg', dados: 'x' }])],
    ['um CSV chamado .xlsx', async () => csv(pacientes(2))],
  ])('%s: a mesma frase', async (_, montar) => {
    expect(recusa(await lerPlanilha(arquivo('a.xlsx', await montar())))).toBe('Não foi possível ler esta planilha. Use CSV ou XLSX.')
  })
})

describe('CB-911: arquivo grande lido em partes, com "Cancelar"', () => {
  it('DP-IP-32: a vez é dada por fatia de 12 ms de leitura, não por número de registros', async () => {
    const contar = async (passo: number) => {
      let vezes = 0
      await lerPlanilha(arquivo('a.csv', csv(pacientes(1500))), {
        relogio: relogio(passo),
        darAVez: async () => {
          vezes += 1
        },
      })
      return vezes
    }
    // Leitura rápida (o relógio parado) não para; leitura lenta (cada olhada no relógio passa da fatia) para sempre.
    expect(await contar(0)).toBe(0)
    expect(await contar(13)).toBeGreaterThan(10)
  })

  it('o cancelamento no meio da leitura do CSV devolve "cancelada" e nada mais', async () => {
    const controle = new AbortController()
    const resultado = await lerPlanilha(arquivo('a.csv', csv(pacientes(1500))), {
      sinal: controle.signal,
      relogio: relogio(13),
      darAVez: async () => controle.abort(),
    })
    expect(resultado.tipo).toBe('cancelada')
  })

  it('o do XLSX também', async () => {
    const controle = new AbortController()
    const linhas = [['Nome'], ...Array.from({ length: 1500 }, (_, i) => [`P ${i}`])]
    const resultado = await lerPlanilha(arquivo('a.xlsx', await montarXlsx({ abas: [{ nome: 'A', linhas }] })), {
      sinal: controle.signal,
      relogio: relogio(13),
      darAVez: async () => controle.abort(),
    })
    expect(resultado.tipo).toBe('cancelada')
  })
})

describe('O que sai da leitura', () => {
  it('o CSV guarda o separador (para o arquivo das que ficaram de fora, D-915) e é uma aba só', async () => {
    const resultado = await lerPlanilha(arquivo('a.csv', emWindows1252('Nome,Sexo\r\nJoão,M\r\n')))
    expect(resultado.tipo).toBe('lida')
    if (resultado.tipo !== 'lida') return
    expect(resultado.planilha.separador).toBe(',')
    expect(resultado.planilha.abas).toHaveLength(1)
    expect(resultado.planilha.abas[0]?.analise.linhas[0]?.celulas).toEqual(['João', 'M'])
  })

  it('o XLSX usa ponto e vírgula no arquivo de fora (DP-IP-22)', async () => {
    const resultado = await lerPlanilha(arquivo('a.xlsx', await montarXlsx({ abas: [{ nome: 'A', linhas: [['Nome'], ['Ana']] }] })))
    expect(resultado.tipo === 'lida' ? resultado.planilha.separador : null).toBe(';')
  })
})
