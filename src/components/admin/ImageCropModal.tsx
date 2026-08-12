import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cropToFile, type CropRect } from '../../lib/cropImage'

// Crop / preview dialog for admin image uploads. The picked file is shown behind
// a fixed crop FRAME whose shape is the real display area for the slot the image
// is going into (product tile, occasion card, hero, …). Whatever sits inside the
// frame is exactly what gets saved — so the admin can see, before uploading,
// which part of the photo will actually be visible.
//
// The image pans (drag) and zooms (slider / wheel) behind the frame, a
// rule-of-thirds grid overlays it, and the aspect can be switched between
// presets (including a social / WhatsApp share ratio) to check the same photo
// against other placements. "Use image" returns the cropped File; the caller
// then runs it through the normal resize + upload path.

export interface AspectPreset {
  label: string
  /** width / height */
  ratio: number
}

const COMMON_PRESETS: AspectPreset[] = [
  { label: 'Square 1:1', ratio: 1 },
  { label: 'Landscape 16:9', ratio: 16 / 9 },
  { label: 'Portrait 4:5', ratio: 4 / 5 },
  { label: 'Social / WhatsApp 1.91:1', ratio: 1.91 },
]

// Longest edge of the on-screen crop stage. The frame is derived from this and
// the chosen aspect, so a wide banner and a tall portrait both stay on screen.
const STAGE_LONG = 440
const MIN_ZOOM = 1
const MAX_ZOOM = 5

interface Point {
  x: number
  y: number
}

