'use strict';
//Version 0.1-RC3 | Icon Button Widget | Software (c) Shawn Pan | Target IE9+
var testState = [
  {state: 'paused', cssClass: 'inactive', icon: 'play'},
  {state: 'playing', cssClass: 'active', icon: 'pause'}
];

var IconButton = function(elem, states, clickHandler) {
  var i, icon;
  //Store parameters
  this._elem = elem;
  this._states = states;
  this._clickHandler = clickHandler;
  //Create icons
  this._icons = {};
  for (i = 0; i < states.length; i++) {
    icon = states[i].icon;
    if (!this._icons[icon]) {
      this._icons[icon] = document.createElement('i');
      this._icons[icon].className = 'mdi mdi-' + icon;
    }
  }
  console.log(this._icons);
  //Initialize state
  this._setState(0);
  //Bind click event
  elem.addEventListener('click', this._onClick.bind(this));
};

IconButton.prototype._onClick = function() {
  this._setState((this._stateIndex + 1) % this._states.length);
  this._clickHandler();
};

IconButton.prototype._setState = function(index) {
  var newState = this._states[index];
  this._stateIndex = index;
  this._elem.className = newState.cssClass;
  this._elem.innerHTML = '';
  this._elem.appendChild(this._icons[newState.icon]);
};

$(document).ready(function() {
  var testButton = new IconButton(document.getElementById('testButton'), testState, function() {console.log('foo')});
});