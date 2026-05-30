'use client';

import { Slider } from '@/components/ui/slider';
import { DRIVE_TIME_OPTIONS } from '@/lib/constants';

type Props = {
  minutes: number;
  onChange: (minutes: number) => void;
};

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min} min`;
  if (min === 0) return `${h} hr`;
  return `${h} hr ${min} min`;
}

const steps: number[] = [...DRIVE_TIME_OPTIONS]; // mutable copy, typed as number[] for indexOf

export default function DriveTimeSlider({ minutes, onChange }: Props) {
  const idx = steps.indexOf(minutes);
  const currentIndex = idx >= 0 ? idx : 3; // default ~2hrs if not found

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">Max drive time</p>
        <span className="text-xs font-semibold tabular-nums">
          {formatMinutes(minutes)}
        </span>
      </div>
      <Slider
        min={0}
        max={steps.length - 1}
        step={1}
        value={currentIndex}
        onValueChange={(v) => {
          const i = Array.isArray(v) ? v[0] : v;
          onChange(steps[i]);
        }}
        className="w-full"
      />
      <div className="flex justify-between mt-1">
        <span className="text-xs text-muted-foreground">{formatMinutes(steps[0])}</span>
        <span className="text-xs text-muted-foreground">{formatMinutes(steps[steps.length - 1])}</span>
      </div>
    </div>
  );
}
