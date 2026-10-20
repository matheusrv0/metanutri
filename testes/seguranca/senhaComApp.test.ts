// D-268 (spec seguranca-lote-5, emenda de 19/10/2026): com o app autenticador ativo, o servidor de login só grava a
// senha numa sessão confirmada pelo app. "Esqueci a senha" abre uma sessão de recuperação (aal1): a senha é recusada
// com `insufficient_aal` e, depois do código do app, aceita. É o que a tela faz (CA-858).
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { sqlNoBancoLocal } from './bancoLocal.ts'
import { clienteSemSessao, confirmarComOApp, novoAdministradorComApp, prepararCenario, type Cenario } from './preparo.ts'

let c: Cenario

beforeAll(async () => {
  c = await prepararCenario()
})

/** O código de 8 dígitos de "Esqueci a senha", como o e-mail traria, e a sessão de recuperação que ele abre. */
async function sessaoDeRecuperacao(email: string) {
  const link = await c.servico.auth.admin.generateLink({ type: 'recovery', email })
  expect(link.error).toBeNull()
  const codigo = link.data.properties?.email_otp ?? ''
  expect(codigo).not.toBe('')
  const cliente = clienteSemSessao(c.ambiente)
  expect((await cliente.auth.verifyOtp({ email, token: codigo, type: 'recovery' })).error).toBeNull()
  return cliente
}

describe('D-268: a senha do administrador com o app', () => {
  it('CA-858: o código do e-mail não basta; com o código do app, a senha nova é gravada e vale', async () => {
    const email = `senha.admin.${Date.now()}@exemplo.com`
    const admin = await novoAdministradorComApp(c, email)
    const cliente = await sessaoDeRecuperacao(email)

    const recusada = await cliente.auth.updateUser({ password: 'Senha-nova-do-admin-1' })
    expect(recusada.error?.code).toBe('insufficient_aal')

    await confirmarComOApp(c.ambiente, cliente, admin.fatorId, admin.chaveDoApp)
    expect((await cliente.auth.updateUser({ password: 'Senha-nova-do-admin-1' })).error).toBeNull()
    const entrou = await clienteSemSessao(c.ambiente).auth.signInWithPassword({ email, password: 'Senha-nova-do-admin-1' })
    expect(entrou.error).toBeNull()
  })

  it('CB-261: a receita do celular perdido (topo do 014) tira a sessão confirmada pelo app e libera a troca de senha', async () => {
    const email = `celular.perdido.${Date.now()}@exemplo.com`
    const admin = await novoAdministradorComApp(c, email)
    const sql014 = readFileSync(fileURLToPath(new URL('../../supabase/014-seguranca-lote-5.sql', import.meta.url)), 'utf8')
    const receita = sql014
      .split('\n')
      .filter((linha) => /^-- delete from auth\.(mfa_factors|sessions) where user_id/.test(linha))
      .map((linha) => linha.replace(/^-- /, '').replace('seu-email@exemplo.com', email))
    expect(receita).toHaveLength(2)
    const rodada = sqlNoBancoLocal(receita.join('\n'))
    expect(rodada.ok, rodada.erro).toBe(true)
    // A sessão do "celular perdido" (aal2) não renova mais.
    expect((await admin.cliente.auth.refreshSession()).error).not.toBeNull()
    // Sem o app, o código do e-mail basta para a senha nova.
    const cliente = await sessaoDeRecuperacao(email)
    expect((await cliente.auth.updateUser({ password: 'Senha-depois-do-celular-1' })).error).toBeNull()
  })

  it('controle: conta sem o app troca a senha só com o código do e-mail', async () => {
    const cliente = await sessaoDeRecuperacao(c.atacante.email)
    expect((await cliente.auth.updateUser({ password: 'Senha-nova-da-conta-1' })).error).toBeNull()
  })
})
