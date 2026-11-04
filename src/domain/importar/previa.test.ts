// A prévia (spec importar-pacientes, D-905 a D-909): CA-1916, CA-1920, CA-1922 a CA-1932, CA-1938, CA-1939, CB-901,
// CB-920 e as decisões DP-IP-12 a DP-IP-16.
import { analisarAba } from './colunas.ts'
import type { Registro } from './lerTexto.ts'
import { corrigir, dadosDosPacientes, marcarTodas, montarPrevia, type EntradaDaPrevia, type LinhaDaPrevia } from './previa.ts'

const HOJE = '2026-10-29'

/** A planilha do protótipo: 9 linhas de paciente (as linhas 2 a 10 do arquivo), com CPF e peso, que não entram. */
const PLANILHA: readonly string[][] = [
  ['Nome', 'Sexo', 'Data de nascimento', 'Celular', 'E-mail', 'Objetivo', 'CPF', 'Peso (kg)', 'Observações'],
  ['Juliana Ferreira Souza', 'F', '14/03/1991', '(11) 98765-4321', 'juliana.souza@email.com', 'Reeducação alimentar', '123.456.789-00', '68,4', 'Intolerância à lactose'],
  ['Rafael Oliveira Lima', 'M', '02/11/1985', '(21) 99654-1207', 'rafael.lima@email.com', 'Ganho de massa', '111.222.333-44', '82,0', ''],
  ['Camila Rodrigues', 'F', '31/02/1994', '(31) 98822-0415', 'camila.r@email.com', 'Emagrecimento', '', '74,9', ''],
  ['Bruno Carvalho Dias', '', '23/07/1979', '(11) 97310-5582', 'bruno.dias@email.com', 'Controle da glicemia', '', '91,2', 'Diabetes tipo 2'],
  ['Patrícia Gomes Ribeiro', 'F', '09/05/1988', '(19) 99127-3340', 'patricia.ribeiro@email.com', 'Gestação', '', '63,0', '24 semanas'],
  ['Lucas Martins', 'M', '17/01/2001', '(41) 98451-7763', 'lucas.martins@email.com', 'Desempenho no esporte', '', '77,5', ''],
  ['RAFAEL OLIVEIRA LIMA', 'M', '02/11/1985', '(21) 99654-1207', 'rafael.lima@email.com', 'Ganho de massa', '', '82,0', ''],
  ['Fernanda Almeida Costa', 'F', '28/09/1996', '(21) 98034-6619', 'fernanda.costa@email.com', 'Reeducação alimentar', '', '58,7', ''],
  ['Tiago Nascimento', 'M', '05/12/1990', '(85) 99702-2148', 'tiago.n@email.com', 'Colesterol alto', '', '88,1', ''],
]

const NA_CONTA = [
  { nome: 'Fernanda Almeida Costa', nascimento: '1996-09-28' },
  { nome: 'Maria Santos', nascimento: '1998-04-12' },
]

const registros = (linhas: readonly (readonly string[])[]): Registro[] => linhas.map((celulas, i) => ({ numero: i + 1, celulas: [...celulas] }))

function entrada(linhas: readonly (readonly string[])[] = PLANILHA, mudanca: Partial<EntradaDaPrevia> = {}): EntradaDaPrevia {
  const analise = analisarAba(registros(linhas), false)
  return {
    linhas: analise.linhas,
    destinos: analise.destinos,
    colunas: analise.colunas,
    correcoes: {},
    marcas: {},
    pacientes: NA_CONTA,
    hoje: HOJE,
    ...mudanca,
  }
}

const linha = (linhas: readonly LinhaDaPrevia[], numero: number): LinhaDaPrevia => {
  const achada = linhas.find((l) => l.numero === numero)
  if (!achada) throw new Error(`sem a linha ${numero}`)
  return achada
}

