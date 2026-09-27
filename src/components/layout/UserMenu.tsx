import { ChevronDown, KeyRound, LogOut, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'

export function UserMenu() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex cursor-pointer items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-sm shadow-sm sm:min-w-[16.5rem]"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800">
          {user?.fullName.slice(0, 1)}
        </span>
        <span className="hidden min-w-0 flex-1 text-start sm:block">
          <span className="block font-medium text-ink-900">{user?.fullName}</span>
          <span className="block text-xs text-ink-400">{user?.username}</span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-ink-400" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute end-0 top-full z-50 mt-2 w-56 min-w-full overflow-hidden rounded-2xl border border-line bg-white shadow-lg"
        >
          {user?.impersonating ? (
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
              onClick={() => {
                setOpen(false)
                logout()
              }}
            >
              <LogOut className="size-4" />
              {t('auth.impersonateEnd')}
            </button>
          ) : (
            <>
              <Link
                to="/account"
                className="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm hover:bg-cream-50"
                onClick={() => setOpen(false)}
              >
                <UserRound className="size-4 text-teal-600" />
                {t('nav.account')}
              </Link>
              <Link
                to="/settings/password"
                className="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm hover:bg-cream-50"
                onClick={() => setOpen(false)}
              >
                <KeyRound className="size-4 text-teal-600" />
                {t('nav.changePassword')}
              </Link>
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
                onClick={() => {
                  logout()
                  navigate('/login')
                }}
              >
                <LogOut className="size-4" />
                {t('auth.logout')}
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
