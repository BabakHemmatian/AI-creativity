# An Experimental Testbed for Evaluating Co-Creativity in Human-Human and Human-AI Teams

*Developed by Yijun Lin, Babak Hemmatian & Naman Raina.*

---

## Table of Contents

- [Introduction](#introduction)
- [Motivation](#motivation)
- [How-to Instructions](#how-to-instructions)
  - [Two-Computer Interaction](#two-computer-interaction)
  - [Single-Computer Interaction](#single-computer-interaction)
- [FAQs](#faqs)

---

## Introduction

We present a new experiment platform to address this gap by allowing controlled study of human-AI and human-human teams in a creative task. We have created a cooperative version of the classic Alternate Uses Test (AUT; Guilford, 1967), where the goal is to produce as many original and practical creative uses for an everyday object as possible within a time limit. Our platform allows co-players to interact freely during the ideation stage before choosing their personal responses during the curation step. Our original webapp allows identical procedures to be used for human-human and human-AI pairs and experimental controls to be applied to the chat. The results can be evaluated using the same procedures as in the standard individual test of creativity. We currently use GPT-4 as the AI agent, but the platform’s modularity allows us to replace it with more or less advanced algorithms as needed.

## Motivation

An emerging consensus in the cognitive sciences states that flexible, adaptive behavior (i.e., intelligence) does not come from individuals alone, but rather often reflects the competent incorporation of knowledge and skills from one’s community (Sloman & Fernbach, 2018). For instance, research identifies the ability to successfully coordinate with one’s team members, called their collective intelligence (CI), as a much better predictor of group outcomes than individual IQs (Riedl et al., 2022). Although creativity is an increasingly important manifestation of intelligence in the information economy, creativity research has not kept up with this collective shift in the cognitive sciences.

## How-to Instructions

### Two-Computer Interaction

1. Open a browser - Google Chrome, Microsoft Edge, or Mozilla Firefox.
2. Take the Qualtrics survey in a separate tab. Please make sure that paired participants take the same survey to avoid timing mismatches.
   - **Links:** [Pre-Test](https://illinois.qualtrics.com/jfe/form/SV_eFeqLBEoz6mqcaq) and [Post-Test](https://illinois.qualtrics.com/jfe/form/SV_cNfEeh6SoG0OnnU)
3. Once you reach the second page of the survey, please take at least **1 minute** to read the instructions as the right arrow will not appear until one minute has passed.

   <p align="center">
     <img src="content/third_qualtrics_one_minute.png" alt="Instructions Page of Qualtrics Survey" width="600">
     <br>
     <em>Instructions Page of Qualtrics Survey</em>
   </p>

4. Depending on the survey (pre or post) there will be different next **pages:**

   **i. Pre-Test**
   a. Spend two minutes to write up the creative uses of the assigned item (in this case it is a safety pin).

   <p align="center">
     <img src="content/fourth_qualtrics_pre.png" alt="Pre-Test Creative Use Page" width="600">
     <br>
     <em>Pre-Test Creative Use Page</em>
   </p>

   b. Follow the instructions **carefully** on the next page to start part 2. The link to use for step 1 is [here](https://aicreativity-frontend.onrender.com).

   <p align="center">
     <img src="content/fifth_qualtrics_pre.png" alt="Pre-Test Part 2 Page" width="600">
     <br>
     <em>Pre-Test Part 2 Page</em>
   </p>

   c. After round 1 of the chat, please write **in detail** about the creative uses:

   <p align="center">
     <img src="content/sixth_qualtrics_pre.png" alt="Pre-Test Part 2 Page" width="600">
     <br>
     <em>Pre-Test Part 2 Page</em>
   </p>

   d. Follow the instructions on the next page to match again.

   <p align="center">
     <img src="content/seventh_qualtrics_pre.png" alt="Pre-Test Part 2 Page" width="600">
     <br>
     <em>Pre-Test Part 2 Page</em>
   </p>

   e. Repeat steps c and d until the human condition.

   f. The pages afterwards have instructions that are straightforward and easy to follow. Please complete them to the best of your abilities and take your time 😄

   **ii. Post-Test**
   a. Part 1 is the same as Pre-Test (b) Part 2.

## FAQs
### Where can I find the constant responses ?
The link is [here](https://github.com/foogeeks/AI-creativity/blob/3condition/server/config/constResponse.js)
### How do I match and chat ?
1. Head over to the [chat app](https://aicreativity-frontend.onrender.com/).
2. You will be prompted to the following page:
![image](https://github.com/foogeeks/AI-creativity/assets/86483914/7fca11db-25f1-4dcf-9f35-a18568938bb6)
3. Enter your information (note that registration requires a password confirmation).
4. Choose an avatar and type in your name as shown below:
![image](https://github.com/foogeeks/AI-creativity/assets/86483914/ae91b98d-fca4-419d-bd64-7adaba458387)
5. 
