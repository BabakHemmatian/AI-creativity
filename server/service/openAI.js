import { Configuration, OpenAIApi } from "openai";
import { ChatGPTAPI } from 'chatgpt'

const chatgpt = new ChatGPTAPI({ apiKey: process.env.OPENAI_API_KEY });
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const MAX_TOKEN = process.env.MAX_TOKEN || 3000;
const AI_INS = process.env.AI_INS;
const NON_REPLY_PROMPT = process.env.NON_REPLY_PROMPT;

const generatePrompt = (messages) => {
    const item = messages[0].text
    if (messages.length === 1) {
        return `This is a single creative use for a ${item}:`;
    } else if (messages.length === 2 && messages[1].sender === 1) {
        // human send first message
        return `This is a single creative use for a ${item} that is very different from ${messages[1].text}:`;
    } else {
        let list_idea = '';
        messages.forEach(element => {
            if (element.sender !== 0) {
                list_idea = list_idea + ',' + element.text;
            }
        })

        return `I already have this list for creative uses for a ${item}: ${list_idea}. This is a single creative use for a ${item} that is very different from any others in my current list:`
    }
}

/**
 * generate one response for one sentence
 * @returns string
 */
export const generateCompletion = async (messages) => {
    if (!configuration.apiKey) {
        //open ai key is not configured
        console.log("open ai needs an api key!");
    }

    try {
        
        const prompt = generatePrompt(messages);
        console.log("one completion");
        console.log(prompt);
        // console.log(prompt);
        const completion = await openai.createCompletion({
            model: "text-davinci-002",
            prompt: prompt,
            temperature: 0.6,
            max_tokens: MAX_TOKEN,
        });
        // console.log(completion.data.choices[0].text);
        return completion.data.choices[0];
    } catch(error) {
        console.log(error);
        return "......";
    }
}

export const chatgptReply = async(message, lastres) => {
    // console.log(message);
    if (lastres !== undefined) {
        console.log(message);
        if (message.replied === true) {
            // last message is replied
            const res = await chatgpt.sendMessage(NON_REPLY_PROMPT, {
                conversationId: lastres.conversationId,
                parentMessageId: lastres.id
            })
            return res;
        } else {
            message.replied = true;
            const res = await chatgpt.sendMessage(message.text, {
                conversationId: lastres.conversationId,
                parentMessageId: lastres.id
            });
            // console.log(res.text);
            return res;
        }        
    } else {
        // generate first idea
        const insForAI = `${AI_INS} ${message.text}.`;
        const res = await chatgpt.sendMessage(insForAI);
        console.log(res.text);
        return res;
    }
    
    
}