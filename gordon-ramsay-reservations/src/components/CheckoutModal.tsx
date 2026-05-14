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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">Confirm Your Booking</h2>
          <button
            onClick={handleCancel}
            disabled={loading || isExpired}
            className="text-zinc-400 transition hover:text-zinc-100 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 px-6 py-4">
          {/* Countdown Timer */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
            <div>
              <p className="text-sm text-zinc-300">Time remaining</p>
              <p className={`text-2xl font-bold ${timerColor}`}>{formatTime(timeLeft)}</p>
            </div>
            {isExpired && (
              <div className="text-center">
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">EXPIRED</p>
                <p className="text-xs text-zinc-400">Session ended</p>
              </div>
            )}
          </div>

          {/* Reservation Details (if provided) */}
          {reservationDetails && (
            <div className="space-y-2 rounded-xl border border-amber-300/20 bg-amber-500/10 p-4">
              <div className="flex justify-between">
                <span className="text-sm text-zinc-300">Date:</span>
                <span className="text-sm font-semibold">{reservationDetails.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-300">Time:</span>
                <span className="text-sm font-semibold">{reservationDetails.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-300">Party Size:</span>
                <span className="text-sm font-semibold">{reservationDetails.party_size} guests</span>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
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
                className="mt-1 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200/20 disabled:opacity-60 text-white"
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
                  className="mt-1 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200/20 disabled:opacity-60 text-white"
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
                  className="mt-1 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200/20 disabled:opacity-60 text-white"
                />
              </div>
            </div>

            <p className="text-xs text-zinc-400">
              💳 This is a simulated payment form. No real charges will be made.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-white/10 bg-black/20 px-6 py-4">
          <button
            onClick={handleCancel}
            disabled={loading || isExpired}
            className="flex-1 rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/20 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || isExpired}
            className="flex-1 rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:opacity-60"
          >
            {loading ? 'Processing...' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
