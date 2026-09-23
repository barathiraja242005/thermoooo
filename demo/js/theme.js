/**
 * ==========================================================================
 * ThermaBuild — Dynamic Theme Prop Engine & Live Customizer
 * ==========================================================================
 * Modern Dark Architectural Studio Design System
 * Allows developers and users to configure the color theme as a prop or preset.
 * 
 * Usage:
 *   ThermaTheme.setTheme({ primary: '#00E5FF', bgCanvas: '#07090E' });
 *   ThermaTheme.applyPreset('modern-dark-studio');
 *   ThermaTheme.copyCSS();
 */

(function () {
  'use strict';

  const DEFAULT_PROPS = {
    primary: '#1A1A1A',
    primaryHover: '#333333',
    primaryGlow: 'rgba(212, 197, 249, 0.4)',
    primaryLight: 'rgba(188, 227, 245, 0.35)',
    primaryBorder: '#D4C5F9',

    secondary: '#D97706',
    secondaryHover: '#B45309',
    secondaryGlow: 'rgba(243, 198, 211, 0.35)',
    secondaryLight: 'rgba(251, 242, 192, 0.55)',

    accentRose: '#F3C6D3',
    accentLavender: '#D4C5F9',
    accentMint: '#C2E2D6',
    accentYellow: '#FBF2C0',
    accentBlue: '#BCE3F5',

    accentEmerald: '#059669',
    accentEmeraldGlow: 'rgba(194, 226, 214, 0.45)',

    accentPeach: 'rgba(243, 198, 211, 0.35)',
    accentPeachSubtle: 'rgba(251, 242, 192, 0.45)',
    accentApricot: '#BCE3F5',

    bgCanvas: '#F5F2EB',
    bgSurface: 'rgba(255, 255, 255, 0.92)',
    bgCard: 'rgba(255, 255, 255, 0.92)',
    bgCardHover: '#FFFFFF',

    textMain: '#1A1A1A',
    textSecondary: '#6B665E',
    textMuted: '#8C857B',
    textSubtle: '#A8A095',

    border: '#E2DDD2',
    borderSubtle: '#EBE7DD',
    glassBorder: 'rgba(212, 197, 249, 0.35)'
  };

  const PRESETS = {
    'warm-paper-pastel': {
      name: 'Warm Paper & Pastel Spectrum (Default)',
      props: { ...DEFAULT_PROPS }
    },
    'cad-blueprint': {
      name: 'CAD Blueprint Electric',
      props: {
        primary: '#38BDF8',
        primaryHover: '#0EA5E9',
        primaryGlow: 'rgba(56, 189, 248, 0.38)',
        primaryLight: 'rgba(56, 189, 248, 0.12)',
        primaryBorder: 'rgba(56, 189, 248, 0.35)',
        secondary: '#06B6D4',
        secondaryHover: '#0891B2',
        secondaryGlow: 'rgba(6, 182, 212, 0.3)',
        secondaryLight: 'rgba(6, 182, 212, 0.12)',
        accentEmerald: '#10B981',
        accentEmeraldGlow: 'rgba(16, 185, 129, 0.3)',
        accentPeach: 'rgba(56, 189, 248, 0.15)',
        accentPeachSubtle: 'rgba(56, 189, 248, 0.08)',
        accentApricot: '#7DD3FC',
        bgCanvas: '#060B14',
        bgSurface: '#0B1526',
        bgCard: 'rgba(11, 21, 38, 0.8)',
        bgCardHover: 'rgba(16, 31, 56, 0.9)',
        textMain: '#F0F9FF',
        textSecondary: '#94A3B8',
        textMuted: '#64748B',
        textSubtle: '#475569',
        border: 'rgba(56, 189, 248, 0.15)',
        borderSubtle: 'rgba(56, 189, 248, 0.08)',
        glassBorder: 'rgba(56, 189, 248, 0.2)'
      }
    },
    'solar-amber': {
      name: 'Solar Amber Diurnal',
      props: {
        primary: '#F59E0B',
        primaryHover: '#D97706',
        primaryGlow: 'rgba(245, 158, 11, 0.38)',
        primaryLight: 'rgba(245, 158, 11, 0.14)',
        primaryBorder: 'rgba(245, 158, 11, 0.35)',
        secondary: '#00E5FF',
        secondaryHover: '#00B4D8',
        secondaryGlow: 'rgba(0, 229, 255, 0.3)',
        secondaryLight: 'rgba(0, 229, 255, 0.12)',
        accentEmerald: '#10B981',
        accentEmeraldGlow: 'rgba(16, 185, 129, 0.3)',
        accentPeach: 'rgba(245, 158, 11, 0.15)',
        accentPeachSubtle: 'rgba(245, 158, 11, 0.08)',
        accentApricot: '#FCD34D',
        bgCanvas: '#0A0805',
        bgSurface: '#14100A',
        bgCard: 'rgba(20, 16, 10, 0.82)',
        bgCardHover: 'rgba(30, 24, 15, 0.92)',
        textMain: '#FFFBEB',
        textSecondary: '#D1D5DB',
        textMuted: '#9CA3AF',
        textSubtle: '#6B7280',
        border: 'rgba(245, 158, 11, 0.16)',
        borderSubtle: 'rgba(245, 158, 11, 0.08)',
        glassBorder: 'rgba(245, 158, 11, 0.22)'
      }
    },
    'eco-forest': {
      name: 'Eco Forest Bioclimatic',
      props: {
        primary: '#10B981',
        primaryHover: '#059669',
        primaryGlow: 'rgba(16, 185, 129, 0.35)',
        primaryLight: 'rgba(16, 185, 129, 0.12)',
        primaryBorder: 'rgba(16, 185, 129, 0.32)',
        secondary: '#F59E0B',
        secondaryHover: '#D97706',
        secondaryGlow: 'rgba(245, 158, 11, 0.3)',
        secondaryLight: 'rgba(245, 158, 11, 0.12)',
        accentEmerald: '#34D399',
        accentEmeraldGlow: 'rgba(52, 211, 153, 0.3)',
        accentPeach: 'rgba(16, 185, 129, 0.15)',
        accentPeachSubtle: 'rgba(16, 185, 129, 0.08)',
        accentApricot: '#6EE7B7',
        bgCanvas: '#060E0A',
        bgSurface: '#0C1A13',
        bgCard: 'rgba(12, 26, 19, 0.8)',
        bgCardHover: 'rgba(18, 38, 28, 0.9)',
        textMain: '#ECFDF5',
        textSecondary: '#94A3B8',
        textMuted: '#64748B',
        textSubtle: '#475569',
        border: 'rgba(16, 185, 129, 0.16)',
        borderSubtle: 'rgba(16, 185, 129, 0.08)',
        glassBorder: 'rgba(16, 185, 129, 0.22)'
      }
    },
    'clean-architectural-light': {
      name: 'Clean Architectural (Light Mode)',
      props: {
        primary: '#0284C7',
        primaryHover: '#0369A1',
        primaryGlow: 'rgba(2, 132, 199, 0.25)',
        primaryLight: '#F0F9FF',
        primaryBorder: 'rgba(2, 132, 199, 0.25)',
        secondary: '#D97706',
        secondaryHover: '#B45309',
        secondaryGlow: 'rgba(217, 119, 6, 0.22)',
        secondaryLight: '#FFFBEB',
        accentEmerald: '#059669',
        accentEmeraldGlow: 'rgba(5, 150, 105, 0.25)',
        accentPeach: '#E0F2FE',
        accentPeachSubtle: 'rgba(224, 242, 254, 0.45)',
        accentApricot: '#BAE6FD',
        bgCanvas: '#F8FAFC',
        bgSurface: '#FFFFFF',
        bgCard: 'rgba(255, 255, 255, 0.85)',
        bgCardHover: 'rgba(255, 255, 255, 0.98)',
        textMain: '#0F172A',
        textSecondary: '#334155',
        textMuted: '#64748B',
        textSubtle: '#94A3B8',
        border: 'rgba(15, 23, 42, 0.08)',
        borderSubtle: 'rgba(148, 163, 184, 0.3)',
        glassBorder: 'rgba(255, 255, 255, 0.95)'
      }
    }
  };

  const STORAGE_KEY = 'therma_theme_props';
  const PRESET_KEY = 'therma_theme_preset';

  // State
  let currentProps = { ...DEFAULT_PROPS };
  let currentPreset = 'warm-paper-pastel';

  // Helper: Convert hex to rgba
  function hexToRgba(hex, alpha) {
    if (!hex || hex.startsWith('rgba')) return hex;
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Inject or update CSS variables on :root
  function applyThemeToDOM(props) {
    const root = document.documentElement;

    root.style.setProperty('--theme-primary', props.primary);
    root.style.setProperty('--theme-primary-hover', props.primaryHover || props.primary);
    root.style.setProperty('--theme-primary-glow', props.primaryGlow || hexToRgba(props.primary, 0.35));
    root.style.setProperty('--theme-primary-light', props.primaryLight || hexToRgba(props.primary, 0.12));
    root.style.setProperty('--theme-primary-border', props.primaryBorder || hexToRgba(props.primary, 0.35));

    root.style.setProperty('--theme-secondary', props.secondary);
    root.style.setProperty('--theme-secondary-hover', props.secondaryHover || props.secondary);
    root.style.setProperty('--theme-secondary-glow', props.secondaryGlow || hexToRgba(props.secondary, 0.3));
    root.style.setProperty('--theme-secondary-light', props.secondaryLight || hexToRgba(props.secondary, 0.12));

    if (props.accentEmerald) root.style.setProperty('--theme-accent-emerald', props.accentEmerald);
    if (props.accentPeach) root.style.setProperty('--theme-accent-peach', props.accentPeach);
    if (props.accentPeachSubtle) root.style.setProperty('--theme-accent-peach-subtle', props.accentPeachSubtle);
    if (props.accentApricot) root.style.setProperty('--theme-accent-apricot', props.accentApricot);

    root.style.setProperty('--theme-bg-canvas', props.bgCanvas);
    root.style.setProperty('--theme-bg-surface', props.bgSurface);
    root.style.setProperty('--theme-bg-card', props.bgCard);
    root.style.setProperty('--theme-bg-card-hover', props.bgCardHover);

    root.style.setProperty('--theme-text-main', props.textMain);
    root.style.setProperty('--theme-text-secondary', props.textSecondary);
    root.style.setProperty('--theme-text-muted', props.textMuted);
    if (props.textSubtle) root.style.setProperty('--theme-text-subtle', props.textSubtle);

    if (props.border) root.style.setProperty('--theme-border', props.border);
    if (props.borderSubtle) root.style.setProperty('--theme-border-subtle', props.borderSubtle);
    if (props.glassBorder) root.style.setProperty('--theme-glass-border', props.glassBorder);

    // Update body background immediately
    document.body && (document.body.style.backgroundColor = props.bgCanvas);
  }

  // Load saved theme from localStorage
  function loadSavedTheme() {
    try {
      const savedPreset = localStorage.getItem(PRESET_KEY);
      const savedProps = localStorage.getItem(STORAGE_KEY);
      if (savedPreset && PRESETS[savedPreset]) {
        currentPreset = savedPreset;
        currentProps = { ...PRESETS[savedPreset].props };
      }
      if (savedProps) {
        const parsed = JSON.parse(savedProps);
        currentProps = { ...currentProps, ...parsed };
      }
    } catch (e) {
      console.warn('ThermaTheme: Could not load saved theme:', e);
    }
    applyThemeToDOM(currentProps);
  }

  // Save to localStorage
  function persistTheme() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentProps));
      localStorage.setItem(PRESET_KEY, currentPreset);
    } catch (e) {
      console.warn('ThermaTheme: Could not persist theme:', e);
    }
  }

  // Public API
  const ThermaTheme = {
    props: currentProps,
    presets: PRESETS,

    setTheme: function (newProps, save = true) {
      currentProps = { ...currentProps, ...newProps };
      applyThemeToDOM(currentProps);
      if (save) persistTheme();
      updateCustomizerInputs();
      return currentProps;
    },

    applyPreset: function (presetName) {
      if (!PRESETS[presetName]) {
        console.warn(`ThermaTheme: Preset '${presetName}' not found.`);
        return;
      }
      currentPreset = presetName;
      currentProps = { ...PRESETS[presetName].props };
      applyThemeToDOM(currentProps);
      persistTheme();
      updateCustomizerInputs();
      showToast(`Theme applied: ${PRESETS[presetName].name}`);
    },

    getTheme: function () {
      return { ...currentProps };
    },

    reset: function () {
      this.applyPreset('modern-dark-studio');
      showToast('Theme reset to Modern Dark Studio default');
    },

    exportCSS: function () {
      const p = currentProps;
      const css = `/* ThermaBuild Custom Theme Props */
:root {
  --theme-primary: ${p.primary};
  --theme-primary-hover: ${p.primaryHover};
  --theme-secondary: ${p.secondary};
  --theme-secondary-hover: ${p.secondaryHover};
  --theme-bg-canvas: ${p.bgCanvas};
  --theme-bg-surface: ${p.bgSurface};
  --theme-bg-card: ${p.bgCard};
  --theme-text-main: ${p.textMain};
  --theme-text-secondary: ${p.textSecondary};
  --theme-text-muted: ${p.textMuted};
  --theme-border: ${p.border};
}`;
      navigator.clipboard.writeText(css).then(() => {
        showToast('CSS Theme Tokens copied to clipboard!');
      }).catch(() => {
        showToast('Tokens ready in console.');
        console.log(css);
      });
      return css;
    }
  };

  // Toast Notification Helper
  function showToast(msg) {
    let toast = document.getElementById('therma-theme-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'therma-theme-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #0E131F;
        color: #F8FAFC;
        padding: 12px 22px;
        border-radius: 9999px;
        border: 1px solid rgba(0, 229, 255, 0.3);
        font-family: var(--font-primary, sans-serif);
        font-size: 0.86rem;
        font-weight: 600;
        box-shadow: 0 10px 30px rgba(0,0,0,0.6), 0 0 20px rgba(0, 229, 255, 0.2);
        z-index: 100000;
        pointer-events: none;
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.25s ease, transform 0.25s ease;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
    }, 2800);
  }

  // Update UI Inputs if Customizer is Open
  function updateCustomizerInputs() {
    const p = currentProps;
    const priInput = document.getElementById('theme-picker-primary');
    const secInput = document.getElementById('theme-picker-secondary');
    const bgInput = document.getElementById('theme-picker-bg');
    const textInput = document.getElementById('theme-picker-text');

    if (priInput) priInput.value = p.primary;
    if (secInput) secInput.value = p.secondary;
    if (bgInput) bgInput.value = p.bgCanvas.startsWith('#') ? p.bgCanvas : '#07090E';
    if (textInput) textInput.value = p.textMain.startsWith('#') ? p.textMain : '#F8FAFC';

    // Highlight active preset badge
    document.querySelectorAll('.theme-preset-badge').forEach(b => {
      const isActive = (b.dataset.preset === currentPreset);
      b.style.borderColor = isActive ? 'var(--theme-primary)' : 'rgba(255,255,255,0.08)';
      b.style.background = isActive ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255,255,255,0.02)';
      b.style.fontWeight = isActive ? '700' : '500';
    });
  }

  // Create the Floating Live Theme Customizer
  function mountThemeCustomizer() {
    if (document.getElementById('therma-theme-customizer')) return;

    const wrap = document.createElement('div');
    wrap.id = 'therma-theme-customizer';
    wrap.innerHTML = `
      <!-- Floating Trigger Button -->
      <button id="theme-customizer-toggle" title="Customize Color Theme Props" style="
        position: fixed;
        bottom: 24px;
        left: 24px;
        width: 46px;
        height: 46px;
        border-radius: 50%;
        background: rgba(14, 20, 32, 0.85);
        color: var(--theme-primary, #00E5FF);
        border: 1px solid var(--theme-glass-border, rgba(255, 255, 255, 0.15));
        box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 16px var(--theme-primary-glow, rgba(0, 229, 255, 0.25));
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 99999;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s, border-color 0.2s;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 2a4.5 4.5 0 0 0 0 9 4.5 4.5 0 0 1 0 9 4.5 4.5 0 0 0 0-9 4.5 4.5 0 0 1 0-9z"></path>
          <circle cx="8" cy="8" r="1.5" fill="currentColor"></circle>
          <circle cx="16" cy="8" r="1.5" fill="currentColor"></circle>
          <circle cx="12" cy="16" r="1.5" fill="currentColor"></circle>
        </svg>
      </button>

      <!-- Glassmorphic Flyout Panel -->
      <div id="theme-customizer-panel" style="
        position: fixed;
        bottom: 80px;
        left: 24px;
        width: 320px;
        background: rgba(14, 19, 31, 0.95);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid var(--theme-glass-border, rgba(255,255,255,0.15));
        border-radius: 18px;
        box-shadow: 0 24px 64px rgba(0,0,0,0.8), 0 0 32px rgba(0, 229, 255, 0.15);
        padding: 20px;
        z-index: 99999;
        display: none;
        flex-direction: column;
        gap: 16px;
        font-family: var(--font-primary, sans-serif);
      ">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.1rem; color: var(--theme-primary);">🎨</span>
            <span style="font-weight: 700; font-size: 0.95rem; color: var(--theme-text-main, #F8FAFC);">Theme Architecture</span>
          </div>
          <button id="theme-panel-close" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--theme-text-muted, #94A3B8); line-height: 1;">✕</button>
        </div>

        <!-- Presets -->
        <div>
          <div style="font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--theme-text-muted); margin-bottom: 8px;">Curated Presets</div>
          <div style="display: flex; flex-direction: column; gap: 6px;" id="theme-preset-list">
            ${Object.keys(PRESETS).map(key => `
              <button class="theme-preset-badge" data-preset="${key}" style="
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 7px 10px;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.08);
                background: rgba(255,255,255,0.02);
                color: var(--theme-text-main);
                font-size: 0.82rem;
                cursor: pointer;
                text-align: left;
                transition: background 0.15s, border-color 0.15s;
              ">
                <span style="width: 14px; height: 14px; border-radius: 50%; background: ${PRESETS[key].props.primary}; display: inline-block; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 0 6px ${PRESETS[key].props.primaryGlow};"></span>
                <span style="flex: 1;">${PRESETS[key].name}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Live Color Pickers -->
        <div>
          <div style="font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--theme-text-muted); margin-bottom: 8px;">Fine-Tune Props</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <label style="display: flex; flex-direction: column; gap: 4px; font-size: 0.76rem; color: var(--theme-text-secondary);">
              Thermal Cyan
              <div style="display: flex; align-items: center; gap: 6px;">
                <input type="color" id="theme-picker-primary" value="${currentProps.primary}" style="width: 28px; height: 28px; border: none; border-radius: 6px; cursor: pointer; padding: 0; background: none;">
                <span style="font-family: monospace; font-size: 0.74rem; color: var(--theme-text-muted);">Accent</span>
              </div>
            </label>

            <label style="display: flex; flex-direction: column; gap: 4px; font-size: 0.76rem; color: var(--theme-text-secondary);">
              Solar Amber
              <div style="display: flex; align-items: center; gap: 6px;">
                <input type="color" id="theme-picker-secondary" value="${currentProps.secondary}" style="width: 28px; height: 28px; border: none; border-radius: 6px; cursor: pointer; padding: 0; background: none;">
                <span style="font-family: monospace; font-size: 0.74rem; color: var(--theme-text-muted);">Diurnal</span>
              </div>
            </label>

            <label style="display: flex; flex-direction: column; gap: 4px; font-size: 0.76rem; color: var(--theme-text-secondary);">
              Canvas BG
              <div style="display: flex; align-items: center; gap: 6px;">
                <input type="color" id="theme-picker-bg" value="${currentProps.bgCanvas}" style="width: 28px; height: 28px; border: none; border-radius: 6px; cursor: pointer; padding: 0; background: none;">
                <span style="font-family: monospace; font-size: 0.74rem; color: var(--theme-text-muted);">Canvas</span>
              </div>
            </label>

            <label style="display: flex; flex-direction: column; gap: 4px; font-size: 0.76rem; color: var(--theme-text-secondary);">
              Heading Text
              <div style="display: flex; align-items: center; gap: 6px;">
                <input type="color" id="theme-picker-text" value="${currentProps.textMain}" style="width: 28px; height: 28px; border: none; border-radius: 6px; cursor: pointer; padding: 0; background: none;">
                <span style="font-family: monospace; font-size: 0.74rem; color: var(--theme-text-muted);">Text</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 8px; margin-top: 4px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08);">
          <button id="theme-btn-copy" style="
            flex: 1;
            padding: 8px 12px;
            background: var(--theme-primary, #00E5FF);
            color: #07090E;
            border: none;
            border-radius: 8px;
            font-size: 0.78rem;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 0 12px var(--theme-primary-glow);
          ">Copy CSS Props</button>
          <button id="theme-btn-reset" style="
            padding: 8px 12px;
            background: rgba(255,255,255,0.06);
            color: var(--theme-text-secondary);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 8px;
            font-size: 0.78rem;
            font-weight: 600;
            cursor: pointer;
          ">Reset</button>
        </div>
      </div>
    `;

    document.body.appendChild(wrap);

    // Event listeners
    const toggle = document.getElementById('theme-customizer-toggle');
    const panel = document.getElementById('theme-customizer-panel');
    const closeBtn = document.getElementById('theme-panel-close');

    toggle.addEventListener('click', () => {
      panel.style.display = (panel.style.display === 'flex') ? 'none' : 'flex';
      updateCustomizerInputs();
    });

    closeBtn.addEventListener('click', () => {
      panel.style.display = 'none';
    });

    // Preset clicks
    document.querySelectorAll('.theme-preset-badge').forEach(btn => {
      btn.addEventListener('click', () => {
        ThermaTheme.applyPreset(btn.dataset.preset);
      });
    });

    // Color Pickers
    document.getElementById('theme-picker-primary').addEventListener('input', (e) => {
      ThermaTheme.setTheme({ primary: e.target.value, primaryHover: e.target.value });
    });

    document.getElementById('theme-picker-secondary').addEventListener('input', (e) => {
      ThermaTheme.setTheme({ secondary: e.target.value, secondaryHover: e.target.value });
    });

    document.getElementById('theme-picker-bg').addEventListener('input', (e) => {
      ThermaTheme.setTheme({ bgCanvas: e.target.value });
    });

    document.getElementById('theme-picker-text').addEventListener('input', (e) => {
      ThermaTheme.setTheme({ textMain: e.target.value });
    });

    // Copy CSS
    document.getElementById('theme-btn-copy').addEventListener('click', () => {
      ThermaTheme.exportCSS();
    });

    // Reset
    document.getElementById('theme-btn-reset').addEventListener('click', () => {
      ThermaTheme.reset();
    });
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      loadSavedTheme();
    });
  } else {
    loadSavedTheme();
  }

  // Expose globally
  window.ThermaTheme = ThermaTheme;

})();
