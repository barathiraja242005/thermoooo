/**
 * ThermaBuild Studio — Interactive Animation Overlay & 3D Parallax Engine
 * Provides:
 * 1. Ambient CAD Particle & Vector Grid Mesh Animation Overlay
 * 2. 3D Gyroscopic & Mouse-Tracking Tilt Parallax on the Hero Viewport
 * 3. Multi-Layer Differential Depth Floating Micro-HUDs
 * 4. Dynamic Glare & Iridescent Beam Reflections
 * 5. Smooth Scroll Parallax on Hero Elements
 */

(function () {
  'use strict';

  // --- 1. Ambient CAD Vector Particle & Grid Overlay ---
  function initAmbientCanvas() {
    const canvas = document.getElementById('ambient-motion-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    const particleCount = 38;
    let mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000, active: false };

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = Math.max(window.innerHeight * 1.2, 900);
    }

    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.45;
        this.vy = (Math.random() - 0.5) * 0.45;
        this.radius = Math.random() * 2.2 + 1;
        this.baseAlpha = Math.random() * 0.25 + 0.12;
        this.alpha = this.baseAlpha;
        // Pastel spectrum colors: Rose, Lavender, Mint, Yellow, Sky Blue
        const colors = [
          'rgba(243, 198, 211, ', // Rose
          'rgba(212, 197, 249, ', // Lavender
          'rgba(194, 226, 214, ', // Mint
          'rgba(251, 242, 192, ', // Soft Yellow
          'rgba(188, 227, 245, ', // Sky Blue
        ];
        this.colorPrefix = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < -20) this.x = width + 20;
        if (this.x > width + 20) this.x = -20;
        if (this.y < -20) this.y = height + 20;
        if (this.y > height + 20) this.y = -20;

        // Subtle repulsion / attraction to mouse
        if (mouse.active) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            const force = (140 - dist) / 140;
            this.x -= (dx / dist) * force * 1.5;
            this.y -= (dy / dist) * force * 1.5;
            this.alpha = Math.min(0.65, this.baseAlpha + force * 0.4);
          } else {
            this.alpha = this.baseAlpha;
          }
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.colorPrefix + this.alpha + ')';
        ctx.fill();
      }
    }

    function initParticles() {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    }

    function drawConnections() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            const opacity = (1 - dist / 130) * 0.18;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = 'rgba(26, 26, 26, ' + opacity + ')';
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse lerp
      mouse.x += (mouse.targetX - mouse.x) * 0.1;
      mouse.y += (mouse.targetY - mouse.y) * 0.1;

      // Update and draw particles
      particles.forEach(p => {
        p.update();
        p.draw();
      });

      drawConnections();
      requestAnimationFrame(animate);
    }

    window.addEventListener('resize', () => {
      resize();
      initParticles();
    });

    window.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.active = true;
    });

    window.addEventListener('mouseleave', () => {
      mouse.active = false;
      mouse.targetX = -1000;
      mouse.targetY = -1000;
    });

    resize();
    initParticles();
    animate();
  }

  // --- 2. 3D Perspective Tilt Parallax & Glare on Hero Viewport ---
  function init3DTiltParallax() {
    const heroSection = document.getElementById('hero-landing');
    const tiltCard = document.querySelector('.hero-showcase-viewport');
    const diagramCard = document.querySelector('.hero-diagram-card');
    const floatingElements = document.querySelectorAll('.parallax-floating-hud');

    if (!heroSection || !tiltCard) return;

    let currentTiltX = 0;
    let currentTiltY = 0;
    let targetTiltX = 0;
    let targetTiltY = 0;
    let isHovering = false;

    // Glare element
    let glare = document.querySelector('.hero-diagram-glare');
    if (!glare && diagramCard) {
      glare = document.createElement('div');
      glare.className = 'hero-diagram-glare';
      diagramCard.appendChild(glare);
    }

    heroSection.addEventListener('mousemove', (e) => {
      const rect = heroSection.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calculate tilt angles (degrees)
      const rotateY = ((x - centerX) / centerX) * 8.5; // Max 8.5 deg
      const rotateX = -((y - centerY) / centerY) * 7.0; // Max 7 deg

      targetTiltX = rotateX;
      targetTiltY = rotateY;
      isHovering = true;

      // Update Glare Position
      if (glare && diagramCard) {
        const cardRect = diagramCard.getBoundingClientRect();
        const glareX = e.clientX - cardRect.left;
        const glareY = e.clientY - cardRect.top;
        glare.style.background = `radial-gradient(circle at ${glareX}px ${glareY}px, rgba(255, 255, 255, 0.45) 0%, rgba(212, 197, 249, 0.15) 35%, transparent 70%)`;
        glare.style.opacity = '1';
      }

      // Parallax Multi-layer Floating HUD chips
      floatingElements.forEach(elem => {
        const depth = parseFloat(elem.getAttribute('data-depth') || '0.1');
        const offsetX = (x - centerX) * depth;
        const offsetY = (y - centerY) * depth;
        elem.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
      });
    });

    heroSection.addEventListener('mouseleave', () => {
      targetTiltX = 0;
      targetTiltY = 0;
      isHovering = false;

      if (glare) {
        glare.style.opacity = '0';
      }

      floatingElements.forEach(elem => {
        elem.style.transform = `translate3d(0, 0, 0)`;
      });
    });

    // Spring interpolation loop for smooth physics
    function renderTilt() {
      currentTiltX += (targetTiltX - currentTiltX) * 0.085;
      currentTiltY += (targetTiltY - currentTiltY) * 0.085;

      if (Math.abs(currentTiltX) > 0.01 || Math.abs(currentTiltY) > 0.01 || isHovering) {
        tiltCard.style.transform = `perspective(1200px) rotateX(${currentTiltX.toFixed(2)}deg) rotateY(${currentTiltY.toFixed(2)}deg) translateZ(10px)`;
      } else {
        tiltCard.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg) translateZ(0px)`;
      }

      requestAnimationFrame(renderTilt);
    }

    renderTilt();
  }

  // --- 3. Smooth Scroll Parallax on Background Orbs Only ---
  function initScrollParallax() {
    const glowTop = document.querySelector('.spatial-glow-top');
    const glowLeft = document.querySelector('.spatial-glow-left');

    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.pageYOffset || document.documentElement.scrollTop;

          if (scrollY < 1200) {
            if (glowTop) glowTop.style.transform = `translate3d(0, ${scrollY * 0.25}px, 0)`;
            if (glowLeft) glowLeft.style.transform = `translate3d(${scrollY * 0.1}px, ${scrollY * 0.2}px, 0)`;
          }

          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // Initialize all interactive overlay and parallax systems on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initAmbientCanvas();
      init3DTiltParallax();
      initScrollParallax();
    });
  } else {
    initAmbientCanvas();
    init3DTiltParallax();
    initScrollParallax();
  }
})();
