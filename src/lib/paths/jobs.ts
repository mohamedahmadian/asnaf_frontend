export const jobsCatalogPath = () => '/base-info/jobs'
export const jobCatalogNewPath = () => `${jobsCatalogPath()}/new`
export const jobCatalogPath = (id: string) => `${jobsCatalogPath()}/${id}`
export const jobCatalogEditPath = (id: string) => `${jobCatalogPath(id)}/edit`

export const jobsCatalogApi = () => '/jobs'
export const jobCatalogApi = (id: string) => `${jobsCatalogApi()}/${id}`
