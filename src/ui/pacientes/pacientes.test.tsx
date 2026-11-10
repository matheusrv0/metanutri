import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { criarRepositorioPacientes, idadeDe, listaDeRestricoes } from '@/domain/pacientes.ts'
import { criarRepositorio, type Armazenamento } from '@/domain/persistencia.ts'
import { ProvedorCasos } from '../estado/ProvedorCasos.tsx'
import { ProvedorPacientes } from '../estado/ProvedorPacientes.tsx'
import { casaRestricao } from '@/domain/restricoes.ts'
import type { ArmazenamentoDeFotos } from '@/domain/fotosDaAvaliacao.ts'
import { ContextoArmazenamentoDeFotos } from '../antropometria/armazenamentoDeFotos.ts'
import { TelaPaciente } from './TelaPaciente.tsx'
import { TelaPacientes } from './TelaPacientes.tsx'

class MemoriaFalsa implements Armazenamento {
  readonly dados = new Map<string, string>()
  getItem(k: string) {
    return this.dados.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.dados.set(k, v)
  }
  removeItem(k: string) {
    this.dados.delete(k)
  }
}

const relogio = () => {
  let ms = Date.UTC(2026, 8, 16, 12, 0, 0)
  return () => new Date((ms += 60_000)).toISOString()
}

function montar(conteudo: React.ReactNode, armazenamento = new MemoriaFalsa()) {
  const pacientes = criarRepositorioPacientes(armazenamento, { agora: relogio(), gerarId: () => 'p1' })
  const casos = criarRepositorio(armazenamento, { agora: relogio() })
  render(
    <ProvedorCasos repositorio={casos}>
      <ProvedorPacientes repositorio={pacientes}>{conteudo}</ProvedorPacientes>
    </ProvedorCasos>,
  )
  return { pacientes, casos, usuario: userEvent.setup() }
}

