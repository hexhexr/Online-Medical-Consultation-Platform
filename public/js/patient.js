let patientAppointmentsCache = [];
let patientDoctorsCache = [];
let patientRecordsCache = { prescriptions: [], invoices: [] };
let activeChatAppointment = null;
let chatTimer = null;
let lastMessageId = 0;

function appointmentSortValue(apt) {
  return new Date(`${apt.preferred_date}T${apt.preferred_time || '00:00'}`).getTime() || 0;
}

function patientAppointmentCard(apt, compact = false) {
  const canChat = apt.status === 'Confirmed';
  const canCancel = ['Pending', 'Confirmed'].includes(apt.status);
  const meetingUrl = safeExternalUrl(apt.meeting_link || '');
  return `
    <article class="appointment-card">
      <div class="d-flex flex-column flex-md-row justify-content-between gap-3">
        <div>
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <h3 class="h6 mb-0">${escapeHtml(formatDoctorName(apt.doctor_name))}</h3>${statusBadge(apt.status)}
          </div>
          <div class="text-primary small fw-semibold mt-1">${escapeHtml(apt.specialty || 'Medical consultation')}</div>
          <div class="appointment-meta mt-2"><span><i class="bi bi-calendar3 me-1"></i>${formatDate(apt.preferred_date)}</span><span><i class="bi bi-clock me-1"></i>${formatTime(apt.preferred_time)}</span></div>
        </div>
        ${compact ? '' : `<div class="appointment-actions align-self-md-center">
          ${canChat ? `<button class="btn btn-sm btn-outline-primary" type="button" data-chat-appointment="${apt.appointment_id}" data-chat-label="${escapeHtml(formatDoctorName(apt.doctor_name))}"><i class="bi bi-chat-dots"></i> Message</button>` : ''}
          ${canChat && meetingUrl ? `<a class="btn btn-sm btn-primary" href="${escapeHtml(meetingUrl)}" target="_blank" rel="noopener noreferrer"><i class="bi bi-camera-video"></i> Join consultation</a>` : ''}
          ${canCancel ? `<button class="btn btn-sm btn-soft-danger" type="button" data-cancel-appointment="${apt.appointment_id}"><i class="bi bi-x-circle"></i> Cancel</button>` : ''}
        </div>`}
      </div>
    </article>`;
}

async function fetchPatientAppointments(force = false) {
  if (patientAppointmentsCache.length && !force) return patientAppointmentsCache;
  const result = await apiCall('appointments?action=list');
  if (!result.success) throw new Error(result.error || 'Unable to load appointments.');
  patientAppointmentsCache = result.appointments || [];
  return patientAppointmentsCache;
}

async function fetchPatientRecords(force = false) {
  if ((patientRecordsCache.prescriptions.length || patientRecordsCache.invoices.length) && !force) return patientRecordsCache;
  const [prescriptions, invoices] = await Promise.all([
    apiCall('records?action=my_prescriptions'),
    apiCall('records?action=my_invoices')
  ]);
  patientRecordsCache = {
    prescriptions: prescriptions.success ? prescriptions.prescriptions || [] : [],
    invoices: invoices.success ? invoices.invoices || [] : []
  };
  return patientRecordsCache;
}

async function loadPatientOverview() {
  try {
    const [appointments, records] = await Promise.all([fetchPatientAppointments(true), fetchPatientRecords(true)]);
    const now = Date.now();
    const active = appointments.filter(a => ['Pending', 'Confirmed'].includes(a.status) && appointmentSortValue(a) >= now - 86400000).sort((a, b) => appointmentSortValue(a) - appointmentSortValue(b));
    document.getElementById('statUpcoming').textContent = active.filter(a => a.status === 'Confirmed').length;
    document.getElementById('statPending').textContent = appointments.filter(a => a.status === 'Pending').length;
    document.getElementById('statPrescriptions').textContent = records.prescriptions.length;
    document.getElementById('statInvoices').textContent = records.invoices.length;
    const box = document.getElementById('overviewAppointments');
    box.innerHTML = active.length ? active.slice(0, 3).map(a => patientAppointmentCard(a, true)).join('') : emptyState('bi-calendar2-check', 'No upcoming appointments', 'Find a doctor when you are ready to request a consultation.', '<button class="btn btn-sm btn-primary" data-open-section="directory">Find a doctor</button>');
    box.querySelectorAll('[data-open-section]').forEach(button => button.addEventListener('click', () => window.openDashboardSection('directory')));
  } catch (error) {
    toast(error.message, 'danger');
  }
}

