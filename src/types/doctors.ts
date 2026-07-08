export type DoctorAvailability = "now" | "today";

export type Doctor = {
  id: string;
  initials: string;
  name: string;
  specialization: string;
  rating: number;
  availability: DoctorAvailability;
  fee: number;
  videoConsultation: boolean;
};

export const doctors: Doctor[] = [
  {
    id: "klaus-mueller",
    initials: "KM",
    name: "Dr. Klaus Müller",
    specialization: "Kardiologe",
    rating: 4.9,
    availability: "now",
    fee: 35,
    videoConsultation: true,
  },
  {
    id: "sara-novak",
    initials: "SN",
    name: "Dr. Sara Novak",
    specialization: "Hausärztin",
    rating: 4.8,
    availability: "now",
    fee: 30,
    videoConsultation: true,
  },
  {
    id: "amir-khan",
    initials: "AK",
    name: "Dr. Amir Khan",
    specialization: "Internist",
    rating: 4.7,
    availability: "today",
    fee: 35,
    videoConsultation: false,
  },
];