describe('A prévia da planilha do protótipo', () => {
  it('CA-1927: 5 prontos, 4 com problema, cada linha com o número dela e o motivo', () => {
    const previa = montarPrevia(entrada())
    expect(previa.prontos).toBe(5)
    expect(previa.comProblema).toBe(4)
    expect(previa.linhas.map((l) => [l.numero, l.motivo])).toEqual([
      [2, 'Pronto'],
      [3, 'Pronto'],
      [4, 'Data inválida'],
      [5, 'Sexo vazio'],
      [6, 'Pronto'],
      [7, 'Pronto'],
      [8, 'Igual à linha 3'],
      [9, 'Já está na conta'],
      [10, 'Pronto'],
    ])
    expect(previa.marcadas.map((l) => l.numero)).toEqual([2, 3, 6, 7, 10])
  })

  it('D-909: as prontas começam marcadas; problema e fora começam desmarcados, e só o fora não pode ser marcado', () => {
    const previa = montarPrevia(entrada())
    expect(previa.linhas.map((l) => [l.numero, l.marcada, l.podeMarcar])).toEqual([
      [2, true, true],
      [3, true, true],
      [4, false, true],
      [5, false, true],
      [6, true, true],
      [7, true, true],
      [8, false, false],
      [9, false, false],
      [10, true, true],
    ])
  })
})

describe('CA-1916: Nome e Sobrenome', () => {
  it('o paciente entra com o nome completo', () => {
    const previa = montarPrevia(entrada([['Nome', 'Sobrenome', 'Sexo'], ['Juliana', 'Ferreira Souza', 'F']]))
    expect(previa.linhas[0]?.nome).toBe('Juliana Ferreira Souza')
  })

  it('só o sobrenome, sem nome, também é nome', () => {
    const previa = montarPrevia(entrada([['Nome', 'Sobrenome', 'Sexo'], ['', 'Souza', 'F']]))
    expect(previa.linhas[0]?.nome).toBe('Souza')
  })
})

describe('CA-1920: a coluna de datas lida como mês/dia', () => {
  it('com 03/25/1990 e nenhuma data impossível como mês/dia, a coluna inteira é mês/dia e a prévia avisa', () => {
    const previa = montarPrevia(entrada([['Nome', 'Sexo', 'Nascimento'], ['Ana', 'F', '03/25/1990'], ['Bia', 'F', '04/05/1988']]))
    expect(previa.mesDia).toBe(true)
    expect(previa.linhas.map((l) => l.nascimento)).toEqual(['1990-03-25', '1988-04-05'])
  })

  it('sem nenhuma, não avisa', () => {
    expect(montarPrevia(entrada()).mesDia).toBe(false)
  })
})

describe('CA-1922: a mesma pessoa duas vezes na planilha', () => {
  it('a segunda tem "Igual à linha N", com o número da primeira, e não pode ser marcada', () => {
    const previa = montarPrevia(entrada())
    expect(linha(previa.linhas, 8)).toMatchObject({ fora: { tipo: 'igual', linha: 3 }, podeMarcar: false, marcada: false })
  })

  it('a marca guardada não vale para a linha de fora', () => {
    expect(linha(montarPrevia(entrada(PLANILHA, { marcas: { 8: true } })).linhas, 8).marcada).toBe(false)
  })

  it('nome igual sem acento e sem espaço a mais, quando uma das duas não tem data', () => {
    const previa = montarPrevia(entrada([['Nome', 'Sexo', 'Nascimento'], ['João  Conceição', 'M', ''], ['joao conceicao', 'M', '14/03/1991']]))
    expect(previa.linhas[1]?.motivo).toBe('Igual à linha 2')
  })

  it('DP-IP-16: data inválida conta como sem data', () => {
    const previa = montarPrevia(entrada([['Nome', 'Sexo', 'Nascimento'], ['Ana Souza', 'F', '14/03/1991'], ['Ana Souza', 'F', 'não sei']]))
    expect(previa.linhas[1]?.motivo).toBe('Igual à linha 2')
  })
})

