class CalendarWidget extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({ mode: "open" });

        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth();
        this.selectedDate = null;
        this.boundDates = [];

        this.render();
    }

    /*
     * SAC calls this lifecycle function when the widget's
     * properties or data binding are updated.
     */
    onCustomWidgetAfterUpdate(changedProps) {
        this.readDateDimension();
        this.render();
    }

    readDateDimension() {
        this.boundDates = [];

        try {
            const binding = this.dateData;

            if (!binding || !Array.isArray(binding.data)) {
                return;
            }

            const seen = new Set();

            binding.data.forEach((row) => {
                const keys = Object.keys(row);

                keys.forEach((key) => {
                    if (!key.startsWith("dateDimension_")) {
                        return;
                    }

                    const cell = row[key];
                    if (!cell) {
                        return;
                    }

                    const value = cell.id || cell.label || cell.formatted || cell.raw;
                    if (value === undefined || value === null) {
                        return;
                    }

                    const parsed = this.parseDateValue(String(value));

                    if (parsed) {
                        const iso = this.toISODate(parsed);
                        if (!seen.has(iso)) {
                            seen.add(iso);
                            this.boundDates.push(iso);
                        }
                    }
                });
            });

            this.boundDates.sort();

            // If SAC supplied dates, open the calendar on the first one.
            if (this.boundDates.length > 0) {
                const first = this.fromISODate(this.boundDates[0]);
                this.currentYear = first.getFullYear();
                this.currentMonth = first.getMonth();
            }
        } catch (e) {
            console.error("Calendar Widget: unable to read date dimension.", e);
        }
    }

    parseDateValue(value) {
        // Common SAC/date formats:
        // YYYY-MM-DD
        // YYYYMMDD
        // YYYY.MM.DD
        // YYYY/MM/DD
        let match = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
        if (match) {
            return new Date(
                Number(match[1]),
                Number(match[2]) - 1,
                Number(match[3])
            );
        }

        match = value.match(/^(\d{4})(\d{2})(\d{2})$/);
        if (match) {
            return new Date(
                Number(match[1]),
                Number(match[2]) - 1,
                Number(match[3])
            );
        }

        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
            return new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate()
            );
        }

        return null;
    }

    toISODate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    fromISODate(value) {
        const parts = value.split("-").map(Number);
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    render() {
        const monthNames = [
            "January", "February", "March", "April",
            "May", "June", "July", "August",
            "September", "October", "November", "December"
        ];

        const firstDay = new Date(
            this.currentYear,
            this.currentMonth,
            1
        ).getDay();

        const daysInMonth = new Date(
            this.currentYear,
            this.currentMonth + 1,
            0
        ).getDate();

        const today = this.toISODate(new Date());

        let daysHTML = "";

        for (let i = 0; i < firstDay; i++) {
            daysHTML += `<div class="empty"></div>`;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(
                this.currentYear,
                this.currentMonth,
                day
            );

            const iso = this.toISODate(date);
            const isAvailable =
                this.boundDates.length === 0 ||
                this.boundDates.includes(iso);

            const isToday = iso === today;
            const isSelected = iso === this.selectedDate;

            daysHTML += `
                <button
                    class="day ${isAvailable ? "available" : "disabled"} ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}"
                    data-date="${iso}"
                    ${isAvailable ? "" : "disabled"}
                    title="${isAvailable ? iso : "No date member in the selected Date dimension"}"
                >
                    ${day}
                </button>
            `;
        }

        const dataMessage =
            this.boundDates.length > 0
                ? `${this.boundDates.length} date member(s) loaded`
                : "Drag a Date dimension to this widget";

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    height: 100%;
                    min-width: 280px;
                    min-height: 300px;
                    font-family: Arial, sans-serif;
                }

                * {
                    box-sizing: border-box;
                }

                .calendar {
                    width: 100%;
                    height: 100%;
                    min-height: 300px;
                    background: #ffffff;
                    border: 1px solid #cbbdef;
                    border-radius: 20px;
                    box-shadow: 0 8px 8px rgba(2, 2, 2, 0.2);
                    padding: 16px;
                    overflow: hidden;
                }

                .header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 12px;
                }

                .title {
                    font-size: 20px;
                    font-weight: 700;
                }

                .nav {
                    display: flex;
                    gap: 4px;
                }

                .nav button {
                    border: 0;
                    background: transparent;
                    cursor: pointer;
                    font-size: 18px;
                    padding: 5px 8px;
                    border-radius: 8px;
                }

                .nav button:hover {
                    background: #f0eef8;
                }

                .weekdays,
                .days {
                    display: grid;
                    grid-template-columns: repeat(7, minmax(0, 1fr));
                    gap: 4px;
                    text-align: center;
                }

                .weekday {
                    font-size: 11px;
                    font-weight: 700;
                    padding: 5px 0;
                }

                .day {
                    border: 0;
                    background: transparent;
                    border-radius: 8px;
                    padding: 7px 2px;
                    cursor: pointer;
                    font-size: 13px;
                }

                .day.available:hover {
                    background: #eeeaf9;
                }

                .day.disabled {
                    color: #c9c9c9;
                    cursor: default;
                }

                .day.today {
                    outline: 1px solid #999999;
                }

                .day.selected {
                    background: #cbbdef;
                    font-weight: 700;
                }

                .empty {
                    min-height: 30px;
                }

                .status {
                    margin-top: 10px;
                    font-size: 11px;
                    color: #666666;
                    text-align: center;
                }
            </style>

            <div class="calendar">
                <div class="header">
                    <div class="title">
                        ${monthNames[this.currentMonth]} ${this.currentYear}
                    </div>

                    <div class="nav">
                        <button id="previous" title="Previous month">‹</button>
                        <button id="next" title="Next month">›</button>
                    </div>
                </div>

                <div class="weekdays">
                    <div class="weekday">Sun</div>
                    <div class="weekday">Mon</div>
                    <div class="weekday">Tue</div>
                    <div class="weekday">Wed</div>
                    <div class="weekday">Thu</div>
                    <div class="weekday">Fri</div>
                    <div class="weekday">Sat</div>
                </div>

                <div class="days">
                    ${daysHTML}
                </div>

                <div class="status">
                    ${dataMessage}
                </div>
            </div>
        `;

        this.addEvents();
    }

    addEvents() {
        const previous = this.shadowRoot.getElementById("previous");
        const next = this.shadowRoot.getElementById("next");

        previous.addEventListener("click", () => {
            this.currentMonth--;

            if (this.currentMonth < 0) {
                this.currentMonth = 11;
                this.currentYear--;
            }

            this.render();
        });

        next.addEventListener("click", () => {
            this.currentMonth++;

            if (this.currentMonth > 11) {
                this.currentMonth = 0;
                this.currentYear++;
            }

            this.render();
        });

        this.shadowRoot.querySelectorAll(".day.available").forEach((button) => {
            button.addEventListener("click", () => {
                this.selectedDate = button.dataset.date;

                // For now, selection is displayed locally.
                // SAC event/script integration can be added next.
                this.render();

                console.log("Selected date:", this.selectedDate);
            });
        });
    }
}

customElements.define(
    "com-umer-calendarwidget",
    CalendarWidget
);
