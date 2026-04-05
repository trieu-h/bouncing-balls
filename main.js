const WIDTH = 1000;
const HEIGHT = 600;

canvas.style.background = "black";
canvas.width = WIDTH;
canvas.height = HEIGHT;
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("Could not retrieve context");

class V2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(that) {
    return new V2(this.x + that.x, this.y + that.y);
  }

  sub(that) {
    return new V2(this.x - that.x, this.y - that.y);
  }

  scale(n) {
    return new V2(this.x * n, this.y * n);
  }

  dot(that) {
    return this.x * that.x + this.y * that.y;
  }

  mul(that) {
    return new V2(this.x * that.x, this.y * that.y);
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  norm() {
    return this.scale(1 / this.length());
  }
}

class Ball {
  constructor(pos, v) {
    this.pos = pos;
    this.v = v;
  }
}

function draw_circle(ctx, pos, radius, color) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI, false);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
}

const RADIUS = 20;
const COLOR  = "red";
const G = 100; // Gravity
const FPS = 60;
const timestep = 1 / 60;

let this_frame = null;
let prev_time = 0;
let a = new V2(0, G); // Gravity only affects y axis
let v = new V2(40, 0);
let pos = new V2(0, 100);
let c_r = 0.5; // Coefficient of restitution
let c_f = 0.5; // Coefficient of friction
const balls = [new Ball(new V2(0, 100), new V2(40, 0))];

function frame(cur_time) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  for (const ball of balls) {
    let new_v   = ball.v.add(a.scale(timestep));
    let new_pos = ball.pos.add(ball.v.add(new_v).scale(timestep/2));

    const ground_unit_vector = new V2(0, 0).sub(new V2(0, HEIGHT)).norm();
    const random_point_on_ground = new V2(WIDTH/2, HEIGHT);
    const d = ball.pos.add(new V2(0, RADIUS)).sub(random_point_on_ground).dot(ground_unit_vector);
    const new_d = new_pos.add(new V2(0, RADIUS)).sub(random_point_on_ground).dot(ground_unit_vector);

    // Collision occured, perform sub-stepping
    if (new_d < 0) {
      const f = d / (d - new_d);
      const this_timestep = f * timestep;
      new_v   = ball.v.add(a.scale(this_timestep));
      new_pos = ball.pos.add(ball.v.add(new_v).scale(this_timestep/2));
      const v_n = ground_unit_vector.scale(new_v.dot(ground_unit_vector));
      const v_t = new_v.sub(v_n);
      const v_n_new = ground_unit_vector.scale(-c_r * (v_n.dot(ground_unit_vector)));
      const v_t_new = v_t.scale(1 - c_f);
      new_v = v_n_new.add(v_t_new);
    }

    ball.v = new_v;
    ball.pos = new_pos;
    draw_circle(ctx, new_pos, RADIUS, COLOR);
  }

  this_frame = requestAnimationFrame(frame);
}

function main() {
  this_frame = requestAnimationFrame(frame);

  canvas.addEventListener("mousedown", (e) => {
    const ball = new Ball(new V2(e.offsetX, e.offsetY), new V2(50, 0));
    balls.push(ball);
  })
}

main();

