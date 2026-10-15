// Spec impressao-do-plano, D-181, D-182 e seção 2: o nome do alimento que o paciente lê.
import { criarExemplo } from './exemplo.ts'
import { NOMES_REVISADOS, nomeParaPaciente } from './nomeParaPaciente.ts'
import { PRIMEIRO_ID_PRODUTO } from './produtos.ts'
import { ALIMENTOS, buscarAlimento } from './tabelas.ts'
import type { Alimento } from './tipos.ts'

const nome = (id: number) => nomeParaPaciente(buscarAlimento(id))

const produto = (descricao: string): Alimento => ({
  id: PRIMEIRO_ID_PRODUTO + 1,
  descricao,
  categoria: 'Meus produtos',
  base: null,
  preparo: null,
  qualificadores: null,
  nutrientes: {} as Alimento['nutrientes'],
  tracos: [],
})

describe('nome para o paciente', () => {
  it('CA-623: os alimentos do plano de exemplo saem como o paciente fala', () => {
    let n = 0
    const { plano } = criarExemplo(() => `id${++n}`, '2026-10-15')
    const ids = plano.refeicoes.flatMap((r) => [...r.opcoes.principal, ...r.opcoes.substituto1, ...r.opcoes.substituto2]).map((i) => i.alimentoId)
    expect(ids.map(nome)).toEqual([
      'Pão francês',
      'Margarina com sal',
      'Queijo minas frescal',
      'Mamão Formosa',
      'Banana prata',
      'Castanha-do-pará',
      'Arroz branco cozido',
      'Feijão carioca cozido',
      'Peito de frango grelhado sem pele',
      'Brócolis cozido',
      'Cenoura crua',
      'Macarrão cru',
      'Patinho grelhado sem gordura',
      'Batata inglesa cozida',
      'Filé de merluza assado',
      'Iogurte natural',
      'Aveia em flocos',
      'Arroz integral cozido',
      'Lentilha cozida',
      'Ovo cozido',
      'Alface crespa',
      'Maçã Fuji com casca',
    ])
  })

  it('CA-624: nenhum dos 597 alimentos sai com ficha técnica, e todos cabem em 48 letras', () => {
    expect(ALIMENTOS).toHaveLength(597)
    for (const a of ALIMENTOS) {
      const n = nomeParaPaciente(a)
      expect(n, a.descricao).not.toBe('')
      expect(n, a.descricao).not.toMatch(/[,()/%]|\d|\btipo\b/)
      expect(n, a.descricao).not.toMatch(/\s{2}|^\s|\s$/)
      expect(n.length, a.descricao).toBeLessThanOrEqual(48)
      expect(n.charAt(0), a.descricao).toBe(n.charAt(0).toUpperCase())
    }
  })

  it('seção 2: a regra geral tira a ficha técnica e põe a parte do animal antes', () => {
    expect(nome(264)).toBe('Margarina sem sal') // com óleo hidrogenado, (80% de lipídeos)
    expect(nome(474)).toBe('Cerveja pilsen') // número de amostra
    expect(nome(476)).toBe('Chá mate') // infusão 5%
    expect(nome(45)).toBe('Milho verde enlatado') // drenado
    expect(nome(188)).toBe('Suco concentrado de caju') // envasado
    expect(nome(159)).toBe('Molho de tomate') // industrializado
    expect(nome(273)).toBe('Filé de abadejo assado') // congelado sai quando já está preparado
    expect(nome(275)).toBe('Filé de abadejo congelado cru')
    expect(nome(432)).toBe('Lombo de porco assado')
    expect(nome(170)).toBe('Polpa de acerola congelada')
    expect(nome(215)).toBe('Suco de laranja pera')
    expect(nome(356)).toBe('Fígado de boi grelhado')
    expect(nome(347)).toBe('Costela de boi assada')
    expect(nome(326)).toBe('Acém moído cozido')
    expect(nome(384)).toBe('Carne seca cozida')
    expect(nome(358)).toBe('Filé mignon grelhado sem gordura') // ortografia
    expect(nome(420)).toBe('Linguiça de frango grelhada')
    expect(nome(27)).toBe('Creme de arroz em pó')
    expect(nome(520)).toBe('Azeitona preta em conserva')
    expect(nome(588)).toBe('Castanha-de-caju torrada salgada')
  })

  it('CA-625: "cru" fica onde o preparo muda o peso e sai onde não muda nada', () => {
    for (const [id, esperado] of [
      [40, 'Macarrão cru'],
      [2, 'Arroz integral cru'],
      [562, 'Feijão carioca cru'],
      [409, 'Peito de frango cru sem pele'],
      [302, 'Filé de merluza cru'],
      [489, 'Ovo cru'],
      [110, 'Cenoura crua'],
      [225, 'Mamão Formosa'],
      [589, 'Castanha-do-pará'],
      [597, 'Noz'],
      [78, 'Alface crespa'],
      [107, 'Cebola'],
    ] as const) {
      expect(nome(id)).toBe(esperado)
    }
  })

  it('CA-625: pela regra geral, cru fica em cereal, leguminosa, carne, peixe e ovo, e o preparo nunca sai', () => {
    const revisados = new Set(Object.keys(NOMES_REVISADOS).map(Number))
    const guardaCru = /^(Cereais|Leguminosas|Carnes|Pescados|Ovos)/
    for (const a of ALIMENTOS) {
      const n = nomeParaPaciente(a)
      if (a.preparo && a.preparo !== 'cru') expect(n, a.descricao).toMatch(/cozid|grelhad|assad|frit|refogad|torrad/i)
      if (revisados.has(a.id)) continue
      const cru = /,\s*cru(a|s|as)?\b/i.test(a.descricao)
      if (cru && guardaCru.test(a.categoria)) expect(n, a.descricao).toMatch(/\bcru(a|s|as)?\b/)
      if (cru && /^(Frutas|Nozes)/.test(a.categoria)) expect(n, a.descricao).not.toMatch(/\bcru(a|s|as)?\b/)
    }
  })

  it('CA-626: produto cadastrado sai como a nutricionista escreveu', () => {
    expect(nomeParaPaciente(produto('Iogurte grego, zero açúcar (Marca X)'))).toBe('Iogurte grego, zero açúcar (Marca X)')
    expect(nomeParaPaciente(produto('  whey, baunilha  '))).toBe('whey, baunilha')
  })

  it('CB-180 e CB-182: alimento que saiu da base e produto sem nome', () => {
    expect(nomeParaPaciente(undefined)).toBe('Alimento removido')
    expect(nomeParaPaciente(produto('   '))).toBe('Alimento sem nome')
  })

  it('CA-627: o nome da base não muda', () => {
    expect(buscarAlimento(53)?.descricao).toBe('Pão, trigo, francês')
  })
})
