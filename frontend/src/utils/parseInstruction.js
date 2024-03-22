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
                    We will now play a two-player version of the game described earlier. This part of the study
                     has a brainstorming and a curation portion. For the brainstorming portion, you and a paired player 
                     will use this chat platform to come up with creative uses for an everyday object. Your partner in this step may be
                     interactive or non-interactive, an AI or a fellow human. You will have 
                     <span style={{'fontWeight':'bold'}}>4 minutes</span> to chat. After the brainstorming
                     session, you will go back to the first tab in your browser to curate and submit your best creative uses for the 
                     target object. You will be evaluated based on how many uses you generate in this curated response, their originality, surprisingness, and practical usefulness.
                     Your co-player for the current session is <span style={{'fontWeight':'bold'}}>an interactive human</span>. 
                     <span style={{'fontWeight':'bold'}}>When ready to start this part of the study, please respond in the chat with 'ready'</span>. Once both matched players have 
                     indicated their readiness, the game’s target object will be revealed underneath this instruction and the timer will begin.
                </span>
              </div>
            );
        case 'CON':
            return (
                <div className='dark:text-white'>
                    <span>
                    We will now play a two-player version of the game described earlier. This part of the study
                     has a brainstorming and a curation portion. For the brainstorming portion, you and a paired player 
                     will use this chat platform to come up with creative uses for an everyday object. Your partner in this step may be
                     interactive or non-interactive, an AI or a fellow human. You will have 
                     <span style={{'fontWeight':'bold'}}>4 minutes</span> to chat. After the brainstorming
                     session, you will go back to the first tab in your browser to curate and submit your best creative uses for the 
                     target object. You will be evaluated based on how many uses you generate in this curated response, their originality, surprisingness, and practical usefulness.
                     The current session is <span style={{'fontWeight':'bold'}}>non-interactive</span>. Note that non-interactive partners
                     cannot see your chat responses and will simply generate their own independent ideas. 
                     <span style={{'fontWeight':'bold'}}>When ready to start this part of the study, please respond in the chat with 'ready'</span>. Once both matched players have 
                     indicated their readiness, the game’s target object will be revealed underneath this instruction and the timer will begin.
                    </span>
                </div>
            );
        case 'GPT':
            return (
                <div className='dark:text-white'>
                  <span>
                    We will now play a two-player version of the game described earlier. This part of the study
                     has a brainstorming and a curation portion. For the brainstorming portion, you and a paired player 
                     will use this chat platform to come up with creative uses for an everyday object. Your partner in this step may be
                     interactive or non-interactive, an AI or a fellow human. You will have 
                     <span style={{'fontWeight':'bold'}}>4 minutes</span> to chat. After the brainstorming
                     session, you will go back to the first tab in your browser to curate and submit your best creative uses for the 
                     target object. You will be evaluated based on how many uses you generate in this curated response, their originality, surprisingness, and practical usefulness.
                     Your co-player for the current session is <span style={{'fontWeight':'bold'}}>an interactive AI</span>.  
                     <span style={{'fontWeight':'bold'}}>When ready to start this part of the study, please respond in the chat with 'ready'</span>. Once both matched players have 
                     indicated their readiness, the game’s target object will be revealed underneath this instruction and the timer will begin. Please wait for the AI's first message after "ready" to start the conversation. 
                     After posting a message in the chat, please wait a second for the AI to respond before sending another message.
                    </span>
                </div>
            );
        case 'ALL':
            return (
              <div className='dark:text-white' >
                {(index === 0) && (
                  <span>
                    We will now play three rounds of a two-player version of the game described earlier. Each round
                     has a brainstorming and a curation portion. For the brainstorming portion, you and a paired player 
                     will use this chat platform to come up with creative uses for an everyday object. Your partner in the brainstorming step may be
                     interactive or non-interactive, an AI or a fellow human. You will have 
                     <span style={{'fontWeight':'bold'}}> 4 minutes</span> to chat. After each brainstorming
                     session, you will go back to the first tab in your browser to curate and submit your best creative uses for the 
                     target object. You will be evaluated based on how many uses you generate in this curated response, their originality, surprisingness, and practical usefulness.
                    </span>
                  )}
                {(index === 1) && (Ins2)}
                {(index === 2) && (Ins3)}
                {(chatType === "HUM") && (
                  <span>
                    Your co-player for this round will be <span style={{'fontWeight':'bold'}}>an interactive human</span>. <span style={{'fontWeight':'bold'}}>When ready to start this part of the study, please respond in the chat with 'ready'</span>. Once both matched players have 
                     indicated their readiness, the game’s target object will appear underneath this instruction and the timer will begin.
                  </span>
                )}
                {(chatType === "CON") && (
                  <span>
                    This round will be <span style={{'fontWeight':'bold'}}>non-interactive</span>. Note that non-interactive partners
                    cannot see your chat responses and will simply generate their own independent ideas. <span style={{'fontWeight':'bold'}}>When ready to start this part of the study, please respond in the chat with 'ready'</span>. Once both matched players have 
                    indicated their readiness, the game’s target object will appear underneath this instruction and the timer will begin.
                  </span>
                  )}
                {(chatType === "GPT") && (
                  <span>
                    Your co-player for this round will be <span style={{'fontWeight':'bold'}}>an interactive AI</span>. <span style={{'fontWeight':'bold'}}>. </span> When ready to start this part of the study, please respond in the 
                    chat with 'ready'. Once both matched players have indicated their readiness, the game’s target object will be revealed underneath this instruction and the timer will begin. Please wait for the AI's first message after "ready" to start the conversation. 
                    After posting a message in the chat, please wait a second for the AI to respond before sending another message.
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
            You have completed the brainstorming portion of the first round of the two-player game. Please go back to the first tab
            in your browser to start the curation portion of this round.  
            When instructed to start the second round, you can click on the ‘match’ button to the left of this chat screen again.
          </span>
        );
      case 1:
        return (
          <span>
            You have completed the brainstorming portion of the second round of the two-player game. Please go back to the first tab
            in your browser to start the curation portion of this round.  
            When instructed to start the third round, you can click on the ‘match’ button to the left of this chat screen again.
          </span>
        );
      case 2:
        return (
          <span>
            The 2-player part of our study has ended. Thank you! When ready, please go back to the first tab to answer a few final questions and finish the study.
          </span>
        );
    }
  } else {
    return (
      <span>
        The 2-player part of our study has ended. Thank you! When ready, please go back to the first tab to answer a few final questions and finish the study.
      </span>
    );
  }
}
