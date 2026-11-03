// Importar, a conclusão e o desfazer (spec importar-pacientes, D-910 a D-915): CA-1933, CA-1935, CA-1936, CA-1940 a
// CA-1942, CA-1944.
import { screen, within } from '@testing-library/react'
import { bytesDaCopia, TETO_DA_COPIA } from '@/domain/importar/criar.ts'
import { montarCopia } from '@/domain/copiaDaConta.ts'
import { abrirPrevia, arquivo, Memoria, montarTela, NA_CONTA } from './montarTela.test-utils.tsx'

const importar = async (usuario: ReturnType<typeof montarTela>['usuario'], n = 5) => {
  await usuario.click(screen.getByRole('button', { name: `Importar ${n} pacientes` }))
}

describe('CA-1933 e CA-1940: "Importar 5 pacientes"', () => {
  it('os 5 são criados de uma vez, sem plano, e a conclusão mostra quem entrou e quem ficou de fora', async () => {
    const { usuario, repoPacientes, repoCasos } = montarTela({ pacientes: NA_CONTA })
    await abrirPrevia(usuario)
    await importar(usuario)
    const titulo = await screen.findByRole('heading', { level: 2, name: '5 pacientes importados' })
    expect(titulo).toHaveFocus()
    expect(screen.getByText('Entram sem plano e não contam como ativos.')).toBeInTheDocument()

    const importados = repoPacientes.listar().filter((p) => p.importacao !== null)
    expect(importados.map((p) => p.nome).sort()).toEqual(['Juliana Ferreira Souza', 'Lucas Martins', 'Patrícia Gomes Ribeiro', 'Rafael Oliveira Lima', 'Tiago Nascimento'])
    expect(new Set(importados.map((p) => p.importacao?.id)).size).toBe(1)
    expect(repoCasos.listar()).toEqual([])

    const entraram = within(screen.getByRole('region', { name: '5 pacientes importados' })).getAllByRole('listitem')
    expect(entraram[0]).toHaveTextContent('Juliana Ferreira SouzaF · 14/03/1991')
    const fora = within(screen.getByRole('region', { name: 'Ficaram de fora' })).getAllByRole('listitem').map((li) => li.textContent)
    expect(fora).toEqual(['Camila RodriguesData inválida', 'Bruno Carvalho DiasSexo vazio', 'Rafael Oliveira LimaIgual à linha 3', 'Fernanda Almeida CostaJá está na conta'])
    expect(screen.getByRole('button', { name: 'Baixar as que ficaram de fora' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Desfazer' })).toBeInTheDocument()
    // Na conclusão, não há mais "Cancelar" nem os passos.
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Passos da importação' })).not.toBeInTheDocument()
  })

  it('a linha pronta desmarcada aparece como "Desmarcada"; as linhas sem nome, juntas', async () => {
    const { usuario } = montarTela()
    await abrirPrevia(usuario, arquivo('a.csv', 'Nome;Sexo\nAna;F\nBia;F\n;M\n;F\n'))
    await usuario.click(screen.getByRole('checkbox', { name: 'Importar Bia' }))
    await usuario.click(screen.getByRole('button', { name: 'Importar 1 paciente' }))
    await screen.findByRole('heading', { level: 2, name: '1 paciente importado' })
    expect(within(screen.getByRole('region', { name: 'Ficaram de fora' })).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['BiaDesmarcada', '2 linhas sem nomeSem nome'])
  })

  it('sem nada de fora, não há "Ficaram de fora" nem o botão de baixar', async () => {
    const { usuario } = montarTela()
    await abrirPrevia(usuario, arquivo('a.csv', 'Nome;Sexo\nAna;F\nBia;F\n'))
    await importar(usuario, 2)
    await screen.findByRole('heading', { level: 2, name: '2 pacientes importados' })
    expect(screen.queryByRole('region', { name: 'Ficaram de fora' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Baixar as que ficaram de fora' })).not.toBeInTheDocument()
  })

  it('"Ver pacientes" volta a Pacientes', async () => {
    const { usuario, aoSair } = montarTela()
    await abrirPrevia(usuario, arquivo('a.csv', 'Nome;Sexo\nAna;F\n'))
    await usuario.click(screen.getByRole('button', { name: 'Importar 1 paciente' }))
    await usuario.click(await screen.findByRole('button', { name: 'Ver pacientes' }))
    expect(aoSair).toHaveBeenCalled()
  })
})

describe('CA-1941 e CA-1942: "Desfazer"', () => {
  it('logo depois de importar, os 5 saem e a tela diz "Importação desfeita."', async () => {
    const { usuario, repoPacientes } = montarTela({ pacientes: NA_CONTA })
    await abrirPrevia(usuario)
    await importar(usuario)
    await usuario.click(await screen.findByRole('button', { name: 'Desfazer' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Importação desfeita.' })).toHaveFocus()
    expect(repoPacientes.listar().map((p) => p.nome)).toEqual(['Fernanda Almeida Costa'])
    await usuario.click(screen.getByRole('button', { name: 'Escolher outro arquivo' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Solte a planilha aqui' })).toBeInTheDocument()
  })

  it('quem ganhou plano e quem teve a ficha editada ficam, e a tela diz quantos', async () => {
    const { usuario, repoPacientes, repoCasos } = montarTela()
    await abrirPrevia(usuario, arquivo('a.csv', 'Nome;Sexo\nAna;F\nBia;F\nCaio;M\n'))
    await importar(usuario, 3)
    await screen.findByRole('heading', { level: 2, name: '3 pacientes importados' })
    const [ana, bia] = [...repoPacientes.listar()].sort((a, b) => a.nome.localeCompare(b.nome))
    if (!ana || !bia) throw new Error('sem os importados')
    const plano = repoCasos.criar('Plano da Ana')
    repoCasos.salvar({ ...plano, caso: { ...plano.caso, pacienteId: ana.id } })
    await new Promise((resolver) => setTimeout(resolver, 5))
    repoPacientes.salvar({ ...bia, telefone: '(11) 9' })
    await usuario.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Importação desfeita.' })).toBeInTheDocument()
    expect(screen.getByText('2 pacientes ficaram porque já foram mudados.')).toBeInTheDocument()
    expect(repoPacientes.listar().map((p) => p.nome).sort()).toEqual(['Ana', 'Bia'])
  })
})

describe('CA-1935: um paciente criado em outra aba entre a prévia e o clique', () => {
  it('nada é criado, a prévia volta com a linha em "Já está na conta" e as contas corrigidas', async () => {
    const { usuario, repoPacientes } = montarTela({ pacientes: NA_CONTA })
    await abrirPrevia(usuario)
    // A outra aba grava no mesmo armazenamento; esta ainda não leu.
    repoPacientes.criar('Lucas Martins')
    await importar(usuario)
    expect(await screen.findByRole('alert')).toHaveTextContent('A lista de pacientes mudou. Confira a prévia antes de importar.')
    expect(repoPacientes.listar().map((p) => p.nome).sort()).toEqual(['Fernanda Almeida Costa', 'Lucas Martins'])
    const lucas = screen.getByRole('checkbox', { name: 'Importar Lucas Martins' }).closest('[role="row"]') as HTMLElement
    expect(within(lucas).getAllByRole('cell').at(-1)?.textContent).toBe('Já está na conta')
    expect(screen.getByRole('status', { name: 'Contas da prévia' })).toHaveTextContent('4 prontos para importar5 com problema')
    await usuario.click(screen.getByRole('button', { name: 'Importar 4 pacientes' }))
    expect(await screen.findByRole('heading', { level: 2, name: '4 pacientes importados' })).toBeInTheDocument()
  })
})

describe('CA-1936: a importação que faria a cópia passar de 5 MB', () => {
  it('nada é criado e a prévia diz quantos cabem', async () => {
    const armazenamento = new Memoria()
    armazenamento.setItem('metanutri:perfil', JSON.stringify({ logo: '' }))
    const vazia = bytesDaCopia(montarCopia(armazenamento, new Date().toISOString()))
    armazenamento.setItem('metanutri:perfil', JSON.stringify({ logo: 'x'.repeat(TETO_DA_COPIA - vazia - 1200) }))
    const { usuario, repoPacientes } = montarTela({ armazenamento })
    await abrirPrevia(usuario, arquivo('a.csv', 'Nome;Sexo\nAna Souza;F\nBia Lima;F\nCaio Dias;M\nDuda Reis;F\nEnzo Melo;M\n'))
    await importar(usuario)
    expect(await screen.findByRole('alert')).toHaveTextContent(/^Não cabe na conta: cabem mais \d pacientes?\.$/)
    expect(repoPacientes.listar()).toEqual([])
  })
})

describe('CA-1944: "Baixar as que ficaram de fora"', () => {
  it('baixa o CSV com as linhas de fora, as colunas da planilha e "Motivo", em UTF-8 com BOM', async () => {
    let baixado: Blob | null = null
    const criarUrl = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      baixado = blob as Blob
      return 'blob:teste'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const nomes: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      nomes.push(this.download)
    })
    const { usuario } = montarTela({ pacientes: NA_CONTA })
    await abrirPrevia(usuario, arquivo('pacientes.csv', 'Nome;Sexo;Obs\nAna;F;\nBia;;=HIPERLINK("x")\n'))
    await usuario.click(screen.getByRole('button', { name: 'Importar 1 paciente' }))
    await usuario.click(await screen.findByRole('button', { name: 'Baixar as que ficaram de fora' }))
    expect(criarUrl).toHaveBeenCalled()
    expect(nomes).toEqual(['ficaram-de-fora.csv'])
    const texto = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await (baixado as unknown as Blob).arrayBuffer())
    expect(texto).toBe(`\uFEFFNome;Sexo;Obs;Motivo\r\nBia;;"'=HIPERLINK(""x"")";Sexo vazio\r\n`)
    vi.restoreAllMocks()
  })
})
