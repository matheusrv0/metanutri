// Operações imutáveis sobre o plano (SPEC CA-12, CA-13, CA-14, CB-04).
import { ID_DE_RECEITA } from './receitaNoPlano.ts'
import type { ItemPlano, MedidaDoItem, OpcaoId, Plano, ReceitaDoPlano, Refeicao } from './tipos.ts'

export type GerarId = () => string

export const REFEICOES_PADRAO: readonly { readonly horario: string; readonly nome: string }[] = [
  { horario: '06:00', nome: 'Desjejum' },
  { horario: '09:00', nome: 'Lanche da manhã' },
  { horario: '12:00', nome: 'Almoço' },
  { horario: '16:00', nome: 'Lanche da tarde' },
  { horario: '19:00', nome: 'Jantar' },
  { horario: '21:00', nome: 'Ceia' },
]

const HORARIO = /^([01]\d|2[0-3]):[0-5]\d$/

function validarHorario(horario: string) {
  if (!HORARIO.test(horario)) throw new Error(`Horário "${horario}" inválido: use HH:MM entre 00:00 e 23:59.`)
}

function validarNome(nome: string): string {
  const limpo = nome.trim()
  if (limpo === '') throw new Error('A refeição precisa de um nome.')
  return limpo
}

function validarGramas(gramas: number) {
  if (!Number.isFinite(gramas) || gramas < 0) throw new RangeError(`Quantidade inválida: ${gramas} g.`)
}

const ordenar = (refeicoes: readonly Refeicao[]): Refeicao[] =>
  [...refeicoes].sort((a, b) => a.horario.localeCompare(b.horario))

function novaRefeicao(nome: string, horario: string, gerarId: GerarId): Refeicao {
  return { id: gerarId(), nome, horario, opcoes: { principal: [], substituto1: [], substituto2: [] } }
}

export function criarPlanoPadrao(gerarId: GerarId): Plano {
  return { refeicoes: REFEICOES_PADRAO.map((r) => novaRefeicao(r.nome, r.horario, gerarId)) }
}

function alterarRefeicao(plano: Plano, refeicaoId: string, alterar: (r: Refeicao) => Refeicao): Plano {
  if (!plano.refeicoes.some((r) => r.id === refeicaoId)) throw new Error(`Refeição ${refeicaoId} não existe no plano.`)
  return { refeicoes: plano.refeicoes.map((r) => (r.id === refeicaoId ? alterar(r) : r)) }
}

export function adicionarRefeicao(plano: Plano, dados: { readonly nome: string; readonly horario: string }, gerarId: GerarId): Plano {
  validarHorario(dados.horario)
  return { refeicoes: ordenar([...plano.refeicoes, novaRefeicao(validarNome(dados.nome), dados.horario, gerarId)]) }
}

export function removerRefeicao(plano: Plano, refeicaoId: string): Plano {
  if (!plano.refeicoes.some((r) => r.id === refeicaoId)) throw new Error(`Refeição ${refeicaoId} não existe no plano.`)
  return { refeicoes: plano.refeicoes.filter((r) => r.id !== refeicaoId) }
}

export function renomearRefeicao(plano: Plano, refeicaoId: string, nome: string): Plano {
  const limpo = validarNome(nome)
  return alterarRefeicao(plano, refeicaoId, (r) => ({ ...r, nome: limpo }))
}

export function mudarHorario(plano: Plano, refeicaoId: string, horario: string): Plano {
  validarHorario(horario)
  return { refeicoes: ordenar(alterarRefeicao(plano, refeicaoId, (r) => ({ ...r, horario })).refeicoes) }
}

function alterarOpcao(plano: Plano, refeicaoId: string, opcao: OpcaoId, alterar: (itens: readonly ItemPlano[]) => readonly ItemPlano[]): Plano {
  return alterarRefeicao(plano, refeicaoId, (r) => ({ ...r, opcoes: { ...r.opcoes, [opcao]: alterar(r.opcoes[opcao]) } }))
}

/**
 * Põe um alimento na opção. Com `medida`, o item guarda a medida escolhida (spec alimentos-e-gramaturas, G1); `null`
 * marca "só gramas"; sem o campo, vale a medida automática.
 */
export function adicionarItem(
  plano: Plano,
  refeicaoId: string,
  opcao: OpcaoId,
  dados: { readonly alimentoId: number; readonly gramas: number; readonly medida?: MedidaDoItem | null | undefined },
  gerarId: GerarId,
): Plano {
  validarGramas(dados.gramas)
  const item: ItemPlano = {
    id: gerarId(),
    alimentoId: dados.alimentoId,
    gramas: dados.gramas,
    ...(dados.medida === undefined ? {} : { medida: dados.medida === null ? null : { ...dados.medida } }),
  }
  return alterarOpcao(plano, refeicaoId, opcao, (itens) => [...itens, item])
}

/**
 * Spec receitas-com-calculo, D-273: a receita entra no plano como cópia. As gramas são o peso da receita pronta servida.
 */
export function adicionarReceita(
  plano: Plano,
  refeicaoId: string,
  opcao: OpcaoId,
  dados: { readonly receita: ReceitaDoPlano; readonly gramas: number },
  gerarId: GerarId,
): Plano {
  validarGramas(dados.gramas)
  return alterarOpcao(plano, refeicaoId, opcao, (itens) => [...itens, { id: gerarId(), alimentoId: ID_DE_RECEITA, gramas: dados.gramas, receita: dados.receita }])
}

function exigirItem(itens: readonly ItemPlano[], itemId: string) {
  if (!itens.some((i) => i.id === itemId)) throw new Error(`Item ${itemId} não existe nesta opção.`)
}

/**
 * Muda os gramas. Com medida escolhida, a quantidade dela passa a ser gramas ÷ peso da medida (G2): o peso nunca muda
 * sozinho, e a medida fica aproximada quando não fecha em meia medida (D-374).
 */
export function atualizarGramas(plano: Plano, refeicaoId: string, opcao: OpcaoId, itemId: string, gramas: number): Plano {
  validarGramas(gramas)
  return alterarOpcao(plano, refeicaoId, opcao, (itens) => {
    exigirItem(itens, itemId)
    return itens.map((i) => {
      if (i.id !== itemId) return i
      const medida = i.medida
      if (!medida || !(medida.gramasPorMedida > 0)) return { ...i, gramas }
      return { ...i, gramas, medida: { ...medida, quantidade: Math.round((gramas / medida.gramasPorMedida) * 1000) / 1000 } }
    })
  })
}

/**
 * Escolhe a medida do item (G2 e G3): com uma medida, os gramas viram quantidade × peso; com `null` ("só gramas"), os
 * gramas ficam.
 */
export function escolherMedida(plano: Plano, refeicaoId: string, opcao: OpcaoId, itemId: string, medida: MedidaDoItem | null): Plano {
  const gramas = medida === null ? null : Math.round(medida.quantidade * medida.gramasPorMedida * 10) / 10
  if (gramas !== null) validarGramas(gramas)
  return alterarOpcao(plano, refeicaoId, opcao, (itens) => {
    exigirItem(itens, itemId)
    return itens.map((i) => (i.id === itemId ? { ...i, medida: medida === null ? null : { ...medida }, ...(gramas === null ? {} : { gramas }) } : i))
  })
}

export function removerItem(plano: Plano, refeicaoId: string, opcao: OpcaoId, itemId: string): Plano {
  return alterarOpcao(plano, refeicaoId, opcao, (itens) => {
    exigirItem(itens, itemId)
    return itens.filter((i) => i.id !== itemId)
  })
}
