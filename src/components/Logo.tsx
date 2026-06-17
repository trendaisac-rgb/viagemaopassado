export function Logo({
  size = 32,
  className,
  color = "#E9B84A",
}: {
  size?: number;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Viagem ao Passado"
    >
      {/* flechas cruzadas (X) */}
      <line x1="34" y1="34" x2="166" y2="166" />
      <polyline points="150,166 166,166 166,150" />
      <line x1="34" y1="34" x2="46" y2="30" />
      <line x1="34" y1="34" x2="30" y2="46" />
      <line x1="40" y1="40" x2="52" y2="36" />
      <line x1="40" y1="40" x2="36" y2="52" />
      <line x1="166" y1="34" x2="34" y2="166" />
      <polyline points="50,166 34,166 34,150" />
      <line x1="166" y1="34" x2="154" y2="30" />
      <line x1="166" y1="34" x2="170" y2="46" />
      <line x1="160" y1="40" x2="148" y2="36" />
      <line x1="160" y1="40" x2="164" y2="52" />
      {/* átomo (topo) */}
      <g transform="translate(100,46)">
        <circle cx="0" cy="0" r="3.2" fill={color} stroke="none" />
        <ellipse cx="0" cy="0" rx="16" ry="6.5" />
        <ellipse cx="0" cy="0" rx="16" ry="6.5" transform="rotate(60)" />
        <ellipse cx="0" cy="0" rx="16" ry="6.5" transform="rotate(120)" />
      </g>
      {/* fogo (esquerda) */}
      <g transform="translate(50,96)">
        <path d="M0 -15 C 9 -6, 9 2, 4 8 C 8 6, 9 0, 9 -3 C 13 3, 11 12, 0 14 C -11 12, -12 2, -5 -6 C -5 -1, -3 2, 0 3 C -4 -3, -3 -10, 0 -15 Z" />
        <path d="M-12 16 L 12 16 M -9 19 L 9 19" />
      </g>
      {/* foguete (direita) */}
      <g transform="translate(150,96)">
        <path d="M0 -16 C 7 -10, 8 0, 7 8 L -7 8 C -8 0, -7 -10, 0 -16 Z" />
        <circle cx="0" cy="-4" r="3.2" />
        <path d="M-7 6 L -13 14 L -6 11 M 7 6 L 13 14 L 6 11" />
        <path d="M-2 13 C 0 19, 0 19, 2 13" stroke="#FFD56A" />
      </g>
      {/* montanhas (base) */}
      <g transform="translate(100,150)">
        <path d="M-20 8 L -6 -10 L 2 0 L 9 -8 L 20 8 Z" />
        <path d="M-6 -10 L -10 -4 M 9 -8 L 5 -3" />
      </g>
    </svg>
  );
}
