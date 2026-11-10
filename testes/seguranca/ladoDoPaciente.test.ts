// Spec lado-do-paciente (supabase/017) num Supabase LOCAL: o link fixo e a migração (CA-2225), o limite por paciente
// (CA-2226), o último acesso (CA-2239), os avisos no link (CA-2256, CA-2257), o agendamento (CA-2270), o Painel do dono
// (CA-2281), a limpeza (CA-2285) e as portas fechadas das tabelas e das funções novas. Os ataques de uma conta à outra
// nas tabelas novas estão em tabelas.test.ts (pela lista TABELAS_DA_CONTA), e a exclusão (CA-2284), em exclusao.test.ts.
import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { hashDoEmail, mascararEmail } from '../../supabase/functions/_shared/avisos/email.ts'
import { sqlNoBancoLocal } from './bancoLocal.ts'
import { barrado, barradoOuVazio, prepararCenario, recusadoCom, type Cenario, type Conta } from './preparo.ts'

let c: Cenario

beforeAll(async () => {
  c = await prepararCenario()
})

const TABELAS_NOVAS = ['config_de_emails', 'emails_dos_links', 'aceites', 'chaves_de_aviso', 'envios', 'supressao', 'limites_de_envio', 'estado_dos_avisos', 'tokens_trocados'] as const
const MES_MS = 30 * 24 * 60 * 60 * 1000
const hojeEmBrasilia = (): string => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())

type Linha = Record<string, unknown>

/** O resumo do endereço do link, como o `hash_do_token` do 017 (D-1256). */
const resumoDoToken = (token: string): string => createHash('sha256').update(token, 'utf8').digest('hex')

function sem(contexto: string, erro: { readonly message: string } | null): void {
  if (erro) throw new Error(`${contexto}: ${erro.message}`)
}

/** Um link novo da conta, gravado pelo próprio login, como o app grava. */
async function novoLink(conta: Conta, pacienteId: string | null, criadoEm = new Date().toISOString()): Promise<{ readonly id: string; readonly token: string }> {
  const id = randomUUID()
  const token = `lp${randomUUID().replace(/-/g, '').slice(0, 12)}`
  const r = await conta.cliente.from('acompanhamentos').insert({ id, nutricionista_id: conta.id, token, caso_id: 'caso-lp', paciente_id: pacienteId, nome: 'Juliana', criado_em: criadoEm, missoes: [{ id: 'm1', texto: 'Água' }], marcacoes: [] })
  sem('criar o link', r.error)
  return { id, token }
}

/** O link como o paciente abre, sem login. */
async function abrir(token: string): Promise<Linha | null> {
  const r = await c.anonimo.rpc('missoes_por_token', { p_token: token })
  expect(r.error).toBeNull()
  return ((r.data ?? []) as Linha[])[0] ?? null
}

async function linhaDoLink(id: string): Promise<Linha> {
  const r = await c.servico.from('acompanhamentos').select('*').eq('id', id).single()
  sem('ler o link', r.error)
  return r.data as Linha
}

async function aceitar(conta: Conta, linkId: string, tipo: 'plano' | 'semana' | 'lembrete', email: string): Promise<void> {
  sem('gravar o aceite', (await c.servico.from('aceites').insert({ link_id: linkId, nutricionista_id: conta.id, tipo, email_hash: await hashDoEmail(email) })).error)
}

describe('as portas fechadas das tabelas e das funções novas', () => {
  it.each(TABELAS_NOVAS)('quem não tem conta não lê, não cria nem muda %s', async (tabela) => {
    recusadoCom(await c.anonimo.from(tabela).select('*'), ['42501'])
    recusadoCom(await c.anonimo.from(tabela).insert({}).select(), ['42501'])
  })

  it('a conta comum não lê a supressão, as chaves, os limites, o estado dos avisos nem os endereços trocados', async () => {
    for (const tabela of ['supressao', 'chaves_de_aviso', 'limites_de_envio', 'estado_dos_avisos', 'tokens_trocados']) recusadoCom(await c.atacante.cliente.from(tabela).select('*'), ['42501'])
  })

  it.each([
    ['anotar_limite', { p_chave: 'x', p_limite: 10, p_desde: '2000-01-01T00:00:00Z' }],
    ['conferir_chave_dos_avisos', { p_chave: 'x'.repeat(64) }],
    ['limpar_emails_antigos', {}],
    ['hash_do_email', { p_email: 'a@b.com' }],
    ['mascarar_email', { p_email: 'a@b.com' }],
    ['avisos_do_link', { p_link: randomUUID() }],
    ['dono_do_link', { p_link: randomUUID() }],
    ['hash_do_token', { p_token: 'abcdefghjkmn' }],
    ['pedir_avisos', { p_vez: 'manha' }],
    ['confirmar_email_do_paciente', { p_chave: 'x'.repeat(32), p_avisos: [], p_dia_da_semana: 0, p_ofertas_padrao: true, p_agora: '2026-01-01T00:00:00Z' }],
  ] as const)('%s é recusada para visitante, conta comum e administrador', async (funcao, args) => {
    for (const cliente of [c.anonimo, c.atacante.cliente, c.admin.cliente]) barrado(await cliente.rpc(funcao, args))
  })

  it('CA-2270: pedir os avisos nem o servidor chama; só o agendamento', async () => {
    barrado(await c.servico.rpc('pedir_avisos', { p_vez: 'manha' }))
  })

  it.each([
    ['definir_email_da_ficha', (): Linha => ({ p_link: c.vitima.linkId, p_email: 'atacante@exemplo.com' })],
    ['definir_ofertas', (): Linha => ({ p_link: c.vitima.linkId, p_plano: false, p_semana: false, p_lembrete: false })],
    ['emails_do_link', (): Linha => ({ p_link: c.vitima.linkId })],
    ['apagar_emails_do_link', (): Linha => ({ p_link: c.vitima.linkId })],
  ] as const)('%s com o link de outra conta é recusada, e nada da vítima muda', async (funcao, args) => {
    const antes = JSON.stringify((await c.servico.from('emails_dos_links').select('*').eq('link_id', c.vitima.linkId)).data)
    for (const cliente of [c.atacante.cliente, c.anonimo]) recusadoCom(await cliente.rpc(funcao, args()), ['42501'])
    expect(JSON.stringify((await c.servico.from('emails_dos_links').select('*').eq('link_id', c.vitima.linkId)).data)).toBe(antes)
    expect((await c.servico.from('aceites').select('id').eq('link_id', c.vitima.linkId)).data).toHaveLength(1)
  })

  it('CA-2269: avisos_aceitos_da_conta só fala da própria conta', async () => {
    const daVitima = await c.vitima.cliente.rpc('avisos_aceitos_da_conta')
    expect(daVitima.error).toBeNull()
    expect(daVitima.data).toEqual([{ link_id: c.vitima.linkId }])
    const doAtacante = await c.atacante.cliente.rpc('avisos_aceitos_da_conta')
    expect(JSON.stringify(doAtacante.data)).not.toContain(c.vitima.linkId)
    barrado(await c.anonimo.rpc('avisos_aceitos_da_conta'))
  })
})

