import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop Component
 * Ensures that whenever the user navigates to another route,
 * the page smoothly scrolls back to the top of the page.
 */
export const ScrollToTop: React.FC = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // If the browser supports manual scroll restoration, enable it so browser back/forward
    // doesn't fight the smooth scroll motion
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    // If there's an anchor hash (e.g. #faq), scroll to that element
    if (hash) {
      const targetElement = document.getElementById(hash.replace("#", ""));
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }

    // Smoothly scroll window to top with nice motion
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });

    // Also handle documentElement / body in case of varying browser root scroll implementations
    if (document.documentElement && document.documentElement.scrollTop > 0) {
      document.documentElement.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    }
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;

