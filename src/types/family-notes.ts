export type FamilyNote = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

export type UnreadFamilyNote = {
  id: string;
  message: string;
  senderName: string;
  senderFirstName: string;
  createdAt: string;
};

export type PatientFamilyNote = UnreadFamilyNote & {
  isUnread: boolean;
};

export type WatcherFamilyNoteReply = {
  id: string;
  replyMessage: string;
  patientFirstName: string;
  patientName: string;
  repliedAt: string;
};
