import { Test, type TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'
import type { JobResultDto } from './dto/job-result.dto'

// DBモジュールをモック化（better-sqlite3の実DB接続を防ぐ）
jest.mock('../db', () => ({ db: {} }))

const mockNotificationsService = {
  getPendingNotifications: jest.fn(),
  markAsNotified: jest.fn(),
}

describe('NotificationsController', () => {
  let controller: NotificationsController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: mockNotificationsService }],
    }).compile()

    controller = module.get<NotificationsController>(NotificationsController)
    jest.clearAllMocks()
  })

  describe('GET /notifications/pending', () => {
    it('userIdに紐づく未読通知一覧を返す', async () => {
      const mockData: JobResultDto[] = [
        { id: '1', jobId: 'job-1', userId: 'user-1', status: 'completed', payload: null, isNotified: false, createdAt: '', updatedAt: '' },
      ]
      mockNotificationsService.getPendingNotifications.mockResolvedValue(mockData)

      const result = await controller.getPending('user-1')

      expect(result).toEqual(mockData)
      expect(mockNotificationsService.getPendingNotifications).toHaveBeenCalledWith('user-1')
    })
  })

  describe('POST /notifications/:jobId/read', () => {
    it('既存のjobIdを指定した場合は正常終了する', async () => {
      mockNotificationsService.markAsNotified.mockResolvedValue(undefined)

      await expect(controller.markAsRead('job-1')).resolves.toBeUndefined()
      expect(mockNotificationsService.markAsNotified).toHaveBeenCalledWith('job-1')
    })

    it('存在しないjobIdを指定した場合はNotFoundExceptionをスローする', async () => {
      mockNotificationsService.markAsNotified.mockRejectedValue(new NotFoundException())

      await expect(controller.markAsRead('non-existent')).rejects.toThrow(NotFoundException)
    })
  })
})