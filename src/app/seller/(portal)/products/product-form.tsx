'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GripVertical, ImagePlus, Info, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button, Card, Input, Label, Select, Textarea } from '@/components/ui'
import { formatBDT } from '@/lib/format'

import type { FieldErrors } from '../../_lib/forms'
import type { BrandOption, CategoryOptionGroup, SellerProductEdit } from '../../_lib/data'
import { createProduct, updateProduct, type ProductInput } from './_actions'

/* -------------------------------------------------------------------------- */
/* Local (string-shaped) form state                                           */
/* -------------------------------------------------------------------------- */

/**
 * Every field is held as a STRING while the seller types — an <input type="number"> that is mid-way
 * through "12" is briefly "1", and a Number-typed state would fight the caret on every keystroke.
 * The strings are parsed once, at submit, and the Zod schema on the server is the only arbiter of
 * what a valid number is.
 */
interface ImageRow {
  key: string
  url: string
  alt: string
}

interface VariantRow {
  key: string
  size: string
  color: string
  price: string
  stock: string
}

const newKey = () => Math.random().toString(36).slice(2, 10)

const emptyImage = (): ImageRow => ({ key: newKey(), url: '', alt: '' })
const emptyVariant = (): VariantRow => ({
  key: newKey(),
  size: '',
  color: '',
  price: '',
  stock: '0',
})

/** '' -> null (the field is genuinely absent), '1200' -> 1200, 'abc' -> NaN (Zod will reject it). */
function toNullableNumber(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  return Number(trimmed)
}

function toNumber(value: string): number {
  const trimmed = value.trim()
  if (trimmed === '') return NaN
  return Number(trimmed)
}

export interface ProductFormProps {
  categories: CategoryOptionGroup[]
  brands: BrandOption[]
  /** Present = edit mode. */
  product?: SellerProductEdit
}

