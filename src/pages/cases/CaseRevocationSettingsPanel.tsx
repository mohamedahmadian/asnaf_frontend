import { Banknote, Building2, Mail, Plus, ScrollText, Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AmountInput } from '../../components/ui/AmountInput'
import { AppForm, Button, FormActions, FormField, fieldClassName } from '../../components/ui/Form'
import { confirmToast } from '../../components/ui/confirmToast'
import { FormEmptyHint, FormSectionTitle } from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatGroupedNumber, parseGroupedAmount } from '../../lib/datetime'
import type { Paginated } from '../../types/app'
import { inquiryLetterVariables } from './inquiry-letter-variables'

type CenterOption = { id: string; name: string; isActive: boolean }

type RevocationOrganization = {
  inquiryCenterId: string
  name: string
  letterTitle: string
  letterBody: string
}

type RevocationSettings = {
  fixedAmount: number | null
  organizations: {
    inquiryCenterId: string
    name: string
    isActive: boolean
    letterTitle: string | null
    letterBody: string | null
  }[]
}

function asList<T>(data: T[] | Paginated<T>) {
  return Array.isArray(data) ? data : data.items
}

function toDraft(data: RevocationSettings): RevocationOrganization[] {
  return data.organizations.map((item) => ({
    inquiryCenterId: item.inquiryCenterId,
    name: item.name,
    letterTitle: item.letterTitle ?? '',
    letterBody: item.letterBody ?? '',
  }))
}

