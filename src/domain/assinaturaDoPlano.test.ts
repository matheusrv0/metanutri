import {
  assinaturaDoPlano,
  camposDeEstagioIniciais,
  mostraCamposDeEstagio,
  mostraReceitas,
  nutricionistaDoWord,
  type AssinaturaDoPlano,
} from './assinaturaDoPlano.ts'
import { criarCasoVazio } from './caso.ts'
import { PERFIL_VAZIO, type Perfil } from './perfil.ts'
import type { PerfilConta } from './situacao.ts'
import type { Caso } from './tipos.ts'

const ANA: PerfilConta = {
  nome: 'Ana Souza',
  situacao: 'nutricionista',
  crn: { regiao: 6, numero: '12345' },
  statusCrn: 'em_conferencia',
  crnDeclaradoEm: '2026-10-01T12:00:00.000Z',
  crnDecididoEm: null,
}
const JULIA: PerfilConta = { nome: 'Júlia Martins', situacao: 'estudante', crn: null, statusCrn: null, crnDeclaradoEm: null, crnDecididoEm: null }
const local = (p: Partial<Perfil> = {}): Perfil => ({ ...PERFIL_VAZIO, ...p })
const caso = (p: Partial<Caso> = {}): Caso => ({ ...criarCasoVazio('c1'), ...p })

describe('assinaturaDoPlano (D-37)', () => {
  it('conta de nutricionista: nome e CRN do cadastro', () => {
    expect(assinaturaDoPlano({ servidor: true, perfilConta: ANA, nomeDaSessao: 'Ana', perfilLocal: local() })).toEqual({
      situacao: 'nutricionista',
      linhaNutricionista: 'Ana Souza · CRN-6 12345',
      origem: 'conta',
      nome: 'Ana Souza',
      responsavelTecnico: '',
    })
  })

  it('conta sem nome no perfil usa o nome da sessão', () => {
    const r = assinaturaDoPlano({ servidor: true, perfilConta: { ...ANA, nome: '' }, nomeDaSessao: 'Ana S.', perfilLocal: local() })
    expect(r.linhaNutricionista).toBe('Ana S. · CRN-6 12345')
  })

  it('conta de estudante: o preceptor vem do responsável técnico de Quem assina', () => {
    const r = assinaturaDoPlano({ servidor: true, perfilConta: JULIA, nomeDaSessao: 'Júlia', perfilLocal: local({ responsavel: ' Carla Mendes ' }) })
    expect(r).toEqual({ situacao: 'estudante', linhaNutricionista: null, origem: 'conta', nome: 'Júlia Martins', responsavelTecnico: 'Carla Mendes' })
  })

  it('CB-69: conta sem perfil (administrador) fica sem situação', () => {
    const r = assinaturaDoPlano({ servidor: true, perfilConta: null, nomeDaSessao: 'Admin', perfilLocal: local({ tipo: 'profissional' }) })
    expect(r.situacao).toBeNull()
    expect(r.linhaNutricionista).toBeNull()
  })

  it('CB-54: sem servidor, a situação vem de Configurações', () => {
    const r = assinaturaDoPlano({ servidor: false, perfilConta: null, nomeDaSessao: '', perfilLocal: local({ tipo: 'profissional', nome: 'Ana Souza', crn: 'CRN-6 12345' }) })
    expect(r).toEqual({ situacao: 'nutricionista', linhaNutricionista: 'Ana Souza · CRN-6 12345', origem: 'aparelho', nome: 'Ana Souza', responsavelTecnico: '' })
    expect(assinaturaDoPlano({ servidor: false, perfilConta: null, nomeDaSessao: '', perfilLocal: local({ tipo: 'profissional' }) }).linhaNutricionista).toBeNull()
    expect(assinaturaDoPlano({ servidor: false, perfilConta: null, nomeDaSessao: '', perfilLocal: local() }).situacao).toBe('estudante')
  })
})

describe('o que a situação muda no plano', () => {
  it('CA-251, CB-51 e CB-69: campos de estágio', () => {
    expect(mostraCamposDeEstagio('nutricionista', caso())).toBe(false)
    expect(mostraCamposDeEstagio('nutricionista', caso({ preceptor: 'Carla' }))).toBe(true)
    expect(mostraCamposDeEstagio('estudante', caso())).toBe(true)
    expect(mostraCamposDeEstagio(null, caso())).toBe(true)
  })

  it('CA-234, CA-236 e CB-50: receitas', () => {
    expect(mostraReceitas('nutricionista', caso())).toBe(false)
    expect(mostraReceitas('nutricionista', caso({ receitas: '   ' }))).toBe(false)
    expect(mostraReceitas('nutricionista', caso({ receitas: 'Cuscuz com ovo.' }))).toBe(true)
    expect(mostraReceitas('estudante', caso())).toBe(true)
    expect(mostraReceitas(null, caso())).toBe(true)
  })

  it('CA-252 e CB-51: linha da nutricionista no Word', () => {
    const ana: AssinaturaDoPlano = { situacao: 'nutricionista', linhaNutricionista: 'Ana Souza · CRN-6 12345', origem: 'conta', nome: 'Ana Souza', responsavelTecnico: '' }
    expect(nutricionistaDoWord(ana, caso())).toBe('Ana Souza · CRN-6 12345')
    expect(nutricionistaDoWord(ana, caso({ estagiario: 'Júlia' }))).toBeNull()
    expect(nutricionistaDoWord({ ...ana, linhaNutricionista: null }, caso())).toBe('')
    expect(nutricionistaDoWord({ ...ana, situacao: 'estudante' }, caso())).toBeNull()
    expect(nutricionistaDoWord(null, caso())).toBeNull()
  })

  it('CA-253: plano novo de estudante nasce com estagiário e preceptor', () => {
    const julia: AssinaturaDoPlano = { situacao: 'estudante', linhaNutricionista: null, origem: 'conta', nome: 'Júlia Martins', responsavelTecnico: 'Carla Mendes' }
    expect(camposDeEstagioIniciais(julia)).toEqual({ estagiario: 'Júlia Martins', preceptor: 'Carla Mendes' })
    expect(camposDeEstagioIniciais({ ...julia, situacao: 'nutricionista' })).toEqual({ estagiario: '', preceptor: '' })
    expect(camposDeEstagioIniciais({ ...julia, situacao: null })).toEqual({ estagiario: '', preceptor: '' })
  })
})
