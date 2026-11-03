import { useState } from 'react'
import { Badge, type OrderStatus } from '../shared/components/Badge'
import { Button, type ButtonSize, type ButtonVariant } from '../shared/components/Button'
import { Card, type CardPadding } from '../shared/components/Card'
import { EmptyState } from '../shared/components/EmptyState'
import { Input } from '../shared/components/Input'
import { Modal, type ModalSize } from '../shared/components/Modal'
import { Rating } from '../shared/components/Rating'
import { Select } from '../shared/components/Select'
import { Spinner, type SpinnerSize } from '../shared/components/Spinner'

const buttonVariants: ButtonVariant[] = ['primary', 'secondary', 'outline', 'ghost', 'danger']
const buttonSizes: ButtonSize[] = ['sm', 'md', 'lg']
const cardPaddings: CardPadding[] = ['none', 'sm', 'md', 'lg']
const modalSizes: ModalSize[] = ['sm', 'md', 'lg', 'xl']
const spinnerSizes: SpinnerSize[] = ['sm', 'md', 'lg']
const orderStatuses: OrderStatus[] = ['pending', 'preparing', 'ready', 'delivered', 'cancelled']

export default function Preview() {
  const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr')
  const [modalSize, setModalSize] = useState<ModalSize | null>(null)

  return (
    <main dir={direction} className="min-h-screen bg-surface-cream px-4 py-8 text-text-main sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Shared component preview</h1>
            <p className="mt-1 text-sm text-text-slate">Interactive component states and direction: {direction.toUpperCase()}</p>
          </div>
          <Button variant="outline" onClick={() => setDirection(direction === 'ltr' ? 'rtl' : 'ltr')}>
            Switch to {direction === 'ltr' ? 'RTL' : 'LTR'}
          </Button>
        </header>

        <section aria-labelledby="button-heading" className="space-y-4">
          <h2 id="button-heading" className="text-xl font-semibold">Button</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {buttonVariants.map((variant) => (
              <Card key={variant}>
                <h3 className="mb-3 text-sm font-semibold">{variant}</h3>
                <div className="flex flex-wrap items-center gap-3">
                  {buttonSizes.map((size) => (
                    <Button key={size} variant={variant} size={size}>{size}</Button>
                  ))}
                  <Button variant={variant} disabled>Disabled</Button>
                  <Button variant={variant} loading>Loading</Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="input-heading" className="space-y-4">
          <h2 id="input-heading" className="text-xl font-semibold">Input</h2>
          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Default input" placeholder="Enter a value" />
              <Input label="Required input" required placeholder="Enter a value" />
              <Input label="Input with hint" hint="A short helper message." placeholder="name@example.com" />
              <Input label="Input with error" error="Please check this value." defaultValue="Invalid value" />
              <Input label="Disabled input" disabled value="Unavailable" readOnly />
            </div>
          </Card>
        </section>

        <section aria-labelledby="select-heading" className="space-y-4">
          <h2 id="select-heading" className="text-xl font-semibold">Select</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <Select label="Default select" defaultValue="one">
                <option value="one">First option</option>
                <option value="two">Second option</option>
              </Select>
            </Card>
            <Card>
              <Select label="Select with hint" hint="Choose one option." defaultValue="">
                <option value="" disabled>Select an option</option>
                <option value="one">First option</option>
              </Select>
            </Card>
            <Card>
              <Select label="Select with error" error="Choose a valid option." defaultValue="">
                <option value="" disabled>Select an option</option>
                <option value="one">First option</option>
              </Select>
            </Card>
            <Card>
              <Select label="Disabled select" disabled defaultValue="one">
                <option value="one">Unavailable</option>
              </Select>
            </Card>
          </div>
        </section>

        <section aria-labelledby="modal-heading" className="space-y-4">
          <h2 id="modal-heading" className="text-xl font-semibold">Modal</h2>
          <Card>
            <p className="mb-4 text-sm text-text-slate">Open the dialog at each supported size.</p>
            <div className="flex flex-wrap gap-3">
              {modalSizes.map((size) => (
                <Button key={size} variant="secondary" onClick={() => setModalSize(size)}>{size}</Button>
              ))}
            </div>
          </Card>
          <Modal
            open={modalSize !== null}
            onClose={() => setModalSize(null)}
            title={`Modal preview${modalSize ? `: ${modalSize}` : ''}`}
            size={modalSize ?? 'md'}
          >
            <p className="text-sm text-text-slate">Press Escape, click the backdrop, or use the close button to dismiss this dialog.</p>
          </Modal>
        </section>

        <section aria-labelledby="card-heading" className="space-y-4">
          <h2 id="card-heading" className="text-xl font-semibold">Card</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cardPaddings.map((padding) => (
              <Card key={padding} padding={padding}>
                <p className="font-medium">Padding: {padding}</p>
                <p className="mt-2 text-sm text-text-slate">Card content preview.</p>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="spinner-heading" className="space-y-4">
          <h2 id="spinner-heading" className="text-xl font-semibold">Spinner</h2>
          <Card>
            <div className="flex flex-wrap items-center gap-6">
              {spinnerSizes.map((size) => <Spinner key={size} size={size} label={`Loading (${size})`} />)}
            </div>
          </Card>
        </section>

        <section aria-labelledby="empty-heading" className="space-y-4">
          <h2 id="empty-heading" className="text-xl font-semibold">Empty state</h2>
          <Card>
            <EmptyState
              title="No items yet"
              description="When items are available, they will appear here."
              action={<Button variant="outline" size="sm">Explore items</Button>}
            />
          </Card>
        </section>

        <section aria-labelledby="badge-heading" className="space-y-4">
          <h2 id="badge-heading" className="text-xl font-semibold">Order status badges</h2>
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              {orderStatuses.map((status) => <Badge key={status} status={status} />)}
            </div>
          </Card>
        </section>

        <section aria-labelledby="rating-heading" className="space-y-4">
          <h2 id="rating-heading" className="text-xl font-semibold">Rating</h2>
          <Card>
            <div className="flex flex-wrap items-center gap-6">
              <Rating value={1} />
              <Rating value={3.5} />
              <Rating value={5} />
            </div>
          </Card>
        </section>
      </div>
    </main>
  )
}
