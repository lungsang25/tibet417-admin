import React, { useState } from 'react'
import { assets } from '../assets/assets'
import { currency } from '../App'
import TrackingEditor from './TrackingEditor'

const STATUS_STYLES = {
    'Order Placed': 'border-gray-200 bg-gray-50 text-gray-700',
    'Packing': 'border-amber-200 bg-amber-50 text-amber-700',
    'Shipped': 'border-blue-200 bg-blue-50 text-blue-700',
    'Out for delivery': 'border-violet-200 bg-violet-50 text-violet-700',
    'Delivered': 'border-green-200 bg-green-50 text-green-700',
}

const StatusChip = ({ status }) => (
    <span className={`text-xs px-2 py-1 border rounded ${STATUS_STYLES[status] || STATUS_STYLES['Order Placed']}`}>
        {status}
    </span>
)

const OrderCard = ({ order, token, meta, onStatusChange, onSaved }) => {
    const [open, setOpen] = useState(false)
    const tracking = order.tracking || {}
    const hasTracking = Boolean(tracking.number)

    return (
        <div className='border-2 border-gray-200 rounded p-5 md:p-8 my-3 md:my-4 text-xs sm:text-sm text-gray-700'>
            <div className='grid grid-cols-1 sm:grid-cols-[0.5fr_2fr_1fr] lg:grid-cols-[0.5fr_2fr_1fr_1fr_1fr] gap-3 items-start'>
                <img className='w-12' src={assets.parcel_icon} alt='' />

                <div>
                    <div>
                        {order.items.map((item, index) => (
                            <p className='py-0.5' key={`${item._id}-${item.size}-${index}`}>
                                {item.name} x {item.quantity} <span>{item.size}</span>
                                {index < order.items.length - 1 ? ',' : ''}
                            </p>
                        ))}
                    </div>
                    <p className='mt-3 mb-2 font-medium'>{order.address.firstName + ' ' + order.address.lastName}</p>
                    <div>
                        <p>{order.address.street + ','}</p>
                        <p>{order.address.city + ', ' + order.address.state + ', ' + order.address.country + ', ' + order.address.zipcode}</p>
                    </div>
                    <p>{order.address.phone}</p>
                </div>

                <div>
                    <p className='text-sm sm:text-[15px]'>Items : {order.items.length}</p>
                    <p className='mt-3'>Method : {order.paymentMethod}</p>
                    <p>Payment : {order.payment ? 'Done' : 'Pending'}</p>
                    <p>Date : {new Date(order.date).toLocaleDateString('de-CH')}</p>
                    {order.locale && <p>Language : {order.locale.toUpperCase()}</p>}
                </div>

                <p className='text-sm sm:text-[15px]'>{currency}{order.amount}</p>

                <select
                    onChange={(event) => onStatusChange(order._id, event.target.value)}
                    value={order.status}
                    className='p-2 font-semibold'
                >
                    {meta.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div className='flex flex-wrap items-center gap-3 mt-4'>
                <StatusChip status={order.status} />

                {hasTracking ? (
                    <span className='text-xs text-gray-500'>
                        {tracking.carrierName} · <span className='font-mono'>{tracking.number}</span>
                    </span>
                ) : (
                    <span className='text-xs text-gray-400'>No tracking yet</span>
                )}

                <button
                    onClick={() => setOpen((v) => !v)}
                    className='text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 ml-auto'
                    aria-expanded={open}
                >
                    {open ? 'Hide tracking' : hasTracking ? 'Edit tracking' : 'Add tracking'}
                </button>
            </div>

            {open && (
                <TrackingEditor order={order} token={token} meta={meta} onSaved={onSaved} />
            )}
        </div>
    )
}

export default OrderCard
