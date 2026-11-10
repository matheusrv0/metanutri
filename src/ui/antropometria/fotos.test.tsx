// "Fotos e anexos" na vista Avaliação (spec antropometria-telas, F2: D-1450 a D-1459, D-1503 a D-1513; CA-2480 a
// CA-2487, CA-2490, CB-1412 a CB-1416, CB-1466). O armazenamento e o desenhista são falsos; a tela é a de verdade.
import { act, fireEvent, screen, within } from '@testing-library/react'
import { MEGA, type ArmazenamentoDeFotos, type ArquivoNoArmazenamento, type DesenhistaDeFoto, type ResultadoDoEnvio } from '@/domain/fotosDaAvaliacao.ts'
import type { Paciente } from '@/domain/pacientes.ts'
import type { ArquivoDaAvaliacao, Caso } from '@/domain/tipos.ts'
import { casoDe } from './apoioDaVista.test-utils.tsx'
import { AGORA, montarComDados, moldura, planoDe, RENATA } from './apoioDosTestes.test-utils.tsx'
import { ContextoArmazenamentoDeFotos } from './armazenamentoDeFotos.ts'
import { ContextoDesenhistaDeFoto } from './reduzirFoto.ts'
import { TelaAntropometria } from './TelaAntropometria.tsx'

const CONTA = 'conta-da-ana'

/** Um JPEG só com o começo e o SOF0 com os lados. */
function jpeg(largura: number, altura: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(64)
  b.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, altura >> 8, altura & 0xff, largura >> 8, largura & 0xff])
  return b
}
function png(): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(40)
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 10, 0, 0, 0, 10])
  return b
}
const arquivoDe = (bytes: Uint8Array<ArrayBuffer>, nome: string, tipo: string) => new File([bytes], nome, { type: tipo })
const PDF = new TextEncoder().encode('%PDF-1.7\n% exame\n%%EOF')

interface Falsos {
  readonly porta: ArmazenamentoDeFotos
  readonly enviados: { caminho: string; tipo: string }[]
  readonly apagados: string[][]
  readonly assinados: string[]
}

/**
 * `contagem`: quantas fotos a pasta do plano tem depois do primeiro envio (outra aba enviou enquanto a tela estava
 * aberta); `pasta`: o que a leitura da pasta devolve desde a abertura (vale mais que a contagem).
 */
function falsos(p: { envio?: ResultadoDoEnvio; contagem?: number; pasta?: readonly ArquivoNoArmazenamento[] | null; apagar?: boolean } = {}): Falsos {
  const enviados: { caminho: string; tipo: string }[] = []
  const apagados: string[][] = []
  const assinados: string[] = []
  const porta: ArmazenamentoDeFotos = {
    conta: async () => CONTA,
    enviar: async (caminho, _blob, tipo) => {
      enviados.push({ caminho, tipo })
      return p.envio ?? 'ok'
    },
    listar: async (pasta) =>
      p.pasta !== undefined
        ? p.pasta
        : Array.from({ length: enviados.length > 0 ? (p.contagem ?? 0) : 0 }, (_, i) => ({ caminho: `${pasta}/fotos/${i}.jpg`, bytes: 1000, criadoEm: null })),
    assinar: async (caminho) => {
      assinados.push(caminho)
      return `https://falso.supabase.co/assinada/${caminho}?vez=${assinados.length}`
    },
    apagar: async (caminhos) => {
      apagados.push([...caminhos])
      return p.apagar ?? true
    },
    apagarPasta: async () => true,
  }
  return { porta, enviados, apagados, assinados }
}

/** O desenhista falso: toda foto vira um JPEG de 300 KB. */
const desenhista: DesenhistaDeFoto = {
  abrir: async () => ({ largura: 4000, altura: 3000, desenharJpeg: async () => new Blob([new Uint8Array(300 * 1024)], { type: 'image/jpeg' }) }),
}

const foto = (id: string, angulo: ArquivoDaAvaliacao['angulo'], plano = 'av', bytes = 1.1 * MEGA): ArquivoDaAvaliacao => ({
  id,
  ...(angulo ? { angulo } : {}),
  nome: 'Frente',
  caminho: `${CONTA}/${plano}/fotos/${id}.jpg`,
  bytes,
  tipo: 'image/jpeg',
  enviadoEm: '2026-11-03T12:00:00.000Z',
})
const anexo = (id: string, bytes = 412 * 1024): ArquivoDaAvaliacao => ({
  id,
  nome: 'anexo-1.pdf',
  caminho: `${CONTA}/av/anexos/${id}.pdf`,
  bytes,
  tipo: 'application/pdf',
  enviadoEm: '2026-11-03T12:00:00.000Z',
})

