// A entrada e o passo Arquivo (spec importar-pacientes, D-900, D-901, D-917): CA-1900 a CA-1902, CA-1909, CA-1910,
// CA-1947, CB-911 e o rascunho na memória (DP-IP-23, CB-914 a CB-916).
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { criarRepositorioPacientes } from '@/domain/pacientes.ts'
import { criarRepositorio } from '@/domain/persistencia.ts'
import { ProvedorCasos } from '../../estado/ProvedorCasos.tsx'
import { ProvedorPacientes } from '../../estado/ProvedorPacientes.tsx'
import { lerRota, escreverRota } from '../../navegacao.ts'
import { TelaPacientes } from '../TelaPacientes.tsx'
import { abrirColunas, arquivo, CSV_DO_PROTOTIPO, escolher, Memoria, montarTela, soltar } from './montarTela.test-utils.tsx'

/** Um arquivo que só termina de ser lido quando o teste solta: a leitura fica no meio. */
function arquivoLento(nome: string, texto: string) {
  const escolhido = arquivo(nome, texto)
  let soltarLeitura: () => void = () => undefined
  const pronto = new Promise<void>((resolver) => {
    soltarLeitura = resolver
  })
  const ler = escolhido.arrayBuffer.bind(escolhido)
  Object.defineProperty(escolhido, 'arrayBuffer', {
    value: async () => {
      await pronto
      return ler()
    },
  })
  return { escolhido, soltarLeitura }
}

const grande = (linhas: number) => arquivo('grande.csv', ['Nome;Sexo', ...Array.from({ length: linhas }, (_, i) => `Paciente ${i};F`)].join('\n'))

function pacientes(comPaciente: boolean, aoImportar = vi.fn()) {
  const armazenamento = new Memoria()
  const repo = criarRepositorioPacientes(armazenamento)
  if (comPaciente) repo.criar('Ana Souza')
  render(
    <ProvedorCasos repositorio={criarRepositorio(armazenamento)}>
      <ProvedorPacientes repositorio={repo}>
        <TelaPacientes aoAbrir={vi.fn()} aoImportar={aoImportar} />
      </ProvedorPacientes>
    </ProvedorCasos>,
  )
  return aoImportar
}

describe('A entrada (D-900)', () => {
  it('CA-1900: com pacientes, "Importar planilha" fica ao lado de "Novo paciente" e abre #/pacientes/importar', async () => {
    const aoImportar = pacientes(true)
    const novo = screen.getByRole('button', { name: 'Novo paciente' })
    const importar = screen.getByRole('button', { name: 'Importar planilha' })
    expect(importar.parentElement).toBe(novo.parentElement)
    await userEvent.click(importar)
    expect(aoImportar).toHaveBeenCalled()
    expect(lerRota('#/pacientes/importar')).toEqual({ tela: 'importar-pacientes' })
    expect(escreverRota({ tela: 'importar-pacientes' })).toBe('#/pacientes/importar')
  })

  it('CA-1901: sem nenhum paciente, "Importar planilha" aparece ao lado de "Cadastrar paciente"', async () => {
    const aoImportar = pacientes(false)
    const cadastrar = screen.getByRole('button', { name: 'Cadastrar paciente' })
    const botoes = within(cadastrar.parentElement as HTMLElement).getAllByRole('button').map((b) => b.textContent)
    expect(botoes).toEqual(['Cadastrar paciente', 'Importar planilha'])
    await userEvent.click(within(cadastrar.parentElement as HTMLElement).getByRole('button', { name: 'Importar planilha' }))
    expect(aoImportar).toHaveBeenCalled()
  })

  it('a tela abre no passo Arquivo, com os textos do D-917', () => {
    montarTela()
    expect(screen.getByRole('navigation', { name: 'Passos da importação' }).querySelector('[aria-current="step"]')).toHaveTextContent('Arquivo')
    expect(screen.getByRole('heading', { level: 2, name: 'Solte a planilha aqui' })).toBeInTheDocument()
    expect(screen.getByText('CSV ou XLSX, até 2.000 linhas. O arquivo não sai deste computador.')).toBeInTheDocument()
    const entram = screen.getByRole('region', { name: 'Colunas que entram' })
    expect(within(entram).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Nomeobrigatória',
      'Sexo',
      'Data de nascimento',
      'Telefone',
      'E-mail',
      'Objetivo',
      'Observaçõesaceita várias',
    ])
    // D-922: a lista já diz o que entra.
    expect(screen.queryByText('As outras ficam de fora.')).not.toBeInTheDocument()
  })
})

describe('CA-1902: soltar ou escolher o CSV', () => {
  it('pelo "Escolher arquivo": "Lendo a planilha…" e, em seguida, o passo Colunas com o foco no título dele (CA-1947)', async () => {
    const { usuario } = montarTela()
    const { escolhido, soltarLeitura } = arquivoLento('grande.csv', CSV_DO_PROTOTIPO)
    await escolher(usuario, escolhido)
    expect(await screen.findByText('Lendo a planilha…')).toBeInTheDocument()
    soltarLeitura()
    const titulo = await screen.findByRole('heading', { level: 2, name: 'grande.csv' })
    expect(titulo).toHaveFocus()
    expect(screen.queryByText('Lendo a planilha…')).not.toBeInTheDocument()
  })

  it('soltando na área', async () => {
    montarTela()
    soltar(screen.getByRole('region', { name: 'Solte a planilha aqui' }), arquivo('pacientes.csv', CSV_DO_PROTOTIPO))
    expect(await screen.findByRole('heading', { level: 2, name: 'pacientes.csv' })).toBeInTheDocument()
  })

  it('CA-1947: "Escolher arquivo" é o campo de arquivo de verdade, alcançável pelo teclado', async () => {
    const { usuario } = montarTela()
    const campo = screen.getByLabelText('Escolher arquivo')
    expect(campo).toHaveAttribute('type', 'file')
    for (let vez = 0; vez < 6 && document.activeElement !== campo; vez += 1) await usuario.tab()
    expect(campo).toHaveFocus()
  })
})

