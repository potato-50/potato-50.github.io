const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WIDTH = 1000;
const HEIGHT = 1000;

const GRAVITY_AMOUNT = 1;
const MOVE_ACCEL = 3;
const FRICTION = 1.15;
const JUMP_STRENGTH = 25;
const SCROLL_SPEED_START = 1;

const xChoices = [100,200,300,400,500,600,700,800,900];
const keys = {};

window.addEventListener("keydown", (event) => {
  keys[event.key.toLowerCase()] = true;

  if (
    ["w","a","d","arrowup","arrowleft","arrowright"," "]
      .includes(event.key.toLowerCase())
  ) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  keys[event.key.toLowerCase()] = false;
});

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);

    img.onerror = () => {
      reject(new Error(`Could not load ${src}`));
    };

    img.src = src;
  });
}

function randomChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function overlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function setCenter(obj, cx, cy) {
  obj.x = cx - obj.width / 2;
  obj.y = cy - obj.height / 2;
}

function cx(obj) {
  return obj.x + obj.width / 2;
}

function cy(obj) {
  return obj.y + obj.height / 2;
}

function right(obj) {
  return obj.x + obj.width;
}

function bottom(obj) {
  return obj.y + obj.height;
}

async function startGame() {
  const [
    background,
    floorImage,
    playerA,
    playerB,
    walkingA,
    walkingB
  ] = await Promise.all([
    loadImage("background.png"),
    loadImage("floor.png"),
    loadImage("player_a.png"),
    loadImage("player_b.png"),
    loadImage("walking_a.png"),
    loadImage("walking_b.png")
  ]);

  const playerImages = {
    player_a: playerA,
    player_b: playerB,
    walking_a: walkingA,
    walking_b: walkingB
  };

  let gravity = 0;
  let speedX = 0;
  let score = 0;
  let scrollSpeed = SCROLL_SPEED_START;
  let gameOver = false;

  let turn = 0;
  let walk = 1;
  let walkTimer = 0;

  let playerImageName = "player_a";
  let playerImage = playerImages[playerImageName];

  const player = {
    x: 0,
    y: 0,
    width: playerImage.width,
    height: playerImage.height
  };

  setCenter(player, 400, 100);

  const floors = [];

  for (let i = 0; i < 10; i++) {
    const floor = {
      x: 0,
      y: 0,
      width: floorImage.width,
      height: floorImage.height
    };

    if (i === 0) {
      setCenter(floor, 400, 600);
    } else {
      setCenter(
        floor,
        randomChoice(xChoices),
        700 - i * 250
      );
    }

    floors.push(floor);
  }

  let lastLandedFloor = null;

  function changeImage(name) {
    if (name === playerImageName) {
      return;
    }

    const oldCX = cx(player);
    const oldCY = cy(player);

    playerImageName = name;
    playerImage = playerImages[name];

    player.width = playerImage.width;
    player.height = playerImage.height;

    setCenter(player, oldCX, oldCY);
  }

  function update() {
    if (gameOver) {
      return;
    }

    let isMoving = false;

    const oldRight = right(player);
    const oldLeft = player.x;
    const oldBottom = bottom(player);
    const oldTop = player.y;

    // LEFT AND RIGHT CONTROLS

    if (keys["d"] || keys["arrowright"]) {
      speedX += MOVE_ACCEL;
      turn = 0;
      isMoving = true;
    }

    if (keys["a"] || keys["arrowleft"]) {
      speedX -= MOVE_ACCEL;
      turn = 1;
      isMoving = true;
    }

    // WALKING ANIMATION

    if (isMoving) {
      walkTimer++;

      if (walkTimer >= 6) {
        walkTimer = 0;
        walk = 1 - walk;
      }

      if (turn === 0) {
        changeImage(
          walk ? "walking_a" : "player_a"
        );
      } else {
        changeImage(
          walk ? "walking_b" : "player_b"
        );
      }
    } else {
      walkTimer = 0;

      changeImage(
        turn === 0
          ? "player_a"
          : "player_b"
      );
    }

    // HORIZONTAL MOVEMENT

    player.x += speedX;

    speedX =
      Math.round(
        (speedX / FRICTION) * 10000
      ) / 10000;

    // FIND HIGHEST PLATFORM

    let highestY =
      Math.min(
        ...floors.map(floor => cy(floor))
      );

    // RECYCLE FLOORS

    for (const floor of floors) {
      if (cy(floor) >= 1050) {
        setCenter(
          floor,
          randomChoice(xChoices),
          highestY - 250
        );

        if (lastLandedFloor === floor) {
          lastLandedFloor = null;
        }

        highestY = cy(floor);
      }
    }

    // X COLLISIONS

    for (const floor of floors) {
      if (overlap(player, floor)) {

        if (
          speedX > 0 &&
          oldRight <= floor.x
        ) {
          player.x =
            floor.x - player.width;

          speedX = 0;
        }

        else if (
          speedX < 0 &&
          oldLeft >=
          floor.x + floor.width
        ) {
          player.x =
            floor.x + floor.width;

          speedX = 0;
        }
      }
    }

    // GRAVITY

    gravity += GRAVITY_AMOUNT;

    player.y += gravity;

    // Y COLLISIONS

    for (const floor of floors) {
      if (overlap(player, floor)) {

        // LANDING

        if (
          gravity > 0 &&
          oldBottom <= floor.y
        ) {
          player.y =
            floor.y - player.height;

          gravity = 0;

          if (
            floor !== lastLandedFloor
          ) {
            score++;
            lastLandedFloor = floor;
          }

          // JUMP

          if (
            keys["w"] ||
            keys["arrowup"] ||
            keys[" "]
          ) {
            gravity = -JUMP_STRENGTH;
          }
        }

        // HIT UNDERSIDE

        else if (
          gravity < 0 &&
          oldTop >=
          floor.y + floor.height
        ) {
          player.y =
            floor.y + floor.height;

          gravity = 0;
        }
      }
    }

    // SCROLL PLATFORMS

    for (const floor of floors) {
      floor.y += scrollSpeed;
    }

    // GAME OVER

    if (cy(player) >= HEIGHT) {
      gameOver = true;
      scrollSpeed = 0;
    }

    // SCREEN EDGES

    if (cx(player) > WIDTH) {
      player.x =
        WIDTH - player.width / 2;
    }

    if (cx(player) < 0) {
      player.x =
        -player.width / 2;
    }
  }

  function draw() {
    ctx.clearRect(
      0,
      0,
      WIDTH,
      HEIGHT
    );

    // BACKGROUND

    ctx.drawImage(
      background,
      0,
      0,
      WIDTH,
      HEIGHT
    );

    // PLATFORMS

    for (const floor of floors) {
      ctx.drawImage(
        floorImage,
        floor.x,
        floor.y,
        floor.width,
        floor.height
      );
    }

    // PLAYER

    ctx.drawImage(
      playerImage,
      player.x,
      player.y,
      player.width,
      player.height
    );

    // SCORE

    ctx.fillStyle = "white";

    ctx.font =
      '25px "PixelFont", monospace';

    ctx.textBaseline = "top";

    ctx.fillText(
      `score: ${score}`,
      10,
      10
    );

    // GAME OVER

    if (gameOver) {
      ctx.font =
        '50px "PixelFont", monospace';

      ctx.textAlign = "center";

      ctx.fillText(
        "GAME OVER",
        WIDTH / 2,
        400
      );

      ctx.textAlign = "left";
    }
  }

  let previousTime =
    performance.now();

  let accumulator = 0;

  const step = 1000 / 60;

  function gameLoop(now) {
    accumulator +=
      now - previousTime;

    previousTime = now;

    accumulator =
      Math.min(
        accumulator,
        step * 5
      );

    while (accumulator >= step) {
      update();
      accumulator -= step;
    }

    draw();

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

startGame().catch((err) => {
  console.error(err);

  ctx.fillStyle = "white";
  ctx.font = "24px monospace";

  ctx.fillText(
    "Game failed to load. Check file names/folders.",
    20,
    40
  );
});