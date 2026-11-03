// A refeição da hora no Plano do link (spec lado-do-paciente, D-1206 e CA-2210).
import { minutosDoHorario, refeicaoDaHora } from './refeicaoDaHora.ts'

const PLANO = ['07:00', '12:30', '16:00', '19:30']
const as = (hora: string): number => minutosDoHorario(hora) ?? -1

describe('CA-2210: "Agora" e "Próxima"', () => {
  it('CA-2210: às 9:41, o almoço (12:30) é a "Próxima"', () => {
    expect(refeicaoDaHora(PLANO, as('09:41'))).toEqual({ indice: 1, rotulo: 'Próxima' })
  })

  it('CA-2210: às 12:10 e às 13:20, o almoço é "Agora" (de 30 minutos antes até 1 hora depois)', () => {
    expect(refeicaoDaHora(PLANO, as('12:10'))).toEqual({ indice: 1, rotulo: 'Agora' })
    expect(refeicaoDaHora(PLANO, as('13:20'))).toEqual({ indice: 1, rotulo: 'Agora' })
    expect(refeicaoDaHora(PLANO, as('12:00'))).toEqual({ indice: 1, rotulo: 'Agora' })
    expect(refeicaoDaHora(PLANO, as('13:30'))).toEqual({ indice: 1, rotulo: 'Agora' })
  })

  it('CA-2210: às 13:31, o lanche seguinte é a "Próxima"', () => {
    expect(refeicaoDaHora(PLANO, as('13:31'))).toEqual({ indice: 2, rotulo: 'Próxima' })
  })

  it('CA-2210: depois da última refeição mais 1 hora, nenhuma tem rótulo', () => {
    expect(refeicaoDaHora(PLANO, as('20:31'))).toBeNull()
    expect(refeicaoDaHora(PLANO, as('23:59'))).toBeNull()
  })

  it('CA-2210: de madrugada, o café é a "Próxima"', () => {
    expect(refeicaoDaHora(PLANO, as('05:00'))).toEqual({ indice: 0, rotulo: 'Próxima' })
    expect(refeicaoDaHora(PLANO, as('06:30'))).toEqual({ indice: 0, rotulo: 'Agora' })
  })

  it('refeição sem horário que se leia não conta', () => {
    expect(refeicaoDaHora(['--', '12:30'], as('09:00'))).toEqual({ indice: 1, rotulo: 'Próxima' })
    expect(minutosDoHorario('25:00')).toBeNull()
  })
})
