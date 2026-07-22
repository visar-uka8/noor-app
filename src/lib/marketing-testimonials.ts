export type MarketingTestimonialPerson = {
  name: string;
  role: string;
  avatarSrc: string;
  quote: string;
  authorLabel: string;
};

export const marketingTestimonialPeople: MarketingTestimonialPerson[] = [
  {
    name: "Sabine M.",
    role: "Tochter, pflegt Eltern aus der Ferne",
    avatarSrc: "/marketing/avatars/hero-1.jpg",
    quote:
      "Ich würde das definitiv abonnieren für meine Eltern — damit ich sehe ob sie ihre Medikamente nehmen und wie ihre Laborwerte sind.",
    authorLabel: "Nachbar aus Hamburg",
  },
  {
    name: "Thomas K.",
    role: "Erlebte den Notfall hautnah",
    avatarSrc: "/marketing/avatars/hero-2.jpg",
    quote:
      "Während meine Mutter vor der Operation bewusstlos war, fragte der Arzt sie, welche Medikamente sie einnehme. Ich hatte keine Ahnung.",
    authorLabel: "Unternehmer aus Hamburg",
  },
  {
    name: "Dr. Laura H.",
    role: "Arbeitet täglich mit Befunden",
    avatarSrc: "/marketing/avatars/hero-3.jpg",
    quote:
      "Wir haben jeden Tag Fragen von Patienten was ein Laborwert bedeutet. Das kostet uns viel Zeit.",
    authorLabel: "Laborassistent aus Hamburg",
  },
  {
    name: "Hans W.",
    role: "Nutzt Noor mit seiner Familie",
    avatarSrc: "/marketing/avatars/hero-4.jpg",
    quote:
      "Endlich verstehe ich meine Laborwerte — und meine Tochter sieht mit, dass es mir gut geht.",
    authorLabel: "Rentner aus Hamburg",
  },
];

export const marketingHeroTrustPeople = marketingTestimonialPeople.slice(0, 4);
