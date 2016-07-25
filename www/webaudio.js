"use strict"

var WebAudioMetronome = function() {
  //Create audio context, otherwise use backup timer
  if (AudioContext) {
    this._audioContext = new AudioContext();
    this._getTime = function() {return this._audioContext.currentTime};
  } else if (webkitAudioContext) {
    this._audioContext = new webkitAudioContext();
    this._getTime = function() {return this._audioContext.currentTime};
  } else if (performance.now) {
    this._getTime = function() {return performance.now() * 0.001};
  } else {
    this._getTime = function() {return Date.now() * 0.001};
  }
}

WebAudioMetronome.prototype.options = function(options) {
  this._options = options;
  //Unmute by playing a beat quietly - iOS devices must play directly after a user interaction
  if (this._options.sound && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
    this._scheduleBeat(0.01, this._audioContext.currentTime);
  }
}

WebAudioMetronome.prototype.supportsAudio = function() {
  return !!this._audioContext;
}

WebAudioMetronome.prototype.reset = function() {
  this._active = false;
}

WebAudioMetronome.prototype.synchronize = function() {
  var beatCount, beatStrength,
      currentTime = this._getTime();
  //Initialize timer if necessary
  if (!this._active) {
    this._nextTickTimestamp = currentTime;
    this._elapsedTicks = this._options.startTick - 1; //Leave one tick buffer to schedule first beat
    this._currentBeat = {};
    this._nextBeat = {};
    this._active = true;
  }

  //Ideally loop runs once with no lag
  while (currentTime >= this._nextTickTimestamp) {
    this._elapsedTicks++;
    this._nextTickTimestamp +=  60 / (this._options.ticksPerBeat * this._options.bpm);

    beatCount = Math.floor(this._elapsedTicks / this._options.ticksPerBeat) % this._options.beatPattern.length;
    beatStrength = this._elapsedTicks % this._options.ticksPerBeat ? 0 : this._options.beatPattern[beatCount];

    this._currentBeat = this._nextBeat;
    this._nextBeat = {
      ticks: this._elapsedTicks,
      beat: beatCount % this._options.beatsPerMeasure + 1,
      strength: beatStrength
    };

    if (this._options.sound && beatStrength) {
      this._scheduleBeat(beatStrength / 3, this._nextTickTimestamp);
    }
  }

  return this._currentBeat;
}

WebAudioMetronome.prototype._scheduleBeat = function(volume, startTime) {
  var osc = this._audioContext.createOscillator(),
      gain = this._audioContext.createGain(),
      endTime = startTime + 0.2;

  osc.start(startTime);
  osc.stop(endTime);

  osc.frequency.setValueAtTime(440.0, startTime);
  osc.frequency.exponentialRampToValueAtTime(1.0, endTime);

  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.01, endTime);

  osc.connect(gain);
  gain.connect(this._audioContext.destination);
}

var testDuration = 6000;
var testPollRate = 50;
var test = new WebAudioMetronome();

test.options({
  bpm: 138,
  startTick: 0,
  beatPattern: [3, 1, 1, 2, 1, 1],
  beatsPerMeasure: 3,
  ticksPerBeat: 4,
  sound: true
});

var timerId = setInterval(function() {
  console.log(test.synchronize());
  testDuration -= testPollRate;
  if (testDuration <= 0) {
    clearInterval(timerId);
  }
}, testPollRate);