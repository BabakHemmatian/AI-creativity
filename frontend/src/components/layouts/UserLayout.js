const REACT_APP_AVATAR_OPTION = process.env.REACT_APP_AVATAR_OPTION;

export default function UserLayout({ user }) {
  const url = user?.photoURL;
  let avatarUrl = url;

  if (avatarUrl !== undefined) {
    let start = 0;
    const end = url.length-4;
    if (url[33] === 'a') {
      start = 43;
    } else if (url[33] === 'b') {
      start = 40;
    } else {
      start = 39;
    }
    const f = url.substring(start, end);
    // console.log(f);
    
    if (REACT_APP_AVATAR_OPTION === "human") {
      avatarUrl = `https://api.dicebear.com/8.x/avataaars/svg?seed=${f}`;
    } else if (REACT_APP_AVATAR_OPTION === "bot") {
      avatarUrl = `https://api.dicebear.com/8.x/bottts/svg?seed=${f}`;
    }
  }
  

  return (
    <div className="relative flex items-center">
      <img className="w-10 h-10 rounded-full" src={avatarUrl} alt="" />
      <span className="block ml-2 text-gray-500 dark:text-gray-400">
        {user?.displayName}
      </span>
      {/* {onlineUsersId?.includes(user?.uid) ? ( */}
      <span className="bottom-0 left-7 absolute  w-3.5 h-3.5 bg-green-500 dark:bg-green-400 border-2 border-white rounded-full"></span>
      {/* ) : ( */}
        {/* <span className="bottom-0 left-7 absolute  w-3.5 h-3.5 bg-gray-400 border-2 border-white rounded-full"></span> */}
      {/* )} */}
    </div>
  );
}
