import { Test, type TestingModule } from '@nestjs/testing'
import { MockService } from './mock.service'
import { RedisService } from '../redis/redis.service'
import { db } from '../db'

// DBをモック化
jest.mock('../db', () => ({
  db: { insert: jest.fn() },
}))

const mockDb = db as jest.Mocked<typeof db>

const mockRedisService = {
  publish: jest.fn(),
}

describe('MockService', () => {
  let service: MockService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockService,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile()

    service = module.get<MockService>(MockService)
    jest.clearAllMocks()
  })

  describe('triggerJob', () => {
    const dto = { jobId: 'job-1', userId: 'user-1', result: { message: '完了' } }

    it('job_resultsテーブルにレコードをINSERTする', async () => {
      const mockChain = { values: jest.fn().mockResolvedValue(undefined) }
      mockDb.insert.mockReturnValue(mockChain as any)
      mockRedisService.publish.mockResolvedValue(undefined)

      await service.triggerJob(dto)

      expect(mockDb.insert).toHaveBeenCalledTimes(1)
      expect(mockChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job-1',
          userId: 'user-1',
          status: 'completed',
          isNotified: false,
        }),
      )
    })

    it('Redisのjob:completedチャンネルへPUBLISHする', async () => {
      const mockChain = { values: jest.fn().mockResolvedValue(undefined) }
      mockDb.insert.mockReturnValue(mockChain as any)
      mockRedisService.publish.mockResolvedValue(undefined)

      await service.triggerJob(dto)

      expect(mockRedisService.publish).toHaveBeenCalledWith(
        'job:completed',
        expect.stringContaining('"jobId":"job-1"'),
      )
    })

    it('DBのINSERTが失敗した場合はRedis PUBLISHを実行しない', async () => {
      const mockChain = { values: jest.fn().mockRejectedValue(new Error('DB error')) }
      mockDb.insert.mockReturnValue(mockChain as any)

      await expect(service.triggerJob(dto)).rejects.toThrow('DB error')
      expect(mockRedisService.publish).not.toHaveBeenCalled()
    })
  })
})