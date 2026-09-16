// Missões diárias: o plano vira uma lista curta de coisas para o paciente marcar no dia.
// Tudo é derivado do plano; nada aqui inventa recomendação nova.
import { buscarAlimento } from './tabelas.ts'
import { totaisDoPlano } from './totais.ts'
import type { Plano } from './tipos.ts'

export interface Missao {
  readonly id: string
  readonly texto: string
  /** De onde saiu: refeição do plano, água, fibra. Serve para a pessoa entender o porquê. */
  readonly origem: string
}

const CATEGORIAS_FRUTA = /^Frutas/i
const CATEGORIAS_VERDURA = /^(Verduras|Hortaliças|Leguminosas)/i

/**
 * Gera as missões do dia a partir do plano: uma por refeição com alimento,
 * mais as de hábito que o próprio plano justifica.
 */
export function missoesDoPlano(plano: Plano, opcoes: { readonly pesoKg?: number | null } = {}): readonly Missao[] {
  const missoes: Missao[] = []

  for (const refeicao of plano.refeicoes) {
    const itens = refeicao.opcoes.principal.filter((i) => i.gramas > 0)
    if (itens.length === 0) continue
    missoes.push({
      id: `refeicao-${refeicao.id}`,
      texto: `${refeicao.nome} por volta das ${refeicao.horario}`,
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

  const vegetais = alimentos.filter((a) => CATEGORIAS_VERDURA.test(a.categoria)).length
  if (vegetais > 0) {
    missoes.push({ id: 'vegetais', texto: 'Comer os vegetais do almoço e do jantar', origem: 'Verduras e leguminosas do plano' })
  }

  const totais = totaisDoPlano(plano, buscarAlimento)
  const peso = opcoes.pesoKg ?? null
  const temAlimento = itens.some((i) => i.gramas > 0)

  if (temAlimento || totais.nutrientes.fibra_g.total > 0) {
    if (peso !== null && peso > 0) {
      const litros = Math.round((peso * 35) / 100) / 10
      missoes.push({
        id: 'agua',
        texto: `Beber cerca de ${String(litros).replace('.', ',')} litros de água`,
        origem: '35 ml por quilo de peso, referência de rotina',
      })
    } else {
      missoes.push({ id: 'agua', texto: 'Beber água ao longo do dia', origem: 'Hábito que acompanha o plano' })
    }
  }

  return missoes
}

export interface ItemCompra {
  readonly descricao: string
  readonly gramas: number
}

/** Lista de compras do dia: soma as quantidades por alimento do Principal. */
export function listaDeCompras(plano: Plano): readonly ItemCompra[] {
  const porAlimento = new Map<number, number>()
  for (const refeicao of plano.refeicoes) {
    for (const item of refeicao.opcoes.principal) {
      if (item.gramas <= 0) continue
      porAlimento.set(item.alimentoId, (porAlimento.get(item.alimentoId) ?? 0) + item.gramas)
    }
  }
  return [...porAlimento.entries()]
    .map(([id, gramas]) => ({ descricao: buscarAlimento(id)?.descricao ?? 'Alimento removido', gramas }))
    .sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR'))
}
