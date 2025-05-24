// fundingReport.js
document.addEventListener('DOMContentLoaded', async () => {
    // Add loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loadingOverlay);

    function showLoading() {
        loadingOverlay.style.display = 'flex';
    }

    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }

    try {
        showLoading();

        // Fetch funding data from our API endpoint
        const response = await fetch('/api/reports/funding');

        if (!response.ok) {
            throw new Error('Failed to fetch funding data');
        }

        const fundingData = await response.json();

        // Update summary metrics
        updateSummaryMetrics(fundingData);

        // Create charts
        const charts = {
            fundingChart: createFundingComparisonChart(fundingData),
            usagePieChart: createUsageDistributionChart(fundingData),
            grantChart: createGrantsChart(fundingData)
        };

        // Setup download button
        setupDownloadButton(fundingData, charts);

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Error loading funding report:', error);
        // Display error message to user
        document.querySelector('main').innerHTML = `
            <div class="inset">
                <p class="error-text">Error loading funding report data: ${error.message}</p>
                <button class="primary" onclick="location.reload()">Try Again</button>
            </div>
        `;
    }
});

// Update the summary metrics at the top of the page
function updateSummaryMetrics(data) {
    document.getElementById('totalFunding').textContent = formatCurrency(data.totalFunding);
    document.getElementById('amountUsed').textContent = formatCurrency(data.amountUsed);
    document.getElementById('amountLeft').textContent = formatCurrency(data.amountLeft);

    // Update report subtitle to include date
    const reportSubtitleElem = document.getElementById('reportSubtitle');
    reportSubtitleElem.textContent = `Funding overview as of ${new Date().toLocaleDateString()}`;
}