const setembro = planoDe('set', casoDe({ pacienteId: 'renata', dataConsulta: '2026-09-08', pesoKg: 72.6, circunferenciaCinturaCm: 85.2, avaliacao: { fotos: [foto('f-set', 'frente', 'set'), foto('l-set', 'lado', 'set')] } }))

interface Abertura {
  readonly avaliacao?: Partial<Caso['avaliacao']>
  readonly paciente?: Paciente | null
  readonly porta?: ArmazenamentoDeFotos | null
  readonly comSetembro?: boolean
}

function abrir({ avaliacao = {}, paciente = RENATA, porta = falsos().porta, comSetembro = true }: Abertura = {}) {
  const atual = planoDe('av', casoDe({ pacienteId: paciente?.id ?? null, dataConsulta: '2026-11-03', pesoKg: 71.5, circunferenciaCinturaCm: 84, avaliacao }))
  const montado = montarComDados({ pacientes: paciente ? [paciente] : [], planos: comSetembro && paciente ? [setembro, atual] : [atual] }, () => (
    <ContextoArmazenamentoDeFotos.Provider value={porta}>
      <ContextoDesenhistaDeFoto.Provider value={desenhista}>
        <TelaAntropometria rota={{ tela: 'antropometria', casoId: 'av', vista: 'avaliacao' }} navegar={() => undefined} moldura={moldura} aoNovaAvaliacao={() => undefined} agora={AGORA} />
      </ContextoDesenhistaDeFoto.Provider>
    </ContextoArmazenamentoDeFotos.Provider>
  ))
  const gravado = () => montado.casos.obter('av')?.caso.avaliacao
  const cartao = () => within(screen.getByRole('region', { name: 'Fotos e anexos' }))
  return { ...montado, gravado, cartao }
}

const campoDaFoto = () => screen.getByLabelText('Adicionar foto')
const campoDoAnexo = () => screen.getByLabelText('Adicionar arquivo')

describe('o consentimento (CA-2480, D-1450, D-1508)', () => {
  it('CA-2480: sem a marca, "Adicionar foto" fica desligado e a frase pede a marca; marcada, grava o dia e mostra "registrado em"', async () => {
    const { usuario, gravado, cartao } = abrir()
    expect(campoDaFoto()).toBeDisabled()
    expect(cartao().getByText('Marque a autorização da paciente para adicionar fotos.')).toBeInTheDocument()
    await usuario.click(cartao().getByRole('checkbox', { name: /A paciente autorizou fotos para o prontuário/ }))
    expect(gravado()?.fotosAutorizadasEm).toBe('2026-11-03')
    expect(cartao().getByRole('checkbox', { name: 'A paciente autorizou fotos para o prontuário · registrado em 03/11/2026' })).toBeChecked()
    expect(campoDaFoto()).toBeEnabled()
    expect(cartao().queryByText('Marque a autorização da paciente para adicionar fotos.')).not.toBeInTheDocument()
  })

  it('CA-2480: desmarcar não apaga as fotos; só impede as novas', async () => {
    const { usuario, gravado, cartao } = abrir({ avaliacao: { fotosAutorizadasEm: '2026-05-12', fotos: [foto('f1', 'frente')] } })
    await usuario.click(cartao().getByRole('checkbox', { name: /autorizou/ }))
    expect(gravado()?.fotosAutorizadasEm).toBeNull()
    expect(gravado()?.fotos).toHaveLength(1)
    expect(cartao().getByText('Frente')).toBeInTheDocument()
    expect(campoDaFoto()).toBeDisabled()
  })

  it('D-1508: no homem, "O paciente autorizou" e "do paciente" no lembrete', () => {
    const { cartao } = abrir({ paciente: { ...RENATA, sexo: 'M' } })
    expect(cartao().getByRole('checkbox', { name: 'O paciente autorizou fotos para o prontuário' })).toBeInTheDocument()
    expect(cartao().getByText('As fotos ficam só no prontuário. Não podem ir para divulgação, nem com autorização do paciente (CFN 599/2018, art. 58).')).toBeInTheDocument()
  })
})

