# Local Lord
Offline version of church-of-gpt

## Install
1. `npm install`
2. Install ollama
   1. `curl -fsSL https://ollama.com/download/Ollama-darwin.zip -O`
   2. `ollama run dolphin-mistral`
   3. `ollama serve`
3. Install Vosk for the voice recognition: https://alphacephei.com/vosk/install
   1. Download a model and add to program directory: https://alphacephei.com/vosk/models (see code for the recommended model: currently vosk-model-en-us-0.42-gigaspeech)
   2. Customize prompt.txt and set correct permissions: `chmod 644 prompt.txt`
4. Install `sox`
   1. `brew install sox`
5. Install `piper-phonemize`
   1. `git clone https://github.com/rhasspy/piper-phonemize.git`
   2. `cd piper-phonemize && make`
   3. `sudo cp install/lib/* /usr/local/lib`
6. Install `piper`
   1. `git clone https://github.com/rhasspy/piper.git`
   2. `cd piper`
   3. `brew install cmake`
   4. `make`
   5. Download speech model and add to program directory: [Model download link](https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_GB/alan/medium)
   5. test piper `export DYLD_LIBRARY_PATH=$DYLD_LIBRARY_PATH:/usr/local/lib; echo "hello" | ./piper/install/piper --model en_GB-alan-medium.onnx --output_raw | sox -t raw -r 22050 -b 16 -e signed-integer - -d pitch -100`

## Run
- `./start.sh`
- Done with the fun? `Ctrl + C`

## Troubleshooting Log
- On a brand-spankin new Mac:
   1. we install homebrew
   2. then we install node via homebrew
   3. node was failing to install anything
   4. because python wasn't installed properly
   5. so we needed to install python via homebrew
   6. and then we needed to install node-gyp globally
   7. and then finally we were able to install everything we needed