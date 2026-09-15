import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { DataSource } from 'typeorm';

@Injectable()
export class AdminDashboardService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private dataSource: DataSource,
  ) { }

  async getStats() {
    const cacheKey = 'admin:dashboard:stats';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const [
      totalUsers,
      totalDonorProfiles,
      totalRequests,
      requestStatuses,
      requestsToday,
      requestsThisWeek,
      availableDonorsByGroup,
      pendingReports
    ] = await Promise.all([
      this.dataSource.query(`SELECT COUNT(*) as count FROM users`),
      this.dataSource.query(`SELECT COUNT(*) as count FROM donor_profiles`),
      this.dataSource.query(`SELECT COUNT(*) as count FROM requests`),
      this.dataSource.query(`SELECT status, COUNT(*) as count FROM requests GROUP BY status`),
      this.dataSource.query(`SELECT COUNT(*) as count FROM requests WHERE created_at >= CURRENT_DATE`),
      this.dataSource.query(`SELECT COUNT(*) as count FROM requests WHERE created_at >= date_trunc('week', CURRENT_DATE)`),
      this.dataSource.query(`SELECT blood_group, COUNT(*) as count FROM donor_profiles WHERE is_available = true GROUP BY blood_group`),
      this.dataSource.query(`SELECT COUNT(*) as count FROM reports WHERE status = 'PENDING'`),
    ]);

    let redisReachable = false;
    try {
      await this.cacheManager.set('redis_health', 'ok', 1000);
      redisReachable = await this.cacheManager.get('redis_health') === 'ok';
    } catch (e) {
      // ignore
    }

    let dbReachable = false;
    try {
      await this.dataSource.query('SELECT 1');
      dbReachable = true;
    } catch (e) {
      // ignore
    }

    const stats = {
      totalUsers: parseInt(totalUsers[0].count, 10),
      totalDonorProfiles: parseInt(totalDonorProfiles[0].count, 10),
      totalRequests: parseInt(totalRequests[0].count, 10),
      requestsByStatus: requestStatuses.reduce((acc, row) => ({ ...acc, [row.status]: parseInt(row.count, 10) }), {}),
      requestsToday: parseInt(requestsToday[0].count, 10),
      requestsThisWeek: parseInt(requestsThisWeek[0].count, 10),
      availableDonorsByGroup: availableDonorsByGroup.reduce((acc, row) => ({ ...acc, [row.blood_group]: parseInt(row.count, 10) }), {}),
      pendingReports: parseInt(pendingReports[0].count, 10),
      systemStatus: {
        dbReachable,
        redisReachable,
      }
    };

    await this.cacheManager.set(cacheKey, stats, 60000); // 60s
    return stats;
  }
}