describe('adicionar foto (CA-2481 a CA-2484, D-1509)', () => {
  it('CA-2481: a foto sobe reduzida, no caminho da conta, e aparece com o ângulo e o tamanho; o próximo ângulo já vem escolhido', async () => {
    const f = falsos()
    const { usuario, gravado, cartao } = abrir({ porta: f.porta, avaliacao: { fotosAutorizadasEm: '2026-11-03' } })
    expect(cartao().getByRole('combobox', { name: 'Ângulo da foto' })).toHaveValue('frente')
    await usuario.upload(campoDaFoto(), arquivoDe(jpeg(4000, 3000), 'IMG_0001.jpg', 'image/jpeg'))
    await vi.waitFor(() => expect(gravado()?.fotos).toHaveLength(1))
    const item = gravado()?.fotos?.[0]
    expect(item).toMatchObject({ angulo: 'frente', nome: 'Frente', bytes: 300 * 1024, tipo: 'image/jpeg' })
    expect(item?.caminho).toMatch(new RegExp(`^${CONTA}/av/fotos/[0-9a-f-]{36}\\.jpg$`))
    expect(f.enviados).toEqual([{ caminho: item?.caminho, tipo: 'image/jpeg' }])
    expect(cartao().getByText('1 de 5 fotos')).toBeInTheDocument()
    const lista = within(cartao().getByRole('list', { name: 'Fotos de hoje' }))
    expect(lista.getByText('Frente')).toBeInTheDocument()
    expect(lista.getByText('300 KB')).toBeInTheDocument()
    expect(lista.getByText('Foto 2 de 5')).toBeInTheDocument()
    expect(cartao().getByRole('combobox', { name: 'Ângulo da foto' })).toHaveValue('lado')
  })

  it('CA-2482: GIF com nome .jpg: "Use JPG ou PNG." e nada sobe', async () => {
    const f = falsos()
    const { usuario, gravado, cartao } = abrir({ porta: f.porta, avaliacao: { fotosAutorizadasEm: '2026-11-03' } })
    await usuario.upload(campoDaFoto(), arquivoDe(new TextEncoder().encode('GIF89a......'), 'foto.jpg', 'image/jpeg'))
    expect(await cartao().findByRole('alert')).toHaveTextContent('Use JPG ou PNG.')
    expect(f.enviados).toEqual([])
    expect(gravado()?.fotos ?? []).toEqual([])
  })

  it('CA-2484: 9000 px no cabeçalho: "Use uma foto de até 20 MB e 8000 px."', async () => {
    const { usuario, cartao } = abrir({ avaliacao: { fotosAutorizadasEm: '2026-11-03' } })
    await usuario.upload(campoDaFoto(), arquivoDe(jpeg(9000, 3000), 'grande.jpg', 'image/jpeg'))
    expect(await cartao().findByRole('alert')).toHaveTextContent('Use uma foto de até 20 MB e 8000 px.')
  })

  it('CA-2483: com 5 fotos, "Adicionar foto" fica desligado e "5 de 5 fotos"', () => {
    const cinco = (['frente', 'lado', 'costas', 'outra', 'outra'] as const).map((a, i) => foto(`f${i}`, a, 'av', 200 * 1024))
    const { cartao } = abrir({ avaliacao: { fotosAutorizadasEm: '2026-11-03', fotos: cinco } })
    expect(campoDaFoto()).toBeDisabled()
    expect(cartao().getByText('5 de 5 fotos')).toBeInTheDocument()
    expect(within(cartao().getByRole('list', { name: 'Fotos de hoje' })).queryByText(/^Foto \d de 5$/)).not.toBeInTheDocument()
  })

  it('CB-1413: a rede caiu no envio: a foto não entra e a frase pede para tentar de novo', async () => {
    const { usuario, gravado, cartao } = abrir({ porta: falsos({ envio: 'sem-rede' }).porta, avaliacao: { fotosAutorizadasEm: '2026-11-03' } })
    await usuario.upload(campoDaFoto(), arquivoDe(jpeg(1200, 1600), 'foto.jpg', 'image/jpeg'))
    expect(await cartao().findByRole('alert')).toHaveTextContent('A foto não subiu. Confira a internet e tente de novo.')
    expect(gravado()?.fotos ?? []).toEqual([])
  })

  it('CB-1416: recusada com 5 fotos na pasta (outra aba): "Já há 5 fotos nesta avaliação."', async () => {
    const { usuario, cartao } = abrir({ porta: falsos({ envio: 'recusado', contagem: 5 }).porta, avaliacao: { fotosAutorizadasEm: '2026-11-03' } })
    await usuario.upload(campoDaFoto(), arquivoDe(jpeg(1200, 1600), 'foto.jpg', 'image/jpeg'))
    expect(await cartao().findByRole('alert')).toHaveTextContent('Já há 5 fotos nesta avaliação.')
  })

  it('CB-1415 e D-1547: a sessão vencida (401 ou 403): "Entre de novo para enviar fotos."', async () => {
    const { usuario, cartao } = abrir({ porta: falsos({ envio: 'sessao' }).porta, avaliacao: { fotosAutorizadasEm: '2026-11-03' } })
    await usuario.upload(campoDaFoto(), arquivoDe(jpeg(1200, 1600), 'foto.jpg', 'image/jpeg'))
    expect(await cartao().findByRole('alert')).toHaveTextContent('Entre de novo para enviar fotos.')
  })

  it('CB-1497 e D-1547: recusada sem estar cheia: a frase genérica, sem mandar entrar de novo', async () => {
    const { usuario, gravado, cartao } = abrir({ porta: falsos({ envio: 'recusado', contagem: 1 }).porta, avaliacao: { fotosAutorizadasEm: '2026-11-03' } })
    await usuario.upload(campoDaFoto(), arquivoDe(jpeg(1200, 1600), 'foto.jpg', 'image/jpeg'))
    expect(await cartao().findByRole('alert')).toHaveTextContent('Não foi possível enviar agora. Tente de novo.')
    expect(cartao().queryByText(/Entre de novo/)).not.toBeInTheDocument()
    expect(gravado()?.fotos ?? []).toEqual([])
  })

  it('CB-1496 e D-1547: a conta cheia: "O espaço de fotos da conta acabou.", na foto e no anexo', async () => {
    const { usuario, gravado, cartao } = abrir({ porta: falsos({ envio: 'conta-cheia' }).porta, avaliacao: { fotosAutorizadasEm: '2026-11-03' } })
    await usuario.upload(campoDaFoto(), arquivoDe(jpeg(1200, 1600), 'foto.jpg', 'image/jpeg'))
    expect(await cartao().findByRole('alert')).toHaveTextContent('O espaço de fotos da conta acabou.')
    await usuario.upload(campoDoAnexo(), arquivoDe(PDF, 'exame.pdf', 'application/pdf'))
    await vi.waitFor(() => expect(cartao().getAllByRole('alert').map((a) => a.textContent)).toEqual(['O espaço de fotos da conta acabou.', 'O espaço de fotos da conta acabou.']))
    expect(gravado()?.fotos ?? []).toEqual([])
    expect(gravado()?.anexos ?? []).toEqual([])
  })
})

