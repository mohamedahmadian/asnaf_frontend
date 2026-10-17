import { HandCoins, Landmark, Layers, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CheckboxField } from '../../components/ui/CheckboxField'
import {
  AppForm,
  Button,
  FormActions,
  FormField,
  fieldClassName,
} from '../../components/ui/Form'
import { FormCard, FormEmptyHint, formCardBodyClassName } from '../../components/ui/FormLayout'
import { SearchBar, actionsColClassName } from '../../components/ui/ListControls'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import type { BankAccount, MunicipalFee, Paginated, PaymentGroup } from '../../types/app'
import { bankAccountOptionLabel, formatFeeAmount } from '../municipal-fees/MunicipalFeeForm'
import { asItemList } from './payment-shared'

type Editor = {
  id: string | null
  title: string
  bankAccountId: string
  feeIds: string[]
}

export function PaymentGroupsModal({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const queryClient = useQueryClient()
  const { confirmDelete } = useConfirmDelete()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [term, setTerm] = useState('')
  const [q, setQ] = useState('')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      if (
        document.querySelector(
          '[role="listbox"], [role="menu"], [data-confirm-toast], .rmdp-wrapper, [data-enter-ignore][aria-expanded="true"]',
        )
      ) {
        return
      }
      const modals = document.querySelectorAll('[aria-modal="true"]')
      const top = modals[modals.length - 1]
      if (dialogRef.current && top !== dialogRef.current) return
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey, true)
    }
  }, [onClose])

  const groupsQuery = useQuery({
    queryKey: ['payment-groups'],
    queryFn: async () => {
      const { data } = await api.get<PaymentGroup[]>('/payment-groups')
      return data
    },
  })
  const accountsQuery = useQuery({
    queryKey: ['bank-accounts', 'lookup', 'payment-groups'],
    queryFn: async () => {
      const { data } = await api.get<BankAccount[] | Paginated<BankAccount>>('/bank-accounts')
      return asItemList(data)
    },
  })
  const feesQuery = useQuery({
    queryKey: ['municipal-fees', 'payment-group', editor?.bankAccountId],
    enabled: Boolean(editor?.bankAccountId),
    queryFn: async () => {
      const { data } = await api.get<MunicipalFee[] | Paginated<MunicipalFee>>('/municipal-fees', {
        params: { bankAccountId: editor?.bankAccountId },
      })
      return asItemList(data)
    },
  })

  const groups = groupsQuery.data ?? []
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return groups
    return groups.filter((group) => {
      const haystack = `${group.title} ${group.bankAccount.bankName} ${group.bankAccount.accountNumber}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [groups, q])

  const accountOptions = (accountsQuery.data ?? []).filter(
    (account) => account.isActive || account.id === editor?.bankAccountId,
  )
  const fees = feesQuery.data ?? []

  async function saveGroup() {
    if (!editor) return
    const title = editor.title.trim()
    if (title.length < 2) {
      toast.error(t('payments.groups.nameRequired'))
      return
    }
    if (!editor.bankAccountId) {
      toast.error(t('payments.groups.accountRequired'))
      return
    }
    if (editor.feeIds.length === 0) {
      toast.error(t('payments.groups.feesRequired'))
      return
    }
    setSaving(true)
    try {
      const payload = {
        title,
        bankAccountId: editor.bankAccountId,
        feeIds: editor.feeIds,
      }
      if (editor.id) {
        await api.patch(`/payment-groups/${editor.id}`, payload)
        toast.success(t('payments.groups.updated'))
      } else {
        await api.post('/payment-groups', payload)
        toast.success(t('payments.groups.created'))
      }
      await queryClient.invalidateQueries({ queryKey: ['payment-groups'] })
      setEditor(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  function toggleFee(id: string, checked: boolean) {
    setEditor((current) => {
      if (!current) return current
      const feeIds = checked
        ? [...current.feeIds, id]
        : current.feeIds.filter((feeId) => feeId !== id)
      return { ...current, feeIds }
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4" data-nested-dialog>
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-ink-900/40"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('payments.groups.title')}
        className="relative z-10 w-full max-w-3xl"
      >
        <FormCard
          icon={Layers}
          title={editor ? (editor.id ? t('payments.groups.edit') : t('payments.groups.create')) : t('payments.groups.title')}
          subtitle={editor ? undefined : t('payments.groups.subtitle')}
          className="flex max-h-[calc(100vh-2rem)] flex-col"
          action={
            <Button type="button" variant="ghost" icon aria-label={t('common.close')} onClick={onClose}>
              <X className="size-4" aria-hidden />
            </Button>
          }
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            {editor ? (
              <AppForm onSubmit={() => void saveGroup()} className={formCardBodyClassName}>
                <FormField icon={Layers} label={t('payments.groups.name')} htmlFor="payment-group-title">
                  <input
                    id="payment-group-title"
                    className={fieldClassName}
                    value={editor.title}
                    onChange={(event) =>
                      setEditor((current) => (current ? { ...current, title: event.target.value } : current))
                    }
                    required
                    minLength={2}
                  />
                </FormField>
                <FormField icon={Landmark} label={t('payments.bankAccount')} htmlFor="payment-group-account">
                  <SearchSelect
                    id="payment-group-account"
                    value={editor.bankAccountId}
                    placeholder={t('payments.selectBankAccount')}
                    onChange={(next) =>
                      setEditor((current) =>
                        current ? { ...current, bankAccountId: next, feeIds: [] } : current,
                      )
                    }
                    options={accountOptions.map((account) => ({
                      value: account.id,
                      label: bankAccountOptionLabel(account, locale, t('geo.inactive')),
                    }))}
                  />
                </FormField>
                <FormField icon={HandCoins} label={t('payments.groups.fees')}>
                  {!editor.bankAccountId ? (
                    <FormEmptyHint>{t('payments.groups.pickAccount')}</FormEmptyHint>
                  ) : feesQuery.isLoading ? null : fees.length === 0 ? (
                    <FormEmptyHint>{t('payments.groups.noAccountFees')}</FormEmptyHint>
                  ) : (
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {fees.map((fee) => (
                        <CheckboxField
                          key={fee.id}
                          checked={editor.feeIds.includes(fee.id)}
                          onChange={(checked) => toggleFee(fee.id, checked)}
                          label={
                            <span className="flex items-center justify-between gap-3">
                              <span>
                                {fee.title}
                                {fee.isActive ? '' : ` (${t('payments.inactiveFee')})`}
                              </span>
                              <span className="shrink-0">{formatFeeAmount(fee.amount, locale)}</span>
                            </span>
                          }
                        />
                      ))}
                    </div>
                  )}
                </FormField>
                <FormActions
                  headerIcons={false}
                  submitLabel={t('payments.groups.save')}
                  cancelLabel={t('common.cancel')}
                  submitting={saving}
                  onCancel={() => setEditor(null)}
                />
              </AppForm>
            ) : (
              <div className="space-y-4 p-5 sm:p-6">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => setEditor({ id: null, title: '', bankAccountId: '', feeIds: [] })}
                  >
                    <Plus className="size-4" aria-hidden />
                    {t('payments.groups.add')}
                  </Button>
                </div>
                <SearchBar
                  autoFocus={false}
                  term={term}
                  onTermChange={setTerm}
                  onSubmit={() => setQ(term.trim())}
                  label={t('payments.groups.search')}
                  placeholder={t('payments.groups.searchPlaceholder')}
                />
                {groupsQuery.isLoading ? null : filtered.length === 0 ? (
                  <FormEmptyHint>
                    {q ? t('payments.groups.noResults') : t('payments.groups.empty')}
                  </FormEmptyHint>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-cream-50 text-ink-700">
                        <tr>
                          <th className="px-4 py-3 text-start">{t('payments.groups.name')}</th>
                          <th className="px-4 py-3 text-start">{t('payments.bankAccount')}</th>
                          <th className="px-4 py-3 text-start">{t('payments.groups.feeCount')}</th>
                          <th className="w-px min-w-max whitespace-nowrap px-4 py-3 text-start">
                            {t('common.actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((group) => (
                          <tr key={group.id} className="border-t border-line">
                            <td className="px-4 py-3">{group.title}</td>
                            <td className="px-4 py-3">
                              {bankAccountOptionLabel(group.bankAccount, locale, t('geo.inactive'))}
                            </td>
                            <td className="px-4 py-3">{formatNumber(group.fees.length, locale)}</td>
                            <td className={actionsColClassName}>
                              <div className="flex flex-nowrap items-center gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  icon
                                  aria-label={t('common.edit')}
                                  title={t('common.edit')}
                                  onClick={() =>
                                    setEditor({
                                      id: group.id,
                                      title: group.title,
                                      bankAccountId: group.bankAccountId,
                                      feeIds: group.fees.map((fee) => fee.id),
                                    })
                                  }
                                >
                                  <Pencil className="size-4" aria-hidden />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  icon
                                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                  aria-label={t('common.delete')}
                                  title={t('common.delete')}
                                  onClick={() =>
                                    confirmDelete({
                                      message: t('payments.groups.confirmDelete'),
                                      successMessage: t('payments.groups.deleted'),
                                      path: `/payment-groups/${group.id}`,
                                      queryKey: ['payment-groups'],
                                    })
                                  }
                                >
                                  <Trash2 className="size-4" aria-hidden />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </FormCard>
      </div>
    </div>,
    document.body,
  )
}
