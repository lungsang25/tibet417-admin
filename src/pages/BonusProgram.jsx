import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { backendUrl, currency } from '../App'

/**
 * Admin settings for the Redeemable Bonus Program: three earning programs
 * (welcome / referral / purchase points) plus the redemption switch that
 * controls whether a balance can be spent at checkout at all — each
 * independently on/off, so e.g. customers can keep earning while redemption
 * is paused during a stock-take.
 *
 * Loads the whole settings singleton once (GET /api/bonus/admin/settings)
 * and saves one section at a time (POST, body {section, ...fields}) —
 * mirrors this admin's existing fetch-then-PATCH-one-thing shape.
 */

const Toggle = ({ checked, onChange, label }) => (
  <label className='flex items-center gap-3 cursor-pointer select-none'>
    <span className={`relative inline-block w-10 h-5 rounded-full transition-colors ${checked ? 'bg-green-500' : 'bg-gray-300'}`}>
      <input type='checkbox' className='sr-only' checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </span>
    <span className='text-sm font-medium text-gray-700'>{label}</span>
  </label>
)

const Field = ({ label, value, onChange, suffix, min = 0, max, step = 1 }) => (
  <label className='flex flex-col gap-1 text-sm'>
    <span className='text-gray-500'>{label}</span>
    <div className='flex items-center gap-2'>
      <input
        type='number'
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className='p-2 border border-gray-300 rounded w-full'
      />
      {suffix && <span className='text-xs text-gray-400 whitespace-nowrap'>{suffix}</span>}
    </div>
  </label>
)

const Card = ({ title, description, active, onToggle, onSave, saving, children }) => (
  <div className='border-2 border-gray-200 rounded p-5 flex flex-col gap-4'>
    <div className='flex items-start justify-between gap-3'>
      <div>
        <h3 className='font-medium text-gray-700'>{title}</h3>
        <p className='text-xs text-gray-500 mt-0.5'>{description}</p>
      </div>
      <Toggle checked={active} onChange={onToggle} label={active ? 'Active' : 'Inactive'} />
    </div>
    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>{children}</div>
    <div>
      <button
        onClick={onSave}
        disabled={saving}
        className='text-sm px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50'
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  </div>
)

