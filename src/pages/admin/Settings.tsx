import { useState } from 'react'
import { useAdminSettings, useUpdateSetting } from '../../hooks/useAdminSettings'
import { changePassword } from '../../lib/adminSettings'
import type { BannerSetting, FeaturesSetting, BusinessSetting } from '../../types/catalog'
import Toast from '../../components/ui/Toast'

// Admin Settings (spec §7): banner scheduler, feature toggles, business info,
// and admin password change. Each section seeds its own state from the loaded
// value (mounted only after load) so edits are local until saved. A "Publish"
// rebuild (Phase 9) is what pushes these into the storefront snapshot.
export default function Settings() {
  const { data, isLoading, isError, error } = useAdminSettings()
  const [toast, setToast] = useState<string | null>(null)

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Saved changes go live on the storefront after the next Publish.
      </p>

      {isLoading && <p className="mt-6 text-sm text-neutral-500">Loading…</p>}
      {isError && (
        <p className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to load settings: {error.message}
        </p>
      )}

      {data && (
        <div className="mt-6 flex flex-col gap-6">
          <BannerSection initial={data.banner} onSaved={() => setToast('Banner saved.')} />
          <FeaturesSection initial={data.features} onSaved={() => setToast('Features saved.')} />
          <BusinessSection initial={data.business} onSaved={() => setToast('Business info saved.')} />
          <PasswordSection onSaved={() => setToast('Password updated.')} />
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  )
}

function SaveButton({ pending, error }: { pending: boolean; error?: string | null }) {
  return (
    <div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}

/** datetime-local inputs want "YYYY-MM-DDTHH:mm"; strip seconds/zone from stored ISO. */
function toLocalInput(value: string | null): string {
  return value ? value.slice(0, 16) : ''
}

function BannerSection({ initial, onSaved }: { initial: BannerSetting; onSaved: () => void }) {
  const [banner, setBanner] = useState<BannerSetting>(initial)
  const update = useUpdateSetting()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    update.mutate({ key: 'banner', value: banner }, { onSuccess: onSaved })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Section title="Announcement banner">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={banner.enabled}
            onChange={(e) => setBanner({ ...banner, enabled: e.target.checked })}
          />
          Enabled
        </label>
        <input
          type="text"
          placeholder="Banner text"
          value={banner.text}
          onChange={(e) => setBanner({ ...banner, text: e.target.value })}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-3">
          <label className="text-sm">
            <span className="block text-neutral-600">Starts</span>
            <input
              type="datetime-local"
              value={toLocalInput(banner.starts_at)}
              onChange={(e) => setBanner({ ...banner, starts_at: e.target.value || null })}
              className="mt-1 rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="block text-neutral-600">Ends</span>
            <input
              type="datetime-local"
              value={toLocalInput(banner.ends_at)}
              onChange={(e) => setBanner({ ...banner, ends_at: e.target.value || null })}
              className="mt-1 rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </label>
        </div>
        <SaveButton pending={update.isPending} error={update.error?.message} />
      </Section>
    </form>
  )
}

function FeaturesSection({ initial, onSaved }: { initial: FeaturesSetting; onSaved: () => void }) {
  const [features, setFeatures] = useState<FeaturesSetting>(initial)
  const update = useUpdateSetting()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    update.mutate({ key: 'features', value: features }, { onSuccess: onSaved })
  }

  const toggles: { key: keyof FeaturesSetting; label: string }[] = [
    { key: 'corporate_section', label: 'Corporate section' },
    { key: 'wedding_section', label: 'Wedding section' },
    { key: 'reviews_section', label: 'Reviews section' },
  ]

  return (
    <form onSubmit={handleSubmit}>
      <Section title="Storefront sections">
        {toggles.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={features[key]}
              onChange={(e) => setFeatures({ ...features, [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
        <SaveButton pending={update.isPending} error={update.error?.message} />
      </Section>
    </form>
  )
}

function BusinessSection({ initial, onSaved }: { initial: BusinessSetting; onSaved: () => void }) {
  const [business, setBusiness] = useState<BusinessSetting>(initial)
  const update = useUpdateSetting()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    update.mutate({ key: 'business', value: business }, { onSuccess: onSaved })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Section title="Business">
        <label className="text-sm">
          <span className="block text-neutral-600">WhatsApp number</span>
          <input
            type="tel"
            placeholder="94771234567"
            value={business.whatsapp_number}
            onChange={(e) => setBusiness({ ...business, whatsapp_number: e.target.value })}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block text-neutral-600">Google Business URL</span>
          <input
            type="url"
            placeholder="https://g.page/..."
            value={business.google_business_url}
            onChange={(e) => setBusiness({ ...business, google_business_url: e.target.value })}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <SaveButton pending={update.isPending} error={update.error?.message} />
      </Section>
    </form>
  )
}

function PasswordSection({ onSaved }: { onSaved: () => void }) {
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setError(null)
    setPending(true)
    try {
      await changePassword(password)
      setPassword('')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Section title="Change password">
        <input
          type="password"
          placeholder="New password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
        <SaveButton pending={pending} error={error} />
      </Section>
    </form>
  )
}
