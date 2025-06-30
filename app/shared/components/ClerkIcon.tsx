export default function ClerkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-8 w-8"
    >
      <path
        d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
        fill="url(#clerk-gradient)"
      />
      <path
        d="M12 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM7.5 15.5a4.5 4.5 0 0 1 9 0v1a.5.5 0 0 1-.5.5H8a.5.5 0 0 1-.5-.5v-1z"
        fill="white"
      />
      <defs>
        <linearGradient
          id="clerk-gradient"
          x1="2"
          y1="2"
          x2="22"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#6C47FF" />
          <stop offset="1" stopColor="#4F29F0" />
        </linearGradient>
      </defs>
    </svg>
  );
}