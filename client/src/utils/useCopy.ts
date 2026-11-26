import { useCallback, useEffect, useRef, useState } from 'react';

/** Copies text to the clipboard; `copied` stays true for a moment so the button can say so. */
export function useCopy(resetAfterMs = 2000): { copied: boolean; copy: (text: string) => void } {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(
    (text: string) => {
      void navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), resetAfterMs);
      });
    },
    [resetAfterMs],
  );

  return { copied, copy };
}
