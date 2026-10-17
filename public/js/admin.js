let adminUsersCache = [];
let adminAuditCache = [];
let pendingDoctorsCache = [];
let supportMessagesCache = [];

async function loadAdminOverview() {
  const [metrics, users, pending] = await Promise.all([apiCall('admin?action=metrics'), apiCall('admin?action=list_users'), apiCall('admin?action=pending_doctors')]);
  if (!metrics.success || !users.success || !pending.success) return toast(metrics.error || users.error || pending.error || 'Unable to load administration overview.', 'danger');
  adminUsersCache = users.users || []; pendingDoctorsCache = pending.doctors || [];
  document.getElementById('adminStatUsers').textContent = metrics.metrics.total_users;
  document.getElementById('adminStatDoctors').textContent = adminUsersCache.filter(u => u.role === 'Doctor' && Number(u.is_verified) === 1 && u.status === 'Active').length;
  document.getElementById('adminStatPending').textContent = metrics.metrics.pending_doctors;
  document.getElementById('adminStatAppointments').textContent = metrics.metrics.active_appointments;
  const box = document.getElementById('adminPendingPreview');
  box.innerHTML = pendingDoctorsCache.length ? pendingDoctorsCache.slice(0, 4).map(d => `<div class="appointment-card"><div class="d-flex justify-content-between align-items-center gap-3"><div><strong>${escapeHtml(d.name)}</strong><div class="small text-muted">${escapeHtml(d.email)}</div></div><button class="btn btn-sm btn-outline-primary" data-review-doctor="${d.user_id}">Review</button></div></div>`).join('') : emptyState('bi-person-check', 'No pending doctors', 'There are no doctor applications waiting for review.');
}

async function loadPendingDoctors() {
  const result = await apiCall('admin?action=pending_doctors');
  const box = document.getElementById('pendingDoctorList');
  if (!result.success) { box.innerHTML = emptyState('bi-exclamation-circle', 'Unable to load applications', result.error || 'Please try again.'); return; }
  pendingDoctorsCache = result.doctors || [];
  box.innerHTML = pendingDoctorsCache.length ? pendingDoctorsCache.map(d => `<article class="appointment-card"><div class="d-flex flex-column flex-md-row justify-content-between gap-3"><div><div class="d-flex align-items-center gap-2"><div class="doctor-avatar" style="width:44px;height:44px;border-radius:12px">${escapeHtml(initials(d.name))}</div><div><h3 class="h6 mb-0">${escapeHtml(d.name)}</h3><div class="small text-muted">${escapeHtml(d.email)}</div></div></div><div class="small text-muted mt-2">${escapeHtml(d.specialty || 'Specialty not set')} · ${escapeHtml(d.qualification || 'Qualification not provided')} · ${Number(d.experience_years || 0)} years experience</div><div class="small text-muted">License: ${escapeHtml(d.license_number || 'Not provided')} · Registered ${formatDateTime(d.created_at)}</div></div><div class="align-self-md-center"><button class="btn btn-primary btn-sm" data-review-doctor="${d.user_id}"><i class="bi bi-shield-check"></i> Review application</button></div></div></article>`).join('') : emptyState('bi-person-check', 'No pending doctors', 'New doctor registrations will appear here for verification.');
}

function openDoctorReview(id) {
  const doctor = pendingDoctorsCache.find(d => Number(d.user_id) === Number(id)); if (!doctor) return;
  document.getElementById('verifyDoctorId').value = id;
  document.getElementById('verifyDoctorTitle').textContent = `Review ${doctor.name}`;
  document.getElementById('verifyDoctorEmail').textContent = doctor.email;
  document.getElementById('verifyDoctorDetails').innerHTML = `<div><strong>Qualification:</strong> ${escapeHtml(doctor.qualification || 'Not provided')}</div><div><strong>License / registration:</strong> ${escapeHtml(doctor.license_number || 'Not provided')}</div><div><strong>Experience:</strong> ${Number(doctor.experience_years || 0)} years</div>`;
  document.getElementById('verifySpecialty').value = doctor.specialty || 'General Practitioner';
  bootstrap.Modal.getOrCreateInstance(document.getElementById('verifyDoctorModal')).show();
}

