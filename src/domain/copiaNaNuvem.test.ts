import { apelidoDoAparelho, gravarCopia, lerCopia, lerVersao, prazoParaTamanho } from './copiaNaNuvem.ts'
import { nuvemFalsa } from './nuvemFalsa.test-utils.ts'
import type { Backup } from './perfil.ts'

const copia = (pacientes: string): Backup => ({ formato: 1, geradoEm: '2026-10-08T10:00:00.000Z', dados: { 'metanutri:pacientes': pacientes } })
const AGORA = '2026-10-08T10:00:00.000Z'
const DEPOIS = '2026-10-08T10:05:00.000Z'

describe('ler a cópia da conta (spec dados-na-nuvem)', () => {
  it('traz a cópia e a versão da linha da conta', async () => {
    const nuvem = nuvemFalsa()
    nuvem.guardar('conta-a', copia('[{"id":"ana"}]'), AGORA)
    const leitura = await lerCopia(nuvem.cliente, 'conta-a')
    expect(leitura).toEqual({ tipo: 'lida', copia: copia('[{"id":"ana"}]'), versao: '2026-10-08T10:00:00.000+00:00' })
  })

  it('sem linha na nuvem, não há cópia nem versão', async () => {
    expect(await lerCopia(nuvemFalsa().cliente, 'conta-a')).toEqual({ tipo: 'lida', copia: null, versao: null })
  })

  it('CA-484: sem internet, a leitura falha por rede', async () => {
    const nuvem = nuvemFalsa()
    nuvem.semInternet = true
    expect(await lerCopia(nuvem.cliente, 'conta-a')).toEqual({ tipo: 'falhou', motivo: 'rede' })
  })

  it('CA-474: com a sessão de outra conta (ou sem sessão), não pede nada', async () => {
    const nuvem = nuvemFalsa({ usuario: 'conta-b' })
    expect(await lerCopia(nuvem.cliente, 'conta-a')).toEqual({ tipo: 'falhou', motivo: 'rede' })
    nuvem.usuario = null
    expect(await lerCopia(nuvem.cliente, 'conta-a')).toEqual({ tipo: 'falhou', motivo: 'rede' })
    expect(nuvem.pedidos).toEqual([])
  })

  it('cópia num formato que este MetaNutri não entende não vira cópia vazia', async () => {
    const nuvem = nuvemFalsa()
    nuvem.guardar('conta-a', { formato: 2, dados: {} }, AGORA)
    expect(await lerCopia(nuvem.cliente, 'conta-a')).toEqual({ tipo: 'falhou', motivo: 'formato' })
  })

  it('a nuvem que não responde no prazo conta como falha de rede', async () => {
    const nuvem = nuvemFalsa()
    nuvem.segurar = true
    expect(await lerCopia(nuvem.cliente, 'conta-a', 10)).toEqual({ tipo: 'falhou', motivo: 'rede' })
    nuvem.soltar()
  })
})

