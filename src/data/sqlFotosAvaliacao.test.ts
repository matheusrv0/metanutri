// Spec antropometria-telas: o texto do 018 (D-1457, D-1504; CA-2488). O comportamento no banco de verdade está em
// testes/seguranca/fotos.test.ts (npm run test:seguranca, Supabase local).
import sql from '../../supabase/018-fotos-avaliacao.sql?raw'
import { ANEXOS_POR_AVALIACAO, BALDE_DAS_FOTOS, FOTOS_POR_AVALIACAO, TETO_DA_AVALIACAO } from '@/domain/fotosDaAvaliacao.ts'

const semComentarios = sql
  .split('\n')
  .filter((linha) => !linha.trimStart().startsWith('--'))
  .join('\n')
/** O que roda direto quando o arquivo roda: o SQL sem comentários e sem o corpo das funções. */
const foraDasFuncoes = semComentarios.replace(/\$\$[\s\S]*?\$\$/g, '')
const funcao = semComentarios.split('create or replace function public.pode_enviar_arquivo_da_avaliacao(p_nome text)')[1]?.split('$$;')[0] ?? ''
const cabecalho = funcao.split('as $$')[0] ?? ''
const corpo = funcao.split('as $$')[1] ?? ''
/** A política pelo nome, do `create policy` até o `;`. */
const politica = (nome: string) => {
  const inicio = semComentarios.indexOf(`create policy "${nome}" on storage.objects`)
  return inicio < 0 ? '' : semComentarios.slice(inicio, semComentarios.indexOf(';', inicio))
}

describe('banco: as fotos e os anexos da avaliação (018, spec antropometria-telas)', () => {
  it('roda numa transação só e pode rodar de novo: nada é apagado', () => {
    expect(semComentarios.trim().startsWith('begin;')).toBe(true)
    expect(semComentarios.trim().endsWith('commit;')).toBe(true)
    expect(foraDasFuncoes).not.toMatch(/\b(drop table|truncate|delete from|drop column|drop function)\b/i)
    for (const nome of ['fotos da avaliacao: dono envia', 'fotos da avaliacao: dono le', 'fotos da avaliacao: dono apaga']) {
      const sai = semComentarios.indexOf(`drop policy if exists "${nome}" on storage.objects;`)
      expect(sai, nome).toBeGreaterThan(-1)
      expect(sai, nome).toBeLessThan(semComentarios.indexOf(`create policy "${nome}"`))
    }
  })

  it('D-1457: o balde é privado, até 8 MB por arquivo, só JPEG, PNG e PDF, e a nova rodada repõe isso', () => {
    expect(BALDE_DAS_FOTOS).toBe('fotos-avaliacao')
    expect(TETO_DA_AVALIACAO).toBe(8388608)
    expect(semComentarios).toContain(
      "values ('fotos-avaliacao', 'fotos-avaliacao', false, 8388608, array['image/jpeg', 'image/png', 'application/pdf'])",
    )
    expect(semComentarios).toContain('on conflict (id) do update\n  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;')
  })

  it('CA-2488: cada conta envia, lê e apaga só na própria pasta; ninguém altera nem move; anônimo nada', () => {
    const envia = politica('fotos da avaliacao: dono envia')
    expect(envia).toContain('for insert to authenticated')
    expect(envia).toContain("bucket_id = 'fotos-avaliacao'")
    expect(envia).toContain('(storage.foldername(name))[1] = auth.uid()::text')
    expect(envia).toContain('public.pode_enviar_arquivo_da_avaliacao(name)')
    for (const [nome, acao] of [
      ['fotos da avaliacao: dono le', 'for select to authenticated'],
      ['fotos da avaliacao: dono apaga', 'for delete to authenticated'],
    ] as const) {
      const p = politica(nome)
      expect(p, nome).toContain(acao)
      expect(p, nome).toContain("using (bucket_id = 'fotos-avaliacao' and (storage.foldername(name))[1] = auth.uid()::text)")
    }
    // D-1504: sem política de alteração, nem upsert nem mover passam; nenhuma política fala com anon.
    expect(semComentarios).not.toMatch(/for update[^;]*fotos-avaliacao/)
    expect(semComentarios).not.toMatch(/to anon/)
  })

  it('D-1504: a função confere o caminho inteiro, trava a pasta da conta e só depois conta', () => {
    expect(cabecalho).toMatch(/returns boolean\s+language plpgsql\s+volatile\s+security definer\s+set search_path = public/)
    expect(corpo).toContain('v_conta text := auth.uid()::text;')
    expect(corpo).toContain('if v_conta is null or p_nome is null then')
    const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    expect(corpo).toContain(`'^' || v_conta || '/[A-Za-z0-9_-]{1,64}/(fotos/${uuid}\\.jpg|anexos/${uuid}\\.(pdf|jpg|png))$'`)
    const trava = corpo.indexOf("perform pg_advisory_xact_lock(hashtext('fotos-avaliacao:' || v_conta));")
    expect(trava).toBeGreaterThan(-1)
    expect(trava).toBeLessThan(corpo.indexOf('select count(*)'))
    expect(corpo).toContain('if v_na_conta >= 2000 then')
    expect(corpo).toContain(`when 'fotos' then ${FOTOS_POR_AVALIACAO}`)
    expect(corpo).toContain(`else ${ANEXOS_POR_AVALIACAO}`)
    // O nome do plano pode ter "_", que no like é coringa: a pasta é conferida pelo começo exato do nome.
    expect(corpo).not.toMatch(/\blike\b/)
    expect(corpo).toContain('starts_with(o.name, v_pasta)')
  })

  it('a função só para quem tem conta', () => {
    expect(semComentarios).toContain('revoke all on function public.pode_enviar_arquivo_da_avaliacao(text) from public, anon;')
    expect(semComentarios).toContain('grant execute on function public.pode_enviar_arquivo_da_avaliacao(text) to authenticated;')
  })

  it('o cabeçalho diz como rodar, a ordem e o que conferir depois', () => {
    expect(sql).toContain('-- Rode DEPOIS do 001 ao 015')
    expect(sql).toContain('-- Conferência depois de rodar')
    expect(sql).toContain("-- select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'fotos-avaliacao';")
  })
})
