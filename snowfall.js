const body = document.body
const cnv = document.getElementById('snowfall')
Array.prototype.choose = function() {
  return this[Math.floor(Math.random() * this.length)];
}

cnv.width = window.innerWidth;
cnv.height = window.innerHeight;
const ctx = cnv.getContext('2d');
let circColors = ['white', 'gray', 'lightblue', 'lightgray'];
let maxBalls = 50;

function randomCircle() {
  let rads = [];
  for (let i = 0; i < 11; i++) {
    rads.push(i)
  };

  return { color: circColors.choose(), radius: rads.choose(), x: Math.random() * cnv.width, y: Math.random() * (-cnv.height), v: Math.random() + 0.1 }
}


class Circle {
  constructor(color, r, x, y, v) {
    this.x = x;
    this.y = y;
    this.v = v;
    this.color = color;
    this.r = r;
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }
}

function makeCircles(amount) {
  let circles = [];
  for (let i = 0; i < amount; i++) {
    let adj = randomCircle();
    circles.push(new Circle(adj.color, adj.radius, adj.x, adj.y, adj.v))
  };
  return circles
}


function setBalls(amount) {
  if (amount > snowballs.length) {
    let dif = amount - snowballs.length
    for (let i = dif; i > 0; i--) {
      console.log('hey')
      let adj = randomCircle();
      snowballs.push(new Circle(adj.color, adj.radius, adj.x, adj.y, adj.v))
    }
  }

  maxBalls = amount
}

let snowballs = makeCircles(maxBalls);


function animate() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, cnv.width, cnv.height)
  snowballs.forEach(ball => {

    if (ball.y > cnv.height + 100) {
      snowballs = snowballs.filter(item => item != ball)
      if (snowballs.length < maxBalls) {
        let adj = randomCircle();
        snowballs.push(new Circle(adj.color, adj.radius, adj.x, adj.y, adj.v))
      }
    }

    ball.draw()
    ball.y += ball.v
  })

  requestAnimationFrame(animate);
}


animate();



