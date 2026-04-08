// Main canvas constants
const BACKGROUND_COLOR = "#96BECD";
const BALL_COLOR = "#C05746";
const SPAWN_BALL_COLOR = "#FFF4A3";
const RADIUS = 20;

// Wind canvas constants
const WIND_CANVAS_WIDTH = 200;
const WIND_CANVAS_HEIGHT = 200;
const WIND_CANVAS_PADDING = 20;
const WIND_CIRCLE_RADIUS = 200/2 - WIND_CANVAS_PADDING;
const POINT_RADIUS = 5;
const WIND_CANVAS_BACKGROUND = "#252a7f";
const WIND_CIRCLE_COLOR = "yellow";
const WIND_DIR_COLOR = "red";

// Physic constants
const G = 100; // Gravity
const D = 0.5; // Resistance constant
const M = 1;   // Ball mass
const C_R = 0.5; // Coefficient of restitution
const C_F = 0.5; // Coefficient of friction
const FPS = 60;
const timestep = 1 / FPS;

const { width, height } = canvas.getBoundingClientRect();
let WIDTH = width;
let HEIGHT = height;

window.addEventListener("resize", () => {
  const { width, height } = canvas.getBoundingClientRect();
  WIDTH = width;
  HEIGHT = height;
  canvas.width = width;
  canvas.height = height;
})

canvas.style.background = BACKGROUND_COLOR;
canvas.width = WIDTH;
canvas.height = HEIGHT;
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("Could not retrieve context");

wind_canvas.style.background = WIND_CANVAS_BACKGROUND;
wind_canvas.width  = WIND_CANVAS_WIDTH;
wind_canvas.height = WIND_CANVAS_HEIGHT;

