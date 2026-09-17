import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import './App.css'

const MFA_ACR_VALUE = 'http://schemas.openid.net/pape/policies/2007/06/multi-factor'
const STEPUP_PENDING_KEY = 'stepup_pending'

function hasCompletedMfa(claims) {
  return Array.isArray(claims?.amr) && claims.amr.includes('mfa')
}

function App() {
  const {
    isLoading,
    isAuthenticated,
    loginWithRedirect,
    logout,
    user,
    getIdTokenClaims,
  } = useAuth0()

  const [view, setView] = useState('public')
  const [claims, setClaims] = useState(null)
  const [checkingStepUp, setCheckingStepUp] = useState(false)
  const [message, setMessage] = useState('')

  // On return from a redirect, resume the step-up check if one was pending.
  useEffect(() => {
    if (!isAuthenticated) return

    const resumeStepUp = sessionStorage.getItem(STEPUP_PENDING_KEY) === '1'

    getIdTokenClaims().then((idTokenClaims) => {
      setClaims(idTokenClaims)

      if (!resumeStepUp) return
      sessionStorage.removeItem(STEPUP_PENDING_KEY)

      if (hasCompletedMfa(idTokenClaims)) {
        setView('protected')
        setMessage('Step-up MFA verified — access granted.')
      } else {
        setMessage('MFA was not completed. Protected page remains locked.')
      }
    })
  }, [isAuthenticated, getIdTokenClaims])

  const handleAccessProtectedPage = async () => {
    setCheckingStepUp(true)
    setMessage('')

    const idTokenClaims = await getIdTokenClaims()
    setClaims(idTokenClaims)

    if (hasCompletedMfa(idTokenClaims)) {
      setView('protected')
      setCheckingStepUp(false)
      return
    }

    sessionStorage.setItem(STEPUP_PENDING_KEY, '1')
    await loginWithRedirect({
      authorizationParams: {
        acr_values: MFA_ACR_VALUE,
      },
    })
  }

  if (isLoading) {
    return (
      <main className="shell">
        <p>Loading...</p>
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="shell">
        <h1>Step-Up MFA Demo</h1>
        <p>Log in to browse the public page. Accessing the protected page will require MFA.</p>
        <button type="button" onClick={() => loginWithRedirect()}>
          Log In
        </button>
      </main>
    )
  }

  return (
    <main className="shell">
      <header className="topbar">
        <span>Signed in as {user?.name || user?.email}</span>
        <button
          type="button"
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin + import.meta.env.BASE_URL } })}
        >
          Log Out
        </button>
      </header>

      <h1>Step-Up MFA Demo</h1>

      {view === 'public' && (
        <section className="card">
          <h2>Public Page</h2>
          <p>You're logged in. This content is visible with no MFA required.</p>
          <button type="button" onClick={handleAccessProtectedPage} disabled={checkingStepUp}>
            {checkingStepUp ? 'Checking...' : 'Access Protected Page'}
          </button>
          {message && <p className="message">{message}</p>}
        </section>
      )}

      {view === 'protected' && (
        <section className="card protected">
          <h2>Protected Page</h2>
          <p>{message || 'Step-up MFA verified — access granted.'}</p>
          <button type="button" onClick={() => setView('public')}>
            Back to Public Page
          </button>
          <details>
            <summary>ID token claims</summary>
            <pre>{JSON.stringify({ acr: claims?.acr, amr: claims?.amr }, null, 2)}</pre>
          </details>
        </section>
      )}
    </main>
  )
}

export default App
