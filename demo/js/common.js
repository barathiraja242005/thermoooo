/**
 * ==========================================================================
 * ThermaBuild — Shared Site Navigation & Global Utilities
 * ==========================================================================
 */

(function () {
  'use strict';

  // Highlight the active navigation link based on window location
  function setActiveNavLink() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-menu a, .mobile-nav-links a, .brand-logo');

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;

      const targetFile = href.split('#')[0] || 'index.html';
      const isMatch = (targetFile === currentPath) ||
                      (currentPath === '' && targetFile === 'index.html') ||
                      (currentPath === 'index.html' && (targetFile === 'index.html' || href.startsWith('#hero')));

      if (link.classList.contains('nav-link')) {
        if (isMatch && !href.includes('#')) {
          link.classList.add('active');
        } else if (href === currentPath) {
          link.classList.add('active');
        }
      }
    });
  }

  // Mobile Menu Handlers
  window.toggleMobileMenu = function () {
    const drawer = document.getElementById('mobileNavDrawer');
    if (drawer) {
      drawer.classList.toggle('open');
      document.body.style.overflow = drawer.classList.contains('open') ? 'hidden' : '';
    }
  };

  window.closeMobileMenu = function () {
    const drawer = document.getElementById('mobileNavDrawer');
    if (drawer) {
      drawer.classList.remove('open');
      document.body.style.overflow = '';
    }
  };

  // Sticky header scroll elevation
  function setupHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  // Global Dossier Modal Handlers
  window.openDossierModal = function () {
    const modal = document.getElementById('dossier-modal');
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (typeof window.renderCFDReport === 'function') {
        try { window.renderCFDReport(); } catch (e) { console.warn(e); }
      }
    }
  };

  window.closeDossierModal = function () {
    const modal = document.getElementById('dossier-modal');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  };

  window.closeDossierOnBackdrop = function (event) {
    if (event.target && event.target.id === 'dossier-modal') {
      window.closeDossierModal();
    }
  };

  // Farmer / Livestock Dossier Handlers
  window.openFarmerDossierModal = function () {
    const modal = document.getElementById('farmer-dossier-modal');
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (typeof window.runAnimalShelterSimulation === 'function') {
        try { window.runAnimalShelterSimulation(); } catch (e) { console.warn(e); }
      }
    }
  };

  window.closeFarmerDossierModal = function () {
    const modal = document.getElementById('farmer-dossier-modal');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  };

  window.closeFarmerDossierOnBackdrop = function (event) {
    if (event.target && event.target.id === 'farmer-dossier-modal') {
      window.closeFarmerDossierModal();
    }
  };

  // Hero select navigation
  window.handleHeroSelect = function (val) {
    // Optional change handler
  };

  window.handleHeroSubmit = function () {
    const select = document.getElementById('hero-action-select');
    if (!select) return;
    const val = select.value;
    const routes = {
      'studio': 'studio.html',
      'climate': 'studio.html#climate',
      '2d': 'studio.html#step-2',
      '3d': 'studio.html#step-3',
      'simulation': 'simulation.html',
      'fluent': 'fluent-cfd.html',
      'livestock': 'studio.html#livestock',
      'dossier': 'report.html'
    };
    if (routes[val]) {
      window.location.href = routes[val];
    } else {
      window.location.href = 'studio.html';
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    setActiveNavLink();
    setupHeaderScroll();
  });

})();
