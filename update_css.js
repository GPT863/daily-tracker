const fs = require('fs');

const cssAppends = `

/* =========================================================
   NEW BOTTOM NAVIGATION OVERRIDES
   ========================================================= */
.app-main {
    padding-bottom: calc(var(--space-md) + 85px + env(safe-area-inset-bottom)) !important;
}

.bottom-actions {
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
    height: 64px !important;
    background: rgba(255, 255, 255, 0.95) !important;
    backdrop-filter: blur(10px) !important;
    -webkit-backdrop-filter: blur(10px) !important;
    display: flex !important;
    justify-content: space-around !important;
    align-items: center !important;
    box-shadow: 0 -1px 0 rgba(0,0,0,0.05), 0 -4px 24px rgba(0,0,0,0.04) !important;
    z-index: 1000 !important;
    padding-bottom: env(safe-area-inset-bottom) !important;
    max-width: none !important;
    gap: 0 !important;
}

.fab-home, .fab-record, .fab-reminder, .fab-my {
    flex: 1 !important;
    height: 100% !important;
    width: auto !important;
    border-radius: 0 !important;
    background: transparent !important;
    color: #94a3b8 !important;
    border: none !important;
    box-shadow: none !important;
    cursor: pointer !important;
    transition: color 0.2s, transform 0.2s !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 4px !important;
    font-size: 1.4rem !important;
    padding: 0 !important;
}

.fab-home:hover, .fab-reminder:hover, .fab-my:hover {
    transform: none !important;
    box-shadow: none !important;
    color: var(--forest-color) !important;
}

.nav-icon {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    line-height: 1 !important;
    transition: transform 0.2s !important;
    font-size: inherit !important;
}

.nav-label {
    display: block !important;
    font-size: 0.65rem !important;
    font-weight: 500 !important;
    line-height: 1 !important;
}

.fab-record {
    position: relative !important;
    top: -14px !important;
    overflow: visible !important;
}

.fab-record .nav-icon {
    width: 52px !important;
    height: 52px !important;
    border-radius: 50% !important;
    background: linear-gradient(135deg, var(--forest-color), var(--primary-color)) !important;
    color: white !important;
    font-size: 1.6rem !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    box-shadow: 0 4px 16px rgba(40, 122, 68, 0.35) !important;
}

.fab-record .nav-label {
    position: absolute !important;
    bottom: -18px !important;
    color: #94a3b8 !important;
    width: 100% !important;
    text-align: center !important;
}

.nav-active {
    color: var(--forest-color) !important;
    box-shadow: none !important;
}

.nav-active .nav-icon {
    transform: scale(1.1) !important;
}

.nav-active.fab-record .nav-icon {
    box-shadow: 0 6px 20px rgba(40, 122, 68, 0.45) !important;
}

.nav-active.fab-record .nav-label {
    color: var(--forest-color) !important;
    font-weight: 600 !important;
}
`;

fs.appendFileSync('style.css', cssAppends, 'utf8');
console.log('Appended safely to style.css');
