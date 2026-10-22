// Doenças e diagnósticos da ficha (spec ficha-unica, D-360): escolhas comuns mais o texto livre de antes
// ("Condições clínicas"). O Word do plano com paciente lê daqui o "Diagnóstico clínico".
import { DOENCA_CELIACA } from './restricoes.ts'
import type { Sexo } from './tipos.ts'

export interface Doenca {
  readonly id: string
  readonly rotulo: string
  /** Só aparece para o sexo feminino (ou quando já está marcada). */
  readonly soFeminino?: true
  /** Só aparece a partir desta idade, em anos (ou quando já está marcada). */
  readonly idadeMin?: number
}

export const DOENCAS: readonly Doenca[] = [
  { id: 'diabetes', rotulo: 'Diabetes' },
  { id: 'hipertensao', rotulo: 'Hipertensão' },
  { id: 'dislipidemia', rotulo: 'Colesterol ou triglicerídeos altos' },
  { id: 'doenca-renal', rotulo: 'Doença renal crônica' },
  { id: DOENCA_CELIACA, rotulo: 'Doença celíaca' },
  { id: 'anemia', rotulo: 'Anemia' },
  { id: 'hipotireoidismo', rotulo: 'Hipotireoidismo' },
  // D-451 (correção B): na adolescente, a SOP só se diagnostica mais de 1 ano depois da menarca (diretriz internacional
  // de SOP, Teede et al., 2023); abaixo de 12 anos a opção não se aplica.
  { id: 'sop', rotulo: 'Síndrome dos ovários policísticos', soFeminino: true, idadeMin: 12 },
  { id: 'esteatose', rotulo: 'Esteatose hepática' },
]

/**
 * As escolhas que valem para a pessoa: a SOP só para o sexo feminino de 12 anos em diante (R4, D-451). Sem idade, a
 * escolha com idade mínima não aparece (R13). Marcada antes, continua à vista (D-450).
 */
export function doencasDaPessoa(pessoa: { readonly sexo: Sexo | null; readonly idadeAnos: number | null }, marcadas: readonly string[]): readonly Doenca[] {
  const vale = (d: Doenca) =>
    (!d.soFeminino || pessoa.sexo === 'F') && (d.idadeMin === undefined || (pessoa.idadeAnos !== null && pessoa.idadeAnos >= d.idadeMin))
  return DOENCAS.filter((d) => vale(d) || marcadas.includes(d.id))
}

/** "Hipertensão, diabetes e anemia": a lista em frase, com minúscula depois da primeira. */
function emFrase(rotulos: readonly string[]): string {
  const [primeiro, ...resto] = rotulos
  if (primeiro === undefined) return ''
  const todos = [primeiro, ...resto.map((r) => r.charAt(0).toLowerCase() + r.slice(1))]
  return todos.length === 1 ? primeiro : `${todos.slice(0, -1).join(', ')} e ${todos[todos.length - 1] ?? ''}`
}

/** O "Diagnóstico clínico" do Word: as doenças marcadas em frase, e o texto livre depois. Id desconhecido não sai. */
export function textoDasDoencas(paciente: { readonly doencas: readonly string[]; readonly condicoesClinicas: string }): string {
  const marcadas = DOENCAS.filter((d) => paciente.doencas.includes(d.id)).map((d) => d.rotulo)
  const texto = paciente.condicoesClinicas.trim().replace(/\s*\n\s*/g, '; ')
  const frase = emFrase(marcadas)
  if (frase === '') return texto
  return texto === '' ? `${frase}.` : `${frase}. ${texto}`
}
