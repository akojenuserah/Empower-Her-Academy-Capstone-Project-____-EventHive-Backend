import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { v4 as uuidv4 } from 'uuid';

export interface EventFilters {
  search?: string;
  category?: string;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
  sortBy?: 'date' | 'price' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  featured?: boolean;
}

@Injectable()
export class EventsService {
  constructor(private db: DatabaseService) {}

  findAll(filters: EventFilters = {}) {
    let events = this.db.all<any>(`
      SELECT e.*, COUNT(t.id) as attendees
      FROM Event e
      LEFT JOIN Ticket t ON t.eventId = e.id
      WHERE e.approvalStatus = 'APPROVED'
      GROUP BY e.id
      ORDER BY e.createdAt DESC
    `);

    if (filters.featured !== undefined) {
      events = events.filter((e) => Boolean(e.isFeatured) === filters.featured);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      events = events.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          e.city.toLowerCase().includes(q),
      );
    }

    if (filters.category) {
      events = events.filter(
        (e) => e.category.toLowerCase() === filters.category!.toLowerCase(),
      );
    }

    if (filters.city) {
      events = events.filter((e) =>
        e.city.toLowerCase().includes(filters.city!.toLowerCase()),
      );
    }

    if (filters.dateFrom) {
      events = events.filter((e) => e.date >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      events = events.filter((e) => e.date <= filters.dateTo!);
    }

    if (filters.priceMin !== undefined) {
      events = events.filter((e) => e.price >= filters.priceMin!);
    }

    if (filters.priceMax !== undefined) {
      events = events.filter((e) => e.price <= filters.priceMax!);
    }

    if (filters.sortBy) {
      const order = filters.sortOrder === 'desc' ? -1 : 1;
      events.sort((a: any, b: any) => {
        switch (filters.sortBy) {
          case 'date':
            return (new Date(a.date).getTime() - new Date(b.date).getTime()) * order;
          case 'price':
            return (a.price - b.price) * order;
          case 'popularity':
            return (b.attendees - a.attendees) * order;
          default:
            return 0;
        }
      });
    }

    return events.map((e) => this.mapEvent(e));
  }

  findOne(id: string) {
    const event = this.db.get<any>(`
      SELECT e.*, COUNT(t.id) as attendees
      FROM Event e
      LEFT JOIN Ticket t ON t.eventId = e.id
      WHERE e.id = ?
      GROUP BY e.id
    `, [id]);

    if (!event) throw new NotFoundException('Event not found');

    this.db.run('UPDATE Event SET viewsCount = viewsCount + 1 WHERE id = ?', [id]);

    return this.mapEvent(event);
  }

  create(userId: string, dto: any) {
    const user = this.db.get<any>('SELECT * FROM User WHERE id = ?', [userId]);
    if (!user) throw new NotFoundException('User not found');

    const { ticketTypes, tags, ...eventData } = dto;
    const eventId = uuidv4();

    this.db.run(`
      INSERT INTO Event (id, title, description, shortDescription, category, date, time, endTime,
        location, address, city, price, maxPrice, currency, image, maxAttendees, isFeatured,
        tags, isFree, approvalStatus, organizerName, organizerAvatar, organizerVerified, createdById, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      eventId, eventData.title, eventData.description, eventData.shortDescription || '',
      eventData.category, eventData.date, eventData.time, eventData.endTime || null,
      eventData.location, eventData.address || '', eventData.city || '',
      eventData.price || 0, eventData.maxPrice || null, eventData.currency || 'USD',
      eventData.image || '', eventData.maxAttendees || 100, eventData.isFeatured ? 1 : 0,
      JSON.stringify(tags || []), eventData.isFree ? 1 : 0, 'APPROVED',
      user.fullName, user.avatar, 1, userId, new Date().toISOString(),
    ]);

    if (ticketTypes && ticketTypes.length > 0) {
      for (const tt of ticketTypes) {
        this.db.run(`
          INSERT INTO TicketType (id, eventId, name, price, description, available, maxPerOrder)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [uuidv4(), eventId, tt.name, tt.price, tt.description || '', tt.available || 100, tt.maxPerOrder || 10]);
      }
    }

    return this.findOne(eventId);
  }

  update(id: string, userId: string, dto: any) {
    const event = this.db.get<any>('SELECT id FROM Event WHERE id = ?', [id]);
    if (!event) throw new NotFoundException('Event not found');

    const { tags, ...rest } = dto;
    const sets: string[] = [];
    const params: any[] = [];

    const allowedFields = ['title', 'description', 'shortDescription', 'category', 'date', 'time',
      'endTime', 'location', 'address', 'city', 'price', 'maxPrice', 'currency', 'image',
      'maxAttendees', 'isFeatured'];

    for (const field of allowedFields) {
      if (rest[field] !== undefined) {
        sets.push(`${field} = ?`);
        params.push(rest[field]);
      }
    }

    if (tags !== undefined) {
      sets.push('tags = ?');
      params.push(JSON.stringify(tags));
    }

    if (sets.length > 0) {
      params.push(id);
      this.db.run(`UPDATE Event SET ${sets.join(', ')} WHERE id = ?`, params);
    }

    return this.findOne(id);
  }

  remove(id: string) {
    this.db.run('DELETE FROM Event WHERE id = ?', [id]);
    return { success: true };
  }

  mapEvent(event: any) {
    const ticketTypes = this.db.all<any>(
      'SELECT * FROM TicketType WHERE eventId = ?',
      [event.id],
    );

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      shortDescription: event.shortDescription,
      category: event.category,
      date: event.date,
      time: event.time,
      endTime: event.endTime,
      location: event.location,
      address: event.address,
      city: event.city,
      price: event.price,
      maxPrice: event.maxPrice,
      currency: event.currency,
      image: event.image,
      organizer: {
        id: event.createdById,
        name: event.organizerName || 'Organizer',
        avatar: event.organizerAvatar || `https://ui-avatars.com/api/?name=Organizer`,
        verified: Boolean(event.organizerVerified),
      },
      attendees: event.attendees || 0,
      maxAttendees: event.maxAttendees,
      isFeatured: Boolean(event.isFeatured),
      tags: this.parseTags(event.tags),
      ticketTypes: ticketTypes.map((tt) => ({
        id: tt.id,
        name: tt.name,
        price: tt.price,
        description: tt.description,
        available: tt.available,
        maxPerOrder: tt.maxPerOrder,
      })),
    };
  }

  private parseTags(tags: any): string[] {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    try {
      return JSON.parse(tags);
    } catch {
      return [];
    }
  }
}
