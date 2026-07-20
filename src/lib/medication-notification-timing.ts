/** Minutes after scheduled time before the patient gets a reminder email. */
export const PATIENT_MISSED_REMINDER_MINUTES = 15;

/** Minutes after scheduled time before family watchers get an alert email. */
export const FAMILY_MISSED_ALERT_MINUTES = 30;

/** Minutes after scheduled time before a dose shows as "missed" in the app. */
export const MISSED_GRACE_MINUTES = FAMILY_MISSED_ALERT_MINUTES;

/** How often the missed-dose cron should run (for docs / SQL scripts). */
export const MISSED_DOSE_CRON_EXPRESSION = "*/10 * * * *";
