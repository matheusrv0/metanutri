import { armazenamentoDaConta } from './armazenamentoDaConta.ts'
import { CHAVE_MUDANCAS, lerMudancas } from './copiaDaConta.ts'
import { criarRepositorioModelos } from './modelos.ts'
import { nuvemFalsa, type NuvemFalsa } from './nuvemFalsa.test-utils.ts'
import { criarRepositorioPacientes } from './pacientes.ts'
import { gravarPerfil, lerPerfil, PERFIL_VAZIO, type Backup } from './perfil.ts'
import { criarRepositorio, type ArmazenamentoListavel } from './persistencia.ts'
import { criarRepositorioProdutos } from './produtos.ts'
import { CHAVE_NUVEM, CONFERIR_A_CADA_MS, contarMudanca, criarSincronia, ESPERA_PARA_SALVAR_MS, INTERVALO_DE_TENTATIVA_MS, lerSituacao, observarMudancas, saiuDaConta, type Sincronia } from './sincronia.ts'

/** Um navegador: o armazenamento do aparelho, com as chaves listáveis como o `localStorage`. */
class Navegador implements ArmazenamentoListavel {
  readonly dados = new Map<string, string>()
  /** Quanto cabe, somando chaves e valores, como o `localStorage`; `null` sem limite. */
  limite: number | null = null
  /** As chaves na ordem em que foram gravadas. */
  readonly gravadas: string[] = []
  /** Enquanto verdadeiro, ler qualquer chave falha (navegador que bloqueia o armazenamento no meio). */
  falharLeitura = false
  get length() {
    return this.dados.size
  }
  key(i: number) {
    return [...this.dados.keys()][i] ?? null
  }
  getItem(k: string) {
    if (this.falharLeitura) throw new DOMException('bloqueado', 'SecurityError')
    return this.dados.get(k) ?? null
  }
  setItem(k: string, v: string) {
    if (this.limite !== null) {
      const ocupado = [...this.dados].reduce((total, [chave, valor]) => total + (chave === k ? 0 : chave.length + valor.length), 0)
      if (ocupado + k.length + v.length > this.limite) throw new DOMException('cheio', 'QuotaExceededError')
    }
    this.dados.set(k, v)
    this.gravadas.push(k)
  }
  removeItem(k: string) {
    this.dados.delete(k)
  }
}

interface Aparelho {
  readonly navegador: Navegador
  readonly sincronia: Sincronia
  readonly pacientes: ReturnType<typeof criarRepositorioPacientes>
  readonly planos: ReturnType<typeof criarRepositorio>
  readonly produtos: ReturnType<typeof criarRepositorioProdutos>
  readonly modelos: ReturnType<typeof criarRepositorioModelos>
  readonly observado: ReturnType<typeof observarMudancas>
  readonly trazidas: { vezes: number }
}

let gerado = 0
const gerarId = () => `id-${(gerado += 1)}`

/** Abre o MetaNutri num navegador: o motor da conta e os repositórios por cima do armazenamento observado. */
function abrirAparelho(nuvem: NuvemFalsa, navegador = new Navegador(), opcoes: { readonly sujo?: boolean; readonly conectado?: () => boolean } = {}): Aparelho {
  const conta = armazenamentoDaConta(navegador, 'conta-a')
  const trazidas = { vezes: 0 }
  const sincronia = criarSincronia({
    cliente: nuvem.cliente,
    armazenamento: conta,
    usuarioId: 'conta-a',
    aparelho: 'Teste',
    aoTrazer: () => {
      trazidas.vezes += 1
    },
    ...opcoes,
  })
  const observado = observarMudancas(conta, (contou) => sincronia.mudou(contou))
  return {
    navegador,
    sincronia,
    observado,
    trazidas,
    pacientes: criarRepositorioPacientes(observado, { gerarId }),
    planos: criarRepositorio(observado, { gerarId }),
    produtos: criarRepositorioProdutos(observado),
    modelos: criarRepositorioModelos(observado, { gerarId }),
  }
}

/** Liga o motor e espera a abertura terminar. */
async function ligar(aparelho: Aparelho): Promise<void> {
  aparelho.sincronia.ligar()
  await vi.advanceTimersByTimeAsync(0)
}

const nomesDosPacientes = (a: Aparelho) => a.pacientes.listar().map((p) => p.nome).sort()
const copiaNaNuvem = (nuvem: NuvemFalsa): Backup => nuvem.linhas.get('conta-a')?.dados as Backup
const pacientesNaNuvem = (nuvem: NuvemFalsa): string[] =>
  (JSON.parse(copiaNaNuvem(nuvem).dados['metanutri:pacientes'] ?? '[]') as { nome: string }[]).map((p) => p.nome).sort()

