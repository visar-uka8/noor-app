export type AppointmentPayload = {
  patient_id: string;
  doctor_name: string;
  doctor_specialization: string;
  scheduled_at: string;
  consultation_type: "Video";
  fee: number;
  reason: string | null;
  status: "confirmed";
};

export const demoPatientId = "hans-leka-demo";
