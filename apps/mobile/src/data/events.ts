export type EventItem = {
  id: string;
  title: string;
  category: string;
  city: string;
  venue: string;
  dateLabel: string;
  priceLabel: string;
  accent: string;
  symbol: string;
};

// Données fictives de démonstration : aucun événement ni billet réel n'est vendu.
export const demoEvents: EventItem[] = [
  { id: 'demo-1', title: 'Soirée live', category: 'Musique', city: 'Antananarivo', venue: 'Centre-ville', dateLabel: 'À venir', priceLabel: 'Dès 15 000 Ar', accent: '#573044', symbol: '♫' },
  { id: 'demo-2', title: 'Festival culturel', category: 'Culture', city: 'Antsirabe', venue: 'Espace culturel', dateLabel: 'À venir', priceLabel: 'Dès 10 000 Ar', accent: '#30465C', symbol: '✦' },
  { id: 'demo-3', title: 'Rencontre créative', category: 'Conférence', city: 'Toamasina', venue: 'Salle polyvalente', dateLabel: 'À venir', priceLabel: 'Entrée libre', accent: '#4B4930', symbol: '✧' }
];