describe('a porta do paciente (missoes_por_token)', () => {
  it('CA-1974, D-1210 e CA-2235: traz o nome da nutricionista e o e-mail mascarado, nunca o dono nem o e-mail inteiro', async () => {
    const linha = await abrir(c.vitima.token)
    expect(linha).toMatchObject({ token: c.vitima.token, nutricionista: `Ana ${c.marcador}`, email_mascarado: mascararEmail(c.vitima.emailDoPaciente) })
    expect(Object.keys(linha ?? {})).not.toContain('nutricionista_id')
    const texto = JSON.stringify(linha)
    expect(texto).not.toContain(c.vitima.id)
    expect(texto).not.toContain(c.vitima.emailDoPaciente)
    expect(texto).not.toContain(await hashDoEmail(c.vitima.emailDoPaciente))
  })

  it('CA-2242 e CA-2256: cada aviso ligado, desligado ou não oferecido', async () => {
    expect((await abrir(c.vitima.token))?.['avisos']).toEqual({ plano: 'desligado', semana: 'ligado', lembrete: 'desligado' })
  })

  it('DP-LP-8: sem nome publicado, vale o nome da conta', async () => {
    const linha = await abrir(c.atacante.token)
    expect(linha?.['nutricionista']).toBe('Atacante')
    expect(linha?.['email_mascarado']).toBeNull()
    expect(linha?.['avisos']).toEqual({ plano: 'desligado', semana: 'desligado', lembrete: 'desligado' })
  })

  it('DP-LP-16: o resumo do endereço do banco é o mesmo do app (CB-1211)', async () => {
    const r = await c.servico.rpc('hash_do_email', { p_email: ' Juliana.Martins @Gmail.com ' })
    expect(r.error).toBeNull()
    expect(r.data).toBe(await hashDoEmail('juliana.martins@gmail.com'))
  })
})

describe('o último acesso (CA-2239)', () => {
  it('CA-2239: aberto 3 vezes no dia, a nuvem guarda um último acesso, só com a data de Brasília', async () => {
    for (let i = 0; i < 3; i++) expect((await c.anonimo.rpc('registrar_acesso', { p_token: c.atacante.token })).error).toBeNull()
    expect((await linhaDoLink(c.atacante.linkId))['ultimo_acesso']).toBe(hojeEmBrasilia())
    expect((await abrir(c.atacante.token))?.['ultimo_acesso']).toBe(hojeEmBrasilia())
  })

  it('CA-2239: a nutricionista não escreve o último acesso nem o A1 agendado pelo próprio login', async () => {
    const r = await c.atacante.cliente.from('acompanhamentos').update({ ultimo_acesso: '2020-01-01', a1_para: '2020-01-01T00:00:00Z' }).eq('id', c.atacante.linkId).select('id')
    expect(r.error).toBeNull()
    const linha = await linhaDoLink(c.atacante.linkId)
    expect(linha['ultimo_acesso']).toBe(hojeEmBrasilia())
    expect(linha['a1_para']).toBeNull()
  })

  it('token que não existe não registra nada', async () => {
    expect((await c.anonimo.rpc('registrar_acesso', { p_token: 'naoexiste12345' })).error).toBeNull()
  })

  it('D-1230: a data do plano muda com as missões, não com o nome', async () => {
    const antes = String((await linhaDoLink(c.atacante.linkId))['plano_em'])
    sem('mudar o nome', (await c.atacante.cliente.from('acompanhamentos').update({ nome: 'Juliana M.' }).eq('id', c.atacante.linkId)).error)
    expect(String((await linhaDoLink(c.atacante.linkId))['plano_em'])).toBe(antes)
    sem('mudar as missões', (await c.atacante.cliente.from('acompanhamentos').update({ missoes: [{ id: 'm2', texto: 'Fruta' }] }).eq('id', c.atacante.linkId)).error)
    expect(Date.parse(String((await linhaDoLink(c.atacante.linkId))['plano_em']))).toBeGreaterThan(Date.parse(antes))
  })
})

