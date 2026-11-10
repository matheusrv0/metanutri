// @vitest-environment node
// Os nove e-mails (spec lado-do-paciente, seção 6 e D-1233/D-1234): os textos exatos, o desenho e o que nunca vai neles.
import { describe, expect, it } from 'vitest'
import {
  cabecalhosDeDescadastro,
  comNome,
  corDoBotao,
  emailAdesaoDaSemana,
  emailConfirmeOsAvisos,
  emailEnderecoTrocado,
  emailLembrete,
  emailLinkDoPlano,
  emailPlanoAtualizado,
  emailPlanoEnviado,
  emailResumoDaSemana,
  emailUltimoLembrete,
  linhaDoRegistro,
  nomeCurto,
  periodo,
  primeiroNomeDe,
  type EmailMontado,
  type Remetente,
} from '../../supabase/functions/_shared/avisos/emails.ts'

const ANA: Remetente = { nome: 'Ana Lima', registro: 'Nutricionista · CRN-3 12345', cor: '#3f5f2a' }
const URL = 'https://app.metanutri.com.br/p/k7q2mx9pla3r'
const SAIR = 'https://app.metanutri.com.br/avisos/abcdefghijklmnopqrstuvwxyz123456'
const SEMANA = [
  ['2026-10-29', 3],
  ['2026-10-30', 6],
  ['2026-10-31', 0],
  ['2026-11-01', 2],
  ['2026-11-02', 4],
  ['2026-11-03', 0],
  ['2026-11-04', 5],
].map(([dia, feitas]) => ({ dia: String(dia), feitas: Number(feitas) }))

/** Os nove, com Juliana e com Ana Lima. */
const TODOS: readonly [string, EmailMontado][] = [
  ['S1', emailLinkDoPlano({ primeiroNome: 'Juliana', planos: [{ remetente: ANA, url: URL }] })],
  ['S2', emailPlanoEnviado({ primeiroNome: 'Juliana', remetente: ANA, url: URL, atualizadoEm: '2026-11-03', convite: { avisos: ['plano', 'semana', 'lembrete'], url: SAIR }, urlSair: SAIR })],
  ['S3', emailConfirmeOsAvisos({ primeiroNome: 'Juliana', remetente: ANA, avisos: ['semana', 'lembrete'], diaDaSemana: 4, urlConfirmar: SAIR })],
  ['S4', emailEnderecoTrocado({ primeiroNome: 'Juliana', remetente: ANA, url: URL })],
  ['A1', emailPlanoAtualizado({ primeiroNome: 'Juliana', remetente: ANA, url: URL, atualizadoEm: '2026-11-03', urlSair: SAIR })],
  ['A2', emailResumoDaSemana({ primeiroNome: 'Juliana', remetente: ANA, url: URL, semana: SEMANA, dias: 5, missoes: 6, diaDaSemana: 4, urlSair: SAIR })],
  ['A3', emailLembrete({ primeiroNome: 'Juliana', remetente: ANA, url: URL, dias: 3, urlSair: SAIR })],
  ['A4', emailUltimoLembrete({ primeiroNome: 'Juliana', remetente: ANA, url: URL, urlSair: SAIR })],
  [
    'N1',
    emailAdesaoDaSemana({
      inicio: '2026-10-26',
      fim: '2026-11-01',
      numeros: { emDia: 12, atencao: 4, pararam: 3, naoComecaram: 1 },
      pararam: [
        { nome: 'Carlos Souza', dias: 9 },
        { nome: 'Beatriz Rocha, 27 anos', dias: 6 },
        { nome: 'Pedro Alves', dias: 4 },
      ],
      urlAdesao: 'https://app.metanutri.com.br/#/adesao',
      urlSair: SAIR,
    }),
  ],
]

