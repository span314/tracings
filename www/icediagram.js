'use strict';
/*!
Ice Diagram Widget v0.1-RC5 | Software Copyright (c) Shawn Pan
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
  var IceDiagram = function(canvas) {
    //store parameters
    this._canvasElement = canvas;
    //check canvas compatibility
    if (!canvas.getContext) {
      console.log('Canvas not supported');
      return;
    }
    this._canvasContext = canvas.getContext('2d');

    //initialize
    this._controls = {};
    this._playbackSpeedPercentage = 100;
    this._active = false;
  };

  IceDiagram.prototype.activate = function() {
    this._active = true;
    this._resize();
    this.loadDance();
  };

  IceDiagram.prototype.controlEvent = function(eventType, value) {
    console.log('control event ' + eventType + ' with value ' + value);
    this._controls[eventType] = value;
    if (!this._active) {
      return;
    }
    switch (eventType) {
      case 'beginning':
        this._beginning();
        break;
      case 'next':
        this._next();
        break;
      case 'previous':
        this._previous();
        break;
      case 'startPause':
        this._startPause();
        break;
      case 'click':
        this._click();
        break;
      case 'resize':
        this._resize();
        this._loadPattern();
        break;
      case 'dance':
        this.loadDance();
        break;
      case 'part': case 'optional': case 'mirror': case 'rotate':
        this._loadPattern();
        break;
      case 'speed':
        this._adjustSpeed();
        break;
      case 'step': case 'number': case 'count': case 'hold':
        this._drawPattern();
    }
  };

  IceDiagram.prototype._resize = function() {
    this._centerX = this._canvasElement.width / 2;
    this._centerY = this._canvasElement.height / 2;
    this._scaleFactor = 0.92 * this._canvasElement.width / 1024;
    this._labelFont =  Math.floor(13 * this._scaleFactor) + 'px Arial';
    this._titleFont = Math.floor(18 * this._scaleFactor) + 'px Arial';
    this._labelOffset = 13 * this._scaleFactor;
  };

  IceDiagram.prototype.loadDance = function() {
    var widget = this,
        url = 'patterns/' + this._controls.dance + '.json',
        request = new XMLHttpRequest();
    request.open('GET', url, true);

    request.onload = function() {
      if (request.status >= 200 && request.status < 400) {
        widget._dance = JSON.parse(request.responseText);
        console.log(widget._dance);
        widget._computePlaybackInterval();
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
    var optionalFlag = this._controls.optional,
        mirrorFlag = this._controls.mirror,
        rotateFlag = this._controls.rotate,
        part = this._controls.part;
    console.log('loading pattern ' + this._dance.name + ' part: ' + part + ' optional: ' + optionalFlag + ' mirror: ' + mirrorFlag + ' rotate: ' + rotateFlag);
    this._patternPositions = IceDiagram.generatePositions(this._dance, part, optionalFlag, mirrorFlag, rotateFlag, this._scaleFactor);
    this._positionSearchTree = IceDiagram.positionTree(this._patternPositions);
    this._beginning();
  };

  IceDiagram.prototype._drawPattern = function() {
    var path, positionIndex, pathIndex, position, labelList, labelText, count,
        showStep = this._controls.step,
        showNumber = this._controls.number,
        showCount = this._controls.count,
        showHold = this._controls.hold,
        ctx = this._canvasContext,
        currentPosition = this._patternPositions[this._position],
        tickCount = currentPosition.offset + this._stepTickCount,
        fracBeat = tickCount % 4,
        beat = (tickCount >> 2) % this._dance.timeSignatureTop + 1;

    ctx.clearRect(0, 0, this._canvasElement.width, this._canvasElement.height);

    //Draw text
    ctx.font = this._titleFont;
    ctx.textBaseline = 'top';
    ctx.fillText(currentPosition.desc, this._labelOffset, this._labelOffset);

    ctx.font = this._labelFont;
    ctx.textBaseline = 'bottom'
    ctx.fillText(this._playbackSpeedText, this._labelOffset, this._canvasElement.height - this._labelOffset);

    ctx.save();
    ctx.translate(this._centerX, this._centerY);

    //Draw rink
    this._drawRink();

    //Draw pattern
    for (positionIndex = 0; positionIndex < this._patternPositions.length; positionIndex++) {
      position = this._patternPositions[positionIndex];

      ctx.save();
      if (position.lapIndex !== currentPosition.lapIndex) {
        ctx.lineWidth = 1;
      } else if (position === currentPosition) {
        ctx.lineWidth = 3;
        if (beat === 1 && fracBeat === 0) {
          ctx.strokeStyle = 'rgb(0,220,0)';
        } else if (fracBeat === 0) {
          ctx.strokeStyle = 'rgb(0,200,0)';
        } else {
          ctx.strokeStyle = 'rgb(0,180,0)';
        }
      } else if (position.group && position.group === currentPosition.group) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgb(0,120,0)';
      } else {
        ctx.lineWidth = 2;
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
          ctx.fillStyle = 'rgb(0,100,255)';
          IceDiagram.drawTextOnPath(ctx, labelText, position.paths[0], this._labelOffset);
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
          ctx.fillStyle = 'rgb(255,100,0)';
          IceDiagram.drawTextOnPath(ctx, labelText, position.paths[position.paths.length - 1], -this._labelOffset);
        }
      }
      ctx.restore();
    }
    ctx.restore();
  };

  IceDiagram.prototype._drawRink = function() {
    var ctx = this._canvasContext,
        scale = this._scaleFactor * 512 / 30,
        halfWidth = 30.5 * scale,
        halfWidthStraight = 22 * scale,
        halfHeight = 15 * scale,
        halfHeightStraight = 6.5 * scale,
        cornerRadius = 8.5 * scale;

    ctx.save();

    ctx.strokeStyle = 'rgb(210,210,210)';

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

  IceDiagram.prototype._beginning = function() {
    this._pause();
    this._position = 0;
    this._stepTickCount = 0;
    this._drawPattern();
  };

  IceDiagram.prototype._previous = function() {
    this._pause();
    this._shiftPosition(-1);
    this._drawPattern();
  };

  IceDiagram.prototype._next = function() {
    this._pause();
    this._shiftPosition(1);
    this._drawPattern();
  };

  IceDiagram.prototype._shiftPosition = function(amount) {
    this._position = (this._position + this._patternPositions.length + amount) % this._patternPositions.length;
    this._stepTickCount = 0;
  };

  IceDiagram.prototype._movePosition = function(index) {
    this._pause();
    this._position = index;
    this._stepTickCount = 0;
    this._drawPattern();
  };

  IceDiagram.prototype._adjustSpeed = function() {
    console.log('adjust speed');
    this._playbackSpeedPercentage = this._controls.speed;
    this._computePlaybackInterval();
    //Restart play if necessary
    if (this._playing) {
      clearInterval(this._timer);
      this._timer = setInterval(this._tick.bind(this), this._playbackInterval);
    } else {
      this._drawPattern();
    }
  };

  IceDiagram.prototype._computePlaybackInterval = function() {
    var percentBeatsPerMinute = this._playbackSpeedPercentage * this._dance.beatsPerMinute;
    //(60000 ms/min * 100%) / (4 ticks/beat)
    this._playbackInterval = 1500000 / percentBeatsPerMinute;
    if (this._playbackSpeedPercentage === 100) {
      this._playbackSpeedText = this._dance.beatsPerMinute + 'bpm'
    } else {
      this._playbackSpeedText = this._playbackSpeedPercentage + '% speed (' + Math.round(percentBeatsPerMinute / 100) + 'bpm of ' + this._dance.beatsPerMinute + 'bpm)';
    }
  };

  IceDiagram.prototype._start = function() {
    console.log('start');
    this._playing = true;
    this._timer = setInterval(this._tick.bind(this), this._playbackInterval);
  };


  IceDiagram.prototype._pause = function() {
    console.log('pause');
    clearInterval(this._timer);
    this._playing = false;
  };

  IceDiagram.prototype._startPause = function() {
    if (this._playing) {
      this._pause();
    } else {
      this._start();
    }
  };

  IceDiagram.prototype._tick = function() {
    this._stepTickCount++;
    if (this._stepTickCount >= this._patternPositions[this._position].duration) {
      this._shiftPosition(1);
    }
    this._drawPattern();
  };

  IceDiagram.prototype._click = function() {
    var point = [this._controls.click[0] - this._centerX, this._controls.click[1] - this._centerY],
        nearest = IceDiagram.nearestNeighbor(point, this._positionSearchTree, 32 * this._scaleFactor);
    if (nearest >= 0) {
      this._movePosition(this._positionSearchTree[nearest][2]);
    }
  };

  //Static utility functions

  //Draw text next to a cubic path
  IceDiagram.drawTextOnPath = function(ctx, text, path, offset) {
    var x = path.value[0] + path.normal[0] * offset,
        y = path.value[1] + path.normal[1] * offset;
        ctx.textAlign = path.value[0] > x ? 'end' : 'start';
        ctx.fillText(text, x, y);
  };

  //Generate individual positions for a dance
  IceDiagram.generatePositions = function(dance, part, optional, mirror, rotate, scaleFactor) {
    var lapIndex, componentIndex, pathIndex, transformMatrix, component, offset, position, cubic, path, positionIndex, beatsLabel,
        positions = [],
        pattern = dance.patterns[part];

    offset = 0;
    for (lapIndex = 0; lapIndex < dance.patternsPerLap; lapIndex++) {
      transformMatrix = IceDiagram._computeTransformMatrix(lapIndex, dance.patternsPerLap, scaleFactor, mirror, rotate);
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

  IceDiagram._computeTransformMatrix = function(index, patternsPerLap, scaleFactor, mirror, rotate) {
    var rotateOffset = rotate ? Math.PI : 0,
        theta = 2 * Math.PI * index / patternsPerLap + rotateOffset,
        flipX = mirror ? -1 : 1,
        sinTheta = Math.sin(theta) * scaleFactor,
        cosTheta = Math.cos(theta) * scaleFactor;
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
  IceDiagram.positionTree = function(positions) {
    var posIndex, paths, pathIndex,
        points = [];
    for (posIndex = 0; posIndex < positions.length; posIndex++) {
      paths = positions[posIndex].paths;
      for (pathIndex = 0; pathIndex < paths.length; pathIndex++) {
        var i, x, y,
            c = paths[pathIndex].cubic,
            cf = IceDiagram._CUBIC_COEFFS_8;
        for (i = 0; i < cf.length; i = i + 4) {
          x = c[0] * cf[i] + c[2] * cf[i+1] + c[4] * cf[i+2] + c[6] * cf[i+3];
          y = c[1] * cf[i] + c[3] * cf[i+1] + c[5] * cf[i+2] + c[7] * cf[i+3];
          points.push([x, y, posIndex]);
        }
      }
    }
    IceDiagram._kdTree(points);
    return points;
  };
  //Cubic bezier coefficients for t=0 to t=8 in 1/8 increments
  IceDiagram._CUBIC_COEFFS_8 = function() {
    var i, t, ti,
        coeffs = [];
    for (i = 0; i <= 8; i++) {
      t = i / 8;
      ti = 1 - t;
      coeffs.push(ti * ti * ti);
      coeffs.push(3 * ti * ti * t);
      coeffs.push(3 * ti * t * t);
      coeffs.push(t * t * t);
    }
    return coeffs;
  }();
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
  IceDiagram.nearestNeighbor = function(point, kdTree, maxDist) {
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