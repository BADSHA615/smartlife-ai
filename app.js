// SmartLife AI - Version 2.0.2
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = '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';

// --- State ---
let currentUser = localStorage.getItem('user');
let currentModule = 'dashboard';

// --- Module Configuration ---
const MODULES = {
    'life': {
        title: 'Life & Mind',
        tier: 'Free',
        desc: 'Daily routine, stress advice, and motivation.',
        inputs: [
            { id: 'goal', label: 'What is your main goal for today?', type: 'text', placeholder: 'e.g. Finish project, relax...' },
            { id: 'mood', label: 'Current Mood', type: 'select', options: ['Happy', 'Stressed', 'Tired', 'Motivated', 'Anxious', 'Neutral'] },
            { id: 'time', label: 'Available Time', type: 'text', placeholder: 'e.g. 2 hours, All day' }
        ],
        systemPrompt: "You are an expert Life Coach and Routine Planner. Create unstructured, easy-to-follow advice or routines based on the user's goal, mood, and time. Be motivating and empathetic."
    },
    'fashion': {
        title: 'Fashion & Style',
        tier: 'Premium',
        desc: 'Outfit suggestions based on occasion and body type.',
        inputs: [
            { id: 'event', label: 'Occasion / Event', type: 'text', placeholder: 'e.g. Wedding, Job Interview, Date Night' },
            { id: 'style', label: 'Preferred Style', type: 'select', options: ['Casual', 'Formal', 'Streetwear', 'Boho', 'Minimalist', 'Chic'] },
            { id: 'color', label: 'Preferred Colors', type: 'text', placeholder: 'e.g. Black, Pastel, Earth tones' }
        ],
        systemPrompt: "You are a top-tier Fashion Stylist. Suggest a complete outfit including accessories and footwear. Explain WHY this works. Keep it trendy and suitable for the occasion."
    },
    'study': {
        title: 'Study & Learning',
        tier: 'Basic',
        desc: 'Revision notes, quizzes, and study planning.',
        inputs: [
            { id: 'topic', label: 'Subject / Topic', type: 'text', placeholder: 'e.g. Photosynthesis, World War II, Python Basics' },
            { id: 'type', label: 'What do you need?', type: 'select', options: ['Summary Notes', 'Quiz (MCQ)', 'Study Plan', 'Explain like I\'m 5'] }
        ],
        systemPrompt: "You are an expert Tutor. If asked for Notes, provide concise bullet points. If asked for a Quiz, provide 5 MCQs with answers at the bottom. If asked for a Plan, break it down by time."
    },
    'relationship': {
        title: 'Relationship & Safety',
        tier: 'Premium',
        desc: 'Advice on social interactions and safety checks.',
        inputs: [
            { id: 'situation', label: 'Describe the Situation or Paste Chat', type: 'textarea', placeholder: 'He said "..." and I felt...' },
            { id: 'concern', label: 'Specific Concern', type: 'select', options: ['General Advice', 'Red Flag Check', 'Reply Suggestion', 'Vent'] }
        ],
        systemPrompt: "You are an empathetic Relationship Advisor. Analyze the situation objectively. Point out potential red flags if asked. Suggest mature, healthy communication styles."
    },
    'food': {
        title: 'Food & Health',
        tier: 'Free',
        desc: 'Recipes, meal plans, and health tips.',
        inputs: [
            { id: 'ingredients', label: 'Available Ingredients', type: 'textarea', placeholder: 'e.g. Eggs, Bread, Tomato...' },
            { id: 'diet', label: 'Dietary Preference', type: 'select', options: ['None', 'Vegetarian', 'Vegan', 'Keto', 'Low Carb'] },
            { id: 'goal', label: 'Health Goal', type: 'text', placeholder: 'e.g. Lose weight, Muscle gain, Quick meal' }
        ],
        systemPrompt: "You are a Nutritionist and Chef. Create a delicious recipe or meal plan based on the ingredients. Include approximate calorie count and health benefits."
    },
    'business': {
        title: 'Business & Money',
        tier: 'Premium',
        desc: 'Startup ideas, marketing, and financial tips.',
        inputs: [
            { id: 'interest', label: 'Interest / Skill', type: 'text', placeholder: 'e.g. Coding, Baking, Writing' },
            { id: 'budget', label: 'Investment Budget', type: 'text', placeholder: 'e.g. $0, $1000, Low budget' },
            { id: 'need', label: 'What do you need?', type: 'select', options: ['Business Idea', 'Marketing Slogan', 'Profit Plan', 'Stock Tips'] }
        ],
        systemPrompt: "You are a Business Consultant. Provide actionable, realistic business ideas or financial advice. Focus on profitability and market fit."
    },
    'wellbeing': {
        title: 'Digital Wellbeing',
        tier: 'Basic',
        desc: 'Detox plans and phone addiction analysis.',
        inputs: [
            { id: 'screentime', label: 'Daily Screen Time (Avg)', type: 'text', placeholder: 'e.g. 6 hours' },
            { id: 'problem', label: 'Main Distraction', type: 'text', placeholder: 'e.g. Instagram Reels, Gaming' },
            { id: 'goal', label: 'Goal', type: 'select', options: ['Reduce Screen Time', 'Focus Detox', 'Sleep Better'] }
        ],
        systemPrompt: "You are a Digital Wellbeing Coach. Create a strict but doable plan to reduce screen time. Suggest alternative offline activities."
    }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    checkContext();
});