const salvar = () => vi.advanceTimersByTimeAsync(ESPERA_PARA_SALVAR_MS)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-08T12:00:00.000Z'))
  gerado = 0
})

afterEach(() => {
  vi.useRealTimers()
})

describe('abrir e salvar sozinho (D-128, D-129)', () => {
  it('CA-475: a conta entra em outro navegador e vê os mesmos planos, pacientes, produtos, modelos e perfil', async () => {
    const nuvem = nuvemFalsa()
    const a = abrirAparelho(nuvem)
    await ligar(a)
    a.pacientes.criar('Ana')
    const plano = a.planos.criar('Plano da Ana')
    a.produtos.salvar({ nome: 'Granola', marca: '', porcaoG: 40, medidaCaseira: '', porPorcao: {} })
    a.modelos.salvar({ nome: 'Gestante', descricao: '', plano: plano.plano })
    gravarPerfil(a.observado, { ...PERFIL_VAZIO, nome: 'Maria' })
    await salvar()

    const b = abrirAparelho(nuvem)
    expect(b.sincronia.estado.fase).toBe('abrindo')
    await ligar(b)
    expect(b.sincronia.estado.fase).toBe('pronta')
    expect(nomesDosPacientes(b)).toEqual(['Ana'])
    expect(b.planos.listar().map((c) => c.nome)).toEqual(['Plano da Ana'])
    expect(b.produtos.listar().map((p) => p.nome)).toEqual(['Granola'])
    expect(b.modelos.listar().map((m) => m.nome)).toEqual(['Gestante'])
    expect(lerPerfil(b.observado).nome).toBe('Maria')
  })

  it('CA-476: a mudança vai para a nuvem 2 s depois e o estado volta a "salvo"', async () => {
    const nuvem = nuvemFalsa()
    const a = abrirAparelho(nuvem)
    await ligar(a)
    expect(a.sincronia.estado).toMatchObject({ fase: 'pronta', pendente: false, salvando: false })

    a.pacientes.criar('Ana')
    expect(a.sincronia.estado.pendente).toBe(true)
    await vi.advanceTimersByTimeAsync(ESPERA_PARA_SALVAR_MS - 100)
    expect(nuvem.linhas.has('conta-a')).toBe(false)

    await vi.advanceTimersByTimeAsync(100)
    expect(pacientesNaNuvem(nuvem)).toEqual(['Ana'])
    expect(a.sincronia.estado).toMatchObject({ pendente: false, salvando: false, trava: null })
    expect(lerSituacao(armazenamentoDaConta(a.navegador, 'conta-a'))?.versao).toBe(nuvem.linhas.get('conta-a')?.atualizado_em)
  })

  it('sem mudança, nada é enviado; mudar e desfazer antes de salvar não perde a conta da mudança', async () => {
    const nuvem = nuvemFalsa()
    const a = abrirAparelho(nuvem)
    await ligar(a)
    await salvar()
    expect(nuvem.pedidos).toEqual(['select'])

    const ana = a.pacientes.criar('Ana')
    a.pacientes.excluir(ana.id)
    await salvar()
    expect(pacientesNaNuvem(nuvem)).toEqual([])
    expect(Object.keys(lerMudancas(copiaNaNuvem(nuvem).dados[CHAVE_MUDANCAS] ?? null).excluidos)).toEqual([`pacientes/${ana.id}`])
  })

  it('salvarAgora manda o que falta sem esperar e diz se ficou tudo na nuvem', async () => {
    const nuvem = nuvemFalsa()
    const a = abrirAparelho(nuvem)
    await ligar(a)
    a.pacientes.criar('Ana')
    expect(await a.sincronia.salvarAgora()).toBe(true)
    expect(pacientesNaNuvem(nuvem)).toEqual(['Ana'])
    nuvem.semInternet = true
    a.pacientes.criar('Bia')
    expect(await a.sincronia.salvarAgora()).toBe(false)
  })
})

