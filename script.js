/* LibraFlow — vanilla JS. Single source of truth: `books` and `tx` (transactions).
   A book is "Issued" exactly when it has a transaction with no returnDate. */
'use strict';

const KEYS = { books: 'lf_books', authors: 'lf_authors', tx: 'lf_tx', log: 'lf_activity', theme: 'lf_theme', members: 'lf_members' };
const MEMBER_SESSION_KEY = 'lf_member_session';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAY = 864e5;
const COLORS = ['#1f4d36', '#7a4e2d', '#2f5d7c', '#6b3f5e', '#8a6d1f', '#3e6b57', '#8c3b2f', '#4a4a7a'];
const normalizeIsbn = value => {
  const isbn = String(value).replace(/[\s-]/g, '').toUpperCase();
  if (/^\d{13}$/.test(isbn)) {
    const sum = [...isbn].reduce((total, digit, i) => total + Number(digit) * (i % 2 ? 3 : 1), 0);
    return sum % 10 === 0 ? isbn : '';
  }
  if (/^\d{9}[\dX]$/.test(isbn)) {
    const sum = [...isbn].reduce((total, digit, i) => total + (digit === 'X' ? 10 : Number(digit)) * (10 - i), 0);
    return sum % 11 === 0 ? isbn : '';
  }
  return '';
};
const openLibraryCoverUrl = isbn => `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-L.jpg`;

