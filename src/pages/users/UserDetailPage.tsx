import {
  Briefcase,
  Building2,
  Calendar,
  Car,
  FileImage,
  FileText,
  Flag,
  IdCard,
  ImagePlus,
  KeyRound,
  Languages,
  LocateFixed,
  Mail,
  MapPin,
  MapPinned,
  MessageCircle,
  Phone,
  Share2,
  Shield,
  ToggleRight,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { OpenUserPanelButton } from '../../components/auth/OpenUserPanelButton'
import {
  DetailActions,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  userFormShellClassName,
} from '../../components/ui/Form'
import { DateText } from '../../components/ui/DateText'
import { RoleBadges } from '../../components/ui/RoleBadges'
import { OsmMapPicker } from '../../components/ui/OsmMapPicker'
import {
  FormCard,
  FormFactTile,
  FormSectionTitle,
  formToneClass,
  type FormTone,
} from '../../components/ui/FormLayout'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { languages, type AppLanguage } from '../../i18n'
import { api, getImageUrl } from '../../lib/api'
import { localizeDigits } from '../../lib/datetime'
import { useGeoName } from '../../lib/geo'
import type { ManagedUser } from '../../types/app'

const tabs = ['personal', 'account', 'location', 'documents', 'social', 'other'] as const
type UserDetailTab = (typeof tabs)[number]

const tabIcons: Record<UserDetailTab, LucideIcon> = {
  personal: UserRound,
  account: KeyRound,
  location: MapPin,
  documents: ImagePlus,
  social: Share2,
  other: FileText,
}

export function UserDetailPage() {
  const { t, i18n } = useTranslation()
  const uiLocale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const geoName = useGeoName()
  const { confirmDelete } = useConfirmDelete()
  const [tab, setTab] = useState<UserDetailTab>('personal')
  const query = useQuery({
    queryKey: ['user', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<ManagedUser>(`/users/${id}`)
      return data
    },
  })

  const user = query.data
  if (!user) {
    return <LoadingState />
  }

  const empty = '—'
  const locale = user.locale as AppLanguage
  const religionLabel = user.religion
    ? user.religion === 'OTHER' && user.religionOther
      ? `${t(`religions.${user.religion}`)} (${user.religionOther})`
      : t(`religions.${user.religion}`)
    : empty

  return (
    <div className={userFormShellClassName}>
      <PageHeader
        icon={UserRound}
        title={t('users.details')}
        subtitle={<EntityNameSubtitle name={user.fullName} icon={UserRound} />}
      />
      <FormCard
        icon={UserRound}
        title={user.fullName}
        action={<OpenUserPanelButton userId={user.id} status={user.status} />}
      >
        <nav className="flex flex-wrap gap-2 border-b border-line bg-cream-50/60 px-4 py-3 sm:px-5">
          {tabs.map((item) => {
            const Icon = tabIcons[item]
            const active = tab === item
            return (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]'
                    : 'bg-white text-ink-700 ring-1 ring-line hover:bg-cream-50'
                }`}
              >
                <Icon className={`size-3.5 ${active ? 'text-white' : 'text-teal-600'}`} aria-hidden />
                {t(`users.tabs.${item}`)}
              </button>
            )
          })}
        </nav>

        <div className="space-y-6 p-5 sm:p-6">
          {tab === 'personal' ? (
            <section>
              <FormSectionTitle icon={UserRound}>{t('users.tabs.personal')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile icon={UserRound} label={t('users.firstName')} value={user.firstName} tone="teal" />
                <FormFactTile icon={UserRound} label={t('users.lastName')} value={user.lastName} tone="mint" />
                <FormFactTile
                  icon={UserRound}
                  label={t('users.gender')}
                  value={user.gender ? t(`userGenders.${user.gender}`) : empty}
                  empty={!user.gender}
                  tone="ink"
                />
                <FormFactTile icon={IdCard} label={t('users.nationalId')} copyValue={user.nationalId} tone="teal" />
                <FormFactTile icon={Phone} label={t('users.phone')} copyValue={user.phone} tone="mint" />
                <FormFactTile
                  icon={Building2}
                  label={t('users.orgUnit')}
                  value={user.workUnit?.title || empty}
                  empty={!user.workUnit}
                  tone="teal"
                />
                <FormFactTile
                  icon={Briefcase}
                  label={t('users.position')}
                  value={user.staffPost?.title || empty}
                  empty={!user.staffPost}
                  tone="mint"
                />
                <FormFactTile
                  icon={Share2}
                  label={t('users.religion')}
                  value={religionLabel}
                  empty={!user.religion}
                  tone="ink"
                />
              </div>
            </section>
          ) : null}

          {tab === 'account' ? (
            <section>
              <FormSectionTitle icon={KeyRound}>{t('users.tabs.account')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile
                  icon={UserRound}
                  label={t('users.username')}
                  value={localizeDigits(user.username, uiLocale)}
                  tone="teal"
                />
                <FormFactTile
                  icon={Languages}
                  label={t('users.locale')}
                  value={languages[locale] ? t(`languages.${locale}`) : user.locale}
                  tone="mint"
                />
                <FormFactTile
                  icon={Calendar}
                  label={t('users.createdAt')}
                  value={<DateText value={user.createdAt} withTime />}
                  tone="ink"
                />
                <FormFactTile
                  icon={Calendar}
                  label={t('users.updatedAt')}
                  value={<DateText value={user.updatedAt} withTime />}
                  tone="teal"
                />
                <FormFactTile
                  icon={Shield}
                  label={t('users.roles')}
                  value={user.roles?.length ? <RoleBadges roles={user.roles} /> : empty}
                  empty={!user.roles?.length}
                  className="sm:col-span-2"
                />
              </div>
            </section>
          ) : null}

          {tab === 'location' ? (
            <section>
              <FormSectionTitle icon={MapPin}>{t('users.tabs.location')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile
                  icon={Flag}
                  label={t('geo.country')}
                  value={user.country ? geoName(user.country) : empty}
                  empty={!user.country}
                  tone="teal"
                />
                <FormFactTile
                  icon={MapPin}
                  label={t('geo.province')}
                  value={user.province ? geoName(user.province) : empty}
                  empty={!user.province}
                  tone="mint"
                />
                <FormFactTile
                  icon={Building2}
                  label={t('geo.city')}
                  value={user.city ? geoName(user.city) : empty}
                  empty={!user.city}
                  tone="ink"
                />
                <FormFactTile
                  icon={MapPinned}
                  label={t('users.address')}
                  value={user.address || empty}
                  empty={!user.address}
                  tone="teal"
                  className="sm:col-span-2"
                />
              </div>
              <FormSectionTitle icon={LocateFixed} className="mb-2.5 mt-6">
                {t('location.title')}
              </FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile
                  icon={MapPinned}
                  label={t('geo.province')}
                  value={user.locationProvince ? geoName(user.locationProvince) : empty}
                  empty={!user.locationProvince}
                  tone="teal"
                />
                <FormFactTile
                  icon={Building2}
                  label={t('geo.city')}
                  value={user.locationCity ? geoName(user.locationCity) : empty}
                  empty={!user.locationCity}
                  tone="mint"
                />
                <FormFactTile
                  icon={MapPinned}
                  label={t('location.notes')}
                  value={user.locationNotes || empty}
                  empty={!user.locationNotes}
                  tone="ink"
                  className="sm:col-span-2"
                />
              </div>
              {user.latitude != null && user.longitude != null ? (
                <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-teal-100">
                  <OsmMapPicker
                    variant="always"
                    readOnly
                    latitude={String(user.latitude)}
                    longitude={String(user.longitude)}
                    onChange={() => undefined}
                    heightClass="h-56"
                  />
                </div>
              ) : null}
              {user.locationUpdatedAt ? (
                <p className="mt-2 text-xs text-ink-400">
                  {t('location.updatedAt')}
                  {' · '}
                  <DateText value={user.locationUpdatedAt} withTime />
                </p>
              ) : null}
            </section>
          ) : null}

          {tab === 'documents' ? (
            <section>
              <FormSectionTitle icon={ImagePlus}>{t('users.tabs.documents')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <DocumentTile icon={UserRound} label={t('users.photo')} imageId={user.photoId} tone="teal" />
                <DocumentTile
                  icon={IdCard}
                  label={t('users.nationalCardPhoto')}
                  imageId={user.nationalCardPhotoId}
                  tone="mint"
                />
                <DocumentTile
                  icon={FileImage}
                  label={t('users.passportPhoto')}
                  imageId={user.passportPhotoId}
                  tone="ink"
                />
                <DocumentTile
                  icon={FileText}
                  label={t('users.identityBookletPhoto')}
                  imageId={user.identityBookletPhotoId}
                  tone="teal"
                />
              </div>
            </section>
          ) : null}

          {tab === 'social' ? (
            <section>
              <FormSectionTitle icon={Share2}>{t('users.tabs.social')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile icon={Share2} label={t('users.telegram')} value={user.telegram || empty} empty={!user.telegram} tone="teal" />
                <FormFactTile icon={MessageCircle} label={t('users.bale')} value={user.bale || empty} empty={!user.bale} tone="mint" />
                <FormFactTile icon={MessageCircle} label={t('users.eitaa')} value={user.eitaa || empty} empty={!user.eitaa} tone="ink" />
                <FormFactTile icon={Phone} label={t('users.whatsapp')} value={user.whatsapp || empty} empty={!user.whatsapp} tone="teal" />
                <FormFactTile
                  icon={Share2}
                  label={t('users.otherSocial')}
                  value={user.otherSocial || empty}
                  empty={!user.otherSocial}
                  tone="mint"
                  className="sm:col-span-2"
                />
              </div>
            </section>
          ) : null}

          {tab === 'other' ? (
            <section>
              <FormSectionTitle icon={FileText}>{t('users.tabs.other')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile icon={Mail} label={t('users.email')} value={user.email || empty} empty={!user.email} tone="teal" />
                <FormFactTile
                  icon={ToggleRight}
                  label={t('users.status')}
                  value={t(`userStatuses.${user.status}`)}
                  tone="mint"
                />
                <FormFactTile
                  icon={Car}
                  label={t('users.vehiclePlates')}
                  value={user.vehiclePlates.length ? user.vehiclePlates.join('، ') : empty}
                  empty={!user.vehiclePlates.length}
                  tone="ink"
                  className="sm:col-span-2"
                />
                <FormFactTile
                  icon={FileText}
                  label={t('users.notes')}
                  value={user.notes ? <span className="whitespace-pre-wrap">{user.notes}</span> : empty}
                  empty={!user.notes}
                  tone="teal"
                  className="sm:col-span-2"
                />
              </div>
            </section>
          ) : null}

          <DetailActions
            editTo={`/users/${user.id}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('users.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('users.confirmDelete'),
                successMessage: t('users.deleted'),
                path: `/users/${user.id}`,
                queryKey: ['users'],
                onDeleted: () => navigate('/users'),
              })
            }
            extraItems={[
              {
                to: `/users/${user.id}/location`,
                icon: MapPin,
                label: t('location.register'),
              },
            ]}
          />
        </div>
      </FormCard>
    </div>
  )
}

function DocumentTile({
  icon: Icon,
  label,
  imageId,
  tone,
}: {
  icon: LucideIcon
  label: string
  imageId?: string | null
  tone: FormTone
}) {
  const colors = formToneClass[tone]
  return (
    <article className={`rounded-2xl border px-3 py-3 ${colors.wrap}`}>
      <div className="mb-2.5 flex items-center gap-2">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${colors.icon}`}>
          <Icon className="size-4" aria-hidden />
        </span>
        <p className="text-xs font-semibold text-ink-700">{label}</p>
      </div>
      {imageId ? (
        <a href={getImageUrl(imageId)} target="_blank" rel="noreferrer">
          <img src={getImageUrl(imageId)} alt="" className="h-28 w-full rounded-xl object-cover ring-1 ring-white/80" />
        </a>
      ) : (
        <p className="rounded-xl border border-dashed border-line bg-white/70 px-3 py-8 text-center text-xs text-ink-400">
          —
        </p>
      )}
    </article>
  )
}
