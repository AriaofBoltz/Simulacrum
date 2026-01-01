const socket = io();
let token = localStorage.getItem('token');
let isOwner = localStorage.getItem('isOwner') === 'true';
let currentUsername = localStorage.getItem('username');
let currentUserId = localStorage.getItem('userId');
let refreshInterval;

if (token) {
  socket.emit('authenticate', token);
  socket.on('authenticated', () => {
    showChat();
    loadUsers();
    loadGroups();
    restoreTarget();
    startAutoRefresh();
    if (isOwner) {
      document.getElementById('adminBtn').style.display = 'block';
    }
  });
}

document.getElementById('loginBtn').onclick = () => {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.textContent = 'Logging in...';
  fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  }).then(res => res.json()).then(data => {
    btn.disabled = false;
    btn.textContent = 'Login';
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('isOwner', data.isOwner ? 'true' : 'false');
      localStorage.setItem('username', username);
      localStorage.setItem('userId', data.id);
      isOwner = data.isOwner;
      currentUsername = username;
      currentUserId = data.id;
      socket.emit('authenticate', data.token);
      socket.on('authenticated', () => {
        showChat();
        loadUsers();
        loadGroups();
        restoreTarget();
        startAutoRefresh();
      });
    } else {
      showNotification(data.error);
    }
  }).catch(() => {
    btn.disabled = false;
    btn.textContent = 'Login';
    showNotification('Login failed');
  });
};

document.getElementById('registerBtn').onclick = () => {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const btn = document.getElementById('registerBtn');
  btn.disabled = true;
  btn.textContent = 'Registering...';
  fetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  }).then(res => res.json()).then(data => {
    btn.disabled = false;
    btn.textContent = 'Register';
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('isOwner', data.isOwner ? 'true' : 'false');
      localStorage.setItem('username', username);
      localStorage.setItem('userId', data.id);
      isOwner = data.isOwner;
      currentUsername = username;
      currentUserId = data.id;
      socket.emit('authenticate', data.token);
      socket.on('authenticated', () => {
        showChat();
        loadUsers();
        loadGroups();
        restoreTarget();
        startAutoRefresh();
      });
    } else {
      showNotification(data.error);
    }
  }).catch(() => {
    btn.disabled = false;
    btn.textContent = 'Register';
    showNotification('Registration failed');
  });
};

function showChat() {
  document.getElementById('login').style.display = 'none';
  document.getElementById('chat').style.display = 'flex';
}

function startAutoRefresh() {
  refreshInterval = setInterval(() => {
    loadUsers();
    loadGroups();
  }, 30000); // 30 seconds
}

function showNotification(message) {
  const notif = document.getElementById('notification');
  notif.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style="width: 20px; height: 20px; margin-right: 10px;">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
  </svg>${message}`;
  notif.style.display = 'block';
  setTimeout(() => {
    notif.style.display = 'none';
  }, 3000);
}

function loadUsers() {
  fetch('/chat/users', {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => res.json()).then(users => {
    const ul = document.getElementById('userList');
    ul.innerHTML = '';
    users.forEach(user => {
      const li = document.createElement('li');
      const avatar = user.profile_picture ? `<img src="${user.profile_picture}" class="avatar" alt="Avatar">` : '<div class="avatar-placeholder"></div>';
      li.innerHTML = `${avatar}<div class="user-info"><div class="user">${user.username}</div><div class="title" style="color:${user.title_color}">${user.title}</div></div>`;
      li.onclick = () => selectTarget('private', user.id, user.username);
      ul.appendChild(li);
    });
  });
}

function loadGroups() {
  console.log('Loading groups for user');
  fetch('/chat/my-groups', {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => {
    console.log('Groups fetch status:', res.status);
    return res.json();
  }).then(groups => {
    console.log('Groups received:', groups);
    const ul = document.getElementById('groupList');
    ul.innerHTML = '';
    groups.forEach(group => {
      const li = document.createElement('li');
      li.textContent = group.name;
      if (group.status === 'approved') {
        li.classList.add('joined');
        li.onclick = () => selectTarget('group', group.id, group.name);
      } else if (group.status === 'pending') {
        li.classList.add('pending');
        li.textContent += ' (Pending)';
      } else {
        li.classList.add('not-joined');
        li.onclick = () => {
          socket.emit('join-group', group.id);
          if (isOwner) {
            selectTarget('group', group.id, group.name);
          } else {
            showNotification('Join request sent');
            loadGroups(); // reload to show pending
          }
        };
      }
      ul.appendChild(li);
    });
  }).catch(err => console.error('Error loading groups:', err));
}

function loadMessages(type, targetId) {
  fetch(`/chat/messages?type=${type}&targetId=${targetId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => res.json()).then(messages => {
    if (messages.length === 0) {
      const div = document.createElement('div');
      div.className = 'no-messages';
      div.textContent = 'No messages yet. Start the conversation!';
      div.style.textAlign = 'center';
      div.style.color = '#888';
      div.style.fontStyle = 'italic';
      div.style.padding = '20px';
      document.getElementById('messages').prepend(div);
    } else {
      messages.reverse().forEach(msg => {
        addMessage(msg.sender, msg.content, new Date(msg.timestamp));
      });
    }
  }).catch(err => console.error('Error loading messages:', err));
}

