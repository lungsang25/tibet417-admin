import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { backendUrl, currency } from '../App'

/**
 * Admin page for the SALE: pick the products, pick a start time, and the
 * storefront steps the discount up by itself — the percentages and 24h steps
 * come from the backend (constants/saleConstants.js), so nothing here can
 * disagree with what customers are charged.
 *
 * Loads the current configuration once (GET /api/sale/admin) alongside the
 * product list. "Start sale" and "Start now" both switch the sale on and
 * restart the timetable; "End sale" is the only way to switch it off.
 */

// Datetime-local inputs work in the admin's own time zone and have no zone in
// their value, so convert through the local Date fields rather than toISOString.
const pad = (n) => String(n).padStart(2, '0')
const toInputValue = (ms) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const formatTime = (ms) => new Date(ms).toLocaleString()

// Display-only preview of each step's price (the backend does the real rounding).
const stepPrice = (price, percentOff) => (Math.round((Math.round(price * 100) * (100 - percentOff)) / 100) / 100).toFixed(2)

const StatusBanner = ({ config, status }) => {
  if (status.active) {
    return (
      <div className='rounded border-2 border-green-300 bg-green-50 p-4'>
        <p className='font-medium text-green-800'>
          Live — step {status.stageIndex + 1} of {status.stageCount}: {status.percentOff}% off
        </p>
        <p className='text-sm text-green-800/80 mt-0.5'>
          {status.nextChangeAt !== null
            ? `Drops to ${status.nextPercentOff}% off on ${formatTime(status.nextChangeAt)}.`
            : 'Final step — stays at this price until you end the sale.'}
        </p>
        <p className='text-xs text-green-800/70 mt-1'>Started {formatTime(status.startAt)} · {status.productIds.length} products</p>
      </div>
    )
  }
  if (config.active) {
    return (
      <div className='rounded border-2 border-yellow-300 bg-yellow-50 p-4'>
        <p className='font-medium text-yellow-800'>Scheduled — starts {formatTime(config.startAt)}</p>
        <p className='text-sm text-yellow-800/80 mt-0.5'>Prices are unchanged until then.</p>
      </div>
    )
  }
  return (
    <div className='rounded border-2 border-gray-200 bg-white p-4'>
      <p className='font-medium text-gray-700'>No sale running</p>
      <p className='text-sm text-gray-500 mt-0.5'>Choose products and a start time below.</p>
    </div>
  )
}

