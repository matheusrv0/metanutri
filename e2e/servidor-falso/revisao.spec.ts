// Os critérios da revisão geral das telas públicas que só se conferem no navegador (spec revisao-geral-publica).
import { expect, test, type Locator } from '@playwright/test'
import { semRolagemLateral, vigiarConsole } from '../apoio/fumaca.ts'
import { assinaturaFalsa, DIETA_GUARDADA, ligarServidorFalso, linkFalso, PERFIL_ESTUDANTE, PERFIL_NUTRICIONISTA, type Linha } from '../apoio/servidorFalso.ts'

const EMAIL_LONGO = 'maria.aparecida.dos.santos.oliveira.nutricao2026@aluno.universidadefederal.edu.br'

// I-1 (revisão de 20/10/2026): sem a entrada animada de Preços (o TimelineContent respeita a preferência), as
// posições não mudam no meio da medida.
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

/**
 * I-1: os retângulos de vários elementos medidos num só `evaluate`, no mesmo quadro. Duas chamadas de `boundingBox`
 * seguidas podiam pegar a página no meio de uma mudança de layout (uma imagem que acabou de carregar acima).
 */
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

/** Contraste WCAG entre a cor do texto e a do fundo opaco do aviso, lidas no navegador. */
async function contrasteDoAviso(aviso: Locator): Promise<number> {
  return aviso.evaluate((el) => {
    const tela = document.createElement('canvas')
    tela.width = 1
    tela.height = 1
    const ctx = tela.getContext('2d', { willReadFrequently: true })
    const rgb = (cor: string) => {
      if (!ctx) return [0, 0, 0]
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = cor
      ctx.fillRect(0, 0, 1, 1)
      return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3)
    }
    const lum = (c: number[]) =>
      c
        .map((v) => v / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
        .reduce((soma, v, i) => soma + v * ([0.2126, 0.7152, 0.0722][i] ?? 0), 0)
    const estilo = getComputedStyle(el)
    const a = lum(rgb(estilo.color))
    const b = lum(rgb(estilo.backgroundColor))
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  })
}

// Spec landing-escura (D-545): a landing tem barra e rodapé próprios; o rodapé e o topo comuns são os das outras telas
// públicas, conferidos aqui nos Termos.
test.describe('Rodapé e topo públicos (D-235)', () => {
  for (const largura of [360, 390, 768, 1024, 1280]) {
    test(`CA-740 e CA-992: em ${largura} px, o rodapé só tem links, sem "·" solto nem fontes técnicas`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 800 })
      await ligarServidorFalso(page)
      await page.goto('/#/termos')
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
      await ligarServidorFalso(page)
      await page.goto('/#/termos')
      expect((await caixa(page.getByRole('contentinfo').getByRole('link', { name: 'Referências' }))).height).toBeGreaterThanOrEqual(44)
    })
  }

  test('CA-741: em 390 px, a logo e os links do rodapé têm 44 px, e o link que quebra fica à esquerda', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await ligarServidorFalso(page)
    await page.goto('/#/termos')
    expect((await caixa(page.getByRole('banner').getByRole('button', { name: 'MetaNutri, início' }))).height).toBeGreaterThanOrEqual(44)
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
  await ligarServidorFalso(page)
  await page.goto('/#/termos')
  const topo = page.getByRole('banner')
  const [logo, comecar, menu] = await retangulos(
    topo.getByRole('button', { name: 'MetaNutri, início' }),
    topo.getByRole('button', { name: 'Começar grátis' }),
    topo.getByRole('navigation', { name: 'Seções' }),
  )
  if (!logo || !comecar || !menu) throw new Error('sem medida')
  expect(Math.abs(comecar.y + comecar.height / 2 - (logo.y + logo.height / 2))).toBeLessThan(4)
  expect(menu.y).toBeGreaterThan(logo.y + logo.height - 1)
})

