// Operações imutáveis sobre o plano (SPEC CA-12, CA-13, CA-14, CB-04).
import type { ItemPlano, OpcaoId, Plano, Refeicao } from './tipos.ts'

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

export function adicionarItem(
  plano: Plano,
  refeicaoId: string,
  opcao: OpcaoId,
  dados: { readonly alimentoId: number; readonly gramas: number },
  gerarId: GerarId,
): Plano {
  validarGramas(dados.gramas)
  return alterarOpcao(plano, refeicaoId, opcao, (itens) => [...itens, { id: gerarId(), alimentoId: dados.alimentoId, gramas: dados.gramas }])
}

function exigirItem(itens: readonly ItemPlano[], itemId: string) {
  if (!itens.some((i) => i.id === itemId)) throw new Error(`Item ${itemId} não existe nesta opção.`)
}

export function atualizarGramas(plano: Plano, refeicaoId: string, opcao: OpcaoId, itemId: string, gramas: number): Plano {
  validarGramas(gramas)
  return alterarOpcao(plano, refeicaoId, opcao, (itens) => {
    exigirItem(itens, itemId)
    return itens.map((i) => (i.id === itemId ? { ...i, gramas } : i))
  })
}

export function removerItem(plano: Plano, refeicaoId: string, opcao: OpcaoId, itemId: string): Plano {
  return alterarOpcao(plano, refeicaoId, opcao, (itens) => {
    exigirItem(itens, itemId)
    return itens.filter((i) => i.id !== itemId)
  })
}
