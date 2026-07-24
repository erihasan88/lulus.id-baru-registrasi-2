
interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 80, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Teal circle background */}
      <circle cx="60" cy="60" r="58" fill="#5EA894" />
      
      {/* "lulus.id" text */}
      <text
        x="60"
        y="70"
        fontFamily="Arial, sans-serif"
        fontSize="32"
        fontWeight="900"
        fill="white"
        textAnchor="middle"
      >
        lulus.id
      </text>
    </svg>
  );
}
