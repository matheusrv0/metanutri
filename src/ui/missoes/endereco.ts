/**
 * O endereço que o paciente recebe (spec lado-do-paciente, D-1213): `<app>/p/<token>`. O app fica na raiz do endereço
 * dele (app.metanutri.com.br), e o `<base href="/">` do app faz a página abrir em qualquer caminho (DP-LP-1).
 */
export function enderecoDoPaciente(token: string): string {
  return `${globalThis.location.origin}/p/${token}`
}

/**
 * Sai do link do paciente para outra tela do app (Recuperar meu link): o caminho `/p/<token>` manda na rota, então trocar
 * só o `#` não bastaria. Um lugar só, que os testes de tela trocam (o jsdom não navega).
 */
export function irParaOApp(hash: string): void {
  globalThis.location.assign(`/${hash}`)
}

/** Abre um link lembrado no aparelho (D-1218), pelo endereço dele. */
export function abrirLink(token: string): void {
  globalThis.location.assign(`/p/${encodeURIComponent(token)}`)
}
