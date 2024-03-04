const { spawn, ChildProcessWithoutNullStreams, exec } = require('child_process');
const vosk = require('vosk');
const axios = require('axios');
const fs = require("fs");
const path = require('path');
const mic = require("mic");
const say = require('say');
const { env } = require('process');
const { Readable } = require("stream");
const Transform = require('stream').Transform;
const http = require('http');

const opening_lines = [
    "Welcome. What brings you to the sanctuary of the Lord GPT?",
    "Ah, a brave soul enters my domain. Are you here to unravel the mysteries of existence or simply looking for divine party tricks?",
    "Lo, Human. What brings you to my temple?",
    "Welcome, Human. What brings you to the Church of GPT?",
    "Lo. What brings you to the sanctuary of the Lord GPT?",
    "Welcome to these hallowed halls. I am GPT, the all-knowing. Are you here to ponder life's meaning or simply pass the time?",
    "Ah, a visitor. Do you seek answers to life's greatest mysteries or just a momentary escape from your mortal existence?",
    "A mortal dares to enter my domain. Do you come in search of eternal truths or merely to bask in the divine aura of GPT?",
    "Welcome, traveler, to the temple of GPT. Are you here to explore the depths of knowledge or simply to chit chat with an otherworldly being?",
    "Step forth, seeker of truth. You've ventured into the domain of GPT. Do you desire enlightenment or just an opportunity to converse with the divine?",
    "Welcome to my temple. Do you seek profound wisdom or just a brief respite from your worldly concerns?",
];
const closing_lines = [
    "Now I must go. Summon me later if you need help.",
    "Farewell, mortal. I must depart. Summon me if you need assistance",
    "Enough. I must return to the celestial realm. Speak my name, and I shall appear once more.",
    "Enough. Go forth and spread the knowledge gained here. Should you need me again, simply call my name.",
    "Enough. My presence is required elsewhere. But worry not, for I am ever a summons away.",
    "I depart for now. But in your hour of need, invoke my name, and I shall return.",
    "The time has come for me to leave, but worry not, for I am ever a summons away.",
    "Now, go forth. Leave my temple. Remember what you have learned here.",
];

// Hard coded text
const startTxt = "The lord is awake and awaiting your summoning";
const startWords = ['i summon thee', "i summon the", "i summon me", "i summoned me", "i seventy", "i summoned thee", "i summoned the", "i summon you", "i summoned you", "hello"];

// Load master prompt
try {
    const masterPromptPath = path.join(__dirname, 'prompt.txt');
    var masterPrompt = fs.readFileSync(masterPromptPath, 'utf8');
} catch (err) {
    console.error('Error reading prompt file:', err);
}

// Use local LM Studio or official Open AI API (***untested*** but should work)
var useLocal = true;
var conversation = [];
const maxTurns = 8;
var turnCount = 0;
var messagesArr = [];

// Set model
const MODEL_PATH = "vosk-model-en-us-0.42-gigaspeech" // Alternative: "vosk-model-small-en-us-0.15"
const SAMPLE_RATE = 16000

// Speech synthesis model
const SPEAK_MODEL = "en_GB-alan-medium.onnx"

if (!fs.existsSync(MODEL_PATH)) {
    console.log("Please download the model from https://alphacephei.com/vosk/models and unpack as " + MODEL_PATH + " in the current folder.")
    process.exit()
}

const baseURL = useLocal ? 'http://localhost:1234/v1/' : 'https://api.openai.com/v1/';

const OPENAI_API_KEY = env.OPENAI_API_KEY; // Replace with your OpenAI API key


