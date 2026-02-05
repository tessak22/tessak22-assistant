"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function VerifyRequestContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "your email";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--color-primary-light)] to-white p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-[var(--color-border)] text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-[var(--color-primary-light)] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-[var(--color-primary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-dark)] mb-2">
            Check your email
          </h1>
          <p className="text-gray-600">
            We sent a sign-in link to <strong>{email}</strong>
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            Click the link in the email to sign in. The link will expire in 24 hours.
          </p>
        </div>

        <div className="text-sm text-gray-500">
          <p className="mb-2">Didn't receive the email?</p>
          <ul className="text-left space-y-1 mb-4">
            <li>• Check your spam folder</li>
            <li>• Make sure the email address is correct</li>
            <li>• Wait a few minutes and try again</li>
          </ul>
          <a
            href="/auth/signin"
            className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium"
          >
            ← Back to sign in
          </a>
        </div>
      </div>
    </div>
  );
}

export default function VerifyRequestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--color-primary-light)] to-white">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <VerifyRequestContent />
    </Suspense>
  );
}
