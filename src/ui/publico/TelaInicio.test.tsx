import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { ADEQUACAO_DO_EXEMPLO, CARTOES_DA_VITRINE, COBRIR_CALCIO, DIA_EM_MEDIDAS } from './inicio/exemploDaLanding.ts'
import { precosDaLanding } from './inicio/precosDaLanding.ts'
import { TelaInicio } from './TelaInicio.tsx'

interface Acoes {
  readonly aoComecar?: () => void
  readonly aoEscolher?: () => void
  readonly formularioNovo?: boolean
}

const montar = (acoes: Acoes = {}) =>
  render(<TelaInicio aoComecar={acoes.aoComecar ?? vi.fn()} aoEscolher={acoes.aoEscolher ?? vi.fn()} formularioNovo={acoes.formularioNovo ?? false} />)

const texto = () => document.body.textContent ?? ''
const secao = (nome: string) => within(screen.getByRole('region', { name: nome }))
const cartaoDaVitrine = () => {
  const cartao = document.querySelector('#plano-de-exemplo [aria-live="polite"]')
  if (!(cartao instanceof HTMLElement)) throw new Error('sem o cartão do campo vivo')
  return cartao
}

describe('TelaInicio (spec landing-escura)', () => {
  it('D-534: o título e as seções, nesta ordem, cada uma com título', () => {
    montar()
    expect(screen.getAllByRole('heading').map((h) => `${h.tagName} ${h.textContent ?? ''}`)).toEqual([
      'H1 Falta cálcio? 1 copo de iogurte.',
      'H2 O que falta no plano da Maria, 28 anos?',
      'H2 O plano sai do seu jeito',
      'H2 Como funciona',
      'H2 Na medida da cozinha',
      'H2 Quanto custa',
      'H2 Perguntas de quem atende',
    ])
  })

  describe('topo', () => {
    it('CA-1454: o título, as duas ações e a frase de para quem é', () => {
      montar()
      const topo = screen.getByRole('region', { name: 'Falta cálcio? 1 copo de iogurte.' })
      expect(within(topo).getByRole('button', { name: 'Criar conta grátis' })).toBeInTheDocument()
      expect(within(topo).getByRole('link', { name: 'Ver no plano de exemplo' })).toBeInTheDocument()
      expect(topo).toHaveTextContent(
        'Para nutricionistas: o MetaNutri calcula quanto falta de cada vitamina e mineral no plano alimentar e mostra o que comer para completar, em gramas e, quando a base tem, em medida caseira.',
      )
      // A bolinha laranja é o ponto: escondida do leitor de tela, que lê o ponto de verdade.
      const bolinha = topo.querySelector('h1 .bg-landing-laranja')
      expect(bolinha).toHaveAttribute('aria-hidden', 'true')
    })

    it('CA-1455: "Criar conta grátis" chama quem manda; "Ver no plano de exemplo" rola até o campo vivo', async () => {
      const aoComecar = vi.fn()
      montar({ aoComecar })
      const alvo = document.getElementById('plano-de-exemplo')
      if (!alvo) throw new Error('sem o campo vivo')
      alvo.scrollIntoView = vi.fn()
      const usuario = userEvent.setup()
      await usuario.click(screen.getByRole('button', { name: 'Criar conta grátis' }))
      expect(aoComecar).toHaveBeenCalledOnce()
      await usuario.click(screen.getByRole('link', { name: 'Ver no plano de exemplo' }))
      expect(alvo.scrollIntoView).toHaveBeenCalledOnce()
    })

    it('D-549: aberta pelo app, o título sobe só com motion-safe; sobre a página pré-desenhada, não anima', () => {
      montar()
      const titulo = screen.getByRole('heading', { level: 1 })
      expect(titulo.querySelector('span')?.className).toContain('motion-safe:animate-landing-sobe')
    })
  })

  describe('campo vivo', () => {
    it('CA-1462: começa com "falta cálcio" e o cartão do cálcio, com o botão do cálcio pressionado', () => {
      montar()
      expect(screen.getByRole('textbox', { name: 'Digite o nutriente que falta' })).toHaveValue('falta cálcio')
      const cartao = cartaoDaVitrine()
      expect(cartao).toHaveTextContent('Cálcio640 de 1.000 mg no diaFaltam 260 mg para a meta.')
      expect(within(cartao).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
        'Rúcula, crua60 g · cobre 27% · +8 kcalAdicionar',
        'Iogurte, natural, desnatado1 copo americano · 150 g · cobre 91% · +62 kcalAdicionar',
        'Sardinha, assada60 g · cobre 100% · +99 kcalAdicionar',
      ])
      expect(screen.getByRole('button', { name: 'falta cálcio' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('CA-1463: o que se digita escolhe o cartão', async () => {
      montar()
      const campo = screen.getByRole('textbox', { name: 'Digite o nutriente que falta' })
      const usuario = userEvent.setup()
      await usuario.clear(campo)
      await usuario.type(campo, 'vitamina e')
      expect(cartaoDaVitrine()).toHaveTextContent(`Vitamina E${CARTOES_DA_VITRINE['vitamina-e'].total}Faltam 8,1 mg para a meta.`)
      await usuario.clear(campo)
      await usuario.type(campo, 'Vitamina D')
      expect(cartaoDaVitrine()).toHaveTextContent(`Vitamina D${CARTOES_DA_VITRINE['vitamina-d'].total}Faltam 11,4 µg para a meta.`)
      await usuario.clear(campo)
      await usuario.type(campo, 'calcio')
      expect(cartaoDaVitrine()).toHaveTextContent('Cálcio640 de 1.000 mg no dia')
    })

    it('CA-1464: os botões de exemplo preenchem o campo, trocam o cartão e só um fica pressionado', async () => {
      montar()
      await userEvent.setup().click(screen.getByRole('button', { name: 'falta vitamina D' }))
      expect(screen.getByRole('textbox', { name: 'Digite o nutriente que falta' })).toHaveValue('falta vitamina D')
      expect(cartaoDaVitrine()).toHaveTextContent('Salmão, filé, com pele, fresco, grelhado')
      const grupo = within(screen.getByRole('group', { name: 'Outros exemplos' }))
      expect(grupo.getAllByRole('button').map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true'])
    })

    it('CA-1465: fora dos três (ou vazio), o cartão diz o que experimentar e nenhum botão fica pressionado', async () => {
      montar()
      const campo = screen.getByRole('textbox', { name: 'Digite o nutriente que falta' })
      const usuario = userEvent.setup()
      await usuario.clear(campo)
      expect(cartaoDaVitrine()).toHaveTextContent('Neste exemploExperimente cálcio, vitamina E ou vitamina D.')
      await usuario.type(campo, 'ferro')
      expect(cartaoDaVitrine()).toHaveTextContent('Neste exemploExperimente cálcio, vitamina E ou vitamina D.')
      expect(within(cartaoDaVitrine()).queryAllByRole('listitem')).toHaveLength(0)
      const grupo = within(screen.getByRole('group', { name: 'Outros exemplos' }))
      expect(grupo.getAllByRole('button').every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true)
    })

    it('CA-1466: o cartão é anunciado quando troca, e o campo tem rótulo', () => {
      montar()
      expect(cartaoDaVitrine()).toHaveAttribute('aria-live', 'polite')
      expect(screen.getByLabelText('Digite o nutriente que falta')).toBeInTheDocument()
    })
  })

  describe('chaves', () => {
    const chaves = () => screen.getAllByRole('switch')

    it('CA-1470: cinco chaves com nome; as duas primeiras ligadas, com o efeito', () => {
      montar()
      expect(chaves().map((c) => [c.getAttribute('aria-label'), c.getAttribute('aria-checked')])).toEqual([
        ['Medida caseira junto dos gramas', 'true'],
        ['Água calculada pelo peso', 'true'],
        ['Respeitar a alergia a leite', 'false'],
        ['Plano no celular da paciente', 'false'],
        ['Alimentos que a base ainda não tem', 'false'],
      ])
      expect(texto()).toContain('Feijão carioca cozido: 1 concha (140 g).')
      expect(texto()).toContain('Maria, 62 kg: 35 ml por quilo dá 2,2 litros por dia.')
      expect(texto()).not.toContain('O iogurte sai das sugestões de cálcio')
    })

    it('CA-1471: clique, Enter e Espaço ligam e desligam; o efeito aparece e some', async () => {
      montar()
      const usuario = userEvent.setup()
      const alergia = screen.getByRole('switch', { name: 'Respeitar a alergia a leite' })
      await usuario.click(alergia)
      expect(alergia).toHaveAttribute('aria-checked', 'true')
      expect(texto()).toContain('O iogurte sai das sugestões de cálcio, e a linha do plano avisa se um alimento bater com a alergia.')
      alergia.focus()
      await usuario.keyboard('{Enter}')
      expect(alergia).toHaveAttribute('aria-checked', 'false')
      expect(texto()).not.toContain('O iogurte sai das sugestões de cálcio')
      await usuario.keyboard(' ')
      expect(alergia).toHaveAttribute('aria-checked', 'true')
    })

    it('CA-1473: o alimento próprio segue a publicação 2, na chave e na pergunta', async () => {
      const { unmount } = montar({ formularioNovo: false })
      const usuario = userEvent.setup()
      await usuario.click(screen.getByRole('switch', { name: 'Alimentos que a base ainda não tem' }))
      expect(texto()).toContain('Cadastre o produto pelo rótulo ou pelo código de barras, em Meus alimentos.')
      expect(texto()).toContain('Você cadastra em Meus alimentos, pelo rótulo ou pelo código de barras, e ele entra na refeição pela busca.')
      expect(texto()).not.toMatch(/Cadastre por 100 g|Meus alimentos: por 100 g|medidas caseiras que (você )?usa/)
      unmount()
      montar({ formularioNovo: true })
      await usuario.click(screen.getByRole('switch', { name: 'Alimentos que a base ainda não tem' }))
      expect(texto()).toContain('Cadastre por 100 g ou pela porção do rótulo, com as medidas caseiras que você usa.')
      expect(texto()).toContain('com as medidas caseiras que usa no consultório.')
    })
  })

  describe('Como funciona, cozinha e fotos', () => {
    it('CA-1474: três passos sem número, cada um com a chamada e o fragmento do app', () => {
      montar()
      const como = screen.getByRole('region', { name: 'Como funciona' })
      const passos = ['Primeiro, digite o que a paciente come.', 'Depois, veja quanto falta.', 'Então, cubra o que falta.']
      const posicoes = passos.map((p) => (como.textContent ?? '').indexOf(p))
      expect(posicoes.every((p) => p >= 0)).toBe(true)
      expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes)
      expect(como).toHaveTextContent('1 concha de feijão')
      expect(como).toHaveTextContent('Feijão, carioca, cozido140 g · 107 kcal1 concha')
      for (const linha of ADEQUACAO_DO_EXEMPLO) expect(como).toHaveTextContent(`${linha.nome}${linha.quanto}`)
      const cobrir = within(como).getAllByRole('list').at(-1)
      if (!cobrir) throw new Error('sem a lista do Cobrir')
      expect(within(cobrir).getAllByRole('listitem')).toHaveLength(COBRIR_CALCIO.linhas.length)
      expect(cobrir.firstElementChild).toHaveTextContent('cobre 27% da falta')
      expect(como.textContent).not.toMatch(/(^|\s)0?[1-3][.)](\s|$)|Passo \d/)
    })

    it('CA-1475: a frase, as duas fotos com legenda e a tabela com cabeçalho para o leitor de tela', () => {
      montar()
      const cozinha = screen.getByRole('region', { name: 'Na medida da cozinha' })
      expect(cozinha).toHaveTextContent('A paciente lê o plano como come: em concha, escumadeira e copo americano. Os gramas ficam ao lado, para quem pesa.')
      expect(within(cozinha).getAllByRole('figure')).toHaveLength(2)
      expect(cozinha).toHaveTextContent('Dois copos, duas medidas: cada uma tem o seu peso no plano.')
      const tabela = within(cozinha).getByRole('table', { name: 'Um dia em medidas caseiras, com gramas e calorias' })
      expect(within(tabela).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Alimento', 'Medida', 'Gramas', 'Energia'])
      expect(within(tabela).getAllByRole('rowheader').map((c) => c.textContent)).toEqual(DIA_EM_MEDIDAS.map((r) => r.refeicao))
      expect(within(tabela).getAllByRole('row')).toHaveLength(1 + DIA_EM_MEDIDAS.length + DIA_EM_MEDIDAS.flatMap((r) => r.itens).length)
      expect(tabela).toHaveTextContent('Feijão carioca cozido1 concha140 g107 kcal')
    })

    it('CA-1476: as três fotos têm texto alternativo, tamanho reservado, versão de 800 px e carregam preguiçosas', () => {
      montar()
      const fotos = screen.getAllByRole('img').filter((img) => img.tagName === 'IMG' && img.getAttribute('alt') !== '')
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

    it('CA-1476: os arquivos das fotos existem e têm no máximo 1.600 px de largura', () => {
      const pasta = join(process.cwd(), 'public', 'imagens')
      const arquivos = readdirSync(pasta).filter((n) => /^(legumes-na-bancada|dois-copos-de-leite|salada-com-frango)(-800)?\.webp$/.test(n))
      expect(arquivos).toHaveLength(6)
      for (const nome of arquivos) {
        const webp = readFileSync(join(pasta, nome))
        // VP8 com perda: a largura fica nos bytes 26 e 27 (14 bits).
        expect(webp.toString('ascii', 12, 16), nome).toBe('VP8 ')
        expect(webp.readUInt16LE(26) & 0x3fff, nome).toBeLessThanOrEqual(1600)
      }
    })
  })

  describe('Quanto custa, perguntas e faixa final', () => {
    it('CA-1477: o número grande, a lista do Solo e uma linha para cada outro plano, de PLANOS', () => {
      montar()
      const precos = precosDaLanding()
      const custa = secao('Quanto custa')
      expect(custa.getByText(precos.destaque.falado)).toHaveClass('sr-only')
      expect(custa.getByText(precos.destaque.valor)).toHaveAttribute('aria-hidden', 'true')
      expect(custa.getAllByRole('listitem').map((li) => li.textContent)).toEqual(precos.destaque.itens)
      for (const outro of precos.outros) expect(custa.getByText(outro.texto)).toBeInTheDocument()
      expect(custa.getByText('O pagamento é com cartão de crédito, aqui no site. Você cancela quando quiser em Conta e assinatura.')).toBeInTheDocument()
    })

    it('CA-1478: "Assinar o Solo" escolhe o Solo mensal', async () => {
      const aoEscolher = vi.fn()
      montar({ aoEscolher })
      await userEvent.setup().click(screen.getByRole('button', { name: 'Assinar o Solo' }))
      expect(aoEscolher).toHaveBeenCalledWith('solo', 'mensal')
    })

    it('CA-1479: seis perguntas fechadas, com as respostas que o app sustenta', async () => {
      montar()
      const perguntas = screen.getByRole('region', { name: 'Perguntas de quem atende' })
      const detalhes = [...perguntas.querySelectorAll('details')]
      expect(detalhes).toHaveLength(6)
      expect(detalhes.every((d) => !d.open)).toBe(true)
      expect(perguntas).toHaveTextContent('quando a base tem, as medidas caseiras com o peso de cada uma.')
      expect(perguntas).toHaveTextContent('Pode, com o e-mail da faculdade e o comprovante de matrícula.')
      expect(perguntas).toHaveTextContent('grátis por 12 meses ou até a formatura, o que vier antes')
      expect(perguntas).toHaveTextContent('se você quiser, o mesmo link mostra o plano alimentar. Sem conta e sem senha.')
      expect(perguntas.textContent).not.toMatch(/30 minutos|sai sozinha/)
      const primeira = detalhes[0]?.querySelector('summary')
      if (!primeira) throw new Error('sem pergunta')
      await userEvent.setup().click(primeira)
      expect(detalhes[0]?.open).toBe(true)
    })

    it('CA-1480: a faixa final é um link para Criar conta, que chama quem manda', async () => {
      const aoComecar = vi.fn()
      montar({ aoComecar })
      const faixa = screen.getByRole('link', { name: /Crie a conta e monte o primeiro plano hoje\. Sem cartão\.\s*Começar/ })
      expect(faixa).toHaveAttribute('href', '#/criar-conta')
      expect(faixa.className).toMatch(/hover:bg-landing-branco/)
      expect(faixa.className).not.toMatch(/bg-landing-laranja/)
      await userEvent.setup().click(faixa)
      expect(aoComecar).toHaveBeenCalledOnce()
    })
  })

  describe('texto e acessibilidade', () => {
    it('CA-1481: sem tagline, número de passo, comparação, promessa clínica, "495 kcal" nem "30 minutos"; cada frase uma vez', () => {
      montar()
      const t = texto()
      expect(t).not.toMatch(/495|30 minutos|Cabem mais|sem passar das calorias/)
      expect(t).not.toMatch(/nenhum programa|o único|de verdade|Dietbox|WebDiet|Nutrium|para de abandonar|resultado garantido/i)
      expect(t).not.toMatch(/TACO|IBGE|POF|USDA|NASEM|\bDRIs?\b|Open Food Facts/)
      // Fora dos fragmentos de interface (o mesmo exemplo aparece no campo vivo e em Como funciona), nenhuma frase se repete.
      const fora = [...document.body.querySelectorAll('p, h1, h2, li, summary, figcaption')].filter((el) => !el.closest('[data-ui]'))
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
      for (const controle of [...screen.getAllByRole('button'), ...screen.getAllByRole('link'), ...screen.getAllByRole('switch')]) {
        expect(controle).toHaveAccessibleName()
      }
    })

    it('D-549 e CA-998: nada sai com opacidade zero escrita na página; a entrada ao rolar é marcada com data-surge', () => {
      montar()
      expect(document.body.innerHTML).not.toMatch(/opacity:\s*0/)
      expect(document.querySelectorAll('[data-surge]').length).toBeGreaterThanOrEqual(16)
    })
  })
})
