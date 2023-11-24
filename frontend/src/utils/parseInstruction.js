const REACT_APP_MATCH_CONDITION = process.env.REACT_APP_MATCH_CONDITION || "ALL";

const Ins2 = "Welcome to the second round! The rules are the same as before. When ready to start this round, please respond in the chat with ‘ready’. Once both matched players have indicated their readiness, the game’s target object will be revealed underneath this instruction and the timer will begin."
const Ins3 = "Welcome to the last round! The rules are the same as before. When ready to start this round, please respond in the chat with ‘ready’. Once both matched players have indicated their readiness, the game’s target object will be revealed underneath this instruction and the timer will begin."

export const parseInstruction = (index, chatType, change) => {
    console.log(index, chatType, change);
    switch (REACT_APP_MATCH_CONDITION) {
        case 'HUM':
            return (
              <div className='dark:text-white'>
                <span>
                  We are going to play a version of the game called the Alternative Uses Test (AUT; Guilford, 1967), 
                   where you work with a co-player to come up with creative uses for an everyday object. 
                   Your co-player for this session is <span style={{'fontWeight':'bold'}}>an interactive human</span>. You can communicate back and forth with 
                   your co-player in the chat window as you wish. Once the game starts, your team will 
                   have <span style={{'fontWeight':'bold'}}>4 minutes</span> in the chat room. Afterwards,
                   you will be asked to curate and submit a set of responses as your team’s. You will be 
                   evaluated based on the number of responses in that set, their originality, surprisingness, and practical usefulness.
                   When ready to begin, please respond in the chat with 'ready'. Once both matched players have indicated their readiness,
                   the game’s target object will be revealed underneath this instruction and the timer will begin. 
                </span>
              </div>
            );
        case 'CON':
            return (
                <div className='dark:text-white'>
                    <span>
                      We are going to play a version of the game called the Alternative Uses Test (AUT; Guilford, 1967), 
                       where you work with a co-player to come up with creative uses for an everyday object. 
                       Your co-player for this session is <span style={{'fontWeight':'bold'}}>non-interactive</span>. 
                       A non-interactive co-player simply generates their own ideas in the chat window without
                       seeing your responses and conversing with you. Once the game starts, you and the co-player will 
                       have <span style={{'fontWeight':'bold'}}>4 minutes</span> in the chat room. Afterwards,
                       you will be asked to curate and submit a set of responses as your team’s. You will be 
                       evaluated based on the number of responses in that set, their originality, surprisingness, and practical usefulness.
                       When ready to begin, please respond in the chat with 'ready'. Once both matched players have indicated their readiness,
                       the game’s target object will be revealed underneath this instruction and the timer will begin. 
                </div>
            );
        case 'GPT':
            return (
                <div className='dark:text-white'>
                  <span>
                    We are going to play a version of the game called the Alternative Uses Test (AUT; Guilford, 1967), 
                       where you work with a co-player to come up with creative uses for an everyday object. 
                       Your co-player for this session is <span style={{'fontWeight':'bold'}}>an interactive AI</span>.
                       You can communicate back and forth with your co-player in the chat window as you wish. Once the game starts, your team will 
                       have <span style={{'fontWeight':'bold'}}>4 minutes</span> in the chat room. Afterwards,
                       you will be asked to curate and submit a set of responses as your team’s. You will be 
                       evaluated based on the number of responses in that set, their originality, surprisingness, and practical usefulness.
                       When ready to begin, please respond in the chat with 'ready'. Once both matched players have indicated their readiness,
                       the game’s target object will be revealed underneath this instruction and the timer will begin.
                  </span>
                </div>
            );
        case 'ALL':
            return (
              <div className='dark:text-white' >
                {(index === 0) && (
                  <span>
                    We are going to play three rounds of the game called the Alternative Uses Test (AUT; Guilford, 1967), 
                       where you work with a co-player to come up with creative uses for an everyday object. 
                       Your co-player for each round may be non-interactive, or an interactive AI/human.
                       The identity of your co-player will be shared with you at the beginning of each round. 
                       Non-interactive co-players would simply generate their own ideas in the chat window without
                       seeing your responses and conversing with you. You can communicate back and forth with 
                       interactive co-players in the chat window as you wish. Once the game starts, your team will 
                       have <span style={{'fontWeight':'bold'}}>4 minutes</span> in the chat room. Afterwards,
                       you will be asked to curate and submit a set of responses as your team’s. You will be 
                       evaluated based on the number of responses in that set, their originality, surprisingness, and practical usefulness.
                       When ready to begin, please respond in the chat with 'ready'. Once both matched players have indicated their readiness,
                       the game’s target object will be revealed underneath this instruction and the timer will begin.
                       Your co-player for this first round is <span style={{'fontWeight':'bold'}}>an interactive AI</span>.
                  </span>
                  )}
                {(index === 1) && (Ins2)}
                {(index === 2) && (Ins3)}
                {(chatType === "HUM") && (
                  <span>
                    Your partner for this round will be <span style={{'fontWeight':'bold'}}>an interactive human</span>. You can communicate back and forth with your co-player in the chat window as you wish. 
                  </span>
                )}
                {(chatType === "GPT") && (
                  <span>
                    Your partner for this round will be <span style={{'fontWeight':'bold'}}>an interactive AI</span>. You can communicate back and forth with your co-player in the chat window as you wish. 
                  </span>
                  )}
                {(chatType === "CON") && (
                  <span>
                    Your partner for this round will be <span style={{'fontWeight':'bold'}}>non-interactive</span>. A non-interactive co-player simply generates their own ideas in the chat window without
                       seeing your responses and conversing with you. 
                  </span>
                  )}
              </div>
            )
    }
}

export const parseEndInstruction = (index) => {
  if (REACT_APP_MATCH_CONDITION === 'ALL') {
    switch (index) {
      case 0:
        return (
          <span>
            You have reached the end of the idea-generation portion for the first session. 
            Please go back to the survey window, click on the arrow at the bottom of the screen
            and write in the text box provided the best set of ideas from your chat session. 
            Feel free to review the contents of the chat to help with this process. As a reminder,
            you will be evaluated based on the number of uses, their originality, surprisingness, 
            and practical usefulness.
          </span>
        );
      case 1:
        return (
          <span>
            You have reached the end of the idea-generation portion for the second session. 
            Please go back to the survey window, click on the arrow at the bottom of the screen 
            and write in the text box provided the best set of ideas from your chat session.
            Feel free to review the contents of the chat to help with this process. As a reminder, 
            you will be evaluated based on the number of uses, their originality, surprisingness,
            and practical usefulness.
          </span>
        );
      case 2:
        return (
          <span>
            You have reached the end of the idea-generation portion for the third and last two-player session. 
            Please go back to the survey window, click on the arrow at the bottom of the screen 
            and write in the text box provided the best set of ideas from your chat session.
            Feel free to review the contents of the chat to help with this process. As a reminder, 
            you will be evaluated based on the number of uses, their originality, surprisingness,
            and practical usefulness.
          </span>
        );
    }
  } else {
    return (
      <span>
            You have reached the end of the idea-generation portion for the two-player session. 
            Please go back to the survey window, click on the arrow at the bottom of the screen 
            and write in the text box provided the best set of ideas from your chat session.
            Feel free to review the contents of the chat to help with this process. As a reminder, 
            you will be evaluated based on the number of uses, their originality, surprisingness,
            and practical usefulness.
      </span>
    );
  }
}
