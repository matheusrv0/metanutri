import { expect, test, type Page } from '@playwright/test'

// Spec antropometria-telas, T20: a F1 de ponta a ponta no navegador. A avaliação nova pela aba da ficha (CA-2400), as
// medidas digitadas indo para o resultado (CA-2410, CA-2421, CA-2430), o Histórico das 4 avaliações do protótipo
// (CA-2449), o documento com "Salvar em PDF" (CA-2457) e, em 390 px com toque, nada rolando para o lado (CA-2470) e
// todo alvo com 44 px (CA-2471). A paciente é inventada.

const criadoEm = '2026-05-12T10:00:00.000Z'
const RENATA = { id: 'renata', nome: 'Renata Oliveira Campos', sexo: 'F', nascimento: '1992-05-12', objetivo: 'perder gordura', criadoEm, atualizadoEm: criadoEm }

/** As 4 avaliações do protótipo: dobras de JP 7 (tríceps, subescapular, peitoral, axilar média, suprailíaca anterior, abdominal, coxa). */
const AVALIACOES = [
  { sufixo: 'mai', data: '2026-05-12', peso: 75.8, dobras: [27, 23.5, 14, 18.5, 25, 35, 39], cintura: 89.5, quadril: 107.0 },
  { sufixo: 'jul', data: '2026-07-07', peso: 74.1, dobras: [26, 22.5, 13.5, 17.5, 23, 32.5, 36.5], cintura: 87.0, quadril: 105.8 },
  { sufixo: 'set', data: '2026-09-08', peso: 72.6, dobras: [24.5, 21, 12.5, 16.5, 21.5, 30.5, 35.5], cintura: 85.2, quadril: 104.6 },
  { sufixo: '', data: '2026-11-03', peso: 71.5, dobras: [24, 20.5, 12, 16, 21, 30, 34.5], cintura: 84.0, quadril: 104.0 },
] as const

/** Abre a aba "Antropometria" da paciente e começa a avaliação nova; devolve o id do plano criado. */
async function novaAvaliacao(page: Page): Promise<string> {
  await page.goto('/')
  await page.evaluate((p) => {
    localStorage.setItem('metanutri:aviso-inicial-visto', '1')
    localStorage.setItem('metanutri:pacientes', JSON.stringify([p]))
  }, RENATA)
  await page.goto('/#/paciente/renata/antropometria')
  await page.reload()
  await expect(page.getByText('Nenhuma avaliação ainda.')).toBeVisible()
  await page.getByRole('button', { name: 'Nova avaliação' }).click()
  await page.waitForURL(/#\/antropometria\/[^/]+$/)
  return decodeURIComponent(new URL(page.url()).hash.split('/')[2] ?? '')
}

/** Grava as 4 avaliações do protótipo a partir do plano criado pela tela (o mesmo formato que o app grava). */
async function semearQuatro(page: Page, id: string): Promise<void> {
  await page.evaluate(
    ({ id, avaliacoes }) => {
      const base = JSON.parse(localStorage.getItem(`metanutri:caso:${id}`) ?? '{}')
      const ids = avaliacoes.map((a) => (a.sufixo ? `${id}-${a.sufixo}` : id))
      avaliacoes.forEach((a, i) => {
        const [tricipital, subescapular, peitoral, axilarMedia, suprailiacaAnt, abdominal, coxa] = a.dobras
        const caso = {
          ...base.caso,
          id: ids[i],
          dataConsulta: a.data,
          pesoKg: a.peso,
          estaturaCm: 164,
          circunferenciaCinturaCm: a.cintura,
          medidasCorporais: { ...base.caso.medidasCorporais, pontoDaCintura: 'ponto-medio', quadrilCm: a.quadril },
          composicao: { ...base.caso.composicao, protocolo: 'jackson-pollock-7', dobras: { ...base.caso.composicao.dobras, tricipital, subescapular, peitoral, axilarMedia, suprailiacaAnt, abdominal, coxa } },
          avaliacao: { ...base.caso.avaliacao, modalidade: 'presencial', adipometro: 'lange', origemPesoEstatura: 'aferidas' },
        }
        localStorage.setItem(`metanutri:caso:${ids[i]}`, JSON.stringify({ ...base, caso }))
      })
      const indice = JSON.parse(localStorage.getItem('metanutri:casos') ?? '[]')
      localStorage.setItem('metanutri:casos', JSON.stringify([...new Set([...indice, ...ids])]))
    },
    { id, avaliacoes: AVALIACOES },
  )
}

async function semRolagemLateral(page: Page, onde: string): Promise<void> {
  const larguras = await page.evaluate(() => ({ documento: document.documentElement.scrollWidth, janela: window.innerWidth }))
  expect(larguras.documento, `${onde}: rola para o lado`).toBeLessThanOrEqual(larguras.janela)
}

/** CA-2471: cada botão, campo e seletor à vista, no conteúdo e na janela, com pelo menos 44 px de altura. */
async function alvosDe44(page: Page, onde: string): Promise<void> {
  const pequenos = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('main button, main input:not([type="checkbox"]):not([type="radio"]), main select, main [role="radio"], [role="dialog"] button, [role="dialog"] select')]
      .filter((e) => {
        const r = e.getBoundingClientRect()
        const s = getComputedStyle(e)
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !e.closest('.sr-only') && !e.closest('[aria-hidden="true"]')
      })
      .filter((e) => e.getBoundingClientRect().height < 43.5)
      .map((e) => `${(e.getAttribute('aria-label') ?? e.textContent ?? e.tagName).trim().slice(0, 40)}: ${Math.round(e.getBoundingClientRect().height)}px`),
  )
  expect(pequenos, onde).toEqual([])
}

