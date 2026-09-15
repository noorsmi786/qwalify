import { getScoreColor } from '@/lib/utils';

interface ScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { r: 16, stroke: 3, width: 44, viewBox: 22 },
  md: { r: 22, stroke: 4, width: 60, viewBox: 30 },
  lg: { r: 36, stroke: 5, width: 96, viewBox: 48 },
};

export function ScoreGauge({ score, size = 'md' }: ScoreGaugeProps) {
  const { r, stroke, width, viewBox } = SIZES[size];
  const circumference = 2 * Math.PI * r;
  const progress = (score / 100) * circumference;
  const color = getScoreColor(score);

  const fontSize = size === 'sm' ? '8' : size === 'md' ? '10' : '14';
  const labelSize = size === 'sm' ? '5' : size === 'md' ? '6' : '8';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width, height: width }}>
      <svg
        viewBox={`0 0 ${viewBox * 2} ${viewBox * 2}`}
        className="-rotate-90"
        style={{ width, height: width }}
      >
        {/* Track */}
        <circle
          cx={viewBox}
          cy={viewBox}
          r={r}
          fill="none"
          stroke="rgba(30,42,58,0.8)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={viewBox}
          cy={viewBox}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{
            filter: `drop-shadow(0 0 4px ${color}88)`,
            transition: 'stroke-dashoffset 0.8s ease',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-mono font-bold leading-none"
          style={{ fontSize: `${fontSize}px`, color }}
        >
          {score}
        </span>
        {size !== 'sm' && (
          <span className="text-slate-500 leading-none" style={{ fontSize: `${labelSize}px` }}>
            /100
          </span>
        )}
      </div>
    </div>
  );
}
