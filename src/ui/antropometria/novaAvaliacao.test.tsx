// "Nova avaliação" pelo app inteiro, com a ficha e os planos no navegador (spec antropometria-telas, D-1405).
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '@/App.tsx'
import { diaLocal } from '@/domain/acompanhamento.ts'
import { criarRepositorioPacientes } from '@/domain/pacientes.ts'
import { criarRepositorio } from '@/domain/persistencia.ts'
import { CHAVE_AVISO_VISTO } from '../casos/AvisoPrimeiroAcesso.tsx'
import { ProvedorTema } from '../tema/ProvedorTema.tsx'

vi.mock('../enderecos.ts', async (original) => ({ ...(await original<typeof import('../enderecos.ts')>()), sairParaOSite: () => undefined }))

// A tela vem num pedaço separado do JavaScript (DP-AT-10): com a suíte inteira rodando, o primeiro import passa de 1 s.
const renderizar = () =>
  render(
    <ProvedorTema>
      <App />
    </ProvedorTema>,
  )

function fichaDaRenata() {
  const pacientes = criarRepositorioPacientes(localStorage)
  const ficha = pacientes.salvar({ ...pacientes.criar('Renata Oliveira Campos'), sexo: 'F', nascimento: '1992-05-12' })
  return { ficha, casos: criarRepositorio(localStorage) }
}

describe('Nova avaliação (spec antropometria-telas, CA-2402 e CA-2403)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(CHAVE_AVISO_VISTO, '1')
    window.location.hash = ''
  })

  it('CA-2402: sem avaliação, nasce um plano completo de hoje com a cintura no ponto médio, e a tela dele abre', async () => {
    const { ficha, casos } = fichaDaRenata()
    window.location.hash = `#/paciente/${ficha.id}/antropometria`
    renderizar()
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Nova avaliação' }, { timeout: 5000 }))

    const [criado] = criarRepositorio(localStorage).listar()
    expect(casos.listar()).toHaveLength(1)
    const caso = criado ? criarRepositorio(localStorage).obter(criado.id)?.caso : undefined
    expect(caso?.pacienteId).toBe(ficha.id)
    expect(caso?.modo).toBe('completo')
    expect(caso?.dataConsulta).toBe(diaLocal(new Date()))
    expect(caso?.medidasCorporais.pontoDaCintura).toBe('ponto-medio')
    expect(window.location.hash).toBe(`#/antropometria/${caso?.id ?? ''}`)
  })

  it('CA-2403: com avaliação, a nova é o retorno da mais recente: sem as medidas do dia, com o protocolo e o ponto', async () => {
    const { ficha, casos } = fichaDaRenata()
    const antiga = casos.criar('Avaliação de setembro')
    casos.salvar({
      ...antiga,
      caso: {
        ...antiga.caso,
        pacienteId: ficha.id,
        modo: 'completo',
        dataConsulta: '2026-09-08',
        pesoKg: 72.6,
        circunferenciaCinturaCm: 85.2,
        medidasCorporais: { ...antiga.caso.medidasCorporais, pontoDaCintura: 'crista-iliaca' },
        avaliacao: { ...antiga.caso.avaliacao, adipometro: 'lange' },
        composicao: { ...antiga.caso.composicao, protocolo: 'jackson-pollock-7', dobras: { ...antiga.caso.composicao.dobras, coxa: 35.5 } },
      },
    })
    window.location.hash = `#/antropometria/${antiga.caso.id}/historico`
    renderizar()
    const acoes = await screen.findByRole('button', { name: 'Nova avaliação' }, { timeout: 5000 })
    await userEvent.setup().click(acoes)

    const repo = criarRepositorio(localStorage)
    const nova = repo.listar().find((c) => c.id !== antiga.caso.id)
    const caso = nova ? repo.obter(nova.id)?.caso : undefined
    expect(caso?.dataConsulta).toBe(diaLocal(new Date()))
    expect(caso?.pesoKg).toBeNull()
    expect(caso?.circunferenciaCinturaCm).toBeNull()
    expect(caso?.composicao.dobras.coxa).toBeNull()
    expect(caso?.composicao.protocolo).toBe('jackson-pollock-7')
    expect(caso?.medidasCorporais.pontoDaCintura).toBe('crista-iliaca')
    expect(caso?.avaliacao.adipometro).toBe('lange')
    expect(window.location.hash).toBe(`#/antropometria/${caso?.id ?? ''}`)
    expect(within(screen.getByRole('navigation', { name: 'Ficha do paciente' })).getByRole('button', { name: 'Antropometria' })).toHaveAttribute('aria-current', 'page')
  })
})
