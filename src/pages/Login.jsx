import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/index.jsx'
import { motion, AnimatePresence } from 'framer-motion'
import { authApi } from '../services/api'
import toast from 'react-hot-toast'
import {
  UserIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  EnvelopeIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'

const Spinner = () => (
  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

export default function Login() {
  const [step, setStep] = useState(1) // 1 = credentials, 2 = OTP
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [maskedEmail, setMaskedEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [resending, setResending] = useState(false)
  const otpRefs = useRef([])

  const { login } = useAuth()
  const { t, language, setLanguage } = useI18n()
  const navigate = useNavigate()

  // ── Step 1: submit credentials ───────────────────────────────────────────
  const handleCredentials = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const result = await login(username, password)
      if (result?.status === 'otp_required') {
        setMaskedEmail(result.masked_email)
        setStep(2)
      } else if (result?.role) {
        navigate(`/${result.role}`)
      }
    } catch (_) {
      // errors handled in AuthContext
    } finally {
      setIsLoading(false)
    }
  }

  // ── Step 2: submit OTP ───────────────────────────────────────────────────
  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) return
    setIsLoading(true)
    try {
      const res = await authApi.verifyLoginOtp({ username, code })
      const { user, token } = res.data.data
      localStorage.setItem('token', token)
      window.location.href = `/${user.role}`
    } catch (err) {
      toast.error(err.response?.data?.message || t('invalid_code'))
    } finally {
      setIsLoading(false)
    }
  }

  // ── OTP input handling ───────────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const next = [...otp]
    next[index] = value.slice(-1)
    setOtp(next)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await authApi.resendOtp({ username, type: 'login' })
      toast.success(t('otp_sent'))
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } catch (err) {
      toast.error(t('resend_error'))
    } finally {
      setResending(false)
    }
  }

  // ── Shared background ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-400">
      {/* Background decorations — fixed so they never clip the scrollable content */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary-500/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-primary-400/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, backgroundSize: '50px 50px' }} />
      </div>

      {/* Language toggle */}
      <div className="fixed top-4 right-4 z-10">
        <div className="flex items-center gap-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full p-1">
          {['fr', 'en'].map(lang => (
            <button key={lang} onClick={() => setLanguage(lang)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${language === lang ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">

          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }} className="inline-flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary-500/10 rounded-full blur-xl opacity-30" />
                <img src="/esl-logo.png" alt="ESL" className="relative w-20 h-20 sm:w-32 sm:h-32 object-cover rounded-full shadow-xl border-4 border-white/10" />
              </div>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-4xl font-display font-bold text-white mb-3">ESL</motion.h1>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-gray-300 font-medium text-lg tracking-wide">{t('school_name_full')}</motion.p>
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-gray-400">{t('login_portal')}</span>
            </motion.div>
          </div>

          {/* Card */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4, type: 'spring' }} className="card p-8 bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-300">

            <AnimatePresence mode="wait">
              {/* ── STEP 1: Credentials ── */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-2">
                    <span className="w-1 h-8 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full" />
                    {t('sign_in_title')}
                  </h2>
                  <form onSubmit={handleCredentials} className="space-y-5">
                    <div>
                      <label className="label text-gray-300">{t('username_label')}</label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                          placeholder={t('username_placeholder')} required />
                      </div>
                    </div>
                    <div>
                      <label className="label text-gray-300">{t('password_label')}</label>
                      <div className="relative">
                        <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                          className="w-full pl-12 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                          placeholder={t('password_placeholder')} required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                          {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <Link to="/forgot-password" className="text-sm text-primary-400 hover:text-primary-300 transition-colors">
                        Mot de passe oublié ?
                      </Link>
                    </div>
                    <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isLoading}
                      className="relative w-full py-4 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group">
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                      <span className="relative flex items-center justify-center gap-3">
                        {isLoading ? <><Spinner /><span>{t('signing_in')}</span></> : <span className="flex items-center gap-2">{t('sign_in')} <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg></span>}
                      </span>
                    </motion.button>
                  </form>
                </motion.div>
              )}

              {/* ── STEP 2: OTP ── */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <button onClick={() => { setStep(1); setOtp(['','','','','','']) }} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-5 transition-colors">
                    <ArrowLeftIcon className="w-4 h-4" /> {t('back')}
                  </button>
                  <h2 className="text-2xl font-display font-bold text-white mb-2 flex items-center gap-2">
                    <span className="w-1 h-8 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full" />
                    {t('verification')}
                  </h2>
                  <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <EnvelopeIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <p className="text-sm text-blue-200">
                      Code envoyé à <strong>{maskedEmail}</strong>. Valable 10 minutes.
                    </p>
                  </div>
                  <form onSubmit={handleOtpSubmit} className="space-y-6">
                    <div>
                      <label className="label text-gray-300 text-center block mb-3">{t('enter_6_digit_code')}</label>
                      <div className="flex gap-2 justify-center">
                        {otp.map((digit, i) => (
                          <input
                            key={i}
                            ref={el => otpRefs.current[i] = el}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={e => handleOtpChange(i, e.target.value)}
                            onKeyDown={e => handleOtpKeyDown(i, e)}
                            className="w-11 h-14 text-center text-2xl font-bold rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                          />
                        ))}
                      </div>
                    </div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit"
                      disabled={isLoading || otp.join('').length < 6}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                      {isLoading ? <span className="flex items-center justify-center gap-2"><Spinner /> {t('verifying')}</span> : t('confirm')}
                    </motion.button>
                    <div className="text-center">
                      <button type="button" onClick={handleResend} disabled={resending} className="text-sm text-gray-400 hover:text-primary-400 transition-colors disabled:opacity-50">
                        {resending ? t('sending') : t('send_code')}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-center text-sm text-gray-500 mt-8">
            © 2026 ESL - {t('school_name_full')}. {t('all_rights_reserved')}.
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
