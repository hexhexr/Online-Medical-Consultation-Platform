const dashboardForRole = {
  Patient: 'patient_dashboard.html',
  Doctor: 'doctor_dashboard.html',
  Administrator: 'admin_dashboard.html'
};

async function redirectIfSignedIn() {
  const session = await apiCall('auth?action=session');
  if (session.authenticated && dashboardForRole[session.role]) {
    window.location.replace(dashboardForRole[session.role]);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  redirectIfSignedIn();
  const role = document.getElementById('regRole');
  const note = document.getElementById('doctorApprovalNote');
  const doctorFields = document.getElementById('doctorRegistrationFields');
  function updateDoctorFields() {
    const isDoctor = role.value === 'Doctor';
    note.hidden = !isDoctor;
    doctorFields.hidden = !isDoctor;
  }
  role.addEventListener('change', updateDoctorFields);
  updateDoctorFields();

  if (location.hash === '#register') bootstrap.Tab.getOrCreateInstance(document.getElementById('register-tab')).show();

  document.getElementById('loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    const button = document.getElementById('loginButton');
    setButtonLoading(button, true, 'Signing in...');
    const result = await apiCall('auth?action=login', 'POST', {
      email: document.getElementById('loginEmail').value.trim(),
      password: document.getElementById('loginPassword').value
    });
    setButtonLoading(button, false);
    if (!result.success) return showAlert(result.error || 'Unable to sign in.');
    window.location.replace(dashboardForRole[result.role] || 'index.html');
  });

  document.getElementById('registerForm').addEventListener('submit', async event => {
    event.preventDefault();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regPasswordConfirm').value;
    if (password.length < 8) return showAlert('Password must be at least 8 characters.');
    if (password !== confirmPassword) return showAlert('Passwords do not match.');
    const button = document.getElementById('registerButton');
    const roleValue = role.value;
    const payload = {
      name: document.getElementById('regName').value.trim(),
      email: document.getElementById('regEmail').value.trim(),
      password,
      role: roleValue
    };
    if (roleValue === 'Doctor') {
      payload.specialty = document.getElementById('regSpecialty').value;
      payload.qualification = document.getElementById('regQualification').value.trim();
      payload.license_number = document.getElementById('regLicense').value.trim();
      payload.experience_years = Number(document.getElementById('regExperience').value);
      if (!payload.qualification || !payload.license_number) return showAlert('Doctors must enter qualification and registration/license number.');
      if (!Number.isInteger(payload.experience_years) || payload.experience_years < 0 || payload.experience_years > 70) return showAlert('Enter valid years of experience.');
    }
    setButtonLoading(button, true, 'Creating account...');
    const result = await apiCall('auth?action=register', 'POST', payload);
    setButtonLoading(button, false);
    if (!result.success) return showAlert(result.error || 'Unable to create account.');
    document.getElementById('registerForm').reset();
    updateDoctorFields();
    bootstrap.Tab.getOrCreateInstance(document.getElementById('login-tab')).show();
    showAlert(roleValue === 'Doctor' ? 'Account created. An administrator must verify your doctor account before you can use the doctor portal.' : 'Account created successfully. You can now sign in.', 'success');
  });
});
