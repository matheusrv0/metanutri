// Spec site-publico-profissional, com o servidor de conta ligado (falso, D-233), como no site no ar.
import { expect, test } from '@playwright/test'
import { ligarServidorFalso, PERFIL_NUTRICIONISTA } from '../apoio/servidorFalso.ts'

test('CA-1023: a raiz sem sessão abre a landing em #/inicio, sem "Carregando…" em nenhum quadro', async ({ page }) => {
  await ligarServidorFalso(page)
  // Anota qualquer quadro com "Carregando…", do primeiro nó escrito até a landing do app montar.
  await page.addInitScript(() => {
    const janela = window as unknown as { viuCarregando: boolean }
    janela.viuCarregando = false
    new MutationObserver(() => {
      if (document.body?.textContent?.includes('Carregando…')) janela.viuCarregando = true
    }).observe(document, { childList: true, subtree: true, characterData: true })
  })
  await page.goto('/')
  await expect(page).toHaveURL(/\/#\/inicio$/)
  await expect(page.locator('[data-vitrine]')).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Faltou cálcio\?/)
  expect(await page.evaluate(() => (window as unknown as { viuCarregando: boolean }).viuCarregando)).toBe(false)
})

test('CA-1023: com sessão guardada, a raiz continua indo para o painel', async ({ page }) => {
  await ligarServidorFalso(page, { sessao: true, perfil: PERFIL_NUTRICIONISTA })
  await page.goto('/')
  await expect(page).not.toHaveURL(/#\/inicio$/)
  await expect(page.locator('[data-vitrine]')).toHaveCount(0)
})
