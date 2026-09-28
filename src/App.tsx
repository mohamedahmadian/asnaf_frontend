import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './auth/AuthProvider'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { useSelectNumberOnFocus } from './hooks/useSelectNumberOnFocus'
import { languages, type AppLanguage } from './i18n'
import { NavigationHistoryProvider } from './lib/navigation-history'
import { AccountPage } from './pages/AccountPage'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ImpersonateEndedPage } from './pages/ImpersonateEndedPage'
import { ImpersonateEntryPage } from './pages/ImpersonateEntryPage'
import { LoginPage } from './pages/LoginPage'
import { SettingsPage } from './pages/SettingsPage'
import { CitiesListPage } from './pages/geo/CitiesListPage'
import { CityCreatePage } from './pages/geo/CityCreatePage'
import { CityDetailPage } from './pages/geo/CityDetailPage'
import { CityEditPage } from './pages/geo/CityEditPage'
import { BankAccountCreatePage } from './pages/bank-accounts/BankAccountCreatePage'
import { BankAccountDetailPage } from './pages/bank-accounts/BankAccountDetailPage'
import { BankAccountEditPage } from './pages/bank-accounts/BankAccountEditPage'
import { BankAccountsListPage } from './pages/bank-accounts/BankAccountsListPage'
import { DiscountCreatePage } from './pages/discounts/DiscountCreatePage'
import { DiscountDetailPage } from './pages/discounts/DiscountDetailPage'
import { DiscountEditPage } from './pages/discounts/DiscountEditPage'
import { DiscountsListPage } from './pages/discounts/DiscountsListPage'
import { MunicipalFeeCreatePage } from './pages/municipal-fees/MunicipalFeeCreatePage'
import { MunicipalFeeDetailPage } from './pages/municipal-fees/MunicipalFeeDetailPage'
import { MunicipalFeeEditPage } from './pages/municipal-fees/MunicipalFeeEditPage'
import { MunicipalFeesListPage } from './pages/municipal-fees/MunicipalFeesListPage'
import { DocumentCreatePage } from './pages/documents/DocumentCreatePage'
import { DocumentDetailPage } from './pages/documents/DocumentDetailPage'
import { DocumentEditPage } from './pages/documents/DocumentEditPage'
import { DocumentsListPage } from './pages/documents/DocumentsListPage'
import { StaffPostCreatePage } from './pages/staff-posts/StaffPostCreatePage'
import { StaffPostDetailPage } from './pages/staff-posts/StaffPostDetailPage'
import { StaffPostEditPage } from './pages/staff-posts/StaffPostEditPage'
import { StaffPostsListPage } from './pages/staff-posts/StaffPostsListPage'
import { ViolationTypeCreatePage } from './pages/violation-types/ViolationTypeCreatePage'
import { ViolationTypeDetailPage } from './pages/violation-types/ViolationTypeDetailPage'
import { ViolationTypeEditPage } from './pages/violation-types/ViolationTypeEditPage'
import { ViolationTypesListPage } from './pages/violation-types/ViolationTypesListPage'
import { WorkUnitCreatePage } from './pages/work-units/WorkUnitCreatePage'
import { WorkUnitDetailPage } from './pages/work-units/WorkUnitDetailPage'
import { WorkUnitEditPage } from './pages/work-units/WorkUnitEditPage'
import { WorkUnitsListPage } from './pages/work-units/WorkUnitsListPage'
import { InquiryCenterCreatePage } from './pages/inquiry-centers/InquiryCenterCreatePage'
import { InquiryCenterDetailPage } from './pages/inquiry-centers/InquiryCenterDetailPage'
import { InquiryCenterEditPage } from './pages/inquiry-centers/InquiryCenterEditPage'
import { InquiryCentersListPage } from './pages/inquiry-centers/InquiryCentersListPage'
import { JobCreatePage } from './pages/job-groups/JobCreatePage'
import { JobDetailPage } from './pages/job-groups/JobDetailPage'
import { JobEditPage } from './pages/job-groups/JobEditPage'
import { JobGroupCreatePage } from './pages/job-groups/JobGroupCreatePage'
import { JobGroupDetailPage } from './pages/job-groups/JobGroupDetailPage'
import { JobGroupEditPage } from './pages/job-groups/JobGroupEditPage'
import { JobGroupsListPage } from './pages/job-groups/JobGroupsListPage'
import { JobsListPage } from './pages/job-groups/JobsListPage'
import { JobCatalogCreatePage } from './pages/jobs/JobCatalogCreatePage'
import { JobCatalogDetailPage } from './pages/jobs/JobCatalogDetailPage'
import { JobCatalogEditPage } from './pages/jobs/JobCatalogEditPage'
import { JobsCatalogListPage } from './pages/jobs/JobsCatalogListPage'
import { RegistrationPlaceCreatePage } from './pages/registration-places/RegistrationPlaceCreatePage'
import { RegistrationPlaceDetailPage } from './pages/registration-places/RegistrationPlaceDetailPage'
import { RegistrationPlaceEditPage } from './pages/registration-places/RegistrationPlaceEditPage'
import { RegistrationPlacesListPage } from './pages/registration-places/RegistrationPlacesListPage'
import { JobTypeCreatePage } from './pages/job-types/JobTypeCreatePage'
import { JobTypeDetailPage } from './pages/job-types/JobTypeDetailPage'
import { JobTypeEditPage } from './pages/job-types/JobTypeEditPage'
import { JobTypesListPage } from './pages/job-types/JobTypesListPage'
import { CommercialComplexCreatePage } from './pages/commercial-complexes/CommercialComplexCreatePage'
import { CommercialComplexDetailPage } from './pages/commercial-complexes/CommercialComplexDetailPage'
import { CommercialComplexEditPage } from './pages/commercial-complexes/CommercialComplexEditPage'
import { CommercialComplexesListPage } from './pages/commercial-complexes/CommercialComplexesListPage'
import { CommercialFloorCreatePage } from './pages/commercial-complexes/CommercialFloorCreatePage'
import { CommercialFloorDetailPage } from './pages/commercial-complexes/CommercialFloorDetailPage'
import { CommercialFloorEditPage } from './pages/commercial-complexes/CommercialFloorEditPage'
import { CommercialFloorsListPage } from './pages/commercial-complexes/CommercialFloorsListPage'
import { CommercialLaneCreatePage } from './pages/commercial-complexes/CommercialLaneCreatePage'
import { CommercialLaneDetailPage } from './pages/commercial-complexes/CommercialLaneDetailPage'
import { CommercialLaneEditPage } from './pages/commercial-complexes/CommercialLaneEditPage'
import { CommercialLanesListPage } from './pages/commercial-complexes/CommercialLanesListPage'
import { CommercialUnitCreatePage } from './pages/commercial-complexes/CommercialUnitCreatePage'
import { CommercialUnitDetailPage } from './pages/commercial-complexes/CommercialUnitDetailPage'
import { CommercialUnitEditPage } from './pages/commercial-complexes/CommercialUnitEditPage'
import { CommercialUnitsListPage } from './pages/commercial-complexes/CommercialUnitsListPage'
import { CountriesListPage } from './pages/geo/CountriesListPage'
import { CountryCreatePage } from './pages/geo/CountryCreatePage'
import { CountryDetailPage } from './pages/geo/CountryDetailPage'
import { CountryEditPage } from './pages/geo/CountryEditPage'
import { ProvinceCreatePage } from './pages/geo/ProvinceCreatePage'
import { ProvinceDetailPage } from './pages/geo/ProvinceDetailPage'
import { ProvinceEditPage } from './pages/geo/ProvinceEditPage'
import { ProvincesListPage } from './pages/geo/ProvincesListPage'
import { RoleCreatePage } from './pages/roles/RoleCreatePage'
import { RoleDetailPage } from './pages/roles/RoleDetailPage'
import { RoleEditPage } from './pages/roles/RoleEditPage'
import { RolesListPage } from './pages/roles/RolesListPage'
import { UserCreatePage } from './pages/users/UserCreatePage'
import { UserDetailPage } from './pages/users/UserDetailPage'
import { UserEditPage } from './pages/users/UserEditPage'
import { UserLocationHistoryPage } from './pages/users/UserLocationHistoryPage'
import { UserLocationPage } from './pages/users/UserLocationPage'
import { UsersListPage } from './pages/users/UsersListPage'
import { ProtectedRoute } from './routes/ProtectedRoute'

