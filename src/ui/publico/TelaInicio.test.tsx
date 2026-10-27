import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { ALMOCO_EM_GRAMAS, MISSOES_DO_EXEMPLO, NUTRIENTES_DO_EXEMPLO } from './inicio/exemploDaLanding.ts'

import { TelaInicio } from './TelaInicio.tsx'

interface Acoes {
  readonly aoComecar?: () => void
  readonly aoEscolher?: () => void
  readonly formularioNovo?: boolean
}

const montar = (acoes: Acoes = {}) =>
  render(<TelaInicio aoComecar={acoes.aoComecar ?? vi.fn()} aoEscolher={acoes.aoEscolher ?? vi.fn()} formularioNovo={acoes.formularioNovo ?? false} />)

const texto = () => document.body.textContent ?? ''
const painel = () => {
  const el = document.querySelector('#adequacao [aria-live="polite"]')
  if (!(el instanceof HTMLElement)) throw new Error('sem o painel da Adequação')
  return el
}
const TITULO_DO_TOPO = 'Planos alimentares completos em vitaminas e minerais'

describe('TelaInicio (spec landing-escura e spec landing-v3)', () => {
  it('CA-1688: o título e as seções, nesta ordem, cada uma com título', () => {
    montar()
    const titulos = screen.getAllByRole('heading').filter((h) => /^H[12]$/.test(h.tagName))
    expect(titulos.map((h) => `${h.tagName} ${h.textContent ?? ''}`)).toEqual([
      `H1 ${TITULO_DO_TOPO}`,
      'H2 Adequação de micronutrientes com sugestão do que comer',
      'H2 Acompanhamento da adesão pelo celular',
      'H2 Funcionalidades',
      'H2 Como funciona',
      'H2 Quantidades em gramas e calorias',
      'H2 Planos e preços',
      'H2 Perguntas frequentes',
    ])
  })

  describe('topo', () => {
    it('CA-1652 e CA-1653: o título, o apoio com o 20 da adequação, as duas ações e a linha do Free', () => {
      montar()
      const topo = screen.getByRole('region', { name: TITULO_DO_TOPO })
      expect(within(topo).getByRole('heading', { level: 1 })).toHaveTextContent(TITULO_DO_TOPO)
      expect(topo).toHaveTextContent(
        'O MetaNutri calcula a adequação de 20 vitaminas e minerais e sugere os alimentos, em gramas, para completar o que falta. Depois, acompanha a adesão do paciente pelo celular.',
      )
      expect(within(topo).getByRole('button', { name: 'Criar conta grátis' })).toBeInTheDocument()
      expect(within(topo).getByRole('link', { name: 'Ver o plano de exemplo' })).toBeInTheDocument()
      expect(topo).toHaveTextContent('Grátis com 2 pacientes ativos. Sem cartão de crédito.')
    })

    it('CA-1652: "Criar conta grátis" chama quem manda; "Ver o plano de exemplo" rola até a Adequação', async () => {
      const aoComecar = vi.fn()
      montar({ aoComecar })
      const alvo = document.getElementById('adequacao')
      if (!alvo) throw new Error('sem a Adequação')
      alvo.scrollIntoView = vi.fn()
      const usuario = userEvent.setup()
      await usuario.click(screen.getByRole('button', { name: 'Criar conta grátis' }))
      expect(aoComecar).toHaveBeenCalledOnce()
      await usuario.click(screen.getByRole('link', { name: 'Ver o plano de exemplo' }))
      expect(alvo.scrollIntoView).toHaveBeenCalledOnce()
    })

    it('CA-1654: a etiqueta diz o exemplo do cálcio com o nome da paciente, escondida do leitor de tela e do celular', () => {
      montar()
      const etiqueta = document.querySelector('[data-etiqueta]')
      expect(etiqueta).toHaveAttribute('aria-hidden', 'true')
      expect(etiqueta?.textContent).toBe('No plano de exemplo, falta cálcio150 g de iogurte natural desnatado cobrem 91%')
      expect(etiqueta?.className).toContain('max-[720px]:hidden')
    })

    it('CA-1655: a foto do topo tem texto alternativo, tamanho, as versões de 800 e 1.600 px, e não é preguiçosa', () => {
      montar()
      const foto = screen.getByAltText('Copo de iogurte com frutas vermelhas, granola e amêndoas sobre a mesa.')
      expect(foto).toHaveAttribute('width', '1600')
      expect(foto).toHaveAttribute('height', '1172')
      expect(foto.getAttribute('srcset')).toBe('/imagens/iogurte-com-frutas-800.webp 800w, /imagens/iogurte-com-frutas.webp 1600w')
      expect(foto).not.toHaveAttribute('loading')
      expect(foto).toHaveAttribute('fetchpriority', 'high')
    })

    it('CA-1656 e CA-1657: aberta pelo app, a foto assenta e a etiqueta surge do zero, só com movimento', () => {
      montar()
      const foto = screen.getByAltText(/Copo de iogurte/)
      expect(foto.className).toContain('motion-safe:animate-landing-assentar')
      expect(foto.style.animationDelay).toBe('')
      expect(document.querySelector('[data-etiqueta]')?.className).toContain('motion-safe:animate-landing-surgir')
    })

    it('CA-1657: sobre a página pré-desenhada, o movimento continua de onde estava', () => {
      const vitrine = document.createElement('div')
      vitrine.setAttribute('data-vitrine', '')
      document.body.append(vitrine)
      const agora = vi.spyOn(performance, 'now').mockReturnValue(1300)
      const pintura = vi.spyOn(performance, 'getEntriesByName').mockReturnValue([{ startTime: 300 } as PerformanceEntry])
      montar()
      expect(screen.getByAltText(/Copo de iogurte/).style.animationDelay).toBe('-1000ms')
      expect((document.querySelector('[data-etiqueta]') as HTMLElement | null)?.style.animationDelay).toBe('-100ms')
      agora.mockRestore()
      pintura.mockRestore()
      vitrine.remove()
    })
  })

  describe('Adequação', () => {
    const abas = () => within(screen.getByRole('group', { name: 'Nutrientes do plano de exemplo' })).getAllByRole('button')
    const sugestoes = () => within(screen.getByRole('group', { name: 'Sugestões para completar' })).getAllByRole('button')
    const centro = () => painel().querySelector('.absolute.inset-0')?.textContent

    it('CA-1658: três abas com o total e o percentual; o cálcio pressionado ao abrir', () => {
      montar()
      expect(abas().map((b) => [b.textContent, b.getAttribute('aria-pressed')])).toEqual([
        ['Cálcio 640 de 1.000 mg no dia 64%', 'true'],
        ['Vitamina E 5,4 de 15 mg no dia 36%', 'false'],
        ['Vitamina D 2,1 de 15 µg no dia 14%', 'false'],
      ])
      expect(screen.getByRole('region', { name: 'Adequação de micronutrientes com sugestão do que comer' })).toHaveTextContent(
        'Plano de exemplo: Maria, 28 anos. A meta é 90% da referência para a idade e o sexo.',
      )
    })

    it('CA-1662: o iogurte escolhido ao abrir, "ainda faltam 24,3 mg de 260 mg"; com a sardinha, "Meta atingida"', async () => {
      montar()
      expect(sugestoes().map((b) => [b.textContent, b.getAttribute('aria-pressed')])).toEqual([
        ['Rúcula 60 g · +8 kcal 27%', 'false'],
        ['Iogurte natural desnatado 150 g · +62 kcal 91%', 'true'],
        ['Sardinha assada 60 g · +99 kcal 100%', 'false'],
      ])
      expect(centro()).toBe('ainda faltam24,3 mgde 260 mg')
      await userEvent.setup().click(screen.getByRole('button', { name: /^Sardinha assada/ }))
      expect(centro()).toBe('com 60 gMetaatingida')
      expect(screen.getByRole('button', { name: /^Sardinha assada/ })).toHaveAttribute('aria-pressed', 'true')
    })

    it('CA-1663 e CB-655: a vitamina E abre na amêndoa e a vitamina D no salmão, mesmo depois de outra escolha', async () => {
      montar()
      const usuario = userEvent.setup()
      await usuario.click(screen.getByRole('button', { name: /^Rúcula/ }))
      await usuario.click(screen.getByRole('button', { name: /^Vitamina E/ }))
      expect(painel()).toHaveTextContent('Vitamina E5,4 de 15 mg no dia')
      expect(screen.getByRole('button', { name: /^Amêndoa torrada salgada/ })).toHaveAttribute('aria-pressed', 'true')
      expect(centro()).toBe('ainda faltam1,0 mgde 8,1 mg')
      await usuario.click(screen.getByRole('button', { name: /^Vitamina D/ }))
      expect(screen.getByRole('button', { name: /^Filé de salmão fresco grelhado com pele/ })).toHaveAttribute('aria-pressed', 'true')
      expect(centro()).toBe('com 90 gMetaatingida')
      await usuario.click(screen.getByRole('button', { name: /^Cálcio/ }))
      expect(screen.getByRole('button', { name: /^Iogurte natural desnatado/ })).toHaveAttribute('aria-pressed', 'true')
    })

    it('CA-1664: no anel, a base é o percentual da aba e a soma começa onde ela termina', () => {
      montar()
      const [, base, soma, meta] = [...painel().querySelectorAll('circle')]
      expect(base?.getAttribute('stroke-dasharray')).toBe('64 100')
      expect(soma?.getAttribute('stroke-dasharray')).toBe('23.7 100')
      expect(soma?.style.transform).toBe('rotate(230.4deg)')
      expect([meta?.getAttribute('cx'), meta?.getAttribute('cy')]).toEqual(['214.1', '68.9'])
      expect(painel().querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    })

    it('CA-1665: o painel é anunciado; abas e sugestões são botões com aria-pressed em grupos com nome', () => {
      montar()
      expect(painel()).toHaveAttribute('aria-live', 'polite')
      for (const botao of [...abas(), ...sugestoes()]) {
        expect(botao.tagName).toBe('BUTTON')
        expect(botao).toHaveAttribute('aria-pressed')
      }
      expect(NUTRIENTES_DO_EXEMPLO).toHaveLength(abas().length)
    })
  })

  describe('Acompanhamento da adesão', () => {
    const missoes = () => within(screen.getByRole('group', { name: 'Missões do dia (exemplo)' })).getAllByRole('button')
    const contagem = () => document.querySelector('[data-contagem]')?.textContent
    const painelDeAdesao = () => screen.getByRole('group', { name: 'Pacientes de exemplo' })
    const linhaDaMaria = () => within(painelDeAdesao()).getByText('Maria Santos').closest('li')
    const hojeDaMaria = () => linhaDaMaria()?.querySelector('[data-dia="hoje"]')

    it('CA-1666: o celular com a saudação, a data, "2 de 9" e as nove missões do app, as duas da manhã marcadas', () => {
      montar()
      const secao = screen.getByRole('region', { name: 'Acompanhamento da adesão pelo celular' })
      expect(secao).toHaveTextContent('Olá, Maria')
      expect(secao).toHaveTextContent('Terça-feira, 27 de outubro')
      expect(secao).toHaveTextContent('Missões de hoje2 de 9')
      expect(missoes().map((b) => b.textContent)).toEqual(MISSOES_DO_EXEMPLO.map((m) => `${m.texto} ${m.origem}`))
      expect(missoes().map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'true', 'false', 'false', 'false', 'false', 'false', 'false', 'false'])
      expect(secao).toHaveTextContent('O plano vira missões diárias que o paciente marca pelo celular, sem aplicativo.')
    })

    it('CA-1668: marcar uma missão (clique, Enter e Espaço) conta e enche a barra; marcar de novo desmarca', async () => {
      montar()
      const usuario = userEvent.setup()
      const almoco = screen.getByRole('button', { name: /^Almoço por volta das 12h/ })
      await usuario.click(almoco)
      expect(almoco).toHaveAttribute('aria-pressed', 'true')
      expect(contagem()).toBe('3 de 9')
      expect((document.querySelector('[data-barra-das-missoes]') as HTMLElement | null)?.style.transform).toBe(`scaleX(${3 / 9})`)
      await usuario.keyboard('{Enter}')
      expect(almoco).toHaveAttribute('aria-pressed', 'false')
      expect(contagem()).toBe('2 de 9')
      await usuario.keyboard(' ')
      expect(almoco).toHaveAttribute('aria-pressed', 'true')
    })

    it('CA-1669 e CB-653: sem missão marcada, a Maria "Ainda não marcou hoje"; marcando uma, a bolinha acende e o estado é anunciado', async () => {
      montar()
      const usuario = userEvent.setup()
      for (const nome of [/^Café da manhã/, /^Lanche da manhã/]) await usuario.click(screen.getByRole('button', { name: nome }))
      expect(contagem()).toBe('0 de 9')
      expect(linhaDaMaria()).toHaveTextContent('Ainda não marcou hoje')
      expect(hojeDaMaria()?.className).not.toContain('bg-landing-destaque')
      await usuario.click(screen.getByRole('button', { name: /^Jantar/ }))
      const estado = within(linhaDaMaria() as HTMLElement).getByText('Em dia · 1 de 9 hoje')
      expect(estado).toHaveAttribute('aria-live', 'polite')
      expect(hojeDaMaria()?.className).toContain('bg-landing-destaque')
      expect(hojeDaMaria()?.className).toContain('scale-125')
    })

    it('CA-1670: três pacientes de exemplo, a semana com a terça de hoje e o WhatsApp só no João, como imagem', () => {
      montar()
      const painel = painelDeAdesao()
      const linhas = within(painel).getAllByRole('listitem')
      expect(linhas.map((li) => li.querySelector('strong')?.textContent)).toEqual(['João Pereira', 'Ana Beatriz Costa', 'Maria Santos'])
      expect(linhas[0]).toHaveTextContent('4 dias sem marcar')
      expect(linhas[0]).toHaveTextContent('Mensagem pronta para retomar o plano')
      expect(linhas[1]).toHaveTextContent('Atenção')
      expect(linhas[2]).toHaveTextContent('Em dia · 2 de 9 hoje')
      const dias = [...painel.querySelectorAll('[aria-hidden="true"] > span')].map((d) => d.textContent).filter(Boolean)
      expect(dias).toEqual(['S', 'T', 'Q', 'Q', 'S', 'S', 'D'])
      expect(within(painel).getByText('T').className).toContain('text-landing-destaque')
      const whatsapp = within(painel).getAllByText('Chamar no WhatsApp')
      expect(whatsapp).toHaveLength(1)
      expect(whatsapp[0]).toHaveAttribute('aria-hidden', 'true')
      expect(within(painel).queryAllByRole('button')).toHaveLength(0)
      expect(within(painel).queryAllByRole('link')).toHaveLength(0)
    })

    it('CA-1671: "em segundos" entre o celular e o painel; no celular, só o ícone gira', () => {
      montar()
      const ponte = screen.getByText('em segundos')
      expect(ponte.className).not.toContain('rotate')
      expect(ponte.parentElement?.querySelector('svg')?.getAttribute('class')).toContain('max-[1100px]:rotate-90')
      const palco = ponte.parentElement?.parentElement
      const filhos = [...(palco?.children ?? [])]
      expect(filhos.indexOf(ponte.parentElement as Element)).toBe(1)
    })
  })

  describe('Funcionalidades', () => {
    it('CA-1672: nove itens com título e texto, todos incluídos em qualquer assinatura', () => {
      montar({ formularioNovo: true })
      const secao = screen.getByRole('region', { name: 'Funcionalidades' })
      expect(secao).toHaveTextContent('Todas incluídas em qualquer assinatura.')
      const itens = within(secao).getAllByRole('listitem')
      expect(itens.map((li) => li.querySelector('h3')?.textContent)).toEqual([
        'Prescrição rápida ou completa',
        'Adequação de micronutrientes',
        'Sugestão do que comer',
        'Gasto energético e hidratação',
        'Avaliação antropométrica',
        'Anamnese, restrições e alergias',
        'Substitutos, receitas e modelos',
        'Cadastro de alimentos',
        'Documentos prontos',
      ])
      expect(secao).toHaveTextContent('20 vitaminas e minerais e a fibra, comparados com a referência para a idade, o sexo e a fase da vida.')
      expect(secao).toHaveTextContent('PDF com lista de compras, Word no modelo do estágio e pedido de exames, com o seu logotipo e o seu CRN.')
      expect(secao).toHaveTextContent('O que a base ainda não tem entra por 100 g, pela porção do rótulo ou pelo código de barras.')
      expect(secao.textContent).not.toMatch(/sua logo/)
    })

    it('CA-1672 e D-540: sem a publicação 2, o cadastro de alimentos fala só do rótulo e do código de barras', () => {
      montar({ formularioNovo: false })
      const secao = screen.getByRole('region', { name: 'Funcionalidades' })
      expect(secao).toHaveTextContent('O que a base ainda não tem entra pelo rótulo ou pelo código de barras.')
      expect(secao.textContent).not.toMatch(/por 100 g/)
    })
  })

  describe('Como funciona, Quantidades em gramas e fotos', () => {
    it('CA-1673: quatro passos numerados de 1 a 4, numa lista ordenada, sem os exemplos', () => {
      montar()
      const como = screen.getByRole('region', { name: 'Como funciona' })
      const lista = within(como).getByRole('list')
      expect(lista.tagName).toBe('OL')
      const passos = within(lista).getAllByRole('listitem')
      expect(passos.map((li) => [li.querySelector('span')?.textContent, li.querySelector('h3')?.textContent])).toEqual([
        ['1', 'Monte o plano'],
        ['2', 'Analise a adequação'],
        ['3', 'Complete com as sugestões'],
        ['4', 'Entregue e acompanhe'],
      ])
      expect(passos[0]).toHaveTextContent('Escolha prescrição rápida ou atendimento completo, busque os alimentos na Base MetaNutri e ajuste os gramas.')
      expect(passos[3]).toHaveTextContent('Gere o PDF ou o Word, envie o link ao paciente e acompanhe a adesão na tela Adesão.')
      for (const passo of passos) expect(passo.querySelector('span')).toHaveAttribute('aria-hidden', 'true')
      expect(como.textContent).not.toMatch(/concha|Etapa Adequação|Cobrir cálcio/)
    })

    it('CA-1674: a linha acende pela entrada ao rolar (data-revela), com os números acendendo em sequência', () => {
      montar()
      const lista = within(screen.getByRole('region', { name: 'Como funciona' })).getByRole('list')
      expect(lista).toHaveAttribute('data-revela')
      expect(lista.className).toContain('landing-etapas')
      const atrasos = [...lista.querySelectorAll<HTMLElement>('.landing-numero')].map((n) => n.style.getPropertyValue('--landing-atraso-numero'))
      expect(atrasos).toEqual(['0s', '0.6s', '1.1s', '1.6s'])
    })

    it('CA-1675: Quantidades em gramas e calorias, com as fotos em 16:9, as legendas e a tabela só do almoço', () => {
      montar()
      const gramas = screen.getByRole('region', { name: 'Quantidades em gramas e calorias' })
      expect(gramas).toHaveTextContent('Cada alimento do plano sai com o peso e as calorias da Base MetaNutri.')
      const figuras = within(gramas).getAllByRole('figure')
      expect(figuras.map((f) => f.querySelector('figcaption')?.textContent)).toEqual([
        'Leite e outros líquidos entram em mililitros.',
        'Salada com frango grelhado, rúcula e pimentão.',
      ])
      for (const figura of figuras) expect(figura.querySelector('img')).toHaveClass('aspect-video')
      const tabela = within(gramas).getByRole('table', { name: 'Um almoço de plano, com os gramas e as calorias de cada alimento' })
      expect(within(tabela).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Alimento', 'Gramas', 'Energia'])
      expect(within(tabela).getAllByRole('rowheader').map((c) => c.textContent)).toEqual(['Almoço'])
      expect(within(tabela).getAllByRole('row')).toHaveLength(1 + 1 + ALMOCO_EM_GRAMAS.length)
      expect(tabela).toHaveTextContent('Feijão carioca cozido140 g107 kcal')
      expect(tabela.textContent).not.toMatch(/Café da manhã|Lanche/)
    })

    it('CA-1476: as três fotos do meio têm texto alternativo, tamanho reservado, versão de 800 px e carregam preguiçosas', () => {
      montar()
      const fotos = screen.getAllByRole('img').filter((img) => img.tagName === 'IMG' && img.getAttribute('alt') !== '' && !img.closest('[aria-labelledby="titulo-inicio"]'))
      expect(fotos.map((f) => f.getAttribute('alt'))).toEqual([
        'Tomates e cenouras frescos sobre uma bancada escura.',
        'Dois copos de leite de tamanhos diferentes, lado a lado.',
        'Salada com frango grelhado, rúcula, pimentão e molho branco.',
      ])
      for (const foto of fotos) {
        expect(foto).toHaveAttribute('width')
        expect(foto).toHaveAttribute('height')
        expect(foto).toHaveAttribute('loading', 'lazy')
        expect(foto.getAttribute('srcset')).toMatch(/-800\.webp 800w/)
      }
    })

    it('CA-1476 e CA-1655: os arquivos das fotos existem e têm no máximo 1.600 px de largura', () => {
      const pasta = join(process.cwd(), 'public', 'imagens')
      const arquivos = readdirSync(pasta).filter((n) => /^(iogurte-com-frutas|legumes-na-bancada|dois-copos-de-leite|salada-com-frango)(-800)?\.webp$/.test(n))
      expect(arquivos).toHaveLength(8)
      for (const nome of arquivos) {
        const webp = readFileSync(join(pasta, nome))
        // VP8 com perda: a largura fica nos bytes 26 e 27 (14 bits).
        expect(webp.toString('ascii', 12, 16), nome).toBe('VP8 ')
        expect(webp.readUInt16LE(26) & 0x3fff, nome).toBeLessThanOrEqual(1600)
      }
    })
  })

  describe('Planos e preços', () => {
    const secaoDePlanos = () => screen.getByRole('region', { name: 'Planos e preços' })
    const cartao = (nome: string) => {
      const achado = within(secaoDePlanos()).getByRole('article', { name: new RegExp(`^${nome}`) })
      return achado
    }
    const regua = () => within(secaoDePlanos()).getByRole('slider', { name: 'Pacientes ativos' })
    /** O que o leitor de tela lê no cartão: sem o ciclo escondido. */
    const lido = (el: HTMLElement) =>
      [...el.querySelectorAll('p, h3, button, li')]
        .filter((n) => !n.closest('[aria-hidden="true"]'))
        .map((n) => n.textContent)
        .join(' | ')

    it('CA-1676: a troca em Mensal, a régua em 12 e o veredito do Solo', () => {
      montar()
      const troca = within(within(secaoDePlanos()).getByRole('group', { name: 'Forma de cobrança' }))
      expect(troca.getAllByRole('button').map((b) => [b.textContent, b.getAttribute('aria-pressed')])).toEqual([
        ['Mensal', 'true'],
        ['Anual', 'false'],
      ])
      expect(regua()).toHaveValue('12')
      expect(regua()).toHaveAttribute('aria-valuetext', '12 pacientes ativos')
      expect(secaoDePlanos()).toHaveTextContent('Para 12 pacientes ativos, o plano indicado é o Solo.')
      expect(within(secaoDePlanos()).getByText(/^Para 12 pacientes ativos/)).toHaveAttribute('aria-live', 'polite')
      expect(secaoDePlanos()).toHaveTextContent(
        'Todos os planos incluem todas as funcionalidades. Muda só o número de pacientes ativos. Sem fidelidade e sem preço promocional.',
      )
    })

    it('CA-1677: Free, Solo e Pro com nome, descrição, preço, botão e limites de PLANOS', () => {
      montar()
      expect(lido(cartao('Free'))).toBe(
        'Free | Para testar com um paciente real, sem cartão. | R$ 0R$0 | Sem cartão de crédito | Começar grátis | 2 pacientes ativos | 2 links do paciente | Todas as funções',
      )
      expect(lido(cartao('Solo'))).toBe(
        'Solo | Para quem está começando a atender. | R$ 34,90R$34,90 | por mêsou R$ 299 por ano | Assinar o Solo | 25 pacientes ativos | 25 links do paciente | Todas as funções',
      )
      expect(lido(cartao('Pro'))).toContain('R$ 64,90R$64,90 | por mêsou R$ 599 por ano | Assinar o Pro | Pacientes ilimitados')
    })

    it('CA-1678 e CB-657: no Anual, o preço do ano e a economia; o leitor de tela lê só o ciclo que vale', async () => {
      montar()
      const usuario = userEvent.setup()
      await usuario.click(screen.getByRole('button', { name: 'Anual' }))
      expect(screen.getByRole('button', { name: 'Anual' })).toHaveAttribute('aria-pressed', 'true')
      expect(lido(cartao('Solo'))).toContain('R$ 299R$299 | por anoR$ 24,92 por mês · economize R$ 119,80 | Assinar o Solo anual')
      expect(lido(cartao('Solo'))).not.toContain('34,90')
      expect(lido(cartao('Pro'))).toContain('R$ 599R$599 | por anoR$ 49,92 por mês · economize R$ 179,80 | Assinar o Pro anual')
      expect(lido(cartao('Free'))).toContain('R$ 0R$0 | Sem cartão de crédito | Começar grátis')
      await usuario.click(screen.getByRole('button', { name: 'Mensal' }))
      await usuario.click(screen.getByRole('button', { name: 'Anual' }))
      await usuario.click(screen.getByRole('button', { name: 'Mensal' }))
      expect(lido(cartao('Solo'))).toContain('R$ 34,90')
      expect(lido(cartao('Solo'))).not.toContain('R$ 299R$299')
    })

    it('CA-1679 e CB-656: a régua escolhe o indicado; só ele sobe e mostra o selo', () => {
      montar()
      const indicados = () => within(secaoDePlanos()).getAllByRole('article').filter((a) => a.hasAttribute('data-indicado'))
      for (const [n, nome, texto] of [
        [1, 'Free', 'Para 1 paciente ativo, o plano indicado é o Free.'],
        [2, 'Free', 'Para 2 pacientes ativos, o plano indicado é o Free.'],
        [3, 'Solo', 'Para 3 pacientes ativos, o plano indicado é o Solo.'],
        [25, 'Solo', 'Para 25 pacientes ativos, o plano indicado é o Solo.'],
        [26, 'Pro', 'Para 26 pacientes ativos, o plano indicado é o Pro.'],
        [60, 'Pro', 'Para 60 ou mais pacientes ativos, o plano indicado é o Pro.'],
      ] as const) {
        fireEvent.change(regua(), { target: { value: String(n) } })
        expect(secaoDePlanos(), String(n)).toHaveTextContent(texto)
        expect(indicados().map((a) => a.querySelector('h3')?.textContent)).toEqual([nome])
        expect(within(indicados()[0] as HTMLElement).getByText('Indicado')).toHaveAttribute('aria-hidden', 'false')
        expect(indicados()[0]?.className).toContain('-translate-y-2.5')
      }
      expect(within(secaoDePlanos()).getByText('60+')).toBeInTheDocument()
      expect(regua()).toHaveAttribute('aria-valuetext', '60 ou mais pacientes ativos')
      const outros = within(secaoDePlanos()).getAllByText('Indicado').filter((s) => s.getAttribute('aria-hidden') === 'true')
      expect(outros).toHaveLength(2)
    })

    it('CA-1680: os botões levam pelo caminho de hoje; a Clínica é um link para o e-mail', async () => {
      const aoEscolher = vi.fn()
      montar({ aoEscolher })
      const usuario = userEvent.setup()
      await usuario.click(screen.getByRole('button', { name: 'Começar grátis' }))
      expect(aoEscolher).toHaveBeenLastCalledWith('free', 'mensal')
      await usuario.click(screen.getByRole('button', { name: 'Assinar o Solo' }))
      expect(aoEscolher).toHaveBeenLastCalledWith('solo', 'mensal')
      await usuario.click(screen.getByRole('button', { name: 'Anual' }))
      await usuario.click(screen.getByRole('button', { name: 'Assinar o Pro anual' }))
      expect(aoEscolher).toHaveBeenLastCalledWith('pro', 'anual')
      await usuario.click(screen.getByRole('button', { name: 'Começar grátis' }))
      expect(aoEscolher).toHaveBeenLastCalledWith('free', 'mensal')
      await usuario.click(within(secaoDePlanos()).getByRole('button', { name: 'Criar conta de estudante' }))
      expect(aoEscolher).toHaveBeenLastCalledWith('estudante', 'mensal')
      expect(within(secaoDePlanos()).getByRole('link', { name: 'Fale com a gente' }).getAttribute('href')).toMatch(/^mailto:.+@/)
    })

    it('CA-1681: o Estudante com o comprovante e os 12 meses, a Clínica e a nota do pagamento', () => {
      montar()
      expect(secaoDePlanos()).toHaveTextContent(
        'Grátis por 12 meses ou até a formatura, o que vier antes, com o e-mail da faculdade e o comprovante de matrícula. Na formatura, os pacientes continuam na conta.',
      )
      expect(secaoDePlanos()).toHaveTextContent('ClínicaCondições combinadas por e-mail.')
      expect(secaoDePlanos()).toHaveTextContent('O pagamento é com cartão de crédito, aqui no site. Você cancela quando quiser em Conta e assinatura.')
    })

    it('D-667: o laranja do feixe é só grafismo, escondido e sem texto', () => {
      montar()
      for (const feixe of secaoDePlanos().querySelectorAll('.landing-feixe')) {
        expect(feixe).toHaveAttribute('aria-hidden', 'true')
        expect(feixe.textContent).toBe('')
      }
    })
  })

  describe('perguntas e faixa final', () => {
    it('CA-1683: oito perguntas fechadas, na ordem do protótipo, com as respostas que o app sustenta', async () => {
      montar({ formularioNovo: true })
      const perguntas = screen.getByRole('region', { name: 'Perguntas frequentes' })
      const detalhes = [...perguntas.querySelectorAll('details')]
      expect(detalhes.map((d) => d.querySelector('summary')?.textContent)).toEqual([
        'De onde vêm os valores dos alimentos?',
        'O MetaNutri substitui a conduta do nutricionista?',
        'Atende gestante, criança e idoso?',
        'O paciente precisa baixar um aplicativo?',
        'Tem fidelidade? Como cancelo?',
        'E o alimento que não está na base?',
        'Onde ficam os dados dos pacientes?',
        'Sou estudante. Posso usar?',
      ])
      expect(detalhes.every((d) => !d.open)).toBe(true)
      expect(perguntas).toHaveTextContent(
        'Da Base MetaNutri, montada a partir de tabelas oficiais de composição e organizada pela nossa equipe, com os valores de cada alimento por 100 g.',
      )
      expect(perguntas).toHaveTextContent('Sim, de 1 ano de idade em diante')
      expect(perguntas).toHaveTextContent('Não tem fidelidade. Você cancela quando quiser em Conta e assinatura, no próprio site.')
      expect(perguntas).toHaveTextContent('Você cadastra em Meus alimentos: por 100 g, pela porção do rótulo ou pelo código de barras.')
      expect(perguntas).toHaveTextContent('O paciente autoriza antes de receber o link.')
      expect(perguntas).toHaveTextContent('Pode, com o e-mail da faculdade e o comprovante de matrícula.')
      expect(perguntas).toHaveTextContent('grátis por 12 meses ou até a formatura, o que vier antes')
      expect(perguntas).toHaveTextContent('se você quiser, o mesmo link mostra o plano alimentar. Sem conta e sem senha.')
      expect(perguntas).not.toHaveTextContent(/medida/)
      expect(perguntas).toHaveAttribute('data-fundo', 'teal')
      const primeira = detalhes[0]?.querySelector('summary')
      if (!primeira) throw new Error('sem pergunta')
      await userEvent.setup().click(primeira)
      expect(detalhes[0]?.open).toBe(true)
    })

    it('CA-1683 e D-540: sem a publicação 2, a resposta do alimento próprio fala só do rótulo e do código de barras', () => {
      montar({ formularioNovo: false })
      const perguntas = screen.getByRole('region', { name: 'Perguntas frequentes' })
      expect(perguntas).toHaveTextContent('Você cadastra em Meus alimentos, pelo rótulo ou pelo código de barras, e ele entra na refeição pela busca.')
      expect(perguntas.textContent).not.toMatch(/Meus alimentos: por 100 g/)
    })

    it('CA-1480, CA-1685 e D-610: a faixa final é um link para Criar conta, com a frase nova e a palavra; o hover clareia, nunca laranja', async () => {
      const aoComecar = vi.fn()
      montar({ aoComecar })
      const faixa = screen.getByRole('link', { name: /Crie sua conta e monte o primeiro plano hoje, sem cartão de crédito\.\s*Começar/ })
      expect(faixa).toHaveAttribute('href', '#/criar-conta')
      expect(faixa.className).toMatch(/hover:bg-landing-chamar-hover/)
      expect(faixa.className).not.toMatch(/bg-landing-laranja/)
      await userEvent.setup().click(faixa)
      expect(aoComecar).toHaveBeenCalledOnce()
    })

    it('CA-1684 e D-673: a altura da faixa acompanha a letra da palavra, e a palavra sobe a profundidade do cedilha', () => {
      montar()
      const faixa = document.querySelector('[data-faixa-final]')
      expect(faixa?.className).toContain('min-h-[calc(176px+clamp(80px,22.5vw,380px)*1.02)]')
      expect(faixa?.className).toContain('max-[720px]:min-h-[max(320px,calc(150px+20vw*1.05))]')
      const palavra = faixa?.querySelector('[data-palavra]')
      expect(palavra?.className).toContain('bottom-[calc(22px+.22em)]')
      expect(palavra?.className).toContain('text-[clamp(80px,22.5vw,380px)]')
    })

  })

  describe('texto e acessibilidade', () => {
    it('CA-1608: o topo, o campo vivo, Grama por grama e as perguntas não falam de medida caseira', () => {
      montar()
      for (const nome of [TITULO_DO_TOPO, 'Adequação de micronutrientes com sugestão do que comer', 'Quantidades em gramas e calorias', 'Perguntas frequentes']) {
        expect(screen.getByRole('region', { name: nome }).textContent, nome).not.toMatch(/medida caseira|concha|escumadeira|copo americano/i)
      }
    })

    it('CA-1481: sem tagline, número de passo, comparação, promessa clínica, "495 kcal" nem "30 minutos"; cada frase uma vez', () => {
      montar()
      const t = texto()
      expect(t).not.toMatch(/495|30 minutos|Cabem mais|sem passar das calorias/)
      expect(t).not.toMatch(/nenhum programa|o único|de verdade|Dietbox|WebDiet|Nutrium|para de abandonar|resultado garantido/i)
      expect(t).not.toMatch(/TACO|IBGE|POF|USDA|NASEM|\bDRIs?\b|Open Food Facts/)
      // Fora dos fragmentos de interface (o mesmo exemplo aparece no campo vivo e em Como funciona), nenhuma frase se repete.
      const blocos = 'p, h1, h2, h3, li, summary, figcaption'
      // Só o bloco mais de dentro: o item da lista e o parágrafo dele contariam a mesma frase duas vezes. Os cartões de
      // plano são tabela de preço: "Todas as funções" fecha os três de propósito (D-666).
      const fora = [...document.body.querySelectorAll(blocos)].filter((el) => !el.closest('[data-ui], article') && !el.querySelector(blocos))
      const frases = fora.flatMap((el) => (el.textContent ?? '').split(/(?<=[.?!])\s+/)).filter((f) => f.length > 12)
      const repetidas = frases.filter((f, i) => frases.indexOf(f) !== i)
      expect(repetidas).toEqual([])
    })

    it('CA-1453: nenhum texto em laranja nem sobre laranja; o laranja só no que é grafismo', () => {
      montar()
      for (const el of document.body.querySelectorAll('[class*="text-landing-laranja"]')) {
        expect(el.tagName, el.outerHTML.slice(0, 120)).toBe('svg')
        expect(el.getAttribute('aria-hidden')).toBe('true')
      }
      for (const el of document.body.querySelectorAll('[class*="bg-landing-laranja"]')) {
        const grafismo = el.getAttribute('aria-hidden') === 'true' || el.getAttribute('role') === 'switch'
        expect(grafismo, el.outerHTML.slice(0, 120)).toBe(true)
        expect(el.textContent).toBe('')
      }
    })

    it('CA-1490 e D-550: os botões dos fragmentos são imagem; os controles de verdade têm nome', () => {
      montar()
      for (const fragmento of document.querySelectorAll('[data-ui]')) {
        expect(fragmento.querySelectorAll('button, a, [tabindex]')).toHaveLength(0)
      }
      expect(screen.queryByRole('button', { name: 'Adicionar' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Cobrir' })).not.toBeInTheDocument()
      for (const controle of [...screen.getAllByRole('button'), ...screen.getAllByRole('link'), ...screen.queryAllByRole('switch')]) {
        expect(controle).toHaveAccessibleName()
      }
    })

    it('CA-1491 (D-548): saíram as capturas, a foto e os roteiros da landing antiga, e o código não os cita', () => {
      const raiz = process.cwd()
      const antigos = /pratos-heroi|pratos_heroi|capturas-landing|cobrir-(claro|escuro)\.png|missoes-(claro|escuro)\.png/
      expect(readdirSync(join(raiz, 'public', 'imagens')).filter((nome) => antigos.test(nome))).toEqual([])
      expect(readdirSync(join(raiz, 'scripts')).filter((nome) => antigos.test(nome))).toEqual([])
      const lerPasta = (pasta: string): string[] =>
        readdirSync(join(raiz, pasta), { withFileTypes: true }).flatMap((item) =>
          item.isDirectory() ? lerPasta(join(pasta, item.name)) : /\.(tsx?|m?js|css|html|txt|xml)$/.test(item.name) && !item.name.includes('.test.') ? [join(pasta, item.name)] : [],
        )
      const citam = [...lerPasta('src'), ...lerPasta('scripts'), ...lerPasta('public'), 'index.html'].filter((arquivo) =>
        antigos.test(readFileSync(join(raiz, arquivo), 'utf8')),
      )
      expect(citam).toEqual([])
    })

    it('D-549 e CA-998: nada sai com opacidade zero escrita na página; a entrada ao rolar é marcada com data-surge', () => {
      montar()
      expect(document.body.innerHTML).not.toMatch(/opacity:\s*0/)
      expect(document.querySelectorAll('[data-surge]').length).toBeGreaterThanOrEqual(16)
    })
  })
})