describe('os quadros e a exclusão (CA-2485, CB-1414, D-1509)', () => {
  it('CB-1414: a imagem pede a URL assinada; falhou, pede de novo uma vez; falhou de novo, "Não foi possível abrir a foto."', async () => {
    const f = falsos()
    const { cartao } = abrir({ porta: f.porta, avaliacao: { fotosAutorizadasEm: '2026-11-03', fotos: [foto('f1', 'frente')] } })
    const imagem = await cartao().findByRole('img', { name: 'Foto de frente, 03/11/2026' })
    expect(imagem).toHaveAttribute('src', `https://falso.supabase.co/assinada/${CONTA}/av/fotos/f1.jpg?vez=1`)
    fireEvent.error(imagem)
    await vi.waitFor(() => expect(cartao().getByRole('img', { name: 'Foto de frente, 03/11/2026' })).toHaveAttribute('src', expect.stringMatching(/vez=2$/)))
    fireEvent.error(cartao().getByRole('img', { name: 'Foto de frente, 03/11/2026' }))
    expect(await cartao().findByText('Não foi possível abrir a foto.')).toBeInTheDocument()
    expect(f.assinados).toHaveLength(2)
  })

  it('CA-2485: "Excluir" pede confirmação; confirmado, o arquivo sai do balde e da lista', async () => {
    const f = falsos()
    const { usuario, gravado, cartao } = abrir({ porta: f.porta, avaliacao: { fotosAutorizadasEm: '2026-11-03', fotos: [foto('f1', 'frente'), foto('f2', 'lado')] } })
    await usuario.click(cartao().getByRole('button', { name: 'Excluir a foto de frente' }))
    const dialogo = screen.getByRole('alertdialog', { name: 'Excluir a foto de frente?' })
    expect(within(dialogo).getByText('A foto sai do prontuário e do armazenamento. Não é possível desfazer.')).toBeInTheDocument()
    await usuario.click(within(dialogo).getByRole('button', { name: 'Excluir foto' }))
    await vi.waitFor(() => expect(gravado()?.fotos?.map((x) => x.id)).toEqual(['f2']))
    expect(f.apagados).toEqual([[`${CONTA}/av/fotos/f1.jpg`]])
  })

  it('CB-1469 e D-1532: "Excluir" da foto tem 44 px de largura e de altura no celular e no toque', () => {
    const { cartao } = abrir({ avaliacao: { fotosAutorizadasEm: '2026-11-03', fotos: [foto('f1', 'frente')] } })
    const classes = cartao().getByRole('button', { name: 'Excluir a foto de frente' }).className.split(/\s+/)
    expect(classes).toEqual(expect.arrayContaining(['h-11', 'max-sm:min-w-11', 'sm:pointer-coarse:h-11', 'sm:pointer-coarse:min-w-11']))
  })

  it('CA-2485: o servidor falhou: a foto fica e a frase diz "Não foi possível excluir. Tente de novo."', async () => {
    const { usuario, gravado, cartao } = abrir({ porta: falsos({ apagar: false }).porta, avaliacao: { fotosAutorizadasEm: '2026-11-03', fotos: [foto('f1', 'frente')] } })
    await usuario.click(cartao().getByRole('button', { name: 'Excluir a foto de frente' }))
    await usuario.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir foto' }))
    expect(await cartao().findByRole('alert')).toHaveTextContent('Não foi possível excluir. Tente de novo.')
    expect(gravado()?.fotos).toHaveLength(1)
  })
})

