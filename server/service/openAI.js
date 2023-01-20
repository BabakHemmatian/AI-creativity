import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration)

const generatePrompt = (messages) => {
    let prompt = '';
    messages.forEach(element => {
        prompt = prompt + element
    });
    return prompt;
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
        console.log(completion.data.choices[0].text);
        return completion.data.choices[0].text;
    } catch(error) {
        console.log(error);
        return "......";
    }
}