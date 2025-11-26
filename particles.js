

// Efeito de partículas com linhas conectando, igual Nexttec
const canvas = document.createElement('canvas');
canvas.id = 'particles-bg';
document.body.prepend(canvas);

const ctx = canvas.getContext('2d');
let particles = [];
const PARTICLE_COUNT = 70;
const colors = [
  '#111', '#222', '#333', '#444', '#555', '#888', '#d1d5db',
  '#FFD700', // dourado
  '#FFC300', // dourado intenso
  '#BFA640'  // dourado escuro
];
const LINE_COLOR = '#222';
const LINE_MAX_DIST = 120;

function resizeCanvas() {
  canvas.width = document.documentElement.clientWidth;
  canvas.height = document.documentElement.clientHeight;
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function createParticles() {
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 1.5,
      dx: (Math.random() - 0.5) * 0.6,
      dy: (Math.random() - 0.5) * 0.6,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
}
createParticles();

function drawParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Desenha linhas entre partículas próximas
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const p1 = particles[i];
      const p2 = particles[j];
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      if (dist < LINE_MAX_DIST) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = LINE_COLOR;
        ctx.globalAlpha = 0.13;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }
  // Desenha partículas
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.22;
    ctx.fill();
    ctx.globalAlpha = 1;
    p.x += p.dx;
    p.y += p.dy;
    if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
  }
  requestAnimationFrame(drawParticles);
}
drawParticles();

window.addEventListener('resize', createParticles);