// Initialize PDF library
const { jsPDF } = window.jspdf;

// Initialize the charts when the page loads
document.addEventListener('DOMContentLoaded', function () {
    fetchProjectData()
        .then(data => {
            if (data) {
                initCharts(data);
                setupDownloadButton();
            }
        })
        .catch(error => {
            console.error('Error loading dashboard data:', error);
            document.querySelector('main').innerHTML = `
                <section class="title-section">
                    <h1>Error Loading Dashboard</h1>
                </section>
                <p>There was an error loading the project data. Please try again later.</p>
            `;
        });
});

// Fetch project data from the API
// Fetch project data from the API
async function fetchProjectData() {
    // Get project ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        throw new Error('No project ID provided');
    }

    try {
        // Fetch the project details using our new API endpoint
        const response = await fetch(`/api/reports/completion-status?projectId=${projectId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch report data');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}
// At the beginning of your initCharts function, add:
Chart.defaults.animation.duration = 0; // Disable animations for PDF capture
function initCharts(data) {
    // Set project title
    document.querySelector('h1').textContent = `${data.project.name} - Completion Report`;

    // Update metrics
    document.getElementById('contributorsChart').closest('article').querySelector('.card-metric').textContent =
        data.collaborators.length;

    document.getElementById('progressChart').closest('article').querySelector('.card-metric').textContent =
        `${data.project.progress || 50}%`;

    // Initialize all charts
    createBubbleChart(data.collaborators);
    createGaugeChart(data.completionData);
    createProgressChart(data.project);
    createProgressComparisonChart(data.project, data.similarProjects);
    createMilestonesChart(data.project);
}

// Contributors bubble chart
function createBubbleChart(collaborators) {
    const ctx = document.getElementById('contributorsChart').getContext('2d');

    // Get unique roles and count them
    const roles = {};
    collaborators.forEach(collaborator => {
        if (roles[collaborator.role]) {
            roles[collaborator.role]++;
        } else {
            roles[collaborator.role] = 1;
        }
    });

    // Prepare data for bubble chart
    const bubbleData = Object.keys(roles).map((role, index) => {
        return {
            x: Math.random() * 100,
            y: Math.random() * 100,
            r: roles[role] * 8 + 10, // Size based on count
            label: role
        };
    });

    // Colors for bubbles
    const colors = [
        'rgba(75, 192, 192, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(255, 205, 86, 0.7)'
    ];

    new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                data: bubbleData,
                backgroundColor: bubbleData.map((_, i) => colors[i % colors.length]),
                borderColor: 'transparent',
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    display: false,
                    min: 0,
                    max: 100
                },
                y: {
                    display: false,
                    min: 0,
                    max: 100
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const dataPoint = context.raw;
                            return `${dataPoint.label}: ${Math.round(dataPoint.r / 8)} contributors`;
                        }
                    }
                }
            }
        }
    });
}

// Gauge chart for days to complete
function createGaugeChart(completionData) {
    const ctx = document.getElementById('gaugeChart').getContext('2d');

    // Use actual average days to complete if available
    const avgDaysToComplete = completionData.avgDaysToComplete || 5.6;

    // Performance categories
    const performance = [
        { cutoff: 5, label: 'Excellent', color: '#4CAF50' },   // Green
        { cutoff: 7, label: 'Good', color: '#FFC107' },        // Yellow
        { cutoff: 10, label: 'Fair', color: '#FF9800' },       // Orange
        { cutoff: 99, label: 'Poor', color: '#F44336' }        // Red
    ];

    // Find the performance category for the current average
    let currentPerformance = performance[performance.length - 1];
    for (let i = 0; i < performance.length; i++) {
        if (avgDaysToComplete <= performance[i].cutoff) {
            currentPerformance = performance[i];
            break;
        }
    }

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [avgDaysToComplete, 15 - avgDaysToComplete], // Max value is 15 days
                backgroundColor: [
                    currentPerformance.color,
                    '#E0E0E0'
                ],
                borderWidth: 0,
                circumference: 180,
                rotation: 270,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            }
        },
        plugins: [{
            id: 'gaugeText',
            afterDraw: (chart) => {
                const { ctx, chartArea: { top, bottom, left, right, width, height } } = chart;

                ctx.save();

                // Draw performance label
                const fontSizeLabel = Math.min(width, height) / 10;
                ctx.font = `${fontSizeLabel}px Arial`;
                ctx.fillStyle = currentPerformance.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(currentPerformance.label, width / 2, height * 0.7);

                ctx.restore();
            }
        }]
    });
}

// Progress percentage chart
function createProgressChart(project) {
    const ctx = document.getElementById('progressChart').getContext('2d');

    // Get project progress (default to 50 if not available)
    const progress = project.progress || 50;

    // Create the progress bar chart
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Progress'],
            datasets: [
                {
                    label: 'Completed',
                    data: [progress],
                    backgroundColor: '#4CAF50',
                    borderColor: '#4CAF50',
                    borderWidth: 0
                },
                {
                    label: 'Remaining',
                    data: [100 - progress],
                    backgroundColor: '#E0E0E0',
                    borderColor: '#E0E0E0',
                    borderWidth: 0
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    display: false,
                    max: 100
                },
                y: {
                    stacked: true,
                    display: false
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            }
        },
        plugins: [{
            id: 'progressText',
            afterDraw: (chart) => {
                const { ctx, chartArea: { top, bottom, left, right, width, height } } = chart;
                const meta = chart.getDatasetMeta(0);
                const progressBar = meta.data[0];
                const progressWidth = progressBar.width;

                ctx.save();

                // Draw percentage text
                ctx.font = 'bold 14px Arial';
                ctx.fillStyle = '#333';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Only add percentage text if progress is big enough to contain it
                if (progressWidth > 40) {
                    ctx.fillText(`${progress}%`, left + progressWidth / 2, progressBar.y);
                } else {
                    ctx.fillText(`${progress}%`, left + progressWidth + 25, progressBar.y);
                }

                ctx.restore();
            }
        }]
    });
}

// Progress comparison chart
function createProgressComparisonChart(currentProject, similarProjects) {
    const ctx = document.getElementById('progressComparisonChart').getContext('2d');

    // Take up to 4 similar projects plus the current one
    const projectsToDisplay = similarProjects.slice(0, 4);

    // Add current project at the start
    const allProjects = [currentProject, ...projectsToDisplay];

    // Create labels and data
    const labels = allProjects.map(project => project.name);
    const progressData = allProjects.map(project => project.progress || Math.floor(Math.random() * 50) + 30); // Default random progress if not available

    // Highlight the current project with a different color
    const backgroundColors = progressData.map((_, i) =>
        i === 0 ? 'rgba(66, 153, 225, 0.8)' : 'rgba(160, 174, 192, 0.8)'
    );

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: progressData,
                backgroundColor: backgroundColors,
                borderColor: 'transparent',
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    display: true,
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    display: true,
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Progress (%)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `Progress: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    });
}

