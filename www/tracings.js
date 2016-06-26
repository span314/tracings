'use strict';
//Version 0.1-RC3 | Software (c) Shawn Pan
//Note: uses HTML5 and ECMAScript5 features requiring IE9 or later

//Create jQuery UI widgets and diagram
$(document).ready(function() {
  var copyDanceUrlToSelect, copyDanceSelectToUrl, diagramControls, diagram;
  $('#danceSelect').selectmenu({position: {collision: 'flip'}});
  $('.button-set').buttonset();
  $('#controls').tooltip();

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
    _playbackSpeedPercentage: 100,
    _optionalButton: document.getElementById('optionalButton'),
    _mirrorButton: document.getElementById('mirrorButton'),
    _rotateButton: document.getElementById('rotateButton'),
    _partLadyButton: document.getElementById('partLadyButton'),
    _stepButton: document.getElementById('stepButton'),
    _numberButton: document.getElementById('numberButton'),
    _countButton: document.getElementById('countButton'),
    _holdButton: document.getElementById('holdButton'),
    _$startPauseButtonIcon: $('#startPauseButton').find('.mdi'),
    _$speedButton: $('#speedButton'),
    _$danceSelect: $('#danceSelect'),
    _$controls: $('#controls'),

    optional: function() {
      return this._optionalButton.checked;
    },

    mirror: function() {
      return this._mirrorButton.checked;
    },

    rotate: function() {
      return this._rotateButton.checked;
    },

    part: function() {
      return this._partLadyButton.checked ? 'lady' : 'man';
    },

    step: function() {
      return this._stepButton.checked;
    },

    number: function() {
      return this._numberButton.checked;
    },

    count: function() {
      return this._countButton.checked;
    },

    hold: function() {
      return this._holdButton.checked;
    },

    dance: function() {
      return this._$danceSelect.val();
    },

    start: function() {
      this._$startPauseButtonIcon.removeClass('mdi-play').addClass('mdi-pause');
    },

    pause: function() {
      this._$startPauseButtonIcon.removeClass('mdi-pause').addClass('mdi-play');
    },

    resize: function(width) {
      this._$controls.width(width);
    },

    speed: function() {
      //Cycle speeds in 25% increments with a minimum of 50% and update button ui
      this._playbackSpeedPercentage -= 25;
      if (this._playbackSpeedPercentage < 50) {
        this._playbackSpeedPercentage = 100;
        this._$speedButton.removeClass('speed-state-active');
      } else {
        this._$speedButton.addClass('speed-state-active');
      }
      return this._playbackSpeedPercentage;
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
  $('.require-reload').find('input').click(diagram.loadPattern.bind(diagram));
  $('.require-redraw').find('input').click(diagram.drawPattern.bind(diagram));
  $('#speedButton').click(diagram.adjustSpeed.bind(diagram));
  $('#beginningButton').click(diagram.beginning.bind(diagram));
  $('#previousButton').click(diagram.previous.bind(diagram));
  $('#nextButton').click(diagram.next.bind(diagram));
  $('#startPauseButton').click(diagram.toggleStartPause.bind(diagram));
  $('#diagram').click(diagram.click.bind(diagram));
  $(window).resize(diagram.onCanvasResize.bind(diagram));
});