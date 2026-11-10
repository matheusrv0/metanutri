// Os avisos por e-mail na ficha (spec lado-do-paciente, D-1227, CA-2260 a CA-2265, DP-LP-25).
import { describe, expect, it } from 'vitest'
import { convite, estadoDoAviso, linhaDoProximo, origemDoEmail, previaDoProximo, proximoDoLink, quandoDoAviso, semProximo } from './avisosNaFicha.ts'
import { lerEmailsDoLink } from './emailsDoLink.ts'
import { linhaDeEmails } from './emailsFalsos.test-utils.ts'

/** Terça, 3/11/2026, 10h15 em Brasília. */
const AGORA = new Date('2026-11-03T13:15:00.000Z')
const emails = (dados: Readonly<Record<string, unknown>> = {}) => lerEmailsDoLink(linhaDeEmails(dados))
const aceite = (tipo: string, extra: Readonly<Record<string, unknown>> = {}) => ({ tipo, aceito_em: '2026-10-22T12:43:00Z', saiu_em: null, pausado_em: null, ...extra })

describe('CA-2260: o estado de cada aviso para o paciente', () => {
  it('CA-2260: "Recebe" com o aceite ativo', () => {
    expect(estadoDoAviso(emails({ aceites: [aceite('semana')] }), 'semana', AGORA)).toEqual({ texto: 'Recebe', tom: 'ok' })
  })

  it('CA-2260: "Esperando o aceite" com o pedido em aberto ou o convite da última semana', () => {
    expect(estadoDoAviso(emails({ pendentes: ['plano'] }), 'plano', AGORA).texto).toBe('Esperando o aceite')
    expect(estadoDoAviso(emails({ convite_em: '2026-11-01T19:20:00Z' }), 'plano', AGORA).texto).toBe('Esperando o aceite')
  })

  it('CA-2260: "Não aceitou" com o convite antigo; "Sem aceite" sem convite nenhum', () => {
    expect(estadoDoAviso(emails({ convite_em: '2026-10-01T12:00:00Z' }), 'plano', AGORA).texto).toBe('Não aceitou')
    expect(estadoDoAviso(emails(), 'plano', AGORA).texto).toBe('Sem aceite')
  })

  it('CA-2260: "Saiu em 10/11" depois do descadastro', () => {
    expect(estadoDoAviso(emails({ aceites: [aceite('lembrete', { saiu_em: '2026-10-30T12:00:00Z' })] }), 'lembrete', AGORA).texto).toBe('Saiu em 30/10')
  })

  it('CA-2248: "Pausado: sem uso há 3 semanas" no resumo parado sozinho', () => {
    expect(estadoDoAviso(emails({ aceites: [aceite('semana', { pausado_em: '2026-11-01T11:00:00Z' })] }), 'semana', AGORA).texto).toBe('Pausado: sem uso há 3 semanas')
  })

  it('CA-2263: o interruptor desligado vale antes de tudo: "Desligado por você"', () => {
    const e = emails({ ofertas: { plano: false, semana: true, lembrete: true }, aceites: [aceite('plano')] })
    expect(estadoDoAviso(e, 'plano', AGORA)).toEqual({ texto: 'Desligado por você', tom: 'desligado' })
  })

  it('CA-2265: o e-mail devolvido: "E-mail devolvido" em todos, mesmo com aceite', () => {
    const e = emails({ supressao: 'devolvido', aceites: [aceite('semana')] })
    for (const tipo of ['plano', 'semana', 'lembrete'] as const) expect(estadoDoAviso(e, tipo, AGORA)).toEqual({ texto: 'E-mail devolvido', tom: 'erro' })
  })

  it('CB-1213: a queixa de spam: "Pediu para não receber"', () => {
    expect(estadoDoAviso(emails({ supressao: 'queixa' }), 'plano', AGORA).texto).toBe('Pediu para não receber')
  })
})

