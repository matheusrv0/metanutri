// Importar pacientes por planilha no navegador, com a conta falsa (spec importar-pacientes): CA-1902, CA-1933,
// CA-1945 a CA-1948 e CB-911. A nuvem é o servidor falso: o teste vê cada pedido que sai da página.
import { expect, test, type Locator, type Page } from '@playwright/test'
import { semRolagemLateral } from '../apoio/fumaca.ts'
import { ENDERECO_FALSO, ligarServidorFalso, PERFIL_NUTRICIONISTA, type ServidorFalso } from '../apoio/servidorFalso.ts'

test.use({ reducedMotion: 'reduce' })

const CPF = '123.456.789-00'
const NOME_ENORME = 'Maria Aparecida dos Santos Oliveira de Albuquerque Cavalcanti Figueiredo Vasconcelos da Silva Pereira'

const CSV = [
  'Nome;Sexo;Data de nascimento;Celular;E-mail;Objetivo;CPF;Peso (kg);Observações',
  `Juliana Ferreira Souza;F;14/03/1991;(11) 98765-4321;juliana.souza@email.com;Reeducação alimentar;${CPF};68,4;Intolerância à lactose`,
  'Rafael Oliveira Lima;M;02/11/1985;(21) 99654-1207;rafael.lima@email.com;Ganho de massa;111.222.333-44;82,0;',
  'Camila Rodrigues;F;31/02/1994;(31) 98822-0415;camila.r@email.com;Emagrecimento;;74,9;',
  'Bruno Carvalho Dias;;23/07/1979;(11) 97310-5582;bruno.dias@email.com;Controle da glicemia;;91,2;Diabetes tipo 2',
  'Patrícia Gomes Ribeiro;F;09/05/1988;(19) 99127-3340;patricia.ribeiro@email.com;Gestação;;63,0;24 semanas',
  'Lucas Martins;M;17/01/2001;(41) 98451-7763;lucas.martins@email.com;Desempenho no esporte;;77,5;',
  'RAFAEL OLIVEIRA LIMA;M;02/11/1985;(21) 99654-1207;rafael.lima@email.com;Ganho de massa;;82,0;',
  `${NOME_ENORME};F;28/09/1996;(21) 98034-6619;maria.aparecida.dos.santos.oliveira.de.albuquerque@universidade.edu.br;Reeducação alimentar;;58,7;`,
  'Tiago Nascimento;M;05/12/1990;(85) 99702-2148;tiago.n@email.com;Colesterol alto;;88,1;',
].join('\r\n')

const arquivoCsv = (nome: string, texto: string) => ({ name: nome, mimeType: 'text/csv', buffer: Buffer.from(texto, 'utf8') })

/** Abre a tela de importar com a conta falsa e fecha os avisos de primeiro acesso. */
async function abrirImportar(pagina: Page): Promise<ServidorFalso> {
  const servidor = await ligarServidorFalso(pagina, { sessao: true, perfil: PERFIL_NUTRICIONISTA })
  await pagina.goto('/#/pacientes/importar')
  const titulo = pagina.getByRole('heading', { level: 1, name: 'Importar planilha' })
  const aviso = pagina.getByRole('dialog')
  await expect(titulo.or(aviso)).toBeVisible()
  for (let vez = 0; vez < 3; vez++) {
    await aviso.waitFor({ state: 'visible', timeout: 2000 }).catch(() => undefined)
    if (!(await aviso.isVisible())) break
    await aviso.getByRole('button', { name: 'Entendi' }).click()
    await expect(aviso).toBeHidden()
  }
  await expect(titulo).toBeVisible()
  return servidor
}

const campoDoArquivo = (pagina: Page) => pagina.getByLabel('Escolher arquivo')

async function escolher(pagina: Page, nome = 'pacientes.csv', texto = CSV): Promise<void> {
  await campoDoArquivo(pagina).setInputFiles(arquivoCsv(nome, texto))
  await expect(pagina.getByRole('heading', { level: 2, name: nome })).toBeVisible({ timeout: 15_000 })
}

/** Tudo o que a página mandou ao servidor (endereço e corpo), para procurar dado da planilha. */
function vigiarPedidos(pagina: Page): string[] {
  const pedidos: string[] = []
  pagina.on('request', (pedido) => pedidos.push(`${pedido.url()} ${pedido.postData() ?? ''}`))
  return pedidos
}

