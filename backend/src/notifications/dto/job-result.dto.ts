export class JobResultDto {
  id!: string
  jobId!: string
  userId!: string
  status!: 'processing' | 'completed' | 'failed'
  payload!: string | null
  isNotified!: boolean
  createdAt!: string
  updatedAt!: string
}
