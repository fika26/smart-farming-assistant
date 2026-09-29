'use client';

import { Check, ImageUp, Loader2, RotateCcw, ScanSearch, TriangleAlert } from 'lucide-react';
import { useRef, useState } from 'react';

import { useApp } from '@/components/AppProviders';
import {
  Badge,
  Button,
  Chip,
  Disclaimer,
  PageHeader,
  Panel,
  PanelHeader,
  ProgressBar,
  SourceTag,
  StatRow,
} from '@/components/ui';
import { ApiError, postForm } from '@/lib/api';
import { COLORS } from '@/config/theme';
import { cx, dateTime, num, severityTone } from '@/lib/format';
import type { DetectionResult } from '@/types/api';

type Phase = 'idle' | 'ready' | 'analyzing' | 'result' | 'error';

const ACCEPTED = 'image/jpeg,image/png,image/webp';

const SCAN_STEPS = [
  'Reading the image',
  'Extracting its signature',
  'Matching against the crop condition catalogue',
  'Scoring confidence and severity',
];

export default function DiseaseDetectionPage() {
  const { fields, fieldId, setFieldId, t } = useApp();
  const [phase, setPhase] = useState<Phase>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const targetField = fields.find((item) => item.id === fieldId) ?? fields[0] ?? null;

  function accept(selected: File | undefined) {
    if (!selected) return;
    if (!ACCEPTED.split(',').includes(selected.type)) {
      setMessage('Use a JPEG, PNG or WebP photo.');
      setPhase('error');
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResult(null);
    setMessage(null);
    setPhase('ready');
  }

  async function analyze() {
    if (!file) return;
    setPhase('analyzing');
    setMessage(null);
    setStep(0);
    const form = new FormData();
    form.append('image', file);
    form.append('field_id', targetField?.id ?? 'field-a');
    if (targetField?.crop) form.append('crop', targetField.crop);

    // Walk the visible stages so the wait explains what is happening rather than
    // showing an anonymous spinner.
    const timers = SCAN_STEPS.map((_, index) =>
      setTimeout(() => setStep(index + 1), 320 * (index + 1)),
    );

    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const response = await postForm<DetectionResult>('/disease-detection/analyze', form);
      setResult(response);
      setPhase('result');
    } catch (err) {
      setMessage(
        err instanceof ApiError
          ? err.detail
          : 'Cannot reach the FastAPI backend. Start it on port 8000 and try again.',
      );
      setPhase('error');
    } finally {
      timers.forEach(clearTimeout);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setMessage(null);
    setPhase('idle');
    setStep(0);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <>
      <PageHeader
        title={t('page.diseaseDetection.title')}
        description={t('page.diseaseDetection.description')}
        meta={
          <>
            {targetField ? <Chip>{targetField.name} · {targetField.crop}</Chip> : null}
            <SourceTag source="simulated" />
          </>
        }
        actions={
          phase !== 'idle' ? (
            <Button variant="secondary" size="sm" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Start over
            </Button>
          ) : null
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
        {/* Upload */}
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Upload crop image"
            caption="One leaf filling the frame, photographed in daylight, gives the most usable result."
          />
          <div className="p-5">
            {fields.length > 1 ? (
              <label className="mb-4 block">
                <span className="eyebrow">Which field is this leaf from?</span>
                <select
                  value={targetField?.id ?? ''}
                  onChange={(event) => setFieldId(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
                >
                  {fields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name} — {field.crop}
                    </option>
                  ))}
                </select>
                <span className="mt-1.5 block text-2xs text-ink-faint">
                  The crop for the chosen field decides which conditions are checked.
                </span>
              </label>
            ) : null}

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                accept(event.dataTransfer.files?.[0]);
              }}
              className={cx(
                'flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
                dragging ? 'border-leaf-400 bg-leaf-50' : 'border-line bg-raised',
              )}
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Uploaded crop leaf preview"
                  className="mb-4 max-h-56 w-auto rounded-lg border border-line object-contain"
                />
              ) : (
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink-faint">
                  <ImageUp className="h-5 w-5" aria-hidden="true" />
                </span>
              )}
              <p className="text-sm font-medium text-ink">
                {file ? file.name : 'Drag a leaf photo here, or choose one below'}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {file
                  ? `${(file.size / 1024).toFixed(0)} KB · ${file.type}`
                  : 'JPEG, PNG or WebP, up to 8 MB. One leaf filling the frame works best.'}
              </p>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED}
                className="sr-only"
                onChange={(event) => accept(event.target.files?.[0])}
              />
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => inputRef.current?.click()}
              >
                Choose a photo
              </Button>
            </div>

            {message ? (
              <p className="mt-4 flex items-start gap-2 rounded-lg border border-ember-300/60 bg-ember-100/50 px-3 py-2 text-sm text-ember-700">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {message}
              </p>
            ) : null}

            <Button
              className="mt-4 w-full"
              onClick={analyze}
              disabled={!file || phase === 'analyzing'}
            >
              {phase === 'analyzing' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Analyzing…
                </>
              ) : (
                <>
                  <ScanSearch className="h-4 w-4" aria-hidden="true" />
                  Analyze this leaf
                </>
              )}
            </Button>

            <div className="mt-4">
              <Disclaimer>
                Analysis is performed by a mock service that returns a deterministic result for a
                given image. No trained computer-vision model is running. The service boundary
                (<span className="font-mono">Detector.predict</span>) is designed so a real TFLite
                or ONNX classifier can replace it without changing this screen or the API contract.
              </Disclaimer>
            </div>
          </div>
        </Panel>

        {/* Result */}
        <div className="space-y-5">
          {phase === 'analyzing' ? (
            <Panel className="p-6">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-leaf-700" aria-hidden="true" />
                <div>
                  <p className="font-display text-[1.05rem] text-leaf-900">Scanning the leaf</p>
                  <p className="text-xs text-ink-muted">
                    Checking against the {targetField?.crop ?? 'crop'} condition catalogue.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <ProgressBar
                  value={(Math.min(step, SCAN_STEPS.length) / SCAN_STEPS.length) * 100}
                  label="Analysis progress"
                />
              </div>

              <ol className="mt-5 space-y-3" aria-live="polite">
                {SCAN_STEPS.map((label, index) => {
                  const state = step > index ? 'done' : step === index ? 'active' : 'pending';
                  return (
                    <li key={label} className="flex items-center gap-3">
                      <span
                        className={cx(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-2xs transition-colors duration-300',
                          state === 'done'
                            ? 'border-leaf-600 bg-leaf-600 text-canvas'
                            : state === 'active'
                              ? 'border-leaf-500 text-leaf-700'
                              : 'border-line text-ink-faint',
                        )}
                      >
                        {state === 'done' ? (
                          <Check className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span
                        className={cx(
                          'text-sm transition-colors duration-300',
                          state === 'pending' ? 'text-ink-faint' : 'text-ink-soft',
                        )}
                      >
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Panel>
          ) : null}


          {phase === 'result' && result ? (
            <>
              <Panel className="overflow-hidden">
                <div className="flex items-start gap-3 border-b border-line px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cx(
                          'rounded-full border px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide',
                          severityTone[result.severity],
                        )}
                      >
                        {result.severity}
                      </span>
                      <Badge tone="neutral">{result.condition_type}</Badge>
                      <Badge tone="clay">Mock analysis</Badge>
                    </div>
                    <h2 className="mt-2 font-display text-lg leading-tight text-leaf-900">
                      {result.suspected_condition}
                    </h2>
                    <p className="mt-1 text-xs text-ink-faint">
                      {result.crop} · {result.image_name} · {dateTime(result.analyzed_at)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <div>
                    <p className="eyebrow mb-1.5">Confidence</p>
                    <div className="flex items-center gap-3">
                      <ProgressBar
                        value={result.confidence * 100}
                        tone={result.confidence > 0.6 ? COLORS.healthy : COLORS.warning}
                      />
                      <span className="num text-sm font-medium text-ink">
                        {Math.round(result.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="eyebrow mb-1.5">Affected leaf area</p>
                    <div className="flex items-center gap-3">
                      <ProgressBar value={result.affected_area_pct} tone={COLORS.critical} />
                      <span className="num text-sm font-medium text-ink">
                        {num(result.affected_area_pct)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-t border-line px-5 py-4 text-sm leading-relaxed">
                  <p className="text-ink-soft">
                    <span className="eyebrow mr-2 text-ink-faint">Possible cause</span>
                    {result.possible_cause}
                  </p>
                  <p className="rounded-lg border border-leaf-200 bg-leaf-50 px-3 py-2 text-leaf-800">
                    <span className="eyebrow mr-2 text-leaf-600">Recommended action</span>
                    {result.recommended_action}
                  </p>
                </div>

                <div className="border-t border-line px-5 py-4">
                  <p className="eyebrow mb-2">Follow up</p>
                  <ul className="space-y-1.5">
                    {result.followups.map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm text-ink-soft">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {result.alternatives.length ? (
                  <div className="border-t border-line px-5 py-4">
                    <p className="eyebrow mb-2">Other possibilities considered</p>
                    <ul className="space-y-2">
                      {result.alternatives.map((alt) => (
                        <li key={alt.condition} className="flex items-center gap-3 text-sm">
                          <span className="min-w-0 flex-1 truncate text-ink-soft">{alt.condition}</span>
                          <span className="w-24">
                            <ProgressBar value={alt.confidence * 100} height={4} tone={COLORS.lineStrong} />
                          </span>
                          <span className="num w-10 text-right text-2xs text-ink-faint">
                            {Math.round(alt.confidence * 100)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="divide-y divide-line border-t border-line px-5 py-2">
                  <StatRow label="Model" value={result.model_name} />
                  <StatRow label="Version" value={result.model_version} />
                  <StatRow label="Image size" value={`${(result.image_size_bytes / 1024).toFixed(0)} KB`} />
                </div>

                <div className="border-t border-line px-5 py-4">
                  <Disclaimer>{result.disclaimer}</Disclaimer>
                </div>
              </Panel>
            </>
          ) : null}

          {phase === 'idle' || phase === 'ready' || phase === 'error' ? (
            <Panel className="p-5">
              <p className="eyebrow mb-3">What you will get back</p>
              <ul className="space-y-3">
                {[
                  ['Suspected condition', 'The most likely disease, pest or deficiency for this crop.'],
                  ['Confidence', 'How strongly the service matched — low confidence returns an inconclusive result rather than a guess.'],
                  ['Severity & affected area', 'How much of the leaf surface shows symptoms.'],
                  ['Possible cause', 'The agronomic conditions that typically produce it.'],
                  ['Recommended action', 'A concrete treatment or scouting step, plus follow-ups.'],
                ].map(([title, body]) => (
                  <li key={title} className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf-400" />
                    <div>
                      <p className="text-sm font-medium text-ink">{title}</p>
                      <p className="text-xs leading-relaxed text-ink-muted">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
