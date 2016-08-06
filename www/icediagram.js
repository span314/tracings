'use strict';
/*!
Ice Diagram Widget v0.1-RC7 | Software Copyright (c) Shawn Pan
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
    root.IceDiagram = factory();
  }
}(this, function () {
  var IceDiagram = function(canvas, options) {
    //store parameters
    this._canvasElement = canvas;
    this._controls = options;
    //create canvas context
    this._canvasContext = canvas.getContext('2d');
    //create audio context, if available
    if (window.AudioContext) {
      this._audioContext = new AudioContext();
    } else if (window.webkitAudioContext) {
      this._audioContext = new webkitAudioContext();
    }
    //initialize
    this._loadDance();
  };

  IceDiagram._BASE_WIDTH = 740;
  IceDiagram._BASE_HEIGHT = 400;
  IceDiagram._TICKS_PER_BEAT = 4;
  IceDiagram._BASE_FONT_SIZE = 10;
  IceDiagram._BASE_LABEL_OFFSET = 8;
  IceDiagram._FONT = IceDiagram._BASE_FONT_SIZE + 'px Arial';
  IceDiagram._COLOR_TRACING = 'rgb(0,0,0)';
  IceDiagram._COLOR_TRACING_ACTIVE = ['rgb(0,180,0)', 'rgb(0,200,0)', 'rgb(0,210,0)', 'rgb(0,220,0)'];
  IceDiagram._COLOR_TRACING_GROUP = 'rgb(0,120,0)';
  IceDiagram._COLOR_TEXT_MAIN = 'rgb(0,0,0)';
  IceDiagram._COLOR_TEXT_LABEL_STEP = 'rgb(0,100,255)';
  IceDiagram._COLOR_TEXT_LABEL_COUNT = 'rgb(255,100,0)';
  IceDiagram._COLOR_RINK = 'rgb(210,210,210)';

  IceDiagram.prototype.controlEvent = function(eventType, value) {
    console.log('control event ' + eventType + ' with value ' + value);
    this._controls[eventType] = value;
    switch (eventType) {
      case 'click':
        this._click();
        break;
      case 'dance':
        this._loadDance();
        break;
      case 'part': case 'optional': case 'mirror': case 'rotate':
        this._loadPattern();
        break;
      case 'step': case 'number': case 'count': case 'hold': case 'speed': case 'resize':
        this._drawPattern();
    }
  };

  IceDiagram.prototype._getDefaultZoom = function() {
    var width = this._canvasElement.width,
        height = this._canvasElement.height,
        isHeightLimited = width * IceDiagram._BASE_HEIGHT > height * IceDiagram._BASE_WIDTH;
    return Math.max(isHeightLimited ? height / IceDiagram._BASE_HEIGHT : width / IceDiagram._BASE_WIDTH, 1);
  };

  IceDiagram.prototype._loadDance = function() {
    var widget = this,
        url = 'patterns/' + this._controls.dance + '.json',
        request = new XMLHttpRequest();
    request.open('GET', url, true);

    request.onload = function() {
      if (request.status >= 200 && request.status < 400) {
        widget._dance = JSON.parse(request.responseText);
        widget._beatPattern = widget._dance.timeSignatureTop % 3 ? [3, 1, 2, 1] : [3, 1, 1, 2, 1, 1];
        console.log(widget._dance);
        widget._loadPattern();
      } else {
        console.log('TODO server error');
      }
    };

    request.onerror = function() {
      console.log('TODO connection error');
    };

    request.send();
  };

  IceDiagram.prototype._loadPattern = function() {
    var lastPosition,
        optionalFlag = this._controls.optional ? 'yes' : 'no',
        mirrorFlag = this._controls.mirror,
        rotateFlag = this._controls.rotate,
        part = this._controls.part;
    console.log('loading pattern ' + this._dance.name + ' part: ' + part + ' optional: ' + optionalFlag + ' mirror: ' + mirrorFlag + ' rotate: ' + rotateFlag);
    this._patternPositions = IceDiagram._generatePositions(this._dance, part, optionalFlag, mirrorFlag, rotateFlag);
    lastPosition = this._patternPositions[this._patternPositions.length - 1];
    this._ticksPerLap = lastPosition.offset + lastPosition.duration;
    this._positionSearchTree = IceDiagram._positionTree(this._patternPositions);
    this.beginning();
  };

  IceDiagram.prototype._getCenter = function() {
    var currentPosition = this._patternPositions[this._position],
        activeCenter = IceDiagram._cubicValueAt(currentPosition.paths[0].cubic, this._stepTickCount / currentPosition.duration),
        w = this._canvasElement.width,
        h = this._canvasElement.height,
        contentHalfWidth = (w < IceDiagram._BASE_WIDTH ? IceDiagram._BASE_WIDTH : w) / 2,
        contentHalfHeight = (h < IceDiagram._BASE_HEIGHT ? IceDiagram._BASE_HEIGHT : h) / 2,
        x = Math.min(Math.max(w - contentHalfWidth, w / 2 - activeCenter[0]), contentHalfWidth),
        y = Math.min(Math.max(h - contentHalfHeight, h / 2 - activeCenter[1]), contentHalfHeight);
    return [x, y];
  }

  IceDiagram.prototype._drawPattern = function() {
    var path, positionIndex, pathIndex, position, labelList, labelText, count,
        showStep = this._controls.step,
        showNumber = this._controls.number,
        showCount = this._controls.count,
        showHold = this._controls.hold,
        zoom = this._getDefaultZoom(),
        center = this._getCenter(),
        ctx = this._canvasContext,
        currentPosition = this._patternPositions[this._position];

    //Note: set background color to white in css
    //otherwise background will be black in IE and Firefox when fullscreen
    ctx.clearRect(0, 0, this._canvasElement.width, this._canvasElement.height);
    ctx.font = IceDiagram._FONT;

    ctx.save(); //scale
    ctx.scale(zoom, zoom);

    ctx.save(); //translate
    ctx.translate(center[0] / zoom, center[1] / zoom);

    //Draw rink
    this._drawRink();

    //Draw pattern
    for (positionIndex = 0; positionIndex < this._patternPositions.length; positionIndex++) {
      position = this._patternPositions[positionIndex];

      if (position.lapIndex !== currentPosition.lapIndex) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = IceDiagram._COLOR_TRACING;
      } else if (position === currentPosition) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = IceDiagram._COLOR_TRACING_ACTIVE[this._currentBeatInfo.strength];
      } else if (position.group && position.group === currentPosition.group) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = IceDiagram._COLOR_TRACING_GROUP;
      } else {
        ctx.lineWidth = 2;
        ctx.strokeStyle = IceDiagram._COLOR_TRACING;
      }

      for (pathIndex = 0; pathIndex < position.paths.length; pathIndex++) {
        path = position.paths[pathIndex];
        ctx.beginPath();
        ctx.moveTo.apply(ctx, path.cubic.slice(0, 2));
        ctx.bezierCurveTo.apply(ctx, path.cubic.slice(2, 8));
        ctx.stroke();
      }

      if (position.paths.length) {
        ctx.textBaseline = 'middle';
        //Draw index and label
        labelList = [];
        if (showNumber && position.index) {
          labelList.push(position.index);
        }
        if (showStep && position.label) {
          labelList.push(position.label);
        }
        labelText = labelList.join(' ');
        if (labelText) {
          ctx.fillStyle = IceDiagram._COLOR_TEXT_LABEL_STEP;
          IceDiagram._drawTextOnPath(ctx, labelText, position.paths[0], IceDiagram._BASE_LABEL_OFFSET);
        }
        //Draw hold and count
        labelList = [];
        if (showHold && position.hold) {
          labelList.push(position.hold);
        }
        count = (typeof position.beats === 'undefined') ? position.count : position.beats;
        if (showCount && count) {
          labelList.push(count);
        }
        labelText = labelList.join(' ');
        if (labelText) {
          ctx.fillStyle = IceDiagram._COLOR_TEXT_LABEL_COUNT;
          IceDiagram._drawTextOnPath(ctx, labelText, position.paths[position.paths.length - 1], -IceDiagram._BASE_LABEL_OFFSET);
        }
      }
    }
    ctx.restore(); //translate

    //Draw text
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(IceDiagram._BASE_LABEL_OFFSET, IceDiagram._BASE_LABEL_OFFSET, ctx.measureText(currentPosition.desc).width, IceDiagram._BASE_FONT_SIZE);
    ctx.fillStyle = IceDiagram._COLOR_TEXT_MAIN;
    ctx.fillText(currentPosition.desc, IceDiagram._BASE_LABEL_OFFSET, IceDiagram._BASE_LABEL_OFFSET);
    ctx.textBaseline = 'bottom';
    labelText = this._controls.speed === 1 ? '' : Math.round(this._controls.speed * this._dance.beatsPerMinute) + 'bpm of ';
    labelText += this._dance.beatsPerMinute + 'bpm';
    ctx.fillText(labelText, IceDiagram._BASE_LABEL_OFFSET, this._canvasElement.height / zoom - IceDiagram._BASE_LABEL_OFFSET);

    ctx.restore(); //scale
  };

  IceDiagram.prototype._drawRink = function() {
    var ctx = this._canvasContext,
        scale = IceDiagram._BASE_HEIGHT * 17 / 600,
        halfWidth = 30.5 * scale,
        halfWidthStraight = 22 * scale,
        halfHeight = 15 * scale,
        halfHeightStraight = 6.5 * scale,
        cornerRadius = 8.5 * scale;

    ctx.save();

    ctx.strokeStyle = IceDiagram._COLOR_RINK;

    ctx.beginPath();
    ctx.moveTo(-halfWidthStraight, -halfHeight);
    ctx.arcTo(halfWidth, -halfHeight, halfWidth, halfHeightStraight, cornerRadius);
    ctx.arcTo(halfWidth, halfHeight, -halfWidthStraight, halfHeight, cornerRadius);
    ctx.arcTo(-halfWidth, halfHeight, -halfWidth, halfHeightStraight, cornerRadius);
    ctx.arcTo(-halfWidth, -halfHeight, -halfWidthStraight, -halfHeight, cornerRadius);
    ctx.moveTo(0, -halfHeight);
    ctx.lineTo(0, halfHeight);
    ctx.moveTo(-halfWidth, 0);
    ctx.lineTo(halfWidth, 0);
    ctx.stroke();

    ctx.restore();
  };

  IceDiagram.prototype.beginning = function() {
    this._movePosition(0);
  };

  IceDiagram.prototype.previous = function() {
    this._movePosition(this._position === 0 ? this._patternPositions.length - 1 : this._position - 1);
  };

  IceDiagram.prototype.next = function() {
    this._movePosition(this._nextIndex());
  };

  IceDiagram.prototype._nextTick = function() {
    var currentPosition = this._patternPositions[this._position];
    this._stepTickCount = (this._currentBeatInfo.ticks - currentPosition.offset) % this._ticksPerLap;
    if (this._stepTickCount >= currentPosition.duration) {
      this._position = this._nextIndex();
      this._stepTickCount = 0;
    }
  };

  IceDiagram.prototype._nextIndex = function() {
    return this._position === this._patternPositions.length - 1 ? 0 : this._position + 1;
  };

  IceDiagram.prototype._movePosition = function(index) {
    this._pause();
    this._position = index;
    this._stepTickCount = 0;
    this._currentBeatInfo = this._beatInfo(this._patternPositions[index].offset);
    this._drawPattern();
  };

  IceDiagram.prototype._start = function() {
    console.log('start');

    this._nextTickTimestamp = 0;
    this._elapsedTicks = this._patternPositions[this._position].offset;
    this._stepTickCount = 0;
    this._nextBeatInfo = this._beatInfo(this._elapsedTicks);

    if (this._audioContext) {
      //Unmute by playing a beat quietly - iOS devices must play directly after a user interaction
      this._scheduleBeatAudio(0.01, this._audioContext.currentTime);
      //Current time does not advance on MS Edge when sound isn't available
      if (this._audioContext.currentTime === 0) {
        this._audioContext = false;
      }
    }

    this._playing = true;
    this._animFrame = window.requestAnimationFrame(this._tick.bind(this));
  };


  IceDiagram.prototype._pause = function() {
    console.log('pause');
    window.cancelAnimationFrame(this._animFrame);
    this._playing = false;
  };

  IceDiagram.prototype.startPause = function() {
    if (this._playing) {
      this._pause();
    } else {
      this._start();
    }
  };

  IceDiagram.prototype._tick = function(rafTimestamp) {
    this._synchronize(rafTimestamp);
    this._drawPattern();
    this._animFrame = window.requestAnimationFrame(this._tick.bind(this));
  };

  IceDiagram.prototype._click = function() {
    var zoom = this._getDefaultZoom(),
        center = this._getCenter(),
        point = [(this._controls.click[0] - center[0]) / zoom, (this._controls.click[1] - center[1]) / zoom],
        nearest = IceDiagram._nearestNeighbor(point, this._positionSearchTree, 16);
    if (nearest >= 0) {
      this._movePosition(this._positionSearchTree[nearest][2]);
    }
  };

  //Schedules audio for beats, returning a object containing tick count, beat number, and beat strength.
  //Takes in a backup ms timestamp such as performance.now(), Date.now(), or requestAnimationFrame timestamp
  //for browsers that do not support web audio API
  IceDiagram.prototype._synchronize = function(backupTimestamp) {
    var currentTime = this._audioContext ? this._audioContext.currentTime : backupTimestamp * 0.001;
    //Initialize timer if necessary
    this._nextTickTimestamp = this._nextTickTimestamp || currentTime;
    //Ideally loop runs once with no lag
    while (currentTime >= this._nextTickTimestamp) {
      this._currentBeatInfo = this._nextBeatInfo;
      this._nextBeatInfo = this._beatInfo(this._elapsedTicks);

      this._nextTick();
      this._nextTickTimestamp +=  60 / (IceDiagram._TICKS_PER_BEAT * this._controls.speed * this._dance.beatsPerMinute);

      if (this._audioContext && this._controls.sound && this._nextBeatInfo.strength) {
        this._scheduleBeatAudio(this._nextBeatInfo.strength / 3, this._nextTickTimestamp);
      }

      this._elapsedTicks++;
    }
  }

  //Construct beat info for given time offset
  IceDiagram.prototype._beatInfo = function(offset) {
    var info = {},
        beatCount = Math.floor(offset / IceDiagram._TICKS_PER_BEAT) % this._beatPattern.length;
    info.ticks = offset;
    info.beat = beatCount % this._dance.timeSignatureTop + 1;
    info.strength = offset % IceDiagram._TICKS_PER_BEAT ? 0 : this._beatPattern[beatCount];
    return info;
  };

  //Schedule audio for a beat - drum-like waveform
  IceDiagram.prototype._scheduleBeatAudio = function(volume, startTime) {
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
  };

  //Static utility functions

  //Draw text next to a cubic path
  IceDiagram._drawTextOnPath = function(ctx, text, path, offset) {
    var x = path.value[0] + path.normal[0] * offset,
        y = path.value[1] + path.normal[1] * offset;
        ctx.textAlign = path.value[0] > x ? 'end' : 'start';
        ctx.fillText(text, x, y);
  };

  //Generate individual positions for a dance
  IceDiagram._generatePositions = function(dance, part, optional, mirror, rotate) {
    var lapIndex, componentIndex, pathIndex, transformMatrix, component, offset, position, cubic, path, positionIndex, beatsLabel,
        positions = [],
        pattern = dance.patterns[part];

    offset = 0;
    for (lapIndex = 0; lapIndex < dance.patternsPerLap; lapIndex++) {
      transformMatrix = IceDiagram._computeTransformMatrix(lapIndex, dance.patternsPerLap, mirror, rotate);
      for (componentIndex = pattern.startComponent; componentIndex < pattern.endComponent; componentIndex++) {
        component = dance.components[componentIndex % dance.components.length];
        if (!component.optional || component.optional === optional) {
          position = {};
          //Copy component properties
          position.duration = component.duration;
          position.hold = component.hold;
          position.index = component.index;
          position.step = component.step;
          position.beats = component.beats;
          position.group = component.group;
          //Generate paths
          position.paths = [];
          for (pathIndex = 0; pathIndex < component.paths.length; pathIndex++) {
            cubic = IceDiagram._transformCoordinates(component.paths[pathIndex], transformMatrix);
            path = IceDiagram._cubicNormalAt(cubic, 0.5);
            path.cubic = cubic;
            position.paths.push(path);
          }
          //Check mirroring
          position.edge = mirror ? IceDiagram._EDGE_PARAMS[component.edge].m : component.edge;
          //Generate text
          position.label = IceDiagram._resolveParams(position.edge, dance.steps[component.step].label);
          position.desc = IceDiagram._resolveParams(position.edge, dance.steps[component.step].desc);
          //Generate count by converting quarter beat duration to mixed number string
          position.count = (position.duration >> 2 || '') + '\xBC\xBD\xBE'.charAt((position.duration + 3) % 4);
          //Add lap index and offset
          position.lapIndex = lapIndex;
          position.offset = offset;
          offset += component.duration;
          positions.push(position);
        }
      }
    }

    //Iterate backwards through steps to generate beat labels, taking into account combination steps
    beatsLabel = '';
    for (positionIndex = positions.length - 1; positionIndex >= 0; positionIndex--) {
      position = positions[positionIndex];
      if (position.step.charAt(0) === '_') {
        position.beats = '';
        beatsLabel = '+' + position.count + beatsLabel;
      } else if (beatsLabel) {
        position.beats = position.count + beatsLabel;
        beatsLabel = '';
      }
    }

    return positions;
  };

  IceDiagram._computeTransformMatrix = function(index, patternsPerLap, mirror, rotate) {
    var rotateOffset = rotate ? Math.PI : 0,
        theta = 2 * Math.PI * index / patternsPerLap + rotateOffset,
        flipX = mirror ? -1 : 1,
        sinTheta = Math.sin(theta),
        cosTheta = Math.cos(theta);
    return [flipX * cosTheta, -sinTheta, flipX * sinTheta, cosTheta];
  };


  IceDiagram._transformCoordinates = function(coordinates, matrix) {
    var i, x, y,
        result = [];
    for (i = 0; i < coordinates.length; i+=2) {
      x = coordinates[i];
      y = coordinates[i+1];
      result.push(x * matrix[0] + y * matrix[1]);
      result.push(x * matrix[2] + y * matrix[3]);
    }
    return result;
  };

  //Calculate value of a cubic for parameter t
  IceDiagram._cubicValueAt = function(c, t) {
    var ti = 1 -t,
        w1 = ti * ti * ti,
        w2 = 3 * ti * ti * t,
        w3 = 3 * ti * t * t,
        w4 = t * t * t,
        x = w1 * c[0] + w2 * c[2] + w3 * c[4] + w4 * c[6],
        y = w1 * c[1] + w2 * c[3] + w3 * c[5] + w4 * c[7];
    return [x, y];
  }
  //Calculate normal vector of a cubic for parameter t
  IceDiagram._cubicNormalAt = function(cubic, t) {
    var dx = IceDiagram._cubicDerivatives(cubic[0], cubic[2], cubic[4], cubic[6], t),
        dy = IceDiagram._cubicDerivatives(cubic[1], cubic[3], cubic[5], cubic[7], t),
        //Calcuate normal vector by rotating first derivative by 90 degrees and normalize to unit length
        length1d = Math.sqrt(dx[1] * dx[1] + dy[1] * dy[1]),
        normX = -dy[1] / length1d,
        normY = dx[1] / length1d;
        //Point normal vector outward
        if (normX * dx[2] + normY * dy[2] > 0) {
          normX *= -1;
          normY *= -1;
        }
    return {
      value: [dx[0], dy[0]],
      normal: [normX, normY]
    }
  };
  //Calculate array of value, first derivative, and second derivative
  IceDiagram._cubicDerivatives = function(p0, p1, p2, p3, t) {
    var ti = 1 - t;
    return [ti * ti * ti * p0 + 3 * ti * ti * t * p1 + 3 * ti * t * t * p2 + t * t * t * p3,
            3 * ti * ti * (p1 - p0) + 6 * ti * t * (p2 - p1) + 3 * t * t * (p3 - p2),
            6 * ti * (p2 - 2 * p1 + p0) + 6 * t * (p3 - 2 * p2 + p1)];
  };

  /**
    Hashmap of all the edges to the corresponding edge parameters.

    The following codes consisting of a # and a character represent parameterized edge features in text.
    A lower case character (e.g. #e) represent the short text version (e.g. RFO) and an upper case
    character (e.g. #E) represents a long text version (e.g. Right Forward Outside). Examples are given
    in paratheses for the edge code RFO.

    #e  edge (RFO, Right Forward Outside)
    #m  mirrored edge (LFO, Left Forward Outside)
    #f  skating foot (R, Right)
    #r  free foot (L, Left)
    #d  direction (F, Forward)
    #b  opposite direction (B, Backward)
    #q  quality (O, Outside)
    #o  opposite quality (I, Inside)
    ##  escaped # character (#)
  */
  IceDiagram._EDGE_PARAMS = {
    'LB': {'#': '#', f: 'L', r: 'R', F: 'Left', R: 'Right', d: 'B', b: 'F', D: 'Backward', B: 'Forward', e: 'LB', E: 'Left Backward', m: 'RB', M: 'Right Backward'},
    'LBI': {'#': '#', f: 'L', r: 'R', F: 'Left', R: 'Right', d: 'B', b: 'F', D: 'Backward', B: 'Forward', q: 'I', o: 'O', Q: 'Inside', O: 'Outside', e: 'LBI', E: 'Left Backward Inside', m: 'RBI', M: 'Right Backward Inside'},
    'LBO': {'#': '#', f: 'L', r: 'R', F: 'Left', R: 'Right', d: 'B', b: 'F', D: 'Backward', B: 'Forward', q: 'O', o: 'I', Q: 'Outside', O: 'Inside', e: 'LBO', E: 'Left Backward Outside', m: 'RBO', M: 'Right Backward Outside'},
    'LF': {'#': '#', f: 'L', r: 'R', F: 'Left', R: 'Right', d: 'F', b: 'B', D: 'Forward', B: 'Backward', e: 'LF', E: 'Left Forward', m: 'RF', M: 'Right Forward'},
    'LFI': {'#': '#', f: 'L', r: 'R', F: 'Left', R: 'Right', d: 'F', b: 'B', D: 'Forward', B: 'Backward', q: 'I', o: 'O', Q: 'Inside', O: 'Outside', e: 'LFI', E: 'Left Forward Inside', m: 'RFI', M: 'Right Forward Inside'},
    'LFO': {'#': '#', f: 'L', r: 'R', F: 'Left', R: 'Right', d: 'F', b: 'B', D: 'Forward', B: 'Backward', q: 'O', o: 'I', Q: 'Outside', O: 'Inside', e: 'LFO', E: 'Left Forward Outside', m: 'RFO', M: 'Right Forward Outside'},
    'RB': {'#': '#', f: 'R', r: 'L', F: 'Right', R: 'Left', d: 'B', b: 'F', D: 'Backward', B: 'Forward', e: 'RB', E: 'Right Backward', m: 'LB', M: 'Left Backward'},
    'RBI': {'#': '#', f: 'R', r: 'L', F: 'Right', R: 'Left', d: 'B', b: 'F', D: 'Backward', B: 'Forward', q: 'I', o: 'O', Q: 'Inside', O: 'Outside', e: 'RBI', E: 'Right Backward Inside', m: 'LBI', M: 'Left Backward Inside'},
    'RBO': {'#': '#', f: 'R', r: 'L', F: 'Right', R: 'Left', d: 'B', b: 'F', D: 'Backward', B: 'Forward', q: 'O', o: 'I', Q: 'Outside', O: 'Inside', e: 'RBO', E: 'Right Backward Outside', m: 'LBO', M: 'Left Backward Outside'},
    'RF': {'#': '#', f: 'R', r: 'L', F: 'Right', R: 'Left', d: 'F', b: 'B', D: 'Forward', B: 'Backward', e: 'RF', E: 'Right Forward', m: 'LF', M: 'Left Forward'},
    'RFI': {'#': '#', f: 'R', r: 'L', F: 'Right', R: 'Left', d: 'F', b: 'B', D: 'Forward', B: 'Backward', q: 'I', o: 'O', Q: 'Inside', O: 'Outside', e: 'RFI', E: 'Right Forward Inside', m: 'LFI', M: 'Left Forward Inside'},
    'RFO': {'#': '#', f: 'R', r: 'L', F: 'Right', R: 'Left', d: 'F', b: 'B', D: 'Forward', B: 'Backward', q: 'O', o: 'I', Q: 'Outside', O: 'Inside', e: 'RFO', E: 'Right Forward Outside', m: 'LFO', M: 'Left Forward Outside'}
  };
  //Resolve edge parameters in text. All text should use edge parameters where appropriate to support features such as mirroring.
  IceDiagram._resolveParams = function(edgeCode, label) {
    var i, curChar,
        inParam = false,
        result = '',
        edgeParams = IceDiagram._EDGE_PARAMS[edgeCode];
        for (i = 0; i < label.length; i++) {
          curChar = label.charAt(i);
          if (inParam) {
            result += edgeParams[curChar];
            inParam = false;
          } else if (curChar === '#') {
            inParam = true;
          } else {
            result += curChar;
          }
        }
    return result;
  };

  //Creates a kd search tree of the paths in the list of positions
  //Creates a point per tick including both end points--roughly
  //means that longer steps have more guide points
  IceDiagram._positionTree = function(positions) {
    var posIndex, position, pathIndex, cubic, point, t,
        points = [];
    for (posIndex = 0; posIndex < positions.length; posIndex++) {
      position = positions[posIndex];
      for (pathIndex = 0; pathIndex < position.paths.length; pathIndex++) {
        cubic = position.paths[pathIndex].cubic;
        for (t = 0; t <= position.duration; t++) {
          point = IceDiagram._cubicValueAt(cubic, t / position.duration);
          point.push(posIndex);
          points.push(point);
        }
      }
    }
    IceDiagram._kdTree(points);
    return points;
  };
  //Creates a 2D tree in-place for an array of points
  IceDiagram._kdTree = function(points) {
    IceDiagram._kdTreeHelper(points, 0, points.length, 0);
  };
  //Recursive helper function for segment of points array between start inclusive and end exclusive and diminsion k=0 or k=1
  IceDiagram._kdTreeHelper = function(points, start, end, k) {
    var mid, kNext;
    if (end - start <= 1) {
      return;
    }
    mid = (start + end) >> 1;
    kNext = (k + 1) % 2;
    IceDiagram._kdQuickSelect(points, start, end, mid, k);
    IceDiagram._kdTreeHelper(points, start, mid, kNext);
    IceDiagram._kdTreeHelper(points, mid + 1, end, kNext);
  };
  //In-place quick select for segment of points array between start inclusive and end exclusive and diminsion k=0 or k=1.
  //The point at index n will be in the correct position afterwards
  IceDiagram._kdQuickSelect = function(points, start, end, n, k) {
    var pivot, pivotIndex, i, swap, partition;
    while (end - start > 1) {
      partition = start;
      //Pick random pivot. Remove by replacing with last element. Working array size shrinks by 1.
      pivotIndex = Math.floor(Math.random() * (end - start) + start);
      pivot = points[pivotIndex];
      points[pivotIndex] = points[end - 1];
      for (i = start; i < end - 1; i++) {
        //Swap lesser elements towards front
        if (points[i][k] < pivot[k]) {
          swap = points[i]
          points[i] = points[partition]
          points[partition] = swap
          partition++;
        }
      }
      //Restore pivot. Working array size grows by 1 back to original size.
      points[end - 1] = points[partition]
      points[partition] = pivot;
      //Continue on with approriate half
      if (partition < n) {
        start = partition + 1;
      } else if (partition > n) {
        end = partition;
      } else {
        break;
      }
    }
  };

  //Find the nearest neighbor to a point given a kd search tree and a maximum allowed distance
  //Returns index into search tree of nearest point or -1 if no point within max distance
  IceDiagram._nearestNeighbor = function(point, kdTree, maxDist) {
    return IceDiagram._nearestNeighborHelper(point, kdTree, 0, kdTree.length, 0, {index: -1, score: maxDist * maxDist}).index;
  };
  //Recursive helper function
  IceDiagram._nearestNeighborHelper = function(point, kdTree, start, end, k, best) {
    var childMatchStart, childMatchEnd, childOtherStart, childOtherEnd, mid, kNext, kDist, kNextDist, dist2;
    //Base case
    if (start >= end) {
      return best;
    }
    mid = (start + end) >> 1;
    kNext = (k + 1) % 2;
    kDist = point[k] - kdTree[mid][k];
    kNextDist = point[kNext] - kdTree[mid][kNext];
    dist2 = kDist * kDist + kNextDist * kNextDist;
    //Check current node
    if (dist2 < best.score) {
      best = {index: mid, score: dist2};
    }
    //Find the child tree containing the candidate point and the one not containing the point
    if (kDist < 0) {
      childMatchStart = start;
      childMatchEnd = mid;
      childOtherStart = mid + 1;
      childOtherEnd = end;
    } else {
      childOtherStart = start;
      childOtherEnd = mid;
      childMatchStart = mid + 1;
      childMatchEnd = end;
    }
    //Recursively check matching side
    best = IceDiagram._nearestNeighborHelper(point, kdTree, childMatchStart, childMatchEnd, kNext, best);
    //Recursively check other side only if point is near the pivot, otherwise branch can be pruned
    if (kDist * kDist < best.score) {
      best = IceDiagram._nearestNeighborHelper(point, kdTree, childOtherStart, childOtherEnd, kNext, best);
    }
    return best;
  };

  //Return UMD factory result
  return IceDiagram;
}));