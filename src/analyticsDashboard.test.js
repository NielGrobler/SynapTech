// analyticsDashboard.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Fake DOM environment
import './analyticsDashboard.js';

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

describe('analyticsDashboard.js Module Tests', () => {
  let container, refreshButton;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="reportCardsContainer"></div>
      <button id="refreshReports">Refresh</button>
    `;
    container = document.getElementById('reportCardsContainer');
    refreshButton = document.getElementById('refreshReports');
    
    // Manually trigger DOMContentLoaded event to run the script logic
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  it('should render all report cards on load', () => {
    const cards = container.querySelectorAll('.report-card');
    expect(cards.length).toBe(reports.length);
    reports.forEach((report, i) => {
      expect(cards[i].textContent).toContain(report.title);
      expect(cards[i].textContent).toContain(report.description);
      expect(cards[i].querySelector('i').className).toBe(report.icon);
    });
  });

  it('should re-render the cards when refresh is clicked', async () => {
    const spy = vi.spyOn(container, 'innerHTML', 'set');
    refreshButton.click();
    expect(spy).toHaveBeenCalled();
  });

  it('should add and remove rotating class on refresh button', async () => {
    refreshButton.click();
    expect(refreshButton.classList.contains('rotating')).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 1100)); // wait for class removal
    expect(refreshButton.classList.contains('rotating')).toBe(false);
  });

  it('should logs error if container is missing', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.body.innerHTML = ''; // Remove all elements
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(spy).toHaveBeenCalledWith('Could not find reportCardsContainer element');
    spy.mockRestore();
  });

  it('should navigate to correct link when a card is clicked', () => {
    const fakeLocation = { href: '' };
    global.window = Object.create(window);
    Object.defineProperty(window, 'location', {
      value: fakeLocation,
      writable: true,
    });

    const card = container.querySelector('.report-card');
    card.click();
    expect(window.location.href).toBe(reports[0].link);
  });
});
