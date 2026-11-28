import { connect } from '../database.js';
import type { Equipment } from '../rooms/room.js';
import { clockFromEnv } from '../shared/clock.js';
import { parisDateTime, parisInstant } from '../shared/paris-time.js';

// Jeu d'exemple : les salles et les membres de l'espace, un planning sur cette semaine et la suivante, et trois mois
// d'historique. Tout est relatif à « maintenant » (FAKE_NOW compris) et le seed se rejoue à l'identique.

interface SeedRoom {
  name: string;
  floor: number;
  capacity: number;
  equipment: Equipment[];
  color: string;
  description: string;
}

const rooms: SeedRoom[] = [
  {
    name: 'Atelier',
    floor: 0,
    capacity: 14,
    equipment: ['screen', 'videoconference', 'whiteboard', 'step_free_access'],
    color: '#3f6fb0',
    description: 'Grande salle modulable côté rue, pour les ateliers, les formations et les meetups.',
  },
  {
    name: 'Cabine 1',
    floor: 0,
    capacity: 2,
    equipment: ['videoconference', 'step_free_access'],
    color: '#c0703f',
    description: 'Cabine insonorisée pour les appels et les visios à deux.',
  },
  {
    name: 'Cabine 2',
    floor: 0,
    capacity: 2,
    equipment: ['videoconference', 'speakerphone', 'step_free_access'],
    color: '#d39a3a',
    description: 'Cabine insonorisée, avec pieuvre pour les conférences téléphoniques.',
  },
  {
    name: 'Bibliothèque',
    floor: 1,
    capacity: 6,
    equipment: ['whiteboard'],
    color: '#8a6d4b',
    description: 'Au calme entre les rayonnages, pour écrire ou réfléchir à plusieurs.',
  },
  {
    name: 'La Serre',
    floor: 1,
    capacity: 8,
    equipment: ['screen', 'whiteboard'],
    color: '#5b8a72',
    description: 'Lumineuse et pleine de plantes, la salle des réunions d’équipe.',
  },
  {
    name: 'Studio',
    floor: 1,
    capacity: 4,
    equipment: ['screen', 'videoconference', 'speakerphone'],
    color: '#2f8f9d',
    description: 'Traitée acoustiquement : caméra, micros et éclairage pour les visios et les enregistrements.',
  },
  {
    name: 'Petit Salon',
    floor: 2,
    capacity: 4,
    equipment: ['screen', 'step_free_access'],
    color: '#b5546b',
    description: 'Canapés et écran, pour les rendez-vous clients et les points informels.',
  },
  {
    name: 'Salon Verrière',
    floor: 2,
    capacity: 20,
    equipment: ['screen', 'videoconference', 'speakerphone', 'step_free_access'],
    color: '#6b5ca5',
    description: 'Sous la verrière, pour les présentations, les événements et les petits-déjeuners des membres.',
  },
  {
    name: "Salle d'Été",
    floor: 0,
    capacity: 10,
    equipment: ['screen', 'whiteboard', 'step_free_access'],
    color: '#c58b2a',
    description: 'Ouverte sur le patio, pour les ateliers et les déjeuners d’équipe aux beaux jours.',
  },
];

const members = [
  { fullName: 'Camille Martin', email: 'camille.martin@example.com', company: 'Studio Ondes' },
  { fullName: 'Yanis Benali', email: 'yanis.benali@example.com', company: 'Développeur indépendant' },
  { fullName: 'Léa Fournier', email: 'lea.fournier@example.com', company: 'Atelier Pivot' },
  { fullName: 'Thomas Nguyen', email: 'thomas.nguyen@example.com', company: 'Nguyen Conseil' },
  { fullName: 'Inès Moreau', email: 'ines.moreau@example.com', company: 'Cartographik' },
  { fullName: 'Hugo Lefèvre', email: 'hugo.lefevre@example.com', company: 'Cabinet Lefèvre' },
  { fullName: "Zoé N'Diaye", email: 'zoe.ndiaye@example.com', company: 'Maison Baobab' },
];

