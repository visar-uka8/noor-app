import { useEffect, useRef } from "react";

function getMarketingScrollRoot(): Element | null {
  return document.querySelector(".marketing-shell");
}

function revealIfVisible(
  element: Element,
  root: Element | null,
  observer: IntersectionObserver,
) {
  const rootRect =
    root instanceof Element ? root.getBoundingClientRect() : null;
  const rect = element.getBoundingClientRect();

  const visibleTop = rootRect?.top ?? 0;
  const visibleBottom = rootRect?.bottom ?? window.innerHeight;
  const visibleHeight = visibleBottom - visibleTop;

  if (visibleHeight <= 0) {
    return;
  }

  const overlap =
    Math.min(rect.bottom, visibleBottom) - Math.max(rect.top, visibleTop);
  const ratio = overlap / rect.height;

  if (ratio >= 0.08) {
    element.classList.add("visible");
    observer.unobserve(element);
  }
}

export function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = getMarketingScrollRoot();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root,
        threshold: 0.08,
        rootMargin: "0px 0px -24px 0px",
      },
    );

    const elements = document.querySelectorAll(".scroll-animate");
    elements.forEach((element) => {
      revealIfVisible(element, root, observer);
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return ref;
}

export function useMarketingIntersection<T extends Element>(
  onVisible: () => void,
  options?: { threshold?: number },
) {
  const ref = useRef<T>(null);
  const onVisibleRef = useRef(onVisible);
  onVisibleRef.current = onVisible;

  useEffect(() => {
    const target = ref.current;
    if (!target) return;

    const root = getMarketingScrollRoot();
    let done = false;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !done) {
            done = true;
            onVisibleRef.current();
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root,
        threshold: options?.threshold ?? 0.2,
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [options?.threshold]);

  return ref;
}
