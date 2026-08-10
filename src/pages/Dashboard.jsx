import React, { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import StatCard from '../components/StatCard'
import { getAnalyticsOverview } from '../data/mockAnalytics'

const ACCENT = '#C586A5'

const Dashboard = () => {
  const [data, setData] = useState(null)

  useEffect(() => {
    setData(getAnalyticsOverview())
  }, [])

  if (!data) return null

  const { stats, visitorsOverTime, topPages } = data

  return (
    <div>
      <div className='flex items-center gap-3 mb-5'>
        <h3 className='text-lg font-medium'>Analytics Overview</h3>
        <span className='text-xs px-2 py-1 border border-gray-300 rounded text-gray-500'>Google Analytics · not yet connected</span>
      </div>

      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        <StatCard label='Users' value={stats.users.value.toLocaleString()} change={stats.users.change} />
        <StatCard label='Sessions' value={stats.sessions.value.toLocaleString()} change={stats.sessions.change} />
        <StatCard label='Pageviews' value={stats.pageviews.value.toLocaleString()} change={stats.pageviews.change} />
        <StatCard label='Bounce Rate' value={`${stats.bounceRate.value}%`} change={stats.bounceRate.change} />
      </div>

      <div className='border-2 border-gray-200 rounded p-5 mt-6'>
        <p className='text-sm text-gray-500 mb-4'>Visitors (last 28 days)</p>
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
            <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
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
          <p>Avg. Time</p>
        </div>
        {topPages.map((page, index) => (
          <div key={index} className='grid grid-cols-3 gap-3 items-center border-2 border-gray-200 rounded p-5 my-2 text-sm text-gray-700'>
            <p className='truncate'>{page.path}</p>
            <p>{page.views.toLocaleString()}</p>
            <p>{page.avgTime}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Dashboard
