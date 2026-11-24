import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Pencil, Plus, Trash2, Utensils } from 'lucide-react'

import { ConfirmDialog } from '@/pages/dashboard/components/ConfirmDialog'
import { StatusPill } from '@/pages/dashboard/components/StatusPill'
import { Button } from '@/shared/components/Button'
import { Card } from '@/shared/components/Card'
import { EmptyState } from '@/shared/components/EmptyState'
import { Input } from '@/shared/components/Input'
import { Modal } from '@/shared/components/Modal'
import { Select } from '@/shared/components/Select'
import { useCategories } from '@/shared/hooks/useCategories'
import { useLanguage } from '@/shared/hooks/useLanguage'
import { uploadService } from '@/shared/services/upload.service'
import type { MenuItem } from '@/shared/types'
import { formatCurrency } from '@/shared/utils/format'
import type { MealChanges } from './RestaurantDashboardTabs'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

interface MealFormValues {
  name: string
  description: string
  price: string
  category: string
  preparationTimeMinutes: string
  ingredients: string
  image: string | null
  isAvailable: boolean
  isPopular: boolean
}

function mealFormValues(meal?: MenuItem): MealFormValues {
  return {
    name: meal?.name ?? '',
    description: meal?.description ?? '',
    price: meal ? String(meal.price) : '',
    category: meal?.category ?? '',
    preparationTimeMinutes: meal ? String(meal.preparationTimeMinutes) : '',
    ingredients: meal?.ingredients.join(', ') ?? '',
    image: meal?.image ?? null,
    isAvailable: meal?.isAvailable ?? true,
    isPopular: meal?.isPopular ?? false,
  }
}

function getMealChanges(values: MealFormValues): MealChanges {
  const price = Number(values.price)
  const preparationTimeMinutes = Number(values.preparationTimeMinutes)
  if (!values.name.trim() || !values.description.trim() || !values.category.trim()) {
    throw new Error('Complete the meal name, description and category.')
  }
  if (!Number.isFinite(price) || price <= 0) throw new Error('Enter a price greater than zero.')
  if (!Number.isInteger(preparationTimeMinutes) || preparationTimeMinutes < 1) {
    throw new Error('Enter a preparation time of at least one minute.')
  }
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    price,
    category: values.category.trim(),
    preparationTimeMinutes,
    ingredients: values.ingredients.split(',').map((item) => item.trim()).filter(Boolean),
    image: values.image,
    isAvailable: values.isAvailable,
    isPopular: values.isPopular,
  }
}

