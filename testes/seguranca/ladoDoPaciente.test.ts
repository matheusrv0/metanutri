// Spec lado-do-paciente (supabase/017) num Supabase LOCAL: o link fixo e a migração (CA-2225), o limite por paciente
// (CA-2226), o último acesso (CA-2239), os avisos no link (CA-2256, CA-2257), o agendamento (CA-2270), o Painel do dono
// (CA-2281), a limpeza (CA-2285) e as portas fechadas das tabelas e das funções novas. Os ataques de uma conta à outra
// nas tabelas novas estão em tabelas.test.ts (pela lista TABELAS_DA_CONTA), e a exclusão (CA-2284), em exclusao.test.ts.
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { hashDoEmail, mascararEmail } from '../../supabase/functions/_shared/avisos/email.ts'
import { sqlNoBancoLocal } from './bancoLocal.ts'
import { barrado, barradoOuVazio, prepararCenario, recusadoCom, type Cenario, type Conta } from './preparo.ts'

let c: Cenario

beforeAll(async () => {
  c = await prepararCenario()
})

const TABELAS_NOVAS = ['config_de_emails', 'emails_dos_links', 'aceites', 'chaves_de_aviso', 'envios', 'supressao', 'limites_de_envio', 'estado_dos_avisos'] as const
const MES_MS = 30 * 24 * 60 * 60 * 1000
const hojeEmBrasilia = (): string => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())

type Linha = Record<string, unknown>

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

  it('a conta comum não lê a supressão, as chaves, os limites nem o estado dos avisos', async () => {
    for (const tabela of ['supressao', 'chaves_de_aviso', 'limites_de_envio', 'estado_dos_avisos']) recusadoCom(await c.atacante.cliente.from(tabela).select('*'), ['42501'])
  })

  it.each([
    ['anotar_limite', { p_chave: 'x', p_limite: 10, p_desde: '2000-01-01T00:00:00Z' }],
    ['conferir_chave_dos_avisos', { p_chave: 'x'.repeat(64) }],
    ['limpar_emails_antigos', {}],
    ['hash_do_email', { p_email: 'a@b.com' }],
    ['mascarar_email', { p_email: 'a@b.com' }],
    ['avisos_do_link', { p_link: randomUUID() }],
    ['dono_do_link', { p_link: randomUUID() }],
    ['pedir_avisos', { p_vez: 'manha' }],
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
