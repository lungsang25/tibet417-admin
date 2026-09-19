import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'
import { backendUrl } from '../App'
import { getThumbnail } from '../utils/imageUtils'
import ProductPicker from '../components/ProductPicker'

const Looks = ({ token }) => {
  const [looks, setLooks] = useState([])
  const [products, setProducts] = useState([])

  const [editingId, setEditingId] = useState(null)
  const [existingImage, setExistingImage] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [title, setTitle] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [active, setActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchLooks = async () => {
    try {
      const response = await axios.get(backendUrl + '/api/look/admin/list', { headers: { token } })
      if (response.data.success) {
        setLooks(response.data.looks)
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await axios.get(backendUrl + '/api/product/list')
      if (response.data.success) {
        setProducts(response.data.products.reverse())
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  useEffect(() => {
    fetchLooks()
    fetchProducts()
  }, [])

  useEffect(() => {
    if (!imageFile) {
      setPreview('')
      return undefined
    }
    const url = URL.createObjectURL(imageFile)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  const resetForm = () => {
    setEditingId(null)
    setExistingImage('')
    setImageFile(null)
    setTitle('')
    setSelectedIds([])
    setActive(true)
  }

  const startEdit = (look) => {
    setEditingId(look._id)
    setExistingImage(look.image)
    setImageFile(null)
    setTitle(look.title || '')
    setSelectedIds(look.products)
    setActive(look.active)
    window.scrollTo(0, 0)
  }

  const onSubmitHandler = async (e) => {
    e.preventDefault()

    if (!editingId && !imageFile) {
      toast.error('Choose a photo')
      return
    }
    if (selectedIds.length === 0) {
      toast.error('Tag at least one product')
      return
    }

    setSubmitting(true)
    try {
      let response
      if (editingId) {
        response = await axios.post(
          backendUrl + '/api/look/update',
          { id: editingId, title, products: selectedIds, active },
          { headers: { token } }
        )
      } else {
        const formData = new FormData()
        formData.append('image', imageFile)
        formData.append('title', title)
        formData.append('products', JSON.stringify(selectedIds))
        formData.append('active', active)
        response = await axios.post(backendUrl + '/api/look/add', formData, { headers: { token } })
      }

      if (response.data.success) {
        toast.success(response.data.message)
        resetForm()
        await fetchLooks()
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (look) => {
    try {
      const response = await axios.post(
        backendUrl + '/api/look/update',
        { id: look._id, active: !look.active },
        { headers: { token } }
      )
      if (response.data.success) {
        await fetchLooks()
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  const removeLook = async (look) => {
    if (!window.confirm('Delete this look?')) return
    try {
      const response = await axios.post(backendUrl + '/api/look/remove', { id: look._id }, { headers: { token } })
      if (response.data.success) {
        toast.success(response.data.message)
        if (editingId === look._id) resetForm()
        await fetchLooks()
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  return (
    <>
      <form onSubmit={onSubmitHandler} className='flex flex-col w-full items-start gap-3'>
        <p className='text-lg'>{editingId ? 'Edit look' : 'Add a look'}</p>

        <div>
          <p className='mb-2'>Model photo</p>
          {editingId ? (
            <img className='w-32' src={existingImage} alt='' />
          ) : (
            <label htmlFor='lookImage'>
              <img className={preview ? 'w-32' : 'w-20'} src={preview || assets.upload_area} alt='' />
              <input
                onChange={(e) => setImageFile(e.target.files[0] || null)}
                type='file'
                id='lookImage'
                accept='image/*'
                hidden
              />
            </label>
          )}
          <p className='mt-1 text-xs text-gray-400'>
            {editingId
              ? 'To change the photo, delete this look and add it again.'
              : 'Portrait (3:4) photos work best. Keep the file under 4 MB.'}
          </p>
        </div>

        <div className='w-full'>
          <p className='mb-2'>Title (optional)</p>
          <input
            onChange={(e) => setTitle(e.target.value)}
            value={title}
            className='w-full max-w-[500px] px-3 py-2'
            type='text'
            placeholder='e.g. Winter in Zurich'
          />
        </div>

        <div className='w-full'>
          <p className='mb-2'>Products worn in this photo</p>
          <ProductPicker products={products} selectedIds={selectedIds} onChange={setSelectedIds} />
        </div>

        <div className='flex gap-2 mt-2'>
          <input onChange={() => setActive((prev) => !prev)} checked={active} type='checkbox' id='lookActive' />
          <label className='cursor-pointer' htmlFor='lookActive'>
            Show on homepage
          </label>
        </div>

        <div className='flex gap-3 mt-4'>
          <button type='submit' disabled={submitting} className='px-8 py-3 bg-black text-white disabled:opacity-50'>
            {submitting ? 'SAVING...' : editingId ? 'SAVE' : 'ADD'}
          </button>
          {editingId && (
            <button type='button' onClick={resetForm} className='px-8 py-3 border border-gray-400'>
              CANCEL
            </button>
          )}
        </div>
      </form>

      <p className='mt-10 mb-2'>All looks</p>
      <div className='flex flex-col gap-2'>
        {looks.length === 0 && <p className='text-sm text-gray-400'>No looks yet</p>}
        {looks.map((look) => {
          const liveCount = look.products.filter((id) => products.some((p) => p._id === id)).length
          const missingCount = look.products.length - liveCount
          return (
            <div
              className='grid grid-cols-[1fr_3fr_2fr] md:grid-cols-[1fr_3fr_2fr_1fr] items-center gap-2 py-1 px-2 border text-sm'
              key={look._id}
            >
              <img className='w-12' src={getThumbnail(look.image)} alt='' loading='lazy' />
              <div>
                <p>{look.title || 'Untitled look'}</p>
                <p className='text-xs text-gray-400'>
                  {liveCount} product{liveCount === 1 ? '' : 's'}
                  {missingCount > 0 && <span className='text-red-500'> · {missingCount} deleted</span>}
                </p>
              </div>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input type='checkbox' checked={look.active} onChange={() => toggleActive(look)} />
                Shown
              </label>
              <div className='col-span-3 md:col-span-1 flex gap-4 md:justify-end'>
                <button type='button' onClick={() => startEdit(look)} className='underline'>
                  Edit
                </button>
                <button type='button' onClick={() => removeLook(look)} className='underline text-red-500'>
                  Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

export default Looks