function selectTarget(type, id, name) {
  // Save current target to localStorage
  localStorage.setItem('chatType', type);
  localStorage.setItem('targetId', id);
  localStorage.setItem('targetName', name);
  // Clear previous messages
  document.getElementById('messages').innerHTML = '';
  // Load previous messages
  loadMessages(type, id);
}

function restoreTarget() {
  const type = localStorage.getItem('chatType');
  const id = localStorage.getItem('targetId');
  const name = localStorage.getItem('targetName');
  if (type && id && name) {
    selectTarget(type, id, name);
  }
}

document.getElementById('sendBtn').onclick = sendMessage;

document.getElementById('messageInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function sendMessage() {
  const message = document.getElementById('messageInput').value;
  const type = localStorage.getItem('chatType');
  const target = localStorage.getItem('targetId');
  if (message.trim() === '' || !target) return;
  if (type === 'private') {
    socket.emit('private-message', { to: target, message });
  } else {
    socket.emit('group-message', { groupId: target, message });
  }
  document.getElementById('messageInput').value = '';
}

socket.on('private-message', (data) => {
  console.log('Received private message:', data, 'at', new Date().toISOString());
  addMessage(data.from, data.message);
});

socket.on('group-message', (data) => {
  console.log('Received group message:', data, 'at', new Date().toISOString());
  addMessage(data.from, data.message);
});

function addMessage(from, message, timestamp = null) {
  console.log('Adding message to DOM:', from, message, 'at', new Date().toISOString());
  const div = document.createElement('div');
  div.className = 'message';
  const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
  if (from === currentUsername) {
    div.classList.add('own');
    div.innerHTML = `${message} <span class="timestamp">${timeStr}</span>`;
  } else {
    div.innerHTML = `<strong>${from}:</strong> ${message} <span class="timestamp">${timeStr}</span>`;
  }
  document.getElementById('messages').prepend(div);
  document.getElementById('messages').scrollTop = 0;
}

document.getElementById('createGroupBtn').onclick = () => {
  const name = document.getElementById('newGroup').value;
  if (name.trim() === '') return;
  fetch('/chat/create-group', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ name })
  }).then(() => {
    loadGroups();
    document.getElementById('newGroup').value = '';
  });
};

document.getElementById('profileBtn').onclick = () => {
  document.getElementById('profilePanel').style.display = 'flex';
  document.getElementById('main').style.display = 'none';
  loadProfile();
};

document.getElementById('closeProfileBtn').onclick = () => {
  closeProfilePanel();
};

document.getElementById('cancelProfileBtn').onclick = () => {
  closeProfilePanel();
};

function closeProfilePanel() {
  document.getElementById('profilePanel').style.display = 'none';
  document.getElementById('main').style.display = 'flex';
  // Reset form
  document.getElementById('profileForm').reset();
  document.getElementById('newPicturePreview').style.display = 'none';
  document.getElementById('newPicturePreview').innerHTML = '';
}

// Image preview functionality
document.getElementById('profilePicture').addEventListener('change', (e) => {
  const file = e.target.files[0];
  const previewDiv = document.getElementById('newPicturePreview');

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewDiv.innerHTML = `<img src="${e.target.result}" alt="New profile picture preview">`;
      previewDiv.style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    previewDiv.style.display = 'none';
    previewDiv.innerHTML = '';
  }
});