describe('sem internet (D-130)', () => {
  it('CA-477: a gravação falha por rede: trava; a internet volta: o que faltava sobe e destrava sozinho', async () => {
    const nuvem = nuvemFalsa()
    const a = abrirAparelho(nuvem)
    await ligar(a)
    nuvem.semInternet = true
    a.pacientes.criar('Ana')
    await salvar()
    expect(a.sincronia.estado).toMatchObject({ trava: 'sem-internet', pendente: true, salvando: false })

    nuvem.semInternet = false
    a.sincronia.conectou()
    await vi.advanceTimersByTimeAsync(0)
    expect(a.sincronia.estado).toMatchObject({ trava: null, pendente: false })
    expect(pacientesNaNuvem(nuvem)).toEqual(['Ana'])
  })

  it('CA-477: o navegador avisa que caiu a internet: trava mesmo sem nada pendente; volta: destrava', async () => {
    const nuvem = nuvemFalsa()
    const a = abrirAparelho(nuvem)
    await ligar(a)
    a.sincronia.desconectou()
    expect(a.sincronia.estado.trava).toBe('sem-internet')
    a.sincronia.conectou()
    expect(a.sincronia.estado.trava).toBeNull()
    expect(nuvem.pedidos).toEqual(['select'])
  })

  it('DP-8: travado, tenta de novo sozinho a cada 15 s, mesmo sem o evento de volta', async () => {
    const nuvem = nuvemFalsa()
    const a = abrirAparelho(nuvem)
    await ligar(a)
    nuvem.semInternet = true
    a.pacientes.criar('Ana')
    await salvar()
    nuvem.semInternet = false
    await vi.advanceTimersByTimeAsync(INTERVALO_DE_TENTATIVA_MS)
    expect(a.sincronia.estado.trava).toBeNull()
    expect(pacientesNaNuvem(nuvem)).toEqual(['Ana'])
  })

  it('DP-24: a gravação chegou, mas a resposta se perdeu: antes de mandar de novo, confere a versão e não grava outra vez', async () => {
    const nuvem = nuvemFalsa()
    const a = abrirAparelho(nuvem)
    await ligar(a)
    nuvem.perderResposta = true
    a.pacientes.criar('Ana')
    await salvar()
    await vi.advanceTimersByTimeAsync(16_000)
    expect(a.sincronia.estado.trava).toBe('sem-internet')
    expect(pacientesNaNuvem(nuvem)).toEqual(['Ana'])

    nuvem.perderResposta = false
    const antes = nuvem.pedidos.length
    a.sincronia.conectou()
    await vi.advanceTimersByTimeAsync(0)
    expect(nuvem.pedidos.slice(antes)).toEqual(['select', 'select'])
    expect(a.sincronia.estado).toMatchObject({ trava: null, pendente: false })
  })

  it('CA-484: a entrada não consegue trazer a cópia: fica sem conexão e tenta de novo quando a internet volta', async () => {
    const nuvem = nuvemFalsa()
    nuvem.guardar('conta-a', { formato: 1, geradoEm: '', dados: { 'metanutri:pacientes': '[{"id":"ana","nome":"Ana"}]' } }, '2026-10-08T11:00:00.000Z')
    nuvem.semInternet = true
    const a = abrirAparelho(nuvem)
    await ligar(a)
    expect(a.sincronia.estado.fase).toBe('sem-conexao')
    expect(nomesDosPacientes(a)).toEqual([])

    nuvem.semInternet = false
    a.sincronia.conectou()
    await vi.advanceTimersByTimeAsync(0)
    expect(a.sincronia.estado.fase).toBe('pronta')
    expect(nomesDosPacientes(a)).toEqual(['Ana'])
  })

  it('DP-25: um erro qualquer na abertura vira "sem conexão" e a abertura tenta de novo', async () => {
    const nuvem = nuvemFalsa()
    const navegador = new Navegador()
    const a = abrirAparelho(nuvem, navegador)
    navegador.falharLeitura = true
    await ligar(a)
    expect(a.sincronia.estado.fase).toBe('sem-conexao')
    navegador.falharLeitura = false
    await vi.advanceTimersByTimeAsync(INTERVALO_DE_TENTATIVA_MS)
    expect(a.sincronia.estado.fase).toBe('pronta')
  })

  it('DP-25: duas aberturas pedidas juntas são uma só', async () => {
    const nuvem = nuvemFalsa()
    nuvem.segurar = true
    const a = abrirAparelho(nuvem)
    a.sincronia.ligar()
    a.sincronia.conectou()
    a.sincronia.conectou()
    nuvem.soltar()
    await vi.advanceTimersByTimeAsync(0)
    expect(a.sincronia.estado.fase).toBe('pronta')
    expect(nuvem.pedidos).toEqual(['select'])
  })

  it('a cópia num formato que este MetaNutri não entende não é sobrescrita', async () => {
    const nuvem = nuvemFalsa()
    nuvem.guardar('conta-a', { formato: 2 }, '2026-10-08T11:00:00.000Z')
    const a = abrirAparelho(nuvem)
    await ligar(a)
    expect(a.sincronia.estado.fase).toBe('formato-desconhecido')
    a.pacientes.criar('Ana')
    await salvar()
    expect(nuvem.linhas.get('conta-a')?.dados).toEqual({ formato: 2 })
  })
})