let isLoginMode = true;
let isRecoveryMode = false;

function checkContext() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = savedUser;
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('displayUsername').innerText = currentUser;

        // Restore role
        const users = JSON.parse(localStorage.getItem('users_db')) || [];
        const userObj = users.find(u => u.name === currentUser);
        if (userObj) {
            localStorage.setItem('user_role', userObj.role);
        }

        loadChatHistory();
        updateModuleLocks();
        updateUsageDisplay(); // Update usage stats
    } else {
        document.getElementById('loginModal').style.display = 'flex';
    }
}

function updateUsageDisplay() {
    const userRole = localStorage.getItem('user_role') || 'Free';
    const messageCount = parseInt(localStorage.getItem(`msg_count_${currentUser}`) || '0');
    const quotas = { 'Free': 20, 'Basic': 50, 'Premium': Infinity };
    const userQuota = quotas[userRole];

    // Update dashboard display
    if (document.getElementById('userTierDisplay')) {
        document.getElementById('userTierDisplay').innerText = userRole;
    }
    if (document.getElementById('messageUsageDisplay')) {
        const displayQuota = userQuota === Infinity ? '∞' : userQuota;
        document.getElementById('messageUsageDisplay').innerText = `${messageCount}/${displayQuota}`;
    }
}

// --- Chat History System ---
let currentChatId = null;

function toggleChatHistory() {
    const sidebar = document.getElementById('chatHistorySidebar');
    sidebar.classList.toggle('active');
    if (sidebar.classList.contains('active')) {
        loadSavedChats();
    }
}

function newChat() {
    // Save current chat if it has messages
    const currentHistory = JSON.parse(sessionStorage.getItem('chat_history_' + currentUser)) || [];
    if (currentHistory.length > 0) {
        saveCurrentChat();
    }

    // Clear current chat
    currentChatId = null;
    sessionStorage.removeItem('chat_history_' + currentUser);
    loadChatHistory();
    showToast('New chat started', 'success');
}

function saveCurrentChat() {
    const history = JSON.parse(sessionStorage.getItem('chat_history_' + currentUser)) || [];
    if (history.length === 0) return;

    // Generate title from first user message
    const title = history[0].user.substring(0, 50) + (history[0].user.length > 50 ? '...' : '');

    const chatId = currentChatId || Date.now().toString();
    const savedChats = JSON.parse(localStorage.getItem('saved_chats_' + currentUser)) || [];

    const chatData = {
        id: chatId,
        title: title,
        messages: history,
        timestamp: new Date().toISOString()
    };

    // Update existing or add new
    const existingIndex = savedChats.findIndex(c => c.id === chatId);
    if (existingIndex !== -1) {
        savedChats[existingIndex] = chatData;
    } else {
        savedChats.unshift(chatData); // Add to beginning
    }

    // Keep last 20 chats
    if (savedChats.length > 20) savedChats.pop();

    localStorage.setItem('saved_chats_' + currentUser, JSON.stringify(savedChats));
    currentChatId = chatId;
    showToast('Chat saved', 'success');
}

