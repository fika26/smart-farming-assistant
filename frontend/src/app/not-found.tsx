import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="panel mx-auto max-w-lg p-10 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 font-display text-2xl text-ink">This page does not exist</h1>
      <p className="mt-2 text-sm text-ink-muted">
        The route you followed is not part of the Smart Farming Assistant navigation.
      </p>
      <Link
        href="/dashboard"
        className="mt-5 inline-flex rounded-lg bg-leaf-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-leaf-700"
      >
        Back to Overview
      </Link>
    </div>
  );
}
