"use client";

import { cn } from "~/lib/utils";

// Type definitions
interface OscillatorOptions {
  phase?: number;
  offset?: number;
  frequency?: number;
  amplitude?: number;
}

interface NodeType {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface LineOptions {
  spring?: number;
}

interface Position {
  x: number;
  y: number;
}

interface CanvasContext extends CanvasRenderingContext2D {
  running: boolean;
  frame: number;
}

// Global variables with proper types
let ctx: CanvasContext;
let f: Oscillator;
let e = 0;
let pos: Position = { x: 0, y: 0 };
let lines: Line[] = [];

const E = {
  debug: true,
  friction: 0.5,
  trails: 80,
  size: 50,
  dampening: 0.025,
  tension: 0.99,
};

// Oscillator class
class Oscillator {
  phase: number;
  offset: number;
  frequency: number;
  amplitude: number;

  constructor(options: OscillatorOptions = {}) {
    this.phase = options.phase || 0;
    this.offset = options.offset || 0;
    this.frequency = options.frequency || 0.001;
    this.amplitude = options.amplitude || 1;
  }

  update(): number {
    this.phase += this.frequency;
    e = this.offset + Math.sin(this.phase) * this.amplitude;
    return e;
  }

  value(): number {
    return e;
  }
}

// Node class
class Node implements NodeType {
  x: number;
  y: number;
  vx: number;
  vy: number;

  constructor() {
    this.x = 0;
    this.y = 0;
    this.vy = 0;
    this.vx = 0;
  }
}

// Line class
class Line {
  spring: number;
  friction: number;
  nodes: Node[];

  constructor(options: LineOptions = {}) {
    this.spring = (options.spring || 0.45) + 0.1 * Math.random() - 0.05;
    this.friction = E.friction + 0.01 * Math.random() - 0.005;
    this.nodes = [];
    
    for (let n = 0; n < E.size; n++) {
      const node = new Node();
      node.x = pos.x;
      node.y = pos.y;
      this.nodes.push(node);
    }
  }

  update(): void {
    let springForce = this.spring;
    let node = this.nodes[0];
    
    node.vx += (pos.x - node.x) * springForce;
    node.vy += (pos.y - node.y) * springForce;
    
    for (let i = 0; i < this.nodes.length; i++) {
      node = this.nodes[i];
      
      if (i > 0) {
        const prevNode = this.nodes[i - 1];
        node.vx += (prevNode.x - node.x) * springForce;
        node.vy += (prevNode.y - node.y) * springForce;
        node.vx += prevNode.vx * E.dampening;
        node.vy += prevNode.vy * E.dampening;
      }
      
      node.vx *= this.friction;
      node.vy *= this.friction;
      node.x += node.vx;
      node.y += node.vy;
      springForce *= E.tension;
    }
  }

  draw(): void {
    const n = this.nodes[0].x;
    const i = this.nodes[0].y;
    
    ctx.beginPath();
    ctx.moveTo(n, i);
    
    let a = 1;
    const o = this.nodes.length - 2;
    
    for (; a < o; a++) {
      const e = this.nodes[a];
      const t = this.nodes[a + 1];
      const n = 0.5 * (e.x + t.x);
      const i = 0.5 * (e.y + t.y);
      ctx.quadraticCurveTo(e.x, e.y, n, i);
    }
    
    const e = this.nodes[a];
    const t = this.nodes[a + 1];
    ctx.quadraticCurveTo(e.x, e.y, t.x, t.y);
    ctx.stroke();
    ctx.closePath();
  }
}

// Event handlers
function onMousemove(e: MouseEvent | TouchEvent): void {
  function initializeLines(): void {
    lines = [];
    for (let i = 0; i < E.trails; i++) {
      lines.push(new Line({ spring: 0.45 + (i / E.trails) * 0.025 }));
    }
  }

  function handleMove(e: MouseEvent | TouchEvent): void {
    if ('touches' in e && e.touches) {
      pos.x = e.touches[0].pageX;
      pos.y = e.touches[0].pageY;
    } else if ('clientX' in e) {
      pos.x = e.clientX;
      pos.y = e.clientY;
    }
    e.preventDefault();
  }

  function handleTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      pos.x = e.touches[0].pageX;
      pos.y = e.touches[0].pageY;
    }
  }

  document.removeEventListener("mousemove", onMousemove);
  document.removeEventListener("touchstart", onMousemove);
  document.addEventListener("mousemove", handleMove as EventListener);
  document.addEventListener("touchmove", handleMove as EventListener);
  document.addEventListener("touchstart", handleTouchStart);
  
  handleMove(e);
  initializeLines();
  render();
}

