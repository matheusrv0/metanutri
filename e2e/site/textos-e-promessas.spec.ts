// Spec textos-e-promessas: o texto novo no navegador e no HTML publicado do site (CA-1198). O nome do paciente no plano
// impresso e no link (CA-1193) é do app: e2e/textos-e-promessas.spec.ts.
import { expect, test, type Page } from '@playwright/test'
import { semRolagemLateral, vigiarConsole } from '../apoio/fumaca.ts'

/** Os termos que a revisão de texto tirou (D-416): nenhum aparece na vitrine. */
const PROIBIDO =
  /Não consegui|Não deu para|Conta e plano|Painel do gestor|presos à|Ver planos|Dieta para imprimir|Meus produtos|Grátis na faculdade|Não dá para desfazer|Cinco minutos|597 alimentos|folha do paciente|Comece pelo Free|até 4 nutricionistas|Painel de micros|Relatório de adesão/i
const TEMAS = ['claro', 'escuro'] as const

async function abrir(pagina: Page, endereco: string, tema: (typeof TEMAS)[number]) {
  await pagina.addInitScript((t) => localStorage.setItem('metanutri:tema', t), tema)
  await pagina.goto(endereco)
  await expect(pagina.locator('[data-vitrine]')).toHaveCount(0)
}

test.describe('CA-1198: landing e Preços com o texto novo, em 390 e 1280 px, claro e escuro', () => {
  for (const largura of [390, 1280]) {
    for (const tema of TEMAS) {
      test(`landing em ${largura} px, tema ${tema}`, async ({ page }) => {
        await page.setViewportSize({ width: largura, height: 844 })
        const erros = await vigiarConsole(page)
        await abrir(page, '/', tema)
        // Spec landing-v3, seção v9 (CA-1652, CA-1676 e CA-1685): o texto da landing, nos dois temas do app.
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Planos alimentares completos em vitaminas e minerais')
        await expect(page.getByText(/^O MetaNutri calcula a adequação de 20 vitaminas e minerais/)).toBeVisible()
        await expect(page.getByRole('button', { name: /^Cálcio/ })).toHaveAttribute('aria-pressed', 'true')
        const precos = page.getByRole('region', { name: 'Planos e preços' })
        for (const plano of ['Free', 'Solo', 'Pro', 'Estudante', 'Clínica']) await expect(precos.getByRole('heading', { name: plano, exact: true })).toBeVisible()
        await expect(precos.getByRole('button', { name: 'Assinar o Solo' })).toBeVisible()
        await expect(page.getByRole('link', { name: /Crie sua conta e monte o primeiro plano hoje, sem cartão de crédito\./ })).toBeVisible()
        expect(await page.locator('body').innerText()).not.toMatch(PROIBIDO)
        await semRolagemLateral(page)
        expect(erros).toEqual([])
      })

      test(`Preços em ${largura} px, tema ${tema}`, async ({ page }) => {
        await page.setViewportSize({ width: largura, height: 844 })
        await abrir(page, '/precos/', tema)
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Planos e preços')
        await expect(page.getByText('Todas as assinaturas têm as mesmas funções. O que muda é quantos pacientes ativos você acompanha.')).toBeVisible()
        const clinica = page.getByRole('note', { name: 'Plano Clínica' }).filter({ visible: true })
        await expect(clinica).toContainText('Clínica com mais de um nutricionista:')
        expect(await page.locator('body').innerText()).not.toMatch(PROIBIDO)
        expect(await page.locator('body').innerText()).not.toMatch(/R\$\s*149|Suporte/)
        await semRolagemLateral(page)
      })
    }
  }
})

test('CA-1198: o HTML publicado já traz o texto novo, sem o cartão de alimentos nem a Clínica a R$ 149', async ({ request }) => {
  const inicio = await (await request.get('/')).text()
  const raiz = inicio.slice(inicio.indexOf('<div id="root">'))
  // Spec landing-v3, seção v9 (CA-1692): a landing v9, pré-desenhada.
  for (const trecho of ['Adequação de micronutrientes com sugestão do que comer', 'Funcionalidades', 'Todos os planos incluem todas as funcionalidades', 'Perguntas frequentes']) {
    expect(raiz).toContain(trecho)
  }
  expect(raiz).not.toMatch(/597|Comece pelo Free|folha do paciente/)
  const precos = await (await request.get('/precos/')).text()
  expect(precos).toContain('Planos e preços')
  expect(precos).toContain('Clínica com mais de um nutricionista')
  expect(precos).not.toMatch(/R\$ 149|149\.00|Painel do gestor/)
  expect(await (await request.get('/llms.txt')).text()).not.toMatch(/presos|R\$ 149/)
})
