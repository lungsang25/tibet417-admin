import React, { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { backendUrl } from '../App'
import StatCard from '../components/StatCard'

const ACCENT = '#C586A5'

// Mirrors the whitelist in the backend controller; anything else is ignored
// server-side and falls back to 28.
const RANGES = [7, 28, 90]

/**
 * Shown when the server has no GA4 credentials. The dashboard cannot fix this
 * itself — the values live in the backend's environment — so it explains the
 * remaining steps rather than showing an error or, worse, invented numbers.
 */
const SetupNotice = ({ message }) => (
  <div className='border-2 border-gray-200 rounded p-6'>
    <p className='font-medium text-gray-700 mb-1'>Google Analytics is not connected</p>
    <p className='text-sm text-gray-500 mb-4'>{message}</p>
    <ol className='text-sm text-gray-600 list-decimal ml-5 flex flex-col gap-1.5'>
      <li>Create a GA4 property and a Web data stream for tibet417.com.</li>
      <li>
        Put its measurement ID in the storefront's <code className='text-xs bg-gray-100 px-1 py-0.5 rounded'>VITE_GA_MEASUREMENT_ID</code> and redeploy.
      </li>
      <li>Create a Google Cloud service account, enable the Google Analytics Data API, and download its JSON key.</li>
      <li>Add that service account's email as a Viewer in GA4 → Admin → Property access management.</li>
      <li>
        Set <code className='text-xs bg-gray-100 px-1 py-0.5 rounded'>GA_PROPERTY_ID</code> and <code className='text-xs bg-gray-100 px-1 py-0.5 rounded'>GA_CREDENTIALS_JSON</code> on the backend, then redeploy it.
      </li>
    </ol>
  </div>
)

const Dashboard = ({ token }) => {
  const [data, setData] = useState(null)
  const [days, setDays] = useState(28)
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  const fetchAnalytics = useCallback(async () => {
    setStatus('loading')

    try {
      const response = await axios.get(`${backendUrl}/api/analytics/overview?days=${days}`, {
        headers: { token },
      })

      if (response.data.success) {
        setData(response.data.data)
        setStatus('ready')
        return
      }

      // configured:false is the pre-setup state, not a failure — it gets the
      // instructions panel instead of an error.
      setMessage(response.data.message)
      setStatus(response.data.configured === false ? 'unconfigured' : 'error')
    } catch (error) {
      console.log(error)
      setMessage(error.message)
      setStatus('error')
    }
  }, [days, token])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const header = (
    <div className='flex items-center flex-wrap gap-3 mb-5'>
      <h3 className='text-lg font-medium'>Analytics Overview</h3>

      {status === 'ready' && (
        <span className='text-xs px-2 py-1 border border-green-200 bg-green-50 text-green-700 rounded'>
          Google Analytics · live
        </span>
      )}

      <div className='ml-auto flex items-center gap-2'>
        {RANGES.map((range) => (
          <button
            key={range}
            onClick={() => setDays(range)}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${
              days === range
                ? 'border-gray-400 bg-gray-100 text-gray-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {range}d
          </button>
        ))}
      </div>
    </div>
  )

  if (status === 'loading' && !data) {
    return (
      <div>
        {header}
        <p className='text-sm text-gray-500'>Loading analytics…</p>
      </div>
    )
  }

  if (status === 'unconfigured') {
    return (
      <div>
        {header}
        <SetupNotice message={message} />
      </div>
    )
  }

  if (status === 'error' && !data) {
    return (
      <div>
        {header}
        <div className='border-2 border-gray-200 rounded p-6'>
          <p className='font-medium text-gray-700 mb-1'>Could not load analytics</p>
          <p className='text-sm text-gray-500 mb-4'>{message}</p>
          <button
            onClick={fetchAnalytics}
            className='text-sm px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800'
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const { stats, visitorsOverTime, topPages } = data

  // A connected property with no traffic yet looks identical to a broken one
  // unless it says so.
  const noTrafficYet = stats.pageviews.value === 0

  return (
    <div>
      {header}

      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        <StatCard label='Users' value={stats.users.value.toLocaleString()} change={stats.users.change} />
        <StatCard label='Sessions' value={stats.sessions.value.toLocaleString()} change={stats.sessions.change} />
        <StatCard label='Pageviews' value={stats.pageviews.value.toLocaleString()} change={stats.pageviews.change} />
        <StatCard label='Bounce Rate' value={`${stats.bounceRate.value}%`} change={stats.bounceRate.change} lowerIsBetter />
      </div>

      {noTrafficYet && (
        <p className='text-sm text-gray-500 mt-4 border-2 border-gray-200 rounded p-4'>
          No traffic recorded in this period. If the tag was installed recently, hits normally appear within a
          few minutes — check GA4 → Reports → Realtime while loading the storefront to confirm it is firing.
        </p>
      )}

      <div className='border-2 border-gray-200 rounded p-5 mt-6'>
        <p className='text-sm text-gray-500 mb-4'>Visitors (last {days} days, including today so far)</p>
        <ResponsiveContainer width='100%' height={260}>
          <AreaChart data={visitorsOverTime}>
            <defs>
              <linearGradient id='visitorsGradient' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor={ACCENT} stopOpacity={0.3} />
                <stop offset='95%' stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e5e7eb' />
            <XAxis dataKey='date' tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: '#e5e7eb' }} />
            <Area type='monotone' dataKey='users' stroke={ACCENT} fill='url(#visitorsGradient)' strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className='mt-6'>
        <p className='text-sm text-gray-500 mb-3'>Top Pages</p>
        <div className='grid grid-cols-3 gap-3 px-5 py-2 text-xs font-medium text-gray-500'>
          <p>Page</p>
          <p>Views</p>
          <p>Avg. Engagement</p>
        </div>
        {topPages.length === 0 ? (
          <p className='text-sm text-gray-500 border-2 border-gray-200 rounded p-5'>No page data for this period.</p>
        ) : (
          topPages.map((page, index) => (
            <div key={index} className='grid grid-cols-3 gap-3 items-center border-2 border-gray-200 rounded p-5 my-2 text-sm text-gray-700'>
              <p className='truncate' title={page.path}>{page.path}</p>
              <p>{page.views.toLocaleString()}</p>
              <p>{page.avgTime}</p>
            </div>
          ))
        )}
      </div>

      {data.updatedAt && (
        <p className='text-xs text-gray-400 mt-6'>
          Updated {new Date(data.updatedAt).toLocaleString()} · cached for 5 minutes
        </p>
      )}
    </div>
  )
}

export default Dashboard
