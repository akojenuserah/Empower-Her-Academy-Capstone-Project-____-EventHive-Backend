import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EventsService } from '../events/events.service';
import { AuthService } from '../auth/auth.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  constructor(
    private db: DatabaseService,
    private eventsService: EventsService,
    private authService: AuthService,
  ) {}

  async getProfile(userId: string) {
    const user = this.db.get<any>('SELECT * FROM User WHERE id = ?', [userId]);
    if (!user) throw new NotFoundException('User not found');

    const eventsAttended = this.db.get<any>('SELECT COUNT(*) as c FROM Ticket WHERE userId = ?', [userId])?.c || 0;
    const eventsCreated = this.db.get<any>('SELECT COUNT(*) as c FROM Event WHERE createdById = ?', [userId])?.c || 0;

    return this.authService.mapUser(user, eventsAttended, eventsCreated);
  }

  async updateProfile(userId: string, dto: any) {
    const sets: string[] = [];
    const params: any[] = [];

    if (dto.fullName) { sets.push('fullName = ?'); params.push(dto.fullName); }
    if (dto.avatar) { sets.push('avatar = ?'); params.push(dto.avatar); }

    if (sets.length > 0) {
      params.push(userId);
      this.db.run(`UPDATE User SET ${sets.join(', ')} WHERE id = ?`, params);
    }

    return this.getProfile(userId);
  }

  getTickets(userId: string, status?: string) {
    const tickets = this.db.all<any>(`
      SELECT t.*, e.id as eId, e.title as eTitle, e.description as eDesc, e.shortDescription as eShortDesc,
        e.category as eCat, e.date as eDate, e.time as eTime, e.endTime as eEndTime,
        e.location as eLoc, e.address as eAddr, e.city as eCity, e.price as ePrice,
        e.maxPrice as eMaxPrice, e.currency as eCurrency, e.image as eImg,
        e.maxAttendees as eMaxAtt, e.isFeatured as eFeatured, e.tags as eTags,
        e.organizerName as eOrgName, e.organizerAvatar as eOrgAvatar,
        e.organizerVerified as eOrgVerified, e.createdById as eCreatedBy,
        tt.id as ttId, tt.name as ttName, tt.price as ttPrice,
        tt.description as ttDesc, tt.available as ttAvail, tt.maxPerOrder as ttMaxOrder
      FROM Ticket t
      JOIN Event e ON e.id = t.eventId
      JOIN TicketType tt ON tt.id = t.ticketTypeId
      WHERE t.userId = ?
      ORDER BY t.purchaseDate DESC
    `, [userId]);

    const now = new Date();

    const mapped = tickets.map((t) => this.mapTicket(t));

    if (status === 'upcoming') {
      return mapped
        .filter((t) => t.status === 'valid' && new Date(t.event.date) >= now)
        .sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime());
    }

    if (status === 'past') {
      return mapped.filter((t) => t.status === 'used' || new Date(t.event.date) < now);
    }

    return mapped;
  }

  getDashboardStats(userId: string) {
    const now = new Date().toISOString().split('T')[0];

    const totalTickets = this.db.get<any>('SELECT COUNT(*) as c FROM Ticket WHERE userId = ?', [userId])?.c || 0;
    const upcomingEvents = this.db.get<any>(`
      SELECT COUNT(*) as c FROM Ticket t JOIN Event e ON e.id = t.eventId
      WHERE t.userId = ? AND t.status = 'VALID' AND e.date >= ?
    `, [userId, now])?.c || 0;
    const eventsAttended = this.db.get<any>(`
      SELECT COUNT(*) as c FROM Ticket t JOIN Event e ON e.id = t.eventId
      WHERE t.userId = ? AND (t.status = 'USED' OR e.date < ?)
    `, [userId, now])?.c || 0;
    const savedEvents = this.db.get<any>('SELECT COUNT(*) as c FROM SavedEvent WHERE userId = ?', [userId])?.c || 0;

    return { totalTickets, upcomingEvents, eventsAttended, savedEvents };
  }

  getEventCountdowns(userId: string) {
    const now = new Date();
    const nowStr = now.toISOString().split('T')[0];

    const tickets = this.db.all<any>(`
      SELECT t.id, e.id as eventId, e.title, e.date, e.time, e.image, e.location
      FROM Ticket t JOIN Event e ON e.id = t.eventId
      WHERE t.userId = ? AND t.status = 'VALID' AND e.date >= ?
      ORDER BY e.date ASC
    `, [userId, nowStr]);

    return tickets.map((t) => {
      const eventDate = new Date(`${t.date}T${t.time}`);
      const diff = eventDate.getTime() - now.getTime();
      return {
        eventId: t.eventId,
        eventTitle: t.title,
        eventDate: t.date,
        eventTime: t.time,
        eventImage: t.image,
        eventLocation: t.location,
        timeRemaining: {
          days: Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24))),
          hours: Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))),
          minutes: Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))),
          seconds: Math.max(0, Math.floor((diff % (1000 * 60)) / 1000)),
        },
      };
    });
  }

  getSavedEvents(userId: string) {
    const events = this.db.all<any>(`
      SELECT e.*, COUNT(t.id) as attendees
      FROM Event e
      JOIN SavedEvent s ON s.eventId = e.id
      LEFT JOIN Ticket t ON t.eventId = e.id
      WHERE s.userId = ?
      GROUP BY e.id
      ORDER BY s.createdAt DESC
    `, [userId]);

    return events.map((e) => this.eventsService.mapEvent(e));
  }

  saveEvent(userId: string, eventId: string) {
    const event = this.db.get<any>('SELECT id FROM Event WHERE id = ?', [eventId]);
    if (!event) throw new NotFoundException('Event not found');

    const exists = this.db.get<any>('SELECT id FROM SavedEvent WHERE userId = ? AND eventId = ?', [userId, eventId]);
    if (!exists) {
      this.db.run('INSERT INTO SavedEvent (id, userId, eventId, createdAt) VALUES (?, ?, ?, ?)', [
        uuidv4(), userId, eventId, new Date().toISOString(),
      ]);
    }
    return { success: true };
  }

  unsaveEvent(userId: string, eventId: string) {
    this.db.run('DELETE FROM SavedEvent WHERE userId = ? AND eventId = ?', [userId, eventId]);
    return { success: true };
  }

  purchaseTicket(userId: string, dto: { eventId: string; ticketTypeId: string; quantity?: number }) {
    const ticketType = this.db.get<any>('SELECT * FROM TicketType WHERE id = ?', [dto.ticketTypeId]);
    if (!ticketType) throw new NotFoundException('Ticket type not found');

    const quantity = dto.quantity || 1;
    const tickets: any[] = [];

    for (let i = 0; i < quantity; i++) {
      const qrCode = `EVT-${dto.eventId.slice(0, 4).toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const ticketId = uuidv4();

      this.db.run(`
        INSERT INTO Ticket (id, userId, eventId, ticketTypeId, purchaseDate, status, qrCode, createdAt)
        VALUES (?, ?, ?, ?, ?, 'VALID', ?, ?)
      `, [ticketId, userId, dto.eventId, dto.ticketTypeId, new Date().toISOString(), qrCode, new Date().toISOString()]);

      // Decrement available count
      this.db.run('UPDATE TicketType SET available = MAX(0, available - 1) WHERE id = ?', [dto.ticketTypeId]);

      const t = this.db.get<any>(`
        SELECT t.*, e.id as eId, e.title as eTitle, e.description as eDesc, e.shortDescription as eShortDesc,
          e.category as eCat, e.date as eDate, e.time as eTime, e.endTime as eEndTime,
          e.location as eLoc, e.address as eAddr, e.city as eCity, e.price as ePrice,
          e.maxPrice as eMaxPrice, e.currency as eCurrency, e.image as eImg,
          e.maxAttendees as eMaxAtt, e.isFeatured as eFeatured, e.tags as eTags,
          e.organizerName as eOrgName, e.organizerAvatar as eOrgAvatar,
          e.organizerVerified as eOrgVerified, e.createdById as eCreatedBy,
          tt.id as ttId, tt.name as ttName, tt.price as ttPrice,
          tt.description as ttDesc, tt.available as ttAvail, tt.maxPerOrder as ttMaxOrder
        FROM Ticket t
        JOIN Event e ON e.id = t.eventId
        JOIN TicketType tt ON tt.id = t.ticketTypeId
        WHERE t.id = ?
      `, [ticketId]);

      tickets.push(this.mapTicket(t));
    }

    return quantity === 1 ? tickets[0] : tickets;
  }

  mapTicket(t: any) {
    const eventRow = {
      id: t.eId, title: t.eTitle, description: t.eDesc, shortDescription: t.eShortDesc,
      category: t.eCat, date: t.eDate, time: t.eTime, endTime: t.eEndTime,
      location: t.eLoc, address: t.eAddr, city: t.eCity, price: t.ePrice,
      maxPrice: t.eMaxPrice, currency: t.eCurrency, image: t.eImg,
      maxAttendees: t.eMaxAtt, isFeatured: t.eFeatured, tags: t.eTags,
      organizerName: t.eOrgName, organizerAvatar: t.eOrgAvatar,
      organizerVerified: t.eOrgVerified, createdById: t.eCreatedBy,
      attendees: 0,
    };

    return {
      id: t.id,
      eventId: t.eId,
      event: this.eventsService.mapEvent(eventRow),
      ticketType: {
        id: t.ttId, name: t.ttName, price: t.ttPrice,
        description: t.ttDesc, available: t.ttAvail, maxPerOrder: t.ttMaxOrder,
      },
      purchaseDate: new Date(t.purchaseDate).toISOString().split('T')[0],
      status: (t.status || 'VALID').toLowerCase() as 'valid' | 'used' | 'cancelled' | 'expired',
      qrCode: t.qrCode,
    };
  }
}
