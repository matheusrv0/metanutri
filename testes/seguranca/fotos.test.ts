// CA-2488 (spec antropometria-telas, D-1457 e D-1504): o balde das fotos e dos anexos da avaliação no Supabase LOCAL.
// A dona envia, lê, assina e apaga na própria pasta; outra conta e quem não tem conta não fazem nada na pasta dela; o
// servidor recusa o tipo, o tamanho, o caminho fora do formato, a 6ª foto, o 11º anexo e a conta com 2.000 arquivos,
// também com duas abas enviando juntas; e soma os bytes: 8 MB por plano e 500 MB por conta (D-1531, CB-1468).
import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { sqlNoBancoLocal } from './bancoLocal.ts'
import { negadoOuVazio, prepararCenario, recusado, type Cenario } from './preparo.ts'

const BALDE = 'fotos-avaliacao'
const PLANO = 'plano-da-vitima'

let c: Cenario
let foto: string
let fotoDaVitima: string
let anexoDaVitima: string

/** Um JPEG pequeno (só o começo e o fim: o servidor não abre a imagem, confere o tipo dito e o tamanho). */
const jpeg = (texto = 'foto'): Blob => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), new TextEncoder().encode(texto), new Uint8Array([0xff, 0xd9])], { type: 'image/jpeg' })
const pdf = (texto = 'exame'): Blob => new Blob([new TextEncoder().encode(`%PDF-1.4\n% ${texto}\n%%EOF\n`)], { type: 'application/pdf' })
const caminhoDaFoto = (conta: string, plano = PLANO) => `${conta}/${plano}/fotos/${randomUUID()}.jpg`
const caminhoDoAnexo = (conta: string, plano = PLANO, ext = 'pdf') => `${conta}/${plano}/anexos/${randomUUID()}.${ext}`
const balde = (cliente: SupabaseClient) => cliente.storage.from(BALDE)

/** Todos os nomes do balde que começam pela pasta, lidos pelo banco (a lista do armazenamento não entra em subpasta). */
function nomesNoBanco(pasta: string): string[] {
  const r = sqlNoBancoLocal(`select name from storage.objects where bucket_id = '${BALDE}' and starts_with(name, '${pasta}/') order by name;`)
  if (!r.ok) throw new Error(r.erro)
  return r.saida ? r.saida.split('\n') : []
}

/** A soma de `metadata->>'size'` dos arquivos da pasta, lida pelo banco. */
function bytesNoBanco(pasta: string): number {
  const r = sqlNoBancoLocal(`select coalesce(sum((metadata->>'size')::bigint), 0) from storage.objects where bucket_id = '${BALDE}' and starts_with(name, '${pasta}/');`)
  if (!r.ok) throw new Error(r.erro)
  return Number(r.saida)
}

const MB = 1024 * 1024
/** Um JPEG e um PDF com o tamanho pedido (o começo certo e zeros: o servidor confere o tipo dito e o tamanho). */
const jpegDe = (bytes: number): Blob => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), new Uint8Array(bytes - 6), new Uint8Array([0xff, 0xd9])], { type: 'image/jpeg' })
const pdfDe = (bytes: number): Blob => new Blob([new TextEncoder().encode('%PDF-1.4\n'), new Uint8Array(bytes - 9)], { type: 'application/pdf' })

async function enviar(cliente: SupabaseClient, caminho: string, arquivo: Blob = jpeg()) {
  return balde(cliente).upload(caminho, arquivo, { contentType: arquivo.type, upsert: false })
}

/** A pasta da vítima neste balde, com o conteúdo de cada arquivo: igual antes e depois = o ataque não mudou nada. */
async function fotografarFotos(): Promise<string> {
  const nomes = nomesNoBanco(c.vitima.id)
  const conteudos: string[] = []
  for (const nome of nomes) {
    const r = await balde(c.servico).download(nome)
    conteudos.push(`${nome}:${r.data ? await r.data.text() : 'sem arquivo'}`)
  }
  const b = await c.servico.storage.getBucket(BALDE)
  return JSON.stringify({ conteudos, publico: b.data?.public, tipos: b.data?.allowed_mime_types, limite: b.data?.file_size_limit })
}

