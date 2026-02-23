import { useState, useEffect } from "react";
import { getUser } from "../../services/ChatService";
import UserLayout from "../layouts/UserLayout";
import { aiPartnerAvatarUrl } from "../../utils/GenerateAvatar";

export default function Contact({ chatRoom, currentUser }) {
  const [contact, setContact] = useState(null);

  useEffect(() => {
    // AI partner: don't fetch a "user", just show a stable robot avatar + label
    if (chatRoom?.chatType === "GPT") {
      setContact({
        __kind: "AI_PARTNER",
        photoURL: aiPartnerAvatarUrl(), // stable robot
      });
      return;
    }

    const contactId = chatRoom?.members?.find(
      (member) => member !== currentUser?.uid
    );
    if (!contactId) {
      setContact(null);
      return;
    }

    const fetchData = async () => {
      const res = await getUser(contactId);
      setContact(res);
    };

    fetchData();
  }, [chatRoom, currentUser]);

  if (!chatRoom) return null;

  // AI partner: Just a stable avatar
  if (chatRoom.chatType === "GPT") {
    return (
      <UserLayout
        user={contact}
        label="Interactive AI Partner"
        forceAvatarUrl={aiPartnerAvatarUrl()}
        showEmail={false}
      />
    );
  }

  // Human partner: Fetch the actual avatar
  if (chatRoom.chatType === "HUM") {
    return (
      <UserLayout
        user={contact}
        label="Interactive Human Partner"
        showEmail={false}
      />
    );
  }

  // Default behavior for other types (e.g. CON) 
  return <UserLayout user={contact} label="Partner" showEmail={false} />;
}
