// Criar os importados (spec importar-pacientes, D-910 a D-912): CA-1933, CA-1935, CA-1936, CA-1945, CB-912, CB-921.
import { armazenamentoDaConta } from '../armazenamentoDaConta.ts'
import { CHAVE_MUDANCAS, lerMudancas, montarCopia } from '../copiaDaConta.ts'
import { criarRepositorioPacientes } from '../pacientes.ts'
import type { ArmazenamentoListavel } from '../persistencia.ts'
import { observarMudancas } from '../sincronia.ts'
import { analisarAba } from './colunas.ts'
import { bytesDaCopia, cabeNaCopia, novosPacientes, prepararImportacao, TETO_DA_COPIA } from './criar.ts'
import { dadosDosPacientes, montarPrevia, type EntradaDaPrevia } from './previa.ts'

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

const AGORA = '2026-10-29T17:32:00.000Z'
const HOJE = '2026-10-29'

function entrada(linhas: readonly (readonly string[])[], pacientes: EntradaDaPrevia['pacientes'] = []): EntradaDaPrevia {
  const analise = analisarAba(
    linhas.map((celulas, i) => ({ numero: i + 1, celulas: [...celulas] })),
    false,
  )
  return { linhas: analise.linhas, colunas: analise.colunas, destinos: analise.destinos, correcoes: {}, marcas: {}, pacientes, hoje: HOJE }
}

const PLANILHA = [
  ['Nome', 'Sexo', 'Nascimento', 'CPF', 'Observações'],
  ['Ana Souza', 'F', '14/03/1991', '123.456.789-00', 'Asma'],
  ['Bia Lima', 'F', '02/11/1985', '111.222.333-44', ''],
  ['Caio Dias', 'M', '23/07/1979', '', ''],
  ['Duda Reis', 'F', '09/05/1988', '', ''],
  ['Enzo Melo', 'M', '17/01/2001', '', ''],
]

let n = 0
const gerarId = () => `novo-${++n}`

describe('CA-1933: os marcados são criados de uma vez, sem plano', () => {
  it('cada um com a importação (código e hora) e as datas da importação (D-912)', () => {
    const previa = montarPrevia(entrada(PLANILHA))
    const pacientes = novosPacientes(dadosDosPacientes(previa), { importacaoId: 'imp1', agora: AGORA, gerarId })
    expect(pacientes).toHaveLength(5)
    expect(pacientes[0]).toMatchObject({
      nome: 'Ana Souza',
      sexo: 'F',
      nascimento: '1991-03-14',
      observacoes: 'Observações: Asma',
      criadoEm: AGORA,
      atualizadoEm: AGORA,
      importacao: { id: 'imp1', em: AGORA },
      // Os campos da anamnese nascem vazios, como no cadastro à mão.
      restricoesMarcadas: [],
      suplementos: [],
    })
  })
})

describe('CA-1945: depois de importar, só os pacientes criados vão para a cópia da conta', () => {
  it('a cópia que sobe tem as fichas e as marcas de cada uma, e nada das colunas de fora', () => {
    const base = new Memoria()
    const conta = observarMudancas(armazenamentoDaConta(base, 'u1'), () => undefined, () => AGORA)
    const repo = criarRepositorioPacientes(conta)
    const previa = montarPrevia(entrada(PLANILHA))
    const pacientes = novosPacientes(dadosDosPacientes(previa), { importacaoId: 'imp1', agora: AGORA, gerarId })
    repo.criarVarios(pacientes)
    const copia = montarCopia(conta, AGORA)
    expect(Object.keys(lerMudancas(copia.dados[CHAVE_MUDANCAS] ?? null).alterados).sort()).toEqual(pacientes.map((p) => `pacientes/${p.id}`).sort())
    const texto = JSON.stringify(copia)
    expect(texto).not.toContain('123.456.789-00')
    expect(texto).not.toContain('111.222.333-44')
    expect(texto).toContain('Ana Souza')
  })
})

