'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const error = searchParams.get('error');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h1 className="mb-4 text-lg font-semibold">Sign in</h1>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        Enter your username and password to continue.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error === 'missing' ? 'Please enter username and password.' : 'Invalid username or password.'}
        </div>
      )}

      <form method="POST" action="/api/login" className="space-y-3">
        <input type="hidden" name="redirect" value={redirect} />
        
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-gray-600 dark:text-gray-300">Username</span>
          <input
            type="text"
            name="username"
            required
            autoComplete="username"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-gray-700 dark:bg-gray-800"
            placeholder="Enter username"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-xs text-gray-600 dark:text-gray-300">Password</span>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-gray-700 dark:bg-gray-800"
              placeholder="Enter password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
        </label>

        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-sm items-center justify-center px-4">
      <Suspense fallback={<div className="text-sm text-gray-500">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}