describe('dois aparelhos ao mesmo tempo (D-132)', () => {
  async function doisAparelhos() {
    const nuvem = nuvemFalsa()
    const a = abrirAparelho(nuvem)
    await ligar(a)
    const ana = a.pacientes.criar('Ana')
    const bia = a.pacientes.criar('Bia')
    const caio = a.pacientes.criar('Caio')
    await salvar()
    const b = abrirAparelho(nuvem)
    await ligar(b)
    return { nuvem, a, b, ana, bia, caio }
  }

  it('CA-480: itens diferentes mudados nos dois: nenhum apaga a mudança do outro', async () => {
    const { nuvem, a, b, ana, bia } = await doisAparelhos()
    const antes = { a: a.trazidas.vezes, b: b.trazidas.vezes, geracaoA: a.sincronia.estado.geracao, geracaoB: b.sincronia.estado.geracao }
    vi.setSystemTime(new Date('2026-10-08T12:01:00.000Z'))
    a.pacientes.salvar({ ...ana, nome: 'Ana Souza' })
    b.pacientes.salvar({ ...bia, nome: 'Bia Lima' })
    b.pacientes.criar('Davi')
    await salvar()
    expect(pacientesNaNuvem(nuvem)).toEqual(['Ana Souza', 'Bia Lima', 'Caio', 'Davi'])
    // Quem chegou depois juntou e viu a mudança do outro na própria cópia de trabalho.
    const [segundo, trazidasAntes, geracaoAntes] = nomesDosPacientes(a).includes('Davi') ? [a, antes.a, antes.geracaoA] : [b, antes.b, antes.geracaoB]
    expect(nomesDosPacientes(segundo)).toEqual(['Ana Souza', 'Bia Lima', 'Caio', 'Davi'])
    expect(segundo.trazidas.vezes).toBe(trazidasAntes + 1)
    expect(segundo.sincronia.estado.geracao).toBe(geracaoAntes + 1)
  })

  it('CA-480: o mesmo item mudado nos dois: fica a mudança mais nova', async () => {
    const { nuvem, a, b, ana } = await doisAparelhos()
    vi.setSystemTime(new Date('2026-10-08T12:01:00.000Z'))
    a.pacientes.salvar({ ...ana, nome: 'Ana mais velha' })
    vi.setSystemTime(new Date('2026-10-08T12:02:00.000Z'))
    b.pacientes.salvar({ ...ana, nome: 'Ana mais nova' })
    await salvar()
    expect(pacientesNaNuvem(nuvem)).toEqual(['Ana mais nova', 'Bia', 'Caio'])
  })

  it('CA-480: o item excluído num aparelho não volta pelo outro', async () => {
    const { nuvem, a, b, caio } = await doisAparelhos()
    vi.setSystemTime(new Date('2026-10-08T12:01:00.000Z'))
    a.pacientes.excluir(caio.id)
    await salvar()
    b.pacientes.criar('Davi')
    await salvar()
    expect(pacientesNaNuvem(nuvem)).toEqual(['Ana', 'Bia', 'Davi'])
    expect(nomesDosPacientes(b)).toEqual(['Ana', 'Bia', 'Davi'])
  })

  it('DP-6: a cópia de trabalho sem mudança pendente dá lugar à da nuvem ao abrir, exclusões incluídas', async () => {
    const { nuvem, a, b, caio } = await doisAparelhos()
    b.sincronia.desligar()
    vi.setSystemTime(new Date('2026-10-08T12:01:00.000Z'))
    a.pacientes.excluir(caio.id)
    a.pacientes.criar('Davi')
    await salvar()
    const deNovo = abrirAparelho(nuvem, b.navegador)
    await ligar(deNovo)
    expect(nomesDosPacientes(deNovo)).toEqual(['Ana', 'Bia', 'Davi'])
    expect(nuvem.pedidos.filter((p) => p !== 'select')).toEqual(['insert', 'update'])
  })

  it('CB-124: duas abas da mesma conta (o mesmo navegador): as mudanças das duas ficam', async () => {
    const nuvem = nuvemFalsa()
    const navegador = new Navegador()
    const aba1 = abrirAparelho(nuvem, navegador)
    const aba2 = abrirAparelho(nuvem, navegador)
    await ligar(aba1)
    await ligar(aba2)
    aba1.pacientes.criar('Ana')
    aba2.pacientes.criar('Bia')
    // A outra aba fica sabendo pelo evento do navegador.
    aba1.sincronia.mudou()
    await salvar()
    expect(pacientesNaNuvem(nuvem)).toEqual(['Ana', 'Bia'])
    expect(nomesDosPacientes(aba1)).toEqual(['Ana', 'Bia'])
    expect(aba1.sincronia.estado.pendente).toBe(false)
    expect(aba2.sincronia.estado.pendente).toBe(false)
  })
})

