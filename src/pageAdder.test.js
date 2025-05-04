import { describe, it, expect, beforeEach } from 'vitest';
import pageAdder from './pageAdder.js';

describe('pageAdder.js', () => {
  let container;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '<ul id="project-list"></ul>';
    container = document.getElementById('project-list');
  });

  it('addProjectsToPage adds formatted projects to the DOM', () => {
    const projects = [
      { name: "Project A", description: "Description A", id: 1 },
      { name: "Project B", description: "Description B", project_id: 2 } // fallback to project_id
    ];

    pageAdder.addProjectsToPage('project-list', projects);

    const items = container.querySelectorAll('li');
    expect(items.length).toBe(2);

    expect(items[0].textContent).toContain("Project A");
    expect(items[0].textContent).toContain("Description A");

    expect(items[1].textContent).toContain("Project B");
    expect(items[1].textContent).toContain("Description B");

    // Check if highlight-hover class exists
    expect(items[0].classList.contains("highlight-hover")).toBe(true);
  });

  it('clearProjects clears the DOM content', () => {
    container.innerHTML = '<li>Dummy</li>';
    expect(container.innerHTML).not.toBe("");

    pageAdder.clearProjects('project-list');

    expect(container.innerHTML).toBe("");
  });

  it('assignListToElement displays fallback message for empty array', () => {
    pageAdder.assignListToElement('project-list', [], () => {
      const li = document.createElement('li');
      li.textContent = 'Should not appear';
      return li;
    });

    expect(container.innerHTML).toContain("Nothing to display.");
  });
});
