import { expect, test, type Page } from '@playwright/test'

// Spec revisao-geral-trabalho: a área de trabalho no celular e no computador.

const NOME_LONGO = 'Maria Aparecida dos Santos Albuquerque de Oliveira Nascimento Ferreira'

/** Navegador limpo, sem o aviso de primeiro acesso, com o plano de exemplo aberto na etapa 2. Devolve o id do plano. */
async function abrirComExemplo(pagina: Page): Promise<string> {
  await pagina.goto('/#/painel')
  await pagina.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('metanutri:aviso-inicial-visto', '1')
  })
  await pagina.reload()
  await pagina.getByRole('button', { name: 'Ver um plano de exemplo' }).click()
  await expect(pagina).toHaveURL(/#\/caso\/[^/]+\/plano$/)
  return decodeURIComponent(pagina.url().split('#/caso/')[1]?.split('/')[0] ?? '')
}

/** Um paciente com o nome dado, ligado ao plano de exemplo, que passa a ter o mesmo nome. Recarrega. */
async function semearNome(pagina: Page, casoId: string, nome: string): Promise<void> {
  await pagina.evaluate(
    ({ casoId, nome }) => {
      const agora = new Date().toISOString()
      localStorage.setItem('metanutri:pacientes', JSON.stringify([{ id: 'pac-longo', nome, criadoEm: agora, atualizadoEm: agora }]))
      const chave = `metanutri:caso:${casoId}`
      const registro = JSON.parse(localStorage.getItem(chave) ?? '{}') as { caso: { nome: string; pacienteId: string | null } }
      registro.caso.nome = nome
      registro.caso.pacienteId = 'pac-longo'
      localStorage.setItem(chave, JSON.stringify(registro))
    },
    { casoId, nome },
  )
  await pagina.reload()
}

/** O que passa da largura da tela sem estar dentro de algo que rola de lado de propósito. */
const vazaDaTela = (pagina: Page) =>
  pagina.evaluate(() => {
    const largura = document.documentElement.clientWidth
    const rolaDeLado = (el: Element) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX
        if (ox === 'auto' || ox === 'scroll') return true
      }
      return false
    }
    return [...document.querySelectorAll('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        return r.width > 2 && r.right > largura + 1 && getComputedStyle(el).position !== 'fixed' && !rolaDeLado(el)
      })
      .map((el) => `${el.tagName.toLowerCase()} ${(el.textContent ?? '').trim().slice(0, 40)}`)
  })

const dentroDaTela = async (pagina: Page, nome: string | RegExp) => {
  const caixa = await pagina.getByRole('button', { name: nome }).first().boundingBox()
  const largura = await pagina.evaluate(() => document.documentElement.clientWidth)
  expect(caixa).not.toBeNull()
  expect((caixa?.x ?? 0) + (caixa?.width ?? 0)).toBeLessThanOrEqual(largura)
}

test.describe('Nome longo não alarga a tela (D-245)', () => {
  for (const largura of [360, 390]) {
    test(`CA-785, CA-786 e CA-787: paciente e plano com 70 letras em ${largura} px`, async ({ page }) => {
      const casoId = await abrirComExemplo(page)
      await semearNome(page, casoId, NOME_LONGO)
      await page.setViewportSize({ width: largura, height: 800 })

      await page.goto('/#/pacientes')
      await expect(page.getByRole('list', { name: 'Pacientes' })).toBeVisible()
      expect(await vazaDaTela(page)).toEqual([])
      await dentroDaTela(page, `Abrir ${NOME_LONGO}`)

      await page.goto('/#/casos')
      await expect(page.getByRole('list', { name: 'Planos salvos' })).toBeVisible()
      expect(await vazaDaTela(page)).toEqual([])
      await dentroDaTela(page, `Abrir ${NOME_LONGO}`)

      await page.goto(`/#/caso/${casoId}/caso`)
      await expect(page.getByLabel('Paciente', { exact: true })).toBeVisible()
      expect(await vazaDaTela(page)).toEqual([])
    })
  }

  test('CB-245: um nome de uma palavra só, com 80 letras, também corta', async ({ page }) => {
    const casoId = await abrirComExemplo(page)
    await semearNome(page, casoId, 'A'.repeat(80))
    await page.setViewportSize({ width: 360, height: 800 })
    for (const rota of ['/#/pacientes', '/#/casos', `/#/caso/${casoId}/caso`]) {
      await page.goto(rota)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect(await vazaDaTela(page)).toEqual([])
    }
  })
})