describe('o e-mail do link e os avisos (CA-2256, CA-2257, CA-2263)', () => {
  const email = 'juliana.lp@gmail.com'

  it('CB-1211: o e-mail da ficha é guardado sem espaço e em minúsculas; e-mail sem formato é recusado', async () => {
    expect((await c.atacante.cliente.rpc('definir_email_da_ficha', { p_link: c.atacante.linkId, p_email: ' Juliana.LP@Gmail.com ' })).error).toBeNull()
    const lido = await c.atacante.cliente.rpc('emails_do_link', { p_link: c.atacante.linkId })
    expect(lido.error).toBeNull()
    expect(lido.data).toMatchObject({ email, origem: 'ficha', ofertas: { plano: true, semana: true, lembrete: true }, aceites: [], envios: [] })
    recusadoCom(await c.atacante.cliente.rpc('definir_email_da_ficha', { p_link: c.atacante.linkId, p_email: 'sem-arroba' }), ['22023'])
  })

  it('CA-2256: o paciente desliga um aviso no link, na hora', async () => {
    await aceitar(c.atacante, c.atacante.linkId, 'lembrete', email)
    expect((await abrir(c.atacante.token))?.['avisos']).toMatchObject({ lembrete: 'ligado' })
    expect((await c.anonimo.rpc('desligar_aviso', { p_token: c.atacante.token, p_tipo: 'lembrete' })).error).toBeNull()
    expect((await abrir(c.atacante.token))?.['avisos']).toMatchObject({ lembrete: 'desligado' })
    const aceites = await c.servico.from('aceites').select('saiu_em').eq('link_id', c.atacante.linkId).eq('tipo', 'lembrete')
    expect(aceites.data?.every((a) => a.saiu_em !== null)).toBe(true)
    recusadoCom(await c.anonimo.rpc('desligar_aviso', { p_token: c.atacante.token, p_tipo: 'tudo' }), ['22023'])
  })

  it('CA-2263: a nutricionista desliga a oferta, e o aviso some do link (não oferecido)', async () => {
    await aceitar(c.atacante, c.atacante.linkId, 'plano', email)
    expect((await abrir(c.atacante.token))?.['avisos']).toMatchObject({ plano: 'ligado' })
    expect((await c.atacante.cliente.rpc('definir_ofertas', { p_link: c.atacante.linkId, p_plano: false, p_semana: true, p_lembrete: true })).error).toBeNull()
    expect((await abrir(c.atacante.token))?.['avisos']).toMatchObject({ plano: 'nao-oferecido' })
    // CB-1223: o aceite fica guardado e vale de novo quando ela religa.
    expect((await c.atacante.cliente.rpc('definir_ofertas', { p_link: c.atacante.linkId, p_plano: true, p_semana: true, p_lembrete: true })).error).toBeNull()
    expect((await abrir(c.atacante.token))?.['avisos']).toMatchObject({ plano: 'ligado' })
  })

  it('CA-2257: o e-mail da ficha trocado deixa os avisos desligados até o novo endereço confirmar', async () => {
    await aceitar(c.atacante, c.atacante.linkId, 'semana', email)
    expect((await abrir(c.atacante.token))?.['avisos']).toMatchObject({ semana: 'ligado' })
    expect((await c.atacante.cliente.rpc('definir_email_da_ficha', { p_link: c.atacante.linkId, p_email: 'outra.lp@gmail.com' })).error).toBeNull()
    expect((await abrir(c.atacante.token))?.['avisos']).toEqual({ plano: 'desligado', semana: 'desligado', lembrete: 'desligado' })
    const lido = await c.atacante.cliente.rpc('emails_do_link', { p_link: c.atacante.linkId })
    expect(lido.data).toMatchObject({ email: 'outra.lp@gmail.com', origem: 'ficha', aceites: [] })
  })

  it('DP-LP-7: a ficha que não mudou não desfaz o endereço que o paciente deu no link', async () => {
    const doPaciente = 'paciente.lp@gmail.com'
    sem(
      'gravar o e-mail do paciente',
      (await c.servico.from('emails_dos_links').update({ email: doPaciente, email_hash: await hashDoEmail(doPaciente), origem: 'paciente' }).eq('link_id', c.atacante.linkId)).error,
    )
    expect((await c.atacante.cliente.rpc('definir_email_da_ficha', { p_link: c.atacante.linkId, p_email: 'outra.lp@gmail.com' })).error).toBeNull()
    expect((await c.atacante.cliente.rpc('emails_do_link', { p_link: c.atacante.linkId })).data).toMatchObject({ email: doPaciente, origem: 'paciente' })
  })

  it('CA-2265: o endereço na supressão não tem aviso ligado, e a ficha vê o motivo', async () => {
    const doPaciente = 'paciente.lp@gmail.com'
    await aceitar(c.atacante, c.atacante.linkId, 'semana', doPaciente)
    expect((await abrir(c.atacante.token))?.['avisos']).toMatchObject({ semana: 'ligado' })
    sem('suprimir', (await c.servico.from('supressao').insert({ email_hash: await hashDoEmail(doPaciente), motivo: 'devolvido' })).error)
    expect((await abrir(c.atacante.token))?.['avisos']).toMatchObject({ semana: 'desligado' })
    expect((await c.atacante.cliente.rpc('emails_do_link', { p_link: c.atacante.linkId })).data).toMatchObject({ supressao: 'devolvido' })
  })
})

describe('o link fixo por paciente (CA-2225, CA-2226)', () => {
  let antigo: { readonly id: string; readonly token: string }
  let fixo: { readonly id: string; readonly token: string }

  beforeAll(async () => {
    // O atacante (Free, 2 links) já tem o link do cenário, do paciente-1. Um link antigo e um novo de outro paciente,
    // criados antes da versão nova: o mais recente de cada paciente vira o fixo.
    sem('liberar o limite', (await c.servico.from('acompanhamentos').delete().eq('id', c.atacante.linkId)).error)
    antigo = await novoLink(c.atacante, 'paciente-lp', new Date(Date.now() - 2 * MES_MS).toISOString())
    fixo = await novoLink(c.atacante, 'paciente-lp')
  })

  it('CA-2225: rodar o 017 marca o link antigo com o fixo, e o token antigo abre o fixo', async () => {
    const rodou = sqlNoBancoLocal(readFileSync(new URL('../../supabase/017-lado-do-paciente.sql', import.meta.url), 'utf8'))
    expect(rodou.erro).not.toMatch(/ERROR/)
    expect(rodou.ok).toBe(true)
    expect((await linhaDoLink(antigo.id))['substituido_por']).toBe(fixo.id)
    expect((await linhaDoLink(fixo.id))['substituido_por']).toBeNull()
    const aberto = await abrir(antigo.token)
    expect(aberto).toMatchObject({ id: fixo.id, token: fixo.token })
    // O acesso pelo token antigo conta no fixo.
    expect((await c.anonimo.rpc('registrar_acesso', { p_token: antigo.token })).error).toBeNull()
    expect((await linhaDoLink(fixo.id))['ultimo_acesso']).toBe(hojeEmBrasilia())
  })

  it('CA-2225: rodar de novo não muda nada', async () => {
    expect(sqlNoBancoLocal(readFileSync(new URL('../../supabase/017-lado-do-paciente.sql', import.meta.url), 'utf8')).ok).toBe(true)
    expect((await linhaDoLink(antigo.id))['substituido_por']).toBe(fixo.id)
    expect((await linhaDoLink(fixo.id))['substituido_por']).toBeNull()
  })

  it('CA-2226: o limite conta pacientes com link: o substituído não conta, e o terceiro paciente passa do limite', async () => {
    await novoLink(c.atacante, 'paciente-lp-2')
    const r = await c.atacante.cliente.from('acompanhamentos').insert({
      id: randomUUID(),
      nutricionista_id: c.atacante.id,
      token: `lp${randomUUID().replace(/-/g, '').slice(0, 12)}`,
      caso_id: 'caso-lp',
      paciente_id: 'paciente-lp-3',
      nome: 'Terceiro',
    })
    recusadoCom(r, ['P0001'])
    expect(r.error?.message).toBe('Você chegou ao limite de links do seu plano.')
  })

  it('DP-LP-5: o link de uma conta não aponta para o link de outra', async () => {
    recusadoCom(await c.atacante.cliente.from('acompanhamentos').update({ substituido_por: c.vitima.linkId }).eq('id', antigo.id).select('id'), ['42501'])
    expect((await linhaDoLink(antigo.id))['substituido_por']).toBe(fixo.id)
  })

  it('DP-LP-5: removido o fixo, os antigos dele saem junto', async () => {
    sem('remover o fixo', (await c.atacante.cliente.from('acompanhamentos').delete().eq('id', fixo.id)).error)
    expect((await c.servico.from('acompanhamentos').select('id').in('id', [antigo.id, fixo.id])).data).toEqual([])
    expect(await abrir(antigo.token)).toBeNull()
  })
})

