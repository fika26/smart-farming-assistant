'use client';

import { Bot, Brain, ChevronDown, Cpu, ScanSearch, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { cx } from '@/lib/format';

const STORAGE_KEY = 'sfa.story.hidden';

const STEPS = [
  {
    href: '/sensors',
    icon: Cpu,
    title: 'Sensors collect',
    body: 'Soil moisture, DS18B20, SHT31 and BH1750 sampled every 30 min, RTC-stamped on the node.',
  },
  {
    href: '/ai-assistant',
    icon: Brain,
    title: 'System interprets',
    body: 'Agronomic models turn raw readings into VPD, ET₀, depletion and disease pressure.',
  },
  {
    href: '/risk-forecast',
    icon: ShieldAlert,
    title: 'Risks surface early',
    body: 'Five hazards scored across a 7-day horizon, each with the evidence behind it.',
  },
  {
    href: '/alerts',
    icon: Bot,
    title: 'Farmer gets actions',
    body: 'Every alert answers what happened, why it matters and what to do next.',
  },
  {
    href: '/disease-detection',
    icon: ScanSearch,
    title: 'Detection plugs in',
    body: 'Leaf-image analysis sits behind the same API contract, ready for a real model.',
  },
];

/** The 30-second product story, kept deliberately quiet so it never competes with live data. */
export function SystemStory() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setOpen(window.localStorage.getItem(STORAGE_KEY) === '0');
  }, []);

  function toggle() {
    setOpen((current) => {
      const next = !current;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, next ? '0' : '1');
      }
      return next;
    });
  }

  return (
    <section className="panel-sand px-5 py-4 sm:px-6">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="eyebrow">How this system works</span>
        <ChevronDown
          className={cx(
            'ml-auto h-4 w-4 text-ink-muted transition-transform duration-200',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
        <span className="sr-only">{open ? 'Hide explanation' : 'Show explanation'}</span>
      </button>
      {open ? (
      <div className="mt-4">
      <ol className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-5">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.href} className="relative">
              <Link href={step.href} className="group block">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-leaf-700">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-medium text-ink transition-colors group-hover:text-leaf-700">
                    {index + 1}. {step.title}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{step.body}</p>
              </Link>
              {index < STEPS.length - 1 ? (
                <span
                  className="absolute -right-3 top-3 hidden h-px w-4 bg-line-strong xl:block"
                  aria-hidden="true"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="mt-4 border-t border-line pt-3 text-2xs leading-relaxed text-ink-faint">
        The edge node, FastAPI service and rule engine already speak the production contract — the
        mock source can be replaced with live ESP32 uplinks without changing a single screen.
      </p>
      </div>
      ) : null}
    </section>
  );
}
