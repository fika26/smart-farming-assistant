'use client';

import { Bot, Brain, Loader2, MessageCircleQuestion, Send, Sparkles, Trash2, User } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useApp } from '@/components/AppProviders';
import { PageState } from '@/components/PageState';
import { InsightCard } from '@/components/domain';
import {
  Badge,
  Button,
  Chip,
  Disclaimer,
  PageHeader,
  Panel,
  Segmented,
  SourceTag,
} from '@/components/ui';
import { ApiError, postJson } from '@/lib/api';
import { clockTime, cx } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import type { ChatResponse, Evidence, Insight } from '@/types/api';

interface Turn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  at: string;
  grounded?: Evidence[];
  isError?: boolean;
}

interface Suggestion {
  text: string;
  /** Ask about a specific field — the question is answered from that field's readings. */
  fieldId?: string;
}

const BASE_QUESTION_KEYS = [
  'ai.q.yellowLeaves',
  'ai.q.irrigate',
  'ai.q.fertilizer',
  'ai.q.disease',
  'ai.q.soilHealth',
];

export default function AiAssistantPage() {
  const { fields, fieldId, t } = useApp();
  const target = fields.find((item) => item.id === fieldId) ?? fields[0] ?? null;
  const [tab, setTab] = useState<'chat' | 'insights'>('chat');
  // Set from the backend's own `is_mock` flag on the latest reply, never assumed.
  const [fallbackMode, setFallbackMode] = useState(false);

  return (
    <>
      <PageHeader
        title={t('ai.title')}
        description={tab === 'chat' ? t('ai.chat.description') : t('ai.insights.description')}
        meta={
          <>
            {target ? <Chip>{target.name} · {target.crop}</Chip> : null}
            <SourceTag source="derived" />
            {tab === 'chat' && fallbackMode ? <Badge tone="clay">{t('ai.fallbackBadge')}</Badge> : null}
          </>
        }
      />

      <div className="mb-5">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'chat', label: t('ai.tab.chat') },
            { value: 'insights', label: t('ai.tab.insights') },
          ]}
        />
      </div>

      {tab === 'insights' ? <InsightsTab /> : <ChatTab onFallbackChange={setFallbackMode} fallbackMode={fallbackMode} />}
    </>
  );
}

