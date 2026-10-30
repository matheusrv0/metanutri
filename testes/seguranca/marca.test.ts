// Spec marca-no-link (CA-1974 e CA-1975) num Supabase LOCAL: a marca publicada chega ao paciente pela função do link,
// sem dizer de quem é, ninguém lista marcas, e o banco recusa a logo e a cor fora da regra, mesmo contornando o app.
// A exclusão (CA-1976) está em exclusao.test.ts: `marcas` entrou em TABELAS_DA_CONTA. Os ataques de uma conta à outra
// (ler, mudar, apagar e criar) estão em tabelas.test.ts, pela mesma lista.
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { barradoOuVazio, COR_DE_TESTE, fotografar, LOGO_DE_TESTE, prepararCenario, recusadoCom, type Cenario } from './preparo.ts'

let c: Cenario
let foto: string

beforeAll(async () => {
  c = await prepararCenario()
  foto = await fotografar(c)
})

afterEach(async () => {
  expect(await fotografar(c), 'o teste mudou dado da vítima ou do que é fechado').toBe(foto)
})

/** Um PNG em data URI com `bytes` bytes (múltiplo de 3), começando pela assinatura do PNG. */
const png = (bytes: number) => `data:image/png;base64,iVBORw0KGgo${'A'.repeat((bytes / 3) * 4 - 11)}`

describe('CA-1974: o link devolve a marca, e só a do dono do link', () => {
  it('CA-1974: o paciente (sem login) recebe a logo e a cor junto com as missões, sem o id da conta', async () => {
    const r = await c.anonimo.rpc('missoes_por_token', { p_token: c.vitima.token })
    expect(r.error).toBeNull()
    const linhas = (r.data ?? []) as Record<string, unknown>[]
    expect(linhas).toHaveLength(1)
    const linha = linhas[0] ?? {}
    expect(linha).toMatchObject({ token: c.vitima.token, marca_logo: LOGO_DE_TESTE, marca_cor: COR_DE_TESTE })
    expect(Object.keys(linha)).not.toContain('nutricionista_id')
    expect(JSON.stringify(linha)).not.toContain(c.vitima.id)
  })

  it('CA-1968: o link de uma conta sem marca abre com a marca vazia', async () => {
    const r = await c.anonimo.rpc('missoes_por_token', { p_token: c.atacante.token })
    expect(r.error).toBeNull()
    expect((r.data as Record<string, unknown>[])[0]).toMatchObject({ marca_logo: null, marca_cor: null })
  })

  it('CA-1974: token que não existe não traz marca nenhuma', async () => {
    const r = await c.anonimo.rpc('missoes_por_token', { p_token: 'naoexiste-marca' })
    expect(r.error).toBeNull()
    expect(r.data).toEqual([])
  })

  it('CA-1974: não existe consulta que liste marcas: sem login é barrado, e outra conta não vê a da vítima', async () => {
    recusadoCom(await c.anonimo.from('marcas').select('*'), ['42501'])
    const daOutra = await c.atacante.cliente.from('marcas').select('*')
    barradoOuVazio(daOutra)
    expect(JSON.stringify(daOutra.data)).not.toContain(c.vitima.id)
  })
})

describe('CA-1975: o banco recusa o que contorna o app', () => {
  /** Grava na própria linha do atacante (o RLS deixa), para só a trava decidir. */
  const gravar = (linha: Record<string, unknown>) =>
    c.atacante.cliente.from('marcas').upsert({ nutricionista_id: c.atacante.id, ...linha }, { onConflict: 'nutricionista_id' }).select()

  afterEach(async () => {
    await c.servico.from('marcas').delete().eq('nutricionista_id', c.atacante.id)
  })

  it('controle: a própria conta grava a logo de 150 KB e uma cor no formato', async () => {
    const r = await gravar({ logo: png(150 * 1024), cor: '#1f4e8c' })
    expect(r.error).toBeNull()
  })

  it.each([
    ['JPG', 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ'],
    ['SVG', 'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIi8+'],
    ['PNG sem a assinatura', 'data:image/png;base64,AAAAAAAA'],
    ['endereço de fora', 'https://exemplo.com/logo.png'],
    ['texto fora do base64', 'data:image/png;base64,iVBORw0KGgo" onerror="alert(1)'],
    ['acima de 150 KB', png(150 * 1024 + 3)],
  ])('CA-1975: logo %s é recusada', async (_nome, logo) => {
    recusadoCom(await gravar({ logo }), ['23514'])
  })

  it.each([['azul'], ['#ABCDEF'], ['#abc'], ['#1f4e8c;x'], ['red']])('CA-1975: cor "%s" é recusada', async (cor) => {
    recusadoCom(await gravar({ cor }), ['23514'])
  })
})