/** [jour depuis le lundi de cette semaine, salle, membre (1 à 7), début, fin, titre, participants, annulée] */
type SeedBooking = [number, string, number, string, string, string, number | null, boolean?];

const bookings: SeedBooking[] = [
  [0, 'Atelier', 3, '09:00', '12:00', 'Atelier design sprint', 10],
  [0, 'Studio', 1, '10:00', '11:00', 'Enregistrement podcast', 2],
  [0, 'La Serre', 4, '14:00', '15:30', 'Comité de pilotage', 6],
  [0, 'Cabine 1', 2, '09:30', '10:00', 'Appel recruteur', 1],
  [1, 'Salon Verrière', 6, '09:00', '11:00', 'Petit-déjeuner des membres', 18],
  [1, 'Bibliothèque', 5, '13:00', '16:00', 'Session de rédaction', 3],
  [1, 'Cabine 2', 1, '11:00', '11:45', 'Visio client', 1],
  [1, 'Petit Salon', 2, '16:00', '17:00', 'Point freelance', 3],
  [2, 'La Serre', 3, '09:30', '12:30', 'Rétrospective du trimestre', 7],
  [2, 'Studio', 6, '14:00', '15:00', 'Visio audience', 2],
  [2, 'Atelier', 4, '14:00', '18:00', 'Formation Excel avancé', 12],
  [2, 'Cabine 1', 5, '10:00', '10:30', 'Appel fournisseur', null],
  [3, 'Studio', 1, '09:00', '10:30', 'Mixage épisode 12', 2],
  [3, 'Bibliothèque', 2, '10:00', '12:00', 'Revue de code', 2],
  [3, 'La Serre', 4, '11:00', '12:00', 'Entretien d’embauche', 3, true],
  [3, 'La Serre', 5, '11:00', '12:30', 'Point cartes interactives', 4],
  [3, 'Petit Salon', 6, '14:00', '15:00', 'Rendez-vous client', 2],
  [3, 'Atelier', 2, '15:00', '17:00', 'Meetup TypeScript', 14, true],
  [3, 'Salon Verrière', 3, '18:00', '20:00', 'Afterwork des membres', 20],
  [4, 'Atelier', 5, '09:00', '12:00', 'Atelier cartographie', 12],
  [4, 'Cabine 2', 4, '10:00', '10:30', 'Appel banque', null],
  [4, 'Studio', 1, '14:00', '16:00', 'Session voix off', 3],
  [4, 'La Serre', 6, '15:00', '16:00', 'Signature de bail', 4],
  [7, 'La Serre', 1, '09:30', '10:30', 'Point hebdo Studio Ondes', 5],
  [7, 'Atelier', 4, '13:30', '17:30', 'Formation Power BI', 10],
  [7, 'Cabine 1', 2, '11:00', '11:30', 'Visio avec Lyon', 1],
  [7, 'Bibliothèque', 3, '14:00', '16:00', 'Atelier personas', 5],
  [8, 'Salon Verrière', 5, '10:00', '12:00', 'Présentation investisseurs', 15],
  [8, 'Studio', 1, '10:00', '12:00', 'Enregistrement podcast', 3],
  [8, 'Petit Salon', 2, '15:00', '16:00', 'Présentation client', 4, true],
  [8, 'La Serre', 6, '09:00', '10:00', 'Rendez-vous client', 3],
  [9, 'Atelier', 3, '09:00', '13:00', 'Design sprint, jour 1', 9],
  [9, 'Cabine 2', 4, '16:00', '16:30', 'Appel expert-comptable', null],
  [9, 'Bibliothèque', 5, '10:00', '12:00', 'Session de rédaction', 2],
  [10, 'Atelier', 3, '09:00', '13:00', 'Design sprint, jour 2', 9],
  [10, 'La Serre', 1, '14:00', '15:00', 'Bilan projet Ondes', 4],
  [10, 'Studio', 6, '11:00', '12:00', 'Visio audience', 2],
  [11, 'Salon Verrière', 4, '12:00', '14:00', 'Déjeuner networking', 16],
  [11, 'Petit Salon', 2, '10:00', '11:00', 'Point freelance', 2],
  [11, 'Cabine 1', 1, '09:00', '09:45', 'Appel radio', 1, true],
  [1, "Salle d'Été", 7, '14:00', '15:30', 'Point partenaires', 3],
  [9, "Salle d'Été", 7, '10:00', '12:00', 'Atelier tarifs', 6],
  // Les soirées, jusqu'à la fermeture.
  [0, 'Petit Salon', 4, '18:00', '20:00', 'Apéro des indépendants', 4],
  [1, 'Atelier', 2, '18:30', '20:00', 'Meetup JavaScript', 14],
  [2, 'La Serre', 7, '18:00', '20:00', 'Club de lecture', 8],
  [4, 'Bibliothèque', 7, '18:30', '20:00', 'Atelier d’écriture', 5],
  [4, 'Studio', 1, '18:00', '19:30', 'Enregistrement en public', 3],
  [7, "Salle d'Été", 3, '18:00', '20:00', 'Soirée jeux de société', 10],
  [8, 'Atelier', 4, '18:00', '20:00', 'Formation Python du soir', 12],
  [9, 'Petit Salon', 6, '18:30', '20:00', 'Dîner client', 4],
  [10, 'Salon Verrière', 2, '18:00', '20:00', 'Conférence produit', 20],
  [11, 'La Serre', 5, '18:00', '20:00', 'Soirée cartographie', 6, true],
];

