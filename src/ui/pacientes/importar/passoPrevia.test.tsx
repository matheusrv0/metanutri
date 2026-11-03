// O passo Prévia (spec importar-pacientes, D-908, D-909): CA-1920, CA-1922, CA-1923, CA-1926 a CA-1932, CA-1946,
// CA-1947, CB-901 e DP-IP-14.
import { screen, within } from '@testing-library/react'
import { criarPacienteVazio } from '@/domain/pacientes.ts'
import { abrirColunas, abrirPrevia, arquivo, CSV_DO_PROTOTIPO, montarTela as montarSo, NA_CONTA } from './montarTela.test-utils.tsx'

/** A conta do protótipo: a Fernanda já está nela. */
const montarTela = (opcoes: Parameters<typeof montarSo>[0] = {}) => montarSo({ pacientes: NA_CONTA, ...opcoes })

/** A linha da prévia de um paciente, pela caixa de marcar dela. */
const linhaDe = (nome: string): HTMLElement => {
  const linha = screen.getByRole('checkbox', { name: `Importar ${nome}` }).closest<HTMLElement>('[role="row"]')
  if (!linha) throw new Error(`sem a linha de ${nome}`)
  return linha
}
const situacao = (nome: string) => within(linhaDe(nome)).getAllByRole('cell').at(-1)?.textContent
const contas = () => screen.getByRole('status', { name: 'Contas da prévia' }).textContent

describe('CA-1927: a prévia da planilha do protótipo', () => {
  it('"5 prontos para importar", "4 com problema", o número de cada linha e "Importar 5 pacientes"', async () => {
    const { usuario } = montarTela()
    await abrirPrevia(usuario)
    expect(contas()).toBe('5 prontos para importar4 com problema')
    expect(screen.getByRole('button', { name: 'Importar 5 pacientes' })).toBeEnabled()
    const linhas = within(screen.getByRole('table', { name: 'Linhas da planilha' })).getAllByRole('row').slice(1)
    expect(linhas.map((l) => within(l).getAllByRole('cell')[1]?.textContent)).toEqual(['2', '3', '4', '5', '6', '7', '8', '9', '10'])
    expect(situacao('Juliana Ferreira Souza')).toBe('Pronto')
    expect(situacao('Camila Rodrigues')).toBe('Data inválida')
    expect(situacao('Bruno Carvalho Dias')).toBe('Sexo vazio')
  })

  it('CA-1922 e CA-1923: "Igual à linha 3" e "Já está na conta" não podem ser marcadas', async () => {
    const { usuario } = montarTela({ pacientes: [{ ...criarPacienteVazio('f', '2026-10-01T12:00:00.000Z'), nome: 'Fernanda Almeida Costa', nascimento: '1996-09-28' }] })
    await abrirPrevia(usuario)
    expect(situacao('Fernanda Almeida Costa')).toBe('Já está na conta')
    expect(screen.getByRole('checkbox', { name: 'Importar Fernanda Almeida Costa' })).toBeDisabled()
    const [primeira, repetida] = screen.getAllByRole('checkbox', { name: 'Importar Rafael Oliveira Lima' })
    expect(within(primeira?.closest('[role="row"]') as HTMLElement).getAllByRole('cell').at(-1)?.textContent).toBe('Pronto')
    expect(repetida).toBeDisabled()
    expect(within(repetida?.closest('[role="row"]') as HTMLElement).getAllByRole('cell').at(-1)?.textContent).toBe('Igual à linha 3')
  })
})

describe('CA-1928: a linha com "Data inválida"', () => {
  it('digitar uma data válida deixa a linha pronta e marcada; o botão conta', async () => {
    const { usuario } = montarTela()
    await abrirPrevia(usuario)
    const campo = screen.getByRole('textbox', { name: 'Data de nascimento de Camila Rodrigues' })
    expect(campo).toHaveValue('31/02/1994')
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    // CA-1947: o erro do campo é o motivo da linha.
    expect(campo).toHaveAccessibleDescription('Data inválida')
    await usuario.clear(campo)
    await usuario.type(campo, '28/02/1994')
    expect(situacao('Camila Rodrigues')).toBe('Pronto')
    expect(screen.getByRole('checkbox', { name: 'Importar Camila Rodrigues' })).toBeChecked()
    expect(campo).not.toHaveAttribute('aria-invalid')
    expect(screen.getByRole('button', { name: 'Importar 6 pacientes' })).toBeInTheDocument()
  })

  it('marcar sem corrigir: "Entra sem a data"', async () => {
    const { usuario } = montarTela()
    await abrirPrevia(usuario)
    await usuario.click(screen.getByRole('checkbox', { name: 'Importar Camila Rodrigues' }))
    expect(situacao('Camila Rodrigues')).toBe('Entra sem a data')
    expect(contas()).toBe('6 prontos para importar3 com problema')
  })
})

