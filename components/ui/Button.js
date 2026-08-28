// Reusable button component
export default function Button({
  children,
  type = "button",
  onClick,
  className = "",
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 ${className}`}
    >
      {children}
    </button>
  );
}