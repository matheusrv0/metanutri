import { CHAVE_MUDANCAS, lerMudancas, registrarMudanca } from './copiaDaConta.ts'
import { criarPacienteVazio, criarRepositorioPacientes } from './pacientes.ts'
import type { Armazenamento } from './persistencia.ts'

class Memoria implements Armazenamento {
  readonly dados = new Map<string, string>()
  getItem(k: string) {
    return this.dados.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.dados.set(k, v)
  }
  removeItem(k: string) {
    this.dados.delete(k)
  }
}

const relogio = () => {
  let ms = Date.UTC(2026, 9, 14, 12, 0, 0)
  return () => new Date((ms += 60_000)).toISOString()
}

describe('ficha do paciente com anamnese, suplementos e exames (spec anamnese-e-prescricoes)', () => {
  it('CA-585: paciente novo nasce sem respostas, sem suplementos e sem exame marcado', () => {
    const vazio = criarPacienteVazio('p1', '2026-10-14T12:00:00.000Z')
    expect(vazio.respostasAnamnese).toEqual([])
    expect(vazio.suplementos).toEqual([])
    expect(vazio.pedidoExames).toEqual({ marcados: [], outros: '' })
  })

  it('CA-588: ficha gravada antes desta mudança abre com os campos novos vazios e o resto igual', () => {
    const arm = new Memoria()
    arm.setItem(
      'metanutri:pacientes',
      JSON.stringify([{ id: 'p1', nome: 'Ana', anamnese: 'Dorme tarde', criadoEm: '2026-09-01T00:00:00.000Z', atualizadoEm: '2026-09-02T00:00:00.000Z' }]),
    )
    const ana = criarRepositorioPacientes(arm).obter('p1')
    expect(ana).toMatchObject({ nome: 'Ana', anamnese: 'Dorme tarde', respostasAnamnese: [], suplementos: [], pedidoExames: { marcados: [], outros: '' } })
  })

  it('CA-588: campo novo estragado vira vazio sem apagar o resto da ficha', () => {
    const arm = new Memoria()
    arm.setItem(
      'metanutri:pacientes',
      JSON.stringify([
        {
          id: 'p1',
          nome: 'Ana',
          restricoes: 'leite',
          respostasAnamnese: 'lixo',
          suplementos: { id: 's1' },
          pedidoExames: [1, 2],
          criadoEm: '2026-09-01T00:00:00.000Z',
          atualizadoEm: '2026-09-02T00:00:00.000Z',
        },
      ]),
    )
    const ana = criarRepositorioPacientes(arm).obter('p1')
    expect(ana).toMatchObject({ nome: 'Ana', restricoes: 'leite', respostasAnamnese: [], suplementos: [], pedidoExames: { marcados: [], outros: '' } })
  })

  it('CA-589: o que esta versão não conhece passa por ler e salvar a ficha sem sumir', () => {
    const arm = new Memoria()
    const desconhecidos = {
      respostasAnamnese: [{ perguntaId: 'semanas', blocoId: 'gestacao', pergunta: 'Semanas', resposta: '20' }],
      suplementos: [{ id: 's1', nome: 'Ferro', dose: '', horario: '', duracao: '', observacao: '', marca: 'Exemplo' }],
      pedidoExames: { marcados: ['exame-novo', 'tsh'], outros: '' },
    }
    arm.setItem('metanutri:pacientes', JSON.stringify([{ id: 'p1', nome: 'Ana', criadoEm: '2026-09-01T00:00:00.000Z', atualizadoEm: '2026-09-02T00:00:00.000Z', ...desconhecidos }]))
    const repo = criarRepositorioPacientes(arm, { agora: relogio() })
    const ana = repo.obter('p1')
    if (!ana) throw new Error('ficha não lida')
    repo.salvar({ ...ana, nome: 'Ana Souza' })
    const [guardada] = JSON.parse(arm.getItem('metanutri:pacientes') ?? '[]') as Record<string, unknown>[]
    expect(guardada).toMatchObject({ nome: 'Ana Souza', ...desconhecidos })
  })

  it('CB-167: apagar o paciente leva junto os suplementos e o pedido de exames', () => {
    const arm = new Memoria()
    const repo = criarRepositorioPacientes(arm, { agora: relogio(), gerarId: () => 'p1' })
    repo.salvar({ ...repo.criar('Ana'), suplementos: [{ id: 's1', nome: 'Ferro', dose: '', horario: '', duracao: '', observacao: '' }], pedidoExames: { marcados: ['tsh'], outros: '' } })
    repo.excluir('p1')
    expect(arm.getItem('metanutri:pacientes')).toBe('[]')
  })

  it('CA-561: salvar a ficha com uma resposta, um suplemento e um exame troca a data de alteração (vai para a nuvem)', () => {
    const arm = new Memoria()
    const repo = criarRepositorioPacientes(arm, { agora: relogio(), gerarId: () => 'p1' })
    const criado = repo.criar('Ana')
    const salvo = repo.salvar({
      ...criado,
      respostasAnamnese: [{ perguntaId: 'queixa', blocoId: 'objetivo', pergunta: 'Queixa principal', resposta: 'Cansaço' }],
      suplementos: [{ id: 's1', nome: 'Ferro', dose: '', horario: '', duracao: '', observacao: '' }],
      pedidoExames: { marcados: ['ferritina'], outros: '' },
    })
    expect(salvo.atualizadoEm > criado.atualizadoEm).toBe(true)
    const lido = repo.obter('p1')
    expect(lido?.respostasAnamnese).toHaveLength(1)
    expect(lido?.suplementos.map((s) => s.nome)).toEqual(['Ferro'])
    expect(lido?.pedidoExames.marcados).toEqual(['ferritina'])
  })
})