function MealEditor({
  meal,
  busy,
  onClose,
  onSave,
}: {
  meal: MenuItem | null
  busy: boolean
  onClose: () => void
  onSave: (meal: MenuItem | null, changes: MealChanges) => Promise<boolean>
}) {
  const { t } = useLanguage()
  const categories = useCategories()
  const [values, setValues] = useState(() => mealFormValues(meal ?? undefined))
  const [imageError, setImageError] = useState('')
  const [formError, setFormError] = useState('')

  const setField = <K extends keyof MealFormValues>(key: K, value: MealFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const selectImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImageError('')
    try {
      if (!file.type.startsWith('image/')) throw new Error('Choose an image file.')
      if (file.size > MAX_IMAGE_BYTES) throw new Error('Choose an image smaller than 5 MB.')
      setField('image', await uploadService.upload(file))
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'The image could not be read.')
      event.target.value = ''
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    try {
      const saved = await onSave(meal, getMealChanges(values))
      if (!saved) setFormError('The meal could not be saved.')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'The meal could not be saved.')
    }
  }

  return (
    <Modal open onClose={onClose} title={t(meal ? 'Edit meal' : 'Add meal')} size="lg">
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('Meal name')}
            value={values.name}
            onChange={(event) => setField('name', event.target.value)}
            required
            maxLength={100}
          />
          <Select
            label={t('Category')}
            value={values.category}
            onChange={(event) => setField('category', event.target.value)}
            disabled={categories.loading || !!categories.error}
            required
          >
            <option value="">{t('Select a category')}</option>
            {categories.data.map((category) => (
              <option key={category.id} value={category.name}>{t(category.name)}</option>
            ))}
          </Select>
          <Input
            label={t('Price')}
            type="number"
            min="0.01"
            step="0.01"
            value={values.price}
            onChange={(event) => setField('price', event.target.value)}
            required
          />
          <Input
            label={t('Preparation time (minutes)')}
            type="number"
            min="1"
            step="1"
            value={values.preparationTimeMinutes}
            onChange={(event) => setField('preparationTimeMinutes', event.target.value)}
            required
          />
        </div>
        {categories.error && (
          <div role="alert" className="flex items-center gap-3 text-sm text-danger">
            <span>{t(categories.error)}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void categories.refetch()}>
              {t('Try again')}
            </Button>
          </div>
        )}
        <label className="grid gap-2 text-sm font-semibold text-text-main">
          {t('Description')}
          <textarea
            className="min-h-24 rounded-lg border border-border-subtle bg-surface-white px-3 py-2 font-normal text-text-main"
            value={values.description}
            onChange={(event) => setField('description', event.target.value)}
            required
            maxLength={500}
          />
        </label>
        <Input
          label={t('Ingredients')}
          hint={t('Separate ingredients with commas.')}
          value={values.ingredients}
          onChange={(event) => setField('ingredients', event.target.value)}
          maxLength={500}
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Input
            label={t('Meal image')}
            hint={t('Image file up to 5 MB.')}
            type="file"
            accept="image/*"
            onChange={(event) => void selectImage(event)}
            error={imageError}
          />
          {values.image && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setField('image', null)}
              className="sm:mb-1"
            >
              {t('Remove image')}
            </Button>
          )}
        </div>
        {values.image && (
          <img
            src={values.image}
            alt={t('Meal image preview')}
            className="h-40 w-full rounded-lg border border-border-subtle object-cover sm:w-64"
          />
        )}
        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm text-text-main">
            <input
              type="checkbox"
              checked={values.isAvailable}
              onChange={(event) => setField('isAvailable', event.target.checked)}
            />
            {t('Available for ordering')}
          </label>
          <label className="flex items-center gap-2 text-sm text-text-main">
            <input
              type="checkbox"
              checked={values.isPopular}
              onChange={(event) => setField('isPopular', event.target.checked)}
            />
            {t('Mark as popular')}
          </label>
        </div>
        {formError && <p role="alert" className="text-sm text-danger">{t(formError)}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={busy} onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" loading={busy}>{t(meal ? 'Save changes' : 'Add meal')}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function RestaurantDashboardMealsTab({
  meals,
  busy,
  onSaveMeal,
  onDeleteMeal,
}: {
  meals: MenuItem[]
  busy: boolean
  onSaveMeal: (meal: MenuItem | null, changes: MealChanges) => Promise<boolean>
  onDeleteMeal: (meal: MenuItem) => Promise<boolean>
}) {
  const { t } = useLanguage()
  const [mealEditor, setMealEditor] = useState<MenuItem | null | undefined>(undefined)
  const [mealToDelete, setMealToDelete] = useState<MenuItem | null>(null)

  const deleteSelectedMeal = async () => {
    if (mealToDelete && await onDeleteMeal(mealToDelete)) setMealToDelete(null)
  }

  return (
    <>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-text-main">{t('Manage meals')}</h2>
            <p className="text-sm text-text-slate">{t('Add and update menu details, availability and images.')}</p>
          </div>
          <Button onClick={() => setMealEditor(null)}><Plus aria-hidden="true" size={17} />{t('Add meal')}</Button>
        </div>
        {meals.length === 0 ? (
          <EmptyState title={t('No meals yet')} description={t('Add your first meal to start building your menu.')} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {meals.map((meal) => (
              <article key={meal.id} className="overflow-hidden rounded-lg border border-border-subtle">
                {meal.image ? (
                  <img src={meal.image} alt={t(meal.name)} className="h-44 w-full bg-surface-cream object-cover" />
                ) : (
                  <div className="flex h-44 items-center justify-center bg-surface-cream text-text-slate">
                    <Utensils aria-hidden="true" size={32} />
                    <span className="sr-only">{t('No meal image')}</span>
                  </div>
                )}
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-text-main">{t(meal.name)}</h3>
                      <p className="text-sm text-text-slate">{t(meal.category)} · {meal.preparationTimeMinutes} {t('min')}</p>
                    </div>
                    <StatusPill tone={meal.isAvailable ? 'good' : 'bad'}>{t(meal.isAvailable ? 'Available' : 'Unavailable')}</StatusPill>
                  </div>
                  <p className="line-clamp-2 min-h-10 text-sm text-text-slate">{t(meal.description)}</p>
                  <div className="flex items-center justify-between border-t border-border-subtle pt-3">
                    <span className="font-semibold text-text-main">{formatCurrency(meal.price)}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" aria-label={t('Edit {name}', { name: meal.name })} onClick={() => setMealEditor(meal)}>
                        <Pencil aria-hidden="true" size={15} />{t('Edit')}
                      </Button>
                      <Button size="sm" variant="danger" aria-label={t('Delete {name}', { name: meal.name })} onClick={() => setMealToDelete(meal)}>
                        <Trash2 aria-hidden="true" size={15} />{t('Delete')}
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
      {mealEditor !== undefined && (
        <MealEditor
          meal={mealEditor}
          busy={busy}
          onClose={() => setMealEditor(undefined)}
          onSave={async (meal, changes) => {
            const saved = await onSaveMeal(meal, changes)
            if (saved) setMealEditor(undefined)
            return saved
          }}
        />
      )}
      <ConfirmDialog
        open={mealToDelete !== null}
        title={t('Delete this meal?')}
        message={t('This removes the meal from your menu.')}
        confirmLabel={t('Delete meal')}
        busy={busy}
        destructive
        onConfirm={() => void deleteSelectedMeal()}
        onClose={() => setMealToDelete(null)}
      />
    </>
  )
}
