// Pedido de exames de laboratório (spec anamnese-e-prescricoes, D-169).
//
// Uma lista para marcar e um campo livre. Nada vem marcado sozinho (D-164). Fica só o pedido atual de cada
// paciente, dentro da ficha dele.

export interface Exame {
  readonly id: string
  readonly nome: string
}

/** Seção 3 da spec. Os ids são estáveis: o pedido guardado aponta para eles. */
export const EXAMES: readonly Exame[] = [
  { id: 'hemograma', nome: 'Hemograma completo' },
  { id: 'ferritina', nome: 'Ferritina' },
  { id: 'vitamina-d', nome: 'Vitamina D (25-OH)' },
  { id: 'vitamina-b12', nome: 'Vitamina B12' },
  { id: 'glicemia', nome: 'Glicemia de jejum' },
  { id: 'hba1c', nome: 'Hemoglobina glicada (HbA1c)' },
  { id: 'perfil-lipidico', nome: 'Perfil lipídico' },
  { id: 'tsh', nome: 'TSH' },
  { id: 'creatinina', nome: 'Creatinina' },
  { id: 'tgo-tgp', nome: 'TGO e TGP' },
]

export interface PedidoExames {
  /** Ids de `EXAMES` marcados. */
  readonly marcados: readonly string[]
  /** "Outros exames", um por linha. */
  readonly outros: string
}

export const PEDIDO_VAZIO: PedidoExames = { marcados: [], outros: '' }

/**
 * CA-588: dado estragado vira vazio; id repetido sai. CA-589: id que esta versão não conhece e campo a mais ficam
 * guardados; só a tela e a folha os deixam de fora.
 */
export function normalizarPedido(valor: unknown): PedidoExames {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return PEDIDO_VAZIO
  const o = valor as Record<string, unknown>
  const lista = Array.isArray(o['marcados']) ? o['marcados'].filter((id): id is string => typeof id === 'string') : []
  return { ...o, marcados: [...new Set(lista)], outros: typeof o['outros'] === 'string' ? o['outros'] : '' }
}
export function marcarExame(pedido: PedidoExames, id: string, marcado: boolean): PedidoExames {
  const sem = pedido.marcados.filter((m) => m !== id)
  return { ...pedido, marcados: marcado ? [...sem, id] : sem }
}

/** CA-580 e CB-169: os marcados na ordem da lista, depois cada linha de "Outros exames" que não está em branco. */
export function linhasDoPedido(pedido: PedidoExames): string[] {
  const marcados = new Set(pedido.marcados)
  const daLista = EXAMES.filter((e) => marcados.has(e.id)).map((e) => e.nome)
  const outros = pedido.outros
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => linha !== '')
  return [...daLista, ...outros]
}

/** CA-581: nada para pedir. */
export const pedidoVazio = (pedido: PedidoExames): boolean => linhasDoPedido(pedido).length === 0