const Sale = ({ token }) => {
  const [loadState, setLoadState] = useState('loading')
  const [message, setMessage] = useState('')
  const [products, setProducts] = useState([])
  const [config, setConfig] = useState(null)
  const [status, setStatus] = useState(null)
  const [stages, setStages] = useState([])
  const [stageMs, setStageMs] = useState(0)

  const [selected, setSelected] = useState(() => new Set())
  const [startInput, setStartInput] = useState('')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const applyServerState = (data) => {
    setConfig(data.config)
    setStatus(data.status)
    setStages(data.stages)
    setStageMs(data.stageMs)
  }

  const load = async () => {
    setLoadState('loading')
    try {
      const [saleRes, productRes] = await Promise.all([
        axios.get(`${backendUrl}/api/sale/admin`, { headers: { token } }),
        axios.get(`${backendUrl}/api/product/list`),
      ])
      if (!saleRes.data.success) throw new Error(saleRes.data.message)
      if (!productRes.data.success) throw new Error(productRes.data.message)

      applyServerState(saleRes.data)
      setProducts(productRes.data.products)
      setSelected(new Set(saleRes.data.config.productIds))
      setStartInput(toInputValue(saleRes.data.config.startAt ?? Date.now()))
      setLoadState('ready')
    } catch (error) {
      console.log(error)
      setMessage(error.message)
      setLoadState('error')
    }
  }

  useEffect(() => { load() }, [])

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    return term ? products.filter((p) => p.name.toLowerCase().includes(term)) : products
  }, [products, search])

  const toggleProduct = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const setVisible = (checked) => {
    setSelected((prev) => {
      const next = new Set(prev)
      visibleProducts.forEach((p) => (checked ? next.add(p._id) : next.delete(p._id)))
      return next
    })
  }

  const post = async (path, body, successMessage) => {
    setSaving(true)
    try {
      const response = await axios.post(`${backendUrl}/api/sale/admin/${path}`, body, { headers: { token } })
      if (response.data.success) {
        applyServerState(response.data)
        setSelected(new Set(response.data.config.productIds))
        if (response.data.config.startAt) setStartInput(toInputValue(response.data.config.startAt))
        toast.success(successMessage)
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

  const confirmRestart = () =>
    !status.active ||
    window.confirm('This sale is already live. Changing the start time restarts it from the first step. Continue?')

  const saveWithStartTime = () => {
    if (!startInput || Number.isNaN(new Date(startInput).getTime())) return toast.error('Choose a start date and time')
    if (selected.size === 0) return toast.error('Select at least one product')
    // The input only holds whole minutes, but a sale started with "Start now"
    // has a millisecond start. If the field still shows the saved time, keep
    // the exact saved value: this is then just an edit of the product list and
    // must not restart the timetable.
    const unchanged = config.startAt !== null && toInputValue(config.startAt) === startInput
    const startAt = unchanged ? config.startAt : new Date(startInput).getTime()
    if (!unchanged && !confirmRestart()) return
    post('save', { startAt, productIds: [...selected] }, startAt > Date.now() ? 'Sale scheduled' : 'Sale saved')
  }

  const startNow = () => {
    if (selected.size === 0) return toast.error('Select at least one product')
    if (!confirmRestart()) return
    post('save', { startNow: true, productIds: [...selected] }, 'Sale started')
  }

  const endSale = () => {
    if (!window.confirm('End the sale? Every product goes back to its regular price immediately.')) return
    post('end', {}, 'Sale ended')
  }

  if (loadState === 'loading') {
    return <div><h3 className='font-medium text-gray-700 mb-4'>Sale</h3><p className='text-sm text-gray-500'>Loading…</p></div>
  }

  if (loadState === 'error') {
    return (
      <div>
        <h3 className='font-medium text-gray-700 mb-4'>Sale</h3>
        <div className='border-2 border-gray-200 rounded p-6'>
          <p className='font-medium text-gray-700 mb-1'>Could not load the sale</p>
          <p className='text-sm text-gray-500 mb-4'>{message}</p>
          <button onClick={load} className='text-sm px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800'>Retry</button>
        </div>
      </div>
    )
  }

  const hoursPerStep = stageMs / (60 * 60 * 1000)
  const allVisibleSelected = visibleProducts.length > 0 && visibleProducts.every((p) => selected.has(p._id))

  return (
    <div className='flex flex-col gap-6 max-w-3xl'>
      <h3 className='font-medium text-gray-700'>Sale</h3>

      <StatusBanner config={config} status={status} />

      <div className='border-2 border-gray-200 rounded p-5 flex flex-col gap-3'>
        <h4 className='font-medium text-gray-700'>Timetable</h4>
        <ul className='text-sm text-gray-600 flex flex-col gap-1'>
          {stages.map((percent, index) => (
            <li key={percent}>
              {index < stages.length - 1
                ? `Hours ${index * hoursPerStep}–${(index + 1) * hoursPerStep}: `
                : `From hour ${index * hoursPerStep}: `}
              <b>{percent}% off</b>
              {index === stages.length - 1 && ' — until you end the sale'}
            </li>
          ))}
        </ul>
        <label className='flex flex-col gap-1 text-sm mt-1'>
          <span className='text-gray-500'>Start time (your local time)</span>
          <input
            type='datetime-local'
            value={startInput}
            onChange={(e) => setStartInput(e.target.value)}
            className='p-2 border border-gray-300 rounded w-full sm:w-64'
          />
        </label>
      </div>

      <div className='border-2 border-gray-200 rounded p-5 flex flex-col gap-3'>
        <div className='flex items-center justify-between gap-3 flex-wrap'>
          <h4 className='font-medium text-gray-700'>Products in the sale ({selected.size} selected)</h4>
          <label className='flex items-center gap-2 text-sm text-gray-600 cursor-pointer'>
            <input type='checkbox' checked={allVisibleSelected} onChange={(e) => setVisible(e.target.checked)} />
            {search.trim() ? 'Select all shown' : 'Select all'}
          </label>
        </div>
        <input
          type='search'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search products'
          className='p-2 border border-gray-300 rounded w-full'
        />
        <ul className='max-h-96 overflow-y-auto divide-y'>
          {visibleProducts.map((product) => (
            <li key={product._id}>
              <label className='flex items-center gap-3 py-2 cursor-pointer'>
                <input type='checkbox' checked={selected.has(product._id)} onChange={() => toggleProduct(product._id)} />
                <img className='w-10 h-12 object-cover bg-gray-100' src={product.image[0]} alt='' loading='lazy' />
                <span className='flex-1 min-w-0'>
                  <span className='block truncate text-sm text-gray-700'>{product.name}</span>
                  <span className='block text-xs text-gray-500'>
                    {currency}{product.price}
                    {' → '}
                    {stages.map((percent) => stepPrice(product.price, percent)).join(' / ')}
                  </span>
                </span>
              </label>
            </li>
          ))}
          {visibleProducts.length === 0 && <li className='py-4 text-sm text-gray-500'>No products match.</li>}
        </ul>
      </div>

      <div className='flex flex-wrap gap-3'>
        <button onClick={saveWithStartTime} disabled={saving} className='text-sm px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50'>
          {saving ? 'Saving…' : config.active ? 'Save changes' : 'Schedule sale'}
        </button>
        <button onClick={startNow} disabled={saving} className='text-sm px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50'>
          Start now
        </button>
        {config.active && (
          <button onClick={endSale} disabled={saving} className='text-sm px-4 py-2 border border-red-400 text-red-600 rounded hover:bg-red-50 disabled:opacity-50'>
            End sale
          </button>
        )}
      </div>
    </div>
  )
}

export default Sale