function loadSavedChats() {
    const savedChats = JSON.parse(localStorage.getItem('saved_chats_' + currentUser)) || [];
    const container = document.getElementById('savedChatsList');

    if (savedChats.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:1rem;">No saved chats yet</p>';
        return;
    }

    container.innerHTML = '';
    savedChats.forEach(chat => {
        const item = document.createElement('div');
        item.className = 'saved-chat-item' + (chat.id === currentChatId ? ' active' : '');

        const date = new Date(chat.timestamp).toLocaleDateString();

        item.innerHTML = `
            <div class="saved-chat-title">${chat.title}</div>
            <div class="saved-chat-date">${date}</div>
            <div class="saved-chat-actions">
                <button onclick="loadChat('${chat.id}')"><i class="fa-solid fa-folder-open"></i> Load</button>
                <button onclick="deleteChat('${chat.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
            </div>
        `;

        container.appendChild(item);
    });
}

function loadChat(chatId) {
    const savedChats = JSON.parse(localStorage.getItem('saved_chats_' + currentUser)) || [];
    const chat = savedChats.find(c => c.id === chatId);

    if (!chat) return;

    // Save current chat before switching
    const currentHistory = JSON.parse(sessionStorage.getItem('chat_history_' + currentUser)) || [];
    if (currentHistory.length > 0 && currentChatId !== chatId) {
        saveCurrentChat();
    }

    // Load selected chat
    currentChatId = chatId;
    sessionStorage.setItem('chat_history_' + currentUser, JSON.stringify(chat.messages));
    loadChatHistory();
    toggleChatHistory(); // Close sidebar
    showToast('Chat loaded', 'success');
}

function deleteChat(chatId) {
    if (!confirm('Delete this chat?')) return;

    let savedChats = JSON.parse(localStorage.getItem('saved_chats_' + currentUser)) || [];
    savedChats = savedChats.filter(c => c.id !== chatId);
    localStorage.setItem('saved_chats_' + currentUser, JSON.stringify(savedChats));

    if (currentChatId === chatId) {
        currentChatId = null;
        sessionStorage.removeItem('chat_history_' + currentUser);
        loadChatHistory();
    }

    loadSavedChats();
    showToast('Chat deleted', 'success');
}

// --- Toast System ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Override alert with toast for better UX
window.alert = function (msg) { showToast(msg, 'info'); }


function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    isRecoveryMode = false;
    updateAuthUI();
}

function toggleRecoveryMode() {
    isRecoveryMode = true;
    updateAuthUI();
}

function updateAuthUI() {
    const title = document.getElementById('authTitle');
    const desc = document.getElementById('authDesc');
    const btn = document.getElementById('authBtn');
    const switchText = document.getElementById('authSwitchText');
    const switchLink = document.getElementById('authSwitchLink');
    const forgotLink = document.getElementById('forgotPasswordLink');

    const securityFields = document.getElementById('securityFields');
    const newPassField = document.getElementById('newPasswordInput');
    const passField = document.getElementById('passwordInput');

    // Reset visibility
    securityFields.style.display = 'none';
    newPassField.style.display = 'none';
    passField.style.display = 'block';
    forgotLink.style.display = 'block';

    if (isRecoveryMode) {
        title.innerText = 'Reset Password';
        desc.innerText = 'Verify your identity to reset password';
        btn.innerHTML = 'Reset Password <i class="fa-solid fa-key"></i>';
        switchText.innerText = 'Remembered it?';
        switchLink.innerText = 'Login';
        forgotLink.style.display = 'none';

        passField.style.display = 'none'; // Hide normal password field
        securityFields.style.display = 'block'; // Show security Q&A
        newPassField.style.display = 'block'; // Show new password field
        document.getElementById('securityQuestion').style.display = 'block';
    }
    else if (isLoginMode) {
        title.innerText = 'Welcome Back';
        desc.innerText = 'Login to continue your journey';
        btn.innerHTML = 'Login <i class="fa-solid fa-arrow-right"></i>';
        switchText.innerText = 'New here?';
        switchLink.innerText = 'Create Account';
    }
    else { // Sign Up
        title.innerText = 'Create Account';
        desc.innerText = 'Join SmartLife today';
        btn.innerHTML = 'Sign Up <i class="fa-solid fa-user-plus"></i>';
        switchText.innerText = 'Already have an account?';
        switchLink.innerText = 'Login';
        forgotLink.style.display = 'none';

        securityFields.style.display = 'block'; // Show security Q&A setup
        document.getElementById('securityQuestion').style.display = 'block';
    }
}

