# Local Lord
Offline version of church-of-gpt

## Install
1. `npm install`
2. Install ollama
   1. `curl -fsSL https://ollama.com/download/Ollama-darwin.zip -O`
   2. `ollama run dolphin-mistral`
3. Install Vosk for the voice recognition: https://alphacephei.com/vosk/install
   1. Download a model and add to program directory: https://alphacephei.com/vosk/models (see code for the recommended model: currently vosk-model-en-us-0.42-gigaspeech)
   2. Customize prompt.txt and set correct permissions: `chmod 644 prompt.txt`
4. Install `piper`
   1. `git clone https://github.com/rhasspy/piper.git`
   2. `cd piper`
   3. `make`

## Run
- `./start.sh`
- Done with the fun? `Ctrl + C`

## Troubleshooting
- Nothing can go wrong. Everything is perfect.