document.addEventListener('DOMContentLoaded', async () => {
    const loadingOverlay = document.createElement('section');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<span class="spinner"></span>';
    document.body.appendChild(loadingOverlay);

    const toggleLoading = (show) => loadingOverlay.style.display = show ? 'flex' : 'none';

    try {
        toggleLoading(true);
        const data = await fetchFundingData();
        updateSummaryMetrics(data);
        const charts = createCharts(data);
        setupDownloadButton(data, charts, toggleLoading);
        toggleLoading(false);
    } catch (error) {
        toggleLoading(false);
        console.error('Error loading funding report:', error);
        document.querySelector('main').innerHTML = `
            <section class="inset">
                <p class="error-text">Error loading funding report data: ${error.message}</p>
                <button class="primary" onclick="location.reload()">Try Again</button>
            </section>
        `;
    }
});

async function fetchFundingData() {
    const response = await fetch('/api/reports/funding');
    if (!response.ok) throw new Error('Failed to fetch funding data');
    return await response.json();
}

function updateSummaryMetrics(data) {
    document.getElementById('totalFunding').textContent = formatCurrency(data.totalFunding);
    document.getElementById('amountUsed').textContent = formatCurrency(data.amountUsed);
    document.getElementById('amountLeft').textContent = formatCurrency(data.amountLeft);
    document.getElementById('reportSubtitle').textContent =
        `Funding overview as of ${new Date().toLocaleDateString()}`;
}

function createCharts(data) {
    return {
        fundingChart: createFundingComparisonChart(data),
        usagePieChart: createUsageDistributionChart(data),
        grantChart: createGrantsChart(data)
    };
}

function createFundingComparisonChart(data) {
    const ctx = document.getElementById('fundingChart').getContext('2d');

    if (data.projectFunding.length === 0) {
        ctx.canvas.parentElement.innerHTML = '<p class="inset-small">No project funding data available.</p>';
        return null;
    }

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.projectFunding.map(p => p.name),
            datasets: [
                {
                    label: 'Allocated',
                    data: data.projectFunding.map(p => p.allocated),
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Used',
                    data: data.projectFunding.map(p => p.used),
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => formatCurrency(value)
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: context => `${context.dataset.label}: ${formatCurrency(context.raw)}`
                    }
                }
            }
        }
    });
}

