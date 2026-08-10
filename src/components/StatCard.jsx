import React from 'react'

/**
 * `lowerIsBetter` flips the red/green colouring for metrics where a fall is the
 * good outcome — bounce rate being the one on this dashboard. The arrow still
 * points the way the number actually moved.
 *
 * `change` is null when the previous period had no data to compare against (a
 * property collecting its first week), so the line is omitted rather than
 * claiming a flat 0%.
 */
const StatCard = ({ label, value, change, lowerIsBetter = false }) => {
  const rose = change >= 0
  const isGood = lowerIsBetter ? !rose : rose

  return (
    <div className='border-2 border-gray-200 rounded p-5 flex flex-col gap-2'>
      <p className='text-sm text-gray-500'>{label}</p>
      <p className='text-2xl font-semibold text-gray-700'>{value}</p>
      {change != null && (
        <p className={`text-xs font-medium ${isGood ? 'text-green-600' : 'text-red-500'}`}>
          {rose ? '▲' : '▼'} {Math.abs(change)}% vs last period
        </p>
      )}
    </div>
  )
}

export default StatCard
