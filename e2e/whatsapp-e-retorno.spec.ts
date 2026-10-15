import { expect, test, type Page } from '@playwright/test'

/**
 * Spec whatsapp-e-retorno: a próxima consulta marcada na ficha aparece no Painel, e o WhatsApp
 * da linha abre o diálogo com o lembrete e o endereço wa.me. Nada é enviado de verdade: o wa.me
 * é interceptado e responde uma página vazia.
 */

const abrirLimpo = async (pagina: Page) => {
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.reload()
  const boasVindas = pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  if (await boasVindas.isVisible()) await boasVindas.getByRole('button', { name: 'Entendi' }).click()
}

/** Amanhã no calendário de Brasília (D-144), para o teste não depender da hora em que roda. */
const amanhaEmBrasilia = (): string => {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const [ano, mes, dia] = hoje.split('-').map(Number)
  return new Date(Date.UTC(ano ?? 0, (mes ?? 1) - 1, (dia ?? 1) + 1)).toISOString().slice(0, 10)
}

/** Cadastra um paciente pela tela e marca a consulta de amanhã às 14:30. */
const cadastrarComConsulta = async (pagina: Page, nome: string, telefone: string) => {
  await pagina.goto('/#/pacientes')
  await pagina.getByRole('button', { name: /Cadastrar paciente|Novo paciente/ }).first().click()
  await pagina.getByLabel('Nome', { exact: true }).fill(nome)
  if (telefone) await pagina.getByLabel('Telefone', { exact: true }).fill(telefone)
  const consulta = pagina.getByRole('group', { name: 'Próxima consulta' })
  await consulta.getByLabel('Dia', { exact: true }).fill(amanhaEmBrasilia())
  await consulta.getByLabel('Horário', { exact: true }).fill('14:30')
}

test('CA-528: a consulta marcada na ficha aparece no Painel e o WhatsApp abre o wa.me com o lembrete', async ({ page, context }) => {
  await context.route('https://wa.me/**', (rota) => rota.fulfill({ status: 200, contentType: 'text/html', body: '<p>WhatsApp</p>' }))
  await abrirLimpo(page)
  await cadastrarComConsulta(page, 'Ana Souza', '(11) 98765-4321')

  await page.goto('/#/painel')
  const bloco = page.getByRole('list', { name: 'Consultas e aniversários' })
  await expect(page.getByRole('heading', { name: 'Hoje e esta semana' })).toBeVisible()
  await expect(bloco.getByRole('listitem').filter({ hasText: 'Ana Souza' })).toContainText('Amanhã às 14:30')

  await bloco.getByRole('button', { name: 'Lembrar Ana Souza da consulta pelo WhatsApp' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Enviar pelo WhatsApp' })
  await expect(dialogo).toContainText('(11) 98765-4321')
  await expect(dialogo.getByLabel('Mensagem')).toHaveValue(/^Oi, Ana! Lembrete: sua consulta é dia \d{2}\/\d{2} \([a-zçá-]+\) às 14:30\. Até lá!$/)

  const abrir = dialogo.getByRole('link', { name: 'Abrir no WhatsApp' })
  await expect(abrir).toHaveAttribute('href', /^https:\/\/wa\.me\/5511987654321\?text=Oi%2C%20Ana!%20Lembrete/)
  const [aba] = await Promise.all([context.waitForEvent('page'), abrir.click()])
  await aba.waitForLoadState()
  expect(aba.url()).toMatch(/^https:\/\/wa\.me\/5511987654321\?text=/)
  await expect(dialogo).toBeHidden()
})

test('CA-505 e CA-517: sem telefone, o WhatsApp leva à ficha com o cursor no Telefone', async ({ page }) => {
  await abrirLimpo(page)
  await cadastrarComConsulta(page, 'Bia Lima', '')

  await page.goto('/#/painel')
  await page.getByRole('button', { name: 'Lembrar Bia Lima da consulta pelo WhatsApp' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Enviar pelo WhatsApp' })
  await expect(dialogo).toContainText('A ficha de Bia Lima não tem telefone.')
  await expect(dialogo.getByRole('link')).toHaveCount(0)
  await dialogo.getByRole('button', { name: 'Cadastre o telefone na ficha' }).click()

  await expect(page).toHaveURL(/#\/paciente\/[^/]+\/telefone$/)
  await expect(page.getByLabel('Telefone', { exact: true })).toBeFocused()
})

test('CA-527: em 360 px, ficha, Painel e diálogo cabem sem rolar para o lado, com toque de 44 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await abrirLimpo(page)
  await cadastrarComConsulta(page, 'Ana Souza Albuquerque de Oliveira', '(11) 98765-4321')

  const semRolagemLateral = async () => {
    const larguras = await page.evaluate(() => ({ pagina: document.documentElement.scrollWidth, tela: window.innerWidth }))
    expect(larguras.pagina).toBeLessThanOrEqual(larguras.tela)
  }
  const alturaMinima = async (alvo: ReturnType<Page['getByRole']>) => {
    const caixa = await alvo.boundingBox()
    expect(caixa?.height ?? 0).toBeGreaterThanOrEqual(44)
  }

  // A ficha, com o cartão da próxima consulta.
  await semRolagemLateral()
  await alturaMinima(page.getByRole('group', { name: 'Próxima consulta' }).getByRole('button', { name: 'Limpar' }))

  // O Painel, com o bloco.
  await page.goto('/#/painel')
  await expect(page.getByRole('heading', { name: 'Hoje e esta semana' })).toBeVisible()
  await semRolagemLateral()
  const whatsapp = page.getByRole('button', { name: 'Lembrar Ana Souza Albuquerque de Oliveira da consulta pelo WhatsApp' })
  await alturaMinima(whatsapp)

  // O diálogo.
  await whatsapp.click()
  const dialogo = page.getByRole('dialog', { name: 'Enviar pelo WhatsApp' })
  await expect(dialogo).toBeVisible()
  await semRolagemLateral()
  await alturaMinima(dialogo.getByRole('link', { name: 'Abrir no WhatsApp' }))
  await alturaMinima(dialogo.getByRole('button', { name: 'Cancelar' }))
})