function triageDoctorMiniCard(doc) {
  return `<div class="border rounded-3 p-3 bg-white"><div class="d-flex align-items-center gap-2"><div class="doctor-avatar" style="width:42px;height:42px;border-radius:12px">${escapeHtml(initials(doc.name))}</div><div class="flex-grow-1"><strong class="d-block small">${escapeHtml(formatDoctorName(doc.name))}</strong><small class="text-muted">${escapeHtml(doc.specialty || '')}</small></div><button class="btn btn-sm btn-primary" type="button" data-book-doctor="${doc.user_id}" data-doctor-name="${escapeHtml(formatDoctorName(doc.name))}">Book</button></div></div>`;
}

function appendTriageMessage(text, who = 'assistant') {
  const chat = document.getElementById('triageChat');
  const row = document.createElement('div');
  row.className = `message-row ${who}`;
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = text;
  row.appendChild(bubble);
  chat.appendChild(row);
  chat.scrollTop = chat.scrollHeight;
  return row;
}

async function runTriage(event) {
  event.preventDefault();
  const input = document.getElementById('symptomInput');
  const symptoms = input.value.trim();
  if (!symptoms) return;
  appendTriageMessage(symptoms, 'user');
  input.value = '';
  const loading = appendTriageMessage('Analyzing your symptoms and selecting a suitable specialty...');
  const button = document.getElementById('triageButton');
  setButtonLoading(button, true, 'Analyzing...');
  const result = await apiCall('triage', 'POST', { symptoms });
  setButtonLoading(button, false);
  loading.remove();
  if (!result.success) return appendTriageMessage(result.error || 'The analysis could not be completed.');

  appendTriageMessage(`The recommended specialty is ${result.ai_analysis.specialty}. Review the result and matching doctors on the right.`);
  const confidenceRaw = Number(result.ai_analysis.confidence || 0);
  const percent = Math.max(0, Math.min(100, confidenceRaw <= 1 ? confidenceRaw * 100 : confidenceRaw));
  document.getElementById('triageResult').classList.remove('d-none');
  document.getElementById('triageSpecialty').textContent = result.ai_analysis.specialty;
  document.getElementById('triageConfidence').textContent = `${Math.round(percent)}%`;
  document.getElementById('triageConfidenceBar').style.width = `${percent}%`;
  document.getElementById('triageConfidenceNote').textContent = result.ai_analysis.low_confidence ? 'Confidence was low, so the system routed the recommendation to a General Practitioner.' : 'Confidence reflects the model output and is not clinical certainty.';
  document.getElementById('triageDoctors').innerHTML = result.recommended_doctors?.length ? result.recommended_doctors.map(triageDoctorMiniCard).join('') : `<div class="small text-muted">No verified doctors are currently available for this specialty.</div>`;
}

async function loadPatientDirectory(force = false) {
  const target = document.getElementById('patientDoctorList');
  if (!patientDoctorsCache.length || force) {
    const result = await apiCall('public?action=list_doctors');
    if (!result.success) {
      target.innerHTML = `<div class="col-12">${emptyState('bi-wifi-off', 'Directory unavailable', result.error || 'Please try again.')}</div>`;
      return;
    }
    patientDoctorsCache = result.doctors || [];
    const select = document.getElementById('patientSpecialtyFilter');
    select.innerHTML = '<option value="">All specialties</option>';
    [...new Set(patientDoctorsCache.map(d => d.specialty).filter(Boolean))].sort().forEach(value => {
      const option = document.createElement('option'); option.value = value; option.textContent = value; select.appendChild(option);
    });
  }
  renderPatientDirectory();
}

