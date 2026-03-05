import { Test, type TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { db } from '../db'

// DBをモック化
jest.mock('../db', () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
  },
}))

const mockDb = db as jest.Mocked<typeof db>

describe('NotificationsService', () => {
  let service: NotificationsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService],
    }).compile()

    service = module.get<NotificationsService>(NotificationsService)
    jest.clearAllMocks()
  })

  describe('getPendingNotifications', () => {
    it('指定したuserIdの未読通知一覧を返す', async () => {
      const mockResults = [
        { id: '1', jobId: 'job-1', userId: 'user-1', status: 'completed', payload: null, isNotified: false, createdAt: '', updatedAt: '' },
      ]
      const mockChain = { from: jest.fn().mockReturnThis(), where: jest.fn().mockResolvedValue(mockResults) }
      mockDb.select.mockReturnValue(mockChain as any)

      const result = await service.getPendingNotifications('user-1')

      expect(result).toEqual(mockResults)
      expect(mockDb.select).toHaveBeenCalledTimes(1)
    })

    it('未読通知が存在しない場合は空配列を返す', async () => {
      const mockChain = { from: jest.fn().mockReturnThis(), where: jest.fn().mockResolvedValue([]) }
      mockDb.select.mockReturnValue(mockChain as any)

      const result = await service.getPendingNotifications('user-1')

      expect(result).toEqual([])
    })
  })

  describe('markAsNotified', () => {
    it('jobIdが存在する場合はis_notifiedをtrueに更新する', async () => {
      const mockChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: '1' }]),
      }
      mockDb.update.mockReturnValue(mockChain as any)

      await expect(service.markAsNotified('job-1')).resolves.toBeUndefined()
      expect(mockDb.update).toHaveBeenCalledTimes(1)
    })

    it('jobIdが存在しない場合はNotFoundExceptionをスローする', async () => {
      const mockChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      }
      mockDb.update.mockReturnValue(mockChain as any)

      await expect(service.markAsNotified('non-existent')).rejects.toThrow(NotFoundException)
    })
  })
})