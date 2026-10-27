// Os critérios da revisão geral das telas públicas que só se conferem no navegador (spec revisao-geral-publica), nas
// páginas do site (spec separacao-site-app, DP-SA-42). As telas de conta e o link do paciente ficam no app, em
// e2e/servidor-falso/revisao.spec.ts.
import { expect, test, type Locator } from '@playwright/test'
import { semRolagemLateral } from '../apoio/fumaca.ts'

// I-1 (revisão de 20/10/2026): sem a entrada animada de Preços, as posições não mudam no meio da medida.
test.use({ reducedMotion: 'reduce' })

async function caixa(alvo: Locator) {
  const c = await alvo.boundingBox()
  if (!c) throw new Error('sem caixa')
  return c
}

interface Retangulo {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** I-1: os retângulos de vários elementos medidos num só `evaluate`, no mesmo quadro. */
async function retangulos(...alvos: readonly Locator[]): Promise<readonly Retangulo[]> {
  const primeiro = alvos[0]
  if (!primeiro) return []
  const elementos = await Promise.all(
    alvos.map(async (alvo) => {
      const elemento = await alvo.elementHandle()
      if (!elemento) throw new Error('sem elemento')
      return elemento
    }),
  )
  return primeiro.page().evaluate(
    (lista) =>
      lista.map((el) => {
        const r = el.getBoundingClientRect()
        return { x: r.x, y: r.y, width: r.width, height: r.height }
      }),
    elementos,
  )
}

// Spec landing-escura (D-545): a landing tem barra e rodapé próprios; o rodapé e o topo comuns são os das outras páginas
// do site, conferidos aqui nos Termos.
test.describe('Rodapé e topo públicos (D-235)', () => {
  for (const largura of [360, 390, 768, 1024, 1280]) {
    test(`CA-740 e CA-992: em ${largura} px, o rodapé só tem links, sem "·" solto nem fontes técnicas`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 800 })
      await page.goto('/termos/')
      const rodape = page.getByRole('contentinfo')
      const texto = await rodape.innerText()
      expect(texto).not.toContain('·')
      expect(texto).not.toMatch(/Fontes dos dados|NASEM|SISVAN|conferidos|8\.234/)
      await expect(rodape.getByRole('heading')).toHaveText(['Produto', 'Conta', 'Legal'])
      await semRolagemLateral(page)
    })
  }

  for (const largura of [768, 1280]) {
    test(`M-1 (CA-741): em ${largura} px, "Referências" (antes "Fontes da base") continua com 44 px`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 800 })
      await page.goto('/termos/')
      expect((await caixa(page.getByRole('contentinfo').getByRole('link', { name: 'Referências' }))).height).toBeGreaterThanOrEqual(44)
    })
  }

  test('CA-741: em 390 px, a logo e os links do rodapé têm 44 px, e o link que quebra fica à esquerda', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await page.goto('/termos/')
    expect((await caixa(page.getByRole('banner').getByRole('link', { name: 'MetaNutri, início' }))).height).toBeGreaterThanOrEqual(44)
    // CA-1028: os itens do rodapé são links (7 e o do e-mail; Recursos saiu com a landing escura).
    const links = page.getByRole('contentinfo').getByRole('link')
    expect(await links.count()).toBe(8)
    for (const link of await links.all()) {
      expect((await caixa(link)).height, await link.innerText()).toBeGreaterThanOrEqual(44)
      expect(await link.evaluate((el) => getComputedStyle(el).textAlign)).toBe('left')
    }
  })
})

test('D-235 (A-23): em 700 px, Entrar e Começar grátis ficam na linha da logo, e o menu na de baixo', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 800 })
  await page.goto('/termos/')
  const topo = page.getByRole('banner')
  const [logo, comecar, menu] = await retangulos(
    topo.getByRole('link', { name: 'MetaNutri, início' }),
    topo.getByRole('link', { name: 'Começar grátis' }),
    topo.getByRole('navigation', { name: 'Seções' }),
  )
  if (!logo || !comecar || !menu) throw new Error('sem medida')
  expect(Math.abs(comecar.y + comecar.height / 2 - (logo.y + logo.height / 2))).toBeLessThan(4)
  expect(menu.y).toBeGreaterThan(logo.y + logo.height - 1)
})

test.describe('Preços (D-234)', () => {
  test('D-234 (A-24): em 768 px, os cartões da mesma linha têm a mesma altura', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 800 })
    await page.goto('/precos/')
    const [free, solo] = await retangulos(page.getByRole('region', { name: 'Plano Free' }), page.getByRole('region', { name: 'Plano Solo' }))
    if (!free || !solo) throw new Error('sem medida')
    expect(Math.abs(free.y - solo.y)).toBeLessThan(1)
    expect(Math.abs(free.height - solo.height)).toBeLessThan(1)
  })

  for (const largura of [360, 390, 640, 768, 1023]) {
    test(`CA-742: em ${largura} px, os planos em cartões e sem rolar para o lado`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 800 })
      await page.goto('/precos/')
      // D-406 (spec textos-e-promessas): o último cartão é o Pro; a Clínica é uma nota de contato embaixo.
      await expect(page.getByRole('region', { name: 'Plano Pro' })).toBeVisible()
      await expect(page.getByRole('note', { name: 'Plano Clínica' }).filter({ visible: true })).toHaveCount(1)
      await expect(page.getByRole('table')).toBeHidden()
      await semRolagemLateral(page)
    })
  }

  for (const largura of [1024, 1280]) {
    test(`CA-742: em ${largura} px, a tabela comparativa inteira, sem rolar para o lado`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 800 })
      await page.goto('/precos/')
      await expect(page.getByRole('table')).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /^Pro/ })).toBeInViewport()
      await semRolagemLateral(page)
    })
  }

  test('CA-743: um h1 só e, em 390 px, Mensal e Anual com 44 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await page.goto('/precos/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Planos e preços')
    for (const opcao of await page.getByRole('radiogroup', { name: 'Período de cobrança' }).getByRole('radio').all()) {
      expect((await caixa(opcao)).height).toBeGreaterThanOrEqual(44)
    }
  })
})