function renderPatientDirectory() {
  const q = document.getElementById('patientDoctorSearch').value.trim().toLowerCase();
  const specialty = document.getElementById('patientSpecialtyFilter').value;
  const filtered = patientDoctorsCache.filter(doc => {
    const text = `${doc.name} ${doc.specialty || ''} ${doc.biography || ''}`.toLowerCase();
    return (!q || text.includes(q)) && (!specialty || doc.specialty === specialty);
  });
  document.getElementById('patientDoctorCount').textContent = `${filtered.length} doctor${filtered.length === 1 ? '' : 's'} found`;
  document.getElementById('patientDoctorList').innerHTML = filtered.length ? filtered.map(doc => `
    <div class="col-md-6 col-xl-4"><article class="doctor-card"><div class="d-flex gap-3 align-items-start mb-3"><div class="doctor-avatar">${escapeHtml(initials(doc.name))}</div><div><h3 class="h5 mb-1">${escapeHtml(formatDoctorName(doc.name))}</h3><div class="text-primary fw-semibold small">${escapeHtml(doc.specialty || 'General Practitioner')}</div><div class="small text-muted">${escapeHtml(doc.qualification || 'Medical professional')} · ${Number(doc.experience_years || 0)} years experience</div><div class="verified-pill"><i class="bi bi-patch-check-fill"></i> Verified doctor</div></div></div><p>${escapeHtml(doc.biography || 'No biography has been added yet.')}</p><button class="btn btn-primary w-100" type="button" data-book-doctor="${doc.user_id}" data-doctor-name="${escapeHtml(formatDoctorName(doc.name))}"><i class="bi bi-calendar-plus"></i> Request appointment</button></article></div>`).join('') : `<div class="col-12">${emptyState('bi-search', 'No matching doctors', 'Try a different name or specialty.')}</div>`;
}

function openBookingModal(doctorId, doctorName) {
  document.getElementById('bookingDoctorId').value = doctorId;
  document.getElementById('bookingDoctorName').textContent = doctorName || 'Selected doctor';
  document.getElementById('bookingDate').min = new Date().toISOString().slice(0, 10);
  bootstrap.Modal.getOrCreateInstance(document.getElementById('bookingModal')).show();
}

async function submitBooking(event) {
  event.preventDefault();
  const button = document.getElementById('bookingButton');
  setButtonLoading(button, true, 'Sending...');
  const result = await apiCall('appointments?action=book', 'POST', {
    doctor_id: Number(document.getElementById('bookingDoctorId').value),
    preferred_date: document.getElementById('bookingDate').value,
    preferred_time: document.getElementById('bookingTime').value
  });
  setButtonLoading(button, false);
  if (!result.success) return toast(result.error || 'Unable to request the appointment.', 'danger');
  bootstrap.Modal.getOrCreateInstance(document.getElementById('bookingModal')).hide();
  document.getElementById('bookingForm').reset();
  patientAppointmentsCache = [];
  toast(result.message || 'Appointment request sent.', 'success');
  loadPatientOverview();
}

async function cancelPatientAppointment(appointmentId) {
  const confirmed = await confirmAction({
    title: 'Cancel appointment?',
    message: 'This will cancel the appointment request. You can book another time afterwards.',
    confirmText: 'Cancel appointment',
    danger: true
  });
  if (!confirmed) return;
  const result = await apiCall('appointments?action=cancel', 'POST', { appointment_id: Number(appointmentId) });
  if (!result.success) return toast(result.error || 'Appointment could not be cancelled.', 'danger');
  patientAppointmentsCache = [];
  toast(result.message || 'Appointment cancelled.', 'success');
  await loadPatientAppointments(true);
  await loadPatientOverview();
}

