document.addEventListener('DOMContentLoaded', async () => {
    const loadingOverlay = document.createElement('section');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<span class="spinner"></span>';
    document.body.appendChild(loadingOverlay);

    const toggleLoading = (show) => loadingOverlay.style.display = show ? 'flex' : 'none';

    try {
        toggleLoading(true);
        const data = await fetchReportData();

        updateSummaryMetrics(data);
        const charts = createCharts(data);

        setupDownloadButton(data, charts, toggleLoading);
        setupDateFilter(toggleLoading);
        toggleLoading(false);
    } catch (error) {
        toggleLoading(false);
        console.error('Error loading user activity report:', error);
        document.querySelector('main').innerHTML = `
            <section class="inset">
                <p class="error-text">Error loading user activity report data: ${error.message}</p>
                <button class="primary" onclick="location.reload()">Try Again</button>
            </section>
        `;
    }
});

async function fetchReportData(queryParams) {
    const url = '/api/reports/custom' + (queryParams ? `?${queryParams}` : '');
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch user activity data');
    return await response.json();
}

function updateSummaryMetrics(data) {
    document.getElementById('projectCount').textContent = data.activitySummary.projectCount;
    document.getElementById('collaborationCount').textContent = data.activitySummary.collaborationCount;
    document.getElementById('avgRating').textContent = data.activitySummary.avgRating || '0.0';
    document.getElementById('reportSubtitle').textContent =
        `Personal activity overview from ${formatDateForDisplay(data.dateRange.startDate)} to ${formatDateForDisplay(data.dateRange.endDate)}`;
}

function createCharts(data) {
    return {
        projectTimelineChart: createProjectTimelineChart(data),
        projectTypeChart: createProjectTypeChart(data),
        fileTypeChart: createFileTypeChart(data)
    };
}

function createProjectTimelineChart(data) {
    const ctx = document.getElementById('projectTimelineChart').getContext('2d');

    if (!data.contributionTimeline || data.contributionTimeline.length === 0) {
        ctx.canvas.parentElement.innerHTML = '<p class="inset-small">No project timeline data available.</p>';
        return null;
    }

    const months = data.contributionTimeline.map(item => item.month);
    const counts = data.contributionTimeline.map(item => item.count);

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Projects Created',
                data: counts,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
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
            }
        }
    });
}