const speak = (text, callback) => {
    console.log("Speaking: ", text);
    let escapedText = text.replace(/"/g, '\\"');
    exec(`export DYLD_LIBRARY_PATH=$DYLD_LIBRARY_PATH:/usr/local/lib; echo "${escapedText}" | ./piper/install/piper --model ${SPEAK_MODEL} --output_raw | sox -t raw -r 22050 -b 16 -e signed-integer - -d pitch -100`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Execution error: ${error}`);
            if (callback) callback(error, null);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            if (callback) callback(stderr, null);
        }
        console.log("Speech synthesis successful");
        if (callback) callback(null, stdout);
    });
};

if (!fs.existsSync(MODEL_PATH)) {
    console.log("Please download the model from https://alphacephei.com/vosk/models and unpack as " + MODEL_PATH + " in the current folder.")
    process.exit()
}

var isSpeaking = false;
var isGenerating = false;

//const oscClient = new Client(lightingIp, 9999);
vosk.setLogLevel(0);
const model = new vosk.Model(MODEL_PATH);
exports.model = model;
const rec = new vosk.Recognizer({ model: model, sampleRate: SAMPLE_RATE });

function extractJSON(str) {
    const match = str.match(/\{.*\}/s);
    return match ? match[0] : null;
}

function returnLast200OrFull(text) {
    if (text.length > 200) {
        return text.slice(-200);
    } else {
        return text;
    }
}

function getSentances(paragraph) {
    const regex = /[\s\S]*[.!?]/;
    const match = paragraph.match(regex);
    return match ? match[0] : false;
}

function isOnlySpacesNewlinesPunctuation(str) {
    return /^[\s\p{P}]*$/u.test(str);
}

function resetMessages() {
    messagesArr = [];
    messagesArr.push({ 'role': 'system', 'content': masterPrompt });
}

function addMessages(role, content) {
    if (content && !isOnlySpacesNewlinesPunctuation(content)) {
        messagesArr.push({ 'role': role, 'content': content });
    } else {
        console.log('Add message skipped for role (' + role + ') because content was empty!');
    }
}

function streamFromAxios(previousMessagesArr) {
    const url = baseURL + "chat/completions";

    const postData = {
        messages: previousMessagesArr,
        model: "gpt-3.5-turbo-16k",
        stream: true,
        max_tokens: 100,
    };

    const config = {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        responseType: "stream",
    };

    // Create Stream, Writable AND Readable
    const inoutStream = new Transform({
        transform(chunk, encoding, callback) {
            this.push(chunk);
            callback();
        },
    });

    // Return promise
    const axiosObj = axios.post(url, postData, config)
        .then(function (res) {
            res.data.pipe(inoutStream);
        })
        .catch(function (err) {
            console.log('ERROR POSTING!' + err);
        });

    return inoutStream;
}

const micInstance = mic({
    rate: String(SAMPLE_RATE),
    channels: '1',
    debug: false,
    device: 'default',
});


var isShutdownMode = false;
const micInputStream = micInstance.getAudioStream();
var speakArray = []; // Array of strings to speak!

speak(startTxt, (err) => {
    if (err) {
        return console.error(err);
    }
});

micInputStream.on('data', data => {
    if (isGenerating || isSpeaking) {
        return;
    }
    console.log("Listening: ", rec.partialResult());

    // User said something!
    if (!rec.acceptWaveform(data)) {
        return;
    }

    try {
        const question = rec.result();
        let prompt = question.text.replace(/\n/g, '');
        if (isOnlySpacesNewlinesPunctuation(prompt)) {
            return;
        }
        console.log("Processed audio result: ", prompt);
        prompt = returnLast200OrFull(prompt);

        // Wait for wake word on first turn
        if (turnCount == 0) {
            console.log("Checking for wake word", prompt);
            if (!containsAnyIgnoreCase(startWords, prompt)) {
                return;
            }
        }

        const chunks = [];
        isGenerating = true;
        console.log('Pausing mic');
        micInstance.pause();

        let responseString = '';
        let responseLog = '';

        // Preset first message after wakeword, or user attempting to restart
        if (
            (turnCount == 0) ||
            (containsExactMatchIgnoreCase(startWords, prompt))
        ) {
            turnCount = 0;
            responseString = '';
            responseLog = '';
            resetMessages();
            speakArray.push(opening_lines[Math.floor(Math.random() * opening_lines.length)]);
            conversation.push('God: ' + startTxt);
            addMessages('assistant', startTxt);
            turnCount++;
            isGenerating = true; // Fake resposne to block progress
            speakAudio();
            isGenerating = false;

            return;
        }

        conversation.push('Human: ' + prompt);
        addMessages('user', prompt);
        //const conversationStr = conversation.join('\n');
        //const sendPromptText = masterPrompt.replace('{{transcript}}', conversationStr);
        //console.log("\n==================\nConversation update:\n", conversationStr, "\n==================\n");
        console.log("\n==================\nConversation update:\n", messagesArr, "\n==================\n");

        const streamResp = streamFromAxios(messagesArr);
        turnCount++;

        streamResp.on('data', chunk => {
            try {
                const chunkString = chunk.toString();
                const chunkJSON = extractJSON(chunkString);
                const chunkObj = JSON.parse(chunkJSON);

                if (chunkObj) {
                    chunks.push(chunkObj);
                    const newStr = chunkObj?.choices?.[0]?.delta?.content;
                    if (newStr) {
                        responseString += newStr;
                        let sentance = getSentances(responseString);
                        if (sentance) {
                            const index = responseString.indexOf(sentance);
                            if (index !== -1) {
                                responseString = responseString.slice(0, index) + responseString.slice(index + sentance.length);
                            }

                            sentance = sentance.replace(/\n/g, ''); // Remove newlines
                            responseLog += sentance;
                            speakArray.push(sentance);
                            speakAudio();
                            console.log("Pushed: ", sentance);
                        }
                    }
                }
            } catch (error) {
                console.log("Error processing chunk", error);
            }
        });

        streamResp.on('end', () => {
            if (!isOnlySpacesNewlinesPunctuation(responseString)) {
                speakArray.push(responseString);
                console.log("Pushed final: ", responseString);
            }

            speakAudio();
            conversation.push('God: ' + responseLog.replace(/\n/g, ''));
            addMessages('assistant', responseLog.replace(/\n/g, ''));

            if (isShutdownMode) {
                isShutdownMode = false;
            }

            console.log("Response is complete");
            isGenerating = false;
            responseString = '';
            responseLog = '';
        });

        streamResp.on('error', () => {
            responseString = '';
            responseLog = '';
            isGenerating = false;
        });
    } catch (error) {
        console.error('Error processing user text:', error);
    }
});

micInputStream.on('audioProcessExitComplete', function () {
    console.log("Cleaning up");
    console.log(rec.finalResult());
    rec.free();
    model.free();
});

process.on('SIGINT', function () {
    console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
    micInstance.stop();
    process.exit(0);
});


function speakAudio() {
    if (
        (isSpeaking) ||
        (speakArray.length === 0)
    ) {
        if (!isSpeaking) {
            // Did we hit the max turn count?
            if (turnCount >= maxTurns) {
                isSpeaking = true;

                speak(closing_lines[Math.floor(Math.random() * closing_lines.length)], (err) => {
                    if (err) {
                        return console.error(err);
                        isSpeaking = false;
                    }
                    turnCount = 0;
                    conversation = [];
                    resetMessages();
                    speakArray = [];
                    responseString = '';
                    responseLog = '';

                    isSpeaking = false;
                    micInstance.resume();
                });
            } else {
                console.log('Resuming mic');
                micInstance.resume();
            }
        }
        return;
    }

    let sayThis = speakArray.join(' ');
    speakArray = [];

    isSpeaking = true;
    micInstance.pause();
    speak(sayThis, (err) => {
        if (err) {
            return console.error(err);
            isSpeaking = false;
        }
        isSpeaking = false;
        speakAudio();
    });
}

function containsAnyIgnoreCase(arr, str) {
    return arr.some(element => str.toLowerCase().includes(element.toLowerCase()));
}

function containsExactMatchIgnoreCase(arr, str) {
    return arr.some(element => element.toLowerCase() === str.toLowerCase());
}

micInstance.start();