function ChatTab({
  onFallbackChange,
  fallbackMode,
}: {
  onFallbackChange: (value: boolean) => void;
  fallbackMode: boolean;
}) {
  const { fields, fieldId, setFieldId, language, t } = useApp();
  const target = fields.find((item) => item.id === fieldId) ?? fields[0] ?? null;

  // The first suggestion is built from whichever field is in the worst shape, so the
  // most useful question on the screen is always specific to this farm right now.
  const suggestions = useMemo<Suggestion[]>(() => {
    const worst = [...fields].sort((a, b) => a.health_score - b.health_score)[0];
    const contextual: Suggestion[] = worst
      ? [
          { text: t('ai.q.fieldRisk').replace('{field}', worst.name), fieldId: worst.id },
        ]
      : [];
    const general: Suggestion[] = BASE_QUESTION_KEYS.map((key) => ({ text: t(key) }));
    return [...general, ...contextual].slice(0, 7);
  }, [fields, t]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns, busy]);

  async function ask(question: string, askFieldId?: string) {
    const trimmed = question.trim();
    if (!trimmed || busy) return;
    if (askFieldId && askFieldId !== fieldId) setFieldId(askFieldId);
    const now = new Date().toISOString();
    setTurns((current) => [
      ...current,
      { id: `u-${now}`, role: 'user', content: trimmed, at: now },
    ]);
    setInput('');
    setBusy(true);

    try {
      const response = await postJson<ChatResponse>('/ai-assistant/chat', {
        message: trimmed,
        field_id: askFieldId ?? target?.id ?? null,
        language,
        history: turns.slice(-6).map((turn) => ({ role: turn.role, content: turn.content })),
      });
      onFallbackChange(response.is_mock);
      setTurns((current) => [
        ...current,
        {
          id: `a-${response.answered_at}`,
          role: 'assistant',
          content: response.reply,
          at: response.answered_at,
          grounded: response.grounded_on,
        },
      ]);
    } catch (err) {
      setTurns((current) => [
        ...current,
        {
          id: `a-error-${Date.now()}`,
          role: 'assistant',
          at: new Date().toISOString(),
          isError: true,
          content: err instanceof ApiError && err.detail ? err.detail : t('ai.error'),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <Panel className="flex h-[68vh] min-h-[520px] flex-col overflow-hidden">
          <div className="scroll-thin flex-1 space-y-4 overflow-y-auto p-5">
            {turns.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-leaf-50 text-leaf-600">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="font-display text-[1.05rem] text-leaf-900">{t('ai.emptyTitle')}</p>
                <p className="max-w-sm text-sm text-ink-muted">{t('ai.emptyBody')}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {suggestions.slice(0, 5).map((question) => (
                    <button
                      key={question.text}
                      onClick={() => ask(question.text, question.fieldId)}
                      className="press rounded-full border border-line bg-raised px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-leaf-300 hover:bg-leaf-50 hover:text-leaf-800"
                    >
                      {question.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              turns.map((turn) => (
                <div
                  key={turn.id}
                  className={cx('flex gap-3', turn.role === 'user' && 'flex-row-reverse')}
                >
                  <span
                    className={cx(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      turn.role === 'user'
                        ? 'bg-canvas text-ink-muted'
                        : 'bg-leaf-700 text-leaf-50',
                    )}
                  >
                    {turn.role === 'user' ? (
                      <User className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Bot className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                  <div className={cx('max-w-[85%] min-w-0', turn.role === 'user' && 'text-right')}>
                    <div
                      className={cx(
                        'inline-block rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
                        turn.role === 'user'
                          ? 'bg-leaf-600 text-white'
                          : turn.isError
                            ? 'border border-ember-500/40 bg-ember-500/10 text-ink'
                            : 'border border-line bg-raised text-ink-soft',
                      )}
                    >
                      {turn.content}
                    </div>
                    {turn.grounded?.length ? (
                      <div className="mt-2">
                        <p className="eyebrow mb-1.5">{t('ai.readingsUsed')}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {turn.grounded.map((item) => (
                            <span
                              key={`${turn.id}-${item.label}`}
                              className="inline-flex items-center gap-1.5 rounded border border-line bg-surface px-1.5 py-0.5 text-2xs text-ink-muted"
                            >
                              {item.label}
                              <span className="num font-medium text-ink">{item.value}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <p className="num mt-1 text-2xs text-ink-faint">{clockTime(turn.at)}</p>
                  </div>
                </div>
              ))
            )}
            {busy ? (
              <div className="flex gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-leaf-700 text-leaf-50">
                  <Bot className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-raised px-3.5 py-2.5 text-sm text-ink-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  {t('ai.thinking')}
                </span>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          <div className="border-t border-line p-3">
            <div className="mb-2 flex items-center justify-between gap-3 px-0.5">
              <p className="text-2xs text-ink-faint">{t('ai.keyHint')}</p>
              {turns.length > 0 ? (
                <button
                  onClick={() => setTurns([])}
                  disabled={busy}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-2xs font-medium text-ink-muted transition-colors hover:bg-raised hover:text-ink disabled:opacity-60"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  {t('ai.clearConversation')}
                </button>
              ) : null}
            </div>
            <label htmlFor="assistant-input" className="sr-only">
              {t('ai.input.label')}
            </label>
            <div className="flex items-end gap-2">
              <textarea
                id="assistant-input"
                value={input}
                rows={1}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    ask(input);
                  }
                }}
                placeholder={t('ai.input.placeholder')}
                className="scroll-thin max-h-32 min-h-[42px] flex-1 resize-y rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint"
              />
              <Button onClick={() => ask(input)} disabled={busy || !input.trim()}>
                <Send className="h-4 w-4" aria-hidden="true" />
                {t('ai.send')}
              </Button>
            </div>
          </div>
        </Panel>

        <aside className="space-y-4">
          <Panel className="p-4">
            <p className="eyebrow mb-2.5">{t('ai.quickQuestions')}</p>
            <ul className="space-y-1.5">
              {suggestions.map((question) => (
                <li key={question.text}>
                  <button
                    onClick={() => ask(question.text, question.fieldId)}
                    disabled={busy}
                    className="press flex w-full items-center gap-2 rounded-lg border border-line bg-raised px-3 py-2 text-left text-sm text-ink-soft transition-colors hover:border-leaf-300 hover:bg-leaf-50 hover:text-leaf-800 disabled:opacity-60"
                  >
                    <MessageCircleQuestion
                      className="h-3.5 w-3.5 shrink-0 text-leaf-600"
                      aria-hidden="true"
                    />
                    {question.text}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          {fields.length > 1 ? (
            <Panel className="p-4">
              <p className="eyebrow mb-2.5">{t('ai.answerForField')}</p>
              <div className="space-y-1.5">
                {fields.map((field) => (
                  <button
                    key={field.id}
                    onClick={() => setFieldId(field.id)}
                    className={cx(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-raised',
                      target?.id === field.id && 'bg-leaf-50 text-leaf-800',
                    )}
                  >
                    <span className="truncate">{field.name}</span>
                    <span className="num text-2xs text-ink-faint">{field.health_score}</span>
                  </button>
                ))}
              </div>
            </Panel>
          ) : null}

          <Disclaimer>
            {fallbackMode ? t('ai.disclaimer.fallback') : t('ai.disclaimer.live')}
          </Disclaimer>
        </aside>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- insights ---- */

function InsightsTab() {
  const { fieldId } = useApp();
  const { data, meta, loading, error, refresh } = useApi<Insight[]>('/ai-insights', {
    field_id: fieldId,
  });
  const insights = data ?? [];

  return (
    <>
      <Panel className="mb-5 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: 'Observed',
              body: 'Live readings from the five hardware channels, plus metrics derived from them.',
            },
            {
              label: 'Interpretation',
              body: 'A deterministic rule compares those values against crop, stage and soil thresholds.',
            },
            {
              label: 'Action',
              body: 'A concrete step the farmer can take, with the window in which it matters.',
            },
          ].map((step, index) => (
            <div key={step.label} className="flex gap-3">
              <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-leaf-200 bg-leaf-50 text-2xs font-semibold text-leaf-700">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{step.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Disclaimer>
            This intelligence is rule-based and fully explainable — it runs agronomic models
            (VPD, ET₀, GDD, depletion, leaf-wetness proxy) over live sensor data. No trained machine
            learning model is used, and no claim of predictive accuracy is made.
          </Disclaimer>
        </div>
      </Panel>

      <PageState
        loading={loading}
        error={error}
        onRetry={refresh}
        errorTitle="We couldn't load your insights"
        loadingLabel="Interpreting your latest readings…"
      >
        {insights.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        ) : (
          <Panel className="p-5">
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-leaf-50 text-leaf-600">
                <Brain className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="font-medium text-ink">Nothing to explain yet</p>
              <p className="max-w-sm text-sm leading-relaxed text-ink-muted">
                Add field or crop information to receive plain-language insights from your live
                readings.
              </p>
            </div>
          </Panel>
        )}
      </PageState>
      {meta ? (
        <div className="mt-4 flex justify-end">
          <SourceTag source={meta.data_source} />
        </div>
      ) : null}
    </>
  );
}