describe('o agendamento e a chave dos avisos (CA-2270, CB-1215)', () => {
  it('CA-2270 e CB-1215: os quatro horários da função avisos e a limpeza, em UTC', () => {
    const r = sqlNoBancoLocal(
      "select jobname || ' | ' || schedule || ' | ' || command || ' | ' || active from cron.job where jobname like 'metanutri-avisos%' or jobname = 'metanutri-limpar-emails' order by jobname;",
    )
    expect(r.ok).toBe(true)
    expect(r.saida.split('\n')).toEqual([
      "metanutri-avisos-a1 | */15 11-23 * * * | select public.pedir_avisos('a1'); | true",
      "metanutri-avisos-manha | 0 11 * * * | select public.pedir_avisos('manha'); | true",
      "metanutri-avisos-n1 | 0 10 * * 1 | select public.pedir_avisos('n1'); | true",
      "metanutri-avisos-tarde | 0 21 * * * | select public.pedir_avisos('tarde'); | true",
      'metanutri-limpar-emails | 30 6 * * * | select public.limpar_emails_antigos(); | true',
    ])
  })

  it('CA-2270: a chave dos avisos nasce no cofre e só ela confere', async () => {
    const chave = sqlNoBancoLocal("select decrypted_secret from vault.decrypted_secrets where name = 'metanutri_chave_dos_avisos';").saida
    expect(chave).toMatch(/^[0-9a-f]{64}$/)
    expect((await c.servico.rpc('conferir_chave_dos_avisos', { p_chave: chave })).data).toBe(true)
    expect((await c.servico.rpc('conferir_chave_dos_avisos', { p_chave: 'f'.repeat(64) })).data).toBe(false)
    expect((await c.servico.rpc('conferir_chave_dos_avisos', { p_chave: '' })).data).toBe(false)
  })

  it('CA-2270: sem o endereço do projeto no cofre, o pedido não sai e não dá erro', () => {
    const r = sqlNoBancoLocal("delete from vault.secrets where name = 'metanutri_url_do_projeto'; select public.pedir_avisos('manha') is null, public.pedir_avisos('outra') is null;")
    expect(r.ok).toBe(true)
    expect(r.saida).toBe('t|t')
  })
})