/* ---------- dates ---------- */
const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => fmt(new Date());
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return fmt(d); };
const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T00:00:00'));
const show = s => s ? new Date(s + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/* ---------- seed data ---------- */
const SEED_AUTHORS = [
  { name: 'James Clear', nationality: 'American', genre: 'Self-improvement', works: ['Atomic Habits'], bio: 'American author and speaker who writes about habits, decision-making and continuous improvement. Atomic Habits (2018) is his best-known book.' },
  { name: 'Paulo Coelho', nationality: 'Brazilian', genre: 'Fiction', works: ['The Alchemist', 'Veronika Decides to Die', 'The Pilgrimage'], bio: 'Brazilian novelist and lyricist. The Alchemist, first published in Portuguese in 1988, became an international bestseller.' },
  { name: 'Robert C. Martin', nationality: 'American', genre: 'Software Engineering', works: ['Clean Code', 'Clean Architecture', 'The Clean Coder'], bio: 'American software engineer and author, widely known as "Uncle Bob" and one of the original signatories of the Agile Manifesto.' },
  { name: 'Stephen Hawking', nationality: 'British', genre: 'Science', works: ['A Brief History of Time', 'The Universe in a Nutshell', 'The Grand Design'], bio: 'English theoretical physicist and cosmologist (1942–2018) who worked on black holes and the origin of the universe and wrote several popular science books.' },
  { name: 'J. R. R. Tolkien', nationality: 'British', genre: 'Fantasy', works: ['The Hobbit', 'The Lord of the Rings', 'The Silmarillion'], bio: 'English writer and University of Oxford professor (1892–1973), creator of Middle-earth and author of The Hobbit and The Lord of the Rings.' },
  { name: 'Morgan Housel', nationality: 'American', genre: 'Finance', works: ['The Psychology of Money', 'Same as Ever'], bio: 'American author and financial writer, best known for The Psychology of Money (2020), a book about how behaviour shapes financial outcomes.' },
  { name: 'Cal Newport', nationality: 'American', genre: 'Productivity', works: ['Deep Work', 'Digital Minimalism', 'So Good They Can\'t Ignore You'], bio: 'American computer science professor at Georgetown University and author of books on focus, work and technology.' },
  { name: 'Eric Ries', nationality: 'American', genre: 'Business', works: ['The Lean Startup', 'The Startup Way'], bio: 'American entrepreneur and author who popularised the "lean startup" approach to building new companies.' },
  { name: 'Napoleon Hill', nationality: 'American', genre: 'Self-improvement', works: ['Think and Grow Rich', 'The Law of Success'], bio: 'American author (1883–1970) of personal-success books. Think and Grow Rich was published in 1937.' },
  { name: 'Sun Tzu', nationality: 'Chinese', genre: 'Military Strategy', works: ['The Art of War'], bio: 'Ancient Chinese military strategist traditionally credited as the author of The Art of War. Details of his life are uncertain.' },
  { name: 'Frances Hodgson Burnett', nationality: 'British-American', genre: 'Children’s Books', works: ['The Secret Garden'], bio: 'A British-American novelist and playwright best known for classic stories for young readers.' },
  { name: 'Lewis Carroll', nationality: 'British', genre: 'Children’s Books', works: ['Alice’s Adventures in Wonderland'], bio: 'An English writer and mathematician remembered for imaginative children’s fiction.' },
  { name: 'L. Frank Baum', nationality: 'American', genre: 'Children’s Books', works: ['The Wonderful Wizard of Oz'], bio: 'An American author best known for creating the magical world of Oz.' },
  { name: 'E. H. Gombrich', nationality: 'Austrian-British', genre: 'History', works: ['A Little History of the World'], bio: 'A historian and art historian known for making history accessible to general readers.' },
  { name: 'Peter Frankopan', nationality: 'British', genre: 'History', works: ['The Silk Roads'], bio: 'A historian whose work explores the connections and exchanges that shaped Eurasian history.' },
  { name: 'Susan Wise Bauer', nationality: 'American', genre: 'History', works: ['The History of the Ancient World'], bio: 'An American historian and author of accessible histories for students and general readers.' }
];
const SEED_BOOKS = [
  { id: 'LF-001', title: 'Atomic Habits', author: 'James Clear', genre: 'Self-improvement', year: 2018, publisher: 'Avery', description: 'A practical guide to building good habits and breaking bad ones through small, consistent changes.', isbn: '9780593189641', cover: 'https://covers.openlibrary.org/b/isbn/9780593189641-L.jpg' },
  { id: 'LF-002', title: 'The Alchemist', author: 'Paulo Coelho', genre: 'Fiction', year: 1988, publisher: 'HarperOne', description: 'A shepherd boy travels in search of treasure and learns to follow his personal legend.', isbn: '9780062315007', cover: 'https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg' },
  { id: 'LF-003', title: 'Clean Code', author: 'Robert C. Martin', genre: 'Software Engineering', year: 2008, publisher: 'Prentice Hall', description: 'A handbook of agile software craftsmanship focused on writing readable, maintainable code.', isbn: '9780132350884', cover: 'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg' },
  { id: 'LF-004', title: 'The Pragmatic Programmer', author: 'Andrew Hunt and David Thomas', genre: 'Software Engineering', year: 1999, publisher: 'Addison-Wesley', description: 'Practical advice and tips for becoming a more effective, adaptable programmer.', isbn: '9780135957059', cover: 'https://covers.openlibrary.org/b/isbn/9780135957059-L.jpg' },
  { id: 'LF-005', title: 'A Brief History of Time', author: 'Stephen Hawking', genre: 'Science', year: 1988, publisher: 'Bantam Books', description: 'An accessible introduction to cosmology, from the Big Bang to black holes.', isbn: '9780553380163', cover: 'https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg' },
  { id: 'LF-006', title: 'The Hobbit', author: 'J. R. R. Tolkien', genre: 'Fantasy', year: 1937, publisher: 'George Allen & Unwin', description: 'Bilbo Baggins joins a company of dwarves on a quest to reclaim their homeland from the dragon Smaug.', isbn: '9780547928227', cover: 'https://covers.openlibrary.org/b/isbn/9780547928227-L.jpg' },
  { id: 'LF-007', title: 'The Psychology of Money', author: 'Morgan Housel', genre: 'Finance', year: 2020, publisher: 'Harriman House', description: 'Short stories about how behaviour and mindset shape the way we handle money.', isbn: '9780857197689', cover: 'https://covers.openlibrary.org/b/isbn/9780857197689-L.jpg' },
  { id: 'LF-008', title: 'Deep Work', author: 'Cal Newport', genre: 'Productivity', year: 2016, publisher: 'Grand Central Publishing', description: 'Rules for focused success in a distracted world.', isbn: '9781455586691', cover: 'https://covers.openlibrary.org/b/isbn/9781455586691-L.jpg' },
  { id: 'LF-009', title: 'The Lean Startup', author: 'Eric Ries', genre: 'Business', year: 2011, publisher: 'Crown Business', description: 'A method for building startups through rapid experimentation and validated learning.', isbn: '9780307887894', cover: 'https://covers.openlibrary.org/b/isbn/9780307887894-L.jpg' },
  { id: 'LF-010', title: 'Think and Grow Rich', author: 'Napoleon Hill', genre: 'Self-improvement', year: 1937, publisher: 'The Ralston Society', description: 'A classic on personal achievement built around principles of success.', isbn: '9781585424337', cover: 'https://covers.openlibrary.org/b/isbn/9781585424337-L.jpg' },
  { id: 'LF-011', title: 'Ikigai', author: 'Héctor García and Francesc Miralles', genre: 'Self-improvement', year: 2016, publisher: 'Penguin Books', description: 'The Japanese concept of finding purpose, and what it can teach about a long, happy life.', isbn: '9780143130727', cover: 'https://covers.openlibrary.org/b/isbn/9780143130727-L.jpg' },
  { id: 'LF-012', title: 'The Art of War', author: 'Sun Tzu', genre: 'Military Strategy', year: 'c. 5th century BC', publisher: 'Various editions', description: 'An ancient Chinese treatise on strategy, leadership and conflict.', isbn: '9781590302255', cover: 'https://covers.openlibrary.org/b/isbn/9781590302255-L.jpg' },
  { id: 'LF-013', title: 'The Secret Garden', author: 'Frances Hodgson Burnett', genre: 'Children’s Books', year: 1911, publisher: 'Frederick A. Stokes', description: 'A lonely young girl discovers a hidden garden and helps bring it back to life.', cover: '' },
  { id: 'LF-014', title: 'Alice’s Adventures in Wonderland', author: 'Lewis Carroll', genre: 'Children’s Books', year: 1865, publisher: 'Macmillan', description: 'Alice follows a curious rabbit into a playful world full of strange characters.', cover: '' },
  { id: 'LF-015', title: 'The Wonderful Wizard of Oz', author: 'L. Frank Baum', genre: 'Children’s Books', year: 1900, publisher: 'George M. Hill Company', description: 'Dorothy and her friends travel through Oz in search of a way home.', cover: '' },
  { id: 'LF-016', title: 'A Little History of the World', author: 'E. H. Gombrich', genre: 'History', year: 1935, publisher: 'Wiener Verlag', description: 'A lively overview of world history, from ancient civilizations to the modern era.', cover: '' },
  { id: 'LF-017', title: 'The Silk Roads', author: 'Peter Frankopan', genre: 'History', year: 2015, publisher: 'Bloomsbury Publishing', description: 'A history of the networks and cultures that connected Europe and Asia.', cover: '' },
  { id: 'LF-018', title: 'The History of the Ancient World', author: 'Susan Wise Bauer', genre: 'History', year: 2007, publisher: 'W. W. Norton & Company', description: 'A narrative introduction to the civilizations of the ancient world.', cover: '' }
];

function seedData() {
  const now = Date.now();
  const books = SEED_BOOKS.map((b, i) => ({ ...b, color: COLORS[i % COLORS.length], added: now - i * 3 * DAY }));
  const t = (bookId, student, sid, issued, due, ret) => {
    const b = books.find(x => x.id === bookId);
    return { id: 'T' + Math.random().toString(36).slice(2, 9), bookId, title: b.title, student, studentId: sid, issueDate: addDays(today(), issued), dueDate: addDays(today(), due), returnDate: ret === null ? null : addDays(today(), ret) };
  };
  const tx = [
    t('LF-002', 'Isha Rao', 'S1010', -25, -11, -14), t('LF-008', 'Karan Patel', 'S1032', -18, -4, -8), t('LF-001', 'Neha Verma', 'S1051', -40, -26, -30),
    t('LF-001', 'Aarav Sharma', 'S1021', -5, 9, null), t('LF-003', 'Meera Nair', 'S1044', -20, -6, null), t('LF-006', 'Rohan Gupta', 'S1087', -3, 11, null)
  ];
  const log = [
    { t: now - 3 * DAY, text: 'Rohan Gupta issued "The Hobbit"' }, { t: now - 5 * DAY, text: 'Aarav Sharma issued "Atomic Habits"' },
    { t: now - 14 * DAY, text: 'Isha Rao returned "The Alchemist"' }, { t: now - 20 * DAY, text: 'Meera Nair issued "Clean Code"' }
  ];
  return { books, tx, log };
}

/* ---------- state + persistence ---------- */
let books, authors, tx, log, members = [];
function loadState() {
  const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  books = read(KEYS.books); authors = read(KEYS.authors); tx = read(KEYS.tx) || []; log = read(KEYS.log) || [];
  members = read(KEYS.members);
  if (!Array.isArray(members)) members = [];
  if (!Array.isArray(books)) { const s = seedData(); books = s.books; tx = s.tx; log = s.log; }   // seed only if nothing stored
  if (!Array.isArray(authors)) authors = SEED_AUTHORS.map(a => ({ ...a }));
  SEED_BOOKS.forEach((seed, i) => {
    const existing = books.find(b => b.id === seed.id);
    if (!existing) books.push({ ...seed, color: COLORS[i % COLORS.length], added: Date.now() });
    else {
      if (!existing.isbn && seed.isbn) existing.isbn = seed.isbn;
      if (!existing.cover && seed.cover) existing.cover = seed.cover;
    }
  });
  const knownAuthors = new Set(authors.map(a => a.name));
  SEED_AUTHORS.forEach(a => { if (!knownAuthors.has(a.name)) authors.push({ ...a }); });
  saveState();
}
function saveState() {
  try {
    localStorage.setItem(KEYS.books, JSON.stringify(books)); localStorage.setItem(KEYS.authors, JSON.stringify(authors));
    localStorage.setItem(KEYS.tx, JSON.stringify(tx)); localStorage.setItem(KEYS.log, JSON.stringify(log.slice(0, 100)));
  } catch { toast('Could not save to browser storage.', 'error'); }
}
const addLog = text => log.unshift({ t: Date.now(), text });

/* ---------- derived data ---------- */
const activeTx = id => tx.find(t => t.bookId === id && !t.returnDate);
const isOverdue = t => !t.returnDate && t.dueDate < today();
const statusOf = b => { const a = activeTx(b.id); return !a ? 'available' : isOverdue(a) ? 'overdue' : 'issued'; };
const statusBadge = b => { const s = statusOf(b); return `<span class="badge ${s}">${s === 'available' ? 'Available' : s === 'overdue' ? 'Overdue' : 'Issued'}</span>`; };
const byId = id => books.find(b => b.id === id);
const authorBooks = a => books.filter(b => b.author.toLowerCase().includes(a.name.toLowerCase()));
const initials = n => n.split(/\s+/).filter(w => /^[A-Za-z]/.test(w)).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const counts = () => {
  const issued = books.filter(b => activeTx(b.id)).length;
  return { total: books.length, issued, avail: books.length - issued, overdue: tx.filter(isOverdue).length };
};
const topBy = (items, keyFn) => { const m = {}; items.forEach(i => { const k = keyFn(i); if (k) m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1])[0]; };

/* ---------- reusable HTML ---------- */
const coverHTML = b => {
  const coverStyle = b.genre === 'Children’s Books' ? 'cover-kids' : b.genre === 'History' ? 'cover-history' : '';
  return `<div class="cover cover-animated ${coverStyle}" style="--c:${esc(b.color)}"><span class="cover-shine" aria-hidden="true"></span>${b.cover ? `<img src="${esc(b.cover)}" alt="Cover of ${esc(b.title)}" loading="lazy" onerror="this.remove()">` : ''}<span>${esc(b.title)}</span><small>${esc(b.author)}</small></div>`;
};
const empty = (title, msg) => `<div class="empty"><b>${title}</b>${msg}</div>`;
const actionBtn = (b, cls = '') => activeTx(b.id)
  ? `<button class="btn ghost ${cls}" data-act="return" data-id="${esc(b.id)}">Return Book</button>`
  : `<button class="btn ${cls}" data-act="issue" data-id="${esc(b.id)}">Issue Book</button>`;

/* ---------- toast + modal ---------- */
function toast(msg, type = 'ok') {
  const el = document.createElement('div'); el.className = 'toast ' + (type === 'error' ? 'error' : ''); el.textContent = msg;
  $('#toasts').append(el); setTimeout(() => el.remove(), 3500);
}
let lastFocus = null;
function openModal(html) {
  lastFocus = document.activeElement; $('#modalBody').innerHTML = html; $('#overlay').hidden = false; document.body.style.overflow = 'hidden';
  const f = $('#modal').querySelector('input,button:not(.x)') || $('#modalClose'); f.focus();
}
function closeModal() { $('#overlay').hidden = true; document.body.style.overflow = ''; lastFocus && lastFocus.focus && lastFocus.focus(); }

/* ---------- member accounts ---------- */
const homeViewRequested = new URLSearchParams(location.search).get('view') === 'home';
const currentMember = () => members.find(m => m.membershipId === localStorage.getItem(MEMBER_SESSION_KEY));
const hex = bytes => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
function homePageUrl() {
  const url = new URL(location.href);
  url.searchParams.set('view', 'home');
  url.hash = 'home';
  return url.href;
}
function reserveHomeTab() { return window.open('about:blank', '_blank'); }
function openHomeTab(tab) {
  if (tab) tab.location.href = homePageUrl();
  else toast('Your browser blocked the new tab. Use “Open library” here after signing in.', 'error');
}
async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const saltBytes = new Uint8Array(salt.match(/.{2}/g).map(b => parseInt(b, 16)));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: 120000, hash: 'SHA-256' }, key, 256);
  return hex(new Uint8Array(bits));
}
function renderMemberStatus() {
  const member = currentMember();
  $('#logoutBtn').hidden = !member;
  $('#memberStatus').innerHTML = member
    ? `Signed in as <b>${esc(member.name)}</b> · Membership ID: <b>${esc(member.membershipId)}</b> <a class="btn sm" href="${esc(homePageUrl())}" target="_blank" rel="noopener">Open library</a>`
    : 'You are not signed in.';
}
function showMembershipPage(show) {
  $('#loginPanel').hidden = show;
  $('#membershipPanel').hidden = !show;
  $('#memberTitle').textContent = show ? 'Get a new membership' : 'Member Login';
  $('#memberIntro').textContent = show
    ? 'Create your library membership to start borrowing books.'
    : 'Sign in with your membership details to issue books.';
  (show ? $('#memberName') : $('#loginEmail')).focus();
}
async function registerMember(e) {
  e.preventDefault();
  const name = $('#memberName').value.trim(), email = $('#memberEmail').value.trim().toLowerCase(), password = $('#memberPassword').value;
  const err = $('#membershipErr');
  err.textContent = '';
  if (!name) return err.textContent = 'Enter your full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err.textContent = 'Enter a valid email address.';
  if (password.length < 8) return err.textContent = 'Password must be at least 8 characters.';
  if (members.some(m => m.email.toLowerCase() === email)) return err.textContent = 'An account with this email already exists. Please sign in.';
  const homeTab = reserveHomeTab();
  try {
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    const passwordHash = await hashPassword(password, salt);
    const membershipId = `LF-${hex(crypto.getRandomValues(new Uint8Array(4))).toUpperCase()}`;
    const member = { name, email, membershipId, salt, passwordHash };
    const updatedMembers = [...members, member];
    localStorage.setItem(KEYS.members, JSON.stringify(updatedMembers));
    members = updatedMembers;
    localStorage.setItem(MEMBER_SESSION_KEY, membershipId);
    e.target.reset();
    renderMemberStatus();
    toast(`Membership created. Your ID is ${membershipId}.`);
    openHomeTab(homeTab);
  } catch (error) {
    if (homeTab) homeTab.close();
    console.error('Membership registration failed:', error);
    err.textContent = 'Could not securely create your membership in this browser. Please try again.';
  }
}
async function loginMember(e) {
  e.preventDefault();
  const email = $('#loginEmail').value.trim().toLowerCase(), password = $('#loginPassword').value, id = $('#loginMembershipId').value.trim();
  const err = $('#loginErr');
  err.textContent = '';
  if (!password) return err.textContent = 'Enter your password.';
  const member = members.find(m => m.email.toLowerCase() === email && m.membershipId.toLowerCase() === id.toLowerCase());
  if (!member) return err.textContent = 'Email and membership ID do not match an account in this browser.';
  const homeTab = reserveHomeTab();
  try {
    if (await hashPassword(password, member.salt) !== member.passwordHash) {
      if (homeTab) homeTab.close();
      return err.textContent = 'Incorrect password.';
    }
    localStorage.setItem(MEMBER_SESSION_KEY, member.membershipId);
    e.target.reset();
    renderMemberStatus();
    toast(`Welcome back, ${member.name}.`);
    openHomeTab(homeTab);
  } catch (error) {
    if (homeTab) homeTab.close();
    console.error('Member sign-in failed:', error);
    err.textContent = 'Could not securely verify your sign-in in this browser. Please try again.';
  }
}

