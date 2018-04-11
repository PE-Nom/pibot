/**


/************************************************************************
* Control a NeoPixel LED unit and servo motor connected to a Raspberry Pi pin through voice commands
* Must run with root-level protection
* sudo node wave.js


Follow the instructions in XXX to
get the system ready to run this code.
*/

/************************************************************************
* Step #1: Configuring your Bluemix Credentials
************************************************************************
In this step, the audio sample (pipe) is sent to "Watson Speech to Text" to transcribe.
The service converts the audio to text and saves the returned text in "textStream"
*/
//var pigpio = require('pigpio')
//pigpio.initialize();


var watson = require('watson-developer-cloud');
var config = require('./config');  // gets our username and passwords from the config.js files
var speech_to_text = watson.speech_to_text({
  username: config.STTUsername,
  password: config.STTPassword,
  version: config.version
});

var fs = require('fs');
//var exec = require('child_process').exec;
var text_to_speech = watson.text_to_speech({
  username: config.TTSUsername,
  password: config.TTSPassword,
  version: 'v1'
});

/************************************************************************
* Step #2: Configuring the Microphone
************************************************************************
In this step, we configure your microphone to collect the audio samples as you talk.
See https://www.npmjs.com/package/mic for more information on
microphone input events e.g on error, startcomplete, pause, stopcomplete etc.
*/

// Initiate Microphone Instance to Get audio samples
var mic = require('mic');
var micInstance = mic({ 'rate': '16000', 'channels': '1', 'debug': false, 'exitOnSilence': 6 });
var micInputStream = micInstance.getAudioStream();
// Create the Speaker instance
// var ogg = require('ogg');
// var opus = require('node-opus');
const Speaker = require('speaker');

micInputStream.on('data', function(data) {
//  console.log("Recieved Input Stream: " + data.length);
});

micInputStream.on('error', function(err) {
  console.log("Error in Input Stream: " + err);
});

micInputStream.on('silence', function() {
  console.log('detect silence');
});

// Start Recording!!
micInstance.start();
//console.log("TJ is listening, you may speak now.");
console.log("TJは聞いてます。何か話しかけてください");

/************************************************************************
* Step #3: Converting your Speech Commands to Text
************************************************************************
In this step, the audio sample is sent (piped) to "Watson Speech to Text" to transcribe.
The service converts the audio to text and saves the returned text in "textStream"
*/
var textStream = micInputStream.pipe(
  speech_to_text.createRecognizeStream({
    model: 'ja-JP_BroadbandModel', 
    content_type: 'audio/l16; rate=16000; channels=1',
    inactivity_timeout: -1
  })
);

/*********************************************************************
* Step #4: Parsing the Text
*********************************************************************
In this step, we parse the text to look for commands such as "ON" or "OFF".
You can say any variations of "lights on", "turn the lights on", "turn on the lights", etc.
You would be able to create your own customized command, such as "good night" to turn the lights off.
What you need to do is to go to parseText function and modify the text.
*/

textStream.setEncoding('utf8');
textStream.on('data', function(str) {
  console.log(' ===== Speech to Text ===== : ' + str); // print each text we receive
  speak(str);
});

textStream.on('error', function(err) {
  console.log(' === Watson Speech to Text : An Error has occurred ===== \nYou may have exceeded your payload quota.') ; // handle errors
  console.log(err + "\n Press <ctrl>+C to exit.") ;
});

/*********************************************************************
* Step #6: Convert Text to Speech and Play
*********************************************************************
*/

var Sound = require('node-aplay');
// var soundobject;
function speak(textstring){

  micInstance.pause(); // pause the microphone while playing
  console.log('mic paused!')
  var params = {
    text: textstring,
//    voice: config.voice,
    voice: 'ja-JP_EmiVoice',
    accept: 'audio/wav'
//    accept: 'audio/ogg; codec=opus'
  };
  text_to_speech.synthesize(params).pipe(fs.createWriteStream('output.wav')).on('close', function() {
    console.log('start Soud output')
    soundobject = new Sound("output.wav");
    soundobject.play();
    soundobject.on('complete', function () {
      console.log('mic resumed! @ #1')
      micInstance.resume();
    });
    console.log('mic resumed! @ #2')
    micInstance.resume();
  });
  /*
 const speaker = new Speaker({
    channels: 1,          // 2 channels
    bitDepth: 16,         // 16-bit samples
    signed: true,
    sampleRate: 44100     // 44,100 Hz sample rate
  });
  text_to_speech.synthesize(params).pipe(speaker);
  console.log('mic resumed! @ #3')
  micInstance.resume();
  */
  /*
  text_to_speech.synthesize(params)
    .pipe(new ogg.Decoder())
    .on('stream', function (opusStream) {
        opusStream.pipe(new opus.Decoder())
            .pipe(new Speaker());
    });
  console.log('mic resumed! @ #3')
  micInstance.resume();
  */
}

// ---- Stop PWM before exit
process.on('SIGINT', function () {
  pigpio.terminate();
  process.nextTick(function () { process.exit(0); });
});