describe('o Painel do dono e o servidor (CA-2281, CA-2285)', () => {
  it('CA-2281: o painel "E-mails" é só do administrador com o código do app', async () => {
    const r = await c.admin.cliente.rpc('painel_emails')
    expect(r.error).toBeNull()
    expect(Object.keys((r.data ?? {}) as Linha).sort()).toEqual(['adiados_7d', 'devolucao_7d', 'envios_7d', 'hoje', 'mes', 'motivo', 'pausado_em', 'queixa_7d', 'teto_dia', 'teto_mes'])
    // O cenário tem um envio entregue agora (o S2 da vítima).
    expect((r.data as Linha)['hoje']).toBeGreaterThanOrEqual(1)
    for (const cliente of [c.atacante.cliente, c.anonimo, c.adminSemCodigo]) {
      barrado(await cliente.rpc('painel_emails'))
      barrado(await cliente.rpc('retomar_avisos'))
    }
  })

  it('CA-2278: "Retomar" tira a pausa', async () => {
    sem('pausar', (await c.servico.from('estado_dos_avisos').update({ pausado_em: new Date().toISOString(), motivo: 'devolução 2,4%' }).eq('id', 1)).error)
    expect(((await c.admin.cliente.rpc('painel_emails')).data as Linha)['motivo']).toBe('devolução 2,4%')
    expect((await c.admin.cliente.rpc('retomar_avisos')).error).toBeNull()
    expect((await c.admin.cliente.rpc('painel_emails')).data).toMatchObject({ pausado_em: null, motivo: null })
  })

  it('D-1220: o limite conta e anota num passo só, por chave', async () => {
    const chave = `rec-email:${randomUUID()}`
    const pedir = () => c.servico.rpc('anotar_limite', { p_chave: chave, p_limite: 2, p_desde: new Date(Date.now() - 60 * 60 * 1000).toISOString() })
    expect([(await pedir()).data, (await pedir()).data, (await pedir()).data]).toEqual([true, true, false])
  })

  it('CA-2285: a limpeza diária apaga envios com mais de 6 meses e aceites sem link; a supressão fica', async () => {
    const hash = await hashDoEmail('limpeza.lp@gmail.com')
    const velho = new Date(Date.now() - 7 * MES_MS).toISOString()
    // Um pedido por linha: no lote, a linha sem `criado_em` iria com a coluna nula.
    sem('gravar o envio velho', (await c.servico.from('envios').insert({ nutricionista_id: c.atacante.id, tipo: 'A2', email_hash: hash, assunto: 'velho', estado: 'entregue', criado_em: velho })).error)
    sem('gravar o envio novo', (await c.servico.from('envios').insert({ nutricionista_id: c.atacante.id, tipo: 'A2', email_hash: hash, assunto: 'novo', estado: 'entregue' })).error)
    sem('gravar o aceite sem link', (await c.servico.from('aceites').insert({ nutricionista_id: c.atacante.id, tipo: 'semana', email_hash: hash, saiu_em: velho })).error)
    sem('suprimir', (await c.servico.from('supressao').insert({ email_hash: hash, motivo: 'queixa' })).error)
    expect((await c.servico.rpc('limpar_emails_antigos', {})).error).toBeNull()
    expect((await c.servico.from('envios').select('assunto').eq('email_hash', hash)).data).toEqual([{ assunto: 'novo' }])
    expect((await c.servico.from('aceites').select('id').eq('email_hash', hash)).data).toEqual([])
    expect((await c.servico.from('supressao').select('motivo').eq('email_hash', hash)).data).toEqual([{ motivo: 'queixa' }])
  })

  it('DP-LP-27: o link removido deixa o aceite sem link e encerrado', async () => {
    const link = await novoLink(c.vitima, 'paciente-lp-removido')
    await aceitar(c.vitima, link.id, 'semana', 'removido.lp@gmail.com')
    sem('remover o link', (await c.vitima.cliente.from('acompanhamentos').delete().eq('id', link.id)).error)
    const aceite = await c.servico.from('aceites').select('link_id, saiu_em').eq('email_hash', await hashDoEmail('removido.lp@gmail.com')).single()
    expect(aceite.data?.link_id).toBeNull()
    expect(aceite.data?.saiu_em).not.toBeNull()
  })

  it('DP-LP-26: apagar os e-mails do link leva aceites, envios, chaves e o e-mail; só do dono', async () => {
    const link = await novoLink(c.vitima, 'paciente-lp-apagar')
    sem('e-mail', (await c.vitima.cliente.rpc('definir_email_da_ficha', { p_link: link.id, p_email: 'apagar.lp@gmail.com' })).error)
    await aceitar(c.vitima, link.id, 'plano', 'apagar.lp@gmail.com')
    const hash = await hashDoEmail('apagar.lp@gmail.com')
    sem('envio', (await c.servico.from('envios').insert({ link_id: link.id, nutricionista_id: c.vitima.id, tipo: 'S2', email_hash: hash, assunto: 'x', estado: 'entregue' })).error)
    expect((await c.vitima.cliente.rpc('apagar_emails_do_link', { p_link: link.id })).error).toBeNull()
    for (const tabela of ['aceites', 'envios', 'chaves_de_aviso', 'emails_dos_links']) {
      barradoOuVazio(await c.servico.from(tabela).select('*').eq('link_id', link.id))
    }
  })
})

