"use strict"

var WebAudioMetronome = function(options) {
  this._options = options;
  this._tickSpacing = 60 / (this._options.resolution * this._options.bpm);
  this._beatPattern = this._BEAT_PATTERNS[this._options.timeSignatureTop];
  this._audioContext = new AudioContext();
}

WebAudioMetronome.prototype._BEAT_PATTERNS = {
  '2': [3, 1],
  '3': [3, 1, 1],
  '4': [3, 1, 2, 1],
  '6': [3, 1, 1, 2, 1, 1]
};

WebAudioMetronome.prototype.reset = function() {
  this._active = false;
}

WebAudioMetronome.prototype.synchronize = function() {
  var beatCount, beatStrength,
      currentTime = this._audioContext.currentTime;
  //Initialize timer if necessary
  if (!this._active) {
    this._nextTickTimestamp = currentTime;
    //Leave one tick buffer to schedule first beat
    this._elapsedTicks = this._options.startTick - 1;
    this._active = true;
    this._currentBeat = {};
    this._nextBeat = {};
  }

  //Ideally loop runs once with no lag
  while (currentTime >= this._nextTickTimestamp) {
    this._elapsedTicks++;
    this._nextTickTimestamp += this._tickSpacing;

    beatCount = Math.floor(this._elapsedTicks / this._options.resolution) % this._options.timeSignatureTop;
    beatStrength = this._elapsedTicks % this._options.resolution ? 0 : this._beatPattern[beatCount];

    this._currentBeat = this._nextBeat;
    this._nextBeat = {ticks: this._elapsedTicks, beat: beatCount, strength: beatStrength};

    if (beatStrength) {
      this._scheduleBeat(beatStrength);
    }
  }
  return this._currentBeat;
}

WebAudioMetronome.prototype._scheduleBeat = function(strength) {
  var osc = this._audioContext.createOscillator(),
      gain = this._audioContext.createGain(),
      startTime = this._nextTickTimestamp,
      endTime = startTime + this._options.beatDuration;

  osc.start(startTime);
  osc.stop(endTime);

  osc.frequency.setValueAtTime(440.0, startTime);
  osc.frequency.exponentialRampToValueAtTime(1.0, endTime);

  gain.gain.setValueAtTime(strength / 3, startTime);
  gain.gain.exponentialRampToValueAtTime(0.01, endTime);

  osc.connect(gain);
  gain.connect(this._audioContext.destination);
}

var testDuration = 6000;
var testPollRate = 50;
var test = new WebAudioMetronome({
  bpm: 138,
  beatDuration: 0.2,
  startTick: 0,
  timeSignatureTop: 6,
  timeSignatureBottom: 8,
  resolution: 4
});

var timerId = setInterval(function() {
  console.log("raf");
  console.log(test.synchronize());
  testDuration -= testPollRate;
  if (testDuration <= 0) {
    clearInterval(timerId);
  }
}, testPollRate);