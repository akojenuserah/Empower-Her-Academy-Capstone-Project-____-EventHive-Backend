import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import * as bcrypt from 'bcrypt';

const url = process.env.DATABASE_URL || 'file:./dev.db';
const libsql = createClient({ url });
const adapter = new PrismaLibSql(libsql);
const prisma = new PrismaClient({ adapter } as any);

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

async function main() {
  console.log('🌱 Seeding EventHive database...');

  // Categories
  const categoryData = [
    { name: 'Music', slug: 'music', icon: 'music', color: '#8B5CF6' },
    { name: 'Tech', slug: 'tech', icon: 'laptop', color: '#3B82F6' },
    { name: 'Food & Drink', slug: 'food-drink', icon: 'utensils', color: '#F59E0B' },
    { name: 'Sports', slug: 'sports', icon: 'trophy', color: '#10B981' },
    { name: 'Arts', slug: 'arts', icon: 'palette', color: '#EC4899' },
    { name: 'Business', slug: 'business', icon: 'briefcase', color: '#6366F1' },
    { name: 'Health', slug: 'health', icon: 'heart', color: '#EF4444' },
    { name: 'Education', slug: 'education', icon: 'graduation-cap', color: '#14B8A6' },
  ];

  for (const cat of categoryData) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log('✅ Categories seeded');

  // Demo users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const organizer = await prisma.user.upsert({
    where: { email: 'alex.johnson@eventhive.com' },
    update: {},
    create: {
      fullName: 'Alex Johnson',
      email: 'alex.johnson@eventhive.com',
      password: hashedPassword,
      role: 'ORGANIZER',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    },
  });

  const attendee = await prisma.user.upsert({
    where: { email: 'demo@eventhive.com' },
    update: {},
    create: {
      fullName: 'Demo User',
      email: 'demo@eventhive.com',
      password: hashedPassword,
      role: 'ATTENDEE',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    },
  });
  console.log('✅ Users seeded');

  // Events
  const eventsData = [
    {
      title: 'Summer Music Festival 2026',
      description: 'Join us for the biggest music festival of the summer! Featuring top artists from around the world, food vendors, and an unforgettable atmosphere. Three days of non-stop music across multiple stages.',
      shortDescription: 'The biggest music festival of the summer with top artists worldwide.',
      category: 'Music',
      date: addDays(15),
      time: '14:00',
      endTime: '23:00',
      location: 'Central Park',
      address: '14 Central Park West',
      city: 'New York, NY',
      price: 89,
      maxPrice: 299,
      currency: 'USD',
      image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=500&fit=crop',
      maxAttendees: 5000,
      isFeatured: true,
      tags: JSON.stringify(['festival', 'outdoor', 'live-music']),
      organizerName: 'NYC Events Co.',
      organizerAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop',
      organizerVerified: true,
      ticketTypes: [
        { name: 'General Admission', price: 89, description: 'Access to all general areas', available: 1500, maxPerOrder: 6 },
        { name: 'VIP Pass', price: 199, description: 'VIP area access + complimentary drinks', available: 300, maxPerOrder: 4 },
        { name: 'Backstage Experience', price: 299, description: 'Meet & greet with artists', available: 50, maxPerOrder: 2 },
      ],
    },
    {
      title: 'Tech Innovation Summit',
      description: 'Connect with industry leaders and explore the latest in AI, blockchain, and emerging technologies. Featuring keynotes from Fortune 500 CTOs and hands-on workshops.',
      shortDescription: 'Connect with tech leaders and explore AI, blockchain, and emerging tech.',
      category: 'Tech',
      date: addDays(7),
      time: '09:00',
      endTime: '18:00',
      location: 'Convention Center',
      address: '747 Howard Street',
      city: 'San Francisco, CA',
      price: 149,
      maxPrice: 499,
      currency: 'USD',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=500&fit=crop',
      maxAttendees: 2000,
      isFeatured: true,
      tags: JSON.stringify(['technology', 'networking', 'AI']),
      organizerName: 'TechForward',
      organizerAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
      organizerVerified: true,
      ticketTypes: [
        { name: 'Standard Pass', price: 149, description: 'Full conference access', available: 800, maxPerOrder: 5 },
        { name: 'Premium Pass', price: 349, description: 'Conference + workshop access', available: 200, maxPerOrder: 3 },
        { name: 'Executive Pass', price: 499, description: 'All access + private networking', available: 50, maxPerOrder: 2 },
      ],
    },
    {
      title: 'Gourmet Food & Wine Festival',
      description: 'Savor culinary delights from award-winning chefs paired with premium wines from local vineyards. Live cooking demonstrations and wine tasting sessions throughout the day.',
      shortDescription: 'Culinary delights from award-winning chefs paired with premium wines.',
      category: 'Food & Drink',
      date: addDays(21),
      time: '11:00',
      endTime: '20:00',
      location: 'Waterfront Plaza',
      address: '100 Harbor Drive',
      city: 'San Diego, CA',
      price: 65,
      maxPrice: 150,
      currency: 'USD',
      image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=500&fit=crop',
      maxAttendees: 1500,
      isFeatured: true,
      tags: JSON.stringify(['food', 'wine', 'culinary']),
      organizerName: 'Culinary Arts Society',
      organizerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
      organizerVerified: true,
      ticketTypes: [
        { name: 'Tasting Pass', price: 65, description: '10 tasting tickets included', available: 600, maxPerOrder: 6 },
        { name: 'Connoisseur Pass', price: 150, description: 'Unlimited tastings + cooking class', available: 150, maxPerOrder: 4 },
      ],
    },
    {
      title: 'Marathon Championship 2026',
      description: 'Challenge yourself in the annual city marathon. Routes for all levels from 5K to full marathon. Chip timing, hydration stations, and post-race celebration included.',
      shortDescription: 'Annual city marathon with routes for all levels from 5K to full marathon.',
      category: 'Sports',
      date: addDays(30),
      time: '06:00',
      endTime: '14:00',
      location: 'City Center',
      address: 'Starting Line: Millennium Park',
      city: 'Chicago, IL',
      price: 45,
      maxPrice: 120,
      currency: 'USD',
      image: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&h=500&fit=crop',
      maxAttendees: 5000,
      isFeatured: false,
      tags: JSON.stringify(['running', 'fitness', 'outdoor']),
      organizerName: 'Chicago Athletic Club',
      organizerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      organizerVerified: true,
      ticketTypes: [
        { name: '5K Entry', price: 45, description: '5K race entry + t-shirt', available: 2000, maxPerOrder: 8 },
        { name: 'Half Marathon', price: 85, description: 'Half marathon + medal + shirt', available: 1500, maxPerOrder: 4 },
        { name: 'Full Marathon', price: 120, description: 'Full marathon + premium kit', available: 1000, maxPerOrder: 2 },
      ],
    },
    {
      title: 'Contemporary Art Exhibition',
      description: 'Explore groundbreaking works from emerging and established contemporary artists. Guided tours available. Special evening event with artist meet-and-greet.',
      shortDescription: 'Groundbreaking works from contemporary artists with guided tours.',
      category: 'Arts',
      date: addDays(10),
      time: '10:00',
      endTime: '21:00',
      location: 'Modern Art Museum',
      address: '1 Grand Avenue',
      city: 'Los Angeles, CA',
      price: 25,
      maxPrice: 75,
      currency: 'USD',
      image: 'https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=800&h=500&fit=crop',
      maxAttendees: 800,
      isFeatured: false,
      tags: JSON.stringify(['art', 'exhibition', 'culture']),
      organizerName: 'LA Arts Foundation',
      organizerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      organizerVerified: true,
      ticketTypes: [
        { name: 'General Entry', price: 25, description: 'Museum access all day', available: 500, maxPerOrder: 10 },
        { name: 'Guided Tour', price: 45, description: 'Entry + 2-hour guided tour', available: 100, maxPerOrder: 6 },
        { name: 'VIP Evening', price: 75, description: 'Evening event + artist meet', available: 50, maxPerOrder: 4 },
      ],
    },
    {
      title: 'Startup Pitch Night',
      description: 'Watch innovative startups pitch to top investors. Network with entrepreneurs, VCs, and industry experts. Voting for audience favorite with prizes.',
      shortDescription: 'Watch startups pitch to investors and network with entrepreneurs.',
      category: 'Business',
      date: addDays(3),
      time: '18:00',
      endTime: '22:00',
      location: 'Innovation Hub',
      address: '500 Startup Lane',
      city: 'Austin, TX',
      price: 35,
      currency: 'USD',
      image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=500&fit=crop',
      maxAttendees: 300,
      isFeatured: false,
      tags: JSON.stringify(['startup', 'networking', 'investment']),
      organizerName: 'Austin Founders Network',
      organizerAvatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=100&h=100&fit=crop',
      organizerVerified: true,
      ticketTypes: [
        { name: 'Attendee', price: 35, description: 'Event access + networking', available: 200, maxPerOrder: 4 },
        { name: 'Investor Pass', price: 0, description: 'Complimentary for accredited investors', available: 50, maxPerOrder: 1 },
      ],
    },
    {
      title: 'Wellness & Meditation Retreat',
      description: 'A day of mindfulness, yoga, and holistic wellness. Expert-led sessions on stress management, nutrition, and mental health. Healthy lunch included.',
      shortDescription: 'A day of mindfulness, yoga, and holistic wellness practices.',
      category: 'Health',
      date: addDays(14),
      time: '08:00',
      endTime: '17:00',
      location: 'Serenity Gardens',
      address: '200 Peaceful Way',
      city: 'Seattle, WA',
      price: 95,
      maxPrice: 195,
      currency: 'USD',
      image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&h=500&fit=crop',
      maxAttendees: 100,
      isFeatured: false,
      tags: JSON.stringify(['wellness', 'yoga', 'meditation']),
      organizerName: 'Mindful Living Co.',
      organizerAvatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop',
      organizerVerified: true,
      ticketTypes: [
        { name: 'Day Pass', price: 95, description: 'Full day access + lunch', available: 60, maxPerOrder: 4 },
        { name: 'Premium Experience', price: 195, description: 'All sessions + private consultation', available: 20, maxPerOrder: 2 },
      ],
    },
    {
      title: 'Data Science Bootcamp',
      description: 'Intensive weekend workshop covering Python, machine learning, and data visualization. Hands-on projects with real datasets. Certificate upon completion.',
      shortDescription: 'Intensive workshop on Python, ML, and data visualization.',
      category: 'Education',
      date: addDays(25),
      time: '09:00',
      endTime: '17:00',
      location: 'Tech Campus',
      address: '1000 Learning Boulevard',
      city: 'Boston, MA',
      price: 299,
      currency: 'USD',
      image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=500&fit=crop',
      maxAttendees: 50,
      isFeatured: false,
      tags: JSON.stringify(['education', 'data-science', 'programming']),
      organizerName: 'DataTech Academy',
      organizerAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
      organizerVerified: true,
      ticketTypes: [
        { name: 'Workshop Pass', price: 299, description: 'Full workshop + materials + certificate', available: 30, maxPerOrder: 2 },
      ],
    },
  ];

  const createdEvents: any[] = [];

  for (const eventData of eventsData) {
    const { ticketTypes, ...data } = eventData;

    // Check if event exists
    const existing = await prisma.event.findFirst({
      where: { title: data.title },
    });

    if (existing) {
      createdEvents.push(existing);
      continue;
    }

    const event = await prisma.event.create({
      data: {
        ...data,
        createdById: organizer.id,
        ticketTypes: {
          create: ticketTypes,
        },
      },
      include: { ticketTypes: true },
    });
    createdEvents.push(event);
  }
  console.log(`✅ ${createdEvents.length} events seeded`);

  // Create sample tickets for the demo user
  const ticketEvent1 = createdEvents[0]; // Summer Music Festival
  const ticketEvent2 = createdEvents[1]; // Tech Summit
  const ticketEvent5 = createdEvents[5]; // Startup Pitch

  for (const [event, typeIdx, qr] of [
    [ticketEvent1, 1, 'EVT-001-VIP-2847'],
    [ticketEvent2, 0, 'EVT-002-STD-1234'],
    [ticketEvent5, 0, 'EVT-006-ATT-3421'],
  ] as [any, number, string][]) {
    if (!event?.ticketTypes?.[typeIdx]) continue;
    const existingTicket = await prisma.ticket.findFirst({
      where: { qrCode: qr },
    });
    if (!existingTicket) {
      await prisma.ticket.create({
        data: {
          userId: attendee.id,
          eventId: event.id,
          ticketTypeId: event.ticketTypes[typeIdx].id,
          status: 'VALID',
          qrCode: qr,
        },
      });
    }
  }
  console.log('✅ Sample tickets seeded');

  // Save some events for demo user
  for (const event of [createdEvents[3], createdEvents[4], createdEvents[6]]) {
    if (!event) continue;
    const exists = await prisma.savedEvent.findFirst({
      where: { userId: attendee.id, eventId: event.id },
    });
    if (!exists) {
      await prisma.savedEvent.create({
        data: { userId: attendee.id, eventId: event.id },
      });
    }
  }
  console.log('✅ Saved events seeded');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📧 Demo accounts:');
  console.log('   Organizer: alex.johnson@eventhive.com / password123');
  console.log('   Attendee:  demo@eventhive.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
