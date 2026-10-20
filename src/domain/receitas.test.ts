import type { Armazenamento } from './persistencia.ts'
import {
  buscarReceitas,
  CHAVE_RECEITAS,
  copiaParaOPlano,
  criarRepositorioReceitas,
  filtrarReceitas,
  totaisDaPorcao,
  validarReceita,
  type DadosReceita,
  type Receita,
} from './receitas.ts'
import { KCAL_DA_PANQUECA, PANQUECA } from './receitas.test-utils.ts'
import { buscarAlimentos } from './busca.ts'
import { ALIMENTOS, buscarAlimento } from './tabelas.ts'

class Memoria implements Armazenamento {
  readonly dados = new Map<string, string>()
  getItem(k: string) {
    return this.dados.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.dados.set(k, v)
  }
  removeItem(k: string) {
    this.dados.delete(k)
  }
}

const DADOS: DadosReceita = {
  nome: PANQUECA.nome,
  ingredientes: PANQUECA.ingredientes,
  porcoes: PANQUECA.porcoes,
  nomeDaPorcao: PANQUECA.nomeDaPorcao,
  pesoProntoG: PANQUECA.pesoProntoG,
  preparo: PANQUECA.preparo,
}

const receita = (id: string, nome: string, extra: Partial<Receita> = {}): Receita => ({
  ...DADOS,
  id,
  nome,
  criadoEm: '2026-10-19T10:00:00.000Z',
  atualizadoEm: '2026-10-19T10:00:00.000Z',
  ...extra,
})

describe('validar a receita (CB-270)', () => {
  it('a receita completa não tem problema', () => {
    expect(validarReceita(DADOS)).toEqual([])
    expect(validarReceita({ ...DADOS, pesoProntoG: null })).toEqual([])
  })

  it('sem nome, sem ingrediente com gramas, sem rendimento ou com peso pronto inválido, diz o que falta', () => {
    const problemas = (dados: Parameters<typeof validarReceita>[0]) => validarReceita(dados).map((p) => [p.campo, p.mensagem])
    expect(problemas({ ...DADOS, nome: '  ' })).toEqual([['nome', 'A receita precisa de um nome.']])
    expect(problemas({ ...DADOS, ingredientes: [] })).toEqual([['ingredientes', 'Adicione pelo menos um ingrediente.']])
    expect(problemas({ ...DADOS, ingredientes: [{ alimentoId: 7, gramas: 0 }] })).toEqual([['ingredientes', 'Adicione pelo menos um ingrediente.']])
    for (const porcoes of [null, 0, -2]) {
      expect(problemas({ ...DADOS, porcoes })).toEqual([['porcoes', 'Diga quantas porções a receita rende.']])
    }
    for (const pesoProntoG of [0, -10]) {
      expect(problemas({ ...DADOS, pesoProntoG })).toEqual([['pesoProntoG', 'O peso pronto precisa ser maior que zero.']])
    }
  })
})

