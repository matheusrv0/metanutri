// O link fixo por paciente (spec lado-do-paciente, D-1214 a D-1217; PLAN DP-LP-4 e DP-LP-5).
import { describe, expect, it } from 'vitest'
import { criarAcompanhamento, type Acompanhamento } from './acompanhamento.ts'
import { copiarDieta, type DietaDoPlano } from './dietaDoLink.ts'
import { atualizarComPlano, linkDoPaciente, linksVigentes, migrarParaLinkFixo, precisaAtualizarComPlano, contarPacientesComLink } from './linkFixo.ts'
import type { Missao } from './missoes.ts'

const MISSOES: readonly Missao[] = [
  { id: 'refeicao-1', texto: 'Café da manhã por volta das 7h', origem: 'Refeição do plano' },
  { id: 'agua', texto: 'Beber água ao longo do dia', origem: 'Hábito que acompanha o plano' },
]
const NOVAS: readonly Missao[] = [
  { id: 'refeicao-1', texto: 'Café da manhã por volta das 7h30', origem: 'Refeição do plano' },
  { id: 'frutas', texto: 'Comer a fruta do plano', origem: 'Frutas que estão no plano' },
]
const DIETA: DietaDoPlano = { refeicoes: [{ horario: '07:00', nome: 'Café da manhã', opcoes: [[{ medida: null, gramas: 50, alimento: 'Pão francês' }]] }], orientacoes: '', receitas: '' }

let n = 0
function link(dados: Partial<Acompanhamento> & { readonly criadoEm: string }): Acompanhamento {
  n += 1
  const base = criarAcompanhamento(
    { casoId: `caso-${n}`, pacienteId: 'pac-1', nome: 'Juliana', missoes: MISSOES },
    { agora: () => dados.criadoEm, gerarId: () => `ac-${n}`, aleatorio: (t) => new Uint8Array(t).fill(n) },
  )
  return { ...base, ...dados }
}

describe('CA-2225: a migração do link por plano para o link fixo por paciente', () => {
  it('CA-2225: com dois links do mesmo paciente, o mais recente fica e o antigo aponta para ele', () => {
    const antigo = link({ criadoEm: '2026-09-01T10:00:00.000Z', marcacoes: [{ dia: '2026-09-02', feitas: ['agua'] }] })
    const recente = link({ criadoEm: '2026-10-20T10:00:00.000Z' })
    const mudados = migrarParaLinkFixo([antigo, recente], [])
    expect(mudados).toEqual([{ ...antigo, substituidoPor: recente.id }])
    // As marcações do antigo continuam guardadas nele.
    expect(mudados[0]?.marcacoes).toEqual([{ dia: '2026-09-02', feitas: ['agua'] }])
  })

  it('CA-2225: depois da migração, a lista mostra um paciente só e o limite conta 1', () => {
    const antigo = link({ criadoEm: '2026-09-01T10:00:00.000Z' })
    const recente = link({ criadoEm: '2026-10-20T10:00:00.000Z' })
    const todos = [antigo, recente].map((l) => migrarParaLinkFixo([antigo, recente], []).find((m) => m.id === l.id) ?? l)
    expect(linksVigentes(todos).map((l) => l.id)).toEqual([recente.id])
    expect(contarPacientesComLink(todos)).toBe(1)
  })

  it('CA-2225: o paciente do link é o do plano primeiro (D-147)', () => {
    const semFicha = link({ criadoEm: '2026-09-01T10:00:00.000Z', pacienteId: null, casoId: 'plano-a' })
    const comFicha = link({ criadoEm: '2026-10-01T10:00:00.000Z', pacienteId: 'pac-1' })
    expect(migrarParaLinkFixo([semFicha, comFicha], [{ id: 'plano-a', pacienteId: 'pac-1' }])).toEqual([{ ...semFicha, substituidoPor: comFicha.id }])
  })

  it('D-1217: link sem paciente continua como está, e o que já foi migrado não muda de novo', () => {
    const solto = link({ criadoEm: '2026-09-01T10:00:00.000Z', pacienteId: null })
    const recente = link({ criadoEm: '2026-10-20T10:00:00.000Z' })
    const jaMigrado = link({ criadoEm: '2026-08-01T10:00:00.000Z', substituidoPor: recente.id })
    expect(migrarParaLinkFixo([solto, recente, jaMigrado], [])).toEqual([])
  })

  it('D-1217: três links do mesmo paciente: os dois antigos apontam para o mais recente', () => {
    const a = link({ criadoEm: '2026-08-01T10:00:00.000Z' })
    const b = link({ criadoEm: '2026-09-01T10:00:00.000Z' })
    const c = link({ criadoEm: '2026-10-01T10:00:00.000Z' })
    expect(migrarParaLinkFixo([b, c, a], []).map((l) => [l.id, l.substituidoPor])).toEqual([
      [b.id, c.id],
      [a.id, c.id],
    ])
  })
})

