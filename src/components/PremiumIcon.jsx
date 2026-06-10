import React from "react";

const ICONS = {
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  plan: (
    <>
      <path d="M8 3h7l4 4v14H8z" />
      <path d="M15 3v5h5" />
      <path d="M11 12h6M11 16h6M11 8h2" />
    </>
  ),
  code: (
    <>
      <path d="m9 18-6-6 6-6" />
      <path d="m15 6 6 6-6 6" />
      <path d="m14 4-4 16" />
    </>
  ),
  rocket: (
    <>
      <path d="M4.5 16.5c2.5.4 4 .1 5-1.1l6.9-6.9c1.3-1.3 2-3.1 2.1-5.5-2.4.1-4.2.8-5.5 2.1l-6.9 6.9c-1.2 1-1.5 2.5-1.1 5Z" />
      <path d="M7.5 19.5c-.7 1.4-2 2-4 2.1.1-2 .7-3.3 2.1-4" />
      <circle cx="14.5" cy="7.5" r="1.7" />
    </>
  ),
  growth: (
    <>
      <path d="M4 18h16" />
      <path d="m5 15 4-4 3 3 6-7" />
      <path d="M15 7h3v3" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  system: (
    <>
      <rect x="4" y="5" width="16" height="13" rx="2" />
      <path d="M8 9h8M8 13h3M14 13h2" />
      <path d="M9 22h6M12 18v4" />
    </>
  ),
  brain: (
    <>
      <path d="M9 4.5a3.5 3.5 0 0 0-3.4 4.3A4 4 0 0 0 7 16.5V19a2.5 2.5 0 0 0 5 0V5.7A3.2 3.2 0 0 0 9 4.5Z" />
      <path d="M15 4.5a3.5 3.5 0 0 1 3.4 4.3A4 4 0 0 1 17 16.5V19a2.5 2.5 0 0 1-5 0V5.7a3.2 3.2 0 0 1 3-1.2Z" />
      <path d="M7.5 9.5h3M13.5 9.5h3M8 14h2.5M13.5 14H16" />
    </>
  ),
  gear: (
    <>
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      <path d="M18.5 13.2c.1-.4.1-.8.1-1.2s0-.8-.1-1.2l2-1.5-2-3.4-2.4 1a7.4 7.4 0 0 0-2-1.2L13.8 3h-3.9l-.4 2.7a7.4 7.4 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.5c-.1.4-.1.8-.1 1.2s0 .8.1 1.2l-2 1.5 2 3.4 2.4-1a7.4 7.4 0 0 0 2 1.2l.4 2.7h3.9l.4-2.7a7.4 7.4 0 0 0 2-1.2l2.4 1 2-3.4-2.1-1.5Z" />
    </>
  ),
  voice: (
    <>
      <path d="M5 10v4M9 7v10M13 5v14M17 8v8M21 10v4" />
    </>
  ),
  chat: (
    <>
      <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 20 6v6c0 5-3.4 8.2-8 9-4.6-.8-8-4-8-9V6l8-3Z" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </>
  ),
};

export default function PremiumIcon({ name = "target", size = 24, title }) {
  const content = ICONS[name] || ICONS.target;

  return (
    <svg
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {content}
    </svg>
  );
}
