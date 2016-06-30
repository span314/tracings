'use strict';
/*!
Load widgets and bind events v0.1-RC5 | Software Copyright (c) Shawn Pan
*/
document.addEventListener('DOMContentLoaded', function() {
  var canvasEl = document.getElementById('diagram'),
      controlsEl = document.getElementById('controls'),
      danceSelectEl = document.getElementById('danceSelect'),
      danceSelect = new Select({el: danceSelectEl}),
      diagram = new IceDiagram(canvasEl),
      runAndAddListener, createIconButton;

  runAndAddListener = function(elem, event, handler) {
    handler();
    elem.addEventListener(event, handler);
  };

  //Initialize select and url hash to match
  if (window.location.hash) { //Try dance from URL first
    danceSelect.change(window.location.hash.substr(1));
  } else if (window.history.pushState) { //Otherwise push default to URL
    window.history.pushState(null, null, '#' + danceSelect.value);
  } else { //IE support
    window.location.hash = '#' + danceSelect.value;
  }
  diagram.controlEvent('dance', danceSelect.value);

  danceSelectEl.addEventListener('change', function() {
    var danceHash = '#' + danceSelect.value;
    diagram.controlEvent('dance', danceSelect.value);
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
      danceSelect.change(window.location.hash.substr(1));
      diagram.controlEvent('dance', danceSelect.value);
    }
  });

  runAndAddListener(window, 'resize', function() {
    var width, height,
        availableWidth = Math.max(window.innerWidth - 16, 0),
        availableHeight = Math.max(window.innerHeight - 108, 0),
        aspectRatio = availableWidth / availableHeight;
    if (aspectRatio > 1.8) {
      //height limited
      height = availableHeight;
      width = 1.8 * height;
    } else {
      //width limited
      width = availableWidth;
      height = width / 1.8;
    }

    canvasEl.width = width;
    canvasEl.height = height;
    controlsEl.setAttribute('style', 'width:' + width + 'px;');
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
      stateIndex = (stateIndex + 1) % states.length;
      elem.className = (states[stateIndex].active ? 'active' : 'inactive') + ' mdi mdi-' + states[stateIndex].icon;
      diagram.controlEvent(property, states[stateIndex].value || states[stateIndex].active);
    });
  };

  createIconButton('part', [{active: false, value: 'lady', icon: 'human-female'}, {active: false, value: 'man', icon: 'human-male'}]);
  createIconButton('optional', [{active: true, value: 'yes', icon: 'stairs'}, {active: false, value: 'no', icon: 'stairs'}]);
  createIconButton('mirror', [{active: false, icon: 'swap-horizontal'}, {active: true, icon: 'swap-horizontal'}]);
  createIconButton('rotate', [{active: false, icon: 'rotate-left'}, {active: true, icon: 'rotate-left'}]);

  createIconButton('speed', [{active: false, value: 100, icon: 'clock-fast'}, {active: true, value: 75, icon: 'clock-fast'}, {active: true, value: 50, icon: 'clock-fast'}]);
  createIconButton('beginning', [{active: false, icon: 'page-first'}]);
  createIconButton('startPause', [{active: false, icon: 'play-pause'}]);
  createIconButton('previous', [{active: false, icon: 'chevron-left'}]);
  createIconButton('next', [{active: false, icon: 'chevron-right'}]);

  createIconButton('step', [{active: true, icon: 'format-list-bulleted'}, {active: false, icon: 'format-list-bulleted'}]);
  createIconButton('number', [{active: false, icon: 'format-list-numbers'}, {active: true, icon: 'format-list-numbers'}]);
  createIconButton('count', [{active: true, icon: 'clock'}, {active: false, icon: 'clock'}]);
  createIconButton('hold', [{active: false, icon: 'human-male-female'}, {active: true, icon: 'human-male-female'}]);

  diagram.activate();
});