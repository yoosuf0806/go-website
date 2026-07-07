import { useMutation } from '@tanstack/react-query'
import { triggerPublish } from '../lib/publish'

// Fires the storefront rebuild (spec §8). Not tied to any query — it's a
// one-shot side effect; the UI shows a "publishing…" toast on success.
export function usePublish() {
  return useMutation<void, Error, void>({
    mutationFn: triggerPublish,
  })
}
