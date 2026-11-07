/**
 * ============================================================
 *  app.js — المنطق الرئيسي للتطبيق
 * ============================================================
 */

const initialNotes = [
    {
        id: 1,
        title: "تخطي إيميل مايكروسوفت عند تثبيت Windows 11",
        category: "Windows",
        desc: "يُستخدم في شاشة التثبيت الأولى لتجاوز إلزامية الاتصال بالإنترنت وتسجيل الدخول.",
        commands: ["OOBE\\BYPASSNRO"]
    },
    {
        id: 2,
        title: "إعادة تعيين شبكة الأجهزة في Windows",
        category: "Windows",
        desc: "مجموعة أوامر لتنظيف الـ DNS وإعادة تعيين الـ IP عند وجود مشاكل في الاتصال.",
        commands: ["ipconfig /flushdns", "netsh winsock reset", "ipconfig /renew"]
    },
    {
        id: 3,
        title: "إنشاء زيادات ذاكرة Swap سريعة (2GB) على Linux",
        category: "Linux",
        desc: "لزيادة استقرار السيرفر عند وجود استهلاك عالي في الـ RAM.",
        commands: [
            "sudo fallocate -l 2G /swapfile",
            "sudo chmod 600 /swapfile",
            "sudo mkswap /swapfile",
            "sudo swapon /swapfile"
        ]
    },
    {
        id: 4,
        title: "تنظيف وحذف الحاويات والصور غير المستخدمة في Docker",
        category: "Docker",
        desc: "لتفريغ مساحة الهارد المأخوذة من حاويات وصور ملغاة.",
        commands: ["docker system prune -a --volumes -f"]
    }
];

let notes;
try {
    const saved = localStorage.getItem('my_command_playbook');
    notes = saved ? JSON.parse(saved) : initialNotes;
    if (!Array.isArray(notes)) notes = initialNotes;
} catch (e) {
    notes = initialNotes;
}

let selectedCategory = 'all';
let editingId = null;

/* ============================================================
   توليد أزرار الفلترة + القائمة المنسدلة
   ============================================================ */
function buildCategoryUI() {
    const filters = document.getElementById('categoryFilters');
    const select  = document.getElementById('noteCategory');

    filters.innerHTML = '';
    filters.appendChild(makeCatButton(ALL_LABEL, 'all', true));
    CATEGORIES.forEach(cat => {
        filters.appendChild(makeCatButton(cat.label, cat.key, false));
    });

    select.innerHTML = '';
    CATEGORIES.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.key;
        opt.textContent = cat.label;
        select.appendChild(opt);
    });
}

function makeCatButton(label, key, isActive) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.dataset.cat = key;
    btn.className = 'cat-btn text-xs font-semibold px-3 py-1.5 rounded-lg border transition '
        + (isActive
            ? 'bg-primary text-white border-primary/40 shadow-sm shadow-primary/30 active'
            : 'bg-white/5 text-muted hover:bg-white/10 hover:text-fg border-line');
    btn.onclick = () => filterCategory(key, btn);
    return btn;
}

/* ---------- حفظ في localStorage ---------- */
function persist() {
    try {
        localStorage.setItem('my_command_playbook', JSON.stringify(notes));
    } catch (e) {}
}

/* ---------- تعقيم النصوص ---------- */
function escapeHTML(str) {
    return String(str == null ? '' : str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
}

/* ============================================================
   عرض الملاحظات
   ============================================================ */
function renderNotes() {
    const grid = document.getElementById('notesGrid');
    grid.innerHTML = '';

    const searchVal = (document.getElementById('searchInput').value || '').toLowerCase();

    const filtered = notes.filter(n => {
        const matchesCat = selectedCategory === 'all' || n.category === selectedCategory;
        const haystack = [n.title || '', n.desc || '', ...(n.commands || [])].join(' ').toLowerCase();
        return matchesCat && haystack.includes(searchVal);
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12 text-muted">'
            + '<i class="fa-regular fa-folder-open text-4xl mb-3 text-primary/40"></i>'
            + '<p class="text-sm">لا توجد ملاحظات أو أوامر مطابقة لملفاتك</p></div>';
        return;
    }

    filtered.forEach(note => {
        const card = document.createElement('div');
        card.className = "bg-panel border border-line rounded-2xl p-5 space-y-4 hover:border-primary/40 transition relative flex flex-col justify-between hover:shadow-lg hover:shadow-primary/10";

        const commandsHTML = (note.commands || []).map(cmd =>
            '<div class="flex items-center justify-between bg-black/40 border border-line/80 rounded-xl p-3 group">'
            + '<code class="text-xs text-secondary code-font overflow-x-auto pr-2" dir="ltr">' + escapeHTML(cmd) + '</code>'
            + '<button onclick="copyToClipboard(this.dataset.command)" data-command="' + escapeHTML(cmd) + '" class="text-muted hover:text-white bg-white/5 hover:bg-primary px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0">'
            + '<i class="fa-regular fa-copy"></i><span>نسخ</span></button></div>'
        ).join('');

        card.innerHTML =
            '<div class="space-y-3">'
            + '<div class="flex items-start justify-between gap-3">'
            + '<div>'
            + '<span class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 mb-1.5">' + escapeHTML(note.category) + '</span>'
            + '<h3 class="text-base font-bold text-fg">' + escapeHTML(note.title) + '</h3>'
            + '</div>'
            + '<div class="flex items-center gap-0.5 shrink-0">'
            + '<button onclick="copyAll(\'' + note.id + '\')" title="نسخ كل الأوامر" class="text-muted hover:text-secondary text-xs p-1 transition"><i class="fa-regular fa-clipboard"></i></button>'
            + '<button onclick="editNote(\'' + note.id + '\')" title="تعديل" class="text-muted hover:text-primary text-xs p-1 transition"><i class="fa-regular fa-pen-to-square"></i></button>'
            + '<button onclick="deleteNote(\'' + note.id + '\')" title="حذف" class="text-muted hover:text-accent text-xs p-1 transition"><i class="fa-regular fa-trash-can"></i></button>'
            + '</div>'
            + '</div>'
            + (note.desc ? '<p class="text-xs text-muted leading-relaxed">' + escapeHTML(note.desc) + '</p>' : '')
            + '<div class="space-y-2 pt-2">' + commandsHTML + '</div>'
            + '</div>';

        grid.appendChild(card);
    });
}

/* ============================================================
   عمليات النسخ
   ============================================================ */
function findNoteById(id) {
    return notes.find(n => String(n.id) === String(id));
}

function copyAll(id) {
    const note = findNoteById(id);
    if (!note) return;
    copyToClipboard((note.commands || []).join('\n'));
}

function copyToClipboard(text) {
    const fallback = () => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            showToast('تم النسخ بنجاح!');
        } catch (e) {
            showToast('تعذّر النسخ', true);
        }
        document.body.removeChild(ta);
    };

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(() => showToast('تم النسخ بنجاح!'))
            .catch(fallback);
    } else {
        fallback();
    }
}