beforeAll(async () => {
  c = await prepararCenario()
  fotoDaVitima = caminhoDaFoto(c.vitima.id)
  anexoDaVitima = caminhoDoAnexo(c.vitima.id)
  expect((await enviar(c.vitima.cliente, fotoDaVitima, jpeg(`foto ${c.marcador}`))).error).toBeNull()
  expect((await enviar(c.vitima.cliente, anexoDaVitima, pdf(c.marcador))).error).toBeNull()
  foto = await fotografarFotos()
})

describe('controle: a dona usa a própria pasta (CA-2488)', () => {
  it('CA-2488: envia, lê, lista, assina e apaga na própria pasta', async () => {
    const baixado = await balde(c.vitima.cliente).download(fotoDaVitima)
    expect(baixado.error).toBeNull()
    expect(await baixado.data?.text()).toContain(c.marcador)
    const lista = await balde(c.vitima.cliente).list(`${c.vitima.id}/${PLANO}/fotos`)
    expect(lista.error).toBeNull()
    expect((lista.data ?? []).length).toBe(1)
    const link = await balde(c.vitima.cliente).createSignedUrl(fotoDaVitima, 600)
    expect(link.error).toBeNull()
    const pelaUrl = await fetch(link.data?.signedUrl ?? '')
    expect(pelaUrl.ok).toBe(true)

    const outra = caminhoDaFoto(c.vitima.id, 'plano-de-apagar')
    expect((await enviar(c.vitima.cliente, outra)).error).toBeNull()
    expect((await balde(c.vitima.cliente).remove([outra])).error).toBeNull()
    expect(nomesNoBanco(`${c.vitima.id}/plano-de-apagar`)).toEqual([])
  })
})

describe('CA-2488: outra conta e quem não tem conta não mexem na pasta da dona', () => {
  afterEach(async () => {
    expect(await fotografarFotos(), 'o ataque mudou a pasta da vítima ou o balde').toBe(foto)
  })

  const quem = (): readonly SupabaseClient[] => [c.atacante.cliente, c.anonimo]

  it('CA-2488: não envia na pasta da dona', async () => {
    for (const cliente of quem()) {
      recusado(await enviar(cliente, caminhoDaFoto(c.vitima.id)))
      recusado(await enviar(cliente, caminhoDoAnexo(c.vitima.id), pdf()))
    }
  })

  it('CA-2488: não lê, não assina e não abre pelo endereço público', async () => {
    for (const cliente of quem()) {
      recusado(await balde(cliente).download(fotoDaVitima))
      recusado(await balde(cliente).createSignedUrl(fotoDaVitima, 600))
      const varios = await balde(cliente).createSignedUrls([fotoDaVitima, anexoDaVitima], 600)
      expect((varios.data ?? []).map((l) => l.signedUrl).filter((u) => typeof u === 'string' && u.length > 0)).toEqual([])
    }
    const publico = balde(c.anonimo).getPublicUrl(fotoDaVitima).data.publicUrl
    expect((await fetch(publico)).ok).toBe(false)
  })

  it('CA-2488: não lista a pasta da dona nem a raiz', async () => {
    for (const cliente of quem()) {
      negadoOuVazio(await balde(cliente).list(c.vitima.id))
      negadoOuVazio(await balde(cliente).list(`${c.vitima.id}/${PLANO}/fotos`))
      const raiz = await balde(cliente).list('', { limit: 1000 })
      expect(JSON.stringify(raiz.data ?? [])).not.toContain(c.vitima.id)
    }
  })

  it('CA-2488: não apaga, não sobrescreve, não move e não copia', async () => {
    for (const cliente of quem()) {
      negadoOuVazio(await balde(cliente).remove([fotoDaVitima, anexoDaVitima]))
      recusado(await balde(cliente).upload(fotoDaVitima, jpeg('trocada'), { contentType: 'image/jpeg', upsert: true }))
      recusado(await balde(cliente).update(fotoDaVitima, jpeg('trocada'), { contentType: 'image/jpeg' }))
    }
    recusado(await balde(c.atacante.cliente).move(fotoDaVitima, caminhoDaFoto(c.atacante.id)))
    recusado(await balde(c.atacante.cliente).copy(fotoDaVitima, caminhoDaFoto(c.atacante.id)))
    expect(nomesNoBanco(c.atacante.id)).toEqual([])
  })

  it('D-1504: nem a dona sobrescreve ou move a própria foto (sem política de alteração)', async () => {
    recusado(await balde(c.vitima.cliente).upload(fotoDaVitima, jpeg('trocada'), { contentType: 'image/jpeg', upsert: true }))
    recusado(await balde(c.vitima.cliente).move(fotoDaVitima, caminhoDaFoto(c.vitima.id)))
  })

  it('quem não tem conta não chama a função da política', async () => {
    recusado(await c.anonimo.rpc('pode_enviar_arquivo_da_avaliacao', { p_nome: caminhoDaFoto(c.vitima.id) }))
  })
})

