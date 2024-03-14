// import { useState, useEffect, useRef } from "react";
// import { PaperAirplaneIcon } from "@heroicons/react/solid";

// export default function ChatForm(props) {
//   const [message, setMessage] = useState("");

//   const scrollRef = useRef();
//   const handleKeyUp = async (e) => {
//     if (e.keyCode === 13) {
//       // enter should send the message
//       handleFormSubmit()
//     }
//   }

//   const handleFormSubmit = async (e) => {
//     e.preventDefault();

//     props.handleFormSubmit(message);
    
//     setMessage(""); //sets it back to empty
//   };

//   return (
//     <div ref={scrollRef}>
//       <form onSubmit={handleFormSubmit}>
//         <div className="flex items-center justify-between w-full p-3 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
//           <input
//             type="text"
//             placeholder="Write a message"
//             className="block w-full py-2 pl-4 mx-3 outline-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
//             name="message"
//             required
//             value={message}
//             onChange={(e) => setMessage(e.target.value)}
//             onKeyUp={handleKeyUp}
//           />
//           <button type="submit">
//             <PaperAirplaneIcon
//               className="h-6 w-6 text-blue-600 dark:text-blue-500 rotate-[90deg]"
//               aria-hidden="true"
//             />
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// }


import { useState, useEffect, useRef } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/solid";

export default function ChatForm(props) {
  const [message, setMessage] = useState("");
  const [disabled, setDisabled] = useState(false); // State to control disabled status

  const scrollRef = useRef();

  const handleKeyUp = async (e) => {
    if (e.keyCode === 13) {
      // enter should send the message
      setDisabled(true); // Disable the form
      setTimeout(() => {
        setDisabled(false); // Enable the form after 2 seconds
      }, 2000);
      handleFormSubmit();
    }
  };

  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault();

    props.handleFormSubmit(message);

    setMessage(""); //sets it back to empty
  };

  return (
    <div ref={scrollRef}>
      <form onSubmit={handleFormSubmit}>
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
            disabled={disabled} // Disable input when disabled is true
          />
          <button type="submit" disabled={disabled}> {/* Disable button when disabled is true */}
            <PaperAirplaneIcon
              className={`h-6 w-6 text-blue-600 dark:text-blue-500 rotate-[90deg] ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} // Reduce opacity and disable cursor when disabled is true
              aria-hidden="true"
            />
          </button>
        </div>
      </form>
    </div>
  );
}