describe('Comparar fotos (CA-2486, CB-1412, CB-1466, D-1510)', () => {
  it('CA-2486: frente de 08/09 e de 03/11 lado a lado, com a data, o ângulo e o peso, e as diferenças com a leitura', async () => {
    const { usuario, cartao } = abrir({ avaliacao: { fotosAutorizadasEm: '2026-11-03', fotos: [foto('f-nov', 'frente')] } })
    await usuario.click(cartao().getByRole('button', { name: 'Comparar fotos' }))
    const regiao = within(cartao().getByRole('region', { name: 'Comparar fotos' }))
    expect(regiao.getByRole('radio', { name: 'Frente' })).toBeChecked()
    expect(await regiao.findByRole('img', { name: 'Foto de frente, 08/09/2026' })).toBeInTheDocument()
    expect(regiao.getByRole('img', { name: 'Foto de frente, 03/11/2026' })).toBeInTheDocument()
    expect(regiao.getByText('Frente · 72,6 kg')).toBeInTheDocument()
    expect(regiao.getByText('Frente · 71,5 kg')).toBeInTheDocument()
    expect(regiao.getByText('−1,1 kg')).toBeInTheDocument()
    expect(regiao.getByText('72,6 → 71,5 kg')).toBeInTheDocument()
    expect(regiao.getByText('85,2 → 84,0 cm · dentro do erro de medida')).toBeInTheDocument()
    expect(cartao().queryByRole('list', { name: 'Fotos de hoje' })).not.toBeInTheDocument()
  })

  it('CB-1475 e D-1538: o botão só troca o rótulo ("Comparar fotos" e "Ver fotos de hoje"), sem aria-pressed', async () => {
    const { usuario, cartao } = abrir({ avaliacao: { fotosAutorizadasEm: '2026-11-03', fotos: [foto('f-nov', 'frente')] } })
    const comparar = cartao().getByRole('button', { name: 'Comparar fotos' })
    expect(comparar).not.toHaveAttribute('aria-pressed')
    await usuario.click(comparar)
    const voltar = cartao().getByRole('button', { name: 'Ver fotos de hoje' })
    expect(voltar).not.toHaveAttribute('aria-pressed')
    await usuario.click(voltar)
    expect(cartao().getByRole('list', { name: 'Fotos de hoje' })).toBeInTheDocument()
  })

  it('CB-1466: sem foto de lado na de hoje, o quadro diz "Sem foto de lado em 03/11/2026." e a de antes aparece', async () => {
    const { usuario, cartao } = abrir({ avaliacao: { fotosAutorizadasEm: '2026-11-03', fotos: [foto('f-nov', 'frente')] } })
    await usuario.click(cartao().getByRole('button', { name: 'Comparar fotos' }))
    const regiao = within(cartao().getByRole('region', { name: 'Comparar fotos' }))
    await usuario.click(regiao.getByRole('radio', { name: 'Lado' }))
    expect(regiao.getByText('Sem foto de lado em 03/11/2026.')).toBeInTheDocument()
    expect(await regiao.findByRole('img', { name: 'Foto de lado, 08/09/2026' })).toBeInTheDocument()
  })

  it('CB-1412: sem outra avaliação com foto, "Comparar fotos precisa de outra avaliação com foto."', async () => {
    const { usuario, cartao } = abrir({ comSetembro: false, avaliacao: { fotosAutorizadasEm: '2026-11-03', fotos: [foto('f-nov', 'frente')] } })
    await usuario.click(cartao().getByRole('button', { name: 'Comparar fotos' }))
    expect(cartao().getByText('Comparar fotos precisa de outra avaliação com foto.')).toBeInTheDocument()
  })
})

