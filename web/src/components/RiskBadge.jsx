const LABELS = { low: 'Low', moderate: 'Moderate', high: 'High', emergency: 'Emergency' };

export default function RiskBadge({ level, provisional = false, reviewed = false }) {
  if (!level) return <span className="badge none">Not screened</span>;
  return (
    <span className={`badge ${level}`} title={provisional ? 'Scored on this device; confirmed after sync' : undefined}>
      {LABELS[level]}
      {provisional && ' *'}
      {reviewed && ' ✓'}
    </span>
  );
}