/* ---------- catalogue ---------- */
function fillFilters() {
  const keep = id => $(id).value;
  const g = keep('#fGenre'), a = keep('#fAuthor');
  const genres = [...new Set(books.map(b => b.genre).filter(Boolean))].sort();
  const auths = [...new Set(books.map(b => b.author))].sort();
  $('#fGenre').innerHTML = '<option value="">All genres</option>' + genres.map(x => `<option>${esc(x)}</option>`).join('');
  $('#fAuthor').innerHTML = '<option value="">All authors</option>' + auths.map(x => `<option>${esc(x)}</option>`).join('');
  $('#fGenre').value = genres.includes(g) ? g : ''; $('#fAuthor').value = auths.includes(a) ? a : '';
  $('#genreList').innerHTML = genres.map(x => `<option value="${esc(x)}">`).join('');
}
/** Filter, search and sort the catalogue, then draw the cards. */
function renderCatalogue() {
  const q = $('#q').value.trim().toLowerCase(), g = $('#fGenre').value, av = $('#fAvail').value, au = $('#fAuthor').value, so = $('#fSort').value;
  let list = books.filter(b =>
    (!q || [b.title, b.author, b.id].some(v => String(v).toLowerCase().includes(q))) &&
    (!g || b.genre === g) && (!au || b.author === au) &&
    (!av || (av === 'available') === !activeTx(b.id)));
  list.sort(so === 'za' ? (a, b) => b.title.localeCompare(a.title) : so === 'recent' ? (a, b) => b.added - a.added : (a, b) => a.title.localeCompare(b.title));
  $('#resultCount').textContent = `${list.length} ${list.length === 1 ? 'book' : 'books'} found`;
  $('#catalogue').innerHTML = !books.length ? empty('The catalogue is empty', 'Add your first book in the Manage Books section.')
    : !list.length ? empty('No books found', 'Try a different title, author or book ID, or clear the filters.')
    : list.map(b => `<article class="card clickable ${statusOf(b) === 'overdue' ? 'od' : ''}" data-act="view" data-id="${esc(b.id)}">
        ${coverHTML(b)}<h3>${esc(b.title)}</h3><div class="by">${esc(b.author)}</div>
        <div class="id">ID: ${esc(b.id)} · ${esc(b.genre || 'Uncategorised')}</div><div>${statusBadge(b)}</div>
        <div class="row"><button class="btn ghost" data-act="view" data-id="${esc(b.id)}">View Details</button>${actionBtn(b)}</div></article>`).join('');
}

