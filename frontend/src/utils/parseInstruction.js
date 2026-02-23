// frontend/src/utils/parseInstruction.js

const REACT_APP_MATCH_CONDITION =
  process.env.REACT_APP_MATCH_CONDITION || "ALL";

const wrap = (children) => (
  <div className="dark:text-white space-y-2">{children}</div>
);

export const parseInstruction = (index, chatType) => {
  const base = (
    <p>
      You and a partner will use this chat to come up with as many{" "}
      <strong>original and practically helpful alternate uses</strong> for an
      everyday object as you can in <strong>4 minutes</strong>.
    </p>
  );

  const ready = (
    <p>
      When ready to start, send <strong>'ready'</strong> in the chat to reveal
      the target object and start the timer.
    </p>
  );

  const hum = (
    <p>
      Your partner for this round is an{" "}
      <strong>interactive human</strong>. Interact with them however you like.
    </p>
  );

  const con = (
    <p>
      This round is <strong>non-interactive</strong>. You will see your
      partner agent's chat messages, but they cannot see yours and will perform the
      task independently.
    </p>
  );

  const gpt = (
    <p>
      Your partner for this round is an{" "}
      <strong>interactive AI</strong>. Wait for its first response, then
      interact with it however you like. 
    </p>
  );

  switch (REACT_APP_MATCH_CONDITION) {
    case "HUM":
      return wrap(
        <>
          {base}
          {hum}
          {ready}
        </>
      );

    case "CON":
      return wrap(
        <>
          {base}
          {con}
          {ready}
        </>
      );

    case "GPT":
      return wrap(
        <>
          {base}
          {gpt}
          {ready}
        </>
      );

    case "ALL":
    default:
      return wrap(
        <>
          {index === 0 && base}

          {chatType === "HUM" && (
            <>
              {hum}
              {ready}
            </>
          )}

          {chatType === "CON" && (
            <>
              {con}
              {ready}
            </>
          )}

          {chatType === "GPT" && gpt}
        </>
      );
  }
};

export const parseEndInstruction = (index) => {
  const roundEnd = (
    <>
      <p>
        You have completed the <strong>brainstorming round</strong>. Go back to
        the Qualtrics survey to curate the best ideas.
      </p>
      <p>
        When instructed, click on the <strong>'Start'</strong> button to the top
        left to begin the next round.
      </p>
    </>
  );

  const final = (
    <p>
      The <strong>co-creation part</strong> of our activity has ended. Go back
      to the Qualtrics survey to curate the best ideas.
    </p>
  );

  if (REACT_APP_MATCH_CONDITION === "ALL") {
    if (index === 2) return wrap(final);
    return wrap(roundEnd);
  }

  return wrap(final);
};