describe('CA-1929: a linha com "Sexo vazio"', () => {
  it('escolher F ou M deixa a linha pronta e marcada', async () => {
    const { usuario } = montarTela()
    await abrirPrevia(usuario)
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Sexo de Bruno Carvalho Dias' }), 'M')
    expect(situacao('Bruno Carvalho Dias')).toBe('Pronto')
    expect(screen.getByRole('checkbox', { name: 'Importar Bruno Carvalho Dias' })).toBeChecked()
  })

  it('marcar sem escolher: "Entra sem o sexo"', async () => {
    const { usuario } = montarTela()
    await abrirPrevia(usuario)
    await usuario.click(screen.getByRole('checkbox', { name: 'Importar Bruno Carvalho Dias' }))
    expect(situacao('Bruno Carvalho Dias')).toBe('Entra sem o sexo')
  })
})

describe('CA-1930: desmarcar uma linha pronta', () => {
  it('ela não entra e as contas mudam', async () => {
    const { usuario } = montarTela()
    await abrirPrevia(usuario)
    await usuario.click(screen.getByRole('checkbox', { name: 'Importar Lucas Martins' }))
    expect(situacao('Lucas Martins')).toBe('Desmarcada')
    expect(contas()).toBe('4 prontos para importar4 com problema')
    expect(screen.getByRole('button', { name: 'Importar 4 pacientes' })).toBeInTheDocument()
  })
})

describe('DP-IP-14: "Marcar todas"', () => {
  it('marca as que podem ser marcadas e fica no estado misto quando só algumas estão', async () => {
    const { usuario } = montarTela()
    await abrirPrevia(usuario)
    const todas = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Marcar todas' })
    expect(todas.indeterminate).toBe(true)
    await usuario.click(todas)
    expect(screen.getByRole('button', { name: 'Importar 7 pacientes' })).toBeInTheDocument()
    expect(todas).toBeChecked()
    await usuario.click(todas)
    expect(screen.getByRole('button', { name: 'Importar 0 pacientes' })).toBeDisabled()
  })
})

describe('CA-1926 e CA-1920: os avisos da prévia', () => {
  it('as linhas sem nome não aparecem e são contadas; a coluna de datas lida como mês/dia é avisada', async () => {
    const { usuario } = montarTela()
    await abrirPrevia(usuario, arquivo('eua.csv', 'Name;Sex;Date of birth\r\nAnn Lee;F;03/25/1990\r\n;F;01/02/1990\r\nBob Ray;M;04/05/1988\r\n'))
    expect(screen.getByText('1 linha sem nome ficou de fora.')).toBeInTheDocument()
    expect(screen.getByText('Datas lidas como mês/dia.')).toBeInTheDocument()
    expect(within(linhaDe('Bob Ray')).getByText('05/04/1988')).toBeInTheDocument()
  })
})

