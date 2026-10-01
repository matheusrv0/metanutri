import type { Armazenamento } from '@/domain/persistencia.ts'
import { CHAVE_DESTINO, destinoDepoisDoCadastro, destinoDoPlano, guardarDestino, rotaDePlanos, tirarDestino } from './fluxoConta.ts'

function memoria(): Armazenamento & { readonly dados: Map<string, string> } {
  const dados = new Map<string, string>()
  return {
    dados,
    getItem: (c) => dados.get(c) ?? null,
    setItem: (c, v) => void dados.set(c, v),
    removeItem: (c) => void dados.delete(c),
  }
}

describe('para onde vai o botão de cada plano', () => {
  it('CA-117 e CA-124: Free sem sessão vai criar conta; com sessão, painel', () => {
    expect(destinoDoPlano('free', 'mensal', false)).toEqual({ tela: 'criar-conta' })
    expect(destinoDoPlano('free', 'anual', true)).toEqual({ tela: 'painel' })
  })

  it('CA-122: Solo ou Pro sem sessão vai criar conta com o plano e o ciclo marcados', () => {
    expect(destinoDoPlano('solo', 'anual', false)).toEqual({ tela: 'criar-conta', plano: 'solo', ciclo: 'anual' })
    expect(destinoDoPlano('pro', 'mensal', false)).toEqual({ tela: 'criar-conta', plano: 'pro' })
  })

  it('CA-123: com sessão, Solo ou Pro vão direto ao checkout', () => {
    expect(destinoDoPlano('pro', 'anual', true)).toEqual({ tela: 'assinar', plano: 'pro', ciclo: 'anual' })
  })

  it('CA-125 e CA-305: Estudante sem sessão cria conta; com sessão vai para Comprovar matrícula', () => {
    expect(destinoDoPlano('estudante', 'anual', false)).toEqual({ tela: 'criar-conta', plano: 'estudante' })
    expect(destinoDoPlano('estudante', 'mensal', true)).toEqual({ tela: 'comprovar-matricula' })
  })

  it('CA-126: Clínica não navega (a tela mostra o contato)', () => {
    expect(destinoDoPlano('clinica', 'mensal', false)).toBeNull()
  })
})

describe('depois do cadastro (CA-133)', () => {
  it('plano pago vai pagar; Free ou nenhum vão para o painel', () => {
    expect(destinoDepoisDoCadastro('solo', 'anual', 'nutricionista')).toEqual({ tela: 'assinar', plano: 'solo', ciclo: 'anual' })
    expect(destinoDepoisDoCadastro(null, 'mensal', 'nutricionista')).toEqual({ tela: 'painel' })
  })

  it('CA-270: estudante vai para o comprovante; nutricionista segue o plano', () => {
    expect(destinoDepoisDoCadastro('estudante', 'mensal', 'estudante')).toEqual({ tela: 'comprovar-matricula' })
    expect(destinoDepoisDoCadastro(null, 'mensal', 'estudante')).toEqual({ tela: 'comprovar-matricula' })
    expect(destinoDepoisDoCadastro('solo', 'anual', 'nutricionista')).toEqual({ tela: 'assinar', plano: 'solo', ciclo: 'anual' })
    expect(destinoDepoisDoCadastro(null, 'mensal', 'nutricionista')).toEqual({ tela: 'painel' })
  })
})

describe('destino guardado para depois da confirmação', () => {
  it('guarda, devolve uma vez só e apaga', () => {
    const arm = memoria()
    guardarDestino(arm, { tela: 'assinar', plano: 'pro', ciclo: 'mensal' })
    expect(arm.dados.get(CHAVE_DESTINO)).toBe('#/assinar/pro/mensal')
    expect(tirarDestino(arm)).toEqual({ tela: 'assinar', plano: 'pro', ciclo: 'mensal' })
    expect(tirarDestino(arm)).toBeNull()
  })

  it('sem armazenamento não quebra', () => {
    guardarDestino(null, { tela: 'painel' })
    expect(tirarDestino(null)).toBeNull()
  })
})

describe('limite leva a Preços (CA-177)', () => {
  it('abre Preços com o plano seguinte em destaque', () => {
    expect(rotaDePlanos('free')).toEqual({ tela: 'precos', destaque: 'solo' })
    expect(rotaDePlanos('solo')).toEqual({ tela: 'precos', destaque: 'pro' })
    expect(rotaDePlanos('clinica')).toEqual({ tela: 'precos' })
  })
})
