// O XLSX aberto no navegador (spec importar-pacientes, D-902, DP-IP-10): CA-1907, CA-1908, CB-903, CB-904, CB-908, CB-910.
import { lerXlsx, type AbaLida } from './lerXlsx.ts'
import { montarXlsx, montarZip, serialDoExcel, type OpcoesDoXlsx } from './montarArquivos.test-utils.ts'

const ler = async (opcoes: OpcoesDoXlsx, limite = 100) => lerXlsx(await montarXlsx(opcoes), { limiteDeLinhas: limite })
const celulas = (aba: AbaLida | undefined) => aba?.registros.map((r) => r.celulas)

describe('CA-1907: datas no XLSX', () => {
  it('a data guardada como data do Excel (formato embutido ou próprio) vira o dia, e o texto "14/03/1991" fica como veio', async () => {
    const serial = serialDoExcel(1991, 3, 14)
    const [aba] = await ler({
      abas: [{ nome: 'Pacientes', linhas: [['Nome', 'Nascimento'], ['Ana', { data: serial }], ['Bia', { data: serial, estilo: 'proprio' }], ['Caio', '14/03/1991']] }],
    })
    expect(celulas(aba)).toEqual([
      ['Nome', 'Nascimento'],
      ['Ana', '1991-03-14'],
      ['Bia', '1991-03-14'],
      ['Caio', '14/03/1991'],
    ])
  })

  it('a pasta de trabalho do Mac antigo (sistema de 1904)', async () => {
    const [aba] = await ler({ data1904: true, abas: [{ nome: 'A', linhas: [[{ data: 0 }], [{ data: 31 }]] }] })
    expect(celulas(aba)).toEqual([['1904-01-01'], ['1904-02-01']])
  })

  it('a data no formato estrito (t="d") também', async () => {
    const [aba] = await ler({ abas: [{ nome: 'A', linhas: [[{ dataIso: '1991-03-14T00:00:00' }]] }] })
    expect(celulas(aba)).toEqual([['1991-03-14']])
  })
})

describe('CA-1908: mais de uma aba', () => {
  it('as abas vêm na ordem do arquivo, com o nome; a oculta não aparece (DP-IP-10)', async () => {
    const abas = await ler({
      abas: [
        { nome: 'Pacientes 2025', linhas: [['Nome'], ['Ana']] },
        { nome: 'Listas', linhas: [['x']], oculta: true },
        { nome: 'Pacientes 2026', linhas: [['Nome'], ['Bia']] },
      ],
    })
    expect(abas.map((a) => a.nome)).toEqual(['Pacientes 2025', 'Pacientes 2026'])
    expect(celulas(abas[1])).toEqual([['Nome'], ['Bia']])
  })

  it('se todas são ocultas, aparecem todas', async () => {
    const abas = await ler({ abas: [{ nome: 'A', linhas: [['x']], oculta: true }] })
    expect(abas.map((a) => a.nome)).toEqual(['A'])
  })
})

describe('Os valores das células (DP-IP-10)', () => {
  it('texto compartilhado, rico (sem a leitura fonética), em linha, lógico e erro', async () => {
    const [aba] = await ler({
      abas: [{ nome: 'A', linhas: [['Ana', 'Ana |rico|Souza', { emLinha: 'Bia <b>' }, { logico: true }, { logico: false }, { erro: '#N/D' }]] }],
    })
    expect(celulas(aba)).toEqual([['Ana', 'Ana Souza', 'Bia <b>', 'VERDADEIRO', 'FALSO', '#N/D']])
  })

  it('CB-908: telefone que o Excel virou número sai com todos os dígitos; decimal sai com vírgula', async () => {
    const [aba] = await ler({ abas: [{ nome: 'A', linhas: [[5511987654321, { decimal: 68.4 }, 82]] }] })
    expect(celulas(aba)).toEqual([['5511987654321', '68,4', '82']])
  })

  it('CB-903: fórmula vale o valor guardado; sem valor guardado, fica vazia', async () => {
    const [aba] = await ler({ abas: [{ nome: 'A', linhas: [[{ formula: 'A2&" "&B2', valor: 'Ana Souza' }, { formula: 'SOMA(1;2)', valor: 3 }, { formula: 'HOJE()' }, 'fim']] }] })
    expect(celulas(aba)).toEqual([['Ana Souza', '3', '', 'fim']])
  })
})

