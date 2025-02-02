document.addEventListener('DOMContentLoaded', function () {
  const calendarEl = document.getElementById('calendar');
  const countEl = document.getElementById('count');
  const streakEl = document.getElementById('streak');
  const currentStreakEl = document.getElementById('currentStreak');
  const weeklyCountEl = document.getElementById('weeklyCount');
  const monthlyCountEl = document.getElementById('monthlyCount');
  const resetButton = document.getElementById('resetButton');
  const progressBar = document.getElementById('progressBar');
  const chartCanvas = document.getElementById('habitChart').getContext('2d');
  const downloadPDFButton = document.getElementById('downloadPDF');

  let savedDates = JSON.parse(localStorage.getItem('savedDates')) || {};
  let count = Object.values(savedDates).reduce((sum, val) => sum + val, 0);
  let longestStreak = JSON.parse(localStorage.getItem('longestStreak')) || 0;
  let currentStreak = 0;

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    dateClick: function (info) {
      const dateStr = info.dateStr;
      if (!savedDates[dateStr]) {
        savedDates[dateStr] = 1;
      } else {
        savedDates[dateStr]++;
      }
      count = Object.values(savedDates).reduce((sum, val) => sum + val, 0);
      localStorage.setItem('savedDates', JSON.stringify(savedDates));
      countEl.textContent = count;
      updateCalendar();
      updateChart();
      updateStats();
    },
    events: Object.keys(savedDates).map(date => ({
      title: `${savedDates[date]}x`,
      date
    })),
    eventClick: function (info) {
      const dateStr = info.event.startStr;
      if (savedDates[dateStr] > 1) {
        savedDates[dateStr]--;
      } else {
        delete savedDates[dateStr];
      }
      localStorage.setItem('savedDates', JSON.stringify(savedDates));
      count = Object.values(savedDates).reduce((sum, val) => sum + val, 0);
      countEl.textContent = count;
      updateCalendar();
      updateChart();
      updateStats();
    }
  });

  function updateCalendar() {
    calendar.removeAllEvents();
    Object.keys(savedDates).forEach(date => {
      calendar.addEvent({ title: `${savedDates[date]}x`, date });
    });
  }

  resetButton.addEventListener('click', function () {
    localStorage.setItem('longestStreak', JSON.stringify(longestStreak));  // Keep longest streak
    savedDates = {};  // Clear session data
    count = 0;
    countEl.textContent = count;
    streakEl.textContent = longestStreak;
    currentStreakEl.textContent = 0;
    calendar.removeAllEvents();
    updateChart();
    updateStats();
  });

 function updateStats() {
    let today = new Date().toISOString().split('T')[0];
    let days = Object.keys(savedDates).sort();
    
    let currentStreakCount = 0;
    let maxStreak = 0;
    let lastDate = null;
    
    // If no recorded events, assume the streak is today - first recorded event
    if (days.length === 0) {
        currentStreakCount = (new Date() - new Date(localStorage.getItem('startDate') || today)) / (1000 * 60 * 60 * 24);
    } else {
        // Calculate longest no-masturbation streak
        for (let i = 0; i < days.length; i++) {
            let current = new Date(days[i]);

            if (lastDate) {
                let diff = (current - lastDate) / (1000 * 60 * 60 * 24);
                maxStreak = Math.max(maxStreak, diff - 1); // Subtract 1 to exclude masturbation days
            }
            lastDate = current;
        }

        // Check current streak (days since last event)
        let lastMasturbationDate = new Date(days[days.length - 1]);
        currentStreakCount = (new Date(today) - lastMasturbationDate) / (1000 * 60 * 60 * 24);
    }

    // Update values in UI
    longestStreak = Math.max(longestStreak, maxStreak);
    localStorage.setItem('longestStreak', JSON.stringify(longestStreak)); 
    streakEl.textContent = longestStreak;
    currentStreakEl.textContent = currentStreakCount;

    // Weekly & Monthly Stats
    let weeklyCount = 0, monthlyCount = 0;
    let todayDate = new Date();
    let oneWeekAgo = new Date();
    let oneMonthAgo = new Date();
    oneWeekAgo.setDate(todayDate.getDate() - 7);
    oneMonthAgo.setMonth(todayDate.getMonth() - 1);

    Object.keys(savedDates).forEach(date => {
        let entryDate = new Date(date);
        if (entryDate >= oneWeekAgo) weeklyCount += savedDates[date];
        if (entryDate >= oneMonthAgo) monthlyCount += savedDates[date];
    });

    weeklyCountEl.textContent = weeklyCount;
    monthlyCountEl.textContent = monthlyCount;

    // Update Progress Bar (normalize to 100)
    progressBar.style.width = (Math.max(0, 100 - Math.min(count * 3, 100))) + "%";
}

  const chart = new Chart(chartCanvas, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Sessions', data: [] }] },
  });

  function updateChart() {
    // Use weekly summaries for the chart to avoid clutter
    let weeklyData = {};
    Object.keys(savedDates).forEach(date => {
      let entryDate = new Date(date);
      let weekStart = new Date(entryDate.setDate(entryDate.getDate() - entryDate.getDay())).toISOString().split('T')[0];  // Start of the week
      if (!weeklyData[weekStart]) weeklyData[weekStart] = 0;
      weeklyData[weekStart] += savedDates[date];
    });

    chart.data.labels = Object.keys(weeklyData);
    chart.data.datasets[0].data = Object.values(weeklyData);
    chart.update();
  }

  
  

  calendar.render();
  updateStats();
});