describe('Pacientes', () => {
  it('calcula a idade a partir da data de nascimento', () => {
    expect(idadeDe('1998-03-10', new Date(2026, 8, 16))).toEqual({ anos: 28, meses: 6 })
    expect(idadeDe('2026-01-01', new Date(2026, 8, 16))?.anos).toBe(0)
    expect(idadeDe(null)).toBeNull()
    expect(idadeDe('data errada')).toBeNull()
  })

  it('lê uma restrição por linha, ignorando linhas vazias', () => {
    expect(listaDeRestricoes('leite\n\ncamarão, amendoim\n')).toEqual(['leite', 'camarão', 'amendoim'])
  })

  it('a restrição casa com o alimento mesmo sem acento', () => {
    expect(casaRestricao({ id: 0, descricao: 'Camarão, cozido' }, ['camarao'])).toBe(true)
    expect(casaRestricao({ id: 0, descricao: 'Leite, de vaca, integral' }, ['leite'])).toBe(true)
    expect(casaRestricao({ id: 0, descricao: 'Arroz, tipo 1, cozido' }, ['leite'])).toBe(false)
    // termo curto demais não filtra, para não apagar meia base
    expect(casaRestricao({ id: 0, descricao: 'Arroz, tipo 1, cozido' }, ['ar'])).toBe(false)
  })

  it('lista vazia convida a cadastrar', async () => {
    const aoAbrir = vi.fn()
    const { usuario } = montar(<TelaPacientes aoAbrir={aoAbrir} />)
    expect(screen.getByRole('heading', { name: 'Nenhum paciente ainda' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar paciente' }))
    expect(aoAbrir).toHaveBeenCalledWith('p1')
  })

  it('CA-791 (spec revisao-geral-trabalho): "Pacientes" não se repete dentro da tela; a busca e "Novo paciente" ficam', () => {
    montar(<TelaPacientes aoAbrir={vi.fn()} />)
    expect(screen.queryByRole('heading', { name: 'Pacientes' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Buscar paciente')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Novo paciente' })).toBeInTheDocument()
  })

  it('CA-791: na ficha, a frase de que as restrições filtram as sugestões aparece uma vez', async () => {
    const armazenamento = new MemoriaFalsa()
    const pacientes = criarRepositorioPacientes(armazenamento, { agora: relogio(), gerarId: () => 'p1' })
    pacientes.salvar({ ...pacientes.criar('Maria'), restricoes: 'camarão' })
    const casos = criarRepositorio(armazenamento, { agora: relogio() })
    render(
      <ProvedorCasos repositorio={casos}>
        <ProvedorPacientes repositorio={pacientes}>
          <TelaPaciente pacienteId="p1" aoAbrirPlano={vi.fn()} aoNovoPlano={vi.fn()} aoVoltar={vi.fn()} />
        </ProvedorPacientes>
      </ProvedorCasos>,
    )
    expect(screen.getAllByText(/sugest/i)).toHaveLength(1)
    expect(screen.getByText('Um por linha. Esses alimentos não aparecem nas sugestões nem no Cobrir.')).toBeInTheDocument()
  })

  it('a ficha guarda nome, restrições e mostra o histórico vazio', async () => {
    const armazenamento = new MemoriaFalsa()
    const pacientes = criarRepositorioPacientes(armazenamento, { agora: relogio(), gerarId: () => 'p1' })
    pacientes.criar('Maria')
    const casos = criarRepositorio(armazenamento, { agora: relogio() })

    render(
      <ProvedorCasos repositorio={casos}>
        <ProvedorPacientes repositorio={pacientes}>
          <TelaPaciente pacienteId="p1" aoAbrirPlano={vi.fn()} aoNovoPlano={vi.fn()} aoVoltar={vi.fn()} />
        </ProvedorPacientes>
      </ProvedorCasos>,
    )
    const usuario = userEvent.setup()

    expect(screen.getByLabelText('Nome')).toHaveValue('Maria')
    await usuario.click(screen.getByRole('button', { name: /^Alimentação/ }))
    await usuario.type(screen.getByLabelText('Outros alimentos que não come'), 'camarão')
    expect(pacientes.obter('p1')?.restricoes).toContain('camarão')
    expect(screen.getByText('Nenhum plano para este paciente ainda.')).toBeInTheDocument()
    expect(screen.getByText(/pelo menos dois planos com peso/)).toBeInTheDocument()
  })

  it('o histórico lista os planos do paciente e abre um deles', async () => {
    const armazenamento = new MemoriaFalsa()
    const pacientes = criarRepositorioPacientes(armazenamento, { agora: relogio(), gerarId: () => 'p1' })
    pacientes.criar('Maria')
    const casos = criarRepositorio(armazenamento, { agora: relogio() })
    const plano = casos.criar('Maria, retorno')
    casos.salvar({ ...plano, caso: { ...plano.caso, pacienteId: 'p1', pesoKg: 62 } })

    const aoAbrirPlano = vi.fn()
    render(
      <ProvedorCasos repositorio={casos}>
        <ProvedorPacientes repositorio={pacientes}>
          <TelaPaciente pacienteId="p1" aoAbrirPlano={aoAbrirPlano} aoNovoPlano={vi.fn()} aoVoltar={vi.fn()} />
        </ProvedorPacientes>
      </ProvedorCasos>,
    )

    const lista = within(screen.getByRole('list', { name: 'Planos do paciente' }))
    expect(lista.getByText('Maria, retorno')).toBeInTheDocument()
    await userEvent.setup().click(lista.getByRole('button', { name: 'Abrir' }))
    expect(aoAbrirPlano).toHaveBeenCalledWith(plano.caso.id)
  })

  it.each([
    ['2014-05-01', null],
    ['1991-03-20', 150],
  ])('CA-1096 e CA-1097 (spec ficha-unica): duplicar na ficha (nascimento %s) limpa as medidas do dia e decide a estatura pela ficha', async (nascimento, estatura) => {
    const armazenamento = new MemoriaFalsa()
    const pacientes = criarRepositorioPacientes(armazenamento, { agora: relogio(), gerarId: () => 'p1' })
    pacientes.salvar({ ...pacientes.criar('Maria'), nascimento })
    const casos = criarRepositorio(armazenamento, { agora: relogio() })
    const plano = casos.criar('Maria, retorno')
    // O plano gravou 35 anos; a ficha é quem diz a idade na data nova (D-341).
    casos.salvar({ ...plano, caso: { ...plano.caso, pacienteId: 'p1', idadeAnos: 35, pesoKg: 40, estaturaCm: 150, circunferenciaCinturaCm: 60 } })

    const aoAbrirPlano = vi.fn()
    render(
      <ProvedorCasos repositorio={casos}>
        <ProvedorPacientes repositorio={pacientes}>
          <TelaPaciente pacienteId="p1" aoAbrirPlano={aoAbrirPlano} aoNovoPlano={vi.fn()} aoVoltar={vi.fn()} />
        </ProvedorPacientes>
      </ProvedorCasos>,
    )

    await userEvent.setup().click(screen.getByRole('button', { name: 'Duplicar Maria, retorno' }))
    const idDaCopia: unknown = aoAbrirPlano.mock.calls[0]?.[0]
    expect(idDaCopia).not.toBe(plano.caso.id)
    const copia = casos.obter(String(idDaCopia))?.caso
    expect(copia?.pesoKg).toBeNull()
    expect(copia?.circunferenciaCinturaCm).toBeNull()
    expect(copia?.estaturaCm ?? null).toBe(estatura)
  })

  it('CB-1462 (spec antropometria-telas, D-1502): plano sem data da consulta alterado às 21h30 vira ponto do dia de quem usa', () => {
    const armazenamento = new MemoriaFalsa()
    const pacientes = criarRepositorioPacientes(armazenamento, { agora: relogio(), gerarId: () => 'p1' })
    pacientes.criar('Maria')
    // 21h30 no relógio de quem usa: em Brasília, 00h30 UTC do dia seguinte.
    const casos = criarRepositorio(armazenamento, { agora: () => new Date(2026, 10, 3, 21, 30).toISOString() })
    const antes = casos.criar('Maria, 1ª')
    casos.salvar({ ...antes, caso: { ...antes.caso, pacienteId: 'p1', pesoKg: 64, dataConsulta: '2026-10-01' } })
    const noite = casos.criar('Maria, 2ª')
    casos.salvar({ ...noite, caso: { ...noite.caso, pacienteId: 'p1', pesoKg: 62, dataConsulta: null } })
    render(
      <ProvedorCasos repositorio={casos}>
        <ProvedorPacientes repositorio={pacientes}>
          <TelaPaciente pacienteId="p1" aoAbrirPlano={vi.fn()} aoNovoPlano={vi.fn()} aoVoltar={vi.fn()} />
        </ProvedorPacientes>
      </ProvedorCasos>,
    )
    const grafico = screen.getByRole('img', { name: 'Evolução do peso ao longo dos planos' })
    expect(within(grafico).getByText('03/11')).toBeInTheDocument()
    expect(within(grafico).queryByText('04/11')).not.toBeInTheDocument()
  })

  it('CB-1464 (spec antropometria-telas, D-1503): excluir o paciente apaga as fotos e os anexos das avaliações; os planos ficam', async () => {
    const armazenamento = new MemoriaFalsa()
    const pacientes = criarRepositorioPacientes(armazenamento, { agora: relogio(), gerarId: () => 'p1' })
    pacientes.criar('Maria')
    const casos = criarRepositorio(armazenamento, { agora: relogio() })
    const comFotos = casos.criar('Maria, 1ª')
    const foto = { id: 'f1', angulo: 'frente' as const, nome: 'Frente', caminho: 'conta-1/x/fotos/f1.jpg', bytes: 1000, tipo: 'image/jpeg' as const, enviadoEm: '2026-11-03T12:00:00.000Z' }
    casos.salvar({ ...comFotos, caso: { ...comFotos.caso, pacienteId: 'p1', avaliacao: { ...comFotos.caso.avaliacao, fotosAutorizadasEm: '2026-11-03', fotos: [foto], diagnostico: 'Sobrepeso.' } } })
    const semFotos = casos.criar('Maria, 2ª')
    casos.salvar({ ...semFotos, caso: { ...semFotos.caso, pacienteId: 'p1' } })
    const deOutro = casos.criar('João')
    const pastas: string[] = []
    const fotos: ArmazenamentoDeFotos = {
      conta: async () => 'conta-1',
      enviar: async () => 'ok',
      contar: async () => 0,
      assinar: async () => null,
      apagar: async () => true,
      apagarPasta: async (pasta) => (pastas.push(pasta), true),
    }
    render(
      <ContextoArmazenamentoDeFotos.Provider value={fotos}>
        <ProvedorCasos repositorio={casos}>
          <ProvedorPacientes repositorio={pacientes}>
            <TelaPaciente pacienteId="p1" aoAbrirPlano={vi.fn()} aoNovoPlano={vi.fn()} aoVoltar={vi.fn()} />
          </ProvedorPacientes>
        </ProvedorCasos>
      </ContextoArmazenamentoDeFotos.Provider>,
    )
    expect(screen.getByText('Os planos continuam salvos, mas perdem o vínculo com esta ficha. As fotos e os anexos das avaliações são apagados.')).toBeInTheDocument()
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Excluir paciente' }))
    await usuario.click(screen.getByRole('button', { name: 'Excluir paciente' }))
    expect(pacientes.obter('p1')).toBeNull()
    expect(casos.obter(comFotos.caso.id)?.caso.avaliacao).toMatchObject({ fotosAutorizadasEm: null, fotos: null, anexos: null, diagnostico: 'Sobrepeso.' })
    expect(casos.listar()).toHaveLength(3)
    await vi.waitFor(() => expect([...pastas].sort()).toEqual([`conta-1/${comFotos.caso.id}`, `conta-1/${semFotos.caso.id}`].sort()))
    expect(pastas).not.toContain(`conta-1/${deOutro.caso.id}`)
  })

  it('DP-26 (spec dados-na-nuvem): o paciente que não existe mais pode ter sido excluído em outra aba ou em outro aparelho', () => {
    montar(<TelaPaciente pacienteId="nao-existe" aoAbrirPlano={vi.fn()} aoNovoPlano={vi.fn()} aoVoltar={vi.fn()} />)
    expect(screen.getByText('Este paciente não existe mais. Ele pode ter sido excluído em outra aba ou em outro aparelho.')).toBeInTheDocument()
  })
})
