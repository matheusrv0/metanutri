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
})