test.describe('antropometria: a F1 no computador (1440 px)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('CA-2400, CA-2410, CA-2421 e CA-2430: a avaliação nova, as medidas digitadas e o resultado do motor', async ({ page }) => {
    await novaAvaliacao(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Renata Oliveira Campos' })).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Avaliação' })).toHaveAttribute('aria-checked', 'true')

    const pesoEstatura = page.getByRole('region', { name: 'Peso e estatura' })
    await pesoEstatura.getByRole('textbox', { name: /^Peso/ }).fill('71,5')
    await pesoEstatura.getByRole('textbox', { name: /^Estatura/ }).fill('164')
    const cartaoDasDobras = page.getByRole('region', { name: 'Dobras cutâneas' })
    await cartaoDasDobras.getByRole('combobox', { name: 'Protocolo' }).selectOption({ label: 'Jackson & Pollock, 7 dobras' })
    const dobras: readonly (readonly [RegExp, string])[] = [
      [/^Tríceps/, '24'],
      [/^Subescapular/, '20,5'],
      [/^Peitoral/, '12'],
      [/^Axilar média/, '16'],
      [/^Suprailíaca · axilar anterior/, '21'],
      [/^Abdominal/, '30'],
      [/^Coxa/, '34,5'],
    ]
    for (const [nome, valor] of dobras) await cartaoDasDobras.getByRole('textbox', { name: nome }).fill(valor)
    await expect(page.getByText('As 7 dobras marcadas entram no protocolo. As outras ficam guardadas.')).toBeVisible()

    const resultado = page.getByRole('table', { name: 'Resultado da avaliação' })
    await expect(resultado).toContainText('26,58 kg/m²')
    await expect(resultado).toContainText('29,5%')
    await expect(page.getByText('Gordura por Jackson & Pollock, 7 dobras')).toBeVisible()
  })

  test('CA-2449 e CA-2457: o Histórico das 4 avaliações e o documento com "Salvar em PDF"', async ({ page }) => {
    const id = await novaAvaliacao(page)
    await semearQuatro(page, id)
    await page.addInitScript(() => {
      window.print = () => {
        const w = window as unknown as { impressoes?: number } // a contagem só existe neste teste
        w.impressoes = (w.impressoes ?? 0) + 1
      }
    })
    await page.goto(`/#/antropometria/${encodeURIComponent(id)}/historico`)
    await page.reload()

    await expect(page.getByText('4 avaliações · de 12/05/2026 a 03/11/2026')).toBeVisible()
    await expect(page.getByRole('group', { name: 'Peso, kg' }).getByRole('button')).toHaveCount(4)
    await expect(page.getByRole('group', { name: /^Gordura corporal/ }).getByRole('button')).toHaveCount(4)
    const tabela = page.getByRole('table', { name: 'Avaliações' })
    await expect(tabela).toContainText('Desde 08/09')
    await expect(tabela).toContainText('Desde 12/05')
    await expect(tabela.getByRole('row').filter({ hasText: 'Soma das 7 dobras' })).toContainText('−24,0mudança real')
    await expect(page.getByRole('region', { name: 'Mudança mínima detectável' })).toContainText('Mesmo protocolo: Jackson & Pollock, 7 dobras')

    await page.getByRole('button', { name: 'Gerar documento' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Documento da avaliação' })
    await expect(dialogo).toBeVisible()
    const folha = page.locator('.area-impressao .papel')
    await expect(folha.getByRole('heading', { name: 'Avaliação antropométrica' })).toBeVisible()
    await expect(folha).toContainText('Retorno · 4ª avaliação')
    await expect(folha.getByRole('heading', { name: 'Comparação com a avaliação anterior' })).toBeVisible()
    await dialogo.getByRole('button', { name: 'Salvar em PDF' }).click()
    expect(await page.evaluate(() => (window as unknown as { impressoes?: number }).impressoes ?? 0)).toBe(1)

    // No papel, só a folha (a moldura de impressão de sempre).
    await page.emulateMedia({ media: 'print' })
    await expect(page.getByRole('navigation', { name: 'Ficha do paciente' })).toBeHidden()
    await expect(folha).toBeVisible()
  })
})