describe('conferir a nuvem depois de abrir (DP-20)', () => {
  async function doisComUmPlano() {
    const nuvem = nuvemFalsa()
    const a = abrirAparelho(nuvem)
    await ligar(a)
    const criado = a.planos.criar('Plano da Ana')
    await salvar()
    const b = abrirAparelho(nuvem)
    await ligar(b)
    return { nuvem, a, b, id: criado.caso.id }
  }
  const planoNaNuvem = (nuvem: NuvemFalsa, id: string) => JSON.parse(copiaNaNuvem(nuvem).dados[`metanutri:caso:${id}`] ?? '{}') as { caso: { nome: string; pesoKg: number | null } }

  it('CB-127: a aba esquecida aberta confere a nuvem ao voltar e a edição do outro aparelho continua', async () => {
    const { nuvem, a, b, id } = await doisComUmPlano()
    vi.setSystemTime(new Date('2026-10-08T13:00:00.000Z'))
    b.planos.renomear(id, 'Plano da Ana Souza')
    await salvar()

    // A pessoa volta para a aba de A: antes de deixar editar, a aba confere a nuvem.
    const conferindo = a.sincronia.conferir(true)
    expect(a.sincronia.estado.conferindo).toBe(true)
    await conferindo
    expect(a.sincronia.estado.conferindo).toBe(false)
    vi.setSystemTime(new Date('2026-10-08T13:05:00.000Z'))
    const naAbaDeA = a.planos.obter(id)
    if (!naAbaDeA) throw new Error('plano ausente')
    a.planos.salvar({ caso: { ...naAbaDeA.caso, pesoKg: 70 }, plano: naAbaDeA.plano })
    await salvar()

    expect(planoNaNuvem(nuvem, id).caso).toMatchObject({ nome: 'Plano da Ana Souza', pesoKg: 70 })
  })

  it('DP-20: sem nada pendente, a cada 60 s a aba confere a nuvem sozinha e traz o que mudou', async () => {
    const { nuvem, a, b, id } = await doisComUmPlano()
    b.planos.renomear(id, 'Plano novo')
    await salvar()
    expect(a.planos.obter(id)?.caso.nome).toBe('Plano da Ana')
    await vi.advanceTimersByTimeAsync(CONFERIR_A_CADA_MS)
    expect(a.planos.obter(id)?.caso.nome).toBe('Plano novo')
    expect(a.sincronia.estado.pendente).toBe(false)
    expect(planoNaNuvem(nuvem, id).caso.nome).toBe('Plano novo')
  })

  it('DP-20: a nuvem igual à última vista não traz nada (só a versão é lida)', async () => {
    const { nuvem, a } = await doisComUmPlano()
    const antes = nuvem.pedidos.length
    const geracao = a.sincronia.estado.geracao
    await a.sincronia.conferir(true)
    expect(nuvem.pedidos.slice(antes)).toEqual(['select'])
    expect(a.sincronia.estado.geracao).toBe(geracao)
  })

  it('DP-20: com mudança pendente, conferir salva, e a conferência de versão junta', async () => {
    const { nuvem, a, b, id } = await doisComUmPlano()
    b.pacientes.criar('Bia')
    await salvar()
    a.pacientes.criar('Ana')
    await a.sincronia.conferir(true)
    await vi.advanceTimersByTimeAsync(0)
    expect(pacientesNaNuvem(nuvem)).toEqual(['Ana', 'Bia'])
    expect(planoNaNuvem(nuvem, id).caso.nome).toBe('Plano da Ana')
  })
})

