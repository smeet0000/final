class TrainerDashboard {
  constructor() {
    this.currentTrainer = null
    this.currentView = "month"
    this.currentDate = new Date()
    this.sessions = []

    this.init()
  }

  init() {
    this.bindEvents()
    this.checkAuthStatus()
    // Check for completed sessions every minute
    setInterval(() => this.checkAndUpdateSessionStatus(), 60000)
  }

  bindEvents() {
    // Login form
    document.getElementById("loginForm").addEventListener("submit", (e) => this.handleLogin(e))

    // Logout
    document.getElementById("logoutBtn").addEventListener("click", () => this.handleLogout())

    // View controls
    document.querySelectorAll(".view-btn, .tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.changeView(e.target.dataset.view))
    })

    // Calendar navigation
    document.getElementById("prevBtn").addEventListener("click", () => this.navigateDate(-1))
    document.getElementById("nextBtn").addEventListener("click", () => this.navigateDate(1))

    // Create session modal
    document.getElementById("createSessionBtn").addEventListener("click", () => this.openCreateModal())
    document.getElementById("closeModal").addEventListener("click", () => this.closeCreateModal())
    document.getElementById("cancelBtn").addEventListener("click", () => this.closeCreateModal())
    document.getElementById("createSessionForm").addEventListener("submit", (e) => this.handleCreateSessions(e))

    // Close modal on outside click
    document.getElementById("createSessionModal").addEventListener("click", (e) => {
      if (e.target.id === "createSessionModal") {
        this.closeCreateModal()
      }
    })

    // Upcoming sessions modal
    document.getElementById("upcomingSessionsBtn").addEventListener("click", () => this.openUpcomingModal())
    document.getElementById("closeUpcomingModal").addEventListener("click", () => this.closeUpcomingModal())

    // Close modal on outside click
    document.getElementById("upcomingSessionsModal").addEventListener("click", (e) => {
      if (e.target.id === "upcomingSessionsModal") {
        this.closeUpcomingModal()
      }
    })
  }

  async handleLogin(e) {
    e.preventDefault()

    const username = document.getElementById("username").value
    const password = document.getElementById("password").value
    const errorDiv = document.getElementById("loginError")
    const btnText = document.getElementById("loginBtnText")
    const spinner = document.getElementById("loginSpinner")

    // Reset UI
    btnText.style.display = "none"
    spinner.style.display = "block"
    errorDiv.style.display = "none"

    try {
      const response = await fetch("api/login.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.trainer) {
        this.currentTrainer = data.trainer
        localStorage.setItem("trainer", JSON.stringify(data.trainer))
        this.showDashboard()
        await this.loadSessions()
      } else {
        errorDiv.textContent = data.error || "Login failed. Please try again."
        errorDiv.style.display = "block"
      }
    } catch (error) {
      console.error("Login error:", error)
      errorDiv.textContent = "Connection error. Please check if the server is running and try again."
      errorDiv.style.display = "block"
    }

    // Reset button state
    btnText.style.display = "block"
    spinner.style.display = "none"
  }

  handleLogout() {
    this.currentTrainer = null
    localStorage.removeItem("trainer")
    document.getElementById("dashboard").style.display = "none"
    document.getElementById("loginPage").style.display = "flex"
    document.getElementById("loginForm").reset()
  }

  checkAuthStatus() {
    const savedTrainer = localStorage.getItem("trainer")
    if (savedTrainer) {
      this.currentTrainer = JSON.parse(savedTrainer)
      this.showDashboard()
      this.loadSessions()
    }
  }

  showDashboard() {
    document.getElementById("loginPage").style.display = "none"
    document.getElementById("dashboard").style.display = "flex"
    document.getElementById("trainerName").textContent = this.currentTrainer.name
    this.updateCalendarView()
  }

  changeView(view) {
    this.currentView = view

    // Update active buttons
    document.querySelectorAll(".view-btn, .tab-btn").forEach((btn) => {
      btn.classList.remove("active")
      if (btn.dataset.view === view) {
        btn.classList.add("active")
      }
    })

    this.updateCalendarView()
  }

  navigateDate(direction) {
    const newDate = new Date(this.currentDate)

    if (this.currentView === "month") {
      newDate.setMonth(newDate.getMonth() + direction)
    } else if (this.currentView === "week") {
      newDate.setDate(newDate.getDate() + direction * 7)
    } else {
      newDate.setDate(newDate.getDate() + direction)
    }

    this.currentDate = newDate
    this.updateCalendarView()
  }

  updateCalendarView() {
    const currentDateEl = document.getElementById("currentDate")
    const calendarView = document.getElementById("calendarView")

    // Update date display
    if (this.currentView === "month") {
      currentDateEl.textContent = this.currentDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
      calendarView.innerHTML = this.renderMonthView()
    } else if (this.currentView === "week") {
      const weekStart = this.getWeekStart(this.currentDate)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      currentDateEl.textContent = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      calendarView.innerHTML = this.renderWeekView()
    } else {
      currentDateEl.textContent = this.currentDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      calendarView.innerHTML = this.renderDayView()
    }
  }

  renderMonthView() {
    const year = this.currentDate.getFullYear()
    const month = this.currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    let html = '<div class="month-grid">'

    // Header
    html += '<div class="month-header">'
    weekdays.forEach((day) => {
      html += `<div class="day-header">${day}</div>`
    })
    html += "</div>"

    // Days
    const current = new Date(startDate)
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        const isCurrentMonth = current.getMonth() === month

        // Fix today comparison
        const today = new Date()
        const isToday =
          current.getFullYear() === today.getFullYear() &&
          current.getMonth() === today.getMonth() &&
          current.getDate() === today.getDate()

        // Create date string in YYYY-MM-DD format to match database format
        const dateStr =
          current.getFullYear() +
          "-" +
          String(current.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(current.getDate()).padStart(2, "0")

        // Filter sessions for this date
        const daySessions = this.sessions.filter((session) => {
          return session.session_date === dateStr
        })

        html += `<div class="day-cell ${!isCurrentMonth ? "other-month" : ""} ${isToday ? "today" : ""}">`
        html += `<div class="day-number">${current.getDate()}</div>`

        // Display sessions with proper color coding
        daySessions.forEach((session) => {
          const statusClass = this.getSessionStatusClass(session)

          html += `<div class="session-item ${statusClass}">
                    <span>${session.session_time} - ${session.title}</span>
                    <button class="delete-session" onclick="dashboard.deleteSession(${session.id})" title="Delete session">×</button>
                </div>`
        })

        html += "</div>"
        current.setDate(current.getDate() + 1)
      }
    }

    html += "</div>"
    return html
  }

  renderWeekView() {
    const weekStart = this.getWeekStart(this.currentDate)
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    let html = '<div class="week-view">'
    html += '<div class="week-grid">'

    // Header
    html += '<div class="time-slot"></div>'
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + i)

      // Create consistent date string format
      const dateStr =
        date.getFullYear() +
        "-" +
        String(date.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(date.getDate()).padStart(2, "0")

      const daySessions = this.sessions.filter((session) => {
        return session.session_date === dateStr
      })

      html += `<div class="day-column">
            <strong>${weekdays[i]}</strong><br>
            <small>${date.getDate()}</small>
            <div style="margin-top: 8px;">`

      daySessions.forEach((session) => {
        const statusClass = this.getSessionStatusClass(session)

        html += `<div class="session-item ${statusClass}" style="margin-bottom: 4px;">
                <span>${session.session_time} - ${session.title}</span>
                <button class="delete-session" onclick="dashboard.deleteSession(${session.id})" title="Delete session">×</button>
            </div>`
      })

      html += "</div></div>"
    }

    html += "</div></div>"
    return html
  }

  renderDayView() {
    // Create consistent date string format
    const dateStr =
      this.currentDate.getFullYear() +
      "-" +
      String(this.currentDate.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(this.currentDate.getDate()).padStart(2, "0")

    const daySessions = this.sessions
      .filter((session) => {
        return session.session_date === dateStr
      })
      .sort((a, b) => a.session_time.localeCompare(b.session_time))

    let html = '<div class="day-view">'

    if (daySessions.length === 0) {
      html += '<div style="text-align: center; padding: 40px; color: #718096;">No sessions scheduled for this day</div>'
    } else {
      html += '<div class="day-sessions">'
      daySessions.forEach((session) => {
        const statusClass = this.getSessionCardStatusClass(session)
        const statusText = this.getSessionStatusText(session)

        html += `<div class="session-card ${statusClass}">
                <div class="session-info">
                    <h4>${session.title}${statusText}</h4>
                    <div class="session-details">
                        <div>🕒 ${session.session_time} (${session.duration} min)</div>
                        <div>👤 ${session.client_name}</div>
                        <div>📋 ${session.session_type}</div>
                        ${session.description ? `<div>📝 ${session.description}</div>` : ""}
                    </div>
                </div>
                <div class="session-actions">
                    <button class="delete-btn" onclick="dashboard.deleteSession(${session.id})">Delete</button>
                </div>
            </div>`
      })
      html += "</div>"
    }

    html += "</div>"
    return html
  }

  getWeekStart(date) {
    const start = new Date(date)
    start.setDate(date.getDate() - date.getDay())
    return start
  }

  // Check if a session is completed by time (past its end time)
  isSessionTimeCompleted(session) {
    const now = new Date()
    const sessionDate = new Date(session.session_date + "T" + session.session_time)
    const sessionEndTime = new Date(sessionDate.getTime() + session.duration * 60000)

    return now > sessionEndTime
  }

  // Get session status class for calendar items
  getSessionStatusClass(session) {
    // If manually completed or started, use that status
    if (session.status === "started") {
      return "session-started"
    } else if (session.status === "completed") {
      return "session-completed"
    }

    // If time has passed and not manually started/completed, mark as time-completed (black)
    if (this.isSessionTimeCompleted(session)) {
      return "session-time-completed"
    }

    // Default scheduled status
    return "session-scheduled"
  }

  // Get session status class for day view cards
  getSessionCardStatusClass(session) {
    if (session.status === "started") {
      return "session-card-started"
    } else if (session.status === "completed") {
      return "session-card-completed"
    }

    if (this.isSessionTimeCompleted(session)) {
      return "session-card-time-completed"
    }

    return "session-card-scheduled"
  }

  // Get session status text
  getSessionStatusText(session) {
    if (session.status === "started") {
      return " (In Progress)"
    } else if (session.status === "completed") {
      return " (Completed)"
    }

    if (this.isSessionTimeCompleted(session)) {
      return " (Time Completed)"
    }

    return ""
  }

  // Get session status (upcoming, ongoing, completed)
  getSessionStatus(session) {
    const now = new Date()
    const sessionDate = new Date(session.session_date + "T" + session.session_time)
    const sessionEndTime = new Date(sessionDate.getTime() + session.duration * 60000)

    if (now < sessionDate) {
      return "upcoming"
    } else if (now >= sessionDate && now <= sessionEndTime) {
      return "ongoing"
    } else {
      return "completed"
    }
  }

  // Check and update session status
  async checkAndUpdateSessionStatus() {
    if (!this.currentTrainer) return

    let hasUpdates = false

    // Check for sessions that should be automatically marked as time-completed
    for (const session of this.sessions) {
      if (this.isSessionTimeCompleted(session) && session.status !== "completed" && session.status !== "started") {
        // Don't auto-update if manually started or completed
        hasUpdates = true
      }
    }

    if (hasUpdates) {
      // Just refresh the display - we'll handle the visual state in the frontend
      this.updateCalendarView()

      // If upcoming modal is open, refresh it
      const modal = document.getElementById("upcomingSessionsModal")
      if (modal.style.display === "flex") {
        this.openUpcomingModal()
      }
    }
  }

  async loadSessions() {
    try {
      const response = await fetch(`api/sessions.php?trainer_id=${this.currentTrainer.id}`)
      const data = await response.json()

      if (data.success) {
        this.sessions = data.sessions
        this.updateStats()
        this.updateCalendarView()
      }
    } catch (error) {
      console.error("Error loading sessions:", error)
    }
  }

  updateStats() {
    const totalSessions = this.sessions.length

    // Create consistent date string for today
    const today = new Date()
    const todayStr =
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0")

    const upcomingSessions = this.sessions.filter((session) => {
      return session.session_date >= todayStr && !this.isSessionTimeCompleted(session)
    }).length

    document.getElementById("totalSessions").textContent = totalSessions
    document.getElementById("upcomingSessions").textContent = upcomingSessions
  }

  openCreateModal() {
    document.getElementById("createSessionModal").style.display = "flex"
    // Set default dates
    const today = new Date()
    const nextWeek = new Date()
    nextWeek.setDate(today.getDate() + 7)

    document.getElementById("startDate").value = today.toISOString().split("T")[0]
    document.getElementById("endDate").value = nextWeek.toISOString().split("T")[0]
  }

  closeCreateModal() {
    document.getElementById("createSessionModal").style.display = "none"
    document.getElementById("createSessionForm").reset()
  }

  async handleCreateSessions(e) {
    e.preventDefault()

    const formData = new FormData(e.target)
    const submitBtn = document.getElementById("submitBtnText")
    const spinner = document.getElementById("submitSpinner")

    submitBtn.style.display = "none"
    spinner.style.display = "block"

    // Get selected weekdays
    const selectedDays = Array.from(document.querySelectorAll('input[name="weekdays"]:checked')).map((cb) =>
      Number.parseInt(cb.value),
    )

    if (selectedDays.length === 0) {
      alert("Please select at least one day of the week")
      submitBtn.style.display = "block"
      spinner.style.display = "none"
      return
    }

    // Generate sessions for date range
    const sessions = this.generateSessionsForDateRange(formData, selectedDays)

    try {
      const response = await fetch("api/sessions.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trainer_id: this.currentTrainer.id,
          sessions: sessions,
        }),
      })

      const data = await response.json()

      if (data.success) {
        await this.loadSessions()
        this.closeCreateModal()
        alert(`${sessions.length} sessions created successfully!`)
      } else {
        alert("Error creating sessions: " + (data.error || "Unknown error"))
      }
    } catch (error) {
      alert("Connection error. Please try again.")
    }

    submitBtn.style.display = "block"
    spinner.style.display = "none"
  }

  generateSessionsForDateRange(formData, selectedDays) {
    const sessions = []
    const startDate = new Date(formData.get("startDate"))
    const endDate = new Date(formData.get("endDate"))
    const startTime = formData.get("startTime")
    const endTime = formData.get("endTime")

    // Calculate duration in minutes
    const start = new Date(`2000-01-01T${startTime}:00`)
    const end = new Date(`2000-01-01T${endTime}:00`)
    const duration = (end - start) / (1000 * 60)

    const current = new Date(startDate)

    while (current <= endDate) {
      if (selectedDays.includes(current.getDay())) {
        sessions.push({
          title: formData.get("title"),
          client: formData.get("client"),
          date: current.toISOString().split("T")[0],
          time: startTime,
          duration: duration,
          type: formData.get("type"),
          description: formData.get("description") || "",
        })
      }
      current.setDate(current.getDate() + 1)
    }

    return sessions
  }

  async deleteSession(sessionId) {
    if (!confirm("Are you sure you want to delete this session?")) {
      return
    }

    try {
      const response = await fetch("api/sessions.php", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: sessionId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        await this.loadSessions()
        alert("Session deleted successfully!")
      } else {
        alert("Error deleting session: " + (data.error || "Unknown error"))
      }
    } catch (error) {
      console.error("Error deleting session:", error)
      alert("Connection error. Please try again.")
    }
  }

  openUpcomingModal() {
    const modal = document.getElementById("upcomingSessionsModal")
    const sessionsList = document.getElementById("upcomingSessionsList")

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0]

    // Filter sessions for today and future dates, exclude time-completed sessions
    const upcomingSessions = this.sessions
      .filter((session) => {
        return session.session_date >= today && !this.isSessionTimeCompleted(session)
      })
      .sort((a, b) => {
        // Sort by date first, then by time
        if (a.session_date === b.session_date) {
          return a.session_time.localeCompare(b.session_time)
        }
        return a.session_date.localeCompare(b.session_date)
      })

    let html = ""

    if (upcomingSessions.length === 0) {
      html = `
        <div style="text-align: center; padding: 40px; color: #718096;">
          <div style="font-size: 48px; margin-bottom: 16px;">📅</div>
          <p>No upcoming sessions scheduled</p>
        </div>
      `
    } else {
      // Group sessions by date
      const sessionsByDate = {}
      upcomingSessions.forEach((session) => {
        if (!sessionsByDate[session.session_date]) {
          sessionsByDate[session.session_date] = []
        }
        sessionsByDate[session.session_date].push(session)
      })

      // Render sessions grouped by date
      Object.keys(sessionsByDate).forEach((date) => {
        const dateObj = new Date(date + "T00:00:00")
        const isToday = date === today
        const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" })
        const formattedDate = dateObj.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })

        html += `
          <div class="date-group">
            <h3 class="date-header ${isToday ? "today-header" : ""}">
              ${isToday ? "🔥 Today - " : ""}${dayName}, ${formattedDate}
              <span class="session-count">(${sessionsByDate[date].length} session${sessionsByDate[date].length !== 1 ? "s" : ""})</span>
            </h3>
        `

        sessionsByDate[date].forEach((session) => {
          const statusClass = this.getStatusClass(session.status)
          const statusText = this.getStatusText(session.status)

          html += `
            <div class="upcoming-session-card ${statusClass}" style="margin-bottom: 12px;">
              <div class="session-header">
                <h4>${session.title}</h4>
                <span class="status-badge status-${session.status || "scheduled"}">${statusText}</span>
              </div>
              <div class="session-details">
                <div>🕒 ${session.session_time} (${session.duration} min)</div>
                <div>👤 ${session.client_name}</div>
                <div>📋 ${session.session_type}</div>
                ${session.description ? `<div>📝 ${session.description}</div>` : ""}
              </div>
              <div class="session-actions">
                ${this.getSessionActionButtons(session)}
              </div>
            </div>
          `
        })

        html += "</div>"
      })
    }

    sessionsList.innerHTML = html
    modal.style.display = "flex"
  }

  // Add helper methods for upcoming sessions
  getStatusClass(status) {
    switch (status) {
      case "started":
        return "status-started"
      case "completed":
        return "status-completed"
      default:
        return ""
    }
  }

  getStatusText(status) {
    switch (status) {
      case "started":
        return "In Progress"
      case "completed":
        return "Completed"
      default:
        return "Scheduled"
    }
  }

  getSessionActionButtons(session) {
    // Don't show start button if session time has already passed
    if (this.isSessionTimeCompleted(session)) {
      return '<span class="completed-badge">Time Completed</span>'
    }

    if (session.status === "completed") {
      return '<span class="completed-badge">Session Completed</span>'
    } else if (session.status === "started") {
      return `<button class="end-session-btn" onclick="dashboard.endSession(${session.id})">🔲 End Session</button>`
    } else {
      return `<button class="start-session-btn" onclick="dashboard.startSession(${session.id})">▶️ Start Session</button>`
    }
  }

  // Add session status management methods
  async startSession(sessionId) {
    // Check if session time has already passed
    const session = this.sessions.find((s) => s.id == sessionId)
    if (session && this.isSessionTimeCompleted(session)) {
      alert("Cannot start session - the scheduled time has already passed.")
      return
    }

    try {
      const response = await fetch("api/sessions.php", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: sessionId,
          status: "started",
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Update local session status
        const sessionIndex = this.sessions.findIndex((s) => s.id == sessionId)
        if (sessionIndex !== -1) {
          this.sessions[sessionIndex].status = "started"
        }

        // Refresh the upcoming modal and calendar
        this.openUpcomingModal()
        this.updateCalendarView()
      } else {
        alert("Error starting session: " + (data.error || "Unknown error"))
      }
    } catch (error) {
      console.error("Error starting session:", error)
      alert("Connection error. Please try again.")
    }
  }

  async endSession(sessionId) {
    try {
      const response = await fetch("api/sessions.php", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: sessionId,
          status: "completed",
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Update local session status
        const sessionIndex = this.sessions.findIndex((s) => s.id == sessionId)
        if (sessionIndex !== -1) {
          this.sessions[sessionIndex].status = "completed"
        }

        // Refresh the upcoming modal and calendar
        this.openUpcomingModal()
        this.updateCalendarView()
      } else {
        alert("Error ending session: " + (data.error || "Unknown error"))
      }
    } catch (error) {
      console.error("Error ending session:", error)
      alert("Connection error. Please try again.")
    }
  }

  closeUpcomingModal() {
    document.getElementById("upcomingSessionsModal").style.display = "none"
  }
}
