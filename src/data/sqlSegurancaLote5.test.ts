// O 014 (spec seguranca-lote-5) conferido pelo texto. O comportamento no banco de verdade é atacado no
// Supabase local (testes/seguranca/segundoFator.test.ts e limpeza.test.ts, `npm run test:seguranca`).
import sql from '../../supabase/014-seguranca-lote-5.sql?raw'

/** O SQL sem os comentários de linha (o cabeçalho traz, em comentário, a versão antiga do eh_admin). */
const semComentarios = sql
  .split('\n')
  .filter((linha) => !linha.trimStart().startsWith('--'))
  .join('\n')
const corpoDa = (nome: string) => semComentarios.split(`create or replace function public.${nome}(`)[1]?.split('$$;')[0] ?? ''
/** O que roda direto quando o arquivo roda: o SQL sem comentários e sem o corpo das funções e dos blocos. */
const foraDasFuncoes = semComentarios.replace(/\$\$[\s\S]*?\$\$/g, '')

describe('banco: segurança, lote 5 (014)', () => {
  it('roda numa transação só, e pode rodar de novo: nada é apagado', () => {
    expect(semComentarios.trim().startsWith('begin;')).toBe(true)
    expect(semComentarios.trim().endsWith('commit;')).toBe(true)
    expect(foraDasFuncoes).not.toMatch(/\b(drop table|drop function|truncate|delete from)\b/i)
  })

  describe('D-262 e CA-841: a trava contra ficar trancado do lado de fora', () => {
    it('vem antes de qualquer mudança e para se algum administrador não tem o app confirmado', () => {
      const trava = semComentarios.indexOf("raise exception 'Antes de rodar este arquivo, cada administrador precisa ativar a verificação em duas etapas no site (Aprovações). Nada foi mudado.'")
      expect(trava).toBeGreaterThan(-1)
      expect(trava).toBeLessThan(semComentarios.indexOf('create or replace function'))
      const bloco = semComentarios.slice(semComentarios.indexOf('do $$'), trava)
      expect(bloco).toContain('from public.administradores a')
      expect(bloco).toContain("f.user_id = a.usuario and f.factor_type = 'totp' and f.status = 'verified'")
    })

    it('CB-261: o comentário ensina a apagar o fator perdido e a desfazer o lote', () => {
      expect(sql).toContain("-- delete from auth.mfa_factors where user_id = (select id from auth.users where email = 'seu-email@exemplo.com');")
      expect(sql).toContain('-- create or replace function public.eh_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.administradores where usuario = auth.uid()); $$;')
    })
  })

  describe('D-260: o administrador só com o código do app', () => {
    it('CA-830 a CA-832: eh_admin exige a sessão aal2 e a conta na tabela de administradores', () => {
      const corpo = corpoDa('eh_admin')
      expect(corpo).toContain("coalesce(auth.jwt() ->> 'aal', '') = 'aal2'")
      expect(corpo).toContain('exists (select 1 from public.administradores where usuario = auth.uid())')
      expect(semComentarios).toMatch(/create or replace function public\.eh_admin\(\)\s+returns boolean\s+language sql\s+stable\s+security definer\s+set search_path = public/)
    })

    it('CA-834: admin_sem_segundo_fator diz sim só para administrador fora do aal2, e só para quem está logado', () => {
      const corpo = corpoDa('admin_sem_segundo_fator')
      expect(corpo).toContain("coalesce(auth.jwt() ->> 'aal', '') <> 'aal2'")
      expect(corpo).toContain('exists (select 1 from public.administradores where usuario = auth.uid())')
      expect(sql).toContain('revoke execute on function public.admin_sem_segundo_fator() from public, anon;')
      expect(sql).toContain('grant execute on function public.admin_sem_segundo_fator() to authenticated;')
    })

    it('eh_admin continua só para quem está logado (as regras de leitura a usam)', () => {
      expect(sql).toContain('revoke execute on function public.eh_admin() from public, anon;')
      expect(sql).toContain('grant execute on function public.eh_admin() to authenticated;')
    })
  })

  describe('D-263 e D-264: a limpeza dos comprovantes pelo servidor', () => {
    const SO_SERVIDOR = [
      'public.comprovantes_vencidos(timestamptz, integer)',
      'public.anotar_comprovantes_apagados(text[])',
      'public.conferir_chave_da_limpeza(text)',
    ]

    it('a trava do administrador vem antes das extensões e do agendamento', () => {
      const trava = semComentarios.indexOf('Nada foi mudado.')
      expect(trava).toBeLessThan(semComentarios.indexOf('create extension'))
      expect(trava).toBeLessThan(semComentarios.indexOf('cron.schedule('))
    })

    it('CA-843 a CA-845: vencido é o arquivo 30 dias depois da decisão, ou o arquivo sem pedido 1 dia depois de enviado', () => {
      const corpo = corpoDa('comprovantes_vencidos')
      expect(corpo).toContain("where p.arquivo is not null and p.decidido_em < p_agora - interval '30 days'")
      expect(corpo).toContain("where o.bucket_id = 'comprovantes' and o.created_at < p_agora - interval '1 day'")
      expect(corpo).toContain('and not exists (select 1 from public.pedidos_estudante p where p.arquivo = o.name)')
      expect(semComentarios).toContain('create or replace function public.comprovantes_vencidos(p_agora timestamptz default now(), p_limite integer default 1000)')
    })

    it('CB-265: no máximo 1000 por rodada, mesmo que peçam mais', () => {
      expect(corpoDa('comprovantes_vencidos')).toContain('limit least(greatest(coalesce(p_limite, 1000), 0), 1000)')
    })

    it('CA-849 e CB-266: só fica sem arquivo o pedido cujo arquivo já saiu do armazenamento', () => {
      const corpo = corpoDa('anotar_comprovantes_apagados')
      expect(corpo).toContain('update public.pedidos_estudante p set arquivo = null')
      expect(corpo).toContain("and not exists (select 1 from storage.objects o where o.bucket_id = 'comprovantes' and o.name = p.arquivo)")
      expect(corpo).toContain('get diagnostics v_marcados = row_count;')
    })

    it('CA-847 e DP-L5-5: a chave nasce no banco, no cofre, só se ainda não existe, e a conferência pede o valor inteiro', () => {
      expect(semComentarios).toContain("if not exists (select 1 from vault.secrets where name = 'metanutri_chave_da_limpeza') then")
      expect(semComentarios).toContain("perform vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'metanutri_chave_da_limpeza'")
      const corpo = corpoDa('conferir_chave_da_limpeza')
      expect(corpo).toContain('coalesce(length(p_chave), 0) >= 32')
      expect(corpo).toContain("where s.name = 'metanutri_chave_da_limpeza' and s.decrypted_secret = p_chave")
    })

    it('CA-846: o pedido da limpeza leva a chave no cabeçalho e não faz nada sem o endereço do projeto', () => {
      const corpo = corpoDa('pedir_limpeza_dos_comprovantes')
      expect(corpo).toContain("select decrypted_secret into v_url from vault.decrypted_secrets where name = 'metanutri_url_do_projeto';")
      expect(corpo).toContain("if coalesce(v_url, '') = '' or coalesce(v_chave, '') = '' then\n    return null;")
      expect(corpo).toContain("url := rtrim(v_url, '/') || '/functions/v1/limpar-comprovantes'")
      expect(corpo).toContain("headers := jsonb_build_object('Content-Type', 'application/json', 'x-chave-da-limpeza', v_chave)")
    })

    it('CA-846: pg_cron e pg_net ligados, e o agendamento diário às 06:15 UTC, pelo nome (rodar de novo só atualiza)', () => {
      expect(semComentarios).toContain('create extension if not exists pg_cron with schema pg_catalog;')
      expect(semComentarios).toContain('create extension if not exists pg_net with schema extensions;')
      expect(semComentarios).toContain("select cron.schedule('metanutri-limpar-comprovantes', '15 6 * * *', 'select public.pedir_limpeza_dos_comprovantes();');")
    })

    it('CA-850: as funções novas da limpeza só o servidor executa; pedir a limpeza, só o agendamento (dono das funções)', () => {
      for (const assinatura of SO_SERVIDOR) {
        expect(sql).toContain(`revoke all on function ${assinatura} from public, anon, authenticated;`)
        expect(sql).toContain(`grant execute on function ${assinatura} to service_role;`)
      }
      expect(sql).toContain('revoke all on function public.pedir_limpeza_dos_comprovantes() from public, anon, authenticated, service_role;')
      expect(sql).not.toMatch(/grant execute on function public\.pedir_limpeza_dos_comprovantes\(\)/)
    })

    it('DP-L5-7: as funções do administrador continuam conferindo eh_admin primeiro e usam as regras novas', () => {
      const lista = corpoDa('comprovantes_para_apagar')
      expect(lista).toMatch(/begin\s+if not public\.eh_admin\(\) then raise exception 'Só o administrador apaga comprovantes\.' using errcode = '42501'; end if;/)
      expect(lista).toContain('return query select v.caminho from public.comprovantes_vencidos(now(), 1000) v;')
      const marcar = corpoDa('marcar_comprovantes_apagados')
      expect(marcar).toMatch(/begin\s+if not public\.eh_admin\(\) then raise exception 'Só o administrador apaga comprovantes\.' using errcode = '42501'; end if;/)
      expect(marcar).toContain('perform public.anotar_comprovantes_apagados(p_caminhos);')
    })

    it('as funções do banco que leem o cofre ou o armazenamento rodam como o dono e com o caminho fixo', () => {
      for (const nome of ['comprovantes_vencidos', 'anotar_comprovantes_apagados', 'conferir_chave_da_limpeza', 'pedir_limpeza_dos_comprovantes']) {
        const cabecalho = semComentarios.split(`create or replace function public.${nome}(`)[1]?.split('as $$')[0] ?? ''
        expect(cabecalho, nome).toContain('security definer')
        expect(cabecalho, nome).toContain('set search_path = public')
      }
    })

    it('as consultas de conferência do fim cobrem o agendamento, a chave e as permissões', () => {
      const conferencia = sql.slice(sql.lastIndexOf('commit;'))
      expect(conferencia).toContain("from cron.job where jobname = 'metanutri-limpar-comprovantes'")
      expect(conferencia).toContain("from vault.secrets where name in ('metanutri_chave_da_limpeza', 'metanutri_url_do_projeto')")
      expect(conferencia).toContain("has_function_privilege('authenticated', 'public.comprovantes_vencidos(timestamptz, integer)', 'execute')")
    })
  })
})
