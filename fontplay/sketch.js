let fontLight;
let fontThin;
let mainText = "FontPlay";
let subText = "Where Letters Play Games";
let fontSizeMain = 180;
let fontSizeSub = 60;

let sound;
let amplitude;
let isPlaying = false;

let mario; // Mario image
let backgroundImg; // Background image
let flower; // Flower image

let marioX = 0; // Mario's X position
let marioY = 0; // Mario's Y position
let groundY; // Ground level where Mario jumps
let jumpHeight = 100; // Jump height
let jumpSpeed = 5; // Jump speed
let isGoingUp = true; 
let waveAmplitude = 50; // Amplitude of sine wave for Mario's movement
let waveFrequency = 0.05; // Frequency of sine wave for Mario's movement
let textOffset = -70; // Offset to move text upwards
let flowerPositions = []; // Positions of the flowers

function preload() {
  fontLight = loadFont('PressStart2P.ttf');
  fontThin = loadFont('PressStart2P.ttf');
  sound = loadSound('music.mp3'); // Load sound file
  mario = loadImage('mario_new.png'); // Load Mario image
  backgroundImg = loadImage('background.png'); // Load background image
  flower = loadImage('flower_pixel.png'); // Load flower image
}

function setup() {
  createCanvas(1920, 1080);
  textAlign(CENTER, CENTER);
  amplitude = new p5.Amplitude();
  marioX = 0; // Mario starts on the left
  groundY = height / 2 - fontSizeMain / 2 - 100 - 20; // Set ground level for Mario
  marioY = groundY; // Initialize Mario on the ground

  // Initialize positions for flowers
  flowerPositions = [
    { x: width / 2 - 480, y: height - 200, offsetY: 0, direction: 1 }, // Left pipe
    { x: width / 2 + 370, y: height - 200, offsetY: 0, direction: 1 }  // Right pipe
  ];
}

function draw() {
  if (!isPlaying) {
    // Display a message to start the music
    background(0);
    fill(255);
    textSize(50);
    text("Press any key to start music", width / 2, height / 2);
    return;
  }

  // Draw the background
  imageMode(CORNER);
  image(backgroundImg, 0, 0, width, height);

  fill(255);
  noStroke();

  let level = amplitude.getLevel(); // Get the sound amplitude level
  let stretchBase = map(level, 0, 0.3, 1, 3); // Map amplitude to stretch factor

  // Draw the main text with dynamic stretching
  textFont(fontLight);
  textSize(fontSizeMain);
  for (let i = 0; i < mainText.length; i++) {
    let char = mainText[i];
    let x = width / 2 - textWidth(mainText) / 2 + textWidth(mainText.substring(0, i)) + textWidth(char) / 2;

    let stretch = map(sin(frameCount * 0.05 + i), -1, 1, 1, stretchBase); // Sine wave for dynamic stretching
    push();
    translate(x, height / 2 - fontSizeMain / 2 + textOffset);
    scale(1, stretch);
    text(char, 0, 0);
    pop();
  }

  // Draw the subtitle with deformation effects
  textFont(fontThin);
  textSize(fontSizeSub);
  for (let i = 0; i < subText.length; i++) {
    let char = subText[i];
    let x = width / 2 - textWidth(subText) / 2 + textWidth(subText.substring(0, i)) + textWidth(char) / 2;

    // Apply deformation based on flower positions
    let deformEffect = 0;
    for (let flowerData of flowerPositions) {
      let distance = abs(x - flowerData.x);
      if (distance < 200) {
        deformEffect += map(distance, 0, 200, flowerData.offsetY * 0.3, 0);
      }
    }

    push();
    translate(x, height / 2 + fontSizeMain + textOffset);
    text(char, 0, deformEffect);
    pop();
  }

  // Mario's jumping animation
  if (isGoingUp) {
    marioY -= jumpSpeed;
    if (marioY <= groundY - jumpHeight) {
      isGoingUp = false;
    }
  } else {
    marioY += jumpSpeed;
    if (marioY >= groundY) {
      isGoingUp = true;
    }
  }

  marioX += 5; // Move Mario to the right
  let waveOffset = sin(frameCount * waveFrequency) * waveAmplitude; // Apply wave motion

  imageMode(CENTER);
  image(mario, marioX, marioY + waveOffset, 100, 100);

  // Reset Mario's position when off-screen
  if (marioX > width + 50) {
    marioX = -50;
  }

  // Move flowers up and down
  for (let flowerData of flowerPositions) {
    flowerData.offsetY += flowerData.direction * 2;
    if (flowerData.offsetY > 130 || flowerData.offsetY < 0) {
      flowerData.direction *= -1; // Reverse direction at bounds
    }
    imageMode(CENTER);
    image(flower, flowerData.x, flowerData.y - flowerData.offsetY, 125, 125);
  }
}

function keyPressed() {
  // Start music on any key press 
  if (!isPlaying) {
    sound.loop();
    isPlaying = true;
  }
}
