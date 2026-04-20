import { useEffect } from "react";

const SUFFIX = "Saber 11";

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | ${SUFFIX}`;
    return () => {
      document.title = SUFFIX;
    };
  }, [title]);
}