describe('dados de antes e sessão que vence (D-133)', () => {
  /** Um navegador com dados no espaço da conta e nenhuma marca da nuvem: a versão de antes desta mudança. */
  function navegadorDeAntes(): Navegador {
    const navegador = new Navegador()
    navegador.setItem('metanutri:conta:conta-a:pacientes', JSON.stringify([{ id: 'ana', nome: 'Ana', atualizadoEm: '2026-10-07T10:00:00.000Z' }]))
    navegador.setItem('metanutri:conta:conta-a:perfil', JSON.stringify({ ...PERFIL_VAZIO, nome: 'Maria' }))
    return navegador
  }

  it('DP-22: antes de abrir, o dado que nunca chegou à nuvem já conta como pendente', () => {
    const nuvem = nuvemFalsa()
    expect(abrirAparelho(nuvem, navegadorDeAntes()).sincronia.estado.pendente).toBe(true)
    expect(abrirAparelho(nuvem, new Navegador(), { sujo: true }).sincronia.estado.pendente).toBe(true)
    expect(abrirAparelho(nuvem, new Navegador()).sincronia.estado.pendente).toBe(false)
    // Com marcas e sem a situação da nuvem (o navegador perdeu só essa chave): também conta.
    const comMarcas = navegadorDeAntes()
    comMarcas.setItem('metanutri:conta:conta-a:mudancas', JSON.stringify({ alterados: { 'pacientes/ana': '2026-10-07T10:00:00.000Z' }, excluidos: {} }))
    expect(abrirAparelho(nuvem, comMarcas).sincronia.estado.pendente).toBe(true)
  })

  it('DP-22: a cópia de trabalho já em dia não conta como pendente antes de abrir', async () => {
    const nuvem = nuvemFalsa()
    const a = abrirAparelho(nuvem, navegadorDeAntes())
    await ligar(a)
    a.sincronia.desligar()
    expect(abrirAparelho(nuvem, a.navegador).sincronia.estado.pendente).toBe(false)
  })

  it('CA-481: sem cópia na nuvem, o que estava no navegador sobe como está', async () => {
    const nuvem = nuvemFalsa()
    const a = abrirAparelho(nuvem, navegadorDeAntes())
    await ligar(a)
    expect(pacientesNaNuvem(nuvem)).toEqual(['Ana'])
    expect(JSON.parse(copiaNaNuvem(nuvem).dados['metanutri:perfil'] ?? '{}').nome).toBe('Maria')
  })

  it('CA-481: com cópia na nuvem, as duas são juntadas e nada some', async () => {
    const nuvem = nuvemFalsa()
    nuvem.guardar(
      'conta-a',
      { formato: 1, geradoEm: '', dados: { 'metanutri:pacientes': JSON.stringify([{ id: 'bia', nome: 'Bia', atualizadoEm: '2026-10-06T10:00:00.000Z' }]) } },
      '2026-10-06T10:00:00.000Z',
    )
    const a = abrirAparelho(nuvem, navegadorDeAntes())
    await ligar(a)
    expect(pacientesNaNuvem(nuvem)).toEqual(['Ana', 'Bia'])
    expect(nomesDosPacientes(a)).toEqual(['Ana', 'Bia'])
    expect(a.sincronia.estado.pendente).toBe(false)
  })

  it('CA-481: a cópia na nuvem, mandada à mão antes de os dados daqui mudarem, não passa por cima das configurações daqui', async () => {
    const nuvem = nuvemFalsa()
    nuvem.guardar(
      'conta-a',
      { formato: 1, geradoEm: '', dados: { 'metanutri:perfil': JSON.stringify({ ...PERFIL_VAZIO, nome: 'Maria (antes)' }) } },
      '2026-10-01T10:00:00.000Z',
    )
    // Daqui: o perfil de hoje e um paciente salvo depois da cópia que está na nuvem.
    const a = abrirAparelho(nuvem, navegadorDeAntes())
    await ligar(a)
    expect(lerPerfil(a.observado).nome).toBe('Maria')
    expect(JSON.parse(copiaNaNuvem(nuvem).dados['metanutri:perfil'] ?? '{}').nome).toBe('Maria')
  })

  it('CA-481: a cópia na nuvem mais nova que os dados daqui vence o empate das configurações', async () => {
    const nuvem = nuvemFalsa()
    nuvem.guardar(
      'conta-a',
      { formato: 1, geradoEm: '', dados: { 'metanutri:perfil': JSON.stringify({ ...PERFIL_VAZIO, nome: 'Maria (outro aparelho)' }) } },
      '2026-10-08T09:00:00.000Z',
    )
    const a = abrirAparelho(nuvem, navegadorDeAntes())
    await ligar(a)
    expect(lerPerfil(a.observado).nome).toBe('Maria (outro aparelho)')
  })

  it('CA-481: dados levados agora pela migração contam como mudança, mesmo com a cópia de trabalho já em dia', async () => {
    const nuvem = nuvemFalsa()
    const a = abrirAparelho(nuvem)
    await ligar(a)
    a.pacientes.criar('Ana')
    await salvar()
    // Uma aba antiga gravou fora do espaço da conta; a migração levou para dentro, sem passar pelo observador.
    a.sincronia.desligar()
    a.navegador.setItem('metanutri:conta:conta-a:pacientes', JSON.stringify([...a.pacientes.listar(), { id: 'velha', nome: 'Aba antiga', atualizadoEm: '2026-10-08T12:00:00.000Z' }]))
    const deNovo = abrirAparelho(nuvem, a.navegador, { sujo: true })
    await ligar(deNovo)
    expect(pacientesNaNuvem(nuvem)).toEqual(['Aba antiga', 'Ana'])
  })

  it('CB-125: a sessão vence com mudança por salvar; a pessoa entra de novo e nada se perdeu', async () => {
    const nuvem = nuvemFalsa()
    const a = abrirAparelho(nuvem)
    await ligar(a)
    a.pacientes.criar('Ana')
    await salvar()
    nuvem.usuario = null
    a.pacientes.criar('Bia')
    await salvar()
    expect(a.sincronia.estado.trava).toBe('sem-internet')
    // A sessão caiu: a área de trabalho sai da tela e o motor desliga, com a mudança guardada no navegador.
    a.sincronia.desligar()
    nuvem.usuario = 'conta-a'
    const deNovo = abrirAparelho(nuvem, a.navegador)
    await ligar(deNovo)
    expect(pacientesNaNuvem(nuvem)).toEqual(['Ana', 'Bia'])
    expect(deNovo.sincronia.estado).toMatchObject({ fase: 'pronta', pendente: false, trava: null })
  })
})