/* ---------- hero + slider ---------- */
let slide = 0, timer = null;
function renderHero() {
  const c = counts();
  $('#hTotal').textContent = c.total; $('#hAvail').textContent = c.avail; $('#hIssued').textContent = c.issued;
  $('#heroCovers').innerHTML = books.slice(0, 3).map(coverHTML).join('');
}
function renderSlides() {
  const f = books.slice(0, 6);
  $('#track').innerHTML = f.map(b => `<div class="slide" role="group" aria-label="${esc(b.title)}">${coverHTML(b)}<div>
    <h3 style="font-size:1.8rem">${esc(b.title)}</h3><div class="meta"><b>${esc(b.author)}</b><span class="badge gold">${esc(b.genre || 'General')}</span>${statusBadge(b)}</div>
    <p>${esc(b.description || 'No description yet.')}</p><button class="btn" data-act="view" data-id="${esc(b.id)}">View Book</button></div></div>`).join('');
  $('#dots').innerHTML = f.map((_, i) => `<button aria-label="Go to slide ${i + 1}" data-dot="${i}"></button>`).join('');
  goTo(Math.min(slide, f.length - 1));
}
function goTo(i) {
  const n = Math.min(6, books.length); if (!n) return;
  slide = (i + n) % n; $('#track').style.transform = `translateX(-${slide * 100}%)`;
  document.querySelectorAll('#dots button').forEach((d, k) => d.classList.toggle('on', k === slide));
}
const startAuto = () => { stopAuto(); timer = setInterval(() => goTo(slide + 1), 5000); };
const stopAuto = () => clearInterval(timer);
function initSlider() {
  $('#prev').onclick = () => goTo(slide - 1); $('#next').onclick = () => goTo(slide + 1);
  $('#dots').onclick = e => { if (e.target.dataset.dot) goTo(+e.target.dataset.dot); };
  const s = $('#slider'); let x0 = null;
  s.onmouseenter = stopAuto; s.onmouseleave = startAuto; s.onfocusin = stopAuto; s.onfocusout = startAuto;
  s.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; stopAuto(); }, { passive: true });
  s.addEventListener('touchend', e => { if (x0 !== null) { const d = e.changedTouches[0].clientX - x0; if (Math.abs(d) > 40) goTo(slide + (d < 0 ? 1 : -1)); } x0 = null; startAuto(); });
  s.onkeydown = e => { if (e.key === 'ArrowLeft') goTo(slide - 1); if (e.key === 'ArrowRight') goTo(slide + 1); };
  startAuto();
}

