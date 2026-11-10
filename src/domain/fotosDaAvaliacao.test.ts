// Fotos e anexos da avaliação (spec antropometria-telas, D-1450 a D-1459 e D-1503 a D-1513): a regra, sem navegador.
import { criarCasoVazio } from './caso.ts'
import {
  anguloInicial,
  anguloSugerido,
  anteriorComFoto,
  bytesUsados,
  caminhoDaFoto,
  caminhoDoAnexo,
  comparacaoDeFotos,
  conferirFoto,
  enviarAnexo,
  enviarFoto,
  FRASES,
  ladosDaCopia,
  MEGA,
  tetoPassa,
  textoDoTamanho,
  textoDoUso,
  textosPeloSexo,
  tipoDoAnexo,
  type ArmazenamentoDeFotos,
  type DesenhistaDeFoto,
  type ResultadoDoEnvio,
} from './fotosDaAvaliacao.ts'
import type { AvaliacaoDoHistorico } from './historicoAntropometrico.ts'
import type { ArquivoDaAvaliacao, Caso, DadosDaAvaliacao } from './tipos.ts'

const CONTA = '00000000-0000-4000-8000-000000000001'
const PLANO = 'b7c1d2e3-0000-4000-8000-00000000000a'
const ID = '11111111-2222-4333-8444-555555555555'

/** Um JPEG só com o começo, um APP0 e o SOF0 com os lados (o resto não importa ao leitor do cabeçalho). */
function jpeg(largura: number, altura: number, tamanho = 64): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(Math.max(tamanho, 32))
  b.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, altura >> 8, altura & 0xff, largura >> 8, largura & 0xff])
  return b
}
/** Um PNG só com a assinatura e o IHDR. */
function png(largura: number, altura: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(40)
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
  new DataView(b.buffer).setUint32(16, largura)
  new DataView(b.buffer).setUint32(20, altura)
  return b
}
const texto = (t: string) => new TextEncoder().encode(t)
const GIF = texto('GIF89a.......')
const PDF = texto('%PDF-1.7\n% exame\n%%EOF')

const arquivo = (bytes: number, p: Partial<ArquivoDaAvaliacao> = {}): ArquivoDaAvaliacao => ({
  id: 'x',
  nome: 'Frente',
  caminho: `${CONTA}/${PLANO}/fotos/x.jpg`,
  bytes,
  tipo: 'image/jpeg',
  enviadoEm: '2026-11-03T12:00:00.000Z',
  ...p,
})
const avaliacao = (p: Partial<DadosDaAvaliacao> = {}): DadosDaAvaliacao => ({ ...criarCasoVazio('c').avaliacao, ...p })

/** Uma porta falsa que guarda o que recebeu. */
function portaFalsa(p: { envio?: ResultadoDoEnvio; conta?: string | null; contagem?: number | null } = {}) {
  const enviados: { caminho: string; tipo: string; bytes: number }[] = []
  const porta: ArmazenamentoDeFotos = {
    conta: async () => (p.conta === undefined ? CONTA : p.conta),
    enviar: async (caminho, blob, tipo) => {
      enviados.push({ caminho, tipo, bytes: blob.size })
      return p.envio ?? 'ok'
    },
    contar: async () => (p.contagem === undefined ? 0 : p.contagem),
    assinar: async () => null,
    apagar: async () => true,
    apagarPasta: async () => true,
  }
  return { porta, enviados }
}

/** O desenhista falso: a foto tem os lados do cabeçalho e o JPEG desenhado tem `saida` bytes. */
function desenhistaFalso(saida = 300_000, falha: 'abrir' | 'desenhar' | null = null) {
  const pedidos: { largura: number; altura: number; qualidade: number }[] = []
  const desenhista: DesenhistaDeFoto = {
    abrir: async () => {
      if (falha === 'abrir') throw new Error('não abre')
      return {
        largura: 4000,
        altura: 3000,
        desenharJpeg: async (largura, altura, qualidade) => {
          if (falha === 'desenhar') throw new Error('não desenha')
          pedidos.push({ largura, altura, qualidade })
          return new Blob([new Uint8Array(saida)], { type: 'image/jpeg' })
        },
      }
    },
  }
  return { desenhista, pedidos }
}

