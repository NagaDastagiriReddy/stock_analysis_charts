// Removed data.js dependency, everything is dynamic now.

// Utility: Generate realistic random walk data based on symbol string hash
function generateMockData(symbol) {
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
        hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const basePrice = Math.abs(hash % 4000) + 100;
    const colors = ["#00E676", "#2979FF", "#FF1744", "#FFEA00", "#D500F9", "#00E5FF", "#FF9100"];
    const colorIndex = Math.abs(hash) % colors.length;
    const color = colors[colorIndex];

    const data = [basePrice];
    let currentPrice = basePrice;
    
    for (let i = 1; i < 365; i++) {
        // Slightly lower volatility since we have 365 days
        const changePercent = (Math.random() - 0.5) * 0.03; // +/- 1.5%
        currentPrice = currentPrice * (1 + changePercent);
        data.push(parseFloat(currentPrice.toFixed(2)));
    }

    const high52 = Math.max(...data).toFixed(2);
    const low52 = Math.min(...data).toFixed(2);
    const peRatio = (Math.abs(hash % 40) + 15 + Math.random()).toFixed(1);

    return {
        symbol: symbol.toUpperCase(),
        name: symbol.toUpperCase(),
        color: color,
        data: data,
        high52: high52,
        low52: low52,
        peRatio: peRatio
    };
}

// Simulated API Call
async function fetchStockDetails(symbol) {
    return new Promise((resolve) => {
        // Simulate network latency
        const delay = Math.random() * 400 + 400;
        setTimeout(() => {
            resolve(generateMockData(symbol.trim()));
        }, delay);
    });
}

function calculateChange(data) {
    const start = data[0];
    const end = data[data.length - 1];
    const change = ((end - start) / start) * 100;
    return change.toFixed(2);
}

// Generate 365 days of dates ending today
const labels = [];
const today = new Date();
for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
}

let activeCharts = [];

async function loadDashboard() {
    const inputStr = document.getElementById('stock-input').value;
    if (!inputStr.trim()) return;

    const symbols = inputStr.split(',').filter(s => s.trim().length > 0);
    const grid = document.getElementById('chart-grid');
    const loader = document.getElementById('loader');

    // UI State: Loading
    grid.innerHTML = '';
    activeCharts.forEach(chart => chart.destroy());
    activeCharts = [];
    loader.classList.remove('hidden');

    try {
        // Fetch concurrently
        const fetchPromises = symbols.map(sym => fetchStockDetails(sym));
        const stocksData = await Promise.all(fetchPromises);

        // UI State: Render
        loader.classList.add('hidden');
        renderCards(stocksData, grid);
    } catch (error) {
        loader.classList.add('hidden');
        console.error("Failed to fetch stock data", error);
        grid.innerHTML = '<p style="text-align:center; color: var(--text-secondary);">Error loading data. Please try again.</p>';
    }
}

function renderCards(stocksData, grid) {
    stocksData.forEach((stock, index) => {
        const card = document.createElement('div');
        card.className = 'stock-card';
        card.style.setProperty('--accent-glow', `${stock.color}26`);

        const currentPrice = stock.data[stock.data.length - 1];
        const changePct = calculateChange(stock.data);
        const isPositive = changePct >= 0;
        const changeClass = isPositive ? 'positive' : 'negative';
        const changeIcon = isPositive ? '▲' : '▼';

        card.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="card-title">${stock.name}</div>
                    <div class="card-symbol">${stock.symbol}</div>
                </div>
                <div style="text-align: right;">
                    <div class="card-price">₹${currentPrice}</div>
                    <div class="card-change ${changeClass}">${changeIcon} ${Math.abs(changePct)}%</div>
                </div>
            </div>
            <div class="card-metrics">
                <div class="metric-item">
                    <span class="metric-label">P/E Ratio</span>
                    <span class="metric-value">${stock.peRatio}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">52W High</span>
                    <span class="metric-value">₹${stock.high52}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">52W Low</span>
                    <span class="metric-value">₹${stock.low52}</span>
                </div>
            </div>
            <div class="chart-container">
                <canvas id="chart-${index}"></canvas>
            </div>
        `;

        grid.appendChild(card);

        const ctx = document.getElementById(`chart-${index}`).getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 180);
        gradient.addColorStop(0, `${stock.color}4D`);
        gradient.addColorStop(1, `${stock.color}00`);

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: stock.symbol,
                    data: stock.data,
                    borderColor: stock.color,
                    backgroundColor: gradient,
                    borderWidth: 1.5,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: stock.color,
                    pointBorderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index', intersect: false,
                        backgroundColor: 'rgba(11, 15, 25, 0.9)',
                        titleColor: '#94a3b8', bodyColor: '#fff',
                        bodyFont: { weight: 'bold', size: 14 },
                        titleFont: { size: 12, weight: 'normal' },
                        borderColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1,
                        padding: 12, displayColors: false,
                        callbacks: {
                            title: function(context) { return context[0].label; },
                            label: function(context) { return `₹${context.parsed.y}`; }
                        }
                    }
                },
                scales: {
                    x: { display: false },
                    y: {
                        display: false,
                        min: Math.min(...stock.data) * 0.98,
                        max: Math.max(...stock.data) * 1.02
                    }
                },
                interaction: { mode: 'nearest', axis: 'x', intersect: false }
            }
        });
        activeCharts.push(chart);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('fetch-btn').addEventListener('click', loadDashboard);
    
    document.getElementById('stock-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') loadDashboard();
    });

    // Load defaults initially
    loadDashboard();
});
