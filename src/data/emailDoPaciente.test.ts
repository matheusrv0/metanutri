// O endereço do paciente (spec lado-do-paciente, DP-LP-16): o mesmo arquivo serve o app e as funções do servidor.
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { dominioDoEmail, emailValido, hashDoEmail, mascararEmail, normalizarEmail, sugerirCorrecao } from '../../supabase/functions/_shared/avisos/email.ts'
import { todoDia } from '../../supabase/functions/_shared/avisos/tipos.ts'

describe('CB-1211: o endereço guardado sem espaço e em minúsculas', () => {
  it('CB-1211: maiúscula e espaço viram o mesmo endereço', () => {
    expect(normalizarEmail('  Juliana.Martins @Gmail.com ')).toBe('juliana.martins@gmail.com')
    expect(normalizarEmail('JULIANA@GMAIL.COM')).toBe(normalizarEmail('juliana@gmail.com'))
  })

  it('CB-1211: o resumo é o mesmo para o endereço com maiúscula e espaço', async () => {
    expect(await hashDoEmail(' Juliana@Gmail.com')).toBe(await hashDoEmail('juliana@gmail.com'))
  })

  it('D-1243: o resumo é o SHA-256 do endereço normalizado, em hexadecimal', async () => {
    const esperado = createHash('sha256').update('juliana@gmail.com').digest('hex')
    expect(await hashDoEmail('Juliana@gmail.com')).toBe(esperado)
  })
})

describe('emailValido', () => {
  it.each(['juliana@gmail.com', 'a@b.co', 'nome.sobrenome+plano@empresa.com.br'])('aceita %s', (email) => {
    expect(emailValido(email)).toBe(true)
  })

  it.each(['', 'juliana', 'juliana@', '@gmail.com', 'juliana@gmail', 'ju@@gmail.com', 'juliana@.com', 'juliana@gmail..com'])('recusa "%s"', (email) => {
    expect(emailValido(email)).toBe(false)
  })

  it('D-107: até 254 caracteres, e até 64 antes do @', () => {
    const dominio = '@exemplo.com'
    expect(emailValido(`${'a'.repeat(64)}${dominio}`)).toBe(true)
    expect(emailValido(`${'a'.repeat(65)}${dominio}`)).toBe(false)
    const longo = `a@${'b'.repeat(250)}.com.br`
    expect(longo.length).toBeGreaterThan(254)
    expect(emailValido(longo)).toBe(false)
  })

  it('o domínio só sai de endereço válido', () => {
    expect(dominioDoEmail('Juliana@Gmail.com')).toBe('gmail.com')
    expect(dominioDoEmail('juliana')).toBeNull()
  })
})

describe('CA-2235: o endereço mascarado', () => {
  it('CA-2235: a primeira e a última letra antes do @, e o domínio inteiro', () => {
    expect(mascararEmail('juliana@gmail.com')).toBe('j•••a@gmail.com')
    expect(mascararEmail('Juliana.Martins@Gmail.com')).toBe('j•••s@gmail.com')
  })

  it('CA-2235: com uma ou duas letras antes do @, só a primeira', () => {
    expect(mascararEmail('jo@x.com')).toBe('j•••@x.com')
    expect(mascararEmail('j@x.com')).toBe('j•••@x.com')
  })
})

describe('CA-2236: o erro comum de digitação vira uma pergunta', () => {
  it.each([
    ['juliana@gmial.com', 'juliana@gmail.com'],
    ['juliana@hotmal.com', 'juliana@hotmail.com'],
    ['juliana@outlok.com', 'juliana@outlook.com'],
    ['Juliana@GMAIL.CON', 'juliana@gmail.com'],
  ])('CA-2236: %s → %s', (digitado, sugestao) => {
    expect(sugerirCorrecao(digitado)).toBe(sugestao)
  })

  it('CA-2236: domínio certo não ganha pergunta', () => {
    expect(sugerirCorrecao('juliana@gmail.com')).toBeNull()
    expect(sugerirCorrecao('juliana@empresa.com.br')).toBeNull()
    expect(sugerirCorrecao('sem-arroba')).toBeNull()
  })
})

describe('todoDia', () => {
  it('"Toda quinta", "Todo domingo" e "Todo sábado"', () => {
    expect(todoDia(4)).toBe('Toda quinta')
    expect(todoDia(0)).toBe('Todo domingo')
    expect(todoDia(6)).toBe('Todo sábado')
  })
})