async function decideDoctor(decision) {
  const id = Number(document.getElementById('verifyDoctorId').value);
  if (decision === 'reject' && !await confirmAction({ title:'Reject doctor application?', message:'The pending doctor account will be permanently removed.', confirmText:'Reject application', danger:true })) return;
  if (decision === 'approve') {
    const specialty = document.getElementById('verifySpecialty').value;
    const specialtyResult = await apiCall('admin?action=edit_specialty', 'POST', { user_id:id, specialty });
    if (!specialtyResult.success) return toast(specialtyResult.error || 'Specialty could not be saved.', 'danger');
  }
  const result = await apiCall('admin?action=verify_doctor', 'POST', { user_id:id, decision });
  if (!result.success) return toast(result.error || 'Doctor decision could not be saved.', 'danger');
  bootstrap.Modal.getOrCreateInstance(document.getElementById('verifyDoctorModal')).hide();
  toast(result.message || 'Doctor application updated.', 'success');
  loadPendingDoctors(); loadAdminOverview();
}

async function loadAdminUsers(force = true) {
  if (!adminUsersCache.length || force) {
    const result = await apiCall('admin?action=list_users');
    if (!result.success) return toast(result.error || 'Users could not be loaded.', 'danger');
    adminUsersCache = result.users || [];
  }
  renderAdminUsers();
}

function renderAdminUsers() {
  const q = document.getElementById('adminUserSearch').value.trim().toLowerCase(); const role = document.getElementById('adminRoleFilter').value;
  const filtered = adminUsersCache.filter(u => (!role || u.role === role) && (!q || `${u.name} ${u.email} ${u.specialty || ''}`.toLowerCase().includes(q)));
  document.getElementById('adminUserCount').textContent = `${filtered.length} of ${adminUsersCache.length} users`;
  const body = document.getElementById('adminUsersBody'); const empty = document.getElementById('adminUsersEmpty'); body.innerHTML = '';
  if (!filtered.length) { empty.innerHTML = emptyState('bi-search', 'No matching users', 'Change the search or role filter.'); return; }
  empty.innerHTML = '';
  body.innerHTML = filtered.map(u => `<tr><td><div class="fw-semibold">${escapeHtml(u.name)}</div><div class="small text-muted">${escapeHtml(u.email)}</div></td><td>${escapeHtml(u.role)}</td><td>${u.role === 'Doctor' ? escapeHtml(u.specialty || 'Not assigned') : '—'}</td><td>${statusBadge(u.status)}</td><td>${formatDateTime(u.created_at)}</td><td><div class="d-flex flex-wrap gap-1">${u.role === 'Doctor' && Number(u.is_verified) === 1 ? `<button class="btn btn-sm btn-outline-primary" data-edit-specialty="${u.user_id}" data-doctor-name="${escapeHtml(u.name)}" data-specialty="${escapeHtml(u.specialty || 'General Practitioner')}"><i class="bi bi-pencil"></i></button>` : ''}${Number(u.user_id) !== Number(window.currentUser?.user_id) ? `<button class="btn btn-sm ${u.status === 'Active' ? 'btn-outline-warning' : 'btn-outline-success'}" data-user-status="${u.status === 'Active' ? 'Suspended' : 'Active'}" data-user-id="${u.user_id}" title="${u.status === 'Active' ? 'Suspend' : 'Activate'}"><i class="bi ${u.status === 'Active' ? 'bi-person-x' : 'bi-person-check'}"></i></button><button class="btn btn-sm btn-outline-danger" data-delete-user="${u.user_id}" data-delete-name="${escapeHtml(u.name)}" title="Delete"><i class="bi bi-trash"></i></button>` : '<span class="small text-muted">Current account</span>'}</div></td></tr>`).join('');
}

async function updateUserStatus(id, status) {
  if (status === 'Suspended' && !await confirmAction({ title:'Suspend this account?', message:'The user will not be able to sign in until the account is reactivated.', confirmText:'Suspend account', danger:true })) return;
  const result = await apiCall('admin?action=update_user_status', 'POST', { user_id:Number(id), status });
  if (!result.success) return toast(result.error || 'Status could not be updated.', 'danger');
  toast(result.message || 'User status updated.', 'success'); loadAdminUsers(true); loadAdminOverview();
}

