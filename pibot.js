var watson = require('watson-developer-cloud');
var config = require('./config');  // gets our username and passwords from the config.js files
var speech_to_text = watson.speech_to_text({
  username: config.STTUsername,
  password: config.STTPassword,
  version: config.version
});

var conversation = watson.conversation({
  username: config.ConUsername,
  password: config.ConPassword,
  version: 'v1',
  version_date: '2016-07-11'
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
*************************************************************************/

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
*************************************************************************/
var textStream = micInputStream.pipe(
  speech_to_text.createRecognizeStream({
    model: 'ja-JP_BroadbandModel', 
    content_type: 'audio/l16; rate=16000; channels=1',
    inactivity_timeout: -1
  })
);

/*********************************************************************
* Step #4: Parsing the Text
**********************************************************************/

textStream.setEncoding('utf8');

var conversationcontext = {} ; // Save information on conversation context/stage for continous conversation

textStream.on('data', function(str) {
  console.log(' ===== Speech to Text ===== : ' + str); // print each text we receive

  var res = str ;
  console.log("msg sent to conversation:" ,res);
  conversation.message({
    workspace_id: config.ConWorkspace,
    input: {'text': res},
    context: conversationcontext
  },  function(err, response) {
    if (err) {
      console.log('error:', err);
    } else {
      conversationcontext = response.context ; //update conversation context
      conversation_response =  response.output.text[0]  ;
      if (conversation_response != undefined ){
        console.log("Result from conversation : " , conversation_response);
        var matchedintent =  response.intents[0].intent ; // intent with the highest confidence
        var intentconfidence = response.intents[0].confidence  ;
        console.log("intents : " , response.intents) ;
        if (intentconfidence > 0.4){
          speak(conversation_response) ;
        }
      }else {
        speak('レスポンスが未定義です');
      }
    }
  })
});

textStream.on('error', function(err) {
  console.log(' === Watson Speech to Text : An Error has occurred ===== \nYou may have exceeded your payload quota.') ; // handle errors
  console.log(err + "\n Press <ctrl>+C to exit.") ;
});

/*********************************************************************
* Step #6: Convert Text to Speech and Play
**********************************************************************/

var Sound = require('node-aplay');
// var soundobject;
function speak(textstring){

  micInstance.pause(); // pause the microphone while playing
  console.log('mic paused!')
  var params = {
    text: textstring,
    // voice: config.voice,
    voice: 'ja-JP_EmiVoice',
    accept: 'audio/wav'
    // accept: 'audio/ogg; codec=opus'
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
}

// ---- Stop PWM before exit
process.on('SIGINT', function () {
  pigpio.terminate();
  process.nextTick(function () { process.exit(0); });
});
