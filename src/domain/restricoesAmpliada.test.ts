// Spec base-ampliada, CA-1723 e CB-710: as restrições do paciente na base ampliada (pelo nome e pelo grupo, D-717).
import arquivo from '../data/base-ampliada.json'
import { calcularAdequacao } from './adequacao.ts'
import { decodificarBaseAmpliada, type ArquivoBaseAmpliada } from './baseAmpliada.ts'
import { sugerirParaCobrir } from './cobrir.ts'
import { comCuidadosDaFase, montarRestricoes, restricaoDoAlimento } from './restricoes.ts'
import { alimentosParaSugerir, buscarAlimento, registrarBaseAmpliada } from './tabelas.ts'
import { totaisDeItens } from './totais.ts'

const BASE = decodificarBaseAmpliada(arquivo as unknown as ArquivoBaseAmpliada)
const porNome = (nome: string) => {
  const a = BASE.find((x) => x.descricao === nome)
  if (!a) throw new Error(`Sem ${nome} na base ampliada.`)
  return a
}
const marcadas = (...ids: string[]) => montarRestricoes({ marcadas: ids, texto: '', doencas: [], naoGosta: '' })

afterEach(() => registrarBaseAmpliada([]))

describe('CA-1723: restrições na base ampliada', () => {
  it('alergia a peixe pega a tilápia pelo nome, e ela sai do Cobrir', () => {
    const tilapia = porNome('Tilápia, filé, grelhada')
    expect(restricaoDoAlimento(tilapia, marcadas('peixe'))).toBe('Alergia: peixe')
    registrarBaseAmpliada(BASE)
    const vazio = totaisDeItens([], buscarAlimento)
    const ad = calcularAdequacao(vazio, { sexo: 'F', idadeAnos: 28, condicao: { tipo: 'nenhuma' } }, { tipo: 'individual' })
    const r = sugerirParaCobrir('vitamina_d_mcg', vazio, ad, { gastoEnergetico: 2000, alimentos: alimentosParaSugerir(), restricoes: marcadas('peixe') })
    expect(r.sugestoes.map((s) => buscarAlimento(s.alimentoId)?.categoria)).not.toContain('Pescados e frutos do mar')
  })

  it('o peixe que o nome não diz é pego pelo grupo, com o grupo no aviso (D-511)', () => {
    expect(restricaoDoAlimento(porNome('Hadoque, filé, grelhado'), marcadas('peixe'))).toBe('Alergia: peixe (grupo Pescados e frutos do mar)')
  })

  it('alergia a soja pega tempeh, edamame e tofu', () => {
    for (const nome of ['Tempeh, cru', 'Edamame, cozido', 'Tofu, firme']) expect(restricaoDoAlimento(porNome(nome), marcadas('soja')), nome).toBe('Alergia: soja')
  })

  it('glúten pega a espelta e o trigo para quibe; trigo pega a espelta', () => {
    expect(restricaoDoAlimento(porNome('Farinha, de espelta, integral'), marcadas('gluten'))).toBe('Intolerância: glúten')
    expect(restricaoDoAlimento(porNome('Farinha, de espelta, integral'), marcadas('trigo'))).toBe('Alergia: trigo')
    expect(restricaoDoAlimento(porNome('Trigo para quibe (bulgur), cozido'), marcadas('gluten'))).toBe('Intolerância: glúten')
  })

  it('leite pega o cottage e o kefir pelo grupo e pelo nome; vegetariano pega a carne', () => {
    expect(restricaoDoAlimento(porNome('Queijo, cottage'), marcadas('leite'))).toBe('Alergia: leite e derivados')
    expect(restricaoDoAlimento(porNome('Kefir, natural, semidesnatado'), marcadas('lactose'))).toBe('Intolerância: lactose')
    expect(restricaoDoAlimento(porNome('Cabrito, assado'), marcadas('vegetariano'))).toBe('Não come por escolha: vegetariano')
  })
})

describe('CB-710: cuidado da fase e mercúrio', () => {
  it('nenhum sugerível é peixe com muito mercúrio, miúdo ou fígado', () => {
    const sugeriveis = BASE.filter((a) => a.ampliada?.sugerivel)
    for (const a of sugeriveis) {
      expect(a.descricao, a.descricao).not.toMatch(/espadarte|cação|cavala-rei|peixe-batata|atum-azul|fígado|rim|coração|moela|língua|tutano|miolo/i)
    }
  })

  it('o fígado da base ampliada, na gestação, pega o cuidado da fase', () => {
    const figado = BASE.find((a) => /fígado/i.test(a.descricao))
    expect(figado).toBeDefined()
    const gestante = comCuidadosDaFase(marcadas(), { condicao: { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 60 }, idadeAnos: 28 })
    expect(figado ? restricaoDoAlimento(figado, gestante) : null).toMatch(/Na gestação, evite fígado/)
  })
})

describe('D-716e: alertas falsos (achado 4 da revisão)', () => {
  it('a couve-manteiga não é leite: a pontuação sai do nome antes da exceção, na base ampliada e no alimento próprio', () => {
    expect(restricaoDoAlimento(porNome('Couve, manteiga, cozida'), marcadas('leite'))).toBeNull()
    expect(restricaoDoAlimento({ id: 900_001, descricao: 'Couve, manteiga, refogada' }, marcadas('leite'))).toBeNull()
    // A manteiga de verdade continua pegando.
    expect(restricaoDoAlimento({ id: 900_002, descricao: 'Manteiga, com sal' }, marcadas('leite'))).toBe('Alergia: leite e derivados')
  })

  it('o ovo de galinha não acusa vegetariano; a galinha e o caldo de galinha continuam acusando', () => {
    for (const id of [100097, 100098, 100099, 100100, 100639]) {
      const ovo = BASE.find((a) => a.id === id)
      expect(ovo, String(id)).toBeDefined()
      if (ovo) expect(restricaoDoAlimento(ovo, marcadas('vegetariano')), ovo.descricao).toBeNull()
    }
    expect(restricaoDoAlimento({ id: 900_003, descricao: 'Galinha caipira, cozida' }, marcadas('vegetariano'))).toBe('Não come por escolha: vegetariano')
    expect(restricaoDoAlimento({ id: 900_004, descricao: 'Caldo de galinha' }, marcadas('vegetariano'))).toBe('Não come por escolha: vegetariano')
    // O ovo continua sendo ovo para a alergia e para o vegano.
    expect(restricaoDoAlimento(porNome('Ovo, de galinha, inteiro, pochê'), marcadas('ovo'))).toBe('Alergia: ovo')
    expect(restricaoDoAlimento(porNome('Ovo, de galinha, inteiro, pochê'), marcadas('vegano'))).not.toBeNull()
  })
})
