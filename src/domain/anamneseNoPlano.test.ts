// O que a anamnese leva para o plano (spec ficha-unica, D-356 e CA-1062, CA-1070, CA-1071) e as regras R1 a R13.
import { responder, type RespostaAnamnese } from './anamnese.ts'
import { lembreteDaHidratacao, nivelSugerido } from './anamneseNoPlano.ts'
import { perfilDaFicha } from './fichaNoPlano.ts'
import { criarPacienteVazio } from './pacientes.ts'
import { aplicaRegra, podeGestarOuLactar } from './regrasDaFicha.ts'

const atividade = (pratica: string, tipo = '', vezes = '', minutos = ''): RespostaAnamnese[] => {
  let r = responder([], { id: 'atividade-pratica', texto: 'Prática de exercício' }, 'atividade', pratica)
  r = responder(r, { id: 'atividade-tipo', texto: 'Tipo de atividade' }, 'atividade', tipo)
  r = responder(r, { id: 'atividade-vezes', texto: 'Vezes por semana' }, 'atividade', vezes)
  return responder(r, { id: 'atividade-minutos', texto: 'Minutos por vez' }, 'atividade', minutos)
}

describe('O nível de atividade sugerido (D-356, CA-1062)', () => {
  it.each([
    ['não pratica', atividade('Não'), 'sedentario', 1.2],
    ['1 ou 2 vezes', atividade('Sim', 'Caminhada', '2', '40'), 'pouco-ativo', 1.37],
    ['3 a 5 vezes', atividade('Sim', 'Musculação', '4', '60'), 'moderadamente-ativo', 1.55],
    ['6 ou 7 vezes', atividade('Sim', 'Corrida', '6', '50'), 'muito-ativo', 1.7],
    ['menos de 30 minutos desce um nível', atividade('Sim', 'Musculação', '4', '20'), 'pouco-ativo', 1.37],
    ['menos de 30 minutos e 1 vez é sedentário', atividade('Sim', 'Caminhada', '1', '20'), 'sedentario', 1.2],
  ])('%s', (_nome, respostas, nivel, fator) => {
    expect(nivelSugerido(respostas)).toMatchObject({ nivelId: nivel, fator })
  })

  it('nunca sugere Extremamente ativo', () => {
    expect(nivelSugerido(atividade('Sim', 'Futebol', '7', '120'))?.nivelId).toBe('muito-ativo')
  })

  it('CA-1070: a frase de lembrete diz a resposta e a sugestão', () => {
    expect(nivelSugerido(atividade('Sim', 'Musculação', '4', '60'))?.frase).toBe('Na anamnese: musculação, 4 vezes por semana, 60 minutos por vez. Sugere Moderadamente ativo.')
    expect(nivelSugerido(atividade('Sim', '', '1', ''))?.frase).toBe('Na anamnese: 1 vez por semana. Sugere Pouco ativo.')
    expect(nivelSugerido(atividade('Não'))?.frase).toBe('Na anamnese: não pratica exercício. Sugere Sedentário.')
  })

  it('CB-355: sem prática respondida ou sem número de vezes, sem sugestão', () => {
    expect(nivelSugerido([])).toBeNull()
    expect(nivelSugerido(atividade('Sim', 'Natação'))).toBeNull()
    expect(nivelSugerido(atividade('Sim', 'Natação', 'três'))).toBeNull()
  })
})

describe('O lembrete da hidratação (CA-1071)', () => {
  it('junta a água por dia e a cor da urina', () => {
    let r = responder([], { id: 'agua-dia', texto: 'Água por dia' }, 'agua', '1 litro')
    r = responder(r, { id: 'cor-da-urina', texto: 'Cor da urina' }, 'agua', '5 · Amarelo-escuro')
    expect(lembreteDaHidratacao(r)).toBe('Na anamnese: 1 litro por dia · urina 5 · Amarelo-escuro')
    expect(lembreteDaHidratacao(r.slice(1))).toBe('Na anamnese: urina 5 · Amarelo-escuro')
    expect(lembreteDaHidratacao([])).toBeNull()
  })
})

describe('O perfil da ficha e as regras (seção 3)', () => {
  const ficha = criarPacienteVazio('p1', '2026-10-01T00:00:00.000Z')

  it('a idade é a de hoje, e o momento só vale quando a pessoa pode gestar', () => {
    expect(perfilDaFicha({ ...ficha, sexo: 'F', nascimento: '1998-01-10', momentoDeVida: { tipo: 'nenhum' } }, '2026-10-21', true)).toEqual({
      sexo: 'F',
      idadeAnos: 28,
      momento: 'nenhum',
      temPlano: true,
    })
    expect(perfilDaFicha({ ...ficha, sexo: 'M', nascimento: null }, '2026-10-21', false)).toEqual({ sexo: 'M', idadeAnos: null, momento: null, temPlano: false })
  })

  it('CA-1038: R1, sexo feminino de 14 a 50 anos', () => {
    expect(podeGestarOuLactar({ sexo: 'F', idadeAnos: 28 })).toBe(true)
    expect(podeGestarOuLactar({ sexo: 'F', idadeAnos: 14 })).toBe(true)
    expect(podeGestarOuLactar({ sexo: 'F', idadeAnos: 50 })).toBe(true)
    expect(podeGestarOuLactar({ sexo: 'F', idadeAnos: 13 })).toBe(false)
    expect(podeGestarOuLactar({ sexo: 'F', idadeAnos: 51 })).toBe(false)
    expect(podeGestarOuLactar({ sexo: 'M', idadeAnos: 28 })).toBe(false)
    expect(podeGestarOuLactar({ sexo: 'F', idadeAnos: null })).toBe(false)
  })

  it('R4 a R7 nos cortes de idade', () => {
    const quem = (idadeAnos: number, sexo: 'F' | 'M' = 'F') => ({ sexo, idadeAnos, momento: null, temPlano: false })
    expect(aplicaRegra('saude-mulher', quem(9))).toBe(false)
    expect(aplicaRegra('saude-mulher', quem(10))).toBe(true)
    expect(aplicaRegra('infancia', quem(9))).toBe(true)
    expect(aplicaRegra('infancia', quem(10))).toBe(false)
    expect(aplicaRegra('a-partir-de-12', quem(11))).toBe(false)
    expect(aplicaRegra('a-partir-de-12', quem(12))).toBe(true)
    expect(aplicaRegra('idoso', quem(59))).toBe(false)
    expect(aplicaRegra('idoso', quem(60, 'M'))).toBe(true)
  })
})
