import { ATRIBUTO_COBRIR, chavesDosCobrir, destinoDoFoco } from './focoDoCobrir.ts'

/** Um contêiner com um botão "Cobrir" por chave, na ordem dada. */
function conteinerCom(...chaves: readonly string[]): HTMLElement {
  const conteiner = document.createElement('div')
  for (const chave of chaves) {
    const botao = document.createElement('button')
    botao.setAttribute(ATRIBUTO_COBRIR, chave)
    botao.textContent = 'Cobrir'
    conteiner.append(botao)
  }
  return conteiner
}

const botaoDe = (conteiner: HTMLElement, chave: string) => conteiner.querySelector(`[${ATRIBUTO_COBRIR}="${chave}"]`)

describe('Para onde vai o foco quando a gaveta do Cobrir fecha (D-212)', () => {
  const titulo = document.createElement('h2')
  const ordem = ['ferro_mg', 'calcio_mg', 'vitamina_a_rae_mcg']

  it('lê as chaves dos Cobrir na ordem da tela', () => {
    expect(chavesDosCobrir(conteinerCom(...ordem))).toEqual(ordem)
    expect(chavesDosCobrir(null)).toEqual([])
  })

  it('CA-713: o Cobrir que abriu continua na tela, e o foco volta a ele', () => {
    const agora = conteinerCom(...ordem)
    expect(destinoDoFoco(agora, ordem, 'calcio_mg', titulo)).toBe(botaoDe(agora, 'calcio_mg'))
  })

  it('CA-713: o Cobrir sumiu, e o foco vai para o do próximo que estava abaixo dele', () => {
    const agora = conteinerCom('vitamina_a_rae_mcg', 'ferro_mg')
    expect(destinoDoFoco(agora, ordem, 'calcio_mg', titulo)).toBe(botaoDe(agora, 'vitamina_a_rae_mcg'))
  })

  it('CA-713: o próximo também sumiu, e vale o seguinte', () => {
    const ordemLonga = [...ordem, 'zinco_mg']
    const agora = conteinerCom('ferro_mg', 'zinco_mg')
    expect(destinoDoFoco(agora, ordemLonga, 'calcio_mg', titulo)).toBe(botaoDe(agora, 'zinco_mg'))
  })

  it('CA-713 e CB-211: sem próximo, o título', () => {
    expect(destinoDoFoco(conteinerCom('ferro_mg', 'calcio_mg'), ordem, 'vitamina_a_rae_mcg', titulo)).toBe(titulo)
    expect(destinoDoFoco(conteinerCom(), ['ferro_mg'], 'ferro_mg', titulo)).toBe(titulo)
  })
})