export default function ImageCropModal({
  file,
  aspect,
  aspectLabel = 'This slot',
  onCancel,
  onConfirm,
}: {
  file: File
  /** width / height of the slot the image will be shown in */
  aspect: number
  aspectLabel?: string
  onCancel: () => void
  onConfirm: (cropped: File) => void
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [ratio, setRatio] = useState(aspect)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [busy, setBusy] = useState(false)

  const drag = useRef<{ start: Point; origin: Point } | null>(null)

  // Load the picked file into an <img> so we know its natural size and can draw
  // it to a canvas on confirm. The object URL is revoked on cleanup.
  useEffect(() => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => setImage(img)
    img.onerror = () => setLoadError('This image could not be loaded.')
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Aspect presets: the slot's own ratio first, then the common ones (deduped).
  const presets = useMemo<AspectPreset[]>(() => {
    const list: AspectPreset[] = [{ label: aspectLabel, ratio: aspect }]
    for (const p of COMMON_PRESETS) {
      if (Math.abs(p.ratio - aspect) > 0.01) list.push(p)
    }
    return list
  }, [aspect, aspectLabel])

  // On-screen frame size for the current ratio, longest edge = STAGE_LONG.
  const frame = useMemo(() => {
    return ratio >= 1
      ? { w: STAGE_LONG, h: Math.round(STAGE_LONG / ratio) }
      : { w: Math.round(STAGE_LONG * ratio), h: STAGE_LONG }
  }, [ratio])

  // "Cover" scale: the smallest scale at which the image fully covers the frame.
  // Everything (display size, pan limits, crop maths) is derived from this.
  const baseScale = useMemo(() => {
    if (!image) return 1
    return Math.max(frame.w / image.naturalWidth, frame.h / image.naturalHeight)
  }, [image, frame])

  const disp = useMemo(() => {
    if (!image) return { w: frame.w, h: frame.h }
    const s = baseScale * zoom
    return { w: image.naturalWidth * s, h: image.naturalHeight * s }
  }, [image, baseScale, zoom, frame])

  // Keep the frame fully covered: clamp the pan so no empty gap can appear.
  const clamp = useCallback(
    (o: Point): Point => {
      const maxX = Math.max(0, (disp.w - frame.w) / 2)
      const maxY = Math.max(0, (disp.h - frame.h) / 2)
      return {
        x: Math.min(maxX, Math.max(-maxX, o.x)),
        y: Math.min(maxY, Math.max(-maxY, o.y)),
      }
    },
    [disp, frame],
  )

  // Re-clamp / reset the pan whenever the framing changes.
  useEffect(() => {
    setOffset((o) => clamp(o))
  }, [clamp])

  function chooseRatio(r: number) {
    setRatio(r)
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { start: { x: e.clientX, y: e.clientY }, origin: offset }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return
    const dx = e.clientX - drag.current.start.x
    const dy = e.clientY - drag.current.start.y
    setOffset(clamp({ x: drag.current.origin.x + dx, y: drag.current.origin.y + dy }))
  }
  function onPointerUp() {
    drag.current = null
  }
  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)))
    setZoom(next)
  }

  async function confirm() {
    if (!image) return
    setBusy(true)
    setLoadError(null)
    try {
      const scale = baseScale * zoom
      const imgLeft = frame.w / 2 + offset.x - disp.w / 2
      const imgTop = frame.h / 2 + offset.y - disp.h / 2
      const raw: CropRect = {
        x: -imgLeft / scale,
        y: -imgTop / scale,
        width: frame.w / scale,
        height: frame.h / scale,
      }
      // Guard against sub-pixel overflow past the image edges.
      const crop: CropRect = {
        x: Math.max(0, Math.min(raw.x, image.naturalWidth)),
        y: Math.max(0, Math.min(raw.y, image.naturalHeight)),
        width: Math.min(raw.width, image.naturalWidth - Math.max(0, raw.x)),
        height: Math.min(raw.height, image.naturalHeight - Math.max(0, raw.y)),
      }
      onConfirm(await cropToFile(image, crop, file.name))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not crop image')
      setBusy(false)
    }
  }

  const imgLeft = frame.w / 2 + offset.x - disp.w / 2
  const imgTop = frame.h / 2 + offset.y - disp.h / 2

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-full w-full max-w-lg flex-col overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-navy">Position &amp; crop image</h2>
        <p className="mt-1 text-xs text-neutral-500">
          The frame shows exactly what will be visible once uploaded. Drag to
          reposition, use the slider to zoom, and switch the shape to check other
          placements.
        </p>

        {/* Aspect presets */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {presets.map((p) => {
            const active = Math.abs(p.ratio - ratio) < 0.01
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => chooseRatio(p.ratio)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? 'border-navy bg-navy text-white'
                    : 'border-neutral-300 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        {/* Crop stage */}
        <div className="mt-4 flex justify-center">
          {loadError ? (
            <p className="py-10 text-sm text-red-600">{loadError}</p>
          ) : !image ? (
            <p className="py-10 text-sm text-neutral-500">Loading image…</p>
          ) : (
            <div
              className="relative touch-none overflow-hidden rounded-lg bg-neutral-900 select-none"
              style={{ width: frame.w, height: frame.h, cursor: 'grab' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={onWheel}
            >
              <img
                src={image.src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute max-w-none"
                style={{ left: imgLeft, top: imgTop, width: disp.w, height: disp.h }}
              />
              {/* Rule-of-thirds grid */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-y-0 left-1/3 w-px bg-white/40" />
                <div className="absolute inset-y-0 left-2/3 w-px bg-white/40" />
                <div className="absolute inset-x-0 top-1/3 h-px bg-white/40" />
                <div className="absolute inset-x-0 top-2/3 h-px bg-white/40" />
                <div className="absolute inset-0 ring-2 ring-inset ring-white/80" />
              </div>
            </div>
          )}
        </div>

        {/* Zoom */}
        {image && !loadError && (
          <label className="mt-4 flex items-center gap-3 text-xs text-neutral-600">
            <span className="font-medium">Zoom</span>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-navy"
            />
          </label>
        )}

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy || !image || !!loadError}
            className="rounded-full bg-navy px-5 py-2 text-sm font-bold text-white hover:bg-navy/90 disabled:opacity-50"
          >
            {busy ? 'Processing…' : 'Use image'}
          </button>
        </div>
      </div>
    </div>
  )
}
