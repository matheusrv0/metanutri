// A mensagem da nutricionista e a próxima consulta no link (spec lado-do-paciente, D-1208, D-1209, CA-2212 e CA-2214).
import { assinaturaDaMensagem, consultaEmHoje, consultaEmSemana, mensagemDoLink } from './mensagemDoLink.ts'

// Terça, 3 de novembro de 2026, 9:41 em Brasília.
const AGORA = new Date('2026-11-03T12:41:00Z')

describe('CA-2212: a mensagem', () => {
  it('CA-2212: "Ana Lima · 3 nov."', () => {
    expect(assinaturaDaMensagem('Ana Lima', '2026-11-03T13:00:00Z')).toBe('Ana Lima · 3 nov.')
  })

  it('CA-2212: o dia é o de Brasília (às 22h de Brasília ainda é o mesmo dia)', () => {
    expect(assinaturaDaMensagem('Ana Lima', '2026-11-04T01:00:00Z')).toBe('Ana Lima · 3 nov.')
  })

  it('CA-2212: sem nome, só a data; sem data, só o nome', () => {
    expect(assinaturaDaMensagem(null, '2026-11-03T13:00:00Z')).toBe('3 nov.')
    expect(assinaturaDaMensagem('Ana Lima', null)).toBe('Ana Lima')
  })

  it('CA-2212: a mensagem apagada tira o cartão; o texto vai até 400 caracteres', () => {
    expect(mensagemDoLink('   ')).toBeNull()
    expect(mensagemDoLink(null)).toBeNull()
    expect(mensagemDoLink(' Oi ')).toBe('Oi')
    expect(mensagemDoLink('a'.repeat(450))).toHaveLength(400)
  })
})

describe('CA-2214: a próxima consulta', () => {
  it('CA-2214: em Hoje, "Próxima consulta: ter., 17/11, às 14:30"', () => {
    expect(consultaEmHoje('2026-11-17T14:30', AGORA)).toBe('Próxima consulta: ter., 17/11, às 14:30')
  })

  it('CA-2214: em Semana, "Próxima consulta: terça, 17 de novembro, às 14:30"', () => {
    expect(consultaEmSemana('2026-11-17T14:30', AGORA)).toBe('Próxima consulta: terça, 17 de novembro, às 14:30')
  })

  it('CA-2214: sem horário, só o dia', () => {
    expect(consultaEmHoje('2026-12-01', AGORA)).toBe('Próxima consulta: ter., 01/12')
    expect(consultaEmSemana('2026-12-01', AGORA)).toBe('Próxima consulta: terça, 1º de dezembro')
  })

  it('CA-2214: quando a consulta passa (1 hora depois do horário, D-145), some', () => {
    expect(consultaEmHoje('2026-11-03T08:00', AGORA)).toBeNull()
    expect(consultaEmHoje('2026-11-03T09:00', AGORA)).toBe('Próxima consulta: ter., 03/11, às 09:00')
    expect(consultaEmSemana('2026-11-02', AGORA)).toBeNull()
  })

  it('CA-2214: sem consulta, ou com valor estranho, nada', () => {
    expect(consultaEmHoje(null, AGORA)).toBeNull()
    expect(consultaEmHoje('amanhã', AGORA)).toBeNull()
  })
})
