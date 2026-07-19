import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type {
  PatientFamilyNote,
  UnreadFamilyNote,
  WatcherFamilyNoteReply,
} from "@/types/family-notes";
import { loadUserProfileRow } from "@/lib/load-settings-profile";

const maxMessageLength = 160;
const recentNoteHours = 72;

type FamilyNoteRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  read_at: string | null;
  reply_message?: string | null;
  replied_at?: string | null;
  seen_by_sender_at?: string | null;
  created_at: string;
};

export function isMissingFamilyNotesReplyColumnsError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const record = error as PostgrestError;
  const message = `${record.message ?? ""} ${record.details ?? ""}`.toLowerCase();

  return (
    record.code === "42703" ||
    record.code === "PGRST204" ||
    message.includes("reply_message") ||
    message.includes("replied_at") ||
    message.includes("seen_by_sender_at")
  );
}

export function isMissingFamilyNotesTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const record = error as PostgrestError;
  const message = `${record.message ?? ""} ${record.details ?? ""}`.toLowerCase();

  return (
    record.code === "42P01" ||
    record.code === "PGRST205" ||
    (message.includes("family_notes") &&
      (message.includes("does not exist") || message.includes("not found")))
  );
}

export function normalizeFamilyNoteMessage(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxMessageLength) {
    return trimmed.slice(0, maxMessageLength);
  }

  return trimmed;
}

export async function insertFamilyNote(
  supabase: SupabaseClient,
  input: {
    fromUserId: string;
    toUserId: string;
    message: string;
  },
) {
  const { data, error } = await supabase
    .from("family_notes")
    .insert({
      from_user_id: input.fromUserId,
      to_user_id: input.toUserId,
      message: input.message,
    })
    .select("id, created_at")
    .single<{ id: string; created_at: string }>();

  if (error) throw error;
  return data;
}

async function mapFamilyNoteRow(
  supabase: SupabaseClient,
  data: Pick<FamilyNoteRow, "id" | "from_user_id" | "message" | "created_at" | "read_at">,
): Promise<PatientFamilyNote> {
  const { profile } = await loadUserProfileRow(
    supabase,
    data.from_user_id,
    "Family note sender profile",
  );

  const firstName = profile?.first_name?.trim() || "Familie";
  const lastName = profile?.last_name?.trim() || "";
  const senderName = `${firstName}${lastName ? ` ${lastName}` : ""}`.trim();

  return {
    id: data.id,
    message: data.message,
    senderName,
    senderFirstName: firstName,
    createdAt: data.created_at,
    isUnread: data.read_at == null,
  };
}

export async function loadLatestUnreadFamilyNote(
  supabase: SupabaseClient,
  patientId: string,
): Promise<UnreadFamilyNote | null> {
  const note = await loadVisibleFamilyNoteForPatient(supabase, patientId);
  if (!note?.isUnread) return null;

  const { isUnread: _isUnread, ...unreadNote } = note;
  return unreadNote;
}