describe('D-171: salvar um paciente não mexe nos outros (spec dados-na-nuvem)', () => {
  /** O armazenamento como a conta o vê: cada gravação deixa as marcas de mudança (spec dados-na-nuvem, DP-2). */
  const observado = (arm: Memoria, agora: () => string): Armazenamento => ({
    getItem: (k) => arm.getItem(k),
    setItem: (k, v) => {
      const antes = arm.getItem(k)
      arm.setItem(k, v)
      registrarMudanca(arm, k, antes, v, agora())
    },
    removeItem: (k) => {
      const antes = arm.getItem(k)
      arm.removeItem(k)
      registrarMudanca(arm, k, antes, null, agora())
    },
  })
  /** Ficha guardada por uma versão de antes das novidades: sem consulta, anamnese, suplementos nem exames. */
  const fichaAntiga = (id: string, nome: string) => ({
    id,
    nome,
    sexo: null,
    nascimento: null,
    telefone: '',
    email: '',
    objetivo: '',
    restricoes: '',
    condicoesClinicas: '',
    medicamentos: '',
    anamnese: '',
    observacoes: '',
    criadoEm: '2026-10-01T00:00:00.000Z',
    atualizadoEm: '2026-10-10T00:00:00.000Z',
  })

  it('CA-593: salvar, criar e apagar um paciente só marca ele; o outro fica exatamente como estava guardado', () => {
    const arm = new Memoria()
    arm.setItem('metanutri:pacientes', JSON.stringify([fichaAntiga('ana', 'Ana'), { ...fichaAntiga('bia', 'Bia'), campoDoFuturo: { x: 1 } }]))
    const guardada = (id: string) => JSON.stringify((JSON.parse(arm.getItem('metanutri:pacientes') ?? '[]') as { id: string }[]).find((p) => p.id === id))
    const anaAntes = guardada('ana')
    const agora = relogio()
    const repo = criarRepositorioPacientes(observado(arm, agora), { agora, gerarId: () => 'caio' })

    const bia = repo.obter('bia')
    if (!bia) throw new Error('Bia sumiu')
    repo.salvar({ ...bia, objetivo: 'Ganhar massa' })
    expect(Object.keys(lerMudancas(arm.getItem(CHAVE_MUDANCAS)).alterados)).toEqual(['pacientes/bia'])
    expect(guardada('ana')).toBe(anaAntes)
    expect(JSON.parse(guardada('bia'))).toMatchObject({ objetivo: 'Ganhar massa', campoDoFuturo: { x: 1 } })

    repo.criar('Caio')
    repo.excluir('bia')
    expect(lerMudancas(arm.getItem(CHAVE_MUDANCAS))).toEqual({ alterados: { 'pacientes/caio': expect.any(String) }, excluidos: { 'pacientes/bia': expect.any(String) } })
    expect(guardada('ana')).toBe(anaAntes)
    // A tela continua lendo a ficha completa.
    expect(repo.obter('ana')).toMatchObject({ proximaConsulta: null, respostasAnamnese: [], suplementos: [] })
  })
})
describe('CA-598: uma aba da versão de antes salva uma ficha sem remarcar as outras (spec dados-na-nuvem, DP-34)', () => {
  /** A ficha vazia da versão de antes das novidades, na ordem dela. */
  const vaziaDeAntes = (id: string, agora: string) => ({
    id,
    nome: '',
    sexo: null,
    nascimento: null,
    telefone: '',
    email: '',
    objetivo: '',
    restricoes: '',
    condicoesClinicas: '',
    medicamentos: '',
    anamnese: '',
    observacoes: '',
    criadoEm: agora,
    atualizadoEm: agora,
  })

  it('a leitura de antes devolve o mesmo texto, e salvar só a Bia marca só a Bia', () => {
    const arm = new Memoria()
    const agora = relogio()
    const repo = criarRepositorioPacientes(arm, { agora, gerarId: (() => {
      const ids = ['ana', 'bia']
      return () => ids.shift() ?? 'x'
    })() })
    const ana = repo.criar('Ana')
    repo.criar('Bia')
    repo.salvar({ ...ana, restricoes: 'lactose', proximaConsulta: '2026-10-20T10:00', suplementos: [{ id: 's1', nome: 'Ferro', dose: '', horario: '', duracao: '', observacao: '' }] })

    const guardadas = JSON.parse(arm.getItem('metanutri:pacientes') ?? '[]') as { id: string; criadoEm: string }[]
    for (const ficha of guardadas) expect(JSON.stringify({ ...vaziaDeAntes(ficha.id, ficha.criadoEm), ...ficha })).toBe(JSON.stringify(ficha))

    // A aba antiga relê tudo daquele jeito, troca a Bia e grava a lista inteira.
    const lidasDeAntes = guardadas.map((ficha) => ({ ...vaziaDeAntes(ficha.id, ficha.criadoEm), ...ficha }))
    const antes = arm.getItem('metanutri:pacientes')
    const depois = JSON.stringify(lidasDeAntes.map((ficha) => (ficha.id === 'bia' ? { ...ficha, objetivo: 'Ganhar massa', atualizadoEm: '2026-10-16T10:05:00.000Z' } : ficha)))
    const marcas = new Memoria()
    registrarMudanca(marcas, 'metanutri:pacientes', antes, depois, '2026-10-16T10:05:00.000Z')
    expect(lerMudancas(marcas.getItem(CHAVE_MUDANCAS)).alterados).toEqual({ 'pacientes/bia': '2026-10-16T10:05:00.000Z' })
  })
})