import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, TypeOrmHealthIndicator, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    // Use higher memory thresholds for test environments
    const isTest = process.env.NODE_ENV === 'test';
    const heapThreshold = isTest ? 1000 * 1024 * 1024 : 150 * 1024 * 1024; // 1GB for tests, 150MB for prod
    const rssThreshold = isTest ? 1000 * 1024 * 1024 : 150 * 1024 * 1024;

    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', heapThreshold),
      () => this.memory.checkRSS('memory_rss', rssThreshold),
      () => this.disk.checkStorage('storage', { thresholdPercent: 0.9, path: '/' }),
    ]);
  }

  @Get('/ready')
  @HealthCheck()
  readiness() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }

  @Get('/live')
  @HealthCheck()
  liveness() {
    const isTest = process.env.NODE_ENV === 'test';
    const heapThreshold = isTest ? 1000 * 1024 * 1024 : 200 * 1024 * 1024;

    return this.health.check([() => this.memory.checkHeap('memory_heap', heapThreshold)]);
  }
}