test.describe('antropometria: a F1 no celular (390 px, toque)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('CA-2470 e CA-2471: avaliação vazia e cheia, Histórico e documento sem rolar de lado, com alvos de 44 px', async ({ page }) => {
    const id = await novaAvaliacao(page)
    await expect(page.getByRole('heading', { name: 'Resultado' })).toBeVisible()
    await semRolagemLateral(page, 'avaliação vazia')
    await alvosDe44(page, 'avaliação vazia')

    await semearQuatro(page, id)
    await page.goto(`/#/antropometria/${encodeURIComponent(id)}`)
    await page.reload()
    await expect(page.getByRole('table', { name: 'Resultado da avaliação' })).toContainText('26,58 kg/m²')
    await semRolagemLateral(page, 'avaliação cheia')
    await alvosDe44(page, 'avaliação cheia')
    // CB-1452: "Avaliação de 03/11/2026" inteira, sem reticências.
    const lista = page.getByRole('combobox', { name: 'Avaliação' })
    const cabe = await lista.evaluate((e) => {
      if (!(e instanceof HTMLSelectElement)) return false
      const s = getComputedStyle(e)
      const c = document.createElement('canvas').getContext('2d')
      if (!c) return false
      c.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`
      return c.measureText(e.options[e.selectedIndex]?.text ?? '').width <= e.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight)
    })
    expect(cabe, 'a lista corta "Avaliação de 03/11/2026"').toBe(true)

    await page.getByRole('radio', { name: 'Histórico' }).click()
    const avaliacoes = page.getByRole('table', { name: 'Avaliações' })
    await expect(avaliacoes).toBeVisible()
    await semRolagemLateral(page, 'Histórico')
    await alvosDe44(page, 'Histórico')
    // CB-1486 (D-1526): a primeira e a atual, sem o ano, e as duas "Desde"; as do meio somem; a tabela cabe na tela.
    const datas = await avaliacoes.evaluate((t) =>
      [...t.querySelectorAll('thead th')].filter((th) => th instanceof HTMLElement && th.offsetWidth > 0).map((th) => th.querySelector('b')?.innerText ?? th.textContent),
    )
    expect(datas).toEqual(['Medida', '12/05', '03/11', 'Desde 08/09', 'Desde 12/05'])
    const direita = await avaliacoes.evaluate((t) => t.getBoundingClientRect().right)
    expect(direita, 'a tabela do Histórico passa da tela').toBeLessThanOrEqual(390)

    await page.getByRole('button', { name: 'Gerar documento' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Documento da avaliação' })
    await expect(dialogo).toBeVisible()
    // A janela entra com uma animação de escala: mede depois dela.
    await page.waitForTimeout(400)
    await semRolagemLateral(page, 'documento')
    await alvosDe44(page, 'documento')
  })
})
