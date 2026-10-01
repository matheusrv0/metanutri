import type { AssinaturaDoPlano } from './assinaturaDoPlano.ts'
import { criarCasoVazio } from './caso.ts'
import {
  assinaturaDaFolha,
  gravarOpcoesImpressao,
  lembretesDoDia,
  lerOpcoesImpressao,
  linhaFinaDaFolha,
  OPCOES_IMPRESSAO_PADRAO,
} from './folhaDieta.ts'
import type { Missao } from './missoes.ts'
import { CHAVES_DE_DADOS } from './perfil.ts'
import type { Armazenamento } from './persistencia.ts'
import type { Caso } from './tipos.ts'

const ANA: AssinaturaDoPlano = { situacao: 'nutricionista', linhaNutricionista: 'Ana Souza · CRN-6 12345', origem: 'conta', nome: 'Ana Souza', responsavelTecnico: '' }
const JULIA: AssinaturaDoPlano = { situacao: 'estudante', linhaNutricionista: null, origem: 'conta', nome: 'Júlia Martins', responsavelTecnico: 'Carla Mendes' }
const caso = (p: Partial<Caso> = {}): Caso => ({ ...criarCasoVazio('c1'), nome: 'Maria, 28 anos', ...p })

function memoria(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial))
  const arm: Armazenamento = {
    getItem: (c) => dados.get(c) ?? null,
    setItem: (c, v) => {
      dados.set(c, v)
    },
    removeItem: (c) => {
      dados.delete(c)
    },
  }
  return arm
}

describe('assinaturaDaFolha (CA-313)', () => {
  it('nutricionista assina com a linha do cadastro', () => {
    expect(assinaturaDaFolha(ANA, caso())).toEqual({ tipo: 'nutricionista', linha: 'Ana Souza · CRN-6 12345' })
  })

  it('nutricionista sem nome e CRN ainda assina como nutricionista, com a linha vazia', () => {
    expect(assinaturaDaFolha({ ...ANA, linhaNutricionista: null }, caso())).toEqual({ tipo: 'nutricionista', linha: '' })
  })

  it('plano antigo de nutricionista com estagiário sai como estágio (CB-51)', () => {
    expect(assinaturaDaFolha(ANA, caso({ estagiario: 'Júlia Martins' }))).toEqual({ tipo: 'estagio', estagiario: 'Júlia Martins', preceptor: '' })
  })

  it('estudante sai com estagiário e preceptor do plano', () => {
    expect(assinaturaDaFolha(JULIA, caso({ estagiario: ' Júlia Martins ', preceptor: 'Carla Mendes' }))).toEqual({
      tipo: 'estagio',
      estagiario: 'Júlia Martins',
      preceptor: 'Carla Mendes',
    })
  })

  it('sem ninguém, a folha fica sem nome', () => {
    expect(assinaturaDaFolha(null, caso())).toEqual({ tipo: 'vazia' })
    expect(assinaturaDaFolha(JULIA, caso())).toEqual({ tipo: 'vazia' })
  })
})

describe('lembretesDoDia (CA-312)', () => {
  it('fica só com o que não repete o horário das refeições', () => {
    const missoes: Missao[] = [
      { id: 'refeicao-r1', texto: 'Desjejum por volta das 06:00', origem: 'Refeição do plano' },
      { id: 'frutas', texto: 'Comer as 3 frutas do plano', origem: '' },
      { id: 'refeicao-r2', texto: 'Almoço por volta das 12:00', origem: 'Refeição do plano' },
      { id: 'agua', texto: 'Beber cerca de 2,2 litros de água', origem: '' },
    ]
    expect(lembretesDoDia(missoes).map((m) => m.id)).toEqual(['frutas', 'agua'])
  })
})

describe('linhaFinaDaFolha (CA-316)', () => {
  it('leva o nome do plano e quem assina', () => {
    expect(linhaFinaDaFolha(caso(), { tipo: 'nutricionista', linha: 'Ana Souza · CRN-6 12345' })).toEqual({
      esquerda: 'Plano alimentar · Maria, 28 anos',
      direita: 'Ana Souza · CRN-6 12345',
    })
    expect(linhaFinaDaFolha(caso({ nome: '  ' }), { tipo: 'estagio', estagiario: 'Júlia', preceptor: 'Carla' })).toEqual({
      esquerda: 'Plano alimentar · Sem nome',
      direita: 'Júlia · Carla',
    })
    expect(linhaFinaDaFolha(caso(), { tipo: 'vazia' }).direita).toBe('')
  })
})

describe('opções de impressão (CA-317, CA-320, CB-72)', () => {
  it('começa desmarcada', () => {
    expect(OPCOES_IMPRESSAO_PADRAO).toEqual({ listaDeCompras: false, trocas: false })
    expect(lerOpcoesImpressao(memoria())).toEqual(OPCOES_IMPRESSAO_PADRAO)
  })

  it('lembra o que foi marcado', () => {
    const arm = memoria()
    expect(gravarOpcoesImpressao(arm, { listaDeCompras: true, trocas: false })).toBe(true)
    expect(lerOpcoesImpressao(arm)).toEqual({ listaDeCompras: true, trocas: false })
  })

  it('Foco de revisão 4: dado estragado volta ao padrão', () => {
    expect(lerOpcoesImpressao(memoria({ 'metanutri:impressao': '{não é json' }))).toEqual(OPCOES_IMPRESSAO_PADRAO)
    expect(lerOpcoesImpressao(memoria({ 'metanutri:impressao': '{"listaDeCompras":"sim","trocas":1}' }))).toEqual(OPCOES_IMPRESSAO_PADRAO)
    expect(lerOpcoesImpressao(memoria({ 'metanutri:impressao': '[true]' }))).toEqual(OPCOES_IMPRESSAO_PADRAO)
  })

  it('CB-72: sem armazenamento, vale só para esta impressão', () => {
    expect(lerOpcoesImpressao(null)).toEqual(OPCOES_IMPRESSAO_PADRAO)
    expect(gravarOpcoesImpressao(null, { listaDeCompras: true, trocas: true })).toBe(false)
    const cheio: Armazenamento = {
      ...memoria(),
      setItem: () => {
        throw new DOMException('cheio', 'QuotaExceededError')
      },
    }
    expect(gravarOpcoesImpressao(cheio, { listaDeCompras: true, trocas: true })).toBe(false)
  })

  it('a chave entra no backup e no apagar dados do aparelho', () => {
    expect(CHAVES_DE_DADOS).toContain('metanutri:impressao')
  })
})
