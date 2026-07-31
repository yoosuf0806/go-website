import { create } from 'zustand'

// Cart-drawer open/close is UI state, not persisted cart data — kept
// separate from stores/cart.ts (the items store) so any page can trigger
// "View cart" (e.g. Shop's sticky bar) without threading a prop down from
// StorefrontLayout, which owns <CartDrawer>.
interface CartUIState {
  open: boolean
  setOpen: (open: boolean) => void
}

export const useCartUI = create<CartUIState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))
