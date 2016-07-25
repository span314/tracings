"use strict";
/*!
Metronome Widget v0.1-RC6 | Software Copyright (c) Shawn Pan
*/
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(factory);
  } else if (typeof exports === 'object') {
    // Node, CommonJS-like
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.WebAudioMetronome = factory();
  }
}(this, function () {
  var WebAudioMetronome = function() {
    //Create audio context
    if (AudioContext) {
      this._audioContext = new AudioContext();
    } else if (webkitAudioContext) {
      this._audioContext = new webkitAudioContext();
    }
  }

  //Sample Options
  // {
  //   beatsPerMinute: 138,
  //   startTick: 0,
  //   beatPattern: [3, 1, 1, 2, 1, 1],
  //   beatsPerMeasure: 3,
  //   ticksPerBeat: 4,
  //   sound: true
  // }
  WebAudioMetronome.prototype.options = function(options) {
    this._options = options;
    //Unmute by playing a beat quietly - iOS devices must play directly after a user interaction
    if (this._options.sound && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
      this._scheduleBeatAudio(0.01, this._audioContext.currentTime);
    }
  }

  WebAudioMetronome.prototype.supportsAudio = function() {
    return !!this._audioContext;
  }

  WebAudioMetronome.prototype.reset = function() {
    this._active = false;
  }

  //Schedules audio for beats, returning a object containing tick count, beat number, and beat strength.
  //Takes in a backup ms timestamp such as performance.now(), Date.now(), or requestAnimationFrame timestamp
  //for browsers that do not support web audio API
  WebAudioMetronome.prototype.synchronize = function(backupTimestamp) {
    var beatCount, beatStrength,
        currentTime = this._audioContext ? this._audioContext.currentTime : backupTimestamp * 0.001;
    //Initialize timer if necessary
    if (!this._active) {
      this._nextTickTimestamp = currentTime;
      this._elapsedTicks = this._options.startTick - 1; //Leave one tick buffer to schedule first beat
      this._currentBeatInfo = {};
      this._nextBeatInfo = {};
      this._active = true;
    }

    //Ideally loop runs once with no lag
    while (currentTime >= this._nextTickTimestamp) {
      this._elapsedTicks++;
      this._nextTickTimestamp +=  60 / (this._options.ticksPerBeat * this._options.beatsPerMinute);

      beatCount = Math.floor(this._elapsedTicks / this._options.ticksPerBeat) % this._options.beatPattern.length;
      beatStrength = this._elapsedTicks % this._options.ticksPerBeat ? 0 : this._options.beatPattern[beatCount];

      this._currentBeatInfo = this._nextBeatInfo;
      this._nextBeatInfo = {
        ticks: this._elapsedTicks,
        beat: beatCount % this._options.beatsPerMeasure + 1,
        strength: beatStrength
      };

      if (this._options.sound && beatStrength) {
        this._scheduleBeatAudio(beatStrength / 3, this._nextTickTimestamp);
      }
    }

    return this._currentBeatInfo;
  }

  WebAudioMetronome.prototype._scheduleBeatAudio = function(volume, startTime) {
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

  //Return UMD factory result
  return WebAudioMetronome;
}));