/* ---------- authors ---------- */
const photoHTML = (a, big) => `<div class="photo ${big ? 'lg' : ''}">${a.photo ? `<img src="${esc(a.photo)}" alt="Photo of ${esc(a.name)}" onerror="this.remove()">` : ''}${initials(a.name)}</div>`;
function renderAuthors() {
  $('#authorGrid').innerHTML = authors.map((a, i) => `<article class="card acard">${photoHTML(a)}<h3>${esc(a.name)}</h3>
    <span class="badge">${esc(a.genre)}</span><p>${esc(a.bio.split('. ')[0].replace(/\.$/, ''))}.</p>
    <p><b>Famous books:</b> ${esc(a.works.slice(0, 2).join(', '))}</p>
    <div class="row"><button class="btn" data-act="author" data-i="${i}">View Profile</button></div></article>`).join('');
}
function authorModal(i) {
  const a = authors[i], ab = authorBooks(a);
  openModal(`<div class="detail" style="grid-template-columns:150px 1fr">${photoHTML(a, true)}<div>
    <h2 id="modalTitle">${esc(a.name)}</h2><div class="mini"><span class="badge">${esc(a.genre)}</span><span class="badge gold">${esc(a.nationality)}</span></div>
    <p>${esc(a.bio)}</p><h3>Notable works</h3><p>${esc(a.works.join(' · '))}</p>
    <h3>Available in this library</h3>${ab.length ? `<div class="mini">${ab.map(b => `<button class="chip" data-act="view" data-id="${esc(b.id)}">${esc(b.title)} — ${statusOf(b) === 'available' ? 'Available' : 'Issued'}</button>`).join('')}</div>` : '<p>No books by this author are in the catalogue yet.</p>'}
  </div></div>`);
}

