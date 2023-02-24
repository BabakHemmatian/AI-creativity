import Instruction from "../models/Instruction.js";

const ITEM_LEN = process.env.ITEM_LEN || 1;
const ITEM = process.env.ITEM;
//used for one user sending message
export const getOneRandomInstruction = async () => {
    if (ITEM !== undefined) {
        return {text: ITEM};
    } else {
        try {
            const index = Math.floor(Math.random() * ITEM_LEN);
            const oneInstruction = await Instruction.findOne().skip(index);
            return oneInstruction;
        } catch (error) {
            console.log(error);
            return null;
        }
    }

}