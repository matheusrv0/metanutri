import { contarPendentes, daLinhaCrnParaConferir, daLinhaPedidoParaAprovar } from './aprovacoes.ts'

describe('aprovações', () => {
  it('lê o pedido da fila', () => {
    expect(
      daLinhaPedidoParaAprovar({
        id: 'p1',
        usuario: 'u1',
        nome: 'Júlia Martins',
        email: 'julia@ufrn.edu.br',
        instituicao: 'UFRN',
        matricula: '20230045871',
        periodo: 7,
        formatura: '2027-07-01',
        enviado_em: '2026-09-30T13:42:00Z',
        arquivo: 'u1/1-declaracao.pdf',
      }),
    ).toEqual({
      id: 'p1',
      usuario: 'u1',
      nome: 'Júlia Martins',
      email: 'julia@ufrn.edu.br',
      instituicao: 'UFRN',
      matricula: '20230045871',
      periodo: 7,
      formatura: '2027-07',
      enviadoEm: '2026-09-30T13:42:00Z',
      arquivo: 'u1/1-declaracao.pdf',
    })
    expect(daLinhaPedidoParaAprovar({ id: 1 })).toBeNull()
  })

  it('lê o CRN da fila', () => {
    expect(
      daLinhaCrnParaConferir({
        usuario: 'u2',
        nome: 'Ana Souza',
        email: 'ana@gmail.com',
        crn_regiao: 6,
        crn_numero: '12345',
        conta_criada_em: '2026-09-30T12:00:00Z',
        crn_status: 'em_conferencia',
        crn_decidido_em: null,
      }),
    ).toEqual({
      usuario: 'u2',
      nome: 'Ana Souza',
      email: 'ana@gmail.com',
      crn: { regiao: 6, numero: '12345' },
      contaCriadaEm: '2026-09-30T12:00:00Z',
      status: 'em_conferencia',
      decididoEm: null,
    })
  })

  it('CA-291: conta só o que está pendente', () => {
    const crn = { usuario: 'u', nome: '', email: '', crn: { regiao: 6, numero: '1' }, contaCriadaEm: '', decididoEm: null }
    expect(contarPendentes([{} as never, {} as never], [{ ...crn, status: 'em_conferencia' }, { ...crn, status: 'conferido' }])).toEqual({ estudantes: 2, crn: 1, total: 3 })
  })
})
