import { useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';
import { onCLS, onINP, onLCP } from 'web-vitals';
import { trackTelemetry } from '@/services/telemetry';

/**
 * First-party page analytics plus sampled Core Web Vitals.
 *
 * No email, answers, card text, portfolio data, or device identifier is sent.
 * Custom lesson events deliberately stay in the synced progress model instead
 * of a third-party analytics payload.
 */
export function Telemetry() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    void trackTelemetry('page_view', pathname);
  }, [pathname]);

  useEffect(() => {
    const report = (metric: { name: string; value: number }) => {
      void trackTelemetry('web_vital', pathnameRef.current, metric.name, metric.value);
    };
    onCLS(report);
    onINP(report);
    onLCP(report);
  }, []);

  return null;
}