describe('"Trocar o endereço" corta quem tinha o link (revisão r1: CA-2289, CA-2290, CA-2293, CB-1231)', () => {
  const daFicha = 'ficha.troca.lp@gmail.com'
  const doPaciente = 'paciente.troca.lp@gmail.com'
  let antigo: { readonly id: string; readonly token: string }
  let fixo: { readonly id: string; readonly token: string }
  let novo = ''

  const tokenNovo = (): string => `lp${randomUUID().replace(/-/g, '').slice(0, 12)}`
  const trocado = async (token: string): Promise<unknown> => {
    const r = await c.anonimo.rpc('link_trocado', { p_token: token })
    expect(r.error).toBeNull()
    return r.data
  }

  beforeAll(async () => {
    // O link do plano anterior (antes do link fixo) e o fixo, de um paciente da vítima (Solo). A migração do app
    // (`migrarParaLinkFixo`) aponta o antigo para o fixo, como o 017.
    antigo = await novoLink(c.vitima, 'paciente-troca', new Date(Date.now() - 2 * MES_MS).toISOString())
    fixo = await novoLink(c.vitima, 'paciente-troca')
    sem('migrar', (await c.vitima.cliente.from('acompanhamentos').update({ substituido_por: fixo.id }).eq('id', antigo.id)).error)
    sem('e-mail da ficha', (await c.vitima.cliente.rpc('definir_email_da_ficha', { p_link: fixo.id, p_email: daFicha })).error)
    // O paciente deu (e confirmou) o próprio e-mail no link; um aceite em cada endereço e uma confirmação aberta.
    sem(
      'e-mail do paciente',
      (await c.servico.from('emails_dos_links').update({ email: doPaciente, email_hash: await hashDoEmail(doPaciente), origem: 'paciente', confirmado_em: new Date().toISOString() }).eq('link_id', fixo.id)).error,
    )
    await aceitar(c.vitima, fixo.id, 'semana', doPaciente)
    await aceitar(c.vitima, fixo.id, 'plano', daFicha)
    sem(
      'confirmação aberta',
      (
        await c.servico.from('chaves_de_aviso').insert({
          chave: randomUUID().replace(/-/g, ''),
          link_id: fixo.id,
          nutricionista_id: c.vitima.id,
          tipo: 'aceite',
          avisos: ['lembrete'],
          email_hash: await hashDoEmail(doPaciente),
          token_hash: resumoDoToken(fixo.token),
          vence_em: new Date(Date.now() + MES_MS).toISOString(),
        })
      ).error,
    )
  })

  it('antes da troca, o endereço do plano anterior abre o fixo, e nenhum dos dois foi trocado', async () => {
    expect(await abrir(antigo.token)).toMatchObject({ id: fixo.id, token: fixo.token })
    expect(await trocado(antigo.token)).toBe(false)
    expect(await trocado(fixo.token)).toBe(false)
  })

  it('CA-2289: trocado, o endereço de antes e o do plano anterior não abrem e não levam ao endereço novo', async () => {
    novo = tokenNovo()
    sem('trocar o endereço', (await c.vitima.cliente.from('acompanhamentos').update({ token: novo }).eq('id', fixo.id)).error)
    expect(await abrir(fixo.token)).toBeNull()
    expect(await abrir(antigo.token)).toBeNull()
    expect(await abrir(novo)).toMatchObject({ id: fixo.id, token: novo })
    // A tela sabe que foi trocado (só sim ou não), e o que nunca existiu não foi trocado.
    expect(await trocado(fixo.token)).toBe(true)
    expect(await trocado(antigo.token)).toBe(true)
    expect(await trocado(novo)).toBe(false)
    expect(await trocado(tokenNovo())).toBe(false)
    expect((await linhaDoLink(antigo.id))['cortado_em']).not.toBeNull()
    expect((await linhaDoLink(fixo.id))['cortado_em']).toBeNull()
    // Só o resumo do endereço de antes fica guardado, e ninguém o lê pela API.
    const guardados = await c.servico.from('tokens_trocados').select('token_hash, link_id').eq('link_id', fixo.id)
    expect(JSON.stringify(guardados.data)).not.toContain(fixo.token)
    expect(guardados.data).toHaveLength(1)
  })

  it('CA-2289: o endereço cortado não marca, não registra acesso nem desliga aviso', async () => {
    sem('zerar o acesso', (await c.servico.from('acompanhamentos').update({ ultimo_acesso: null }).eq('id', fixo.id)).error)
    for (const token of [antigo.token, fixo.token]) {
      expect((await c.anonimo.rpc('marcar_missoes', { p_token: token, p_marcacoes: [{ dia: '2026-11-04', feitas: ['m1'] }] })).error).toBeNull()
      expect((await c.anonimo.rpc('registrar_acesso', { p_token: token })).error).toBeNull()
      expect((await c.anonimo.rpc('desligar_aviso', { p_token: token, p_tipo: 'plano' })).error).toBeNull()
    }
    expect((await linhaDoLink(antigo.id))['marcacoes']).toEqual([])
    expect((await linhaDoLink(fixo.id))['marcacoes']).toEqual([])
    expect((await linhaDoLink(fixo.id))['ultimo_acesso']).toBeNull()
    const plano = await c.servico.from('aceites').select('saiu_em').eq('link_id', fixo.id).eq('tipo', 'plano')
    expect(plano.data).toEqual([{ saiu_em: null }])
    // O endereço novo marca como sempre.
    expect((await c.anonimo.rpc('marcar_missoes', { p_token: novo, p_marcacoes: [{ dia: '2026-11-04', feitas: ['m1'] }] })).error).toBeNull()
    expect((await linhaDoLink(fixo.id))['marcacoes']).toEqual([{ dia: '2026-11-04', feitas: ['m1'] }])
  })

  it('CA-2293: a troca devolve o link ao e-mail da ficha, encerra o aceite do outro endereço e derruba a confirmação aberta', async () => {
    const lido = await c.vitima.cliente.rpc('emails_do_link', { p_link: fixo.id })
    expect(lido.error).toBeNull()
    expect(lido.data).toMatchObject({ email: daFicha, email_ficha: daFicha, origem: 'ficha', confirmado_em: null, pendentes: [] })
    const aceites = await c.servico.from('aceites').select('tipo, email_hash, saiu_em').eq('link_id', fixo.id).order('tipo')
    expect(aceites.data).toEqual([
      { tipo: 'plano', email_hash: await hashDoEmail(daFicha), saiu_em: null },
      { tipo: 'semana', email_hash: await hashDoEmail(doPaciente), saiu_em: expect.any(String) },
    ])
    expect((await c.servico.from('chaves_de_aviso').select('chave').eq('link_id', fixo.id).eq('tipo', 'aceite').is('usado_em', null)).data).toEqual([])
    expect((await abrir(novo))?.['email_mascarado']).toBe(mascararEmail(daFicha))
  })

  it('CA-2290: a aba antiga que grava o link com o endereço de antes não o faz voltar a abrir', async () => {
    const r = await c.vitima.cliente.from('acompanhamentos').update({ token: fixo.token, mensagem: 'Bom dia, Juliana.' }).eq('id', fixo.id).select('token, mensagem')
    expect(r.error).toBeNull()
    expect(r.data).toEqual([{ token: novo, mensagem: 'Bom dia, Juliana.' }])
    expect(await abrir(fixo.token)).toBeNull()
    expect(await abrir(novo)).toMatchObject({ id: fixo.id, mensagem: 'Bom dia, Juliana.' })
  })

  it('CA-2290: nenhum link novo nasce com um endereço trocado', async () => {
    const r = await c.vitima.cliente.from('acompanhamentos').insert({ id: randomUUID(), nutricionista_id: c.vitima.id, token: fixo.token, caso_id: 'caso-lp', paciente_id: 'paciente-outro', nome: 'Outro' })
    recusadoCom(r, ['23505'])
  })

  it('o app não escreve o corte nem o tira', async () => {
    sem('tentar tirar o corte', (await c.vitima.cliente.from('acompanhamentos').update({ cortado_em: null, substituido_por: null }).eq('id', antigo.id)).error)
    expect((await linhaDoLink(antigo.id))['cortado_em']).not.toBeNull()
    expect(await abrir(antigo.token)).toBeNull()
    const outro = randomUUID()
    sem(
      'criar com o corte',
      (await c.vitima.cliente.from('acompanhamentos').insert({ id: outro, nutricionista_id: c.vitima.id, token: tokenNovo(), caso_id: 'caso-lp', paciente_id: 'paciente-corte', nome: 'Corte', cortado_em: new Date().toISOString() }))
        .error,
    )
    expect((await linhaDoLink(outro))['cortado_em']).toBeNull()
  })

  it('CB-1231: trocado duas vezes, os dois endereços de antes dizem "trocado"; removido o link, os resumos saem junto', async () => {
    const terceiro = tokenNovo()
    sem('trocar de novo', (await c.vitima.cliente.from('acompanhamentos').update({ token: terceiro }).eq('id', fixo.id)).error)
    expect(await trocado(fixo.token)).toBe(true)
    expect(await trocado(novo)).toBe(true)
    expect(await abrir(novo)).toBeNull()
    expect(await abrir(terceiro)).toMatchObject({ id: fixo.id })
    sem('remover o link', (await c.vitima.cliente.from('acompanhamentos').delete().eq('id', fixo.id)).error)
    expect((await c.servico.from('tokens_trocados').select('token_hash').eq('link_id', fixo.id)).data).toEqual([])
  })

  it('o corte é da conta: a troca de uma conta não corta o link de outra com o mesmo paciente', async () => {
    const daVitima = await novoLink(c.vitima, 'paciente-comum')
    const doServico = randomUUID()
    sem(
      'o link da outra conta',
      (await c.servico.from('acompanhamentos').insert({ id: doServico, nutricionista_id: c.atacante.id, token: tokenNovo(), caso_id: 'caso-lp', paciente_id: 'paciente-comum', nome: 'Comum' })).error,
    )
    sem('trocar', (await c.servico.from('acompanhamentos').update({ token: tokenNovo() }).eq('id', doServico)).error)
    expect((await linhaDoLink(daVitima.id))['cortado_em']).toBeNull()
    expect(await abrir(daVitima.token)).toMatchObject({ id: daVitima.id })
  })
})

