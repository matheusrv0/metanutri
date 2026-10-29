import { expect, test } from '@playwright/test'
import { semRolagemLateral } from '../apoio/fumaca.ts'

// Spec ajustes-mobile, M-012 e D-804: o cabeçalho fixo das páginas do site (Preços, Termos, Privacidade e Referências)
// não passa de 15% da altura de um celular de 360 × 740. No celular ele fica numa linha, como a barra da landing: a
// logo, "Entrar" e "Começar grátis", com 44 px de toque; "Como funciona" e "Preços" seguem no rodapé.

test.use({ reducedMotion: 'reduce' })

const PAGINAS = ['/precos/', '/termos/', '/privacidade/', '/fontes/'] as const
const ALTURA = 740

for (const largura of [360, 390, 412]) {
  for (const endereco of PAGINAS) {
    test(`M-012: em ${largura} px, o cabeçalho de ${endereco} fica numa linha, abaixo de 15% da tela`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: ALTURA })
      await page.goto(endereco)
      const topo = page.getByRole('banner')
      await expect(topo).toBeVisible()
      // Rolada, a página continua com o cabeçalho preso no alto; a medida é a dele ali.
      await page.evaluate(() => window.scrollTo(0, 600))
      const caixa = await topo.boundingBox()
      expect(caixa?.y ?? -1).toBeLessThanOrEqual(1)
      expect(caixa?.height ?? 999, 'cabeçalho alto demais').toBeLessThanOrEqual(ALTURA * 0.15)
      for (const nome of ['MetaNutri, início', 'Entrar', 'Começar grátis']) {
        const link = topo.getByRole('link', { name: nome })
        await expect(link).toBeVisible()
        const c = await link.boundingBox()
        expect(c?.height ?? 0, `${nome}: toque`).toBeGreaterThanOrEqual(44)
        expect((c?.x ?? 0) + (c?.width ?? 0), `${nome}: fora da tela`).toBeLessThanOrEqual(largura)
      }
      // As seções continuam a um toque, no rodapé.
      const rodape = page.getByRole('contentinfo')
      await expect(rodape.getByRole('link', { name: 'Como funciona' })).toBeAttached()
      await expect(rodape.getByRole('link', { name: 'Preços' })).toBeAttached()
      await semRolagemLateral(page)
    })
  }
}

test('M-012: em 768 px, o cabeçalho continua com as seções numa linha só', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/termos/')
  const topo = page.getByRole('banner')
  await expect(topo.getByRole('navigation', { name: 'Seções' })).toBeVisible()
  expect((await topo.boundingBox())?.height ?? 999).toBeLessThanOrEqual(1024 * 0.15)
})
