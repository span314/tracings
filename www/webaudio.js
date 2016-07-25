"use strict"

var WebAudioMetronome = function(options) {
  this._options = options;
  this._tickSpacing = 60 / (this._options.resolution * this._options.bpm);
  this._audioContext = new AudioContext();
}

WebAudioMetronome.prototype.startTimer = function() {
  this._nextTickTimestamp = this._audioContext.currentTime + this._tickSpacing;
  this._elapsedTicks = -1;
  this._active = true;
}

WebAudioMetronome.prototype.stopTimer = function() {
  this._active = false;
}

WebAudioMetronome.prototype.synchronize = function() {
  var currentTime = this._audioContext.currentTime,
      currentBeat = {};
  if (!this._active) {
    return;
  }
  //Ideally loop runs once with no lag
  while (currentTime > this._nextTickTimestamp) {
    this._elapsedTicks++;
    this._nextTickTimestamp += this._tickSpacing;

    if (this._elapsedTicks % this._options.resolution === 0) {
      this._scheduleBeat();
    }
  }
  currentBeat.ticks = this._elapsedTicks;
  return currentBeat;
}

WebAudioMetronome.prototype._scheduleBeat = function() {
  var osc = this._audioContext.createOscillator();
  osc.connect(this._audioContext.destination);
  osc.frequency.value = 440.0;
  osc.start(this._nextTickTimestamp);
  osc.stop(this._nextTickTimestamp + this._options.beatDuration);
}

WebAudioMetronome.prototype._BEAT_PATTERNS = {
  '2': [2, 0],
  '3': [2, 0, 0],
  '4': [2, 0, 1, 0],
  '6': [2, 0, 0, 1, 0, 0]
};

var testDuration = 3000;
var testPollRate = 100;
var test = new WebAudioMetronome({
  bpm: 80,
  beatDuration: 0.1,
  startBeat: 0,
  timeSignatureTop: 4,
  timeSignatureBottom: 4,
  resolution: 4
});
test.startTimer();

var timerId = setInterval(function() {
  console.log("raf");
  console.log(test.synchronize());
  testDuration -= testPollRate;
  if (testDuration <= 0) {
    clearInterval(timerId);
  }
}, testPollRate);