document.getElementById('profileForm').onsubmit = (e) => {
  e.preventDefault();
  saveProfile();
};

document.getElementById('showAdminBtn').onclick = () => {
  document.getElementById('adminPanel').style.display = 'flex';
  document.getElementById('main').style.display = 'none';
  loadPending();
  loadGroupsAdmin();
  loadUsersAdmin();

  // Add search event listeners
  document.getElementById('pendingSearch').addEventListener('input', filterAndDisplayPendings);
  document.getElementById('groupSearch').addEventListener('input', filterAndDisplayGroups);
  document.getElementById('userSearch').addEventListener('input', filterAndDisplayUsers);
};

document.getElementById('closeAdminBtn').onclick = () => {
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('main').style.display = 'flex';
};

let allPendings = [];
let allGroups = [];
let allUsers = [];

function loadPending() {
  const ul = document.getElementById('pendingList');
  ul.innerHTML = '<li style="text-align: center; color: #888;"><em>Loading...</em></li>';

  fetch('/admin/pending-memberships', {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => res.json()).then(pendings => {
    allPendings = pendings;
    document.getElementById('pendingCount').textContent = pendings.length;
    filterAndDisplayPendings();
  }).catch(err => {
    ul.innerHTML = '<li style="text-align: center; color: #ff4444;"><em>Failed to load pending memberships</em></li>';
    console.error('Error loading pending memberships:', err);
  });
}

function filterAndDisplayPendings() {
  const searchTerm = document.getElementById('pendingSearch').value.toLowerCase();
  const filtered = allPendings.filter(p =>
    p.username.toLowerCase().includes(searchTerm) ||
    p.group_name.toLowerCase().includes(searchTerm)
  );

  const ul = document.getElementById('pendingList');
  ul.innerHTML = '';

  if (filtered.length === 0) {
    const li = document.createElement('li');
    li.innerHTML = '<em>No pending requests found</em>';
    li.style.textAlign = 'center';
    li.style.color = '#888';
    ul.appendChild(li);
    return;
  }

  filtered.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="user-info">
        <div class="username">${p.username}</div>
        <div class="title">requests to join ${p.group_name}</div>
      </div>
      <div class="actions">
        <button class="approve" onclick="approve(${p.group_id}, ${p.user_id})">Approve</button>
        <button class="reject" onclick="reject(${p.group_id}, ${p.user_id})">Reject</button>
      </div>
    `;
    ul.appendChild(li);
  });
}

function approve(groupId, userId) {
  fetch('/admin/approve-membership', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ groupId, userId })
  }).then(res => res.json()).then(data => {
    if (data.success) {
      loadPending();
      loadGroups(); // refresh main group list to show approved membership
      showNotification('Membership approved');
    } else {
      showNotification(data.error || 'Failed to approve membership');
    }
  });
}

function reject(groupId, userId) {
  fetch('/admin/reject-membership', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ groupId, userId })
  }).then(res => res.json()).then(data => {
    if (data.success) {
      loadPending();
      showNotification('Membership rejected');
    } else {
      showNotification(data.error || 'Failed to reject membership');
    }
  });
}

function loadGroupsAdmin() {
  const ul = document.getElementById('groupManageList');
  ul.innerHTML = '<li style="text-align: center; color: #888;"><em>Loading...</em></li>';

  fetch('/chat/groups', {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => res.json()).then(groups => {
    allGroups = groups;
    filterAndDisplayGroups();
  }).catch(err => {
    ul.innerHTML = '<li style="text-align: center; color: #ff4444;"><em>Failed to load groups</em></li>';
    console.error('Error loading groups:', err);
  });
}

function filterAndDisplayGroups() {
  const searchTerm = document.getElementById('groupSearch').value.toLowerCase();
  const filtered = allGroups.filter(g => g.name.toLowerCase().includes(searchTerm));

  const ul = document.getElementById('groupManageList');
  ul.innerHTML = '';

  if (filtered.length === 0) {
    const li = document.createElement('li');
    li.innerHTML = '<em>No groups found</em>';
    li.style.textAlign = 'center';
    li.style.color = '#888';
    ul.appendChild(li);
    return;
  }

  filtered.forEach(group => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="user-info">
        <div class="username">${group.name}</div>
        <div class="title">Group</div>
      </div>
      <div class="actions">
        <button class="rename" onclick="renameGroup(${group.id}, '${group.name}')">Rename</button>
        <button class="delete" onclick="deleteGroup(${group.id})">Delete</button>
      </div>
    `;
    ul.appendChild(li);
  });
}

