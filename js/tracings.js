/*!
Load widgets and bind events v0.2.0 | Software Copyright (c) Shawn Pan
*/
document.addEventListener('DOMContentLoaded', function() {
  'use strict';
  var canvasEl = document.getElementById('diagram'),
      controlsEl = document.getElementById('controls'),
      danceSelectEl = document.getElementById('danceSelect'),
      errorBarEl = document.getElementById('errorBar'),
      fullscreenButtonEl = document.getElementById('fullscreenButton'),
      audioCompatible = window.AudioContext || window.webkitAudioContext, //http://caniuse.com/#feat=audio-api
      compatiblityErrors = [],
      diagram, touchStart, getCoordinates, resizeWindow, createNavigationButton, createStateButton, createToggleButton;

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
    dance: danceSelectEl.value
  });

  //Bind events
  window.addEventListener('resize', resizeWindow);
  document.addEventListener('fullscreenchange', resizeWindow);

  danceSelectEl.addEventListener('change', function() {
    var danceHash = '#' + danceSelectEl.value;
    diagram.controlEvent('dance', danceSelectEl.value);
    if (window.location.hash !== danceHash) {
      window.history.pushState(null, null, danceHash);
    }
  });

  window.addEventListener('popstate', function() {
    if (window.location.hash) {
      danceSelectEl.value = window.location.hash.substr(1);
      diagram.controlEvent('dance', danceSelectEl.value);
    }
  });

  //Bind touch and mouse events
  getCoordinates = function(e) {
    //Note: calcuating offsets from page, because Firefox does not have offsetX/offsetY in mouse events
    var bounds = canvasEl.getBoundingClientRect(),
        x = e.pageX - bounds.left - document.body.scrollLeft,
        y = e.pageY - bounds.top - document.body.scrollTop;
    return [x, y];
  };

  canvasEl.addEventListener('click', function(e) {
    diagram.controlEvent('click', getCoordinates(e));
  });

  canvasEl.addEventListener('touchstart', function(e) {
    touchStart = getCoordinates(e.touches[0]);
  });

  canvasEl.addEventListener('touchmove', function(e) {
    var touchEnd = getCoordinates(e.touches[0]),
        dx = touchEnd[0] - touchStart[0],
        dy = touchEnd[1] - touchStart[1];
    touchStart = touchEnd;
    diagram.controlEvent('shift', [dx, dy]);
  });

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
  document.getElementById('infoButton').addEventListener('click', function() {
    document.getElementById('infoModal').className = 'open';
  });

  document.getElementById('infoCloseButton').addEventListener('click', function() {
    document.getElementById('infoModal').className = '';
  });
});