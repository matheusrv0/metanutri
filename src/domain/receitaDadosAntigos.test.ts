// Spec receitas-com-calculo, CA-888: o que foi salvo antes das receitas com cálculo abre e calcula como antes.
import { mostraReceitas } from './assinaturaDoPlano.ts'
import { criarCasoVazio } from './caso.ts'
import { dietaDoPlano } from './dietaDoLink.ts'
import { comprasDaFolha, receitasDaFolha } from './folhaDieta.ts'
import { montarBackup, restaurarBackup } from './perfil.ts'
import { criarRepositorio, type Armazenamento } from './persistencia.ts'
import { receitasDoPlano } from './receitaNoPlano.ts'
import { criarRepositorioReceitas } from './receitas.ts'
import { buscarAlimento } from './tabelas.ts'
import { totaisDoPlano } from './totais.ts'

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

/** Um plano como a versão de antes gravava: item sem `receita`, e o texto livre das receitas no caso. */
const PLANO_ANTIGO = {
  formato: 1,
  versao: 3,
  atualizadoEm: '2026-10-01T12:00:00.000Z',
  caso: { ...criarCasoVazio('antigo'), nome: 'Plano de antes', receitas: 'Bolo de banana: 3 bananas, 2 ovos.' },
  plano: {
    refeicoes: [
      { id: 'r1', nome: 'Almoço', horario: '12:00', opcoes: { principal: [{ id: 'i1', alimentoId: 3, gramas: 150 }], substituto1: [], substituto2: [] } },
    ],
  },
}

describe('dados de antes das receitas com cálculo (CA-888)', () => {
  it('o plano antigo abre e calcula igual; não tem receita calculada; o texto livre continua', () => {
    const arm = new Memoria()
    arm.setItem('metanutri:casos', '["antigo"]')
    arm.setItem('metanutri:caso:antigo', JSON.stringify(PLANO_ANTIGO))
    const salvo = criarRepositorio(arm).obter('antigo')
    expect(salvo?.plano).toEqual(PLANO_ANTIGO.plano)
    const plano = salvo?.plano ?? { refeicoes: [] }
    expect(totaisDoPlano(plano, buscarAlimento).nutrientes.energia_kcal.total).toBeCloseTo(128.2585 * 1.5, 4)
    expect(receitasDoPlano(plano)).toEqual([])
    expect(receitasDaFolha(plano, buscarAlimento)).toEqual([])
    expect(comprasDaFolha(plano, buscarAlimento).map((c) => c.nome)).toEqual(['Arroz branco cozido'])
    const dieta = dietaDoPlano(salvo?.caso ?? criarCasoVazio('x'), plano)
    expect(dieta.receitas).toBe('Bolo de banana: 3 bananas, 2 ovos.')
    expect('receitasDoPlano' in dieta).toBe(false)
  })

  it('o campo de texto "Receitas" segue a D-34: nutricionista só o vê com texto; estudante sempre', () => {
    const caso = criarCasoVazio('c')
    expect(mostraReceitas('nutricionista', caso)).toBe(false)
    expect(mostraReceitas('nutricionista', { ...caso, receitas: 'Bolo.' })).toBe(true)
    expect(mostraReceitas('estudante', caso)).toBe(true)
  })

  it('o backup de antes, sem a chave das receitas, volta inteiro e a biblioteca começa vazia', () => {
    const origem = new Memoria()
    origem.setItem('metanutri:pacientes', '[{"id":"ana","nome":"Ana"}]')
    const backup = montarBackup(origem, ['metanutri:pacientes'], '2026-10-01T00:00:00.000Z')
    const destino = new Memoria()
    expect(restaurarBackup(destino, JSON.stringify(backup))).toEqual({ restaurados: 1, erro: null })
    expect(criarRepositorioReceitas(destino).listar()).toEqual([])
  })
})
