// Sample Data
const totalFunding = 100000.00;
const amountUsed = 45000.00;
const amountLeft = totalFunding - amountUsed;

// Update the figures
document.getElementById('totalFunding').innerText = `$${totalFunding.toFixed(2)}`;
document.getElementById('amountUsed').innerText = `$${amountUsed.toFixed(2)}`;
document.getElementById('amountLeft').innerText = `$${amountLeft.toFixed(2)}`;

// Funding Usage Comparison Chart
const fundingChartCtx = document.getElementById('fundingChart').getContext('2d');
new Chart(fundingChartCtx, {
    type: 'bar',
    data: {
        labels: ['Used', 'Left'],
        datasets: [{
            label: 'Funding Amount',
            data: [amountUsed, amountLeft],
            backgroundColor: ['#FF6384', '#36A2EB'],
        }],
    },
});

// Money Usage Distribution Pie Chart
const usagePieChartCtx = document.getElementById('usagePieChart').getContext('2d');
new Chart(usagePieChartCtx, {
    type: 'pie',
    data: {
        labels: ['Research', 'Development', 'Marketing'],
        datasets: [{
            data: [15000, 20000, 10000],
            backgroundColor: ['#FFCE56', '#FF6384', '#36A2EB'],
        }],
    },
});

// Grants by Organization Chart
const grantChartCtx = document.getElementById('grantChart').getContext('2d');
new Chart(grantChartCtx, {
    type: 'bar',
    data: {
        labels: ['Org A', 'Org B', 'Org C'],
        datasets: [{
            label: 'Grant Amount',
            data: [30000, 10000, 5000],
            backgroundColor: ['#4BC0C0', '#FF6384', '#FFCE56'],
        }],
    },
});