describe('o link do paciente', () => {
  it('D-1214: o link do paciente é o vigente dele, nunca um substituído', () => {
    const antigo = link({ criadoEm: '2026-09-01T10:00:00.000Z', substituidoPor: 'ac-x' })
    const fixo = link({ criadoEm: '2026-08-01T10:00:00.000Z' })
    expect(linkDoPaciente([antigo, fixo], 'pac-1', [])?.id).toBe(fixo.id)
    expect(linkDoPaciente([antigo, fixo], 'pac-2', [])).toBeNull()
  })

  it('CB-1224: o limite conta pacientes com link; link sem paciente conta sozinho', () => {
    const l1 = link({ criadoEm: '2026-09-01T10:00:00.000Z', pacienteId: 'pac-1' })
    const l2 = link({ criadoEm: '2026-09-02T10:00:00.000Z', pacienteId: 'pac-2' })
    const solto = link({ criadoEm: '2026-09-03T10:00:00.000Z', pacienteId: null })
    expect(contarPacientesComLink([l1, l2, solto])).toBe(3)
  })
})

describe('CA-2222: atualizar o link com o plano novo', () => {
  it('CA-2222: troca o plano, as missões e a dieta, e mantém o endereço e as marcações', () => {
    const fixo = link({
      criadoEm: '2026-09-01T10:00:00.000Z',
      marcacoes: [{ dia: '2026-10-30', feitas: ['refeicao-1', 'agua'] }],
      dieta: copiarDieta({ ...DIETA, orientacoes: 'antiga' }, '2026-09-01'),
    })
    const novo = atualizarComPlano(fixo, { casoId: 'plano-novo', pacienteId: 'pac-1', nome: 'Juliana', missoes: NOVAS, dieta: DIETA }, '2026-11-03')
    expect(novo.token).toBe(fixo.token)
    expect(novo.id).toBe(fixo.id)
    expect(novo.marcacoes).toEqual(fixo.marcacoes)
    expect(novo.casoId).toBe('plano-novo')
    expect(novo.missoes).toEqual(NOVAS)
    expect(novo.dieta).toEqual(copiarDieta(DIETA, '2026-11-03'))
  })

  it('CA-2222: o link sem a dieta continua sem a dieta', () => {
    const fixo = link({ criadoEm: '2026-09-01T10:00:00.000Z', dieta: null })
    expect(atualizarComPlano(fixo, { casoId: 'p2', pacienteId: 'pac-1', nome: 'Juliana', missoes: NOVAS, dieta: DIETA }, '2026-11-03').dieta).toBeNull()
  })

  it('CA-2222: o plano que já está no link não pede atualização; outro plano do paciente pede', () => {
    const fixo = link({ criadoEm: '2026-09-01T10:00:00.000Z', casoId: 'plano-a' })
    expect(precisaAtualizarComPlano(fixo, 'plano-a')).toBe(false)
    expect(precisaAtualizarComPlano(fixo, 'plano-b')).toBe(true)
  })
})
