/**
 * Acyclic Shadows — an `engine: 'plugin'` puzzle that the grid model cannot
 * express, and a showcase for why Tier 2 exists: the entire puzzle hinges on a
 * non-trivial COMPUTATIONAL win-check (graph acyclicity of three orthogonal
 * projections) that lives wholly in author code.
 *
 * THE PUZZLE (the Lenstra / Oskar's-maze problem, 1994). Lay a single simple
 * CLOSED loop of unit bricks on a 3D integer lattice so that its three
 * orthogonal shadows — the projections onto the XY, XZ and YZ planes — each
 * contain NO cycle (each shadow is a tree). This is exactly what Hendrik
 * Lenstra asked of Oskar van Deventer's maze cube: a closed curve whose three
 * shadows are all trees. It is solvable — John R. Rickard found the minimal
 * length-24 solution (popularised as Adam P. Goucher's knotted "Treefoil") —
 * and we embed Rickard's curve as the "Show solution" reveal.
 *
 * THE ONE MATH NUANCE baked into the win-check: shadows must be TREES (acyclic,
 * branch points allowed), NOT simple PATHS. "No cycle in any shadow" is
 * achievable; demanding each shadow be a non-branching path is provably
 * IMPOSSIBLE for a closed loop (Bose, De Carufel, Dobbins, Kim, Viglietta —
 * "The Shadows of a Cycle Cannot All Be Paths", CCCG 2015). So isSolved tests
 * acyclicity (a forest) and never forbids branch points.
 *
 * STATE: { n, edges } — n vertices per lattice axis (coords 0..n-1); edges is a
 *   SET of canonical unit-edge keys "x,y,z|x,y,z" (smaller endpoint first).
 * MOVES: { type:'toggle', key } add/remove an edge; 'clear'; 'solution'.
 * WIN: a single simple closed loop AND all three shadows acyclic.
 * RENDER: Three.js — the loop as bricks, the three live shadows on the back
 *   walls, cyclic shadow edges painted red. Drag to orbit; click an edge to
 *   toggle (raycast against fat invisible pick proxies). A keyboard cursor
 *   (arrows / W/S / Tab / Space, screen-relative) reaches the inner edges that
 *   are hard to hit with a pointer.
 *
 * As with the Rubik's example, the value below is the self-contained ES module
 * SOURCE that runs inside the sandbox; the pure logic is side-effect free so it
 * is unit-tested directly (see src/__tests__/runtime/acyclicShadowsPlugin.test.ts)
 * and a later tier can run it authoritatively in a Web Worker unchanged.
 */
