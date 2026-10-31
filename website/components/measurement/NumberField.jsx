export default function NumberField({
  label,
  name,
  value,
  onChange,
  min = 0,
  max = 32767,
  step = 1,
}) {
  return (
    <label className="fieldset gap-2">
      <span className="text-sm">{label}</span>
      <input
        className="input w-full min-w-0"
        type="number"
        name={name}
        value={value}
        min={min}
        max={max}
        step={step}
        required
        onChange={(event) => onChange(name, event.target.value)}
      />
    </label>
  );
}
