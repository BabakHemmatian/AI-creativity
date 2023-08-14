import { constResponses } from "../config/constResponse.js";
import { print_log } from "./utils.js";

export const generateConReply = (messages, quality, item) => {
    //TODO: check input
    if (!constResponses[item]) {
        print_log(`generateConReply: ${item} is not in existing items`);
        return {text:""};
    }
    if (!constResponses[item][quality]) {
        print_log(`generateConReply: ${quality} is not in existing quality`);
        return {text:""};
    }

    const aiMessage = [];
    messages.forEach(e => {
        if (e.sender === 2) {
            aiMessage.push(e.text);
        }
    });
    const notUsed = constResponses[item][quality].filter(s => !aiMessage.includes(s));
    if (notUsed.length === 0) {
        print_log('generateConReply: run out of responses', 1);
        return {text:""};
    }

    const randomI = Math.floor(Math.random() * notUsed.length);
    return {text:notUsed[randomI]};

}