describe('anexos e espaço (CA-2482, CA-2483, D-1511)', () => {
  it('CA-2482, CB-1474 e D-1536: o PDF sobe como anexo, com o nome neutro e a data; o nome do arquivo não fica', async () => {
    const f = falsos()
    const { usuario, gravado, cartao } = abrir({ porta: f.porta })
    await usuario.upload(campoDoAnexo(), arquivoDe(PDF, 'exame-maria-silva.pdf', 'application/pdf'))
    await vi.waitFor(() => expect(gravado()?.anexos).toHaveLength(1))
    expect(f.enviados.map((e) => e.tipo)).toEqual(['application/pdf'])
    expect(f.enviados[0]?.caminho).toMatch(/\/anexos\/[0-9a-f-]{36}\.pdf$/)
    expect(gravado()?.anexos?.[0]?.nome).toBe('anexo-1.pdf')
    expect(JSON.stringify(gravado())).not.toMatch(/maria/i)
    const lista = within(cartao().getByRole('list', { name: 'Anexos' }))
    expect(lista.getByText('anexo-1.pdf')).toBeInTheDocument()
    expect(lista.getByText(/^\d{2}\/\d{2}\/\d{4} · \d+ KB$/)).toBeInTheDocument()
    expect(cartao().queryByText(/maria/i)).not.toBeInTheDocument()
    await usuario.upload(campoDoAnexo(), arquivoDe(PDF, 'outro.pdf', 'application/pdf'))
    await vi.waitFor(() => expect(gravado()?.anexos?.map((a) => a.nome)).toEqual(['anexo-1.pdf', 'anexo-2.pdf']))
  })

  it('CB-1467 e D-1530: a imagem anexada (o PNG chamado .pdf) entra como foto "Outra", em JPEG, e conta nas 5', async () => {
    const f = falsos()
    const { usuario, gravado, cartao } = abrir({ porta: f.porta, avaliacao: { fotosAutorizadasEm: '2026-11-03' } })
    await usuario.upload(campoDoAnexo(), arquivoDe(png(), 'bioimpedancia.pdf', 'application/pdf'))
    await vi.waitFor(() => expect(gravado()?.fotos).toHaveLength(1))
    expect(gravado()?.fotos?.[0]).toMatchObject({ angulo: 'outra', nome: 'Outra', tipo: 'image/jpeg', bytes: 300 * 1024 })
    expect(gravado()?.anexos ?? []).toEqual([])
    expect(f.enviados).toEqual([{ caminho: expect.stringMatching(/\/fotos\/[0-9a-f-]{36}\.jpg$/), tipo: 'image/jpeg' }])
    expect(cartao().getByText('1 de 5 fotos')).toBeInTheDocument()
    expect(within(cartao().getByRole('list', { name: 'Fotos de hoje' })).getByText('Outra')).toBeInTheDocument()
    expect(cartao().queryByRole('list', { name: 'Anexos' })).not.toBeInTheDocument()
  })

  it('CB-1467 e D-1530: sem a autorização, a imagem anexada não sobe e a frase pede a marca', async () => {
    const f = falsos()
    const { usuario, gravado, cartao } = abrir({ porta: f.porta })
    await usuario.upload(campoDoAnexo(), arquivoDe(jpeg(1200, 1600), 'IMG_0001.jpg', 'image/jpeg'))
    expect(await cartao().findByRole('alert')).toHaveTextContent('Marque a autorização da paciente para adicionar fotos.')
    expect(f.enviados).toEqual([])
    expect(gravado()?.fotos ?? []).toEqual([])
  })

  it('CB-1467 e D-1530: com 5 fotos, a imagem anexada não sobe: "Já há 5 fotos nesta avaliação."', async () => {
    const f = falsos()
    const cinco = (['frente', 'lado', 'costas', 'outra', 'outra'] as const).map((a, i) => foto(`f${i}`, a, 'av', 200 * 1024))
    const { usuario, cartao } = abrir({ porta: f.porta, avaliacao: { fotosAutorizadasEm: '2026-11-03', fotos: cinco } })
    await usuario.upload(campoDoAnexo(), arquivoDe(jpeg(1200, 1600), 'IMG_0001.jpg', 'image/jpeg'))
    expect(await cartao().findByRole('alert')).toHaveTextContent('Já há 5 fotos nesta avaliação.')
    expect(f.enviados).toEqual([])
  })

  it('D-1530: a frase dos limites diz que a imagem anexada entra como foto', () => {
    const { cartao } = abrir()
    expect(cartao().getByText('Até 5 fotos por avaliação. Fotos e anexos somam até 8 MB. Fotos em JPG ou PNG; anexos em PDF. Imagem anexada entra como foto.')).toBeInTheDocument()
  })

  it('CA-2483: 7,8 MB usados e um anexo de 0,5 MB: "Passa de 8 MB somando fotos e anexos." e nada sobe', async () => {
    const f = falsos()
    const { usuario, cartao } = abrir({ porta: f.porta, avaliacao: { anexos: [anexo('a1', 7.8 * MEGA)] } })
    const meio = new Uint8Array(0.5 * MEGA)
    meio.set(PDF)
    await usuario.upload(campoDoAnexo(), arquivoDe(meio, 'grande.pdf', 'application/pdf'))
    expect(await cartao().findByRole('alert')).toHaveTextContent('Passa de 8 MB somando fotos e anexos.')
    expect(f.enviados).toEqual([])
  })

  it('D-1451: a barra diz quanto se usou, fotos e anexos somados', () => {
    const { cartao } = abrir({ avaliacao: { fotosAutorizadasEm: '2026-11-03', fotos: [foto('f1', 'frente', 'av', 3.3 * MEGA)], anexos: [anexo('a1', 0.4 * MEGA)] } })
    expect(cartao().getByText('3,7 de 8 MB usados')).toBeInTheDocument()
    expect(cartao().getByRole('progressbar', { name: 'Espaço usado' })).toBeInTheDocument()
    expect(within(cartao().getByRole('list', { name: 'Anexos' })).getByText('03/11/2026 · 410 KB')).toBeInTheDocument()
  })

  it('D-1511: com 10 anexos, "Adicionar arquivo" fica desligado e "10 de 10 anexos."', () => {
    const { cartao } = abrir({ avaliacao: { anexos: Array.from({ length: 10 }, (_, i) => anexo(`a${i}`, 1000)) } })
    expect(campoDoAnexo()).toBeDisabled()
    expect(cartao().getByText('10 de 10 anexos.')).toBeInTheDocument()
  })

  it('D-1511: "Abrir" abre o anexo numa aba nova, pela URL assinada', async () => {
    const f = falsos()
    const aba = { opener: {}, location: { replace: vi.fn() }, close: vi.fn() }
    const abrirAba = vi.spyOn(window, 'open').mockReturnValue(aba as unknown as Window)
    try {
      const { usuario, cartao } = abrir({ porta: f.porta, avaliacao: { anexos: [anexo('a1')] } })
      await usuario.click(cartao().getByRole('button', { name: 'Abrir anexo-1.pdf' }))
      await vi.waitFor(() => expect(aba.location.replace).toHaveBeenCalledWith(`https://falso.supabase.co/assinada/${CONTA}/av/anexos/a1.pdf?vez=1`))
      expect(abrirAba).toHaveBeenCalledWith('about:blank', '_blank')
      expect(aba.opener).toBeNull()
    } finally {
      abrirAba.mockRestore()
    }
  })
})