const queryClient = new QueryClient()

function AppToaster() {
  const { i18n } = useTranslation()
  const lang = (i18n.language.split('-')[0] as AppLanguage) || 'fa'
  return (
    <Toaster
      richColors
      position="bottom-center"
      className="app-toaster"
      swipeDirections={['bottom', 'left', 'right']}
      dir={languages[lang]?.dir ?? 'rtl'}
    />
  )
}

export default function App() {
  useSelectNumberOnFocus()

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <NavigationHistoryProvider>
            <AppToaster />
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/impersonate" element={<ImpersonateEntryPage />} />
              <Route path="/impersonate-ended" element={<ImpersonateEndedPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/settings/password" element={<ChangePasswordPage />} />
                  <Route path="/users" element={<UsersListPage />} />
                  <Route path="/users/new" element={<UserCreatePage />} />
                  <Route path="/users/:id" element={<UserDetailPage />} />
                  <Route path="/users/:id/edit" element={<UserEditPage />} />
                  <Route path="/users/:id/location" element={<UserLocationPage />} />
                  <Route path="/users/:id/location/history" element={<UserLocationHistoryPage />} />
                  <Route path="/base-info/countries" element={<CountriesListPage />} />
                  <Route path="/base-info/countries/new" element={<CountryCreatePage />} />
                  <Route path="/base-info/countries/:id" element={<CountryDetailPage />} />
                  <Route path="/base-info/countries/:id/edit" element={<CountryEditPage />} />
                  <Route path="/base-info/provinces" element={<ProvincesListPage />} />
                  <Route path="/base-info/provinces/new" element={<ProvinceCreatePage />} />
                  <Route path="/base-info/provinces/:id" element={<ProvinceDetailPage />} />
                  <Route path="/base-info/provinces/:id/edit" element={<ProvinceEditPage />} />
                  <Route path="/base-info/cities" element={<CitiesListPage />} />
                  <Route path="/base-info/cities/new" element={<CityCreatePage />} />
                  <Route path="/base-info/cities/:id" element={<CityDetailPage />} />
                  <Route path="/base-info/cities/:id/edit" element={<CityEditPage />} />
                  <Route path="/base-info/commercial-complexes" element={<CommercialComplexesListPage />} />
                  <Route path="/base-info/commercial-complexes/new" element={<CommercialComplexCreatePage />} />
                  <Route path="/base-info/commercial-complexes/:complexId" element={<CommercialComplexDetailPage />} />
                  <Route path="/base-info/commercial-complexes/:complexId/edit" element={<CommercialComplexEditPage />} />
                  <Route path="/base-info/commercial-complexes/:complexId/floors" element={<CommercialFloorsListPage />} />
                  <Route path="/base-info/commercial-complexes/:complexId/floors/new" element={<CommercialFloorCreatePage />} />
                  <Route path="/base-info/commercial-complexes/:complexId/floors/:floorId" element={<CommercialFloorDetailPage />} />
                  <Route path="/base-info/commercial-complexes/:complexId/floors/:floorId/edit" element={<CommercialFloorEditPage />} />
                  <Route path="/base-info/commercial-complexes/:complexId/floors/:floorId/lanes" element={<CommercialLanesListPage />} />
                  <Route path="/base-info/commercial-complexes/:complexId/floors/:floorId/lanes/new" element={<CommercialLaneCreatePage />} />
                  <Route path="/base-info/commercial-complexes/:complexId/floors/:floorId/lanes/:laneId" element={<CommercialLaneDetailPage />} />
                  <Route path="/base-info/commercial-complexes/:complexId/floors/:floorId/lanes/:laneId/edit" element={<CommercialLaneEditPage />} />
                  <Route path="/base-info/commercial-complexes/:complexId/floors/:floorId/lanes/:laneId/units" element={<CommercialUnitsListPage />} />
                  <Route path="/base-info/commercial-complexes/:complexId/floors/:floorId/lanes/:laneId/units/new" element={<CommercialUnitCreatePage />} />
                  <Route path="/base-info/commercial-complexes/:complexId/floors/:floorId/lanes/:laneId/units/:unitId" element={<CommercialUnitDetailPage />} />
                  <Route path="/base-info/commercial-complexes/:complexId/floors/:floorId/lanes/:laneId/units/:unitId/edit" element={<CommercialUnitEditPage />} />
                  <Route path="/base-info/bank-accounts" element={<BankAccountsListPage />} />
                  <Route path="/base-info/bank-accounts/new" element={<BankAccountCreatePage />} />
                  <Route path="/base-info/bank-accounts/:id" element={<BankAccountDetailPage />} />
                  <Route path="/base-info/bank-accounts/:id/edit" element={<BankAccountEditPage />} />
                  <Route path="/base-info/discounts" element={<DiscountsListPage />} />
                  <Route path="/base-info/discounts/new" element={<DiscountCreatePage />} />
                  <Route path="/base-info/discounts/:id" element={<DiscountDetailPage />} />
                  <Route path="/base-info/discounts/:id/edit" element={<DiscountEditPage />} />
                  <Route path="/base-info/municipal-fees" element={<MunicipalFeesListPage />} />
                  <Route path="/base-info/municipal-fees/new" element={<MunicipalFeeCreatePage />} />
                  <Route path="/base-info/municipal-fees/:id" element={<MunicipalFeeDetailPage />} />
                  <Route path="/base-info/municipal-fees/:id/edit" element={<MunicipalFeeEditPage />} />
                  <Route path="/base-info/job-types" element={<JobTypesListPage />} />
                  <Route path="/base-info/job-types/new" element={<JobTypeCreatePage />} />
                  <Route path="/base-info/job-types/:id" element={<JobTypeDetailPage />} />
                  <Route path="/base-info/job-types/:id/edit" element={<JobTypeEditPage />} />
                  <Route path="/base-info/inquiry-centers" element={<InquiryCentersListPage />} />
                  <Route path="/base-info/inquiry-centers/new" element={<InquiryCenterCreatePage />} />
                  <Route path="/base-info/inquiry-centers/:id" element={<InquiryCenterDetailPage />} />
                  <Route path="/base-info/inquiry-centers/:id/edit" element={<InquiryCenterEditPage />} />
                  <Route path="/base-info/jobs" element={<JobsCatalogListPage />} />
                  <Route path="/base-info/jobs/new" element={<JobCatalogCreatePage />} />
                  <Route path="/base-info/jobs/:id" element={<JobCatalogDetailPage />} />
                  <Route path="/base-info/jobs/:id/edit" element={<JobCatalogEditPage />} />
                  <Route path="/base-info/registration-places" element={<RegistrationPlacesListPage />} />
                  <Route path="/base-info/registration-places/new" element={<RegistrationPlaceCreatePage />} />
                  <Route path="/base-info/registration-places/:id" element={<RegistrationPlaceDetailPage />} />
                  <Route path="/base-info/registration-places/:id/edit" element={<RegistrationPlaceEditPage />} />
                  <Route path="/base-info/job-groups" element={<JobGroupsListPage />} />
                  <Route path="/base-info/job-groups/new" element={<JobGroupCreatePage />} />
                  <Route path="/base-info/job-groups/:id" element={<JobGroupDetailPage />} />
                  <Route path="/base-info/job-groups/:id/edit" element={<JobGroupEditPage />} />
                  <Route path="/base-info/job-groups/:groupId/jobs" element={<JobsListPage />} />
                  <Route path="/base-info/job-groups/:groupId/jobs/new" element={<JobCreatePage />} />
                  <Route path="/base-info/job-groups/:groupId/jobs/:jobId" element={<JobDetailPage />} />
                  <Route path="/base-info/job-groups/:groupId/jobs/:jobId/edit" element={<JobEditPage />} />
                  <Route path="/base-info/documents" element={<DocumentsListPage />} />
                  <Route path="/base-info/documents/new" element={<DocumentCreatePage />} />
                  <Route path="/base-info/documents/:id" element={<DocumentDetailPage />} />
                  <Route path="/base-info/documents/:id/edit" element={<DocumentEditPage />} />
                  <Route path="/base-info/work-units" element={<WorkUnitsListPage />} />
                  <Route path="/base-info/work-units/new" element={<WorkUnitCreatePage />} />
                  <Route path="/base-info/work-units/:id" element={<WorkUnitDetailPage />} />
                  <Route path="/base-info/work-units/:id/edit" element={<WorkUnitEditPage />} />
                  <Route path="/base-info/staff-posts" element={<StaffPostsListPage />} />
                  <Route path="/base-info/staff-posts/new" element={<StaffPostCreatePage />} />
                  <Route path="/base-info/staff-posts/:id" element={<StaffPostDetailPage />} />
                  <Route path="/base-info/staff-posts/:id/edit" element={<StaffPostEditPage />} />
                  <Route path="/inspection/violation-types" element={<ViolationTypesListPage />} />
                  <Route path="/inspection/violation-types/new" element={<ViolationTypeCreatePage />} />
                  <Route path="/inspection/violation-types/:id" element={<ViolationTypeDetailPage />} />
                  <Route path="/inspection/violation-types/:id/edit" element={<ViolationTypeEditPage />} />
                  <Route path="/base-info/roles" element={<RolesListPage />} />
                  <Route path="/base-info/roles/new" element={<RoleCreatePage />} />
                  <Route path="/base-info/roles/:id" element={<RoleDetailPage />} />
                  <Route path="/base-info/roles/:id/edit" element={<RoleEditPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </NavigationHistoryProvider>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
