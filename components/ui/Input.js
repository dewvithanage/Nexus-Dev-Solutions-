// Reusable input component for forms
export default function Input({
  label,
  type = "text",
  name,
  value,
  placeholder,
  onChange,
  error,
}) {
  return (
    <div className="w-full">
      {/* Input label */}
      <label
        htmlFor={name}
        className="mb-2 block text-xs font-medium text-slate-700"
      >
        {label}
      </label>

      {/* Input field */}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className={`w-full rounded-md border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition ${
          error
            ? "border-red-500"
            : "border-slate-300 focus:border-blue-600"
        }`}
      />

      {/* Validation message */}
      {error && (
        <p className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}