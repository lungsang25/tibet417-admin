import React, { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { backendUrl } from '../App'

const PAGE_SIZE = 50

const Users = ({ token }) => {

  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // Debounce typing so we don't query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const fetchUsers = useCallback(async (targetPage, append) => {
    if (!token) return
    setStatus('loading')
    try {
      const response = await axios.post(backendUrl + '/api/user/admin/list',
        { page: targetPage, limit: PAGE_SIZE, search: search || undefined, from: from || undefined, to: to || undefined },
        { headers: { token } })

      if (response.data.success) {
        setUsers((prev) => (append ? [...prev, ...response.data.users] : response.data.users))
        setTotal(response.data.total)
        setPage(response.data.page)
        setStatus('ready')
      } else {
        setMessage(response.data.message)
        setStatus('error')
        toast.error(response.data.message)
      }
    } catch (error) {
      setMessage(error.message)
      setStatus('error')
      toast.error(error.message)
    }
  }, [token, search, from, to])

  useEffect(() => { fetchUsers(1, false) }, [fetchUsers])

  const hasFilters = searchInput || from || to
  const clear = () => { setSearchInput(''); setSearch(''); setFrom(''); setTo('') }

  return (
    <div>
      <div className='flex flex-wrap items-center gap-3 mb-4'>
        <p className='text-lg font-medium'>New Users</p>
        <span className='text-sm text-gray-500'>{users.length} of {total}</span>
        <div className='ml-auto flex flex-wrap items-center gap-2 text-sm'>
          <input
            type='text'
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder='Search by name'
            className='p-2 border border-gray-300 rounded'
          />
          <label className='flex items-center gap-1'>From
            <input type='date' value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className='p-2 border border-gray-300 rounded' />
          </label>
          <label className='flex items-center gap-1'>To
            <input type='date' value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className='p-2 border border-gray-300 rounded' />
          </label>
          {hasFilters && <button onClick={clear} className='px-3 py-2 border border-gray-300 rounded'>Clear</button>}
        </div>
      </div>

      {status === 'error' && (
        <div className='border border-red-300 bg-red-50 text-red-700 rounded p-3 mb-3 flex items-center gap-3'>
          <span>Could not load users: {message}</span>
          <button onClick={() => fetchUsers(1, false)} className='ml-auto px-3 py-1 border border-red-300 rounded'>Retry</button>
        </div>
      )}

      <div className='border border-gray-300 rounded bg-white overflow-x-auto'>
        <div className='grid grid-cols-[1fr_1.5fr_120px] gap-2 px-3 py-2 bg-gray-100 text-sm font-medium'>
          <span>Name</span><span>Email</span><span>Joined</span>
        </div>
        {users.map((u) => (
          <div key={u._id} className='grid grid-cols-[1fr_1.5fr_120px] gap-2 px-3 py-2 border-t border-gray-200 text-sm'>
            <span className='break-words'>{u.name}</span>
            <span className='break-all'>{u.email}</span>
            <span>{new Date(u.joinedAt).toLocaleDateString()}</span>
          </div>
        ))}
        {status === 'loading' && <p className='px-3 py-4 text-sm text-gray-500'>Loading...</p>}
        {status === 'ready' && users.length === 0 && <p className='px-3 py-4 text-sm text-gray-500'>No users found.</p>}
      </div>

      {status === 'ready' && users.length < total && (
        <button onClick={() => fetchUsers(page + 1, true)} className='mt-4 px-4 py-2 border border-gray-300 rounded bg-white'>Load more</button>
      )}
    </div>
  )
}

export default Users
