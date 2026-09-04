// Free OS notifications for the admin PWA, no push server required.
//
// The admin app subscribes to Supabase Realtime (see useOrderNotifications) and
// raises a local notification through the service worker when a new order lands.
// This works while the installed app is open or backgrounded (its page/SW still
// alive). Delivery when the app is fully closed would need Web Push — a VAPID
// sender (e.g. a Supabase Edge Function on an orders webhook); the service
// worker's `push` handler is already in place for that upgrade. This module is
// the zero-infra tier.

export type NotifyPermission = 'default' | 'granted' | 'denied' | 'unsupported'

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function currentPermission(): NotifyPermission {
  if (!notificationsSupported()) return 'unsupported'
  return Notification.permission as NotifyPermission
}

export async function requestPermission(): Promise<NotifyPermission> {
  if (!notificationsSupported()) return 'unsupported'
  try {
    return (await Notification.requestPermission()) as NotifyPermission
  } catch {
    return currentPermission()
  }
}

// Prefer the service-worker registration: its notifications outlive the page and
// route through the SW's `notificationclick` handler (which focuses/opens the
// orders screen). Fall back to a plain Notification when there's no SW.
export async function showNotification(title: string, options: NotificationOptions): Promise<void> {
  if (currentPermission() !== 'granted') return
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(title, options)
      return
    }
  } catch {
    // fall through to the plain Notification path
  }
  try {
    new Notification(title, options)
  } catch {
    // Some browsers only allow SW notifications; nothing more we can do.
  }
}
