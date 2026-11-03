// @vitest-environment node
// O que o código das funções de e-mail nunca faz (spec lado-do-paciente, D-1233, D-1238, D-1242): a chave do Resend só no
// ambiente da função, nunca no app; nenhuma chamada a Contatos, Segmentos ou Broadcasts; o servidor nem lê a mensagem
// da nutricionista. Conferido no texto dos arquivos, como os outros testes de ligação do servidor.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const RAIZ = join(__dirname, '..', '..')

function arquivos(pasta: string, filtro: (caminho: string) => boolean): string[] {
  const achados: string[] = []
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome)
    if (statSync(caminho).isDirectory()) achados.push(...arquivos(caminho, filtro))
    else if (filtro(caminho)) achados.push(caminho)
  }
  return achados
}

const FUNCOES = arquivos(join(RAIZ, 'supabase', 'functions'), (c) => c.endsWith('.ts'))
const DOS_AVISOS = FUNCOES.filter((c) => /[\\/](_shared[\\/]avisos|meu-link|avisos-resposta|enviar-link|webhook-resend|avisos)[\\/]/.test(c))
const DO_APP = arquivos(join(RAIZ, 'src'), (c) => /\.(ts|tsx)$/.test(c) && !/\.test(-utils)?\.(ts|tsx)$/.test(c))
const texto = (caminho: string) => readFileSync(caminho, 'utf8')

describe('a chave do Resend (CA-2282)', () => {
  it('CA-2282: a chave do Resend só é lida do ambiente da função, e nunca aparece no app', () => {
    const leem = DOS_AVISOS.filter((c) => texto(c).includes("'RESEND_API_KEY'")).map((c) => relative(RAIZ, c).replace(/\\/g, '/'))
    expect(leem).toEqual(['supabase/functions/_shared/avisos/ambiente.ts'])
    expect(texto(join(RAIZ, 'supabase/functions/_shared/avisos/ambiente.ts'))).toContain("ler('RESEND_API_KEY')")
    for (const c of DO_APP) expect(texto(c), relative(RAIZ, c)).not.toMatch(/RESEND_API_KEY|api\.resend\.com|\bre_[A-Za-z0-9]{8,}/)
  })

  it('CA-2279: o remetente padrão é o do subdomínio dos avisos', () => {
    // A ligação importa o supabase-js pelo npm: (só o Deno resolve): o texto é conferido, como em servidorLigacao.test.ts.
    expect(texto(join(RAIZ, 'supabase/functions/_shared/avisos/ambiente.ts'))).toContain("export const REMETENTE_PADRAO = 'avisos@avisos.metanutri.com.br'")
  })
})

describe('o e-mail do paciente nunca vai para Contatos nem para marketing (D-1242, CA-2283)', () => {
  it('CA-2283: nenhuma chamada a Contatos, Segmentos, Audiências ou Broadcasts do Resend', () => {
    for (const c of FUNCOES) expect(texto(c), relative(RAIZ, c)).not.toMatch(/\/(contacts|audiences|segments|broadcasts)\b/)
  })

  it('CA-2283: as funções só chamam o envio do Resend (/emails/batch)', () => {
    const chamadas = DOS_AVISOS.flatMap((c) => [...texto(c).matchAll(/API_DO_RESEND\}([^`'"]*)/g)].map((m) => m[1]))
    expect([...new Set(chamadas)]).toEqual(['/emails/batch'])
  })
})

describe('o que o e-mail nunca leva (D-1233)', () => {
  it('CA-2213: o servidor dos e-mails não lê a mensagem, a dieta nem a próxima consulta do link', () => {
    const ligacao = texto(join(RAIZ, 'supabase/functions/_shared/avisos/bancoDosAvisosSupabase.ts'))
    const colunas = /const COLUNAS_DO_LINK = '([^']+)'/.exec(ligacao)?.[1] ?? ''
    expect(colunas).toContain('marcacoes')
    for (const proibida of ['mensagem', 'dieta', 'proxima_consulta', 'paciente_id', 'caso_id']) expect(colunas.split(/,\s*/)).not.toContain(proibida)
  })

  it('CA-2280: nenhuma função de e-mail monta imagem ou pixel', () => {
    for (const c of DOS_AVISOS) expect(texto(c), relative(RAIZ, c)).not.toMatch(/<img|tracking|open_tracking|click_tracking/i)
  })
})
