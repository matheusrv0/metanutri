// CA-1199 (spec textos-e-promessas, D-408): com conta, a tela da cobrança é "Conta e assinatura" e o menu fala em
// "Meus alimentos". O servidor de conta é o falso (D-233 da revisao-geral-publica): nada sai da máquina.
import { expect, test } from '@playwright/test'
import { semRolagemLateral, vigiarConsole } from '../apoio/fumaca.ts'
import { ligarServidorFalso, PERFIL_NUTRICIONISTA } from '../apoio/servidorFalso.ts'

for (const largura of [390, 1280]) {
  test(`CA-1199: Conta e assinatura em ${largura} px`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 844 })
    const erros = await vigiarConsole(page)
    await ligarServidorFalso(page, { sessao: true, perfil: PERFIL_NUTRICIONISTA })
    await page.goto('/#/conta')
    // Os avisos de primeiro acesso aparecem depois que a conta abre: fecha os que vierem, um de cada vez.
    const titulo = page.getByRole('heading', { level: 1, name: 'Conta e assinatura' })
    const aviso = page.getByRole('dialog')
    await expect(titulo.or(aviso)).toBeVisible()
    for (let vez = 0; vez < 3; vez++) {
      // O aviso pode chegar logo depois do título: dá um instante para ele aparecer antes de seguir.
      await aviso.waitFor({ state: 'visible', timeout: 2000 }).catch(() => undefined)
      if (!(await aviso.isVisible())) break
      await aviso.getByRole('button', { name: 'Entendi' }).click()
      await expect(aviso).toBeHidden()
    }
    await expect(titulo).toBeVisible()
    await expect(page.getByText('Sua assinatura', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ver preços' })).toBeVisible()
    const texto = await page.locator('body').innerText()
    expect(texto).not.toMatch(/Conta e plano|Seu plano\b|Mudar de plano|Me formei|Não consegui|Não deu para/)
    if (largura >= 1024) {
      const menu = page.getByRole('navigation', { name: 'Menu principal' })
      await expect(menu.getByText('Meus alimentos')).toBeVisible()
      await expect(menu.getByText('Conta e assinatura')).toBeVisible()
    }
    await semRolagemLateral(page)
    expect(erros).toEqual([])
  })
}
