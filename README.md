# An Experimental Testbed for Evaluating Co-Creativity in Human-Human and Human-AI Teams

*Developed by Babak Hemmatian, Yijun Lin, Shravan Ramamoorthy, Haotian Wang, and Naman Raina*

---

## Table of Contents

- [Introduction](#introduction)
- [How to Use](#how-to-instructions)
  - [Two-Computer Interaction](#two-computer-interaction)
  - [Single-Computer Interaction](#single-computer-interaction)
- [FAQs](#faqs)

---

## Introduction

We present a [new experiment platform](https://co-creativity.onrender.com/) to allow controlled study of human-AI and human-human teams during a co-creation task. We have created a cooperative version of the classic Alternate Uses Test (AUT; Guilford, 1967), where the goal is to produce as many original and practical creative uses for an everyday object as possible within a time limit. Our platform allows co-players to interact during the ideation stage before choosing their personal responses during the curation step. Our original webapp allows identical procedures to be used for human-human and human-AI pairs and experimental controls to be applied to the chat. The results can be evaluated using the same procedures as in the standard individual test of creativity. We currently use GPT-5 as the AI agent, but the platform’s modularity allows us to replace it with more or less advanced algorithms as needed. Write to [Babak Hemmatian, Ph.D.](mailto:bhemmatian2@unl.edu) with any questions or concerns. 

## How to Use

To better demonstrate the full range of features, the app is configured by default to support pairs of players going through three types of sessions in a randomized order: partnering with a fellow human, partnering with GPT-5, and a non-interactive chat session where two partners independently generate their ideas. See below more information on how to use the app.

### Two-Computer Interaction

Have at least two individuals perform the following tasks independently on separate computers:

1. Open a browser - Google Chrome, Microsoft Edge, or Mozilla Firefox.
2. Open [this Qualtrics survey](https://unlcorexmuw.qualtrics.com/jfe/form/SV_862tsQLudDvyUuy) in an incognito tab.
3. Proceed through the survey as instructed. Note that you may have to wait at times to advance to the next page. This is to ensure that the tasks are performed carefully by the participants.
4. When instructed, use [this link](https://co-creativity.onrender.com/) to open the chat app in a separate incognito tab, get paired with the fellow user and start a session.
5. When instructed, go back to the survey to curate the best answers from your session. 
8. The rest of the survey has very clear instructions and is easy to follow - if there are any questions please see the FAQs section.

### Single-Computer Interaction

If you wish to test the multiple-user version on one computer, follow the steps below.

1. Create two separate incognito tabs for the surveys and the chat app, respectively.
2. For the chat app portion, login or register with **two different** profiles when the login page appears. Also, make sure the usernames and avatars chosen are easy to identify.
3. Once the chat app page finishes loading, select 'match' in the top-left corner in both tabs.
4. Continue to advance the task for both "users" in the separate tabs.

## FAQs
### Where can I find the list of normed responses used in the non-interactive condition?
The link is [here.](https://github.com/foogeeks/AI-creativity/blob/3condition/server/config/constResponse.js)
### How do I match and chat?
1. Head over to the [chat app](https://aicreativity-frontend.onrender.com/).
2. You will be prompted to the following page:

   <p align="center">
     <img src="content/faq1.png" alt="Pre-Test Part 2 Page" width="800">
     <br>
     <em>Login Page for Chat App</em>
   </p>

3. Enter your information (note that registration requires a password confirmation).
4. Choose an avatar and type in your name as shown below:

   <p align="center">
     <img src="content/faq2.png" alt="Pre-Test Part 2 Page" width="400">
     <br>
     <em>Enter Name & Choose Avatar</em>
   </p>

5. You will see this screen (do refresh so that you can see the avatar on the top right). Click on "match".

   <p align="center">
     <img src="content/faq3.png" alt="Pre-Test Part 2 Page" width="1000">
     <br>
     <em>Match Page</em>
   </p>
   
7. You will be directed to the chat screen. Type "ready" to get started.

    <p align="center">
     <img src="content/faq4.png" alt="Pre-Test Part 2 Page" width="1000">
     <br>
     <em>Chat Page</em>
   </p>
   
### The chat app is unresponsive. What do I do?
Please refresh the page and the chat app will restart from the round you were currently in. If the problem persists, please log out and then log in again. 

### I want to provide feedback on the chat app. Who should I contact?
Please contact [Babak Hemmatian, Ph.D.](mailto:bhemmatian2@unl.edu).