function loadUsersAdmin() {
  const ul = document.getElementById('userManageList');
  ul.innerHTML = '<li style="text-align: center; color: #888;"><em>Loading...</em></li>';

  fetch('/admin/users', {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => res.json()).then(users => {
    allUsers = users;
    filterAndDisplayUsers();
  }).catch(err => {
    ul.innerHTML = '<li style="text-align: center; color: #ff4444;"><em>Failed to load users</em></li>';
    console.error('Error loading users:', err);
  });
}

function filterAndDisplayUsers() {
  const searchTerm = document.getElementById('userSearch').value.toLowerCase();
  const filtered = allUsers.filter(u => u.username.toLowerCase().includes(searchTerm));

  const ul = document.getElementById('userManageList');
  ul.innerHTML = '';

  if (filtered.length === 0) {
    const li = document.createElement('li');
    li.innerHTML = '<em>No users found</em>';
    li.style.textAlign = 'center';
    li.style.color = '#888';
    ul.appendChild(li);
    return;
  }

  filtered.forEach(user => {
    const li = document.createElement('li');
    const isCurrentUser = user.id == currentUserId;
    li.innerHTML = `
      <div class="user-info">
        <div class="username">${user.username}</div>
        <div class="title" style="color:${user.title_color}">${user.title || 'No title'}</div>
      </div>
      <div class="actions">
        ${isCurrentUser ? '<span class="current-user">You</span>' :
         `<button class="edit" onclick="editUserTitle(${user.id}, '${user.username}', '${user.title || ''}', '${user.title_color || '#ffffff'}')">Edit Title</button>
          <button class="edit" onclick="editUserProfile(${user.id}, '${user.username}', '${user.profile_picture || ''}', '${(user.description || '').replace(/'/g, "\\'")}')">Edit Profile</button>
          <button class="delete" onclick="deleteUser(${user.id}, '${user.username}')">Delete</button>`}
      </div>
    `;
    ul.appendChild(li);
  });
}

function deleteUser(userId, username) {
  if (confirm(`Are you sure you want to delete user "${username}"?\n\nThis action cannot be undone and will:\n• Delete all their messages\n• Remove them from all groups\n• Permanently delete their account`)) {
    fetch('/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ userId })
    }).then(res => res.json()).then(data => {
      if (data.success) {
        loadUsersAdmin();
        loadUsers(); // refresh main user list
        showNotification(`User "${username}" deleted successfully`);
      } else {
        showNotification(data.error || 'Failed to delete user');
      }
    });
  }
}

function deleteGroup(groupId) {
  // Get group name for better confirmation
  const group = allGroups.find(g => g.id === groupId);
  const groupName = group ? group.name : 'this group';

  if (confirm(`Are you sure you want to delete the group "${groupName}"?\n\nThis action cannot be undone and will:\n• Delete all messages in the group\n• Remove all memberships\n• Permanently delete the group`)) {
    fetch('/admin/delete-group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ groupId })
    }).then(res => res.json()).then(data => {
      if (data.success) {
        loadGroupsAdmin();
        loadGroups(); // refresh main group list
        showNotification(`Group "${groupName}" deleted successfully`);
      } else {
        showNotification(data.error || 'Failed to delete group');
      }
    });
  }
}

function editUserTitle(userId, username, currentTitle, currentColor) {
  const title = prompt('Enter new title:', currentTitle);
  if (title !== null) {
    const color = prompt('Enter title color (hex code):', currentColor);
    if (color !== null) {
      fetch('/admin/set-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId, title, color })
      }).then(res => res.json()).then(data => {
        if (data.success) {
          loadUsersAdmin();
          loadUsers(); // refresh main user list
          showNotification('Title updated successfully');
        } else {
          showNotification(data.error || 'Failed to update title');
        }
      });
    }
  }
}

function renameGroup(groupId, oldName) {
  const newName = prompt('Enter new name:', oldName);
  if (newName && newName.trim() !== '' && newName !== oldName) {
    fetch('/admin/rename-group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ groupId, newName })
    }).then(res => res.json()).then(data => {
      if (data.success) {
        loadGroupsAdmin();
        loadGroups(); // refresh main group list
        showNotification('Group renamed successfully');
      } else {
        showNotification(data.error || 'Failed to rename group');
      }
    });
  }
}

