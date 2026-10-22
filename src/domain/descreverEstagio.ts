// O estágio de vida das referências por extenso (spec textos-e-promessas, D-410): "masculino-19-30" é código da tabela,
// não texto de documento. A tela Adequação diz o mesmo ("homens de 19 a 30 anos").
import type { EstagioDri } from './tabelas.ts'

type DadosDoEstagio = Pick<EstagioDri, 'idadeMin' | 'idadeMax' | 'sexo' | 'gestante' | 'lactante'>

/** "masculino-19-30" vira "homens de 19 a 30 anos"; "gestante-19-30", "gestantes de 19 a 30 anos". */
export function descreverEstagio(estagio: DadosDoEstagio): string {
  const grupo = estagio.gestante ? 'gestantes' : estagio.lactante ? 'lactantes' : estagio.sexo === 'F' ? 'mulheres' : estagio.sexo === 'M' ? 'homens' : 'crianças'
  const faixa = estagio.idadeMax === null ? `${estagio.idadeMin} anos ou mais` : `${estagio.idadeMin} a ${estagio.idadeMax} anos`
  return `${grupo} de ${faixa}`
}