function createProjectTypeChart(data) {
    const ctx = document.getElementById('projectTypeChart').getContext('2d');

    if (!data.projectsCreated || data.projectsCreated.length === 0) {
        ctx.canvas.parentElement.innerHTML = '<p class="inset-small">No project type data available.</p>';
        return null;
    }

    const publicProjects = data.projectsCreated.filter(p => p.is_public).length;
    const privateProjects = data.projectsCreated.filter(p => !p.is_public).length;

    return new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Public Projects', 'Private Projects'],
            datasets: [{
                data: [publicProjects, privateProjects],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: context => {
                            const value = context.raw;
                            const total = publicProjects + privateProjects;
                            const percentage = Math.round((value / total) * 100);
                            return `${context.label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createFileTypeChart(data) {
    const ctx = document.getElementById('reviewActivityChart').getContext('2d');
    ctx.canvas.parentElement.parentElement.querySelector('h3').textContent = 'File Types Distribution';

    if (!data.fileContributions || data.fileContributions.length === 0) {
        ctx.canvas.parentElement.innerHTML = '<p class="inset-small">No file type data available.</p>';
        return null;
    }

    const fileExtensions = data.fileContributions.map(file => {
        const filename = file.original_filename;
        const lastDotIndex = filename.lastIndexOf('.');
        return lastDotIndex !== -1 ? filename.slice(lastDotIndex + 1).toLowerCase() : 'unknown';
    });

    const extensionCounts = {};
    fileExtensions.forEach(ext => {
        extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
    });

    let extensions = Object.keys(extensionCounts);
    let counts = Object.values(extensionCounts);

    if (extensions.length > 10) {
        const combined = extensions.map((ext, i) => ({ ext, count: counts[i] }));
        combined.sort((a, b) => b.count - a.count);

        extensions = combined.slice(0, 9).map(item => item.ext);
        counts = combined.slice(0, 9).map(item => item.count);

        const otherCount = combined.slice(9).reduce((sum, item) => sum + item.count, 0);
        if (otherCount > 0) {
            extensions.push('Other');
            counts.push(otherCount);
        }
    }

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: extensions,
            datasets: [{
                data: counts,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)',
                    'rgba(199, 199, 199, 0.7)',
                    'rgba(83, 102, 255, 0.7)',
                    'rgba(78, 205, 196, 0.7)',
                    'rgba(169, 221, 217, 0.7)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: context => {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${context.label}: ${value} files (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function formatDateForDisplay(dateString) {
    if (!dateString) return 'All time';
    return new Date(dateString).toLocaleDateString();
}

async function chartToImg(chart) {
    return chart ? chart.toBase64Image() : null;
}

function setupDateFilter(toggleLoading) {
    document.getElementById('applyDateFilter').addEventListener('click', async () => {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        let queryParams = new URLSearchParams();
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);

        toggleLoading(true);

        try {
            const data = await fetchReportData(queryParams.toString());
            updateSummaryMetrics(data);

            recreateChartCanvases();
            const charts = createCharts(data);
            setupDownloadButton(data, charts, toggleLoading);
        } catch (error) {
            console.error('Error applying date filter:', error);
            alert('Error applying date filter: ' + error.message);
        } finally {
            toggleLoading(false);
        }
    });
}

function recreateChartCanvases() {
    ['projectTimelineChart', 'projectTypeChart', 'reviewActivityChart'].forEach(recreateChartCanvas);
}

function recreateChartCanvas(chartId) {
    const oldCanvas = document.getElementById(chartId);
    if (!oldCanvas) {
        console.warn(`Canvas with ID ${chartId} not found`);
        return;
    }

    const chartContainer = oldCanvas.parentElement;
    const width = oldCanvas.width;
    const height = oldCanvas.height;

    oldCanvas.remove();

    const newCanvas = document.createElement('canvas');
    newCanvas.id = chartId;
    newCanvas.width = width;
    newCanvas.height = height;
    chartContainer.appendChild(newCanvas);
}

function setupDownloadButton(data, charts, toggleLoading) {
    document.getElementById('downloadBtn').addEventListener('click', async () => {
        toggleLoading(true);

        try {
            const chartImages = {
                timeline: await chartToImg(charts.projectTimelineChart),
                projectType: await chartToImg(charts.projectTypeChart),
                fileType: await chartToImg(charts.fileTypeChart)
            };

            generatePDF(data, chartImages);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF: ' + error.message);
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

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    generateTitlePage(doc, data, pageWidth, margin);
    generateSummaryPage(doc, data, margin, contentWidth, pageHeight, chartImages);
    generateFileContributionsPage(doc, data, margin, contentWidth, pageHeight);
    generateProjectsPage(doc, data, margin, contentWidth, pageHeight);
    addFooters(doc, pageWidth, pageHeight);

    doc.save('user_activity_report.pdf');
}

function generateTitlePage(doc, data, pageWidth, margin) {
    const yPos = margin;

    doc.setFontSize(24);
    doc.setTextColor(44, 62, 80);
    doc.text('UNILINK', pageWidth / 2, yPos + 20, { align: 'center' });

    doc.setFontSize(20);
    doc.text('User Activity Report', pageWidth / 2, yPos + 30, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);

    const dateRangeText = `${formatDateForDisplay(data.dateRange.startDate)} to ${formatDateForDisplay(data.dateRange.endDate)}`;
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos + 40, { align: 'center' });
    doc.text(`For: ${data.userInfo.name}`, pageWidth / 2, yPos + 48, { align: 'center' });
    doc.text(`Date Range: ${dateRangeText}`, pageWidth / 2, yPos + 56, { align: 'center' });
}

function generateSummaryPage(doc, data, margin, contentWidth, pageHeight, chartImages) {
    doc.addPage();
    let yPos = margin;

    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80);
    doc.text('Activity Summary', margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Projects Created: ${data.activitySummary.projectCount}`, margin, yPos);
    yPos += 6;
    doc.text(`Collaborations: ${data.activitySummary.collaborationCount}`, margin, yPos);
    yPos += 6;
    doc.text(`File Contributions: ${data.activitySummary.fileContributionsCount}`, margin, yPos);
    yPos += 15;

    if (chartImages.timeline) {
        yPos = addChartToPDF(doc, 'Project Creation Timeline', chartImages.timeline, margin, contentWidth, yPos);
        if (yPos > pageHeight - 100) {
            doc.addPage();
            yPos = margin;
        }
    }

    if (chartImages.projectType) {
        yPos = addChartToPDF(doc, 'Project Type Distribution', chartImages.projectType, margin, contentWidth, yPos);
        if (yPos > pageHeight - 100) {
            doc.addPage();
            yPos = margin;
        }
    }

    if (chartImages.fileType) {
        addChartToPDF(doc, 'File Types Distribution', chartImages.fileType, margin, contentWidth, yPos);
    }
}

function addChartToPDF(doc, title, chartImg, margin, contentWidth, yPos) {
    doc.setFontSize(16);
    doc.text(title, margin, yPos);
    yPos += 8;
    doc.addImage(chartImg, 'PNG', margin, yPos, contentWidth, 70);
    return yPos + 80;
}

function generateFileContributionsPage(doc, data, margin, contentWidth, pageHeight) {
    if (!data.fileContributions || data.fileContributions.length === 0) return;

    doc.addPage();
    let yPos = margin;

    doc.setFontSize(18);
    doc.text('File Contributions', margin, yPos);
    yPos += 10;

    const headers = [
        { text: 'File Name', x: margin + 5 },
        { text: 'Project', x: margin + 100 },
        { text: 'Date', x: margin + 160 }
    ];

    yPos = addTableToPDF(doc, data.fileContributions, headers, margin, contentWidth, yPos, pageHeight, item => {
        const createdDate = new Date(item.created_at).toLocaleDateString();
        return [
            { text: item.original_filename.substring(0, 35), x: margin + 5 },
            { text: item.project_name.substring(0, 30), x: margin + 100 },
            { text: createdDate, x: margin + 160 }
        ];
    });
}

function generateProjectsPage(doc, data, margin, contentWidth, pageHeight) {
    if (!data.projectsCreated || data.projectsCreated.length === 0) return;

    doc.addPage();
    let yPos = margin;

    doc.setFontSize(18);
    doc.text('Projects Created', margin, yPos);
    yPos += 10;

    const headers = [
        { text: 'Project Name', x: margin + 5 },
        { text: 'Created Date', x: margin + 100 },
        { text: 'Visibility', x: margin + 150 }
    ];

    addTableToPDF(doc, data.projectsCreated, headers, margin, contentWidth, yPos, pageHeight, item => {
        const createdDate = new Date(item.created_at).toLocaleDateString();
        const visibility = item.is_public ? 'Public' : 'Private';
        return [
            { text: item.name.substring(0, 35), x: margin + 5 },
            { text: createdDate, x: margin + 100 },
            { text: visibility, x: margin + 150 }
        ];
    });
}

function addTableToPDF(doc, data, headers, margin, contentWidth, yPos, pageHeight, rowMapper) {
    // Draw table headers
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(44, 62, 80);
    doc.rect(margin, yPos, contentWidth, 8, 'F');

    headers.forEach(header => {
        doc.text(header.text, header.x, yPos + 5.5);
    });

    yPos += 8;
    doc.setTextColor(0, 0, 0);
    let alternate = false;

    // Draw table rows
    data.forEach(item => {
        if (alternate) {
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, yPos, contentWidth, 8, 'F');
        }

        const cells = rowMapper(item);
        cells.forEach(cell => {
            doc.text(cell.text, cell.x, yPos + 5.5);
        });

        yPos += 8;
        alternate = !alternate;

        if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = margin;

            // Redraw headers on new page
            doc.setTextColor(255, 255, 255);
            doc.setFillColor(44, 62, 80);
            doc.rect(margin, yPos, contentWidth, 8, 'F');

            headers.forEach(header => {
                doc.text(header.text, header.x, yPos + 5.5);
            });

            yPos += 8;
            doc.setTextColor(0, 0, 0);
            alternate = false;
        }
    });

    return yPos;
}

function addFooters(doc, pageWidth, pageHeight) {
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Unilink User Activity Report • Page ${i} of ${totalPages}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
    }
}