function handleAuth() {
    const username = document.getElementById('usernameInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();

    // Security Fields
    const secQuestion = document.getElementById('securityQuestion').value;
    const secAnswer = document.getElementById('securityAnswer').value.trim();
    const newPassword = document.getElementById('newPasswordInput').value.trim();

    let users = JSON.parse(localStorage.getItem('users_db')) || [];

    if (isRecoveryMode) {
        if (!username || !secQuestion || !secAnswer || !newPassword) return showToast('Please fill all fields.', 'error');

        const userIndex = users.findIndex(u => u.name === username);
        if (userIndex === -1) return showToast('User not found.', 'error');

        const user = users[userIndex];
        if (user.secQuestion === secQuestion && user.secAnswer.toLowerCase() === secAnswer.toLowerCase()) {
            user.password = newPassword;
            localStorage.setItem('users_db', JSON.stringify(users));
            showToast('Password reset successful! Please login.', 'success');
            toggleAuthMode(); // Go to login
            isLoginMode = true;
            updateAuthUI();
        } else {
            showToast('Incorrect Security Answer/Question.', 'error');
        }
        return;
    }

    if (isLoginMode) {
        if (!username || !password) return showToast('Please enter username and password.', 'error');
        // Login Logic
        const user = users.find(u => u.name === username && u.password === password);
        if (user) {
            if (user.status === 'Suspended') {
                showToast('Your account has been suspended. Contact Admin.', 'error');
                return;
            }
            loginUser(user);
            showToast(`Welcome back, ${user.name}!`, 'success');
        } else {
            showToast('Invalid username or password.', 'error');
        }
    } else {
        // Register Logic
        if (!username || !password) return showToast('Please fill all fields.', 'error');
        if (!secQuestion || !secAnswer) return showToast('Please set a Security Question.', 'error');

        if (users.some(u => u.name === username)) {
            showToast('Username already exists.', 'error');
            return;
        }

        const newUser = {
            name: username,
            password: password,
            role: 'Free', // Default role
            joined: new Date().toISOString(),
            secQuestion: secQuestion,
            secAnswer: secAnswer
        };

        users.push(newUser);
        localStorage.setItem('users_db', JSON.stringify(users));

        loginUser(newUser);
        showToast('Account created successfully!', 'success');
    }
}

function loginUser(user) {
    currentUser = user.name;
    localStorage.setItem('currentUser', user.name);
    localStorage.setItem('user_role', user.role); // Sync role to session

    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('displayUsername').innerText = currentUser;

    loadChatHistory();
    updateModuleLocks();
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('user_role'); // Clear session role
        location.reload();
    }
}

function hasAccess(moduleTier) {
    let userRole = localStorage.getItem('user_role') || 'Free';

    // Normalize to Title Case (e.g. "free" -> "Free")
    if (userRole) {
        userRole = userRole.trim();
        userRole = userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase();
    }

    // Tier Hierarchy: Free < Basic < Premium
    const levels = { 'Free': 1, 'Basic': 2, 'Premium': 3 };

    // Fallback if invalid role
    if (!levels[userRole]) userRole = 'Free';

    return levels[userRole] >= levels[moduleTier];
}

function updateModuleLocks() {
    document.querySelectorAll('.menu-btn[onclick*="switchModule"]').forEach(btn => {
        const moduleId = btn.getAttribute('onclick').match(/'([^']+)'/)[1];
        if (MODULES[moduleId]) {
            const requiredTier = MODULES[moduleId].tier;
            if (!hasAccess(requiredTier)) {
                if (!btn.querySelector('.fa-lock')) {
                    btn.innerHTML += ' <i class="fa-solid fa-lock" style="margin-left:auto; font-size:0.8em; opacity:0.7;"></i>';
                    btn.style.opacity = '0.6';
                }
            } else {
                // Remove lock if present (e.g. after upgrade)
                const lock = btn.querySelector('.fa-lock');
                if (lock) lock.remove();
                btn.style.opacity = '1';
            }
        }
    });
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
}

