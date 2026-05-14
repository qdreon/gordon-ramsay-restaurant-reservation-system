'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (token: string) => Promise<void>;
  reservationDetails?: {
    date: string;
    time: string;
    party_size: number;
    table_id: string;
  };
}

/**
 * Checkout Modal with 5-minute countdown timer.
 *
 * Purpose:
 *   Displays a simulated payment checkout form with a 5-minute timer.
 *   On confirmation, submits to `/api/reservations/lock` endpoint.
 *   On timeout or cancel, releases the reservation lock.
 *
 * Features:
 *   - Countdown timer (5 minutes = 300 seconds)
 *   - Simulated payment form (card, expiry, CVV)
 *   - Auto-close on timer expiry
 *   - Loading state during submission
 *   - Error handling with user feedback
 */
export default function CheckoutModal({
  isOpen,
  onClose,
  onConfirm,
  reservationDetails,
}: CheckoutModalProps) {
  // Form state
  const [cardNumber, setCardNumber] = useState('4111111111111111');
  const [cardExpiry, setCardExpiry] = useState('12/25');
  const [cardCVV, setCardCVV] = useState('123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [isExpired, setIsExpired] = useState(false);

  // Countdown while open (initial state resets when parent remounts via key)
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Auto-close on timer expiry
  useEffect(() => {
    if (isExpired) {
      const timeout = setTimeout(() => {
        setError('Checkout session expired. Please try again.');
        setTimeout(() => {
          onClose();
        }, 2000);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isExpired, onClose]);

  // Format time display (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle form submission
  async function handleConfirm() {
    setError(null);

    // Validate form
    if (!cardNumber || !cardExpiry || !cardCVV) {
      setError('Please fill in all payment fields.');
      return;
    }

    if (cardNumber.length < 15) {
      setError('Invalid card number.');
      return;
    }

    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      setError('Invalid expiry format (MM/YY).');
      return;
    }

    if (cardCVV.length < 3) {
      setError('Invalid CVV.');
      return;
    }

    setLoading(true);

    try {
      // Generate a simulated token (in production, this would come from Stripe/similar)
      const token = `tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Call the confirm callback (which usually calls the lock API)
      // This will throw on error; catch block below handles it
      await onConfirm(token);
      // If successful, onConfirm will redirect; modal will close automatically
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed. Please try again.';
      setError(message);
      setLoading(false);
      // Keep modal open so user can try again or see error clearly
    }
  }

  // Handle cancel
  function handleCancel() {
    setError(null);
    setCardNumber('4111111111111111');
    setCardExpiry('12/25');
    setCardCVV('123');
    onClose();
  }

  if (!isOpen) return null;

  // Determine timer color based on time left
  const timerColor =
    timeLeft <= 60
      ? 'text-red-600 dark:text-red-400' // Red: < 1 minute
      : timeLeft <= 120
        ? 'text-yellow-600 dark:text-yellow-400' // Yellow: < 2 minutes
        : 'text-green-600 dark:text-green-400'; // Green: >= 2 minutes

  return (
    <div data-test="checkout-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className="w-full max-w-md rounded-lg border bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 dark:border-slate-700">
          <h2 className="text-xl font-bold">Confirm Your Booking</h2>
          <button
            onClick={handleCancel}
            disabled={loading || isExpired}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50 dark:hover:text-slate-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 px-6 py-4">
          {/* Countdown Timer */}
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4 dark:bg-slate-700">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Time remaining</p>
              <p className={`text-2xl font-bold ${timerColor}`}>{formatTime(timeLeft)}</p>
            </div>
            {isExpired && (
              <div className="text-center">
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">EXPIRED</p>
                <p className="text-xs text-slate-500">Session ended</p>
              </div>
            )}
          </div>

          {/* Reservation Details (if provided) */}
          {reservationDetails && (
            <div className="space-y-2 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Date:</span>
                <span className="text-sm font-semibold">{reservationDetails.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Time:</span>
                <span className="text-sm font-semibold">{reservationDetails.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Party Size:</span>
                <span className="text-sm font-semibold">{reservationDetails.party_size} guests</span>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Payment Form */}
          <div className="space-y-4">
            <div>
              <label htmlFor="card" className="block text-sm font-medium">
                Card Number
              </label>
              <input
                id="card"
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, ''))}
                placeholder="4111 1111 1111 1111"
                disabled={loading || isExpired}
                maxLength={19}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-slate-500">Test: 4111 1111 1111 1111</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="expiry" className="block text-sm font-medium">
                  Expiry (MM/YY)
                </label>
                <input
                  id="expiry"
                  type="text"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  placeholder="MM/YY"
                  disabled={loading || isExpired}
                  maxLength={5}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="cvv" className="block text-sm font-medium">
                  CVV
                </label>
                <input
                  id="cvv"
                  type="text"
                  value={cardCVV}
                  onChange={(e) => setCardCVV(e.target.value)}
                  placeholder="123"
                  disabled={loading || isExpired}
                  maxLength={4}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>
            </div>

            <p className="text-xs text-slate-500">
              💳 This is a simulated payment form. No real charges will be made.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-700">
          <button
            onClick={handleCancel}
            disabled={loading || isExpired}
            className="flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || isExpired}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-400 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            {loading ? 'Processing...' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
