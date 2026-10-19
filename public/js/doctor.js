let doctorAppointmentsCache = [];
let doctorActiveChat = null;
let doctorChatTimer = null;
let doctorLastMessageId = 0;

function doctorAppointmentTime(apt) { return new Date(`${apt.preferred_date}T${apt.preferred_time || '00:00'}`).getTime() || 0; }

function doctorAppointmentCard(apt, compact = false) {
  const confirmed = apt.status === 'Confirmed';
  const pending = apt.status === 'Pending';
  const completed = apt.status === 'Completed';
  return `<article class="appointment-card"><div class="d-flex flex-column flex-lg-row justify-content-between gap-3"><div><div class="d-flex align-items-center flex-wrap gap-2"><h3 class="h6 mb-0">${escapeHtml(apt.patient_name)}</h3>${statusBadge(apt.status)}</div><div class="appointment-meta mt-2"><span><i class="bi bi-calendar3 me-1"></i>${formatDate(apt.preferred_date)}</span><span><i class="bi bi-clock me-1"></i>${formatTime(apt.preferred_time)}</span><span>#${escapeHtml(apt.appointment_id)}</span></div></div>${compact ? '' : `<div class="appointment-actions align-self-lg-center">${pending ? `<button class="btn btn-sm btn-primary" data-appointment-status="Confirmed" data-appointment-id="${apt.appointment_id}"><i class="bi bi-check-lg"></i> Confirm</button><button class="btn btn-sm btn-soft-danger" data-appointment-status="Cancelled" data-appointment-id="${apt.appointment_id}"><i class="bi bi-x-lg"></i> Decline</button>` : ''}${confirmed ? `<button class="btn btn-sm btn-outline-primary" data-doctor-chat="${apt.appointment_id}" data-chat-label="${escapeHtml(apt.patient_name)}"><i class="bi bi-chat-dots"></i> Message</button><button class="btn btn-sm btn-outline-primary" data-meeting-id="${apt.appointment_id}" data-meeting-patient="${escapeHtml(apt.patient_name)}"><i class="bi bi-link-45deg"></i> Meeting link</button>${apt.meeting_link ? `<a class="btn btn-sm btn-primary" href="${escapeHtml(safeExternalUrl(apt.meeting_link))}" target="_blank" rel="noopener noreferrer"><i class="bi bi-camera-video"></i> Join call</a>` : ''}<button class="btn btn-sm btn-primary" data-appointment-status="Completed" data-appointment-id="${apt.appointment_id}"><i class="bi bi-check2-all"></i> Complete</button>` : ''}${completed ? `<button class="btn btn-sm btn-outline-primary" data-open-section="records"><i class="bi bi-file-medical"></i> Create record</button>` : ''}</div>`}</div></article>`;
}

async function fetchDoctorAppointments(force = false) {
  if (doctorAppointmentsCache.length && !force) return doctorAppointmentsCache;
  const result = await apiCall('appointments?action=list');
  if (!result.success) throw new Error(result.error || 'Unable to load appointments.');
  doctorAppointmentsCache = result.appointments || [];
  return doctorAppointmentsCache;
}

async function loadDoctorOverview() {
  try {
    const list = await fetchDoctorAppointments(true);
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('doctorStatToday').textContent = list.filter(a => a.preferred_date === today && a.status !== 'Cancelled').length;
    document.getElementById('doctorStatPending').textContent = list.filter(a => a.status === 'Pending').length;
    document.getElementById('doctorStatConfirmed').textContent = list.filter(a => a.status === 'Confirmed').length;
    document.getElementById('doctorStatCompleted').textContent = list.filter(a => a.status === 'Completed').length;
    const priority = list.filter(a => ['Pending','Confirmed'].includes(a.status)).sort((a,b) => doctorAppointmentTime(a)-doctorAppointmentTime(b)).slice(0,4);
    const box = document.getElementById('doctorOverviewAppointments');
    box.innerHTML = priority.length ? priority.map(a => doctorAppointmentCard(a, true)).join('') : emptyState('bi-calendar-check', 'No active appointments', 'Pending and confirmed consultations will appear here.');
  } catch (error) { toast(error.message, 'danger'); }
}

