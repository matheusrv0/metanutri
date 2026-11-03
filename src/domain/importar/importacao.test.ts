// O desfazer e a linha das 24 horas (spec importar-pacientes, D-911, D-913): CA-1934, CA-1941 a CA-1943, CB-913, CB-917.
import { criarAcompanhamento, ultimaAtividade, type Acompanhamento } from '../acompanhamento.ts'
import { armazenamentoDaConta } from '../armazenamentoDaConta.ts'
import { estadoDoLimite, pacientesAtivos, planoPorId } from '../conta.ts'
import { CHAVE_MUDANCAS, lerMudancas, montarCopia } from '../copiaDaConta.ts'
import { criarPacienteVazio, criarRepositorioPacientes, type Paciente } from '../pacientes.ts'
import type { ArmazenamentoListavel } from '../persistencia.ts'
import { observarMudancas } from '../sincronia.ts'
import { diaDaImportacao, importacoesRecentes, JANELA_DO_DESFAZER_MS, pacientesQueSaem, rotuloDaImportacao, textoDoDesfeito } from './importacao.ts'

class Memoria implements ArmazenamentoListavel {
  readonly dados = new Map<string, string>()
  get length() {
    return this.dados.size
  }
  key(i: number) {
    return [...this.dados.keys()][i] ?? null
  }
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

/** 29/10/2026, 14:32 no relógio de quem usa (o teste não depende do fuso). */
const EM = new Date(2026, 9, 29, 14, 32).toISOString()

const importado = (id: string, mudanca: Partial<Paciente> = {}, importacao = { id: 'imp1', em: EM }): Paciente => ({
  ...criarPacienteVazio(id, importacao.em),
  nome: id,
  importacao,
  ...mudanca,
})

const link = (dados: { casoId: string; pacienteId: string | null }, criadoEm = EM): Acompanhamento =>
  criarAcompanhamento({ ...dados, nome: 'x', missoes: [] }, { agora: () => criadoEm, gerarId: () => `link-${dados.casoId}` })

describe('CA-1941: "Desfazer" logo depois de importar', () => {
  it('os 5 saem, e a tela diz "Importação desfeita."', () => {
    const pacientes = ['a', 'b', 'c', 'd', 'e'].map((id) => importado(id))
    expect(pacientesQueSaem('imp1', pacientes, [], [])).toEqual({ saem: ['a', 'b', 'c', 'd', 'e'], ficam: 0 })
    expect(textoDoDesfeito(0)).toBe('Importação desfeita.')
  })

  it('só os daquela importação: os de outra e os cadastrados à mão ficam', () => {
    const pacientes = [importado('a'), importado('b', {}, { id: 'imp2', em: EM }), { ...criarPacienteVazio('mao', EM), nome: 'Ana' }]
    expect(pacientesQueSaem('imp1', pacientes, [], []).saem).toEqual(['a'])
  })
})

describe('CA-1942: os que já foram mudados ficam', () => {
  it('quem ganhou plano, quem ganhou link e quem teve a ficha editada ficam; os outros saem (DP-IP-19)', () => {
    const pacientes = [
      importado('plano'),
      importado('link'),
      importado('editado', { atualizadoEm: new Date(2026, 9, 29, 15, 0).toISOString(), telefone: '(11) 9' }),
      importado('d'),
      importado('e'),
    ]
    const casos = [
      { id: 'c1', pacienteId: 'plano' },
      { id: 'c2', pacienteId: null },
    ]
    // O link aponta para o paciente sem que o plano dele tenha paciente (D-147 da whatsapp-e-retorno).
    const acompanhamentos = [link({ casoId: 'c2', pacienteId: 'link' })]
    expect(pacientesQueSaem('imp1', pacientes, casos, acompanhamentos)).toEqual({ saem: ['d', 'e'], ficam: 3 })
    expect(textoDoDesfeito(3)).toBe('Importação desfeita. 3 pacientes ficaram porque já foram mudados.')
    expect(textoDoDesfeito(1)).toBe('Importação desfeita. 1 paciente ficou porque já foi mudado.')
  })
})

describe('CB-917: paciente importado excluído à mão antes do "Desfazer"', () => {
  it('é ignorado, e a conta não o inclui', () => {
    const conta = observarMudancas(armazenamentoDaConta(new Memoria(), 'u1'), () => undefined, () => EM)
    const repo = criarRepositorioPacientes(conta)
    repo.criarVarios([importado('a'), importado('b'), importado('c')])
    // A nutricionista exclui um deles à mão, pela ficha, antes do "Desfazer".
    repo.excluir('b')
    const desfazer = pacientesQueSaem('imp1', repo.listar(), [], [])
    // Ele não está entre os que saem nem entre os que "ficaram porque já foram mudados".
    expect(desfazer).toEqual({ saem: ['a', 'c'], ficam: 0 })
    repo.excluirVarios(desfazer.saem)
    expect(repo.listar()).toEqual([])
    // A lápide da exclusão à mão continua a dela, e as do desfazer entram ao lado.
    const marcas = lerMudancas(montarCopia(conta, EM).dados[CHAVE_MUDANCAS] ?? null)
    expect(Object.keys(marcas.excluidos).sort()).toEqual(['pacientes/a', 'pacientes/b', 'pacientes/c'])
  })
})

describe('CA-1943: a linha das 24 horas em Pacientes', () => {
  const agora = new Date(2026, 9, 29, 16, 0)

  it('a importação de menos de 24 horas aparece, com o número de pacientes', () => {
    const pacientes = ['a', 'b', 'c', 'd', 'e'].map((id) => importado(id))
    expect(importacoesRecentes(pacientes, [], [], agora)).toEqual([{ id: 'imp1', em: EM, pacientes: 5, desfaziveis: 5 }])
    expect(rotuloDaImportacao(EM, agora)).toBe('Importação de hoje, 14:32')
  })

  it('CA-1937: o dia da importação, no relógio de quem usa', () => {
    expect(diaDaImportacao(new Date(2026, 9, 29, 23, 50).toISOString())).toBe('29/10/2026')
    expect(diaDaImportacao('estragada')).toBe('')
  })

  it('de ontem, diz "de ontem"', () => {
    expect(rotuloDaImportacao(EM, new Date(2026, 9, 30, 9, 0))).toBe('Importação de ontem, 14:32')
  })

  it('24 horas depois, a linha não aparece mais e os pacientes ficam', () => {
    const pacientes = [importado('a')]
    const depois = new Date(new Date(EM).getTime() + JANELA_DO_DESFAZER_MS)
    expect(importacoesRecentes(pacientes, [], [], depois)).toEqual([])
    expect(importacoesRecentes(pacientes, [], [], new Date(depois.getTime() - 60_000))).toHaveLength(1)
  })

  it('DP-IP-20: sem ninguém para desfazer (todos mudados), a linha não aparece', () => {
    const pacientes = [importado('a', { atualizadoEm: new Date(2026, 9, 29, 15, 0).toISOString() })]
    expect(importacoesRecentes(pacientes, [], [], agora)).toEqual([])
  })

  it('a mais nova vem primeiro', () => {
    const mais = new Date(2026, 9, 29, 15, 10).toISOString()
    const pacientes = [importado('a'), importado('b', {}, { id: 'imp2', em: mais })]
    expect(importacoesRecentes(pacientes, [], [], agora).map((i) => i.id)).toEqual(['imp2', 'imp1'])
  })
})

describe('CA-1934: os importados não contam como ativos', () => {
  it('a conta Free com 2 ativos importa 300 e continua com 2, sem aviso; o importado que ganha link passa a contar', () => {
    const arm = new Memoria()
    const repo = criarRepositorioPacientes(arm)
    const links = [link({ casoId: 'c1', pacienteId: 'p1' }, new Date().toISOString()), link({ casoId: 'c2', pacienteId: 'p2' }, new Date().toISOString())]
    const free = planoPorId('free')
    if (free === null) throw new Error('sem o Free')
    expect(estadoDoLimite(free, pacientesAtivos(links.map(ultimaAtividade))).excedeu).toBe(false)

    repo.criarVarios(Array.from({ length: 300 }, (_, i) => importado(`imp-${i}`)))
    expect(repo.listar()).toHaveLength(300)
    // A importação não cria plano nem link: os ativos continuam os 2 links.
    const ativos = pacientesAtivos(links.map(ultimaAtividade))
    expect(ativos).toBe(2)
    expect(estadoDoLimite(free, ativos)).toMatchObject({ ativos: 2, excedeu: false })

    const comLink = [...links, link({ casoId: 'c3', pacienteId: 'imp-0' }, new Date().toISOString())]
    expect(estadoDoLimite(free, pacientesAtivos(comLink.map(ultimaAtividade)))).toMatchObject({ ativos: 3, excedeu: true })
  })
})

describe('CB-913: "Desfazer" num aparelho apaga nos dois', () => {
  it('cada um que sai deixa a lápide na cópia, como a exclusão à mão', () => {
    const conta = observarMudancas(armazenamentoDaConta(new Memoria(), 'u1'), () => undefined, () => EM)
    const repo = criarRepositorioPacientes(conta)
    repo.criarVarios([importado('a'), importado('b'), importado('c')])
    repo.excluirVarios(pacientesQueSaem('imp1', repo.listar(), [], []).saem)
    const marcas = lerMudancas(montarCopia(conta, EM).dados[CHAVE_MUDANCAS] ?? null)
    expect(Object.keys(marcas.excluidos).sort()).toEqual(['pacientes/a', 'pacientes/b', 'pacientes/c'])
  })
})
