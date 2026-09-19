import React, { useMemo, useState } from 'react'
import { currency } from '../App'
import { getThumbnail } from '../utils/imageUtils'

const ProductPicker = ({ products, selectedIds, onChange }) => {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products
  }, [products, query])

  const toggle = (id) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])
  }

  return (
    <div className='w-full max-w-[500px]'>
      <div className='flex flex-wrap gap-2 mb-2'>
        {selectedIds.length === 0 && <p className='text-sm text-gray-400'>No products tagged yet</p>}
        {selectedIds.map((id) => {
          const product = products.find((p) => p._id === id)
          return (
            <span key={id} className='flex items-center gap-2 bg-pink-100 px-2 py-1 text-sm'>
              {product ? product.name : 'Deleted product'}
              <button type='button' onClick={() => toggle(id)} aria-label='Remove product' className='text-base leading-none'>
                ×
              </button>
            </span>
          )
        })}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className='w-full px-3 py-2 mb-2'
        type='text'
        placeholder='Search products'
      />

      <div className='max-h-72 overflow-y-auto border bg-white'>
        {filtered.length === 0 && <p className='p-3 text-sm text-gray-400'>No products found</p>}
        {filtered.map((product) => (
          <label
            key={product._id}
            className='flex items-center gap-3 px-2 py-1 border-b last:border-b-0 text-sm cursor-pointer hover:bg-gray-50'
          >
            <input type='checkbox' checked={selectedIds.includes(product._id)} onChange={() => toggle(product._id)} />
            <img className='w-10' src={getThumbnail(product.image[0])} alt='' loading='lazy' />
            <span className='flex-1'>{product.name}</span>
            <span>
              {currency}
              {product.price}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

export default ProductPicker
