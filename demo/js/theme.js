/**
 * ==========================================================================
 * ThermaBuild — Dynamic Theme Prop Engine & Live Customizer
 * ==========================================================================
 * Allows developers and users to configure the color theme as a prop.
 * 
 * Usage:
 *   ThermaTheme.setTheme({ primary: '#2563EB', bgCanvas: '#F8FAFC' });
 *   ThermaTheme.applyPreset('cad-blueprint');
 *   ThermaTheme.copyCSS();
 */

(function () {
  'use strict';

  const DEFAULT_PROPS = {
    primary: '#DE7236',
    primaryHover: '#CF6124',
    primaryGlow: 'rgba(222, 114, 54, 0.28)',
    primaryLight: '#FFF8F4',
    primaryBorder: 'rgba(222, 114, 54, 0.25)',

    secondary: '#3E8074',
    secondaryHover: '#2F6F66',
    secondaryGlow: 'rgba(62, 128, 116, 0.22)',
    secondaryLight: '#EBF4F2',

    accentPeach: '#FDE7DA',
    accentPeachSubtle: 'rgba(253, 231, 218, 0.45)',
    accentApricot: '#F8B185',

    bgCanvas: '#FAF7F2',
    bgSurface: '#FFFFFF',
    bgCard: 'rgba(255, 255, 255, 0.72)',
    bgCardHover: 'rgba(255, 255, 255, 0.88)',

    textMain: '#1C1F22',
    textSecondary: '#525960',
    textMuted: '#848D96',
    textSubtle: '#B0B8C0',

    border: 'rgba(0, 0, 0, 0.08)',
    borderSubtle: 'rgba(218, 208, 198, 0.45)',
    glassBorder: 'rgba(255, 255, 255, 0.82)'
  };

  const PRESETS = {
    'warm-bioclimatic': {
      name: 'Warm Bioclimatic (Default)',
      props: { ...DEFAULT_PROPS }
    },
    'cad-blueprint': {
      name: 'CAD Blueprint Blue',
      props: {
        primary: '#0284C7',
        primaryHover: '#0369A1',
        primaryGlow: 'rgba(2, 132, 199, 0.3)',
        primaryLight: '#F0F9FF',
        primaryBorder: 'rgba(2, 132, 199, 0.25)',
        secondary: '#0D9488',
        secondaryHover: '#0F766E',
        secondaryGlow: 'rgba(13, 148, 136, 0.25)',
        secondaryLight: '#F0FDFA',
        accentPeach: '#E0F2FE',
        accentPeachSubtle: 'rgba(224, 242, 254, 0.45)',
        accentApricot: '#BAE6FD',
        bgCanvas: '#F8FAFC',
        bgSurface: '#FFFFFF',
        bgCard: 'rgba(255, 255, 255, 0.8)',
        bgCardHover: 'rgba(255, 255, 255, 0.95)',
        textMain: '#0F172A',
        textSecondary: '#334155',
        textMuted: '#64748B',
        textSubtle: '#94A3B8',
        border: 'rgba(15, 23, 42, 0.08)',
        borderSubtle: 'rgba(148, 163, 184, 0.3)',
        glassBorder: 'rgba(255, 255, 255, 0.9)'
      }
    },
    'eco-forest': {
      name: 'Eco Forest & Sustainable Sage',
      props: {
        primary: '#059669',
        primaryHover: '#047857',
        primaryGlow: 'rgba(5, 150, 105, 0.28)',
        primaryLight: '#ECFDF5',
        primaryBorder: 'rgba(5, 150, 105, 0.25)',
        secondary: '#D97706',
        secondaryHover: '#B45309',
        secondaryGlow: 'rgba(217, 119, 6, 0.25)',
        secondaryLight: '#FFFBEB',
        accentPeach: '#D1FAE5',
        accentPeachSubtle: 'rgba(209, 250, 229, 0.45)',
        accentApricot: '#A7F3D0',
        bgCanvas: '#F3F8F5',
        bgSurface: '#FFFFFF',
        bgCard: 'rgba(255, 255, 255, 0.78)',
        bgCardHover: 'rgba(255, 255, 255, 0.92)',
        textMain: '#064E3B',
        textSecondary: '#1F2937',
        textMuted: '#6B7280',
        textSubtle: '#9CA3AF',
        border: 'rgba(6, 78, 59, 0.08)',
        borderSubtle: 'rgba(110, 150, 130, 0.3)',
        glassBorder: 'rgba(255, 255, 255, 0.85)'
      }
    },
    'dark-obsidian': {
      name: 'Dark Obsidian CAD Mode',
      props: {
        primary: '#F59E0B',
        primaryHover: '#D97706',
        primaryGlow: 'rgba(245, 158, 11, 0.35)',
        primaryLight: '#262015',
        primaryBorder: 'rgba(245, 158, 11, 0.35)',
        secondary: '#10B981',
        secondaryHover: '#059669',
        secondaryGlow: 'rgba(16, 185, 129, 0.3)',
        secondaryLight: '#11221B',
        accentPeach: '#2A241C',
        accentPeachSubtle: 'rgba(42, 36, 28, 0.6)',
        accentApricot: '#78350F',
        bgCanvas: '#0F1216',
        bgSurface: '#181C22',
        bgCard: 'rgba(24, 28, 34, 0.82)',
        bgCardHover: 'rgba(32, 38, 46, 0.92)',
        textMain: '#F8FAFC',
        textSecondary: '#CBD5E1',
        textMuted: '#94A3B8',
        textSubtle: '#64748B',
        border: 'rgba(255, 255, 255, 0.1)',
        borderSubtle: 'rgba(255, 255, 255, 0.08)',
        glassBorder: 'rgba(255, 255, 255, 0.12)'
      }
    },
    'corporate-slate': {
      name: 'Corporate Graphite & Coral',
      props: {
        primary: '#E11D48',
        primaryHover: '#BE123C',
        primaryGlow: 'rgba(225, 29, 72, 0.28)',
        primaryLight: '#FFF1F2',
        primaryBorder: 'rgba(225, 29, 72, 0.25)',
        secondary: '#4F46E5',
        secondaryHover: '#4338CA',
        secondaryGlow: 'rgba(79, 70, 229, 0.25)',
        secondaryLight: '#EEF2FF',
        accentPeach: '#FFE4E6',
        accentPeachSubtle: 'rgba(255, 228, 230, 0.45)',
        accentApricot: '#FECDD3',
        bgCanvas: '#F8FAFC',
        bgSurface: '#FFFFFF',
        bgCard: 'rgba(255, 255, 255, 0.78)',
        bgCardHover: 'rgba(255, 255, 255, 0.92)',
        textMain: '#0F172A',
        textSecondary: '#334155',
        textMuted: '#64748B',
        textSubtle: '#94A3B8',
        border: 'rgba(15, 23, 42, 0.08)',
        borderSubtle: 'rgba(148, 163, 184, 0.3)',
        glassBorder: 'rgba(255, 255, 255, 0.88)'
      }
    }
  };

  const STORAGE_KEY = 'therma_theme_props';
  const PRESET_KEY = 'therma_theme_preset';

  // State
  let currentProps = { ...DEFAULT_PROPS };
  let currentPreset = 'warm-bioclimatic';

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
    root.style.setProperty('--theme-primary-glow', props.primaryGlow || hexToRgba(props.primary, 0.28));
    root.style.setProperty('--theme-primary-light', props.primaryLight || hexToRgba(props.primary, 0.08));
    root.style.setProperty('--theme-primary-border', props.primaryBorder || hexToRgba(props.primary, 0.25));

    root.style.setProperty('--theme-secondary', props.secondary);
    root.style.setProperty('--theme-secondary-hover', props.secondaryHover || props.secondary);
    root.style.setProperty('--theme-secondary-glow', props.secondaryGlow || hexToRgba(props.secondary, 0.22));
    root.style.setProperty('--theme-secondary-light', props.secondaryLight || hexToRgba(props.secondary, 0.08));

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
      this.applyPreset('warm-bioclimatic');
      showToast('Theme reset to default');
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
        background: #1C1F22;
        color: #FFFFFF;
        padding: 12px 20px;
        border-radius: 9999px;
        font-family: var(--font-primary, sans-serif);
        font-size: 0.86rem;
        font-weight: 600;
        box-shadow: 0 10px 30px rgba(0,0,0,0.25);
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
    if (bgInput) bgInput.value = p.bgCanvas.startsWith('#') ? p.bgCanvas : '#FAF7F2';
    if (textInput) textInput.value = p.textMain.startsWith('#') ? p.textMain : '#1C1F22';

    // Highlight active preset badge
    document.querySelectorAll('.theme-preset-badge').forEach(b => {
      b.style.borderColor = (b.dataset.preset === currentPreset) ? 'var(--theme-primary)' : 'rgba(0,0,0,0.1)';
      b.style.fontWeight = (b.dataset.preset === currentPreset) ? '700' : '500';
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
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--theme-primary, #DE7236);
        color: #FFFFFF;
        border: 2px solid rgba(255, 255, 255, 0.85);
        box-shadow: 0 8px 24px rgba(0,0,0,0.18);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 99999;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s;
      ">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
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
        bottom: 84px;
        left: 24px;
        width: 320px;
        background: var(--theme-bg-surface, #FFFFFF);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid var(--theme-glass-border, rgba(255,255,255,0.85));
        border-radius: 20px;
        box-shadow: 0 20px 48px rgba(0,0,0,0.18);
        padding: 20px;
        z-index: 99999;
        display: none;
        flex-direction: column;
        gap: 16px;
        font-family: var(--font-primary, sans-serif);
        animation: panelFadeIn 0.25s ease forwards;
      ">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(0,0,0,0.06); padding-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.1rem;">🎨</span>
            <span style="font-weight: 700; font-size: 0.95rem; color: var(--theme-text-main, #1C1F22);">Theme Props</span>
          </div>
          <button id="theme-panel-close" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--theme-text-muted, #888); line-height: 1;">✕</button>
        </div>

        <!-- Presets -->
        <div>
          <div style="font-size: 0.76rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--theme-text-muted); margin-bottom: 8px;">Curated Presets</div>
          <div style="display: flex; flex-direction: column; gap: 6px;" id="theme-preset-list">
            ${Object.keys(PRESETS).map(key => `
              <button class="theme-preset-badge" data-preset="${key}" style="
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 7px 10px;
                border-radius: 10px;
                border: 1px solid rgba(0,0,0,0.08);
                background: rgba(0,0,0,0.02);
                color: var(--theme-text-main);
                font-size: 0.82rem;
                cursor: pointer;
                text-align: left;
                transition: background 0.15s, border-color 0.15s;
              ">
                <span style="width: 14px; height: 14px; border-radius: 50%; background: ${PRESETS[key].props.primary}; display: inline-block; border: 1px solid rgba(0,0,0,0.1);"></span>
                <span style="flex: 1;">${PRESETS[key].name}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Live Color Pickers -->
        <div>
          <div style="font-size: 0.76rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--theme-text-muted); margin-bottom: 8px;">Fine-Tune Props</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <label style="display: flex; flex-direction: column; gap: 4px; font-size: 0.78rem; color: var(--theme-text-secondary);">
              Primary Accent
              <div style="display: flex; align-items: center; gap: 6px;">
                <input type="color" id="theme-picker-primary" value="${currentProps.primary}" style="width: 32px; height: 32px; border: none; border-radius: 8px; cursor: pointer; padding: 0;">
                <span style="font-family: monospace; font-size: 0.75rem;">Primary</span>
              </div>
            </label>

            <label style="display: flex; flex-direction: column; gap: 4px; font-size: 0.78rem; color: var(--theme-text-secondary);">
              Bioclimatic Cool
              <div style="display: flex; align-items: center; gap: 6px;">
                <input type="color" id="theme-picker-secondary" value="${currentProps.secondary}" style="width: 32px; height: 32px; border: none; border-radius: 8px; cursor: pointer; padding: 0;">
                <span style="font-family: monospace; font-size: 0.75rem;">Cool</span>
              </div>
            </label>

            <label style="display: flex; flex-direction: column; gap: 4px; font-size: 0.78rem; color: var(--theme-text-secondary);">
              Canvas BG
              <div style="display: flex; align-items: center; gap: 6px;">
                <input type="color" id="theme-picker-bg" value="${currentProps.bgCanvas}" style="width: 32px; height: 32px; border: none; border-radius: 8px; cursor: pointer; padding: 0;">
                <span style="font-family: monospace; font-size: 0.75rem;">Canvas</span>
              </div>
            </label>

            <label style="display: flex; flex-direction: column; gap: 4px; font-size: 0.78rem; color: var(--theme-text-secondary);">
              Heading Text
              <div style="display: flex; align-items: center; gap: 6px;">
                <input type="color" id="theme-picker-text" value="${currentProps.textMain}" style="width: 32px; height: 32px; border: none; border-radius: 8px; cursor: pointer; padding: 0;">
                <span style="font-family: monospace; font-size: 0.75rem;">Text</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 8px; margin-top: 4px; padding-top: 10px; border-top: 1px solid rgba(0,0,0,0.06);">
          <button id="theme-btn-copy" style="
            flex: 1;
            padding: 8px 12px;
            background: var(--theme-primary, #DE7236);
            color: #FFFFFF;
            border: none;
            border-radius: 8px;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
          ">Copy CSS Props</button>
          <button id="theme-btn-reset" style="
            padding: 8px 12px;
            background: rgba(0,0,0,0.05);
            color: var(--theme-text-secondary);
            border: none;
            border-radius: 8px;
            font-size: 0.8rem;
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
      mountThemeCustomizer();
    });
  } else {
    loadSavedTheme();
    mountThemeCustomizer();
  }

  // Expose globally
  window.ThermaTheme = ThermaTheme;

})();
