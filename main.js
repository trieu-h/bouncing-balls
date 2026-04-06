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

  rotate(angle) {
    return new V2(
      this.x * Math.cos(angle) - this.y * Math.sin(angle),
      this.x * Math.sin(angle) + this.y * Math.cos(angle)
    )
  }
}

class Ball {
  constructor(pos, v) {
    this.pos = pos;
    this.v = v;
  }
}

function draw_line(ctx, start_pos, end_pos, color, lineWidth = 1) {
  ctx.beginPath();
  ctx.moveTo(start_pos.x, start_pos.y);
  ctx.lineTo(end_pos.x, end_pos.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function draw_circle(ctx, pos, radius, color) {
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI, false);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.stroke();
}

function draw_arrow(ctx, tip_pos, barb_l_pos, barb_r_pos, color) {
  ctx.beginPath();
  ctx.moveTo(tip_pos.x, tip_pos.y);
  ctx.lineTo(barb_l_pos.x, barb_l_pos.y);
  ctx.lineTo(barb_r_pos.x, barb_r_pos.y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
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
// const balls = [new Ball(new V2(0, 100), new V2(40, 0))];
const balls = [];

let is_selecting_position = false;
let mouse_pos = null;
let drag_pos = null;
let barb_l_pos = null;
let barb_r_pos = null;

function frame(cur_time) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  if (is_selecting_position) {
    draw_circle(ctx, mouse_pos, 10, "yellow");

    if (drag_pos) {
      draw_line(ctx, mouse_pos, drag_pos, "yellow");
      draw_arrow(ctx, drag_pos, barb_l_pos, barb_r_pos, "yellow");
    }
  }

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

function rad(degree) {
  return degree * (Math.PI / 180);
}

function main() {
  this_frame = requestAnimationFrame(frame);

  canvas.addEventListener("mousedown", (e) => {
    is_selecting_position = true;
    mouse_pos = new V2(e.offsetX, e.offsetY);
  })

  canvas.addEventListener("mousemove", (e) => {
    if (is_selecting_position) {
      drag_pos = new V2(e.offsetX, e.offsetY);
      const DEGREE = 30;
      const LENGTH = 20;
      barb_l_pos = mouse_pos.sub(drag_pos).norm().rotate(rad( DEGREE)).scale(LENGTH).add(drag_pos);
      barb_r_pos = mouse_pos.sub(drag_pos).norm().rotate(rad(-DEGREE)).scale(LENGTH).add(drag_pos);
    }
  })

  canvas.addEventListener("mouseup", (e) => {
    is_selecting_position = false;

    const drag_vec = drag_pos.sub(mouse_pos);
    const x_axis = new V2(WIDTH, 0);
    const sign_x = Math.sign(drag_vec.dot(x_axis));

    const y_axis = new V2(0, HEIGHT);
    const sign_y = Math.sign(drag_vec.dot(y_axis));

    let angle;

    let x_vec_from_mouse = sign_x < 0 ? new V2(0 - mouse_pos.x, 0) : new V2(WIDTH - mouse_pos.x, 0);

    const cos = x_vec_from_mouse.dot(drag_vec) / (x_vec_from_mouse.length() * drag_vec.length());
    angle = Math.acos(cos);

    const X_SPEED = 200;
    const Y_SPEED = 200;

    const speed = new V2(
      sign_x * X_SPEED * Math.cos(angle),
      sign_y * Y_SPEED * Math.sin(angle)
    );
    const ball = new Ball(mouse_pos, speed);
    balls.push(ball);

    mouse_pos  = null;
    drag_pos   = null;
    barb_l_pos = null;
    barb_r_pos = null;
  })
}

main();

