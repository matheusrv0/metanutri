// As colunas da planilha (spec importar-pacientes, D-904, D-905): CA-1911 a CA-1915, CA-1917, CB-904, CB-905.
import { analisarAba, destinoDoCabecalho, LIMITE_DE_COLUNAS, LIMITE_DE_LINHAS, mudarDestino, temNome, type Destino } from './colunas.ts'
import type { Registro } from './lerTexto.ts'

/** Linhas de planilha numeradas a partir de 1, sem as vazias (como os leitores entregam). */
const planilha = (...linhas: string[][]): Registro[] =>
  linhas.flatMap((celulas, i) => (celulas.some((c) => c.trim() !== '') ? [{ numero: i + 1, celulas }] : []))

describe('CA-1911: cada grupo de cabeçalhos do D-904 vem com o destino certo, com e sem acento e caixa', () => {
  const GRUPOS: readonly (readonly [Destino, readonly string[]])[] = [
    ['nome', ['Nome', 'NOME COMPLETO', 'Paciente', 'Nome do paciente', 'cliente', 'Name', 'Nombre']],
    ['sobrenome', ['Sobrenome', 'Último nome', 'ULTIMO NOME', 'Last name']],
    ['sexo', ['Sexo', 'Gênero', 'GENERO', 'sex', 'Gender']],
    ['nascimento', ['Data de nascimento', 'Nascimento', 'Data nasc.', 'Dt. nasc.', 'DN', 'Aniversário', 'aniversario', 'Birth date', 'Date of birth']],
    ['telefone', ['Telefone', 'Celular', 'WhatsApp', 'Fone', 'Tel.', 'Phone', 'Mobile']],
    ['email', ['E-mail', 'email', 'EMAIL', 'Correio eletrônico', 'correio eletronico']],
    ['objetivo', ['Objetivo', 'Motivo da consulta', 'Meta', 'Goal']],
    ['observacoes', ['Observações', 'observacoes', 'Obs.', 'Notas', 'Anotações', 'Notes']],
  ]

  it.each(GRUPOS)('%s', (destino, cabecalhos) => {
    for (const cabecalho of cabecalhos) expect(destinoDoCabecalho(cabecalho), cabecalho).toBe(destino)
    // Com espaço a mais em volta, também.
    expect(destinoDoCabecalho(`  ${cabecalhos[0] ?? ''}  `)).toBe(destino)
  })

  it('cabeçalho fora da lista vem em "Não importar"; "Nome da mãe" não é Nome (DP-IP-8)', () => {
    for (const cabecalho of ['CPF', 'Peso (kg)', 'RG', 'Endereço', 'Convênio', 'Nome da mãe', '']) expect(destinoDoCabecalho(cabecalho), cabecalho).toBe('nao')
  })
})

describe('CA-1912: linhas de título acima da tabela', () => {
  it('o cabeçalho é a linha com mais nomes reconhecidos entre as 10 primeiras; as de cima ficam de fora', () => {
    const analise = analisarAba(
      planilha(['Relatório de pacientes'], [''], ['Gerado em 29/10/2026', 'Nome'], ['Nome', 'Sexo', 'Celular'], ['Ana Souza', 'F', '(11) 9'], ['Bia Lima', 'F', '']),
      false,
    )
    expect(analise.cabecalho).toBe(4)
    expect(analise.colunas.map((c) => c.nome)).toEqual(['Nome', 'Sexo', 'Celular'])
    expect(analise.destinos).toEqual(['nome', 'sexo', 'telefone'])
    expect(analise.linhas.map((l) => l.numero)).toEqual([5, 6])
  })

  it('a 11ª linha com texto não é olhada', () => {
    const titulos = Array.from({ length: 10 }, (_, i) => [`Título ${i}`])
    const analise = analisarAba(planilha(...titulos, ['Nome', 'Sexo'], ['Ana', 'F']), false)
    expect(analise.cabecalho).toBeNull()
  })
})

describe('CA-1913: planilha sem nenhum cabeçalho reconhecido', () => {
  it('as colunas aparecem como "Coluna A", "Coluna B"…, com a primeira linha de exemplo, todas em "Não importar"', () => {
    const analise = analisarAba(planilha(['Ana Souza', 'F', '14/03/1991'], ['Bia Lima', 'F', '']), false)
    expect(analise.cabecalho).toBeNull()
    expect(analise.colunas).toEqual([
      { indice: 0, nome: 'Coluna A', exemplo: 'Ana Souza' },
      { indice: 1, nome: 'Coluna B', exemplo: 'F' },
      { indice: 2, nome: 'Coluna C', exemplo: '14/03/1991' },
    ])
    expect(analise.destinos).toEqual(['nao', 'nao', 'nao'])
    // DP-IP-7: a primeira linha já é paciente.
    expect(analise.linhas.map((l) => l.numero)).toEqual([1, 2])
  })
})