const wind_ctx = wind_canvas.getContext("2d");
if (!wind_ctx) throw new Error("Could not retrieve context");

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

  dist(that) {
    return Math.sqrt((that.x - this.x) * (that.x - this.x) + (that.y - this.y) * (that.y - this.y));
  }

  static zero() {
    return new V2(0, 0);
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

function draw_circle_outline(ctx, pos, radius, color) {
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI, false);
  ctx.strokeStyle = color;
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

function draw_arrow(ctx, origin_pos, tip_pos, degree, length, color) {
  const barb_l_pos = origin_pos.sub(tip_pos).norm().rotate(rad( degree)).scale(length).add(tip_pos);
  const barb_r_pos = origin_pos.sub(tip_pos).norm().rotate(rad(-degree)).scale(length).add(tip_pos);

  ctx.beginPath();
  ctx.moveTo(tip_pos.x, tip_pos.y);
  ctx.lineTo(barb_l_pos.x, barb_l_pos.y);
  ctx.lineTo(barb_r_pos.x, barb_r_pos.y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

let this_frame = null;
let G_A = new V2(0, G); // Gravity only affects y axis

const balls = [];

let is_selecting_position = false;
let mouse_pos = null;
let drag_pos = null;

let has_air_resistance = false;
let has_wind = false;
const V_WIND = new V2(30, 30);

function frame() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  if (is_selecting_position) {
    draw_circle(ctx, mouse_pos, 10, SPAWN_BALL_COLOR);

    if (drag_pos) {
      draw_line(ctx, mouse_pos, drag_pos, SPAWN_BALL_COLOR);
      draw_arrow(ctx, mouse_pos, drag_pos, 30, 20, SPAWN_BALL_COLOR);
    }
  }

  for (const ball of balls) {
    let relative_v = V2.zero();
    if (has_wind) relative_v = relative_v.add(V_WIND.mul(wind_dir));
    if (has_air_resistance) relative_v = relative_v.sub(ball.v);
    const a = relative_v.scale(D/M).add(G_A);

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
      const v_n_new = ground_unit_vector.scale(-C_R * (v_n.dot(ground_unit_vector)));
      const v_t_new = v_t.scale(1 - C_F);
      new_v = v_n_new.add(v_t_new);
    }

    ball.v = new_v;
    ball.pos = new_pos;
    draw_circle(ctx, new_pos, RADIUS, BALL_COLOR);
  }

  this_frame = requestAnimationFrame(frame);
}

let wind_canvas_center = new V2(WIND_CANVAS_WIDTH/2, WIND_CANVAS_HEIGHT/2);
let point = new V2(wind_canvas_center.x + WIND_CIRCLE_RADIUS, WIND_CANVAS_HEIGHT / 2);
let wind_dir = point.sub(wind_canvas_center).norm();

function wind_frame() {
  wind_ctx.clearRect(0, 0, WIND_CANVAS_WIDTH, WIND_CANVAS_HEIGHT);
  draw_circle_outline(wind_ctx, wind_canvas_center, WIND_CIRCLE_RADIUS, WIND_CIRCLE_COLOR);
  draw_line(wind_ctx, wind_canvas_center, point, WIND_DIR_COLOR);
  draw_circle(wind_ctx, point, POINT_RADIUS, WIND_DIR_COLOR);
  draw_arrow(wind_ctx, wind_canvas_center, point, 20, 20, WIND_DIR_COLOR);
  requestAnimationFrame(wind_frame);
}

function rad(degree) {
  return degree * (Math.PI / 180);
}

let is_dragging_point = false;

function main() {
  this_frame = requestAnimationFrame(frame);
  requestAnimationFrame(wind_frame);

  canvas.addEventListener("mousedown", (e) => {
    if (event.button === 0) { // Mouse left
      is_selecting_position = true;
      mouse_pos = new V2(e.offsetX, e.offsetY);
    }
  })

  canvas.addEventListener("mousemove", (e) => {
    if (is_selecting_position) {
      drag_pos = new V2(e.offsetX, e.offsetY);
    }
  })

  canvas.addEventListener("mouseup", (e) => {
    is_selecting_position = false;

    const drag_vec = drag_pos.sub(mouse_pos);
    const x_axis = new V2(WIDTH, 0);
    const sign_x = Math.sign(drag_vec.dot(x_axis));
    const y_axis = new V2(0, HEIGHT);
    const sign_y = Math.sign(drag_vec.dot(y_axis));

    let x_vec_from_mouse = sign_x < 0 ? new V2(0 - mouse_pos.x, 0) : new V2(WIDTH - mouse_pos.x, 0);

    const cos = x_vec_from_mouse.dot(drag_vec) / (x_vec_from_mouse.length() * drag_vec.length());
    const angle = Math.acos(cos);
    const drag_vec_length = drag_vec.length();
    const speed = new V2(
      sign_x * drag_vec_length * cos,
      sign_y * drag_vec_length * Math.sin(angle)
    );
    const ball = new Ball(mouse_pos, speed);
    balls.push(ball);

    mouse_pos  = null;
    drag_pos   = null;
  })

  wind_canvas.addEventListener("mousedown", (e) => {
    const mouse = new V2(e.offsetX, e.offsetY);
    if (mouse.dist(point) <= POINT_RADIUS) {
      is_dragging_point = true;
    }
  })

  wind_canvas.addEventListener("mousemove", (e) => {
    const mouse = new V2(e.offsetX, e.offsetY);

    if (is_dragging_point) {
      point = mouse
        .sub(wind_canvas_center)
        .norm()
        .scale(WIND_CIRCLE_RADIUS)
        .add(wind_canvas_center);

      wind_dir = point.sub(wind_canvas_center).norm();
    }
  })

  wind_canvas.addEventListener("mouseup", () => {
    is_dragging_point = false;
  })
}

function enableAirResistance() {
  has_air_resistance = !has_air_resistance;
}

function enableWind() {
  has_wind = !has_wind;
  if (has_wind) {
    wind_canvas.style.display = "block";
  } else {
    wind_canvas.style.display = "none";
  }
}

main();