async function loadPatientAppointments(force = true) {
  const box = document.getElementById('patientAppointments');
  try {
    const appointments = await fetchPatientAppointments(force);
    const sorted = [...appointments].sort((a, b) => appointmentSortValue(b) - appointmentSortValue(a));
    box.innerHTML = sorted.length ? sorted.map(a => patientAppointmentCard(a)).join('') : emptyState('bi-calendar2-plus', 'No appointments yet', 'Browse verified doctors to request your first consultation.', '<button class="btn btn-primary" data-open-section="directory">Find a doctor</button>');
    box.querySelectorAll('[data-open-section]').forEach(button => button.addEventListener('click', () => window.openDashboardSection('directory')));
  } catch (error) {
    box.innerHTML = emptyState('bi-exclamation-circle', 'Appointments unavailable', error.message);
  }
}

function openChatModal(appointmentId, label) {
  activeChatAppointment = Number(appointmentId);
  lastMessageId = 0;
  document.getElementById('chatWindow').innerHTML = '<div class="loading-block"><span class="spinner-border spinner-border-sm me-2"></span>Loading messages...</div>';
  document.getElementById('chatAppointmentLabel').textContent = label || `Appointment #${appointmentId}`;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('chatModal')).show();
  fetchChatMessages(true);
  clearInterval(chatTimer);
  chatTimer = setInterval(() => fetchChatMessages(false), 4000);
}

async function fetchChatMessages(reset = false) {
  if (!activeChatAppointment) return;
  const result = await apiCall(`messaging?action=fetch&appointment_id=${activeChatAppointment}&last_id=${reset ? 0 : lastMessageId}`);
  if (!result.success) return;
  const win = document.getElementById('chatWindow');
  if (reset) win.innerHTML = '';
  (result.messages || []).forEach(message => {
    const mine = Number(message.sender_id) === Number(window.currentUser?.user_id);
    const row = document.createElement('div'); row.className = `chat-message ${mine ? 'mine' : ''}`;
    const content = document.createElement('div'); content.className = 'chat-content';
    const sender = document.createElement('div'); sender.className = 'chat-sender'; sender.textContent = mine ? 'You' : message.sender_name;
    const body = document.createElement('div'); body.textContent = message.message_body;
    content.append(sender, body); row.appendChild(content); win.appendChild(row);
    lastMessageId = Math.max(lastMessageId, Number(message.message_id || 0));
  });
  if (!win.children.length) win.innerHTML = emptyState('bi-chat-dots', 'No messages yet', 'Start the consultation conversation below.');
  if (result.messages?.length) win.scrollTop = win.scrollHeight;
}

async function sendChatMessage(event) {
  event.preventDefault();
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text || !activeChatAppointment) return;
  const result = await apiCall('messaging?action=send', 'POST', { appointment_id: activeChatAppointment, message_body: text });
  if (!result.success) return toast(result.error || 'Message could not be sent.', 'danger');
  input.value = '';
  await fetchChatMessages(false);
}

function showPrescriptionModal(prescriptionId) {
  const p = (patientRecordsCache.prescriptions || []).find(x => Number(x.prescription_id) === Number(prescriptionId));
  if (!p) return;
  document.getElementById('rxPrescriptionId').textContent = `Rx #${p.prescription_id}`;
  document.getElementById('rxDoctorName').textContent = formatDoctorName(p.doctor_name);
  document.getElementById('rxDoctorSpecialty').textContent = p.doctor_specialty || 'General Practitioner';
  document.getElementById('rxDoctorCredentials').textContent = [p.doctor_qualification, p.doctor_license ? `PMC: ${p.doctor_license}` : ''].filter(Boolean).join(' · ') || 'PMC Licensed Clinician';
  document.getElementById('rxPatientName').textContent = window.currentUser?.name || 'Patient';
  document.getElementById('rxConsultationDate').textContent = `Consultation: ${formatDate(p.preferred_date)}`;
  document.getElementById('rxIssuedDate').textContent = `Issued: ${formatDateTime(p.issued_at)}`;
  document.getElementById('rxPrescriptionBody').textContent = p.prescription_body;
  document.getElementById('rxDoctorSignature').textContent = formatDoctorName(p.doctor_name);
  bootstrap.Modal.getOrCreateInstance(document.getElementById('prescriptionModal')).show();
}

