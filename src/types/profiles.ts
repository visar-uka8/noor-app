export type UserRole = "patient" | "family_member";

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | string | null;
  activity_level?: string | null;
  sport_types?: string[] | null;
  avatar_url?: string | null;
  subscription_tier?: string | null;
  subscription_status?: string | null;
  stripe_customer_id?: string | null;
  role: UserRole | null;
  elder_mode: boolean;
  language: "de" | "en" | "tr" | "sq";
  created_at: string;
};

export type PendingRegistrationProfile = {
  id: string;
  firstName: string;
  lastName: string;
};