test.describe('Preços (D-234)', () => {
  test('D-234 (A-24): em 768 px, os cartões da mesma linha têm a mesma altura', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 800 })
    await ligarServidorFalso(page)
    await page.goto('/#/precos')
    const [free, solo] = await retangulos(page.getByRole('region', { name: 'Plano Free' }), page.getByRole('region', { name: 'Plano Solo' }))
    if (!free || !solo) throw new Error('sem medida')
    expect(Math.abs(free.y - solo.y)).toBeLessThan(1)
    expect(Math.abs(free.height - solo.height)).toBeLessThan(1)
  })

  for (const largura of [360, 390, 640, 768, 1023]) {
    test(`CA-742: em ${largura} px, os planos em cartões e sem rolar para o lado`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 800 })
      await ligarServidorFalso(page)
      await page.goto('/#/precos')
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
      await ligarServidorFalso(page)
      await page.goto('/#/precos')
      await expect(page.getByRole('table')).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /^Pro/ })).toBeInViewport()
      await semRolagemLateral(page)
    })
  }

  test('CA-743: um h1 só e, em 390 px, Mensal e Anual com 44 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await ligarServidorFalso(page)
    await page.goto('/#/precos')
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Planos e preços')
    for (const opcao of await page.getByRole('radiogroup', { name: 'Período de cobrança' }).getByRole('radio').all()) {
      expect((await caixa(opcao)).height).toBeGreaterThanOrEqual(44)
    }
  })
})

test.describe('Telas de conta com e-mail longo (D-237)', () => {
  test.use({ viewport: { width: 360, height: 780 } })

  test('CA-744: a tela do código quebra o e-mail dentro do cartão, e o campo e os botões cabem inteiros', async ({ page }) => {
    await page.addInitScript((email) => {
      if (!localStorage.getItem('metanutri:email-pendente')) localStorage.setItem('metanutri:email-pendente', JSON.stringify({ email, em: Date.now() }))
    }, EMAIL_LONGO)
    await ligarServidorFalso(page)
    await page.goto('/#/confirmar-email')
    await expect(page.getByText(EMAIL_LONGO, { exact: false })).toBeVisible()
    await semRolagemLateral(page)
    const [cartao, ...alvos] = await retangulos(
      page.getByRole('main'),
      page.getByLabel('Código de 8 dígitos'),
      page.getByRole('button', { name: 'Confirmar' }),
      page.getByRole('button', { name: 'Reenviar o código' }),
    )
    if (!cartao || alvos.length !== 3) throw new Error('sem medida')
    for (const c of alvos) expect(c.x + c.width).toBeLessThanOrEqual(cartao.x + cartao.width + 0.5)
  })

  test('CA-745: Comprovar matrícula e Completar cadastro quebram o e-mail longo', async ({ page }) => {
    await ligarServidorFalso(page, { sessao: true, perfil: PERFIL_ESTUDANTE, emailDaSessao: EMAIL_LONGO })
    await page.goto('/#/comprovar-matricula')
    const aviso = page.getByRole('status').filter({ hasText: 'E-mail da faculdade confirmado' })
    await expect(aviso).toBeVisible()
    const c = await caixa(aviso)
    expect(c.x + c.width).toBeLessThanOrEqual(360)
    await semRolagemLateral(page)
  })

  test('CA-745: Completar cadastro quebra o e-mail longo do subtítulo', async ({ page }) => {
    await ligarServidorFalso(page, { sessao: true, perfil: null, emailDaSessao: EMAIL_LONGO })
    await page.goto('/#/painel')
    await expect(page.getByRole('heading', { level: 1, name: 'Complete seu cadastro' })).toBeVisible()
    await semRolagemLateral(page)
    const c = await caixa(page.getByRole('button', { name: 'Continuar' }))
    expect(c.x + c.width).toBeLessThanOrEqual(360)
  })
})

