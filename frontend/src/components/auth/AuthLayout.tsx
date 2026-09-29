'use client';

import { Leaf } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Split entry layout: an agricultural visual on the left, the form on the right.
 * The visual is drawn in-product (contoured field rows, a sensor node and its
 * readings) rather than stock photography, so it matches the dashboard exactly.
 */
function FieldVisual() {
  return (
    <svg
      viewBox="0 0 520 760"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Illustration of contoured crop rows with a sensor node"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2A4E35" />
          <stop offset="100%" stopColor="#23452F" />
        </linearGradient>
      </defs>

      <rect width="520" height="760" fill="url(#sky)" />

      {/* Contoured crop rows following the slope of the land */}
      <g fill="none" strokeLinecap="round">
        {Array.from({ length: 16 }).map((_, index) => {
          const y = 300 + index * 30;
          const amplitude = 26 + index * 1.6;
          return (
            <path
              key={index}
              d={`M -40 ${y} C 120 ${y - amplitude}, 300 ${y + amplitude}, 560 ${y - amplitude / 2}`}
              stroke="#A8B99A"
              strokeOpacity={0.1 + index * 0.026}
              strokeWidth={index > 11 ? 2 : 1.2}
            />
          );
        })}
      </g>

      {/* Horizon band */}
      <path
        d="M -40 300 C 120 274, 300 326, 560 288 L 560 -20 L -40 -20 Z"
        fill="#23452F"
      />
      <path
        d="M -40 300 C 120 274, 300 326, 560 288"
        stroke="#A8B99A"
        strokeOpacity="0.34"
        strokeWidth="1.4"
        fill="none"
      />

      {/* Sensor node with its reading rings */}
      <g transform="translate(352 268)">
        <circle r="52" fill="#A8B99A" fillOpacity="0.07" />
        <circle r="32" fill="#A8B99A" fillOpacity="0.1" />
        <circle r="6" fill="#A8B99A" />
        <line x1="0" y1="-6" x2="0" y2="-46" stroke="#A8B99A" strokeOpacity="0.5" strokeWidth="1.4" />
        <rect x="-13" y="-64" width="26" height="18" rx="4" fill="#A8B99A" fillOpacity="0.85" />
        <line x1="-6" y1="-58" x2="6" y2="-58" stroke="#23452F" strokeWidth="1.6" />
        <line x1="-6" y1="-53" x2="2" y2="-53" stroke="#23452F" strokeWidth="1.6" />
      </g>

      {/* A single reading trace, the same shape the dashboard charts draw */}
      <g transform="translate(64 150)">
        <path
          d="M 0 70 L 44 52 L 88 62 L 132 30 L 176 44 L 220 16 L 264 34"
          stroke="#A8B99A"
          strokeOpacity="0.55"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {[
          [0, 70],
          [88, 62],
          [176, 44],
          [264, 34],
        ].map(([x, y]) => (
          <circle key={`${x}`} cx={x} cy={y} r="3" fill="#A8B99A" fillOpacity="0.8" />
        ))}
      </g>

      {/* Young shoot */}
      <g transform="translate(118 612)" stroke="#A8B99A" strokeOpacity="0.5" fill="none">
        <path d="M 0 60 L 0 6" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M 0 26 C -22 20, -30 4, -28 -10 C -12 -8, -2 6, 0 26 Z" fill="#A8B99A" fillOpacity="0.16" />
        <path d="M 0 40 C 20 34, 28 18, 26 4 C 10 6, 2 20, 0 40 Z" fill="#A8B99A" fillOpacity="0.12" />
      </g>
    </svg>
  );
}

export function AuthLayout({
  children,
  headline = 'Intelligent farming starts with understanding your field.',
  support = 'Readings from your soil, air and canopy, turned into decisions you can act on the same day.',
}: {
  children: ReactNode;
  headline?: string;
  support?: string;
}) {
  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
      {/* Visual panel — a compact header on mobile, full height on desktop */}
      <aside className="relative isolate overflow-hidden bg-leaf-900 px-6 py-8 sm:px-10 lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:px-12 lg:py-14">
        <div className="absolute inset-0 -z-10 opacity-95">
          <FieldVisual />
        </div>

        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-leaf-300/15 ring-1 ring-leaf-300/30">
            <Leaf className="h-[18px] w-[18px] text-leaf-300" aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-[0.95rem] leading-tight text-canvas">
              Smart Farming Assistant
            </p>
            <p className="text-2xs uppercase tracking-[0.12em] text-leaf-300">
              Agricultural intelligence
            </p>
          </div>
        </div>

        <div className="mt-10 max-w-md lg:mt-0">
          <h2 className="font-display text-[1.6rem] leading-snug text-canvas lg:text-[2rem]">
            {headline}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-leaf-100/80 lg:text-[0.95rem]">
            {support}
          </p>
        </div>

        <ul className="mt-8 hidden gap-6 lg:flex">
          {[
            ['5 sensor channels', 'Soil, air and light, every 30 minutes'],
            ['Early warning', 'Risks flagged days before damage'],
            ['Plain language', 'What to do, not just what was measured'],
          ].map(([title, body]) => (
            <li key={title} className="max-w-[11rem]">
              <p className="text-xs font-semibold text-leaf-300">{title}</p>
              <p className="mt-1 text-2xs leading-relaxed text-leaf-100/70">{body}</p>
            </li>
          ))}
        </ul>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div className="w-full max-w-[26rem]">{children}</div>
      </main>
    </div>
  );
}

export function AuthFooterNote({ children }: { children: ReactNode }) {
  return <p className="mt-8 text-center text-2xs leading-relaxed text-ink-faint">{children}</p>;
}

export function AuthSwitch({
  question,
  actionLabel,
  href,
}: {
  question: string;
  actionLabel: string;
  href: string;
}) {
  return (
    <p className="mt-6 text-center text-sm text-ink-muted">
      {question}{' '}
      <Link
        href={href}
        className="font-medium text-leaf-700 underline-offset-4 hover:underline focus-visible:underline"
      >
        {actionLabel}
      </Link>
    </p>
  );
}