async function loadDoctorAppointments(force = true) {
  const box = document.getElementById('doctorAppointments');
  try {
    const list = await fetchDoctorAppointments(force);
    const filter = document.getElementById('doctorAppointmentFilter').value;
    const filtered = list.filter(a => !filter || a.status === filter).sort((a,b) => doctorAppointmentTime(a)-doctorAppointmentTime(b));
    box.innerHTML = filtered.length ? filtered.map(a => doctorAppointmentCard(a)).join('') : emptyState('bi-calendar-x', 'No appointments in this view', filter ? `There are no ${filter.toLowerCase()} appointments.` : 'Appointment requests will appear here.');
    box.querySelectorAll('[data-open-section]').forEach(button => button.addEventListener('click', () => window.openDashboardSection('records')));
  } catch (error) { box.innerHTML = emptyState('bi-exclamation-circle', 'Appointments unavailable', error.message); }
}

async function changeAppointmentStatus(id, status) {
  const prompt = status === 'Confirmed' ? {title:'Confirm appointment?',message:'The patient will see this appointment as confirmed.',confirmText:'Confirm appointment'} : status === 'Cancelled' ? {title:'Decline appointment?',message:'The appointment request will be marked as cancelled.',confirmText:'Decline',danger:true} : {title:'Mark consultation completed?',message:'After completion you can create the prescription and invoice for this appointment.',confirmText:'Mark completed'};
  if (!await confirmAction(prompt)) return;
  const result = await apiCall('appointments?action=update_status', 'POST', { appointment_id: Number(id), status });
  if (!result.success) return toast(result.error || 'Status could not be updated.', 'danger');
  doctorAppointmentsCache = [];
  toast(result.message || 'Appointment updated.', 'success');
  loadDoctorAppointments(); loadDoctorOverview(); populateCompletedAppointments();
}

function openMeetingModal(id, patient) {
  document.getElementById('meetingAppointmentId').value = id;
  document.getElementById('meetingPatientLabel').textContent = patient ? `Patient: ${patient}` : 'Confirmed appointment';
  document.getElementById('meetingLink').value = '';
  bootstrap.Modal.getOrCreateInstance(document.getElementById('meetingModal')).show();
}

async function saveMeetingLink(event) {
  event.preventDefault();
  const link = document.getElementById('meetingLink').value.trim();
  if (!safeExternalUrl(link)) return toast('Enter a valid http or https meeting link.', 'warning');
  const button = document.getElementById('meetingButton'); setButtonLoading(button, true, 'Saving...');
  const result = await apiCall('appointments?action=attach_link', 'POST', { appointment_id: Number(document.getElementById('meetingAppointmentId').value), meeting_link: link });
  setButtonLoading(button, false);
  if (!result.success) return toast(result.error || 'Meeting link could not be saved.', 'danger');
  bootstrap.Modal.getOrCreateInstance(document.getElementById('meetingModal')).hide();
  doctorAppointmentsCache = [];
  toast(result.message || 'Meeting link saved.', 'success');
  loadDoctorAppointments();
}

function openDoctorChat(id, patient) {
  doctorActiveChat = Number(id); doctorLastMessageId = 0;
  document.getElementById('doctorChatLabel').textContent = patient || `Appointment #${id}`;
  document.getElementById('doctorChatWindow').innerHTML = '<div class="loading-block">Loading messages...</div>';
  bootstrap.Modal.getOrCreateInstance(document.getElementById('chatModal')).show();
  fetchDoctorChat(true); clearInterval(doctorChatTimer); doctorChatTimer = setInterval(() => fetchDoctorChat(false), 4000);
}

async function fetchDoctorChat(reset = false) {
  if (!doctorActiveChat) return;
  const result = await apiCall(`messaging?action=fetch&appointment_id=${doctorActiveChat}&last_id=${reset ? 0 : doctorLastMessageId}`);
  if (!result.success) return;
  const win = document.getElementById('doctorChatWindow'); if (reset) win.innerHTML = '';
  (result.messages || []).forEach(message => {
    const mine = Number(message.sender_id) === Number(window.currentUser?.user_id);
    const row = document.createElement('div'); row.className = `chat-message ${mine ? 'mine' : ''}`;
    const content = document.createElement('div'); content.className = 'chat-content';
    const sender = document.createElement('div'); sender.className = 'chat-sender'; sender.textContent = mine ? 'You' : message.sender_name;
    const body = document.createElement('div'); body.textContent = message.message_body;
    content.append(sender, body); row.appendChild(content); win.appendChild(row);
    doctorLastMessageId = Math.max(doctorLastMessageId, Number(message.message_id || 0));
  });
  if (!win.children.length) win.innerHTML = emptyState('bi-chat-dots', 'No messages yet', 'Start the consultation conversation below.');
  if (result.messages?.length) win.scrollTop = win.scrollHeight;
}

async function sendDoctorChat(event) {
  event.preventDefault(); const input = document.getElementById('doctorChatInput'); const text = input.value.trim(); if (!text) return;
  const result = await apiCall('messaging?action=send', 'POST', { appointment_id: doctorActiveChat, message_body: text });
  if (!result.success) return toast(result.error || 'Message could not be sent.', 'danger');
  input.value = ''; fetchDoctorChat(false);
}