test('CA-759: em 390 px, as caixas de aceite e de declaração do cadastro têm 44 px de toque', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await ligarServidorFalso(page)
  await page.goto('/#/criar-conta')
  await page.getByRole('radio', { name: /Nutricionista/ }).check()
  const caixas = page.getByRole('checkbox')
  expect(await caixas.count()).toBe(2)
  for (const caixa of await caixas.all()) {
    const rotulo = caixa.locator('xpath=ancestor::label[1]')
    expect((await rotulo.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
  }
  await semRolagemLateral(page)
})

for (const [plano, declaracao] of [
  ['', 'Declaro que este CRN é meu e está ativo.'],
  ['/estudante', 'Declaro ter matrícula ativa no curso de Nutrição.'],
] as const) {
  test(`I-3 (CA-759): em 390 px, um toque no vão abaixo de "${declaracao}" nunca marca os Termos`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await ligarServidorFalso(page)
    await page.goto(`/#/criar-conta${plano}`)
    if (!plano) await page.getByRole('radio', { name: /Nutricionista/ }).check()
    const declarar = page.getByRole('checkbox', { name: declaracao })
    const termos = page.getByRole('checkbox', { name: /Li e aceito/ })
    // Num só quadro: o texto das duas caixas e o que está embaixo de cada ponto do vão entre elas.
    const alvos = await page.evaluate(
      ([textoDeclaracao]) => {
        const rotulos = [...document.querySelectorAll('label')].filter((l) => l.querySelector('input[type=checkbox]'))
        const declarar = rotulos.find((l) => l.textContent?.includes(textoDeclaracao))
        const termos = rotulos.find((l) => l.textContent?.includes('Li e aceito'))
        if (!declarar || !termos) return null
        // elementFromPoint só enxerga o que está na janela: a declaração vai para o meio da tela antes de medir.
        declarar.scrollIntoView({ block: 'center' })
        const fimDoTexto = (declarar.lastElementChild ?? declarar).getBoundingClientRect().bottom
        const inicioDoTexto = (termos.lastElementChild ?? termos).getBoundingClientRect().top
        const meio = (fimDoTexto + inicioDoTexto) / 2
        const x = declarar.getBoundingClientRect().left + 40
        const quem = (y: number) => {
          const el = document.elementFromPoint(x, y)?.closest('label')
          return el === declarar ? 'declaracao' : el === termos ? 'termos' : 'nenhum'
        }
        return {
          vao: inicioDoTexto - fimDoTexto,
          acimaDoMeio: quem(meio - 2),
          abaixoDoMeio: quem(meio + 2),
          logoAbaixo: quem(fimDoTexto + 4),
          toque: { x, y: fimDoTexto + 4 },
        }
      },
      [declaracao] as const,
    )
    expect(alvos).not.toBeNull()
    expect(alvos?.vao).toBeGreaterThanOrEqual(23.5)
    expect(alvos?.logoAbaixo).toBe('declaracao')
    expect(alvos?.acimaDoMeio).toBe('declaracao')
    expect(alvos?.abaixoDoMeio).toBe('termos')
    // E o toque de verdade, 4 px abaixo do texto da declaração, marca a declaração e não os Termos.
    if (!alvos) return
    await page.mouse.click(alvos.toque.x, alvos.toque.y)
    await expect(declarar).toBeChecked()
    await expect(termos).not.toBeChecked()
  })
}

test('M-5: o vigia do console grava o endereço do pedido que falhou', async ({ page }) => {
  const erros = await vigiarConsole(page)
  await ligarServidorFalso(page)
  await page.route('**/m5-pedido-que-falha.png', (rota) => rota.abort())
  await page.goto('/#/inicio')
  await page.evaluate(() => {
    const imagem = document.createElement('img')
    imagem.src = './m5-pedido-que-falha.png'
    document.body.append(imagem)
  })
  await expect.poll(() => erros.join('\n')).toContain('m5-pedido-que-falha.png')
})

test.describe('Avisos do checkout (D-236)', () => {
  for (const tema of ['dark', 'light'] as const) {
    test(`${tema === 'dark' ? 'CA-746' : 'CA-747'}: no tema ${tema === 'dark' ? 'escuro' : 'claro'}, o aviso do resumo tem contraste de 4,5:1 ou mais`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: tema })
      await ligarServidorFalso(page, { sessao: true, perfil: PERFIL_NUTRICIONISTA, assinatura: assinaturaFalsa('ativa') })
      await page.goto('/#/assinar/solo/mensal')
      const aviso = page.getByRole('region', { name: 'Resumo' }).getByRole('status')
      await expect(aviso).toContainText('Você já assina o plano Solo')
      expect(await contrasteDoAviso(aviso)).toBeGreaterThanOrEqual(4.5)
    })
  }
})

