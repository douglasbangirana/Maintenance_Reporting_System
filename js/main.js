'use strict';

/* ---------- Navigation (Week 4: DOM + events) ---------- */
const navToggle = document.querySelector('#navToggle');
const nav = document.querySelector('#nav');
navToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(open));
});
nav.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') { nav.classList.remove('open'); navToggle.setAttribute('aria-expanded', 'false'); }
});

/* ---------- Week 3: async/await + Fetch (Open-Meteo, Fort Portal) ---------- */
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=0.671&longitude=30.275'
  + '&current=temperature_2m,precipitation&daily=weathercode,temperature_2m_max,precipitation_sum'
  + '&timezone=Africa%2FKampala&forecast_days=3';
const weatherBody = document.querySelector('#weather-body');

const showLoading = () => {
  weatherBody.innerHTML = '<p class="loading"><span class="spinner"></span> Loading weather…</p>';
};
const showError = (message) => {
  weatherBody.innerHTML = `<p>Weather is unavailable. ${message}</p><button class="retry" id="retry">Try again</button>`;
  document.querySelector('#retry').addEventListener('click', loadWeather);
};

async function loadWeather() {
  showLoading();
  try {
    const res = await fetch(WEATHER_URL);
    if (!res.ok) throw new Error(`Server replied ${res.status}.`);
    const { current, daily } = await res.json();               // destructuring
    const days = daily.time.map((date, i) => ({                 // arrow fn + spread-friendly objects
      date, max: daily.temperature_2m_max[i], rain: daily.precipitation_sum[i]
    }));
    const rainySoon = days.some(({ rain }) => rain >= 5);
    weatherBody.innerHTML = `
      <div class="now"><span class="temp">${Math.round(current.temperature_2m)}°C</span>
        <span>now, ${current.precipitation} mm rain</span></div>
      <ul class="days">${days.map(({ date, max, rain }) => `
        <li><strong>${new Date(date).toLocaleDateString('en-UG', { weekday: 'short' })}</strong>${Math.round(max)}°C<br>${rain} mm</li>`).join('')}
      </ul>
      ${rainySoon ? '<p class="warn">Heavy rain expected. Report leaks and blocked drains early.</p>' : ''}`;
  } catch (err) {
    showError('Check your internet connection and try again.');
    console.error(err);
  }
}
loadWeather();

/* ---------- Week 4: validated form ---------- */
const form = document.querySelector('#reportForm');
const statusEl = document.querySelector('#formStatus');
const desc = form.elements.description;
const descCount = document.querySelector('#descCount');

const rules = {
  fullName: (v) => !v ? 'Enter your full name.'
    : v.length < 3 ? 'Name must be at least 3 characters.'
    : !/^[A-Za-z][A-Za-z .'-]*$/.test(v) ? 'Use letters only (spaces, . \' - allowed).' : '',
  email: (v) => !v ? 'Enter your email address.'
    : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'Enter a valid email such as name@mmu.ac.ug.' : '',
  phone: (v) => !v ? 'Enter your phone number.'
    : !/^(\+256|0)7\d{8}$/.test(v.replace(/\s/g, '')) ? 'Use a Uganda mobile number like 0772123456 or +256772123456.' : '',
  category: (v) => v ? '' : 'Choose a category.',
  location: (v) => v ? '' : 'Choose a location.',
  priority: (v) => v ? '' : 'Choose a priority.',
  description: (v) => !v ? 'Describe the problem.'
    : v.length < 20 ? `Add more detail (${v.length}/20 characters minimum).`
    : v.length > 500 ? 'Keep the description under 500 characters.' : ''
};

const getValue = (name) => name === 'priority'
  ? (form.querySelector('input[name="priority"]:checked')?.value ?? '')
  : form.elements[name].value.trim();

function validateField(name) {
  const message = rules[name](getValue(name));
  document.querySelector(`#${name}-error`).textContent = message;
  const control = name === 'priority' ? null : form.elements[name];
  control?.classList.toggle('invalid', Boolean(message));
  control?.setAttribute('aria-invalid', String(Boolean(message)));
  return !message;
}

Object.keys(rules).forEach((name) => {
  const targets = name === 'priority' ? form.querySelectorAll('input[name="priority"]') : [form.elements[name]];
  targets.forEach((el) => {
    el.addEventListener('blur', () => validateField(name));
    el.addEventListener(el.tagName === 'SELECT' || el.type === 'radio' ? 'change' : 'input', () => {
      if (el.classList.contains('invalid') || name === 'priority') validateField(name);
    });
  });
});
desc.addEventListener('input', () => { descCount.textContent = desc.value.length; });

form.addEventListener('submit', (e) => {
  e.preventDefault();                                            // block native submit
  statusEl.textContent = '';
  const results = Object.keys(rules).map(validateField);        // validate every field
  if (results.includes(false)) {
    form.querySelector('.invalid, input[name="priority"]')?.focus();
    statusEl.textContent = '';
    return;                                                     // invalid: stop here
  }
  const report = {
    id: Date.now(),
    ...Object.fromEntries(Object.keys(rules).map((n) => [n, getValue(n)])),
    createdAt: new Date().toISOString()
  };
  reports = [report, ...reports];
  saveReports();
  render();
  form.reset();
  descCount.textContent = '0';
  statusEl.textContent = `Report #${String(report.id).slice(-5)} received. Our team will follow up by email or phone.`;
});

/* ---------- Reports list: DOM creation, filtering, deleting ---------- */
const STORE_KEY = 'mmu-fixit-reports';
const listEl = document.querySelector('#reportList');
const totalEl = document.querySelector('#reportTotal');
let activeFilter = 'All';
let reports = [];
try { reports = JSON.parse(localStorage.getItem(STORE_KEY)) ?? []; } catch { reports = []; }
const saveReports = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(reports)); } catch { /* storage unavailable */ } };

function render() {
  const shown = activeFilter === 'All' ? reports : reports.filter((r) => r.priority === activeFilter);
  totalEl.textContent = reports.length;
  listEl.replaceChildren();
  if (!shown.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = reports.length ? `No ${activeFilter} priority reports.` : 'No reports yet. Use the form above to report your first fault.';
    listEl.append(li);
    return;
  }
  shown.forEach(({ id, category, location, priority, description, fullName, createdAt }) => {
    const li = document.createElement('li');
    li.className = `report p-${priority}`;
    const h = document.createElement('h3');
    h.textContent = `${category} at ${location}`;             // textContent avoids injecting HTML
    const meta = document.createElement('p');
    meta.className = 'meta';
    meta.textContent = `${priority} priority, by ${fullName}, ${new Date(createdAt).toLocaleString('en-UG')}`;
    const p = document.createElement('p');
    p.textContent = description;
    const del = document.createElement('button');
    del.className = 'del'; del.type = 'button'; del.textContent = 'Delete report';
    del.addEventListener('click', () => { reports = reports.filter((r) => r.id !== id); saveReports(); render(); });
    li.append(h, meta, p, del);
    listEl.append(li);
  });
}

document.querySelector('#filters').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  activeFilter = chip.dataset.filter;
  document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === chip));
  render();
});
render();
