// SQL direto no banco do Supabase LOCAL, para conferir o que a API não mostra: os agendamentos, o cofre e um
// arquivo do supabase/ rodado de novo (spec seguranca-lote-5). Entra pelo psql de dentro do contêiner do banco
// local, como "postgres" (o mesmo papel do SQL Editor), igual ao scripts/testes-de-ataque.mjs.
//
// CB-129: a URL da API é conferida antes (ambienteLocal), e o contêiner tem de ser um do Supabase local.
import { spawnSync } from 'node:child_process'
import { ambienteLocal } from './local.ts'

export interface RespostaDoBanco {
  readonly ok: boolean
  /** As linhas, sem cabeçalho, com as colunas separadas por "|". */
  readonly saida: string
  readonly erro: string
}

function conteinerLocal(env: Readonly<Record<string, string | undefined>>): string {
  ambienteLocal(env)
  const conteiner = env['ATAQUE_CONTEINER_DO_BANCO'] ?? ''
  if (!/^supabase_db_[a-z0-9-]+$/.test(conteiner)) {
    throw new Error(`RECUSADO: o contêiner do banco local veio errado ("${conteiner}"). Rode pelo npm run test:seguranca.`)
  }
  return conteiner
}

export function sqlNoBancoLocal(sql: string, env: Readonly<Record<string, string | undefined>> = process.env): RespostaDoBanco {
  const r = spawnSync(
    'docker',
    ['exec', '-i', '-e', 'PGPASSWORD=postgres', '-e', 'PGOPTIONS=-c client_min_messages=warning', conteinerLocal(env),
      'psql', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', '-t', '-A', '-f', '-'],
    { input: sql, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  )
  return { ok: r.status === 0, saida: (r.stdout ?? '').trim(), erro: (r.stderr ?? '').trim() }
}