describe('CA-1909: o que não é planilha', () => {
  it.each([
    ['arquivo.pdf', '“arquivo.pdf” não é uma planilha. Use CSV ou XLSX.'],
    ['foto.png', '“foto.png” não é uma planilha. Use CSV ou XLSX.'],
    ['pacientes.xls', 'Arquivo .xls antigo. No Excel, salve como .xlsx ou CSV.'],
    ['pacientes.ods', 'Arquivo .ods. No LibreOffice, salve como .xlsx ou CSV.'],
    ['pacientes.numbers', 'Arquivo .numbers. No Numbers, exporte como .xlsx ou CSV.'],
  ])('%s: a recusa aparece e nada mais acontece', async (nome, frase) => {
    montarTela()
    soltar(screen.getByRole('region', { name: 'Solte a planilha aqui' }), arquivo(nome, 'x'))
    expect(await screen.findByRole('alert')).toHaveTextContent(frase)
    expect(screen.getByRole('heading', { level: 2, name: 'Solte a planilha aqui' })).toBeInTheDocument()
  })
})

describe('CA-1910: limites', () => {
  it('mais de 2.000 linhas: a recusa diz o limite', async () => {
    const { usuario } = montarTela()
    await escolher(usuario, grande(2001))
    expect(await screen.findByRole('alert')).toHaveTextContent('A planilha tem mais de 2.000 linhas. Divida em arquivos menores.')
  })

  it('CB-900: só o cabeçalho: "A planilha não tem pacientes."', async () => {
    const { usuario } = montarTela()
    await escolher(usuario, arquivo('vazia.csv', 'Nome;Sexo\n'))
    expect(await screen.findByRole('alert')).toHaveTextContent('A planilha não tem pacientes.')
  })

  it('escolher outro arquivo tira a recusa anterior', async () => {
    const { usuario } = montarTela()
    await escolher(usuario, arquivo('vazia.csv', 'Nome;Sexo\n'))
    await screen.findByRole('alert')
    await abrirColunas(usuario)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('CB-911: "Cancelar" durante a leitura', () => {
  it('volta ao passo Arquivo e nada mais acontece', async () => {
    const { usuario } = montarTela()
    const { escolhido, soltarLeitura } = arquivoLento('grande.csv', CSV_DO_PROTOTIPO)
    await escolher(usuario, escolhido)
    await usuario.click(await screen.findByRole('button', { name: 'Cancelar a leitura' }))
    expect(screen.queryByText('Lendo a planilha…')).not.toBeInTheDocument()
    soltarLeitura()
    await new Promise((resolver) => setTimeout(resolver, 50))
    expect(screen.getByRole('heading', { level: 2, name: 'Solte a planilha aqui' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'grande.csv' })).not.toBeInTheDocument()
  })
})

describe('"Cancelar" da tela (D-900)', () => {
  it('volta a Pacientes sem criar nada', async () => {
    const { usuario, aoSair, repoPacientes } = montarTela()
    await abrirColunas(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(aoSair).toHaveBeenCalled()
    expect(repoPacientes.listar()).toEqual([])
  })
})

describe('DP-IP-23: o rascunho fica na memória da aba', () => {
  it('CB-914: a tela que remonta (a nuvem trouxe mudança) continua no mesmo passo', async () => {
    const armazenamento = new Memoria()
    const primeira = montarTela({ armazenamento })
    await abrirColunas(primeira.usuario)
    primeira.unmount()
    montarTela({ armazenamento })
    expect(screen.getByRole('heading', { level: 2, name: 'pacientes.csv' })).toBeInTheDocument()
    // Nada da planilha foi gravado no armazenamento (D-914).
    expect([...armazenamento.dados.values()].join(' ')).not.toContain('Juliana')
  })

  it('CB-915: outra sessão (outro armazenamento da conta) começa do zero', async () => {
    const primeira = montarTela()
    await abrirColunas(primeira.usuario)
    primeira.unmount()
    montarTela({ armazenamento: new Memoria() })
    expect(screen.getByRole('heading', { level: 2, name: 'Solte a planilha aqui' })).toBeInTheDocument()
  })

  it('"Cancelar" esquece o rascunho', async () => {
    const armazenamento = new Memoria()
    const primeira = montarTela({ armazenamento })
    await abrirColunas(primeira.usuario)
    await primeira.usuario.click(screen.getByRole('button', { name: 'Cancelar' }))
    primeira.unmount()
    montarTela({ armazenamento })
    expect(screen.getByRole('heading', { level: 2, name: 'Solte a planilha aqui' })).toBeInTheDocument()
  })
})