describe('CA-1923: quem já está na conta', () => {
  it('nome e data de um paciente da conta', () => {
    expect(linha(montarPrevia(entrada()).linhas, 9).motivo).toBe('Já está na conta')
  })

  it('o nome dele quando um dos dois não tem data', () => {
    const semData = montarPrevia(entrada([['Nome', 'Sexo'], ['MARIA SANTOS', 'F']]))
    expect(semData.linhas[0]?.motivo).toBe('Já está na conta')
    const contaSemData = montarPrevia(entrada([['Nome', 'Sexo', 'Nascimento'], ['Ana Lima', 'F', '01/01/1990']], { pacientes: [{ nome: 'Ana Lima', nascimento: null }] }))
    expect(contaSemData.linhas[0]?.motivo).toBe('Já está na conta')
  })
})

describe('CA-1924: irmãos com o mesmo e-mail e o mesmo telefone', () => {
  it('os dois ficam prontos: e-mail e telefone não decidem', () => {
    const previa = montarPrevia(
      entrada([
        ['Nome', 'Sexo', 'Nascimento', 'Telefone', 'E-mail'],
        ['Ana Lima', 'F', '01/02/2015', '(11) 9', 'mae@email.com'],
        ['Caio Lima', 'M', '03/04/2017', '(11) 9', 'mae@email.com'],
      ]),
    )
    expect(previa.linhas.map((l) => l.motivo)).toEqual(['Pronto', 'Pronto'])
  })
})

describe('CA-1925: homônimos com datas de nascimento diferentes', () => {
  it('na planilha, são duas pessoas', () => {
    const previa = montarPrevia(entrada([['Nome', 'Sexo', 'Nascimento'], ['Ana Souza', 'F', '01/02/1990'], ['Ana Souza', 'F', '03/04/1985']]))
    expect(previa.linhas.map((l) => l.motivo)).toEqual(['Pronto', 'Pronto'])
  })

  it('um na planilha e outro na conta também', () => {
    const previa = montarPrevia(entrada([['Nome', 'Sexo', 'Nascimento'], ['Maria Santos', 'F', '01/02/1990']]))
    expect(previa.linhas[0]?.motivo).toBe('Pronto')
  })
})

describe('CA-1926: linhas sem nome', () => {
  it('não aparecem na prévia e são contadas à parte', () => {
    const previa = montarPrevia(entrada([['Nome', 'Sexo'], ['Ana', 'F'], ['', 'F'], ['   ', 'M'], ['Bia', 'F']]))
    expect(previa.linhas.map((l) => l.nome)).toEqual(['Ana', 'Bia'])
    expect(previa.semNome).toEqual([3, 4])
  })
})

describe('CA-1928: a linha com "Data inválida"', () => {
  it('digitar uma data válida deixa a linha pronta e marcada', () => {
    const base = entrada()
    const corrigida = corrigir(base, 4, { data: '28/02/1994' })
    expect(corrigida.marcas[4]).toBe(true)
    const nova = linha(montarPrevia({ ...base, ...corrigida }).linhas, 4)
    expect(nova).toMatchObject({ motivo: 'Pronto', nascimento: '1994-02-28', marcada: true, corrigeData: true })
  })

  it('marcar sem corrigir: "Entra sem a data", e o paciente entra sem a data de nascimento', () => {
    const previa = montarPrevia(entrada(PLANILHA, { marcas: { 4: true } }))
    expect(linha(previa.linhas, 4).motivo).toBe('Entra sem a data')
    const camila = dadosDosPacientes(previa).find((p) => p.nome === 'Camila Rodrigues')
    expect(camila?.nascimento).toBeNull()
  })

  it('DP-IP-15: a correção é dia/mês mesmo numa coluna mês/dia; inválida desmarca; vazia é "sem data" e fica pronta', () => {
    const base = entrada([['Nome', 'Sexo', 'Nascimento'], ['Ana', 'F', '03/25/1990'], ['Bia', 'F', '13/13/1990']])
    const valida = corrigir(base, 3, { data: '05/04/1990' })
    expect(valida.marcas[3]).toBe(true)
    expect(linha(montarPrevia({ ...base, ...valida }).linhas, 3).nascimento).toBe('1990-04-05')
    const errada = corrigir({ ...base, ...valida }, 3, { data: '99/99/1990' })
    expect(errada.marcas[3]).toBe(false)
    expect(linha(montarPrevia({ ...base, ...errada }).linhas, 3).motivo).toBe('Data inválida')
    const vazia = corrigir(base, 3, { data: '' })
    expect(linha(montarPrevia({ ...base, ...vazia }).linhas, 3)).toMatchObject({ motivo: 'Pronto', marcada: true, nascimento: null })
  })
})

