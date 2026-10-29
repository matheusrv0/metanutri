// Spec base-ampliada, fase 2, D-761 (revisão da fase 2, achado 1): os alergênicos do rótulo na cópia em Meus alimentos.
import { montarRestricoes, restricaoDoAlimento, type AlimentoParaRestricao } from './restricoes.ts'
import type { AlergenicosDoRotulo } from './tipos.ts'

const comRotulo = (descricao: string, alergenicos: AlergenicosDoRotulo): AlimentoParaRestricao => ({ id: 900_500, descricao, proprio: { alergenicos } })
const marcadas = (...ids: string[]) => montarRestricoes({ marcadas: ids, texto: '', doencas: [], naoGosta: '' })
const celiaca = montarRestricoes({ marcadas: [], texto: '', doencas: ['celiaca'], naoGosta: '' })

describe('D-761: o que o rótulo diz liga a restrição, além do nome', () => {
  const nescau = comRotulo('Nescau (Nestlé)', { contem: ['trigo', 'gluten', 'leite', 'lactose', 'soja'], podeConter: [], semInformacao: false })

  it('"contém" acusa como o nome acusaria', () => {
    expect(restricaoDoAlimento(nescau, marcadas('leite'))).toBe('Alergia: leite e derivados')
    expect(restricaoDoAlimento(nescau, marcadas('gluten'))).toBe('Intolerância: glúten')
    expect(restricaoDoAlimento(nescau, celiaca)).not.toBeNull()
    expect(restricaoDoAlimento(nescau, marcadas('lactose'))).toBe('Intolerância: lactose')
    expect(restricaoDoAlimento(nescau, marcadas('vegano'))).not.toBeNull()
    expect(restricaoDoAlimento(nescau, marcadas('ovo'))).toBeNull()
  })

  it('"pode conter" acusa nas alergias e no glúten, com o texto "pode conter"; na intolerância à lactose, não', () => {
    const toddy = comRotulo('Achocolatado Toddy (Toddy)', { contem: ['trigo', 'gluten', 'soja'], podeConter: ['leite', 'lactose', 'ovo'], semInformacao: false })
    expect(restricaoDoAlimento(toddy, marcadas('leite'))).toBe('Alergia: leite e derivados (pode conter)')
    expect(restricaoDoAlimento(toddy, marcadas('ovo'))).toBe('Alergia: ovo (pode conter)')
    expect(restricaoDoAlimento(toddy, marcadas('lactose'))).toBeNull()
    const biscoito = comRotulo('Salgadinho de milho (Marca)', { contem: [], podeConter: ['trigo', 'gluten'], semInformacao: false })
    expect(restricaoDoAlimento(biscoito, celiaca)).toMatch(/pode conter/)
  })

  it('sem informação do OFF, com alergia ou intolerância marcada, a linha manda conferir a embalagem', () => {
    const pacoca = comRotulo('Doce (Marca)', { contem: [], podeConter: [], semInformacao: true })
    expect(restricaoDoAlimento(pacoca, marcadas('amendoim'))).toBe('Sem informação de alergênicos: confira a embalagem.')
    expect(restricaoDoAlimento(pacoca, marcadas('lactose'))).toBe('Sem informação de alergênicos: confira a embalagem.')
    // Só a escolha (vegetariano) não pede a embalagem; sem restrição, nada.
    expect(restricaoDoAlimento(pacoca, marcadas('vegetariano'))).toBeNull()
    expect(restricaoDoAlimento(pacoca, marcadas())).toBeNull()
    // O nome ainda acusa antes do aviso.
    expect(restricaoDoAlimento(comRotulo('Paçoca de amendoim', { contem: [], podeConter: [], semInformacao: true }), marcadas('amendoim'))).toBe('Alergia: amendoim')
  })
})
