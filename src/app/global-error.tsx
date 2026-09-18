"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <h2 className="text-xl font-bold">Fatal Error</h2>
          <p className="text-sm text-gray-500">Something went critically wrong.</p>
          <button
            onClick={() => reset()}
            className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
