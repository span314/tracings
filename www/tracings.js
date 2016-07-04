'use strict';
/*!
Load widgets and bind events v0.1-RC6 | Software Copyright (c) Shawn Pan
*/
document.addEventListener('DOMContentLoaded', function() {
  var canvasEl = document.getElementById('diagram'),
      controlsEl = document.getElementById('controls'),
      danceSelectEl = document.getElementById('danceSelect'),
      //danceSelect = new Select({el: danceSelectEl}),
      diagram = new IceDiagram(canvasEl),
      runAndAddListener, createIconButton;

  runAndAddListener = function(elem, event, handler) {
    handler();
    elem.addEventListener(event, handler);
  };

  //Initialize select and url hash to match
  if (window.location.hash) { //Try dance from URL first
    //danceSelect.change(window.location.hash.substr(1));
    danceSelectEl.value = window.location.hash.substr(1);
  } else if (window.history.pushState) { //Otherwise push default to URL
    window.history.pushState(null, null, '#' + danceSelectEl.value);
  } else { //IE support
    window.location.hash = '#' + danceSelectEl.value;
  }
  diagram.controlEvent('dance', danceSelectEl.value);

  danceSelectEl.addEventListener('change', function() {
    var danceHash = '#' + danceSelectEl.value;
    diagram.controlEvent('dance', danceSelectEl.value);
    if (window.location.hash !== danceHash) {
      if (window.history.pushState) {
        window.history.pushState(null, null, danceHash);
      } else { //IE support
        window.location.hash = danceHash;
      }
    }
  });

  window.addEventListener('popstate', function() {
    if (window.location.hash) {
      //danceSelect.change(window.location.hash.substr(1));
      danceSelectEl.value = window.location.hash.substr(1);
      diagram.controlEvent('dance', danceSelectEl.value);
    }
  });

  runAndAddListener(window, 'resize', function() {
    //TODO Figure out why this line is necessary to
    //force update window.innerHeight on Android orientation change
    //Match the width of canvas with that of the controls div (width:auto)
    canvasEl.width = controlsEl.getBoundingClientRect().width;
    //Show one or two lines of control buttons depending on window size
    canvasEl.height = canvasEl.width < 480 ? window.innerHeight - 88 : window.innerHeight - 48;
    //Recompute width in case scroll bar added after height change
    canvasEl.width = controlsEl.getBoundingClientRect().width;
    diagram.controlEvent('resize');
  });

  canvasEl.addEventListener('click', function(e) {
    //Note: calcuating offsets from page, because Firefox does not have offsetX/offsetY in click events
    var bounds = this.getBoundingClientRect(),
        x = e.pageX - bounds.left - document.body.scrollLeft,
        y = e.pageY - bounds.top - document.body.scrollTop;
    diagram.controlEvent('click', [x, y]);
  });

  createIconButton = function(property, states) {
    var stateIndex = -1,
        elem = document.getElementById(property + 'Button');
    runAndAddListener(elem, 'click', function() {
      var state, icon;
      stateIndex = (stateIndex + 1) % states.length;
      state = states[stateIndex];
      icon = state.icon ? ' ' + state.icon : '';
      elem.className = (state.active ? 'active' : 'inactive') + icon;
      diagram.controlEvent(property, state.value || state.active);
    });
  };

  createIconButton('part', [{active: false, value: 'lady', icon: 'female'}, {active: false, value: 'man', icon: 'male'}]);
  createIconButton('optional', [{active: true, value: 'yes'}, {active: false, value: 'no'}]);
  createIconButton('mirror', [{active: false}, {active: true}]);
  createIconButton('rotate', [{active: false}, {active: true}]);

  createIconButton('speed', [{active: false, value: 100, icon: 'clock-fast'}, {active: true, value: 75, icon: 'clock-fast'}, {active: true, value: 50, icon: 'clock-fast'}]);
  createIconButton('beginning', [{active: false}]);
  createIconButton('startPause', [{active: false}]);
  createIconButton('previous', [{active: false}]);
  createIconButton('next', [{active: false}]);

  createIconButton('step', [{active: true}, {active: false}]);
  createIconButton('number', [{active: false}, {active: true}]);
  createIconButton('count', [{active: true}, {active: false}]);
  createIconButton('hold', [{active: false}, {active: true}]);

  diagram.activate();
});