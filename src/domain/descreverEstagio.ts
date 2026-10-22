// O estágio de vida das referências por extenso (spec textos-e-promessas, D-410): "masculino-19-30" é código da tabela,
// não texto de documento. A tela Adequação diz o mesmo ("homens de 19 a 30 anos").
import type { EstagioDri } from './tabelas.ts'

type DadosDoEstagio = Pick<EstagioDri, 'idadeMin' | 'idadeMax' | 'sexo' | 'gestante' | 'lactante'>

/** A palavra da idade (spec ficha-unica, D-461): meninas e meninos até 13 anos, moças e rapazes de 14 a 18. */
function quem(estagio: DadosDoEstagio): string {
  if (estagio.gestante) return 'gestantes'
  if (estagio.lactante) return 'lactantes'
  if (estagio.sexo === null) return 'crianças'
  const ate = estagio.idadeMax
  const feminino = estagio.sexo === 'F'
  if (ate !== null && ate <= 13) return feminino ? 'meninas' : 'meninos'
  if (ate !== null && ate <= 18) return feminino ? 'moças' : 'rapazes'
  return feminino ? 'mulheres' : 'homens'
}

/** "masculino-19-30" vira "homens de 19 a 30 anos"; "gestante-19-30", "gestantes de 19 a 30 anos". */
export function descreverEstagio(estagio: DadosDoEstagio): string {
  const grupo = quem(estagio)
  const faixa = estagio.idadeMax === null ? `${estagio.idadeMin} anos ou mais` : `${estagio.idadeMin} a ${estagio.idadeMax} anos`
  return `${grupo} de ${faixa}`
}
