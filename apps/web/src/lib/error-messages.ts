import { ApiError } from './api';

// L'API renvoie des codes ; les textes lus par les membres sont ici.
const MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'Le service de réservation ne répond pas. Vérifiez votre connexion puis réessayez.',
  UNEXPECTED_ERROR: 'Une erreur inattendue est survenue. Réessayez dans un instant.',
  INVALID_BODY: 'La demande est incomplète. Rechargez la page puis réessayez.',
  INVALID_FIELD: 'Cette valeur n’est pas valide.',
  INVALID_DATE: 'Cette date n’est pas valide.',
  MISSING_FILTER: 'La demande est incomplète. Rechargez la page puis réessayez.',
  MISSING_MEMBER: 'Choisissez d’abord votre nom en haut de la page.',
  MEMBER_NOT_FOUND: 'Votre profil de membre est introuvable. Choisissez de nouveau votre nom.',
  ROOM_NOT_FOUND: 'Cette salle n’existe pas ou plus.',
  BOOKING_NOT_FOUND: 'Cette réservation n’existe pas ou plus.',
  END_BEFORE_START: 'L’heure de fin doit être après l’heure de début.',
  OUTSIDE_OPENING_HOURS: 'L’espace est ouvert de 8h00 à 20h00, une réservation doit tenir dans ces horaires.',
  NOT_ON_QUARTER_HOUR: 'Les réservations commencent et finissent au quart d’heure.',
  TOO_LONG: 'Une réservation dure au plus 4 heures.',
  IN_THE_PAST: 'Ce créneau est déjà passé.',
  OVER_CAPACITY: 'La salle ne peut pas accueillir autant de participants.',
  ROOM_ALREADY_BOOKED: 'La salle est déjà réservée sur une partie de ce créneau.',
  NOT_YOUR_BOOKING: 'Seule la personne qui a réservé peut annuler.',
  ALREADY_STARTED: 'Cette réservation a déjà commencé, elle ne peut plus être annulée.',
  ALREADY_CANCELLED: 'Cette réservation est déjà annulée.',
};

const FIELD_MESSAGES: Record<string, string> = {
  title: 'Donnez un titre de 80 caractères au plus.',
  attendees: 'Indiquez un nombre de participants entre 1 et 100.',
  roomId: 'Choisissez une salle.',
};

/** Le message à afficher pour une erreur de l'API. */
export function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) return MESSAGES['UNEXPECTED_ERROR'] ?? '';
  if (error.code === 'INVALID_FIELD' && error.field && FIELD_MESSAGES[error.field]) {
    return FIELD_MESSAGES[error.field] ?? '';
  }
  return MESSAGES[error.code] ?? MESSAGES['UNEXPECTED_ERROR'] ?? '';
}