export function ProductForm({ categories, brands, product }: ProductFormProps) {
  const router = useRouter()
  const isEdit = product != null

  const [title, setTitle] = React.useState(product?.title ?? '')
  const [titleBn, setTitleBn] = React.useState(product?.titleBn ?? '')
  const [description, setDescription] = React.useState(product?.description ?? '')
  const [categoryId, setCategoryId] = React.useState(product?.categoryId ?? '')
  const [brandId, setBrandId] = React.useState(product?.brandId ?? '')
  const [price, setPrice] = React.useState(product ? String(product.price) : '')
  const [discountPrice, setDiscountPrice] = React.useState(
    product?.discountPrice != null ? String(product.discountPrice) : '',
  )
  const [stock, setStock] = React.useState(product ? String(product.stock) : '0')
  const [sku, setSku] = React.useState(product?.sku ?? '')

  const [images, setImages] = React.useState<ImageRow[]>(() =>
    product && product.images.length > 0
      ? product.images.map((image) => ({
          key: newKey(),
          url: image.url,
          alt: image.alt ?? '',
        }))
      : [emptyImage()],
  )

  const [variants, setVariants] = React.useState<VariantRow[]>(() =>
    product
      ? product.variants.map((variant) => ({
          key: newKey(),
          size: variant.size ?? '',
          color: variant.color ?? '',
          price: variant.price != null ? String(variant.price) : '',
          stock: String(variant.stock),
        }))
      : [],
  )

  const [errors, setErrors] = React.useState<FieldErrors>({})
  const [pending, startTransition] = React.useTransition()

  const priceValue = Number(price)
  const discountValue = Number(discountPrice)
  const saving =
    Number.isFinite(priceValue) &&
    Number.isFinite(discountValue) &&
    discountPrice.trim() !== '' &&
    discountValue > 0 &&
    discountValue < priceValue
      ? Math.round(((priceValue - discountValue) / priceValue) * 100)
      : 0

  function updateImage(key: string, patch: Partial<ImageRow>) {
    setImages((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function updateVariant(key: string, patch: Partial<VariantRow>) {
    setVariants((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const input: ProductInput = {
      title,
      titleBn,
      description,
      categoryId,
      brandId,
      price: toNumber(price),
      discountPrice: toNullableNumber(discountPrice),
      stock: toNumber(stock),
      sku,
      images: images.map((image) => ({ url: image.url, alt: image.alt })),
      variants: variants.map((variant) => ({
        size: variant.size,
        color: variant.color,
        price: toNullableNumber(variant.price),
        stock: toNumber(variant.stock),
      })),
    }

    startTransition(async () => {
      const result = isEdit ? await updateProduct(product.id, input) : await createProduct(input)

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {})
        toast.error(result.error)
        return
      }

      setErrors({})
      toast.success(
        isEdit
          ? 'Saved. Your changes go back to the review queue before they reach shoppers.'
          : 'Product created. It goes live once an admin approves it.',
      )
      router.push('/seller/products')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Card className="flex items-start gap-3 border-info-soft bg-info-soft p-4">
        <Info className="size-5 shrink-0 text-info" aria-hidden="true" />
        <p className="text-sm text-ink">
          <span className="font-semibold">Every listing is reviewed.</span> A new product — and any
          edit to a live one — goes back to <span className="font-semibold">Awaiting review</span>{' '}
          and only appears on the storefront once an admin approves it. Usually within a working day.
        </p>
      </Card>

      {/* ---------------------------------------------------------------- Basics */}
      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Product details</h2>
        <p className="mt-0.5 text-xs text-ink-subtle">
          Write the title the way a shopper would search for it.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="title" required>
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Cotton Embroidered Salwar Kameez — 3 Piece"
              maxLength={140}
              error={errors.title}
              autoComplete="off"
            />
          </div>

          <div>
            <Label htmlFor="titleBn">Title in Bangla</Label>
            <Input
              id="titleBn"
              value={titleBn}
              onChange={(event) => setTitleBn(event.target.value)}
              placeholder="কটন এমব্রয়ডারি সালোয়ার কামিজ"
              maxLength={140}
              error={errors.titleBn}
              autoComplete="off"
            />
            <p className="mt-1.5 text-xs text-ink-subtle">
              Optional, but a Bangla title is searchable and converts better outside Dhaka.
            </p>
          </div>

          <div>
            <Label htmlFor="description" required>
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={6}
              maxLength={5000}
              placeholder="Fabric, fit, wash care, what is in the box…"
              error={errors.description}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="categoryId" required>
                Category
              </Label>
              <Select
                id="categoryId"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                error={errors.categoryId}
              >
                <option value="">Choose a category…</option>
                {categories.map((parent) =>
                  parent.children.length > 0 ? (
                    <optgroup key={parent.id} label={parent.name}>
                      {parent.children.map((child) => (
                        <option key={child.id} value={child.id}>
                          {child.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : (
                    <option key={parent.id} value={parent.id}>
                      {parent.name}
                    </option>
                  ),
                )}
              </Select>
            </div>

            <div>
              <Label htmlFor="brandId">Brand</Label>
              <Select
                id="brandId"
                value={brandId}
                onChange={(event) => setBrandId(event.target.value)}
                error={errors.brandId}
              >
                <option value="">No brand / unbranded</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* ---------------------------------------------------------------- Pricing */}
      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Price &amp; stock</h2>
        <p className="mt-0.5 text-xs text-ink-subtle">
          Whole Taka only. Leave the discount empty to sell at the full price.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="price" required>
              Price (৳)
            </Label>
            <Input
              id="price"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="1200"
              error={errors.price}
            />
          </div>

          <div>
            <Label htmlFor="discountPrice">Discount price (৳)</Label>
            <Input
              id="discountPrice"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={discountPrice}
              onChange={(event) => setDiscountPrice(event.target.value)}
              placeholder="999"
              error={errors.discountPrice}
            />
            {saving > 0 ? (
              <p className="mt-1.5 text-xs font-medium text-success">
                Shoppers see {formatBDT(discountValue)} with a {saving}% OFF badge.
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-ink-subtle">
                Must be lower than the price — that is the number the shopper actually pays.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="stock" required>
              Stock
            </Label>
            <Input
              id="stock"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={stock}
              onChange={(event) => setStock(event.target.value)}
              error={errors.stock}
            />
            <p className="mt-1.5 text-xs text-ink-subtle">
              At 0 the listing stays visible but shows “Out of stock”.
            </p>
          </div>

          <div>
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              placeholder="SLK-3PC-M-MRN"
              maxLength={60}
              error={errors.sku}
              autoComplete="off"
            />
          </div>
        </div>
      </Card>

      {/* ---------------------------------------------------------------- Images */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Images</h2>
            <p className="mt-0.5 text-xs text-ink-subtle">
              The first URL is the one shoppers see on the product card.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setImages((rows) => [...rows, emptyImage()])}
            disabled={images.length >= 8}
          >
            <Plus aria-hidden="true" />
            Add
          </Button>
        </div>

        <Card className="mt-3 flex items-start gap-3 bg-surface-muted p-3">
          <ImagePlus className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
          <p className="text-xs text-ink-muted">
            <span className="font-semibold text-ink">File upload is not live yet.</span> It needs
            object storage (S3 / Cloudflare R2), which this build does not have — so rather than
            fake a drag-and-drop box that quietly drops your photos, we take an image URL. Paste a
            direct link ending in .jpg / .png / .webp.
          </p>
        </Card>

        {errors.images ? <p className="mt-3 text-xs text-danger">{errors.images}</p> : null}

        <ul className="mt-3 space-y-3">
          {images.map((image, index) => (
            <li key={image.key} className="rounded-card border border-line p-3">
              <div className="flex items-center justify-between gap-2 pb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                  <GripVertical className="size-3.5 text-ink-subtle" aria-hidden="true" />
                  Image {index + 1}
                  {index === 0 ? (
                    <span className="ml-1 rounded-full bg-brand-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-brand-700">
                      Main
                    </span>
                  ) : null}
                </span>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove image ${index + 1}`}
                  onClick={() => setImages((rows) => rows.filter((row) => row.key !== image.key))}
                  disabled={images.length === 1}
                  className="text-danger hover:bg-danger-soft"
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                <Input
                  value={image.url}
                  onChange={(event) => updateImage(image.key, { url: event.target.value })}
                  placeholder="https://images.unsplash.com/photo-…"
                  inputMode="url"
                  autoComplete="off"
                  aria-label={`Image ${index + 1} URL`}
                  error={errors[`images.${index}.url`]}
                />
                <Input
                  value={image.alt}
                  onChange={(event) => updateImage(image.key, { alt: event.target.value })}
                  placeholder="Alt text"
                  maxLength={120}
                  autoComplete="off"
                  aria-label={`Image ${index + 1} alt text`}
                  error={errors[`images.${index}.alt`]}
                />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* ---------------------------------------------------------------- Variants */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Variants</h2>
            <p className="mt-0.5 text-xs text-ink-subtle">
              Sizes and colours. Skip this entirely if the product has only one form.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVariants((rows) => [...rows, emptyVariant()])}
            disabled={variants.length >= 20}
          >
            <Plus aria-hidden="true" />
            Add
          </Button>
        </div>

        {variants.length === 0 ? (
          <p className="mt-4 rounded-card border border-dashed border-line px-4 py-6 text-center text-xs text-ink-subtle">
            No variants. The product is sold at one price, from the single stock count above.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {variants.map((variant, index) => (
              <li key={variant.key} className="rounded-card border border-line p-3">
                <div className="flex items-center justify-between gap-2 pb-2">
                  <span className="text-xs font-semibold text-ink-muted">Variant {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove variant ${index + 1}`}
                    onClick={() =>
                      setVariants((rows) => rows.filter((row) => row.key !== variant.key))
                    }
                    className="text-danger hover:bg-danger-soft"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Input
                    value={variant.size}
                    onChange={(event) => updateVariant(variant.key, { size: event.target.value })}
                    placeholder="Size — M"
                    maxLength={40}
                    autoComplete="off"
                    aria-label={`Variant ${index + 1} size`}
                    error={errors[`variants.${index}.size`]}
                  />
                  <Input
                    value={variant.color}
                    onChange={(event) => updateVariant(variant.key, { color: event.target.value })}
                    placeholder="Colour — Maroon"
                    maxLength={40}
                    autoComplete="off"
                    aria-label={`Variant ${index + 1} colour`}
                    error={errors[`variants.${index}.color`]}
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={variant.price}
                    onChange={(event) => updateVariant(variant.key, { price: event.target.value })}
                    placeholder="Price ৳ (optional)"
                    aria-label={`Variant ${index + 1} price`}
                    error={errors[`variants.${index}.price`]}
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={variant.stock}
                    onChange={(event) => updateVariant(variant.key, { stock: event.target.value })}
                    placeholder="Stock"
                    aria-label={`Variant ${index + 1} stock`}
                    error={errors[`variants.${index}.stock`]}
                  />
                </div>

                <p className="mt-2 text-xs text-ink-subtle">
                  Leave the price empty and this variant sells at the product price.
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ---------------------------------------------------------------- Submit */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link
          href="/seller/products"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-line px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-sunken focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          Cancel
        </Link>

        <Button type="submit" loading={pending} className="sm:min-w-44">
          {isEdit ? 'Save changes' : 'Create product'}
        </Button>
      </div>
    </form>
  )
}