function render(): void {
  if (ctx?.running) {
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `hsla(${Math.round(f.update())},100%,50%,0.025)`;
    ctx.lineWidth = 10;
    
    for (let t = 0; t < E.trails; t++) {
      const line = lines[t];
      if (line) {
        line.update();
        line.draw();
      }
    }
    
    ctx.frame++;
    window.requestAnimationFrame(render);
  }
}

function resizeCanvas(): void {
  if (ctx) {
    ctx.canvas.width = window.innerWidth - 20;
    ctx.canvas.height = window.innerHeight;
  }
}

// renderCanvas function
const renderCanvas = function (): void {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  if (!canvas) return;
  
  const context = canvas.getContext("2d");
  if (!context) return;
  
  ctx = context as CanvasContext;
  ctx.running = true;
  ctx.frame = 1;
  
  f = new Oscillator({
    phase: Math.random() * 2 * Math.PI,
    amplitude: 85,
    frequency: 0.0015,
    offset: 285,
  });
  
  document.addEventListener("mousemove", onMousemove as EventListener);
  document.addEventListener("touchstart", onMousemove as EventListener);
  document.body.addEventListener("orientationchange", resizeCanvas);
  window.addEventListener("resize", resizeCanvas);
  
  window.addEventListener("focus", () => {
    if (ctx && !ctx.running) {
      ctx.running = true;
      render();
    }
  });
  
  window.addEventListener("blur", () => {
    if (ctx) {
      ctx.running = false;
    }
  });
  
  resizeCanvas();
};

import { ReactTyped } from "react-typed";

interface TypeWriterProps {
  strings: string[];
}


const TypeWriter = ({ strings }: TypeWriterProps) => {
  return (
    <ReactTyped
      loop
      typeSpeed={80}
      backSpeed={20}
      strings={strings}
      smartBackspace
      backDelay={1000}
      loopCount={0}
      showCursor
      cursorChar="|"
    />
  );
};

type TColorProp = string | string[];

interface ShineBorderProps {
  borderRadius?: number;
  borderWidth?: number;
  duration?: number;
  color?: TColorProp;
  className?: string;
  children: React.ReactNode;
}

/**
 * @name Shine Border
 * @description It is an animated background border effect component with easy to use and configurable props.
 * @param borderRadius defines the radius of the border.
 * @param borderWidth defines the width of the border.
 * @param duration defines the animation duration to be applied on the shining border
 * @param color a string or string array to define border color.
 * @param className defines the class name to be applied to the component
 * @param children contains react node elements.
 */
function ShineBorder({
  borderRadius = 8,
  borderWidth = 1,
  duration = 14,
  color = "#000000",
  className,
  children,
}: ShineBorderProps) {
  return (
    <div
      style={
        {
          "--border-radius": `${borderRadius}px`,
        } as React.CSSProperties
      }
      className={cn(
        "relative grid h-full w-full place-items-center rounded-3xl bg-white p-3 text-black dark:bg-black dark:text-white",
        className,
      )}
    >
      <div
        style={
          {
            "--border-width": `${borderWidth}px`,
            "--border-radius": `${borderRadius}px`,
            "--shine-pulse-duration": `${duration}s`,
            "--mask-linear-gradient": `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            "--background-radial-gradient": `radial-gradient(transparent,transparent, ${color instanceof Array ? color.join(",") : color},transparent,transparent)`,
          } as React.CSSProperties
        }
        className={`before:bg-shine-size before:absolute before:inset-0 before:aspect-square before:size-full before:rounded-3xl before:p-[--border-width] before:will-change-[background-position] before:content-[""] before:![-webkit-mask-composite:xor] before:[background-image:--background-radial-gradient] before:[background-size:300%_300%] before:![mask-composite:exclude] before:[mask:--mask-linear-gradient] motion-safe:before:animate-[shine-pulse_var(--shine-pulse-duration)_infinite_linear]`}
      ></div>
      {children}
    </div>
  );
}



export { renderCanvas, TypeWriter, ShineBorder }