import { constResponses } from "../config/constResponse.js";
import { print_log } from "./utils.js";

export const generateConReply = (messages, conMes) => {
    //TODO: check input
    // if (!constResponses[item]) {
    //     print_log(`generateConReply: ${item} is not in existing items`);
    //     return {text:""};
    // }
    // if (!constResponses[item][quality]) {
    //     print_log(`generateConReply: ${quality} is not in existing quality`);
    //     return {text:""};
    // }

    // const aiMessage = [];
    // messages.forEach(e => {
    //     if (e.sender === 2) {
    //         aiMessage.push(e.text);
    //     }
    // });
    // const notUsed = constResponses[item][quality].filter(s => !aiMessage.includes(s));
    // if (notUsed.length === 0) {
    //     print_log('generateConReply: run out of responses', 1);
    //     return {text:""};
    // }

    // const randomI = Math.floor(Math.random() * notUsed.length);
    // return {text:notUsed[randomI]};
    const aiMessage = messages.filter(mess => (mess.sender === 2));
    const index = aiMessage.length; 
    if (index < conMes.length) {
        console.log('aimessage', aiMessage);
        console.log('messages', messages);
        print_log(`generateConReply: conMes[index] is ${conMes[index]}`);
        return {text: conMes[index]};
    } else {
        print_log(`run out of const reply, current index is ${index}`);
        return {text:''};
    }
}