/*!
Load widgets and bind events v0.3.0 | Software Copyright (c) Shawn Pan
*/
document.addEventListener('DOMContentLoaded', function() {
  'use strict';
  var canvasEl = document.getElementById('diagram'),
      controlsEl = document.getElementById('controls'),
      danceSelectEl = document.getElementById('danceSelect'),
      errorBarEl = document.getElementById('errorBar'),
      fullscreenButtonEl = document.getElementById('fullscreenButton'),
      infoModalEl = document.getElementById('infoModal'),
      audioCompatible = window.AudioContext || window.webkitAudioContext, //http://caniuse.com/#feat=audio-api
      compatiblityErrors = [],
      touchStart = [0, 0],
      pinchStart = 1.0,
      diagram, resizeWindow, createNavigationButton, createStateButton, createToggleButton, mc;

  //Check compatibility
  if (!canvasEl.getContext) {
    compatiblityErrors.push('canvas'); //http://caniuse.com/#feat=canvas
  }
  if (!canvasEl.dataset) {
    compatiblityErrors.push('dataset'); //http://caniuse.com/#feat=dataset
  }
  if (!window.requestAnimationFrame) {
    compatiblityErrors.push('requestAnimationFrame'); //http://caniuse.com/#feat=requestanimationframe
  }
  if (!window.history) {
    compatiblityErrors.push('history'); //http://caniuse.com/#feat=history
  }
  if (compatiblityErrors.length) {
    errorBarEl.innerHTML += " Your browser does not support the following HTML5 features: " + compatiblityErrors.join(", ");
    return;
  } else {
    errorBarEl.style.display = 'none';
  }

  if (!audioCompatible) {
    document.getElementById('soundButton').style.display = 'none';
  }

  //Initialize select and url hash to match
  if (window.location.hash) {
    //Try dance from URL first
    danceSelectEl.value = window.location.hash.substr(1);
  } else {
    //Otherwise push default to URL
    window.history.pushState(null, null, '#' + danceSelectEl.value);
  }

  resizeWindow = function() {
    //TODO figure out why width needs to be set twice on orientation change for Android
    canvasEl.width = controlsEl.getBoundingClientRect().width;
    canvasEl.height = window.innerHeight - controlsEl.getBoundingClientRect().height - 16;
    if (document.fullscreenElement) {
      canvasEl.width = window.screen.width;
      fullscreenButtonEl.className = 'exit';
      fullscreenButtonEl.dataset.active = true;
    } else {
      canvasEl.width = controlsEl.getBoundingClientRect().width;
      fullscreenButtonEl.className = 'enter';
      fullscreenButtonEl.dataset.active = false;
    }
    if (diagram) {
      diagram.controlEvent('resize');
    }
  };

  //Initialize window size
  resizeWindow();

  //Initialize diagram
  diagram = new IceDiagram(canvasEl, {
    step: true,
    number: false,
    count: true,
    hold: false,
    optional: true,
    mirror: false,
    rotate: false,
    part: 'lady',
    speed: 1,
    sound: false,
    dance: danceSelectEl.value || window.location.hash.substr(1)
  });

  //Bind events
  window.addEventListener('resize', resizeWindow);
  document.addEventListener('fullscreenchange', resizeWindow);

  danceSelectEl.addEventListener('change', function() {
    var dance = danceSelectEl.value;
    diagram.controlEvent('dance', danceSelectEl.value);
    if (window.location.hash.substr(1) !== dance) {
      window.history.pushState(null, null, '#' + dance);
    }
  });

  window.addEventListener('popstate', function() {
    var dance;
    if (window.location.hash) {
      dance = window.location.hash.substr(1);
      danceSelectEl.value = dance;
      diagram.controlEvent('dance', dance);
    }
  });

  //Bind touch and mouse events with hammer.js library
  mc = new Hammer.Manager(canvasEl);

  //Panning
  mc.add(new Hammer.Pan({
    direction: Hammer.DIRECTION_ALL,
    threshold: 3
  }));
  mc.on('panstart', function(e) {
    touchStart = [0, 0];
  });
  mc.on('pan', function(e) {
    var touchEnd = [e.deltaX, e.deltaY],
        dx = touchEnd[0] - touchStart[0],
        dy = touchEnd[1] - touchStart[1];
    touchStart = touchEnd;
    diagram.controlEvent('shift', [dx, dy]);
  });

  //Tapping
  mc.add(new Hammer.Tap());
  mc.on('tap', function(e) {
    diagram.controlEvent('click', [e.center.x, e.center.y]);
  });

  //Pinching
  mc.add(new Hammer.Pinch());
  mc.on('pinchstart', function(e) {
    pinchStart = 1.0;
  });
  mc.on('pinch', function(e) {
    diagram.controlEvent('zoom', e.scale / pinchStart);
    pinchStart = e.scale;
  });

  // //Rotating

  // var rotateStart, rotateEnd;

  // var rotate = new Hammer.Rotate({
  //   threshold: 150
  // });
  // mc.add(rotate);
  // pinch.recognizeWith(rotate);
  // mc.on('rotatestart', function(e) {
  //   rotateStart = e.rotation;
  // });

  // mc.on('rotateend', function(e) {
  //   var rotateDiff = (e.rotation - rotateStart + 360) % 360;
  //   console.log("rotate");
  //   console.log(rotateDiff);
  //   console.log("zoom");
  //   console.log(e.scale);
  //   diagram.controlEvent('zoom', e.scale);
  //   console.log("event");
  //   console.log(e);
  // });

  //Bind navigation control buttons
  createNavigationButton = function(command) {
    var elem = document.getElementById(command + 'Button');
    elem.addEventListener('click', function() {
      diagram.controlEvent(command);
    });
  };

  createNavigationButton('beginning');
  createNavigationButton('previous');
  createNavigationButton('next');
  createNavigationButton('startPause');

  //Bind option buttons
  createToggleButton = function(command) {
    var elem = document.getElementById(command + 'Button');
    elem.addEventListener('click', function() {
      var newState = elem.dataset.active !== 'true';
      elem.dataset.active = newState;
      diagram.controlEvent(command, newState);
    });
  };

  createToggleButton('optional');
  createToggleButton('mirror');
  createToggleButton('rotate');

  createToggleButton('step');
  createToggleButton('number');
  createToggleButton('count');
  createToggleButton('hold');

  createStateButton = function(property, states) {
    var stateIndex = 0,
        elem = document.getElementById(property + 'Button');
    elem.addEventListener('click', function() {
      var state;
      stateIndex = (stateIndex + 1) % states.length;
      state = states[stateIndex];
      elem.dataset.active = state.active;
      elem.className = state.icon;
      diagram.controlEvent(property, state.value);
    });
  };

  createStateButton('part', [{active: false, value: 'lady', icon: 'female'}, {active: false, value: 'man', icon: 'male'}]);
  createStateButton('speed', [{active: false, value: 1, icon: 'speed100'}, {active: true, value: 0.75, icon: 'speed75'}, {active: true, value: 0.50, icon: 'speed50'}]);
  createStateButton('sound', [{active: false, value: false, icon: 'off'}, {active: true, value: true, icon: 'on'}]);

  fullscreenButtonEl.addEventListener('click', function() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.getElementById('diagramContainer').requestFullscreen();
    }
  });

  //Info popup button
  //Explicitly setting display to block and none as a fallback to opacity css transition
  document.getElementById('infoButton').addEventListener('click', function() {
    infoModalEl.style.display = 'block';
    window.setTimeout(function() {
      infoModalEl.className = 'open';
    }, 300);
  });

  document.getElementById('infoCloseButton').addEventListener('click', function() {
    infoModalEl.className = '';
    window.setTimeout(function() {
      infoModalEl.style.display = 'none';
    }, 300);
  });
});