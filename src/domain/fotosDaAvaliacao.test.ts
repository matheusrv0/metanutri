// Fotos e anexos da avaliação (spec antropometria-telas, D-1450 a D-1459 e D-1503 a D-1513): a regra, sem navegador.
import { criarCasoVazio } from './caso.ts'
import {
  anguloInicial,
  apagarArquivosDoPlano,
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
  semArquivos,
  temArquivos,
  tetoPassa,
  textoDoTamanho,
  textoDoUso,
  textosPeloSexo,
  tipoDoAnexo,
  proximoNomeDeAnexo,
  lerPastaDoPlano,
  religarSoltos,
  comArquivo,
  type ArmazenamentoDeFotos,
  type ArquivoNoArmazenamento,
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

/** `n` arquivos de `bytes` cada na subpasta do plano, como a porta lê (DP-AT-21). */
const naPasta = (n: number, sub: 'fotos' | 'anexos', bytes = 1000): ArquivoNoArmazenamento[] =>
  Array.from({ length: n }, (_, i) => ({ caminho: `${CONTA}/${PLANO}/${sub}/${i}.${sub === 'fotos' ? 'jpg' : 'pdf'}`, bytes, criadoEm: '2026-11-03T12:00:00.000Z' }))

/** Uma porta falsa que guarda o que recebeu; `pasta` é o que a leitura da pasta do plano devolve. */
function portaFalsa(p: { envio?: ResultadoDoEnvio; conta?: string | null; pasta?: readonly ArquivoNoArmazenamento[] | null } = {}) {
  const enviados: { caminho: string; tipo: string; bytes: number }[] = []
  const porta: ArmazenamentoDeFotos = {
    conta: async () => (p.conta === undefined ? CONTA : p.conta),
    enviar: async (caminho, blob, tipo) => {
      enviados.push({ caminho, tipo, bytes: blob.size })
      return p.envio ?? 'ok'
    },
    listar: async () => (p.pasta === undefined ? [] : p.pasta),
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

  it('CB-1415 e D-1547: só a sessão vencida (sem conta no aparelho, ou 401/403 do servidor) diz "Entre de novo para enviar fotos."', async () => {
    const semConta = portaFalsa({ conta: null })
    expect(await enviarFoto(entrada(), semConta.porta, desenhistaFalso().desenhista)).toEqual({ tipo: 'erro', mensagem: 'Entre de novo para enviar fotos.' })
    expect(semConta.enviados).toEqual([])
    expect(await enviarFoto(entrada(), portaFalsa({ envio: 'sessao', pasta: naPasta(5, 'fotos') }).porta, desenhistaFalso().desenhista)).toEqual({ tipo: 'erro', mensagem: 'Entre de novo para enviar fotos.' })
  })

  it('CB-1497 e D-1547: recusado sem a pasta cheia e sem passar de 8 MB, ou sem ler a pasta: a frase genérica, sem "Entre de novo"', async () => {
    expect(await enviarFoto(entrada(), portaFalsa({ envio: 'recusado', pasta: naPasta(2, 'fotos') }).porta, desenhistaFalso().desenhista)).toEqual({ tipo: 'erro', mensagem: 'Não foi possível enviar agora. Tente de novo.' })
    expect(await enviarFoto(entrada(), portaFalsa({ envio: 'recusado', pasta: null }).porta, desenhistaFalso().desenhista)).toEqual({ tipo: 'erro', mensagem: 'Não foi possível enviar agora. Tente de novo.' })
  })

  it('CB-1496 e D-1547: a conta cheia (o código 53100): "O espaço de fotos da conta acabou.", sem ler a pasta', async () => {
    const lidas: string[] = []
    const { porta } = portaFalsa({ envio: 'conta-cheia', pasta: naPasta(5, 'fotos') })
    const lendo: ArmazenamentoDeFotos = {
      ...porta,
      listar: async (pasta) => {
        lidas.push(pasta)
        return porta.listar(pasta)
      },
    }
    expect(await enviarFoto(entrada(), lendo, desenhistaFalso().desenhista)).toEqual({ tipo: 'erro', mensagem: 'O espaço de fotos da conta acabou.' })
    expect(lidas).toEqual([])
  })

  it('CB-1468 e D-1531: recusado com a pasta do plano somando mais de 8 MB com a foto nova: a frase do teto', async () => {
    // 2 anexos de 3,9 MB na pasta (outra aba) e a foto reduzida de 300.000 bytes: 8,1 MB.
    const pasta = naPasta(2, 'anexos', 3.9 * MEGA)
    expect(await enviarFoto(entrada(), portaFalsa({ envio: 'recusado', pasta }).porta, desenhistaFalso(300_000).desenhista)).toEqual({ tipo: 'erro', mensagem: 'Passa de 8 MB somando fotos e anexos. Reduza a foto.' })
    // A mesma pasta com a foto de 100.000 bytes cabe: a recusa não foi pelo tamanho.
    expect(await enviarFoto(entrada(), portaFalsa({ envio: 'recusado', pasta }).porta, desenhistaFalso(100_000).desenhista)).toEqual({ tipo: 'erro', mensagem: 'Não foi possível enviar agora. Tente de novo.' })
  })

  it('CB-1416: recusado com 5 fotos na pasta (outra aba): "Já há 5 fotos nesta avaliação."', async () => {
    expect(await enviarFoto(entrada(), portaFalsa({ envio: 'recusado', pasta: naPasta(5, 'fotos') }).porta, desenhistaFalso().desenhista)).toEqual({ tipo: 'erro', mensagem: 'Já há 5 fotos nesta avaliação.' })
  })
})

describe('enviar o anexo (D-1452, D-1505, D-1511, D-1530)', () => {
  const entrada = (bytes: Uint8Array, p: Partial<Parameters<typeof enviarAnexo>[0]> = {}) => ({
    plano: PLANO,
    bytes,
    arquivo: new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }),
    avaliacao: avaliacao(),
    sexo: 'F' as const,
    agora,
    gerarId: () => ID,
    ...p,
  })
  const autorizada = avaliacao({ fotosAutorizadasEm: '2026-11-03' })

  it('CA-2482: o PDF sobe como PDF, sem abrir no desenhista e sem pedir a autorização', async () => {
    const { porta, enviados } = portaFalsa()
    const { desenhista, pedidos } = desenhistaFalso()
    const r = await enviarAnexo(entrada(PDF), porta, desenhista)
    expect(r).toEqual({ tipo: 'ok', campo: 'anexos', arquivo: { id: ID, nome: 'anexo-1.pdf', caminho: `${CONTA}/${PLANO}/anexos/${ID}.pdf`, bytes: PDF.length, tipo: 'application/pdf', enviadoEm: agora.toISOString() } })
    expect(enviados.map((e) => [e.caminho, e.tipo])).toEqual([[`${CONTA}/${PLANO}/anexos/${ID}.pdf`, 'application/pdf']])
    expect(pedidos).toEqual([])
  })

  it('CB-1467 e D-1530: a imagem anexada (o PNG chamado .pdf, o JPEG do celular) entra como foto "Outra", redesenhada em JPEG', async () => {
    const { porta, enviados } = portaFalsa()
    const { desenhista, pedidos } = desenhistaFalso(250_000)
    const r = await enviarAnexo(entrada(png(10, 10), { avaliacao: autorizada }), porta, desenhista)
    expect(r).toEqual({
      tipo: 'ok',
      campo: 'fotos',
      arquivo: { id: ID, angulo: 'outra', nome: 'Outra', caminho: `${CONTA}/${PLANO}/fotos/${ID}.jpg`, bytes: 250_000, tipo: 'image/jpeg', enviadoEm: agora.toISOString() },
    })
    await enviarAnexo(entrada(jpeg(4000, 3000), { avaliacao: autorizada }), porta, desenhista)
    expect(pedidos).toEqual([
      { largura: 1600, altura: 1200, qualidade: 0.85 },
      { largura: 1600, altura: 1200, qualidade: 0.85 },
    ])
    // O que sobe é o desenho (250.000 bytes), nunca o arquivo escolhido.
    expect(enviados).toEqual([
      { caminho: `${CONTA}/${PLANO}/fotos/${ID}.jpg`, tipo: 'image/jpeg', bytes: 250_000 },
      { caminho: `${CONTA}/${PLANO}/fotos/${ID}.jpg`, tipo: 'image/jpeg', bytes: 250_000 },
    ])
  })

  it('CB-1467 e D-1530: sem a autorização, a imagem anexada não sobe e a frase pede a marca (pelo sexo da ficha)', async () => {
    const { porta, enviados } = portaFalsa()
    const { desenhista, pedidos } = desenhistaFalso()
    expect(await enviarAnexo(entrada(jpeg(1200, 1600)), porta, desenhista)).toEqual({ tipo: 'erro', mensagem: 'Marque a autorização da paciente para adicionar fotos.' })
    expect(await enviarAnexo(entrada(png(10, 10), { sexo: 'M' }), porta, desenhista)).toEqual({ tipo: 'erro', mensagem: 'Marque a autorização do paciente para adicionar fotos.' })
    expect(await enviarAnexo(entrada(png(10, 10), { sexo: null }), porta, desenhista)).toEqual({ tipo: 'erro', mensagem: 'Marque a autorização da pessoa para adicionar fotos.' })
    expect(pedidos).toEqual([])
    expect(enviados).toEqual([])
  })

  it('CB-1467 e D-1530: com 5 fotos, a imagem anexada não sobe: "Já há 5 fotos nesta avaliação."', async () => {
    const { porta, enviados } = portaFalsa()
    const cinco = Array.from({ length: 5 }, (_, i) => arquivo(1000, { id: String(i) }))
    const r = await enviarAnexo(entrada(jpeg(1200, 1600), { avaliacao: avaliacao({ fotosAutorizadasEm: '2026-11-03', fotos: cinco }) }), porta, desenhistaFalso().desenhista)
    expect(r).toEqual({ tipo: 'erro', mensagem: 'Já há 5 fotos nesta avaliação.' })
    expect(enviados).toEqual([])
  })

  it('CB-1474 e D-1536: o anexo leva um nome neutro, o maior "anexo-N.pdf" da lista mais 1, nunca o do arquivo escolhido', async () => {
    const pdfs = (...nomes: string[]) => nomes.map((nome, i) => arquivo(10, { id: String(i), nome, tipo: 'application/pdf', caminho: `${CONTA}/${PLANO}/anexos/${i}.pdf` }))
    expect(proximoNomeDeAnexo([])).toBe('anexo-1.pdf')
    expect(proximoNomeDeAnexo(pdfs('anexo-1.pdf', 'anexo-2.pdf'))).toBe('anexo-3.pdf')
    // Excluído o 1, o próximo não repete o 2.
    expect(proximoNomeDeAnexo(pdfs('anexo-2.pdf'))).toBe('anexo-3.pdf')
    expect(proximoNomeDeAnexo(pdfs('anexo-9.pdf', 'anexo-10.pdf'))).toBe('anexo-11.pdf')
    expect(proximoNomeDeAnexo(pdfs('exame-antigo.pdf'))).toBe('anexo-1.pdf')
    const { porta } = portaFalsa()
    const r = await enviarAnexo(entrada(PDF, { avaliacao: avaliacao({ anexos: pdfs('anexo-1.pdf') }) }), porta, desenhistaFalso().desenhista)
    expect(r.tipo === 'ok' ? r.arquivo.nome : r.mensagem).toBe('anexo-2.pdf')
  })

  it('CA-2482: outro tipo: "Anexo em PDF, JPG ou PNG."', async () => {
    const { porta, enviados } = portaFalsa()
    expect(await enviarAnexo(entrada(GIF), porta, desenhistaFalso().desenhista)).toEqual({ tipo: 'erro', mensagem: 'Anexo em PDF, JPG ou PNG.' })
    expect(enviados).toEqual([])
  })

  it('CA-2483: 7,8 MB usados e um anexo de 0,5 MB: "Passa de 8 MB somando fotos e anexos." e nada sobe', async () => {
    const { porta, enviados } = portaFalsa()
    const meio = new Uint8Array(0.5 * MEGA)
    meio.set(PDF)
    const r = await enviarAnexo(entrada(meio, { avaliacao: avaliacao({ fotos: [arquivo(7.8 * MEGA)] }) }), porta, desenhistaFalso().desenhista)
    expect(r).toEqual({ tipo: 'erro', mensagem: 'Passa de 8 MB somando fotos e anexos.' })
    expect(enviados).toEqual([])
  })

  it('D-1511 e D-1505: com 10 anexos, nada sobe; recusado com 10 na pasta, "Já há 10 anexos nesta avaliação."; sem rede e sem sessão', async () => {
    const dez = Array.from({ length: 10 }, (_, i) => arquivo(10, { id: String(i), tipo: 'application/pdf' }))
    const { desenhista } = desenhistaFalso()
    expect(await enviarAnexo(entrada(PDF, { avaliacao: avaliacao({ anexos: dez }) }), portaFalsa().porta, desenhista)).toEqual({ tipo: 'erro', mensagem: 'Já há 10 anexos nesta avaliação.' })
    expect(await enviarAnexo(entrada(PDF), portaFalsa({ envio: 'recusado', pasta: naPasta(10, 'anexos') }).porta, desenhista)).toEqual({ tipo: 'erro', mensagem: 'Já há 10 anexos nesta avaliação.' })
    // CB-1497 e D-1547: sem a pasta cheia, a frase genérica; só a sessão vencida diz "Entre de novo".
    expect(await enviarAnexo(entrada(PDF), portaFalsa({ envio: 'recusado', pasta: naPasta(3, 'anexos') }).porta, desenhista)).toEqual({ tipo: 'erro', mensagem: 'Não foi possível enviar agora. Tente de novo.' })
    expect(await enviarAnexo(entrada(PDF), portaFalsa({ envio: 'sessao' }).porta, desenhista)).toEqual({ tipo: 'erro', mensagem: 'Entre de novo para enviar anexos.' })
    // CB-1496: a conta cheia, também no anexo.
    expect(await enviarAnexo(entrada(PDF), portaFalsa({ envio: 'conta-cheia' }).porta, desenhista)).toEqual({ tipo: 'erro', mensagem: 'O espaço de fotos da conta acabou.' })
    expect(await enviarAnexo(entrada(PDF), portaFalsa({ envio: 'sem-rede' }).porta, desenhista)).toEqual({ tipo: 'erro', mensagem: 'O anexo não subiu. Confira a internet e tente de novo.' })
    // CB-1468 e D-1531: a pasta com 8 MB (outra aba) e o anexo novo: a frase do teto.
    expect(await enviarAnexo(entrada(PDF), portaFalsa({ envio: 'recusado', pasta: naPasta(2, 'fotos', 4 * MEGA) }).porta, desenhista)).toEqual({ tipo: 'erro', mensagem: 'Passa de 8 MB somando fotos e anexos.' })
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

describe('o arquivo solto na pasta (D-1534)', () => {
  const lido = (caminho: string, bytes = 1000, criadoEm: string | null = '2026-11-03T12:30:00.000Z') => ({ caminho: `${CONTA}/${PLANO}/${caminho}`, bytes, criadoEm })

  it('CB-1472: a foto e o PDF que estão na pasta e não na lista voltam: a foto como "Outra", o PDF com o nome neutro e a data', () => {
    const naLista = arquivo(1000, { id: 'f1', angulo: 'frente', caminho: `${CONTA}/${PLANO}/fotos/f1.jpg` })
    const anexoNaLista = arquivo(10, { id: 'a1', nome: 'anexo-1.pdf', tipo: 'application/pdf', caminho: `${CONTA}/${PLANO}/anexos/a1.pdf` })
    const av = avaliacao({ fotos: [naLista], anexos: [anexoNaLista] })
    const mudanca = religarSoltos(av, [lido('fotos/f1.jpg'), lido('fotos/f2.jpg', 2000), lido('anexos/a1.pdf'), lido('anexos/a2.pdf', 3000, null)], agora)
    expect(mudanca).toEqual({
      fotos: [naLista, { id: 'f2', angulo: 'outra', nome: 'Outra', caminho: `${CONTA}/${PLANO}/fotos/f2.jpg`, bytes: 2000, tipo: 'image/jpeg', enviadoEm: '2026-11-03T12:30:00.000Z' }],
      anexos: [anexoNaLista, { id: 'a2', nome: 'anexo-2.pdf', caminho: `${CONTA}/${PLANO}/anexos/a2.pdf`, bytes: 3000, tipo: 'application/pdf', enviadoEm: agora.toISOString() }],
    })
  })

  it('D-1534: com a pasta igual à lista, ou vazia, nada muda; o que não tem o formato do caminho fica de fora', () => {
    const naLista = arquivo(1000, { id: 'f1', caminho: `${CONTA}/${PLANO}/fotos/f1.jpg` })
    expect(religarSoltos(avaliacao({ fotos: [naLista] }), [lido('fotos/f1.jpg')], agora)).toBeNull()
    expect(religarSoltos(avaliacao(), [], agora)).toBeNull()
    expect(religarSoltos(avaliacao(), [lido('fotos/x.png'), lido('anexos/y.exe'), lido('outra/z.jpg')], agora)).toBeNull()
  })

  it('D-1534: dois anexos soltos ganham nomes em sequência, pela data do envio', () => {
    const mudanca = religarSoltos(avaliacao(), [lido('anexos/b.pdf', 10, '2026-11-03T13:00:00.000Z'), lido('anexos/a.pdf', 10, '2026-11-03T12:00:00.000Z')], agora)
    expect(mudanca?.anexos?.map((a) => [a.id, a.nome])).toEqual([
      ['a', 'anexo-1.pdf'],
      ['b', 'anexo-2.pdf'],
    ])
  })

  it('D-1534: a resposta do envio substitui o item do mesmo caminho (o que a leitura da pasta devolveu antes)', () => {
    const solto = arquivo(1000, { id: 'f2', angulo: 'outra', nome: 'Outra', caminho: `${CONTA}/${PLANO}/fotos/f2.jpg` })
    const doEnvio = arquivo(1000, { id: 'f2', angulo: 'lado', nome: 'Lado', caminho: `${CONTA}/${PLANO}/fotos/f2.jpg` })
    const outra = arquivo(1000, { id: 'f1', caminho: `${CONTA}/${PLANO}/fotos/f1.jpg` })
    expect(comArquivo([outra, solto], doEnvio)).toEqual([outra, doEnvio])
    expect(comArquivo(null, doEnvio)).toEqual([doEnvio])
  })

  it('D-1534: a pasta lida é a <conta>/<plano>; sem sessão, nada', async () => {
    const pastas: string[] = []
    const { porta } = portaFalsa()
    const lendo: ArmazenamentoDeFotos = { ...porta, listar: async (pasta) => (pastas.push(pasta), []) }
    expect(await lerPastaDoPlano(lendo, PLANO)).toEqual([])
    expect(pastas).toEqual([`${CONTA}/${PLANO}`])
    expect(await lerPastaDoPlano({ ...lendo, conta: async () => null }, PLANO)).toBeNull()
  })
})

describe('a exclusão (D-1458, D-1503)', () => {
  it('CA-2489: apagar os arquivos do plano apaga a pasta <conta>/<plano>; sem sessão, nada', async () => {
    const pastas: string[] = []
    const { porta } = portaFalsa()
    const comPasta: ArmazenamentoDeFotos = { ...porta, apagarPasta: async (pasta) => (pastas.push(pasta), true) }
    expect(await apagarArquivosDoPlano(comPasta, PLANO)).toBe(true)
    expect(pastas).toEqual([`${CONTA}/${PLANO}`])
    expect(await apagarArquivosDoPlano({ ...comPasta, conta: async () => null }, PLANO)).toBe(false)
    expect(pastas).toHaveLength(1)
  })

  it('CB-1464: a avaliação do paciente excluído fica sem fotos, sem anexos e sem a data da autorização', () => {
    const cheia = avaliacao({ fotosAutorizadasEm: '2026-11-03', fotos: [arquivo(10)], anexos: [arquivo(10, { tipo: 'application/pdf' })], diagnostico: 'Sobrepeso.' })
    expect(temArquivos(cheia)).toBe(true)
    const limpa = semArquivos(cheia)
    expect(limpa).toMatchObject({ fotosAutorizadasEm: null, fotos: null, anexos: null, diagnostico: 'Sobrepeso.' })
    expect(temArquivos(limpa)).toBe(false)
    expect(temArquivos(avaliacao({ fotosAutorizadasEm: '2026-11-03' }))).toBe(true)
  })
})