export function CaseRevocationSettingsPanel() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [organizations, setOrganizations] = useState<RevocationOrganization[]>([])
  const [centerId, setCenterId] = useState('')
  const [saving, setSaving] = useState(false)
  const letterBodyRefs = useRef(new Map<string, HTMLTextAreaElement>())
  const letterCaretRefs = useRef(new Map<string, { start: number; end: number }>())
  const settings = useQuery({
    queryKey: ['cases', 'revocation-settings'],
    queryFn: async () => (await api.get<RevocationSettings>('/cases/settings/revocation')).data,
  })
  const centers = useQuery({
    queryKey: ['inquiry-centers', 'lookup'],
    queryFn: async () =>
      asList((await api.get<CenterOption[] | Paginated<CenterOption>>('/inquiry-centers')).data),
  })

  useEffect(() => {
    if (!settings.data) return
    setAmount(
      settings.data.fixedAmount != null ? formatGroupedNumber(settings.data.fixedAmount, locale) : '',
    )
    setOrganizations(toDraft(settings.data))
  }, [settings.data, locale])

  function reset() {
    if (!settings.data) return
    setAmount(
      settings.data.fixedAmount != null ? formatGroupedNumber(settings.data.fixedAmount, locale) : '',
    )
    setOrganizations(toDraft(settings.data))
    setCenterId('')
  }

  function addOrganization() {
    const picked = (centers.data ?? []).find((item) => item.id === centerId)
    if (!picked) return
    setOrganizations((current) => [
      ...current,
      { inquiryCenterId: picked.id, name: picked.name, letterTitle: '', letterBody: '' },
    ])
    setCenterId('')
  }

  function rememberLetterCaret(inquiryCenterId: string, element: HTMLTextAreaElement) {
    letterCaretRefs.current.set(inquiryCenterId, {
      start: element.selectionStart,
      end: element.selectionEnd,
    })
  }

  function insertLetterVariable(inquiryCenterId: string, token: string) {
    const node = letterBodyRefs.current.get(inquiryCenterId)
    const item = organizations.find((row) => row.inquiryCenterId === inquiryCenterId)
    if (!item) return
    const snippet = `{{${token}}}`
    const current = node?.value ?? item.letterBody
    const savedCaret = letterCaretRefs.current.get(inquiryCenterId)
    const start = Math.max(0, Math.min(savedCaret?.start ?? current.length, current.length))
    const end = Math.max(start, Math.min(savedCaret?.end ?? start, current.length))
    const next = `${current.slice(0, start)}${snippet}${current.slice(end)}`.slice(0, 8000)
    const caret = Math.min(start + snippet.length, next.length)
    letterCaretRefs.current.set(inquiryCenterId, { start: caret, end: caret })
    setOrganizations((currentOrganizations) =>
      currentOrganizations.map((row) =>
        row.inquiryCenterId === inquiryCenterId ? { ...row, letterBody: next } : row,
      ),
    )
    requestAnimationFrame(() => {
      const textarea = letterBodyRefs.current.get(inquiryCenterId)
      if (!textarea) return
      textarea.focus()
      textarea.setSelectionRange(caret, caret)
    })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!settings.data) return
    setSaving(true)
    try {
      const fixedAmount = parseGroupedAmount(amount)
      if (fixedAmount == null) return
      const { data } = await api.put<RevocationSettings>('/cases/settings/revocation', {
        fixedAmount,
        organizations: organizations.map((item) => ({
          inquiryCenterId: item.inquiryCenterId,
          letterTitle: item.letterTitle.trim(),
          letterBody: item.letterBody.trim(),
        })),
      })
      queryClient.setQueryData(['cases', 'revocation-settings'], data)
      toast.success(t('cases.revocationSaved'))
      setCenterId('')
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  if (settings.isLoading) return <LoadingState variant="inline" />
  if (!settings.data) return <FormEmptyHint>{t('common.error')}</FormEmptyHint>

  const taken = new Set(organizations.map((item) => item.inquiryCenterId))
  const centerOptions = (centers.data ?? [])
    .filter((item) => item.isActive && !taken.has(item.id))
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name, 'fa'))
    .map((item) => ({ value: item.id, label: item.name }))

  return (
    <AppForm onSubmit={submit} className="space-y-6" autoFocusFirst={false}>
      <FormField icon={Banknote} label={t('cases.revocationFixedAmount')} htmlFor="revocation-amount">
        <AmountInput id="revocation-amount" value={amount} onChange={setAmount} required />
        <p className="text-xs text-ink-500">{t('cases.revocationFixedAmountHint')}</p>
      </FormField>

      <section className="space-y-3">
        <FormSectionTitle icon={Building2} className="mb-0">
          {t('cases.revocationOrganizations')}
        </FormSectionTitle>
        <p className="text-xs text-ink-500">{t('cases.revocationOrganizationsHint')}</p>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <FormField icon={Building2} label={t('cases.revocationOrganization')} htmlFor="revocation-center">
              <SearchSelect
                id="revocation-center"
                value={centerId}
                onChange={setCenterId}
                options={centerOptions}
                placeholder={
                  centerOptions.length === 0 && organizations.length > 0
                    ? t('cases.revocationNoneToAdd')
                    : t('cases.revocationSelectOrganization')
                }
                disabled={saving || centerOptions.length === 0}
              />
            </FormField>
          </div>
          <Button type="button" variant="soft" disabled={!centerId || saving} onClick={addOrganization}>
            <Plus className="size-4" aria-hidden />
            {t('cases.revocationAddOrganization')}
          </Button>
        </div>
        {organizations.length === 0 ? (
          <FormEmptyHint>{t('cases.revocationEmpty')}</FormEmptyHint>
        ) : (
          <div className="grid gap-3">
            {organizations.map((item) => (
              <div key={item.inquiryCenterId} className="space-y-3 rounded-2xl bg-white px-4 py-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-ink-900">{item.name}</div>
                  <Button
                    type="button"
                    variant="ghost"
                    icon
                    aria-label={t('common.delete')}
                    disabled={saving}
                    onClick={() =>
                      confirmToast({
                        title: t('cases.revocationConfirmRemove'),
                        confirmLabel: t('common.yesDelete'),
                        cancelLabel: t('common.cancel'),
                        confirmVariant: 'danger',
                        onConfirm: () =>
                          setOrganizations((current) =>
                            current.filter((row) => row.inquiryCenterId !== item.inquiryCenterId),
                          ),
                      })
                    }
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
                <FormField
                  icon={Mail}
                  label={t('cases.revocationLetterTitle')}
                  htmlFor={`revocation-title-${item.inquiryCenterId}`}
                >
                  <input
                    id={`revocation-title-${item.inquiryCenterId}`}
                    className={fieldClassName}
                    value={item.letterTitle}
                    maxLength={200}
                    required
                    disabled={saving}
                    onChange={(event) => {
                      const value = event.target.value
                      setOrganizations((current) =>
                        current.map((row) =>
                          row.inquiryCenterId === item.inquiryCenterId ? { ...row, letterTitle: value } : row,
                        ),
                      )
                    }}
                  />
                </FormField>
                <FormField
                  icon={ScrollText}
                  label={t('cases.revocationLetterBody')}
                  htmlFor={`revocation-body-${item.inquiryCenterId}`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {inquiryLetterVariables.map((variable) => (
                        <button
                          key={variable.key}
                          type="button"
                          className="cursor-pointer rounded-full border border-teal-400 bg-white px-2.5 py-1 text-xs font-medium text-teal-800 shadow-[0_2px_8px_rgba(46,189,182,0.14)] hover:bg-teal-50"
                          disabled={saving}
                          onPointerDown={() => {
                            const node = letterBodyRefs.current.get(item.inquiryCenterId)
                            if (node && document.activeElement === node) {
                              rememberLetterCaret(item.inquiryCenterId, node)
                            }
                          }}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => insertLetterVariable(item.inquiryCenterId, variable.token)}
                        >
                          {t(`inquiryCenters.vars.${variable.key}`)}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-ink-500">{t('inquiryCenters.letterVariableHint')}</p>
                    <textarea
                      id={`revocation-body-${item.inquiryCenterId}`}
                      ref={(node) => {
                        if (node) letterBodyRefs.current.set(item.inquiryCenterId, node)
                        else letterBodyRefs.current.delete(item.inquiryCenterId)
                      }}
                      className={fieldClassName}
                      rows={5}
                      value={item.letterBody}
                      maxLength={8000}
                      required
                      disabled={saving}
                      onChange={(event) => {
                        const value = event.target.value
                        setOrganizations((current) =>
                          current.map((row) =>
                            row.inquiryCenterId === item.inquiryCenterId ? { ...row, letterBody: value } : row,
                          ),
                        )
                      }}
                      onSelect={(event) => rememberLetterCaret(item.inquiryCenterId, event.currentTarget)}
                    />
                  </div>
                </FormField>
              </div>
            ))}
          </div>
        )}
      </section>

      <FormActions
        headerIcons={false}
        submitting={saving}
        submitLabel={t('common.save')}
        cancelLabel={t('common.cancel')}
        onCancel={reset}
      />
    </AppForm>
  )
}
