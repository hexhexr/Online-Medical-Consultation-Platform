function doctorCard(doc) {
  const qualificationHtml = doc.qualification
    ? `<div class="text-muted small mt-1"><i class="bi bi-mortarboard me-1 text-primary"></i>${escapeHtml(doc.qualification)}</div>`
    : '';
  const experienceHtml = doc.experience_years
    ? `<span class="badge bg-light text-dark border fw-normal"><i class="bi bi-clock-history me-1 text-primary"></i>${escapeHtml(doc.experience_years)} Years Exp</span>`
    : '';

  return `
    <div class="col-md-6 col-xl-4">
      <article class="doctor-card d-flex flex-column h-100">
        <div class="d-flex align-items-start gap-3 mb-3">
          <div class="doctor-avatar">${escapeHtml(initials(doc.name))}</div>
          <div class="min-w-0">
            <h3 class="h5 mb-1">${escapeHtml(formatDoctorName(doc.name))}</h3>
            <div class="text-primary fw-semibold small">${escapeHtml(doc.specialty || 'General Practitioner')}</div>
            ${qualificationHtml}
            <div class="d-flex flex-wrap align-items-center gap-2 mt-2">
              <span class="verified-pill"><i class="bi bi-patch-check-fill"></i> Verified doctor</span>
              ${experienceHtml}
            </div>
          </div>
        </div>
        <p class="flex-grow-1">${escapeHtml(doc.biography || 'Professional profile information will appear here once the doctor adds a biography.')}</p>
        <a class="btn btn-soft-primary w-100 mt-2" href="login.html"><i class="bi bi-calendar-plus"></i> Book Consultation</a>
      </article>
    </div>`;
}

async function loadPublicDoctors(targetId, limit = 0) {
  const target = document.getElementById(targetId);
  const chipsContainer = document.getElementById('homeSpecialtyChips');
  if (!target) return;
  const result = await apiCall('public?action=list_doctors');
  if (!result.success) {
    target.innerHTML = `<div class="col-12">${emptyState('bi-wifi-off', 'Doctors could not be loaded', result.error || 'Please refresh and try again.')}</div>`;
    return;
  }
  const allDoctors = result.doctors || [];

  function render(selectedSpecialty = '') {
    let filtered = allDoctors;
    if (selectedSpecialty) {
      filtered = allDoctors.filter(d => d.specialty === selectedSpecialty);
    }
    const displayed = (limit && !selectedSpecialty) ? filtered.slice(0, limit) : filtered;
    target.innerHTML = displayed.length
      ? displayed.map(doctorCard).join('')
      : `<div class="col-12">${emptyState('bi-person-badge', 'No doctors in this specialty', 'Explore other specialties or view the full directory.')}</div>`;
  }

  if (chipsContainer && allDoctors.length) {
    const specialties = [...new Set(allDoctors.map(d => d.specialty).filter(Boolean))].sort();
    chipsContainer.innerHTML = `
      <button type="button" class="btn btn-sm btn-primary chip-btn active" data-specialty="">All Specialties</button>
      ${specialties.map(spec => `<button type="button" class="btn btn-sm btn-outline-secondary chip-btn" data-specialty="${escapeHtml(spec)}">${escapeHtml(spec)}</button>`).join('')}
    `;

    chipsContainer.addEventListener('click', e => {
      const btn = e.target.closest('.chip-btn');
      if (!btn) return;
      chipsContainer.querySelectorAll('.chip-btn').forEach(b => {
        b.classList.remove('btn-primary', 'active');
        b.classList.add('btn-outline-secondary');
      });
      btn.classList.remove('btn-outline-secondary');
      btn.classList.add('btn-primary', 'active');
      render(btn.dataset.specialty || '');
    });
  }

  render('');
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

  const urlParams = new URLSearchParams(window.location.search);
  const qParam = urlParams.get('q');
  const specialtyParam = urlParams.get('specialty');
  if (qParam) search.value = qParam;
  if (specialtyParam) specialty.value = specialtyParam;

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

function initHeroTriage() {
  const form = document.getElementById('heroTriageForm');
  const input = document.getElementById('triageInput');
  const resultArea = document.getElementById('triageResultArea');
  const submitBtn = document.getElementById('triageSubmitBtn');
  if (!form || !input || !resultArea) return;

  document.querySelectorAll('.triage-preset-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.symptom || '';
      input.focus();
    });
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const symptoms = input.value.trim();
    if (!symptoms) {
      input.focus();
      return;
    }

    setButtonLoading(submitBtn, true, 'Finding specialists...');
    resultArea.style.display = 'none';

    try {
      const response = await apiCall('public?action=triage_preview', 'POST', { symptoms });
      setButtonLoading(submitBtn, false);

      if (!response.success) {
        resultArea.innerHTML = `<div class="alert alert-warning py-2 px-3 small mb-0">${escapeHtml(response.error || 'Could not find matching specialists. Please try again.')}</div>`;
        resultArea.style.display = 'block';
        return;
      }

      const specialty = response.specialty || 'General Practitioner';
      const confidence = response.confidence || 80;
      const doctors = response.doctors || [];

      let doctorSnippet = '';
      if (doctors.length > 0) {
        const doc = doctors[0];
        doctorSnippet = `
          <div class="d-flex align-items-center justify-content-between p-2 mt-2 bg-white rounded border">
            <div>
              <div class="fw-bold small text-dark">${escapeHtml(formatDoctorName(doc.name))}</div>
              <div class="text-muted" style="font-size: .78rem;">${escapeHtml(doc.qualification || doc.specialty)} • ${escapeHtml(doc.experience_years || 5)} yrs exp</div>
            </div>
            <a href="login.html" class="btn btn-sm btn-primary">Book Consult</a>
          </div>
        `;
      }

      resultArea.innerHTML = `
        <div class="triage-match-box">
          <div class="d-flex align-items-center justify-content-between">
            <span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-check-circle-fill me-1"></i> Recommended Field</span>
            <span class="text-muted small">${confidence}% match score</span>
          </div>
          <div class="mt-2">
            <div class="small text-muted">Suggested Medical Specialist:</div>
            <h4 class="h6 fw-bold text-primary mb-1">${escapeHtml(specialty)}</h4>
          </div>
          ${doctorSnippet}
          <div class="mt-2 pt-2 border-top d-flex justify-content-between align-items-center">
            <small class="text-muted" style="font-size: .75rem;">Specialty guidance</small>
            <a href="doctors.html?specialty=${encodeURIComponent(specialty)}" class="small text-decoration-none fw-semibold">Browse all ${escapeHtml(specialty)}s &rarr;</a>
          </div>
        </div>
      `;
      resultArea.style.display = 'block';

    } catch (err) {
      setButtonLoading(submitBtn, false);
      resultArea.innerHTML = `<div class="alert alert-danger py-2 px-3 small mb-0">Connection error. Please try again.</div>`;
      resultArea.style.display = 'block';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initContactForm();
  initHeroTriage();
});

