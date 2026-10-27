export function NumberField({ label, value, onChange, error, step = '1' }) {
  return (
    <label>
      {label}
      <input type="number" inputMode="decimal" step={step} value={value} onChange={onChange} />
      {error && <span className="error">{error}</span>}
    </label>
  );
}