describe('a biblioteca de receitas (CA-861, CA-863 a CA-866)', () => {
  let n = 0
  const opcoes = { agora: () => '2026-10-19T12:00:00.000Z', gerarId: () => `r${(n += 1)}` }
  beforeEach(() => {
    n = 0
  })

  it('CA-861: salva, lista por nome e guarda as datas', () => {
    const arm = new Memoria()
    const repo = criarRepositorioReceitas(arm, opcoes)
    repo.salvar({ ...DADOS, nome: 'Torta de frango' })
    const salva = repo.salvar(DADOS)
    expect(salva).toEqual({ ...DADOS, id: 'r2', criadoEm: '2026-10-19T12:00:00.000Z', atualizadoEm: '2026-10-19T12:00:00.000Z' })
    expect(repo.listar().map((r) => r.nome)).toEqual(['Panqueca de banana', 'Torta de frango'])
    expect(JSON.parse(arm.getItem(CHAVE_RECEITAS) ?? '[]')).toHaveLength(2)
  })

  it('CA-863: editar troca a receita e a hora da mudança, e guarda a criação', () => {
    const arm = new Memoria()
    const repo = criarRepositorioReceitas(arm, opcoes)
    const salva = repo.salvar(DADOS)
    const editada = criarRepositorioReceitas(arm, { ...opcoes, agora: () => '2026-10-20T08:00:00.000Z' }).salvar({ ...DADOS, id: salva.id, porcoes: 4 })
    expect(editada).toMatchObject({ id: salva.id, porcoes: 4, criadoEm: '2026-10-19T12:00:00.000Z', atualizadoEm: '2026-10-20T08:00:00.000Z' })
    expect(repo.listar()).toEqual([editada])
  })

  it('CA-864: duplicar faz "(cópia)", e a cópia de uma cópia vira "(cópia 2)"', () => {
    const repo = criarRepositorioReceitas(new Memoria(), opcoes)
    const salva = repo.salvar(DADOS)
    const copia = repo.duplicar(salva.id)
    expect(copia).toMatchObject({ ...DADOS, nome: 'Panqueca de banana (cópia)' })
    expect(copia?.id).not.toBe(salva.id)
    expect(repo.duplicar(copia?.id ?? '')?.nome).toBe('Panqueca de banana (cópia 2)')
    expect(repo.duplicar('nao-existe')).toBeNull()
  })

  it('CA-865: excluir tira só aquela receita', () => {
    const repo = criarRepositorioReceitas(new Memoria(), opcoes)
    const a = repo.salvar(DADOS)
    repo.salvar({ ...DADOS, nome: 'Bolo' })
    repo.excluir(a.id)
    expect(repo.listar().map((r) => r.nome)).toEqual(['Bolo'])
  })

  it('salvar uma receita não reescreve as outras (o que a versão de amanhã guardar a mais fica)', () => {
    const arm = new Memoria()
    const antiga = { ...receita('a', 'Bolo'), campoDoFuturo: 1 }
    arm.setItem(CHAVE_RECEITAS, JSON.stringify([antiga]))
    criarRepositorioReceitas(arm, opcoes).salvar(DADOS)
    expect((JSON.parse(arm.getItem(CHAVE_RECEITAS) ?? '[]') as unknown[])[0]).toEqual(antiga)
  })

  it('dado estragado: item sem os campos ou sem ingrediente com gramas não aparece, e a lista ilegível conta como vazia', () => {
    const arm = new Memoria()
    arm.setItem(CHAVE_RECEITAS, JSON.stringify([receita('a', 'Bolo'), { id: 'b' }, 3, receita('c', 'Vazia', { ingredientes: [] }), receita('d', 'Zerada', { ingredientes: [{ alimentoId: 7, gramas: 0 }] })]))
    expect(criarRepositorioReceitas(arm).listar().map((r) => r.id)).toEqual(['a'])
    arm.setItem(CHAVE_RECEITAS, '{')
    expect(criarRepositorioReceitas(arm).listar()).toEqual([])
  })

  it('CB-274: sem armazenamento, guarda em memória e avisa que não é persistente', () => {
    const repo = criarRepositorioReceitas(null, opcoes)
    expect(repo.persistente).toBe(false)
    repo.salvar({ ...DADOS, nome: 'Só na memória' })
    expect(repo.listar().map((r) => r.nome)).toContain('Só na memória')
  })

  it('CB-274 (rodada da revisão): sem armazenamento, a memória é uma só para a aba inteira', () => {
    criarRepositorioReceitas(null, opcoes).salvar({ ...DADOS, nome: 'Criada na tela Receitas' })
    // Outra tela (a busca da refeição) cria o próprio repositório e vê a mesma receita.
    expect(criarRepositorioReceitas(null).listar().map((r) => r.nome)).toContain('Criada na tela Receitas')
  })

  it('CA-866: filtra pelo nome, sem diferença de acento e maiúscula', () => {
    const lista = [receita('a', 'Panqueca de banana'), receita('b', 'Pão de queijo'), receita('c', 'Bolo de cenoura')]
    expect(filtrarReceitas(lista, 'PAO').map((r) => r.id)).toEqual(['b'])
    expect(filtrarReceitas(lista, 'de ban').map((r) => r.id)).toEqual(['a'])
    expect(filtrarReceitas(lista, '  ')).toEqual(lista)
  })
})

describe('a receita para o plano (D-273)', () => {
  it('a cópia leva tudo que calcula e mostra, e o id de onde saiu', () => {
    expect(copiaParaOPlano(receita('r-panqueca', 'Panqueca de banana'))).toEqual(PANQUECA)
  })

  it('CA-862: o valor de uma porção é a soma dos ingredientes dividida pelas porções', () => {
    const t = totaisDaPorcao(PANQUECA, buscarAlimento)
    expect(t.nutrientes.energia_kcal.total).toBeCloseTo(KCAL_DA_PANQUECA, 6)
    expect(t.nutrientes.vitamina_c_mg.semDado).toBe(1)
  })
})

