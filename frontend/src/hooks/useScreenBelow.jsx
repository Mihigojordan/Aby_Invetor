import { useEffect, useState } from "react";

const useScreenBelow = (width = 640) => {
  const [isBelow, setIsBelow] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < width;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${width - 1}px)`);

    const handler = (e) => setIsBelow(e.matches);

    mediaQuery.addEventListener("change", handler);

    return () => mediaQuery.removeEventListener("change", handler);
  }, [width]);

  return isBelow;
};

export default useScreenBelow;