test.describe('Link do paciente', () => {
  test.use({ viewport: { width: 390, height: 800 } })

  // CA-749 com a D-295 e a D-297 da conduta-da-nutricionista: uma quantidade só, e até 4 pedaços quando outra medida serve.
  test('CA-748 e CA-749: "Meu plano" com o nome e a quantidade da folha impressa, a partir da cópia de hoje', async ({ page }) => {
    await ligarServidorFalso(page, { link: linkFalso({ dieta: DIETA_GUARDADA }) })
    await page.goto('/#/missoes/token-do-teste')
    await page.getByRole('tab', { name: 'Meu plano' }).click()
    const linha = (refeicao: string, nome: string) => page.getByRole('region', { name: refeicao }).getByRole('listitem').filter({ hasText: nome })
    // D-434 (spec alimentos-e-gramaturas, correção A): a medida a mais de 5% dos gramas sai com o peso e "cerca de".
    await expect(linha('06:00 Desjejum', 'Pão francês')).toHaveText('70 g (cerca de 1 unidade e meia)Pão francês')
    await expect(linha('06:00 Desjejum', 'Margarina com sal')).toHaveText('1 ponta de facaMargarina com sal')
    await expect(linha('06:00 Desjejum', 'Queijo minas frescal')).toHaveText('30 gQueijo minas frescal')
    await expect(linha('09:00 Lanche da manhã', 'Banana prata')).toHaveText('130 g (cerca de 1 unidade e meia)Banana prata')
    await expect(linha('12:00 Almoço', 'Macarrão (peso cru)')).toHaveText('90 gMacarrão (peso cru)')
    // D-483a (3ª revisão): filé de peixe só em filé ou porção; 100 g não fecham em filé (120 g).
    await expect(linha('12:00 Almoço', 'Filé de merluza assado')).toHaveText('100 gFilé de merluza assado')
    await expect(linha('19:00 Jantar', 'Ovo cozido')).toHaveText('2 unidadesOvo cozido')
    // D-423: eram "3 fatias e meia"; D-484 (correção C): nem "1 unidade pequena e meia".
    await expect(linha('21:00 Ceia', 'Maçã Fuji com casca')).toHaveText('130 g (cerca de 1 unidade)Maçã Fuji com casca')
    await expect(page.getByText(/Pão, trigo|lipídeos|cozido\/10minutos/)).toHaveCount(0)
    await semRolagemLateral(page)
  })

  test('CA-753: sem internet, "Não foi possível abrir suas missões"; com a internet de volta, "Tentar de novo" abre', async ({ page }) => {
    const erros = await vigiarConsole(page)
    const cenario: { link: Linha | 'sem-rede' } = { link: 'sem-rede' }
    await ligarServidorFalso(page, cenario)
    await page.goto('/#/missoes/token-do-teste')
    await expect(page.getByRole('heading', { level: 1, name: 'Não foi possível abrir suas missões' })).toBeVisible()
    await expect(page.getByText('Este link não existe mais')).toHaveCount(0)
    cenario.link = linkFalso()
    await page.getByRole('button', { name: 'Tentar de novo' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Suas missões de hoje, Ana' })).toBeVisible()
    // Só o pedido que caiu aparece no console, como o navegador sempre mostra.
    expect(erros.filter((e) => !e.includes('ERR_INTERNET_DISCONNECTED'))).toEqual([])
  })

  test('CA-756: a marcação que não chega à nuvem volta e a tela avisa', async ({ page }) => {
    const cenario: { link: Linha; marcar: 'ok' | 'sem-rede' } = { link: linkFalso(), marcar: 'sem-rede' }
    await ligarServidorFalso(page, cenario)
    await page.goto('/#/missoes/token-do-teste')
    const agua = page.getByRole('button', { name: /Beber 2 litros de água/ })
    await agua.click()
    await expect(page.getByRole('alert')).toHaveText('Não foi possível salvar. Confira a internet e marque de novo.')
    await expect(agua).toHaveAttribute('aria-pressed', 'false')
    cenario.marcar = 'ok'
    await agua.click()
    await expect(agua).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
})