async function alturaMinima(alvos: Locator, minimo: number): Promise<void> {
  for (const alvo of await alvos.all()) {
    if (!(await alvo.isVisible())) continue
    const caixa = await alvo.boundingBox()
    expect(caixa?.height ?? 0, await alvo.evaluate((el) => el.outerHTML.slice(0, 120))).toBeGreaterThanOrEqual(minimo - 0.5)
  }
}

test('CA-1902, CA-1933 e CA-1945: do arquivo à conclusão; a planilha não sai do navegador, só os pacientes criados', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const pedidos = vigiarPedidos(page)
  const servidor = await abrirImportar(page)
  await escolher(page)
  await expect(page.getByText('9 linhas · 9 colunas · 7 reconhecidas')).toBeVisible()
  await page.getByRole('button', { name: 'Ver prévia' }).click()
  await expect(page.getByRole('group', { name: 'Contas da prévia' })).toContainText('6 prontos para importar')

  // CA-1945: até aqui, nenhum pedido levou nada da planilha, e nada dela foi para o armazenamento do navegador.
  const daPlanilha = ['Juliana', 'Camila', CPF, '68,4', 'Intolerância']
  for (const trecho of daPlanilha) expect(pedidos.filter((p) => p.includes(trecho)), trecho).toEqual([])
  const guardado = await page.evaluate(() => Object.keys(localStorage).map((k) => `${k}=${localStorage.getItem(k) ?? ''}`).join('\n'))
  for (const trecho of daPlanilha) expect(guardado, trecho).not.toContain(trecho)

  await page.getByRole('button', { name: 'Importar 6 pacientes' }).click()
  await expect(page.getByRole('heading', { level: 2, name: '6 pacientes importados' })).toBeFocused()

  // CA-1933: sobem à nuvem pelo caminho de sempre, e a área diz "Salvo".
  await expect.poll(() => JSON.stringify(servidor.gravacoesDaCopia), { timeout: 20_000 }).toContain('Juliana Ferreira Souza')
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible({ timeout: 20_000 })
  const copia = JSON.stringify(servidor.gravacoesDaCopia)
  // CA-1938 e CA-1945: o que estava em "Não importar" (CPF, peso) não chega a lugar nenhum.
  expect(copia).not.toContain(CPF)
  expect(copia).not.toContain('68,4')
  expect(pedidos.filter((p) => p.startsWith(ENDERECO_FALSO) && p.includes(CPF))).toEqual([])

  await page.getByRole('button', { name: 'Ver pacientes' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Pacientes' })).toBeVisible()
  await expect(page.getByText(/^Importação de hoje, \d\d:\d\d$/)).toBeVisible()
  await expect(page.getByRole('list', { name: 'Pacientes' }).getByRole('listitem')).toHaveCount(6)
  await expect(page.getByRole('list', { name: 'Pacientes' }).getByText('Nenhum plano ainda').first()).toBeVisible()
})

test('CA-1902: soltar o arquivo na área', async ({ page }) => {
  await abrirImportar(page)
  const zona = page.getByRole('region', { name: 'Solte a planilha aqui' })
  const dados = await page.evaluateHandle((texto) => {
    const transferencia = new DataTransfer()
    transferencia.items.add(new File([texto], 'solto.csv', { type: 'text/csv' }))
    return transferencia
  }, CSV)
  await zona.dispatchEvent('dragenter', { dataTransfer: dados })
  await zona.dispatchEvent('dragover', { dataTransfer: dados })
  await zona.dispatchEvent('drop', { dataTransfer: dados })
  await expect(page.getByRole('heading', { level: 2, name: 'solto.csv' })).toBeVisible()
})

test('CA-1947: só com o teclado', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await abrirImportar(page)
  const campo = campoDoArquivo(page)
  for (let vez = 0; vez < 60 && !(await campo.evaluate((el) => el === document.activeElement)); vez++) await page.keyboard.press('Tab')
  await expect(campo).toBeFocused()
  // O "Escolher arquivo" abre o seletor com Enter e com Espaço.
  const comEnter = page.waitForEvent('filechooser')
  await page.keyboard.press('Enter')
  await (await comEnter).setFiles([])
  await campo.focus()
  const comEspaco = page.waitForEvent('filechooser')
  await page.keyboard.press(' ')
  await (await comEspaco).setFiles(arquivoCsv('teclado.csv', CSV))
  // Cada passo leva o foco ao título dele.
  await expect(page.getByRole('heading', { level: 2, name: 'teclado.csv' })).toBeFocused()
  const verPrevia = page.getByRole('button', { name: 'Ver prévia' })
  for (let vez = 0; vez < 60 && !(await verPrevia.evaluate((el) => el === document.activeElement)); vez++) await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 2, name: 'Prévia' })).toBeFocused()
  // A caixa da linha alcançada pelo teclado marca com Espaço; o motivo é a descrição dela.
  const caixa = page.getByRole('checkbox', { name: 'Importar Camila Rodrigues' })
  await expect(caixa).toHaveAccessibleDescription('Data inválida')
  for (let vez = 0; vez < 60 && !(await caixa.evaluate((el) => el === document.activeElement)); vez++) await page.keyboard.press('Tab')
  await page.keyboard.press(' ')
  await expect(caixa).toBeChecked()
  await expect(caixa).toHaveAccessibleDescription('Entra sem a data')
})

