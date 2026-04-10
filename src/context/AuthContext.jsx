import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { systemSettingsApi } from '../services/api'
import { setAppTimezone } from '../utils/datetimeLocal'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
    // Load timezone from public settings once at startup
    systemSettingsApi.getPublic()
      .then(res => {
        const tz = res.data?.data?.timezone
        if (tz) setAppTimezone(tz)
      })
      .catch(() => {}) // fail silently
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const response = await api.get('/me')
        setUser(response.data.data)
      } catch (error) {
        localStorage.removeItem('token')
        setUser(null)
      }
    }
    setLoading(false)
  }

  const login = async (username, password) => {
    try {
      const response = await api.post('/login', { username, password })
      // OTP step required — return the status object to Login.jsx
      if (response.data?.status === 'otp_required') {
        return response.data
      }
      // Direct login (fallback, should not happen with OTP enabled)
      const { user, token } = response.data.data
      localStorage.setItem('token', token)
      setUser(user)
      toast.success(`Bienvenue, ${user.first_name} !`)
      return user
    } catch (error) {
      const message = error.response?.data?.message || 'Identifiants incorrects'
      toast.error(message)
      throw error
    }
  }

  // Called after OTP verified — set the user in context
  const setAuthUser = (user) => {
    setUser(user)
  }

  const logout = async () => {
    try {
      await api.post('/logout')
    } catch (error) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('token')
      setUser(null)
      toast.success('Logged out successfully')
    }
  }

  const updateProfile = async (data) => {
    try {
      const response = await api.put('/profile', data)
      setUser(response.data.data)
      toast.success('Profile updated successfully')
      return response.data.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile'
      toast.error(message)
      throw error
    }
  }

  const changePassword = async (currentPassword, password, passwordConfirmation) => {
    try {
      await api.put('/change-password', {
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      })
      toast.success('Password changed successfully')
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to change password'
      toast.error(message)
      throw error
    }
  }

  const value = {
    user,
    loading,
    login,
    logout,
    updateProfile,
    changePassword,
    checkAuth,
    setAuthUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