/* ---------- book details, issue, return ---------- */
function bookModal(id) {
  const b = byId(id); if (!b) return; const a = activeTx(id);
  openModal(`<div class="detail">${coverHTML(b)}<div><h2 id="modalTitle">${esc(b.title)}</h2><div>${statusBadge(b)}</div>
    <dl><dt>Author</dt><dd>${esc(b.author)}</dd><dt>Book ID</dt><dd>${esc(b.id)}</dd><dt>Genre</dt><dd>${esc(b.genre || '—')}</dd>
    <dt>Published</dt><dd>${esc(b.year || '—')}</dd><dt>Publisher</dt><dd>${esc(b.publisher || '—')}</dd>
    ${a ? `<dt>Issued to</dt><dd>${esc(a.student)} (${esc(a.studentId)}), due ${show(a.dueDate)}</dd>` : ''}</dl>
    <p>${esc(b.description || 'No description available.')}</p>${actionBtn(b)}</div></div>`);
}
function issueModal(id) {
  const b = byId(id); if (!b) return;
  const member = currentMember();
  if (!member) {
    location.hash = '#member-access';
    toast('Sign in or get a membership before issuing a book.', 'error');
    $('#loginEmail').focus();
    return;
  }
  if (activeTx(id)) return toast('This book is already issued.', 'error');
  const d = today();
  openModal(`<h2 id="modalTitle">Issue book</h2><p><b>${esc(b.title)}</b> · ID ${esc(b.id)}</p>
    <form class="mform" id="issueForm" novalidate data-id="${esc(id)}">
      <div class="f2"><div class="f"><label for="iName">Member name</label><input id="iName" value="${esc(member.name)}" readonly></div>
      <div class="f"><label for="iSid">Membership ID</label><input id="iSid" value="${esc(member.membershipId)}" readonly></div></div>
      <div class="f2"><div class="f"><label for="iDate">Issue date</label><input id="iDate" type="date" value="${d}"></div>
      <div class="f"><label for="iDue">Due date</label><input id="iDue" type="date" value="${addDays(d, 14)}"></div></div>
      <p class="err" id="issueErr" role="alert"></p><button class="btn" type="submit">Confirm Issue</button></form>`);
  $('#iDate').onchange = () => { if (validDate($('#iDate').value)) $('#iDue').value = addDays($('#iDate').value, 14); };
}
/** Validate and record a new issue transaction. */
function confirmIssue(form) {
  const id = form.dataset.id, name = $('#iName').value.trim(), sid = $('#iSid').value.trim(), d1 = $('#iDate').value, d2 = $('#iDue').value;
  const fail = m => { $('#issueErr').textContent = m; };
  const member = currentMember();
  if (!member || member.membershipId !== sid) return fail('Please sign in with a valid membership before issuing a book.');
  if (activeTx(id)) return fail('This book is already issued.');
  if (!name) return fail('Student name is required.');
  if (!sid) return fail('Student ID is required.');
  if (!validDate(d1) || !validDate(d2)) return fail('Enter valid issue and due dates.');
  if (d2 <= d1) return fail('Due date must be after the issue date.');
  if (tx.some(t => !t.returnDate && t.bookId === id && t.studentId.toLowerCase() === sid.toLowerCase())) return fail('This issue record already exists.');
  const b = byId(id);
  tx.push({ id: 'T' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), bookId: id, title: b.title, student: name, studentId: sid, issueDate: d1, dueDate: d2, returnDate: null });
  addLog(`${name} issued "${b.title}"`); saveState(); closeModal(); renderAll(); toast(`"${b.title}" issued to ${name}.`);
}
function returnBook(id) {
  const a = activeTx(id); if (!a) return toast('This book is not currently issued.', 'error');
  if (!confirm(`Return "${a.title}" from ${a.student}?`)) return;
  a.returnDate = today(); addLog(`${a.student} returned "${a.title}"`); saveState(); closeModal(); renderAll(); toast(`"${a.title}" returned.`);
}

