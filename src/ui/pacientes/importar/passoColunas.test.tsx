// O passo Colunas (spec importar-pacientes, D-904, D-905): CA-1908, CA-1913, CA-1914, CA-1915, CA-1917, DP-IP-11.
import { screen, within } from '@testing-library/react'
import { montarXlsx } from '@/domain/importar/montarArquivos.test-utils.ts'
import { abrirColunas, arquivo, montarTela } from './montarTela.test-utils.tsx'

const lista = (coluna: string) => screen.getByRole<HTMLSelectElement>('combobox', { name: `Destino da coluna ${coluna}` })
const verPrevia = () => screen.getByRole('button', { name: 'Ver prévia' })

describe('CA-1917: o que o passo Colunas mostra', () => {
  it('quantas linhas e colunas a planilha tem, o exemplo da primeira linha de cada coluna e o destino', async () => {
    const { usuario } = montarTela()
    await abrirColunas(usuario)
    expect(screen.getByText('9 linhas · 9 colunas · 7 reconhecidas')).toBeInTheDocument()
    const tabela = screen.getByRole('table', { name: 'Colunas da planilha' })
    const linhas = within(tabela).getAllByRole('row').slice(1)
    expect(linhas.map((linha) => within(linha).getAllByRole('cell').slice(0, 2).map((c) => c.textContent))).toEqual([
      ['Nome', 'Juliana Ferreira Souza'],
      ['Sexo', 'F'],
      ['Data de nascimento', '14/03/1991'],
      ['Celular', '(11) 98765-4321'],
      ['E-mail', 'juliana.souza@email.com'],
      ['Objetivo', 'Reeducação alimentar'],
      ['CPF', '123.456.789-00'],
      ['Peso (kg)', '68,4'],
      ['Observações', 'Intolerância à lactose'],
    ])
    expect(lista('Celular')).toHaveValue('telefone')
    expect(lista('CPF')).toHaveValue('nao')
    expect(lista('Peso (kg)')).toHaveValue('nao')
    expect(within(tabela).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Coluna da planilha', 'Primeira linha', 'Vai para'])
  })

  it('"Trocar arquivo" volta ao passo Arquivo', async () => {
    const { usuario } = montarTela()
    await abrirColunas(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Trocar arquivo' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Solte a planilha aqui' })).toHaveFocus()
  })
})

describe('CA-1913: sem nenhum cabeçalho reconhecido', () => {
  it('"Coluna A", "Coluna B"…, com o valor da primeira linha de exemplo, todas em "Não importar"', async () => {
    const { usuario } = montarTela()
    await abrirColunas(usuario, arquivo('lista.csv', 'Ana Souza;F\r\nBia Lima;F\r\n'))
    expect(lista('Coluna A')).toHaveValue('nao')
    expect(lista('Coluna B')).toHaveValue('nao')
    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
    expect(verPrevia()).toBeDisabled()
  })
})

describe('CA-1914: nenhuma coluna em Nome', () => {
  it('"Ver prévia" fica desabilitado e a tela diz "Escolha a coluna do nome."', async () => {
    const { usuario } = montarTela()
    await abrirColunas(usuario)
    expect(verPrevia()).toBeEnabled()
    expect(screen.queryByText('Escolha a coluna do nome.')).not.toBeInTheDocument()
    await usuario.selectOptions(lista('Nome'), 'nao')
    expect(verPrevia()).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha a coluna do nome.')
    expect(verPrevia()).toHaveAccessibleDescription('Escolha a coluna do nome.')
  })
})

