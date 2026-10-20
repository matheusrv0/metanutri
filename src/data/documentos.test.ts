import agentes from '../../AGENTS.md?raw'
import produto from '../../PRODUCT.md?raw'
import leiame from '../../README.md?raw'

// Spec revisao-geral-trabalho, D-249 e CA-796: os documentos do repositório descrevem o modelo de dados de hoje
// (spec dados-na-nuvem): os dados ficam na nuvem, presos à conta; o navegador guarda só uma cópia de trabalho; só
// existe "Sair"; sem internet, a área de trabalho trava.

const ANTIGOS = [/funciona \*{0,2}offline/i, /roda offline/i, /conta na nuvem (\(Supabase\) )?é opcional/i, /ficam no aparelho/i, /sem login e sem enviar dados/i, /tudo fica no navegador/i]

describe('documentos no modelo de dados na nuvem (CA-796)', () => {
  it.each([
    ['PRODUCT.md', produto],
    ['AGENTS.md', agentes],
    ['README.md', leiame],
  ])('%s não descreve mais o modelo antigo', (_nome, texto) => {
    for (const antigo of ANTIGOS) expect(texto).not.toMatch(antigo)
  })

  it.each([
    ['PRODUCT.md', produto],
    ['AGENTS.md', agentes],
  ])('%s diz que os dados ficam na nuvem, que só existe "Sair" e que sem internet a área trava', (_nome, texto) => {
    expect(texto).toMatch(/na nuvem, presos à conta/)
    expect(texto).toMatch(/cópia de trabalho/)
    expect(texto).toMatch(/só existe "Sair"/i)
    expect(texto).toMatch(/sem internet, a área de trabalho trava/i)
  })
})
