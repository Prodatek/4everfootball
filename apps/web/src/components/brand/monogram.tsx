// Simple geometric mark (angled bars forming a "4") for the favicon/small-space
// slot — deliberately not an illustrated crest/shield/ball.
export function Monogram({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="6" fill="#A238FF" />
      <path
        d="M19 8L11 19H18V24"
        stroke="#F4EFF9"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M21 19H11" stroke="#F4EFF9" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
