import {
  formatarTelefone,
  linkDoWhatsApp,
  normalizarTelefone,
  primeiroNome,
  textoDeContato,
  textoDeParabens,
  textoDoLembrete,
  textoDoLink,
} from './whatsapp.ts'

describe('Telefone para o WhatsApp (D-141)', () => {
  it('CA-500: com ou sem 55, +55, 0055 e o 0 da longa distância, o número é o mesmo', () => {
    for (const escrito of ['(11) 98765-4321', '11987654321', '+55 11 98765-4321', '55 11 98765-4321', '0055 11 98765-4321', '011 98765-4321', '+55 (11) 9 8765.4321']) {
      expect(normalizarTelefone(escrito), escrito).toBe('5511987654321')
    }
  })

  it('CA-500: o DDD 55 não se confunde com o código do país', () => {
    expect(normalizarTelefone('(55) 99123-4567')).toBe('5555991234567')
    expect(normalizarTelefone('55 55 99123-4567')).toBe('5555991234567')
    expect(normalizarTelefone('55 55 9123-4567')).toBe('555591234567')
  })

  it('CA-501: sem o nono dígito, ou fixo, vai como está, sem dígito acrescentado', () => {
    expect(normalizarTelefone('(11) 8765-4321')).toBe('551187654321')
    expect(normalizarTelefone('(11) 3456-7890')).toBe('551134567890')
    expect(normalizarTelefone('+55 21 2345-6789')).toBe('552123456789')
  })

  it('CA-502: vazio, curto, comprido, DDD inexistente, celular sem o 9 na frente e outro país são recusados', () => {
    for (const escrito of [
      '',
      '   ',
      '1234',
      '119876543210',
      '5511987654321000',
      '(00) 98765-4321',
      '(20) 98765-4321',
      '(10) 98765-4321',
      '(11) 88765-4321',
      '(11) 0876-5432',
      '(11) 1876-5432',
      '+351 912 345 678',
      '+1 415 555 0100',
      '0044 20 7946 0958',
    ]) {
      expect(normalizarTelefone(escrito), escrito).toBeNull()
    }
  })

  it('CB-140: letras e texto colado não viram link; só os dígitos contam', () => {
    expect(normalizarTelefone('javascript:alert(1)')).toBeNull()
    expect(normalizarTelefone('tel: 11 98765 4321 (recado)')).toBe('5511987654321')
  })

  it('formata o número para quem lê: (11) 98765-4321 e (11) 3456-7890', () => {
    expect(formatarTelefone('5511987654321')).toBe('(11) 98765-4321')
    expect(formatarTelefone('551134567890')).toBe('(11) 3456-7890')
  })
})

describe('O endereço do WhatsApp (D-140)', () => {
  it('CA-504: wa.me com o número e o texto codificado', () => {
    expect(linkDoWhatsApp('5511987654321', 'Oi, Ana!')).toBe('https://wa.me/5511987654321?text=Oi%2C%20Ana!')
  })

  it('CB-141: sem texto, abre a conversa sem ?text=', () => {
    expect(linkDoWhatsApp('5511987654321', '')).toBe('https://wa.me/5511987654321')
    expect(linkDoWhatsApp('5511987654321', '  \n ')).toBe('https://wa.me/5511987654321')
  })

  it('CB-142: acento, quebra de linha, &, ?, # e % chegam iguais', () => {
    const texto = 'Olá, João!\nPão & café? #1 100%'
    const link = linkDoWhatsApp('5511987654321', texto)
    const lido = new URL(link)
    expect(lido.origin).toBe('https://wa.me')
    expect(lido.pathname).toBe('/5511987654321')
    expect(lido.searchParams.get('text')).toBe(texto)
    expect(link).not.toContain('#1')
  })
})