// Milestones timeline chart (simplified since we don't have actual milestone data)
function createMilestonesChart(project) {
    const ctx = document.getElementById('milestonesChart').getContext('2d');

    // Create some hypothetical milestones based on project creation date
    const startDate = new Date(project.created_at || new Date());
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 6); // Assume 6 month project

    // Generate milestone dates
    const milestone1 = new Date(startDate);
    milestone1.setMonth(milestone1.getMonth() + 1);

    const milestone2 = new Date(startDate);
    milestone2.setMonth(milestone2.getMonth() + 2);

    const milestone3 = new Date(startDate);
    milestone3.setMonth(milestone3.getMonth() + 4);

    const milestone4 = new Date(startDate);
    milestone4.setMonth(milestone4.getMonth() + 6);

    // Format dates
    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const milestones = [
        { name: "Project Planning", status: "Completed", plannedDate: formatDate(startDate) },
        { name: "Requirements Gathering", status: "Completed", plannedDate: formatDate(milestone1) },
        { name: "Development Phase", status: "In Progress", plannedDate: formatDate(milestone2) },
        { name: "Testing Phase", status: "Not Started", plannedDate: formatDate(milestone3) },
        { name: "Project Closure", status: "Not Started", plannedDate: formatDate(milestone4) }
    ];

    // Today's date for reference line
    const today = new Date();

    // Get canvas
    const canvas = document.getElementById('milestonesChart');
    const ctx2d = canvas.getContext('2d');

    // Clear the canvas
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas dimensions
    canvas.style.height = '200px';
    canvas.height = 200;
    canvas.width = canvas.offsetWidth;

    // Colors for status
    const statusColors = {
        'Completed': '#4CAF50',
        'In Progress': '#FFC107',
        'Not Started': '#E0E0E0'
    };

    // Draw timeline
    const drawTimeline = () => {
        const margin = { top: 40, right: 20, bottom: 40, left: 20 };
        const timelineY = 100;
        const timelineStartX = margin.left;
        const timelineEndX = canvas.width - margin.right;
        const timelineWidth = timelineEndX - timelineStartX;

        // Draw main timeline line
        ctx2d.beginPath();
        ctx2d.strokeStyle = '#CBD5E0';
        ctx2d.lineWidth = 2;
        ctx2d.moveTo(timelineStartX, timelineY);
        ctx2d.lineTo(timelineEndX, timelineY);
        ctx2d.stroke();

        // Calculate the total time span in milliseconds
        const timeSpan = endDate - startDate;

        // Draw today marker
        const todayPos = Math.min(Math.max((today - startDate) / timeSpan, 0), 1);
        const todayX = timelineStartX + (timelineWidth * todayPos);
        ctx2d.beginPath();
        ctx2d.strokeStyle = '#F56565';
        ctx2d.lineWidth = 2;
        ctx2d.moveTo(todayX, timelineY - 20);
        ctx2d.lineTo(todayX, timelineY + 20);
        ctx2d.stroke();

        // Add "Today" label
        ctx2d.font = '12px Arial';
        ctx2d.fillStyle = '#F56565';
        ctx2d.textAlign = 'center';
        ctx2d.fillText('Today', todayX, timelineY - 25);

        // Draw milestones
        milestones.forEach((milestone, index) => {
            const milestoneDate = new Date(milestone.plannedDate);
            const milestonePos = Math.min(Math.max((milestoneDate - startDate) / timeSpan, 0), 1);
            const x = timelineStartX + (timelineWidth * milestonePos);

            // Draw milestone dot
            ctx2d.beginPath();
            ctx2d.arc(x, timelineY, 8, 0, Math.PI * 2);
            ctx2d.fillStyle = statusColors[milestone.status];
            ctx2d.fill();

            // Draw milestone label
            ctx2d.font = '12px Arial';
            ctx2d.fillStyle = '#4A5568';
            ctx2d.textAlign = 'center';

            // Alternate labels above and below the timeline to prevent overlap
            const labelY = index % 2 === 0 ? timelineY - 35 : timelineY + 35;
            ctx2d.fillText(milestone.name, x, labelY);

            // Draw date
            ctx2d.font = '10px Arial';
            ctx2d.fillStyle = '#A0AEC0';
            ctx2d.fillText(milestone.plannedDate, x, labelY + (index % 2 === 0 ? -15 : 15));
        });
    };

    // Call the drawing function
    drawTimeline();
}

