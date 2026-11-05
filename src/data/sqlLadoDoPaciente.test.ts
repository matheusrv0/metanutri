// Spec lado-do-paciente: o texto do 017 (seção 3.1 do PLAN). O comportamento no banco de verdade está em
// testes/seguranca/ladoDoPaciente.test.ts (npm run test:seguranca, Supabase local).
import sql015 from '../../supabase/015-marca-no-link.sql?raw'
import sql from '../../supabase/017-lado-do-paciente.sql?raw'

/** O que roda direto quando o arquivo roda: o SQL sem o corpo das funções e dos blocos `do`. */
const foraDasFuncoes = sql.replace(/\$\$[\s\S]*?\$\$/g, '')

/** O texto de uma função, do `create` até o fim do corpo. */
function funcao(assinatura: string): string {
  const inicio = sql.indexOf(assinatura)
  if (inicio < 0) throw new Error(`o 017 não cria ${assinatura}`)
  const corpo = sql.indexOf('$$', sql.indexOf('as $$', inicio) + 5)
  return sql.slice(inicio, corpo)
}

const TABELAS_NOVAS = ['config_de_emails', 'emails_dos_links', 'aceites', 'chaves_de_aviso', 'envios', 'supressao', 'limites_de_envio', 'estado_dos_avisos', 'tokens_trocados'] as const

/** As colunas que a função do paciente devolve, na ordem. */
const colunasDe = (texto: string, assinatura: string): string[] => {
  const inicio = texto.indexOf(assinatura)
  const lista = texto.slice(inicio).split('returns table (')[1]?.split(')\nlanguage')[0] ?? ''
  return lista.split(',').map((c) => c.trim().split(/\s+/)[0] ?? '')
}

