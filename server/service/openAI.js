import { Configuration, OpenAIApi } from "openai";
import { ChatGPTAPI } from 'chatgpt'
import axios from 'axios';
import { response } from "express";
import OpenAI from "openai";



const chatgpt = new ChatGPTAPI({ apiKey: process.env.OPENAI_API_KEY });
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const MAX_TOKEN = process.env.MAX_TOKEN || 3000;
const AI_INS = process.env.AI_INS;
const END_PROMPT = process.env.END_PROMPT;
const COMMON_WORD = process.env.COMMON_WORD;
const COMMON_SET = COMMON_WORD.split(',');
const TRY_TIME = process.env.TRY_TIME;
// const FILTER_CONTENT = process.env.FILTER_CONTENT;
COMMON_SET.push(process.env.ITEM);

// check string is fully punc
const isPunc = (s) => {
    return /^(\.|\,|\!|\?|\:|\;|\"|\'|\-|\(|\))*$/g.test(s);
}

const httpheaders = {
    'Content-Type': 'application/json',
    'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,
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

// filter the AI response
const filterContent = (messages, sentence) => {
    let s = sentence;
    const item = messages[0].text;
    const filterArray = [
        `A ${item} can be used`,
        `A ${item} can also be used`,
        `${item}s can also be used`,
        `${item} can also be used`,
        `${item} can be used as`,
        `You can use ${item}s`,
        `You can use a ${item}`,
        `You can also use`,
        `One creative use for a ${item} is`,
        `Use a ${item}`,
        `Use ${item}`,
        `One creative use for a ${item} could be`,
        `The ${item} can be userd`,
    ]
    filterArray.forEach((prefix) => {
        s = s.replace(prefix, ' ');
        s = s.replace(prefix+' to', ' ');
        s = s.replace(prefix+' to act', ' ');
    })
    s = s.replace(/\s{2,}/g," ");
    return s;
}

// 
const sentenceToSet = (sentence) => {
    // remove punc
    let s = sentence.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    s = s.replace(/\s{2,}/g," ");
    const toret = new Set(s.split(' '));
    COMMON_SET.forEach((ele) => {
        if (toret.has(ele)) {
            toret.delete(ele);
        }
    })
    return toret;
}

const intersect = (set1, set2) => {
    let c = 0;
    set1.forEach(x => {
        if (set2.has(x)) {
            c += 1;
        }
    });
    return c / Math.max(set1.size, set2.size);
}

const checkRepeat = (setArray, sentence) => {
    const set2 = sentenceToSet(sentence);
    let collide = -1;
    setArray.forEach((set1, index) => {
        const ratio = intersect(set1, set2);
        if (ratio > 0.5) {
            collide = index;
        }
    })
    return collide;
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


// const generatePrompt = (messages) => {
//     const item = messages[0].text
//     if (messages.length === 1) {
//         return `This is a single creative use for a ${item}:`;
//     } else if (messages.length === 2 && messages[1].sender === 1) {
//         // human send first message
//         return `This is a single creative use for a ${item} that is very different from ${messages[1].text}:`;
//     } else {
//         const messages2 = messages.filter((message) => (message.sender !==0));
//         const list_idea = messages2.map((message) => (noPuncFilter(message.text))).join(',');

//         return `I already have this list for creative uses for a ${item}: ${list_idea}. This is a single creative use for a ${item} that is very different from any others in my current list:`
//     }
// }


const httpGPTCompletion = async(model, message, temperature) => 
{
    // console.log(`Messages is ${message}, ${model}`);
    const content = {
        'model':model,
        'messages':[{'role':'user', 'content':message}],
        'temperature': temperature
    }
    try {
        const response = await axios.post("https://api.openai.com/v1/chat/completions", content, {headers: httpheaders});
        if (response.status === 200) {
            console.log(response.data);
            return response.data.choices[0].message.content;
        } else {
            console.log("http gpt failed");
            console.log(response.statusText);
            // console.log(response);
        }
    } catch (error) {
        console.log("axios error", error.message);
    }
    
}



// import OpenAI from "openai";

// const openai = new OpenAI();

// async function main() {
//   const completion = await openai.chat.completions.create({
//     messages: [{ role: "system", content: "You are a helpful assistant." }],
//     model: "gpt-3.5-turbo",
//   });

//   console.log(completion.choices[0]);
// }

// main();




const apiGPTCompletion = async(model, message, temperature) => {
    const completion = await openai.createCompletion({
        model: model,
        prompt: message,
        temperature: temperature,
        max_tokens: MAX_TOKEN,
    });
    return res = completion.data.choices[0];
}


const generateChatGPTPrompt = (messages) => {
    const item = messages[0].text
    const messages2 = messages.filter((message) => (message.sender===2));
    const list_idea = messages2.map((message) => (noPuncFilter(message.text.trim()))).join(',');
    if (list_idea.length > 0) {
        return `We already have this list of creative uses for a ${item}: ${list_idea}. Can you tell me a creative use that is very different from all the uses in this list?`
    } else {
        return '';
    }
}

/**
 * generate one response for one sentence
 * @returns string
 */
export const generateCompletion = async (messages) => {
    console.log('GPT-3.5 completion');
    const prompt = generateChatGPTPrompt(messages)+' '+END_PROMPT;
    const setArray = [];
    // console.log(prompt);
    messages.forEach((m) => {
        if (m.sender !== 0) {
            setArray.push(sentenceToSet(m.text));
        }
    })
    if (messages.filter((m) => m.sender===2).length > 0) {
        let tryTimes = 0;
        do {
            const restext = await httpGPTCompletion("gpt-3.5", prompt, 0.7);
            const res = {text: restext};
            res.text = filterContent(messages, res.text);
            const i = checkRepeat(setArray, res.text);
            if ( i === -1) {
                console.log(`non repeat at ${tryTimes}`);
                return res;
            } else {
                console.log(`'${res.text}' is similar to '${messages[i+1].text}'`)
            }
            tryTimes += 1;
        } while (tryTimes < TRY_TIME);
    } else {
        // generate first idea
        let tryTimes = 0;
        const insForAI = `${AI_INS} ${messages[0].text}. ${prompt}`;
        do {
            const restext = await httpGPTCompletion("gpt-3.5", insForAI, 0.7);
            const res = {text: restext};
            res.text = filterContent(messages, res.text);
            const i = checkRepeat(setArray, res.text);
            if ( i === -1) {
                console.log(`non repeat at ${tryTimes}`);
                return res;
            } else {
                console.log(`'${res.text}' is similar to '${messages[i+1].text}'`)
            }
            tryTimes += 1;
        } while (tryTimes < TRY_TIME);
    }
    return {text:''};
}



    

export const chatgptReply = async(message, messages, lastres) => {
    console.log("ChatGPT completion");
    const prompt = generateChatGPTPrompt(messages)+' '+END_PROMPT;
    const setArray = [];
    console.log(prompt);
    messages.forEach((m) => {
        if (m.sender !== 0) {
            setArray.push(sentenceToSet(m.text));
        }
    })
    console.log(`${setArray.length} sets in array`);


    if (lastres !== undefined) {
        let tryTimes = 0;
        // let findMessage = false;
        do {
            const res = await chatgpt.sendMessage(prompt, {
                conversationId: lastres.conversationId,
                parentMessageId: lastres.id
            })
            res.text=filterContent(messages, res.text);
            const i = checkRepeat(setArray, res.text);
            if ( i === -1) {
                console.log(`non repeat at ${tryTimes}`);
                return res;
            } else {
                console.log(`'${res.text}' is similar to '${messages[i+1].text}'`)
            }
            tryTimes += 1;
        } while (tryTimes < TRY_TIME);
    } else {
        // generate first idea
        let tryTimes = 0;
        const insForAI = `${AI_INS} ${messages[0].text}.`;
        do {
            const res = await chatgpt.sendMessage(insForAI+prompt);
            res.text = filterContent(messages, res.text);
            const i = checkRepeat(setArray, res.text);
            if ( i === -1) {
                console.log(`non repeat at ${tryTimes}`);
                return res;
            } else {
                console.log(`'${res.text}' is similar to '${messages[i+1].text}'`)
            }
            tryTimes += 1;
        } while (tryTimes < TRY_TIME); 
    }
    return {text:''};
}
