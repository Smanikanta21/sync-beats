"use client";

import { useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function Preloader() {
  useEffect(() => {
    // Refresh ScrollTrigger cleanly on initial mount
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