describe('CA-1935 e CB-912: a lista mudou entre a prévia e o clique', () => {
  it('quem passou a existir vira "Já está na conta", a prévia volta com as contas corrigidas e nada é preparado', () => {
    const naTela = montarPrevia(entrada(PLANILHA))
    const resultado = prepararImportacao({
      entrada: entrada(PLANILHA),
      previaNaTela: naTela,
      pacientesAgora: [{ nome: 'Bia Lima', nascimento: '1985-11-02' }],
      armazenamento: new Memoria(),
      agora: AGORA,
      importacaoId: 'imp1',
      gerarId,
    })
    expect(resultado.tipo).toBe('mudou')
    if (resultado.tipo !== 'mudou') return
    expect(resultado.previa.linhas.find((l) => l.numero === 3)?.motivo).toBe('Já está na conta')
    expect(resultado.previa.prontos).toBe(4)
    expect(resultado.previa.comProblema).toBe(1)
  })

  it('sem mudança, os pacientes ficam prontos para criar', () => {
    const naTela = montarPrevia(entrada(PLANILHA))
    const resultado = prepararImportacao({ entrada: entrada(PLANILHA), previaNaTela: naTela, pacientesAgora: [], armazenamento: new Memoria(), agora: AGORA, importacaoId: 'imp1', gerarId })
    expect(resultado.tipo === 'pronta' ? resultado.pacientes.map((p) => p.nome) : resultado.tipo).toEqual(['Ana Souza', 'Bia Lima', 'Caio Dias', 'Duda Reis', 'Enzo Melo'])
  })
})

describe('CA-1936: a importação que faria a cópia passar de 5 MB', () => {
  /** Uma conta com a cópia a `folga` bytes do teto (o perfil com um logotipo grande). */
  function contaPerto(folga: number): Memoria {
    const arm = new Memoria()
    arm.setItem('metanutri:perfil', JSON.stringify({ logo: '' }))
    const vazia = bytesDaCopia(montarCopia(arm, AGORA))
    arm.setItem('metanutri:perfil', JSON.stringify({ logo: 'x'.repeat(TETO_DA_COPIA - vazia - folga) }))
    return arm
  }

  it('nada é preparado, e "cabem mais N" é exato: N cabem e N + 1 não', () => {
    const arm = contaPerto(3000)
    const pacientes = novosPacientes(
      Array.from({ length: 10 }, (_, i) => ({ nome: `Paciente ${i}`, sexo: 'F' as const, nascimento: null, telefone: '', email: '', objetivo: '', observacoes: '' })),
      { importacaoId: 'imp1', agora: AGORA, gerarId },
    )
    const resultado = cabeNaCopia(arm, pacientes, AGORA)
    expect(resultado.cabe).toBe(false)
    if (resultado.cabe) return
    expect(resultado.cabem).toBeGreaterThan(0)
    expect(resultado.cabem).toBeLessThan(10)
    expect(cabeNaCopia(arm, pacientes.slice(0, resultado.cabem), AGORA).cabe).toBe(true)
    expect(cabeNaCopia(arm, pacientes.slice(0, resultado.cabem + 1), AGORA).cabe).toBe(false)
  })

  it('prepararImportacao diz quantos cabem', () => {
    const arm = contaPerto(1500)
    const resultado = prepararImportacao({ entrada: entrada(PLANILHA), previaNaTela: montarPrevia(entrada(PLANILHA)), pacientesAgora: [], armazenamento: arm, agora: AGORA, importacaoId: 'imp1', gerarId })
    expect(resultado.tipo).toBe('nao-cabe')
  })

  it('a medida é a do texto em UTF-8: acento conta dois bytes (DP-IP-18)', () => {
    expect(bytesDaCopia({ formato: 1, geradoEm: '', dados: { a: 'ç' } })).toBe(new TextEncoder().encode(JSON.stringify({ formato: 1, geradoEm: '', dados: { a: 'ç' } })).length)
    expect(TETO_DA_COPIA).toBe(5 * 1024 * 1024)
  })
})

describe('CB-921: a importação que cabe, mas deixa a conta perto do teto', () => {
  it('cria normalmente', () => {
    const arm = new Memoria()
    const pacientes = novosPacientes([{ nome: 'Ana', sexo: 'F', nascimento: null, telefone: '', email: '', objetivo: '', observacoes: '' }], { importacaoId: 'imp1', agora: AGORA, gerarId })
    const tamanho = bytesDaCopia(montarCopia(arm, AGORA))
    arm.setItem('metanutri:perfil', JSON.stringify({ logo: 'x'.repeat(TETO_DA_COPIA - tamanho - 2000) }))
    expect(cabeNaCopia(arm, pacientes, AGORA).cabe).toBe(true)
  })
})
