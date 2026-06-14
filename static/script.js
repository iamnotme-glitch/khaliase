const searchResult = document.getElementById("search-result");
const filterGroup = document.getElementById("room-filter");
const dayGroup = document.getElementById("day-filter");
const periodGroup = document.getElementById("period-filter");

let activeDay = "Sunday";
let activePeriod = "";
let activeFilter = "all";

async function fetchSchedule() {
    try {
        const response = await fetch("/api/room-schedule");
        const data = await response.json();

        if (!response.ok) {
            searchResult.innerHTML = `<div class="empty-state"><p>Unable to load schedule data.</p></div>`;
            return;
        }

        if (periodGroup && Array.isArray(data.periods)) {
            periodGroup.innerHTML = data.periods
                .map((period, index) => {
                    const label = period.split(" - ")[0]; 
                    return `<button type="button" class="filter-item${index === 0 ? " active" : ""}" data-value="${period}">${label}</button>`;
                })
                .join("");
            activePeriod = data.periods[0] || "";
        }
        
        handleSearch();
    } catch (error) {
        searchResult.innerHTML = `<div class="empty-state"><p>Connection error. Please try again.</p></div>`;
    }
}

function parseFloorName(room) {
    const upper = room.toUpperCase();
    if (upper.startsWith("AN1-") || upper.startsWith("AN2-")) return "Annex";
    if (upper === "UB0000") return null;
    if (upper.startsWith("FT")) return "Facilities Tower";

    const match = upper.match(/^([0-9]{1,2})/);
    if (match) {
        const floorNumber = Number(match[1]);
        const suffix = floorNumber === 1 ? "st" : floorNumber === 2 ? "nd" : floorNumber === 3 ? "rd" : "th";
        return `${floorNumber}${suffix} Floor`;
    }

    return "Other";
}

function formatGroupedRooms(rooms) {
    const groups = {};
    rooms.forEach((room) => {
        const floor = parseFloorName(room);
        if (!floor) return;
        groups[floor] = groups[floor] || [];
        groups[floor].push(room);
    });

    const order = [
        "Annex",
        "Facilities Tower",
        "1st Floor",
        "2nd Floor",
        "3rd Floor",
        "4th Floor",
        "5th Floor",
        "6th Floor",
        "7th Floor",
        "8th Floor",
        "9th Floor",
        "10th Floor",
        "11th Floor",
        "12th Floor",
        "Other",
    ];

    const html = order
        .filter((key) => groups[key])
        .map((key) => {
            const list = groups[key].sort((a, b) => a.localeCompare(b));
            const cards = list.map((r) => `
                <div class="room-card">
                    <span class="room-name">${r}</span>
                </div>
            `).join("");
            
            return `
                <section class="floor-section">
                    <h2 class="floor-title">${key}</h2>
                    <div class="room-grid">
                        ${cards}
                    </div>
                </section>
            `;
        })
        .join("");

    return html;
}

function roomTypeOf(room) {
    if (!room || typeof room !== 'string') return null;
    const last = room.trim().slice(-1).toUpperCase();
    if (last === 'C' || last === 'T') return 'class';
    if (last === 'L') return 'lab';
    return 'other';
}

function applyFilter(rooms, filter) {
    if (!filter || filter === 'all') return rooms;
    if (filter === 'class') return rooms.filter((r) => roomTypeOf(r) === 'class');
    if (filter === 'lab') return rooms.filter((r) => roomTypeOf(r) === 'lab');
    return rooms;
}

function updateGroupButtons(group, selectedValue) {
    if (!group) return;
    const buttons = group.querySelectorAll(".filter-item");
    buttons.forEach((button) => {
        button.classList.toggle("active", button.dataset.value === selectedValue);
    });
}

function onToggleClick(event) {
    const button = event.target.closest(".filter-item");
    if (!button) return;
    
    const value = button.dataset.value;
    const group = button.parentElement;
    
    if (group === dayGroup) {
        activeDay = value;
    } else if (group === periodGroup) {
        activePeriod = value;
    } else if (group === filterGroup) {
        activeFilter = value;
    }
    
    updateGroupButtons(group, value);
    handleSearch();
}

async function handleSearch() {
    const day = activeDay;
    const period = activePeriod;
    const filter = activeFilter;

    if (!period) return;

    searchResult.innerHTML = `<div class="empty-state"><p>Updating results...</p></div>`;

    try {
        const response = await fetch(`/api/free-rooms?day=${encodeURIComponent(day)}&period=${encodeURIComponent(period)}`);
        const data = await response.json();

        if (!response.ok) {
            searchResult.innerHTML = `<div class="empty-state"><p>${data.error || "Search error."}</p></div>`;
            return;
        }

        const filtered = applyFilter(data.free_rooms, filter);
        
        if (!filtered.length) {
            searchResult.innerHTML = `<div class="empty-state"><p>No rooms available for ${period} on ${day}.</p></div>`;
            return;
        }

        searchResult.innerHTML = formatGroupedRooms(filtered);
    } catch (error) {
        searchResult.innerHTML = `<div class="empty-state"><p>Search failed. Check your connection.</p></div>`;
    }
}

dayGroup.addEventListener("click", onToggleClick);
periodGroup.addEventListener("click", onToggleClick);
filterGroup.addEventListener("click", onToggleClick);

// Initial fetch
fetchSchedule();