async function populateCompletedAppointments() {
  try {
    const [list, summaryResult] = await Promise.all([
      fetchDoctorAppointments(),
      apiCall('records?action=summary')
    ]);
    const completed = list.filter(a => a.status === 'Completed').sort((a,b) => doctorAppointmentTime(b)-doctorAppointmentTime(a));
    const existingRx = summaryResult.success ? (summaryResult.existing_prescriptions || []) : [];
    const existingInv = summaryResult.success ? (summaryResult.existing_invoices || []) : [];

    const rxOptions = `<option value="">Select appointment</option>${completed.map(a => {
      const already = existingRx.includes(Number(a.appointment_id));
      return `<option value="${a.appointment_id}" ${already ? 'disabled' : ''}>#${a.appointment_id} · ${escapeHtml(a.patient_name)} · ${formatDate(a.preferred_date)}${already ? ' (Rx already issued)' : ''}</option>`;
    }).join('')}`;

    const invOptions = `<option value="">Select appointment</option>${completed.map(a => {
      const already = existingInv.includes(Number(a.appointment_id));
      return `<option value="${a.appointment_id}" ${already ? 'disabled' : ''}>#${a.appointment_id} · ${escapeHtml(a.patient_name)} · ${formatDate(a.preferred_date)}${already ? ' (Invoice already generated)' : ''}</option>`;
    }).join('')}`;

    document.getElementById('prescriptionAppointment').innerHTML = rxOptions;
    document.getElementById('invoiceAppointment').innerHTML = invOptions;

    // Render doctor history
    const rxList = document.getElementById('doctorPrescriptionList');
    const invList = document.getElementById('doctorInvoiceList');
    if (rxList && summaryResult.success) {
      const prescriptions = summaryResult.prescriptions || [];
      rxList.innerHTML = prescriptions.length ? prescriptions.map(p => `
        <div class="mb-3 p-3 border rounded-3 bg-white shadow-sm">
          <div class="d-flex justify-content-between align-items-start mb-1">
            <strong>Prescription #${escapeHtml(p.prescription_id)}</strong>
            <small class="text-muted">${formatDate(p.preferred_date)}</small>
          </div>
          <div class="small text-muted mb-2"><i class="bi bi-person me-1"></i>Patient: <strong>${escapeHtml(p.patient_name)}</strong></div>
          <div class="p-2 bg-light rounded small font-monospace" style="white-space: pre-wrap;">${escapeHtml(p.prescription_body)}</div>
          <small class="text-muted d-block mt-2">Issued ${formatDateTime(p.issued_at)}</small>
        </div>
      `).join('') : emptyState('bi-file-medical', 'No prescriptions issued', 'Completed prescriptions will appear here.');
    }

    if (invList && summaryResult.success) {
      const invoices = summaryResult.invoices || [];
      invList.innerHTML = invoices.length ? invoices.map(i => `
        <div class="mb-3 p-3 border rounded-3 bg-white shadow-sm">
          <div class="d-flex justify-content-between align-items-start mb-1">
            <strong>Invoice #${escapeHtml(i.invoice_id)}</strong>
            ${statusBadge(i.payment_status)}
          </div>
          <div class="small text-muted mb-1"><i class="bi bi-person me-1"></i>Patient: <strong>${escapeHtml(i.patient_name)}</strong></div>
          <div class="d-flex justify-content-between align-items-center mt-2">
            <span class="fw-bold text-primary">${formatMoney(i.amount)}</span>
            <small class="text-muted">Generated ${formatDateTime(i.generated_at)}</small>
          </div>
        </div>
      `).join('') : emptyState('bi-receipt', 'No invoices generated', 'Generated consultation invoices will appear here.');
    }
  } catch (error) { toast(error.message, 'danger'); }
}

async function submitPrescription(event) {
  event.preventDefault(); const button = document.getElementById('prescriptionButton'); setButtonLoading(button, true, 'Saving...');
  const result = await apiCall('records?action=issue_prescription', 'POST', { appointment_id: Number(document.getElementById('prescriptionAppointment').value), prescription_body: document.getElementById('prescriptionBody').value.trim() });
  setButtonLoading(button, false); if (!result.success) return toast(result.error || 'Prescription could not be saved.', 'danger');
  document.getElementById('prescriptionForm').reset(); toast(result.message || 'Prescription saved.', 'success');
  populateCompletedAppointments();
}

async function submitInvoice(event) {
  event.preventDefault(); const button = document.getElementById('invoiceButton'); setButtonLoading(button, true, 'Generating...');
  const result = await apiCall('records?action=generate_invoice', 'POST', { appointment_id: Number(document.getElementById('invoiceAppointment').value), amount: Number(document.getElementById('invoiceAmount').value) });
  setButtonLoading(button, false); if (!result.success) return toast(result.error || 'Invoice could not be generated.', 'danger');
  document.getElementById('invoiceForm').reset(); toast(result.message || 'Invoice generated.', 'success');
  populateCompletedAppointments();
}

async function loadDoctorProfile() {
  const result = await apiCall('user?action=get_profile'); if (!result.success) return toast(result.error || 'Unable to load profile.', 'danger');
  document.getElementById('doctorProfileName').value = result.profile.name || '';
  document.getElementById('doctorProfileEmail').value = result.profile.email || '';
  document.getElementById('doctorProfileSpecialty').value = result.profile.specialty || 'Not assigned';
  document.getElementById('doctorProfileQualification').value = result.profile.qualification || 'Not provided';
  document.getElementById('doctorProfileLicense').value = result.profile.license_number || 'Not provided';
  document.getElementById('doctorProfileExperience').value = `${Number(result.profile.experience_years || 0)} years`;
  document.getElementById('doctorProfileBiography').value = result.profile.biography || '';
}

async function saveDoctorProfile(event) {
  event.preventDefault();
  const currentPassword = document.getElementById('doctorCurrentPassword').value;
  const password = document.getElementById('doctorProfilePassword').value;
  if (password && password.length < 8) return toast('New password must be at least 8 characters.', 'warning');
  if (password && !currentPassword) return toast('Enter your current password before choosing a new one.', 'warning');
  const button = document.getElementById('doctorProfileButton'); setButtonLoading(button, true, 'Saving...');
  const result = await apiCall('user?action=update_profile', 'POST', { name: document.getElementById('doctorProfileName').value.trim(), email: document.getElementById('doctorProfileEmail').value.trim(), current_password: currentPassword, password, biography: document.getElementById('doctorProfileBiography').value.trim() });
  setButtonLoading(button, false); if (!result.success) return toast(result.error || 'Profile could not be updated.', 'danger');
  document.getElementById('doctorCurrentPassword').value = ''; document.getElementById('doctorProfilePassword').value = ''; document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = document.getElementById('doctorProfileName').value.trim()); document.querySelectorAll('[data-user-initials]').forEach(el => el.textContent = initials(document.getElementById('doctorProfileName').value)); toast(result.message || 'Profile updated.', 'success');
}

document.addEventListener('DOMContentLoaded', async () => {
  const current = await checkAuth('Doctor'); if (!current) return;
  initSidebar(); initDashboardNavigation('overview');
  document.getElementById('doctorAppointmentFilter').addEventListener('change', () => loadDoctorAppointments(false));
  document.getElementById('meetingForm').addEventListener('submit', saveMeetingLink);
  document.getElementById('doctorChatForm').addEventListener('submit', sendDoctorChat);
  document.getElementById('prescriptionForm').addEventListener('submit', submitPrescription);
  document.getElementById('invoiceForm').addEventListener('submit', submitInvoice);
  document.getElementById('doctorProfileForm').addEventListener('submit', saveDoctorProfile);
  document.addEventListener('click', event => {
    const status = event.target.closest('[data-appointment-status]'); if (status) changeAppointmentStatus(status.dataset.appointmentId, status.dataset.appointmentStatus);
    const meeting = event.target.closest('[data-meeting-id]'); if (meeting) openMeetingModal(meeting.dataset.meetingId, meeting.dataset.meetingPatient);
    const chat = event.target.closest('[data-doctor-chat]'); if (chat) openDoctorChat(chat.dataset.doctorChat, chat.dataset.chatLabel);
  });
  document.getElementById('chatModal').addEventListener('hidden.bs.modal', () => { clearInterval(doctorChatTimer); doctorChatTimer = null; doctorActiveChat = null; });
  document.addEventListener('medconsult:sectionchange', event => { const s = event.detail.section; if (s === 'overview') loadDoctorOverview(); if (s === 'appointments') loadDoctorAppointments(); if (s === 'records') populateCompletedAppointments(); if (s === 'profile') loadDoctorProfile(); });
  const initial = location.hash.replace('#', '') || 'overview';
  if (initial === 'overview') loadDoctorOverview();
  if (initial === 'appointments') loadDoctorAppointments();
  if (initial === 'records') populateCompletedAppointments();
  if (initial === 'profile') loadDoctorProfile();
});