// Jours où l'espace est fermé en 2026 (docs/reglement.md) : le jeu d'exemple n'y place aucune réservation.
const CLOSED_DAYS = new Set([
  '2026-01-01',
  '2026-04-06',
  '2026-05-01',
  '2026-05-08',
  '2026-05-14',
  '2026-05-25',
  '2026-07-14',
  ...['10', '11', '12', '13', '14', '17', '18', '19', '20', '21'].map((day) => `2026-08-${day}`),
  '2026-11-11',
  '2026-12-25',
]);

/** Titres de l'historique, par taille de salle. */
const PAST_TITLES = {
  small: ['Appel client', 'Visio d’équipe', 'Entretien', 'Appel fournisseur', 'Point avec l’expert-comptable'],
  medium: ['Point hebdo', 'Rendez-vous client', 'Revue de projet', 'Session de rédaction', 'Atelier personas'],
  large: ['Formation', 'Atelier collectif', 'Présentation client', 'Rétrospective', 'Séminaire d’équipe'],
};

const HISTORY_WEEKS = 13;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const minutesOf = (time: string) => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function mondayOf(date: string): string {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const monday = new Date(`${date}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((weekday + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

interface Row {
  room: number;
  member: number;
  title: string;
  attendees: number | null;
  startsAt: Date;
  endsAt: Date;
  createdAt: Date;
  cancelledAt: Date | null;
}

const now = clockFromEnv().now();
const today = parisDateTime(now);
const monday = mondayOf(today.date);
const roomId = (name: string) => rooms.findIndex((room) => room.name === name) + 1;

const rows: Row[] = bookings
  .filter(([day]) => !CLOSED_DAYS.has(addDays(monday, day)))
  .map(([day, room, member, start, end, title, attendees, cancelled], index) => {
    const date = addDays(monday, day);
    const startsAt = parisInstant(date, minutesOf(start));
    const createdAt = new Date(Math.min(startsAt.getTime(), now.getTime()) - ((index % 4) + 2) * DAY);
    const cancelledAt = cancelled ? new Date(Math.min(startsAt.getTime(), now.getTime()) - 3 * HOUR) : null;
    return {
      room: roomId(room),
      member,
      title,
      attendees,
      startsAt,
      endsAt: parisInstant(date, minutesOf(end)),
      createdAt,
      cancelledAt,
    };
  });

// Trois mois d'historique, tirés d'un générateur à graine fixe : le même jeu à chaque chargement.
function generator(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const random = generator(2026);
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!;

for (let day = -HISTORY_WEEKS * 7; day < 0; day++) {
  const date = addDays(monday, day);
  const weekday = ((day % 7) + 7) % 7;
  if (weekday >= 5 || CLOSED_DAYS.has(date)) continue;
  const taken: Row[] = [];
  const count = 3 + Math.floor(random() * 4);
  for (let attempt = 0; attempt < count * 3 && taken.length < count; attempt++) {
    const room = pick(rooms);
    const from = 8 * 60 + 30 * Math.floor(random() * 22);
    const duration = pick([30, 60, 60, 90, 120, 180, 240]);
    const to = Math.min(from + duration, 20 * 60);
    const startsAt = parisInstant(date, from);
    const endsAt = parisInstant(date, to);
    const id = roomId(room.name);
    if (taken.some((row) => row.room === id && row.startsAt < endsAt && startsAt < row.endsAt)) continue;
    const size = room.capacity <= 2 ? 'small' : room.capacity <= 8 ? 'medium' : 'large';
    const cancelled = random() < 0.08;
    taken.push({
      room: id,
      member: 1 + Math.floor(random() * members.length),
      title: pick(PAST_TITLES[size]),
      attendees: random() < 0.2 ? null : 1 + Math.floor(random() * room.capacity),
      startsAt,
      endsAt,
      createdAt: new Date(startsAt.getTime() - (1 + Math.floor(random() * 14)) * DAY),
      cancelledAt: cancelled ? new Date(startsAt.getTime() - (1 + Math.floor(random() * 48)) * HOUR) : null,
    });
  }
  rows.push(...taken);
}

// Une réservation en cours au moment du chargement, si l'espace est ouvert : un appel pris il y a une demi-heure.
const quarter = Math.floor(today.minutes / 15) * 15;
const ongoing = { room: roomId('Cabine 2'), from: quarter - 30, to: quarter + 60 };
if (ongoing.from >= 8 * 60 && ongoing.to <= 20 * 60) {
  const startsAt = parisInstant(today.date, ongoing.from);
  const endsAt = parisInstant(today.date, ongoing.to);
  const free = !rows.some(
    (row) => row.room === ongoing.room && row.cancelledAt === null && row.startsAt < endsAt && startsAt < row.endsAt,
  );
  if (free) {
    rows.push({
      room: ongoing.room,
      member: 1,
      title: 'Appel avec la production',
      attendees: 1,
      startsAt,
      endsAt,
      createdAt: new Date(startsAt.getTime() - DAY),
      cancelledAt: null,
    });
  }
}

const pool = connect();
const client = await pool.connect();
try {
  await client.query('begin');
  await client.query('truncate booking, member, room restart identity cascade');
  for (const room of rooms) {
    await client.query(
      'insert into room (name, floor, capacity, equipment, color, description) values ($1, $2, $3, $4, $5, $6)',
      [room.name, room.floor, room.capacity, room.equipment, room.color, room.description],
    );
  }
  for (const member of members) {
    await client.query('insert into member (full_name, email, company) values ($1, $2, $3)', [
      member.fullName,
      member.email,
      member.company,
    ]);
  }
  for (const row of rows) {
    await client.query(
      `insert into booking (room_id, member_id, title, attendees, starts_at, ends_at, created_at, cancelled_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [row.room, row.member, row.title, row.attendees, row.startsAt, row.endsAt, row.createdAt, row.cancelledAt],
    );
  }
  await client.query('commit');
  console.log(
    `Seeded ${rooms.length} rooms, ${members.length} members and ${rows.length} bookings (week of ${monday}, now ${now.toISOString()}).`,
  );
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  client.release();
  await pool.end();
}
