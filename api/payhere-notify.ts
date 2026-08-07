// Vercel serverless function — PayHere payment notification (ITN) handler.
//
// PayHere confirms a payment by POSTing server-to-server to this `notify_url`.
// The customer's browser is NEVER trusted to report "paid": create_order()
// starts card orders as `unpaid`, and the ONLY thing that flips an order to
// `paid` is this handler, after it cryptographically verifies the request
// really came from PayHere.
//
// Tamper-proofing (per PayHere's ITN spec):
//   local_md5sig = UPPER( md5(
//     merchant_id + order_id + payhere_amount + payhere_currency +
//     status_code + UPPER( md5(merchant_secret) )
//   ) )
// The merchant secret lives only in the server env (PAYHERE_MERCHANT_SECRET),
// so a forged callback can't produce a matching signature. We then re-check the
// amount against the stored order total before marking it paid — a valid-but-
// altered amount is rejected inside mark_order_paid() (migration 027), which is
// callable by the service_role only.
//
// Node runtime (not edge): PayHere requires MD5, and Web Crypto (edge) has no MD5.
import crypto from 'node:crypto'

export const config = { runtime: 'nodejs' }

const md5 = (s: string) => crypto.createHash('md5').update(s).digest('hex')

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const merchantId = process.env.PAYHERE_MERCHANT_ID
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY

  if (!merchantId || !merchantSecret || !supabaseUrl || !serviceKey) {
    // Card payments not configured yet (bank transfer is the launch method).
    return json({ error: 'Payment notifications are not configured.' }, 503)
  }

  // ITN arrives as application/x-www-form-urlencoded.
  const body = new URLSearchParams(await req.text())
  const orderId = body.get('order_id') ?? ''
  const paymentId = body.get('payment_id') ?? ''
  const payhereAmount = body.get('payhere_amount') ?? ''
  const payhereCurrency = body.get('payhere_currency') ?? ''
  const statusCode = body.get('status_code') ?? ''
  const receivedSig = body.get('md5sig') ?? ''
  const receivedMerchant = body.get('merchant_id') ?? ''

  // Verify the signature before trusting ANY field.
  const localSig = md5(
    receivedMerchant +
      orderId +
      payhereAmount +
      payhereCurrency +
      statusCode +
      md5(merchantSecret).toUpperCase(),
  ).toUpperCase()

  if (receivedMerchant !== merchantId || localSig !== receivedSig.toUpperCase()) {
    return json({ error: 'Invalid signature' }, 401)
  }

  // status_code 2 = success. Anything else (0 pending, -1 cancelled, -2 failed,
  // -3 chargeback) is acknowledged but does NOT mark the order paid.
  if (statusCode !== '2') {
    return json({ ok: true, ignored: statusCode }, 200)
  }

  if (payhereCurrency !== 'LKR') {
    return json({ error: 'Unexpected currency' }, 400)
  }

  // Signature is valid and the payment succeeded — mark it paid server-side.
  // mark_order_paid() re-verifies the amount against the stored order total and
  // is service_role-only, so this is the sole way an order becomes `paid`.
  const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/mark_order_paid`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      p_order_id: orderId,
      p_payment_ref: paymentId,
      p_amount: Number(payhereAmount),
    }),
  })

  if (!rpcRes.ok) {
    const detail = await rpcRes.text()
    return json({ error: 'Could not confirm payment', detail }, 502)
  }

  return json({ ok: true }, 200)
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