for (const largura of [360, 390, 412, 768]) {
  test(`CA-1948: em ${largura} px, os três passos funcionam, sem rolagem lateral`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 800 })
    await abrirImportar(page)
    await expect(page.getByRole('heading', { level: 2, name: largura < 640 ? 'Escolha a planilha' : 'Solte a planilha aqui' })).toBeVisible()
    await semRolagemLateral(page)
    await escolher(page, 'uma-planilha-com-um-nome-de-arquivo-bem-comprido-exportada-do-sistema-antigo.csv')
    await semRolagemLateral(page)
    const conteudo = page.locator('#conteudo')
    if (largura < 640) await alturaMinima(conteudo.getByRole('combobox'), 44)
    await page.getByRole('button', { name: 'Ver prévia' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Prévia' })).toBeAttached()
    await semRolagemLateral(page)
    // D-801: o nome enorme quebra em até duas linhas, sem sair da linha.
    const nome = page.getByRole('row').filter({ has: page.getByRole('checkbox', { name: `Importar ${NOME_ENORME}` }) }).getByText(NOME_ENORME, { exact: true })
    const linhas = await nome.evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)))
    expect(linhas).toBeLessThanOrEqual(2)
    if (largura < 640) {
      await alturaMinima(conteudo.locator('label:has(input[type="checkbox"])'), 44)
      await alturaMinima(conteudo.getByRole('textbox'), 44)
      await alturaMinima(conteudo.getByRole('button'), 44)
    }
    await page.getByRole('button', { name: 'Importar 6 pacientes' }).click()
    await expect(page.getByRole('heading', { level: 2, name: '6 pacientes importados' })).toBeVisible()
    await semRolagemLateral(page)
  })
}

test('CB-911: 2.000 linhas são lidas sem travar a tela', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await abrirImportar(page)
  const texto = ['Nome;Sexo;Data de nascimento', ...Array.from({ length: 2000 }, (_, i) => `Paciente ${String(i).padStart(4, '0')};${i % 2 ? 'F' : 'M'};01/01/1990`)].join('\n')
  const inicio = Date.now()
  await escolher(page, 'duas-mil.csv', texto)
  expect(Date.now() - inicio).toBeLessThan(10_000)
  await page.getByRole('button', { name: 'Ver prévia' }).click()
  await expect(page.getByRole('group', { name: 'Contas da prévia' })).toContainText('2.000 prontos para importar')
  await expect(page.getByRole('table', { name: 'Linhas da planilha' }).getByRole('checkbox')).toHaveCount(50)
  // A tela responde: a caixa marca na hora, e o botão conta.
  await page.getByRole('checkbox', { name: 'Importar Paciente 0000' }).click()
  await expect(page.getByRole('button', { name: 'Importar 1.999 pacientes' })).toBeVisible()
  await page.getByRole('button', { name: 'Mostrar mais 50' }).click()
  await expect(page.getByRole('table', { name: 'Linhas da planilha' }).getByRole('checkbox')).toHaveCount(100)
})

test('CA-1946: o que parece código na planilha é texto, na prévia e na ficha', async ({ page }) => {
  await abrirImportar(page)
  const perigoso = '<img src=x onerror="window.__xss=1">'
  await escolher(page, 'xss.csv', `Nome;Sexo;Observações\n${perigoso};F;<script>window.__xss=2</script>\n`)
  await page.getByRole('button', { name: 'Ver prévia' }).click()
  await expect(page.getByText(perigoso, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Importar 1 paciente' }).click()
  await page.getByRole('button', { name: 'Ver pacientes' }).click()
  await page.getByRole('button', { name: `Abrir ${perigoso}` }).click()
  await expect(page.getByText(/^Importado em \d\d\/\d\d\/\d{4}$/)).toBeVisible()
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
})
