export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Viagem ao Passado"
    >
      <circle cx="32" cy="32" r="29" stroke="#E9B84A" strokeWidth="2" opacity="0.45" />
      <circle cx="32" cy="32" r="22" stroke="#E9B84A" strokeWidth="1" opacity="0.25" />
      {/* X arrows */}
      <g stroke="#E9B84A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M14 14 L50 50" />
        <path d="M50 14 L14 50" />
        {/* arrow tips */}
        <path d="M50 50 L50 42 M50 50 L42 50" />
        <path d="M14 50 L14 42 M14 50 L22 50" />
        <path d="M50 14 L42 14 M50 14 L50 22" />
        <path d="M14 14 L22 14 M14 14 L14 22" />
      </g>
      <circle cx="32" cy="32" r="3.5" fill="#E9B84A" />
    </svg>
  );
}