async function deleteAdminUser(id, name) {
  if (!await confirmAction({ title:`Delete ${name}?`, message:'This permanently removes the user and related records through database relationships. Use suspension instead if the account may need to be restored.', confirmText:'Delete permanently', danger:true })) return;
  const result = await apiCall('admin?action=delete_user', 'POST', { user_id:Number(id) });
  if (!result.success) return toast(result.error || 'User could not be deleted.', 'danger');
  toast(result.message || 'User deleted.', 'success'); loadAdminUsers(true); loadAdminOverview();
}

function openSpecialtyEditor(id, name, specialty) {
  document.getElementById('specialtyDoctorId').value = id; document.getElementById('specialtyDoctorName').textContent = name; document.getElementById('specialtyValue').value = specialty || 'General Practitioner'; bootstrap.Modal.getOrCreateInstance(document.getElementById('specialtyModal')).show();
}

async function saveSpecialty(event) {
  event.preventDefault(); const result = await apiCall('admin?action=edit_specialty', 'POST', { user_id:Number(document.getElementById('specialtyDoctorId').value), specialty:document.getElementById('specialtyValue').value });
  if (!result.success) return toast(result.error || 'Specialty could not be updated.', 'danger');
  bootstrap.Modal.getOrCreateInstance(document.getElementById('specialtyModal')).hide(); toast(result.message || 'Specialty updated.', 'success'); loadAdminUsers(true);
}

async function loadSupportMessages() {
  const result = await apiCall('admin?action=contact_messages');
  if (!result.success) return toast(result.error || 'Support messages could not be loaded.', 'danger');
  supportMessagesCache = result.messages || [];
  renderSupportMessages();
}

function renderSupportMessages() {
  const filter = document.getElementById('supportStatusFilter').value;
  const list = supportMessagesCache.filter(message => !filter || message.status === filter);
  const box = document.getElementById('supportMessageList');
  box.innerHTML = list.length ? list.map(message => `
    <article class="appointment-card">
      <div class="d-flex flex-column flex-lg-row justify-content-between gap-3">
        <div class="flex-grow-1">
          <div class="d-flex align-items-center gap-2 flex-wrap"><h3 class="h6 mb-0">${escapeHtml(message.subject)}</h3>${statusBadge(message.status)}</div>
          <div class="small text-muted mt-1">${escapeHtml(message.name)} · ${escapeHtml(message.email)} · ${formatDateTime(message.created_at)}</div>
          <div class="record-body mt-3">${escapeHtml(message.message_body)}</div>
        </div>
        <div class="align-self-lg-start">
          <button class="btn btn-sm ${message.status === 'Resolved' ? 'btn-outline-primary' : 'btn-primary'}" data-contact-status="${message.status === 'Resolved' ? 'New' : 'Resolved'}" data-contact-id="${message.message_id}">
            <i class="bi ${message.status === 'Resolved' ? 'bi-arrow-counterclockwise' : 'bi-check2'}"></i> ${message.status === 'Resolved' ? 'Reopen' : 'Resolve'}
          </button>
        </div>
      </div>
    </article>`).join('') : emptyState('bi-inbox', 'No support messages', filter ? `There are no ${filter.toLowerCase()} messages.` : 'Messages from the public contact page will appear here.');
}

async function updateContactStatus(id, status) {
  const result = await apiCall('admin?action=update_contact_status', 'POST', { message_id:Number(id), status });
  if (!result.success) return toast(result.error || 'Support message could not be updated.', 'danger');
  toast(result.message || 'Support message updated.', 'success');
  loadSupportMessages();
}

async function loadAudit() {
  const result = await apiCall('admin?action=audit_logs'); if (!result.success) return toast(result.error || 'Audit log could not be loaded.', 'danger'); adminAuditCache = result.logs || []; renderAudit();
}

function renderAudit() {
  const q = document.getElementById('auditSearch').value.trim().toLowerCase(); const filtered = adminAuditCache.filter(l => !q || `${l.user_name || 'System'} ${l.action_type} ${l.description}`.toLowerCase().includes(q)); const body = document.getElementById('auditBody'); const empty = document.getElementById('auditEmpty'); body.innerHTML = '';
  if (!filtered.length) { empty.innerHTML = emptyState('bi-journal-x', 'No matching activity', 'Change the audit filter.'); return; } empty.innerHTML = '';
  body.innerHTML = filtered.map(l => `<tr><td class="text-nowrap">${formatDateTime(l.logged_at)}</td><td>${escapeHtml(l.user_name || 'System')}</td><td><span class="badge-status status-default">${escapeHtml(l.action_type)}</span></td><td>${escapeHtml(l.description)}</td></tr>`).join('');
}

