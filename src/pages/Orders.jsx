import React, { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { backendUrl } from '../App'
import { getOrderMeta } from '../utils/orderMeta'
import OrderCard from '../components/OrderCard'

const PAGE_SIZE = 50

const PERIODS = [
  { value: '', label: 'All time' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
]

const toInputDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** [from, to) in local time for the period containing `anchor` (YYYY-MM-DD). Weeks start Monday. */
const getRange = (period, anchor) => {
  if (!period || !anchor) return null
  const [y, m, d] = anchor.split('-').map(Number)
  if (!y || !m || !d) return null
  let start, end
  if (period === 'day') {
    start = new Date(y, m - 1, d); end = new Date(y, m - 1, d + 1)
  } else if (period === 'week') {
    const offset = (new Date(y, m - 1, d).getDay() + 6) % 7
    start = new Date(y, m - 1, d - offset); end = new Date(y, m - 1, d - offset + 7)
  } else if (period === 'month') {
    start = new Date(y, m - 1, 1); end = new Date(y, m, 1)
  } else {
    start = new Date(y, 0, 1); end = new Date(y + 1, 0, 1)
  }
  return { from: start.getTime(), to: end.getTime(), start, last: new Date(end.getTime() - 1) }
}

const fmt = (d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

const Orders = ({ token }) => {

  const [orders, setOrders] = useState([])
  const [meta, setMeta] = useState({ statuses: [], carriers: [] })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  // 'loading' | 'ready' | 'error' — previously a failed fetch rendered a
  // silently empty page, which is indistinguishable from "no orders".
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState('')
  const [period, setPeriod] = useState('')
  const [anchor, setAnchor] = useState(() => toInputDate(new Date()))
  const range = getRange(period, anchor)
  const from = range?.from
  const to = range?.to

  useEffect(() => { getOrderMeta().then(setMeta) }, [])

  const fetchOrders = useCallback(async (targetPage, append) => {
    if (!token) return
    setStatus('loading')
    try {
      const response = await axios.post(backendUrl + '/api/order/list',
        { page: targetPage, limit: PAGE_SIZE, status: filter || undefined, from, to },
        { headers: { token } })

      if (response.data.success) {
        // Sorted newest-first server-side now, so no client-side .reverse():
        // that only ever reversed insertion order, and would be wrong across pages.
        setOrders((prev) => (append ? [...prev, ...response.data.orders] : response.data.orders))
        setTotal(response.data.total)
        setPage(response.data.page)
        setStatus('ready')
      } else {
        setMessage(response.data.message)
        setStatus('error')
        toast.error(response.data.message)
      }
    } catch (error) {
      console.log(error)
      setMessage(error.message)
      setStatus('error')
      toast.error(error.message)
    }
  }, [token, filter, from, to])

  useEffect(() => { fetchOrders(1, false) }, [fetchOrders])

  /** Replace one order in place, so saving does not reset paging or scroll. */
  const patchOrder = (updated) =>
    setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)))

  const statusHandler = async (orderId, next) => {
    try {
      const response = await axios.post(backendUrl + '/api/order/status',
        { orderId, status: next }, { headers: { token } })

      if (response.data.success) {
        toast.success(response.data.emailSent
          ? `${response.data.message} — customer notified`
          : response.data.message)
        patchOrder(response.data.order)
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      // `error`, not `response` — the latter is scoped to the try block, so
      // referencing it here threw ReferenceError and showed the admin nothing.
      console.log(error)
      toast.error(error.message)
    }
  }

  const cancelHandler = async (orderId) => {
    if (!window.confirm('Cancel this order? Any pending bonus points from it will be voided and any redeemed points returned.')) return
    try {
      const response = await axios.post(backendUrl + '/api/order/cancel', { orderId }, { headers: { token } })
      if (response.data.success) {
        toast.success(response.data.message)
        patchOrder(response.data.order)
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  const refundHandler = async (orderId) => {
    if (!window.confirm('Refund this order? Any confirmed bonus points it earned will be clawed back and any redeemed points returned.')) return
    try {
      const response = await axios.post(backendUrl + '/api/order/refund', { orderId }, { headers: { token } })
      if (response.data.success) {
        toast.success(response.data.message)
        patchOrder(response.data.order)
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  const header = (
    <div className='flex flex-wrap items-center gap-3 mb-4'>
      <h3 className='font-medium text-gray-700'>Orders</h3>
      <span className='text-xs text-gray-500'>{orders.length} of {total}</span>
      <select
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        className='ml-auto p-2 text-sm border border-gray-300 rounded'
        aria-label='Filter by period'
      >
        {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
      {range && (
        <>
          <input
            type='date'
            value={anchor}
            onChange={(e) => e.target.value && setAnchor(e.target.value)}
            className='p-2 text-sm border border-gray-300 rounded'
            aria-label='Date within the selected period'
          />
          <span className='text-xs text-gray-500'>
            {period === 'day' ? fmt(range.start) : `${fmt(range.start)} – ${fmt(range.last)}`}
          </span>
        </>
      )}
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className='p-2 text-sm border border-gray-300 rounded'
        aria-label='Filter by status'
      >
        <option value=''>All statuses</option>
        {meta.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  )

  if (status === 'error' && orders.length === 0) {
    return (
      <div>
        {header}
        <div className='border-2 border-gray-200 rounded p-6'>
          <p className='font-medium text-gray-700 mb-1'>Could not load orders</p>
          <p className='text-sm text-gray-500 mb-4'>{message}</p>
          <button onClick={() => fetchOrders(1, false)}
            className='text-sm px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800'>
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (status === 'loading' && orders.length === 0) {
    return <div>{header}<p className='text-sm text-gray-500'>Loading orders…</p></div>
  }

  if (orders.length === 0) {
    return (
      <div>
        {header}
        <p className='text-sm text-gray-500'>
          {filter || range
            ? `No orders${filter ? ` with status “${filter}”` : ''}${range ? ' in this period' : ''}.`
            : 'No orders yet.'}
        </p>
      </div>
    )
  }

  return (
    <div>
      {header}
      <div>
        {orders.map((order) => (
          <OrderCard
            key={order._id}
            order={order}
            token={token}
            meta={meta}
            onStatusChange={statusHandler}
            onSaved={patchOrder}
            onCancel={cancelHandler}
            onRefund={refundHandler}
          />
        ))}
      </div>

      {orders.length < total && (
        <button
          onClick={() => fetchOrders(page + 1, true)}
          disabled={status === 'loading'}
          className='text-sm px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50'
        >
          {status === 'loading' ? 'Loading…' : `Load more (${total - orders.length} left)`}
        </button>
      )}
    </div>
  )
}

export default Orders
