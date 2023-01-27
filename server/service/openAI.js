import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration)

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
        console.log(prompt);
        const completion = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: prompt,
            temperature: 0.6,
        });
        // console.log(completion.data.choices[0].text);
        return completion.data.choices[0].text;
    } catch(error) {
        console.log(error);
        return "......";
    }
}