describe('CA-1929: a linha com "Sexo vazio" ou "Sexo não reconhecido"', () => {
  it('escolher F ou M deixa a linha pronta e marcada', () => {
    const base = entrada()
    const corrigida = corrigir(base, 5, { sexo: 'M' })
    expect(linha(montarPrevia({ ...base, ...corrigida }).linhas, 5)).toMatchObject({ motivo: 'Pronto', sexo: 'M', marcada: true, corrigeSexo: true })
  })

  it('marcar sem escolher: "Entra sem o sexo"', () => {
    expect(linha(montarPrevia(entrada(PLANILHA, { marcas: { 5: true } })).linhas, 5).motivo).toBe('Entra sem o sexo')
  })

  it('"Outro" é "Sexo não reconhecido"; os dois problemas aparecem juntos', () => {
    const base = entrada([['Nome', 'Sexo', 'Nascimento'], ['Ana', 'Outro', 'não sei']])
    expect(montarPrevia(base).linhas[0]?.motivo).toBe('Data inválida · Sexo não reconhecido')
    expect(montarPrevia({ ...base, marcas: { 2: true } }).linhas[0]?.motivo).toBe('Entra sem a data e sem o sexo')
  })

  it('corrigir só um dos dois problemas não marca a linha', () => {
    const base = entrada([['Nome', 'Sexo', 'Nascimento'], ['Ana', '', 'não sei']])
    const corrigida = corrigir(base, 2, { sexo: 'F' })
    expect(corrigida.marcas[2]).toBeUndefined()
    expect(montarPrevia({ ...base, ...corrigida }).linhas[0]?.motivo).toBe('Data inválida')
  })
})

describe('CA-1930: desmarcar uma linha pronta', () => {
  it('ela não entra e as contas mudam (DP-IP-12)', () => {
    const previa = montarPrevia(entrada(PLANILHA, { marcas: { 2: false } }))
    expect(linha(previa.linhas, 2).motivo).toBe('Desmarcada')
    expect(previa.prontos).toBe(4)
    expect(previa.comProblema).toBe(4)
    expect(previa.marcadas).toHaveLength(4)
  })

  it('a linha com problema marcada entra nos prontos', () => {
    const previa = montarPrevia(entrada(PLANILHA, { marcas: { 4: true } }))
    expect(previa.prontos).toBe(6)
    expect(previa.comProblema).toBe(3)
  })
})

describe('CA-1931: mais de 50 linhas', () => {
  it('as que começaram com problema vêm primeiro, na ordem da planilha (DP-IP-13)', () => {
    const linhas = [['Nome', 'Sexo'], ...Array.from({ length: 60 }, (_, i) => [`Paciente ${i}`, i % 20 === 5 ? '' : 'F'])]
    const previa = montarPrevia(entrada(linhas))
    expect(previa.linhas.slice(0, 3).map((l) => l.numero)).toEqual([7, 27, 47])
    expect(previa.linhas[3]?.numero).toBe(2)
  })

  it('corrigir uma linha não a tira do lugar', () => {
    const linhas = [['Nome', 'Sexo'], ...Array.from({ length: 60 }, (_, i) => [`Paciente ${i}`, i === 30 ? '' : 'F'])]
    const base = entrada(linhas)
    expect(montarPrevia(base).linhas[0]?.numero).toBe(32)
    expect(montarPrevia({ ...base, ...corrigir(base, 32, { sexo: 'F' }) }).linhas[0]?.numero).toBe(32)
  })

  it('até 50, a ordem é a da planilha', () => {
    expect(montarPrevia(entrada()).linhas.map((l) => l.numero)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10])
  })
})