describe('CA-1915: um destino por coluna, menos Observações', () => {
  it('mandar outra coluna para Telefone devolve a primeira a "Não importar"', async () => {
    const { usuario } = montarTela()
    await abrirColunas(usuario)
    await usuario.selectOptions(lista('CPF'), 'telefone')
    expect(lista('CPF')).toHaveValue('telefone')
    expect(lista('Celular')).toHaveValue('nao')
  })

  it('duas colunas em Observações ficam as duas', async () => {
    const { usuario } = montarTela()
    await abrirColunas(usuario)
    await usuario.selectOptions(lista('Peso (kg)'), 'observacoes')
    expect(lista('Peso (kg)')).toHaveValue('observacoes')
    expect(lista('Observações')).toHaveValue('observacoes')
  })

  it('as opções são os destinos do D-905', async () => {
    const { usuario } = montarTela()
    await abrirColunas(usuario)
    expect(within(lista('Nome')).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Nome',
      'Sobrenome (junta ao nome)',
      'Sexo',
      'Data de nascimento',
      'Telefone',
      'E-mail',
      'Objetivo',
      'Observações',
      'Não importar',
    ])
  })
})

describe('D-919 e CB-926: mais de 200 colunas', () => {
  it('o passo Colunas diz que só as 200 primeiras entram', async () => {
    const { usuario } = montarTela()
    const larga = `Nome;Sexo\nAna;F${';'.repeat(300)}x\n`
    await abrirColunas(usuario, arquivo('larga.csv', larga))
    expect(screen.getByText('Só as 200 primeiras colunas entram.')).toBeInTheDocument()
    expect(screen.getAllByRole('combobox', { name: /^Destino da coluna/ })).toHaveLength(200)
  })

  it('com poucas colunas, o aviso não aparece', async () => {
    const { usuario } = montarTela()
    await abrirColunas(usuario)
    expect(screen.queryByText('Só as 200 primeiras colunas entram.')).not.toBeInTheDocument()
  })
})

describe('CA-1908: XLSX com mais de uma aba', () => {
  it('"Aba" mostra as abas do arquivo, a primeira escolhida; trocar a aba relê as colunas', async () => {
    const bytes = await montarXlsx({
      abas: [
        { nome: 'Pacientes 2025', linhas: [['Nome', 'Sexo'], ['Ana', 'F']] },
        { nome: 'Pacientes 2026', linhas: [['Paciente', 'Celular', 'E-mail'], ['Bia', '(11) 9', 'bia@email.com']] },
      ],
    })
    const { usuario } = montarTela()
    await abrirColunas(usuario, arquivo('pacientes.xlsx', bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))
    const aba = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Aba' })
    expect(within(aba).getAllByRole('option').map((o) => o.textContent)).toEqual(['Pacientes 2025', 'Pacientes 2026'])
    expect(aba).toHaveValue('0')
    expect(lista('Sexo')).toHaveValue('sexo')
    await usuario.selectOptions(aba, '1')
    expect(lista('Paciente')).toHaveValue('nome')
    expect(lista('Celular')).toHaveValue('telefone')
    expect(screen.queryByRole('combobox', { name: 'Destino da coluna Sexo' })).not.toBeInTheDocument()
  })

  it('o CSV não tem "Aba"', async () => {
    const { usuario } = montarTela()
    await abrirColunas(usuario)
    expect(screen.queryByRole('combobox', { name: 'Aba' })).not.toBeInTheDocument()
  })

  it('DP-IP-11: a aba acima de 2.000 linhas mostra a recusa e desliga "Ver prévia"', async () => {
    const bytes = await montarXlsx({
      abas: [
        { nome: 'Pequena', linhas: [['Nome'], ['Ana']] },
        { nome: 'Grande', linhas: [['Nome'], ...Array.from({ length: 2001 }, (_, i) => [`P ${i}`])] },
      ],
    })
    const { usuario } = montarTela()
    await abrirColunas(usuario, arquivo('pacientes.xlsx', bytes))
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Aba' }), '1')
    expect(screen.getByRole('alert')).toHaveTextContent('A planilha tem mais de 2.000 linhas. Divida em arquivos menores.')
    expect(verPrevia()).toBeDisabled()
  })
})
