'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Download, X } from 'lucide-react';
import { haptics } from '@/lib/haptics';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWA Install Prompt Component
 * Shows a prompt to install the app on mobile devices
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Check if we should show the prompt
      const promptCount = parseInt(localStorage.getItem('installPromptCount') || '0');
      const lastPromptDate = localStorage.getItem('lastInstallPromptDate');
      const today = new Date().toDateString();

      // Show prompt if:
      // 1. Shown less than 3 times
      // 2. Not shown today
      // 3. Wait 30 seconds before showing
      if (promptCount < 3 && lastPromptDate !== today) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 30000); // Show after 30 seconds
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Handle app installed event
    const installedHandler = () => {
      console.log('PWA was installed');
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    haptics.medium();

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      haptics.success();
    } else {
      console.log('User dismissed the install prompt');
    }

    // Update tracking
    const count = parseInt(localStorage.getItem('installPromptCount') || '0') + 1;
    localStorage.setItem('installPromptCount', count.toString());
    localStorage.setItem('lastInstallPromptDate', new Date().toDateString());

    // Clear the prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    haptics.light();

    // Update tracking
    const count = parseInt(localStorage.getItem('installPromptCount') || '0') + 1;
    localStorage.setItem('installPromptCount', count.toString());
    localStorage.setItem('lastInstallPromptDate', new Date().toDateString());

    setShowPrompt(false);
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div
      className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-white border border-gray-200 rounded-lg shadow-2xl p-4 z-50 animate-slide-up"
      role="dialog"
      aria-labelledby="install-prompt-title"
      aria-describedby="install-prompt-description"
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-2 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Close install prompt"
      >
        <X className="h-5 w-5 text-gray-500" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <div className="p-2 bg-primary-100 rounded-lg flex-shrink-0">
          <Download className="h-6 w-6 text-primary-600" />
        </div>

        <div className="flex-1">
          <h3 id="install-prompt-title" className="font-semibold text-base mb-1">
            Install SiteProof
          </h3>
          <p id="install-prompt-description" className="text-sm text-gray-600 mb-3">
            Add to your home screen for quick access, offline support, and a native app experience.
          </p>

          <div className="flex gap-2">
            <Button onClick={handleInstall} size="sm" variant="primary" fullWidth>
              Install App
            </Button>
            <Button onClick={handleDismiss} size="sm" variant="ghost">
              Not Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
