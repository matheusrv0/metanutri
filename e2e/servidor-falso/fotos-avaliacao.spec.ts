/* eslint-disable no-restricted-syntax -- os códigos de cor aqui pintam as silhuetas de teste (o dado da foto), não a tela. */
import { expect, test, type Page } from '@playwright/test'
import { semRolagemLateral, vigiarConsole } from '../apoio/fumaca.ts'
import { assinaturaFalsa, ligarServidorFalso, PERFIL_NUTRICIONISTA, USUARIO_FALSO, type ServidorFalso } from '../apoio/servidorFalso.ts'

/**
 * Spec antropometria-telas, F2 (T25): fotos e anexos da avaliação no navegador, com a conta falsa e o armazenamento
 * falso. A foto é reduzida pelo <canvas> de verdade, sobe sem o EXIF (CB-1465), abre pela URL assinada com a CSP do app
 * (CA-2491) e "Comparar fotos" mostra a de antes; o anexo PDF sobe; tudo em 1440 e 390 px. As fotos são desenhos de
 * silhueta feitos aqui, nunca de pessoa de verdade.
 */

test.use({ reducedMotion: 'reduce' })

const criadoEm = '2026-05-12T10:00:00.000Z'
const RENATA = { id: 'renata', nome: 'Renata Oliveira Campos', sexo: 'F', nascimento: '1992-05-12', objetivo: 'perder gordura', criadoEm, atualizadoEm: criadoEm }
const CONTA = USUARIO_FALSO.id
const PREFIXO = `metanutri:conta:${encodeURIComponent(CONTA)}:`

/** Uma silhueta de frente, de lado ou de costas, desenhada no <canvas> do navegador, em JPEG (1200 × 1600 px). */
async function silhueta(pagina: Page, angulo: 'frente' | 'lado' | 'costas', tom: string): Promise<Buffer> {
  const base64 = await pagina.evaluate(
    ({ angulo, tom }) => {
      const tela = document.createElement('canvas')
      tela.width = 1200
      tela.height = 1600
      const p = tela.getContext('2d')
      if (!p) throw new Error('sem canvas')
      p.fillStyle = '#e9e4da'
      p.fillRect(0, 0, 1200, 1600)
      p.fillStyle = tom
      const largura = angulo === 'lado' ? 0.55 : 1
      p.beginPath()
      p.ellipse(600, 300, 110 * (angulo === 'lado' ? 0.85 : 1), 130, 0, 0, Math.PI * 2)
      p.fill()
      p.beginPath()
      p.roundRect(600 - 230 * largura, 470, 460 * largura, 560, 120)
      p.fill()
      if (angulo !== 'lado') {
        p.beginPath()
        p.roundRect(300, 500, 90, 480, 45)
        p.roundRect(810, 500, 90, 480, 45)
        p.fill()
      }
      p.beginPath()
      p.roundRect(600 - 190 * largura, 980, 170 * largura, 520, 70)
      p.roundRect(600 + 20 * largura, 980, 170 * largura, 520, 70)
      p.fill()
      return tela.toDataURL('image/jpeg', 0.9).split(',')[1] ?? ''
    },
    { angulo, tom },
  )
  return Buffer.from(base64, 'base64')
}

/** O JPEG com um bloco EXIF de câmera (aparelho e GPS) logo depois do começo, como sai de um celular. */
function comExif(jpeg: Buffer): Buffer {
  const dados = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), Buffer.from([0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00]), Buffer.from('GPS -5.7945 -35.2110 iPhone 15', 'latin1')])
  const tamanho = Buffer.from([((dados.length + 2) >> 8) & 0xff, (dados.length + 2) & 0xff])
  return Buffer.concat([jpeg.subarray(0, 2), Buffer.from([0xff, 0xe1]), tamanho, dados, jpeg.subarray(2)])
}

/** A largura e a altura no SOF de um JPEG. */
function ladosDoJpeg(b: Buffer): { largura: number; altura: number } | null {
  let i = 2
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null
    const marcador = b[i + 1] ?? 0
    const tamanho = b.readUInt16BE(i + 2)
    if (marcador >= 0xc0 && marcador <= 0xc3) return { altura: b.readUInt16BE(i + 5), largura: b.readUInt16BE(i + 7) }
    i += 2 + tamanho
  }
  return null
}

/** Fecha os avisos de primeiro acesso, se aparecerem. */
async function fecharAvisos(pagina: Page): Promise<void> {
  const aviso = pagina.getByRole('dialog')
  for (let vez = 0; vez < 3; vez++) {
    await aviso.waitFor({ state: 'visible', timeout: 2000 }).catch(() => undefined)
    if (!(await aviso.isVisible())) break
    await aviso.getByRole('button', { name: 'Entendi' }).click()
    await expect(aviso).toBeHidden()
  }
}

/**
 * Entra com a conta falsa, cria a avaliação de hoje pela aba da ficha e grava, ao lado, a de 08/09/2026 com três fotos
 * já no armazenamento. Devolve o id da avaliação de hoje.
 */
