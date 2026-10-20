import sql from '../../supabase/013-exclusao-de-conta.sql?raw'

/** O que roda direto quando o arquivo roda: o SQL sem o corpo das funções e dos blocos `do`. */
const foraDasFuncoes = sql.replace(/\$\$[\s\S]*?\$\$/g, '')
const inicioDaTabela = sql.indexOf('create table if not exists public.assinaturas_de_contas_excluidas (')
/** Só o bloco da tabela do registro. */
const tabela = sql.slice(inicioDaTabela, sql.indexOf(');', inicioDaTabela))
const colunas = tabela
  .split('\n')
  .slice(1)
  .map((linha) => linha.trim().split(/\s+/)[0] ?? '')
  .filter(Boolean)
const inicioDoGatilho = sql.indexOf('create or replace function public.guardar_ao_excluir_conta()')
const funcao = sql.slice(inicioDoGatilho, sql.indexOf('$$;', inicioDoGatilho))
const cabecalho = funcao.split('as $$')[0] ?? ''
const corpo = funcao.split('as $$')[1] ?? ''

/** Os comandos do arquivo, sem comentários e com o corpo das funções vazio. */
const comandos = sql
  .replace(/\$\$[\s\S]*?\$\$/g, '$$$$')
  .split('\n')
  .filter((linha) => linha.trim() !== '' && !linha.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map((c) => c.trim())
  .filter(Boolean)

describe('banco: excluir a conta (013, spec exclusao-de-conta)', () => {
  it('pode rodar de novo: nada é apagado fora do gatilho, e tabela, índice, gatilho e trava só entram se faltam ou depois de sair', () => {
    expect(foraDasFuncoes).not.toMatch(/\b(drop table|truncate|delete from|drop column)\b/i)
    const criacoes = sql.split('\n').filter((linha) => /^\s*create (table|index)/i.test(linha))
    expect(criacoes).toHaveLength(2)
    for (const linha of criacoes) expect(linha).toMatch(/if not exists/i)
    const saiGatilho = sql.indexOf('drop trigger if exists guardar_ao_excluir_conta on auth.users;')
    expect(saiGatilho).toBeGreaterThan(-1)
    expect(saiGatilho).toBeLessThan(sql.indexOf('create trigger guardar_ao_excluir_conta'))
    const saiTrava = sql.indexOf('alter table public.chamadas_da_cobranca drop constraint if exists chamadas_da_cobranca_tipo_check;')
    expect(saiTrava).toBeGreaterThan(-1)
    expect(saiTrava).toBeLessThan(sql.indexOf('add constraint chamadas_da_cobranca_tipo_check check'))
  })

  it('tudo roda numa transação só: begin é o primeiro comando e commit, o último; o PostgREST recarrega antes do commit', () => {
    expect(comandos[0]).toBe('begin')
    expect(comandos.at(-1)).toBe('commit')
    expect(comandos.filter((c) => c === 'begin' || c === 'commit')).toHaveLength(2)
    expect(sql).toMatch(/notify pgrst, 'reload schema';\s*commit;/)
  })

  describe('D-253 (a): o registro das assinaturas de contas excluídas', () => {
    it('CA-818: guarda o código da assinatura, plano, ciclo, valor, a última paga, quem encerrou e quando, e a data da exclusão', () => {
      expect(inicioDaTabela).toBeGreaterThan(-1)
      expect(colunas).toEqual(['id', 'preapproval_id', 'plano', 'ciclo', 'valor_centavos', 'ultima_cobranca_paga', 'encerrada_por', 'encerrada_em', 'excluida_em'])
      expect(tabela).toContain('preapproval_id text not null unique')
      // L2 da revisão: as datas só com o dia (de Brasília), para a hora exata não ligar o registro ao histórico.
      expect(tabela).toContain('ultima_cobranca_paga date,')
      expect(tabela).toContain('encerrada_em date,')
      expect(tabela).toContain("excluida_em date not null default ((now() at time zone 'America/Sao_Paulo')::date)")
    })

    it('L2: quem rodou uma versão anterior deste arquivo também fica com as datas só com o dia', () => {
      for (const coluna of ['ultima_cobranca_paga', 'encerrada_em', 'excluida_em']) {
        expect(sql).toContain(`alter table public.assinaturas_de_contas_excluidas alter column ${coluna} type date using ${coluna}::date;`)
      }
      expect(sql).toContain("alter table public.assinaturas_de_contas_excluidas alter column excluida_em set default ((now() at time zone 'America/Sao_Paulo')::date);")
    })

    it('CA-818: sem nome, sem e-mail, sem cartão e sem o código da conta', () => {
      expect(tabela).not.toMatch(/nutricionista_id|usuario|email|nome|cartao|references/i)
    })

    it('CA-824: fechado para o navegador: RLS ligado, nenhum acesso de anon e authenticated, nenhuma política', () => {
      expect(sql).toContain('alter table public.assinaturas_de_contas_excluidas enable row level security;')
      expect(sql).toContain('revoke all on public.assinaturas_de_contas_excluidas from anon, authenticated;')
      expect(sql).not.toMatch(/create policy|alter policy|disable row level security/i)
      // A única concessão é a da rotina do D-259, só para o servidor.
      expect([...sql.matchAll(/^grant [^;]*;/gim)].map((m) => m[0])).toEqual(['grant execute on function public.limpar_registros_guardados(timestamptz) to service_role;'])
    })

    it('CA-825: um índice pela data da exclusão, para apagar os de mais de 5 anos', () => {
      expect(sql).toContain('create index if not exists assinaturas_de_contas_excluidas_por_data on public.assinaturas_de_contas_excluidas (excluida_em);')
    })
  })

  describe('D-253 (b): o histórico fica sem ligação com a conta', () => {
    it('CA-819: a chave estrangeira do histórico (que o apagava junto com a conta) sai, procurada pelo tipo, só nesta tabela', () => {
      expect(sql).toMatch(/where conrelid = 'public\.assinaturas_historico'::regclass and contype = 'f'/)
      expect(sql).toContain("execute format('alter table public.assinaturas_historico drop constraint %I', v_nome);")
    })
  })

  describe('D-252: o gatilho antes de apagar o login', () => {
    it('roda antes de apagar cada login, em auth.users, enquanto as linhas da conta ainda existem', () => {
      expect(sql).toContain('create trigger guardar_ao_excluir_conta\n  before delete on auth.users\n  for each row execute function public.guardar_ao_excluir_conta();')
    })

    it('security definer com search_path fixo: quem apaga o login é o servidor de login, sem acesso às tabelas', () => {
      expect(cabecalho).toContain('returns trigger')
      expect(cabecalho).toContain('language plpgsql')
      expect(cabecalho).toContain('security definer')
      expect(cabecalho).toContain('set search_path = public')
      expect(sql).toContain('revoke all on function public.guardar_ao_excluir_conta() from public, anon, authenticated;')
    })

    it('CA-818 e CB-252: guarda a assinatura do Mercado Pago da conta, uma vez só', () => {
      expect(corpo).toMatch(
        /insert into public\.assinaturas_de_contas_excluidas \(preapproval_id, plano, ciclo, valor_centavos, ultima_cobranca_paga, encerrada_por, encerrada_em\)\s+select a\.preapproval_id, a\.plano, a\.ciclo, a\.valor_centavos, \(a\.ultima_cobranca_paga at time zone 'America\/Sao_Paulo'\)::date, a\.encerrada_por, \(a\.encerrada_em at time zone 'America\/Sao_Paulo'\)::date\s+from public\.assinaturas a\s+where a\.nutricionista_id = old\.id and a\.preapproval_id is not null\s+on conflict \(preapproval_id\) do nothing;/,
      )
    })

    it('CA-819: troca o código da conta no histórico por um só código novo, sorteado uma vez', () => {
      expect(corpo).toContain('v_anonimo uuid := gen_random_uuid();')
      expect(corpo).toContain(
        "update public.assinaturas_historico set nutricionista_id = v_anonimo, quando = date_trunc('day', quando, 'America/Sao_Paulo') where nutricionista_id = old.id;",
      )
      expect(corpo.match(/gen_random_uuid\(\)/g)).toHaveLength(1)
    })

    it('L2: a linha de fechamento também fica só com o dia', () => {
      expect(corpo).toContain("insert into public.assinaturas_historico (nutricionista_id, plano, status, ciclo, valor_centavos, preco_travado, quando)")
      expect(corpo).toContain("select v_anonimo, a.plano, 'cancelada', a.ciclo, a.valor_centavos, a.preco_travado, date_trunc('day', now(), 'America/Sao_Paulo')")
    })

    it('CA-826 (M2 da revisão): assinatura que não estava cancelada ganha a linha "cancelada" de fechamento, com o código sorteado, depois da troca', () => {
      const fechamento = corpo.indexOf('insert into public.assinaturas_historico')
      expect(fechamento).toBeGreaterThan(corpo.indexOf('update public.assinaturas_historico'))
      expect(corpo.slice(fechamento)).toMatch(
        /insert into public\.assinaturas_historico \(nutricionista_id, plano, status, ciclo, valor_centavos, preco_travado(, quando)?\)\s+select v_anonimo, a\.plano, 'cancelada', a\.ciclo, a\.valor_centavos, a\.preco_travado(, [^\n]+)?\s+from public\.assinaturas a\s+where a\.nutricionista_id = old\.id and a\.status <> 'cancelada';/,
      )
    })

    it('M2: o cabeçalho diz o que fazer antes de excluir pelo painel do Supabase', () => {
      const cabecalhoDoArquivo = sql.slice(0, sql.indexOf('begin;'))
      expect(cabecalhoDoArquivo).toContain('Antes de excluir alguém pelo painel do Supabase')
      expect(cabecalhoDoArquivo).toContain('cancele a assinatura no Mercado Pago')
      expect(cabecalhoDoArquivo).toContain('comprovantes/<código da conta>')
    })

    it("CA-825: apaga do registro o que passou de 5 anos", () => {
      expect(corpo).toContain("delete from public.assinaturas_de_contas_excluidas where excluida_em < now() - interval '5 years';")
    })

    it('devolve a linha que sai: o login é apagado depois do gatilho', () => {
      expect(corpo).toMatch(/return old;\s*end;\s*$/)
    })
  })

  it('D-256: o pedido de exclusão entra no limite de chamadas, com um tipo próprio', () => {
    expect(sql).toContain("alter table public.chamadas_da_cobranca add constraint chamadas_da_cobranca_tipo_check check (tipo in ('cartao', 'conferir', 'excluir'));")
  })

  describe('D-259 (revisão de 19/10/2026): a rotina diária', () => {
    const inicioDaRotina = sql.indexOf('create or replace function public.limpar_registros_guardados(p_agora timestamptz default now())')
    const rotina = sql.slice(inicioDaRotina, sql.indexOf('$$;', inicioDaRotina))
    const cabecalhoDaRotina = rotina.split('as $$')[0] ?? ''
    const corpoDaRotina = rotina.split('as $$')[1] ?? ''

    it('liga o pg_cron sozinho, do mesmo jeito que o 014 da outra frente: o 013 não depende do 014', () => {
      expect(sql).toContain('create extension if not exists pg_cron with schema pg_catalog;')
      expect(sql.indexOf('create extension if not exists pg_cron')).toBeLessThan(sql.indexOf("select cron.schedule('metanutri-limpar-registros'"))
    })

    it('CA-827 e D-259: apaga os registros de acesso do servidor de login com mais de 6 meses', () => {
      expect(inicioDaRotina).toBeGreaterThan(-1)
      expect(corpoDaRotina).toContain("delete from auth.audit_log_entries where created_at < p_agora - interval '6 months';")
    })

    it('CA-825 (L1): apaga todo dia o registro de assinaturas com mais de 5 anos, mesmo sem exclusão nenhuma', () => {
      expect(corpoDaRotina).toContain("delete from public.assinaturas_de_contas_excluidas where excluida_em < p_agora - interval '5 years';")
    })

    it('CB-318 (integracao-rodada-1910, revisão final M-2): sem permissão nos registros de acesso, a rotina avisa e segue', () => {
      // Primeiro as assinaturas de 5 anos; depois os registros de acesso, num bloco próprio que só desfaz a si mesmo.
      expect(corpoDaRotina.indexOf('delete from public.assinaturas_de_contas_excluidas')).toBeLessThan(corpoDaRotina.indexOf('delete from auth.audit_log_entries'))
      expect(corpoDaRotina).toMatch(
        /begin\s+delete from auth\.audit_log_entries where created_at < p_agora - interval '6 months';\s+exception when insufficient_privilege then\s+raise warning '[^']*%[^']*', sqlerrm;\s+end;/,
      )
      // Nenhum outro erro é engolido: só o de permissão.
      expect(corpoDaRotina.match(/exception when/g)).toHaveLength(1)
      expect(corpoDaRotina).not.toMatch(/when others/i)
    })

    it('security definer com search_path vazio e só nomes qualificados; só o servidor chama', () => {
      expect(cabecalhoDaRotina).toContain('returns void')
      expect(cabecalhoDaRotina).toContain('security definer')
      expect(cabecalhoDaRotina).toContain("set search_path = ''")
      expect(sql).toContain('revoke all on function public.limpar_registros_guardados(timestamptz) from public, anon, authenticated;')
      expect(sql).toContain('grant execute on function public.limpar_registros_guardados(timestamptz) to service_role;')
    })

    it('roda todo dia, com um nome que um segundo agendamento troca em vez de duplicar', () => {
      expect(sql).toContain("select cron.schedule('metanutri-limpar-registros', '45 6 * * *', 'select public.limpar_registros_guardados();');")
      expect(sql).toMatch(/^-- select schedule, command, active from cron\.job where jobname = 'metanutri-limpar-registros';/m)
    })
  })

  it('a conferência depois de rodar mostra o gatilho, a tabela fechada, o histórico sem chave estrangeira e o tipo novo', () => {
    expect(sql).toMatch(/^-- select tgname, tgtype from pg_trigger where tgrelid = 'auth\.users'::regclass and tgname = 'guardar_ao_excluir_conta';/m)
    expect(sql).toMatch(/^-- select relname, relrowsecurity from pg_class where oid = 'public\.assinaturas_de_contas_excluidas'::regclass;/m)
    expect(sql).toMatch(/^-- select count\(\*\) from pg_constraint where conrelid = 'public\.assinaturas_historico'::regclass and contype = 'f';/m)
    expect(sql).toMatch(/^-- select pg_get_constraintdef\(oid\) from pg_constraint where conname = 'chamadas_da_cobranca_tipo_check';/m)
  })
})
