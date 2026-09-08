interface PrimaryButtonProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  iconClassName?: string;
  variant?: "solid" | "ghost";
}

export default function PrimaryButton({
  label,
  onClick,
  disabled = false,
  loading = false,
  iconClassName,
  variant = "solid",
}: PrimaryButtonProps) {
  const baseStyles =
    "px-6 py-2.5 rounded-xl font-semibold shadow-md transition-all duration-200 inline-flex items-center justify-center gap-2";
  const solidStyles = disabled
    ? "bg-blue-600/50 cursor-not-allowed"
    : "bg-blue-600 hover:bg-blue-700";
  const ghostStyles = disabled
    ? "border border-blue-400/30 text-blue-200/50 cursor-not-allowed"
    : "border border-blue-400/40 text-blue-100 hover:bg-blue-600/30 hover:border-blue-300";
  const variantStyles = variant === "ghost" ? ghostStyles : solidStyles;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles}`}
    >
      {loading && (
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/40">
          <span className="h-2 w-2 rounded-full bg-white animate-ping" />
        </span>
      )}
      {!loading && iconClassName && <i className={iconClassName}></i>}
      {label}
    </button>
  );
}
