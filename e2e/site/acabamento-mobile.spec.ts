import { expect, test, type Locator } from '@playwright/test'

// Spec ajustes-mobile, acabamento (29/10/2026): o site no celular e no tablet de toque. D-802: 44 px de toque em toda
// largura de toque; M-021: nada de letra de 11 px.

test.use({ reducedMotion: 'reduce' })

/** A área que, tocada, cai no elemento: varre a linha e a coluna do centro (como em revisao-geral-trabalho.spec.ts). */
const areaDeToque = async (alvo: Locator) => {
  await alvo.scrollIntoViewIfNeeded()
  return alvo.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const cx = r.left + Math.min(r.width / 2, 20)
    const cy = r.top + r.height / 2
    const acerta = (x: number, y: number) => {
      const achado = document.elementFromPoint(x, y)
      return achado !== null && (el === achado || el.contains(achado))
    }
    let altura = 0
    for (let y = Math.floor(cy - 40); y <= cy + 40; y += 1) if (acerta(cx, y)) altura += 1
    return { altura }
  })
}

for (const largura of [360, 768]) {
  test.describe(`Preços em ${largura} px, com toque`, () => {
    test.use({ viewport: { width: largura, height: 900 }, hasTouch: true })

    test('o e-mail de contato tem 44 px de toque, e o selo "Recomendado" tem letra de 12 px', async ({ page }) => {
      await page.goto('/precos/?destaque=pro')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const email = page.getByRole('note', { name: 'Plano Clínica' }).getByRole('link')
      expect((await areaDeToque(email)).altura, 'toque do e-mail').toBeGreaterThanOrEqual(44)
      const selo = page.getByText('Recomendado', { exact: true }).filter({ visible: true }).first()
      expect(await selo.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(12)
    })

    test('M-018: os itens do topo do site têm 44 px', async ({ page }) => {
      await page.goto('/precos/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const itens = await page.locator('header').getByRole('link').filter({ visible: true }).all()
      expect(itens.length).toBeGreaterThan(0)
      for (const item of itens) {
        const c = await item.boundingBox()
        expect(c?.height ?? 0, (await item.getAttribute('aria-label')) ?? (await item.textContent()) ?? '').toBeGreaterThanOrEqual(44)
      }
    })
  })
}
