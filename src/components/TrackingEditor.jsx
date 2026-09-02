import React, { useMemo, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { backendUrl } from '../App'

const ACCENT = '#C586A5'

/** <input type="date"> speaks 'YYYY-MM-DD'; the order stores epoch ms. */
const toDateInput = (ms) => (ms ? new Date(ms).toISOString().slice(0, 10) : '')
// Parsed as UTC midnight. An estimated delivery is a date, not a moment, so
// the exact instant does not matter — only that it round-trips unchanged.
const fromDateInput = (value) => (value ? new Date(`${value}T00:00:00Z`).getTime() : '')

/**
 * Inline panel for recording the package on one order.
 *
 * Inline rather than a modal: this app has no dialog primitive or focus trap
 * (those live only in the storefront), and the admin needs to read the
 * shipping address on the card while typing the tracking number.
 */
const TrackingEditor = ({ order, token, meta, onSaved }) => {
    const tracking = order.tracking || {}

    const initial = useMemo(() => ({
        carrierId: tracking.carrierId || '',
        trackingNumber: tracking.number || '',
        status: order.status,
        estimatedDelivery: toDateInput(tracking.estimatedDelivery),
        note: tracking.note || '',
    }), [tracking.carrierId, tracking.number, tracking.estimatedDelivery, tracking.note, order.status])

    const [form, setForm] = useState(initial)
    const [saving, setSaving] = useState(false)

    const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

    const isDirty = Object.keys(initial).some((k) => form[k] !== initial[k])
    const canSave = Boolean(form.carrierId) && form.trackingNumber.trim().length >= 5 && isDirty && !saving

    const saveTracking = async () => {
        setSaving(true)
        try {
            const response = await axios.post(backendUrl + '/api/order/tracking', {
                orderId: order._id,
                carrierId: form.carrierId,
                trackingNumber: form.trackingNumber,
                status: form.status,
                estimatedDelivery: fromDateInput(form.estimatedDelivery),
                note: form.note,
            }, { headers: { token } })

            if (response.data.success) {
                toast.success(response.data.emailSent
                    ? 'Tracking saved — customer notified'
                    : response.data.message)
                onSaved(response.data.order)
            } else {
                toast.error(response.data.message)
            }
        } catch (error) {
            // Note `error`, not `response`: `response` is block-scoped to the
            // try, so referencing it here threw a ReferenceError that swallowed
            // the real failure and showed the admin nothing at all.
            console.log(error)
            toast.error(error.message)
        } finally {
            setSaving(false)
        }
    }

    const clearTracking = async () => {
        if (!window.confirm('Remove the tracking number from this order? The shipped/delivered dates are kept.')) return
        setSaving(true)
        try {
            const response = await axios.post(backendUrl + '/api/order/tracking/clear',
                { orderId: order._id }, { headers: { token } })
            if (response.data.success) {
                toast.success(response.data.message)
                onSaved(response.data.order)
            } else {
                toast.error(response.data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        } finally {
            setSaving(false)
        }
    }

    const label = 'block text-xs uppercase tracking-wide text-gray-500 mb-1'
    const field = 'w-full px-3 py-2 border border-gray-300 rounded text-sm'

    return (
        <div className='mt-4 pt-4 border-t border-gray-200'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <div>
                    <label className={label} htmlFor={`carrier-${order._id}`}>Carrier</label>
                    <select id={`carrier-${order._id}`} className={field} value={form.carrierId} onChange={set('carrierId')}>
                        <option value=''>— select carrier —</option>
                        {meta.carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {meta.carriers.length === 0 && (
                        <p className='mt-1 text-xs text-red-600'>Carrier list unavailable — reload the page.</p>
                    )}
                </div>

                <div>
                    <label className={label} htmlFor={`number-${order._id}`}>Tracking number</label>
                    <input
                        id={`number-${order._id}`} className={`${field} font-mono`} type='text'
                        value={form.trackingNumber} onChange={set('trackingNumber')}
                        placeholder='99.34.123456.12345675'
                        autoComplete='off' spellCheck={false}
                    />
                </div>

                <div>
                    <label className={label} htmlFor={`status-${order._id}`}>Status</label>
                    <select id={`status-${order._id}`} className={field} value={form.status} onChange={set('status')}>
                        {meta.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div>
                    <label className={label} htmlFor={`eta-${order._id}`}>Estimated delivery <span className='normal-case text-gray-400'>(optional)</span></label>
                    <input id={`eta-${order._id}`} className={field} type='date'
                        value={form.estimatedDelivery} onChange={set('estimatedDelivery')} />
                </div>

                <div className='sm:col-span-2'>
                    <label className={label} htmlFor={`note-${order._id}`}>
                        Note to customer <span className='normal-case text-gray-400'>(optional, shown on their order page)</span>
                    </label>
                    <input id={`note-${order._id}`} className={field} type='text' maxLength={300}
                        value={form.note} onChange={set('note')}
                        placeholder='e.g. Left at the post office for pickup' />
                </div>
            </div>

            <div className='flex flex-wrap items-center gap-3 mt-4'>
                <button
                    onClick={saveTracking} disabled={!canSave}
                    className='text-sm px-4 py-2 rounded text-white disabled:opacity-40 disabled:cursor-not-allowed'
                    style={{ backgroundColor: ACCENT }}
                >
                    {saving ? 'Saving…' : 'Save tracking'}
                </button>

                {tracking.number && (
                    <button onClick={clearTracking} disabled={saving}
                        className='text-sm px-3 py-2 text-red-600 hover:underline disabled:opacity-40'>
                        Clear tracking
                    </button>
                )}
            </div>

            {tracking.number && (
                <p className='mt-3 text-xs text-gray-500'>
                    {tracking.url ? (
                        <>
                            Customer link:{' '}
                            {/* Rendered so the admin can confirm the carrier deep link
                                resolves before a customer ever follows it. */}
                            <a href={tracking.url} target='_blank' rel='noopener noreferrer'
                                className='underline break-all' style={{ color: ACCENT }}>
                                {tracking.carrierName}: {tracking.number}
                            </a>
                        </>
                    ) : (
                        <>
                            {tracking.carrierName}: <span className='font-mono'>{tracking.number}</span>
                            {' '}— this carrier has no online tracking page, so the customer sees the number only.
                        </>
                    )}
                </p>
            )}
        </div>
    )
}

export default TrackingEditor
