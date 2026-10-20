// Testes de ataque contra um Supabase LOCAL (spec seguranca-lote-4, D-136, CA-488, CA-489 e CB-129).
// Uso: npm run test:seguranca
//
// O que faz, na ordem:
//   1. confere o Docker e o Supabase CLI; sem eles, diz o que falta e para (código 2);
//   2. sobe um Supabase local novo, só deste teste (testes/supabase-local), com os dados zerados;
//   3. lê a URL e as chaves locais e RECUSA tudo que não seja 127.0.0.1 ou localhost (código 3);
//   4. aplica supabase/001 a 011, na ordem, no banco local;
//   5. roda os ataques (testes/seguranca) com duas contas e um administrador de teste;
//   6. derruba a pilha local e apaga os dados, mesmo se algo falhar.
//
// Nunca fala com a produção: não lê o .env.local, não usa --linked nem --project-ref, e a URL é conferida
// aqui e de novo dentro dos testes, antes de qualquer pedido.
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
/** Caminho relativo à raiz, sem espaço: o npx do Windows passa pelo shell. */
const PASTA_LOCAL = 'testes/supabase-local'
/** DP-A1: versão fixa do CLI, para o teste não mudar sozinho. */
const CLI = 'supabase@2.120.0'
/** O project_id de testes/supabase-local/supabase/config.toml; o contêiner do banco leva este nome. */
const CONTEINER_DO_BANCO = 'supabase_db_metanutri-ataques'
/** Só sobem o banco, o login, a API de tabelas, o armazenamento e a porta de entrada. */
const DESLIGADOS = 'realtime,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'
const HOSTS_LOCAIS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])

const NO_WINDOWS = process.platform === 'win32'

/**
 * O ambiente de todo comando daqui (CLI, Docker e testes): sem nenhuma variável de Supabase, Mercado Pago ou
 * Cloudflare desta máquina. Assim nem o CLI acha uma chave ou um projeto de verdade para usar.
 */
const AMBIENTE_LIMPO = Object.fromEntries(Object.entries(process.env).filter(([chave]) => !/SUPABASE|MERCADOPAGO|TURNSTILE/i.test(chave)))

function rodar(comando, args, opcoes = {}) {
  return spawnSync(comando, args, {
    cwd: RAIZ,
    encoding: 'utf8',
    shell: opcoes.shell ?? false,
    input: opcoes.input,
    env: opcoes.env ?? AMBIENTE_LIMPO,
    stdio: opcoes.herdar ? 'inherit' : 'pipe',
    maxBuffer: 64 * 1024 * 1024,
  })
}

const supabase = (args, opcoes = {}) => rodar('npx', ['--yes', CLI, ...args, '--workdir', PASTA_LOCAL], { ...opcoes, shell: NO_WINDOWS })

function avisar(linhas) {
  console.error(['', ...linhas.map((l) => `  ${l}`), ''].join('\n'))
}

function faltando(linhas) {
  avisar(['Os testes de ataque com banco NÃO rodaram.', ...linhas, 'Nada foi enviado para a produção.'])
  process.exit(2)
}

/** Só 127.0.0.1 ou localhost; qualquer outro endereço (a produção, por exemplo) é recusado. */
function ehUrlLocal(texto) {
  try {
    return HOSTS_LOCAIS.has(new URL(texto).hostname)
  } catch {
    return false
  }
}

function lerStatus() {
  const r = supabase(['status', '-o', 'json'])
  const saida = r.stdout ?? ''
  const inicio = saida.indexOf('{')
  const fim = saida.lastIndexOf('}')
  if (r.status !== 0 || inicio < 0 || fim < inicio) return null
  try {
    return JSON.parse(saida.slice(inicio, fim + 1))
  } catch {
    return null
  }
}

/** A pilha deste projeto pode estar no ar (subindo, rodando): o Ctrl+C precisa derrubar. */
let pilhaNoAr = false

function derrubar() {
  supabase(['stop', '--no-backup'])
  pilhaNoAr = false
}

// Ctrl+C no meio: derruba a pilha local e apaga os dados antes de sair.
process.on('SIGINT', () => {
  if (pilhaNoAr) {
    console.error('\nInterrompido: derrubando o Supabase local e apagando os dados de teste...')
    derrubar()
  }
  process.exit(130)
})

