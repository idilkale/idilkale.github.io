let incr = 0;
let scrollOffset = 0;

function setup() {
  // Works sayfası için özel boyut
  let parentElement = document.getElementById('p5-animation');
  if (parentElement) {
    let w = parentElement.offsetWidth || windowWidth;
    let h = parentElement.offsetHeight || 800;
    let canvas = createCanvas(w, h);
    canvas.parent('p5-animation');
  } else {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('p5-animation');
  }
  colorMode(RGB);
}

function draw() {
  background(0, 0, 0, 0); // Transparent background

  // Scroll pozisyonunu al (works sayfası için)
  // Pattern scroll'dan daha yavaş hareket etsin (parallax efekti)
  if (typeof window !== 'undefined' && window.scrollPosition !== undefined) {
    scrollOffset = window.scrollPosition * 0.5; // Parallax hızı - container'dan daha yavaş
  }

  drawPattern();
  
  incr += 0.0001;
}


function drawPattern() {
  let radius = 150; 
  let spacing = radius * 2.5; 
  let verticalSpacing = radius * 1.2; 

  // Works sayfası için pattern'ı daha sık çiz
  for (let y = -verticalSpacing; y < height + verticalSpacing * 2; y += verticalSpacing) {
    for (let x = 0; x < width + spacing; x += spacing) {
      let offsetX = (y / verticalSpacing) % 2 === 0 ? 0 : spacing / 2;
      // Scroll offset'i ekle - pattern'ı yukarı/aşağı hareket ettir
      drawCirclesWithInner(x + offsetX, y - scrollOffset, radius);
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
