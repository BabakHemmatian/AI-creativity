import { useState, useRef } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/solid";

export default function ChatForm({ handleFormSubmit, isProcessing }) {
  const [message, setMessage] = useState("");

  const scrollRef = useRef();

  const handleKeyUp = async (e) => {
    if (e.keyCode === 13 && !isProcessing) {  // Prevent submission if processing
      handleFormSubmitInternal(e);
    }
  };

  const handleFormSubmitInternal = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    if (!isProcessing) {  // Prevent submission if processing
      handleFormSubmit(message);
      setMessage("");  // Clear the input field
    }
  };

  return (
    <div ref={scrollRef}>
      <form onSubmit={handleFormSubmitInternal}>
        <div className="flex items-center justify-between w-full p-3 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
          <input
            type="text"
            placeholder="Write a message"
            className="block w-full py-2 pl-4 mx-3 outline-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            name="message"
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyUp={handleKeyUp}
            disabled={isProcessing}  // Disable input when processing
          />
          <button type="submit" disabled={isProcessing}>
            <PaperAirplaneIcon
              className={`h-6 w-6 ${isProcessing ? 'text-gray-400' : 'text-blue-600 dark:text-blue-500'} rotate-[90deg]`}
              aria-hidden="true"
            />
          </button>
        </div>
      </form>
    </div>
  );
}
