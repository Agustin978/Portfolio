// Inline SVGs (no icon library), 16 px and decorative: the link text names the platform.
// The GitHub path is copied verbatim from Simple Icons (https://simpleicons.org, package released
// under CC0-1.0; simple-icons@16.36.0, icons/github.svg), drawn on a 24x24 grid with currentColor so
// it follows the button's text color. The mark remains GitHub's trademark (guidelines:
// https://github.com/logos) and is used only to link to the owner's profile there.
// LinkedIn uses the generic icon: Simple Icons removed its mark in 14.0.0 and we don't ship an old
// copy. To show the LinkedIn logo, take it from LinkedIn's official brand resources
// (https://brand.linkedin.com) and follow their usage rules.
const brandPaths: Record<string, string> = {
  github:
    'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
};

export const hasOwnIcon = (platform: string) => Object.hasOwn(brandPaths, platform.toLowerCase());

// Any other platform gets a plain link glyph (own drawing, 16x16 grid).
function GenericLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      data-icon="generic"
    >
      <path
        d="M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 0 1 4.5 9l1-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SocialIcon({ platform }: { platform: string }) {
  const key = platform.toLowerCase();
  if (!hasOwnIcon(key)) return <GenericLinkIcon />;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      data-icon={key}
    >
      <path d={brandPaths[key]} fill="currentColor" />
    </svg>
  );
}
