var should = require('should'),
    IceDiagram = require('../js/icediagram.js');

describe('Bezier curve', function() {
  const CUBIC = [10, 20, 30, 40, 50, 60, 70, 80],
        VALUE = IceDiagram._cubicValueAt(CUBIC, 0.2),
        NORMAL = IceDiagram._cubicNormalAt(CUBIC, 0.2);
  describe('value at point', function() {
    it('should have correct x', function() {
      VALUE[0].should.be.approximately(22, 1e-8);
    });
    it('should have correct y', function() {
      VALUE[1].should.be.approximately(32, 1e-8);
    });
  });
  describe('normal at point', function() {
    it('should have correct x value', function() {
      NORMAL.value[0].should.be.approximately(22, 1e-8);
    });
    it('should have correct y value', function() {
      NORMAL.value[1].should.be.approximately(32, 1e-8);
    });
    it('should have correct x value', function() {
      NORMAL.normal[0].should.be.approximately(-0.5 * Math.sqrt(2), 1e-8);
    });
    it('should have correct y value', function() {
      NORMAL.normal[1].should.be.approximately(0.5 * Math.sqrt(2), 1e-8);
    });
  });
});

describe('Parameter resolution', function() {
  it('should escape #', function() {
    IceDiagram._resolveParams('LFO', 'A##B').should.equal('A#B');
  });
  it('should substitute edge', function() {
    IceDiagram._resolveParams('LFO', 'A #E B #e C').should.equal('A Left Forward Outside B LFO C');
  });
  it('should substitute mirrored edge', function() {
    IceDiagram._resolveParams('LFO', 'A #M B #m C').should.equal('A Right Forward Outside B RFO C');
  });
  it('should substitute foot', function() {
    IceDiagram._resolveParams('LFO', 'A #F #f #R #r').should.equal('A Left L Right R');
  });
  it('should substitute direction', function() {
    IceDiagram._resolveParams('LFO', 'A #D #d #B #b').should.equal('A Forward F Backward B');
  });
  it('should substitute quality', function() {
    IceDiagram._resolveParams('LFO', 'A #Q #q #O #o').should.equal('A Outside O Inside I');
  });
});

describe('Point searching', function() {
  const RANGE = 6;
  var i, j, points = [], tree = [];
  for (i = 0; i < RANGE; i++) {
    for (j = 0; j < RANGE; j++) {
      points.push([i, j]);
    }
  }
  for (i = 0; i < points.length; i++) {
    tree.push([points[i][0], points[i][1], i]);
  }
  IceDiagram._kdTree(tree);

  it('selects the correct nth element', function() {
    IceDiagram._kdQuickSelect(points, 0, points.length, 2 * RANGE - 1, 1);
    points[2 * RANGE - 1][1].should.equal(1);
    IceDiagram._kdQuickSelect(points, 0, points.length, 2 * RANGE, 0);
    points[2 * RANGE][0].should.equal(2);
  });
  it('does not find point too far away', function() {
    IceDiagram._nearestNeighbor([2.8, 3.2], tree, 0.25).should.equal(-1);
  });
  it('finds nearest point (1,3)', function() {
    var nearest = tree[IceDiagram._nearestNeighbor([1.1, 3.1], tree, 1)];
    nearest[0].should.equal(1);
    nearest[1].should.equal(3);
  });
  it('finds nearest point (4,2)', function() {
    var nearest = tree[IceDiagram._nearestNeighbor([3.9, 2.3], tree, 1)];
    nearest[0].should.equal(4);
    nearest[1].should.equal(2);
  });
});

describe('Diagram', function() {
  describe('alignment', function() {
    it('is centered within the container if content fits', function() {
      IceDiagram._trimCenter(30, 100, 100).should.equal(0);
    });
    it('is centered on element if content does not fit', function() {
      IceDiagram._trimCenter(5, 100, 50).should.equal(5);
    });
    it('should stop on left edge', function() {
      IceDiagram._trimCenter(-30, 100, 50).should.equal(-25);
    });
    it('should stop on right edge', function() {
      IceDiagram._trimCenter(30, 100, 50).should.equal(25);
    });
  });
  describe('zoom', function() {
    it('should be 1 if width does not fit', function() {
      IceDiagram._getDefaultZoom(0.8 * IceDiagram._BASE_WIDTH, IceDiagram._BASE_HEIGHT).should.equal(1);
    });
    it('should be 1 if height does not fit', function() {
      IceDiagram._getDefaultZoom(IceDiagram._BASE_WIDTH, 0.8 * IceDiagram._BASE_HEIGHT).should.equal(1);
    });
    it('should be width limited', function() {
      IceDiagram._getDefaultZoom(2 * IceDiagram._BASE_WIDTH, 3 * IceDiagram._BASE_HEIGHT).should.equal(2);
    });
    it('should be height limited', function() {
      IceDiagram._getDefaultZoom(3 * IceDiagram._BASE_WIDTH, 2 * IceDiagram._BASE_HEIGHT).should.equal(2);
    });
  });
});

describe('Mixed number notation', function() {
  it('should round 1.05 down to 1', function() {
    IceDiagram._toMixedNumber(1.05).should.equal('1');
  });
  it('should round 1.95 up to 2', function() {
    IceDiagram._toMixedNumber(1.95).should.equal('2');
  });
  it('should round 12.34 to 12 1/3', function() {
    IceDiagram._toMixedNumber(12.34).should.equal('12⅓');
  });
  it('should express 1/8 correctly', function() {
    IceDiagram._toMixedNumber(1 / 8).should.equal('⅛');
  });
  it('should express 1/4 correctly', function() {
    IceDiagram._toMixedNumber(1 / 4).should.equal('¼');
  });
  it('should express 4/5 correctly', function() {
    IceDiagram._toMixedNumber(0.8).should.equal('⅘');
  });
  it('should express 0 as empty', function() {
    IceDiagram._toMixedNumber(0).should.equal('');
  });
});