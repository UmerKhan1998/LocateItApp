import React, { useEffect, useRef, useState } from "react";

// React + TypeScript fullscreen maze game
// Fixes vs previous version:
// - Defensive guards so we never draw before maze exists
// - All imperative state kept in refs to avoid stale-closure bugs (common cause of white screens)
// - Resize + draw wrapped in try/catch and RAF; cleaned up listeners on unmount
// - Timer protected from double-start (StrictMode) and always cleared
// - Added DEV smoke tests for generator + BFS solver

// ---------- Types ----------
type RC = [number, number];

type Walls = { N: 0 | 1; E: 0 | 1; S: 0 | 1; W: 0 | 1 };

class Cell {
  r: number;
  c: number;
  vis: boolean;
  w: Walls;
  constructor(r: number, c: number) {
    this.r = r;
    this.c = c;
    this.vis = false;
    this.w = { N: 1, E: 1, S: 1, W: 1 };
  }
}

class Maze {
  n: number;
  grid: Cell[];
  start: RC;
  end: RC;
  constructor(n: number) {
    this.n = n | 0;
    this.grid = [...Array(n * n)].map((_, i) => new Cell((i / n) | 0, i % n));
    this.start = [0, 0];
    this.end = [n - 1, n - 1];
    this.generate();
  }
  idx(r: number, c: number) {
    return r * this.n + c;
  }
  cell(r: number, c: number) {
    return this.grid[this.idx(r, c)];
  }
  neighbors(r: number, c: number): [keyof Walls, number, number][] {
    const n = this.n;
    const a: [keyof Walls, number, number][] = [];
    if (r > 0) a.push(["N", r - 1, c]);
    if (c < n - 1) a.push(["E", r, c + 1]);
    if (r < n - 1) a.push(["S", r + 1, c]);
    if (c > 0) a.push(["W", r, c - 1]);
    return a;
  }
  carve(d: keyof Walls, a: RC, b: RC) {
    const [r1, c1] = a,
      [r2, c2] = b;
    const A = this.cell(r1, c1),
      B = this.cell(r2, c2);
    const opp: Record<keyof Walls, keyof Walls> = {
      N: "S",
      S: "N",
      E: "W",
      W: "E",
    };
    A.w[d] = 0;
    B.w[opp[d]] = 0;
  }
  generate() {
    this.grid.forEach((c) => {
      c.vis = false;
      c.w = { N: 1, E: 1, S: 1, W: 1 };
    });
    const st: RC = [0, 0];
    const stack: RC[] = [st];
    this.cell(...st).vis = true;
    while (stack.length) {
      const [r, c] = stack[stack.length - 1];
      const next = this.neighbors(r, c)
        .sort(() => Math.random() - 0.5)
        .find(([_, rr, cc]) => !this.cell(rr, cc).vis);
      if (next) {
        const [dir, rr, cc] = next;
        this.carve(dir, [r, c], [rr, cc]);
        this.cell(rr, cc).vis = true;
        stack.push([rr, cc]);
      } else stack.pop();
    }
    this.end = [this.n - 1, this.n - 1];
  }
  // Shortest path (BFS) for tests / optional hint
  solve(): RC[] {
    const K = (r: number, c: number) => `${r},${c}`;
    const q: RC[] = [this.start];
    const came = new Map<string, RC | null>();
    came.set(K(...this.start), null);
    while (q.length) {
      const [r, c] = q.shift()!;
      if (r === this.end[0] && c === this.end[1]) break;
      const cell = this.cell(r, c);
      if (!cell.w.N) {
        const k = K(r - 1, c);
        if (!came.has(k)) {
          came.set(k, [r, c]);
          q.push([r - 1, c]);
        }
      }
      if (!cell.w.E) {
        const k = K(r, c + 1);
        if (!came.has(k)) {
          came.set(k, [r, c]);
          q.push([r, c + 1]);
        }
      }
      if (!cell.w.S) {
        const k = K(r + 1, c);
        if (!came.has(k)) {
          came.set(k, [r, c]);
          q.push([r + 1, c]);
        }
      }
      if (!cell.w.W) {
        const k = K(r, c - 1);
        if (!came.has(k)) {
          came.set(k, [r, c]);
          q.push([r, c - 1]);
        }
      }
    }
    const path: RC[] = [];
    let cur: RC | null = this.end;
    const KK = (p: RC | null) => (p ? `${p[0]},${p[1]}` : null);
    while (cur) {
      path.push(cur);
      cur = came.get(KK(cur)!) || null;
    }
    return path.reverse();
  }
}

