import React, { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { backendUrl } from '../App'
import { getOrderMeta } from '../utils/orderMeta'
import OrderCard from '../components/OrderCard'

const PAGE_SIZE = 50

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

  useEffect(() => { getOrderMeta().then(setMeta) }, [])

  const fetchOrders = useCallback(async (targetPage, append) => {
    if (!token) return
    setStatus('loading')
    try {
      const response = await axios.post(backendUrl + '/api/order/list',
        { page: targetPage, limit: PAGE_SIZE, status: filter || undefined },
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
  }, [token, filter])

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
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className='ml-auto p-2 text-sm border border-gray-300 rounded'
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
          {filter ? `No orders with status “${filter}”.` : 'No orders yet.'}
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
