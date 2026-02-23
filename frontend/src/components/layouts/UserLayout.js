const REACT_APP_AVATAR_OPTION = process.env.REACT_APP_AVATAR_OPTION;

function normalizeDicebearUrl(url) {
  if (!url) return url;

  // Only normalize dicebear URLs
  if (!url.includes("api.dicebear.com/8.x/")) return url;

  // Extract seed from the url
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
  const avatarUrl = forceAvatarUrl
    ? forceAvatarUrl
    : normalizeDicebearUrl(user?.photoURL);

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
        <div className="font-semibold text-gray-800 dark:text-white">
          {title}
        </div>

        {showEmail && user?.email && (
          <div className="text-sm opacity-70">{user.email}</div>
        )}
      </div>
    </div>
  );
}
