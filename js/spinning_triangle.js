let angle = 0;

function setup() {
  createCanvas(256, 256);
  noStroke();
}

function draw() {
  background(8, 8, 8, 1);

  translate(width / 2, height / 2);

  rotate(angle);

  let ctx = drawingContext;

  let radialGradient = ctx.createRadialGradient(0, 10, 0, 0, 0, 80);
  radialGradient.addColorStop(0., "red");
  radialGradient.addColorStop(0.33, "orange");
  radialGradient.addColorStop(0.66, "yellow");
  radialGradient.addColorStop(1., "green");

  ctx.fillStyle = radialGradient;

  triangle(0, -80, 70, 60, -70, 60);

  angle += 0.01;
}