function loadProfile() {
  fetch('/auth/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => res.json()).then(profile => {
    // Update username and avatar in header
    document.getElementById('profileUsername').textContent = currentUsername;
    const avatarDiv = document.getElementById('profileAvatar');
    if (profile.profile_picture) {
      avatarDiv.innerHTML = `<img src="${profile.profile_picture}" alt="Profile picture" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else {
      avatarDiv.textContent = currentUsername.charAt(0).toUpperCase();
    }

    // Update member since date
    if (profile.created_at) {
      const createdDate = new Date(profile.created_at);
      document.getElementById('memberSince').textContent = `Member since: ${createdDate.toLocaleDateString()}`;
    }

    // Update form fields
    document.getElementById('profileDescription').value = profile.description || '';

    const currentPictureDiv = document.getElementById('currentPicture');
    if (profile.profile_picture) {
      currentPictureDiv.innerHTML = `<img src="${profile.profile_picture}" alt="Current profile picture">`;
    } else {
      currentPictureDiv.innerHTML = '<p>No profile picture set</p>';
    }

    // Reset image preview
    document.getElementById('newPicturePreview').style.display = 'none';
    document.getElementById('newPicturePreview').innerHTML = '';
  }).catch(err => console.error('Error loading profile:', err));
}

function saveProfile() {
  // Validate file if selected
  const fileInput = document.getElementById('profilePicture');
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];

    if (file.size > maxSize) {
      showNotification('File size too large. Maximum size is 5MB.');
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      showNotification('Invalid file type. Only JPG, PNG, and GIF are allowed.');
      return;
    }
  }

  // Show loading state
  const saveBtn = document.getElementById('saveProfileBtn');
  const saveBtnText = document.getElementById('saveBtnText');
  const saveBtnSpinner = document.getElementById('saveBtnSpinner');
  saveBtn.disabled = true;
  saveBtnText.textContent = 'Saving...';
  saveBtnSpinner.style.display = 'block';

  const formData = new FormData(document.getElementById('profileForm'));
  fetch('/auth/profile', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  }).then(res => res.json()).then(data => {
    // Reset loading state
    saveBtn.disabled = false;
    saveBtnText.textContent = 'Save Profile';
    saveBtnSpinner.style.display = 'none';

    if (data.success) {
      showNotification('Profile updated successfully');
      loadUsers(); // refresh user list to show new profile
      document.getElementById('profilePanel').style.display = 'none';
      document.getElementById('main').style.display = 'flex';
    } else {
      showNotification(data.error || 'Failed to update profile');
    }
  }).catch(err => {
    // Reset loading state
    saveBtn.disabled = false;
    saveBtnText.textContent = 'Save Profile';
    saveBtnSpinner.style.display = 'none';

    console.error('Error saving profile:', err);
    showNotification('Failed to update profile');
  });
}

function editUserProfile(userId, username, currentPicture, currentDescription) {
  const description = prompt('Enter new description:', currentDescription);
  if (description !== null) {
    const pictureUrl = prompt('Enter profile picture URL (leave empty to keep current):', currentPicture);
    if (pictureUrl !== null) {
      fetch('/admin/set-profile', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId, description, profile_picture: pictureUrl || currentPicture })
      }).then(res => res.json()).then(data => {
        if (data.success) {
          loadUsersAdmin();
          loadUsers(); // refresh main user list
          showNotification('Profile updated successfully');
        } else {
          showNotification(data.error || 'Failed to update profile');
        }
      });
    }
  }
}

document.getElementById('logoutBtn').onclick = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('userId');
  token = null;
  currentUsername = null;
  currentUserId = null;
  isOwner = false;
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
  socket.disconnect();
  document.getElementById('chat').style.display = 'none';
  document.getElementById('login').style.display = 'block';
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('main').style.display = 'flex';
  document.getElementById('messages').innerHTML = '';
};

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'u') {
    e.preventDefault();
    loadUsers();
  }
  if (e.ctrlKey && e.key === 'g') {
    e.preventDefault();
    loadGroups();
  }
  if (e.ctrlKey && e.key === 'l') {
    e.preventDefault();
    document.getElementById('logoutBtn').click();
  }
});