'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PullToRefresh } from '@/components/pwa/PullToRefresh';
import { SwipeableCard } from '@/components/pwa/SwipeableCard';
import { AddToHomeScreen } from '@/components/pwa/AddToHomeScreen';
import { useSwipe } from '@/hooks/useSwipe';
import { haptics } from '@/lib/haptics';

/**
 * Mobile Features Demo Page
 *
 * Demonstrates all mobile optimization features:
 * - Touch targets (44px minimum)
 * - Swipe gestures
 * - Pull-to-refresh
 * - Haptic feedback
 * - PWA features
 */
export default function MobileFeaturesDemo() {
  const [refreshCount, setRefreshCount] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<string | null>(null);
  const [items, setItems] = useState([
    { id: 1, title: 'Inspection Report #1234', status: 'pending' },
    { id: 2, title: 'Site Diary - Main Building', status: 'completed' },
    { id: 3, title: 'NCR - Foundation Issue', status: 'urgent' },
    { id: 4, title: 'Material Delivery - Concrete', status: 'pending' },
  ]);

  const handleRefresh = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setRefreshCount((prev) => prev + 1);
  };

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      setSwipeDirection('Left');
      setTimeout(() => setSwipeDirection(null), 2000);
    },
    onSwipeRight: () => {
      setSwipeDirection('Right');
      setTimeout(() => setSwipeDirection(null), 2000);
    },
    onSwipeUp: () => {
      setSwipeDirection('Up');
      setTimeout(() => setSwipeDirection(null), 2000);
    },
    onSwipeDown: () => {
      setSwipeDirection('Down');
      setTimeout(() => setSwipeDirection(null), 2000);
    },
    threshold: 50,
    enableHaptic: true,
  });

  const handleDeleteItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    haptics.success();
  };

  const handleArchiveItem = (id: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'archived' } : item
      )
    );
    haptics.success();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary-600 text-white p-6 sticky top-0 z-10 shadow-lg">
        <h1 className="text-2xl font-bold mb-2">Mobile Features Demo</h1>
        <p className="text-primary-100 text-sm">
          Test all mobile optimizations and PWA features
        </p>
      </div>

      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-6 space-y-8 pb-24">
          {/* Pull to Refresh Status */}
          {refreshCount > 0 && (
            <div className="bg-success-50 border border-success-200 rounded-lg p-4 text-center">
              <p className="text-success-700 font-semibold">
                Refreshed {refreshCount} time{refreshCount > 1 ? 's' : ''}!
              </p>
            </div>
          )}

          {/* Touch Targets Section */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              Touch Targets (44px min)
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              All buttons meet the 44px minimum touch target for accessibility.
            </p>

            <div className="space-y-4">
              {/* Button sizes */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Buttons:</p>
                <div className="flex flex-wrap gap-3">
                  <Button size="sm" onClick={() => haptics.light()}>
                    Small (44px)
                  </Button>
                  <Button size="md" onClick={() => haptics.medium()}>
                    Medium (48px)
                  </Button>
                  <Button size="lg" onClick={() => haptics.heavy()}>
                    Large (56px)
                  </Button>
                </div>
              </div>

              {/* Icon buttons */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Icon Buttons:
                </p>
                <div className="flex gap-3">
                  <IconButton
                    icon={
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    }
                    label="Like"
                    variant="ghost"
                  />
                  <IconButton
                    icon={
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                        />
                      </svg>
                    }
                    label="Share"
                    variant="primary"
                  />
                  <IconButton
                    icon={
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    }
                    label="Delete"
                    variant="error"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Form Inputs Section */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              Optimized Form Inputs (56px mobile)
            </h2>
            <div className="space-y-4">
              <Input
                label="Name"
                placeholder="Enter your name"
                fullWidth
                leftIcon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                }
              />
              <Select
                label="Project"
                options={[
                  { value: '1', label: 'Main Building' },
                  { value: '2', label: 'Parking Structure' },
                  { value: '3', label: 'Landscaping' },
                ]}
                placeholder="Select a project"
                fullWidth
              />
            </div>
          </section>

          {/* Swipe Gestures Section */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              Swipe Gestures
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Swipe in any direction on the box below:
            </p>

            <div
              {...swipeHandlers}
              className="bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg p-12 text-white text-center min-h-[200px] flex flex-col items-center justify-center touch-none"
            >
              <svg
                className="w-16 h-16 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
                />
              </svg>
              <p className="text-xl font-bold">
                {swipeDirection ? `Swiped ${swipeDirection}!` : 'Swipe Me!'}
              </p>
            </div>
          </section>

          {/* Swipeable Cards Section */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              Swipeable Cards
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Swipe left to delete, right to archive:
            </p>

            <div className="space-y-3">
              {items.map((item) => (
                <SwipeableCard
                  key={item.id}
                  onSwipeLeft={() => handleDeleteItem(item.id)}
                  onSwipeRight={() => handleArchiveItem(item.id)}
                  leftAction={{
                    label: 'Delete',
                    color: 'error',
                    icon: (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    ),
                  }}
                  rightAction={{
                    label: 'Archive',
                    color: 'success',
                    icon: (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                        />
                      </svg>
                    ),
                  }}
                  className="border border-gray-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-500 capitalize">
                        {item.status}
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.status === 'urgent'
                          ? 'bg-error-100 text-error-700'
                          : item.status === 'completed'
                            ? 'bg-success-100 text-success-700'
                            : item.status === 'archived'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-warning-100 text-warning-700'
                      }`}
                    >
                      {item.status}
                    </div>
                  </div>
                </SwipeableCard>
              ))}
            </div>
          </section>

          {/* Haptic Feedback Section */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              Haptic Feedback
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Feel the different vibration patterns (mobile only):
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => haptics.light()} variant="ghost" size="sm">
                Light
              </Button>
              <Button onClick={() => haptics.medium()} variant="ghost" size="sm">
                Medium
              </Button>
              <Button onClick={() => haptics.heavy()} variant="ghost" size="sm">
                Heavy
              </Button>
              <Button onClick={() => haptics.success()} variant="success" size="sm">
                Success
              </Button>
              <Button onClick={() => haptics.error()} variant="error" size="sm">
                Error
              </Button>
              <Button onClick={() => haptics.warning()} variant="warning" size="sm">
                Warning
              </Button>
            </div>
          </section>

          {/* PWA Section */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              PWA Features
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-success-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-semibold text-gray-900">Offline Support</p>
                  <p className="text-sm text-gray-600">
                    Service worker caches assets for offline use
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-success-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-semibold text-gray-900">Installable</p>
                  <p className="text-sm text-gray-600">
                    Add to home screen for app-like experience
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-success-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-semibold text-gray-900">
                    Push Notifications
                  </p>
                  <p className="text-sm text-gray-600">
                    Receive updates even when app is closed
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Info Section */}
          <section className="bg-primary-50 border border-primary-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-primary-900 mb-2">
              Testing Tips
            </h3>
            <ul className="text-sm text-primary-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-0.5">•</span>
                <span>Pull down from the top to trigger refresh</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-0.5">•</span>
                <span>All buttons are minimum 44px touch targets</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-0.5">•</span>
                <span>Form inputs are 56px on mobile for easier typing</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-0.5">•</span>
                <span>Test on a real device for best haptic feedback</span>
              </li>
            </ul>
          </section>
        </div>
      </PullToRefresh>

      {/* Add to Home Screen Prompt */}
      <AddToHomeScreen />
    </div>
  );
}