describe('CA-1931: mais de 50 linhas', () => {
  it('as com problema vêm primeiro e a lista aparece 50 por vez, com "Mostrar mais 50"', async () => {
    const csv = ['Nome;Sexo', ...Array.from({ length: 120 }, (_, i) => `Paciente ${String(i).padStart(3, '0')};${i === 90 ? '' : 'F'}`)].join('\n')
    const { usuario } = montarTela()
    await abrirPrevia(usuario, arquivo('muitos.csv', csv))
    const linhas = () => within(screen.getByRole('table', { name: 'Linhas da planilha' })).getAllByRole('row').slice(1)
    expect(linhas()).toHaveLength(50)
    expect(within(linhas()[0] as HTMLElement).getAllByRole('cell')[1]?.textContent).toBe('92')
    await usuario.click(screen.getByRole('button', { name: 'Mostrar mais 50' }))
    expect(linhas()).toHaveLength(100)
    await usuario.click(screen.getByRole('button', { name: 'Mostrar mais 20' }))
    expect(linhas()).toHaveLength(120)
    expect(screen.queryByRole('button', { name: /Mostrar mais/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Importar 119 pacientes' })).toBeInTheDocument()
  })
})

describe('CA-1932: voltar a Colunas e à prévia', () => {
  it('o mapeamento, as correções e as marcas continuam; trocar o arquivo recomeça do zero', async () => {
    const { usuario } = montarTela()
    await abrirPrevia(usuario)
    await usuario.type(screen.getByRole('textbox', { name: 'Data de nascimento de Camila Rodrigues' }), '{Control>}a{/Control}28/02/1994')
    await usuario.click(screen.getByRole('checkbox', { name: 'Importar Lucas Martins' }))
    await usuario.click(screen.getByRole('button', { name: 'Voltar' }))
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Destino da coluna Peso (kg)' }), 'observacoes')
    await usuario.click(screen.getByRole('button', { name: 'Ver prévia' }))
    expect(situacao('Camila Rodrigues')).toBe('Pronto')
    expect(situacao('Lucas Martins')).toBe('Desmarcada')
    // E dá para ir e voltar pelos passos.
    await usuario.click(screen.getByRole('button', { name: 'Passo 2, feito: Colunas' }))
    expect(screen.getByRole('combobox', { name: 'Destino da coluna Peso (kg)' })).toHaveValue('observacoes')
    await usuario.click(screen.getByRole('button', { name: 'Passo 3: Prévia' }))
    expect(situacao('Lucas Martins')).toBe('Desmarcada')

    await usuario.click(screen.getByRole('button', { name: 'Passo 1, feito: Arquivo' }))
    await abrirColunas(usuario, arquivo('outra.csv', CSV_DO_PROTOTIPO))
    expect(screen.getByRole('combobox', { name: 'Destino da coluna Peso (kg)' })).toHaveValue('nao')
    await usuario.click(screen.getByRole('button', { name: 'Ver prévia' }))
    expect(situacao('Lucas Martins')).toBe('Pronto')
    expect(situacao('Camila Rodrigues')).toBe('Data inválida')
  })
})

describe('CB-901: o mesmo arquivo importado duas vezes', () => {
  it('"Nada para importar: todos já estão na conta." e sem o botão de importar', async () => {
    const naConta = ['Ana Souza', 'Bia Lima'].map((nome, i) => ({ ...criarPacienteVazio(`p${i}`, '2026-10-01T12:00:00.000Z'), nome }))
    const { usuario } = montarTela({ pacientes: naConta })
    await abrirPrevia(usuario, arquivo('de-novo.csv', 'Nome;Sexo\nAna Souza;F\nBia Lima;F\n'))
    expect(screen.getByText('Nada para importar: todos já estão na conta.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Importar \d/ })).not.toBeInTheDocument()
  })
})

describe('CA-1946: o que parece código na célula é texto', () => {
  it('<script>, <img onerror> e javascript: aparecem como texto, e nada executa', async () => {
    const alerta = vi.spyOn(window, 'alert').mockImplementation(() => undefined)
    const { usuario, container } = montarTela()
    await abrirPrevia(
      usuario,
      arquivo('xss.csv', 'Nome;Sexo;E-mail\n<script>alert(1)</script>;F;javascript:alert(2)\n<img src=x onerror=alert(3)>;M;a@b.c\n'),
    )
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument()
    expect(screen.getByText('<img src=x onerror=alert(3)>')).toBeInTheDocument()
    expect(screen.getByText('javascript:alert(2)')).toBeInTheDocument()
    expect(container.querySelector('script, img, a[href^="javascript"]')).toBeNull()
    expect(alerta).not.toHaveBeenCalled()
  })
})

describe('CA-1947: leitor de tela', () => {
  it('a caixa de cada linha é descrita pelo motivo dela', async () => {
    const { usuario } = montarTela()
    await abrirPrevia(usuario)
    expect(screen.getByRole('checkbox', { name: 'Importar Bruno Carvalho Dias' })).toHaveAccessibleDescription('Sexo vazio')
    expect(screen.getByRole('checkbox', { name: 'Importar Juliana Ferreira Souza' })).toHaveAccessibleDescription('Pronto')
  })

  it('o passo Prévia leva o foco ao título dele', async () => {
    const { usuario } = montarTela()
    await abrirPrevia(usuario)
    expect(screen.getByRole('heading', { level: 2, name: 'Prévia' })).toHaveFocus()
  })
})