/* ---------- dashboard ---------- */
function renderDashboard() {
  const c = counts(), monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const cards = [['Total Books', c.total, ''], ['Available Books', c.avail, ''], ['Issued Books', c.issued, 'gold'], ['Total Authors', authors.length, ''], ['Total Transactions', tx.length, 'gold'], ['Overdue Books', c.overdue, 'bad']];
  $('#statCards').innerHTML = cards.map(x => `<div class="stat ${x[2]}"><b>${x[1]}</b><span>${x[0]}</span></div>`).join('');
  const max = Math.max(c.avail, c.issued, 1);
  $('#chart').innerHTML = `<div class="bar"><b>${c.avail}</b><i style="height:${c.avail / max * 75}%"></i><span>Available</span></div><div class="bar is"><b>${c.issued}</b><i style="height:${c.issued / max * 75}%"></i><span>Issued</span></div>`;

  const genreTop = topBy(tx, t => (byId(t.bookId) || {}).genre) || topBy(books, b => b.genre);
  const bookTop = topBy(tx, t => t.title), authTop = topBy(tx, t => (byId(t.bookId) || {}).author);
  const month = books.filter(b => b.added >= monthStart.getTime()).length;
  const row = (k, v) => `<li><small>${k}</small>${esc(v)}</li>`;
  $('#insights').innerHTML = row('Most popular genre', genreTop ? genreTop[0] : '—') + row('Most frequently issued book', bookTop ? `${bookTop[0]} (${bookTop[1]}×)` : '—') +
    row('Most active author', authTop ? authTop[0] : '—') + row('Books added this month', month);

  $('#activity').innerHTML = log.length ? log.slice(0, 6).map(l => `<li>${esc(l.text)}<small>${new Date(l.t).toLocaleString()}</small></li>`).join('') : '<li>No recent activity yet.</li>';
  const pop = books.map(b => [b, tx.filter(t => t.bookId === b.id).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]).slice(0, 4);
  $('#popular').innerHTML = pop.length ? pop.map(x => `<li>${esc(x[0].title)}<small>${x[1]} issue${x[1] > 1 ? 's' : ''}</small></li>`).join('') : '<li>No issues recorded yet.</li>';
  $('#recent').innerHTML = [...books].sort((a, b) => b.added - a.added).slice(0, 4).map(b => `<li>${esc(b.title)}<small>${esc(b.author)}</small></li>`).join('') || '<li>No books yet.</li>';
  renderTx();
}
function renderTx() {
  const f = $('#txFilter').value;
  const list = [...tx].reverse().filter(t => f === 'all' || (f === 'current' && !t.returnDate) || (f === 'returned' && t.returnDate) || (f === 'overdue' && isOverdue(t)));
  $('#txBody').innerHTML = list.length ? list.map(t => {
    const st = t.returnDate ? '<span class="badge">Returned</span>' : isOverdue(t) ? '<span class="badge overdue">Overdue</span>' : '<span class="badge issued">Issued</span>';
    return `<tr class="${isOverdue(t) ? 'od' : ''}"><td>${esc(t.title)}</td><td>${esc(t.bookId)}</td><td>${esc(t.student)}</td><td>${esc(t.studentId)}</td><td>${show(t.issueDate)}</td><td>${show(t.dueDate)}</td><td>${st}</td>
      <td>${t.returnDate ? '' : `<button class="btn ghost sm" data-act="return" data-id="${esc(t.bookId)}">Return</button>`}</td></tr>`;
  }).join('') : `<tr><td colspan="8">${empty('No records', 'No transactions match this filter.')}</td></tr>`;
}

