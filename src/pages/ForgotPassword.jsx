import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { authApi } from '../services/api'
import toast from 'react-hot-toast'
import { useI18n } from '../i18n/index.jsx'
import {
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

const Spinner = () => (
  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

export default function ForgotPassword() {
  const { t } = useI18n()
  const [step, setStep] = useState(1) // 1=email, 2=OTP, 3=new password, 4=success
  const [email, setEmail] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const otpRefs = useRef([])
  const navigate = useNavigate()

  // Step 1: send OTP to email
  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await authApi.forgotPassword({ email })
      setMaskedEmail(res.data.masked_email || email)
      toast.success(res.data.message)
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'envoi')
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: verify OTP
  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) return
    // Just verify locally that code is 6 digits, actual verification happens on step 3
    setStep(3)
  }

  // Step 3: reset password
  const handleResetSubmit = async (e) => {
    e.preventDefault()
    if (password !== passwordConfirm) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    setIsLoading(true)
    try {
      await authApi.resetPassword({
        email,
        code: otp.join(''),
        password,
        password_confirmation: passwordConfirm,
      })
      setStep(4)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Code incorrect ou expiré')
      setStep(2) // Go back to OTP step
      setOtp(['', '', '', '', '', ''])
    } finally {
      setIsLoading(false)
    }
  }

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
      const res = await authApi.forgotPassword({ email })
      toast.success('Nouveau code envoyé !')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } catch (err) {
      toast.error('Erreur lors du renvoi')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-dark-400 via-dark-300 to-dark-400">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary-500/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-accent-500/20 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">

          {/* Logo */}
          <div className="text-center mb-8">
            <img src="/esl-logo.png" alt="ESL" className="w-20 h-20 object-cover rounded-full shadow-xl border-4 border-white/10 mx-auto mb-4" />
            <h1 className="text-3xl font-display font-bold text-white">ESL</h1>
            <p className="text-gray-400 text-sm mt-1">École de Santé de Libreville</p>
          </div>

          <div className="card p-8 bg-white/5 backdrop-blur-xl border border-white/10">
            <AnimatePresence mode="wait">

              {/* Step 1: Email */}
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <Link to="/login" className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-5 transition-colors">
                    <ArrowLeftIcon className="w-4 h-4" /> {t('back_to_login')}
                  </Link>
                  <h2 className="text-2xl font-bold text-white mb-2">Mot de passe oublié</h2>
                  <p className="text-gray-400 text-sm mb-6">{t('forgot_password_desc')}</p>
                  <form onSubmit={handleEmailSubmit} className="space-y-5">
                    <div>
                      <label className="label text-gray-300">{t('email')}</label>
                      <div className="relative">
                        <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                          placeholder="exemple@email.com" required />
                      </div>
                    </div>
                    <button type="submit" disabled={isLoading}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold disabled:opacity-50 transition-all">
                      {isLoading ? <span className="flex items-center justify-center gap-2"><Spinner /> {t('sending')}</span> : t('send_code')}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Step 2: OTP */}
              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <button onClick={() => setStep(1)} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-5 transition-colors">
                    <ArrowLeftIcon className="w-4 h-4" /> {t('back')}
                  </button>
                  <h2 className="text-2xl font-bold text-white mb-2">{t('verification')}</h2>
                  <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <EnvelopeIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <p className="text-sm text-blue-200">Code envoyé à <strong>{maskedEmail}</strong>. Valable 10 minutes.</p>
                  </div>
                  <form onSubmit={handleOtpSubmit} className="space-y-6">
                    <div>
                      <label className="label text-gray-300 text-center block mb-3">{t('enter_6_digit_code')}</label>
                      <div className="flex gap-2 justify-center">
                        {otp.map((digit, i) => (
                          <input key={i} ref={el => otpRefs.current[i] = el}
                            type="text" inputMode="numeric" maxLength={1} value={digit}
                            onChange={e => handleOtpChange(i, e.target.value)}
                            onKeyDown={e => handleOtpKeyDown(i, e)}
                            className="w-11 h-14 text-center text-2xl font-bold rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all" />
                        ))}
                      </div>
                    </div>
                    <button type="submit" disabled={otp.join('').length < 6}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold disabled:opacity-50 transition-all">
                      {t('continue')}
                    </button>
                    <div className="text-center">
                      <button type="button" onClick={handleResend} disabled={resending} className="text-sm text-gray-400 hover:text-primary-400 transition-colors disabled:opacity-50">
                        {resending ? t('sending') : t('send_code')}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Step 3: New password */}
              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <button onClick={() => setStep(2)} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-5 transition-colors">
                    <ArrowLeftIcon className="w-4 h-4" /> {t('back')}
                  </button>
                  <h2 className="text-2xl font-bold text-white mb-2">{t('new_password')}</h2>
                  <p className="text-gray-400 text-sm mb-6">{t('password_min_length')}.</p>
                  <form onSubmit={handleResetSubmit} className="space-y-5">
                    <div>
                      <label className="label text-gray-300">{t('new_password')}</label>
                      <div className="relative">
                        <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                          className="w-full pl-12 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                          placeholder="••••••••" minLength={8} required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                          {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="label text-gray-300">{t('confirm_password')}</label>
                      <div className="relative">
                        <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type={showPassword ? 'text' : 'password'} value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                          placeholder="••••••••" minLength={8} required />
                      </div>
                    </div>
                    <button type="submit" disabled={isLoading}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold disabled:opacity-50 transition-all">
                      {isLoading ? <span className="flex items-center justify-center gap-2"><Spinner /> {t('saving')}</span> : t('reset_password')}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Step 4: Success */}
              {step === 4 && (
                <motion.div key="s4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircleIcon className="w-8 h-8 text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Mot de passe réinitialisé !</h2>
                  <p className="text-gray-400 text-sm mb-6">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
                  <button onClick={() => navigate('/login')}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold transition-all">
                    Se connecter
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            © 2026 ESL - École de Santé de Libreville.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
