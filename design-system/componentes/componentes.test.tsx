import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card, CardContent, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@ds/componentes/overlay/dialog.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Progress } from '@ds/componentes/display/progress.tsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ds/componentes/navigation/tabs.tsx'

describe('componentes base do design system', () => {
  it('botão usa o estilo primário em pílula e é type="button" por padrão', () => {
    render(<Button>Adicionar</Button>)
    const botao = screen.getByRole('button', { name: 'Adicionar' })
    expect(botao).toHaveAttribute('type', 'button')
    // O sistema manda pílula no botão (DESIGN.md > Formas).
    expect(botao.className).toContain('rounded-full')
    expect(botao.className).toContain('bg-primary')
  })

  it('cartão com título renderiza como seção com cabeçalho', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Resumo do dia</CardTitle>
        </CardHeader>
        <CardContent>conteúdo</CardContent>
      </Card>,
    )
    expect(screen.getByRole('heading', { name: 'Resumo do dia' })).toBeInTheDocument()
  })

  it('rótulo associa ao campo', () => {
    render(
      <>
        <Label htmlFor="peso">Peso (kg)</Label>
        <Input id="peso" />
      </>,
    )
    expect(screen.getByLabelText('Peso (kg)')).toBeInTheDocument()
  })

  it('barra de progresso limita o valor entre 0 e 100', () => {
    render(<Progress value={140} aria-label="Ferro" />)
    expect(screen.getByRole('progressbar', { name: 'Ferro' })).toHaveAttribute('aria-valuenow', '100')
  })

  it('selo e alerta aceitam variantes de estado', () => {
    render(
      <>
        <Badge variant="lightError">Abaixo</Badge>
        <Alert variant="warning">Acima do limite</Alert>
      </>,
    )
    expect(screen.getByText('Abaixo').className).toContain('bg-lighterror')
    expect(screen.getByRole('status')).toHaveTextContent('Acima do limite')
  })

  it('abas trocam o conteúdo', async () => {
    render(
      <Tabs defaultValue="caso">
        <TabsList>
          <TabsTrigger value="caso">Caso</TabsTrigger>
          <TabsTrigger value="plano">Plano alimentar</TabsTrigger>
        </TabsList>
        <TabsContent value="caso">conteúdo do caso</TabsContent>
        <TabsContent value="plano">conteúdo do plano</TabsContent>
      </Tabs>,
    )
    expect(screen.getByText('conteúdo do caso')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Plano alimentar' }))
    expect(screen.getByText('conteúdo do plano')).toBeInTheDocument()
  })

  it('diálogo abre com título e botão Fechar em português', async () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Excluir</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Excluir plano?</DialogTitle>
          <DialogDescription>Não dá para desfazer.</DialogDescription>
        </DialogContent>
      </Dialog>,
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Excluir' }))
    expect(screen.getByRole('dialog', { name: 'Excluir plano?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument()
  })
})