const BonusProgram = ({ token }) => {
  const [settings, setSettings] = useState(null)
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [savingSection, setSavingSection] = useState(null)

  const fetchSettings = async () => {
    setStatus('loading')
    try {
      const response = await axios.get(`${backendUrl}/api/bonus/admin/settings`, { headers: { token } })
      if (response.data.success) {
        setSettings(response.data.settings)
        setStatus('ready')
      } else {
        setMessage(response.data.message)
        setStatus('error')
      }
    } catch (error) {
      console.log(error)
      setMessage(error.message)
      setStatus('error')
    }
  }

  useEffect(() => { fetchSettings() }, [])

  const patchSection = (section, field, value) => {
    setSettings((prev) => ({ ...prev, [section]: { ...prev[section], [field]: value } }))
  }

  const saveSection = async (section) => {
    setSavingSection(section)
    try {
      const response = await axios.post(
        `${backendUrl}/api/bonus/admin/settings`,
        { section, ...settings[section] },
        { headers: { token } },
      )
      if (response.data.success) {
        setSettings(response.data.settings)
        toast.success(`${section[0].toUpperCase()}${section.slice(1)} settings saved`)
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    } finally {
      setSavingSection(null)
    }
  }

  if (status === 'loading') {
    return <div><h3 className='font-medium text-gray-700 mb-4'>Bonus Program</h3><p className='text-sm text-gray-500'>Loading settings…</p></div>
  }

  if (status === 'error' || !settings) {
    return (
      <div>
        <h3 className='font-medium text-gray-700 mb-4'>Bonus Program</h3>
        <div className='border-2 border-gray-200 rounded p-6'>
          <p className='font-medium text-gray-700 mb-1'>Could not load settings</p>
          <p className='text-sm text-gray-500 mb-4'>{message}</p>
          <button onClick={fetchSettings} className='text-sm px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800'>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h3 className='font-medium text-gray-700 mb-1'>Bonus Program</h3>
      <p className='text-sm text-gray-500 mb-5'>
        Three earning programs plus redemption, each independently on/off. Changes apply immediately — no deploy needed.
      </p>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <Card
          title='Welcome bonus'
          description='Points granted once, automatically, when a new customer registers or signs up with Google.'
          active={settings.welcome.active}
          onToggle={(v) => patchSection('welcome', 'active', v)}
          onSave={() => saveSection('welcome')}
          saving={savingSection === 'welcome'}
        >
          <Field
            label='Points on signup'
            value={settings.welcome.points}
            onChange={(v) => patchSection('welcome', 'points', v)}
            suffix={`≈ ${currency}${(settings.welcome.points / settings.redemption.redeemRatePerCurrencyUnit).toFixed(2)}`}
          />
        </Card>

        <Card
          title='Recommendation (referral) bonus'
          description='Double-sided: when a referred customer places a qualifying order, BOTH the referrer and the new customer are credited.'
          active={settings.referral.active}
          onToggle={(v) => patchSection('referral', 'active', v)}
          onSave={() => saveSection('referral')}
          saving={savingSection === 'referral'}
        >
          <Field
            label='Points to referrer'
            value={settings.referral.referrerPoints}
            onChange={(v) => patchSection('referral', 'referrerPoints', v)}
          />
          <Field
            label='Points to new customer'
            value={settings.referral.refereePoints}
            onChange={(v) => patchSection('referral', 'refereePoints', v)}
          />
          <Field
            label='Minimum qualifying order'
            value={settings.referral.minQualifyingOrderAmount}
            onChange={(v) => patchSection('referral', 'minQualifyingOrderAmount', v)}
            suffix={currency}
          />
        </Card>

        <Card
          title='Purchase point collection'
          description='Points earned on every qualifying order, based on order value excluding delivery.'
          active={settings.purchase.active}
          onToggle={(v) => patchSection('purchase', 'active', v)}
          onSave={() => saveSection('purchase')}
          saving={savingSection === 'purchase'}
        >
          <Field
            label='Points per unit spent'
            value={settings.purchase.earnRatePerCurrencyUnit}
            onChange={(v) => patchSection('purchase', 'earnRatePerCurrencyUnit', v)}
            suffix={`pts / 1 ${currency.trim()}`}
            step={0.1}
          />
          <Field
            label='Minimum order amount'
            value={settings.purchase.minOrderAmount}
            onChange={(v) => patchSection('purchase', 'minOrderAmount', v)}
            suffix={currency}
          />
        </Card>

        <Card
          title='Redemption'
          description='Controls whether any earned points can be spent at checkout, and how much of one order they can cover.'
          active={settings.redemption.active}
          onToggle={(v) => patchSection('redemption', 'active', v)}
          onSave={() => saveSection('redemption')}
          saving={savingSection === 'redemption'}
        >
          <Field
            label='Points per unit discount'
            value={settings.redemption.redeemRatePerCurrencyUnit}
            onChange={(v) => patchSection('redemption', 'redeemRatePerCurrencyUnit', v)}
            suffix={`pts / 1 ${currency.trim()} off`}
            min={1}
          />
          <Field
            label='Max % of order redeemable'
            value={settings.redemption.maxRedemptionPercent}
            onChange={(v) => patchSection('redemption', 'maxRedemptionPercent', v)}
            suffix='%'
            max={100}
          />
          <Field
            label='Minimum points to redeem'
            value={settings.redemption.minRedeemPoints}
            onChange={(v) => patchSection('redemption', 'minRedeemPoints', v)}
          />
        </Card>
      </div>

      {settings.updatedAt && (
        <p className='text-xs text-gray-400 mt-6'>Last saved {new Date(settings.updatedAt).toLocaleString()}</p>
      )}
    </div>
  )
}

export default BonusProgram