async function prepararDuasAvaliacoes(pagina: Page, servidor: ServidorFalso): Promise<string> {
  await pagina.goto('/#/pacientes')
  await fecharAvisos(pagina)
  await pagina.evaluate(
    ({ prefixo, paciente }) => {
      localStorage.setItem(`${prefixo}pacientes`, JSON.stringify([paciente]))
      localStorage.setItem(`${prefixo}aviso-inicial-visto`, '1')
    },
    { prefixo: PREFIXO, paciente: RENATA },
  )
  await pagina.goto('/#/paciente/renata/antropometria')
  await pagina.reload()
  await fecharAvisos(pagina)
  await pagina.getByRole('button', { name: 'Nova avaliação' }).click()
  await pagina.waitForURL(/#\/antropometria\/[^/]+$/)
  const id = decodeURIComponent(new URL(pagina.url()).hash.split('/')[2] ?? '')

  const fotosDeSetembro = []
  for (const [angulo, tom] of [
    ['frente', '#7d8d92'],
    ['lado', '#76878c'],
    ['costas', '#6f8186'],
  ] as const) {
    const caminho = `${CONTA}/${id}-set/fotos/${crypto.randomUUID()}.jpg`
    const bytes = await silhueta(pagina, angulo, tom)
    servidor.arquivos.set(caminho, { tipo: 'image/jpeg', bytes })
    fotosDeSetembro.push({ id: crypto.randomUUID(), angulo, nome: angulo, caminho, bytes: bytes.length, tipo: 'image/jpeg', enviadoEm: '2026-09-08T13:00:00.000Z' })
  }
  await pagina.evaluate(
    ({ prefixo, id, fotos }) => {
      const chave = (casoId: string) => `${prefixo}caso:${casoId}`
      const base = JSON.parse(localStorage.getItem(chave(id)) ?? '{}')
      const medidas = (data: string, peso: number, cintura: number) => ({ ...base.caso, dataConsulta: data, pesoKg: peso, estaturaCm: 164, circunferenciaCinturaCm: cintura })
      localStorage.setItem(chave(id), JSON.stringify({ ...base, caso: { ...medidas('2026-11-03', 71.5, 84), id } }))
      const antes = { ...medidas('2026-09-08', 72.6, 85.2), id: `${id}-set`, avaliacao: { ...base.caso.avaliacao, fotosAutorizadasEm: '2026-09-08', fotos } }
      localStorage.setItem(chave(`${id}-set`), JSON.stringify({ ...base, caso: antes }))
      const indice = JSON.parse(localStorage.getItem(`${prefixo}casos`) ?? '[]')
      localStorage.setItem(`${prefixo}casos`, JSON.stringify([...new Set([...indice, `${id}-set`])]))
    },
    { prefixo: PREFIXO, id, fotos: fotosDeSetembro },
  )
  await pagina.reload()
  await expect(pagina.getByRole('region', { name: 'Fotos e anexos' })).toBeVisible()
  return id
}

for (const [nome, viewport, toque] of [
  ['1440 px', { width: 1440, height: 900 }, false],
  ['390 px', { width: 390, height: 844 }, true],
] as const) {
  test.describe(`fotos e anexos da avaliação (${nome})`, () => {
    test.use({ viewport, hasTouch: toque, isMobile: toque })

    test('CA-2480, CA-2481, CA-2486, CA-2491, CB-1465, CB-1467, CB-1469, CB-1474 e CA-2485: autorizar, enviar sem EXIF, comparar, anexar e excluir', async ({ page }) => {
      const erros = await vigiarConsole(page)
      const servidor = await ligarServidorFalso(page, { sessao: true, perfil: PERFIL_NUTRICIONISTA, assinatura: assinaturaFalsa('ativa') })
      const id = await prepararDuasAvaliacoes(page, servidor)
      const cartao = page.getByRole('region', { name: 'Fotos e anexos' })

      // CA-2480: sem a marca, nada de foto nova.
      await expect(cartao.getByLabel('Adicionar foto')).toBeDisabled()
      await expect(cartao.getByText('Marque a autorização da paciente para adicionar fotos.')).toBeVisible()
      await cartao.getByRole('checkbox', { name: /A paciente autorizou fotos para o prontuário/ }).check()
      await expect(cartao.getByText(/registrado em \d{2}\/\d{2}\/\d{4}/)).toBeVisible()

      // CA-2481 e CB-1465: a foto do celular, com EXIF e 1200 × 1600, sobe em JPEG, sem o EXIF, no caminho da conta.
      const original = comExif(await silhueta(page, 'frente', '#748489'))
      await cartao.getByLabel('Adicionar foto').setInputFiles({ name: 'IMG_0001.jpg', mimeType: 'image/jpeg', buffer: original })
      await expect(cartao.getByText('1 de 5 fotos')).toBeVisible()
      const novos = [...servidor.arquivos.entries()].filter(([caminho]) => caminho.startsWith(`${CONTA}/${id}/fotos/`))
      expect(novos).toHaveLength(1)
      const [, guardado] = novos[0] ?? ['', { tipo: '', bytes: Buffer.alloc(0) }]
      expect(guardado.tipo).toBe('image/jpeg')
      expect([...guardado.bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff])
      expect(guardado.bytes.includes(Buffer.from('Exif', 'latin1'))).toBe(false)
      expect(guardado.bytes.includes(Buffer.from('iPhone', 'latin1'))).toBe(false)
      expect(ladosDoJpeg(guardado.bytes)).toEqual({ largura: 1200, altura: 1600 })

      // CA-2491: a foto abre pela URL assinada, com a CSP do app (o console avisaria a violação).
      const foto = cartao.getByRole('img', { name: 'Foto de frente, 03/11/2026' })
      await expect(foto).toBeVisible()
      await expect.poll(() => foto.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)

      // CA-2486: Comparar fotos com a de 08/09/2026.
      await cartao.getByRole('button', { name: 'Comparar fotos' }).click()
      const comparar = cartao.getByRole('region', { name: 'Comparar fotos' })
      await expect(comparar.getByRole('img', { name: 'Foto de frente, 08/09/2026' })).toBeVisible()
      await expect(comparar.getByRole('img', { name: 'Foto de frente, 03/11/2026' })).toBeVisible()
      await expect(comparar.getByText('−1,1 kg')).toBeVisible()
      await comparar.getByRole('radio', { name: 'Costas' }).click()
      await expect(comparar.getByText('Sem foto de costas em 03/11/2026.')).toBeVisible()
      await semRolagemLateral(page)
      await cartao.getByRole('button', { name: 'Ver fotos de hoje' }).click()

      // D-1511: o anexo em PDF.
      await cartao.getByLabel('Adicionar arquivo').setInputFiles({ name: 'bioimpedancia-03-11-2026.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% exame de teste\n%%EOF\n') })
      // CB-1474 e D-1536: o anexo leva o nome neutro, com o dia do envio; o nome do arquivo não aparece.
      await expect(cartao.getByRole('list', { name: 'Anexos' }).getByText('anexo-1.pdf')).toBeVisible()
      await expect(cartao.getByText('bioimpedancia-03-11-2026.pdf')).toHaveCount(0)
      expect([...servidor.arquivos.keys()].filter((c) => c.startsWith(`${CONTA}/${id}/anexos/`) && c.endsWith('.pdf'))).toHaveLength(1)

      // CB-1467 e D-1530: a foto do celular escolhida como anexo, com GPS e aparelho no EXIF, entra como foto "Outra",
      // redesenhada pelo <canvas>, sem o EXIF.
      const fotosAntes = new Set([...servidor.arquivos.keys()].filter((c) => c.startsWith(`${CONTA}/${id}/fotos/`)))
      await cartao.getByLabel('Adicionar arquivo').setInputFiles({ name: 'exame-em-casa.jpg', mimeType: 'image/jpeg', buffer: comExif(await silhueta(page, 'lado', '#7a8a8f')) })
      await expect(cartao.getByText('2 de 5 fotos')).toBeVisible()
      await expect(cartao.getByRole('list', { name: 'Fotos de hoje' }).getByText('Outra', { exact: true })).toBeVisible()
      const anexada = [...servidor.arquivos.entries()].filter(([c]) => c.startsWith(`${CONTA}/${id}/fotos/`) && !fotosAntes.has(c))
      expect(anexada).toHaveLength(1)
      const [, comoFoto] = anexada[0] ?? ['', { tipo: '', bytes: Buffer.alloc(0) }]
      expect(comoFoto.tipo).toBe('image/jpeg')
      expect(comoFoto.bytes.includes(Buffer.from('Exif', 'latin1'))).toBe(false)
      expect(comoFoto.bytes.includes(Buffer.from('GPS', 'latin1'))).toBe(false)
      expect(comoFoto.bytes.includes(Buffer.from('iPhone', 'latin1'))).toBe(false)
      expect([...servidor.arquivos.keys()].filter((c) => c.startsWith(`${CONTA}/${id}/anexos/`))).toHaveLength(1)

      // CA-2487: nada de compartilhar, baixar ou levar ao documento.
      await expect(cartao.getByRole('button', { name: /compartilh|baix|download|documento/i })).toHaveCount(0)
      await semRolagemLateral(page)

      // CB-1469 e D-1532: o "Excluir" da foto tem pelo menos 44 × 44 px no celular.
      if (toque) {
        const caixa = await cartao.getByRole('button', { name: 'Excluir a foto de frente' }).boundingBox()
        expect(caixa?.width ?? 0).toBeGreaterThanOrEqual(44)
        expect(caixa?.height ?? 0).toBeGreaterThanOrEqual(44)
      }

      // CA-2485: excluir a foto tira o arquivo do armazenamento.
      await cartao.getByRole('button', { name: 'Excluir a foto de frente' }).click()
      await page.getByRole('alertdialog', { name: 'Excluir a foto de frente?' }).getByRole('button', { name: 'Excluir foto' }).click()
      await expect(cartao.getByText('1 de 5 fotos')).toBeVisible()
      expect([...servidor.arquivos.keys()].filter((c) => c.startsWith(`${CONTA}/${id}/fotos/`))).toHaveLength(1)

      expect(erros, 'erro no console').toEqual([])
    })
  })
}
