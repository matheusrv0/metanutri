// @vitest-environment node
// A limpeza dos comprovantes (spec seguranca-lote-5, D-263 e D-264): o núcleo da função limpar-comprovantes
// com um banco de mentira. O banco e o armazenamento de verdade são testados no Supabase local
// (testes/seguranca/limpeza.test.ts).
import { CABECALHO_DA_CHAVE, LIMITE_POR_RODADA, limparComprovantes, type BancoDaLimpeza } from '../../supabase/functions/_shared/limpeza.ts'

const AGORA = new Date('2026-10-20T06:15:00Z')
const CHAVE = 'a'.repeat(64)
const VENCIDOS = ['11111111-1111-1111-1111-111111111111/comprovante.pdf', '22222222-2222-2222-2222-222222222222/outro.png']

interface BancoFalso extends BancoDaLimpeza {
  readonly chamadas: string[]
}

function bancoFalso(sobre: { vencidos?: readonly string[]; falhaAoApagar?: string | null; apagados?: number; marcados?: number } = {}): BancoFalso {
  const chamadas: string[] = []
  return {
    chamadas,
    chaveConfere: vi.fn(async (chave: string) => {
      chamadas.push('chave')
      return chave === CHAVE
    }),
    vencidos: vi.fn(async () => {
      chamadas.push('vencidos')
      return sobre.vencidos ?? VENCIDOS
    }),
    apagar: vi.fn(async (caminhos: readonly string[]) => {
      chamadas.push('apagar')
      const falha = sobre.falhaAoApagar ?? null
      return { falha, apagados: falha === null ? (sobre.apagados ?? caminhos.length) : 0 }
    }),
    anotar: vi.fn(async (caminhos: readonly string[]) => {
      chamadas.push('anotar')
      return sobre.marcados ?? caminhos.length
    }),
  }
}

const pedir = (banco: BancoDaLimpeza, chave: string | null, metodo = 'POST', log = vi.fn()) =>
  limparComprovantes({ metodo, chave }, { banco, agora: () => AGORA, log })

describe('D-264: só o agendamento, com a chave do cofre, aciona a limpeza', () => {
  it('a chave vai no cabeçalho x-chave-da-limpeza', () => {
    expect(CABECALHO_DA_CHAVE).toBe('x-chave-da-limpeza')
  })

  it.each([null, '', '   '])('CA-847: sem a chave (%j), responde 401 sem perguntar nada ao banco', async (chave) => {
    const banco = bancoFalso()
    const resposta = await pedir(banco, chave)
    expect(resposta.status).toBe(401)
    expect(banco.chamadas).toEqual([])
  })

  it.each([31, 63, 65, 200])('CA-847: chave com %i caracteres (a do cofre tem 64) é recusada sem perguntar ao banco', async (tamanho) => {
    const banco = bancoFalso()
    const resposta = await pedir(banco, 'a'.repeat(tamanho))
    expect(resposta).toEqual({ status: 401, corpo: { erro: 'Chave da limpeza ausente ou errada.' } })
    expect(banco.chamadas).toEqual([])
  })

  it('CA-847: com a chave errada, responde 401 e não lista nem apaga nada', async () => {
    const banco = bancoFalso()
    const resposta = await pedir(banco, 'b'.repeat(64))
    expect(resposta.status).toBe(401)
    expect(resposta.corpo).toEqual({ erro: 'Chave da limpeza ausente ou errada.' })
    expect(banco.chamadas).toEqual(['chave'])
  })

  it('só aceita POST, antes de conferir a chave', async () => {
    const banco = bancoFalso()
    expect((await pedir(banco, CHAVE, 'GET')).status).toBe(405)
    expect(banco.chamadas).toEqual([])
  })

  it('a chave chega aparada ao banco (o cabeçalho pode vir com espaço)', async () => {
    const banco = bancoFalso()
    expect((await pedir(banco, ` ${CHAVE} `)).status).toBe(200)
    expect(banco.chaveConfere).toHaveBeenCalledWith(CHAVE)
  })
})

describe('D-263: a limpeza', () => {
  it('CA-843: apaga os vencidos do armazenamento e só depois anota nos pedidos', async () => {
    const banco = bancoFalso()
    const resposta = await pedir(banco, CHAVE)
    expect(resposta).toEqual({ status: 200, corpo: { apagados: 2, marcados: 2 } })
    expect(banco.chamadas).toEqual(['chave', 'vencidos', 'apagar', 'anotar'])
    expect(banco.apagar).toHaveBeenCalledWith(VENCIDOS)
    expect(banco.anotar).toHaveBeenCalledWith(VENCIDOS)
  })

  it('CB-265: pede no máximo 1000 por rodada, na data de agora', async () => {
    const banco = bancoFalso()
    await pedir(banco, CHAVE)
    expect(LIMITE_POR_RODADA).toBe(1000)
    expect(banco.vencidos).toHaveBeenCalledWith(AGORA, 1000)
  })

  it('nada vencido: responde 200 com zeros e não chama o armazenamento', async () => {
    const banco = bancoFalso({ vencidos: [] })
    expect(await pedir(banco, CHAVE)).toEqual({ status: 200, corpo: { apagados: 0, marcados: 0 } })
    expect(banco.chamadas).toEqual(['chave', 'vencidos'])
  })

  it('CB-266: arquivo que já tinha saído não dá erro; os números dizem o que aconteceu de fato', async () => {
    const banco = bancoFalso({ apagados: 1, marcados: 2 })
    expect(await pedir(banco, CHAVE)).toEqual({ status: 200, corpo: { apagados: 1, marcados: 2 } })
  })

  it('CA-848: o armazenamento recusa: 502, nenhum pedido é marcado, e o motivo vai para o registro', async () => {
    const banco = bancoFalso({ falhaAoApagar: 'storage fora do ar' })
    const log = vi.fn()
    const resposta = await pedir(banco, CHAVE, 'POST', log)
    expect(resposta).toEqual({ status: 502, corpo: { erro: 'O armazenamento não apagou os comprovantes. A próxima rodada tenta de novo.' } })
    expect(banco.anotar).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith('A limpeza não apagou os comprovantes:', 'storage fora do ar')
  })

  it('CA-851: a resposta e o registro levam só números, nunca caminho de arquivo nem id de conta', async () => {
    const log = vi.fn()
    const resposta = await pedir(bancoFalso(), CHAVE, 'POST', log)
    const tudo = JSON.stringify({ resposta, log: log.mock.calls })
    for (const caminho of VENCIDOS) {
      expect(tudo).not.toContain(caminho)
      expect(tudo).not.toContain(caminho.split('/')[0] ?? '')
    }
    expect(log).toHaveBeenCalledWith('Limpeza dos comprovantes:', { apagados: 2, marcados: 2 })
  })

  it('falha do banco ao conferir, listar ou anotar sobe para a função, que responde 500', async () => {
    const banco = { ...bancoFalso(), vencidos: vi.fn(async () => Promise.reject(new Error('banco fora do ar'))) }
    await expect(pedir(banco, CHAVE)).rejects.toThrow('banco fora do ar')
  })
})
