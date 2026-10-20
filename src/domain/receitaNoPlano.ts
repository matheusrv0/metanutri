// A cópia da receita dentro do item do plano (spec receitas-com-calculo, D-271 e D-273).
//
// O item de receita tem `alimentoId: ID_DE_RECEITA` e guarda a cópia em `receita`; as gramas do item são o peso da
// receita pronta servida. Tudo que calcula ou mostra a receita (totais, folha, link, Word, linha do plano) lê a cópia
// por aqui, nunca direto: a cópia pode vir estragada de dado mexido à mão (CB-273).
import { formatarQuantidadeMedida, pluralDaMedida } from './busca.ts'
import { valorDeReferencia } from './formatarQuantidade.ts'
import { OPCOES, type IngredienteReceita, type ItemPlano, type Plano, type ReceitaDoPlano } from './tipos.ts'

/** O `alimentoId` do item de receita: a TACO começa no id 1 e os produtos em 900 000. */
export const ID_DE_RECEITA = 0

/** Como a porção pode se chamar (D-271). */
export const NOMES_DA_PORCAO: readonly string[] = ['porção', 'unidade', 'fatia', 'pedaço', 'copo', 'xícara', 'colher de sopa', 'concha']

/** Meia medida que fica a até 15% do peso, como a medida caseira do alimento (`busca.ts`). */
const ERRO_MAXIMO = 0.15

const numeroValido = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function lerIngrediente(v: unknown): IngredienteReceita | null {
  if (typeof v !== 'object' || v === null) return null
  const { alimentoId, gramas } = v as Record<string, unknown>
  if (!numeroValido(alimentoId) || !Number.isInteger(alimentoId) || !numeroValido(gramas) || gramas < 0) return null
  return { alimentoId, gramas }
}

/** A cópia lida campo a campo; `null` quando falta algo ou o tipo não serve (CB-273). */
export function lerReceitaDoPlano(v: unknown): ReceitaDoPlano | null {
  if (typeof v !== 'object' || v === null) return null
  const o = v as Record<string, unknown>
  const { origemId, nome, ingredientes, porcoes, nomeDaPorcao, pesoProntoG, preparo } = o
  if (typeof origemId !== 'string' || typeof nome !== 'string' || typeof nomeDaPorcao !== 'string' || typeof preparo !== 'string') return null
  if (!Array.isArray(ingredientes) || !numeroValido(porcoes) || porcoes <= 0) return null
  if (pesoProntoG !== null && (!numeroValido(pesoProntoG) || pesoProntoG <= 0)) return null
  const lidos = ingredientes.map(lerIngrediente)
  if (lidos.some((i) => i === null)) return null
  const receita: ReceitaDoPlano = {
    origemId,
    nome,
    ingredientes: lidos.filter((i): i is IngredienteReceita => i !== null),
    porcoes,
    nomeDaPorcao,
    pesoProntoG,
    preparo,
  }
  // Sem ingrediente com gramas não há o que somar: vale como cópia estragada, com a marca † (CB-273, D-275).
  return receita.ingredientes.some((i) => i.gramas > 0) && pesoProntoDe(receita) > 0 ? receita : null
}

/** O item é de receita: tem a cópia, ou o id de receita (mesmo com a cópia estragada). */
export const ehItemDeReceita = (item: ItemPlano): boolean => item.receita !== undefined || item.alimentoId === ID_DE_RECEITA

/** A cópia do item de receita; `null` no item de alimento e na cópia estragada. */
export function receitaDoItem(item: ItemPlano): ReceitaDoPlano | null {
  return ehItemDeReceita(item) ? lerReceitaDoPlano(item.receita as unknown) : null
}

/** A soma dos pesos dos ingredientes, crus como entram na receita. */
export const somaDosIngredientes = (r: Pick<ReceitaDoPlano, 'ingredientes'>): number => r.ingredientes.reduce((soma, i) => soma + i.gramas, 0)

/** O peso da receita pronta: o informado ou, sem ele, a soma dos ingredientes (D-271). */
export const pesoProntoDe = (r: Pick<ReceitaDoPlano, 'ingredientes' | 'pesoProntoG'>): number => r.pesoProntoG ?? somaDosIngredientes(r)

/** O peso de uma porção (D-271). */
export const pesoDaPorcao = (r: Pick<ReceitaDoPlano, 'ingredientes' | 'pesoProntoG' | 'porcoes'>): number => pesoProntoDe(r) / r.porcoes

/** Quantas porções são as gramas servidas. */
export const porcoesDe = (r: ReceitaDoPlano, gramas: number): number => gramas / pesoDaPorcao(r)

/** Os ingredientes na quantidade servida: as gramas do item são uma fração da receita pronta. */
export function ingredientesNaQuantidade(r: ReceitaDoPlano, gramas: number): readonly IngredienteReceita[] {
  const fator = gramas / pesoProntoDe(r)
  return r.ingredientes.map((i) => ({ alimentoId: i.alimentoId, gramas: i.gramas * fator }))
}

/**
 * "1 unidade e meia": as porções em meias medidas, com o nome da porção (CA-873). `null` quando nenhuma meia medida
 * fica a 15% do peso servido (CB-279): a tela mostra o peso.
 */
export function textoDaPorcao(r: ReceitaDoPlano, gramas: number): string | null {
  if (!(gramas > 0)) return null
  const porcao = pesoDaPorcao(r)
  const meias = Math.max(0.5, Math.round((gramas / porcao) * 2) / 2)
  if (Math.abs(meias * porcao - gramas) / gramas > ERRO_MAXIMO) return null
  return formatarQuantidadeMedida(meias, r.nomeDaPorcao.trim() || 'porção')
}

/** "Rende 2 unidades (120 g cada)"; uma porção só: "Rende 1 porção (300 g)". */
export function textoDoRendimento(r: ReceitaDoPlano): string {
  const nome = r.nomeDaPorcao.trim() || 'porção'
  const emMeias = Math.round(r.porcoes * 2) / 2 === r.porcoes
  // CB-279: o número quebrado concorda também: "2,3 unidades", "1,4 unidade".
  const quantas = emMeias ? formatarQuantidadeMedida(r.porcoes, nome) : `${valorDeReferencia(r.porcoes)} ${r.porcoes >= 2 ? pluralDaMedida(nome) : nome}`
  const peso = `${valorDeReferencia(Math.round(pesoDaPorcao(r)))} g`
  return `Rende ${quantas} (${r.porcoes === 1 ? peso : `${peso} cada`})`
}

/** O nome que a nutricionista escreveu; vazio ou estragado, um nome que diz o que houve (CB-273). */
export function nomeDaReceita(r: ReceitaDoPlano | null): string {
  if (r === null) return 'Receita sem dados'
  return r.nome.trim() || 'Receita sem nome'
}

/**
 * As receitas do plano, cada cópia uma vez, na ordem das refeições e das opções (principal, depois os substitutos),
 * só as servidas com mais de 0 g (CA-880, CB-272). Duas cópias diferentes da mesma receita saem as duas (CB-278).
 */
export function receitasDoPlano(plano: Plano): readonly ReceitaDoPlano[] {
  const vistas = new Set<string>()
  const lista: ReceitaDoPlano[] = []
  for (const refeicao of plano.refeicoes) {
    for (const opcao of OPCOES) {
      for (const item of refeicao.opcoes[opcao]) {
        if (!(item.gramas > 0)) continue
        const receita = receitaDoItem(item)
        if (receita === null) continue
        const chave = JSON.stringify(receita)
        if (vistas.has(chave)) continue
        vistas.add(chave)
        lista.push(receita)
      }
    }
  }
  return lista
}
