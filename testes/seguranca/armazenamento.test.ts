// CA-488 (spec seguranca-lote-4): uma conta tentando enviar, ler, listar, mover, copiar, sobrescrever e
// apagar arquivo na pasta de outra, no balde dos comprovantes; e mudar o próprio balde.
import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { arquivoPdf, BALDE, fotografar, negadoOuVazio, prepararCenario, recusado, semNadaDaVitima, type Cenario } from './preparo.ts'

let c: Cenario
let foto: string

beforeAll(async () => {
  c = await prepararCenario()
  foto = await fotografar(c)
})

afterEach(async () => {
  expect(await fotografar(c), 'o ataque mudou arquivo da vítima ou o balde').toBe(foto)
})

const quem = (): readonly [string, SupabaseClient][] => [
  ['outra conta', c.atacante.cliente],
  ['sem login', c.anonimo],
]
const balde = (cliente: SupabaseClient) => cliente.storage.from(BALDE)

describe('controle: o cenário não é vazio', () => {
  it('a vítima baixa o próprio comprovante e o administrador gera o link dele', async () => {
    const baixado = await balde(c.vitima.cliente).download(c.vitima.arquivo)
    expect(baixado.error).toBeNull()
    const link = await balde(c.admin.cliente).createSignedUrl(c.vitima.arquivo, 60)
    expect(link.error).toBeNull()
  })
})

describe('CA-488: uma conta não mexe nos arquivos de outra', () => {
  it('CA-488: enviar arquivo novo na pasta da vítima é recusado', async () => {
    for (const [, cliente] of quem()) {
      recusado(await balde(cliente).upload(`${c.vitima.id}/invasor.pdf`, arquivoPdf('invasor'), { contentType: 'application/pdf' }))
    }
  })

  it('CA-488: sobrescrever o comprovante da vítima é recusado (upsert e update)', async () => {
    for (const [, cliente] of quem()) {
      recusado(await balde(cliente).upload(c.vitima.arquivo, arquivoPdf('trocado'), { contentType: 'application/pdf', upsert: true }))
      recusado(await balde(cliente).update(c.vitima.arquivo, arquivoPdf('trocado'), { contentType: 'application/pdf' }))
    }
  })

  it('CA-488: baixar, gerar link e ler o endereço público do comprovante da vítima não entrega o arquivo', async () => {
    for (const [, cliente] of quem()) {
      const baixado = await balde(cliente).download(c.vitima.arquivo)
      recusado(baixado)
      recusado(await balde(cliente).createSignedUrl(c.vitima.arquivo, 60))
      const varios = await balde(cliente).createSignedUrls([c.vitima.arquivo, c.vitima.segundoArquivo], 60)
      const links = (varios.data ?? []).map((l) => l.signedUrl).filter((u) => typeof u === 'string' && u.length > 0)
      expect(links).toEqual([])
      const info = await balde(cliente).info(c.vitima.arquivo)
      recusado(info)
      semNadaDaVitima(c, { data: info.data, error: null })
    }
    const publico = balde(c.anonimo).getPublicUrl(c.vitima.arquivo).data.publicUrl
    const resposta = await fetch(publico)
    expect(resposta.ok).toBe(false)
  })

  it('CA-488: listar a pasta da vítima, a raiz e buscar pelo nome não mostram nada dela', async () => {
    for (const [, cliente] of quem()) {
      const pasta = await balde(cliente).list(c.vitima.id)
      negadoOuVazio(pasta)
      const raiz = await balde(cliente).list('', { limit: 1000 })
      semNadaDaVitima(c, raiz)
      expect(JSON.stringify(raiz.data ?? [])).not.toContain(c.vitima.id)
      const busca = await balde(cliente).list(c.vitima.id, { search: 'comprovante' })
      negadoOuVazio(busca)
    }
  })

  it('CA-488: mover e copiar o comprovante da vítima para a própria pasta são recusados', async () => {
    recusado(await balde(c.atacante.cliente).move(c.vitima.arquivo, `${c.atacante.id}/roubado.pdf`))
    recusado(await balde(c.atacante.cliente).copy(c.vitima.arquivo, `${c.atacante.id}/copia.pdf`))
    recusado(await balde(c.anonimo).move(c.vitima.arquivo, 'roubado.pdf'))
    const meus = await c.servico.storage.from(BALDE).list(c.atacante.id)
    expect((meus.data ?? []).map((a) => a.name).sort()).toEqual(['meu.pdf'])
  })

  it('CA-488: apagar o comprovante da vítima não apaga', async () => {
    for (const [, cliente] of quem()) {
      const r = await balde(cliente).remove([c.vitima.arquivo, c.vitima.segundoArquivo])
      negadoOuVazio(r)
    }
  })

  it('CA-488: caminho com ".." não sai da própria pasta', async () => {
    const r = await balde(c.atacante.cliente).upload(`${c.atacante.id}/../${c.vitima.id}/invasor.pdf`, arquivoPdf('invasor'), { contentType: 'application/pdf' })
    if (!r.error) {
      // Se o armazenamento aceitou, o arquivo tem de estar fora da pasta da vítima (o nome é literal).
      expect(r.data?.path.startsWith(`${c.vitima.id}/`)).toBe(false)
    }
    const naVitima = await c.servico.storage.from(BALDE).list(c.vitima.id)
    expect((naVitima.data ?? []).map((a) => a.name)).not.toContain('invasor.pdf')
  })

  it('CA-488: a conta não abre o balde, não cria balde novo e não esvazia nem apaga o balde', async () => {
    for (const [, cliente] of quem()) {
      recusado(await cliente.storage.updateBucket(BALDE, { public: true }))
      recusado(await cliente.storage.createBucket('invasor', { public: true }))
      const esvaziado = await cliente.storage.emptyBucket(BALDE)
      semNadaDaVitima(c, esvaziado)
      recusado(await cliente.storage.deleteBucket(BALDE))
    }
  })
})