describe('CA-2287: os textos da seção 6, um a um', () => {
  const de = (id: string): EmailMontado => {
    const achado = TODOS.find(([i]) => i === id)?.[1]
    if (!achado) throw new Error(id)
    return achado
  }

  it('CA-2287: S1 "Seu link do plano"', () => {
    const e = de('S1')
    expect([e.assunto, e.preCabecalho]).toEqual(['Seu link do plano', 'Abra o seu plano com um toque.'])
    expect(e.texto).toContain('Juliana, este é o link do seu plano.')
    expect(e.texto).toContain(`Abrir meu plano: ${URL}`)
    expect(e.texto).toContain('O link é pessoal. Guarde este e-mail para abrir quando precisar.')
    expect(e.texto).toContain('Você pediu este link em app.metanutri.com.br. Se não foi você, ignore este e-mail.')
  })

  it('CB-1200: S1 com dois planos: "MetaNutri" no topo e uma linha por nutricionista, com "Abrir"', () => {
    const carlos: Remetente = { nome: 'Carlos Souza', registro: 'Nutricionista', cor: null }
    const e = emailLinkDoPlano({ primeiroNome: 'Juliana', planos: [{ remetente: ANA, url: URL }, { remetente: carlos, url: `${URL}x` }] })
    expect(e.texto.split('\n')[0]).toBe('MetaNutri')
    expect(e.texto).toContain('Juliana, estes são os links dos seus planos.')
    expect(e.texto).toContain(`Ana Lima: ${URL}`)
    expect(e.texto).toContain(`Carlos Souza: ${URL}x`)
    expect(e.html.match(/>Abrir</g)).toHaveLength(2)
  })

  it('CA-2287: S2 "Ana Lima enviou seu plano", com o bloco dos avisos', () => {
    const e = de('S2')
    expect([e.assunto, e.preCabecalho]).toEqual(['Ana Lima enviou seu plano', 'Atualizado em 3 de novembro.'])
    expect(e.texto).toContain('Juliana, seu plano está neste link.')
    expect(e.texto).toContain('Avisos por e-mail')
    expect(e.texto).toContain('Ana Lima pode avisar quando o plano mudar, mandar o resumo da semana e lembrar das missões se você ficar 3 dias sem marcar.')
    expect(e.texto).toContain('Quero receber os avisos')
    expect(e.texto).toContain('Ana Lima enviou este e-mail pelo MetaNutri. Para falar com ela, responda.')
    expect(e.texto).toContain('Não quero receber e-mails deste plano')
  })

  it('CA-2243: S2 sem avisos oferecidos e não aceitos: sem o bloco', () => {
    const e = emailPlanoEnviado({ primeiroNome: 'Juliana', remetente: ANA, url: URL, atualizadoEm: '2026-11-03', convite: null, urlSair: SAIR })
    expect(e.texto).not.toContain('Avisos por e-mail')
    expect(e.texto).not.toContain('Quero receber os avisos')
  })

  it('CA-2242: S2 só oferece os avisos que a nutricionista oferece', () => {
    const e = emailPlanoEnviado({ primeiroNome: 'Juliana', remetente: ANA, url: URL, atualizadoEm: '2026-11-03', convite: { avisos: ['semana'], url: SAIR }, urlSair: SAIR })
    expect(e.texto).toContain('Ana Lima pode mandar o resumo da semana.')
  })

  it('CA-2287: S3 "Confirme os avisos do seu plano", com o dia do resumo', () => {
    const e = de('S3')
    expect([e.assunto, e.preCabecalho]).toEqual(['Confirme os avisos do seu plano', 'Sem a confirmação, nada é enviado.'])
    expect(e.texto).toContain('Juliana, confirme para receber por e-mail:')
    expect(e.texto).toContain('- Resumo da semana, toda quinta\n- Lembrete depois de 3 dias sem marcar')
    expect(e.texto).toContain('Alguém pediu estes avisos no link do seu plano com Ana Lima. Se não foi você, ignore este e-mail.')
    expect(e.html).not.toContain('Não quero')
  })

  it('CA-2287: S4 "Seu link do plano mudou"', () => {
    const e = de('S4')
    expect([e.assunto, e.preCabecalho]).toEqual(['Seu link do plano mudou', 'O link antigo não abre mais.'])
    expect(e.texto).toContain('Juliana, Ana Lima trocou o endereço do seu plano. O link antigo não abre mais.')
    expect(e.texto).toContain('Se você instalou o Meu plano na tela inicial, abra por este botão e instale de novo.')
  })

  it('CA-2287: A1 "Seu plano foi atualizado"', () => {
    const e = de('A1')
    expect([e.assunto, e.preCabecalho]).toEqual(['Seu plano foi atualizado', 'Ana Lima atualizou o seu plano em 3 de novembro.'])
    expect(e.texto).toContain('Juliana, Ana Lima atualizou o seu plano.')
    expect(e.texto).toContain(`Ver o plano: ${URL}`)
    expect(e.texto).toContain('As missões de hoje já seguem o plano novo.')
    expect(e.texto).toContain('Você pediu este aviso no link do seu plano com Ana Lima.')
    expect(e.texto).toContain('Não quero mais receber este aviso')
  })

  it('CA-2287 e CA-2247: A2 "Sua semana: 5 de 7 dias", com as 7 células', () => {
    const e = de('A2')
    expect([e.assunto, e.preCabecalho]).toEqual(['Sua semana: 5 de 7 dias', 'Dentro da meta. Veja a sua semana.'])
    expect(e.texto).toContain('Juliana, você marcou missão em 5 dos últimos 7 dias.')
    expect(e.texto).toContain('qui 3/6 · sex 6/6 · sáb – · dom 2/6 · seg 4/6 · ter – · qua 5/6')
    expect(e.texto).toContain('Dentro da meta.')
    expect(e.texto).toContain('Resumo da semana que você pediu, toda quinta.')
    expect(e.texto).toContain('Não quero mais receber o resumo')
  })

  it('CA-2287: A2 abaixo da meta e sem nenhum dia', () => {
    const dois = emailResumoDaSemana({ primeiroNome: 'Juliana', remetente: ANA, url: URL, semana: SEMANA, dias: 2, missoes: 6, diaDaSemana: 4, urlSair: SAIR })
    expect([dois.assunto, dois.preCabecalho]).toEqual(['Sua semana: 2 de 7 dias', 'A meta é 4 dias.'])
    expect(dois.texto).toContain('A meta é 4 dias por semana.')
    const zero = emailResumoDaSemana({ primeiroNome: 'Juliana', remetente: ANA, url: URL, semana: SEMANA.map((d) => ({ ...d, feitas: 0 })), dias: 0, missoes: 6, diaDaSemana: 4, urlSair: SAIR })
    expect([zero.assunto, zero.preCabecalho]).toEqual(['Sua semana: 0 de 7 dias', 'O plano continua no link.'])
    expect(zero.texto).toContain('Nenhum dia marcado nesta semana. O plano continua no link.')
  })

  it('CA-2287: A3 "Ainda dá tempo de marcar hoje", com os dias sem marcar', () => {
    const e = de('A3')
    expect([e.assunto, e.preCabecalho]).toEqual(['Ainda dá tempo de marcar hoje', 'Suas missões de hoje estão no link.'])
    expect(e.texto).toContain('Juliana, faz 3 dias que você não marca as missões do plano.')
    expect(e.texto).toContain(`Marcar as missões de hoje: ${URL}`)
    expect(e.texto).toContain('Você pediu este lembrete no link do seu plano com Ana Lima.')
    expect(emailLembrete({ primeiroNome: 'Juliana', remetente: ANA, url: URL, dias: 5, urlSair: SAIR }).texto).toContain('faz 5 dias')
  })

  it('CA-2287: A4 "Uma semana sem marcar as missões"', () => {
    const e = de('A4')
    expect([e.assunto, e.preCabecalho]).toEqual(['Uma semana sem marcar as missões', 'Se o plano ficou difícil, fale com Ana Lima.'])
    expect(e.texto).toContain('Juliana, faz uma semana que você não marca as missões. Se o plano ficou difícil, responda a este e-mail: Ana Lima pode ajustar.')
    expect(e.texto).toContain('Este é o último lembrete até você marcar de novo.')
    expect(e.texto).toContain('Não quero mais receber o lembrete')
  })

  it('CA-2287 e CA-2267: N1 "Adesão da semana: 3 pararam de marcar"', () => {
    const e = de('N1')
    expect([e.assunto, e.preCabecalho]).toEqual(['Adesão da semana: 3 pararam de marcar', '12 em dia, 4 em atenção, 1 ainda não começou.'])
    expect(e.texto).toContain('Semana de 26 de outubro a 1º de novembro.')
    expect(e.texto).toContain('Carlos S. · 9 dias\nBeatriz R. · 6 dias\nPedro A. · 4 dias')
    expect(e.texto).toContain('Abrir a Adesão: https://app.metanutri.com.br/#/adesao')
    expect(e.texto).toContain('Resumo de toda segunda, para quem tem pacientes em acompanhamento no MetaNutri.')
    expect(e.texto.split('\n')[0]).toBe('MetaNutri')
  })

  it('CA-2267: N1 sem ninguém parado; com mais de 8, "e mais N na Adesão."', () => {
    const base = { inicio: '2026-11-02', fim: '2026-11-08', urlAdesao: 'x', urlSair: SAIR }
    const ninguem = emailAdesaoDaSemana({ ...base, numeros: { emDia: 5, atencao: 0, pararam: 0, naoComecaram: 0 }, pararam: [] })
    expect(ninguem.assunto).toBe('Adesão da semana: ninguém parou de marcar')
    expect(ninguem.texto).not.toContain('Pararam de marcar\n')
    expect(ninguem.texto).toContain('Semana de 2 a 8 de novembro.')
    const doze = Array.from({ length: 12 }, (_, i) => ({ nome: `Paciente${i} Sobrenome`, dias: 20 - i }))
    const muitos = emailAdesaoDaSemana({ ...base, numeros: { emDia: 0, atencao: 0, pararam: 12, naoComecaram: 0 }, pararam: doze })
    expect(muitos.texto.match(/· \d+ dias/g)).toHaveLength(8)
    expect(muitos.texto).toContain('e mais 4 na Adesão.')
  })

  it('CA-2268: o N1 não tem sobrenome inteiro, e-mail nem telefone de paciente', () => {
    const e = emailAdesaoDaSemana({
      inicio: '2026-10-26',
      fim: '2026-11-01',
      numeros: { emDia: 0, atencao: 0, pararam: 1, naoComecaram: 0 },
      pararam: [{ nome: 'Juliana da Silva Martins, 34 anos, (11) 99999-0000 juliana@x.com', dias: 6 }],
      urlAdesao: 'x',
      urlSair: SAIR,
    })
    expect(e.texto).toContain('Juliana M. · 6 dias')
    for (const vazado of ['Martins', 'Silva', '99999', 'juliana@x.com', '34 anos']) expect(e.html).not.toContain(vazado)
  })
})