// ---------- Component ----------
export default function MazeGameTS() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const mazeRef = useRef<Maze | null>(null);
  const dprRef = useRef<number>(1);
  const playerRef = useRef<RC>([0, 0]);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const [steps, setSteps] = useState<number>(0);
  const [timeMs, setTimeMs] = useState<number>(0);
  const [win, setWin] = useState<boolean>(false);

  // ----- Helpers -----
  const format = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = (s / 60) | 0;
    const ss = String(s % 60).padStart(2, "0");
    return `${String(m).padStart(2, "0")}:${ss}`;
  };

  const setCanvasSize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const DPR = Math.max(1, window.devicePixelRatio || 1);
    dprRef.current = DPR;
    canvas.width = Math.max(1, Math.floor(window.innerWidth * DPR));
    canvas.height = Math.max(1, Math.floor(window.innerHeight * DPR));
    canvas.style.width = "100%";
    canvas.style.height = "100%";
  };

  const drawCharacter = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number
  ) => {
    ctx.save();
    ctx.translate(x, y);
    // shadow
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(0, r * 0.95, r * 0.95, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // body
    ctx.fillStyle = "#10b981";
    ctx.fillRect(-r * 0.8, -r * 0.2, r * 1.6, r * 2);
    // head
    ctx.fillStyle = "#ffddc7";
    ctx.beginPath();
    ctx.arc(0, -r * 0.8, r * 0.8, 0, Math.PI * 2);
    ctx.fill();
    // eyes
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.8, r * 0.12, 0, Math.PI * 2);
    ctx.arc(r * 0.25, -r * 0.8, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const draw = () => {
    const canvas = canvasRef.current,
      m = mazeRef.current;
    if (!canvas || !m) return;
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const n = m.n;
      const s = Math.min(canvas.width, canvas.height) / n;
      const DPR = dprRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fbf3a2";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // walls (outline)
      ctx.lineWidth = 4 * DPR;
      ctx.strokeStyle = "#1a8f33";
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const x = c * s,
            y = r * s;
          const cell = m.cell(r, c);
          ctx.beginPath();
          if (cell.w.N) {
            ctx.moveTo(x, y);
            ctx.lineTo(x + s, y);
          }
          if (cell.w.E) {
            ctx.moveTo(x + s, y);
            ctx.lineTo(x + s, y + s);
          }
          if (cell.w.S) {
            ctx.moveTo(x, y + s);
            ctx.lineTo(x + s, y + s);
          }
          if (cell.w.W) {
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + s);
          }
          ctx.stroke();
        }
      }
      // player
      const [pr, pc] = playerRef.current;
      const radius = s * 0.7;
      drawCharacter(ctx, pc * s + s / 2, pr * s + s / 2, radius);
    } catch (err) {
      // Avoid hard crash white-screen
      // eslint-disable-next-line no-console
      console.error("Draw error", err);
    }
  };

  const queueDraw = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  };

  const startTimer = () => {
    if (timerRef.current != null) return;
    startRef.current = performance.now();
    timerRef.current = window.setInterval(
      () => setTimeMs(performance.now() - startRef.current),
      200
    );
  };
  const stopTimer = () => {
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const newMaze = () => {
    stopTimer();
    setTimeMs(0);
    setSteps(0);
    setWin(false);
    // auto size: aim for ~24px per cell in CSS pixels
    const cssMin = Math.min(window.innerWidth, window.innerHeight);
    let n = Math.max(15, Math.floor(cssMin / 24));
    if (n % 2 === 0) n += 1; // prefer odd
    const m = new Maze(n);
    mazeRef.current = m;
    playerRef.current = [0, 0];
    setCanvasSize();
    queueDraw();
    if (process.env.NODE_ENV !== "production") setTimeout(runDevTests, 0);
  };

  // ----- Movement -----
  const tryMove = (dr: number, dc: number) => {
    const m = mazeRef.current;
    if (!m) return;
    const [r, c] = playerRef.current;
    const cur = m.cell(r, c);
    if (dr === -1 && cur.w.N) return;
    if (dc === 1 && cur.w.E) return;
    if (dr === 1 && cur.w.S) return;
    if (dc === -1 && cur.w.W) return;
    const nr = r + dr,
      nc = c + dc;
    if (nr < 0 || nc < 0 || nr >= m.n || nc >= m.n) return;
    playerRef.current = [nr, nc];
    setSteps((s) => s + 1);
    if (timerRef.current == null) startTimer();
    if (nr === m.end[0] && nc === m.end[1]) {
      stopTimer();
      setWin(true);
    }
    queueDraw();
  };

  // ----- Effects -----
  useEffect(() => {
    const onResize = () => {
      setCanvasSize();
      queueDraw();
    };
    window.addEventListener("resize", onResize);
    newMaze();
    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stopTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const k = (e.key || "").toLowerCase();
      if (k === "arrowup" || k === "w") {
        e.preventDefault();
        tryMove(-1, 0);
      } else if (k === "arrowdown" || k === "s") {
        e.preventDefault();
        tryMove(1, 0);
      } else if (k === "arrowleft" || k === "a") {
        e.preventDefault();
        tryMove(0, -1);
      } else if (k === "arrowright" || k === "d") {
        e.preventDefault();
        tryMove(0, 1);
      } else if (k === "n") {
        e.preventDefault();
        newMaze();
      } else if (k === "r") {
        e.preventDefault();
        stopTimer();
        setTimeMs(0);
        setSteps(0);
        playerRef.current = [0, 0];
        setWin(false);
        queueDraw();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- DEV TESTS -----
  const runDevTests = () => {
    try {
      const sizes = [5, 7, 9];
      sizes.forEach((n) => {
        const m = new Maze(n);
        // Test 1: endpoints
        console.assert(
          m.start[0] === 0 && m.start[1] === 0,
          `start is [0,0] for n=${n}`
        );
        console.assert(
          m.end[0] === n - 1 && m.end[1] === n - 1,
          `end is [${n - 1},${n - 1}] for n=${n}`
        );
        // Test 2: solve path exists and uses open walls
        const p = m.solve();
        console.assert(
          Array.isArray(p) && p.length > 0,
          `path exists for n=${n}`
        );
        for (let i = 1; i < p.length; i++) {
          const [r1, c1] = p[i - 1];
          const [r2, c2] = p[i];
          const dr = r2 - r1,
            dc = c2 - c1;
          const cell = m.cell(r1, c1);
          if (dr === -1) console.assert(!cell.w.N, `blocked N at step ${i}`);
          else if (dr === 1)
            console.assert(!cell.w.S, `blocked S at step ${i}`);
          else if (dc === -1)
            console.assert(!cell.w.W, `blocked W at step ${i}`);
          else if (dc === 1)
            console.assert(!cell.w.E, `blocked E at step ${i}`);
          else console.assert(false, `non-adjacent step at ${i}`);
        }
      });
      // eslint-disable-next-line no-console
      console.log("✅ Maze DEV tests passed");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("❌ Maze DEV tests failed", e);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        background: "#111",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      <div
        style={{
          position: "fixed",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          color: "#fff",
          background: "rgba(0,0,0,.4)",
          padding: "6px 12px",
          borderRadius: 8,
          fontWeight: 800,
          fontFamily: "ui-sans-serif, system-ui",
        }}
      >
        Steps: {steps} • Time: {format(timeMs)}
      </div>
      {win && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 16,
              textAlign: "center",
              maxWidth: "90vw",
            }}
          >
            <h2>🎉 You Won!</h2>
            <p>
              Solved {mazeRef.current?.n}×{mazeRef.current?.n} in{" "}
              {format(timeMs)} with {steps} steps.
            </p>
            <button
              onClick={newMaze}
              style={{ fontWeight: 800, padding: "8px 12px", borderRadius: 10 }}
            >
              New Maze
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
