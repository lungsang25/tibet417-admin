import React from 'react'

const StatCard = ({ label, value, change }) => {
  const isPositive = change >= 0

  return (
    <div className='border-2 border-gray-200 rounded p-5 flex flex-col gap-2'>
      <p className='text-sm text-gray-500'>{label}</p>
      <p className='text-2xl font-semibold text-gray-700'>{value}</p>
      {change !== undefined && (
        <p className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
          {isPositive ? '▲' : '▼'} {Math.abs(change)}% vs last period
        </p>
      )}
    </div>
  )
}

export default StatCard