function switchModule(moduleId) {
    // Check Access
    if (MODULES[moduleId]) {
        const requiredTier = MODULES[moduleId].tier;
        if (!hasAccess(requiredTier)) {
            alert(`🔒 This feature is locked!\n\nIt requires the ${requiredTier} plan.\nPlease upgrade in the Admin Panel.`);
            return;
        }
    }

    currentModule = moduleId;

    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        closeSidebar();
    }

    // Update Sidebar Active State
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
    // Find button with matching onclick
    const btns = Array.from(document.querySelectorAll('.menu-btn'));
    const activeBtn = btns.find(b => b.getAttribute('onclick')?.includes(moduleId));
    if (activeBtn) activeBtn.classList.add('active');

    // View Switching
    const dashboard = document.getElementById('dashboardView');
    const moduleView = document.getElementById('moduleView');
    const settingsView = document.getElementById('settingsView');
    const adminView = document.getElementById('adminView');

    // Hide all first
    dashboard.style.display = 'none';
    moduleView.style.display = 'none';
    settingsView.style.display = 'none';
    adminView.style.display = 'none';

    if (moduleId === 'dashboard') {
        dashboard.style.display = 'block';
        triggerAnimation(dashboard);
    }
    else if (moduleId === 'admin') {
        // Simple Admin Authentication
        const password = prompt("Enter Admin Password:");
        if (password === "admin123" || password === "BADSHA") {
            adminView.style.display = 'block';
            loadAdminPanel();
            triggerAnimation(adminView);
        } else {
            alert("Access Denied: Incorrect Password.");
            // Revert navigation logic is complex, just reload for simplicity or go home
            switchModule('dashboard');
            return;
        }
    }
    else if (moduleId === 'settings') {
        settingsView.style.display = 'block';
        loadSettingsValues();
        triggerAnimation(settingsView);
    }
    else {
        moduleView.style.display = 'block';
        renderModule(moduleId);
        triggerAnimation(moduleView);
    }
}

function triggerAnimation(element) {
    element.classList.remove('view-section');
    void element.offsetWidth;
    element.classList.add('view-section');
}

// --- Admin Logic ---
function loadAdminPanel() {
    const tableBody = document.getElementById('userTableBody');
    tableBody.innerHTML = '';

    // Get stored users
    let users = JSON.parse(localStorage.getItem('users_db')) || [];

    // Ensure current user is in the list
    if (!users.some(u => u.name === currentUser)) {
        users.push({
            name: currentUser,
            role: localStorage.getItem('user_role') || 'Free',
            status: 'Active',
            joined: new Date().toISOString()
        });
    }

    // Flag current user for display
    users.forEach(u => {
        if (u.name === currentUser) u.isCurrent = true;
        if (!u.status) u.status = 'Active'; // Default status
    });

    localStorage.setItem('users_db', JSON.stringify(users));

    // Calculate Statistics
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'Active').length;
    const suspendedUsers = users.filter(u => u.status === 'Suspended').length;
    const premiumUsers = users.filter(u => u.role === 'Premium').length;

    // Update Stats Display
    document.getElementById('statTotalUsers').innerText = totalUsers;
    document.getElementById('statActiveUsers').innerText = activeUsers;
    document.getElementById('statSuspendedUsers').innerText = suspendedUsers;
    document.getElementById('statPremiumUsers').innerText = premiumUsers;

    // Render User Table
    renderUserTable(users);
}

