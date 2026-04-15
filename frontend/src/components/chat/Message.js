import { format } from "timeago.js";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Message({ message, self }) {
  const author = message.sender ?? message.senderId
  const body = message.message ?? message.text ?? ""
  const createdAt = message.createdAt ?? message.created_at
  let timeLabel = ""
  if (createdAt) {
    try {
      timeLabel = format(new Date(createdAt))
    } catch {
      timeLabel = ""
    }
  }

  return (
    <>
      <li
        className={classNames(
          self !== author ? "justify-start" : "justify-end",
          "flex"
        )}
      >
        <div>
          <div
            className={classNames(
              self !== author
                ? "text-gray-700 dark:text-white bg-white border border-gray-200 shadow-md dark:bg-gray-900 dark:border-gray-700"
                : "bg-blue-600 dark:bg-blue-500 text-white",
              "relative max-w-xl px-4 py-2 rounded-lg shadow"
            )}
          >
            <span className="block font-normal ">{body}</span>
          </div>
          {timeLabel ? (
            <span className="block text-sm text-gray-700 dark:text-gray-400">
              {timeLabel}
            </span>
          ) : null}
        </div>
      </li>
    </>
  );
}