async function payPatientInvoice(invoiceId, amount) {
  const confirmed = await confirmAction({
    title: 'Pay Consultation Fee',
    message: `Settle invoice #${invoiceId} of ${formatMoney(amount)} via MedConsult simulated payment portal?`,
    confirmText: 'Pay Now'
  });
  if (!confirmed) return;
  const result = await apiCall('records?action=pay_invoice', 'POST', { invoice_id: Number(invoiceId) });
  if (!result.success) return toast(result.error || 'Payment failed.', 'danger');
  toast(result.message || 'Payment completed successfully.', 'success');
  patientRecordsCache = { prescriptions: [], invoices: [] };
  await loadPatientRecords();
  await loadPatientOverview();
}

async function loadPatientRecords() {
  const records = await fetchPatientRecords(true);
  const prescriptions = document.getElementById('prescriptionList');
  const invoices = document.getElementById('invoiceList');
  prescriptions.innerHTML = records.prescriptions.length ? records.prescriptions.map(p => `
    <div class="col-12">
      <article class="record-card">
        <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
          <div>
            <strong>Prescription #${escapeHtml(p.prescription_id)}</strong>
            <div class="small text-muted">${escapeHtml(formatDoctorName(p.doctor_name))} · ${formatDate(p.preferred_date)}</div>
          </div>
          <button class="btn btn-sm btn-outline-primary" type="button" data-print-prescription="${p.prescription_id}">
            <i class="bi bi-printer me-1"></i> View &amp; Print Rx
          </button>
        </div>
        <div class="record-body">${escapeHtml(p.prescription_body)}</div>
        <small class="text-muted d-block mt-2">Issued ${formatDateTime(p.issued_at)}</small>
      </article>
    </div>
  `).join('') : `<div class="col-12">${emptyState('bi-file-medical', 'No prescriptions', 'Prescriptions from completed consultations will appear here.')}</div>`;

  invoices.innerHTML = records.invoices.length ? records.invoices.map(i => {
    const isPending = i.payment_status === 'Pending';
    return `
      <div class="col-12">
        <article class="record-card">
          <div class="d-flex justify-content-between gap-3">
            <div>
              <strong>Invoice #${escapeHtml(i.invoice_id)}</strong>
              <div class="small text-muted">${escapeHtml(formatDoctorName(i.doctor_name))} · ${formatDate(i.preferred_date)}</div>
            </div>
            ${statusBadge(i.payment_status)}
          </div>
          <div class="d-flex justify-content-between align-items-end mt-3">
            <div>
              <div class="amount">${formatMoney(i.amount)}</div>
              <small class="text-muted">Generated ${formatDateTime(i.generated_at)}</small>
            </div>
            ${isPending ? `<button class="btn btn-sm btn-primary" type="button" data-pay-invoice="${i.invoice_id}" data-invoice-amount="${i.amount}"><i class="bi bi-credit-card me-1"></i> Pay Now</button>` : `<span class="badge bg-success-subtle text-success border border-success-subtle py-2 px-3"><i class="bi bi-check-circle me-1"></i> Paid in Full</span>`}
          </div>
        </article>
      </div>
    `;
  }).join('') : `<div class="col-12">${emptyState('bi-receipt', 'No invoices', 'Invoices from completed consultations will appear here.')}</div>`;

  prescriptions.querySelectorAll('[data-print-prescription]').forEach(btn => {
    btn.addEventListener('click', () => showPrescriptionModal(btn.dataset.printPrescription));
  });
  invoices.querySelectorAll('[data-pay-invoice]').forEach(btn => {
    btn.addEventListener('click', () => payPatientInvoice(btn.dataset.payInvoice, btn.dataset.invoiceAmount));
  });
}

