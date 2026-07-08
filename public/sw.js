self.addEventListener("push", (event) => {
  const payload = event.data?.json?.() ?? {};
  const title = payload.title ?? "Noor";
  const options = {
    body: payload.body ?? "",
    icon: "/noor-icon.svg",
    badge: "/noor-icon.svg",
    data: {
      url: payload.url ?? "/dashboard",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            return client.focus();
          }
        }

        return self.clients.openWindow(targetUrl);
      }),
  );
});
