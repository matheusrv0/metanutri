// D-99: o MetaNutri não abre dentro de outro site (moldura, iframe). Quem confere é o
// próprio app, antes de montar (src/main.tsx). O link do aviso é o do app (spec separacao-site-app, CA-1420).

/** A janela não é a de cima: o site foi aberto dentro de outro. Sem como olhar, conta como moldura. */
export function estaEmMoldura(janela: { readonly top: unknown; readonly self: unknown }): boolean {
  try {
    return janela.top !== janela.self
  } catch {
    return true
  }
}
