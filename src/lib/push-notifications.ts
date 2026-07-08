export type PushSubscriptionRecord = {
  id: string;
  missedDoseEnabled: boolean;
  hasSubscription: boolean;
};

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;

  return navigator.serviceWorker.register("/sw.js");
}

export async function getPushPermissionState() {
  if (!isPushSupported()) return "unsupported" as const;
  return Notification.permission;
}

export async function subscribeToPushNotifications() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!publicKey) {
    throw new Error("VAPID public key is not configured.");
  }

  const registration = await registerServiceWorker();

  if (!registration) {
    throw new Error("Service worker is not available.");
  }

  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    return { permission, subscription: null };
  }

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  return { permission, subscription };
}

export async function savePushSubscription(
  subscription: PushSubscription,
  missedDoseEnabled = true,
) {
  const json = subscription.toJSON();

  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Push subscription is incomplete.");
  }

  const response = await fetch("/api/push/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      missed_dose_enabled: missedDoseEnabled,
    }),
  });

  if (!response.ok) {
    throw new Error("Push subscription could not be saved.");
  }

  return (await response.json()) as { subscription: PushSubscriptionRecord };
}

export async function fetchPushSubscriptionStatus() {
  const response = await fetch("/api/push/subscriptions");

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as { subscription: PushSubscriptionRecord | null };
}

export async function updateMissedDoseNotifications(enabled: boolean) {
  const response = await fetch("/api/push/subscriptions", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ missed_dose_enabled: enabled }),
  });

  if (!response.ok) {
    throw new Error("Push settings could not be updated.");
  }

  return (await response.json()) as { subscription: PushSubscriptionRecord };
}

export async function removePushSubscription() {
  const response = await fetch("/api/push/subscriptions", {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Push subscription could not be removed.");
  }
}