describe('gravar a cópia com conferência de versão (D-132)', () => {
  const pedido = (versao: string | null, pacientes = '[{"id":"ana"}]') => ({ copia: copia(pacientes), versao, aparelho: 'Windows', esperado: 'conta-a', agora: DEPOIS })

  it('sem linha na nuvem, cria a linha da conta', async () => {
    const nuvem = nuvemFalsa()
    expect(await gravarCopia(nuvem.cliente, pedido(null))).toEqual({ tipo: 'gravada', versao: '2026-10-08T10:05:00.000+00:00' })
    expect(nuvem.linhas.get('conta-a')).toMatchObject({ dados: copia('[{"id":"ana"}]'), aparelho: 'Windows' })
    expect(nuvem.pedidos).toEqual(['insert'])
  })

  it('com a versão que está na nuvem, atualiza e devolve a versão nova', async () => {
    const nuvem = nuvemFalsa()
    nuvem.guardar('conta-a', copia('[]'), AGORA)
    expect(await gravarCopia(nuvem.cliente, pedido('2026-10-08T10:00:00.000+00:00'))).toEqual({ tipo: 'gravada', versao: '2026-10-08T10:05:00.000+00:00' })
    expect(nuvem.linhas.get('conta-a')?.dados).toEqual(copia('[{"id":"ana"}]'))
    expect(nuvem.pedidos).toEqual(['update'])
  })

  it('CA-480: outro aparelho salvou depois da versão conhecida: nada é sobrescrito e a resposta é "mudou"', async () => {
    const nuvem = nuvemFalsa()
    nuvem.guardar('conta-a', copia('[{"id":"bia"}]'), '2026-10-08T10:03:00.000Z')
    expect(await gravarCopia(nuvem.cliente, pedido('2026-10-08T10:00:00.000+00:00'))).toEqual({ tipo: 'mudou' })
    expect(nuvem.linhas.get('conta-a')?.dados).toEqual(copia('[{"id":"bia"}]'))
  })

  it('CA-480: outro aparelho criou a linha antes: "mudou", sem sobrescrever', async () => {
    const nuvem = nuvemFalsa()
    nuvem.guardar('conta-a', copia('[{"id":"bia"}]'), AGORA)
    expect(await gravarCopia(nuvem.cliente, pedido(null))).toEqual({ tipo: 'mudou' })
    expect(nuvem.linhas.get('conta-a')?.dados).toEqual(copia('[{"id":"bia"}]'))
  })

  it('CB-123: a cópia acima da trava de tamanho é recusada como grande, pelo banco ou pelo servidor (413)', async () => {
    const nuvem = nuvemFalsa()
    nuvem.limite = 50
    expect(await gravarCopia(nuvem.cliente, pedido(null, JSON.stringify([{ id: 'x'.repeat(100) }])))).toEqual({ tipo: 'falhou', motivo: 'grande' })
    nuvem.limite = null
    nuvem.recusar413 = true
    expect(await gravarCopia(nuvem.cliente, pedido(null))).toEqual({ tipo: 'falhou', motivo: 'grande' })
    expect(nuvem.linhas.size).toBe(0)
  })

  it('CA-477: sem internet, sem sessão, com a sessão de outra conta ou sem resposta no prazo, falha por rede', async () => {
    const nuvem = nuvemFalsa()
    nuvem.semInternet = true
    expect(await gravarCopia(nuvem.cliente, pedido(null))).toEqual({ tipo: 'falhou', motivo: 'rede' })
    nuvem.semInternet = false
    nuvem.usuario = null
    expect(await gravarCopia(nuvem.cliente, pedido(null))).toEqual({ tipo: 'falhou', motivo: 'rede' })
    nuvem.usuario = 'conta-b'
    expect(await gravarCopia(nuvem.cliente, pedido(null))).toEqual({ tipo: 'falhou', motivo: 'rede' })
    nuvem.usuario = 'conta-a'
    nuvem.segurar = true
    expect(await gravarCopia(nuvem.cliente, pedido(null), 10)).toEqual({ tipo: 'falhou', motivo: 'rede' })
    nuvem.soltar()
    expect(nuvem.linhas.has('conta-b')).toBe(false)
  })
})

describe('prazo e desistência (DP-24)', () => {
  it('o prazo é 15 s mais 1 s a cada 50 KB da cópia', () => {
    expect(prazoParaTamanho(0)).toBe(15_000)
    expect(prazoParaTamanho(50_000)).toBe(16_000)
    expect(prazoParaTamanho(50_001)).toBe(17_000)
    expect(prazoParaTamanho(5_000_000)).toBe(115_000)
  })

  it('o pedido que estoura o prazo é cancelado, na gravação e na leitura', async () => {
    const nuvem = nuvemFalsa()
    nuvem.perderResposta = true
    expect(await gravarCopia(nuvem.cliente, { copia: copia('[]'), versao: null, aparelho: 'Windows', esperado: 'conta-a', agora: AGORA }, 10)).toEqual({ tipo: 'falhou', motivo: 'rede' })
    expect(nuvem.sinais.at(-1)?.aborted).toBe(true)
    expect(await lerVersao(nuvem.cliente, 'conta-a', 10)).toEqual({ tipo: 'falhou' })
    expect(nuvem.sinais.at(-1)?.aborted).toBe(true)
    expect(await lerCopia(nuvem.cliente, 'conta-a', 10)).toEqual({ tipo: 'falhou', motivo: 'rede' })
    expect(nuvem.sinais.at(-1)?.aborted).toBe(true)
  })
})

describe('Apelido do aparelho', () => {
  it.each([
    ['Mozilla/5.0 (Linux; Android 14) AppleWebKit', 'Celular Android'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', 'iPhone ou iPad'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 'Mac'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Windows'],
    ['coisa desconhecida', 'Este aparelho'],
  ])('%s', (agente, esperado) => {
    expect(apelidoDoAparelho(agente)).toBe(esperado)
  })
})
