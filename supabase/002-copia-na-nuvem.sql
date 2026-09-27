-- MetaNutri — cópia dos dados na nuvem, para trocar de aparelho.
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run.
--
-- Uma linha por nutricionista, com o backup inteiro dentro. Não é sincronização
-- automática de propósito: mesclar dois aparelhos sem o usuário ver é como se
-- perde plano de paciente. Aqui quem manda é o botão — enviar ou baixar, sempre
-- explícito, sempre dizendo o que vai acontecer.

create table if not exists public.copias (
  nutricionista_id uuid primary key references auth.users (id) on delete cascade,
  dados jsonb not null,
  aparelho text not null default '',
  atualizado_em timestamptz not null default now()
);

alter table public.copias enable row level security;

-- Cada um só enxerga a própria cópia. Não existe política para anônimo.
drop policy if exists "dono le a copia" on public.copias;
create policy "dono le a copia" on public.copias
  for select to authenticated using (auth.uid() = nutricionista_id);

drop policy if exists "dono envia a copia" on public.copias;
create policy "dono envia a copia" on public.copias
  for insert to authenticated with check (auth.uid() = nutricionista_id);

drop policy if exists "dono atualiza a copia" on public.copias;
create policy "dono atualiza a copia" on public.copias
  for update to authenticated using (auth.uid() = nutricionista_id) with check (auth.uid() = nutricionista_id);

drop policy if exists "dono apaga a copia" on public.copias;
create policy "dono apaga a copia" on public.copias
  for delete to authenticated using (auth.uid() = nutricionista_id);