export const ACYCLIC_SHADOWS_PLUGIN_SOURCE = String.raw`
const ACYCLIC = (function () {
  "use strict";

  // ---------- lattice + edge helpers (pure) ----------
  function vkey(p) { return p[0] + "," + p[1] + "," + p[2]; }
  function less3(a, b) {
    if (a[0] !== b[0]) return a[0] < b[0];
    if (a[1] !== b[1]) return a[1] < b[1];
    return a[2] < b[2];
  }
  function ekey(a, b) {
    return less3(a, b) ? vkey(a) + "|" + vkey(b) : vkey(b) + "|" + vkey(a);
  }
  function parseEdge(k) {
    var parts = k.split("|");
    return [parts[0].split(",").map(Number), parts[1].split(",").map(Number)];
  }

  // Every unit edge of an n-per-axis lattice (coords 0..n-1). Deterministic order.
  function latticeEdges(n) {
    var out = [];
    for (var x = 0; x < n; x++) for (var y = 0; y < n; y++) for (var z = 0; z < n; z++) {
      if (x + 1 < n) out.push(ekey([x, y, z], [x + 1, y, z]));
      if (y + 1 < n) out.push(ekey([x, y, z], [x, y + 1, z]));
      if (z + 1 < n) out.push(ekey([x, y, z], [x, y, z + 1]));
    }
    return out;
  }

  // ---------- union-find (returns false from union when the edge closes a cycle) ----------
  function UF() {
    var parent = {};
    function find(a) {
      if (parent[a] === undefined) { parent[a] = a; return a; }
      var root = a;
      while (parent[root] !== root) root = parent[root];
      while (parent[a] !== root) { var nx = parent[a]; parent[a] = root; a = nx; }
      return root;
    }
    return {
      find: find,
      union: function (a, b) {
        var ra = find(a), rb = find(b);
        if (ra === rb) return false;
        parent[ra] = rb; return true;
      }
    };
  }

  // ---------- single simple closed loop test ----------
  // A connected, 2-regular simple graph is exactly one cycle (and then V === E).
  function isSingleLoop(edges) {
    if (edges.length < 4) return false;
    var deg = {}, uf = UF(), verts = {};
    for (var i = 0; i < edges.length; i++) {
      var e = parseEdge(edges[i]);
      var ka = vkey(e[0]), kb = vkey(e[1]);
      deg[ka] = (deg[ka] || 0) + 1;
      deg[kb] = (deg[kb] || 0) + 1;
      verts[ka] = 1; verts[kb] = 1;
      uf.union(ka, kb);
    }
    var keys = Object.keys(verts);
    if (keys.length !== edges.length) return false;
    for (var j = 0; j < keys.length; j++) if (deg[keys[j]] !== 2) return false;
    var root = uf.find(keys[0]);
    for (var m = 1; m < keys.length; m++) if (uf.find(keys[m]) !== root) return false;
    return true;
  }

  // ---------- shadow (orthogonal projection) analysis ----------
  // drop: 0 -> YZ plane, 1 -> XZ plane, 2 -> XY plane.
  function keep2(p, drop) {
    if (drop === 0) return [p[1], p[2]];
    if (drop === 1) return [p[0], p[2]];
    return [p[0], p[1]];
  }
  function k2(p) { return p[0] + "," + p[1]; }
  function less2(a, b) { return a[0] !== b[0] ? a[0] < b[0] : a[1] < b[1]; }
  function e2key(a, b) { return less2(a, b) ? k2(a) + "|" + k2(b) : k2(b) + "|" + k2(a); }

  // The four correctness fixes that a naive cut gets wrong are marked inline.
  function analyzeShadow(edges, drop) {
    var seen = {}, list = [];
    for (var i = 0; i < edges.length; i++) {
      var e = parseEdge(edges[i]);
      var a2 = keep2(e[0], drop), b2 = keep2(e[1], drop);
      if (a2[0] === b2[0] && a2[1] === b2[1]) continue;   // FIX 1: edge parallel to dropped axis -> a POINT, skip
      var key = e2key(a2, b2);                            // FIX 2: EXACT unit-edge dedup (never collinear-merge)
      if (seen[key]) continue;
      seen[key] = 1;
      list.push({ key: key, a: a2, b: b2, closing: false });
    }
    list.sort(function (p, q) { return p.key < q.key ? -1 : (p.key > q.key ? 1 : 0); });
    var uf = UF(), closing = {};
    for (var j = 0; j < list.length; j++) {
      var it = list[j];                                   // FIX 3: shadow vertices keyed by 2D coords -> coincident projections unify
      if (!uf.union(k2(it.a), k2(it.b))) { it.closing = true; closing[it.key] = 1; } // FIX 4: union-find forest test
    }
    return { acyclic: Object.keys(closing).length === 0, edges2: list, closing: closing };
  }

  function analyze(edges) {
    var sh = [analyzeShadow(edges, 0), analyzeShadow(edges, 1), analyzeShadow(edges, 2)];
    return {
      loop: isSingleLoop(edges),
      shadows: sh,
      acyclic: (sh[0].acyclic ? 1 : 0) + (sh[1].acyclic ? 1 : 0) + (sh[2].acyclic ? 1 : 0)
    };
  }

  var PLANE_NAME = ["YZ", "XZ", "XY"];

  function isSolved(state) {
    var edges = (state && state.edges) || [];
    if (edges.length === 0) {
      return { solved: false, progress: 0, message: "Lay a closed loop of bricks on the lattice." };
    }
    var a = analyze(edges);
    if (!a.loop) {
      var deg = {}, used = {};
      for (var i = 0; i < edges.length; i++) {
        var e = parseEdge(edges[i]), ka = vkey(e[0]), kb = vkey(e[1]);
        deg[ka] = (deg[ka] || 0) + 1; deg[kb] = (deg[kb] || 0) + 1; used[ka] = 1; used[kb] = 1;
      }
      var uk = Object.keys(used), bad = 0;
      for (var j = 0; j < uk.length; j++) if (deg[uk[j]] !== 2) bad++;
      var loopiness = uk.length ? (1 - bad / uk.length) : 0;
      return {
        solved: false,
        progress: 0.35 * loopiness,
        message: "Not one closed loop yet — " + bad + " open end" + (bad === 1 ? "" : "s") + " or junction" + (bad === 1 ? "" : "s") + " to fix."
      };
    }
    if (a.acyclic === 3) {
      return { solved: true, progress: 1, message: "Solved — a closed loop whose three shadows are all trees!" };
    }
    var cyc = [];
    for (var s = 0; s < 3; s++) if (!a.shadows[s].acyclic) cyc.push(PLANE_NAME[s]);
    return {
      solved: false,
      progress: 0.4 + 0.6 * (a.acyclic / 3),
      message: "Closed loop! But the " + cyc.join(" & ") + " shadow" + (cyc.length === 1 ? "" : "s") + " still contain a cycle (red)."
    };
  }

  // ---------- embedded minimal Rickard solution (length 24, coords 0..2) ----------
  var RICKARD_VERTS = [
    [2,0,2],[2,1,2],[1,1,2],[0,1,2],[0,0,2],[0,0,1],[0,1,1],[0,2,1],[0,2,2],[1,2,2],[1,2,1],[1,2,0],
    [0,2,0],[0,1,0],[1,1,0],[2,1,0],[2,2,0],[2,2,1],[2,1,1],[2,0,1],[2,0,0],[1,0,0],[1,0,1],[1,0,2]
  ];
  function rickardEdges() {
    var out = [];
    for (var i = 0; i < RICKARD_VERTS.length; i++) {
      out.push(ekey(RICKARD_VERTS[i], RICKARD_VERTS[(i + 1) % RICKARD_VERTS.length]));
    }
    return out;
  }

  // ---------- state + moves (pure) ----------
  function initialState(ctx) {
    var params = (ctx && ctx.params) || {};
    var n = typeof params.n === "number" ? params.n : 3;
    var edges = params.start === "rickard" ? rickardEdges() : [];
    return { n: n, edges: edges };
  }

  function applyMove(state, move) {
    var n = state.n, edges = state.edges.slice();
    if (!move) return { n: n, edges: edges };
    if (move.type === "clear") return { n: n, edges: [] };
    if (move.type === "solution") return { n: n, edges: rickardEdges() };
    if (move.type === "set" && Array.isArray(move.edges)) return { n: n, edges: move.edges.slice() };
    if (move.type === "toggle" && move.key) {
      var idx = edges.indexOf(move.key);
      if (idx >= 0) edges.splice(idx, 1); else edges.push(move.key);
      return { n: n, edges: edges };
    }
    return { n: n, edges: edges };
  }

  function legalMoves(state) {
    return latticeEdges(state.n).map(function (k) { return { type: "toggle", key: k }; });
  }

  // ---------- render (WebGL via self.THREE; only runs inside the sandbox) ----------
  function mount(root, api) {
    var THREE = self.THREE;
    if (!THREE) {
      root.textContent = "Three.js was not provided to the sandbox.";
      return { update: function () {}, dispose: function () {} };
    }

    root.style.position = "relative";
    root.textContent = "";

    var state0 = api.getState();
    var n = (state0 && state0.n) || 3;

    // Undo history: a stack of previous edge-sets. Each user-driven change pushes
    // where we came from; Undo pops it and emits a 'set' move to restore it.
    var prevEdges = ((state0 && state0.edges) || []).slice();
    var history = [];
    var suppressHistory = false;
    function sameEdges(a, b) {
      if (a.length !== b.length) return false;
      var m = {}; for (var i = 0; i < a.length; i++) m[a[i]] = 1;
      for (var j = 0; j < b.length; j++) if (!m[b[j]]) return false;
      return true;
    }

    var c = (n - 1) / 2;          // center offset (lattice -> world)
    var WALL = c + 1.4;           // distance of each shadow wall from center
    var SW = WALL - 0.02;         // shadow drawn just in front of its wall (no z-fight)

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    var R = n * 2.2 + 4;
    camera.position.set(R * 0.64, R * 0.52, R * 0.78);
    camera.lookAt(0, 0, 0);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(self.devicePixelRatio || 1, 2));
    renderer.domElement.style.display = "block";
    renderer.domElement.style.cursor = "grab";
    root.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    var keyL = new THREE.DirectionalLight(0xffffff, 0.8); keyL.position.set(6, 9, 7); scene.add(keyL);
    var fillL = new THREE.DirectionalLight(0xffffff, 0.3); fillL.position.set(-6, -4, -5); scene.add(fillL);

    // Trackball orbit: drag in ANY direction spins the cube that way. The rotation
    // is composed as a quaternion about the camera's screen axes, so there's no
    // gimbal twist and no limit — you can roll it all the way around to any side.
    var ROT_SENS = 0.01;                            // rotation speed (radians per pixel dragged)
    var INIT_CAM = camera.position.clone();         // default zoom/position
    var world = new THREE.Group();
    world.rotation.set(0.34, -0.6, 0);              // pleasant default 3/4 view
    scene.add(world);
    var INIT_QUAT = world.quaternion.clone();       // restored by "Reset view"

    function w(p) { return [p[0] - c, p[1] - c, p[2] - c]; }

    // shadow walls (the far corner of a "room") — toggled by the "Hide walls" button
    var walls = [];
    function addWall(drop) {
      var size = (n - 1) + 0.6;
      var mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshBasicMaterial({ color: 0x0c0e13, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
      );
      if (drop === 2) mesh.position.set(0, 0, -WALL);
      else if (drop === 1) { mesh.position.set(0, -WALL, 0); mesh.rotation.x = Math.PI / 2; }
      else { mesh.position.set(-WALL, 0, 0); mesh.rotation.y = Math.PI / 2; }
      world.add(mesh); walls.push(mesh);
    }
    addWall(0); addWall(1); addWall(2);

    // lattice vertex dots (faint)
    var dotGeo = new THREE.SphereGeometry(0.05, 8, 8);
    var dotMat = new THREE.MeshBasicMaterial({ color: 0x39404e });
    for (var dx = 0; dx < n; dx++) for (var dy = 0; dy < n; dy++) for (var dz = 0; dz < n; dz++) {
      var dot = new THREE.Mesh(dotGeo, dotMat);
      var dp = w([dx, dy, dz]); dot.position.set(dp[0], dp[1], dp[2]); world.add(dot);
    }

    // candidate edges: shared geometry per axis; faint guide + brick (on when active) + invisible pick proxy
    var ACTIVE = 0xffb000, ACTIVE_BAD = 0xff3b3b, GUIDE_COL = 0x2b3340;
    function boxByAxis(ax, lng, thin) {
      return new THREE.BoxGeometry(ax === 0 ? lng : thin, ax === 1 ? lng : thin, ax === 2 ? lng : thin);
    }
    var guideGeo = [boxByAxis(0, 1, 0.04), boxByAxis(1, 1, 0.04), boxByAxis(2, 1, 0.04)];
    var brickGeo = [boxByAxis(0, 1, 0.20), boxByAxis(1, 1, 0.20), boxByAxis(2, 1, 0.20)];
    var proxyGeo = [boxByAxis(0, 1, 0.42), boxByAxis(1, 1, 0.42), boxByAxis(2, 1, 0.42)];
    var guideMat = new THREE.MeshBasicMaterial({ color: GUIDE_COL });
    var proxyMat = new THREE.MeshBasicMaterial({ visible: false });

    var edgeObjs = {};
    var proxies = [];
    var edgeKeys = latticeEdges(n);
    for (var ei = 0; ei < edgeKeys.length; ei++) {
      var ek = edgeKeys[ei];
      var pe = parseEdge(ek);
      var wa = w(pe[0]), wb = w(pe[1]);
      var mid = [(wa[0] + wb[0]) / 2, (wa[1] + wb[1]) / 2, (wa[2] + wb[2]) / 2];
      var ax = pe[0][0] !== pe[1][0] ? 0 : (pe[0][1] !== pe[1][1] ? 1 : 2);

      var guide = new THREE.Mesh(guideGeo[ax], guideMat);
      guide.position.set(mid[0], mid[1], mid[2]); world.add(guide);

      var bmat = new THREE.MeshStandardMaterial({ color: ACTIVE, roughness: 0.42, metalness: 0.0 });
      var brick = new THREE.Mesh(brickGeo[ax], bmat);
      brick.position.set(mid[0], mid[1], mid[2]); brick.visible = false; world.add(brick);

      var proxy = new THREE.Mesh(proxyGeo[ax], proxyMat);
      proxy.position.set(mid[0], mid[1], mid[2]); proxy.userData.key = ek; world.add(proxy); proxies.push(proxy);

      edgeObjs[ek] = { brick: brick, bmat: bmat };
    }

    // ---- keyboard cursor: a highlighted edge you steer with the keys ----
    // Inner edges are awkward to hit with a pointer, so the cursor renders with
    // depth-test OFF (always visible, even inside the lattice) and is moved with
    // arrows / W/S, turned with Tab, and toggled with Space — no precise click needed.
    var cursorGeo = [boxByAxis(0, 1.04, 0.3), boxByAxis(1, 1.04, 0.3), boxByAxis(2, 1.04, 0.3)];
    var curMeshes = [];
    for (var ci = 0; ci < 3; ci++) {
      var cm = new THREE.Mesh(cursorGeo[ci], new THREE.MeshBasicMaterial({
        color: 0x4db8ff, transparent: true, opacity: 0.45, depthTest: false, depthWrite: false
      }));
      cm.renderOrder = 10; cm.visible = false; world.add(cm); curMeshes.push(cm);
    }
    var mid0 = Math.floor((n - 1) / 2);
    var cur = { p: [mid0, mid0, mid0], ax: 0, on: false };
    function clampCur() {
      for (var i = 0; i < 3; i++) {
        var max = (i === cur.ax) ? n - 2 : n - 1;   // base vertex of an ax-edge can't sit on the far face
        if (cur.p[i] < 0) cur.p[i] = 0;
        if (cur.p[i] > max) cur.p[i] = max;
      }
    }
    function cursorKey() {
      var b = cur.p.slice(); b[cur.ax] += 1;
      return ekey(cur.p, b);
    }
    function updateCursor() {
      for (var i = 0; i < 3; i++) curMeshes[i].visible = cur.on && i === cur.ax;
      if (cur.on) {
        var b = cur.p.slice(); b[cur.ax] += 1;
        var wa = w(cur.p), wb = w(b);
        curMeshes[cur.ax].position.set((wa[0] + wb[0]) / 2, (wa[1] + wb[1]) / 2, (wa[2] + wb[2]) / 2);
      }
      invalidate();
    }

    // shadow line segments (rebuilt each update; tiny graphs, cheap)
    var shadowGroup = new THREE.Group(); world.add(shadowGroup);
    function clearShadow() {
      for (var i = shadowGroup.children.length - 1; i >= 0; i--) {
        var ch = shadowGroup.children[i];
        shadowGroup.remove(ch);
        if (ch.geometry) ch.geometry.dispose();
        if (ch.material) ch.material.dispose();
      }
    }
    function shadowWorld(p2, drop) {
      if (drop === 2) return [p2[0] - c, p2[1] - c, -SW];
      if (drop === 1) return [p2[0] - c, -SW, p2[1] - c];
      return [-SW, p2[0] - c, p2[1] - c];
    }
    function buildShadow(shadow, drop) {
      var greenPos = [], redPos = [];
      for (var i = 0; i < shadow.edges2.length; i++) {
        var it = shadow.edges2[i];
        var A = shadowWorld(it.a, drop), B = shadowWorld(it.b, drop);
        var arr = it.closing ? redPos : greenPos;
        arr.push(A[0], A[1], A[2], B[0], B[1], B[2]);
      }
      function seg(pos, color) {
        if (!pos.length) return;
        var g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        shadowGroup.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: color })));
      }
      seg(greenPos, shadow.acyclic ? 0x46d17a : 0x9aa6b2);
      seg(redPos, 0xff3b3b);
    }

    var dirty = true;
    function invalidate() { dirty = true; }

    // ---- zoom: dolly the camera toward/away from the origin it looks at ----
    var camMinDist = R * 0.45, camMaxDist = R * 3.0;
    function zoomBy(factor) {
      var d = camera.position.length();
      var nd = Math.max(camMinDist, Math.min(camMaxDist, d * factor));
      if (nd !== d) { camera.position.multiplyScalar(nd / d); invalidate(); }
    }

    // ---- reset the view (orbit + zoom) back to its default ----
    function resetView() {
      world.quaternion.copy(INIT_QUAT);
      camera.position.copy(INIT_CAM);
      camera.lookAt(0, 0, 0);
      invalidate();
    }

    // DOM overlay: status line + buttons
    var ui = document.createElement("div");
    ui.style.cssText = "position:absolute;left:0;right:0;bottom:8px;display:flex;flex-direction:column;align-items:center;gap:6px;font-family:system-ui,sans-serif;pointer-events:none";
    var status = document.createElement("div");
    status.style.cssText = "max-width:92%;text-align:center;font-size:12px;font-weight:600;color:#e8e8ea;background:rgba(20,22,28,0.72);padding:5px 10px;border-radius:7px";
    var bar = document.createElement("div");
    bar.style.cssText = "display:flex;flex-wrap:wrap;justify-content:center;gap:6px;pointer-events:auto";
    function mkBtn(label, fn) {
      var b = document.createElement("button");
      b.textContent = label;
      b.style.cssText = "padding:9px 13px;min-height:40px;font-size:14px;font-weight:600;color:#e8e8ea;background:#262a33;border:1px solid #3a3f4b;border-radius:8px;cursor:pointer;touch-action:manipulation";
      b.onmouseenter = function () { b.style.background = "#30353f"; };
      b.onmouseleave = function () { b.style.background = "#262a33"; };
      b.onclick = fn; bar.appendChild(b); return b;
    }
    var undoBtn = mkBtn("Undo", function () {
      if (!history.length) return;
      suppressHistory = true;
      api.emitMove({ type: "set", edges: history.pop() });
    });
    mkBtn("Clear", function () { api.emitMove({ type: "clear" }); });
    // "Show solution" is admin-only. The host injects the current viewer's admin
    // status as api.params.isAdmin (the sandbox can't read auth on its own).
    if (api.params && api.params.isAdmin) {
      mkBtn("Show solution", function () { api.emitMove({ type: "solution" }); });
    }
    mkBtn("Zoom in", function () { zoomBy(1 / 1.15); });
    mkBtn("Zoom out", function () { zoomBy(1.15); });
    mkBtn("Reset view", function () { resetView(); });
    var wallsVisible = true;
    var wallsBtn = mkBtn("Hide walls", function () {
      wallsVisible = !wallsVisible;
      for (var wi = 0; wi < walls.length; wi++) walls[wi].visible = wallsVisible;
      shadowGroup.visible = wallsVisible;        // also hide/show the shadows drawn on the walls
      wallsBtn.textContent = wallsVisible ? "Hide walls" : "Show walls";
      invalidate();
    });
    ui.appendChild(status); ui.appendChild(bar);
    // keyboard hint — pointless on touch devices, so only show for fine pointers
    if (!(self.matchMedia && self.matchMedia("(pointer: coarse)").matches)) {
      var hint = document.createElement("div");
      hint.style.cssText = "max-width:92%;text-align:center;font-size:11px;color:#9aa6b2;background:rgba(20,22,28,0.6);padding:3px 9px;border-radius:6px";
      hint.textContent = "Click the puzzle, then: arrows move the highlight · W/S deeper/closer · Tab turns it · Space places/removes · Esc hides";
      ui.appendChild(hint);
    }
    root.appendChild(ui);

    // orbit (drag) + pick (click). A small movement threshold separates the two.
    var dragging = false, moved = 0, lx = 0, ly = 0, pinch = 0;
    var raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
    // On touchend, e.touches is empty — the released point lives in
    // changedTouches. Without this, tap-to-toggle reads undefined coords and
    // silently fails on touch.
    function pt(e) {
      return (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
    }
    function touchDist(e) {
      var a = e.touches[0], b = e.touches[1];
      var dx = a.clientX - b.clientX, dy = a.clientY - b.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    function down(e) {
      // pull keyboard focus onto the canvas so the cursor keys work right away
      // (and so Space stops re-clicking a previously focused button)
      if (renderer.domElement.focus) renderer.domElement.focus({ preventScroll: true });
      if (e.touches && e.touches.length >= 2) { pinch = touchDist(e); dragging = false; return; }
      dragging = true; moved = 0; var p = pt(e); lx = p.clientX; ly = p.clientY; renderer.domElement.style.cursor = "grabbing";
    }
    function move(e) {
      if (e.touches && e.touches.length >= 2) {            // pinch-to-zoom
        var nd = touchDist(e);
        if (pinch > 0 && nd > 0) zoomBy(pinch / nd);       // fingers spread (nd>pinch) -> factor<1 -> zoom in
        pinch = nd; invalidate(); return;
      }
      if (!dragging) return;
      var p = pt(e);
      var dx = p.clientX - lx, dy = p.clientY - ly;
      moved += Math.abs(dx) + Math.abs(dy);
      // rotate about the camera's own right/up axes (expressed in world space) so the
      // cube always follows the drag, from any current orientation.
      var right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      var up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      var q = new THREE.Quaternion().setFromAxisAngle(up, dx * ROT_SENS);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(right, dy * ROT_SENS));
      world.quaternion.premultiply(q);
      lx = p.clientX; ly = p.clientY; invalidate();
    }
    function up(e) {
      // Slightly looser tap threshold for touch (fingers jitter more than a mouse).
      if (dragging && moved < 10) pick(e);
      dragging = false; pinch = 0; renderer.domElement.style.cursor = "grab";
    }
    function onWheel(e) { e.preventDefault(); zoomBy(e.deltaY > 0 ? 1.1 : 0.9); }
    function pick(e) {
      var p = pt(e), rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((p.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((p.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      var hits = raycaster.intersectObjects(proxies, false);
      if (hits.length) {
        var hitKey = hits[0].object.userData.key;
        var hp = parseEdge(hitKey);                 // ekey puts the lesser endpoint first
        cur.p = hp[0].slice();
        cur.ax = hp[0][0] !== hp[1][0] ? 0 : (hp[0][1] !== hp[1][1] ? 1 : 2);
        // snap the cursor here (click an easy edge, arrow inward) — but never
        // SHOW it for touch taps: there is no keyboard to drive or dismiss it
        if (!(e.changedTouches || e.touches)) cur.on = true;
        updateCursor();
        api.emitMove({ type: "toggle", key: hitKey });
      }
    }
    renderer.domElement.addEventListener("mousedown", down);
    self.addEventListener("mousemove", move);
    self.addEventListener("mouseup", up);
    renderer.domElement.addEventListener("touchstart", down, { passive: true });
    self.addEventListener("touchmove", move, { passive: true });
    self.addEventListener("touchend", up);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    // keyboard: steer the cursor (see cursor block above). Arrows move in the
    // SCREEN plane and W/S along screen depth — each press maps them onto
    // whichever lattice axes currently face those directions, so the keys keep
    // doing what they look like they do no matter how the cube is rotated.
    renderer.domElement.tabIndex = 0;
    renderer.domElement.style.outline = "none";
    function axisFor(target, used) {
      var bi = -1, bd = 0;
      for (var i = 0; i < 3; i++) {
        if (used[i]) continue;
        var axv = new THREE.Vector3(i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0).applyQuaternion(world.quaternion);
        var d = axv.dot(target);
        if (bi < 0 || Math.abs(d) > Math.abs(bd)) { bi = i; bd = d; }
      }
      used[bi] = true;
      return { axis: bi, sign: bd >= 0 ? 1 : -1 };
    }
    function axisMap() {
      var used = [false, false, false];             // greedy, no reuse -> three distinct axes
      return {
        right: axisFor(new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion), used),
        up: axisFor(new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion), used),
        fwd: axisFor(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion), used)
      };
    }
    function stepCur(d, m) { cur.p[d.axis] += d.sign * m; clampCur(); }
    function onKey(e) {
      var tag = e.target && e.target.tagName;
      if (tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA") return;  // UI keeps its own keys
      if (e.ctrlKey || e.metaKey || e.altKey) return;   // never hijack browser shortcuts (Ctrl+R, Cmd+Arrow, ...)
      var k = e.key;
      if (k === "Escape") { if (cur.on) { cur.on = false; updateCursor(); } return; }
      // Tab only turns the cursor while it is shown — so Esc releases it and a
      // further Tab moves focus to the buttons (no permanent focus trap).
      if (k === "Tab" && (!cur.on || e.shiftKey)) return;
      // arrows may auto-repeat (hold to traverse); placing/turning must not
      var movement = k === "ArrowLeft" || k === "ArrowRight" || k === "ArrowUp" || k === "ArrowDown" ||
                     k === "PageUp" || k === "PageDown" || "wWsS".indexOf(k) >= 0;
      if (e.repeat && !movement) { e.preventDefault(); return; }
      var nav = axisMap(), wasOn = cur.on, handled = true;
      if (!wasOn) {
        // first press only reveals the cursor (no move/toggle), so nothing jumps
        handled = movement || k === " " || k === "Enter" || "rRxXyYzZ".indexOf(k) >= 0;
      }
      else if (k === "ArrowRight") stepCur(nav.right, 1);
      else if (k === "ArrowLeft") stepCur(nav.right, -1);
      else if (k === "ArrowUp") stepCur(nav.up, 1);
      else if (k === "ArrowDown") stepCur(nav.up, -1);
      else if (k === "PageUp" || k === "w" || k === "W") stepCur(nav.fwd, 1);     // deeper (away from you)
      else if (k === "PageDown" || k === "s" || k === "S") stepCur(nav.fwd, -1);  // closer
      else if (k === "Tab" || k === "r" || k === "R") { cur.ax = (cur.ax + 1) % 3; clampCur(); }
      else if (k === "x" || k === "X") { cur.ax = 0; clampCur(); }
      else if (k === "y" || k === "Y") { cur.ax = 1; clampCur(); }
      else if (k === "z" || k === "Z") { cur.ax = 2; clampCur(); }
      else if (k === " " || k === "Enter") api.emitMove({ type: "toggle", key: cursorKey() });
      else handled = false;
      if (!handled) return;
      e.preventDefault();
      cur.on = true;
      updateCursor();
    }
    self.addEventListener("keydown", onKey);

    function update(stateNow) {
      var edges = (stateNow && stateNow.edges) || [];

      // history bookkeeping: record the prior edge-set unless this update IS an undo
      if (suppressHistory) { suppressHistory = false; }
      else if (!sameEdges(edges, prevEdges)) { history.push(prevEdges); }
      prevEdges = edges.slice();
      undoBtn.style.opacity = history.length ? "1" : "0.45";

      var eset = {}; for (var i = 0; i < edges.length; i++) eset[edges[i]] = 1;
      var a = analyze(edges);

      // 3D edges that close a cycle in some shadow -> paint red
      var cyc3d = {};
      for (var s = 0; s < 3; s++) {
        var closing = a.shadows[s].closing;
        for (var k = 0; k < edges.length; k++) {
          var pe2 = parseEdge(edges[k]);
          var u2 = keep2(pe2[0], s), v2 = keep2(pe2[1], s);
          if (u2[0] === v2[0] && u2[1] === v2[1]) continue;
          if (closing[e2key(u2, v2)]) cyc3d[edges[k]] = 1;
        }
      }

      for (var key in edgeObjs) {
        if (!Object.prototype.hasOwnProperty.call(edgeObjs, key)) continue;
        var o = edgeObjs[key], on = !!eset[key];
        o.brick.visible = on;
        if (on) o.bmat.color.set(cyc3d[key] ? ACTIVE_BAD : ACTIVE);
      }

      clearShadow();
      buildShadow(a.shadows[0], 0); buildShadow(a.shadows[1], 1); buildShadow(a.shadows[2], 2);

      var verdict = isSolved(stateNow);
      status.textContent = verdict.message;
      status.style.color = verdict.solved ? "#46d17a" : "#e8e8ea";
      invalidate();
    }

    var raf = 0;
    function resize() {
      var wpx = root.clientWidth || 420, hpx = root.clientHeight || 420;
      renderer.setSize(wpx, hpx, false);
      camera.aspect = wpx / hpx; camera.updateProjectionMatrix(); invalidate();
    }
    function loop() { raf = self.requestAnimationFrame(loop); if (dirty) { dirty = false; renderer.render(scene, camera); } }
    var ro = (typeof ResizeObserver !== "undefined") ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(root); else self.addEventListener("resize", resize);
    resize();
    update(state0);
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
        self.removeEventListener("keydown", onKey);
        renderer.domElement.removeEventListener("wheel", onWheel);
        if (ro) ro.disconnect();
        clearShadow();
        world.traverse(function (obj) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(function (m) { m.dispose(); });
            else obj.material.dispose();
          }
        });
        renderer.dispose();
        root.textContent = "";
      }
    };
  }

  return {
    meta: {
      title: "Acyclic Shadows",
      instructions: "Click lattice edges to lay one closed loop of bricks. You win when the loop's three shadows (on the back walls) are all trees — no cycle in any shadow. Drag to orbit; 'Show solution' reveals Rickard's minimal loop. Keyboard (click the puzzle first): arrow keys move the highlighted edge, W/S push it deeper/closer, Tab turns it, Space places or removes a brick — the easy way to reach inner edges.",
      supportsUndo: true,
      rngSeedable: false
    },
    initialState: initialState,
    applyMove: applyMove,
    legalMoves: legalMoves,
    isSolved: isSolved,
    render: { mount: mount },
    // exposed for unit tests (host ignores extra keys)
    _rickardEdges: rickardEdges,
    _analyze: analyze,
    _isSingleLoop: isSingleLoop,
    _latticeEdges: latticeEdges
  };
})();

export default ACYCLIC;
`;
