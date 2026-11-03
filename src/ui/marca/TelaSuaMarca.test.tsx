// Spec marca-no-link: Conta e assinatura › Sua marca (CA-1950 a CA-1964, CA-1978, CA-1980, CB-950, CB-960). O desenho
// de verdade da logo (o <canvas>) é testado no Playwright; aqui, um desenhista falso devolve um PNG conhecido.
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { criarCasoVazio } from '@/domain/caso.ts'
import type { Desenhista } from '@/domain/logoDaMarca.ts'
import type { MarcaDoLink } from '@/domain/marca.ts'
import { gravarPerfil, lerPerfil, PERFIL_VAZIO, type Perfil } from '@/domain/perfil.ts'
import { criarPlanoPadrao } from '@/domain/plano.ts'
import { FolhaDieta } from '../exportar/FolhaDieta.tsx'
import { useRota } from '../usarRota.ts'
import { TelaSuaMarca } from './TelaSuaMarca.tsx'

/** Um PNG em data URI com `bytes` bytes (múltiplo de 3), começando pela assinatura do PNG. */
const png = (bytes: number, marca = 'A') => `data:image/png;base64,iVBORw0KGgo${marca.repeat((bytes / 3) * 4 - 11)}`
const PNG_REDUZIDO = png(3000, 'B')
const JPG_ANTIGO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ'

const BYTES_PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0))
const arquivoPng = () => new File([BYTES_PNG], 'logo.png', { type: 'image/png' })
/** Um GIF de 1 × 1 de verdade (o das provas V2 e V2b da revisão de 03/11/2026). */
const BYTES_GIF = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), (c) => c.charCodeAt(0))

interface OpcoesDoDesenhista {
  readonly bytes?: number
  /** Pixels todos brancos: a logo clara demais (CB-950). */
  readonly clara?: boolean
}

function desenhistaFalso(opcoes: OpcoesDoDesenhista = {}) {
  const abertos: string[] = []
  const desenhista: Desenhista = {
    async abrir(dataUrl) {
      abertos.push(dataUrl)
      return {
        largura: 1200,
        altura: 400,
        desenhar: () => ({
          dataUrl: opcoes.bytes ? png(opcoes.bytes, 'C') : PNG_REDUZIDO,
          pixels: Uint8ClampedArray.from({ length: 400 }, (_, i) => (opcoes.clara || i % 4 === 3 ? 255 : 0)),
        }),
      }
    },
  }
  return { desenhista, abertos }
}

function publicadorFalso(resposta: string | null = null) {
  const publicadas: MarcaDoLink[] = []
  const publicar = async (marca: MarcaDoLink) => {
    publicadas.push(marca)
    return resposta
  }
  return { publicar, publicadas }
}

const perfilGuardado = (): Perfil => lerPerfil(localStorage)
const guardar = (mudanca: Partial<Perfil>) => gravarPerfil(localStorage, { ...PERFIL_VAZIO, nome: 'Ana Lima', ...mudanca })

function abrir(opcoes: { readonly desenhista?: Desenhista; readonly publicar?: ((marca: MarcaDoLink) => Promise<string | null>) | null } = {}) {
  const usuario = userEvent.setup()
  render(<TelaSuaMarca desenhista={opcoes.desenhista ?? desenhistaFalso().desenhista} publicar={opcoes.publicar === undefined ? publicadorFalso().publicar : opcoes.publicar} />)
  return usuario
}

const salvar = () => screen.getByRole('button', { name: 'Salvar' })
/** A raiz do link num dos celulares da prévia (que é `aria-hidden`, como o protótipo manda: DP-ML-15). */
const linkNaPrevia = (tema: 'claro' | 'escuro') => {
  const figura = screen.getByRole('figure', { name: tema === 'claro' ? /Celular claro/ : /Celular escuro/ })
  return figura.querySelector<HTMLElement>('[data-link-do-paciente]')
}

beforeEach(() => {
  localStorage.clear()
  globalThis.location.hash = '#/conta/marca'
})

