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
                  We will now play a two-player version of the game you just practiced.
                     In this version, you and a paired player will use this chat platform to collectively 
                     generate a list of creative uses for an everyday object. Once the game starts, 
                     your team will have 4 minutes to produce as many high-quality responses as you can. 
                     You will be <span style={{'fontWeight':'bold'}}>evaluated as a team</span> based 
                     on how many uses you generate, their originality, 
                     surprisingness, and practical usefulness. There is no turn-taking in this game. 
                     Either player can post a response at any point during the <span style={{'fontWeight':'bold'}}>4 minutes</span>.
                    However, it is important for your team’s score to keep track of your co-player’s responses. When ready, please respond in the chat with 'ready'. Once both matched players have indicated their readiness, the game’s target object will be revealed underneath this instruction and the timer will begin. Your co-player is a <span style={{'fontWeight':'bold'}}>fellow human</span>. 
                </span>
              </div>
            );
        case 'CON':
            return (
                <div className='dark:text-white'>
                    <span>
                    We will now play a two-player version of the game you just practiced.
                     In this version, you and a paired player will use this chat platform to collectively 
                     generate a list of creative uses for an everyday object. Once the game starts, 
                     your team will have 4 minutes to produce as many high-quality responses as you can. 
                     You will be <span style={{'fontWeight':'bold'}}>evaluated as a team</span> based 
                     on how many uses you generate, their originality, 
                     surprisingness, and practical usefulness. There is no turn-taking in this game. 
                     Either player can post a response at any point during the <span style={{'fontWeight':'bold'}}>4 minutes</span>.
                    However, it is important for your team’s score to keep track of your co-player’s responses. When ready, please respond in the chat with 'ready'. Once both matched players have indicated their readiness, the game’s target object will be revealed underneath this instruction and the timer will begin. Your co-player is an <span style={{'fontWeight':'bold'}}>AI</span>.
                    </span>
                </div>
            );
        case 'GPT':
            return (
                <div className='dark:text-white'>
                  <span>
                    We will now play a two-player version of the game you just practiced.
                     In this version, you and a paired player will use this chat platform to collectively 
                     generate a list of creative uses for an everyday object. Once the game starts, 
                     your team will have 4 minutes to produce as many high-quality responses as you can. 
                     You will be <span style={{'fontWeight':'bold'}}>evaluated as a team</span> based 
                     on how many uses you generate, their originality, 
                     surprisingness, and practical usefulness. There is no turn-taking in this game. 
                     Either player can post a response at any point during the <span style={{'fontWeight':'bold'}}>4 minutes</span>.
                    However, it is important for your team’s score to keep track of your co-player’s responses. When ready, please respond in the chat with 'ready'. Once both matched players have indicated their readiness, the game’s target object will be revealed underneath this instruction and the timer will begin. Your co-player is an <span style={{'fontWeight':'bold'}}>AI</span>.
                  </span>
                </div>
            );
        case 'ALL':
            return (
              <div className='dark:text-white' >
                {(index === 0) && (
                  <span>
                    We will now play three rounds of a two-player version of the game you just practiced.
                     In each round, you and a paired player will use this chat platform to collectively 
                     generate a list of creative uses for an everyday object. Once the game starts, 
                     your team will have 4 minutes to produce as many high-quality responses as you can. 
                     You will be <span style={{'fontWeight':'bold'}}>evaluated as a team</span> based 
                     on how many uses you generate, their originality, 
                     surprisingness, and practical usefulness. There is no turn-taking in this game. 
                     Either player can post a response at any point during the <span style={{'fontWeight':'bold'}}>4 minutes</span>.
                    However, it is important for your team’s score to keep track of your co-player’s responses. When ready, please respond in the chat with 'ready'. Once both matched players have indicated their readiness, the game’s target object will be revealed underneath this instruction and the timer will begin.
                  </span>
                  )}
                {(index === 1) && (Ins2)}
                {(index === 2) && (Ins3)}
                {(chatType === "HUM") && (
                  <span>
                    Your partner for this round will be a <span style={{'fontWeight':'bold'}}>fellow human</span>.
                  </span>
                )}
                {(chatType !== "HUM") && (!change) && (
                  <span>
                    Your partner for this round will be an <span style={{'fontWeight':'bold'}}>AI</span>.
                  </span>
                  )}
                {(chatType !== "HUM") && (change) && (
                  <span>
                    Your partner for this round will be a <span style={{'fontWeight':'bold'}}>different AI</span>.
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
            You have completed the first round of the two-player version of the game. 
            You have two more rounds left to play. 
            When ready to start the second round, please click on the ‘match’ button to the left of this chat screen.
          </span>
        );
      case 1:
        return (
          <span>
            You have completed the second round of the two-player game. You have one more round to play. When ready to start the last round, please click on the ‘match’ button to the left of this chat screen.
          </span>
        );
      case 2:
        return (
          <span>The 2-player part of our study has ended. Thank you! When ready please click on the following link to answer a few more questions and finish the study: 
            <a href="https://illinois.qualtrics.com/jfe/form/SV_4VCqyy8zw3IyTeS">Final Survey</a>
          </span>
        );
    }
  } else {
    return (
      <span>The 2-player part of our study has ended. Thank you! When ready please click on the following link to answer a few more questions and finish the study: 
        <a href="https://illinois.qualtrics.com/jfe/form/SV_4VCqyy8zw3IyTeS">Final Survey</a>
      </span>
    );
  }
}