/* ============================================================
   Toast
   ============================================================ */
function showToast(msg, isError) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').innerText = msg;
    toast.classList.remove(
        'bg-gradient-to-l', 'from-primary', 'to-accent',
        'from-rose-500', 'to-rose-700',
        'translate-y-20', 'opacity-0'
    );
    if (isError) {
        toast.classList.add('bg-gradient-to-l', 'from-rose-500', 'to-rose-700');
    } else {
        toast.classList.add('bg-gradient-to-l', 'from-primary', 'to-accent');
    }
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 2000);
}

/* ============================================================
   الفلترة والبحث
   ============================================================ */
function filterCategory(cat, btn) {
    selectedCategory = cat;
    document.querySelectorAll('.cat-btn').forEach(b => {
        b.classList.remove('bg-primary', 'text-white', 'border-primary/40', 'shadow-sm', 'shadow-primary/30', 'active');
        b.classList.add('bg-white/5', 'text-muted', 'border-line');
    });
    if (btn) {
        btn.classList.remove('bg-white/5', 'text-muted', 'border-line');
        btn.classList.add('bg-primary', 'text-white', 'border-primary/40', 'shadow-sm', 'shadow-primary/30', 'active');
    }
    renderNotes();
}

function filterCards() {
    renderNotes();
}

/* ============================================================
   Modal
   ============================================================ */
function openModal(note) {
    editingId = note ? note.id : null;
    const form = document.getElementById('addNoteForm');
    form.reset();

    if (note) {
        document.getElementById('modalTitle').textContent = 'تعديل الملاحظة';
        document.getElementById('submitBtn').textContent = 'تحديث الملاحظة';
        document.getElementById('noteTitle').value = note.title;
        document.getElementById('noteCategory').value = note.category;
        document.getElementById('noteDesc').value = note.desc || '';
        document.getElementById('noteCommands').value = (note.commands || []).join('\n');
    } else {
        document.getElementById('modalTitle').textContent = 'إضافة ملاحظة أوامر جديدة';
        document.getElementById('submitBtn').textContent = 'حفظ الملاحظة';
    }

    document.getElementById('noteModal').classList.remove('hidden');
    setTimeout(() => document.getElementById('noteTitle').focus(), 50);
}

function editNote(id) {
    const note = findNoteById(id);
    if (note) openModal(note);
}

function closeModal() {
    document.getElementById('noteModal').classList.add('hidden');
    document.getElementById('addNoteForm').reset();
    editingId = null;
}

/* ============================================================
   حفظ / حذف
   ============================================================ */
function saveNote(e) {
    e.preventDefault();

    const title = document.getElementById('noteTitle').value.trim();
    const category = document.getElementById('noteCategory').value;
    const desc = document.getElementById('noteDesc').value.trim();
    const commands = document.getElementById('noteCommands').value
        .split('\n').map(c => c.trim()).filter(c => c !== '');

    if (!title) { showToast('أدخل عنوان الملاحظة', true); return; }
    if (commands.length === 0) { showToast('أدخل الأوامر على الأقل', true); return; }

    if (editingId !== null) {
        const idx = notes.findIndex(n => String(n.id) === String(editingId));
        if (idx > -1) {
            notes[idx] = { ...notes[idx], title, category, desc, commands };
            showToast('تم تحديث الملاحظة بنجاح!');
        }
    } else {
        notes.unshift({ id: Date.now(), title, category, desc, commands });
        showToast('تمت إضافة الملاحظة بنجاح!');
    }

    persist();
    renderNotes();
    closeModal();
}

function deleteNote(id) {
    if (!confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) return;
    notes = notes.filter(n => String(n.id) !== String(id));
    persist();
    renderNotes();
    showToast('تم الحذف بنجاح');
}

/* ============================================================
   التشغيل
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('noteModal').addEventListener('click', function (e) {
        if (e.target === this) closeModal();
    });
    buildCategoryUI();
    renderNotes();
});