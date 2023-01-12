import Instruction from "../models/Instruction.js";

//used for one user sending message
export const getOneRandomInstruction = async () => {
    try {
        const oneInstruction = await Instruction.findOne();
        return oneInstruction;
    } catch (error) {
        console.log(error);
        return null;
    }
}