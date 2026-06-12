import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class CategoriesService {
  constructor(private db: DatabaseService) {}

  findAll() {
    const categories = this.db.all<any>('SELECT * FROM Category ORDER BY name');
    const counts = this.db.all<any>(`
      SELECT category, COUNT(*) as cnt FROM Event
      WHERE approvalStatus = 'APPROVED'
      GROUP BY category
    `);

    const countMap = new Map(counts.map((c) => [c.category, c.cnt]));

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      color: c.color,
      eventCount: countMap.get(c.name) || 0,
    }));
  }
}
