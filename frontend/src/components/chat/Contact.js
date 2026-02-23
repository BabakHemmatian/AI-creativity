import { useEffect, useState } from "react";
import { getUser } from "../../services/ChatService";
import UserLayout from "../layouts/UserLayout";
import { aiPartnerAvatarUrl } from "../../utils/GenerateAvatar";

export default function Contact({ chatRoom, currentUser }) {
  const [contact, setContact] = useState(null);

  useEffect(() => {
    if (!chatRoom) return;

    // AI partner: no user fetch; use stable robot avatar
    if (chatRoom.chatType === "GPT") {
      setContact({ __kind: "AI_PARTNER" });
      return;
    }

    const contactId = chatRoom.members?.find(
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

  if (chatRoom.chatType === "HUM") {
    return (
      <UserLayout
        user={contact}
        label="Interactive Human Partner"
        showEmail={false}
      />
    );
  }

  // CON or other types: label only, no avatar
  return (
    <UserLayout
      user={contact}
      label="Partner"
      showEmail={false}
    />
  );
}
