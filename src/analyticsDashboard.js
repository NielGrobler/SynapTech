// Define the reports array
const reports = [
  {
    title: 'Used vs. Available',
    description: 'Track resource utilization across projects',
    icon: 'bx bx-pie-chart-alt-2 report-icon-resource',
    link: '/reports/resource-usage',
  },
  {
    title: 'Completion Status',
    description: 'Monitor progress per project',
    icon: 'bx bx-bar-chart-alt-2 report-icon-completion',
    link: '/reports/completion-status',
  },
  {
    title: 'Customizable Report',
    description: 'Create and customize your own reports',
    icon: 'bx bx-customize report-icon-custom',
    link: '/reports/custom',
  },
];

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('reportCardsContainer');

  // Check if the container exists before trying to manipulate it
  if (!container) {
    console.error('Could not find reportCardsContainer element');
    return;
  }

  function renderReportCards() {
    container.innerHTML = '';
    reports.forEach((report) => {
      const card = document.createElement('article');
      card.className = 'report-card shadow border-solid-thin';
      card.onclick = () => (window.location.href = report.link);

      card.innerHTML = `
          <header class="report-header accent-underline">
            <h3>${report.title}</h3>
          </header>
          <figure class="report-icon center-content">
            <i class="${report.icon}"></i>
          </figure>
          <footer class="report-footer">
            <p>${report.description}</p>
          </footer>
        `;

      container.appendChild(card);
    });
  }

  // Render the cards initially
  renderReportCards();

  // Add event listener to the refresh button if it exists
  const refreshButton = document.getElementById('refreshReports');
  if (refreshButton) {
    refreshButton.addEventListener('click', renderReportCards);
  }
});