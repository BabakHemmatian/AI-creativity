const REACT_APP_AVATAR_OPTION = process.env.REACT_APP_AVATAR_OPTION;

/**
 * Tries to normalize an existing dicebear URL into a chosen style.
 * (Keeps your existing behavior, but made safer.)
 */
function normalizeDicebearUrl(url) {
  if (!url) return url;

  // If it isn't dicebear, just return it
  if (!url.includes("api.dicebear.com/8.x/")) return url;

  // Extract seed value from `...seed=XYZ`
  const match = url.match(/seed=([^&]+)/);
  const seed = match?.[1];
  if (!seed) return url;

  if (REACT_APP_AVATAR_OPTION === "human") {
    return `https://api.dicebear.com/8.x/avataaars/svg?seed=${seed}`;
  }
  if (REACT_APP_AVATAR_OPTION === "bot") {
    return `https://api.dicebear.com/8.x/bottts/svg?seed=${seed}`;
  }
  return url;
}

export default function UserLayout({
  user,
  label,
  forceAvatarUrl,
  showEmail = false,
}) {
  const rawUrl = forceAvatarUrl || user?.photoURL;
  const avatarUrl = normalizeDicebearUrl(rawUrl);

  // Label wins; otherwise fall back to displayName; then email.
  const title = label || user?.displayName || user?.email || "Partner";

  return (
    <div className="flex items-center gap-3">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={title}
          className="h-10 w-10 rounded-full"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />
      )}

      <div className="leading-tight">
        <div className="font-medium">{title}</div>

        {showEmail && user?.email && (
          <div className="text-sm opacity-70">{user.email}</div>
        )}
      </div>
    </div>
  );
}