describe('o arquivo solto (CB-1472, D-1534)', () => {
  it('CB-1472: ao abrir, a foto e o PDF que estão na pasta e não na lista voltam: a foto como "Outra", o PDF como "anexo-N.pdf"', async () => {
    const pasta = [
      { caminho: `${CONTA}/av/fotos/f1.jpg`, bytes: 200 * 1024, criadoEm: '2026-11-03T12:00:00.000Z' },
      { caminho: `${CONTA}/av/fotos/solta.jpg`, bytes: 250 * 1024, criadoEm: '2026-11-03T12:10:00.000Z' },
      { caminho: `${CONTA}/av/anexos/solto.pdf`, bytes: 90 * 1024, criadoEm: '2026-11-03T12:20:00.000Z' },
    ]
    const { gravado, cartao } = abrir({ porta: falsos({ pasta }).porta, avaliacao: { fotosAutorizadasEm: '2026-11-03', fotos: [foto('f1', 'frente', 'av', 200 * 1024)] } })
    await vi.waitFor(() => expect(gravado()?.fotos).toHaveLength(2))
    expect(gravado()?.fotos?.[1]).toMatchObject({ id: 'solta', angulo: 'outra', caminho: `${CONTA}/av/fotos/solta.jpg`, bytes: 250 * 1024 })
    expect(gravado()?.anexos).toEqual([
      { id: 'solto', nome: 'anexo-1.pdf', caminho: `${CONTA}/av/anexos/solto.pdf`, bytes: 90 * 1024, tipo: 'application/pdf', enviadoEm: '2026-11-03T12:20:00.000Z' },
    ])
    expect(await cartao().findByText('2 de 5 fotos')).toBeInTheDocument()
    expect(within(cartao().getByRole('list', { name: 'Anexos' })).getByText('anexo-1.pdf')).toBeInTheDocument()
    expect(cartao().getByRole('button', { name: 'Excluir a foto de outra' })).toBeInTheDocument()
  })

  it('D-1534: sem nada solto (ou sem conseguir ler a pasta), a lista fica como está', async () => {
    const lidas: string[] = []
    const f = falsos({ pasta: null })
    const porta: ArmazenamentoDeFotos = { ...f.porta, listar: async (pasta) => (lidas.push(pasta), null) }
    const { gravado } = abrir({ porta, avaliacao: { fotosAutorizadasEm: '2026-11-03', fotos: [foto('f1', 'frente')] } })
    await vi.waitFor(() => expect(lidas).toEqual([`${CONTA}/av`]))
    expect(gravado()?.fotos?.map((x) => x.id)).toEqual(['f1'])
    expect(gravado()?.anexos ?? []).toEqual([])
  })
})

