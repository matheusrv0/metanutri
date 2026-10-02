import { SEM_ASSINATURA, type Assinatura } from './assinatura.ts'
import {
  ARQUIVO_MAXIMO_BYTES,
  avisoDoEstudante,
  caminhoDoComprovante,
  daLinhaPedido,
  formatarDataLonga,
  formatarMesAno,
  mesAtual,
  validarPedido,
  type PedidoEstudante,
} from './pedidoEstudante.ts'

const hoje = new Date('2026-09-30T15:00:00Z')
const valido = { instituicao: 'UFRN', matricula: '20230045871', periodo: 7, formatura: '2027-07', arquivo: { tipo: 'application/pdf', tamanho: 412_000 } }

const pedido: PedidoEstudante = {
  id: 'p1',
  instituicao: 'UFRN',
  matricula: '20230045871',
  periodo: 7,
  formatura: '2027-07',
  status: 'em_analise',
  motivo: null,
  enviadoEm: '2026-09-30T13:42:00Z',
  decididoEm: null,
  avisoFechado: false,
}

const estudanteAtiva: Assinatura = { ...SEM_ASSINATURA, plano: 'estudante', planoPedido: 'estudante', status: 'ativa', expiraEm: '2027-07-31T23:59:59Z' }

describe('validarPedido (CA-271 e CA-272)', () => {
  it('aceita o pedido completo', () => {
    expect(validarPedido(valido, hoje)).toBeNull()
  })

  it('pede cada campo, na ordem da tela', () => {
    expect(validarPedido({ ...valido, instituicao: ' ' }, hoje)).toBe('instituicao')
    expect(validarPedido({ ...valido, matricula: '12' }, hoje)).toBe('matricula')
    expect(validarPedido({ ...valido, periodo: null }, hoje)).toBe('periodo')
    expect(validarPedido({ ...valido, periodo: 13 }, hoje)).toBe('periodo')
    expect(validarPedido({ ...valido, formatura: '' }, hoje)).toBe('formatura')
    expect(validarPedido({ ...valido, formatura: '2026-08' }, hoje)).toBe('formatura')
    expect(validarPedido({ ...valido, formatura: '2026-09' }, hoje)).toBeNull()
    expect(validarPedido({ ...valido, arquivo: null }, hoje)).toBe('arquivo-vazio')
    expect(validarPedido({ ...valido, arquivo: { tipo: 'image/gif', tamanho: 10 } }, hoje)).toBe('arquivo-tipo')
    expect(validarPedido({ ...valido, arquivo: { tipo: 'image/png', tamanho: ARQUIVO_MAXIMO_BYTES + 1 } }, hoje)).toBe('arquivo-grande')
  })
})

describe('datas sem cair no fuso (foco de revisão 5)', () => {
  it('mês e ano por extenso, sem passar por Date', () => {
    expect(formatarMesAno('2027-07')).toBe('julho de 2027')
    expect(formatarMesAno('2027-01')).toBe('janeiro de 2027')
  })

  it('a validade aparece no dia de São Paulo', () => {
    expect(formatarDataLonga('2027-07-31T23:59:59Z')).toBe('31 de julho de 2027')
  })

  it('o mês atual sai em AAAA-MM', () => {
    expect(mesAtual(hoje)).toBe('2026-09')
  })
})

describe('caminhoDoComprovante', () => {
  it('fica na pasta da pessoa, com nome seguro', () => {
    expect(caminhoDoComprovante('u1', 'Declaração de matrícula (2).PDF', hoje)).toBe(`u1/${hoje.getTime()}-declaracao-de-matricula-2.pdf`)
  })
})

describe('daLinhaPedido', () => {
  it('lê a linha do banco', () => {
    expect(
      daLinhaPedido({
        id: 'p1',
        instituicao: 'UFRN',
        matricula: '20230045871',
        periodo: 7,
        formatura: '2027-07-01',
        status: 'em_analise',
        motivo: null,
        enviado_em: '2026-09-30T13:42:00Z',
        decidido_em: null,
        aviso_fechado: false,
      }),
    ).toEqual(pedido)
    expect(daLinhaPedido({ id: 'p1', status: 'outro' })).toBeNull()
  })
})

describe('avisoDoEstudante (CA-279 e CA-285)', () => {
  it('sem pedido, pede o comprovante', () => {
    expect(avisoDoEstudante(null, SEM_ASSINATURA)).toEqual({ tipo: 'enviar' })
  })

  it('em análise e recusado', () => {
    expect(avisoDoEstudante(pedido, SEM_ASSINATURA)).toEqual({ tipo: 'analise' })
    expect(avisoDoEstudante({ ...pedido, status: 'recusado', motivo: 'Ilegível' }, SEM_ASSINATURA)).toEqual({ tipo: 'recusado', motivo: 'Ilegível' })
  })

  it('aprovado mostra a validade até ser fechado', () => {
    const aprovado = { ...pedido, status: 'aprovado' as const }
    expect(avisoDoEstudante(aprovado, estudanteAtiva)).toEqual({ tipo: 'aprovado', pedidoId: 'p1', expiraEm: '2027-07-31T23:59:59Z' })
    expect(avisoDoEstudante({ ...aprovado, avisoFechado: true }, estudanteAtiva)).toBeNull()
  })

  it('plano Estudante vencido pede renovação', () => {
    const vencida: Assinatura = { ...estudanteAtiva, plano: 'free', status: 'vencida' }
    expect(avisoDoEstudante({ ...pedido, status: 'aprovado', avisoFechado: true }, vencida)).toEqual({ tipo: 'renovar' })
  })
})
