import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { backendUrl, currency } from '../App'
import { toast } from 'react-toastify'
import { getThumbnail } from '../utils/imageUtils'
import { SEASONS } from '../utils/seasons'

const List = ({ token }) => {

  const [list, setList] = useState([])

  const fetchList = async () => {
    try {

      const response = await axios.get(backendUrl + '/api/product/list')
      if (response.data.success) {
        setList(response.data.products.reverse());
      }
      else {
        toast.error(response.data.message)
      }

    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  const removeProduct = async (id) => {
    try {

      const response = await axios.post(backendUrl + '/api/product/remove', { id }, { headers: { token } })

      if (response.data.success) {
        toast.success(response.data.message)
        await fetchList();
      } else {
        toast.error(response.data.message)
      }

    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  const toggleSeason = async (item, season) => {
    const current = item.seasons || []
    const next = current.includes(season) ? current.filter((s) => s !== season) : [...current, season]
    try {

      const response = await axios.post(backendUrl + '/api/product/seasons', { id: item._id, seasons: next }, { headers: { token } })

      if (response.data.success) {
        setList((prev) => prev.map((p) => (p._id === item._id ? { ...p, seasons: response.data.seasons } : p)))
      } else {
        toast.error(response.data.message)
      }

    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  useEffect(() => {
    fetchList()
  }, [])

  return (
    <>
      <p className='mb-2'>All Products List</p>
      <div className='flex flex-col gap-2'>

        {/* ------- List Table Title ---------- */}

        <div className='hidden md:grid grid-cols-[1fr_3fr_1fr_1fr_2fr_1fr] items-center py-1 px-2 border bg-gray-100 text-sm'>
          <b>Image</b>
          <b>Name</b>
          <b>Category</b>
          <b>Price</b>
          <b>Seasons</b>
          <b className='text-center'>Action</b>
        </div>

        {/* ------ Product List ------ */}

        {
          list.map((item, index) => (
            <div className='grid grid-cols-[1fr_3fr_1fr] md:grid-cols-[1fr_3fr_1fr_1fr_2fr_1fr] items-center gap-2 py-1 px-2 border text-sm' key={index}>
              <img className='w-12' src={getThumbnail(item.image[0])} alt="" loading='lazy' />
              <p>{item.name}</p>
              <p>{item.category}</p>
              <p>{currency}{item.price}</p>
              <div className='col-span-2 md:col-span-1 flex flex-wrap gap-1'>
                {SEASONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type='button'
                    onClick={() => toggleSeason(item, value)}
                    className={`${(item.seasons || []).includes(value) ? 'bg-pink-100' : 'bg-slate-200'} px-2 py-0.5 text-xs`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p onClick={()=>removeProduct(item._id)} className='text-right md:text-center cursor-pointer text-lg'>X</p>
            </div>
          ))
        }

      </div>
    </>
  )
}

export default List