describe('CA-2287, CB-1202 e CB-1227: o primeiro nome, e sem nome', () => {
  it('CB-1227: sem nome, a primeira frase começa sem ele, sem vírgula sobrando', () => {
    expect(comNome(null, 'seu plano está neste link.')).toBe('Seu plano está neste link.')
    const s2 = emailPlanoEnviado({ primeiroNome: null, remetente: ANA, url: URL, atualizadoEm: '2026-11-03', convite: null, urlSair: SAIR })
    expect(s2.texto).toContain('\nSeu plano está neste link.')
    expect(emailLembrete({ primeiroNome: null, remetente: ANA, url: URL, dias: 3, urlSair: SAIR }).texto).toContain('\nFaz 3 dias que você não marca as missões do plano.')
    expect(emailLinkDoPlano({ primeiroNome: null, planos: [{ remetente: ANA, url: URL }] }).texto).toContain('\nEste é o link do seu plano.')
  })

  it('CB-1202: o primeiro nome da ficha, mesmo de criança (o e-mail é do responsável)', () => {
    expect(primeiroNomeDe('Pedrinho Alves, 8 anos')).toBe('Pedrinho')
    expect(primeiroNomeDe('   ')).toBeNull()
    expect(nomeCurto('Juliana Martins')).toBe('Juliana M.')
    expect(nomeCurto('Maria das Dores')).toBe('Maria D.')
    expect(nomeCurto('Cher')).toBe('Cher')
  })

  it('período da semana', () => {
    expect(periodo('2026-10-26', '2026-11-01')).toBe('de 26 de outubro a 1º de novembro')
    expect(periodo('2026-11-02', '2026-11-08')).toBe('de 2 a 8 de novembro')
  })
})