async function loadAdminProfile() { const result = await apiCall('user?action=get_profile'); if (!result.success) return toast(result.error || 'Profile could not be loaded.', 'danger'); document.getElementById('adminProfileName').value = result.profile.name || ''; document.getElementById('adminProfileEmail').value = result.profile.email || ''; }
async function saveAdminProfile(event) { event.preventDefault(); const currentPassword = document.getElementById('adminCurrentPassword').value; const password = document.getElementById('adminProfilePassword').value; if (password && password.length < 8) return toast('New password must be at least 8 characters.', 'warning'); if (password && !currentPassword) return toast('Enter your current password before choosing a new one.', 'warning'); const button = document.getElementById('adminProfileButton'); setButtonLoading(button,true,'Saving...'); const result = await apiCall('user?action=update_profile','POST',{name:document.getElementById('adminProfileName').value.trim(),email:document.getElementById('adminProfileEmail').value.trim(),current_password:currentPassword,password}); setButtonLoading(button,false); if (!result.success) return toast(result.error || 'Profile could not be updated.','danger'); document.getElementById('adminCurrentPassword').value=''; document.getElementById('adminProfilePassword').value=''; document.querySelectorAll('[data-user-name]').forEach(el=>el.textContent=document.getElementById('adminProfileName').value.trim()); document.querySelectorAll('[data-user-initials]').forEach(el=>el.textContent=initials(document.getElementById('adminProfileName').value)); toast(result.message || 'Profile updated.','success'); }

document.addEventListener('DOMContentLoaded', async () => {
  const current = await checkAuth('Administrator'); if (!current) return; initSidebar(); initDashboardNavigation('overview');
  document.getElementById('adminUserSearch').addEventListener('input', renderAdminUsers); document.getElementById('adminRoleFilter').addEventListener('change', renderAdminUsers); document.getElementById('auditSearch').addEventListener('input', renderAudit); document.getElementById('supportStatusFilter').addEventListener('change', renderSupportMessages); document.getElementById('specialtyForm').addEventListener('submit', saveSpecialty); document.getElementById('adminProfileForm').addEventListener('submit', saveAdminProfile); document.getElementById('approveDoctorButton').addEventListener('click',()=>decideDoctor('approve')); document.getElementById('rejectDoctorButton').addEventListener('click',()=>decideDoctor('reject'));
  document.addEventListener('click', event => { const review=event.target.closest('[data-review-doctor]'); if(review) openDoctorReview(review.dataset.reviewDoctor); const status=event.target.closest('[data-user-status]'); if(status) updateUserStatus(status.dataset.userId,status.dataset.userStatus); const del=event.target.closest('[data-delete-user]'); if(del) deleteAdminUser(del.dataset.deleteUser,del.dataset.deleteName); const edit=event.target.closest('[data-edit-specialty]'); if(edit) openSpecialtyEditor(edit.dataset.editSpecialty,edit.dataset.doctorName,edit.dataset.specialty); const contact=event.target.closest('[data-contact-status]'); if(contact) updateContactStatus(contact.dataset.contactId,contact.dataset.contactStatus); });
  document.addEventListener('medconsult:sectionchange', event => { const s=event.detail.section; if(s==='overview') loadAdminOverview(); if(s==='verification') loadPendingDoctors(); if(s==='users') loadAdminUsers(); if(s==='support') loadSupportMessages(); if(s==='audit') loadAudit(); if(s==='profile') loadAdminProfile(); });
  const initial = location.hash.replace('#', '') || 'overview';
  if (initial === 'overview') loadAdminOverview();
  if (initial === 'verification') loadPendingDoctors();
  if (initial === 'users') loadAdminUsers();
  if (initial === 'support') loadSupportMessages();
  if (initial === 'audit') loadAudit();
  if (initial === 'profile') loadAdminProfile();
});
