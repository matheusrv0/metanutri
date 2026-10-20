import { expect, test } from '@playwright/test'
import { conferirCamposNoCelular, medidaDe } from '../apoio/campos.ts'
import { ligarServidorFalso, PERFIL_ESTUDANTE, type Cenario } from '../apoio/servidorFalso.ts'

// Spec integracao-rodada-1910 (D-311, D-312, CA-976 a CA-979): os campos das telas de conta no celular, com letra de
// 16 px e 44 px, sem a tela rolar para o lado; o campo do código com 48 px e letra de 20 px em toda largura.

interface Tela {
  readonly nome: string
  readonly endereco: string
  readonly titulo: string
  readonly cenario?: Cenario
  readonly nutricionista?: boolean
}

const TELAS: readonly Tela[] = [
  { nome: 'Entrar', endereco: '/#/entrar', titulo: 'Entrar' },
  { nome: 'Criar conta de nutricionista, com o CRN', endereco: '/#/criar-conta', titulo: 'Crie sua conta', nutricionista: true },
  { nome: 'Esqueci a senha (o código)', endereco: '/#/esqueci-senha/codigo', titulo: 'Crie uma senha nova' },
  { nome: 'Comprovar matrícula', endereco: '/#/comprovar-matricula', titulo: 'Comprove sua matrícula', cenario: { sessao: true, perfil: PERFIL_ESTUDANTE } },
  { nome: 'Completar cadastro, com o CRN', endereco: '/#/painel', titulo: 'Complete seu cadastro', cenario: { sessao: true, perfil: null }, nutricionista: true },
]

for (const largura of [360, 390]) {
  test.describe(`CA-979: telas de conta no celular de ${largura} px`, () => {
    test.use({ viewport: { width: largura, height: 800 } })

    for (const tela of TELAS) {
      test(tela.nome, async ({ page }) => {
        await ligarServidorFalso(page, tela.cenario ?? {})
        await page.goto(tela.endereco)
        await expect(page.getByRole('heading', { level: 1, name: tela.titulo })).toBeVisible()
        if (tela.nutricionista) await page.getByRole('radio', { name: /Nutricionista/ }).check()
        await conferirCamposNoCelular(page, tela.nome)
      })
    }
  })
}

for (const largura of [390, 1280]) {
  test(`CA-978: em ${largura} px, o campo do código tem 48 px e letra de 20 px`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 800 })
    await ligarServidorFalso(page, {})
    await page.goto('/#/esqueci-senha/codigo')
    expect(await medidaDe(page.getByLabel('Código de 8 dígitos'))).toEqual({ letra: 20, altura: 48 })
  })
}

test('CA-976: em 1280 px, o e-mail de Entrar tem 40 px e letra de 14 px, como antes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await ligarServidorFalso(page, {})
  await page.goto('/#/entrar')
  expect(await medidaDe(page.getByLabel('E-mail'))).toEqual({ letra: 14, altura: 40 })
})
