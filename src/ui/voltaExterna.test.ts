import { destinoDaVolta, lerVolta } from './voltaExterna.ts'

describe('lerVolta: o que o Supabase e o Mercado Pago deixam no endereço', () => {
  it('endereço comum não é volta nenhuma', () => {
    expect(lerVolta('', '#/painel')).toEqual({ tipo: null, linkVencido: false })
    expect(lerVolta('', '')).toEqual({ tipo: null, linkVencido: false })
  })

  it('confirmação de e-mail: o motivo vem na consulta e o login no #', () => {
    expect(lerVolta('?volta=confirmacao', '#access_token=abc&type=signup')).toEqual({ tipo: 'confirmacao', linkVencido: false })
  })

  it('troca de senha, mesmo sem o motivo na consulta', () => {
    expect(lerVolta('', '#access_token=abc&type=recovery')).toEqual({ tipo: 'recuperacao', linkVencido: false })
  })

  it('CA-143 e CA-147: link vencido chega como erro no #', () => {
    expect(lerVolta('?volta=recuperacao', '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired')).toEqual({
      tipo: 'recuperacao',
      linkVencido: true,
    })
  })

  it('volta do Mercado Pago, que acrescenta os próprios parâmetros', () => {
    expect(lerVolta('?volta=pagamento&preapproval_id=2c93', '')).toEqual({ tipo: 'pagamento', linkVencido: false })
  })

  it('motivo desconhecido é ignorado', () => {
    expect(lerVolta('?volta=qualquer', '')).toEqual({ tipo: null, linkVencido: false })
  })
})

describe('destinoDaVolta', () => {
  it('confirmação leva ao destino guardado, ou ao painel', () => {
    expect(destinoDaVolta({ tipo: 'confirmacao', linkVencido: false }, { tela: 'assinar', plano: 'solo', ciclo: 'anual' })).toEqual({
      tela: 'assinar',
      plano: 'solo',
      ciclo: 'anual',
    })
    expect(destinoDaVolta({ tipo: 'confirmacao', linkVencido: false }, null)).toEqual({ tela: 'painel' })
  })

  it('troca de senha abre Nova senha; pagamento abre a volta do pagamento', () => {
    expect(destinoDaVolta({ tipo: 'recuperacao', linkVencido: false }, null)).toEqual({ tela: 'nova-senha' })
    expect(destinoDaVolta({ tipo: 'pagamento', linkVencido: false }, null)).toEqual({ tela: 'pagamento' })
  })

  it('link vencido cai na tela que pede outro link', () => {
    expect(destinoDaVolta({ tipo: 'recuperacao', linkVencido: true }, null)).toEqual({ tela: 'nova-senha', vencido: true })
    expect(destinoDaVolta({ tipo: 'confirmacao', linkVencido: true }, null)).toEqual({ tela: 'confirmar-email', vencido: true })
  })
})
