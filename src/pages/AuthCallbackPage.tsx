import { useEffect, useState } from 'react'
import { CheckCircle2, LoaderCircle, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import logoLight from '../assets/logo-light.png'

const AuthCallbackPage = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    let active = true

    const confirmEmail = async () => {
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          if (active) setStatus('error')
          return
        }
      }

      const { data } = await supabase.auth.getSession()
      if (!active) return
      if (!data.session) {
        setStatus('error')
        return
      }

      setStatus('success')
      window.setTimeout(() => navigate('/', { replace: true }), 900)
    }

    void confirmEmail()
    return () => { active = false }
  }, [navigate])

  return (
    <div className="lumi-shell flex min-h-screen items-center justify-center p-4">
      <div className="lumi-panel w-full max-w-md rounded-3xl border p-8 text-center">
        <img src={logoLight} alt="LumiCRM" className="lumi-logo mx-auto h-10 w-auto" />
        {status === 'loading' && <LoaderCircle className="lumi-accent-text mx-auto mt-8 h-12 w-12 animate-spin" />}
        {status === 'success' && <CheckCircle2 className="mx-auto mt-8 h-12 w-12 text-emerald-400" />}
        {status === 'error' && <XCircle className="mx-auto mt-8 h-12 w-12 text-red-400" />}
        <h1 className="lumi-text mt-5 text-2xl font-bold">
          {status === 'loading' ? 'Подтверждаем почту…' : status === 'success' ? 'Почта подтверждена' : 'Ссылка недействительна'}
        </h1>
        <p className="lumi-muted mt-3 text-sm leading-6">
          {status === 'loading'
            ? 'Это займёт несколько секунд.'
            : status === 'success'
              ? 'Открываем ваш новый офис LumiCRM.'
              : 'Ссылка могла устареть. Вернитесь на страницу входа и запросите письмо повторно.'}
        </p>
        {status === 'error' && (
          <button type="button" onClick={() => navigate('/login', { replace: true })} className="lumi-gradient-button mt-6 w-full rounded-xl py-3 font-semibold">
            Вернуться ко входу
          </button>
        )}
      </div>
    </div>
  )
}

export default AuthCallbackPage