describe('o remetente e o registro (D-1225, CA-2258)', () => {
  it('CA-2258: conta de estudante: "Estágio de nutrição, sob supervisão" no lugar do CRN', () => {
    expect(linhaDoRegistro({ estudante: true, crnRegiao: null, crnNumero: null })).toBe('Estágio de nutrição, sob supervisão')
    expect(linhaDoRegistro({ estudante: false, crnRegiao: 3, crnNumero: '12345' })).toBe('Nutricionista · CRN-3 12345')
    const estudante = emailPlanoEnviado({ primeiroNome: 'Juliana', remetente: { ...ANA, registro: linhaDoRegistro({ estudante: true, crnRegiao: null, crnNumero: null }) }, url: URL, atualizadoEm: '2026-11-03', convite: null, urlSair: SAIR })
    expect(estudante.texto.split('\n').slice(0, 2)).toEqual(['Ana Lima', 'Estágio de nutrição, sob supervisão'])
    expect(estudante.html).not.toContain('CRN')
  })

  it('D-1234: o botão na cor dela com letra branca; sem marca (ou sem contraste), teal com marfim', () => {
    expect(corDoBotao('#3f5f2a')).toEqual({ fundo: '#3f5f2a', tinta: '#ffffff' })
    expect(corDoBotao(null)).toEqual({ fundo: '#0e3b43', tinta: '#f6f2ea' })
    expect(corDoBotao('#ffee00')).toEqual({ fundo: '#0e3b43', tinta: '#f6f2ea' })
    expect(corDoBotao('vermelho')).toEqual({ fundo: '#0e3b43', tinta: '#f6f2ea' })
    expect(TODOS.find(([i]) => i === 'S2')?.[1].html).toContain('background-color:#3f5f2a')
    expect(TODOS.find(([i]) => i === 'N1')?.[1].html).toContain('background-color:#0e3b43')
  })
})

