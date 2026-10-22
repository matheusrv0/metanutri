import type { EstadoAdequacao, LinhaAdequacao } from '@/domain/adequacao.ts'
import type { Sugestao } from '@/domain/cobrir.ts'
import { formatarQuantidadeMedida } from '@/domain/busca.ts'
import { unidadeDo } from '@/domain/liquido.ts'
import { nomeParaPaciente } from '@/domain/nomeParaPaciente.ts'
import type { Alimento } from '@/domain/tipos.ts'
import { arredondarNoEstado } from '@/domain/arredondarNoEstado.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'

/* A barra carrega o estado da linha: cor sempre significa alguma coisa. */
export const VARIANTE_BARRA: Record<EstadoAdequacao, 'success' | 'warning' | 'error'> = {
  adequado: 'success',
  abaixo: 'warning',
  'acima-limite': 'error',
}

/* O texto da adequação leva a mesma cor da barra: abaixo em âmbar, dentro em verde, acima do limite em vermelho. */
export const COR_TEXTO: Record<EstadoAdequacao, string> = {
  adequado: 'text-successtext',
  abaixo: 'text-warningtext',
  'acima-limite': 'text-errortext',
}

/**
 * "28% da referência" (spec ficha-unica, D-459): a porcentagem diz de que ela é. "28% abaixo" se lia como "faltam 28%".
 * Abaixo da meta, 89,6% com meta de 90% nunca sai "90%"; longe da meta, o mais perto (D-211).
 */
export function pctDaReferencia(linha: LinhaAdequacao): string {
  return `${formatarNumero(arredondarNoEstado(linha.adequacaoPct, linha.estado === 'abaixo' ? 'abaixo' : 'dentro', { min: linha.metaPct }), 0)}% da referência`
}

/** "28% da referência · abaixo da meta", "104% da referência" ou "230% da referência · acima do limite" (D-459). */
export function textoDaAdequacao(linha: LinhaAdequacao): string {
  const pct = pctDaReferencia(linha)
  if (linha.estado === 'abaixo') return `${pct} · abaixo da meta`
  // D-470 (spec sugestoes-com-criterio): na vitamina A, o limite é da parte pré-formada.
  if (linha.estado === 'acima-limite') return `${pct} · ${linha.chave === 'vitamina_a_rae_mcg' ? 'pré-formada acima do limite' : 'acima do limite'}`
  return pct
}

/** O botão dos nutrientes na meta, com a concordância certa (D-461): "Ver o nutriente na meta", "Ver os 5 nutrientes na meta". */
export function rotuloDosNaMeta(quantos: number, aberto: boolean): string {
  const verbo = aberto ? 'Esconder' : 'Ver'
  return quantos === 1 ? `${verbo} o nutriente na meta` : `${verbo} os ${quantos} nutrientes na meta`
}

/** Os avisos de uma sugestão do Cobrir, um por linha (CA-37; D-471 da correção C: a nota do fígado). */
export function descreverAvisos(s: Pick<Sugestao, 'avisos'>): readonly string[] {
  return s.avisos.map((a) =>
    a.tipo === 'excede-gasto'
      ? `Ultrapassa o gasto energético em ${formatarNumero(a.kcalAcima, 0)} kcal.`
      : a.tipo === 'figado-semanal'
        ? 'Fígado: no máximo 1 vez por semana.'
        : `Ultrapassa o limite superior (UL) de ${a.rotulo}.`,
  )
}

/**
 * A porção de uma sugestão do Cobrir: a meia medida caseira e o peso, em ml no líquido (G8), e "(peso cru)" quando o
 * paciente lê o alimento pelo peso cru (D-474 da correção C): "100 g (peso cru)", "1 copo americano · 150 ml".
 */
export function porcaoDaSugestao(s: Pick<Sugestao, 'gramas' | 'medida'>, alimento: Alimento | undefined): string {
  const pesoCru = alimento !== undefined && nomeParaPaciente(alimento).endsWith(PESO_CRU)
  const peso = `${formatarNumero(s.gramas, 0)} ${unidadeDo(alimento)}${pesoCru ? ` ${PESO_CRU}` : ''}`
  return s.medida ? `${formatarQuantidadeMedida(s.medida.quantidade, s.medida.nome)} · ${peso}` : peso
}

const PESO_CRU = '(peso cru)'

/** A primeira frase da gaveta do Cobrir: "O plano tem 28% da referência. " (D-459); sem a linha, nada. */
export const aberturaDoCobrir = (linha: LinhaAdequacao | undefined): string => (linha ? `O plano tem ${pctDaReferencia(linha)}. ` : '')
