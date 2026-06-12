import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class OrganizerService {
  constructor(
    private db: DatabaseService,
    private eventsService: EventsService,
  ) {}

  getAnalytics(userId: string) {
    const totalEvents =
      this.db.get<any>(
        'SELECT COUNT(*) as c FROM Event WHERE createdById = ?',
        [userId],
      )?.c || 0;
    const totalAttendees =
      this.db.get<any>(
        `
      SELECT COUNT(*) as c FROM Ticket t JOIN Event e ON e.id = t.eventId WHERE e.createdById = ?
    `,
        [userId],
      )?.c || 0;
    const totalRevenue =
      this.db.get<any>(
        `
      SELECT SUM(tt.price) as s FROM Ticket t
      JOIN TicketType tt ON tt.id = t.ticketTypeId
      JOIN Event e ON e.id = t.eventId
      WHERE e.createdById = ?
    `,
        [userId],
      )?.s || 0;
    const averageAttendance =
      totalEvents > 0 ? Math.round(totalAttendees / totalEvents) : 0;

    const categoryBreakdown = this.getCategoryBreakdown(userId, totalEvents);
    const rsvpTrends = this.getRsvpTrends(userId);
    const recentRegistrations = this.getRecentRegistrations(userId);

    return {
      totalEvents,
      totalAttendees,
      totalRevenue: Math.round(totalRevenue),
      averageAttendance,
      rsvpTrends,
      categoryBreakdown,
      recentRegistrations,
    };
  }

  getEventAttendees(userId: string, eventId: string) {
    const event = this.db.get<any>(
      'SELECT id, title FROM Event WHERE id = ? AND createdById = ?',
      [eventId, userId],
    );
    if (!event) return { event: null, attendees: [] };

    const attendees = this.db.all<any>(
      `
      SELECT t.id as ticketId, t.qrCode, t.purchaseDate, t.status,
        u.fullName as name, u.email, u.avatar,
        tt.name as ticketType, tt.price
      FROM Ticket t
      JOIN User u ON u.id = t.userId
      JOIN TicketType tt ON tt.id = t.ticketTypeId
      WHERE t.eventId = ?
      ORDER BY t.purchaseDate DESC
    `,
      [eventId],
    );

    return {
      event: { id: event.id, title: event.title },
      attendees: attendees.map((a) => ({
        ticketId: a.ticketId,
        qrCode: a.qrCode,
        purchaseDate: new Date(a.purchaseDate).toISOString().split('T')[0],
        status: (a.status || 'VALID').toLowerCase(),
        name: a.name,
        email: a.email,
        avatar: a.avatar,
        ticketType: a.ticketType,
        price: a.price,
      })),
    };
  }

  getOrganizerEvents(userId: string) {
    const events = this.db.all<any>(
      `
      SELECT e.*, COUNT(t.id) as attendees
      FROM Event e
      LEFT JOIN Ticket t ON t.eventId = e.id
      WHERE e.createdById = ?
      GROUP BY e.id
      ORDER BY e.createdAt DESC
    `,
      [userId],
    );

    return events.map((e) => this.eventsService.mapEvent(e));
  }

  private getCategoryBreakdown(userId: string, total: number) {
    const rows = this.db.all<any>(
      `
      SELECT category, COUNT(*) as cnt FROM Event WHERE createdById = ? GROUP BY category
    `,
      [userId],
    );

    return rows.map((r) => ({
      category: r.category,
      count: r.cnt,
      percentage: total > 0 ? Math.round((r.cnt / total) * 100) : 0,
    }));
  }

  private getRsvpTrends(userId: string) {
    const tickets = this.db.all<any>(
      `
      SELECT strftime('%Y-%m', t.createdAt) as month, COUNT(*) as rsvps
      FROM Ticket t JOIN Event e ON e.id = t.eventId
      WHERE e.createdById = ?
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `,
      [userId],
    );

    const views = this.db.all<any>(
      `
      SELECT strftime('%Y-%m', createdAt) as month, SUM(viewsCount) as views
      FROM Event WHERE createdById = ?
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `,
      [userId],
    );

    const viewMap = new Map(views.map((v) => [v.month, v.views || 0]));

    return tickets
      .map((t) => ({
        date: t.month,
        rsvps: t.rsvps,
        views: viewMap.get(t.month) || 0,
      }))
      .reverse();
  }

  private getRecentRegistrations(userId: string) {
    return this.db.all<any>(
      `
      SELECT t.id, u.fullName as name, u.email, e.title as event,
        strftime('%Y-%m-%d', t.createdAt) as date, tt.name as ticketType
      FROM Ticket t
      JOIN User u ON u.id = t.userId
      JOIN Event e ON e.id = t.eventId
      JOIN TicketType tt ON tt.id = t.ticketTypeId
      WHERE e.createdById = ?
      ORDER BY t.createdAt DESC
      LIMIT 10
    `,
      [userId],
    );
  }
}