function createUsageDistributionChart(data) {
    const ctx = document.getElementById('usagePieChart').getContext('2d');

    if (data.usageCategories.length === 0) {
        ctx.canvas.parentElement.innerHTML = '<p class="inset-small">No expenditure data available.</p>';
        return null;
    }

    return new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.usageCategories.map(c => c.category),
            datasets: [{
                data: data.usageCategories.map(c => c.amount),
                backgroundColor: [
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
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
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createGrantsChart(data) {
    const ctx = document.getElementById('grantChart').getContext('2d');

    if (data.grants.length === 0) {
        ctx.canvas.parentElement.innerHTML = '<p class="inset-small">No grants data available.</p>';
        return null;
    }

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.grants.map(g => g.organization),
            datasets: [{
                label: 'Grant Amount',
                data: data.grants.map(g => g.amount),
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => formatCurrency(value)
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: context => `Amount: ${formatCurrency(context.raw)}`
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
                funding: await chartToImg(charts.fundingChart),
                usage: await chartToImg(charts.usagePieChart),
                grants: await chartToImg(charts.grantChart)
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
    generateProjectDetailsPage(doc, data, pageConfig);
    addFooters(doc, pageConfig);

    doc.save('funding_report.pdf');
}

function generateTitlePage(doc, config) {
    doc.setFontSize(24);
    doc.setTextColor(44, 62, 80);
    doc.text('UNILINK', config.width / 2, config.margin + 20, { align: 'center' });

    doc.setFontSize(20);
    doc.text('Funding Report', config.width / 2, config.margin + 30, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, config.width / 2, config.margin + 40, { align: 'center' });
}

function generateSummaryPage(doc, data, config, chartImages) {
    doc.addPage();
    let yPos = config.margin;

    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80);
    doc.text('Financial Summary', config.margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    const percentUsed = Math.round((data.amountUsed / data.totalFunding) * 100);

    doc.text(`Total Funding: ${formatCurrency(data.totalFunding)}`, config.margin, yPos);
    yPos += 8;
    doc.text(`Amount Used: ${formatCurrency(data.amountUsed)}`, config.margin, yPos);
    yPos += 8;
    doc.text(`Amount Left: ${formatCurrency(data.amountLeft)}`, config.margin, yPos);
    yPos += 8;
    doc.text(`Percentage Used: ${percentUsed}%`, config.margin, yPos);
    yPos += 15;

    if (chartImages.funding) {
        yPos = addChartToPDF(doc, 'Project Funding Breakdown', chartImages.funding, config, yPos);
    }

    if (chartImages.usage) {
        if (yPos > config.height - 100) {
            doc.addPage();
            yPos = config.margin;
        }
        yPos = addChartToPDF(doc, 'Expenditure by Category', chartImages.usage, config, yPos);
    }

    if (chartImages.grants) {
        if (yPos > config.height - 100) {
            doc.addPage();
            yPos = config.margin;
        }
        addChartToPDF(doc, 'Funding Sources', chartImages.grants, config, yPos);
    }
}

function addChartToPDF(doc, title, chartImg, config, yPos) {
    doc.setFontSize(16);
    doc.text(title, config.margin, yPos);
    yPos += 8;
    doc.addImage(chartImg, 'PNG', config.margin, yPos, config.contentWidth, 70);
    return yPos + 80;
}

function generateProjectDetailsPage(doc, data, config) {
    doc.addPage();
    let yPos = config.margin;

    doc.setFontSize(18);
    doc.text('Project Funding Details', config.margin, yPos);
    yPos += 10;

    const headers = [
        { text: 'Project', x: config.margin + 5 },
        { text: 'Allocated', x: config.margin + 90 },
        { text: 'Used', x: config.margin + 130 },
        { text: 'Remaining', x: config.margin + 160 }
    ];

    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(44, 62, 80);
    doc.rect(config.margin, yPos, config.contentWidth, 8, 'F');

    headers.forEach(header => {
        doc.text(header.text, header.x, yPos + 5.5);
    });

    yPos += 8;
    doc.setTextColor(0, 0, 0);

    if (data.projectFunding.length === 0) {
        doc.text('No project funding data available.', config.margin + 5, yPos + 5.5);
        return;
    }

    let alternate = false;
    data.projectFunding.forEach(project => {
        const remaining = project.allocated - project.used;

        if (alternate) {
            doc.setFillColor(240, 240, 240);
            doc.rect(config.margin, yPos, config.contentWidth, 8, 'F');
        }

        doc.text(project.name.substr(0, 25), config.margin + 5, yPos + 5.5);
        doc.text(formatCurrency(project.allocated), config.margin + 90, yPos + 5.5);
        doc.text(formatCurrency(project.used), config.margin + 130, yPos + 5.5);
        doc.text(formatCurrency(remaining), config.margin + 160, yPos + 5.5);

        yPos += 8;
        alternate = !alternate;

        if (yPos > config.height - 20) {
            doc.addPage();
            yPos = config.margin;
            drawTableHeader(doc, headers, config.margin, yPos, config.contentWidth);
            yPos += 8;
            doc.setTextColor(0, 0, 0);
            alternate = false;
        }
    });
}

function drawTableHeader(doc, headers, margin, yPos, contentWidth) {
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(44, 62, 80);
    doc.rect(margin, yPos, contentWidth, 8, 'F');

    headers.forEach(header => {
        doc.text(header.text, header.x, yPos + 5.5);
    });
}

function addFooters(doc, config) {
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Unilink Funding Report • Page ${i} of ${totalPages}`,
            config.width / 2,
            config.height - 10,
            { align: 'center' }
        );
    }
}

function formatCurrency(value) {
    return 'R' + parseFloat(value).toLocaleString('en-ZA', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}