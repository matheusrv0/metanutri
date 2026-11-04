// Os textos da vista Avaliação (spec antropometria-telas, D-1407 a D-1421): o que a tela escreve a partir do motor.
// Nenhum número é calculado aqui; só formatado nas casas que o motor manda.
import type { ErroDaEstimativa, LadoUsado } from '@/domain/estimativas.ts'
import type { CampoQueFalta } from '@/domain/linhaDoResultado.ts'
import type { PesoIdeal } from '@/domain/pesoDeReferencia.ts'
import type { OrigemDasMedidas, Sexo } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'

export const TRAVESSAO = '—'

/** O número com as casas do motor e a unidade: "26,58 kg/m²", "29,5%", "10,6". Sem valor, "—" (nunca 0). */
export function comUnidade(valor: number | null, casas: number, unidade: string): string {
  if (valor === null) return TRAVESSAO
  const numero = formatarNumero(valor, casas)
  if (unidade === '') return numero
  return unidade === '%' ? `${numero}%` : `${numero} ${unidade}`
}

const ehDobra = (f: CampoQueFalta) => f.campo.startsWith('composicao.dobras.')

/** "o peso", "o peso e a estatura", "o sexo, a idade e o peso". */
export function emFrase(nomes: readonly string[]): string {
  if (nomes.length <= 1) return nomes.join('')
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1] ?? ''}`
}

/** "Falta a cintura", "Faltam o peso e a estatura", "Faltam 3 dobras" (só dobras, 3 ou mais). */
export function textoDaFalta(falta: readonly CampoQueFalta[]): string {
  if (falta.length === 0) return ''
  if (falta.length >= 3 && falta.every(ehDobra)) return `Faltam ${falta.length} dobras`
  return `${falta.length === 1 ? 'Falta' : 'Faltam'} ${emFrase(falta.map((f) => f.nome))}`
}

/** D-1407: a origem do peso e da estatura, com o sexo da ficha; sem sexo, "pela pessoa". */
export function opcoesDaOrigem(sexo: Sexo | null): { readonly valor: OrigemDasMedidas; readonly rotulo: string }[] {
  const quem = sexo === 'F' ? 'pela paciente' : sexo === 'M' ? 'pelo paciente' : 'pela pessoa'
  return [
    { valor: 'aferidas', rotulo: 'Aferidos na consulta' },
    { valor: 'informadas', rotulo: `Informados ${quem}` },
    { valor: 'estimadas', rotulo: 'Estimados' },
  ]
}

/** O erro de uma estimativa como a tela escreve: "± 6 cm", "erro médio de 6%"; sem erro publicado, `null`. */
export function textoDoErro(erro: ErroDaEstimativa | null): string | null {
  if (erro === null) return null
  return erro.unidade === 'cm' ? `± ${formatarNumero(erro.valor, 0)} cm` : `erro médio de ${formatarNumero(erro.valor, erro.valor % 1 === 0 ? 0 : 1)}%`
}

/** O lado do braço e da panturrilha que a estimativa usou: "lado esquerdo" ou "braço direito, panturrilha esquerda". */
export function textoDosLados(lados: readonly LadoUsado[]): string | null {
  if (lados.length === 0) return null
  const [primeiro] = lados
  if (primeiro && lados.every((l) => l.lado === primeiro.lado)) return `lado ${primeiro.lado}`
  return lados.map((l) => (l.medida === 'braço' ? `braço ${l.lado}` : `panturrilha ${l.lado === 'direito' ? 'direita' : 'esquerda'}`)).join(', ')
}

const NOME_DA_COMPLEICAO = { pequena: 'pequena', media: 'média', grande: 'grande' } as const

/** D-1409 e D-1463: de onde vem o IMC-alvo do peso ideal. */
export function fraseDoImcAlvo(origem: PesoIdeal['origemDoImcAlvo'], compleicao: keyof typeof NOME_DA_COMPLEICAO | null): string {
  if (origem === 'digitado') return 'Definido por você.'
  if (origem === 'padrao-do-idoso') return 'Padrão do idoso. Edite se quiser.'
  return `Padrão da compleição ${NOME_DA_COMPLEICAO[compleicao ?? 'media']}. Edite se quiser.`
}

/** "53,5 a 72,2 kg". */
export const faixaEmKg = (min: number, max: number): string => `${formatarNumero(min, 1)} a ${formatarNumero(max, 1)} kg`
