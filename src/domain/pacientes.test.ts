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
