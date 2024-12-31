function showAlert(message) {
  const modal = document.createElement('div');
  modal.className = 'modal neumorphic';
  modal.innerHTML = `
            <p>${message}</p>
            <button class="button ripple" onclick="this.parentElement.remove()">Close</button>
        `;
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('active'), 10);
}
// State
let currentNote = null;
let editor = null;

// Initialize Quill editor with curve borders

editor = new Quill('#editor', {
  theme: 'snow',
  placeholder: 'Write your note...',
  //place holder color white
  placeholderColor: 'white',

  modules: {
    toolbar: [
      // Headers
      [{ header: [1, 2, 3, 4, 5, 6, false] }],

      // Font styles
      [
        {
          font: [],
        },
      ],
      [{ size: ['small', false, 'large', 'huge'] }],

      // Text styles
      ['bold', 'italic', 'underline', 'strike'],

      // Scripts and Indentation
      [{ script: 'sub' }, { script: 'super' }],
      [{ indent: '-1' }, { indent: '+1' }],

      // List styles
      [{ list: 'ordered' }, { list: 'bullet' }],

      // Text direction
      [{ direction: 'rtl' }],

      // Alignments
      // [{ 'align': ['left', 'center', 'right', 'justify'] }],

      // Colors and Backgrounds
      [
        { color: ['#e60000', '#ff9900', '#0066cc', '#00cc44'] },
        { background: ['#e60000', '#ff9900', '#0066cc', '#00cc44'] },
      ],

      // Links and Images
      ['link', 'image'],

      // Quote and Code block
      ['blockquote', 'code-block'],

      // Clear formatting
      ['clean'],
      // add more modules
    ],
  },
});

// Mobile menu toggle
const sidebar = document.getElementById('sidebar');
document.getElementById('mobileMenuBtn').addEventListener('click', () => {
  sidebar.classList.toggle('-translate-x-full');
});

// Theme toggle
const toggleTheme = () => {
  document.documentElement.classList.toggle('dark');
  localStorage.theme = document.documentElement.classList.contains('dark')
    ? 'dark'
    : 'light';
};

// Initialize theme
if (
  localStorage.theme === 'dark' ||
  (!('theme' in localStorage) &&
    window.matchMedia('(prefers-color-scheme: dark)').matches)
) {
  document.documentElement.classList.add('dark');
}

document.getElementById('themeToggle').addEventListener('click', toggleTheme);

// API functions
const API_URL = 'http://localhost:8080/api';

async function fetchNotes() {
  try {
    const response = await fetch(`${API_URL}/notes`);
    const notes = await response.json();
    renderNotesList(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
  }
}

async function saveNote() {
  const title = document.getElementById('noteTitle').value;
  const category = document.getElementById('noteCategory').value;
  const tags = document
    .getElementById('noteTags')
    .value.split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag);
  const content = editor.root.innerHTML;

  if (!title) {
    alert('Please enter a title');
    return;
  }

  const note = {
    title,
    content,
    category,
    tags,
    is_pinned: currentNote?.is_pinned || false,
  };

  try {
    const method = currentNote ? 'PUT' : 'POST';
    const url = currentNote
      ? `${API_URL}/notes/${currentNote.id}`
      : `${API_URL}/notes`;

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });

    if (response.ok) {
      await fetchNotes();
      if (!currentNote) clearEditor();
      alert('Note saved successfully!');
    }
  } catch (error) {
    console.error('Error saving note:', error);
    alert('Error saving note');
  }
}