describe('Linhas e colunas', () => {
  it('cada linha tem o número dela no arquivo; colunas puladas ficam vazias', async () => {
    const [aba] = await ler({ abas: [{ nome: 'A', primeiraLinha: 3, linhas: [['Nome', null, 'Sexo'], null, ['Ana', null, 'F']] }] })
    expect(aba?.registros).toEqual([
      { numero: 3, celulas: ['Nome', '', 'Sexo'] },
      { numero: 5, celulas: ['Ana', '', 'F'] },
    ])
  })

  it('CB-904: a célula mesclada vale para a primeira linha dela', async () => {
    const [aba] = await ler({ abas: [{ nome: 'A', linhas: [['Nome', 'Obs'], ['Ana', 'Diabetes'], ['Bia', null]], mesclas: ['B2:B3'] }] })
    expect(celulas(aba)).toEqual([
      ['Nome', 'Obs'],
      ['Ana', 'Diabetes'],
      ['Bia'],
    ])
  })

  it('o espaço de nomes com prefixo (x:row) também é lido', async () => {
    const [aba] = await ler({ prefixo: true, abas: [{ nome: 'A', linhas: [['Nome'], ['Ana']] }] })
    expect(celulas(aba)).toEqual([['Nome'], ['Ana']])
  })

  it('o XLSX sem compressão também abre', async () => {
    const [aba] = await ler({ comprimir: false, abas: [{ nome: 'A', linhas: [['Nome'], ['Ana']] }] })
    expect(celulas(aba)).toEqual([['Nome'], ['Ana']])
  })

  it('CA-1910: para de juntar linhas com texto no limite e diz que a aba foi cortada', async () => {
    const linhas = [['Nome'], ...Array.from({ length: 30 }, (_, i) => [`Paciente ${i}`])]
    const [aba] = await ler({ abas: [{ nome: 'A', linhas }] }, 12)
    expect(aba?.registros).toHaveLength(12)
    expect(aba?.cortada).toBe(true)
    const [inteira] = await ler({ abas: [{ nome: 'A', linhas }] }, 31)
    expect(inteira?.cortada).toBe(false)
  })
})

/** Um XLSX com o XML dos textos compartilhados escrito à mão (para pôr nele o que o Excel nunca escreve). */
async function comTextos(textos: string): Promise<Uint8Array> {
  const principal = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
  const relacoes = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
  return montarZip([
    { nome: 'xl/workbook.xml', dados: `<workbook xmlns="${principal}" xmlns:r="${relacoes}"><sheets><sheet name="A" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    {
      nome: 'xl/_rels/workbook.xml.rels',
      dados: `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${relacoes}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    },
    { nome: 'xl/worksheets/sheet1.xml', dados: `<worksheet xmlns="${principal}"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row></sheetData></worksheet>` },
    { nome: 'xl/sharedStrings.xml', dados: textos },
  ])
}

describe('CB-928: XML com DTD ou entidade (D-920)', () => {
  it.each([
    ['a explosão de entidades', `<?xml version="1.0"?><!DOCTYPE sst [<!ENTITY x "${'A'.repeat(50)}">]><sst><si><t>&x;&x;</t></si></sst>`],
    ['a entidade externa', '<?xml version="1.0"?><!DOCTYPE sst [<!ENTITY e SYSTEM "file:///C:/Windows/win.ini">]><sst><si><t>&e;</t></si></sst>'],
    ['só a declaração de entidade', '<?xml version="1.0"?><!ENTITY x "y"><sst><si><t>x</t></si></sst>'],
  ])('%s é recusada antes de o navegador ler o XML', async (_, textos) => {
    const ler = vi.spyOn(DOMParser.prototype, 'parseFromString')
    await expect(lerXlsx(await comTextos(textos), { limiteDeLinhas: 10 })).rejects.toThrow()
    expect(ler.mock.calls.some(([texto]) => String(texto).includes('<!ENTITY'))).toBe(false)
    ler.mockRestore()
  })

  it('o XML de sempre, sem DTD, continua sendo lido', async () => {
    const [aba] = await lerXlsx(await comTextos('<?xml version="1.0"?><sst><si><t>Nome</t></si></sst>'), { limiteDeLinhas: 10 })
    expect(celulas(aba)).toEqual([['Nome']])
  })
})

describe('CB-910: zip que não é planilha', () => {
  it('um zip qualquer chamado .xlsx é recusado', async () => {
    const bytes = await montarZip([{ nome: 'foto.jpg', dados: 'x' }])
    await expect(lerXlsx(bytes, { limiteDeLinhas: 10 })).rejects.toThrow()
  })
})
