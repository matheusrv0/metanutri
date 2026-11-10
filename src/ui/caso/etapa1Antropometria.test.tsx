// A etapa 1 do plano e a avaliação completa (spec antropometria-telas, D-1437).
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { criarCasoVazio } from '@/domain/caso.ts'
import type { Caso } from '@/domain/tipos.ts'
import { TelaCaso } from './TelaCaso.tsx'

const vazio = criarCasoVazio('c1')

function Anfitriao({ inicial, aoAbrirAvaliacao, aoGravar }: { readonly inicial: Partial<Caso>; readonly aoAbrirAvaliacao: () => void; readonly aoGravar?: (caso: Caso) => void }) {
  const [caso, setCaso] = useState<Caso>({ ...vazio, ...inicial })
  return (
    <TelaCaso
      caso={caso}
      aoAlterar={(m) =>
        setCaso((c) => {
          const novo = { ...c, ...m }
          aoGravar?.(novo)
          return novo
        })
      }
      aoAbrirAvaliacao={aoAbrirAvaliacao}
    />
  )
}

const adulta = { sexo: 'F', idadeAnos: 34, pesoKg: 71.5, estaturaCm: 164 } as const

describe('a etapa 1 leva à avaliação completa (spec antropometria-telas, CA-2406 e CA-2468)', () => {
  it('CA-2406: o cartão "Avaliação antropométrica" tem "Abrir a avaliação completa"', async () => {
    const aoAbrir = vi.fn()
    render(<Anfitriao inicial={adulta} aoAbrirAvaliacao={aoAbrir} />)
    const painel = within(screen.getByRole('region', { name: 'Avaliação antropométrica' }))
    await userEvent.setup().click(painel.getByRole('button', { name: 'Abrir a avaliação completa' }))
    expect(aoAbrir).toHaveBeenCalledTimes(1)
  })

  it('CA-2468: com Petroski, a composição diz o protocolo da avaliação completa, sem as dobras de hoje', async () => {
    const aoAbrir = vi.fn()
    const comPetroski: Partial<Caso> = { ...adulta, composicao: { ...vazio.composicao, protocolo: 'petroski', dobras: { ...vazio.composicao.dobras, tricipital: 20 } } }
    render(<Anfitriao inicial={comPetroski} aoAbrirAvaliacao={aoAbrir} />)
    const usuario = userEvent.setup()
    // A composição abre sozinha quando já tem dado.
    expect(screen.getByText('Protocolo da avaliação completa: Petroski')).toBeInTheDocument()
    expect(screen.queryByLabelText('Tricipital')).not.toBeInTheDocument()
    expect(screen.queryByText('Resultado das dobras')).not.toBeInTheDocument()
    // A bioimpedância continua.
    expect(screen.getByLabelText('Gordura')).toBeInTheDocument()
    const composicao = screen.getByText('Protocolo da avaliação completa: Petroski').closest('div')
    if (!composicao) throw new Error('sem o bloco do protocolo')
    await usuario.click(within(composicao.parentElement ?? composicao).getByRole('button', { name: 'Abrir a avaliação completa' }))
    expect(aoAbrir).toHaveBeenCalled()

    // Escolher um dos 2 de hoje volta às 6 dobras, com o valor que já estava.
    await usuario.click(screen.getByRole('radio', { name: 'Jackson e Pollock, 3 dobras' }))
    expect(screen.queryByText(/Protocolo da avaliação completa/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Tricipital')).toHaveValue('20')
  })
})

describe('a suprailíaca da etapa 1 é a da tela nova (spec antropometria-telas, D-1520 e D-1521; revisão r1, M1 e B4)', () => {
  const comDobras = (protocolo: Caso['composicao']['protocolo'], dobras: Partial<Caso['composicao']['dobras']>, sexo: 'F' | 'M' = 'F'): Partial<Caso> => ({
    ...adulta,
    sexo,
    pesoKg: 70,
    composicao: { ...vazio.composicao, protocolo, dobras: { ...vazio.composicao.dobras, ...dobras } },
  })

  it('CB-1480: JP 3 na mulher com a suprailíaca digitada na tela nova (axilar anterior): o mesmo valor e a mesma gordura', () => {
    render(<Anfitriao inicial={comDobras('jackson-pollock-3', { tricipital: 20, suprailiacaAnt: 18, coxa: 25 })} aoAbrirAvaliacao={() => undefined} />)
    const campo = screen.getByRole('textbox', { name: 'Suprailíaca · axilar anterior' })
    expect(campo).toHaveValue('18')
    expect(screen.queryByLabelText('Supra-ilíaca')).not.toBeInTheDocument()
    expect(screen.getByText(/^25,4% de gordura/)).toBeInTheDocument()
    expect(screen.queryByText(/Faltam dobras/)).not.toBeInTheDocument()
  })

  it('CB-1480: digitada na etapa 1, a suprailíaca da mulher em JP 3 grava a da axilar anterior', async () => {
    const gravados: Caso[] = []
    render(<Anfitriao inicial={comDobras('jackson-pollock-3', { tricipital: 20, coxa: 25 })} aoAbrirAvaliacao={() => undefined} aoGravar={(c) => gravados.push(c)} />)
    await userEvent.setup().type(screen.getByRole('textbox', { name: 'Suprailíaca · axilar anterior' }), '18')
    const ultimo = gravados.at(-1)
    expect(ultimo?.composicao.dobras.suprailiacaAnt).toBe(18)
    expect(ultimo?.composicao.dobras.suprailiaca).toBeNull()
    expect(screen.getByText(/^25,4% de gordura/)).toBeInTheDocument()
  })

  it('CB-1481: o plano de antes mostra a suprailíaca de linha não informada, com o número de antes', () => {
    render(<Anfitriao inicial={comDobras('jackson-pollock-3', { tricipital: 20, suprailiaca: 18, coxa: 25 })} aoAbrirAvaliacao={() => undefined} />)
    expect(screen.getByRole('textbox', { name: 'Suprailíaca · linha não informada' })).toHaveValue('18')
    expect(screen.queryByRole('textbox', { name: 'Suprailíaca · axilar anterior' })).not.toBeInTheDocument()
    expect(screen.getByText(/^25,4% de gordura/)).toBeInTheDocument()
  })

  it('CB-1482: Faulkner com a suprailíaca da axilar média (digitada na tela nova) mostra o valor e calcula', () => {
    render(<Anfitriao inicial={comDobras('faulkner-4', { tricipital: 10, subescapular: 12, suprailiacaMed: 14, abdominal: 16 })} aoAbrirAvaliacao={() => undefined} />)
    expect(screen.getByRole('textbox', { name: 'Suprailíaca · axilar média' })).toHaveValue('14')
    expect(screen.getByText(/^13,7% de gordura/)).toBeInTheDocument()
  })

  it('CB-1460: apagar a suprailíaca de um plano antigo mantém o foco no campo, e o que se digita depois entra na dobra nova', async () => {
    const gravados: Caso[] = []
    render(<Anfitriao inicial={comDobras('jackson-pollock-3', { tricipital: 20, suprailiaca: 18, coxa: 25 })} aoAbrirAvaliacao={() => undefined} aoGravar={(c) => gravados.push(c)} />)
    const usuario = userEvent.setup()
    const campo = screen.getByRole('textbox', { name: 'Suprailíaca · linha não informada' })
    await usuario.click(campo)
    await usuario.keyboard('{End}{Backspace}{Backspace}')
    expect(document.activeElement).toBe(campo)
    await usuario.keyboard('19')
    expect(screen.getByRole('textbox', { name: 'Suprailíaca · axilar anterior' })).toHaveValue('19')
    expect(gravados.at(-1)?.composicao.dobras).toMatchObject({ suprailiaca: null, suprailiacaAnt: 19 })
  })

  it('no homem com JP 3, que não usa a suprailíaca, o campo continua o de linha não informada', () => {
    render(<Anfitriao inicial={comDobras('jackson-pollock-3', { peitoral: 10 }, 'M')} aoAbrirAvaliacao={() => undefined} />)
    expect(screen.getByRole('textbox', { name: 'Suprailíaca · linha não informada' })).toHaveValue('')
  })
})
