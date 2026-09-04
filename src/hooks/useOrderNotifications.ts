import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { formatLKR } from '../lib/format'
import {
  currentPermission,
  notificationsSupported,
  requestPermission,
  showNotification,
  type NotifyPermission,
} from '../lib/notifications'

const PREF_KEY = 'go-admin-order-notifications'

function readPref(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === '1'
  } catch {
    return false
  }
}

function writePref(on: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, on ? '1' : '0')
  } catch {
    // private mode / storage disabled — the toggle just won't persist
  }
}

interface NewOrderRow {
  order_no?: number
  customer_name?: string
  total?: number
}

/**
 * New-order notifications for the admin. When enabled (and permission granted),
 * subscribes to Supabase Realtime INSERTs on `orders`, raises an OS
 * notification, and refreshes the orders cache so the in-app bell badge updates
 * live. Preference is remembered per device in localStorage.
 */
export function useOrderNotifications() {
  const qc = useQueryClient()
  const [permission, setPermission] = useState<NotifyPermission>(() => currentPermission())
  const [enabled, setEnabled] = useState<boolean>(() => readPref())

  const active = enabled && permission === 'granted'

  useEffect(() => {
    if (!active) return
    const channel = supabase
      .channel('admin-new-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const o = payload.new as NewOrderRow
          // Keep the list + dashboard fresh even if the tab was idle.
          qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
          qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
          void showNotification(`New order #${o.order_no ?? ''}`.trim(), {
            body: `${o.customer_name ?? 'Customer'} · ${formatLKR(Number(o.total ?? 0))}`,
            tag: `order-${o.order_no ?? Date.now()}`,
            icon: '/icons/admin-192.png',
            badge: '/icons/admin-192.png',
            data: { url: '/admin/orders' },
          })
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [active, qc])

  const toggle = useCallback(async () => {
    if (!notificationsSupported()) return
    if (enabled) {
      setEnabled(false)
      writePref(false)
      return
    }
    let perm = currentPermission()
    if (perm === 'default') perm = await requestPermission()
    setPermission(perm)
    if (perm === 'granted') {
      setEnabled(true)
      writePref(true)
    }
  }, [enabled])

  return {
    supported: notificationsSupported(),
    permission,
    enabled,
    active,
    toggle,
  }
}