describe('o desenho e o que nunca vai (D-1233, D-1234)', () => {
  it.each(TODOS)('CA-2280: %s sem imagem, sem pixel e com o texto puro', (_id, e) => {
    expect(e.html).not.toMatch(/<img|background-image|url\(/i)
    expect(e.texto.length).toBeGreaterThan(40)
    expect(e.texto).not.toMatch(/<[a-z]/i)
  })

  it.each(TODOS)('CA-2288: %s em 480 px, com o botão de 48 px e o claro só', (_id, e) => {
    expect(e.html).toContain('max-width:480px')
    expect(e.html).toContain('height:48px')
    expect(e.html).toContain('<meta name="color-scheme" content="light">')
    expect(e.html).toContain('Manrope, Arial, Helvetica, sans-serif')
  })

  it.each(TODOS)('CA-2287: %s sem "por segurança" e sem exclamação', (_id, e) => {
    expect(`${e.assunto} ${e.preCabecalho} ${e.texto}`).not.toMatch(/por segurança|!/i)
  })

  it('o nome que vem de fora nunca vira HTML', () => {
    const e = emailLembrete({ primeiroNome: '<script>x</script>', remetente: { ...ANA, nome: 'Ana <b>' }, url: URL, dias: 3, urlSair: SAIR })
    expect(e.html).not.toContain('<script>')
    expect(e.html).toContain('&lt;script&gt;')
    expect(e.html).not.toContain('Ana <b>')
  })

  it('CA-2252: o descadastro de um clique, com endereço https e sem mailto', () => {
    const c = cabecalhosDeDescadastro('https://projeto.supabase.co/functions/v1/avisos-resposta?c=abc')
    expect(c).toEqual({ 'List-Unsubscribe': '<https://projeto.supabase.co/functions/v1/avisos-resposta?c=abc>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' })
    expect(c['List-Unsubscribe']).not.toContain('mailto')
  })
})
