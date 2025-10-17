let incr = 0;

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('p5-animation');
  colorMode(RGB);
}

function draw() {
  background(0, 0, 0, 0); // Transparent background

  drawPattern();
  
  incr += 0.0001;
}


function drawPattern() {
  let radius = 150; 
  let spacing = radius * 2.5; 
  let verticalSpacing = radius * 1.2; 

  for (let y = 0; y < height + verticalSpacing; y += verticalSpacing) {
    for (let x = 0; x < width + spacing; x += spacing) {
      let offsetX = (y / verticalSpacing) % 2 === 0 ? 0 : spacing / 2;
      drawCirclesWithInner(x + offsetX, y, radius);
    }
  }
}

function drawCirclesWithInner(x, y, r) {
  strokeWeight(2);

  let timeOffset = noise(incr + x * y); 
  let baseGray = map(
    sin((frameCount * 0.003 + timeOffset) * TWO_PI), 
    -1, 1, 30, 120
  );

  stroke(baseGray, baseGray, baseGray, 120); 

  noFill();

  for (let i = 0; i < 4; i++) {
    ellipse(x, y, r * (1 + i * 0.3), r * (1 + i * 0.3));
  }

  let innerCount = 8;
  for (let j = 1; j <= innerCount; j++) {
    let innerRadius = (r / innerCount) * j;
    ellipse(x, y, innerRadius * 2, innerRadius * 2);
  }
}