describe('navegador sem espaço (DP-23)', () => {
  const SEM_ESPACO_PACIENTES = Array.from({ length: 30 }, (_, i) => ({ id: `p${i}`, nome: `Paciente ${i} com nome comprido`, atualizadoEm: '2026-10-07T10:00:00.000Z' }))

  it('DP-23: a mudança é contada antes de o dado ser gravado (a pendência fica guardada)', async () => {
    const nuvem = nuvemFalsa()
    const a = abrirAparelho(nuvem)
    await ligar(a)
    a.navegador.gravadas.length = 0
    a.pacientes.criar('Ana')
    expect(a.navegador.gravadas).toEqual(['metanutri:conta:conta-a:nuvem', 'metanutri:conta:conta-a:pacientes', 'metanutri:conta:conta-a:mudancas'])
  })

  it('DP-23: a cópia juntada não cabe aqui: a área trava sem espaço, a cópia inteira sobe da memória e a daqui não fica em dia', async () => {
    const nuvem = nuvemFalsa()
    nuvem.guardar('conta-a', { formato: 1, geradoEm: '', dados: { 'metanutri:pacientes': JSON.stringify(SEM_ESPACO_PACIENTES) } }, '2026-10-07T10:00:00.000Z')
    const navegador = new Navegador()
    navegador.setItem('metanutri:conta:conta-a:pacientes', JSON.stringify([{ id: 'ana', nome: 'Ana daqui', atualizadoEm: '2026-10-08T10:00:00.000Z' }]))
    navegador.limite = 1500
    const a = abrirAparelho(nuvem, navegador)
    await ligar(a)
    expect(a.sincronia.estado).toMatchObject({ fase: 'pronta', trava: 'sem-espaco', pendente: true })
    // A nuvem ficou com tudo: o que estava aqui e o que estava lá.
    expect(pacientesNaNuvem(nuvem)).toHaveLength(31)
    expect(pacientesNaNuvem(nuvem)).toContain('Ana daqui')
    const situacao = lerSituacao(armazenamentoDaConta(navegador, 'conta-a'))
    expect(situacao === null || situacao.mudancas > situacao.salvas).toBe(true)

    // Travado sem espaço, nada mais vai para a nuvem.
    const pedidos = nuvem.pedidos.length
    a.sincronia.mudou()
    await salvar()
    expect(await a.sincronia.salvarAgora()).toBe(false)
    expect(nuvem.pedidos.length).toBe(pedidos)
  })
})

