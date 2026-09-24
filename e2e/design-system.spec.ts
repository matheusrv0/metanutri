import { expect, test, type Page } from '@playwright/test'

/**
 * A vitrine da biblioteca precisa abrir e desenhar os 25 componentes nos dois temas.
 * Se este teste cair, ou um componente saiu do índice ou um token parou de resolver.
 */

const SECOES = [
  'Button',
  'Input · Label · Textarea · Select · Switch',
  'Card',
  'Badge',
  'Alert',
  'Progress · Separator',
  'Table',
  'Tooltip · Icon',
  'Fontes',
  'Dialog · Sheet · DropdownMenu',
  'Tabs · ItemMenu · EtapasDoCaso',
  'CartaoDestaque',
  'BarraAdequacao',
  'MedidorMacro',
]

const abrirVitrine = async (pagina: Page) => {
  await pagina.goto('/#/design-system')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.goto('/#/design-system')
  // O aviso de primeiro acesso cobre a tela; some com ele antes de olhar a vitrine.
  const boasVindas = pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  if (await boasVindas.isVisible().catch(() => false)) {
    await boasVindas.getByRole('button', { name: 'Entendi' }).click()
  }
}

/** Lê a cor de fundo da página resolvida pelo navegador, já com os tokens aplicados. */
const fundoDaPagina = (pagina: Page) => pagina.evaluate(() => getComputedStyle(document.body).backgroundColor)

test('a vitrine desenha a biblioteca inteira', async ({ page }) => {
  await abrirVitrine(page)

  await expect(page.getByRole('heading', { name: 'Biblioteca do design system' })).toBeVisible()

  for (const secao of SECOES) {
    await expect(page.getByRole('region', { name: secao })).toBeVisible()
  }

  // Estados do botão que o contrato exige
  const botoes = page.getByRole('region', { name: 'Button' })
  await expect(botoes.getByRole('button', { name: 'Desativado' })).toBeDisabled()
  await expect(botoes.getByRole('button', { name: 'Exportando' })).toHaveAttribute('aria-busy', 'true')
  // Pílula: o raio do botão vem de --radius-pill, não da escala de cartão.
  await expect(botoes.getByRole('button', { name: 'Repouso' })).toHaveCSS('border-radius', '3.35544e+07px')

  // "Sem dado" é hachura, nunca zero
  await expect(page.getByRole('region', { name: 'BarraAdequacao' })).toContainText('Não analisado')
})

test('a vitrine troca de tema e os tokens acompanham', async ({ page }) => {
  await abrirVitrine(page)

  // A barra lateral tem outro seletor de tema ("Aparência"): use o da vitrine.
  const seletor = page.getByRole('radiogroup', { name: 'Tema' })

  await seletor.getByRole('radio', { name: 'Claro' }).click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  const claro = await fundoDaPagina(page)

  await seletor.getByRole('radio', { name: 'Escuro' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  const escuro = await fundoDaPagina(page)

  expect(claro).not.toBe(escuro)
  // O claro é a mesa cinza do sistema (--bg-page) e o escuro é o forest quase preto.
  expect(claro).toBe('rgb(241, 241, 241)')
  expect(escuro).toBe('rgb(10, 22, 19)')
})