describe('sem divulgação e sem nuvem (CA-2487, CA-2490, D-1512)', () => {
  it('CA-2487: nenhum botão de compartilhar, baixar ou levar ao documento; a frase do art. 58', () => {
    const { cartao } = abrir({ avaliacao: { fotosAutorizadasEm: '2026-11-03', fotos: [foto('f1', 'frente')] } })
    expect(cartao().queryByRole('button', { name: /compartilh|baix|download|documento|divulg/i })).not.toBeInTheDocument()
    expect(cartao().queryByRole('link')).not.toBeInTheDocument()
    expect(cartao().getByText('As fotos ficam só no prontuário. Não podem ir para divulgação, nem com autorização da paciente (CFN 599/2018, art. 58).')).toBeInTheDocument()
  })

  it('CA-2490: no modo local, o cartão diz que os arquivos ficam na nuvem e não oferece envio', () => {
    const { cartao } = abrir({ porta: null })
    expect(cartao().getByText('Fotos e anexos ficam guardados na conta, na nuvem.')).toBeInTheDocument()
    expect(document.querySelector('input[type="file"]')).toBeNull()
  })

  it('D-1512: o plano sem paciente não mostra o cartão', () => {
    abrir({ paciente: null })
    expect(screen.queryByRole('region', { name: 'Fotos e anexos' })).not.toBeInTheDocument()
  })

  it('a foto enviada sem esperar (a pessoa saiu da tela) não quebra nada', async () => {
    const { usuario, unmount } = { ...abrir({ avaliacao: { fotosAutorizadasEm: '2026-11-03' } }), unmount: () => undefined }
    await usuario.upload(campoDaFoto(), arquivoDe(jpeg(1200, 1600), 'foto.jpg', 'image/jpeg'))
    await act(async () => unmount())
  })
})
