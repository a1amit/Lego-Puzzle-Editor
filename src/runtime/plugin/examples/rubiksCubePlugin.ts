/**
 * Rubik's Cube — flagship example of a `engine: 'plugin'` puzzle.
 *
 * This is the proof the engine pivot works: the grid model CANNOT express a
 * Rubik's cube (no face topology, no 3D piece orientation, no permutation
 * moves), but as a plugin the author owns everything:
 *   - STATE: 27 cubies, each a position + an integer 3×3 orientation matrix.
 *   - MOVES: face twists are real 3D rotations of a slice (pure data→data).
 *   - WIN:   every face shows a single color.
 *   - RENDER: a studded LEGO-style unfolded net with twist buttons (DOM only).
 *
 * The value below is the ES module SOURCE that runs inside the sandbox. It is
 * self-contained (no imports, no host globals) and exports a default
 * `PuzzlePlugin`. The pure logic is intentionally kept side-effect free so it
 * is unit-testable (see src/__tests__/runtime/rubiksCubePlugin.test.ts, which
 * evaluates this exact source) and so a future tier can run it authoritatively
 * in a Web Worker without modification.
 */
export const RUBIKS_CUBE_PLUGIN_SOURCE = String.raw`
const CUBE = (function () {
  "use strict";

  // Outward axis direction -> solved face color.
  // +Y up=White, -Y down=Yellow, +Z front=Green, -Z back=Blue, +X right=Red, -X left=Orange
  function faceColorOf(d) {
    if (d[1] === 1) return "W";
    if (d[1] === -1) return "Y";
    if (d[2] === 1) return "G";
    if (d[2] === -1) return "B";
    if (d[0] === 1) return "R";
    return "O";
  }
  var HEX = { W:"#f5f5f5", Y:"#ffd400", G:"#009e3a", B:"#0046ad", R:"#c41e3a", O:"#ff8c00", "?":"#333" };

  var IDENT = [1,0,0, 0,1,0, 0,0,1];

  function matMul(a, b) {
    var r = new Array(9);
    for (var i=0;i<3;i++) for (var j=0;j<3;j++) {
      var s=0; for (var k=0;k<3;k++) s += a[i*3+k]*b[k*3+j];
      r[i*3+j]=s;
    }
    return r;
  }
  // transpose(o) applied to world vector v -> the cubie-local direction that
  // currently faces v. The sticker on that local face keeps its home color.
  function applyMatT(o, v) {
    return [
      o[0]*v[0]+o[3]*v[1]+o[6]*v[2],
      o[1]*v[0]+o[4]*v[1]+o[7]*v[2],
      o[2]*v[0]+o[5]*v[1]+o[8]*v[2]
    ];
  }
  // +90 rotation matrices (right-hand rule about +axis)
  var RX = [1,0,0, 0,0,-1, 0,1,0];
  var RY = [0,0,1, 0,1,0, -1,0,0];
  var RZ = [0,-1,0, 1,0,0, 0,0,1];
  function rotMat(ax) { return ax===0 ? RX : ax===1 ? RY : RZ; }
  function rotVecQuarter(p, ax) {
    var x=p[0], y=p[1], z=p[2];
    if (ax===0) return [x, -z, y];   // about X
    if (ax===1) return [z, y, -x];   // about Y
    return [-y, x, z];               // about Z
  }

  function solvedState() {
    var cubies = [];
    for (var x=-1;x<=1;x++) for (var y=-1;y<=1;y++) for (var z=-1;z<=1;z++) {
      cubies.push({ p:[x,y,z], o: IDENT.slice() });
    }
    return { cubies: cubies };
  }

  // face -> rotation axis (0=x,1=y,2=z) and which layer (-1/+1) it turns
  var FACES = {
    U:{ax:1,layer:1}, D:{ax:1,layer:-1},
    R:{ax:0,layer:1}, L:{ax:0,layer:-1},
    F:{ax:2,layer:1}, B:{ax:2,layer:-1}
  };

  function cloneState(s) {
    return { cubies: s.cubies.map(function (c) { return { p:c.p.slice(), o:c.o.slice() }; }) };
  }

  function quarterTurn(s, ax, layer) {
    var m = rotMat(ax);
    for (var i=0;i<s.cubies.length;i++) {
      var c = s.cubies[i];
      if (c.p[ax] === layer) {
        c.p = rotVecQuarter(c.p, ax);
        c.o = matMul(m, c.o);
      }
    }
  }

  // PURE: returns a NEW state. dir: 1=cw quarter, -1=ccw quarter, 2=half.
  function applyMove(state, move) {
    var f = FACES[move.face];
    if (!f) return state;
    var steps = move.dir === 2 ? 2 : (move.dir === -1 ? 3 : 1);
    var s = cloneState(state);
    for (var i=0;i<steps;i++) quarterTurn(s, f.ax, f.layer);
    return s;
  }

  var NORMAL = { U:[0,1,0], D:[0,-1,0], R:[1,0,0], L:[-1,0,0], F:[0,0,1], B:[0,0,-1] };

  // The 9 world cell positions of a face, laid out as a 3x3 grid (row-major)
  // arranged so the cross-net reads naturally.
  function facePositions(face) {
    var g = [];
    for (var r=0;r<3;r++) for (var c=0;c<3;c++) {
      var p;
      if (face==="U") p=[c-1, 1, r-1];
      else if (face==="D") p=[c-1, -1, 1-r];
      else if (face==="F") p=[c-1, 1-r, 1];
      else if (face==="B") p=[1-c, 1-r, -1];
      else if (face==="R") p=[1, 1-r, 1-c];
      else p=[-1, 1-r, c-1]; // L
      g.push(p);
    }
    return g;
  }

  function cubieAt(state, p) {
    for (var i=0;i<state.cubies.length;i++) {
      var q = state.cubies[i].p;
      if (q[0]===p[0] && q[1]===p[1] && q[2]===p[2]) return state.cubies[i];
    }
    return null;
  }
  function colorOnFace(state, p, dir) {
    var c = cubieAt(state, p);
    if (!c) return "?";
    return faceColorOf(applyMatT(c.o, dir));
  }

  var FACE_LIST = ["U","D","R","L","F","B"];
  function isSolved(state) {
    var correct=0, total=0;
    for (var fi=0; fi<FACE_LIST.length; fi++) {
      var face = FACE_LIST[fi];
      var dir = NORMAL[face];
      var target = faceColorOf(dir);
      var pos = facePositions(face);
      for (var i=0;i<9;i++) {
        total++;
        if (colorOnFace(state, pos[i], dir) === target) correct++;
      }
    }
    return {
      solved: correct === total,
      progress: correct/total,
      message: correct === total ? "Solved!" : (correct + "/" + total + " facelets correct")
    };
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var ALL_MOVES = [];
  (function () {
    var fs = ["U","D","R","L","F","B"], ds = [1,-1,2];
    for (var i=0;i<fs.length;i++) for (var j=0;j<ds.length;j++) ALL_MOVES.push({ face:fs[i], dir:ds[j] });
  })();

  // PURE (given seed): build a solved cube then apply a deterministic scramble.
  // The scramble length is author-configurable via params.scramble (default 25).
  function initialState(ctx) {
    var rng = mulberry32((ctx && ctx.seed) || 1);
    var n = (ctx && ctx.params && typeof ctx.params.scramble === "number") ? ctx.params.scramble : 25;
    var s = solvedState();
    for (var i=0;i<n;i++) {
      s = applyMove(s, ALL_MOVES[Math.floor(rng() * ALL_MOVES.length)]);
    }
    return s;
  }

  // ---- rendering (WebGL via Three.js; only runs inside the sandbox) ----
  // The host exposes the bundled Three as a global (self.THREE) before this
  // module loads. The cubie-level state above maps directly to 3D: 27 black
  // bodies + 54 colored studded facelets recolored from colorOnFace().
  function mount(root, api) {
    var THREE = self.THREE;
    if (!THREE) {
      root.textContent = "Three.js was not provided to the sandbox.";
      return { update: function () {}, dispose: function () {} };
    }

    root.style.position = "relative";
    root.textContent = "";

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(6.0, 5.4, 7.8);
    camera.lookAt(0, 0, 0);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(self.devicePixelRatio || 1, 2));
    renderer.domElement.style.display = "block";
    renderer.domElement.style.cursor = "grab";
    root.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    var key = new THREE.DirectionalLight(0xffffff, 0.85); key.position.set(5, 8, 6); scene.add(key);
    var fill = new THREE.DirectionalLight(0xffffff, 0.3); fill.position.set(-6, -3, -5); scene.add(fill);

    var cube = new THREE.Group();
    cube.rotation.set(0.32, -0.5, 0);
    scene.add(cube);

    var S = 1.0, BODY = 0.94, SURFACE = 1.5, TILE = 0.82;
    var bodyGeo = new THREE.BoxGeometry(BODY, BODY, BODY);
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.6, metalness: 0.0 });
    for (var x = -1; x <= 1; x++) for (var y = -1; y <= 1; y++) for (var z = -1; z <= 1; z++) {
      var body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.set(x * S, y * S, z * S);
      cube.add(body);
    }

    function axisOf(n) { return n[0] ? 0 : (n[1] ? 1 : 2); }
    var stickers = []; // { mat, pos, dir }
    for (var fi = 0; fi < FACE_LIST.length; fi++) {
      var face = FACE_LIST[fi], n = NORMAL[face], ax = axisOf(n), sign = n[ax], pos9 = facePositions(face);
      for (var i = 0; i < 9; i++) {
        var cp = pos9[i];
        var gw = ax === 0 ? 0.07 : TILE, gh = ax === 1 ? 0.07 : TILE, gd = ax === 2 ? 0.07 : TILE;
        var mat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.32, metalness: 0.0 });
        var tile = new THREE.Mesh(new THREE.BoxGeometry(gw, gh, gd), mat);
        var px = cp[0] * S, py = cp[1] * S, pz = cp[2] * S;
        if (ax === 0) px = sign * SURFACE; else if (ax === 1) py = sign * SURFACE; else pz = sign * SURFACE;
        tile.position.set(px, py, pz);
        cube.add(tile);
        var stud = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 0.1, 18),
          new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, roughness: 0.3 })
        );
        if (ax === 0) stud.rotation.z = Math.PI / 2; else if (ax === 2) stud.rotation.x = Math.PI / 2;
        stud.position.set(px + (ax === 0 ? sign * 0.06 : 0), py + (ax === 1 ? sign * 0.06 : 0), pz + (ax === 2 ? sign * 0.06 : 0));
        cube.add(stud);
        stickers.push({ mat: mat, pos: cp, dir: n });
      }
    }

    // On-demand rendering: only draw after a change (twist / orbit / resize),
    // not every frame — keeps the GPU idle when nothing is happening.
    var dirty = true;
    function invalidate() { dirty = true; }

    // Drag to orbit the whole cube.
    var dragging = false, lx = 0, ly = 0;
    function pt(e) { return e.touches && e.touches[0] ? e.touches[0] : e; }
    function down(e) { dragging = true; var p = pt(e); lx = p.clientX; ly = p.clientY; renderer.domElement.style.cursor = "grabbing"; }
    function move(e) {
      if (!dragging) return;
      var p = pt(e);
      cube.rotation.y += (p.clientX - lx) * 0.01;
      cube.rotation.x += (p.clientY - ly) * 0.01;
      lx = p.clientX; ly = p.clientY;
      invalidate();
    }
    function up() { dragging = false; renderer.domElement.style.cursor = "grab"; }
    renderer.domElement.addEventListener("mousedown", down);
    self.addEventListener("mousemove", move);
    self.addEventListener("mouseup", up);
    renderer.domElement.addEventListener("touchstart", down, { passive: true });
    self.addEventListener("touchmove", move, { passive: true });
    self.addEventListener("touchend", up);

    // Twist controls (DOM overlay over the canvas).
    var bar = document.createElement("div");
    bar.style.cssText = "position:absolute;left:0;right:0;bottom:10px;display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-family:system-ui,sans-serif";
    function mkBtn(label, f, d) {
      var b = document.createElement("button");
      b.textContent = label;
      b.style.cssText = "padding:6px 10px;font-size:13px;font-weight:600;color:#e8e8ea;background:#262a33;border:1px solid #3a3f4b;border-radius:6px;cursor:pointer;min-width:36px";
      b.onmouseenter = function () { b.style.background = "#30353f"; };
      b.onmouseleave = function () { b.style.background = "#262a33"; };
      b.onclick = function () { api.emitMove({ face: f, dir: d }); };
      bar.appendChild(b);
    }
    var order = ["U", "R", "F", "D", "L", "B"];
    for (var k = 0; k < order.length; k++) { mkBtn(order[k], order[k], 1); mkBtn(order[k] + "'", order[k], -1); }
    root.appendChild(bar);

    function update(state) {
      for (var s = 0; s < stickers.length; s++) {
        var sm = stickers[s];
        sm.mat.color.set(HEX[colorOnFace(state, sm.pos, sm.dir)] || "#333333");
      }
      invalidate();
    }

    var raf = 0;
    function resize() {
      var w = root.clientWidth || 400, h = root.clientHeight || 400;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      invalidate();
    }
    function loop() {
      raf = self.requestAnimationFrame(loop);
      if (dirty) { dirty = false; renderer.render(scene, camera); }
    }
    var ro = (typeof ResizeObserver !== "undefined") ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(root); else self.addEventListener("resize", resize);
    resize();
    loop();

    return {
      update: update,
      resize: resize,
      dispose: function () {
        self.cancelAnimationFrame(raf);
        self.removeEventListener("mousemove", move);
        self.removeEventListener("mouseup", up);
        self.removeEventListener("touchmove", move);
        self.removeEventListener("touchend", up);
        if (ro) ro.disconnect();
        renderer.dispose();
        root.textContent = "";
      }
    };
  }

  return {
    meta: {
      title: "Rubik's Cube (LEGO)",
      instructions: "Twist the faces (U R F D L B; the prime button = counter-clockwise) until every face is a single color.",
      supportsUndo: false,
      rngSeedable: true
    },
    initialState: initialState,
    legalMoves: function () { return ALL_MOVES.slice(); },
    applyMove: applyMove,
    isSolved: isSolved,
    render: { mount: mount },
    // exposed for unit tests (host ignores extra keys)
    _solvedState: solvedState
  };
})();

export default CUBE;
`;
