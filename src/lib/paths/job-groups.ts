export const jobGroupsPath = () => '/base-info/job-groups'
export const jobGroupNewPath = () => `${jobGroupsPath()}/new`
export const jobGroupPath = (groupId: string) => `${jobGroupsPath()}/${groupId}`
export const jobGroupEditPath = (groupId: string) => `${jobGroupPath(groupId)}/edit`

export const jobsPath = (groupId: string) => `${jobGroupPath(groupId)}/jobs`
export const jobNewPath = (groupId: string) => `${jobsPath(groupId)}/new`
export const jobPath = (groupId: string, jobId: string) => `${jobsPath(groupId)}/${jobId}`
export const jobEditPath = (groupId: string, jobId: string) => `${jobPath(groupId, jobId)}/edit`

export const jobGroupsApi = () => '/job-groups'
export const jobGroupApi = (groupId: string) => `${jobGroupsApi()}/${groupId}`
export const jobGroupRepresentativesApi = (groupId: string) =>
  `${jobGroupApi(groupId)}/representatives`
export const jobGroupRepresentativeApi = (groupId: string, userId: string) =>
  `${jobGroupRepresentativesApi(groupId)}/${userId}`
export const jobsApi = (groupId: string) => `${jobGroupApi(groupId)}/jobs`
export const jobApi = (groupId: string, jobId: string) => `${jobsApi(groupId)}/${jobId}`
export const jobGroupJobMembershipApi = (groupId: string, jobId: string) =>
  `${jobApi(groupId, jobId)}/membership`