describe('a origem, o convite e a linha do resumo', () => {
  it('CA-2260: "da ficha", com os avisos aceitos, ou "confirmado por Juliana em 03/11"', () => {
    expect(origemDoEmail(emails(), 'Juliana')).toBe('da ficha')
    expect(origemDoEmail(emails({ aceites: [aceite('semana')] }), 'Juliana')).toBe('da ficha · avisos aceitos por Juliana em 22/10')
    expect(origemDoEmail(emails({ origem: 'paciente', confirmado_em: '2026-11-03T12:00:00Z' }), 'Juliana')).toBe('confirmado por Juliana em 03/11')
  })

  it('CA-2265: corrigido o e-mail, o estado é "Sem aceite" e o convite aparece', () => {
    const e = emails()
    expect(estadoDoAviso(e, 'semana', AGORA).texto).toBe('Sem aceite')
    expect(convite(e, AGORA)).toMatchObject({ aparece: true, pode: true })
  })

  it('D-1227: um convite por mês: com o último em 01/11, o botão espera', () => {
    expect(convite(emails({ convite_em: '2026-11-01T12:00:00Z' }), AGORA)).toEqual({ aparece: true, pode: false, nota: 'Último convite em 01/11. Um por mês.' })
  })

  it('D-1227: sem e-mail que funcione, ou com tudo aceito, nada de convite', () => {
    expect(convite(emails({ supressao: 'devolvido' }), AGORA).aparece).toBe(false)
    expect(convite(emails({ aceites: [aceite('plano'), aceite('semana'), aceite('lembrete')] }), AGORA).aparece).toBe(false)
  })

  it('o resumo diz o dia do aceite: 22/10/2026 foi uma quinta', () => {
    expect(quandoDoAviso(emails({ aceites: [aceite('semana')] }), 'semana')).toBe('Toda quinta, às 8h')
  })
})

describe('CA-2264 e DP-LP-25: o próximo e-mail', () => {
  it('CA-2264: com o resumo aceito numa quinta, o próximo é "Resumo da semana, quinta, 5/11, 8h"', () => {
    const proximo = proximoDoLink({ marcacoes: [{ dia: '2026-11-02', feitas: ['agua', 'frutas'] }], planoEm: null, ultimoAcesso: '2026-11-03' }, emails({ aceites: [aceite('semana')] }), AGORA)
    expect(proximo?.tipo).toBe('A2')
    expect(proximo ? linhaDoProximo(proximo) : null).toBe('Próximo: Resumo da semana, quinta, 5/11, 8h')
  })

  it('a prévia do resumo traz os dias até agora', () => {
    const link = { marcacoes: [{ dia: '2026-11-02', feitas: ['agua', 'frutas'] }, { dia: '2026-10-30', feitas: ['agua'] }], missoes: [{ id: 'agua', texto: '', origem: '' }] }
    const proximo = proximoDoLink({ ...link, planoEm: null, ultimoAcesso: null }, emails({ aceites: [aceite('semana')] }), AGORA)
    if (!proximo) throw new Error('devia haver próximo')
    const previa = previaDoProximo(proximo, link, 'Juliana', 'Ana Lima')
    expect(previa.assunto).toBe('Sua semana: 2 de 7 dias')
    expect(previa.frase).toBe('Juliana, você marcou missão em 2 dos últimos 7 dias.')
    expect(previa.dias).toHaveLength(7)
  })

  it('sem aceite, ou com o e-mail devolvido, não há próximo, e a ficha diz por quê', () => {
    expect(proximoDoLink({ marcacoes: [], planoEm: null, ultimoAcesso: null }, emails(), AGORA)).toBeNull()
    expect(semProximo(emails(), 'Carlos')).toBe('Nenhum: Carlos ainda não aceitou os avisos.')
    expect(semProximo(emails({ supressao: 'devolvido' }), 'Pedro')).toBe('Nenhum: o e-mail voltou.')
    expect(semProximo(emails({ email: null }), 'Bia')).toBe('Nenhum: sem e-mail na ficha.')
  })

  it('CB-1209: o aviso desligado pela nutricionista não entra na previsão', () => {
    const e = emails({ ofertas: { plano: true, semana: false, lembrete: true }, aceites: [aceite('semana')] })
    expect(proximoDoLink({ marcacoes: [], planoEm: null, ultimoAcesso: null }, e, AGORA)).toBeNull()
  })
})