// Setup the download button functionality
// Setup the download button functionality
function setupDownloadButton() {
    document.getElementById('downloadBtn').addEventListener('click', function () {
        // Show a loading indicator
        const loadingText = document.createElement('span');
        loadingText.textContent = ' Generating PDF...';
        loadingText.id = 'loadingText';
        this.appendChild(loadingText);
        this.disabled = true;

        // Get the dashboard content
        const dashboardContent = document.getElementById('dashboard-content');

        // Define the PDF document
        const { jsPDF } = window.jspdf;

        // Capture the content using html2canvas
        html2canvas(dashboardContent, {
            scale: 2, // Higher scale for better quality
            useCORS: true, // Allow cross-origin images
            logging: false, // Disable logging
            allowTaint: true, // Allow tainted canvases 
            backgroundColor: '#ffffff' // White background
        }).then(canvas => {
            try {
                // Create new PDF document (landscape orientation)
                const pdf = new jsPDF('l', 'mm', 'a4');

                // Get dimensions
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgWidth = canvas.width;
                const imgHeight = canvas.height;

                // Calculate the scale ratio to fit the content on the page
                // Leave some margins
                const ratio = Math.min((pdfWidth - 20) / imgWidth, (pdfHeight - 40) / imgHeight);
                const imgX = (pdfWidth - imgWidth * ratio) / 2;
                const imgY = 30;

                // Add title to PDF
                pdf.setFontSize(22);
                pdf.setTextColor(44, 62, 80); // Dark blue text
                pdf.text('Project Completion Report', pdfWidth / 2, 15, { align: 'center' });

                // Add date
                const today = new Date();
                const dateStr = today.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                pdf.setFontSize(10);
                pdf.setTextColor(108, 117, 125); // Gray text
                pdf.text(`Generated on: ${dateStr}`, pdfWidth - 15, 10, { align: 'right' });

                // Add image of the dashboard
                pdf.addImage(
                    canvas.toDataURL('image/jpeg', 0.95), // Use JPEG with high quality
                    'JPEG',
                    imgX,
                    imgY,
                    imgWidth * ratio,
                    imgHeight * ratio
                );

                // Add footer with page number
                pdf.setFontSize(8);
                pdf.setTextColor(108, 117, 125);
                pdf.text('© 2025 Unilink - All rights reserved', 15, pdfHeight - 8);
                pdf.text('Page 1 of 1', pdfWidth - 15, pdfHeight - 8, { align: 'right' });

                // If project name is available, use it in the filename
                const urlParams = new URLSearchParams(window.location.search);
                const projectId = urlParams.get('id');
                const filename = `project_${projectId}_completion_report.pdf`;

                // Save the PDF
                pdf.save(filename);

                // Show success message
                alert('PDF generated successfully!');
            } catch (error) {
                console.error('Error generating PDF:', error);
                alert('There was an error generating the PDF. Please try again.');
            } finally {
                // Remove loading indicator
                document.getElementById('loadingText').remove();
                document.getElementById('downloadBtn').disabled = false;
            }
        }).catch(error => {
            console.error('Error capturing content:', error);
            alert('Failed to capture page content. Please try again.');

            // Remove loading indicator
            document.getElementById('loadingText').remove();
            document.getElementById('downloadBtn').disabled = false;
        });
    });
}