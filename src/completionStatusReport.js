document.addEventListener('DOMContentLoaded', async () => {
    const loadingOverlay = document.createElement('section');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<span class="spinner"></span>';
    document.body.appendChild(loadingOverlay);

    const toggleLoading = (show) => loadingOverlay.style.display = show ? 'flex' : 'none';
    const main = document.querySelector('main');

    try {
        toggleLoading(true);

        // Get projectId from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('projectId');

        if (!projectId) {
            // Fetch available projects
            const projectsResponse = await fetch('/api/user/project');
            if (!projectsResponse.ok) throw new Error('Failed to fetch projects');
            const projects = await projectsResponse.json();

            if (projects.length === 0) {
                main.innerHTML = `
                    <section class="inset">
                        <p>No projects found. Create a project first.</p>
                        <a href="/dashboard" class="button primary">Back to Dashboard</a>
                    </section>
                `;
                toggleLoading(false);
                return;
            }

            // Display project selection dropdown
            main.innerHTML = `
                <section class="inset">
                    <h2>Select a Project</h2>
                    <p>Choose a project to view its completion status report</p>
                    <fieldset class="form-group">
                        <select id="projectSelect" class="form-control">
                            <option value="">-- Select a Project --</option>
                            ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                        </select>
                        <button id="viewReportBtn" class="button primary">View Report</button>
                    </fieldset>
                </section>
            `;

            // Add event listener to the button
            document.getElementById('viewReportBtn').addEventListener('click', () => {
                const selectedProject = document.getElementById('projectSelect').value;
                if (selectedProject) {
                    window.location.href = `/reports/completion-status?projectId=${selectedProject}`;
                } else {
                    alert('Please select a project');
                }
            });

            toggleLoading(false);
            return;
        }

        // Continue with the original code for fetching report data
        const response = await fetch(`/api/reports/completion-status?projectId=${projectId}`);
        if (!response.ok) throw new Error('Failed to fetch completion data');
        const data = await response.json();

        updateSummaryMetrics(data);
        const charts = createCharts(data);
        setupDownloadButton(data, charts, toggleLoading);
        toggleLoading(false);
    } catch (error) {
        toggleLoading(false);
        console.error('Error loading completion report:', error);
        main.innerHTML = `
            <section class="inset">
                <p class="error-text">Error loading completion report data: ${error.message}</p>
                <button class="primary" onclick="location.reload()">Try Again</button>
            </section>
        `;
    }
});

function updateSummaryMetrics(data) {
    document.getElementById('totalContributors').textContent = data.totalContributors;
    document.getElementById('avgDaysToComplete').textContent = data.avgDaysToComplete;
    document.getElementById('projectProgress').textContent = `${data.projectProgress}%`;
    document.getElementById('reportSubtitle').textContent =
        `Project completion overview as of ${new Date().toLocaleDateString()}`;
}

function createCharts(data) {
    return {
        contributorsChart: createContributorsChart(data),
        progressComparisonChart: createProgressComparisonChart(data),
        milestonesChart: createMilestonesChart(data)
    };
}

function createContributorsChart(data) {
    const ctx = document.getElementById('contributorsChart').getContext('2d');

    if (data.contributorsTrend.length === 0) {
        ctx.canvas.parentElement.innerHTML = '<p class="inset-small">No contributor data available.</p>';
        return null;
    }

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.contributorsTrend.map(c => c.project_name),
            datasets: [{
                label: 'Contributors',
                data: data.contributorsTrend.map(c => c.contributor_count),
                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: context => `Contributors: ${context.raw}`
                    }
                }
            }
        }
    });
}

function createProgressComparisonChart(data) {
    const ctx = document.getElementById('progressComparisonChart').getContext('2d');

    if (data.progressComparison.length === 0) {
        ctx.canvas.parentElement.innerHTML = '<p class="inset-small">No progress comparison data available.</p>';
        return null;
    }

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.progressComparison.map(p => p.projectName),
            datasets: [{
                label: 'Completion Percentage',
                data: data.progressComparison.map(p => p.progress),
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { callback: value => `${value}%` }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: context => `Completion: ${context.raw}%`
                    }
                }
            }
        }
    });
}

function createMilestonesChart(data) {
    const ctx = document.getElementById('milestonesChart').getContext('2d');

    if (data.milestones.length === 0) {
        ctx.canvas.parentElement.innerHTML = '<p class="inset-small">No milestone data available.</p>';
        return null;
    }

    const colors = [
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)'
    ];

    const projects = [...new Set(data.milestones.map(m => m.project_name))];
    const datasets = projects.map((project, index) => {
        const projectMilestones = data.milestones.filter(m => m.project_name === project);
        const color = colors[index % colors.length];

        return {
            label: project,
            data: projectMilestones.map(m => ({
                x: new Date(m.created_at).toISOString().split('T')[0],
                y: project,
                completed: !!m.completed_at,
                name: m.milestone_name,
                description: m.description,
                completedDate: m.completed_at ? new Date(m.completed_at).toISOString().split('T')[0] : 'Pending'
            })),
            backgroundColor: color,
            borderColor: color.replace('0.7', '1'),
            pointStyle: 'circle',
            pointRadius: 6,
            pointHoverRadius: 8
        };
    });

    return new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'month' },
                    title: { display: true, text: 'Timeline' }
                },
                y: {
                    title: { display: true, text: 'Projects' }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: context => {
                            const point = context.raw;
                            return [
                                `Project: ${point.y}`,
                                `Milestone: ${point.name}`,
                                `Created: ${point.x}`,
                                `Status: ${point.completed ? 'Completed' : 'In Progress'}`,
                                point.completed ? `Completed: ${point.completedDate}` : ''
                            ].filter(Boolean);
                        }
                    }
                }
            }
        }
    });
}