describe('CA-1932: voltar a Colunas e à prévia mantém mapeamento, correções e marcas', () => {
  it('a prévia é refeita do mesmo estado: as correções e as marcas, guardadas pelo número da linha, continuam', () => {
    const base = entrada()
    const estado = { ...base, ...corrigir(base, 4, { data: '28/02/1994' }), marcas: { ...corrigir(base, 4, { data: '28/02/1994' }).marcas, 2: false } }
    const primeira = montarPrevia(estado)
    const segunda = montarPrevia({ ...estado })
    expect(segunda).toEqual(primeira)
    expect(linha(segunda.linhas, 4).motivo).toBe('Pronto')
    expect(linha(segunda.linhas, 2).motivo).toBe('Desmarcada')
  })
})

describe('CB-901: o mesmo arquivo importado duas vezes', () => {
  it('todas as linhas viram "Já está na conta" e não há o que importar', () => {
    const contaComTodos = PLANILHA.slice(1).map((l) => ({ nome: l[0] ?? '', nascimento: null }))
    const previa = montarPrevia(entrada(PLANILHA, { pacientes: contaComTodos }))
    expect(previa.linhas.filter((l) => l.motivo !== 'Já está na conta').map((l) => l.motivo)).toEqual(['Igual à linha 3'])
    expect(previa.prontos).toBe(0)
    expect(previa.todasNaConta).toBe(true)
  })
})

describe('DP-IP-14: "Marcar todas"', () => {
  it('marca as que podem ser marcadas; desmarcar todas desmarca', () => {
    const base = entrada()
    const todas = marcarTodas(montarPrevia(base), base.marcas, true)
    const previa = montarPrevia({ ...base, marcas: todas })
    expect(previa.prontos).toBe(7)
    expect(linha(previa.linhas, 8).marcada).toBe(false)
    expect(montarPrevia({ ...base, marcas: marcarTodas(previa, todas, false) }).prontos).toBe(0)
  })
})

describe('O que entra de cada linha', () => {
  it('CA-1938: colunas em "Não importar" (CPF, peso) não aparecem em lugar nenhum, nem em Observações', () => {
    const dados = dadosDosPacientes(montarPrevia(entrada()))
    const tudo = JSON.stringify(dados)
    expect(tudo).not.toContain('123.456.789-00')
    expect(tudo).not.toContain('68,4')
    expect(dados[0]).toEqual({
      nome: 'Juliana Ferreira Souza',
      sexo: 'F',
      nascimento: '1991-03-14',
      telefone: '(11) 98765-4321',
      email: 'juliana.souza@email.com',
      objetivo: 'Reeducação alimentar',
      observacoes: 'Observações: Intolerância à lactose',
    })
  })

  it('CA-1939: várias colunas em Observações viram uma linha por coluna, na ordem da planilha, sem as vazias', () => {
    const base = entrada([['Nome', 'Alergias', 'Convênio', 'Notas'], ['Ana', 'lactose', '', 'Mora só']])
    const previa = montarPrevia({ ...base, destinos: ['nome', 'observacoes', 'observacoes', 'observacoes'] })
    expect(previa.linhas[0]?.observacoes).toBe('Alergias: lactose\nNotas: Mora só')
  })

  it('CB-920: objetivo com mais de 500 caracteres entra inteiro', () => {
    const longo = 'Perder peso com saúde. '.repeat(40)
    const previa = montarPrevia(entrada([['Nome', 'Sexo', 'Objetivo'], ['Ana', 'F', longo]]))
    expect(dadosDosPacientes(previa)[0]?.objetivo).toBe(longo.trim())
  })

  it('CA-1921 na prévia: o nome em maiúsculas vira nome próprio', () => {
    expect(montarPrevia(entrada([['Nome', 'Sexo'], ['JULIANA FERREIRA DE SOUZA', 'F']])).linhas[0]?.nome).toBe('Juliana Ferreira de Souza')
  })

  it('CA-1907 na prévia: a data do Excel (já lida como dia) e o texto "14/03/1991" viram o mesmo dia', () => {
    const previa = montarPrevia(entrada([['Nome', 'Sexo', 'Nascimento'], ['Ana', 'F', '1991-03-14'], ['Bia', 'F', '14/03/1991']]))
    expect(previa.linhas.map((l) => l.nascimento)).toEqual(['1991-03-14', '1991-03-14'])
  })
})
