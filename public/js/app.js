const API_BASE = '/api';

async function apiCall(endpoint, method = 'GET', body = null) {
  const options = { method, headers: { 'Accept': 'application/json' } };
  if (body !== null) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE}/${endpoint}`, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { error: data.detail || 'Request failed. Please try again.' };
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    return { error: 'Cannot connect to the server. Check your connection and try again.' };
  }
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map(part => part[0].toUpperCase()).join('') || 'MC';
}

function formatDoctorName(name = '') {
  if (!name) return 'Doctor';
  const clean = String(name).trim();
  return clean.toLowerCase().startsWith('dr.') ? clean : `Dr. ${clean}`;
}

function formatDate(value) {
  if (!value) return 'Not available';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function formatDateTime(value) {
  if (!value) return 'Not available';
  const normalized = String(value).includes('T') ? value : String(value).replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return new Intl.DateTimeFormat('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
  }).format(date);
}

function formatTime(value) {
  if (!value) return '';
  const parts = String(value).split(':');
  const hour = Number(parts[0]);
  const minute = Number(parts[1] || 0);
  if (Number.isNaN(hour)) return escapeHtml(value);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit' }).format(date);
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amount);
}

function statusBadge(status) {
  const safe = escapeHtml(status || 'Unknown');
  const key = String(status || '').toLowerCase();
  const known = ['pending', 'confirmed', 'completed', 'cancelled', 'active', 'suspended', 'paid'];
  const cls = known.includes(key) ? `status-${key}` : 'status-default';
  return `<span class="badge-status ${cls}">${safe}</span>`;
}

function emptyState(icon, title, message, actionHtml = '') {
  return `
    <div class="empty-state">
      <div class="empty-icon"><i class="bi ${escapeHtml(icon)}"></i></div>
      <h3>${escapeHtml(title)}</h3>
      <p class="mb-3">${escapeHtml(message)}</p>
      ${actionHtml}
    </div>`;
}

function setButtonLoading(button, loading, loadingText = 'Please wait...') {
  if (!button) return;
  if (loading) {
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>${escapeHtml(loadingText)}`;
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.originalHtml || button.innerHTML;
  }
}

function ensureToastContainer() {
  let container = document.querySelector('.app-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'app-toast-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  return container;
}

function toast(message, type = 'info') {
  const container = ensureToastContainer();
  const item = document.createElement('div');
  item.className = `app-toast ${type}`;
  const icon = type === 'success' ? 'bi-check-circle-fill' : type === 'danger' ? 'bi-exclamation-circle-fill' : type === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill';
  item.innerHTML = `<i class="bi ${icon}"></i><p>${escapeHtml(message)}</p>`;
  container.appendChild(item);
  setTimeout(() => item.remove(), 4500);
}

function showAlert(message, type = 'danger', containerId = 'alert-container') {
  const container = document.getElementById(containerId);
  if (!container) {
    toast(message, type);
    return;
  }
  container.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;
}

async function checkAuth(requiredRole = null) {
  const result = await apiCall('auth?action=session');
  if (!result.authenticated) {
    window.location.replace('login.html');
    return null;
  }

  const dashboards = {
    Patient: 'patient_dashboard.html',
    Doctor: 'doctor_dashboard.html',
    Administrator: 'admin_dashboard.html'
  };

  if (requiredRole && result.role !== requiredRole) {
    window.location.replace(dashboards[result.role] || 'index.html');
    return null;
  }

  window.currentUser = result;
  document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = result.name || 'User');
  document.querySelectorAll('[data-user-role]').forEach(el => el.textContent = result.role || '');
  document.querySelectorAll('[data-user-initials]').forEach(el => el.textContent = initials(result.name));
  return result;
}

async function logout() {
  await apiCall('auth?action=logout');
  window.location.replace('login.html');
}

