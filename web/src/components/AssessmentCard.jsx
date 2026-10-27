import RiskBadge from './RiskBadge.jsx';

export default function AssessmentCard({ assessment, provisional = false }) {
  const { level, score, rules, factors, modelVersion } = assessment;
  return (
    <div className={`card assessment edge-${level}`}>
      <div className="row between">
        <strong>Risk assessment</strong>
        <RiskBadge level={level} provisional={provisional} />
      </div>
      {rules.length > 0 && (
        <>
          <div className="small label">Clinical rules triggered</div>
          <ul className="reasons-list">
            {rules.map((r) => <li key={r.label}>{r.label} <span className="muted">→ {r.level}</span></li>)}
          </ul>
        </>
      )}
      {factors.length > 0 && (
        <>
          <div className="small label">Main factors raising the model score</div>
          <ul className="reasons-list">
            {factors.map((f) => <li key={f.label}>{f.label}</li>)}
          </ul>
        </>
      )}
      <div className="muted small">
        Model score {(score * 100).toFixed(0)}% · {modelVersion}
        {provisional && ' · scored on this device'} · decision support only
      </div>
    </div>
  );
}
