// Circunferências e diâmetros (spec antropometria-telas, D-1410 e D-1411).
import { screen, within } from '@testing-library/react'
import { abrirAvaliacao, casoDe } from './apoioDaVista.test-utils.tsx'

const grupo = (nome: string) => screen.getByRole('group', { name: nome })
const campo = (nome: string) => screen.getByRole('textbox', { name: nome })

describe('circunferências (spec antropometria-telas, CA-2416 a CA-2418)', () => {
  it('CA-2416: braço relaxado e contraído com os dois lados; antebraço e punho num campo só', () => {
    abrirAvaliacao(casoDe({}))
    const superiores = within(grupo('Membros superiores'))
    for (const nome of ['Braço relaxado', 'Braço contraído']) {
      expect(superiores.getByRole('textbox', { name: `${nome}, lado direito, em centímetros` })).toBeInTheDocument()
      expect(superiores.getByRole('textbox', { name: `${nome}, lado esquerdo, em centímetros` })).toBeInTheDocument()
    }
    expect(superiores.getByRole('textbox', { name: 'Antebraço, em centímetros' })).toBeInTheDocument()
    expect(superiores.getByRole('textbox', { name: 'Punho, em centímetros' })).toBeInTheDocument()
    expect(superiores.queryByRole('textbox', { name: /Antebraço, lado/ })).not.toBeInTheDocument()
  })

  it('CA-2416: cada campo grava no campo do plano (a panturrilha direita e a cintura nos campos de antes)', async () => {
    const { usuario, gravado } = abrirAvaliacao(casoDe({}))
    const digitar = async (nome: string, texto: string) => usuario.type(campo(nome), texto)
    await digitar('Braço relaxado, lado direito, em centímetros', '31')
    await digitar('Braço relaxado, lado esquerdo, em centímetros', '30,6')
    await digitar('Braço contraído, lado esquerdo, em centímetros', '32')
    await digitar('Antebraço, em centímetros', '25,2')
    await digitar('Punho, em centímetros', '15,4')
    await digitar('Pescoço, em centímetros', '33,8')
    await digitar('Ombro, em centímetros', '104,5')
    await digitar('Peitoral, em centímetros', '94')
    await digitar('Cintura, em centímetros', '84')
    await digitar('Abdômen, em centímetros', '92,5')
    await digitar('Quadril, em centímetros', '104')
    await digitar('Panturrilha, lado direito, em centímetros', '37')
    await digitar('Panturrilha, lado esquerdo, em centímetros', '36,8')
    await digitar('Coxa proximal, lado direito, em centímetros', '62')
    await digitar('Coxa média, lado esquerdo, em centímetros', '55')
    const c = gravado()
    expect(c.medidasCorporais).toMatchObject({
      bracoRelaxadoDireitoCm: 31,
      bracoRelaxadoEsquerdoCm: 30.6,
      bracoContraidoEsquerdoCm: 32,
      antebracoCm: 25.2,
      punhoCm: 15.4,
      pescocoCm: 33.8,
      ombroCm: 104.5,
      peitoralCm: 94,
      abdomenCm: 92.5,
      quadrilCm: 104,
      panturrilhaEsquerdaCm: 36.8,
      coxaProximalDireitaCm: 62,
      coxaEsquerdaCm: 55,
    })
    expect(c.circunferenciaCinturaCm).toBe(84)
    expect(c.circunferenciaPanturrilhaCm).toBe(37)
  })

  it('CB-1483 (D-1522): cintura e as duas panturrilhas conferem a faixa da etapa 1; fora dela, a frase e nenhum dado', async () => {
    const { usuario, gravado } = abrirAvaliacao(casoDe({}))
    await usuario.type(campo('Cintura, em centímetros'), '300')
    expect(campo('Cintura, em centímetros')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Circunferência da cintura deve estar entre 30 e 250 cm.')).toBeInTheDocument()
    await usuario.type(campo('Panturrilha, lado direito, em centímetros'), '5')
    await usuario.type(campo('Panturrilha, lado esquerdo, em centímetros'), '5')
    expect(screen.getAllByText('Circunferência da panturrilha deve estar entre 10 e 80 cm.')).toHaveLength(2)
    expect([gravado().circunferenciaCinturaCm, gravado().circunferenciaPanturrilhaCm, gravado().medidasCorporais.panturrilhaEsquerdaCm]).toEqual([null, null, null])
    // Sem faixa (as outras medidas esperam a Mor), mas zero não vira dado (D-1525).
    await usuario.type(campo('Quadril, em centímetros'), '0')
    expect(screen.getByText('Use um número maior que zero.')).toBeInTheDocument()
    expect(gravado().medidasCorporais.quadrilCm).toBeNull()
  })

  it('CA-2417: o tronco com 3 de 6 medidas, fechado, diz quantas e o botão vira "Exibir"', async () => {
    const { usuario } = abrirAvaliacao(casoDe({ circunferenciaCinturaCm: 84, medidasCorporais: { pescocoCm: 33.8, quadrilCm: 104 } }))
    const idDoTronco = grupo('Tronco').id
    const doTronco = screen.getAllByRole('button', { name: 'Ocultar' }).find((b) => b.getAttribute('aria-controls') === idDoTronco)
    if (!doTronco) throw new Error('sem o botão do tronco')
    expect(doTronco).toHaveAttribute('aria-expanded', 'true')
    await usuario.click(doTronco)
    expect(screen.queryByRole('group', { name: 'Tronco' })).not.toBeInTheDocument()
    expect(screen.getByText('3 de 6 medidas preenchidas')).toBeInTheDocument()
    expect(doTronco).toHaveTextContent('Exibir')
    expect(doTronco).toHaveAttribute('aria-expanded', 'false')
    await usuario.click(doTronco)
    expect(grupo('Tronco')).toBeInTheDocument()
  })

  it('CA-2418: o ponto da cintura; plano antigo, "Ponto não registrado"; a crista ilíaca grava e troca a ajuda', async () => {
    const { usuario, gravado } = abrirAvaliacao(casoDe({}))
    const ponto = screen.getByRole('combobox', { name: 'Ponto da cintura' })
    expect(ponto).toHaveDisplayValue('Ponto não registrado')
    await usuario.click(screen.getByRole('button', { name: 'Como medir: Cintura' }))
    expect(within(screen.getByRole('dialog')).getByText('Cintura · ponto médio (OMS)')).toBeInTheDocument()
    await usuario.selectOptions(ponto, 'Crista ilíaca (NIH)')
    expect(gravado().medidasCorporais.pontoDaCintura).toBe('crista-iliaca')
    await usuario.click(screen.getByRole('button', { name: 'Como medir: Cintura' }))
    const ajuda = screen.getByRole('dialog', { name: 'Como medir: Cintura' })
    expect(within(ajuda).getByText('Cintura · crista ilíaca (NIH)')).toBeInTheDocument()
    expect(within(ajuda).getByRole('img', { name: 'Fita logo acima da crista ilíaca' })).toBeInTheDocument()
  })

  it('CA-2418: o plano novo mostra "Ponto médio (OMS)"', () => {
    abrirAvaliacao(casoDe({ medidasCorporais: { pontoDaCintura: 'ponto-medio' } }))
    expect(screen.getByRole('combobox', { name: 'Ponto da cintura' })).toHaveDisplayValue('Ponto médio (OMS)')
  })
})

describe('diâmetros ósseos (spec antropometria-telas, CA-2419)', () => {
  it('CA-2419: nasce fechado com o resumo; sem dado, travessões', () => {
    abrirAvaliacao(casoDe({}))
    expect(screen.getByText('Punho — · cotovelo — · joelho — cm')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Diâmetros ósseos' })).not.toBeInTheDocument()
  })

  it('CA-2419: com os valores no resumo; aberto, os três campos gravam e o joelho diz "Técnica em conferência"', async () => {
    const { usuario, gravado } = abrirAvaliacao(casoDe({ medidasCorporais: { diametroPunhoCm: 5.1, diametroCotoveloCm: 6.2 } }))
    expect(screen.getByText('Punho 5,1 · cotovelo 6,2 · joelho — cm')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Exibir' }))
    const diametros = within(grupo('Diâmetros ósseos'))
    expect(diametros.getByText('Técnica em conferência')).toBeInTheDocument()
    expect(diametros.queryByRole('button', { name: 'Como medir: Joelho (fêmur)' })).not.toBeInTheDocument()
    await usuario.type(diametros.getByRole('textbox', { name: 'Joelho (fêmur), em centímetros' }), '9,1')
    const punho = diametros.getByRole('textbox', { name: 'Punho (biestiloide), em centímetros' })
    await usuario.clear(punho)
    await usuario.type(punho, '5,3')
    expect(gravado().medidasCorporais).toMatchObject({ diametroPunhoCm: 5.3, diametroCotoveloCm: 6.2, diametroJoelhoCm: 9.1 })
  })
})