describe('CA-1914: sem coluna em Nome, a prévia não abre', () => {
  it('temNome diz se algum destino é Nome', () => {
    expect(temNome(['nao', 'sexo'])).toBe(false)
    expect(temNome(['nome', 'sexo'])).toBe(true)
  })
})

describe('CA-1915: cada destino recebe uma coluna só, menos Observações (D-905)', () => {
  it('mandar outra coluna para Telefone devolve a primeira a "Não importar"', () => {
    expect(mudarDestino(['nome', 'telefone', 'nao'], 2, 'telefone')).toEqual(['nome', 'nao', 'telefone'])
  })

  it('duas colunas em Observações ficam as duas', () => {
    expect(mudarDestino(['nome', 'observacoes', 'nao'], 2, 'observacoes')).toEqual(['nome', 'observacoes', 'observacoes'])
  })

  it('Sobrenome também é de uma coluna só; "Não importar" pode ser de todas', () => {
    expect(mudarDestino(['sobrenome', 'nao'], 1, 'sobrenome')).toEqual(['nao', 'sobrenome'])
    expect(mudarDestino(['nome', 'nao'], 0, 'nao')).toEqual(['nao', 'nao'])
  })
})

describe('CA-1917: quantas linhas e colunas, e o exemplo da primeira linha', () => {
  it('conta as linhas de paciente e as colunas; o exemplo é a primeira linha de paciente (DP-IP-9)', () => {
    const analise = analisarAba(planilha(['Nome', 'Sexo', 'Obs'], ['Ana', 'F', ''], ['Bia', 'F', 'Asma'], ['Caio', 'M', '']), false)
    expect(analise.linhas).toHaveLength(3)
    expect(analise.colunas.map((c) => [c.nome, c.exemplo])).toEqual([
      ['Nome', 'Ana'],
      ['Sexo', 'F'],
      ['Obs', ''],
    ])
    expect(analise.reconhecidas).toBe(3)
  })
})

describe('CB-904: linhas e colunas vazias no meio', () => {
  it('a coluna vazia aparece em "Não importar"; a coluna vazia no fim, sem nome, não aparece', () => {
    const analise = analisarAba(planilha(['Nome', '', 'Sexo', ''], ['Ana', '', 'F', ''], [''], ['Bia', '', 'F']), false)
    expect(analise.colunas.map((c) => c.nome)).toEqual(['Nome', 'Coluna B', 'Sexo'])
    expect(analise.destinos).toEqual(['nome', 'nao', 'sexo'])
    expect(analise.linhas.map((l) => l.numero)).toEqual([2, 4])
  })
})

describe('CB-905: o mesmo cabeçalho duas vezes', () => {
  it('a primeira vai para Telefone, a segunda para "Não importar"', () => {
    const analise = analisarAba(planilha(['Nome', 'Telefone', 'Telefone'], ['Ana', '1', '2']), false)
    expect(analise.destinos).toEqual(['nome', 'telefone', 'nao'])
    expect(mudarDestino(analise.destinos, 2, 'observacoes')).toEqual(['nome', 'telefone', 'observacoes'])
  })

  it('Observações repetida fica nas duas', () => {
    expect(analisarAba(planilha(['Nome', 'Obs', 'Notas'], ['Ana', 'a', 'b']), false).destinos).toEqual(['nome', 'observacoes', 'observacoes'])
  })
})

describe('CB-926: milhares de colunas (D-919)', () => {
  it('só as 200 primeiras colunas entram, e a análise diz que cortou', () => {
    const larga = ['Ana', 'F', ...Array.from({ length: 15_000 }, () => ''), 'x']
    const analise = analisarAba(planilha(['Nome', 'Sexo'], larga), false)
    expect(LIMITE_DE_COLUNAS).toBe(200)
    expect(analise.colunas).toHaveLength(200)
    expect(analise.destinos).toHaveLength(200)
    expect(analise.colunasCortadas).toBe(true)
  })

  it('até 200, nada é cortado', () => {
    const analise = analisarAba(planilha(Array.from({ length: 200 }, (_, i) => (i === 0 ? 'Nome' : `C${i}`)), Array.from({ length: 200 }, () => 'x')), false)
    expect(analise.colunas).toHaveLength(200)
    expect(analise.colunasCortadas).toBe(false)
  })
})

describe('CA-1910: o limite de linhas de paciente', () => {
  const comLinhas = (n: number) => planilha(['Relatório'], ['Nome'], ...Array.from({ length: n }, (_, i) => [`Paciente ${i}`]))

  it(`${LIMITE_DE_LINHAS} linhas de paciente cabem; uma a mais, não (os títulos e o cabeçalho não contam)`, () => {
    expect(analisarAba(comLinhas(LIMITE_DE_LINHAS), false).excede).toBe(false)
    expect(analisarAba(comLinhas(LIMITE_DE_LINHAS + 1), false).excede).toBe(true)
  })

  it('a aba que o leitor cortou passou do limite', () => {
    expect(analisarAba(comLinhas(10), true).excede).toBe(true)
  })
})