async function loadPatientProfile() {
  const result = await apiCall('user?action=get_profile');
  if (!result.success) return toast(result.error || 'Unable to load profile.', 'danger');
  document.getElementById('patientProfileName').value = result.profile.name || '';
  document.getElementById('patientProfileEmail').value = result.profile.email || '';
}

async function savePatientProfile(event) {
  event.preventDefault();
  const currentPassword = document.getElementById('patientCurrentPassword').value;
  const password = document.getElementById('patientProfilePassword').value;
  if (password && password.length < 8) return toast('New password must be at least 8 characters.', 'warning');
  if (password && !currentPassword) return toast('Enter your current password before choosing a new one.', 'warning');
  const button = document.getElementById('patientProfileButton');
  setButtonLoading(button, true, 'Saving...');
  const result = await apiCall('user?action=update_profile', 'POST', {
    name: document.getElementById('patientProfileName').value.trim(),
    email: document.getElementById('patientProfileEmail').value.trim(),
    current_password: currentPassword,
    password
  });
  setButtonLoading(button, false);
  if (!result.success) return toast(result.error || 'Profile could not be updated.', 'danger');
  document.getElementById('patientCurrentPassword').value = '';
  document.getElementById('patientProfilePassword').value = '';
  document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = document.getElementById('patientProfileName').value.trim());
  document.querySelectorAll('[data-user-initials]').forEach(el => el.textContent = initials(document.getElementById('patientProfileName').value));
  toast(result.message || 'Profile updated.', 'success');
}

document.addEventListener('DOMContentLoaded', async () => {
  const current = await checkAuth('Patient');
  if (!current) return;
  initSidebar();
  initDashboardNavigation('overview');
  document.getElementById('triageForm').addEventListener('submit', runTriage);
  document.getElementById('bookingForm').addEventListener('submit', submitBooking);
  document.getElementById('chatForm').addEventListener('submit', sendChatMessage);
  document.getElementById('patientProfileForm').addEventListener('submit', savePatientProfile);
  document.getElementById('patientDoctorSearch').addEventListener('input', renderPatientDirectory);
  document.getElementById('patientSpecialtyFilter').addEventListener('change', renderPatientDirectory);
  document.getElementById('patientClearFilters').addEventListener('click', () => { document.getElementById('patientDoctorSearch').value = ''; document.getElementById('patientSpecialtyFilter').value = ''; renderPatientDirectory(); });
  document.addEventListener('click', event => {
    const book = event.target.closest('[data-book-doctor]');
    if (book) openBookingModal(book.dataset.bookDoctor, book.dataset.doctorName);
    const chat = event.target.closest('[data-chat-appointment]');
    if (chat) openChatModal(chat.dataset.chatAppointment, chat.dataset.chatLabel);
    const cancel = event.target.closest('[data-cancel-appointment]');
    if (cancel) cancelPatientAppointment(cancel.dataset.cancelAppointment);
  });
  document.getElementById('chatModal').addEventListener('hidden.bs.modal', () => { clearInterval(chatTimer); chatTimer = null; activeChatAppointment = null; });
  document.addEventListener('medconsult:sectionchange', event => {
    const section = event.detail.section;
    if (section === 'overview') loadPatientOverview();
    if (section === 'directory') loadPatientDirectory();
    if (section === 'appointments') loadPatientAppointments();
    if (section === 'records') loadPatientRecords();
    if (section === 'profile') loadPatientProfile();
  });
  const initial = location.hash.replace('#', '') || 'overview';
  if (initial === 'overview') loadPatientOverview();
  if (initial === 'directory') loadPatientDirectory();
  if (initial === 'appointments') loadPatientAppointments();
  if (initial === 'records') loadPatientRecords();
  if (initial === 'profile') loadPatientProfile();
});
