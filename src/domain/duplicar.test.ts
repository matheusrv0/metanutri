import { criarCasoVazio } from './caso.ts'
import { duplicarCaso, nomeDaCopia } from './duplicar.ts'
import { adicionarItem, criarPlanoPadrao } from './plano.ts'
import type { Caso } from './tipos.ts'

const contador = (prefixo = 'id') => {
  let n = 0
  return () => `${prefixo}-${++n}`
}

const registro = (mudanca: Partial<Caso> = {}) => {
  const gerar = contador()
  const caso: Caso = { ...criarCasoVazio('antigo'), nome: 'Maria, retorno', pacienteId: 'p1', pesoKg: 68, dataConsulta: '2026-01-10', ...mudanca }
  const padrao = criarPlanoPadrao(gerar)
  const primeira = padrao.refeicoes[0]
  if (!primeira) throw new Error('O plano padrão precisa ter ao menos uma refeição.')
  const plano = adicionarItem(padrao, primeira.id, 'principal', { alimentoId: 1, gramas: 100 }, gerar)
  return { caso, plano }
}

describe('nomeDaCopia', () => {
  it('acrescenta (cópia) ao nome', () => {
    expect(nomeDaCopia('Maria, retorno')).toBe('Maria, retorno (cópia)')
  })

  it('numera a partir da segunda cópia em vez de empilhar parênteses', () => {
    expect(nomeDaCopia('Maria (cópia)')).toBe('Maria (cópia 2)')
    expect(nomeDaCopia('Maria (cópia 2)')).toBe('Maria (cópia 3)')
  })

  it('plano sem nome vira "Cópia do plano"', () => {
    expect(nomeDaCopia('   ')).toBe('Cópia do plano')
  })
})

describe('duplicarCaso', () => {
  it('troca o id do caso e o de cada item do plano', () => {
    const original = registro()
    const copia = duplicarCaso(original, contador('copia'), { hoje: '2026-09-16' })

    expect(copia.caso.id).not.toBe(original.caso.id)
    const idsOriginais = original.plano.refeicoes.flatMap((r) => [r.id, ...r.opcoes.principal.map((i) => i.id)])
    const idsCopia = copia.plano.refeicoes.flatMap((r) => [r.id, ...r.opcoes.principal.map((i) => i.id)])
    expect(idsCopia.some((id) => idsOriginais.includes(id))).toBe(false)
  })

  it('mantém paciente, peso e alimentos, e põe a data de hoje', () => {
    const original = registro()
    const copia = duplicarCaso(original, contador('copia'), { hoje: '2026-09-16' })

    expect(copia.caso.pacienteId).toBe('p1')
    expect(copia.caso.pesoKg).toBe(68)
    expect(copia.caso.dataConsulta).toBe('2026-09-16')
    expect(copia.plano.refeicoes[0]?.opcoes.principal[0]?.alimentoId).toBe(original.plano.refeicoes[0]?.opcoes.principal[0]?.alimentoId)
  })

  it('mexer na cópia não mexe no original', () => {
    const original = registro()
    const copia = duplicarCaso(original, contador('copia'), { hoje: '2026-09-16' })
    expect(original.caso.nome).toBe('Maria, retorno')
    expect(copia.caso.nome).toBe('Maria, retorno (cópia)')
  })
})
