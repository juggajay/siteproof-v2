'use client';

import { useEffect, useState } from 'react';

/**
 * Accessibility Testing Helper Component
 * Shows accessibility violations in development mode
 */
export function A11yTestHelper() {
  const [violations, setViolations] = useState<any[]>([]);

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') return;

    // Check for axe-core
    const runAxe = async () => {
      try {
        // Dynamic import to avoid bundling in production
        const axe = await import('axe-core' as any);

        const results = await (axe as any).default.run();
        setViolations(results.violations);

        if (results.violations.length > 0) {
          console.group('%c⚠️ Accessibility Violations Found', 'color: orange; font-weight: bold');
          results.violations.forEach((violation: any) => {
            console.group(`${violation.impact?.toUpperCase()}: ${violation.help}`);
            console.log('Description:', violation.description);
            console.log('Help URL:', violation.helpUrl);
            console.log('Nodes:', violation.nodes);
            console.groupEnd();
          });
          console.groupEnd();
        } else {
          console.log('%c✅ No accessibility violations found', 'color: green; font-weight: bold');
        }
      } catch (error) {
        console.log('axe-core not available - install with: pnpm add -D axe-core');
      }
    };

    // Run on mount and after 1 second to catch dynamic content
    runAxe();
    const timeout = setTimeout(runAxe, 1000);

    return () => clearTimeout(timeout);
  }, []);

  // Don't render in production
  if (process.env.NODE_ENV !== 'development' || violations.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 max-w-md bg-orange-100 border-2 border-orange-500 rounded-lg p-4 shadow-lg z-50"
      role="alert"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-orange-900">
          ⚠️ {violations.length} A11y Violation{violations.length > 1 ? 's' : ''}
        </h3>
        <button
          onClick={() => setViolations([])}
          className="text-orange-600 hover:text-orange-800"
          aria-label="Dismiss violations"
        >
          ✕
        </button>
      </div>
      <div className="text-sm text-orange-800 max-h-48 overflow-y-auto">
        {violations.map((v, i) => (
          <div key={i} className="mb-2">
            <strong>{v.impact}:</strong> {v.help}
          </div>
        ))}
      </div>
      <button
        onClick={() => console.log('Accessibility Violations:', violations)}
        className="mt-2 text-xs text-orange-600 underline"
      >
        View details in console
      </button>
    </div>
  );
}
