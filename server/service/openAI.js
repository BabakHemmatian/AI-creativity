import { Configuration, OpenAIApi } from "openai";
import { ChatGPTAPI } from 'chatgpt'

const chatgpt = new ChatGPTAPI({ apiKey: process.env.OPENAI_API_KEY });
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const MAX_TOKEN = process.env.MAX_TOKEN || 3000;
const AI_INS = process.env.AI_INS;
const END_PROMPT = process.env.END_PROMPT;

// check string is fully punc
const isPunc = (s) => {
    return /^(\.|\,|\!|\?|\:|\;|\"|\'|\-|\(|\))*$/g.test(s);
}

// the function will filter one sentence and remove duplicate punc at the end
// if the sentence end has no punc, it will append one.
const onePuncFilter = (sentence) => {
    if (sentence.length < 2) {
        //most of time it might be an empty string
        return sentence;
    } else {
        if (isPunc(sentence.slice(-2))) {
            // the end of sentence has two punc
            return sentence.slice(0, -1);
        } else if (! isPunc(sentence.slice(-1))) {
            // the end of sentence has no punc
            // we append one period at the end
            return `${sentence}.`;
        } else {
            return sentence;
        }
    }
}

// remove one or two punc at the end
const noPuncFilter = (sentence) => {
    if (sentence.length < 2) {
        //most of time it might be an empty string
        return sentence;
    } else {
        if (isPunc(sentence.slice(-2))) {
            // the end of sentence has two punc
            return sentence.slice(0, -2);
        } else if (isPunc(sentence.slice(-1))) {
            // the end of sentence has no punc
            // we append one period at the end
            return sentence.slice(0, -1);
        } else {
            return sentence;
        }
    }
}


const generatePrompt = (messages) => {
    const item = messages[0].text
    if (messages.length === 1) {
        return `This is a single creative use for a ${item}:`;
    } else if (messages.length === 2 && messages[1].sender === 1) {
        // human send first message
        return `This is a single creative use for a ${item} that is very different from ${messages[1].text}:`;
    } else {
        const messages2 = messages.filter((message) => (message.sender !==0));
        const list_idea = messages2.map((message) => (noPuncFilter(message.text))).join(',');

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

const generateChatGPTPrompt = (messages) => {
    const item = messages[0].text
    const messages2 = messages.filter((message) => (message.sender===2));
    const list_idea = messages2.map((message) => (noPuncFilter(message.text))).join(',');
    if (list_idea.length > 0) {
        return `We already have this list of creative uses for a ${item}: ${list_idea}. Can you tell me a creative use that is very different from all the uses in this list?`
    } else {
        return '';
    }
}

    

export const chatgptReply = async(message, messages, lastres) => {
    console.log("ChatGPT completion");

    if (lastres !== undefined) {
        console.log(message);
        const prompt = generateChatGPTPrompt(messages)+END_PROMPT;
        console.log(prompt);
        if (message.replied === true) {
            // last message is replied
            
            const res = await chatgpt.sendMessage(prompt, {
                conversationId: lastres.conversationId,
                parentMessageId: lastres.id
            })
            return res;
        } else {
            message.replied = true;
            const res = await chatgpt.sendMessage(prompt, {
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