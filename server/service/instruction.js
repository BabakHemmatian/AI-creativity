import Instruction from "../models/Instruction.js";

const ITEM_LEN = process.env.ITEM_LEN || 1;
const ITEM = process.env.ITEM;
const ITEMS = process.env.ITEMS.split(',');
//used for one user sending message
export const getOneRandomInstruction = async () => {
    // if (ITEM !== undefined) {
    //     return {text: ITEM};
    // } else {
    try {
        const index = Math.floor(Math.random() * ITEMS.length);
        // const oneInstruction = await Instruction.findOne().skip(index);
        return {text: ITEMS[index]};
    } catch (error) {
        console.log(error);
        return null;
    }
    // }

}