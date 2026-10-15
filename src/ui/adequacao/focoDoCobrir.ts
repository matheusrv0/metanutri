// Para onde vai o foco quando a gaveta do Cobrir fecha (spec painel-lateral-enxuto, D-212). A gaveta abre por estado,
// sem gatilho próprio, então quem decide é a tela que abriu: o cartão da etapa 2 ou a etapa 3.

/** Marca cada botão "Cobrir" com a chave do nutriente. */
export const ATRIBUTO_COBRIR = 'data-cobrir'

function botoesCobrir(conteiner: ParentNode | null): readonly HTMLElement[] {
  return conteiner ? [...conteiner.querySelectorAll<HTMLElement>(`[${ATRIBUTO_COBRIR}]`)] : []
}

/** As chaves dos Cobrir dentro do contêiner, na ordem da tela. */
export function chavesDosCobrir(conteiner: ParentNode | null): readonly string[] {
  return botoesCobrir(conteiner).map((b) => b.getAttribute(ATRIBUTO_COBRIR) ?? '')
}

/**
 * O Cobrir que abriu a gaveta, se continua na tela. Se sumiu (o nutriente chegou à meta), o Cobrir do próximo que
 * estava abaixo dele quando a gaveta abriu; a lista se reordena com o plano novo, então vale a ordem da abertura. Sem
 * próximo, o título.
 */
export function destinoDoFoco(conteiner: ParentNode | null, ordemAoAbrir: readonly string[], chave: string, titulo: HTMLElement | null): HTMLElement | null {
  const agora = new Map(botoesCobrir(conteiner).map((b) => [b.getAttribute(ATRIBUTO_COBRIR), b]))
  const posicao = ordemAoAbrir.indexOf(chave)
  for (const candidata of [chave, ...ordemAoAbrir.slice(posicao + 1)]) {
    const botao = agora.get(candidata)
    if (botao) return botao
  }
  return titulo
}
