import type { Armazenamento } from './persistencia.ts'
import {
  CHAVE_MODELOS_SUPLEMENTO,
  criarRepositorioModelosSuplemento,
  criarSuplemento,
  descreverSuplemento,
  normalizarSuplementos,
  suplementoDoModelo,
  suplementosParaDocumento,
  type Suplemento,
} from './suplementos.ts'

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

class Cheia extends Memoria {
  override setItem(): void {
    throw new Error('QuotaExceededError')
  }
}

const relogio = () => {
  let ms = Date.UTC(2026, 9, 14, 12, 0, 0)
  return () => new Date((ms += 60_000)).toISOString()
}

const ids = () => {
  let n = 0
  return () => `m${++n}`
}

const vitD: Suplemento = { id: 's1', nome: 'Vitamina D3', dose: '1 cápsula de 2.000 UI', horario: 'No almoço', duracao: '3 meses', observacao: 'Com uma refeição' }

describe('suplemento do paciente (CA-571, CA-578, CA-588)', () => {
  it('nasce vazio, com o id dado', () => {
    expect(criarSuplemento('a')).toEqual({ id: 'a', nome: '', dose: '', horario: '', duracao: '', observacao: '' })
  })

  it('CA-588: o que não é lista vira vazio; item sem id sai; campo estragado vira texto vazio; id repetido fica uma vez', () => {
    expect(normalizarSuplementos(null)).toEqual([])
    expect(normalizarSuplementos({ id: 's1' })).toEqual([])
    expect(normalizarSuplementos([vitD, { ...vitD, nome: 'outro' }, { nome: 'sem id' }, 'lixo', { id: 's2', nome: 7, dose: 'x' }])).toEqual([
      vitD,
      { id: 's2', nome: '', dose: 'x', horario: '', duracao: '', observacao: '' },
    ])
  })

  it('CA-578: suplemento sem nome não sai em documento', () => {
    expect(suplementosParaDocumento([vitD, { ...criarSuplemento('s2'), dose: '1 cápsula' }, { ...criarSuplemento('s3'), nome: '   ' }])).toEqual([vitD])
  })

  it('CA-576: a linha de baixo diz só o que foi preenchido', () => {
    expect(descreverSuplemento(vitD)).toBe('Dose: 1 cápsula de 2.000 UI · Horário: No almoço · Por quanto tempo: 3 meses')
    expect(descreverSuplemento({ ...vitD, dose: ' ', horario: '' })).toBe('Por quanto tempo: 3 meses')
    expect(descreverSuplemento(criarSuplemento('x'))).toBe('')
  })
})

describe('modelos de suplemento (D-166, CA-573, CA-574)', () => {
  it('salvar um suplemento cria o modelo com as datas; sem nome, não salva', () => {
    const arm = new Memoria()
    const repo = criarRepositorioModelosSuplemento(arm, { agora: relogio(), gerarId: ids() })
    const modelo = repo.salvarDe(vitD)
    expect(modelo).toEqual({
      id: 'm1',
      nome: 'Vitamina D3',
      dose: '1 cápsula de 2.000 UI',
      horario: 'No almoço',
      duracao: '3 meses',
      observacao: 'Com uma refeição',
      criadoEm: '2026-10-14T12:01:00.000Z',
      atualizadoEm: '2026-10-14T12:01:00.000Z',
    })
    expect(repo.salvarDe({ ...vitD, nome: '  ' })).toBeNull()
    expect(JSON.parse(arm.getItem(CHAVE_MODELOS_SUPLEMENTO) ?? '[]')).toHaveLength(1)
  })

  it('CA-573: o mesmo nome, sem diferenciar maiúscula e acento, troca o modelo e mantém o id', () => {
    const arm = new Memoria()
    const repo = criarRepositorioModelosSuplemento(arm, { agora: relogio(), gerarId: ids() })
    repo.salvarDe({ ...vitD, nome: 'Ômega 3' })
    const trocado = repo.salvarDe({ ...vitD, nome: ' omega 3 ', dose: '2 cápsulas' })
    expect(repo.listar()).toHaveLength(1)
    expect(trocado).toMatchObject({ id: 'm1', nome: 'omega 3', dose: '2 cápsulas', criadoEm: '2026-10-14T12:01:00.000Z', atualizadoEm: '2026-10-14T12:02:00.000Z' })
  })

  it('CA-574: lista em ordem de nome e apaga', () => {
    const repo = criarRepositorioModelosSuplemento(new Memoria(), { agora: relogio(), gerarId: ids() })
    repo.salvarDe({ ...vitD, nome: 'Zinco' })
    repo.salvarDe({ ...vitD, nome: 'Ácido fólico' })
    repo.salvarDe({ ...vitD, nome: 'Magnésio' })
    expect(repo.listar().map((m) => m.nome)).toEqual(['Ácido fólico', 'Magnésio', 'Zinco'])
    repo.excluir('m3')
    expect(repo.listar().map((m) => m.nome)).toEqual(['Ácido fólico', 'Zinco'])
  })

  it('usar o modelo dá uma cópia com id novo (CB-165)', () => {
    const repo = criarRepositorioModelosSuplemento(new Memoria(), { agora: relogio(), gerarId: ids() })
    const modelo = repo.salvarDe(vitD)
    if (!modelo) throw new Error('modelo não salvo')
    expect(suplementoDoModelo(modelo, 'novo')).toEqual({ ...vitD, id: 'novo' })
  })

  it('dado estragado: lista vazia; item ruim sai', () => {
    const arm = new Memoria()
    arm.setItem(CHAVE_MODELOS_SUPLEMENTO, '{não é json')
    expect(criarRepositorioModelosSuplemento(arm).listar()).toEqual([])
    arm.setItem(CHAVE_MODELOS_SUPLEMENTO, JSON.stringify([{ id: 'a', nome: 'Ferro', criadoEm: 'x', atualizadoEm: 'x' }, { nome: 'sem id' }, 3]))
    expect(criarRepositorioModelosSuplemento(arm).listar()).toEqual([{ id: 'a', nome: 'Ferro', dose: '', horario: '', duracao: '', observacao: '', criadoEm: 'x', atualizadoEm: 'x' }])
  })

  it('CB-160: sem armazenamento, ou cheio, os modelos valem só na sessão', () => {
    const semArm = criarRepositorioModelosSuplemento(null, { agora: relogio(), gerarId: ids() })
    semArm.salvarDe(vitD)
    expect(semArm.listar()).toHaveLength(1)
    expect(semArm.persistente).toBe(false)
    const cheio = criarRepositorioModelosSuplemento(new Cheia(), { agora: relogio(), gerarId: ids() })
    cheio.salvarDe(vitD)
    expect(cheio.persistente).toBe(false)
    expect(cheio.listar()).toHaveLength(1)
  })
})