const agora = new Date('2026-11-03T13:00:00.000Z')

describe('o arquivo pelo conteúdo (D-1452)', () => {
  it('CA-2482: GIF renomeado e PDF como foto: "Use JPG ou PNG."', () => {
    expect(conferirFoto(GIF)).toEqual({ tipo: 'erro', mensagem: 'Use JPG ou PNG.' })
    expect(conferirFoto(PDF)).toEqual({ tipo: 'erro', mensagem: 'Use JPG ou PNG.' })
    expect(conferirFoto(jpeg(4000, 3000))).toEqual({ tipo: 'ok', mime: 'image/jpeg' })
    expect(conferirFoto(png(800, 600))).toEqual({ tipo: 'ok', mime: 'image/png' })
  })

  it('CA-2482: o anexo é PDF, JPEG ou PNG pelo conteúdo; um PNG chamado .pdf é PNG', () => {
    expect(tipoDoAnexo(PDF)).toBe('application/pdf')
    expect(tipoDoAnexo(png(10, 10))).toBe('image/png')
    expect(tipoDoAnexo(jpeg(10, 10))).toBe('image/jpeg')
    expect(tipoDoAnexo(GIF)).toBeNull()
    expect(tipoDoAnexo(texto('%PD'))).toBeNull()
  })

  it('CA-2484: 9000 px no cabeçalho, ou mais de 20 MB: "Use uma foto de até 20 MB e 8000 px."', () => {
    const grande = { tipo: 'erro', mensagem: 'Use uma foto de até 20 MB e 8000 px.' }
    expect(conferirFoto(jpeg(9000, 3000))).toEqual(grande)
    expect(conferirFoto(png(3000, 9000))).toEqual(grande)
    expect(conferirFoto(jpeg(8000, 8000))).toEqual({ tipo: 'ok', mime: 'image/jpeg' })
    expect(conferirFoto(jpeg(100, 100, 20 * MEGA + 1))).toEqual(grande)
  })

  it('D-1507: JPEG sem os lados no cabeçalho: "Não foi possível ler esta foto. Use JPG ou PNG."', () => {
    expect(conferirFoto(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toEqual({ tipo: 'erro', mensagem: 'Não foi possível ler esta foto. Use JPG ou PNG.' })
  })
})

describe('tamanhos e limites (D-1451, D-1453, D-1506)', () => {
  it('D-1453: o lado maior vai a 1600 px, sem aumentar a foto pequena', () => {
    expect(ladosDaCopia(4000, 3000)).toEqual({ largura: 1600, altura: 1200 })
    expect(ladosDaCopia(3000, 4000)).toEqual({ largura: 1200, altura: 1600 })
    expect(ladosDaCopia(800, 600)).toEqual({ largura: 800, altura: 600 })
  })

  it('D-1506: KB inteiros abaixo de 1 MB; MB com 1 casa de 1 MB em diante; a barra', () => {
    expect(textoDoTamanho(412 * 1024)).toBe('412 KB')
    expect(textoDoTamanho(1.1 * MEGA)).toBe('1,1 MB')
    expect(textoDoTamanho(500)).toBe('1 KB')
    expect(textoDoUso(3.7 * MEGA)).toBe('3,7 de 8 MB usados')
    expect(textoDoUso(0)).toBe('0,0 de 8 MB usados')
  })

  it('D-1451: fotos e anexos somam; o teto é 8 MB (8.388.608 bytes)', () => {
    const av = avaliacao({ fotos: [arquivo(3 * MEGA)], anexos: [arquivo(MEGA, { tipo: 'application/pdf' })] })
    expect(bytesUsados(av)).toBe(4 * MEGA)
    expect(bytesUsados(avaliacao())).toBe(0)
    expect(tetoPassa(7.8 * MEGA, 0.5 * MEGA)).toBe(true)
    expect(tetoPassa(7 * MEGA, MEGA)).toBe(false)
  })

  it('DP-AT-20: os caminhos não levam o nome do arquivo', () => {
    expect(caminhoDaFoto(CONTA, PLANO, ID)).toBe(`${CONTA}/${PLANO}/fotos/${ID}.jpg`)
    expect(caminhoDoAnexo(CONTA, PLANO, ID, 'application/pdf')).toBe(`${CONTA}/${PLANO}/anexos/${ID}.pdf`)
    expect(caminhoDoAnexo(CONTA, PLANO, ID, 'image/png')).toBe(`${CONTA}/${PLANO}/anexos/${ID}.png`)
    expect(caminhoDoAnexo(CONTA, PLANO, ID, 'image/jpeg')).toBe(`${CONTA}/${PLANO}/anexos/${ID}.jpg`)
  })

  it('D-1509: o ângulo sugerido é o primeiro de Frente, Lado e Costas que falta; com os três, Outra', () => {
    expect(anguloSugerido([])).toBe('frente')
    expect(anguloSugerido([arquivo(1, { angulo: 'frente' })])).toBe('lado')
    expect(anguloSugerido([arquivo(1, { angulo: 'lado' })])).toBe('frente')
    expect(anguloSugerido([arquivo(1, { angulo: 'frente' }), arquivo(1, { angulo: 'lado' }), arquivo(1, { angulo: 'costas' })])).toBe('outra')
  })

  it('D-1508: o texto pelo sexo; sem sexo, "a pessoa"', () => {
    expect(textosPeloSexo('F').autorizou).toBe('A paciente autorizou fotos para o prontuário')
    expect(textosPeloSexo('M').autorizou).toBe('O paciente autorizou fotos para o prontuário')
    expect(textosPeloSexo(null).autorizou).toBe('A pessoa autorizou fotos para o prontuário')
    expect(textosPeloSexo('M').marque).toBe('Marque a autorização do paciente para adicionar fotos.')
    expect(textosPeloSexo('F').lembrete).toBe('As fotos ficam só no prontuário. Não podem ir para divulgação, nem com autorização da paciente (CFN 599/2018, art. 58).')
    expect(textosPeloSexo(null).lembrete).toContain('nem com autorização da pessoa')
  })
})

describe('enviar a foto (D-1453, D-1505)', () => {
  const entrada = (p: Partial<Parameters<typeof enviarFoto>[0]> = {}) => ({
    plano: PLANO,
    angulo: 'frente' as const,
    bytes: jpeg(4000, 3000, 4 * MEGA),
    arquivo: new Blob([jpeg(4000, 3000, 4 * MEGA)], { type: 'image/jpeg' }),
    avaliacao: avaliacao(),
    agora,
    gerarId: () => ID,
    ...p,
  })

  it('CA-2481: JPEG de 4 MB e 4000 × 3000 sobe reduzido a 1600 px, em JPEG 0,85, no caminho da conta', async () => {
    const { porta, enviados } = portaFalsa()
    const { desenhista, pedidos } = desenhistaFalso(310_000)
    const r = await enviarFoto(entrada(), porta, desenhista)
    expect(pedidos).toEqual([{ largura: 1600, altura: 1200, qualidade: 0.85 }])
    expect(enviados).toEqual([{ caminho: `${CONTA}/${PLANO}/fotos/${ID}.jpg`, tipo: 'image/jpeg', bytes: 310_000 }])
    expect(r).toEqual({
      tipo: 'ok',
      arquivo: { id: ID, angulo: 'frente', nome: 'Frente', caminho: `${CONTA}/${PLANO}/fotos/${ID}.jpg`, bytes: 310_000, tipo: 'image/jpeg', enviadoEm: agora.toISOString() },
    })
  })

  it('CA-2482 e CA-2484: o arquivo recusado nem abre e nada sobe', async () => {
    const { porta, enviados } = portaFalsa()
    const { desenhista, pedidos } = desenhistaFalso()
    expect(await enviarFoto(entrada({ bytes: GIF }), porta, desenhista)).toEqual({ tipo: 'erro', mensagem: 'Use JPG ou PNG.' })
    expect(await enviarFoto(entrada({ bytes: jpeg(9000, 100) }), porta, desenhista)).toEqual({ tipo: 'erro', mensagem: 'Use uma foto de até 20 MB e 8000 px.' })
    expect(pedidos).toEqual([])
    expect(enviados).toEqual([])
  })

  it('D-1507: a foto que o navegador não abre ou não desenha: a frase de leitura, e nada sobe', async () => {
    const { porta, enviados } = portaFalsa()
    expect(await enviarFoto(entrada(), porta, desenhistaFalso(1, 'abrir').desenhista)).toEqual({ tipo: 'erro', mensagem: FRASES.leitura })
    expect(await enviarFoto(entrada(), porta, desenhistaFalso(1, 'desenhar').desenhista)).toEqual({ tipo: 'erro', mensagem: FRASES.leitura })
    expect(enviados).toEqual([])
  })

  it('D-1453: passou de 8 MB somando a foto reduzida: "Passa de 8 MB somando fotos e anexos. Reduza a foto."', async () => {
    const { porta, enviados } = portaFalsa()
    const r = await enviarFoto(entrada({ avaliacao: avaliacao({ anexos: [arquivo(7.9 * MEGA)] }) }), porta, desenhistaFalso(200_000).desenhista)
    expect(r).toEqual({ tipo: 'erro', mensagem: 'Passa de 8 MB somando fotos e anexos. Reduza a foto.' })
    expect(enviados).toEqual([])
  })

  it('CA-2483: com 5 fotos, nada sobe', async () => {
    const { porta, enviados } = portaFalsa()
    const cinco = Array.from({ length: 5 }, (_, i) => arquivo(1000, { id: String(i) }))
    expect(await enviarFoto(entrada({ avaliacao: avaliacao({ fotos: cinco }) }), porta, desenhistaFalso().desenhista)).toEqual({ tipo: 'erro', mensagem: 'Já há 5 fotos nesta avaliação.' })
    expect(enviados).toEqual([])
  })

  it('CB-1413: sem resposta do servidor: "A foto não subiu. Confira a internet e tente de novo."', async () => {
    const { porta } = portaFalsa({ envio: 'sem-rede' })
    expect(await enviarFoto(entrada(), porta, desenhistaFalso().desenhista)).toEqual({ tipo: 'erro', mensagem: 'A foto não subiu. Confira a internet e tente de novo.' })
  })

  it('CB-1415: recusado sem as 5 fotos na pasta, ou sem sessão: "Entre de novo para enviar fotos."', async () => {
    expect(await enviarFoto(entrada(), portaFalsa({ envio: 'recusado', contagem: 2 }).porta, desenhistaFalso().desenhista)).toEqual({ tipo: 'erro', mensagem: 'Entre de novo para enviar fotos.' })
    expect(await enviarFoto(entrada(), portaFalsa({ envio: 'recusado', contagem: null }).porta, desenhistaFalso().desenhista)).toEqual({ tipo: 'erro', mensagem: 'Entre de novo para enviar fotos.' })
    const semConta = portaFalsa({ conta: null })
    expect(await enviarFoto(entrada(), semConta.porta, desenhistaFalso().desenhista)).toEqual({ tipo: 'erro', mensagem: 'Entre de novo para enviar fotos.' })
    expect(semConta.enviados).toEqual([])
  })

  it('CB-1416: recusado com 5 fotos na pasta (outra aba): "Já há 5 fotos nesta avaliação."', async () => {
    expect(await enviarFoto(entrada(), portaFalsa({ envio: 'recusado', contagem: 5 }).porta, desenhistaFalso().desenhista)).toEqual({ tipo: 'erro', mensagem: 'Já há 5 fotos nesta avaliação.' })
  })
})

describe('enviar o anexo (D-1452, D-1505, D-1511)', () => {
  const entrada = (bytes: Uint8Array, p: Partial<Parameters<typeof enviarAnexo>[0]> = {}) => ({
    plano: PLANO,
    nome: 'exame.pdf',
    bytes,
    arquivo: new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }),
    avaliacao: avaliacao(),
    agora,
    gerarId: () => ID,
    ...p,
  })

  it('CA-2482: o PDF sobe como PDF; o PNG chamado .pdf sobe como PNG, com a extensão do conteúdo', async () => {
    const { porta, enviados } = portaFalsa()
    const r = await enviarAnexo(entrada(PDF), porta)
    expect(r).toEqual({ tipo: 'ok', arquivo: { id: ID, nome: 'exame.pdf', caminho: `${CONTA}/${PLANO}/anexos/${ID}.pdf`, bytes: PDF.length, tipo: 'application/pdf', enviadoEm: agora.toISOString() } })
    await enviarAnexo(entrada(png(10, 10), { nome: 'bioimpedancia.pdf' }), porta)
    expect(enviados.map((e) => [e.caminho, e.tipo])).toEqual([
      [`${CONTA}/${PLANO}/anexos/${ID}.pdf`, 'application/pdf'],
      [`${CONTA}/${PLANO}/anexos/${ID}.png`, 'image/png'],
    ])
  })

  it('CA-2482: outro tipo: "Anexo em PDF, JPG ou PNG."', async () => {
    const { porta, enviados } = portaFalsa()
    expect(await enviarAnexo(entrada(GIF), porta)).toEqual({ tipo: 'erro', mensagem: 'Anexo em PDF, JPG ou PNG.' })
    expect(enviados).toEqual([])
  })

  it('CA-2483: 7,8 MB usados e um anexo de 0,5 MB: "Passa de 8 MB somando fotos e anexos." e nada sobe', async () => {
    const { porta, enviados } = portaFalsa()
    const meio = new Uint8Array(0.5 * MEGA)
    meio.set(PDF)
    const r = await enviarAnexo(entrada(meio, { avaliacao: avaliacao({ fotos: [arquivo(7.8 * MEGA)] }) }), porta)
    expect(r).toEqual({ tipo: 'erro', mensagem: 'Passa de 8 MB somando fotos e anexos.' })
    expect(enviados).toEqual([])
  })

  it('D-1511 e D-1505: com 10 anexos, nada sobe; recusado com 10 na pasta, "Já há 10 anexos nesta avaliação."; sem rede e sem sessão', async () => {
    const dez = Array.from({ length: 10 }, (_, i) => arquivo(10, { id: String(i), tipo: 'application/pdf' }))
    expect(await enviarAnexo(entrada(PDF, { avaliacao: avaliacao({ anexos: dez }) }), portaFalsa().porta)).toEqual({ tipo: 'erro', mensagem: 'Já há 10 anexos nesta avaliação.' })
    expect(await enviarAnexo(entrada(PDF), portaFalsa({ envio: 'recusado', contagem: 10 }).porta)).toEqual({ tipo: 'erro', mensagem: 'Já há 10 anexos nesta avaliação.' })
    expect(await enviarAnexo(entrada(PDF), portaFalsa({ envio: 'recusado', contagem: 3 }).porta)).toEqual({ tipo: 'erro', mensagem: 'Entre de novo para enviar anexos.' })
    expect(await enviarAnexo(entrada(PDF), portaFalsa({ envio: 'sem-rede' }).porta)).toEqual({ tipo: 'erro', mensagem: 'O anexo não subiu. Confira a internet e tente de novo.' })
  })
})

