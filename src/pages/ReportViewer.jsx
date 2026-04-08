import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n/index.jsx'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export default function ReportViewer() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const key = params.get('key') || ''

  const storageKey = useMemo(() => (key ? `esl_report:${key}` : ''), [key])
  const [srcDoc, setSrcDoc] = useState('')
  const [status, setStatus] = useState('loading') // loading | missing

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!storageKey) {
        setStatus('missing')
        return
      }

      // Poll briefly because the opener tab may still be fetching data.
      for (let i = 0; i < 80; i++) {
        if (cancelled) return
        const html = localStorage.getItem(storageKey)
        if (html) {
          try {
            localStorage.removeItem(storageKey)
          } catch (_) {}
          setSrcDoc(html)
          return
        }
        await sleep(150)
      }

      if (!cancelled) setStatus('missing')
    }

    run()
    return () => {
      cancelled = true
    }
  }, [storageKey])

  if (srcDoc) {
    return (
      <div className="w-screen h-screen bg-white">
        <iframe
          title="Report"
          className="w-full h-full border-0"
          srcDoc={srcDoc}
        />
      </div>
    )
  }

  if (status === 'missing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-400 p-6">
        <div className="card p-6 max-w-md w-full text-center">
          <h1 className="text-lg font-display font-bold text-gray-900 dark:text-white">
            {t('error')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {t('report_open_error')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-400 p-6">
      <div className="card p-6 max-w-md w-full text-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <h1 className="text-base font-semibold text-gray-900 dark:text-white mt-4">
          {t('loading')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('report_opening')}
        </p>
      </div>
    </div>
  )
}

