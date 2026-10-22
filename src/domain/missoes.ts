// Missões diárias: o plano vira uma lista curta de coisas para o paciente marcar no dia.
// Tudo é derivado do plano; nada aqui inventa recomendação nova.
import { litros } from './agua.ts'
import { buscarAlimento } from './tabelas.ts'
import { totaisDoPlano } from './totais.ts'
import type { Alimento, Plano } from './tipos.ts'

export interface Missao {
  readonly id: string
  readonly texto: string
  /** De onde saiu: refeição do plano, água, fibra. Serve para a pessoa entender o porquê. */
  readonly origem: string
}

const CATEGORIAS_FRUTA = /^Frutas/i
const CATEGORIA_VERDURA = /^(Verduras|Hortaliças)/i

/**
 * O que a TACO põe entre as verduras e não é verdura nem legume (spec textos-e-promessas, D-411): raízes e tubérculos,
 * que o Guia Alimentar junta aos cereais; derivados de amido; e temperos. A vírgula separa "Alho, cru" de "Alho-poró".
 */
const NAO_E_VERDURA_NEM_LEGUME =
  /^(Batata|Mandioca|Cará|Inhame|Pão|Farinha|Fécula|Polvilho|Biscoito|Nhoque|Alho|Cebolinha|Coentro|Salsa|Manjericão|Alfavaca),|^Tomate, (extrato|molho|purê)/i

/** Verdura ou legume de fato. Feijão, lentilha e grão-de-bico (leguminosas) não entram: são outro grupo. */
export const ehVerduraOuLegume = (alimento: Pick<Alimento, 'descricao' | 'categoria'>): boolean =>
  CATEGORIA_VERDURA.test(alimento.categoria) && !NAO_E_VERDURA_NEM_LEGUME.test(alimento.descricao.trim())

/**
 * A hora no texto corrido (spec textos-e-promessas, D-412): "por volta das 12h", "das 12h30", "da 1h". O campo continua
 * "12:00". Fora do formato, o horário como veio (CB-388).
 */
export function horaNoTexto(horario: string): string {
  const partes = /^(\d{1,2}):(\d{2})$/.exec(horario.trim())
  if (!partes) return `por volta de ${horario.trim()}`
  const hora = Number(partes[1])
  const minutos = partes[2] === '00' ? '' : partes[2]
  return `por volta ${hora <= 1 ? 'da' : 'das'} ${hora}h${minutos ?? ''}`
}

/** "1,2 litro", "2,2 litros": abaixo de 2, o singular. */
export const quantosLitros = (l: number): string => `${litros(l)} ${l < 2 ? 'litro' : 'litros'}`

/**
 * Gera as missões do dia a partir do plano: uma por refeição com alimento,
 * mais as de hábito que o próprio plano justifica.
 */
export function missoesDoPlano(plano: Plano, opcoes: { readonly aguaL?: number | null } = {}): readonly Missao[] {
  const missoes: Missao[] = []

  for (const refeicao of plano.refeicoes) {
    const itens = refeicao.opcoes.principal.filter((i) => i.gramas > 0)
    if (itens.length === 0) continue
    missoes.push({
      id: `refeicao-${refeicao.id}`,
      texto: `${refeicao.nome} ${horaNoTexto(refeicao.horario)}`,
      origem: 'Refeição do plano',
    })
  }

  const itens = plano.refeicoes.flatMap((r) => r.opcoes.principal)
  const alimentos = itens.map((i) => buscarAlimento(i.alimentoId)).filter((a): a is NonNullable<typeof a> => a !== undefined)

  const frutas = alimentos.filter((a) => CATEGORIAS_FRUTA.test(a.categoria)).length
  if (frutas > 0) {
    missoes.push({
      id: 'frutas',
      texto: frutas === 1 ? 'Comer a fruta do plano' : `Comer as ${frutas} frutas do plano`,
      origem: 'Frutas que estão no plano',
    })
  }

  // D-411: o id continua "vegetais", para as marcações dos links já enviados valerem (CB-381).
  if (alimentos.some(ehVerduraOuLegume)) {
    missoes.push({ id: 'vegetais', texto: 'Comer as verduras e os legumes do plano', origem: 'Verduras e legumes que estão no plano' })
  }

  const totais = totaisDoPlano(plano, buscarAlimento)
  // A meta de água do plano, a mesma da linha da folha (spec ficha-unica, D-355 e CA-1094).
  const agua = opcoes.aguaL ?? null
  const temAlimento = itens.some((i) => i.gramas > 0)

  if (temAlimento || totais.nutrientes.fibra_g.total > 0) {
    if (agua !== null) {
      missoes.push({
        id: 'agua',
        texto: `Beber cerca de ${quantosLitros(agua)} de água`,
        origem: 'Meta de água do plano',
      })
    } else {
      missoes.push({ id: 'agua', texto: 'Beber água ao longo do dia', origem: 'Hábito que acompanha o plano' })
    }
  }

  return missoes
}
