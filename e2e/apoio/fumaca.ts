// O teste de fumaça das telas públicas (spec revisao-geral-publica, CA-758): a tela abre com o título certo, a página
// não rola para o lado, o console fica sem erro e a ação principal está à vista.
import { expect, type Locator, type Page } from '@playwright/test'

export const LARGURAS_DA_FUMACA = [390, 1280] as const

/** Vigia o console desde antes do `goto`: erro de script, erro da página e violação da regra de conteúdo (CSP). */
export async function vigiarConsole(pagina: Page): Promise<string[]> {
  const erros: string[] = []
  pagina.on('console', (mensagem) => {
    if (mensagem.type() === 'error') erros.push(mensagem.text())
  })
  pagina.on('pageerror', (erro) => erros.push(erro.message))
  await pagina.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (evento) => {
      console.error(`Violação da Content-Security-Policy: ${evento.effectiveDirective} bloqueou ${evento.blockedURI}`)
    })
  })
  return erros
}

export async function semRolagemLateral(pagina: Page): Promise<void> {
  const larguras = await pagina.evaluate(() => ({ documento: document.documentElement.scrollWidth, janela: window.innerWidth }))
  expect(larguras.documento, 'a página rola para o lado').toBeLessThanOrEqual(larguras.janela)
}

interface Fumaca {
  readonly titulo: string | RegExp
  /** A ação principal da tela: precisa estar à vista (rolando até ela, se for preciso). */
  readonly acao: (pagina: Page) => Locator
}

/** Confere a tela já aberta: título, rolagem, ação principal e console. */
export async function conferirFumaca(pagina: Page, erros: readonly string[], { titulo, acao }: Fumaca): Promise<void> {
  await expect(pagina.getByRole('heading', { level: 1, name: titulo })).toBeVisible()
  await semRolagemLateral(pagina)
  const principal = acao(pagina)
  await principal.scrollIntoViewIfNeeded()
  await expect(principal).toBeVisible()
  expect(erros, 'erro no console').toEqual([])
}
