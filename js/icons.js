const ICONS = {
  matches: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3.5V7M16 3.5V7M4 10h16"/>',
  learning: '<path d="M4 5.5h6.5A2.5 2.5 0 0 1 13 8v11H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M20 5.5h-6.5A2.5 2.5 0 0 0 11 8v11h6.5a2.5 2.5 0 0 1 2.5 2.5z"/>',
  equipment: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2"/><path d="M12 3v3.2M12 17.8V21M3 12h3.2M17.8 12H21"/>',
  boards: '<path d="M4 12V5h7l9 9-7 7-9-9z"/><circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none"/>',
  profile: '<circle cx="12" cy="9" r="3"/><path d="M5.5 19.5c1.4-2.6 3.6-3.8 6.5-3.8s5.1 1.2 6.5 3.8"/>',
  director: '<path d="M8.2 4.2h7.6V6.4H8.2z"/><rect x="6" y="5.8" width="12" height="14" rx="1.6"/><path d="M9 11h6M9 14.5h4"/>',
  users: '<circle cx="9" cy="9" r="2.1"/><circle cx="15.6" cy="9.4" r="1.7"/><path d="M4.8 18.6c.7-2.1 2.3-3.2 4.2-3.2s3.5 1.1 4.2 3.2"/><path d="M13.4 15.6c1.4-.15 2.6.45 3.4 2"/>',
  arrow: '<path d="M14.5 6 8 12.5 14.5 19"/><path d="M9 12.5h10"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
};

export function icon(name) {
  const body = ICONS[name] || "";
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

export function logoMark(className = "logo-mark") {
  return `<svg class="${className}" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="2" fill="currentColor"/>
    <path d="M16 2.2v5.2M16 24.6v5.2M2.2 16h5.2M24.6 16h5.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
  </svg>`;
}

const stroke = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';

const STAGE_SCENES = {
  gong: `<circle cx="80" cy="78" r="28" ${stroke}/><circle cx="80" cy="78" r="8" ${stroke}/><path d="M80 106v24M64 130h32" ${stroke}/>`,
  paper: `<rect x="54" y="28" width="52" height="78" ${stroke}/><circle cx="80" cy="62" r="14" ${stroke}/><circle cx="80" cy="62" r="2.4" fill="currentColor"/><path d="M54 90h52" ${stroke}/>`,
  barricade: `<path d="M28 128 80 24l52 104" ${stroke}/><path d="M46 96h68M40 112h80" ${stroke}/><circle cx="104" cy="72" r="7" ${stroke}/>`,
  roof: `<path d="M18 90 80 34l62 56" ${stroke}/><path d="M36 90v36h88V90" ${stroke}/><circle cx="112" cy="74" r="6" ${stroke}/>`,
  window: `<rect x="46" y="24" width="68" height="96" ${stroke}/><path d="M80 24v96M46 72h68" ${stroke}/><circle cx="98" cy="52" r="5" ${stroke}/>`,
  ladder: `<path d="M52 18v116M108 18v116M52 42h56M52 66h56M52 90h56M52 114h56" ${stroke}/>`,
  kyl: `<rect x="28" y="36" width="22" height="84" ${stroke}/><rect x="56" y="50" width="20" height="70" ${stroke}/><rect x="82" y="66" width="18" height="54" ${stroke}/><rect x="106" y="84" width="16" height="36" ${stroke}/>`,
  prone: `<path d="M18 108h124" ${stroke}/><path d="M36 108c8-28 22-40 44-40h28" ${stroke}/><circle cx="118" cy="62" r="8" ${stroke}/><path d="M96 78l18 30" ${stroke}/>`,
};

export function stageDiagram(kind) {
  const inner = STAGE_SCENES[kind] || STAGE_SCENES.gong;
  return `<svg viewBox="0 0 160 150" aria-hidden="true" focusable="false">${inner}</svg>`;
}

const GEAR_SCENES = {
  rifle: `<path d="M18 62h86l10-8h22" ${stroke}/><path d="M46 62v16M70 62v10h18" ${stroke}/><circle cx="124" cy="50" r="8" ${stroke}/>`,
  optic: `<rect x="28" y="46" width="104" height="22" rx="11" ${stroke}/><circle cx="80" cy="57" r="9" ${stroke}/><path d="M46 46l6-12h20M108 46l-4-12" ${stroke}/>`,
  bag: `<path d="M36 58c0-16 18-24 44-24s44 8 44 24v40c0 10-12 16-44 16s-44-6-44-16z" ${stroke}/><path d="M36 70h88" ${stroke}/>`,
  bipod: `<path d="M80 28v36M80 64l-36 52M80 64l36 52" ${stroke}/><path d="M36 116h16M108 116h16" ${stroke}/>`,
  tripod: `<path d="M80 24v40M80 64l-40 62M80 64l40 62M80 64v62" ${stroke}/><circle cx="80" cy="24" r="6" ${stroke}/>`,
  support: `<rect x="34" y="36" width="92" height="64" rx="6" ${stroke}/><path d="M48 54h40M48 70h64M48 84h28" ${stroke}/>`,
};

export function gearArt(kind) {
  const inner = GEAR_SCENES[kind] || GEAR_SCENES.support;
  return `<svg viewBox="0 0 160 130" aria-hidden="true" focusable="false">${inner}</svg>`;
}
