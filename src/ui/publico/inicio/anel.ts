// O anel da Adequação da landing (spec landing-v3, D-656 e D-658): a base em destaque, a soma da sugestão e a bolinha
// da meta, num círculo de raio 104 em volta de (130, 130), medido em centésimos da volta (`pathLength="100"`).
import type { NutrienteDoExemplo, SugestaoDoExemplo } from './exemploDaLanding.ts'

/** O centro e o raio do anel no desenho de 260 × 260. */
export const CENTRO_DO_ANEL = 130
export const RAIO_DO_ANEL = 104

const umaCasa = (valor: number) => Math.round(valor * 10) / 10

export interface ArcosDoAnel {
  /** O arco da base, em % da volta: o percentual mostrado. */
  readonly base: number
  /** O arco da sugestão, em % da volta. */
  readonly soma: number
  /** O giro do arco da sugestão, em graus, para ele começar onde a base termina. */
  readonly giroDaSoma: number
  /** O centro da bolinha laranja da meta, no desenho antes de girar -90°. */
  readonly bolinha: { readonly x: number; readonly y: number }
}

/** CA-1664: a base é o percentual mostrado; a soma, (meta − base) × cobertura; a bolinha, na meta. */
export function arcosDoAnel({ base, meta, cobre }: { readonly base: number; readonly meta: number; readonly cobre: number }): ArcosDoAnel {
  const angulo = (meta / 100) * 2 * Math.PI
  return {
    base,
    soma: umaCasa(Math.max(0, ((meta - base) * cobre) / 100)),
    giroDaSoma: umaCasa(base * 3.6),
    bolinha: { x: umaCasa(CENTRO_DO_ANEL + RAIO_DO_ANEL * Math.cos(angulo)), y: umaCasa(CENTRO_DO_ANEL + RAIO_DO_ANEL * Math.sin(angulo)) },
  }
}

/** O texto do centro do anel: o que ainda falta com a sugestão, ou "Meta atingida" quando ela cobre a falta toda. */
export function centroDoAnel(
  nutriente: Pick<NutrienteDoExemplo, 'falta'>,
  sugestao: Pick<SugestaoDoExemplo, 'gramas' | 'resta'>,
): { readonly rotulo: string; readonly valor: string; readonly nota: string } {
  return sugestao.resta === null
    ? { rotulo: `com ${sugestao.gramas}`, valor: 'Meta', nota: 'atingida' }
    : { rotulo: 'ainda faltam', valor: sugestao.resta, nota: `de ${nutriente.falta}` }
}
