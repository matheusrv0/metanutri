import { expect, test } from '@playwright/test'
import { ligarServidorFalso } from '../apoio/servidorFalso.ts'

// Spec ajustes-mobile, acabamento (29/10/2026): o "Entrar" de Criar conta, um link de uma palavra só, tinha 41 px de
// largura (D-802: 44 × 44 de toque).

for (const largura of [360, 768]) {
  test.describe(`Criar conta em ${largura} px, com toque`, () => {
    test.use({ viewport: { width: largura, height: 900 }, hasTouch: true, reducedMotion: 'reduce' })

    test('M-018: "Já tem conta? Entrar" tem 44 × 44 px', async ({ page }) => {
      await ligarServidorFalso(page)
      await page.goto('/#/criar-conta')
      const entrar = page.getByRole('button', { name: 'Entrar', exact: true })
      await entrar.scrollIntoViewIfNeeded()
      const c = await entrar.boundingBox()
      expect(c?.width ?? 0, 'largura').toBeGreaterThanOrEqual(44)
      expect(c?.height ?? 0, 'altura').toBeGreaterThanOrEqual(44)
    })
  })
}