describe('cópia grande demais (CB-123)', () => {
  it('CB-123: a nuvem recusa o tamanho: trava; "reduzir" tira a capa; crescer trava de novo; caber destrava', async () => {
    const nuvem = nuvemFalsa()
    const a = abrirAparelho(nuvem)
    await ligar(a)
    nuvem.limite = 1000
    const muitos = ['Ana', 'Bia', 'Caio', 'Davi', 'Eva'].map((nome) => a.pacientes.criar(nome))
    await salvar()
    expect(a.sincronia.estado).toMatchObject({ trava: 'grande-demais', reduzindo: false, pendente: true })

    a.sincronia.reduzir()
    expect(a.sincronia.estado).toMatchObject({ trava: 'grande-demais', reduzindo: true })
    const [ana, bia, caio] = muitos
    if (!ana || !bia || !caio) throw new Error('pacientes ausentes')
    a.pacientes.excluir(ana.id)
    await salvar()
    expect(a.sincronia.estado).toMatchObject({ trava: 'grande-demais', reduzindo: true })

    a.pacientes.criar('Fabio com um nome bem comprido para crescer a cópia')
    await salvar()
    expect(a.sincronia.estado).toMatchObject({ trava: 'grande-demais', reduzindo: false })

    a.sincronia.reduzir()
    for (const p of a.pacientes.listar().slice(0, 4)) a.pacientes.excluir(p.id)
    await salvar()
    expect(a.sincronia.estado).toMatchObject({ trava: null, reduzindo: false, pendente: false })
    expect(nuvem.linhas.has('conta-a')).toBe(true)
  })
})

describe('sair (D-131)', () => {
  it('DP-11: depois de parar, nada mais vai para a nuvem e as outras abas ficam sabendo', async () => {
    const nuvem = nuvemFalsa()
    const a = abrirAparelho(nuvem)
    await ligar(a)
    a.pacientes.criar('Ana')
    a.sincronia.parar()
    await salvar()
    expect(nuvem.linhas.has('conta-a')).toBe(false)
    const meta = a.navegador.getItem(`metanutri:conta:conta-a:${CHAVE_NUVEM.slice('metanutri:'.length)}`)
    expect(saiuDaConta(meta)).toBe(true)
    expect(saiuDaConta(null)).toBe(true)
    expect(saiuDaConta(JSON.stringify({ versao: null, mudancas: 1, salvas: 0, itens: 0 }))).toBe(false)
  })

  it('DP-11: a outra aba que saiu para esta antes de o espaço sumir', async () => {
    const nuvem = nuvemFalsa()
    const navegador = new Navegador()
    const aba1 = abrirAparelho(nuvem, navegador)
    await ligar(aba1)
    aba1.pacientes.criar('Ana')
    await salvar()
    aba1.sincronia.saiuEmOutraAba()
    // A outra aba apaga o espaço da conta; esta não manda a cópia vazia.
    for (const chave of [...navegador.dados.keys()]) navegador.removeItem(chave)
    aba1.sincronia.mudou()
    await salvar()
    expect(pacientesNaNuvem(nuvem)).toEqual(['Ana'])
  })

  it('DP-11: o motor nunca manda uma cópia sem itens e sem lápide quando a nuvem tinha itens', async () => {
    const nuvem = nuvemFalsa()
    const navegador = new Navegador()
    const a = abrirAparelho(nuvem, navegador)
    await ligar(a)
    a.pacientes.criar('Ana')
    await salvar()
    for (const chave of [...navegador.dados.keys()]) if (!chave.endsWith(':nuvem')) navegador.removeItem(chave)
    contarMudanca(armazenamentoDaConta(navegador, 'conta-a'))
    a.sincronia.mudou()
    await salvar()
    expect(pacientesNaNuvem(nuvem)).toEqual(['Ana'])
  })
})

describe('ligar e desligar (StrictMode, troca de conta)', () => {
  it('desligar no meio da abertura ignora a resposta; ligar de novo abre', async () => {
    const nuvem = nuvemFalsa()
    nuvem.guardar('conta-a', { formato: 1, geradoEm: '', dados: { 'metanutri:pacientes': '[{"id":"ana","nome":"Ana"}]' } }, '2026-10-08T11:00:00.000Z')
    nuvem.segurar = true
    const a = abrirAparelho(nuvem)
    a.sincronia.ligar()
    a.sincronia.desligar()
    a.sincronia.ligar()
    nuvem.soltar()
    await vi.advanceTimersByTimeAsync(0)
    expect(a.sincronia.estado.fase).toBe('pronta')
    expect(nomesDosPacientes(a)).toEqual(['Ana'])
  })

  it('assinar avisa cada mudança de estado', async () => {
    const nuvem = nuvemFalsa()
    const a = abrirAparelho(nuvem)
    const ouvinte = vi.fn()
    const cancelar = a.sincronia.assinar(ouvinte)
    await ligar(a)
    expect(ouvinte).toHaveBeenCalled()
    cancelar()
    ouvinte.mockClear()
    a.pacientes.criar('Ana')
    await salvar()
    expect(ouvinte).not.toHaveBeenCalled()
  })
})
