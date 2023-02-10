import { Configuration, OpenAIApi } from "openai";
import { ChatGPTAPI } from 'chatgpt'

const chatgpt = new ChatGPTAPI({ apiKey: process.env.OPENAI_API_KEY });
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const MAX_TOKEN = process.env.MAX_TOKEN || 3000;

const generatePrompt = (messages) => {
    if (messages.length === 1) {
        return `This is a single creative use for a ${messages[0].txt}:`;
    } else if (messages.length === 2 && messages[1].sender === 1) {
        // human send first message
        return `This is a single creative use for a ${messages[0].txt} that is very different from ${messages[1].txt}:`;
    } else {
        let list_idea = '';
        messages.forEach(element => {
            if (element.sender !== 0) {
                list_idea = list_idea + ',' + element.txt;
            }
        })

        return `I already have this list for creative uses for a ${messages[0].txt}: ${list_idea}. This is a single creative use for a paper clip that is very different from any others in my current list:`
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
        // console.log(prompt);
        const completion = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: prompt,
            temperature: 0.6,
            max_tokens: MAX_TOKEN,
        });
        // console.log(completion.data.choices[0].text);
        return completion.data.choices[0].text;
    } catch(error) {
        console.log(error);
        return "......";
    }
}

export const chatgptReply = async(message, lastres) => {
    console.log(message);
    if (lastres !== undefined) {
        const res = await chatgpt.sendMessage(message, {
            conversationId: lastres.conversationId,
            parentMessageId: lastres.id
        });
        console.log(res.text);
        return res;
    } else {
        const insForAI = `Hi! This is a game where you and a paired player collectively generate a 
        list of creative uses for an everyday object. Please one time come up with one creative use. 
        The object you will be coming up with creative uses for is: ${message}.`;
        const res = await chatgpt.sendMessage(insForAI);
        console.log(res.text);
        return res;
    }
    
    
}