function renderUserTable(users) {
    const tableBody = document.getElementById('userTableBody');
    tableBody.innerHTML = '';

    users.forEach(u => {
        // Update current role display if it changed externally
        if (u.isCurrent) u.role = localStorage.getItem('user_role') || 'Free';

        const row = document.createElement('tr');
        row.className = 'user-row'; // For filtering
        row.setAttribute('data-username', u.name.toLowerCase());
        row.setAttribute('data-role', u.role.toLowerCase());

        row.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <div style="width:8px; height:8px; border-radius:50%; background:${u.status === 'Active' ? 'var(--primary-color)' : 'var(--danger)'}"></div>
                    ${u.name} ${u.isCurrent ? '<span class="text-xs text-muted">(You)</span>' : ''}
                </div>
            </td>
            <td><span class="badge badge-${u.role.toLowerCase()}">${u.role}</span></td>
            <td>
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                    <select onchange="updateUserRole('${u.name}', this.value)" class="module-input" style="padding: 0.25rem; width:auto; font-size:0.8rem;">
                        <option value="Free" ${u.role === 'Free' ? 'selected' : ''}>Free</option>
                        <option value="Basic" ${u.role === 'Basic' ? 'selected' : ''}>Basic</option>
                        <option value="Premium" ${u.role === 'Premium' ? 'selected' : ''}>Premium</option>
                    </select>
                    
                    ${!u.isCurrent ? `
                    <button onclick="toggleUserStatus('${u.name}')" class="secondary-btn" style="padding:0.25rem 0.5rem; font-size:0.8rem; border-color:${u.status === 'Active' ? 'var(--danger)' : 'var(--primary-color)'}; color:${u.status === 'Active' ? 'var(--danger)' : 'var(--primary-color)'}">
                        ${u.status === 'Active' ? '<i class="fa-solid fa-ban"></i> Suspend' : '<i class="fa-solid fa-check"></i> Activate'}
                    </button>
                    <button onclick="deleteUser('${u.name}')" class="danger-btn" style="padding:0.25rem 0.5rem; font-size:0.8rem; width:auto;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                    ` : ''}
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function filterUsers() {
    const searchTerm = document.getElementById('userSearchInput').value.toLowerCase();
    const rows = document.querySelectorAll('.user-row');

    rows.forEach(row => {
        const username = row.getAttribute('data-username');
        const role = row.getAttribute('data-role');

        if (username.includes(searchTerm) || role.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function updateUserRole(name, newRole) {
    let users = JSON.parse(localStorage.getItem('users_db')) || [];
    const userIndex = users.findIndex(u => u.name === name);

    if (userIndex !== -1) {
        users[userIndex].role = newRole;
        localStorage.setItem('users_db', JSON.stringify(users));

        // Fix: Check against currentUser global variable, not property
        if (users[userIndex].name === currentUser) {
            localStorage.setItem('user_role', newRole);
            showToast(`Your subscription updated to: ${newRole}`, 'success');
            updateModuleLocks(); // Refresh UI locks immediately
        } else {
            showToast(`Updated ${name} to ${newRole}`, 'success');
        }
    }
    loadAdminPanel(); // Refresh UI
}

function toggleUserStatus(name) {
    let users = JSON.parse(localStorage.getItem('users_db')) || [];
    const userIndex = users.findIndex(u => u.name === name);

    if (userIndex !== -1) {
        const newStatus = users[userIndex].status === 'Active' ? 'Suspended' : 'Active';
        users[userIndex].status = newStatus;
        localStorage.setItem('users_db', JSON.stringify(users));
        showToast(`User ${name} is now ${newStatus}.`, newStatus === 'Active' ? 'success' : 'error');
        loadAdminPanel();
    }
}

function deleteUser(name) {
    if (!confirm(`Are you sure you want to delete user "${name}"? This cannot be undone.`)) return;

    let users = JSON.parse(localStorage.getItem('users_db')) || [];
    const newUsers = users.filter(u => u.name !== name);
    localStorage.setItem('users_db', JSON.stringify(newUsers));
    showToast(`User ${name} deleted.`, 'success');
    loadAdminPanel();
}

// --- Settings Logic ---
function loadSettingsValues() {
    document.getElementById('settingsName').value = currentUser || '';
    document.getElementById('settingsApiKey').value = localStorage.getItem('custom_api_key') || API_KEY || '';
}

function updateProfile() {
    const name = document.getElementById('settingsName').value.trim();
    if (name) {
        const oldName = currentUser;
        currentUser = name;
        localStorage.setItem('currentUser', name);
        document.getElementById('displayUsername').innerText = name;

        // Also update users_db if it exists
        let users = JSON.parse(localStorage.getItem('users_db')) || [];
        const userIndex = users.findIndex(u => u.name === oldName);
        if (userIndex !== -1) {
            users[userIndex].name = name;
            localStorage.setItem('users_db', JSON.stringify(users));
        }

        showToast('Profile updated successfully!', 'success');
    }
}

function updateApiKey() {
    const key = document.getElementById('settingsApiKey').value.trim();
    if (key) {
        localStorage.setItem('custom_api_key', key);
        alert('API Key saved securely in your browser.');
        location.reload(); // Reload to apply new key
    }
}

function clearChatHistory() {
    if (confirm('Are you sure? This will delete all chat history.')) {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('chat_history_')) localStorage.removeItem(key);
        });
        loadChatHistory();
        alert('Chat history cleared.');
    }
}

function factoryReset() {
    if (confirm('WARNING: This will reset the entire app. All data will be lost. Continue?')) {
        localStorage.clear();
        location.reload();
    }
}

function contactDeveloper() {
    const userRole = localStorage.getItem('user_role') || 'Free';
    const message = `Hi BADSHA! I'm interested in upgrading to Premium.\n\nCurrent Plan: ${userRole}\nUsername: ${currentUser}`;

    // Create mailto link
    const email = 'trkf.gaming.999@gmail.com'; // Replace with actual email
    const subject = encodeURIComponent('Smart Life AI - Premium Upgrade Request');
    const body = encodeURIComponent(message);

    // You can also use WhatsApp, Telegram, or other contact methods
    // For WhatsApp: window.open(`https://wa.me/YOUR_NUMBER?text=${encodeURIComponent(message)}`, '_blank');

    showToast('Opening contact options...', 'info');

    // Show contact modal with options
    const modal = confirm(`Contact Developer for Premium Upgrade?\n\nClick OK to send email, or Cancel to copy contact info.`);

    if (modal) {
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    } else {
        // Copy contact info to clipboard
        const contactInfo = `Email: ${email}\nWhatsApp: +YOUR_NUMBER\nTelegram: @YOUR_USERNAME`;
        navigator.clipboard.writeText(contactInfo).then(() => {
            showToast('Contact info copied to clipboard!', 'success');
        });
    }
}

// Update API_KEY usage to check local storage first when making requests
/*
   Note: To make this effective, we need to update the runAI function
   to use localStorage.getItem('custom_api_key') || API_KEY
*/

function renderModule(moduleId) {
    const config = MODULES[moduleId];
    if (!config) return;

    document.getElementById('moduleTitle').innerText = config.title;
    document.getElementById('moduleDesc').innerText = config.desc;

    const inputContainer = document.getElementById('moduleInputs');
    inputContainer.innerHTML = '';

    config.inputs.forEach(input => {
        let fieldHtml = '';
        if (input.type === 'select') {
            const options = input.options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
            fieldHtml = `<label>${input.label}</label>
                         <select id="inp_${input.id}" class="module-input">${options}</select>`;
        } else if (input.type === 'textarea') {
            fieldHtml = `<label>${input.label}</label>
                         <textarea id="inp_${input.id}" class="module-input" placeholder="${input.placeholder || ''}"></textarea>`;
        } else {
            fieldHtml = `<label>${input.label}</label>
                         <input type="text" id="inp_${input.id}" class="module-input" placeholder="${input.placeholder || ''}">`;
        }
        inputContainer.innerHTML += fieldHtml;
    });

    // Add Generate Button
    inputContainer.innerHTML += `<button class="primary-btn" onclick="runAI('module')">
                                    <i class="fa-solid fa-wand-magic-sparkles"></i> Generate Result
                                 </button>`;

    // Clear previous result
    document.getElementById('resultContent').innerHTML = '<p class="text-muted">Fill the details and click Generate.</p>';
}

function handleEnter(e) {
    if (e.key === 'Enter') runAI('general');
}

async function runAI(source) {
    // Check Message Quota
    const userRole = localStorage.getItem('user_role') || 'Free';
    const messageCount = parseInt(localStorage.getItem(`msg_count_${currentUser}`) || '0');

    const quotas = { 'Free': 20, 'Basic': 50, 'Premium': Infinity };
    const userQuota = quotas[userRole];

    if (messageCount >= userQuota) {
        showToast(`🚫 Message limit reached! (${userQuota} messages for ${userRole} plan). Upgrade to send more.`, 'error');
        return;
    }

    let userMessage = '';
    let systemMessage = 'You are a helpful AI Assistant called SmartLife AI.';
    const resultDiv = source === 'module' ? document.getElementById('resultContent') : null;

    if (source === 'general') {
        const input = document.getElementById('mainInput');
        userMessage = input.value.trim();
        if (!userMessage) return;

        // Append User Message to Chat
        appendChat(userMessage, 'user');
        input.value = '';
    }
    else if (source === 'module') {
        const config = MODULES[currentModule];
        if (!config) return;
        systemMessage = config.systemPrompt;

        // Gather inputs
        const inputs = [];
        config.inputs.forEach(inp => {
            const val = document.getElementById(`inp_${inp.id}`).value;
            inputs.push(`${inp.label}: ${val}`);
        });

        userMessage = `Please help me with the following request based on these details:\n\n${inputs.join('\n')}`;

        // Show loading state
        resultDiv.innerHTML = '<div class="loading"><i class="fa-solid fa-spinner fa-spin"></i> SmartLife is thinking...</div>';
    }

    const effectiveKey = localStorage.getItem('custom_api_key') || API_KEY;

    // Build conversation history for context
    let messages = [{ role: 'system', content: systemMessage }];

    if (source === 'general') {
        // Load recent chat history for context (last 10 exchanges)
        let history = JSON.parse(sessionStorage.getItem('chat_history_' + currentUser)) || [];
        const recentHistory = history.slice(-10); // Last 10 exchanges

        recentHistory.forEach(h => {
            messages.push({ role: 'user', content: h.user });
            messages.push({ role: 'assistant', content: h.ai });
        });

        // Add current message
        messages.push({ role: 'user', content: userMessage });
    } else {
        // For modules, just send the current request
        messages.push({ role: 'user', content: userMessage });
    }

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${effectiveKey.trim()}`,
                'HTTP-Referer': window.location.origin, // Recommended by OpenRouter
                'X-Title': 'SmartLife AI' // Recommended by OpenRouter
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o-mini', // Explicit model ID
                messages: messages
            })
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${res.status}: ${res.statusText}`);
        }

        const responseJson = await res.json();
        if (!responseJson.choices || responseJson.choices.length === 0) {
            throw new Error('API returned an empty response. Check your credits or model settings.');
        }
        const reply = responseJson.choices[0].message.content;

        // Increment message count
        const currentCount = parseInt(localStorage.getItem(`msg_count_${currentUser}`) || '0');
        localStorage.setItem(`msg_count_${currentUser}`, currentCount + 1);
        updateUsageDisplay(); // Update UI

        if (source === 'general') {
            appendChat(reply, 'ai');
            saveChatHistory(userMessage, reply);
        } else {
            resultDiv.innerHTML = marked.parse(reply);
        }

    } catch (err) {
        console.error(err);
        let errorMsg = 'Sorry, something went wrong. Please check your connection.';

        if (err.message.includes('API key') || err.message.includes('401') || err.message.includes('403') || err.message.toLowerCase().includes('invalid_api_key')) {
            errorMsg = 'Invalid or missing API Key. Please update it in Settings with a valid OpenRouter key.';
        } else if (err.message.includes('quota') || err.message.includes('limit') || err.message.includes('429') || err.message.toLowerCase().includes('insufficient_balance')) {
            errorMsg = 'API Limit or Balance reached. Please provide your own OpenRouter API key in Settings to continue.';
        } else {
            // Include actual error message for debugging
            errorMsg = `API Error: ${err.message}. Please check Settings or Try again.`;
        }

        if (source === 'general') appendChat(errorMsg, 'ai');
        else resultDiv.innerHTML = `<p style="color: var(--danger)">${errorMsg}</p>`;
    }
}

// --- Chat History ---
function appendChat(text, sender) {
    const historyDiv = document.getElementById('chatHistory');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    msgDiv.innerHTML = `<div class="bubble">${text}</div>`;
    historyDiv.appendChild(msgDiv);
    historyDiv.scrollTop = historyDiv.scrollHeight;
}

function saveChatHistory(user, ai) {
    let history = JSON.parse(sessionStorage.getItem('chat_history_' + currentUser)) || [];
    history.push({ user, ai });
    if (history.length > 50) history.shift(); // Keep last 50
    sessionStorage.setItem('chat_history_' + currentUser, JSON.stringify(history));
}

function loadChatHistory() {
    const historyDiv = document.getElementById('chatHistory');
    historyDiv.innerHTML = `<div class="message ai"><div class="bubble">Hello! I'm SmartLife AI. Choose a specific module or ask me anything here.</div></div>`;

    let history = JSON.parse(sessionStorage.getItem('chat_history_' + currentUser)) || [];
    history.forEach(h => {
        appendChat(h.user, 'user');
        appendChat(h.ai, 'ai');
    });
}