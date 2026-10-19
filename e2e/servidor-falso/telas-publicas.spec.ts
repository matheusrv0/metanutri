// As telas públicas que só existem com o servidor de conta ligado (spec revisao-geral-publica, D-233 e CA-758).
import { test } from '@playwright/test'
import { conferirFumaca, LARGURAS_DA_FUMACA, vigiarConsole } from '../apoio/fumaca.ts'
import { ligarServidorFalso, PERFIL_NUTRICIONISTA } from '../apoio/servidorFalso.ts'

for (const largura of LARGURAS_DA_FUMACA) {
  test.describe(`${largura} px`, () => {
    test.use({ viewport: { width: largura, height: 800 } })

    test('CA-758: Completar cadastro abre para a conta sem situação', async ({ page }) => {
      const erros = await vigiarConsole(page)
      await ligarServidorFalso(page, { sessao: true, perfil: null })
      await page.goto('/#/painel')
      await conferirFumaca(page, erros, { titulo: 'Complete seu cadastro', acao: (p) => p.getByRole('button', { name: 'Continuar' }) })
    })

    test('CA-758: com sessão, a landing troca Entrar por Ir para o painel', async ({ page }) => {
      const erros = await vigiarConsole(page)
      await ligarServidorFalso(page, { sessao: true, perfil: PERFIL_NUTRICIONISTA })
      await page.goto('/#/inicio')
      await conferirFumaca(page, erros, { titulo: /Faltou cálcio/, acao: (p) => p.getByRole('banner').getByRole('button', { name: 'Ir para o painel' }) })
    })
  })
}