function aplicarMigracoes() {
  const arquivos = readdirSync(join(RAIZ, 'supabase'))
    .filter((nome) => /^\d{3}-[a-z0-9-]+\.sql$/.test(nome))
    .sort()
  if (arquivos.length === 0) throw new Error('Nenhuma migração em supabase/.')
  for (const nome of arquivos) {
    const sql = readFileSync(join(RAIZ, 'supabase', nome), 'utf8')
    // O psql de dentro do contêiner do banco local, como "postgres": o mesmo papel do SQL Editor.
    const r = rodar(
      'docker',
      ['exec', '-i', '-e', 'PGPASSWORD=postgres', '-e', 'PGOPTIONS=-c client_min_messages=warning', CONTEINER_DO_BANCO,
        'psql', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', '-f', '-'],
      { input: sql },
    )
    if (r.status !== 0) throw new Error(`A migração ${nome} falhou no banco local:\n${r.stderr || r.stdout}`)
    console.log(`  migração aplicada: ${nome}`)
  }
}

/**
 * O ambiente dos testes: o limpo, mais as chaves do Supabase local e o contêiner do banco local, para as
 * conferências que a API não mostra (agendamentos, cofre; spec seguranca-lote-5).
 */
function ambienteDosTestes(status) {
  return {
    ...AMBIENTE_LIMPO,
    ATAQUE_API_URL: status.API_URL,
    ATAQUE_ANON_KEY: status.ANON_KEY,
    ATAQUE_SERVICE_KEY: status.SERVICE_ROLE_KEY,
    ATAQUE_CONTEINER_DO_BANCO: CONTEINER_DO_BANCO,
  }
}

function principal() {
  console.log('Testes de ataque (spec seguranca-lote-4): Supabase local, nunca a produção.\n')

  const docker = rodar('docker', ['info', '--format', '{{.ServerVersion}}'])
  if (docker.error) faltando(['Falta o Docker: instale o Docker Desktop e rode de novo.'])
  if (docker.status !== 0) faltando(['O Docker não está rodando: abra o Docker Desktop, espere ele ficar pronto e rode de novo.'])

  const cli = supabase(['--version'])
  if (cli.status !== 0) {
    faltando([`Não consegui rodar o Supabase CLI (npx ${CLI}).`, 'Na primeira vez ele precisa de internet para baixar.'])
  }

  // DP-A2: sempre uma pilha nova; uma que sobrou de outra rodada é derrubada com os dados.
  derrubar()
  console.log('Subindo o Supabase local (na primeira vez as imagens são baixadas, pode demorar)...')
  pilhaNoAr = true
  const subida = supabase(['start', '-x', DESLIGADOS], { herdar: true })
  if (subida.status !== 0) {
    derrubar()
    faltando(['Não consegui subir o Supabase local.', 'Confira a internet (para baixar as imagens) e o espaço em disco do Docker.'])
  }

  try {
    const status = lerStatus()
    if (!status || typeof status.API_URL !== 'string' || typeof status.DB_URL !== 'string' || !status.ANON_KEY || !status.SERVICE_ROLE_KEY) {
      avisar(['Os testes de ataque com banco NÃO rodaram.', 'Não consegui ler a URL e as chaves do Supabase local (supabase status).'])
      return 2
    }
    if (!ehUrlLocal(status.API_URL) || !ehUrlLocal(status.DB_URL)) {
      avisar(['RECUSADO: o Supabase destes testes não é local.', `API: ${status.API_URL}`, 'Os testes de ataque só rodam em 127.0.0.1 ou localhost.'])
      return 3
    }
    aplicarMigracoes()
    console.log(`\nAtacando ${status.API_URL} ...\n`)
    const testes = rodar(
      process.execPath,
      [join(RAIZ, 'node_modules', 'vitest', 'vitest.mjs'), 'run', '--config', 'testes/seguranca/vitest.config.ts'],
      { herdar: true, env: ambienteDosTestes(status) },
    )
    return testes.status === 0 ? 0 : 1
  } catch (erro) {
    avisar([erro instanceof Error ? erro.message : String(erro)])
    return 1
  } finally {
    console.log('\nDerrubando o Supabase local e apagando os dados de teste...')
    derrubar()
  }
}

process.exit(principal())
