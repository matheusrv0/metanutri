import { expect, test } from '@playwright/test'

// Spec exclusao-de-conta. Os testes de navegador rodam sem servidor de conta (playwright.config.ts): aqui se confere o
// que não depende dele. A exclusão de verdade roda contra o Supabase local (testes/seguranca/exclusao.test.ts).
test.describe('Excluir a conta (spec exclusao-de-conta)', () => {
  test('CA-800: sem servidor de conta (modo local), Conta e assinatura não oferece excluir', async ({ page }) => {
    await page.goto('/#/conta')
    // Num navegador novo, o aviso de primeiro acesso (CA-51) abre por cima.
    await page.getByRole('button', { name: 'Entendi' }).click()
    await expect(page.getByText('Sua conta', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Excluir conta' })).toHaveCount(0)
  })

  // Spec separacao-site-app, DP-SA-49: a saída leva a Entrar do app (D-504), e o aviso fica no alto dela.
  test('CA-808: depois de excluir, Entrar mostra "Sua conta foi excluída." no topo, uma vez só', async ({ page }) => {
    // O que a exclusão deixa antes de recarregar (src/ui/contaExcluida.ts); só na primeira abertura.
    await page.addInitScript(() => {
      if (localStorage.getItem('teste:aviso-posto')) return
      localStorage.setItem('teste:aviso-posto', '1')
      sessionStorage.setItem('metanutri:conta-excluida', '1')
    })
    await page.goto('/#/entrar')
    const aviso = page.getByRole('status').filter({ hasText: 'Sua conta foi excluída.' })
    await expect(aviso).toBeVisible()
    const caixa = await aviso.boundingBox()
    const titulo = await page.getByRole('heading', { level: 1 }).boundingBox()
    expect(caixa && titulo ? caixa.y < titulo.y : false).toBe(true)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Sua conta foi excluída.')).toHaveCount(0)
  })
})