/* ---------- add book ---------- */
function addBook(e) {
  e.preventDefault();
  const v = id => $(id).value.trim(), err = $('#formErr');
  const title = v('#bTitle'), author = v('#bAuthor'), id = v('#bId');
  const fail = m => { err.textContent = m; toast(m, 'error'); };
  err.textContent = '';
  if (!title) return fail('Title cannot be empty.');
  if (!author) return fail('Author cannot be empty.');
  if (!id) return fail('Book ID cannot be empty.');
  if (books.some(b => b.id.toLowerCase() === id.toLowerCase())) return fail(`Book ID "${id}" already exists. Choose a unique ID.`);
  const isbnValue = v('#bIsbn'), isbn = normalizeIsbn(isbnValue);
  if (isbnValue && !isbn) return fail('Enter a valid ISBN-10 or ISBN-13.');
  const coverInput = v('#bCover');
  const cover = coverInput || (isbn ? openLibraryCoverUrl(isbn) : '');
  if (cover && !/^https?:\/\//i.test(cover)) return fail('Cover image URL must start with http:// or https://');
  books.push({ id, title, author, genre: v('#bGenre'), year: v('#bYear'), publisher: v('#bPub'), description: v('#bDesc'), isbn, cover, color: COLORS[books.length % COLORS.length], added: Date.now() });
  addLog(`Book added: "${title}"`); saveState(); e.target.reset(); renderAll(); toast(`"${title}" added to the catalogue.`);
}

/* ---------- theme, reset, nav ---------- */
function setTheme(t) { document.documentElement.dataset.theme = t; localStorage.setItem(KEYS.theme, t); }
function resetDemo() {
  if (!confirm('Clear all books, issue records and activity, and restore the demo collection?')) return;
  Object.values(KEYS).filter(k => k !== KEYS.theme && k !== KEYS.members).forEach(k => localStorage.removeItem(k));
  loadState(); renderAll(); toast('Demo data restored.');
}
function renderAll() { fillFilters(); renderCatalogue(); renderHero(); renderSlides(); renderAuthors(); renderDashboard(); }

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t) { if (e.target.id === 'overlay') closeModal(); return; }
  if (t.tagName !== 'BUTTON' && e.target.closest('button[data-act]')) return;   // inner button handles itself
  const { act, id, i } = t.dataset;
  if (act === 'view') bookModal(id); else if (act === 'issue') issueModal(id); else if (act === 'return') returnBook(id); else if (act === 'author') authorModal(+i);
});
document.addEventListener('submit', e => { if (e.target.id === 'issueForm') { e.preventDefault(); confirmIssue(e.target); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#overlay').hidden) closeModal(); });

document.addEventListener('DOMContentLoaded', () => {
  setTheme(localStorage.getItem(KEYS.theme) || 'light');
  loadState(); initSlider(); renderAll();
  if (homeViewRequested && currentMember()) document.body.classList.remove('login-first');
  else if (homeViewRequested) location.hash = 'member-access';
  renderMemberStatus();
  $('#loginForm').addEventListener('submit', loginMember);
  $('#membershipForm').addEventListener('submit', registerMember);
  $('#showMembership').onclick = () => showMembershipPage(true);
  $('#backToLogin').onclick = () => showMembershipPage(false);
  $('#logoutBtn').onclick = () => {
    localStorage.removeItem(MEMBER_SESSION_KEY);
    document.body.classList.add('login-first');
    location.hash = 'member-access';
    renderMemberStatus();
    toast('You have signed out.');
  };
  window.addEventListener('storage', e => {
    if (e.key !== MEMBER_SESSION_KEY) return;
    if (homeViewRequested && !currentMember()) {
      document.body.classList.add('login-first');
      location.hash = 'member-access';
    }
    renderMemberStatus();
  });
  $('#modalClose').onclick = closeModal;
  $('#themeBtn').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  ['#q', '#fGenre', '#fAvail', '#fAuthor', '#fSort'].forEach(s => $(s).addEventListener(s === '#q' ? 'input' : 'change', renderCatalogue));
  $('#heroSearch').addEventListener('input', e => { $('#q').value = e.target.value; renderCatalogue(); });
  $('#heroSearch').addEventListener('keydown', e => { if (e.key === 'Enter') location.hash = '#explore'; });
  $('#clearSearch').onclick = () => { $('#q').value = ''; $('#heroSearch').value = ''; ['#fGenre', '#fAvail', '#fAuthor'].forEach(s => $(s).value = ''); renderCatalogue(); $('#q').focus(); };
  $('#txFilter').onchange = renderTx; $('#bookForm').addEventListener('submit', addBook);
  $('#bookForm').addEventListener('reset', () => { $('#formErr').textContent = ''; });
  $('#resetBtn').onclick = resetDemo;
  $('#burger').onclick = () => { const o = $('#menu').classList.toggle('open'); $('#burger').setAttribute('aria-expanded', o); };
  $('#menu').onclick = () => { $('#menu').classList.remove('open'); $('#burger').setAttribute('aria-expanded', false); };
  setInterval(() => { if ($('#overlay').hidden) renderDashboard(); }, 60000);   // keep overdue status fresh
});