function initPasswordToggles() {
  document.querySelectorAll('[data-password-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      if (!input) return;
      const hidden = input.type === 'password';
      input.type = hidden ? 'text' : 'password';
      button.innerHTML = `<i class="bi ${hidden ? 'bi-eye-slash' : 'bi-eye'}"></i>`;
      button.setAttribute('aria-label', hidden ? 'Hide password' : 'Show password');
    });
  });
}

function initDashboardNavigation(defaultSection = 'overview') {
  const links = [...document.querySelectorAll('[data-section-link]')];
  const sections = [...document.querySelectorAll('[data-section]')];
  const title = document.querySelector('[data-page-title]');
  const subtitle = document.querySelector('[data-page-subtitle]');

  function showSection(name, updateHash = true) {
    const target = sections.find(section => section.dataset.section === name) || sections.find(section => section.dataset.section === defaultSection);
    if (!target) return;
    const finalName = target.dataset.section;

    sections.forEach(section => section.classList.toggle('d-none', section !== target));
    links.forEach(link => link.classList.toggle('active', link.dataset.sectionLink === finalName));
    if (title) title.textContent = target.dataset.title || 'Dashboard';
    if (subtitle) subtitle.textContent = target.dataset.subtitle || '';
    if (updateHash) history.replaceState(null, '', `#${finalName}`);
    closeSidebar();
    document.dispatchEvent(new CustomEvent('medconsult:sectionchange', { detail: { section: finalName } }));
  }

  links.forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    showSection(link.dataset.sectionLink);
  }));

  document.querySelectorAll('[data-open-section]').forEach(element => {
    element.addEventListener('click', event => {
      event.preventDefault();
      showSection(element.dataset.openSection);
    });
  });

  const requested = location.hash.replace('#', '');
  showSection(requested || defaultSection, false);
  window.openDashboardSection = showSection;
}

function initSidebar() {
  const sidebar = document.getElementById('dashboardSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const toggle = document.getElementById('sidebarToggle');
  if (!sidebar) return;

  window.closeSidebar = () => {
    sidebar.classList.remove('show');
    overlay?.classList.remove('show');
    document.body.classList.remove('overflow-hidden');
  };

  toggle?.addEventListener('click', () => {
    sidebar.classList.add('show');
    overlay?.classList.add('show');
    document.body.classList.add('overflow-hidden');
  });
  overlay?.addEventListener('click', window.closeSidebar);
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 992) window.closeSidebar();
  });
}

function ensureConfirmModal() {
  let element = document.getElementById('appConfirmModal');
  if (element) return element;
  element = document.createElement('div');
  element.className = 'modal fade';
  element.id = 'appConfirmModal';
  element.tabIndex = -1;
  element.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="appConfirmTitle">Confirm action</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body"><p class="mb-0" id="appConfirmMessage"></p></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-primary" id="appConfirmButton">Confirm</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(element);
  return element;
}

function confirmAction({ title = 'Confirm action', message = 'Are you sure?', confirmText = 'Confirm', danger = false }) {
  return new Promise(resolve => {
    const element = ensureConfirmModal();
    const modal = bootstrap.Modal.getOrCreateInstance(element);
    const confirmButton = element.querySelector('#appConfirmButton');
    element.querySelector('#appConfirmTitle').textContent = title;
    element.querySelector('#appConfirmMessage').textContent = message;
    confirmButton.textContent = confirmText;
    confirmButton.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;

    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const onConfirm = () => {
      finish(true);
      modal.hide();
    };
    const onHidden = () => {
      confirmButton.removeEventListener('click', onConfirm);
      element.removeEventListener('hidden.bs.modal', onHidden);
      finish(false);
    };
    confirmButton.addEventListener('click', onConfirm);
    element.addEventListener('hidden.bs.modal', onHidden);
    modal.show();
  });
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initPasswordToggles();
  document.querySelectorAll('[data-current-year]').forEach(el => el.textContent = new Date().getFullYear());
});
