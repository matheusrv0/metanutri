import { descreverEstagio } from './descreverEstagio.ts'
import { DRI } from './tabelas.ts'

describe('CA-1194 (spec textos-e-promessas, D-410): o estágio de vida das referências, por extenso', () => {
  const estagio = (id: string) => {
    const achado = DRI.estagios.find((e) => e.id === id)
    if (!achado) throw new Error(`sem o estágio ${id}`)
    return achado
  }

  it.each([
    ['masculino-19-30', 'homens de 19 a 30 anos'],
    ['feminino-31-50', 'mulheres de 31 a 50 anos'],
    ['masculino-71+', 'homens de 71 anos ou mais'],
    ['crianca-1-3', 'crianças de 1 a 3 anos'],
    ['gestante-19-30', 'gestantes de 19 a 30 anos'],
    ['lactante-14-18', 'lactantes de 14 a 18 anos'],
  ])('%s vira "%s"', (id, texto) => {
    expect(descreverEstagio(estagio(id))).toBe(texto)
  })

  it('todo estágio da tabela tem descrição, sem o código interno', () => {
    for (const e of DRI.estagios) expect(descreverEstagio(e)).not.toMatch(/-\d|masculino|feminino|crianca/)
  })
})
