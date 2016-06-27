'use strict';
//Version 0.1-RC3 | Load widgets and bind events | Software (c) Shawn Pan | Target IE9+

//Create jQuery UI widgets and diagram
$(document).ready(function() {
  var copyDanceUrlToSelect, copyDanceSelectToUrl, diagramControls, diagram;
  $('#danceSelect').selectmenu({position: {collision: 'flip'}});

  copyDanceUrlToSelect = function() {
    if (window.location.hash) {
      $('#danceSelect').val(window.location.hash.substr(1));
      $('#danceSelect').selectmenu('refresh');
    }
  };
  //Select dance from URL before creating widget and loading diagram
  //TODO handle invalid values
  copyDanceUrlToSelect();

  diagramControls = {
    _optionalButton: document.getElementById('optionalButton'),
    _mirrorButton: document.getElementById('mirrorButton'),
    _rotateButton: document.getElementById('rotateButton'),
    _partButton: document.getElementById('partButton'),
    _stepButton: document.getElementById('stepButton'),
    _numberButton: document.getElementById('numberButton'),
    _countButton: document.getElementById('countButton'),
    _holdButton: document.getElementById('holdButton'),
    _speedButton: document.getElementById('speedButton'),
    _controlContainer: document.getElementById('controls'),
    _$danceSelect: $('#danceSelect'),

    optional: function() {
      return this._optionalButton.className === 'active';
    },

    mirror: function() {
      return this._mirrorButton.className === 'active';
    },

    rotate: function() {
      return this._rotateButton.className === 'active';
    },

    part: function() {
      return this._partButton.className.split(' ')[1];
    },

    step: function() {
      return this._stepButton.className === 'active';
    },

    number: function() {
      return this._numberButton.className === 'active';
    },

    count: function() {
      return this._countButton.className === 'active';
    },

    hold: function() {
      return this._holdButton.className === 'active';
    },

    dance: function() {
      return this._$danceSelect.val();
    },

    start: function() {
      $('#startPauseButton').find('.mdi').removeClass('mdi-play').addClass('mdi-pause');
    },

    pause: function() {
      $('#startPauseButton').find('.mdi').removeClass('mdi-pause').addClass('mdi-play');
    },

    resize: function(width) {
      this._controlContainer.width = width;
    },

    speed: function() {
      var css = this._speedButton.className,
          index = css.indexOf('speed');
      return parseInt(css.substring(index + 5));
    }
  };
  diagram = new IceDiagram(document.getElementById('diagram'), diagramControls);

  copyDanceSelectToUrl = function() {
    var danceHash = '#' + $('#danceSelect').val();
    if (window.history.pushState) {
      window.history.pushState(null, null, danceHash);
    } else {
      window.location.hash = danceHash;
    }
  }
  //Copy default dance to URL if none specified initally
  if (!window.location.hash) {
    copyDanceSelectToUrl();
  }

  //Bind control events
  $('#danceSelect').on('selectmenuchange', function() {
    copyDanceSelectToUrl();
    diagram.loadDance();
  });
  $(window).on('popstate', function() {
    copyDanceUrlToSelect();
    diagram.loadDance();
  });
  $('#diagram').click(diagram.click.bind(diagram));
  $(window).resize(diagram.onCanvasResize.bind(diagram));

  initializeIconButton('partButton',
    [{cssClass: 'inactive lady', icon: 'human-female'}, {cssClass: 'inactive man', icon: 'human-male'}],
    diagram.loadPattern.bind(diagram));
  initializeIconButton('optionalButton',
    [{cssClass: 'active', icon: 'stairs'}, {cssClass: 'inactive', icon: 'stairs'}],
    diagram.loadPattern.bind(diagram));
  initializeIconButton('mirrorButton',
    [{cssClass: 'inactive', icon: 'swap-horizontal'}, {cssClass: 'active', icon: 'swap-horizontal'}],
    diagram.loadPattern.bind(diagram));
  initializeIconButton('rotateButton',
    [{cssClass: 'inactive', icon: 'rotate-left'}, {cssClass: 'active', icon: 'rotate-left'}],
    diagram.loadPattern.bind(diagram));

  initializeIconButton('speedButton',
    [{cssClass: 'inactive speed100', icon: 'clock-fast'}, {cssClass: 'active speed75', icon: 'clock-fast'}, {cssClass: 'active speed50', icon: 'clock-fast'}],
    diagram.adjustSpeed.bind(diagram));
  initializeIconButton('beginningButton',
    [{cssClass: 'inactive', icon: 'page-first'}],
    diagram.beginning.bind(diagram));
  initializeIconButton('startPauseButton',
    [{cssClass: 'inactive paused', icon: 'play'}, {cssClass: 'inactive playing', icon: 'pause'}],
    diagram.toggleStartPause.bind(diagram));
  initializeIconButton('previousButton',
    [{cssClass: 'inactive', icon: 'chevron-left'}],
    diagram.previous.bind(diagram));
  initializeIconButton('nextButton',
    [{cssClass: 'inactive', icon: 'chevron-right'}],
    diagram.next.bind(diagram));

  initializeIconButton('stepButton',
    [{cssClass: 'active', icon: 'format-list-bulleted'}, {cssClass: 'inactive', icon: 'format-list-bulleted'}],
    diagram.drawPattern.bind(diagram));
  initializeIconButton('numberButton',
    [{cssClass: 'inactive', icon: 'format-list-numbers'}, {cssClass: 'active', icon: 'format-list-numbers'}],
    diagram.drawPattern.bind(diagram));
  initializeIconButton('countButton',
    [{cssClass: 'active', icon: 'clock'}, {cssClass: 'inactive', icon: 'clock'}],
    diagram.drawPattern.bind(diagram));
  initializeIconButton('holdButton',
    [{cssClass: 'inactive', icon: 'human-male-female'}, {cssClass: 'active', icon: 'human-male-female'}],
    diagram.drawPattern.bind(diagram));
});