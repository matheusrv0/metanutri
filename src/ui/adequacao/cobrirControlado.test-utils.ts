// Sugestão controlada para os testes do Cobrir (integração, item c): o teste não depende de qual alimento o Cobrir
// escolhe hoje. Quem usa precisa simular `@/domain/cobrir.ts` com `sugerirParaCobrir: vi.fn(real.sugerirParaCobrir)`.
// O nome não termina em `.test.ts`, então o Vitest não roda este arquivo como teste.
import { calcularAdequacao } from '@/domain/adequacao.ts'
import { sugerirParaCobrir, type Sugestao } from '@/domain/cobrir.ts'
import { adicionarItem, type GerarId } from '@/domain/plano.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDoPlano } from '@/domain/totais.ts'
import type { Caso, ChaveNutrienteAlimento, Plano } from '@/domain/tipos.ts'

export const CENOURA_CRUA = 110
export const IOGURTE_DESNATADO = 449
export const LENTILHA_COZIDA = 577

/** Os nutrientes abaixo da meta, sem contar o sódio (que não se cobre), no plano dado. */
export function abaixoDaMeta(plano: Plano, caso: Caso): readonly ChaveNutrienteAlimento[] {
  return calcularAdequacao(totaisDoPlano(plano, buscarAlimento), caso, caso.adequacao.preset)
    .linhas.filter((l) => l.estado === 'abaixo' && l.chave !== 'sodio_mg')
    .map((l) => l.chave)
}

function sugestao(alimentoId: number, gramas: number, coberturaPct: number): Sugestao {
  const alimento = buscarAlimento(alimentoId)
  if (!alimento) throw new Error(`fixture: alimento ${alimentoId} não existe`)
  const kcal = ((alimento.nutrientes.energia_kcal ?? 0) * gramas) / 100
  return { alimentoId, descricao: alimento.descricao, gramas, coberturaPct, parcial: false, kcalAdicionadas: kcal, avisos: [] }
}

/**
 * A menor porção do alimento, em passos de 5 g, que leva o nutriente à meta. Confere que só esse nutriente sai de
 * "abaixo", para a contagem do cartão cair exatamente um.
 */
export function sugestaoQueLevaAMeta(plano: Plano, caso: Caso, chave: ChaveNutrienteAlimento, alimentoId: number, gerarId: GerarId): Sugestao {
  const refeicao = plano.refeicoes[0]
  if (!refeicao) throw new Error('fixture: plano sem refeição')
  const antes = abaixoDaMeta(plano, caso)
  if (!antes.includes(chave)) throw new Error(`fixture: ${chave} já está na meta`)
  for (let gramas = 5; gramas <= 300; gramas += 5) {
    const depois = abaixoDaMeta(adicionarItem(plano, refeicao.id, 'principal', { alimentoId, gramas }, gerarId), caso)
    if (depois.includes(chave)) continue
    expect(depois).toEqual(antes.filter((c) => c !== chave))
    return sugestao(alimentoId, gramas, 100)
  }
  throw new Error(`fixture: o alimento ${alimentoId} não leva ${chave} à meta em até 300 g`)
}

/** Uma porção que não leva o nutriente à meta: ele continua abaixo e o Cobrir dele continua na tela. */
export function sugestaoQueNaoLevaAMeta(plano: Plano, caso: Caso, chave: ChaveNutrienteAlimento, alimentoId: number, gramas: number, gerarId: GerarId): Sugestao {
  const refeicao = plano.refeicoes[0]
  if (!refeicao) throw new Error('fixture: plano sem refeição')
  const depois = abaixoDaMeta(adicionarItem(plano, refeicao.id, 'principal', { alimentoId, gramas }, gerarId), caso)
  expect(depois).toContain(chave)
  return sugestao(alimentoId, gramas, 50)
}

/** A gaveta passa a mostrar só a sugestão dada; o resto do resultado é o cálculo de verdade. */
export async function gavetaSugere(s: Sugestao): Promise<void> {
  const real = await vi.importActual<typeof import('@/domain/cobrir.ts')>('@/domain/cobrir.ts')
  vi.mocked(sugerirParaCobrir).mockImplementation((...args) => ({ ...real.sugerirParaCobrir(...args), sugestoes: [s] }))
}

/** Volta a gaveta ao cálculo de verdade (use no `afterEach`). */
export async function gavetaDeVerdade(): Promise<void> {
  const real = await vi.importActual<typeof import('@/domain/cobrir.ts')>('@/domain/cobrir.ts')
  vi.mocked(sugerirParaCobrir).mockImplementation(real.sugerirParaCobrir)
}