describe('Os textos prontos (D-149)', () => {
  it('CA-507: só o primeiro nome; sem nome, "Oi!" sem vírgula nem espaço sobrando', () => {
    expect(primeiroNome('  Ana   Souza ')).toBe('Ana')
    expect(primeiroNome('')).toBe('')
    expect(textoDoLink('Ana Souza', 'https://metanutri.app/#/missoes/abc').startsWith('Oi, Ana! ')).toBe(true)
    const semNome = textoDoLink('   ', 'https://metanutri.app/#/missoes/abc')
    expect(semNome.startsWith('Oi! ')).toBe(true)
    expect(semNome).not.toMatch(/Oi, !|Oi ,| {2}/)
  })

  it('CA-508: o texto do cartão traz o link do paciente', () => {
    expect(textoDoLink('Ana', 'https://metanutri.app/#/missoes/abc')).toBe(
      'Oi, Ana! Este é o link das suas missões:\nhttps://metanutri.app/#/missoes/abc\nAbra no celular e marque o que fizer a cada dia.',
    )
  })

  it('CA-509: o contato fala das missões, um texto para quem sumiu e outro para quem marca pouco', () => {
    expect(textoDeContato('Ana', 'sumindo')).toBe(
      'Oi, Ana! Tudo bem? Vi que faz alguns dias que você não marca as missões. Como está indo com o plano? Se algo estiver difícil, me conta que a gente ajusta.',
    )
    expect(textoDeContato('Ana', 'atencao')).toContain('Vi que você marcou poucas missões nesta semana.')
  })

  it('CA-510: o lembrete diz o dia, o dia da semana e o horário; sem horário, termina na data', () => {
    const hoje = '2026-10-14'
    expect(textoDoLembrete('Ana Souza', { dia: '2026-10-16', hora: '14:30' }, hoje)).toBe('Oi, Ana! Lembrete: sua consulta é dia 16/10 (sexta-feira) às 14:30. Até lá!')
    expect(textoDoLembrete('Ana', { dia: '2026-10-16', hora: null }, hoje)).toBe('Oi, Ana! Lembrete: sua consulta é dia 16/10 (sexta-feira). Até lá!')
    expect(textoDoLembrete('', { dia: '2026-10-18', hora: null }, hoje)).toBe('Oi! Lembrete: sua consulta é dia 18/10 (domingo). Até lá!')
  })

  it('CA-510: a consulta de hoje diz "hoje às 14:30" no lugar da data', () => {
    const hoje = '2026-10-14'
    expect(textoDoLembrete('Ana Souza', { dia: hoje, hora: '14:30' }, hoje)).toBe('Oi, Ana! Lembrete: sua consulta é hoje às 14:30. Até lá!')
    expect(textoDoLembrete('Ana', { dia: hoje, hora: null }, hoje)).toBe('Oi, Ana! Lembrete: sua consulta é hoje. Até lá!')
  })

  it('CA-511: os parabéns, com e sem nome; antes do dia, adiantados', () => {
    expect(textoDeParabens('Ana Souza', false)).toBe('Feliz aniversário, Ana! Um ótimo dia para você.')
    expect(textoDeParabens('', false)).toBe('Feliz aniversário! Um ótimo dia para você.')
    expect(textoDeParabens('Ana Souza', true)).toBe('Feliz aniversário adiantado, Ana! Que o seu dia seja ótimo.')
    expect(textoDeParabens('', true)).toBe('Feliz aniversário adiantado! Que o seu dia seja ótimo.')
  })
})

describe('Caractere quebrado no texto (CB-142)', () => {
  /** "Oi " mais a primeira metade de um emoji, sem a segunda: o que sobra ao cortar um emoji no meio. */
  const QUEBRADO = 'Oi \uD83D'
  /** O caractere de troca (U+FFFD), escrito pelo código para não depender de como o arquivo foi salvo. */
  const TROCA = String.fromCharCode(0xfffd)

  it('não derruba o link: a metade solta vira o caractere de troca', () => {
    expect(() => encodeURIComponent(QUEBRADO)).toThrow(URIError)
    const link = linkDoWhatsApp('5511987654321', QUEBRADO)
    expect(link).toBe('https://wa.me/5511987654321?text=Oi%20%EF%BF%BD')
    expect(new URL(link).searchParams.get('text')).toBe(`Oi ${TROCA}`)
  })

  it('emoji inteiro passa sem troca', () => {
    expect(new URL(linkDoWhatsApp('5511987654321', 'Oi 😀')).searchParams.get('text')).toBe('Oi 😀')
  })

  it('sem o toWellFormed do navegador, a troca é feita na mão', () => {
    const prototipo = String.prototype as { toWellFormed?: unknown }
    const original = prototipo.toWellFormed
    delete prototipo.toWellFormed
    try {
      expect(linkDoWhatsApp('5511987654321', `${QUEBRADO} e \uDE00 ok 😀`)).toBe(`https://wa.me/5511987654321?text=${encodeURIComponent(`Oi ${TROCA} e ${TROCA} ok 😀`)}`)
    } finally {
      prototipo.toWellFormed = original
    }
  })
})