describe('Sua marca: a tela (CA-1950, CA-1981)', () => {
  it('CA-1950: tem Logo, Cor, "Salvar" e a prévia do link num celular claro e num escuro', () => {
    abrir()
    expect(screen.getByRole('heading', { name: 'Logo' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cor' })).toBeInTheDocument()
    expect(salvar()).toBeInTheDocument()
    expect(screen.getByRole('figure', { name: /Celular claro/ })).toBeInTheDocument()
    expect(screen.getByRole('figure', { name: /Celular escuro/ })).toBeInTheDocument()
    expect(linkNaPrevia('claro')?.closest('.tema-claro')).not.toBeNull()
    expect(linkNaPrevia('escuro')?.closest('.dark')).not.toBeNull()
  })

  it('CA-1981: o formulário vem primeiro e a prévia depois (no celular, um embaixo do outro)', () => {
    abrir()
    const cor = screen.getByRole('heading', { name: 'Cor' })
    const previa = screen.getByRole('figure', { name: /Celular claro/ })
    expect(cor.compareDocumentPosition(previa) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('sem mudança e com a marca já publicada, "Salvar" fica desabilitado', () => {
    guardar({ cor: '#1f4e8c', marcaPublicada: true })
    abrir()
    expect(salvar()).toBeDisabled()
    expect(screen.queryByText('Vale para todos os links já enviados.')).not.toBeInTheDocument()
  })
})

describe('Sua marca: a logo (CA-1951 a CA-1956, CB-950)', () => {
  it('CA-1951: a logo antiga de Configurações aparece aqui e continua no plano impresso; o link não muda até salvar', async () => {
    guardar({ logo: JPG_ANTIGO })
    const { publicar, publicadas } = publicadorFalso()
    const { desenhista, abertos } = desenhistaFalso()
    const usuario = abrir({ publicar, desenhista })
    expect(screen.getByRole('img', { name: 'Sua logo' })).toHaveAttribute('src', JPG_ANTIGO)
    expect(publicadas).toEqual([])
    // DP-ML-10: ainda não publicada, a logo de hoje já pode ir para o link.
    expect(salvar()).toBeEnabled()
    expect(screen.getByText('Vale para todos os links já enviados.')).toBeInTheDocument()

    await usuario.click(salvar())
    // DP-ML-12: no primeiro "Salvar", a logo antiga passa pela redução e vira PNG.
    expect(await screen.findByText('Salvo')).toBeInTheDocument()
    expect(abertos).toEqual([JPG_ANTIGO])
    expect(publicadas).toEqual([{ logo: PNG_REDUZIDO, cor: null }])
    expect(perfilGuardado()).toMatchObject({ logo: PNG_REDUZIDO, marcaPublicada: true, nome: 'Ana Lima' })
  })

  it('CA-1952: o arquivo enviado aparece nos dois celulares; ao salvar, a logo guardada é a cópia em PNG', async () => {
    const { publicar, publicadas } = publicadorFalso()
    const usuario = abrir({ publicar })
    await usuario.upload(screen.getByLabelText('Enviar logo'), arquivoPng())
    expect(await screen.findByRole('img', { name: 'Sua logo' })).toHaveAttribute('src', PNG_REDUZIDO)
    for (const tema of ['claro', 'escuro'] as const) expect(linkNaPrevia(tema)?.querySelector('img')?.getAttribute('src')).toBe(PNG_REDUZIDO)
    expect(screen.getByLabelText('Trocar logo')).toBeInTheDocument()

    await usuario.click(salvar())
    await screen.findByText('Salvo')
    expect(publicadas).toEqual([{ logo: PNG_REDUZIDO, cor: null }])
    expect(perfilGuardado().logo).toBe(PNG_REDUZIDO)
  })

  it('CA-1953: GIF, HEIC, PDF ou mais de 2 MB: "Use PNG, JPG, WebP ou SVG, até 2 MB." e nada muda', async () => {
    guardar({ logo: PNG_REDUZIDO, marcaPublicada: true })
    const usuario = userEvent.setup({ applyAccept: false })
    const { desenhista, abertos } = desenhistaFalso()
    render(<TelaSuaMarca desenhista={desenhista} publicar={publicadorFalso().publicar} />)
    for (const arquivo of [
      new File(['GIF89a'], 'logo.gif', { type: 'image/gif' }),
      new File(['x'], 'foto.heic', { type: 'image/heic' }),
      new File(['%PDF'], 'logo.pdf', { type: 'application/pdf' }),
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' }),
      // As provas V2 e V2b da revisão: o GIF de verdade salvo como .png, e como .jpg sem tipo. Vale o conteúdo.
      new File([BYTES_GIF], 'logo.png', { type: 'image/png' }),
      new File([BYTES_GIF], 'logo.jpg', { type: '' }),
    ]) {
      await usuario.upload(screen.getByLabelText('Trocar logo'), arquivo)
      expect(await screen.findByRole('alert'), arquivo.name).toHaveTextContent('Use PNG, JPG, WebP ou SVG, até 2 MB.')
      expect(screen.getByRole('img', { name: 'Sua logo' })).toHaveAttribute('src', PNG_REDUZIDO)
      expect(salvar()).toBeDisabled()
    }
    expect(abertos).toEqual([])
  })

  it('CB-967: a imagem de mais de 8.000 px de lado é recusada pelo cabeçalho, sem abrir: "Use uma logo mais simples."', async () => {
    const { desenhista, abertos } = desenhistaFalso()
    const usuario = abrir({ desenhista })
    const cabecalho = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0x1f, 0x41, 0, 0, 0, 40, 8, 6, 0, 0, 0])
    await usuario.upload(screen.getByLabelText('Enviar logo'), new File([cabecalho], 'gigante.png', { type: 'image/png' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Use uma logo mais simples.')
    expect(screen.queryByRole('img', { name: 'Sua logo' })).not.toBeInTheDocument()
    expect(abertos).toEqual([])
    expect(salvar()).toBeDisabled()
  })

  it('CA-1954: a imagem que nem em 240 px cabe em 150 KB: "Use uma logo mais simples." e nada muda', async () => {
    const usuario = abrir({ desenhista: desenhistaFalso({ bytes: 150 * 1024 + 3 }).desenhista })
    await usuario.upload(screen.getByLabelText('Enviar logo'), arquivoPng())
    expect(await screen.findByRole('alert')).toHaveTextContent('Use uma logo mais simples.')
    expect(screen.queryByRole('img', { name: 'Sua logo' })).not.toBeInTheDocument()
    expect(salvar()).toBeDisabled()
  })

  it('CA-1955: o SVG com <script> e onload vira PNG, e o SVG não é guardado em lugar nenhum', async () => {
    const { publicar, publicadas } = publicadorFalso()
    const { desenhista, abertos } = desenhistaFalso()
    const usuario = abrir({ publicar, desenhista })
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" onload="window.__rodou=1"><script>window.__rodou=2</script></svg>'
    await usuario.upload(screen.getByLabelText('Enviar logo'), new File([svg], 'logo.svg', { type: 'image/svg+xml' }))
    expect(await screen.findByRole('img', { name: 'Sua logo' })).toHaveAttribute('src', PNG_REDUZIDO)
    expect(abertos[0]).toMatch(/^data:image\/svg\+xml;base64,/)
    await usuario.click(salvar())
    await screen.findByText('Salvo')
    expect(publicadas[0]?.logo).toBe(PNG_REDUZIDO)
    expect(localStorage.getItem('metanutri:perfil')).not.toMatch(/svg|script|onload/i)
    expect((globalThis as { __rodou?: number }).__rodou).toBeUndefined()
  })

  it('CA-1956 e CA-1978: "Remover" e "Salvar" tiram a logo do link e do plano impresso (que volta ao MetaNutri)', async () => {
    guardar({ logo: PNG_REDUZIDO, cor: '#7a2944', marcaPublicada: true })
    const { publicar, publicadas } = publicadorFalso()
    const usuario = abrir({ publicar })
    await usuario.click(screen.getByRole('button', { name: 'Remover' }))
    expect(screen.getByText('Sem logo')).toBeInTheDocument()
    expect(screen.getByLabelText('Enviar logo')).toBeInTheDocument()
    await usuario.click(salvar())
    await screen.findByText('Salvo')
    expect(publicadas).toEqual([{ logo: null, cor: '#7a2944' }])
    expect(perfilGuardado().logo).toBeNull()

    let n = 0
    const { container } = render(<FolhaDieta caso={criarCasoVazio('c1')} plano={criarPlanoPadrao(() => `r${++n}`)} />)
    expect(container.querySelector('header img[src^="data:"]')).toBeNull()
    expect(within(container).getAllByRole('img', { name: 'MetaNutri' }).length).toBeGreaterThan(0)
  })

  it('CA-1978: o plano impresso usa a logo de "Sua marca", e nenhuma cor dela', async () => {
    const usuario = abrir()
    await usuario.upload(screen.getByLabelText('Enviar logo'), arquivoPng())
    await usuario.click(screen.getByRole('radio', { name: 'Vinho, #7A2944' }))
    await usuario.click(salvar())
    await screen.findByText('Salvo')

    let n = 0
    const { container } = render(<FolhaDieta caso={criarCasoVazio('c1')} plano={criarPlanoPadrao(() => `r${++n}`)} />)
    expect(container.querySelector('header img')?.getAttribute('src')).toBe(PNG_REDUZIDO)
    expect(container.innerHTML).not.toMatch(/7a2944|marca-da-nutricionista/i)
  })

  it('CB-950: logo clara demais avisa, e "Salvar" continua habilitado', async () => {
    const usuario = abrir({ desenhista: desenhistaFalso({ clara: true }).desenhista })
    await usuario.upload(screen.getByLabelText('Enviar logo'), arquivoPng())
    expect(await screen.findByText('A logo é clara demais para o fundo branco.')).toBeInTheDocument()
    expect(salvar()).toBeEnabled()
  })
})

describe('Sua marca: a cor (CA-1957 a CA-1962, CB-960)', () => {
  it('CA-1957: escolher uma cor pronta muda a prévia na hora, nos dois celulares', async () => {
    const usuario = abrir()
    await usuario.click(screen.getByRole('radio', { name: 'Verde-folha, #3F5F2A' }))
    expect(linkNaPrevia('claro')).toHaveClass('marca-da-nutricionista')
    expect(linkNaPrevia('claro')?.style.getPropertyValue('--marca-claro')).toBe('#3f5f2a')
    expect(linkNaPrevia('escuro')?.style.getPropertyValue('--marca-escuro')).toBe('#7ab455')
    expect(screen.getByRole('figure', { name: /Celular escuro/ })).toHaveTextContent('#7AB455')
  })

  it('CA-1958: "Outra cor" digitada vale na prévia', async () => {
    const usuario = abrir()
    const campo = screen.getByRole('textbox', { name: 'Outra cor' })
    await usuario.clear(campo)
    await usuario.type(campo, '1F4E8C')
    expect(linkNaPrevia('claro')?.style.getPropertyValue('--marca-claro')).toBe('#1f4e8c')
  })

  it('CA-1959: cor aceita mostra o contraste e habilita "Salvar"', async () => {
    const usuario = abrir()
    await usuario.click(screen.getByRole('radio', { name: 'Azul, #1F4E8C' }))
    expect(screen.getByText(/Contraste/)).toHaveTextContent('Contraste 8,31:1')
    expect(salvar()).toBeEnabled()
  })

  it('CA-1960: #8CC63F é recusada, "Salvar" desabilita e "Usar #587F26" resolve', async () => {
    const usuario = abrir()
    const campo = screen.getByRole('textbox', { name: 'Outra cor' })
    await usuario.clear(campo)
    await usuario.type(campo, '#8CC63F')
    expect(screen.getByText('Contraste 2,05:1 com o texto branco. O mínimo é 4,5:1.')).toBeInTheDocument()
    expect(salvar()).toBeDisabled()
    await usuario.click(screen.getByRole('button', { name: 'Usar #587F26' }))
    expect(campo).toHaveValue('#587F26')
    expect(screen.getByText(/Contraste/)).toHaveTextContent('Contraste 4,69:1')
    expect(salvar()).toBeEnabled()
  })

  it('CA-1961: 4,4987:1 aparece como 4,49 e é recusada', async () => {
    const usuario = abrir()
    const campo = screen.getByRole('textbox', { name: 'Outra cor' })
    await usuario.clear(campo)
    await usuario.type(campo, '#018580')
    expect(screen.getByText('Contraste 4,49:1 com o texto branco. O mínimo é 4,5:1.')).toBeInTheDocument()
    expect(salvar()).toBeDisabled()
  })

  it('CA-1980: a recusa é anunciada e fica ligada ao campo da cor', async () => {
    const usuario = abrir()
    const campo = screen.getByRole('textbox', { name: 'Outra cor' })
    await usuario.clear(campo)
    await usuario.type(campo, '#8CC63F')
    expect(campo).toHaveAccessibleDescription(/Contraste 2,05:1 com o texto branco\. O mínimo é 4,5:1\./)
    expect(screen.getByText('Contraste 2,05:1 com o texto branco. O mínimo é 4,5:1.').closest('[aria-live]')).not.toBeNull()
  })

  it('CB-960: a padrão do MetaNutri (também digitada) grava "sem cor"', async () => {
    guardar({ cor: '#1f4e8c', marcaPublicada: true })
    const { publicar, publicadas } = publicadorFalso()
    const usuario = abrir({ publicar })
    const campo = screen.getByRole('textbox', { name: 'Outra cor' })
    await usuario.clear(campo)
    await usuario.type(campo, '#0E3B43')
    expect(screen.getByRole('radio', { name: 'Padrão do MetaNutri, #0E3B43' })).toBeChecked()
    expect(linkNaPrevia('claro')).not.toHaveClass('marca-da-nutricionista')
    await usuario.click(salvar())
    await screen.findByText('Salvo')
    expect(publicadas).toEqual([{ logo: null, cor: null }])
    expect(perfilGuardado().cor).toBeNull()
  })
})

describe('Sua marca: salvar (CA-1963, CB-956)', () => {
  it('CA-1963: "Salvar" grava a marca publicada e o perfil, e mostra "Salvo"; a próxima mudança tira o "Salvo"', async () => {
    const { publicar, publicadas } = publicadorFalso()
    const usuario = abrir({ publicar })
    await usuario.click(screen.getByRole('radio', { name: 'Rosa-escuro, #B5476B' }))
    expect(screen.getByText('Vale para todos os links já enviados.')).toBeInTheDocument()
    await usuario.click(salvar())
    expect((await screen.findByText('Salvo')).closest('[role="status"]')).not.toBeNull()
    expect(publicadas).toEqual([{ logo: null, cor: '#b5476b' }])
    expect(perfilGuardado()).toMatchObject({ cor: '#b5476b', marcaPublicada: true })
    expect(salvar()).toBeDisabled()
    await usuario.click(screen.getByRole('radio', { name: 'Azul, #1F4E8C' }))
    expect(screen.queryByText('Salvo')).not.toBeInTheDocument()
  })

  it('a nuvem recusou ou não respondeu: a tela diz o motivo e nada muda', async () => {
    const { publicar } = publicadorFalso('Não foi possível falar com o servidor. Confira a internet e tente de novo.')
    const usuario = abrir({ publicar })
    await usuario.click(screen.getByRole('radio', { name: 'Azul, #1F4E8C' }))
    await usuario.click(salvar())
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível falar com o servidor.')
    expect(screen.queryByText('Salvo')).not.toBeInTheDocument()
    expect(perfilGuardado().cor).toBeNull()
    expect(salvar()).toBeEnabled()
  })

  it('DP-ML-11: sem servidor (modo local), "Salvar" grava só o perfil', async () => {
    const usuario = abrir({ publicar: null })
    await usuario.click(screen.getByRole('radio', { name: 'Azul, #1F4E8C' }))
    await usuario.click(salvar())
    await screen.findByText('Salvo')
    expect(perfilGuardado().cor).toBe('#1f4e8c')
  })
})

describe('Sua marca: sair sem salvar (CA-1964)', () => {
  function Anfitriao({ publicar }: { readonly publicar: (marca: MarcaDoLink) => Promise<string | null> }) {
    const [rota, navegar] = useRota()
    return (
      <>
        <button type="button" onClick={() => navegar({ tela: 'painel' })}>
          Ir ao painel
        </button>
        {rota.tela === 'marca' ? <TelaSuaMarca desenhista={desenhistaFalso().desenhista} publicar={publicar} /> : <p>Tela do painel</p>}
      </>
    )
  }

  it('sem mudança, sai direto', async () => {
    render(<Anfitriao publicar={publicadorFalso().publicar} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ir ao painel' }))
    expect(screen.getByText('Tela do painel')).toBeInTheDocument()
  })

  it('CA-1964: com mudança, pergunta "Sair sem salvar a marca?"; "Continuar aqui" fica e "Sair" descarta', async () => {
    render(<Anfitriao publicar={publicadorFalso().publicar} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('radio', { name: 'Vinho, #7A2944' }))
    await usuario.click(screen.getByRole('button', { name: 'Ir ao painel' }))
    expect(screen.getByRole('alertdialog', { name: 'Sair sem salvar a marca?' })).toBeInTheDocument()
    expect(globalThis.location.hash).toBe('#/conta/marca')

    await usuario.click(screen.getByRole('button', { name: 'Continuar aqui' }))
    expect(screen.getByRole('radio', { name: 'Vinho, #7A2944' })).toBeChecked()

    await usuario.click(screen.getByRole('button', { name: 'Ir ao painel' }))
    await usuario.click(screen.getByRole('button', { name: 'Sair' }))
    await waitFor(() => expect(screen.getByText('Tela do painel')).toBeInTheDocument())
    expect(perfilGuardado().cor).toBeNull()
  })
})

describe('Sua marca: acesso (CA-1980)', () => {
  it('as cores são um grupo de opções com nome, e a logo da prévia do formulário tem texto alternativo', async () => {
    guardar({ logo: PNG_REDUZIDO })
    abrir()
    expect(screen.getByRole('radiogroup', { name: 'Cor' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Sua logo' })).toBeInTheDocument()
  })

  it('só com o teclado: Tab passa pela logo, pelas cores, pelo campo e chega a "Salvar"', async () => {
    guardar({ logo: PNG_REDUZIDO })
    const usuario = abrir()
    const focados: (Element | null)[] = []
    for (let i = 0; i < 6; i++) {
      await usuario.tab()
      focados.push(document.activeElement)
    }
    expect(focados).toEqual([
      screen.getByLabelText('Trocar logo'),
      screen.getByRole('button', { name: 'Remover' }),
      screen.getByRole('radio', { name: 'Padrão do MetaNutri, #0E3B43' }),
      screen.getByLabelText('Escolher outra cor no seletor'),
      screen.getByRole('textbox', { name: 'Outra cor' }),
      salvar(),
    ])
  })

  it('DP-ML-15: os celulares da prévia ficam fora do Tab e do leitor de tela', () => {
    abrir()
    for (const tema of ['claro', 'escuro'] as const) {
      const tela = linkNaPrevia(tema)?.closest('[inert]')
      expect(tela).not.toBeNull()
      expect(tela).toHaveAttribute('aria-hidden', 'true')
    }
  })
})