describe('a receita na busca da refeição (CA-871, CA-872)', () => {
  const lista = [receita('a', 'Panqueca de banana'), receita('b', 'Panqueca de aveia'), receita('c', 'Panqueca salgada'), receita('d', 'Bolo de banana')]

  it('CA-871: sem quantidade, 1 porção; no máximo 2 receitas, as que começam com o termo primeiro', () => {
    const resultados = buscarReceitas('panqueca', lista)
    expect(resultados).toHaveLength(2)
    expect(resultados[0]).toMatchObject({ receita: { id: 'b' }, porcoes: 1, gramas: 120, aviso: null, antesDosAlimentos: true })
    // D-274: o termo só no meio do nome deixa a receita abaixo dos alimentos.
    expect(buscarReceitas('banana', lista).map((r) => r.antesDosAlimentos)).toEqual([false, false])
    // Nenhuma começa com "banana": a ordem é a do nome.
    expect(buscarReceitas('banana', lista).map((r) => r.receita.id)).toEqual(['d', 'a'])
    expect(buscarReceitas('bolo', lista).map((r) => r.receita.id)).toEqual(['d'])
    expect(buscarReceitas('', lista)).toEqual([])
    expect(buscarReceitas('arroz', lista)).toEqual([])
  })

  it('CA-871 (rodada da revisão): com alimento que começa pelo mesmo termo, a receita vem abaixo dos alimentos', () => {
    const comecamComAlimento = [receita('b', 'Banana amassada com aveia'), receita('r', 'Arroz com legumes')]
    const achados = (texto: string) => buscarAlimentos(texto, ALIMENTOS).resultados.map((r) => r.alimento)
    expect(buscarReceitas('75 banana', comecamComAlimento, achados('75 banana'))).toMatchObject([{ receita: { id: 'b' }, antesDosAlimentos: false }])
    expect(buscarReceitas('100 arroz', comecamComAlimento, achados('100 arroz'))).toMatchObject([{ receita: { id: 'r' }, antesDosAlimentos: false }])
    // Nenhum alimento começa com "panqueca": a receita continua no topo.
    expect(buscarReceitas('panqueca', lista, achados('panqueca')).every((r) => r.antesDosAlimentos)).toBe(true)
  })

  it('CA-872: com o nome da porção ou "porção", as porções; só número, as gramas', () => {
    expect(buscarReceitas('2 unidade panqueca de banana', lista)[0]).toMatchObject({ porcoes: 2, gramas: 240 })
    expect(buscarReceitas('2 unidades de panqueca de banana', lista)[0]).toMatchObject({ porcoes: 2, gramas: 240 })
    expect(buscarReceitas('1/2 porção panqueca de banana', lista)[0]).toMatchObject({ porcoes: 0.5, gramas: 60 })
    expect(buscarReceitas('150 panqueca de banana', lista)[0]).toMatchObject({ porcoes: 1.25, gramas: 150 })
    const copo = [receita('s', 'Suco verde', { nomeDaPorcao: 'copo', pesoProntoG: 500 })]
    expect(buscarReceitas('2 copos suco verde', copo)[0]).toMatchObject({ porcoes: 2, gramas: 500 })
  })

  it('CA-872 (rodada da revisão): sem número no começo, o texto todo é o nome, mesmo começando com nome de porção', () => {
    const doces = [receita('c', 'Copo da felicidade', { pesoProntoG: 600, porcoes: 3 }), receita('f', 'Fatia húngara', { pesoProntoG: 800, porcoes: 8 })]
    expect(buscarReceitas('copo da felicidade', doces)).toMatchObject([{ receita: { id: 'c' }, porcoes: 1, gramas: 200, aviso: null }])
    expect(buscarReceitas('fatia hungara', doces)).toMatchObject([{ receita: { id: 'f' }, porcoes: 1, gramas: 100, aviso: null }])
    // Com número, a palavra volta a ser a medida.
    expect(buscarReceitas('2 unidade copo da felicidade', doces)).toMatchObject([{ porcoes: 2, gramas: 400 }])
  })

  it('CA-872: medida que não é a da porção não põe nada e diz qual usar', () => {
    const [r] = buscarReceitas('2 colher de sopa panqueca de banana', lista)
    expect(r).toMatchObject({ gramas: null, porcoes: null, aviso: 'Esta receita é medida em unidade. Use "2 unidade" ou as gramas.' })
  })
})
