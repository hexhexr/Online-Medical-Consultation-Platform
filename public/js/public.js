function doctorCard(doc) {
  return `
    <div class="col-md-6 col-xl-4">
      <article class="doctor-card">
        <div class="d-flex align-items-start gap-3 mb-3">
          <div class="doctor-avatar">${escapeHtml(initials(doc.name))}</div>
          <div class="min-w-0">
            <h3 class="h5 mb-1">${escapeHtml(formatDoctorName(doc.name))}</h3>
            <div class="text-primary fw-semibold small">${escapeHtml(doc.specialty || 'General Practitioner')}</div>
            <div class="verified-pill mt-1"><i class="bi bi-patch-check-fill"></i> Verified doctor</div>
          </div>
        </div>
        <p>${escapeHtml(doc.biography || 'Professional profile information will appear here once the doctor adds a biography.')}</p>
        <a class="btn btn-soft-primary w-100" href="login.html"><i class="bi bi-calendar-plus"></i> Open portal to book</a>
      </article>
    </div>`;
}

async function loadPublicDoctors(targetId, limit = 0) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const result = await apiCall('public?action=list_doctors');
  if (!result.success) {
    target.innerHTML = `<div class="col-12">${emptyState('bi-wifi-off', 'Doctors could not be loaded', result.error || 'Please refresh and try again.')}</div>`;
    return;
  }
  const doctors = limit ? result.doctors.slice(0, limit) : result.doctors;
  target.innerHTML = doctors.length
    ? doctors.map(doctorCard).join('')
    : `<div class="col-12">${emptyState('bi-person-badge', 'No verified doctors yet', 'Verified doctor profiles will appear here when available.')}</div>`;
}

async function initDoctorDirectory() {
  const target = document.getElementById('doctorDirectoryList');
  const search = document.getElementById('doctorSearch');
  const specialty = document.getElementById('specialtyFilter');
  const count = document.getElementById('doctorCount');
  if (!target) return;

  const result = await apiCall('public?action=list_doctors');
  if (!result.success) {
    target.innerHTML = `<div class="col-12">${emptyState('bi-wifi-off', 'Directory unavailable', result.error || 'Please try again.')}</div>`;
    return;
  }
  const doctors = result.doctors;
  const specialties = [...new Set(doctors.map(d => d.specialty).filter(Boolean))].sort();
  specialties.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    specialty.appendChild(option);
  });

  function render() {
    const q = search.value.trim().toLowerCase();
    const selected = specialty.value;
    const filtered = doctors.filter(doc => {
      const text = `${doc.name} ${doc.specialty || ''} ${doc.biography || ''}`.toLowerCase();
      return (!q || text.includes(q)) && (!selected || doc.specialty === selected);
    });
    count.textContent = `${filtered.length} doctor${filtered.length === 1 ? '' : 's'} found`;
    target.innerHTML = filtered.length
      ? filtered.map(doctorCard).join('')
      : `<div class="col-12">${emptyState('bi-search', 'No matching doctors', 'Try another name or specialty filter.')}</div>`;
  }

  search.addEventListener('input', render);
  specialty.addEventListener('change', render);
  document.getElementById('clearDoctorFilters')?.addEventListener('click', () => {
    search.value = '';
    specialty.value = '';
    render();
  });
  render();
}

document.addEventListener('DOMContentLoaded', () => {
  loadPublicDoctors('homeDoctorList', 3);
  initDoctorDirectory();
});

function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = document.getElementById('contactButton');
    setButtonLoading(button, true, 'Sending...');
    const result = await apiCall('contact', 'POST', {
      name: document.getElementById('contactName').value.trim(),
      email: document.getElementById('contactEmail').value.trim(),
      subject: document.getElementById('contactSubject').value,
      message: document.getElementById('contactMessage').value.trim()
    });
    setButtonLoading(button, false);
    if (!result.success) return showAlert(result.error || 'Your message could not be sent.', 'danger', 'contactAlert');
    form.reset();
    showAlert(result.message || 'Your message has been sent.', 'success', 'contactAlert');
  });
}

document.addEventListener('DOMContentLoaded', initContactForm);
