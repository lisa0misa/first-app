
/* =========================================
   State Management & Initialization
   ========================================= */
const STORAGE_KEY = 'sumikko_calendar_events';
let events = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

let currentDate = new Date();
let selectedColor = 'var(--baby-blue)'; // Default color

// DOM Elements
const calendarGrid = document.getElementById('calendarGrid');
const monthYearDisplay = document.getElementById('monthYearDisplay');
const eventModal = document.getElementById('eventModal');
const eventForm = document.getElementById('eventForm');

// Init
document.addEventListener('DOMContentLoaded', () => {
    renderCalendar();
    setupEventListeners();
});

/* =========================================
   Calendar Rendering Logic
   ========================================= */
function renderCalendar() {
    calendarGrid.innerHTML = '';
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Format Month/Year Title
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    monthYearDisplay.innerText = `${monthNames[month]} ${year}`;

    // Calculation variables
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0(Sun) - 6(Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    // Total grid cells needed (rows * 7 columns) -> typically 42 to keep layout steady
    const totalCells = 42; 

    // 1. Render overflow days from PREVIOUS month
    for (let i = firstDayOfMonth; i > 0; i--) {
        const prevDate = daysInPrevMonth - i + 1;
        const dateString = formatDateString(year, month - 1, prevDate);
        createDayElement(prevDate, dateString, true);
    }

    // 2. Render actual days of CURRENT month
    for (let i = 1; i <= daysInMonth; i++) {
        const dateString = formatDateString(year, month, i);
        const isToday = checkIsToday(year, month, i);
        createDayElement(i, dateString, false, isToday);
    }

    // 3. Render overflow days from NEXT month
    const remainingCells = totalCells - (firstDayOfMonth + daysInMonth);
    for (let i = 1; i <= remainingCells; i++) {
        const dateString = formatDateString(year, month + 1, i);
        createDayElement(i, dateString, true);
    }
}

// Helper: Create a single day block in the grid
function createDayElement(dayNum, dateString, isOverflow, isToday = false) {
    const dayDiv = document.createElement('div');
    dayDiv.classList.add('day');
    if (isOverflow) dayDiv.classList.add('overflow');
    if (isToday) dayDiv.classList.add('today');
    dayDiv.dataset.date = dateString;

    const dayNumDiv = document.createElement('div');
    dayNumDiv.classList.add('day-number');
    dayNumDiv.innerText = dayNum;
    dayDiv.appendChild(dayNumDiv);

    // Container for events
    const eventsContainer = document.createElement('div');
    eventsContainer.classList.add('events-container');

    // Render events for this date
    const dayEvents = events.filter(e => e.date === dateString);
    // Sort events by time if available
    dayEvents.sort((a, b) => (a.time || '24:00').localeCompare(b.time || '24:00'));

    dayEvents.forEach(event => {
        const eventPill = document.createElement('div');
        eventPill.classList.add('event-pill');
        eventPill.style.backgroundColor = event.color;
        eventPill.innerText = event.time ? `${event.time} ${event.title}` : event.title;
        
        // Clicking an event edits it (stopPropagation so day click doesn't trigger)
        eventPill.addEventListener('click', (e) => {
            e.stopPropagation();
            openModal(event);
        });
        eventsContainer.appendChild(eventPill);
    });

    dayDiv.appendChild(eventsContainer);

    // Clicking a day opens modal to add new event on that date
    dayDiv.addEventListener('click', () => {
        openModal(null, dateString);
    });

    calendarGrid.appendChild(dayDiv);
}

/* =========================================
   Date Helpers
   ========================================= */
function formatDateString(year, month, day) {
    // Handle month wrapping for accurate string generation
    const d = new Date(year, month, day);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dt = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dt}`; // YYYY-MM-DD
}

function checkIsToday(year, month, day) {
    const today = new Date();
    return year === today.getFullYear() && 
           month === today.getMonth() && 
           day === today.getDate();
}

/* =========================================
   Event Listeners Setup
   ========================================= */
function setupEventListeners() {
    // Navigation
    document.getElementById('btnPrev').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('btnNext').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    document.getElementById('btnToday').addEventListener('click', () => {
        currentDate = new Date();
        renderCalendar();
    });

    // Modal specific
    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('btnDeleteEvent').addEventListener('click', deleteEvent);
    eventForm.addEventListener('submit', saveEvent);

    // Close modal on clicking outside overlay
    eventModal.addEventListener('click', (e) => {
        if (e.target === eventModal) closeModal();
    });

    // Color Picker selection logic
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', (e) => {
            document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
            e.target.classList.add('selected');
            selectedColor = e.target.getAttribute('data-color');
        });
    });
}

/* =========================================
   Modal Operations (Add / Edit / Delete)
   ========================================= */
function openModal(existingEvent = null, dateString = null) {
    const titleEl = document.getElementById('modalTitle');
    const deleteBtn = document.getElementById('btnDeleteEvent');
    
    // Reset Form
    eventForm.reset();
    document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));

    if (existingEvent) {
        // EDIT MODE
        titleEl.innerText = "✨ Edit Event";
        deleteBtn.style.display = "block";
        
        document.getElementById('eventId').value = existingEvent.id;
        document.getElementById('eventTitle').value = existingEvent.title;
        document.getElementById('eventDate').value = existingEvent.date;
        document.getElementById('eventTime').value = existingEvent.time || '';
        document.getElementById('eventDesc').value = existingEvent.desc || '';
        
        // Set color picker
        selectedColor = existingEvent.color || 'var(--baby-blue)';
        const colorOpt = document.querySelector(`.color-option[data-color="${selectedColor}"]`);
        if (colorOpt) colorOpt.classList.add('selected');
    } else {
        // ADD MODE
        titleEl.innerText = "🌟 Add New Event";
        deleteBtn.style.display = "none";
        document.getElementById('eventId').value = '';
        document.getElementById('eventDate').value = dateString;
        
        // Default color setup
        selectedColor = 'var(--baby-blue)';
        document.querySelector(`.color-option[data-color="var(--baby-blue)"]`).classList.add('selected');
    }

    eventModal.classList.add('active');
}

function closeModal() {
    eventModal.classList.remove('active');
}

function saveEvent(e) {
    e.preventDefault(); // Prevent standard form submission

    const id = document.getElementById('eventId').value;
    const title = document.getElementById('eventTitle').value.trim();
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;
    const desc = document.getElementById('eventDesc').value.trim();

    if (!title || !date) return; // Basic validation check

    if (id) {
        // Update existing event
        const eventIndex = events.findIndex(ev => ev.id === id);
        if (eventIndex > -1) {
            events[eventIndex] = { id, title, date, time, desc, color: selectedColor };
        }
    } else {
        // Create new event (generate unique ID based on timestamp)
        const newEvent = {
            id: Date.now().toString(),
            title, date, time, desc, color: selectedColor
        };
        events.push(newEvent);
    }

    persistAndRender();
    closeModal();
}

function deleteEvent() {
    const id = document.getElementById('eventId').value;
    if (id && confirm("Are you sure you want to delete this event? 😿")) {
        events = events.filter(ev => ev.id !== id);
        persistAndRender();
        closeModal();
    }
}

function persistAndRender() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    renderCalendar();
}