async function chartToImg(chart) {
    return chart ? chart.toBase64Image() : null;
}

function setupDownloadButton(data, charts, toggleLoading) {
    document.getElementById('downloadBtn').addEventListener('click', async () => {
        toggleLoading(true);

        try {
            const chartImages = {
                contributors: await chartToImg(charts.contributorsChart),
                progress: await chartToImg(charts.progressComparisonChart),
                milestones: await chartToImg(charts.milestonesChart)
            };

            generatePDF(data, chartImages);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Please try again later.');
        } finally {
            toggleLoading(false);
        }
    });
}

function generatePDF(data, chartImages) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageConfig = {
        width: doc.internal.pageSize.getWidth(),
        height: doc.internal.pageSize.getHeight(),
        margin: 20
    };

    pageConfig.contentWidth = pageConfig.width - (pageConfig.margin * 2);

    generateTitlePage(doc, pageConfig);
    generateSummaryPage(doc, data, pageConfig, chartImages);
    generateMilestonesPage(doc, data, pageConfig);
    addFooters(doc, pageConfig);

    doc.save('project_completion_report.pdf');
}

function generateTitlePage(doc, config) {
    doc.setFontSize(24);
    doc.setTextColor(44, 62, 80);
    doc.text('UNILINK', config.width / 2, config.margin + 20, { align: 'center' });

    doc.setFontSize(20);
    doc.text('Project Completion Report', config.width / 2, config.margin + 30, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, config.width / 2, config.margin + 40, { align: 'center' });
}

function generateSummaryPage(doc, data, config, chartImages) {
    doc.addPage();
    let yPos = config.margin;

    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80);
    doc.text('Project Completion Summary', config.margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Contributors: ${data.totalContributors}`, config.margin, yPos);
    yPos += 8;
    doc.text(`Average Days to Complete Task: ${data.avgDaysToComplete}`, config.margin, yPos);
    yPos += 8;
    doc.text(`Overall Project Progress: ${data.projectProgress}%`, config.margin, yPos);
    yPos += 15;

    if (chartImages.contributors) {
        yPos = addChartToPage(doc, 'Contributors by Project', chartImages.contributors, config, yPos);
    }

    if (chartImages.progress) {
        if (yPos > config.height - 100) {
            doc.addPage();
            yPos = config.margin;
        }
        yPos = addChartToPage(doc, 'Project Progress Comparison', chartImages.progress, config, yPos);
    }

    if (chartImages.milestones) {
        if (yPos > config.height - 100) {
            doc.addPage();
            yPos = config.margin;
        }
        addChartToPage(doc, 'Project Milestones Timeline', chartImages.milestones, config, yPos);
    }
}

function addChartToPage(doc, title, chartImg, config, yPos) {
    doc.setFontSize(16);
    doc.text(title, config.margin, yPos);
    yPos += 8;
    doc.addImage(chartImg, 'PNG', config.margin, yPos, config.contentWidth, 70);
    return yPos + 80;
}

function generateMilestonesPage(doc, data, config) {
    doc.addPage();
    let yPos = config.margin;

    doc.setFontSize(18);
    doc.text('Project Milestones Details', config.margin, yPos);
    yPos += 10;

    drawTableHeader(doc, config.margin, yPos, config.contentWidth);
    yPos += 8;

    doc.setTextColor(0, 0, 0);
    let alternate = false;

    if (data.milestones.length === 0) {
        doc.text('No milestone data available.', config.margin + 5, yPos + 5.5);
        return;
    }

    data.milestones.forEach(milestone => {
        const status = milestone.completed_at ? 'Completed' : 'In Progress';
        const daysToComplete = milestone.completed_at ?
            Math.round((new Date(milestone.completed_at) - new Date(milestone.created_at)) / (1000 * 60 * 60 * 24)) :
            '-';

        if (alternate) {
            doc.setFillColor(240, 240, 240);
            doc.rect(config.margin, yPos, config.contentWidth, 8, 'F');
        }

        doc.text(milestone.project_name.substr(0, 20), config.margin + 5, yPos + 5.5);
        doc.text(milestone.milestone_name.substr(0, 25), config.margin + 60, yPos + 5.5);
        doc.text(status, config.margin + 130, yPos + 5.5);
        doc.text(daysToComplete.toString(), config.margin + 160, yPos + 5.5);

        yPos += 8;
        alternate = !alternate;

        if (yPos > config.height - 20) {
            doc.addPage();
            yPos = config.margin;
            drawTableHeader(doc, config.margin, yPos, config.contentWidth);
            yPos += 8;
            doc.setTextColor(0, 0, 0);
            alternate = false;
        }
    });
}

function drawTableHeader(doc, margin, yPos, contentWidth) {
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(44, 62, 80);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.text('Project', margin + 5, yPos + 5.5);
    doc.text('Milestone', margin + 60, yPos + 5.5);
    doc.text('Status', margin + 130, yPos + 5.5);
    doc.text('Days to Complete', margin + 160, yPos + 5.5);
}

function addFooters(doc, config) {
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Unilink Project Completion Report • Page ${i} of ${totalPages}`,
            config.width / 2,
            config.height - 10,
            { align: 'center' }
        );
    }
}