describe('Comparar fotos (D-1455, D-1510)', () => {
  const foto = (angulo: 'frente' | 'lado' | 'costas', id: string): ArquivoDaAvaliacao => arquivo(1000, { id, angulo, caminho: `${CONTA}/p/fotos/${id}.jpg` })
  const av = (casoId: string, data: string, p: Partial<Caso>, fotos: ArquivoDaAvaliacao[] = []): AvaliacaoDoHistorico => {
    const vazio = criarCasoVazio(casoId)
    return { casoId, data, caso: { ...vazio, sexo: 'F', idadeAnos: 34, estaturaCm: 164, ...p, avaliacao: { ...vazio.avaliacao, fotos } } }
  }
  const setembro = av('set', '2026-09-08', { pesoKg: 72.6, circunferenciaCinturaCm: 85.2 }, [foto('frente', 'f1'), foto('lado', 'l1')])
  const outubro = av('out', '2026-10-06', { pesoKg: 72 })
  const novembro = av('nov', '2026-11-03', { pesoKg: 71.5, circunferenciaCinturaCm: 84 }, [foto('frente', 'f2'), foto('costas', 'c2')])

  it('D-1510: a de antes é a mais recente anterior com foto; sem nenhuma, nula', () => {
    expect(anteriorComFoto([setembro, outubro, novembro], 'nov')?.casoId).toBe('set')
    expect(anteriorComFoto([setembro, outubro, novembro], 'set')).toBeNull()
    expect(anteriorComFoto([outubro, novembro], 'nov')).toBeNull()
  })

  it('D-1510: começa no primeiro ângulo que as duas têm; sem nenhum em comum, Frente', () => {
    expect(anguloInicial(setembro, novembro)).toBe('frente')
    expect(anguloInicial(av('a', '2026-01-01', {}, [foto('lado', 'x')]), av('b', '2026-02-01', {}, [foto('lado', 'y'), foto('frente', 'z')]))).toBe('lado')
    expect(anguloInicial(av('a', '2026-01-01', {}, [foto('costas', 'x')]), av('b', '2026-02-01', {}, [foto('lado', 'y')]))).toBe('frente')
  })

  it('CA-2486: as duas de frente lado a lado, com a data, o ângulo e o peso; as diferenças de peso e cintura com a leitura', () => {
    const c = comparacaoDeFotos(setembro, novembro, 'frente')
    expect(c.quadros.map((q) => [q.data, q.detalhe, q.foto?.id ?? null, q.falta])).toEqual([
      ['08/09/2026', 'Frente · 72,6 kg', 'f1', null],
      ['03/11/2026', 'Frente · 71,5 kg', 'f2', null],
    ])
    expect(c.diferencas).toEqual([
      { nome: 'Peso', valor: '−1,1 kg', detalhe: '72,6 → 71,5 kg' },
      { nome: 'Cintura', valor: '−1,2 cm', detalhe: '85,2 → 84,0 cm · dentro do erro de medida' },
    ])
  })

  it('CA-2486 e CB-1466: sem foto do ângulo numa delas, "Sem foto de lado em 03/11/2026."', () => {
    const c = comparacaoDeFotos(setembro, novembro, 'lado')
    expect(c.quadros[0]?.foto?.id).toBe('l1')
    expect(c.quadros[1]).toMatchObject({ foto: null, falta: 'Sem foto de lado em 03/11/2026.' })
    expect(comparacaoDeFotos(setembro, novembro, 'costas').quadros[0]).toMatchObject({ foto: null, falta: 'Sem foto de costas em 08/09/2026.' })
  })

  it('D-1510: sem peso, a legenda fica só com o ângulo; linha sem as duas medidas não aparece', () => {
    const semPeso = av('x', '2026-08-01', { pesoKg: null }, [foto('frente', 'f0')])
    const c = comparacaoDeFotos(semPeso, novembro, 'frente')
    expect(c.quadros[0]?.detalhe).toBe('Frente')
    expect(c.diferencas).toEqual([])
  })
})
