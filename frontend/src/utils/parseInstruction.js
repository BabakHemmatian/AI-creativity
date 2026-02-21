const REACT_APP_MATCH_CONDITION = process.env.REACT_APP_MATCH_CONDITION || "ALL"

export const parseInstruction = (index, chatType, change) => {
  switch (REACT_APP_MATCH_CONDITION) {
    case "HUM":
      return (
        <div className="dark:text-white">
          <span>
            You and a partner will use this chat to come up with as many <span style={{ fontWeight: "bold" }}>original</span>
            and <span style={{ fontWeight: "bold" }}>practically helpful</span> 
            alternate uses for an everyday object as you can in
            <span style={{ fontWeight: "bold" }}>4 minutes</span>.
            <br /><br />
            Your partner for this round is{" "}
            <span style={{ fontWeight: "bold" }}>an interactive human</span>.
            Interact with them however you like.
            <br /><br />
            When ready to start, send <span style={{ fontWeight: "bold" }}>'ready'</span> in the chat to reveal the target object and start the timer.
          </span>
        </div>
      )
    case "CON":
      return (
        <div className="dark:text-white">
          <span>
            You and a partner will use this chat to come up with as many <span style={{ fontWeight: "bold" }}>original</span>
            and <span style={{ fontWeight: "bold" }}>practically helpful</span> 
            alternate uses for an everyday object as you can in
            <span style={{ fontWeight: "bold" }}>4 minutes</span>.
            <br /><br />
           This round is{" "}
            <span style={{ fontWeight: "bold" }}>non-interactive</span>. You will see
            your partner's chat messages, but they cannot see yours and will perform
            the task independently. 
            <br /><br />
            When ready to start, send <span style={{ fontWeight: "bold" }}>'ready'</span> in the chat to reveal the target object and start the timer.
          </span>
        </div>
      )
    case "GPT":
      return (
        <div className="dark:text-white">
          <span>
            You and a partner will use this chat to come up with as many <span style={{ fontWeight: "bold" }}>original</span>
            and <span style={{ fontWeight: "bold" }}>practically helpful</span> 
            alternate uses for an everyday object as you can in
            <span style={{ fontWeight: "bold" }}>4 minutes</span>.
            <br /><br /> 
            Your partner for this round is{" "}
            <span style={{ fontWeight: "bold" }}>an interactive AI</span>. <span style={{ fontWeight: "bold" }}>Wait</span> for
            its first response, then interact with it however you like. You can use the scratch pad while you wait for its responses. 
            <br /><br /> 
            When ready to start, send <span style={{ fontWeight: "bold" }}>'ready'</span> in the chat to reveal the target object and start the timer.
          </span>
        </div>
      )
    case "ALL":
      return (
        <div className="dark:text-white">
          {index === 0 && (
            <span>
              You and a partner will use this chat to come up with as many <span style={{ fontWeight: "bold" }}>original</span>
            and <span style={{ fontWeight: "bold" }}>practically helpful</span> 
            alternate uses for an everyday object as you can in
            <span style={{ fontWeight: "bold" }}>4 minutes</span>.
            <br /><br />
          )}
          {chatType === "HUM" && (
            <span>
              Your partner for this round is{" "}
              <span style={{ fontWeight: "bold" }}>an interactive human</span>.{" "}. Interact with them however you like.
              <br /><br />
            When ready to start, send <span style={{ fontWeight: "bold" }}>'ready'</span> in the chat to reveal the target object and start the timer.
            </span>
          )}
          {chatType === "CON" && (
            <span>
              This round is{" "}
            <span style={{ fontWeight: "bold" }}>non-interactive</span>.</span>{" "} You will see
            your partner's chat messages, but they cannot see yours and will perform
            the task independently.
              <br /><br />
            When ready to start, send <span style={{ fontWeight: "bold" }}>'ready'</span> in the chat to reveal the target object and start the timer.
            </span>
          )}
          {chatType === "GPT" && (
            <span>
              Your partner for this round is{" "}
            <span style={{ fontWeight: "bold" }}>an interactive AI</span>.</span>{" "} <span style={{ fontWeight: "bold" }}>Wait</span> for
            its first response, then interact with it however you like. You can use the scratch pad while you wait for its responses. 
              </span>
            </span>
          )}
        </div>
      )
  }
}

export const parseEndInstruction = (index) => {
  if (REACT_APP_MATCH_CONDITION === "ALL") {
    switch (index) {
      case 0:
        return (
          <span>
            You have the 1st brainstorming round. Go back to the Qualtrics survey
            to curate the best ideas. 
              <br /><br />
              <span style={{ fontWeight: "bold" }}>When instructed</span>, click on the ‘Start’ button to the
            top left to start the second round.
          </span>
        )
      case 1:
        return (
          <span>
            You have the 1st brainstorming round. Go back to the Qualtrics survey
            to curate the best ideas. 
              <br /><br />
            <span style={{ fontWeight: "bold" }}>When instructed</span>, click on the ‘Start’ button to the
            top left to start the second round.
          </span>
        )
      case 2:
        return (
          <span>
            The co-creation part of our activity has ended. Go back to the Qualtrics survey to
          curate the best ideas.
          </span>
        )
    }
  } else {
    return (
      <span>
        The co-creation part of our activity has ended. Go back to the Qualtrics survey to
          curate the best ideas.
      </span>
    )
  }
}