describe('banco: o lado do paciente (017, spec lado-do-paciente)', () => {
  it('pode rodar de novo, e nada é apagado fora das funções', () => {
    expect(foraDasFuncoes).not.toMatch(/\b(drop table|truncate|delete from|drop column)\b/i)
    for (const tabela of TABELAS_NOVAS) expect(sql, tabela).toContain(`create table if not exists public.${tabela} (`)
    for (const coluna of ['mensagem text', 'mensagem_em timestamptz', 'proxima_consulta text', 'ultimo_acesso date', 'a1_para timestamptz']) {
      expect(sql).toContain(`alter table public.acompanhamentos add column if not exists ${coluna}`)
    }
    // A data do plano só nasce uma vez: rodar de novo não a volta para a criação do link.
    expect(sql).toMatch(/if not exists \(\s*select 1 from information_schema\.columns[\s\S]*?column_name = 'plano_em'[\s\S]*?update public\.acompanhamentos set plano_em = criado_em;/)
  })

  it('tudo roda numa transação só: begin é o primeiro comando e commit, o último, com o PostgREST recarregando antes', () => {
    const comandos = sql
      .replace(/\$\$[\s\S]*?\$\$/g, '$$$$')
      .split('\n')
      .filter((linha) => linha.trim() !== '' && !linha.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map((c) => c.trim())
      .filter(Boolean)
    expect(comandos[0]).toBe('begin')
    expect(comandos.at(-1)).toBe('commit')
    expect(comandos.filter((c) => c === 'begin' || c === 'commit')).toHaveLength(2)
    expect(sql).toMatch(/notify pgrst, 'reload schema';\s*commit;/)
  })

  it('CA-2270, DP-LP-10 e CB-1215: os quatro horários da função avisos e a limpeza diária, em UTC', () => {
    const agendados = [...sql.matchAll(/select cron\.schedule\('([^']+)', '([^']+)', '((?:[^']|'')+)'\);/g)].map((m) => [m[1], m[2], m[3]?.replace(/''/g, "'")])
    expect(agendados).toEqual([
      ['metanutri-avisos-n1', '0 10 * * 1', "select public.pedir_avisos('n1');"],
      ['metanutri-avisos-manha', '0 11 * * *', "select public.pedir_avisos('manha');"],
      ['metanutri-avisos-tarde', '0 21 * * *', "select public.pedir_avisos('tarde');"],
      ['metanutri-avisos-a1', '*/15 11-23 * * *', "select public.pedir_avisos('a1');"],
      ['metanutri-limpar-emails', '30 6 * * *', 'select public.limpar_emails_antigos();'],
    ])
  })

  it('CA-2270: o pedido à função leva a chave do cofre no cabeçalho, e só o agendamento o faz', () => {
    const pedir = funcao('create or replace function public.pedir_avisos(p_vez text)')
    expect(pedir).toContain("'/functions/v1/avisos'")
    expect(pedir).toContain("'x-chave-dos-avisos', v_chave")
    expect(pedir).toContain("jsonb_build_object('vez', p_vez)")
    expect(pedir).toContain("p_vez not in ('n1', 'manha', 'tarde', 'a1')")
    expect(sql).toContain('revoke all on function public.pedir_avisos(text) from public, anon, authenticated, service_role;')
    expect(sql).toContain("if not exists (select 1 from vault.secrets where name = 'metanutri_chave_dos_avisos')")
  })

  it('RLS ligada e nada para quem não tem conta em todas as tabelas novas', () => {
    for (const tabela of TABELAS_NOVAS) {
      expect(sql, tabela).toContain(`alter table public.${tabela} enable row level security;`)
      expect(sql, tabela).toContain(`revoke all on public.${tabela} from anon, authenticated;`)
    }
    expect(sql).not.toMatch(/grant [^;]* on public\.\w+ to [^;]*anon/)
    // Só o dono lê o que é dele; ninguém escreve nas tabelas dos e-mails pelo navegador (as funções escrevem).
    expect(sql).toContain('grant select, insert, update, delete on public.config_de_emails to authenticated;')
    for (const tabela of ['emails_dos_links', 'aceites', 'envios']) expect(sql, tabela).toContain(`grant select on public.${tabela} to authenticated;`)
    for (const tabela of ['chaves_de_aviso', 'supressao', 'limites_de_envio', 'estado_dos_avisos', 'tokens_trocados']) expect(sql, tabela).not.toMatch(new RegExp(`grant [^;]* on public\\.${tabela} `))
    const politicas = [...sql.matchAll(/create policy "([^"]+)" on public\.(\w+)\s+for (\w+) to (\w+)/g)].map((m) => `${m[2]}:${m[1]}:${m[3]}:${m[4]}`)
    expect(politicas).toEqual([
      'config_de_emails:dono le:select:authenticated',
      'config_de_emails:dono escreve:insert:authenticated',
      'config_de_emails:dono atualiza:update:authenticated',
      'config_de_emails:dono apaga:delete:authenticated',
      'emails_dos_links:dono le:select:authenticated',
      'aceites:dono le:select:authenticated',
      'envios:dono le:select:authenticated',
    ])
  })

  it('D-107: os tetos de tamanho das colunas novas', () => {
    expect(sql).toContain('check (mensagem is null or char_length(mensagem) <= 400)')
    expect(sql).toContain('check (char_length(nome) <= 120)')
    expect(sql).toContain('char_length(responder_para) <= 254')
    expect(sql).toContain('char_length(email) <= 254')
    expect(sql).toContain('check (char_length(assunto) <= 200)')
    expect(sql).toContain("chave text primary key check (chave ~ '^[A-Za-z0-9]{32}$')")
    expect(sql).toContain("check (proxima_consulta is null or proxima_consulta ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}(T[0-9]{2}:[0-9]{2})?$')")
  })

  it('CA-2276 e DP-LP-13: um envio por chave única; o aceite, um ativo por link, aviso e endereço', () => {
    expect(sql).toContain('chave_unica text unique')
    expect(sql).toContain('resend_id text unique')
    expect(sql).toContain('create unique index if not exists aceites_um_ativo on public.aceites (link_id, tipo, email_hash) where saiu_em is null;')
  })

  it('CA-2284 e D-1243: a conta que sai leva tudo; a supressão não tem dono e fica', () => {
    for (const tabela of ['config_de_emails', 'emails_dos_links', 'aceites', 'chaves_de_aviso', 'envios']) {
      const definicao = sql.slice(sql.indexOf(`create table if not exists public.${tabela} (`))
      expect(definicao.slice(0, definicao.indexOf(');')), tabela).toContain('references auth.users (id) on delete cascade')
    }
    const supressao = sql.slice(sql.indexOf('create table if not exists public.supressao ('))
    expect(supressao.slice(0, supressao.indexOf(');'))).not.toContain('references')
  })

  it('DP-LP-16: o resumo do endereço é o SHA-256 do endereço sem espaço e minúsculo, como o app', () => {
    expect(funcao('create or replace function public.hash_do_email(p_email text)')).toContain(
      "encode(sha256(convert_to(lower(regexp_replace(coalesce(p_email, ''), '\\s', '', 'g')), 'UTF8')), 'hex')",
    )
  })

  it('DP-LP-6: o limite conta só os links fixos, com a mesma frase', () => {
    const limite = funcao('create or replace function public.conferir_link_do_paciente()')
    expect(limite).toContain('where nutricionista_id = new.nutricionista_id and substituido_por is null')
    expect(limite).toContain("raise exception 'Você chegou ao limite de links do seu plano.' using errcode = 'P0001';")
    // O fixo é sempre da mesma conta: o token de uma conta nunca abre o link de outra.
    expect(limite).toContain('f.id = new.substituido_por and f.nutricionista_id = new.nutricionista_id')
  })

  it('DP-LP-5: a migração marca os links antigos de cada paciente com o mais recente', () => {
    expect(foraDasFuncoes).toMatch(/first_value\(a\.id\) over \(partition by a\.nutricionista_id, a\.paciente_id order by a\.criado_em desc, a\.id desc\)/)
    expect(foraDasFuncoes).toMatch(/where a\.paciente_id is not null and a\.substituido_por is null/)
  })

  it('CA-1974 e D-1213: a função do paciente devolve as colunas do 015, na mesma ordem, e as novas no fim', () => {
    const assinatura = 'create function public.missoes_por_token(p_token text)'
    expect(colunasDe(sql, assinatura)).toEqual([
      ...colunasDe(sql015, assinatura),
      'mensagem',
      'mensagem_em',
      'proxima_consulta',
      'ultimo_acesso',
      'substituido_por',
      'plano_em',
      'nutricionista',
      'email_mascarado',
      'avisos',
    ])
    expect(sql.indexOf('drop function if exists public.missoes_por_token(text);')).toBeLessThan(sql.indexOf(assinatura))
  })

  it('CA-1974 e CA-2235: o dono do link e o e-mail inteiro nunca saem na resposta do paciente', () => {
    const corpo = funcao('create function public.missoes_por_token(p_token text)').split('as $$')[1] ?? ''
    const selecionado = corpo.slice(corpo.lastIndexOf('select a.id'), corpo.lastIndexOf('from alvo'))
    expect(selecionado).not.toContain('nutricionista_id')
    expect(selecionado).toContain('public.mascarar_email(e.email)')
    expect(selecionado).not.toMatch(/e\.email[,\s]*$/m)
    // O token antigo só segue o fixo da mesma conta.
    expect(corpo).toContain('f.id = pedido.substituido_por and f.nutricionista_id = pedido.nutricionista_id')
  })

  it('quem chama cada função: o paciente pelo token; a nutricionista as dela; o servidor o resto', () => {
    for (const [assinatura, papeis] of [
      ['missoes_por_token(text)', 'anon, authenticated'],
      ['registrar_acesso(text)', 'anon, authenticated'],
      ['desligar_aviso(text, text)', 'anon, authenticated'],
      ['definir_email_da_ficha(uuid, text)', 'authenticated'],
      ['definir_ofertas(uuid, boolean, boolean, boolean)', 'authenticated'],
      ['emails_do_link(uuid)', 'authenticated'],
      ['avisos_aceitos_da_conta()', 'authenticated'],
      ['apagar_emails_do_link(uuid)', 'authenticated'],
      ['painel_emails()', 'authenticated'],
      ['retomar_avisos()', 'authenticated'],
      ['anotar_limite(text, integer, timestamptz)', 'service_role'],
      ['conferir_chave_dos_avisos(text)', 'service_role'],
      ['limpar_emails_antigos(timestamptz)', 'service_role'],
      ['hash_do_email(text)', 'service_role'],
    ] as const) {
      expect(sql, assinatura).toContain(`grant execute on function public.${assinatura} to ${papeis};`)
    }
    for (const assinatura of ['anotar_limite(text, integer, timestamptz)', 'conferir_chave_dos_avisos(text)', 'limpar_emails_antigos(timestamptz)', 'avisos_do_link(uuid)', 'dono_do_link(uuid)']) {
      expect(sql, assinatura).toContain(`revoke all on function public.${assinatura} from public, anon, authenticated;`)
    }
  })

  it('as funções da nutricionista conferem o dono do link; as do dono, o administrador', () => {
    for (const assinatura of [
      'create or replace function public.definir_email_da_ficha(p_link uuid, p_email text)',
      'create or replace function public.definir_ofertas(p_link uuid, p_plano boolean, p_semana boolean, p_lembrete boolean)',
      'create or replace function public.emails_do_link(p_link uuid)',
      'create or replace function public.apagar_emails_do_link(p_link uuid)',
    ]) {
      expect(funcao(assinatura), assinatura).toContain('public.dono_do_link(p_link)')
    }
    expect(funcao('create or replace function public.dono_do_link(p_link uuid)')).toContain("raise exception 'Este link não é seu.' using errcode = '42501';")
    for (const assinatura of ['create or replace function public.painel_emails()', 'create or replace function public.retomar_avisos()']) {
      expect(funcao(assinatura), assinatura).toContain('if not public.eh_admin() then')
    }
  })

  it('CA-2239: o acesso é só a data de Brasília, gravada só quando muda', () => {
    const acesso = funcao('create or replace function public.registrar_acesso(p_token text)')
    expect(acesso).toContain("(now() at time zone 'America/Sao_Paulo')::date")
    expect(acesso).toContain('ultimo_acesso is distinct from v_hoje')
  })

  it('CA-2285: a limpeza diária apaga envios com mais de 6 meses e mantém a supressão', () => {
    const limpar = funcao('create or replace function public.limpar_emails_antigos(p_agora timestamptz default now())')
    expect(limpar).toContain("delete from public.envios where criado_em < p_agora - interval '6 months';")
    expect(limpar).not.toContain('supressao')
  })

  it('R-LP-1: o topo diz para rodar antes de publicar e depois do 015', () => {
    const topo = sql.split('begin;')[0] ?? ''
    expect(topo).toContain('Rode DEPOIS do 001 ao 015 e ANTES de publicar o site e as funções desta versão.')
    expect(topo).toContain('Se rodar o 004, o 012 ou o 015 de')
    // DP-LP-32: o 017 refaz a marcação do paciente (a do 010) com o corte.
    expect(topo).toContain('Se rodar o 010 de novo, também')
  })
})

describe('banco: a troca do endereço corta quem tinha o link (017, revisão r1, D-1246 e D-1248)', () => {
  it('DP-LP-32: o link cortado e os endereços trocados, que só o banco escreve', () => {
    expect(sql).toContain('alter table public.acompanhamentos add column if not exists cortado_em timestamptz')
    const tabela = sql.slice(sql.indexOf('create table if not exists public.tokens_trocados ('))
    const definicao = tabela.slice(0, tabela.indexOf(');'))
    expect(definicao).toContain("token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$')")
    expect(definicao).toContain('link_id uuid not null references public.acompanhamentos (id) on delete cascade')
    // O resumo do token, nunca o token.
    expect(definicao).not.toMatch(/\btoken text\b/)
    expect(funcao('create or replace function public.hash_do_token(p_token text)')).toContain("encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')")
    expect(sql).toContain('revoke all on function public.hash_do_token(text) from public, anon, authenticated;')
  })

  it('CA-2289: trocar o token guarda o resumo do de antes e corta os links antigos do mesmo paciente, na mesma conta', () => {
    const trocar = funcao('create or replace function public.trocar_o_endereco()')
    expect(trocar).toContain('security definer')
    expect(trocar).toContain('if new.token is not distinct from old.token then')
    expect(trocar).toContain('insert into public.tokens_trocados (token_hash, link_id) values (public.hash_do_token(old.token), new.id)')
    // Os da migração (em cadeia) e os do mesmo paciente, só da mesma conta.
    expect(trocar).toContain('with recursive antigos (id) as (')
    expect(trocar).toContain('a.substituido_por = new.id and a.nutricionista_id = new.nutricionista_id')
    expect(trocar).toContain('new.paciente_id is not null and a.paciente_id = new.paciente_id')
    expect(trocar).toContain('set cortado_em = now()')
    expect(sql).toContain('create trigger trocar_o_endereco\n  after update of token on public.acompanhamentos')
    expect(sql).toContain('revoke all on function public.trocar_o_endereco() from public, anon, authenticated;')
  })

  it('CA-2293: a troca devolve o link ao e-mail da ficha, encerra os aceites do outro endereço e derruba as confirmações abertas', () => {
    const trocar = funcao('create or replace function public.trocar_o_endereco()')
    expect(trocar).toMatch(/update public\.emails_dos_links e\s+set email = e\.email_ficha,/)
    expect(trocar).toContain("where e.link_id = new.id and e.origem = 'paciente'")
    expect(trocar).toMatch(/update public\.aceites x set saiu_em = now\(\)\s+where x\.link_id = new\.id and x\.saiu_em is null/)
    expect(trocar).toContain("delete from public.chaves_de_aviso k where k.link_id = new.id and k.tipo = 'aceite' and k.usado_em is null;")
  })

  it('CA-2290: a aba antiga não faz o endereço trocado voltar, e o app não escreve o corte', () => {
    const cuidar = funcao('create or replace function public.cuidar_do_link()')
    expect(cuidar).toContain('new.cortado_em := null;')
    expect(cuidar).toContain('new.cortado_em := old.cortado_em;')
    expect(cuidar).toMatch(/if new\.token is distinct from old\.token then\s+if public\.link_trocado\(new\.token\) then\s+new\.token := old\.token;/)
    expect(cuidar).toContain("raise exception 'Este endereço já foi usado.' using errcode = '23505';")
  })

  it('CA-2289: o endereço cortado não abre, não marca, não registra acesso nem desliga aviso, e a tela sabe que foi trocado', () => {
    const porToken = funcao('create function public.missoes_por_token(p_token text)')
    expect(porToken).toContain('where p.token = p_token and p.cortado_em is null')
    expect(porToken).toContain('f.nutricionista_id = pedido.nutricionista_id and f.cortado_em is null')
    for (const assinatura of ['create or replace function public.registrar_acesso(p_token text)', 'create or replace function public.desligar_aviso(p_token text, p_tipo text)']) {
      expect(funcao(assinatura), assinatura).toContain('where p.token = p_token and p.cortado_em is null')
    }
    const marcar = funcao('create or replace function public.marcar_missoes(p_token text, p_marcacoes jsonb)')
    expect(marcar).toContain('where token = p_token and cortado_em is null;')
    expect(marcar).toContain("raise exception 'Este link já guarda marcações demais.' using errcode = '22023';")
    const trocado = funcao('create or replace function public.link_trocado(p_token text)')
    expect(trocado).toContain('security definer')
    expect(trocado).toContain('public.tokens_trocados t where t.token_hash = public.hash_do_token(p_token)')
    expect(trocado).toContain('a.token = p_token and a.cortado_em is not null')
    expect(sql).toContain('grant execute on function public.link_trocado(text) to anon, authenticated;')
  })

  it('DP-LP-6: o link cortado não conta no limite', () => {
    expect(funcao('create or replace function public.conferir_link_do_paciente()')).toContain('substituido_por is null and cortado_em is null')
  })
})