async function deleteNote(id) {
  if (!confirm('Are you sure you want to delete this note?')) return;

  try {
    const response = await fetch(`${API_URL}/notes/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      await fetchNotes();
      if (currentNote?.id === id) clearEditor();
    }
  } catch (error) {
    console.error('Error deleting note:', error);
  }
}

function loadNote(note) {
  currentNote = note;
  document.getElementById('noteTitle').value = note.title;
  document.getElementById('noteCategory').value = note.category || 'personal';
  document.getElementById('noteTags').value = (note.tags || []).join(', ');
  editor.root.innerHTML = note.content || '';

  // For mobile: close sidebar after selecting a note
  if (window.innerWidth < 1024) {
    sidebar.classList.add('-translate-x-full');
  }
}

function clearEditor() {
  currentNote = null;
  document.getElementById('noteTitle').value = '';
  document.getElementById('noteCategory').value = 'personal';
  document.getElementById('noteTags').value = '';
  editor.root.innerHTML = '';
}

function renderNotesList(notes) {
  const notesList = document.getElementById('notesList');
  notesList.innerHTML = '';

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1;
    return new Date(b.updated_at) - new Date(a.updated_at);
  });

  sortedNotes.forEach((note) => {
    const div = document.createElement('div');
    div.className =
      'mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer';

    const truncatedContent =
      note.content.replace(/<[^>]*>/g, '').slice(0, 100) +
      (note.content.length > 100 ? '...' : '');

    div.innerHTML = `
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="font-medium text-gray-800 dark:text-white truncate">${
                          note.title
                        }</h3>
                        <div class="flex items-center space-x-2">
                            ${
                              note.is_pinned
                                ? '<span class="text-blue-500">📌</span>'
                                : ''
                            }
                            <button class="delete-btn text-red-500 hover:text-red-600">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-300 truncate">${truncatedContent}</div>
                    ${
                      note.tags && note.tags.length
                        ? `
                        <div class="mt-2 flex flex-wrap gap-2">
                            ${note.tags
                              .map(
                                (tag) =>
                                  `<span class="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">${tag}</span>`
                              )
                              .join('')}
                        </div>
                    `
                        : ''
                    }
                    <div class="mt-2 text-xs text-gray-500">
                        ${note.category} • ${new Date(
      note.updated_at
    ).toLocaleDateString()}
                    </div>
                `;

    // Event listeners
    div.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteNote(note.id);
    });

    div.addEventListener('click', () => loadNote(note));
    notesList.appendChild(div);
  });
}

// Search and filter functionality
function filterNotes() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const categoryFilter = document.getElementById('categoryFilter').value;

  fetch(`${API_URL}/notes`)
    .then((response) => response.json())
    .then((notes) => {
      const filteredNotes = notes.filter((note) => {
        const matchesSearch =
          note.title.toLowerCase().includes(searchTerm) ||
          note.content.toLowerCase().includes(searchTerm) ||
          note.tags?.some((tag) => tag.toLowerCase().includes(searchTerm));

        const matchesCategory =
          !categoryFilter || note.category === categoryFilter;

        return matchesSearch && matchesCategory;
      });

      renderNotesList(filteredNotes);
    });
}

// Event listeners
document.getElementById('searchInput').addEventListener('input', filterNotes);
document
  .getElementById('categoryFilter')
  .addEventListener('change', filterNotes);
document.getElementById('saveNote').addEventListener('click', saveNote);
document.getElementById('newNoteBtn').addEventListener('click', clearEditor);

// Auto-save functionality
let autoSaveTimeout;
function setupAutoSave() {
  const autoSave = () => {
    clearTimeout(autoSaveTimeout);
    if (currentNote || document.getElementById('noteTitle').value) {
      autoSaveTimeout = setTimeout(saveNote, 2000);
    }
  };

  editor.on('text-change', autoSave);
  document.getElementById('noteTitle').addEventListener('input', autoSave);
  document.getElementById('noteTags').addEventListener('input', autoSave);
  document.getElementById('noteCategory').addEventListener('change', autoSave);
}

// Initialize the application
function initializeApp() {
  fetchNotes();
  setupAutoSave();

  // Handle keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's') {
        e.preventDefault();
        saveNote();
      }
    }
  });
}

initializeApp();