describe('a confirmação presa ao endereço do link (revisão r2: CA-2300, CB-1232)', () => {
  const email = 'quem.pegou.r2.lp@gmail.com'
  const tokenNovo = (): string => `lp${randomUUID().replace(/-/g, '').slice(0, 12)}`
  const novaChave = (): string => randomUUID().replace(/-/g, '')
  const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms))
  const confirmacao = async (link: { readonly id: string }, token: string | null, chave = novaChave()) => ({
    chave,
    link_id: link.id,
    nutricionista_id: c.vitima.id,
    tipo: 'aceite',
    avisos: [],
    email,
    email_hash: await hashDoEmail(email),
    ...(token === null ? {} : { token_hash: resumoDoToken(token) }),
    vence_em: new Date(Date.now() + MES_MS).toISOString(),
  })
  const confirmacoesDo = async (link: { readonly id: string }) => (await c.servico.from('chaves_de_aviso').select('chave').eq('link_id', link.id).eq('tipo', 'aceite')).data

  /** Uma transação do psql no banco local que corre junto com o teste (a outra ponta da corrida). */
  function sqlAoMesmoTempo(sql: string): Promise<{ readonly ok: boolean; readonly erro: string }> {
    const conteiner = process.env['ATAQUE_CONTEINER_DO_BANCO'] ?? ''
    if (!/^supabase_db_[a-z0-9-]+$/.test(conteiner)) throw new Error(`RECUSADO: contêiner do banco local errado ("${conteiner}").`)
    sqlNoBancoLocal('select 1;')
    return new Promise((resolver) => {
      const p = spawn('docker', ['exec', '-i', '-e', 'PGPASSWORD=postgres', conteiner, 'psql', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', '-t', '-A', '-f', '-'])
      let erro = ''
      p.stderr.on('data', (d: Buffer) => (erro += d.toString()))
      p.on('close', (codigo) => resolver({ ok: codigo === 0, erro }))
      p.stdin.end(sql)
    })
  }

  it('CA-2300: a confirmação sem o resumo do endereço, ou com o de um endereço de antes da troca, não nasce', async () => {
    const link = await novoLink(c.vitima, 'paciente-r2-a')
    const novo = tokenNovo()
    sem('trocar o endereço', (await c.vitima.cliente.from('acompanhamentos').update({ token: novo }).eq('id', link.id)).error)
    const deAntes = await c.servico.from('chaves_de_aviso').insert(await confirmacao(link, link.token))
    recusadoCom(deAntes, ['P0001'])
    expect(deAntes.error?.message).toBe('O endereço do link mudou.')
    recusadoCom(await c.servico.from('chaves_de_aviso').insert(await confirmacao(link, null)), ['23514', 'P0001'])
    expect(await confirmacoesDo(link)).toEqual([])
    // Com o endereço de agora, nasce; e a de descadastro não precisa do resumo.
    expect((await c.servico.from('chaves_de_aviso').insert(await confirmacao(link, novo))).error).toBeNull()
    expect((await c.servico.from('chaves_de_aviso').insert({ chave: novaChave(), link_id: link.id, nutricionista_id: c.vitima.id, tipo: 'sair', avisos: ['semana'], email_hash: await hashDoEmail(email) })).error).toBeNull()
  })

  it('CA-2300 e CB-1232: a troca no meio (outra transação segura o link): a confirmação espera e é recusada', async () => {
    const link = await novoLink(c.vitima, 'paciente-r2-b')
    const troca = sqlAoMesmoTempo(['begin;', `update public.acompanhamentos set token = '${tokenNovo()}' where id = '${link.id}';`, 'select pg_sleep(2);', 'commit;'].join('\n'))
    await esperar(700)
    const inicio = Date.now()
    const pedido = await c.servico.from('chaves_de_aviso').insert(await confirmacao(link, link.token))
    expect(Date.now() - inicio).toBeGreaterThan(500)
    recusadoCom(pedido, ['P0001'])
    expect((await troca).ok).toBe(true)
    expect(await confirmacoesDo(link)).toEqual([])
  })

  it('CB-1232: a confirmação gravando no meio (outra transação): a troca espera e a apaga', async () => {
    const link = await novoLink(c.vitima, 'paciente-r2-c')
    const k = await confirmacao(link, link.token)
    const pedido = sqlAoMesmoTempo(
      [
        'begin;',
        'insert into public.chaves_de_aviso (chave, link_id, nutricionista_id, tipo, avisos, email, email_hash, token_hash, vence_em)',
        `  values ('${k.chave}', '${link.id}', '${c.vitima.id}', 'aceite', '{}', '${email}', '${k.email_hash}', '${resumoDoToken(link.token)}', now() + interval '7 days');`,
        'select pg_sleep(2);',
        'commit;',
      ].join('\n'),
    )
    await esperar(700)
    sem('trocar o endereço', (await c.vitima.cliente.from('acompanhamentos').update({ token: tokenNovo() }).eq('id', link.id)).error)
    expect((await pedido).ok).toBe(true)
    expect(await confirmacoesDo(link)).toEqual([])
  })

  describe('o "Confirmar" num passo só do banco (revisão r3: D-1261, CA-2308)', () => {
    const ficha = 'juliana.r3.lp@gmail.com'

    /** Um link com o e-mail da ficha e uma confirmação aberta do e-mail de quem pegou o link, com o endereço de agora. */
    async function comConfirmacaoAberta(paciente: string) {
      const link = await novoLink(c.vitima, paciente)
      const fichaHash = await hashDoEmail(ficha)
      sem(
        'o e-mail da ficha',
        (await c.servico.from('emails_dos_links').upsert({ link_id: link.id, nutricionista_id: c.vitima.id, email: ficha, email_hash: fichaHash, origem: 'ficha', email_ficha: ficha })).error,
      )
      const k = await confirmacao(link, link.token)
      sem('a confirmação', (await c.servico.from('chaves_de_aviso').insert(k)).error)
      return { link, chave: k.chave, emailHash: k.email_hash, fichaHash }
    }
    const confirmar = (chave: string, avisos: readonly string[] = ['semana']) =>
      c.servico.rpc('confirmar_email_do_paciente', { p_chave: chave, p_avisos: [...avisos], p_dia_da_semana: 2, p_ofertas_padrao: true, p_agora: new Date().toISOString() })
    const emailDo = async (link: { readonly id: string }) => (await c.servico.from('emails_dos_links').select('email, origem, confirmado_em').eq('link_id', link.id).single()).data as Linha
    const aceitesAtivos = async (link: { readonly id: string }, emailHash: string) =>
      (await c.servico.from('aceites').select('tipo').eq('link_id', link.id).eq('email_hash', emailHash).is('saiu_em', null)).data

    it('CA-2308: sem corrida, grava o e-mail, os aceites e a chave usada; de novo, responde "usada" e não aceita de novo', async () => {
      const { link, chave, emailHash } = await comConfirmacaoAberta('paciente-r3-a')
      expect((await confirmar(chave)).data).toBe('confirmado')
      expect(await emailDo(link)).toMatchObject({ email, origem: 'paciente' })
      expect((await emailDo(link))['confirmado_em']).not.toBeNull()
      expect(await aceitesAtivos(link, emailHash)).toEqual([{ tipo: 'semana' }])
      expect((await c.servico.from('chaves_de_aviso').select('usado_em').eq('chave', chave).single()).data?.['usado_em']).not.toBeNull()
      expect((await confirmar(chave)).data).toBe('usada')
      expect(await aceitesAtivos(link, emailHash)).toHaveLength(1)
    })

    it('CA-2308: a chave de descadastro, a vencida, a de antes da troca e a que não existe não confirmam, e nada muda', async () => {
      const { link, chave, emailHash } = await comConfirmacaoAberta('paciente-r3-b')
      sem('vencer a chave', (await c.servico.from('chaves_de_aviso').update({ vence_em: new Date(Date.now() - 60_000).toISOString() }).eq('chave', chave)).error)
      expect((await confirmar(chave)).data).toBe('nao-vale')
      const sair = novaChave()
      sem('a de descadastro', (await c.servico.from('chaves_de_aviso').insert({ chave: sair, link_id: link.id, nutricionista_id: c.vitima.id, tipo: 'sair', avisos: ['semana'], email_hash: emailHash })).error)
      expect((await confirmar(sair)).data).toBe('nao-vale')
      expect((await confirmar(novaChave())).data).toBe('nao-vale')
      const outra = await comConfirmacaoAberta('paciente-r3-c')
      sem('trocar o endereço', (await c.vitima.cliente.from('acompanhamentos').update({ token: tokenNovo() }).eq('id', outra.link.id)).error)
      expect((await confirmar(outra.chave)).data).toBe('nao-vale')
      for (const l of [link, outra.link]) expect(await emailDo(l)).toMatchObject({ email: ficha, origem: 'ficha' })
      expect(await aceitesAtivos(link, emailHash)).toEqual([])
    })

    it('CA-2308 e CB-1232: a troca segura o link (outra transação) enquanto o "Confirmar" corre: ele espera, é recusado e o link fica com o da ficha', async () => {
      const { link, chave, emailHash } = await comConfirmacaoAberta('paciente-r3-d')
      const troca = sqlAoMesmoTempo(['begin;', `update public.acompanhamentos set token = '${tokenNovo()}' where id = '${link.id}';`, 'select pg_sleep(2);', 'commit;'].join('\n'))
      await esperar(700)
      const inicio = Date.now()
      const r = await confirmar(chave)
      expect(Date.now() - inicio).toBeGreaterThan(500)
      expect(r.error).toBeNull()
      expect(r.data).toBe('nao-vale')
      expect((await troca).ok).toBe(true)
      expect(await emailDo(link)).toMatchObject({ email: ficha, origem: 'ficha', confirmado_em: null })
      expect(await aceitesAtivos(link, emailHash)).toEqual([])
    })

    it('CB-1232: o "Confirmar" segura o link (outra transação) enquanto a troca corre: a troca espera, devolve o link à ficha e encerra os aceites do outro endereço', async () => {
      const { link, chave, emailHash, fichaHash } = await comConfirmacaoAberta('paciente-r3-e')
      const pedido = sqlAoMesmoTempo(['begin;', `select public.confirmar_email_do_paciente('${chave}', array['semana'], 2::smallint, true, now());`, 'select pg_sleep(2);', 'commit;'].join('\n'))
      await esperar(700)
      const inicio = Date.now()
      sem('trocar o endereço', (await c.vitima.cliente.from('acompanhamentos').update({ token: tokenNovo() }).eq('id', link.id)).error)
      expect(Date.now() - inicio).toBeGreaterThan(500)
      expect((await pedido).ok).toBe(true)
      expect(await emailDo(link)).toMatchObject({ email: ficha, origem: 'ficha', confirmado_em: null })
      expect(await aceitesAtivos(link, emailHash)).toEqual([])
      expect((await c.servico.from('emails_dos_links').select('email_hash').eq('link_id', link.id).single()).data?.['email_hash']).toBe(fichaHash)
    })
  })
})
