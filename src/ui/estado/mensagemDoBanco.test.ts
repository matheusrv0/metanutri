import { FALHA_DE_REDE, mensagemDoBanco } from './mensagemDoBanco.ts'

describe('mensagemDoBanco (D-98)', () => {
  it('sem erro, sem mensagem', () => {
    expect(mensagemDoBanco(null)).toBeNull()
  })

  it('a frase que o próprio banco escreve passa como veio', () => {
    expect(mensagemDoBanco({ code: 'P0001', message: 'Você já tem um comprovante em análise.' })).toBe('Você já tem um comprovante em análise.')
    expect(mensagemDoBanco({ code: '42501', message: 'Entre na sua conta.' })).toBe('Entre na sua conta.')
  })

  it('CA-422: o limite de links do plano chega com a frase da tela', () => {
    expect(mensagemDoBanco({ code: 'P0001', message: 'Você chegou ao limite de links do seu plano.' })).toBe('Você chegou ao limite de links do seu plano.')
  })

  it('CA-430: a recusa do RLS e a falta de permissão do Postgres não aparecem cruas', () => {
    expect(mensagemDoBanco({ code: '42501', message: 'new row violates row-level security policy for table "copias"' })).toBe(FALHA_DE_REDE)
    expect(mensagemDoBanco({ code: '42501', message: 'permission denied for table acompanhamentos' })).toBe(FALHA_DE_REDE)
    expect(mensagemDoBanco({ code: '42501', message: 'permission denied for function marcar_missoes' })).toBe(FALHA_DE_REDE)
  })

  it('CA-430: outros códigos e erro sem código viram a mensagem de falha', () => {
    expect(mensagemDoBanco({ code: '23514', message: 'new row for relation "acompanhamentos" violates check constraint "acompanhamentos_token_formato"' })).toBe(
      FALHA_DE_REDE,
    )
    expect(mensagemDoBanco({ code: 'PGRST301', message: 'JWT expired' })).toBe(FALHA_DE_REDE)
    expect(mensagemDoBanco({ message: 'Failed to fetch' })).toBe(FALHA_DE_REDE)
  })
})
