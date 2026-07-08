export type UserRole = "patient" | "family_member";

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  role: UserRole;
  elder_mode: boolean;
  language: "de" | "en";
  created_at: string;
};

export type PendingRegistrationProfile = {
  id: string;
  firstName: string;
  lastName: string;
};
