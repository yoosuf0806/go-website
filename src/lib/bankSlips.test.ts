import { describe, it, expect } from 'vitest'
import { validateSlipFile } from './bankSlips'

// Minimal File stub — only the fields validateSlipFile reads (type, size).
function fakeFile(type: string, bytes: number): File {
  return { type, size: bytes, name: `slip.${type.split('/')[1] ?? 'bin'}` } as File
}

describe('validateSlipFile (private bank-slip upload guard)', () => {
  it('accepts a JPEG under 5 MB', () => {
    expect(validateSlipFile(fakeFile('image/jpeg', 1_000_000))).toBeNull()
  })

  it('accepts PNG and WebP', () => {
    expect(validateSlipFile(fakeFile('image/png', 500_000))).toBeNull()
    expect(validateSlipFile(fakeFile('image/webp', 500_000))).toBeNull()
  })

  it('rejects a PDF (wrong type)', () => {
    expect(validateSlipFile(fakeFile('application/pdf', 100_000))).toMatch(/JPG|PNG|WebP/)
  })

  it('rejects a file over 5 MB', () => {
    expect(validateSlipFile(fakeFile('image/jpeg', 6 * 1024 * 1024))).toMatch(/5 MB/)
  })
})