// Create the funding comparison chart
function createFundingComparisonChart(data) {
    const ctx = document.getElementById('fundingChart').getContext('2d');

    // If we have no projects with funding, show a message
    if (data.projectFunding.length === 0) {
        const container = ctx.canvas.parentElement;
        container.innerHTML = '<p class="inset-small">No project funding data available.</p>';
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
                        callback: function (value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return context.dataset.label + ': $' + context.raw.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Create the usage distribution pie chart
function createUsageDistributionChart(data) {
    const ctx = document.getElementById('usagePieChart').getContext('2d');

    // If we have no usage data, show a message
    if (data.usageCategories.length === 0) {
        const container = ctx.canvas.parentElement;
        container.innerHTML = '<p class="inset-small">No expenditure data available.</p>';
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
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
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
                        label: function (context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return context.label + ': $' + value.toLocaleString() + ' (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });
}

// Create the grants by organization chart
function createGrantsChart(data) {
    const ctx = document.getElementById('grantChart').getContext('2d');

    // If we have no grants data, show a message
    if (data.grants.length === 0) {
        const container = ctx.canvas.parentElement;
        container.innerHTML = '<p class="inset-small">No grants data available.</p>';
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
            indexAxis: 'y', // Makes it a horizontal bar chart
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return 'Amount: $' + context.raw.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Helper function to capture chart as image
async function chartToImg(chart) {
    if (!chart) return null;
    return await new Promise(resolve => {
        const base64Image = chart.toBase64Image();
        resolve(base64Image);
    });
}

// Set up the download report button with PDF generation
function setupDownloadButton(data, charts) {
    const downloadBtn = document.getElementById('downloadBtn');

    downloadBtn.addEventListener('click', async () => {
        const loadingOverlay = document.querySelector('.loading-overlay');
        loadingOverlay.style.display = 'flex';

        try {
            // Get chart images
            const fundingChartImg = await chartToImg(charts.fundingChart);
            const usageChartImg = await chartToImg(charts.usagePieChart);
            const grantChartImg = await chartToImg(charts.grantChart);

            // Create PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Constants for formatting
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);
            let yPos = margin;

            // Add title page
            doc.setFontSize(24);
            doc.setTextColor(44, 62, 80); // Dark blue color
            doc.text('UNILINK', pageWidth / 2, yPos + 20, { align: 'center' });
            doc.setFontSize(20);
            doc.text('Funding Report', pageWidth / 2, yPos + 30, { align: 'center' });

            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100); // Gray color
            doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos + 40, { align: 'center' });

            // Add logo or university image if available
            // doc.addImage(logoUrl, 'PNG', pageWidth / 2 - 20, yPos + 50, 40, 40);

            // Add page break
            doc.addPage();
            yPos = margin;

            // Add summary section
            doc.setFontSize(18);
            doc.setTextColor(44, 62, 80);
            doc.text('Financial Summary', margin, yPos);
            yPos += 10;

            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(`Total Funding: ${formatCurrency(data.totalFunding)}`, margin, yPos);
            yPos += 8;
            doc.text(`Amount Used: ${formatCurrency(data.amountUsed)}`, margin, yPos);
            yPos += 8;
            doc.text(`Amount Left: ${formatCurrency(data.amountLeft)}`, margin, yPos);
            yPos += 8;
            doc.text(`Percentage Used: ${Math.round((data.amountUsed / data.totalFunding) * 100)}%`, margin, yPos);
            yPos += 15;

            // Add funding chart
            if (fundingChartImg) {
                doc.setFontSize(16);
                doc.text('Funding Allocation by Project', margin, yPos);
                yPos += 8;
                doc.addImage(fundingChartImg, 'PNG', margin, yPos, contentWidth, 70);
                yPos += 80;
            }

            // Add usage chart
            if (usageChartImg) {
                // Check if we need a new page
                if (yPos > pageHeight - 100) {
                    doc.addPage();
                    yPos = margin;
                }

                doc.setFontSize(16);
                doc.text('Expenditure by Category', margin, yPos);
                yPos += 8;
                doc.addImage(usageChartImg, 'PNG', margin, yPos, contentWidth, 70);
                yPos += 80;
            }

            // Add grants chart
            if (grantChartImg) {
                // Check if we need a new page
                if (yPos > pageHeight - 100) {
                    doc.addPage();
                    yPos = margin;
                }

                doc.setFontSize(16);
                doc.text('Funding Sources', margin, yPos);
                yPos += 8;
                doc.addImage(grantChartImg, 'PNG', margin, yPos, contentWidth, 70);
                yPos += 80;
            }

            // Add detailed project funding table on a new page
            doc.addPage();
            yPos = margin;

            doc.setFontSize(18);
            doc.text('Project Funding Details', margin, yPos);
            yPos += 10;

            // Draw table headers
            doc.setFontSize(12);
            doc.setTextColor(255, 255, 255);
            doc.setFillColor(44, 62, 80);
            doc.rect(margin, yPos, contentWidth, 8, 'F');
            doc.text('Project', margin + 5, yPos + 5.5);
            doc.text('Allocated', margin + 90, yPos + 5.5);
            doc.text('Used', margin + 130, yPos + 5.5);
            doc.text('Remaining', margin + 160, yPos + 5.5);
            yPos += 8;

            // Draw table rows
            doc.setTextColor(0, 0, 0);
            let alternate = false;

            if (data.projectFunding.length === 0) {
                doc.text('No project funding data available.', margin + 5, yPos + 5.5);
                yPos += 8;
            } else {
                data.projectFunding.forEach(project => {
                    const remaining = project.allocated - project.used;

                    if (alternate) {
                        doc.setFillColor(240, 240, 240);
                        doc.rect(margin, yPos, contentWidth, 8, 'F');
                    }

                    doc.text(project.name.substr(0, 25), margin + 5, yPos + 5.5);
                    doc.text(formatCurrency(project.allocated), margin + 90, yPos + 5.5);
                    doc.text(formatCurrency(project.used), margin + 130, yPos + 5.5);
                    doc.text(formatCurrency(remaining), margin + 160, yPos + 5.5);

                    yPos += 8;
                    alternate = !alternate;

                    // Add a new page if needed
                    if (yPos > pageHeight - 20) {
                        doc.addPage();
                        yPos = margin;

                        // Redraw headers on new page
                        doc.setTextColor(255, 255, 255);
                        doc.setFillColor(44, 62, 80);
                        doc.rect(margin, yPos, contentWidth, 8, 'F');
                        doc.text('Project', margin + 5, yPos + 5.5);
                        doc.text('Allocated', margin + 90, yPos + 5.5);
                        doc.text('Used', margin + 130, yPos + 5.5);
                        doc.text('Remaining', margin + 160, yPos + 5.5);
                        yPos += 8;

                        doc.setTextColor(0, 0, 0);
                        alternate = false;
                    }
                });
            }

            // Add usage categories table on a new page
            doc.addPage();
            yPos = margin;

            doc.setFontSize(18);
            doc.text('Expenditure Details', margin, yPos);
            yPos += 10;

            // Draw table headers
            doc.setFontSize(12);
            doc.setTextColor(255, 255, 255);
            doc.setFillColor(44, 62, 80);
            doc.rect(margin, yPos, contentWidth, 8, 'F');
            doc.text('Category', margin + 5, yPos + 5.5);
            doc.text('Amount', margin + 90, yPos + 5.5);
            doc.text('Percentage', margin + 140, yPos + 5.5);
            yPos += 8;

            // Draw table rows
            doc.setTextColor(0, 0, 0);
            alternate = false;

            if (data.usageCategories.length === 0) {
                doc.text('No expenditure data available.', margin + 5, yPos + 5.5);
                yPos += 8;
            } else {
                const totalExpenditure = data.usageCategories.reduce((sum, cat) => sum + cat.amount, 0);

                data.usageCategories.forEach(category => {
                    const percentage = ((category.amount / totalExpenditure) * 100).toFixed(1) + '%';

                    if (alternate) {
                        doc.setFillColor(240, 240, 240);
                        doc.rect(margin, yPos, contentWidth, 8, 'F');
                    }

                    doc.text(category.category, margin + 5, yPos + 5.5);
                    doc.text(formatCurrency(category.amount), margin + 90, yPos + 5.5);
                    doc.text(percentage, margin + 140, yPos + 5.5);

                    yPos += 8;
                    alternate = !alternate;
                });
            }

            // Add grants table
            yPos += 10;

            doc.setFontSize(18);
            doc.text('Funding Sources', margin, yPos);
            yPos += 10;

            // Draw table headers
            doc.setFontSize(12);
            doc.setTextColor(255, 255, 255);
            doc.setFillColor(44, 62, 80);
            doc.rect(margin, yPos, contentWidth, 8, 'F');
            doc.text('Organization', margin + 5, yPos + 5.5);
            doc.text('Amount', margin + 100, yPos + 5.5);
            yPos += 8;

            // Draw table rows
            doc.setTextColor(0, 0, 0);
            alternate = false;

            if (data.grants.length === 0) {
                doc.text('No grants data available.', margin + 5, yPos + 5.5);
                yPos += 8;
            } else {
                data.grants.forEach(grant => {
                    if (alternate) {
                        doc.setFillColor(240, 240, 240);
                        doc.rect(margin, yPos, contentWidth, 8, 'F');
                    }

                    doc.text(grant.organization, margin + 5, yPos + 5.5);
                    doc.text(formatCurrency(grant.amount), margin + 100, yPos + 5.5);

                    yPos += 8;
                    alternate = !alternate;
                });
            }

            // Add footer to all pages
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(10);
                doc.setTextColor(150, 150, 150);
                doc.text(
                    `Unilink Funding Report • Page ${i} of ${totalPages}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
            }

            // Save the PDF
            doc.save('funding_report.pdf');

        } catch (error) {
            console.error('Error generating PDF:', error);

            // Fallback to text report if PDF generation fails
            const reportContent = generateReportContent(data);
            downloadTextReport(reportContent, 'funding_report.txt');

            alert('There was an issue generating the PDF. A text report has been downloaded instead.');
        } finally {
            // Hide loading overlay
            loadingOverlay.style.display = 'none';
        }
    });
}

// Generate text report as fallback
function generateReportContent(data) {
    const date = new Date().toLocaleDateString();

    let content = `UNILINK FUNDING REPORT - ${date}\n`;
    content += `=================================\n\n`;

    content += `SUMMARY\n`;
    content += `-------\n`;
    content += `Total Funding: ${formatCurrency(data.totalFunding)}\n`;
    content += `Amount Used: ${formatCurrency(data.amountUsed)}\n`;
    content += `Amount Left: ${formatCurrency(data.amountLeft)}\n\n`;

    content += `USAGE BREAKDOWN\n`;
    content += `--------------\n`;
    if (data.usageCategories.length === 0) {
        content += `No expenditure data available.\n`;
    } else {
        data.usageCategories.forEach(category => {
            content += `${category.category}: ${formatCurrency(category.amount)}\n`;
        });
    }
    content += `\n`;

    content += `GRANTS BY ORGANIZATION\n`;
    content += `---------------------\n`;
    if (data.grants.length === 0) {
        content += `No grants data available.\n`;
    } else {
        data.grants.forEach(grant => {
            content += `${grant.organization}: ${formatCurrency(grant.amount)}\n`;
        });
    }
    content += `\n`;

    content += `PROJECT FUNDING\n`;
    content += `--------------\n`;
    if (data.projectFunding.length === 0) {
        content += `No project funding data available.\n`;
    } else {
        data.projectFunding.forEach(project => {
            content += `${project.name}:\n`;
            content += `  Allocated: ${formatCurrency(project.allocated)}\n`;
            content += `  Used: ${formatCurrency(project.used)}\n`;
            content += `  Remaining: ${formatCurrency(project.allocated - project.used)}\n\n`;
        });
    }

    content += `Report generated by Unilink on ${date}\n`;

    return content;
}

// Download text report (used as fallback)
function downloadTextReport(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// Helper function to format currency values
function formatCurrency(value) {
    return '$' + parseFloat(value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}