describe('CA-2488: o servidor confere o arquivo e as contagens (D-1457, D-1504)', () => {
  it('CA-2488: tipo fora de JPEG e PDF é recusado', async () => {
    const plano = 'plano-tipos'
    recusado(await enviar(c.atacante.cliente, caminhoDaFoto(c.atacante.id, plano), new Blob(['GIF89a'], { type: 'image/gif' })))
    recusado(await enviar(c.atacante.cliente, caminhoDoAnexo(c.atacante.id, plano), new Blob(['<html>'], { type: 'text/html' })))
    expect(nomesNoBanco(`${c.atacante.id}/${plano}`)).toEqual([])
  })

  it('CB-1473 e D-1535: o tipo dito tem de ser o do caminho, exato: JPEG em fotos/, PDF em anexos/; o PNG não entra mais', async () => {
    const plano = 'plano-tipo-trocado'
    const id = c.atacante.id
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    const html = new TextEncoder().encode('<html><script>document.title="x"</script></html>')
    // Os bytes crus, com o tipo no cabeçalho do pedido como o atacante escrever (o Blob poria o tipo em minúsculas).
    const tentativas: readonly (readonly [string, Uint8Array, string])[] = [
      // O PNG, em qualquer pasta (D-1530: a imagem anexada vira foto, em JPEG).
      [caminhoDoAnexo(id, plano, 'png'), png, 'image/png'],
      [caminhoDaFoto(id, plano), png, 'image/png'],
      // A imagem em anexos/ (o caminho só aceita .pdf).
      [caminhoDoAnexo(id, plano, 'jpg'), html, 'image/jpeg'],
      // O tipo dito com maiúsculas ou com parâmetro.
      [caminhoDaFoto(id, plano), html, 'IMAGE/JPEG'],
      [caminhoDaFoto(id, plano), html, 'image/jpeg; charset=utf-8'],
      [caminhoDoAnexo(id, plano), html, 'APPLICATION/PDF'],
      // O tipo de uma pasta no caminho da outra.
      [caminhoDoAnexo(id, plano), html, 'image/jpeg'],
      [caminhoDaFoto(id, plano), html, 'application/pdf'],
    ]
    for (const [caminho, bytes, tipo] of tentativas) {
      recusado(await balde(c.atacante.cliente).upload(caminho, bytes, { contentType: tipo, upsert: false }))
    }
    expect(nomesNoBanco(`${id}/${plano}`)).toEqual([])
    // O certo continua passando.
    expect((await enviar(c.atacante.cliente, caminhoDaFoto(id, plano))).error).toBeNull()
    expect((await enviar(c.atacante.cliente, caminhoDoAnexo(id, plano), pdf())).error).toBeNull()
  })

  it('CA-2488: arquivo acima de 8 MB é recusado', async () => {
    const grande = new Blob([new Uint8Array(8 * 1024 * 1024 + 1)], { type: 'application/pdf' })
    recusado(await enviar(c.atacante.cliente, caminhoDoAnexo(c.atacante.id, 'plano-grande'), grande))
    expect(nomesNoBanco(`${c.atacante.id}/plano-grande`)).toEqual([])
  })

  it('D-1504: caminho fora do formato é recusado, mesmo na própria pasta', async () => {
    const id = c.atacante.id
    for (const caminho of [
      `${id}/foto.jpg`,
      `${id}/${PLANO}/fotos/nome-qualquer.jpg`,
      `${id}/${PLANO}/fotos/${randomUUID()}.png`,
      `${id}/${PLANO}/outra/${randomUUID()}.jpg`,
      `${id}/${PLANO}/anexos/${randomUUID()}.exe`,
      `${id}/${PLANO}/fotos/${randomUUID()}.jpg/mais`,
      `${id}/plano com espaço/fotos/${randomUUID()}.jpg`,
    ]) {
      recusado(await enviar(c.atacante.cliente, caminho))
    }
    expect(nomesNoBanco(`${id}/${PLANO}`)).toEqual([])
  })

  it('CA-2488: a 6ª foto e o 11º anexo de um plano são recusados; outro plano continua aceitando', async () => {
    const plano = 'plano-cheio'
    for (let i = 0; i < 5; i++) expect((await enviar(c.atacante.cliente, caminhoDaFoto(c.atacante.id, plano))).error).toBeNull()
    recusado(await enviar(c.atacante.cliente, caminhoDaFoto(c.atacante.id, plano)))
    for (let i = 0; i < 10; i++) expect((await enviar(c.atacante.cliente, caminhoDoAnexo(c.atacante.id, plano), pdf())).error).toBeNull()
    recusado(await enviar(c.atacante.cliente, caminhoDoAnexo(c.atacante.id, plano), pdf()))
    expect(nomesNoBanco(`${c.atacante.id}/${plano}/fotos`)).toHaveLength(5)
    expect(nomesNoBanco(`${c.atacante.id}/${plano}/anexos`)).toHaveLength(10)
    expect((await enviar(c.atacante.cliente, caminhoDaFoto(c.atacante.id, 'plano-vizinho'))).error).toBeNull()
  })

  it('CB-1416 e D-1504: oito envios ao mesmo tempo no mesmo plano: só 5 fotos ficam', async () => {
    const plano = 'plano-duas-abas'
    const respostas = await Promise.all(Array.from({ length: 8 }, () => enviar(c.atacante.cliente, caminhoDaFoto(c.atacante.id, plano))))
    expect(respostas.filter((r) => r.error === null)).toHaveLength(5)
    expect(nomesNoBanco(`${c.atacante.id}/${plano}/fotos`)).toHaveLength(5)
  })

  it('CB-1468 e D-1531: três arquivos de 3 MB ao mesmo tempo no mesmo plano, fotos e anexos: só 2 ficam', async () => {
    const plano = 'plano-tres-de-3mb'
    const id = c.atacante.id
    const respostas = await Promise.all([
      enviar(c.atacante.cliente, caminhoDaFoto(id, plano), jpegDe(3 * MB)),
      enviar(c.atacante.cliente, caminhoDoAnexo(id, plano), pdfDe(3 * MB)),
      enviar(c.atacante.cliente, caminhoDaFoto(id, plano), jpegDe(3 * MB)),
    ])
    expect(respostas.filter((r) => r.error === null)).toHaveLength(2)
    expect(nomesNoBanco(`${id}/${plano}`)).toHaveLength(2)
    expect(bytesNoBanco(`${id}/${plano}`)).toBe(6 * MB)
  })

  it('D-1531: 8 MB exatos no plano passam; mais um arquivo, mesmo pequeno, não', async () => {
    const plano = 'plano-8mb-exatos'
    const id = c.atacante.id
    expect((await enviar(c.atacante.cliente, caminhoDoAnexo(id, plano), pdfDe(4 * MB))).error).toBeNull()
    expect((await enviar(c.atacante.cliente, caminhoDaFoto(id, plano), jpegDe(4 * MB))).error).toBeNull()
    recusado(await enviar(c.atacante.cliente, caminhoDaFoto(id, plano)))
    recusado(await enviar(c.atacante.cliente, caminhoDoAnexo(id, plano), pdf()))
    expect(nomesNoBanco(`${id}/${plano}`)).toHaveLength(2)
    expect(bytesNoBanco(`${id}/${plano}`)).toBe(8 * MB)
  })

  it('CB-1468 e D-1531: a conta que soma 500 MB tem o próximo arquivo recusado, em qualquer plano', async () => {
    const id = c.atacante.id
    // Linhas de mentira (sem arquivo), postas pelo banco, até a conta somar 500 MB: 8 MB em cada plano (o teto do plano
    // vale também para elas) e o resto no último. O gatilho só soma o que o banco diz.
    const faltam = 500 * MB - bytesNoBanco(id)
    const cheios = Math.floor(faltam / (8 * MB))
    const resto = faltam - cheios * 8 * MB
    const r = sqlNoBancoLocal(
      `insert into storage.objects (bucket_id, name, metadata)
       select '${BALDE}', '${id}/plano-gordo-' || g || '/anexos/' || gen_random_uuid() || '.pdf',
              jsonb_build_object('size', case when g <= ${cheios} then ${8 * MB} else ${resto} end, 'mimetype', 'application/pdf')
         from generate_series(1, ${cheios + (resto > 0 ? 1 : 0)}) g;`,
    )
    expect(r.ok, r.erro).toBe(true)
    try {
      expect(bytesNoBanco(id)).toBe(500 * MB)
      recusado(await enviar(c.atacante.cliente, caminhoDaFoto(id, 'plano-depois-dos-500')))
      recusado(await enviar(c.atacante.cliente, caminhoDoAnexo(id, 'plano-depois-dos-500'), pdf()))
      expect(nomesNoBanco(`${id}/plano-depois-dos-500`)).toEqual([])
    } finally {
      // As linhas ficam (a pilha local é apagada depois), mas sem peso: os testes seguintes usam a mesma conta.
      const zera = sqlNoBancoLocal(`update storage.objects set metadata = jsonb_build_object('size', 0) where bucket_id = '${BALDE}' and starts_with(name, '${id}/plano-gordo-');`)
      expect(zera.ok, zera.erro).toBe(true)
    }
    expect((await enviar(c.atacante.cliente, caminhoDaFoto(id, 'plano-depois-de-zerar'))).error).toBeNull()
  })

  it('D-1457: com 2.000 arquivos na conta, o próximo é recusado', async () => {
    const id = c.atacante.id
    const ja = nomesNoBanco(id).length
    const faltam = 2000 - ja
    const r = sqlNoBancoLocal(
      `insert into storage.objects (bucket_id, name) select '${BALDE}', '${id}/lote-' || g || '/fotos/' || gen_random_uuid() || '.jpg' from generate_series(1, ${faltam}) g;`,
    )
    expect(r.ok, r.erro).toBe(true)
    expect(nomesNoBanco(id)).toHaveLength(2000)
    recusado(await enviar(c.atacante.cliente, caminhoDaFoto(id, 'plano-depois-do-teto')))
    // As linhas de mentira ficam até o fim: a pilha local é apagada depois dos testes.
  })

  it('D-1504: o gatilho existe no banco local (o limite com dois envios juntos não depende só da política)', () => {
    const r = sqlNoBancoLocal("select tgname from pg_trigger where tgrelid = 'storage.objects'::regclass and tgname = 'limite_de_arquivos_da_avaliacao';")
    expect(r.ok, r.erro).toBe(true)
    expect(r.saida).toBe('limite_de_arquivos_da_avaliacao')
  })
})