export async function loadVisibleFamilyNoteForPatient(
  supabase: SupabaseClient,
  patientId: string,
): Promise<PatientFamilyNote | null> {
  const { data: unreadData, error: unreadError } = await supabase
    .from("family_notes")
    .select("id, from_user_id, message, created_at, read_at")
    .eq("to_user_id", patientId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<FamilyNoteRow>();

  if (unreadError) {
    if (isMissingFamilyNotesTableError(unreadError)) return null;
    throw unreadError;
  }

  if (unreadData) {
    return mapFamilyNoteRow(supabase, unreadData);
  }

  const cutoff = new Date(
    Date.now() - recentNoteHours * 60 * 60 * 1000,
  ).toISOString();

  const { data: recentData, error: recentError } = await supabase
    .from("family_notes")
    .select("id, from_user_id, message, created_at, read_at")
    .eq("to_user_id", patientId)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<FamilyNoteRow>();

  if (recentError) {
    if (isMissingFamilyNotesTableError(recentError)) return null;
    throw recentError;
  }

  if (!recentData) return null;

  return mapFamilyNoteRow(supabase, recentData);
}

export async function loadVisibleFamilyNoteSafe(
  supabase: SupabaseClient,
  patientId: string,
) {
  try {
    return await loadVisibleFamilyNoteForPatient(supabase, patientId);
  } catch (error) {
    console.error("Visible family note load failed:", error);
    return null;
  }
}

export async function loadUnreadFamilyNoteSafe(
  supabase: SupabaseClient,
  patientId: string,
) {
  return loadVisibleFamilyNoteSafe(supabase, patientId);
}

export async function markFamilyNoteRead(
  supabase: SupabaseClient,
  noteId: string,
  patientId: string,
) {
  const { error } = await supabase
    .from("family_notes")
    .update({ read_at: new Date().toISOString() })
    .eq("id", noteId)
    .eq("to_user_id", patientId)
    .is("read_at", null);

  if (error) throw error;
}

export async function replyToFamilyNote(
  supabase: SupabaseClient,
  noteId: string,
  patientId: string,
  replyMessage: string,
) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("family_notes")
    .update({
      reply_message: replyMessage,
      replied_at: now,
      read_at: now,
    })
    .eq("id", noteId)
    .eq("to_user_id", patientId);

  if (error) throw error;
}

export async function markFamilyNoteReplySeenBySender(
  supabase: SupabaseClient,
  noteId: string,
  senderId: string,
) {
  const { error } = await supabase
    .from("family_notes")
    .update({ seen_by_sender_at: new Date().toISOString() })
    .eq("id", noteId)
    .eq("from_user_id", senderId)
    .not("replied_at", "is", null)
    .is("seen_by_sender_at", null);

  if (error) throw error;
}

async function mapWatcherFamilyNoteReply(
  supabase: SupabaseClient,
  data: Pick<
    FamilyNoteRow,
    "id" | "to_user_id" | "reply_message" | "replied_at"
  >,
): Promise<WatcherFamilyNoteReply | null> {
  if (!data.reply_message?.trim() || !data.replied_at) return null;

  const { profile } = await loadUserProfileRow(
    supabase,
    data.to_user_id,
    "Family note reply patient profile",
  );

  const firstName = profile?.first_name?.trim() || "Angehörige";
  const lastName = profile?.last_name?.trim() || "";
  const patientName = `${firstName}${lastName ? ` ${lastName}` : ""}`.trim();

  return {
    id: data.id,
    replyMessage: data.reply_message.trim(),
    patientFirstName: firstName,
    patientName,
    repliedAt: data.replied_at,
  };
}

export async function loadUnseenFamilyNoteReplyForSender(
  supabase: SupabaseClient,
  senderId: string,
): Promise<WatcherFamilyNoteReply | null> {
  const { data, error } = await supabase
    .from("family_notes")
    .select("id, to_user_id, reply_message, replied_at")
    .eq("from_user_id", senderId)
    .not("replied_at", "is", null)
    .is("seen_by_sender_at", null)
    .order("replied_at", { ascending: false })
    .limit(1)
    .maybeSingle<
      Pick<FamilyNoteRow, "id" | "to_user_id" | "reply_message" | "replied_at">
    >();

  if (error) {
    if (
      isMissingFamilyNotesTableError(error) ||
      isMissingFamilyNotesReplyColumnsError(error)
    ) {
      return null;
    }
    throw error;
  }

  if (!data) return null;

  return mapWatcherFamilyNoteReply(supabase, data);
}

export async function loadUnseenFamilyNoteReplySafe(
  supabase: SupabaseClient,
  senderId: string,
) {
  try {
    return await loadUnseenFamilyNoteReplyForSender(supabase, senderId);
  } catch (error) {
    console.error("Unseen family note reply load failed:", error);
    return null;
  }
}
