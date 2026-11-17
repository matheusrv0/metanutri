// @vitest-environment node
// Rodada de melhorias (16/11), infraestrutura: a pilha dos testes de ataque (spec seguranca-lote-4, D-136) pode ter
// outro nome e outras portas, por variável de ambiente, para duas rodadas ao mesmo tempo não derrubarem uma à outra.
// Sem a variável, tudo fica como sempre foi. Puro: sem Docker nem rede.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { configDaPilha, PILHA_PADRAO, pilhaDoAmbiente } from '../../scripts/pilha-de-ataque.mjs'

const CONFIG = readFileSync(join(process.cwd(), 'testes', 'supabase-local', 'supabase', 'config.toml'), 'utf8')

describe('a pilha dos testes de ataque', () => {
  it('sem as variáveis, é a pilha de sempre, na pasta de sempre', () => {
    const pilha = pilhaDoAmbiente({})
    expect(pilha).toEqual(PILHA_PADRAO)
    expect(pilha).toMatchObject({ projeto: 'metanutri-ataques', portaBase: 55420, propria: false, pasta: 'testes/supabase-local' })
    expect(pilha.conteinerDoBanco).toBe('supabase_db_metanutri-ataques')
  })

  it('a configuração de sempre tem o nome e as portas do padrão', () => {
    expect(CONFIG).toContain(`project_id = "${PILHA_PADRAO.projeto}"`)
    expect(configDaPilha(CONFIG, PILHA_PADRAO)).toBe(CONFIG)
  })

  it('com as duas variáveis, é uma pilha própria, numa pasta temporária fora do commit', () => {
    const pilha = pilhaDoAmbiente({ ATAQUE_PROJETO: 'ataques-b', ATAQUE_PORTA_BASE: '55520' })
    expect(pilha).toEqual({
      projeto: 'ataques-b',
      portaBase: 55520,
      propria: true,
      pasta: 'testes/pilhas-temporarias/ataques-b',
      conteinerDoBanco: 'supabase_db_ataques-b',
    })
    const gitignore = readFileSync(join(process.cwd(), '.gitignore'), 'utf8')
    expect(gitignore.split(/\r?\n/)).toContain('testes/pilhas-temporarias/')
  })

  it('a cópia da configuração troca o nome e as três portas, e só isso', () => {
    const copia = configDaPilha(CONFIG, pilhaDoAmbiente({ ATAQUE_PROJETO: 'ataques-b', ATAQUE_PORTA_BASE: '55520' }))
    expect(copia).toContain('project_id = "ataques-b"')
    expect(copia).toMatch(/\[api\][^[]*\nport = 55521\n/)
    expect(copia).toMatch(/\[db\][^[]*\nport = 55522\n/)
    expect(copia).toMatch(/\[db\][^[]*\nshadow_port = 55520\n/)
    expect(copia).not.toMatch(/5542\d|metanutri-ataques"/)
    // O resto da configuração (serviços desligados, login, segundo fator) é o mesmo, linha a linha.
    const diferentes = CONFIG.split('\n').filter((linha, i) => linha !== copia.split('\n')[i])
    expect(diferentes).toEqual(['project_id = "metanutri-ataques"', 'port = 55421', 'port = 55422', 'shadow_port = 55420'])
  })

  it('se a configuração mudar e sobrar uma porta do padrão, a cópia é recusada', () => {
    const comOutraPorta = `${CONFIG}\n[inbucket]\nenabled = true\nport = 55424\n`
    expect(() => configDaPilha(comOutraPorta, pilhaDoAmbiente({ ATAQUE_PROJETO: 'ataques-b', ATAQUE_PORTA_BASE: '55520' }))).toThrow(/55424/)
  })

  it.each([
    [{ ATAQUE_PROJETO: 'ataques-b' }, /as duas/],
    [{ ATAQUE_PORTA_BASE: '55520' }, /as duas/],
    [{ ATAQUE_PROJETO: 'Ataques B', ATAQUE_PORTA_BASE: '55520' }, /ATAQUE_PROJETO/],
    [{ ATAQUE_PROJETO: 'a/../../x', ATAQUE_PORTA_BASE: '55520' }, /ATAQUE_PROJETO/],
    [{ ATAQUE_PROJETO: 'metanutri-ataques', ATAQUE_PORTA_BASE: '55520' }, /diferente/],
    [{ ATAQUE_PROJETO: 'ataques-b', ATAQUE_PORTA_BASE: '55420' }, /diferente/],
    [{ ATAQUE_PROJETO: 'ataques-b', ATAQUE_PORTA_BASE: '55419' }, /diferente/],
    [{ ATAQUE_PROJETO: 'ataques-b', ATAQUE_PORTA_BASE: '80' }, /ATAQUE_PORTA_BASE/],
    [{ ATAQUE_PROJETO: 'ataques-b', ATAQUE_PORTA_BASE: '65534' }, /ATAQUE_PORTA_BASE/],
    [{ ATAQUE_PROJETO: 'ataques-b', ATAQUE_PORTA_BASE: '555x' }, /ATAQUE_PORTA_BASE/],
  ])('recusa %o com o que está errado', (env, motivo) => {
    expect(() => pilhaDoAmbiente(env)).toThrow(motivo)
  })
})
